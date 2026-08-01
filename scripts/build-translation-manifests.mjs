#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SUPPORTED_LOCALES = ["ko", "en", "ja"];
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TRANSLATION_VENDOR_ROOT = resolve(
  projectRoot,
  "vendor",
  "translation-publisher",
);
export const DEFAULT_SOURCE_ROOT = resolve(TRANSLATION_VENDOR_ROOT, "sources");
export const DEFAULT_VALIDATOR_PATH = resolve(
  TRANSLATION_VENDOR_ROOT,
  "validators",
  "validate-localized-article.mjs",
);
export const DEFAULT_CLUSTER_VALIDATOR_PATH = resolve(
  TRANSLATION_VENDOR_ROOT,
  "validators",
  "validate-hreflang-cluster.mjs",
);
const localizedDataPath = resolve(projectRoot, "data", "localized-articles.json");
const verificationDataPath = resolve(
  projectRoot,
  "data",
  "localization-verification.json",
);
const articleOutputRoot = resolve(
  projectRoot,
  "translation-manifests",
  "articles",
);
const clusterOutputRoot = resolve(
  projectRoot,
  "translation-manifests",
  "clusters",
);

export function normalizeText(value) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").normalize("NFC").trim()
    : "";
}

export function compactLength(value) {
  return normalizeText(value).replace(/\s/gu, "").length;
}

export function digestSource(title, body) {
  const material = `${normalizeText(title)}\n\n${normalizeText(body)}`;
  return `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`;
}

export function digestText(value) {
  return `sha256:${createHash("sha256").update(normalizeText(value), "utf8").digest("hex")}`;
}

export function sentenceSegments(value, locale = "ko") {
  const text = normalizeText(value);
  if (!text) return [];
  return [...new Intl.Segmenter(locale, { granularity: "sentence" }).segment(text)]
    .map((entry) => normalizeText(entry.segment))
    .filter(Boolean);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeUrl(value) {
  return new URL(value).href.replace(/\/+$/, "");
}

function sameUrl(left, right) {
  try {
    return normalizeUrl(left) === normalizeUrl(right);
  } catch {
    return false;
  }
}

function referenceSuffix(article) {
  const links = Array.isArray(article.referenceLinks)
    ? article.referenceLinks
    : [];
  if (links.length === 0) return "";
  const labels = links.map((link, index) =>
    requireString(link?.label, `article.referenceLinks[${index}].label`),
  );
  return `참고 자료: ${labels.join(" · ")}`;
}

export function extractSourceArticle(publishPackage) {
  const article = requireObject(publishPackage.article, "publishPackage.article");
  const title = normalizeText(requireString(article.title, "article.title"));
  const intro = normalizeText(requireString(article.intro, "article.intro"));
  if (!Array.isArray(article.sections) || article.sections.length === 0) {
    throw new Error("article.sections must contain at least one section.");
  }

  const suffix = referenceSuffix(article);
  const sections = article.sections.map((section, index) => {
    const heading = normalizeText(
      requireString(section?.heading, `article.sections[${index}].heading`),
    );
    let body = normalizeText(
      requireString(section?.body, `article.sections[${index}].body`),
    );
    if (index === article.sections.length - 1 && suffix) {
      if (!body.endsWith(suffix)) {
        throw new Error(
          "The final source section does not end with the exact generated reference suffix.",
        );
      }
      body = normalizeText(body.slice(0, -suffix.length));
    } else if (body.includes("참고 자료:")) {
      throw new Error(
        `Unexpected reference appendix in source section ${index}; refusing an ambiguous source hash.`,
      );
    }
    return { heading, body };
  });

  const body = [
    intro,
    ...sections.map((section) => `${section.heading}\n${section.body}`),
  ].join("\n\n");
  const selectorContext = { "source.t": title };
  sentenceSegments(intro, "ko").forEach((sentence, index) => {
    selectorContext[`source.i${index + 1}`] = sentence;
  });
  sections.forEach((section, sectionIndex) => {
    sentenceSegments(section.body, "ko").forEach((sentence, sentenceIndex) => {
      selectorContext[`source.s${sectionIndex + 1}.${sentenceIndex + 1}`] = sentence;
    });
  });
  return { title, body, intro, sections, selectorContext };
}

export function localizedBody(copy) {
  if (!Array.isArray(copy?.body) || copy.body.length === 0) {
    throw new Error("Localized body must contain at least one section.");
  }
  return copy.body
    .map((section, sectionIndex) => {
      const heading = normalizeText(
        requireString(section?.heading, `localized.body[${sectionIndex}].heading`),
      );
      if (!Array.isArray(section?.paragraphs) || section.paragraphs.length === 0) {
        throw new Error(
          `localized.body[${sectionIndex}].paragraphs must not be empty.`,
        );
      }
      const paragraphs = section.paragraphs.map((paragraph, paragraphIndex) =>
        normalizeText(
          requireString(
            paragraph,
            `localized.body[${sectionIndex}].paragraphs[${paragraphIndex}]`,
          ),
        ),
      );
      return `${heading}\n${paragraphs.join("\n\n")}`;
    })
    .join("\n\n");
}

export function localizedSelectorContext(copy, localized) {
  const context = {
    "localized.title": localized.title,
    "localized.description": localized.description,
    "localized.body": localized.body,
    "localized.firstParagraph": localized.firstParagraph,
  };
  copy.body.forEach((section, sectionIndex) => {
    const sectionNumber = sectionIndex + 1;
    context[`localized.h${sectionNumber}`] = normalizeText(section.heading);
    const paragraphs = section.paragraphs.map(normalizeText);
    context[`localized.b${sectionNumber}`] = `${normalizeText(section.heading)}\n${paragraphs.join("\n\n")}`;
    paragraphs.forEach((paragraph, paragraphIndex) => {
      context[`localized.p${sectionNumber}.${paragraphIndex + 1}`] = paragraph;
    });
  });
  return context;
}

export function numericSourceSentences(source) {
  const context = source.selectorContext ?? {};
  const contextValues = Object.values(context);
  if (contextValues.length > 0) {
    return contextValues.filter((unit) => /\p{Number}/u.test(unit));
  }
  const bodyBlocks = normalizeText(source.body).split(/\n{2,}/u).filter(Boolean);
  const units = [normalizeText(source.title)];
  bodyBlocks.forEach((block, index) => {
    const lines = block.split("\n");
    const prose = index === 0 ? block : lines.slice(1).join("\n");
    units.push(...sentenceSegments(prose, source.locale ?? "ko"));
  });
  return units.filter((unit) => /\p{Number}/u.test(unit));
}

function numericTokens(value) {
  return [...normalizeText(value).matchAll(/\p{Number}+(?:[,.]\p{Number}+)*/gu)].map(
    (match) => match[0],
  );
}

function containsExactToken(fragment, token) {
  const normalizedFragment = normalizeText(fragment);
  const normalizedToken = normalizeText(token);
  const escaped = normalizedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/^\p{Number}+(?:[,.]\p{Number}+)*$/u.test(normalizedToken)) {
    return new RegExp(`(?<!\\p{Number})${escaped}(?!\\p{Number})`, "u").test(
      normalizedFragment,
    );
  }
  if (/^[A-Za-z]+$/u.test(normalizedToken)) {
    return new RegExp(`\\b${escaped}\\b`, "i").test(normalizedFragment);
  }
  return normalizedFragment.includes(normalizedToken);
}

export function localizedNumericClaimCandidates(fragment, locale, localizedTokens) {
  const text = normalizeText(fragment);
  const segments = [
    ...new Intl.Segmenter(locale, { granularity: "sentence" }).segment(text),
  ].filter((entry) => normalizeText(entry.segment));
  const candidates = [];
  for (let start = 0; start < segments.length; start += 1) {
    for (let length = 1; length <= 2 && start + length <= segments.length; length += 1) {
      const candidate = normalizeText(
        segments
          .slice(start, start + length)
          .map((entry) => entry.segment)
          .join(""),
      );
      if (localizedTokens.every((token) => containsExactToken(candidate, token))) {
        candidates.push({ candidate, length });
      }
    }
  }
  return candidates;
}

function localizedClaim(fragment, locale, localizedTokens, expectedHash) {
  const candidates = localizedNumericClaimCandidates(fragment, locale, localizedTokens);
  const exact = candidates
    .map((item) => item.candidate)
    .filter((candidate) => digestText(candidate) === expectedHash);
  if (exact.length !== 1) {
    throw new Error(
      `Expected one localized numeric claim matching ${expectedHash}, found ${exact.length}.`,
    );
  }
  return exact[0];
}

export function validateMaterializedNumberPairs(pairs, numericSentences) {
  const bySource = new Map();
  for (const pair of pairs) {
    if (bySource.has(pair.source)) {
      throw new Error(`Duplicate numeric source claim: ${pair.source}`);
    }
    bySource.set(pair.source, pair);
    if (!Array.isArray(pair.values) || pair.values.length === 0) {
      throw new Error(`${pair.id} must define numeric value mappings.`);
    }
    for (const [index, value] of pair.values.entries()) {
      const sourceToken = requireString(
        value?.sourceToken,
        `${pair.id}.values[${index}].sourceToken`,
      );
      const localizedToken = requireString(
        value?.localizedToken,
        `${pair.id}.values[${index}].localizedToken`,
      );
      if (!containsExactToken(pair.source, sourceToken)) {
        throw new Error(`${pair.id} sourceToken is not exact source claim content: ${sourceToken}`);
      }
      if (!containsExactToken(pair.localized, localizedToken)) {
        throw new Error(
          `${pair.id} localizedToken is not exact localized claim content: ${localizedToken}`,
        );
      }
    }
    for (const token of numericTokens(pair.source)) {
      if (!pair.values.some((value) => containsExactToken(value.sourceToken, token))) {
        throw new Error(`${pair.id} does not cover source numeric token ${token}.`);
      }
    }
  }
  const missing = numericSentences.filter((sentence) => !bySource.has(sentence));
  const unexpected = [...bySource.keys()].filter(
    (sentence) => !numericSentences.includes(sentence),
  );
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Numeric claim set mismatch; missing=[${missing.join(" | ")}], unexpected=[${unexpected.join(" | ")}].`,
    );
  }
  return pairs;
}

function materializeNumberPairs(items, source, localized, localizedContext) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("verification.numbers must contain exact per-claim pairs.");
  }
  const ids = new Set();
  const pairs = items.map((item, index) => {
    const pair = requireObject(item, `verification.numbers[${index}]`);
    const id = requireString(pair.id, `verification.numbers[${index}].id`);
    if (ids.has(id)) throw new Error(`verification.numbers contains duplicate id ${id}.`);
    ids.add(id);
    const sourceSelector = requireString(
      pair.sourceSelector,
      `verification.numbers[${index}].sourceSelector`,
    );
    const localizedSelector = requireString(
      pair.localizedSelector,
      `verification.numbers[${index}].localizedSelector`,
    );
    const sourceValue = requireString(
      source.selectorContext?.[sourceSelector],
      `verification.numbers[${index}] selector ${sourceSelector}`,
    );
    const baseLocalized = requireString(
      localizedContext?.[localizedSelector],
      `verification.numbers[${index}] selector ${localizedSelector}`,
    );
    if (!Array.isArray(pair.values) || pair.values.length === 0) {
      throw new Error(`verification.numbers[${index}].values must not be empty.`);
    }
    const values = pair.values.map((value, valueIndex) => ({
      sourceToken: requireString(
        value?.sourceToken,
        `verification.numbers[${index}].values[${valueIndex}].sourceToken`,
      ),
      localizedToken: requireString(
        value?.localizedToken,
        `verification.numbers[${index}].values[${valueIndex}].localizedToken`,
      ),
    }));
    const localizedValue = localizedClaim(
      baseLocalized,
      localized.locale,
      values.map((value) => value.localizedToken),
      requireString(pair.localizedHash, `verification.numbers[${index}].localizedHash`),
    );
    if (pair.verified !== true) {
      throw new Error(`verification.numbers[${index}] is not explicitly verified.`);
    }
    return {
      id,
      source: normalizeText(sourceValue),
      localized: normalizeText(localizedValue),
      values,
      verified: true,
    };
  });
  return validateMaterializedNumberPairs(pairs, numericSourceSentences(source));
}

function assertPairArray(
  items,
  label,
  source,
  localized,
  sourceFragments,
  localizedFragments,
  sourceSelectorContext,
  localizedSelectorContext,
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${label} must contain at least one pair.`);
  }
  const ids = new Set();
  return items.map((item, index) => {
    const pair = requireObject(item, `${label}[${index}]`);
    const id = requireString(pair.id, `${label}[${index}].id`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) {
      throw new Error(`${label}[${index}].id is not URL-safe: ${id}`);
    }
    if (ids.has(id)) throw new Error(`${label} contains duplicate id ${id}.`);
    ids.add(id);
    const resolveFragment = (value, context, fragmentLabel) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const selector = requireString(value.selector, `${fragmentLabel}.selector`);
        return requireString(context?.[selector], `${fragmentLabel} selector ${selector}`);
      }
      throw new Error(`${fragmentLabel} must be an exact string or selector object.`);
    };
    const sourceValue = normalizeText(
      resolveFragment(
        pair.source ?? sourceFragments?.[pair.sourceRef],
        sourceSelectorContext,
        `${label}[${index}].source/sourceRef`,
      ),
    );
    const localizedValue = normalizeText(
      resolveFragment(
        pair.localized ?? localizedFragments?.[pair.localizedRef],
        localizedSelectorContext,
        `${label}[${index}].localized/localizedRef`,
      ),
    );
    if (!source.includes(sourceValue)) {
      throw new Error(`${label}[${index}].source is not exact source content.`);
    }
    if (!localized.includes(localizedValue)) {
      throw new Error(`${label}[${index}].localized is not exact localized content.`);
    }
    if (pair.verified !== true) {
      throw new Error(`${label}[${index}] is not explicitly verified.`);
    }
    return { id, source: sourceValue, localized: localizedValue, verified: true };
  });
}

export function materializeVerification(
  spec,
  sourceFragmentRoot,
  localizedFragmentRoot,
  source,
  localized,
) {
  const record = requireObject(spec, "locale verification");
  const combinedSource = `${source.title}\n${source.body}`;
  const combinedLocalized = `${localized.title}\n${localized.description}\n${localized.body}`;
  const sourceSelectorContext = {
    ...source.selectorContext,
    "source.title": source.title,
    "source.body": source.body,
    "source.intro": source.intro,
  };
  const localizedSelectorContext = {
    ...localized.selectorContext,
    "localized.title": localized.title,
    "localized.description": localized.description,
    "localized.body": localized.body,
    "localized.firstParagraph": localized.firstParagraph,
  };
  const facts = assertPairArray(
    record.facts,
    "verification.facts",
    combinedSource,
    combinedLocalized,
    sourceFragmentRoot?.facts,
    localizedFragmentRoot?.facts,
    sourceSelectorContext,
    localizedSelectorContext,
  );
  const properNames = assertPairArray(
    record.properNames,
    "verification.properNames",
    combinedSource,
    combinedLocalized,
    sourceFragmentRoot?.properNames,
    localizedFragmentRoot?.properNames,
    sourceSelectorContext,
    localizedSelectorContext,
  );
  const numbers = materializeNumberPairs(
    record.numbers,
    source,
    localized,
    localizedSelectorContext,
  );

  return { fullBody: true, facts, properNames, numbers };
}

function materializeCorrections(items, source, localized, label) {
  if (items === undefined) return [];
  if (!Array.isArray(items)) throw new Error(`${label} must be an array.`);
  const sourceContent = `${source.title}\n${source.body}`;
  const localizedContent = `${localized.title}\n${localized.description}\n${localized.body}`;
  const ids = new Set();
  return items.map((item, index) => {
    const correction = requireObject(item, `${label}[${index}]`);
    const id = requireString(correction.id, `${label}[${index}].id`);
    if (ids.has(id)) throw new Error(`${label} contains duplicate id ${id}.`);
    ids.add(id);
    const sourceValue = normalizeText(
      requireString(correction.sourceValue, `${label}[${index}].sourceValue`),
    );
    const localizedValue = normalizeText(
      requireString(correction.localizedValue, `${label}[${index}].localizedValue`),
    );
    const reason = requireString(correction.reason, `${label}[${index}].reason`);
    const evidenceUrl = requireString(
      correction.evidenceUrl,
      `${label}[${index}].evidenceUrl`,
    );
    if (!normalizeText(sourceContent).includes(sourceValue)) {
      throw new Error(`${label}[${index}].sourceValue is not exact source content.`);
    }
    if (!normalizeText(localizedContent).includes(localizedValue)) {
      throw new Error(`${label}[${index}].localizedValue is not exact localized content.`);
    }
    let evidence;
    try {
      evidence = new URL(evidenceUrl);
    } catch {
      throw new Error(`${label}[${index}].evidenceUrl must be a valid URL.`);
    }
    if (evidence.protocol !== "https:") {
      throw new Error(`${label}[${index}].evidenceUrl must use HTTPS.`);
    }
    return { id, sourceValue, localizedValue, reason, evidenceUrl: evidence.href };
  });
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function discoverPublishPackages(sourceRoot) {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".publish.json")) continue;
    const path = resolve(sourceRoot, entry.name);
    let data;
    try {
      data = await loadJson(path);
    } catch {
      continue;
    }
    const naverUrl = data?.platforms?.naver?.url;
    if (typeof naverUrl === "string" && naverUrl.trim()) {
      packages.push({ name: entry.name, path, data, naverUrl });
    }
  }
  return packages;
}

function validateSourcePackage(candidate, article, audit) {
  const pkg = candidate.data;
  if (!sameUrl(candidate.naverUrl, article.sourceUrl)) {
    throw new Error(`${audit.articleId}: source package URL does not match sourceUrl.`);
  }
  if (candidate.name !== audit.sourcePackage) {
    throw new Error(
      `${audit.articleId}: URL resolved to ${candidate.name}, expected ${audit.sourcePackage}.`,
    );
  }
  if (pkg?.platforms?.naver?.status !== "published_and_verified") {
    throw new Error(`${audit.articleId}: Naver source is not published_and_verified.`);
  }
  if (pkg?.platforms?.naver?.visibility !== "public") {
    throw new Error(`${audit.articleId}: Naver source is not public.`);
  }
  if (pkg?.checkpoints?.publicVerification?.naver !== "passed") {
    throw new Error(`${audit.articleId}: Naver public verification did not pass.`);
  }
}

function validatorResult(validatorPath, manifestPath, status) {
  const args = [validatorPath, manifestPath];
  if (status !== "ready") args.push("--allow-noindex");
  const result = spawnSync(
    process.execPath,
    args,
    { cwd: projectRoot, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `translation-publisher validator failed for ${manifestPath}:\n${result.stdout}${result.stderr}`,
    );
  }
  const parsed = JSON.parse(result.stdout);
  const expectedPublishable = status === "ready";
  if (parsed.valid !== true || parsed.publishable !== expectedPublishable) {
    throw new Error(
      `Expected publishable=${expectedPublishable} for ${manifestPath}.`,
    );
  }
  return parsed;
}

function clusterValidatorResult(validatorPath, manifestPath) {
  const result = spawnSync(process.execPath, [validatorPath, manifestPath], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `translation-publisher cluster validator failed for ${manifestPath}:\n${result.stdout}${result.stderr}`,
    );
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.valid !== true) {
    throw new Error(`Expected a valid hreflang cluster for ${manifestPath}.`);
  }
  return parsed;
}

export function createReadyCluster(articleId, articleManifests) {
  const ready = SUPPORTED_LOCALES.map((locale) =>
    articleManifests.find(
      (manifest) =>
        manifest.localized.locale === locale &&
        manifest.status === "ready" &&
        manifest.robots === "index,follow",
    ),
  ).filter(Boolean);
  if (ready.length < 2) return null;
  const xDefaultLocale = ready.some((manifest) => manifest.localized.locale === "ko")
    ? "ko"
    : ready[0].localized.locale;
  const alternates = Object.fromEntries(
    ready.map((manifest) => [manifest.localized.locale, manifest.localized.url]),
  );
  alternates["x-default"] = alternates[xDefaultLocale];
  return {
    schemaVersion: 1,
    clusterId: articleId,
    xDefaultLocale,
    members: ready.map((manifest) => ({
      locale: manifest.localized.locale,
      url: manifest.localized.url,
      canonical: manifest.canonical,
      robots: manifest.robots,
      publicVerification: manifest.publicVerification,
      alternates: { ...alternates },
    })),
  };
}

function parseArgs(argv) {
  const options = {
    sourceRoot: process.env.CELEBRITY_ARTICLE_ROOT
      ? resolve(process.env.CELEBRITY_ARTICLE_ROOT)
      : DEFAULT_SOURCE_ROOT,
    validatorPath: process.env.TRANSLATION_PUBLISHER_VALIDATOR
      ? resolve(process.env.TRANSLATION_PUBLISHER_VALIDATOR)
      : DEFAULT_VALIDATOR_PATH,
    clusterValidatorPath: process.env.TRANSLATION_PUBLISHER_CLUSTER_VALIDATOR
      ? resolve(process.env.TRANSLATION_PUBLISHER_CLUSTER_VALIDATOR)
      : DEFAULT_CLUSTER_VALIDATOR_PATH,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (
      arg === "--source-root" ||
      arg === "--validator" ||
      arg === "--cluster-validator"
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a path.`);
      if (arg === "--source-root") options.sourceRoot = resolve(value);
      else if (arg === "--validator") options.validatorPath = resolve(value);
      else options.clusterValidatorPath = resolve(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

export async function buildTranslationManifests(options = {}) {
  const sourceRoot = options.sourceRoot ?? DEFAULT_SOURCE_ROOT;
  const validatorPath = options.validatorPath ?? DEFAULT_VALIDATOR_PATH;
  const clusterValidatorPath =
    options.clusterValidatorPath ?? DEFAULT_CLUSTER_VALIDATOR_PATH;
  const localizedRoot = await loadJson(localizedDataPath);
  const verificationRoot = await loadJson(verificationDataPath);
  if (verificationRoot.schemaVersion !== 1) {
    throw new Error("localization-verification.json schemaVersion must be 1.");
  }
  if (!Array.isArray(localizedRoot.articles) || !Array.isArray(verificationRoot.articles)) {
    throw new Error("Localized content and verification data must contain articles arrays.");
  }
  if (localizedRoot.articles.length !== verificationRoot.articles.length) {
    throw new Error("Localized content and verification article counts differ.");
  }

  const packages = await discoverPublishPackages(sourceRoot);
  const audits = new Map(
    verificationRoot.articles.map((article) => [article.articleId, article]),
  );
  const manifests = [];
  await rm(articleOutputRoot, { recursive: true, force: true });
  await rm(clusterOutputRoot, { recursive: true, force: true });
  await mkdir(articleOutputRoot, { recursive: true });

  for (const article of localizedRoot.articles) {
    const articleId = requireString(article?.locales?.ko?.slug, "article locales.ko.slug");
    for (const locale of SUPPORTED_LOCALES) {
      if (article?.locales?.[locale]?.slug !== articleId) {
        throw new Error(`${articleId}: all locale slugs must preserve the same articleId.`);
      }
    }
    const audit = audits.get(articleId);
    if (!audit) throw new Error(`${articleId}: missing localization verification data.`);
    if (!sameUrl(audit.sourceUrl, article.sourceUrl)) {
      throw new Error(`${articleId}: verification sourceUrl does not match content data.`);
    }
    const candidates = packages.filter((candidate) =>
      sameUrl(candidate.naverUrl, article.sourceUrl),
    );
    if (candidates.length !== 1) {
      throw new Error(
        `${articleId}: expected exactly one verified source package by Naver URL, found ${candidates.length}.`,
      );
    }
    validateSourcePackage(candidates[0], article, audit);
    const source = extractSourceArticle(candidates[0].data);
    if (compactLength(source.body) < 600) {
      throw new Error(`${articleId}: source body is shorter than 600 compact characters.`);
    }
    const sourceHash = digestSource(source.title, source.body);
    if (sourceHash !== article.sourceHash || sourceHash !== audit.sourceHash) {
      throw new Error(
        `${articleId}: source hash mismatch; computed ${sourceHash}, content ${article.sourceHash}, audit ${audit.sourceHash}.`,
      );
    }

    for (const locale of SUPPORTED_LOCALES) {
      const copy = article.locales[locale];
      const body = localizedBody(copy);
      const localized = {
        locale,
        url: `${verificationRoot.siteUrl.replace(/\/+$/, "")}/${locale}/news/${copy.slug}`,
        title: normalizeText(copy.title),
        description: normalizeText(copy.description),
        body,
        firstParagraph: normalizeText(copy.body[0].paragraphs[0]),
      };
      localized.selectorContext = localizedSelectorContext(copy, localized);
      if (compactLength(body) < 600) {
        throw new Error(`${articleId}.${locale}: localized body is shorter than 600 compact characters.`);
      }
      const localeAudit = requireObject(
        audit.locales?.[locale],
        `${articleId}.locales.${locale}`,
      );
      const expectedMode = locale === "ko" ? "source-edition" : "translation";
      if (localeAudit.mode !== expectedMode) {
        throw new Error(
          `${articleId}.${locale}: expected mode ${expectedMode}, found ${localeAudit.mode}.`,
        );
      }
      const manifest = {
        schemaVersion: 1,
        mode: expectedMode,
        articleId,
        source: {
          locale: "ko",
          url: article.sourceUrl,
          title: source.title,
          body: source.body,
          rights: audit.rights,
        },
        localized: {
          locale: localized.locale,
          url: localized.url,
          title: localized.title,
          description: localized.description,
          body: localized.body,
        },
        sourceHash,
        translatedFromSourceHash: copy.translatedFromSourceHash,
        status: copy.status,
        robots: copy.robots,
        canonical: localized.url,
        verification: materializeVerification(
          localeAudit.verification,
          audit.sourceFragments,
          localeAudit.localizedFragments,
          source,
          localized,
        ),
        corrections: materializeCorrections(
          localeAudit.corrections,
          source,
          localized,
          `${articleId}.locales.${locale}.corrections`,
        ),
        publicVerification: copy.publicVerification,
      };
      const outputPath = resolve(articleOutputRoot, `${articleId}.${locale}.json`);
      await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      const validation = validatorResult(validatorPath, outputPath, manifest.status);
      manifests.push({ articleId, locale, outputPath, manifest, validation });
    }
  }

  const expectedAuditIds = [...audits.keys()].sort();
  const actualIds = localizedRoot.articles
    .map((article) => article.locales.ko.slug)
    .sort();
  if (JSON.stringify(expectedAuditIds) !== JSON.stringify(actualIds)) {
    throw new Error("Verification data contains an unknown or missing articleId.");
  }
  const clusters = [];
  for (const articleId of actualIds) {
    const articleManifests = manifests
      .filter((entry) => entry.articleId === articleId)
      .map((entry) => entry.manifest);
    const cluster = createReadyCluster(articleId, articleManifests);
    if (!cluster) continue;
    await mkdir(clusterOutputRoot, { recursive: true });
    const outputPath = resolve(clusterOutputRoot, `${articleId}.json`);
    await writeFile(outputPath, `${JSON.stringify(cluster, null, 2)}\n`, "utf8");
    const validation = clusterValidatorResult(clusterValidatorPath, outputPath);
    clusters.push({ articleId, outputPath, cluster, validation });
  }
  return {
    sourceRoot,
    validatorPath,
    clusterValidatorPath,
    manifests,
    clusters,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await buildTranslationManifests(options);
  console.log(
    JSON.stringify(
      {
        valid: true,
        articleManifests: result.manifests.length,
        ready: result.manifests.filter((entry) => entry.validation.publishable).length,
        noindex: result.manifests.filter((entry) => !entry.validation.publishable).length,
        sourceRoot: result.sourceRoot,
        validatorPath: result.validatorPath,
        clusterValidatorPath: result.clusterValidatorPath,
        clustersCreated: result.clusters.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
