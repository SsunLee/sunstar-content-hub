import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  inspectLocalizedPostCoverage,
  localizedPostSourceHash,
  localizedTranslationSetHash,
  TRANSLATION_LAG_POLICY,
} from "../scripts/localized-post-coverage.mjs";

const [content, localized] = await Promise.all([
  readFile(new URL("../data/posts.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(
    new URL("../data/localized-post-index.json", import.meta.url),
    "utf8",
  ).then(JSON.parse),
]);
const fields = ["title", "summary", "work", "role"];
const sourcePosts = content.posts.filter(
  (post) => post.category === "entertainment" || post.category === "stocks",
);

test("localized index preserves the exact 167-entry translated snapshot without source drift", () => {
  const coverage = inspectLocalizedPostCoverage(content, localized);
  const sourceByLogNo = new Map(sourcePosts.map((post) => [post.logNo, post]));
  assert.equal(localized.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(localized.sourceGeneratedAt)));
  assert.deepEqual(localized.translationLag, {
    policy: TRANSLATION_LAG_POLICY,
    sourceCutoff: localized.sourceGeneratedAt,
    translatedCount: 167,
    translationSetHash:
      "sha256:b2e6911014847a9e7f14d0a445039df1aba9c11d885a9960918a4c7481dbd396",
  });
  assert.deepEqual(localized.counts, {
    entertainment: 107,
    stocks: 60,
  });
  assert.equal(coverage.translatedCount, 167);
  assert.equal(
    localizedTranslationSetHash(localized.translations),
    localized.translationLag.translationSetHash,
  );
  assert.equal(new Set(localized.translations.map((entry) => entry.logNo)).size, 167);

  for (const translation of localized.translations) {
    const source = sourceByLogNo.get(translation.logNo);
    assert.ok(source, `missing translated source ${translation.logNo}`);
    assert.equal(translation.sourceHash, localizedPostSourceHash(source));
    assert.deepEqual(
      translation.source,
      Object.fromEntries(fields.map((field) => [field, source[field] || ""])),
    );
    for (const locale of ["en", "ja"]) {
      const copy = translation.locales[locale];
      for (const field of fields) {
        assert.equal(typeof copy[field], "string");
        if (field === "title" || field === "summary") {
          assert.ok(copy[field].trim(), `${source.logNo}.${locale}.${field} is empty`);
        }
        if (!source[field]) assert.equal(copy[field], "");
        assert.doesNotMatch(
          copy[field],
          /[가-힣]/u,
          `${source.logNo}.${locale}.${field} contains Korean text`,
        );
      }
    }
  }
});

test("a newly synced source may wait for en and ja without blocking sync", () => {
  const currentCoverage = inspectLocalizedPostCoverage(content, localized);
  const nextContent = structuredClone(content);
  const sourceCutoff = Date.parse(localized.sourceGeneratedAt);
  nextContent.generatedAt = new Date(sourceCutoff + 1).toISOString();
  const newPost = {
    ...structuredClone(sourcePosts[0]),
    id: "naver:tnsqo1126:translation-lag-fixture",
    logNo: "translation-lag-fixture",
    title: "새 동기화 글",
    summary: "번역 배치가 뒤따라오기 전 한국어 원문 색인에 먼저 반영되는 새 글입니다.",
    work: "새 작품",
    role: "새 역할",
    publishedAt: new Date(sourceCutoff - 60_000).toISOString(),
  };
  nextContent.posts.unshift(newPost);

  const coverage = inspectLocalizedPostCoverage(nextContent, localized);
  assert.equal(coverage.translatedCount, 167);
  assert.equal(coverage.pending.length, currentCoverage.pending.length + 1);
  assert.ok(coverage.pending.some((post) => post.logNo === newPost.logNo));
});

test("translation lag cannot hide an old omission or source drift", () => {
  const translatedLogNos = new Set(
    localized.translations.map((translation) => translation.logNo),
  );
  const snapshotContent = structuredClone(content);
  snapshotContent.generatedAt = localized.sourceGeneratedAt;
  snapshotContent.posts = snapshotContent.posts.filter(
    (post) =>
      (post.category !== "entertainment" && post.category !== "stocks") ||
      translatedLogNos.has(post.logNo),
  );
  const missingTranslation = structuredClone(localized);
  const removed = missingTranslation.translations.shift();
  missingTranslation.counts.entertainment -= 1;
  missingTranslation.translationLag.translatedCount -= 1;
  missingTranslation.translationLag.translationSetHash =
    localizedTranslationSetHash(missingTranslation.translations);
  assert.throws(
    () => inspectLocalizedPostCoverage(snapshotContent, missingTranslation),
    new RegExp(`translation source snapshot is missing ${removed.logNo}`),
  );

  const driftedContent = structuredClone(content);
  const driftedPost = driftedContent.posts.find(
    (post) => post.logNo === localized.translations[0].logNo,
  );
  driftedPost.title = `${driftedPost.title} 수정`;
  assert.throws(
    () => inspectLocalizedPostCoverage(driftedContent, localized),
    new RegExp(`source drift at ${driftedPost.logNo}`),
  );
});
