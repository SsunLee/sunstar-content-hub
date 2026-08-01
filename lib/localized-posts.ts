import { createHash } from "node:crypto";

import rawIndex from "@/data/localized-post-index.json";
import {
  type Locale,
} from "@/lib/localized-content";
import {
  index as postIndex,
  posts,
  type Post,
  type PostCategory,
} from "@/lib/posts";

export type LocalizedPostCopy = {
  title: string;
  summary: string;
  work: string;
  role: string;
};

type LocalizedPostTranslation = {
  logNo: string;
  sourceHash: string;
  source: LocalizedPostCopy;
  locales: Record<"en" | "ja", LocalizedPostCopy>;
};

type LocalizedPostIndex = {
  schemaVersion: number;
  sourceGeneratedAt: string;
  generatedAt: string;
  translationLag: {
    policy: "newer-source-posts-only";
    sourceCutoff: string;
    translatedCount: number;
    translationSetHash: string;
  };
  counts: {
    entertainment: number;
    stocks: number;
  };
  translations: LocalizedPostTranslation[];
};

export type LocalizedPost = {
  post: Post;
  copy: LocalizedPostCopy;
};

const translatedCategories = new Set<PostCategory>([
  "entertainment",
  "stocks",
]);
const fields = ["title", "summary", "work", "role"] as const;

function sourceCopy(post: Post): LocalizedPostCopy {
  return {
    title: post.title,
    summary: post.summary,
    work: post.work,
    role: post.role,
  };
}

function sourceHash(post: Post) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(sourceCopy(post)))
    .digest("hex")}`;
}

function translationSetHash(translations: LocalizedPostTranslation[]) {
  const logNos = translations.map((translation) => translation.logNo).sort();
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(logNos))
    .digest("hex")}`;
}

function validateIndex(value: unknown): LocalizedPostIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Localized post index must be an object");
  }
  const index = value as LocalizedPostIndex;
  const sourcePosts = posts.filter((post) => translatedCategories.has(post.category));
  const sourceByLogNo = new Map(sourcePosts.map((post) => [post.logNo, post]));
  const sourceCutoff = Date.parse(index.sourceGeneratedAt);
  const currentSourceGeneratedAt = Date.parse(postIndex.generatedAt);
  if (
    index.schemaVersion !== 1 ||
    index.translationLag?.policy !== "newer-source-posts-only" ||
    index.translationLag?.sourceCutoff !== index.sourceGeneratedAt ||
    index.translationLag?.translatedCount !== index.translations?.length ||
    index.translationLag?.translationSetHash !==
      translationSetHash(index.translations || []) ||
    !Number.isFinite(sourceCutoff) ||
    !Number.isFinite(currentSourceGeneratedAt) ||
    currentSourceGeneratedAt < sourceCutoff ||
    !Array.isArray(index.translations) ||
    index.translations.length === 0 ||
    new Set(index.translations.map((translation) => translation.logNo)).size !==
      index.translations.length
  ) {
    throw new Error("Localized post index envelope or coverage is invalid");
  }
  const translatedLogNos = new Set<string>();
  const translatedCounts = { entertainment: 0, stocks: 0 };
  for (const translation of index.translations) {
    const post = sourceByLogNo.get(translation.logNo);
    if (
      !post ||
      translation.sourceHash !== sourceHash(post) ||
      fields.some(
        (field) => translation.source?.[field] !== (post[field] || ""),
      )
    ) {
      throw new Error(`Localized post source drift at ${translation.logNo}`);
    }
    translatedLogNos.add(translation.logNo);
    translatedCounts[post.category as "entertainment" | "stocks"] += 1;
    for (const locale of ["en", "ja"] as const) {
      const copy = translation.locales?.[locale];
      if (!copy || !copy.title || !copy.summary) {
        throw new Error(`Localized post copy is incomplete at ${post.logNo}.${locale}`);
      }
      if (fields.some((field) => typeof copy[field] !== "string")) {
        throw new Error(`Localized post fields are invalid at ${post.logNo}.${locale}`);
      }
      if (fields.some((field) => /[가-힣]/u.test(copy[field]))) {
        throw new Error(`Localized post contains Korean text at ${post.logNo}.${locale}`);
      }
    }
  }
  if (
    index.counts?.entertainment !== translatedCounts.entertainment ||
    index.counts?.stocks !== translatedCounts.stocks
  ) {
    throw new Error("Localized post translated counts are invalid");
  }
  const pendingPost = sourcePosts.find(
    (post) => !translatedLogNos.has(post.logNo),
  );
  if (pendingPost && currentSourceGeneratedAt === sourceCutoff) {
    throw new Error(
      `Localized post source snapshot is missing ${pendingPost.logNo}`,
    );
  }
  return index;
}

export const localizedPostIndex = validateIndex(rawIndex);

const translationByLogNo = new Map(
  localizedPostIndex.translations.map((translation) => [
    translation.logNo,
    translation,
  ]),
);

export function getLocalizedPostCopy(post: Post, locale: Locale) {
  if (locale === "ko") return sourceCopy(post);
  const translation = translationByLogNo.get(post.logNo);
  if (!translation) {
    throw new Error(`Missing localized post translation for ${post.logNo}`);
  }
  return translation.locales[locale];
}

export function getLocalizedPosts(
  locale: Locale,
  category?: Extract<PostCategory, "entertainment" | "stocks">,
): LocalizedPost[] {
  return posts
    .filter(
      (post) =>
        translatedCategories.has(post.category) &&
        (!category || post.category === category) &&
        (locale === "ko" || translationByLogNo.has(post.logNo)),
    )
    .map((post) => ({ post, copy: getLocalizedPostCopy(post, locale) }));
}

export function getFeaturedLocalizedPosts(
  locale: Locale,
  category: Extract<PostCategory, "entertainment" | "stocks">,
  limit = 6,
) {
  return getLocalizedPosts(locale, category)
    .filter(({ post }) => post.image && post.summary)
    .slice(0, limit);
}
