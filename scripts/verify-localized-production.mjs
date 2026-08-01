#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestRoot = resolve(projectRoot, "translation-manifests", "articles");
const localizedDataPath = resolve(projectRoot, "data", "localized-articles.json");
const supportedLocales = ["ko", "en", "ja"];
const defaultBaseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ssundesk.com"
).replace(/\/+$/, "");

function normalizeUrl(value) {
  return new URL(value).href.replace(/\/+$/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
    (match, entity) => {
      if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
      const hexadecimal = entity[1].toLowerCase() === "x";
      const number = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    },
  );
}

function visibleText(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/gu, " ")
    .normalize("NFC")
    .trim();
}

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*(["'])(.*?)\\1`, "i"),
  );
  return match ? decodeHtml(match[2]) : "";
}

function findTag(html, tagName, predicate) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  return tags.find(predicate) ?? "";
}

function canonicalFromHtml(html) {
  const tag = findTag(
    html,
    "link",
    (candidate) => attribute(candidate, "rel").toLowerCase() === "canonical",
  );
  return attribute(tag, "href");
}

function robotsFromHtml(html) {
  const tag = findTag(
    html,
    "meta",
    (candidate) => attribute(candidate, "name").toLowerCase() === "robots",
  );
  return attribute(tag, "content").toLowerCase().replace(/\s+/g, "");
}

function hreflangMap(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  return Object.fromEntries(
    tags
      .filter(
        (tag) =>
          attribute(tag, "rel").toLowerCase() === "alternate" &&
          attribute(tag, "hreflang"),
      )
      .map((tag) => [attribute(tag, "hreflang"), attribute(tag, "href")]),
  );
}

export function inspectLocalizedHtml({
  html,
  manifest,
  expectedState,
  expectedAlternates = null,
}) {
  const errors = [];
  const languageMatch = html.match(/<html\b[^>]*\blang=(["'])(.*?)\1/i);
  if (languageMatch?.[2] !== manifest.localized.locale) {
    errors.push(`html lang must be ${manifest.localized.locale}`);
  }
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeHtml(titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim();
  const expectedTitle = manifest.localized.title.replace(/\s+/gu, " ").trim();
  if (!title.includes(expectedTitle)) {
    errors.push("rendered title does not include the localized manifest title");
  }
  const canonical = canonicalFromHtml(html);
  if (!canonical || normalizeUrl(canonical) !== normalizeUrl(manifest.canonical)) {
    errors.push("canonical does not equal the manifest self URL");
  }
  const expectedRobots =
    expectedState === "ready" ? "index,follow" : "noindex,nofollow";
  if (robotsFromHtml(html) !== expectedRobots) {
    errors.push(`robots must be ${expectedRobots}`);
  }

  const text = visibleText(html);
  for (const fragment of manifest.localized.body.split(/\n+/).map((item) => item.trim()).filter(Boolean)) {
    const normalized = fragment.replace(/\s+/gu, " ").normalize("NFC");
    if (!text.includes(normalized)) {
      errors.push(`rendered body is missing: ${normalized.slice(0, 100)}`);
    }
  }

  const alternates = hreflangMap(html);
  if (expectedState === "reviewed") {
    if (Object.keys(alternates).length > 0) {
      errors.push("reviewed/noindex HTML must not expose hreflang alternates");
    }
  } else if (!expectedAlternates) {
    errors.push("ready HTML requires a reciprocal hreflang cluster");
  } else {
    const actualKeys = Object.keys(alternates).sort();
    const expectedKeys = Object.keys(expectedAlternates).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      errors.push("ready HTML has an incomplete hreflang map");
    }
    for (const [locale, url] of Object.entries(expectedAlternates)) {
      if (!alternates[locale] || normalizeUrl(alternates[locale]) !== normalizeUrl(url)) {
        errors.push(`ready HTML has the wrong ${locale} alternate`);
      }
    }
  }
  return { valid: errors.length === 0, errors, canonical, robots: robotsFromHtml(html) };
}

async function loadManifests() {
  const files = (await readdir(manifestRoot))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const manifests = await Promise.all(
    files.map(async (name) => ({
      name,
      data: JSON.parse(await readFile(resolve(manifestRoot, name), "utf8")),
    })),
  );
  const localizedRoot = JSON.parse(await readFile(localizedDataPath, "utf8"));
  if (!Array.isArray(localizedRoot.articles)) {
    throw new Error("localized-articles.json must contain an articles array.");
  }
  const expected = new Set(
    localizedRoot.articles.flatMap((article) => {
      const articleId = article?.locales?.ko?.slug;
      return supportedLocales.map((locale) => `${articleId}.${locale}`);
    }),
  );
  const actual = new Set();
  for (const { data } of manifests) {
    const key = `${data.articleId}.${data.localized?.locale}`;
    if (actual.has(key)) throw new Error(`Duplicate article manifest: ${key}.`);
    actual.add(key);
  }
  const missing = [...expected].filter((key) => !actual.has(key));
  const unexpected = [...actual].filter((key) => !expected.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Article manifest set mismatch; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}].`,
    );
  }
  return manifests;
}

function alternateMaps(manifests, baseUrl) {
  const byArticle = new Map();
  for (const { data } of manifests) {
    if (data.status !== "ready" || data.robots !== "index,follow") continue;
    const members = byArticle.get(data.articleId) ?? [];
    members.push(data);
    byArticle.set(data.articleId, members);
  }
  const result = new Map();
  for (const [articleId, members] of byArticle) {
    if (members.length < 2) continue;
    const map = Object.fromEntries(
      members.map((member) => [
        member.localized.locale,
        `${baseUrl}${new URL(member.localized.url).pathname}`,
      ]),
    );
    const defaultLocale = map.ko ? "ko" : members[0].localized.locale;
    map["x-default"] = map[defaultLocale];
    result.set(articleId, map);
  }
  return result;
}

export async function verifyLocalizedProduction({
  baseUrl = defaultBaseUrl,
  expectedState = "reviewed",
  fetchImpl = fetch,
}) {
  if (expectedState !== "reviewed" && expectedState !== "ready") {
    throw new Error("expectedState must be reviewed or ready.");
  }
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const manifests = await loadManifests();
  const alternateByArticle = alternateMaps(manifests, normalizedBaseUrl);
  const checkedAt = new Date().toISOString();
  const pages = [];
  for (const { data: manifest } of manifests) {
    const url = `${normalizedBaseUrl}${new URL(manifest.localized.url).pathname}`;
    if (expectedState === "reviewed") {
      if (
        manifest.status !== "reviewed" ||
        manifest.robots !== "noindex,nofollow" ||
        manifest.publicVerification !== null
      ) {
        throw new Error(
          `${manifest.articleId}.${manifest.localized.locale} is not a reviewed/noindex pre-release manifest.`,
        );
      }
    } else {
      const publicCheck = manifest.publicVerification;
      if (
        manifest.status !== "ready" ||
        manifest.robots !== "index,follow" ||
        manifest.sourceHash !== manifest.translatedFromSourceHash ||
        publicCheck?.status !== "verified" ||
        publicCheck?.httpStatus !== 200 ||
        normalizeUrl(publicCheck?.resolvedUrl || "https://invalid.local") !==
          normalizeUrl(manifest.localized.url) ||
        !alternateByArticle.has(manifest.articleId)
      ) {
        throw new Error(
          `${manifest.articleId}.${manifest.localized.locale} is not a verified ready manifest with a reciprocal cluster.`,
        );
      }
    }
    const response = await fetchImpl(url, {
      headers: { accept: "text/html" },
      redirect: "follow",
    });
    const html = await response.text();
    const inspection = inspectLocalizedHtml({
      html,
      manifest,
      expectedState,
      expectedAlternates: alternateByArticle.get(manifest.articleId) ?? null,
    });
    const errors = [...inspection.errors];
    if (response.status !== 200) errors.push(`HTTP status is ${response.status}`);
    if (normalizeUrl(response.url) !== normalizeUrl(url)) {
      errors.push(`resolved URL is ${response.url}`);
    }
    pages.push({
      articleId: manifest.articleId,
      locale: manifest.localized.locale,
      url,
      httpStatus: response.status,
      resolvedUrl: response.url,
      valid: errors.length === 0,
      errors,
    });
  }
  const valid = pages.every((page) => page.valid);
  return { schemaVersion: 1, expectedState, checkedAt, valid, pages };
}

function parseArgs(argv) {
  const options = {
    baseUrl: defaultBaseUrl,
    expectedState: "reviewed",
    dryRun: false,
    output: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--base-url" || arg === "--expect" || arg === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      if (arg === "--base-url") options.baseUrl = value;
      if (arg === "--expect") options.expectedState = value;
      if (arg === "--output") options.output = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.dryRun) {
    const manifests = await loadManifests();
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          expectedState: options.expectedState,
          urls: manifests.map(
            ({ data }) =>
              `${options.baseUrl.replace(/\/+$/, "")}${new URL(data.localized.url).pathname}`,
          ),
        },
        null,
        2,
      ),
    );
    return;
  }
  const report = await verifyLocalizedProduction(options);
  const output =
    options.output ||
    resolve(
      projectRoot,
      "translation-manifests",
      `production-verification.${options.expectedState}.json`,
    );
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, output }, null, 2));
  if (!report.valid) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
