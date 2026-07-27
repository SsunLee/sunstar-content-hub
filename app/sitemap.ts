import type { MetadataRoute } from "next";

import { absoluteUrl, ARCHIVE_PAGE_COUNT } from "../lib/site";

type SitemapEntry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

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

  return [...primaryRoutes, ...archiveRoutes];
}
