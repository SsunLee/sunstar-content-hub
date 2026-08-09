import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectLocalizedPostCoverage,
  localizedPostSourceHash,
  localizedTranslationSetHash,
  TRANSLATION_LAG_POLICY,
} from "./localized-post-coverage.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsPath = resolve(projectRoot, "data", "posts.json");
const outputPath = resolve(projectRoot, "data", "localized-post-index.json");
const partSpecs = [
  {
    category: "entertainment",
    start: 0,
    end: 53,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-000-053.json",
    ),
  },
  {
    category: "entertainment",
    start: 54,
    end: 106,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-054-106.json",
    ),
  },
  {
    category: "stocks",
    start: 0,
    end: 59,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-000-059.json",
    ),
  },
  {
    category: "entertainment",
    start: 107,
    end: 107,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-107-107.json",
    ),
  },
  {
    category: "entertainment",
    start: 108,
    end: 118,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-108-118.json",
    ),
  },
  {
    category: "stocks",
    start: 60,
    end: 70,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-060-070.json",
    ),
  },
];
const fields = ["title", "summary", "work", "role"];
const targetLocales = ["en", "ja"];

function fail(message) {
  throw new Error(`Localized post index validation failed: ${message}`);
}

function validateTranslation(value, sourcePost, locale, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${context}.${locale} must be an object`);
  }
  const localized = Object.fromEntries(
    fields.map((field) => {
      const translated = value[field];
      if (typeof translated !== "string") {
        fail(`${context}.${locale}.${field} must be a string`);
      }
      if ((field === "title" || field === "summary") && !translated.trim()) {
        fail(`${context}.${locale}.${field} must not be empty`);
      }
      if (!sourcePost[field] && translated !== "") {
        fail(`${context}.${locale}.${field} must stay empty when the source is empty`);
      }
      if (/[가-힣]/u.test(translated)) {
        fail(`${context}.${locale}.${field} contains untranslated Korean text`);
      }
      return [field, translated.trim()];
    }),
  );
  return localized;
}

const content = JSON.parse(await readFile(postsPath, "utf8"));
const sourcePosts = content.posts.filter(
  (post) => post.category === "entertainment" || post.category === "stocks",
);
const sourceByLogNo = new Map(sourcePosts.map((post) => [post.logNo, post]));
const translations = [];
let sourceGeneratedAt = null;

for (const spec of partSpecs) {
  const part = JSON.parse(await readFile(spec.path, "utf8"));
  if (
    part.schemaVersion !== 1 ||
    !Number.isFinite(Date.parse(part.sourceGeneratedAt)) ||
    part.category !== spec.category ||
    part.start !== spec.start ||
    part.end !== spec.end ||
    !Array.isArray(part.translations)
  ) {
    fail(`${spec.path} has an invalid envelope`);
  }
  if (sourceGeneratedAt && sourceGeneratedAt !== part.sourceGeneratedAt) {
    fail(`${spec.path} does not share the translation source cutoff`);
  }
  sourceGeneratedAt = part.sourceGeneratedAt;
  const expectedCount = spec.end - spec.start + 1;
  if (part.translations.length !== expectedCount) {
    fail(
      `${spec.path} contains ${part.translations.length} entries; expected ${expectedCount}`,
    );
  }
  for (const [index, translation] of part.translations.entries()) {
    const sourcePost = sourceByLogNo.get(translation.logNo);
    const context = `${spec.category}[${spec.start + index}]`;
    if (!sourcePost || sourcePost.category !== spec.category) {
      fail(`${context} source ${translation.logNo} is missing or changed category`);
    }
    if (Date.parse(sourcePost.publishedAt) > Date.parse(sourceGeneratedAt)) {
      fail(`${context} source ${translation.logNo} is newer than the part cutoff`);
    }
    translations.push({
      logNo: sourcePost.logNo,
      sourceHash: localizedPostSourceHash(sourcePost),
      source: Object.fromEntries(
        fields.map((field) => [field, sourcePost[field] || ""]),
      ),
      locales: Object.fromEntries(
        targetLocales.map((locale) => [
          locale,
          validateTranslation(translation[locale], sourcePost, locale, context),
        ]),
      ),
    });
  }
}

const sourceOrder = new Map(
  sourcePosts.map((post, index) => [post.logNo, index]),
);
translations.sort(
  (left, right) => sourceOrder.get(left.logNo) - sourceOrder.get(right.logNo),
);
const actualLogNos = translations.map((entry) => entry.logNo);
if (new Set(actualLogNos).size !== actualLogNos.length) {
  fail("duplicate logNo values found");
}

const output = {
  schemaVersion: 1,
  sourceGeneratedAt,
  generatedAt: content.generatedAt,
  translationLag: {
    policy: TRANSLATION_LAG_POLICY,
    sourceCutoff: sourceGeneratedAt,
    translatedCount: translations.length,
    translationSetHash: localizedTranslationSetHash(translations),
  },
  counts: {
    entertainment: translations.filter(
      (translation) => sourceByLogNo.get(translation.logNo)?.category === "entertainment",
    ).length,
    stocks: translations.filter(
      (translation) => sourceByLogNo.get(translation.logNo)?.category === "stocks",
    ).length,
  },
  translations,
};

inspectLocalizedPostCoverage(content, output);

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      outputPath,
      total: translations.length,
      counts: output.counts,
      locales: targetLocales,
    },
    null,
    2,
  ),
);
