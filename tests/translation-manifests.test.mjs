import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { before, test } from "node:test";

import {
  DEFAULT_CLUSTER_VALIDATOR_PATH,
  DEFAULT_SOURCE_ROOT,
  DEFAULT_VALIDATOR_PATH,
  TRANSLATION_VENDOR_ROOT,
  buildTranslationManifests,
  createReadyCluster,
  localizedBody,
  numericSourceSentences,
  validateMaterializedNumberPairs,
} from "../scripts/build-translation-manifests.mjs";
import { inspectLocalizedHtml } from "../scripts/verify-localized-production.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const manifestRoot = resolve(projectRoot, "translation-manifests", "articles");
const clusterRoot = resolve(projectRoot, "translation-manifests", "clusters");
const validatorPath = DEFAULT_VALIDATOR_PATH;
const clusterValidatorPath = DEFAULT_CLUSTER_VALIDATOR_PATH;
let localizedRoot;
let verificationRoot;
let manifests;
let buildResult;

before(async () => {
  buildResult = await buildTranslationManifests();
  localizedRoot = JSON.parse(
    await readFile(resolve(projectRoot, "data", "localized-articles.json"), "utf8"),
  );
  verificationRoot = JSON.parse(
    await readFile(
      resolve(projectRoot, "data", "localization-verification.json"),
      "utf8",
    ),
  );
  const files = (await readdir(manifestRoot))
    .filter((name) => name.endsWith(".json"))
    .sort();
  manifests = await Promise.all(
    files.map(async (name) => ({
      name,
      data: JSON.parse(await readFile(resolve(manifestRoot, name), "utf8")),
    })),
  );
});

test("emits the complete current manifest and reciprocal-cluster set", async () => {
  const expectedKeys = new Set(
    localizedRoot.articles.flatMap((article) =>
      ["ko", "en", "ja"].map(
        (locale) => `${article.locales.ko.slug}.${locale}`,
      ),
    ),
  );
  const actualKeys = new Set(
    manifests.map(
      ({ data }) => `${data.articleId}.${data.localized.locale}`,
    ),
  );
  assert.equal(actualKeys.size, manifests.length, "manifest keys must be unique");
  assert.deepEqual([...actualKeys].sort(), [...expectedKeys].sort());
  let clusterFiles = [];
  try {
    clusterFiles = (await readdir(clusterRoot)).filter((name) => name.endsWith(".json"));
  } catch (error) {
    assert.equal(error.code, "ENOENT");
  }
  const expectedClusterIds = localizedRoot.articles
    .filter(
      (article) =>
        ["ko", "en", "ja"].filter(
          (locale) =>
            article.locales[locale].status === "ready" &&
            article.locales[locale].robots === "index,follow",
        ).length >= 2,
    )
    .map((article) => article.locales.ko.slug)
    .sort();
  assert.deepEqual(
    clusterFiles.sort(),
    expectedClusterIds.map((articleId) => `${articleId}.json`),
  );
  assert.deepEqual(
    buildResult.clusters.map((entry) => entry.articleId).sort(),
    expectedClusterIds,
  );
  for (const entry of buildResult.clusters) {
    const result = spawnSync(process.execPath, [clusterValidatorPath, entry.outputPath], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${entry.articleId}: ${result.stdout}${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).valid, true);
  }

  const auditById = new Map(
    verificationRoot.articles.map((article) => [article.articleId, article]),
  );
  const counts = new Map();
  for (const { data } of manifests) {
    counts.set(data.articleId, (counts.get(data.articleId) ?? 0) + 1);
    const article = localizedRoot.articles.find(
      (candidate) => candidate.locales.ko.slug === data.articleId,
    );
    const copy = article.locales[data.localized.locale];
    assert.equal(data.status, copy.status);
    assert.equal(data.robots, copy.robots);
    assert.deepEqual(data.publicVerification, copy.publicVerification);
    assert.equal(data.sourceHash, auditById.get(data.articleId)?.sourceHash);
    assert.equal(data.translatedFromSourceHash, data.sourceHash);
    assert.equal(
      data.mode,
      data.localized.locale === "ko" ? "source-edition" : "translation",
    );
  }
  assert.equal(counts.size, localizedRoot.articles.length);
  assert.ok([...counts.values()].every((count) => count === 3));
});

test("manifest localized fields exactly match localized-articles.json", () => {
  const byArticle = new Map(
    localizedRoot.articles.map((article) => [article.locales.ko.slug, article]),
  );
  for (const { data } of manifests) {
    const article = byArticle.get(data.articleId);
    assert.ok(article, `missing localized article ${data.articleId}`);
    const locale = data.localized.locale;
    const copy = article.locales[locale];
    assert.equal(data.localized.title, copy.title);
    assert.equal(data.localized.description, copy.description);
    assert.equal(data.localized.body, localizedBody(copy));
    assert.equal(
      data.localized.url,
      `https://ssundesk.com/${locale}/news/${copy.slug}`,
    );
    assert.equal(data.canonical, data.localized.url);
  }
});

test("every source numeric sentence is covered by an exact verified pair", () => {
  for (const { data } of manifests) {
    const numericSentences = numericSourceSentences(data.source);
    assert.ok(numericSentences.length > 0);
    for (const sentence of numericSentences) {
      const matches = data.verification.numbers.filter(
        (pair) => pair.verified === true && pair.source === sentence,
      );
      assert.equal(
        matches.length,
        1,
        `${data.articleId}.${data.localized.locale} did not exactly cover: ${sentence}`,
      );
      assert.ok(matches[0].values.length > 0);
    }
  }
});

test("a wrong localized numeric token is rejected", () => {
  const manifest = manifests
    .map(({ data }) => data)
    .find((data) =>
      data.verification.numbers.some((pair) =>
        pair.values.some((value) => /\p{Number}/u.test(value.localizedToken)),
      ),
    );
  assert.ok(manifest);
  const pairs = structuredClone(manifest.verification.numbers);
  let selected;
  for (const pair of pairs) {
    for (const value of pair.values) {
      if (!/^\p{Number}+(?:[,.]\p{Number}+)*$/u.test(value.localizedToken)) continue;
      const escaped = value.localizedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = new RegExp(`(?<!\\p{Number})${escaped}(?!\\p{Number})`, "gu");
      if ([...pair.localized.matchAll(expression)].length === 1) {
        selected = { pair, value, expression };
        break;
      }
    }
    if (selected) break;
  }
  assert.ok(selected, "fixture must contain a uniquely occurring localized number token");
  selected.pair.localized = selected.pair.localized.replace(
    selected.expression,
    "999999999",
  );
  assert.throws(
    () => validateMaterializedNumberPairs(pairs, numericSourceSentences(manifest.source)),
    /localizedToken is not exact localized claim content/,
  );
});

test("translation manifest defaults are self-contained vendored paths", async () => {
  for (const path of [
    buildResult.sourceRoot,
    buildResult.validatorPath,
    buildResult.clusterValidatorPath,
  ]) {
    assert.ok(
      path.startsWith(`${TRANSLATION_VENDOR_ROOT}\\`) || path.startsWith(`${TRANSLATION_VENDOR_ROOT}/`),
      `default translation dependency escaped vendor root: ${path}`,
    );
  }
  assert.equal(buildResult.sourceRoot, DEFAULT_SOURCE_ROOT);
  assert.equal(buildResult.validatorPath, DEFAULT_VALIDATOR_PATH);
  assert.equal(buildResult.clusterValidatorPath, DEFAULT_CLUSTER_VALIDATOR_PATH);
  const expectedSources = verificationRoot.articles
    .map((article) => article.sourcePackage)
    .sort();
  const actualSources = (await readdir(DEFAULT_SOURCE_ROOT))
    .filter((name) => name.endsWith(".publish.json"))
    .sort();
  assert.deepEqual(actualSources, expectedSources);
});

test("vendored translation inputs are minimal and contain no internal-state leaks", async () => {
  const files = (await readdir(TRANSLATION_VENDOR_ROOT, { recursive: true }))
    .filter((name) => /\.(?:json|mjs)$/u.test(name));
  assert.ok(files.length >= 7);
  const banned = [
    /C:\\Users\\/iu,
    /Tistory/iu,
    /cacheFile/iu,
    /retryPolicy/iu,
    /["']assets["']/iu,
  ];
  for (const relativePath of files) {
    const content = await readFile(resolve(TRANSLATION_VENDOR_ROOT, relativePath), "utf8");
    for (const pattern of banned) {
      assert.doesNotMatch(content, pattern, `${relativePath} leaked ${pattern}`);
    }
  }
  for (const sourcePackage of verificationRoot.articles.map((article) => article.sourcePackage)) {
    const snapshot = JSON.parse(
      await readFile(resolve(DEFAULT_SOURCE_ROOT, sourcePackage), "utf8"),
    );
    assert.deepEqual(Object.keys(snapshot).sort(), [
      "article",
      "checkpoints",
      "platforms",
      "schemaVersion",
    ]);
    assert.deepEqual(Object.keys(snapshot.article).sort(), [
      "intro",
      "referenceLinks",
      "sections",
      "title",
    ]);
    assert.ok(snapshot.article.sections.every(
      (section) => JSON.stringify(Object.keys(section).sort()) === JSON.stringify(["body", "heading"]),
    ));
    assert.ok(snapshot.article.referenceLinks.every(
      (link) => JSON.stringify(Object.keys(link)) === JSON.stringify(["label"]),
    ));
    assert.deepEqual(Object.keys(snapshot.platforms), ["naver"]);
    assert.deepEqual(Object.keys(snapshot.platforms.naver).sort(), [
      "status",
      "url",
      "visibility",
    ]);
    assert.deepEqual(snapshot.checkpoints, { publicVerification: { naver: "passed" } });
  }
});

test("Ha Seok-jin factual corrections remain structured and evidence-backed", () => {
  const haManifests = manifests
    .map(({ data }) => data)
    .filter((data) => data.articleId === "ha-seok-jin-love-is-coming-kim-mu-jin");
  assert.equal(haManifests.length, 3);
  const haAudit = verificationRoot.articles.find(
    (article) => article.articleId === "ha-seok-jin-love-is-coming-kim-mu-jin",
  );
  for (const manifest of haManifests) {
    const locale = manifest.localized.locale;
    assert.deepEqual(manifest.corrections, haAudit.locales[locale].corrections);
    assert.deepEqual(
      manifest.corrections.map((correction) => correction.id).sort(),
      ["film-debut-year", "younger-sibling-count"],
    );
    for (const correction of manifest.corrections) {
      assert.ok(`${manifest.source.title}\n${manifest.source.body}`.includes(correction.sourceValue));
      assert.ok(
        `${manifest.localized.title}\n${manifest.localized.description}\n${manifest.localized.body}`
          .includes(correction.localizedValue),
      );
      assert.ok(correction.reason.length > 0);
      assert.equal(new URL(correction.evidenceUrl).protocol, "https:");
    }
  }
});

test("all generated manifests pass the shared translation-publisher validator", () => {
  for (const { name, data } of manifests) {
    const args = [validatorPath, resolve(manifestRoot, name)];
    if (data.status !== "ready") args.push("--allow-noindex");
    const result = spawnSync(
      process.execPath,
      args,
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, `${name}: ${result.stdout}${result.stderr}`);
    const validation = JSON.parse(result.stdout);
    assert.equal(validation.valid, true);
    assert.equal(validation.publishable, data.status === "ready");
    assert.equal(validation.mode, data.mode);
  }
});

test("production verifier accepts a complete reviewed/noindex render", () => {
  const manifest = structuredClone(
    manifests.find(({ data }) => data.localized.locale === "ko").data,
  );
  manifest.status = "reviewed";
  manifest.robots = "noindex,nofollow";
  manifest.publicVerification = null;
  const body = manifest.localized.body
    .split(/\n+/)
    .filter(Boolean)
    .map((fragment) => `<p>${fragment}</p>`)
    .join("");
  const html = [
    `<html lang="${manifest.localized.locale}"><head>`,
    `<title>${manifest.localized.title} | SS.Desk</title>`,
    `<link rel="canonical" href="${manifest.canonical}">`,
    '<meta name="robots" content="noindex,nofollow">',
    `</head><body>${body}</body></html>`,
  ].join("");
  const result = inspectLocalizedHtml({
    html,
    manifest,
    expectedState: "reviewed",
  });
  assert.equal(result.valid, true, result.errors.join(" | "));
});

test("production verifier normalizes Japanese full-width title spacing", () => {
  const manifest = manifests.find(({ data }) => data.localized.locale === "ja").data;
  const fixture = structuredClone(manifest);
  fixture.localized.title = "俳優の現在地　作品の見どころ";
  const html = [
    `<html lang="ja"><head><title>俳優の現在地 作品の見どころ | SS.Desk</title>`,
    `<link rel="canonical" href="${fixture.canonical}">`,
    '<meta name="robots" content="noindex,nofollow"></head>',
    `<body>${fixture.localized.body
      .split(/\n+/)
      .filter(Boolean)
      .map((fragment) => `<p>${fragment}</p>`)
      .join("")}</body></html>`,
  ].join("");
  const result = inspectLocalizedHtml({
    html,
    manifest: fixture,
    expectedState: "reviewed",
  });
  assert.equal(result.valid, true, result.errors.join(" | "));
});

test("a reviewed/noindex fixture cannot pass ready production inspection", () => {
  const manifest = structuredClone(
    manifests.find(({ data }) => data.localized.locale === "ko").data,
  );
  manifest.status = "reviewed";
  manifest.robots = "noindex,nofollow";
  manifest.publicVerification = null;
  const html = [
    `<html lang="${manifest.localized.locale}"><head>`,
    `<title>${manifest.localized.title} | SS.Desk</title>`,
    `<link rel="canonical" href="${manifest.canonical}">`,
    '<meta name="robots" content="noindex,nofollow">',
    `</head><body><p>${manifest.localized.body}</p></body></html>`,
  ].join("");
  const result = inspectLocalizedHtml({ html, manifest, expectedState: "ready" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("ready fixtures create six reciprocal clusters that pass the skill validator", async () => {
  const articleIds = [...new Set(manifests.map(({ data }) => data.articleId))].sort();
  assert.equal(articleIds.length, 6);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "ssundesk-cluster-"));
  try {
    for (const articleId of articleIds) {
      const ready = manifests
        .filter(({ data }) => data.articleId === articleId)
        .map(({ data }) => {
          const manifest = structuredClone(data);
          manifest.status = "ready";
          manifest.robots = "index,follow";
          manifest.publicVerification = {
            status: "verified",
            checkedAt: "2026-08-01T08:00:00.000Z",
            httpStatus: 200,
            resolvedUrl: manifest.localized.url,
          };
          return manifest;
        });
      const cluster = createReadyCluster(articleId, ready);
      assert.ok(cluster);
      assert.equal(cluster.xDefaultLocale, "ko");
      assert.equal(cluster.members.length, 3);
      const expectedAlternates = {
        ko: ready.find((item) => item.localized.locale === "ko").localized.url,
        en: ready.find((item) => item.localized.locale === "en").localized.url,
        ja: ready.find((item) => item.localized.locale === "ja").localized.url,
      };
      expectedAlternates["x-default"] = expectedAlternates.ko;
      for (const member of cluster.members) {
        assert.deepEqual(member.alternates, expectedAlternates);
      }
      const fixturePath = join(temporaryRoot, `${articleId}.json`);
      await writeFile(fixturePath, `${JSON.stringify(cluster, null, 2)}\n`, "utf8");
      const result = spawnSync(process.execPath, [clusterValidatorPath, fixturePath], {
        cwd: projectRoot,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `${articleId}: ${result.stdout}${result.stderr}`);
      assert.equal(JSON.parse(result.stdout).valid, true);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("ready HTML passes with exact reciprocal hreflang and fails when one alternate is missing", () => {
  const articleId = manifests[0].data.articleId;
  const ready = manifests
    .filter(({ data }) => data.articleId === articleId)
    .map(({ data }) => {
      const manifest = structuredClone(data);
      manifest.status = "ready";
      manifest.robots = "index,follow";
      manifest.publicVerification = {
        status: "verified",
        checkedAt: "2026-08-01T08:00:00.000Z",
        httpStatus: 200,
        resolvedUrl: manifest.localized.url,
      };
      return manifest;
    });
  const cluster = createReadyCluster(articleId, ready);
  const manifest = ready.find((item) => item.localized.locale === "en");
  const expectedAlternates = cluster.members.find(
    (member) => member.locale === manifest.localized.locale,
  ).alternates;
  const alternateTags = Object.entries(expectedAlternates).map(
    ([locale, url]) =>
      `<link rel="alternate" hreflang="${locale}" href="${url}">`,
  );
  const body = manifest.localized.body
    .split(/\n+/)
    .filter(Boolean)
    .map((fragment) => `<p>${fragment}</p>`)
    .join("");
  const html = [
    `<html lang="${manifest.localized.locale}"><head>`,
    `<title>${manifest.localized.title} | SS.Desk</title>`,
    `<link rel="canonical" href="${manifest.canonical}">`,
    '<meta name="robots" content="index,follow">',
    ...alternateTags,
    `</head><body>${body}</body></html>`,
  ].join("");
  const valid = inspectLocalizedHtml({
    html,
    manifest,
    expectedState: "ready",
    expectedAlternates,
  });
  assert.equal(valid.valid, true, valid.errors.join(" | "));

  const jaAlternateTag = alternateTags.find((tag) => tag.includes('hreflang="ja"'));
  assert.ok(jaAlternateTag);
  const missingAlternateHtml = html.replace(jaAlternateTag, "");
  const invalid = inspectLocalizedHtml({
    html: missingAlternateHtml,
    manifest,
    expectedState: "ready",
    expectedAlternates,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.includes("ready HTML has an incomplete hreflang map"));
});
