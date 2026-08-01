import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

import {
  SUPPORTED_LOCALES,
  isLocalizedLocaleReady,
} from "./localized-release-readiness.mjs";
import {
  getEligiblePostDetails,
  postDetailPath,
} from "./post-detail-eligibility.mjs";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ssundesk.com"
).replace(/\/+$/, "");

const indexNowKey = "8fd6498b0d274934ad567cecd1fae369";
const content = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
);
const localizedContent = JSON.parse(
  await readFile(
    new URL("../data/localized-articles.json", import.meta.url),
    "utf8",
  ),
);
const supportedLocales = SUPPORTED_LOCALES;
const archivePageCount = Math.max(1, Math.ceil(content.posts.length / 50));
const archivePages = Array.from(
  { length: Math.max(0, archivePageCount - 1) },
  (_, index) => `${siteUrl}/archive/page/${index + 2}`,
);
const postDetailPages = getEligiblePostDetails(content.posts).map(
  (post) => `${siteUrl}${postDetailPath(post)}`,
);
const readyHubLocales = supportedLocales.filter((locale) =>
  localizedContent.articles.some((article) =>
    isLocalizedLocaleReady(article, locale, siteUrl),
  ),
);
const localizedPages = [
  ...readyHubLocales.map((locale) => `${siteUrl}/${locale}`),
  ...supportedLocales.flatMap((locale) => [
    `${siteUrl}/${locale}/entertainment`,
    `${siteUrl}/${locale}/stocks`,
  ]),
  ...localizedContent.articles.flatMap((article) =>
    supportedLocales
      .filter((locale) => isLocalizedLocaleReady(article, locale, siteUrl))
      .map((locale) => {
        const slug = article.locales?.[locale]?.slug;
        if (
          typeof slug !== "string" ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
        ) {
          throw new Error(
            `Localized article ${article.sourceId || "unknown"} has an invalid ${locale} slug.`,
          );
        }
        return `${siteUrl}/${locale}/news/${slug}`;
      }),
  ),
];
const urlList = [
  `${siteUrl}/`,
  `${siteUrl}/entertainment`,
  `${siteUrl}/stocks`,
  `${siteUrl}/archive`,
  `${siteUrl}/about`,
  ...archivePages,
  ...postDetailPages,
  ...localizedPages,
];

const siteHost = new URL(siteUrl).host;
const uniqueUrlList = [...new Set(urlList)];
if (uniqueUrlList.some((url) => new URL(url).host !== siteHost)) {
  throw new Error("IndexNow URL list contains a URL outside the site host.");
}
if (uniqueUrlList.length > 10_000) {
  throw new Error(
    `IndexNow URL list exceeds the 10,000 URL request limit: ${uniqueUrlList.length}.`,
  );
}

const payload = {
  host: siteHost,
  key: indexNowKey,
  keyLocation: `${siteUrl}/${indexNowKey}.txt`,
  urlList: uniqueUrlList,
};

if (process.env.INDEXNOW_DRY_RUN === "1") {
  console.log(JSON.stringify({ dryRun: true, payload }, null, 2));
  process.exit(0);
}

const maxAttempts = Number(process.env.INDEXNOW_ATTEMPTS || 4);
let response;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  if ([200, 202].includes(response.status)) break;

  const detail = await response.text();
  if (attempt === maxAttempts || ![429, 500, 502, 503, 504].includes(response.status)) {
    throw new Error(
      `IndexNow submission failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const retryAfter = Number(response.headers.get("retry-after"));
  await delay(
    Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1_000, 30_000)
      : 1_000 * 2 ** (attempt - 1),
  );
}

if (!response) throw new Error("IndexNow submission did not run.");

console.log(
  JSON.stringify(
    {
      accepted: true,
      status: response.status,
      host: payload.host,
      submitted: payload.urlList.length,
      keyLocation: payload.keyLocation,
    },
    null,
    2,
  ),
);
