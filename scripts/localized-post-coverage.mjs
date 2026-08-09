import { createHash } from "node:crypto";

export const TRANSLATION_LAG_POLICY = "newer-source-posts-only";
export const LOCALIZED_POST_FIELDS = ["title", "summary", "work", "role"];
export const LOCALIZED_POST_CATEGORIES = ["entertainment", "stocks"];

function fail(message) {
  throw new Error(`Localized post coverage validation failed: ${message}`);
}

function sourceCopy(post) {
  return Object.fromEntries(
    LOCALIZED_POST_FIELDS.map((field) => [field, post[field] || ""]),
  );
}

export function localizedPostSourceHash(post) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(sourceCopy(post)))
    .digest("hex")}`;
}

export function localizedTranslationSetHash(translations) {
  const logNos = translations.map((translation) => translation.logNo).sort();
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(logNos))
    .digest("hex")}`;
}

export function inspectLocalizedPostCoverage(content, index) {
  if (!content || !Array.isArray(content.posts)) {
    fail("posts.json must contain a posts array");
  }
  if (!index || typeof index !== "object" || Array.isArray(index)) {
    fail("localized-post-index.json must contain an object");
  }
  if (index.schemaVersion !== 1 || !Array.isArray(index.translations)) {
    fail("localized post index envelope is invalid");
  }
  if (index.translationLag?.policy !== TRANSLATION_LAG_POLICY) {
    fail(`translationLag.policy must be ${TRANSLATION_LAG_POLICY}`);
  }
  if (index.translationLag?.sourceCutoff !== index.sourceGeneratedAt) {
    fail("translationLag.sourceCutoff must equal sourceGeneratedAt");
  }
  if (index.translationLag?.translatedCount !== index.translations.length) {
    fail("translationLag.translatedCount must match the translation set");
  }
  if (
    index.translationLag?.translationSetHash !==
    localizedTranslationSetHash(index.translations)
  ) {
    fail("translationLag.translationSetHash must match the translation set");
  }

  const sourceCutoff = Date.parse(index.sourceGeneratedAt);
  if (!Number.isFinite(sourceCutoff)) {
    fail("sourceGeneratedAt must be a valid timestamp");
  }
  const currentSourceGeneratedAt = Date.parse(content.generatedAt);
  if (!Number.isFinite(currentSourceGeneratedAt)) {
    fail("posts.json generatedAt must be a valid timestamp");
  }
  if (currentSourceGeneratedAt < sourceCutoff) {
    fail("posts.json cannot predate the translation source cutoff");
  }

  const sourcePosts = content.posts.filter((post) =>
    LOCALIZED_POST_CATEGORIES.includes(post.category),
  );
  const sourceByLogNo = new Map(sourcePosts.map((post) => [post.logNo, post]));
  if (sourceByLogNo.size !== sourcePosts.length) {
    fail("source posts contain duplicate logNo values");
  }

  const translatedLogNos = new Set();
  const translatedCounts = Object.fromEntries(
    LOCALIZED_POST_CATEGORIES.map((category) => [category, 0]),
  );

  for (const translation of index.translations) {
    if (!translation?.logNo || translatedLogNos.has(translation.logNo)) {
      fail(`duplicate or missing translated logNo ${translation?.logNo || "(empty)"}`);
    }
    translatedLogNos.add(translation.logNo);

    const post = sourceByLogNo.get(translation.logNo);
    if (!post) {
      fail(`translated source ${translation.logNo} is missing or changed category`);
    }
    const expectedSource = sourceCopy(post);
    if (JSON.stringify(translation.source) !== JSON.stringify(expectedSource)) {
      fail(`source drift at ${translation.logNo}`);
    }
    if (translation.sourceHash !== localizedPostSourceHash(post)) {
      fail(`source hash drift at ${translation.logNo}`);
    }
    translatedCounts[post.category] += 1;
  }

  for (const category of LOCALIZED_POST_CATEGORIES) {
    if (index.counts?.[category] !== translatedCounts[category]) {
      fail(
        `counts.${category} must equal the translated entry count ${translatedCounts[category]}`,
      );
    }
  }

  // A card needs both a title and a summary in every locale.  Keep incomplete
  // Naver records out of the translation queue until the source sync supplies
  // the missing summary; they must not make a fully refreshed snapshot invalid.
  const pending = sourcePosts.filter(
    (post) => post.title && post.summary && !translatedLogNos.has(post.logNo),
  );
  if (pending.length > 0 && currentSourceGeneratedAt === sourceCutoff) {
    fail(
      `the translation source snapshot is missing ${pending[0].logNo}`,
    );
  }

  return {
    sourceCutoff: index.sourceGeneratedAt,
    currentSourceGeneratedAt: content.generatedAt,
    translatedCount: index.translations.length,
    translatedCounts,
    pending,
  };
}
