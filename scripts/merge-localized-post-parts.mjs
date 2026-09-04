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
    category: "entertainment",
    start: 119,
    end: 120,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-119-120.json",
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
  {
    category: "entertainment",
    start: 121,
    end: 151,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-121-151.json",
    ),
  },
  {
    category: "stocks",
    start: 71,
    end: 95,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-071-095.json",
    ),
  },
  {
    category: "entertainment",
    start: 152,
    end: 152,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-152-152.json",
    ),
  },
  {
    category: "entertainment",
    start: 153,
    end: 153,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-153-153.json",
    ),
  },
  {
    category: "stocks",
    start: 96,
    end: 96,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-096-096.json",
    ),
  },
  {
    category: "entertainment",
    start: 154,
    end: 154,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-154-154.json",
    ),
  },
  {
    category: "entertainment",
    start: 155,
    end: 155,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-155-155.json",
    ),
  },
  {
    category: "stocks",
    start: 97,
    end: 97,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-097-097.json",
    ),
  },
  {
    category: "entertainment",
    start: 156,
    end: 156,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-156-156.json",
    ),
  },
  {
    category: "stocks",
    start: 98,
    end: 98,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-098-098.json",
    ),
  },
  {
    category: "entertainment",
    start: 157,
    end: 157,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-157-157.json",
    ),
  },
  {
    category: "entertainment",
    start: 158,
    end: 158,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-158-158.json",
    ),
  },
  {
    category: "stocks",
    start: 99,
    end: 99,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-099-099.json",
    ),
  },
  {
    category: "entertainment",
    start: 159,
    end: 160,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-159-160.json",
    ),
  },
  {
    category: "entertainment",
    start: 161,
    end: 161,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-161-161.json",
    ),
  },
  {
    category: "stocks",
    start: 100,
    end: 100,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-100-100.json",
    ),
  },
  {
    category: "entertainment",
    start: 162,
    end: 162,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-162-162.json",
    ),
  },
  {
    category: "entertainment",
    start: 163,
    end: 163,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-163-163.json",
    ),
  },
  {
    category: "entertainment",
    start: 164,
    end: 164,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-164-164.json",
    ),
  },
  {
    category: "entertainment",
    start: 165,
    end: 165,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-165-165.json",
    ),
  },
  {
    category: "stocks",
    start: 101,
    end: 101,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-101-101.json",
    ),
  },
  {
    category: "entertainment",
    start: 166,
    end: 168,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-166-168.json",
    ),
  },
  {
    category: "entertainment",
    start: 169,
    end: 171,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-169-171.json",
    ),
  },
  {
    category: "stocks",
    start: 102,
    end: 102,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "stocks-102-102.json",
    ),
  },
  {
    category: "entertainment",
    start: 172,
    end: 172,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-172-172.json",
    ),
  },
  {
    category: "entertainment",
    start: 173,
    end: 173,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-173-173.json",
    ),
  },
  {
    category: "entertainment",
    start: 174,
    end: 174,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-174-174.json",
    ),
  },
  {
    category: "entertainment",
    start: 175,
    end: 175,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-175-175.json",
    ),
  },
  {
    category: "entertainment",
    start: 176,
    end: 176,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-176-176.json",
    ),
  },
  {
    category: "entertainment",
    start: 177,
    end: 177,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-177-177.json",
    ),
  },
  {
    category: "entertainment",
    start: 178,
    end: 179,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-178-179.json",
    ),
  },
  {
    category: "entertainment",
    start: 180,
    end: 180,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-180-180.json",
    ),
  },
  {
    category: "entertainment",
    start: 181,
    end: 181,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-181-181.json",
    ),
  },
  {
    category: "entertainment",
    start: 182,
    end: 184,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-182-184.json",
    ),
  },
  {
    category: "entertainment",
    start: 185,
    end: 185,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-185-185.json",
    ),
  },
  {
    category: "entertainment",
    start: 186,
    end: 187,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-186-187.json",
    ),
  },
  {
    category: "entertainment",
    start: 188,
    end: 189,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-188-189.json",
    ),
  },
  {
    category: "entertainment",
    start: 190,
    end: 190,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-190-190.json",
    ),
  },
  {
    category: "entertainment",
    start: 191,
    end: 191,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-191-191.json",
    ),
  },
  {
    category: "entertainment",
    start: 192,
    end: 193,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-192-193.json",
    ),
  },
  {
    category: "entertainment",
    start: 194,
    end: 194,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-194-194.json",
    ),
  },
  {
    category: "entertainment",
    start: 195,
    end: 195,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-195-195.json",
    ),
  },
  {
    category: "entertainment",
    start: 196,
    end: 196,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-196-196.json",
    ),
  },
  {
    category: "entertainment",
    start: 197,
    end: 198,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-197-198.json",
    ),
  },
  {
    category: "entertainment",
    start: 199,
    end: 199,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-199-199.json",
    ),
  },
  {
    category: "entertainment",
    start: 200,
    end: 200,
    path: resolve(
      projectRoot,
      "data",
      "localized-post-parts",
      "entertainment-200-200.json",
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
