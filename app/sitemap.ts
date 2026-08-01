import type { MetadataRoute } from "next";

import {
  SUPPORTED_LOCALES,
  getReadyArticleAlternates,
  getReadyLocalizedArticles,
  isLocalizedLocaleReady,
  localizedArticles,
  localizedArticlePath,
} from "../lib/localized-content";
import {
  getIndexablePostDetails,
  getPostDetailLastModified,
  postDetailPath,
} from "../lib/post-detail";
import { index } from "../lib/posts";
import { absoluteUrl, ARCHIVE_PAGE_COUNT } from "../lib/site";

type SitemapEntry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(index.generatedAt);

  const primaryRoutes: SitemapEntry[] = [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/entertainment"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/stocks"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/archive"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/about"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const archiveRoutes: SitemapEntry[] = Array.from(
    { length: Math.max(0, ARCHIVE_PAGE_COUNT - 1) },
    (_, index) => ({
      url: absoluteUrl(`/archive/page/${index + 2}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  const readyHubLocales = SUPPORTED_LOCALES.filter(
    (locale) => getReadyLocalizedArticles(locale).length > 0,
  );
  const defaultHubLocale = readyHubLocales.includes("ko")
    ? "ko"
    : readyHubLocales[0];
  const hubLanguages =
    readyHubLocales.length >= 2
      ? {
          ...Object.fromEntries(
            readyHubLocales.map((locale) => [
              locale,
              absoluteUrl(`/${locale}`),
            ]),
          ),
          "x-default": absoluteUrl(`/${defaultHubLocale}`),
        }
      : null;
  const localizedHubRoutes: SitemapEntry[] = readyHubLocales.map(
    (locale) => ({
      url: absoluteUrl(`/${locale}`),
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
      ...(hubLanguages ? { alternates: { languages: hubLanguages } } : {}),
    }),
  );
  const localizedArticleRoutes: SitemapEntry[] = localizedArticles.flatMap(
    (article) => {
      const alternatePaths = getReadyArticleAlternates(article);
      const languages = alternatePaths
        ? Object.fromEntries(
            Object.entries(alternatePaths).map(([locale, path]) => [
              locale,
              absoluteUrl(path),
            ]),
          )
        : null;
      return SUPPORTED_LOCALES.filter((locale) =>
        isLocalizedLocaleReady(article, locale),
      ).map((locale) => ({
        url: absoluteUrl(localizedArticlePath(article, locale)),
        lastModified: new Date(article.locales[locale].updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        ...(languages ? { alternates: { languages } } : {}),
      }));
    },
  );
  const postDetailRoutes: SitemapEntry[] = getIndexablePostDetails().map(
    (post) => ({
      url: absoluteUrl(postDetailPath(post)),
      lastModified: getPostDetailLastModified(post),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }),
  );

  return [
    ...primaryRoutes,
    ...archiveRoutes,
    ...postDetailRoutes,
    ...localizedHubRoutes,
    ...localizedArticleRoutes,
  ];
}
