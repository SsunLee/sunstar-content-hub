import rawContent from "@/data/owned-articles.json";

import {
  SUPPORTED_LOCALES,
  isLocalizedLocaleReady,
  localizedArticlePath,
  type ArticleLocale,
  type Locale,
  type LocalizedArticle,
  type LocalizedSource,
} from "@/lib/localized-content";

export type OwnedGalleryCopy = {
  alt: string;
  caption: string;
};

export type OwnedGalleryImage = {
  src: string;
  width: number;
  height: number;
  sha256: `sha256:${string}`;
  sourcePage: string;
  creator: string;
  licenseName: string;
  licenseUrl: string;
  treatment: string;
  locales: Record<Locale, OwnedGalleryCopy>;
};

export type PopularityEvidence = {
  observedAt: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
};

export type OwnedArticle = LocalizedArticle & {
  sourceKind: "owned";
  researchVerifiedAt: string;
  textRights: "SS.Desk original";
  popularityEvidence: PopularityEvidence;
  gallery: OwnedGalleryImage[];
  locales: Record<Locale, ArticleLocale>;
};

type OwnedContentIndex = {
  schemaVersion: number;
  generatedAt: string;
  articles: OwnedArticle[];
};

export const ownedContent = rawContent as unknown as OwnedContentIndex;
export const ownedArticles = ownedContent.articles;

export function getOwnedArticle(locale: Locale, slug: string) {
  return ownedArticles.find((article) => article.locales[locale].slug === slug);
}

export function getReadyOwnedArticles(locale: Locale, category?: string) {
  return ownedArticles
    .filter(
      (article) =>
        (!category || article.category === category) &&
        isLocalizedLocaleReady(article, locale),
    )
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime(),
    );
}

export function ownedArticlePath(article: OwnedArticle, locale: Locale) {
  return localizedArticlePath(article, locale);
}

export function getOwnedArticleAlternates(article: OwnedArticle) {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      ownedArticlePath(article, locale),
    ]),
  ) as Record<Locale, string>;
}

export function isOwnedArticle(article: LocalizedArticle): article is OwnedArticle {
  return "sourceKind" in article && article.sourceKind === "owned";
}

export type { LocalizedSource };
