import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getEligiblePostDetails,
  postDetailPath,
} from "../scripts/post-detail-eligibility.mjs";

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const outputPath = fileURLToPath(outputRoot);
const content = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
);
const localizedContent = JSON.parse(
  await readFile(
    new URL("../data/localized-articles.json", import.meta.url),
    "utf8",
  ),
);
const ownedContent = JSON.parse(
  await readFile(new URL("../data/owned-articles.json", import.meta.url), "utf8"),
);
const allLocalizedArticles = [
  ...localizedContent.articles,
  ...ownedContent.articles,
];
const totalPosts = content.posts.length;
const eligiblePostDetails = getEligiblePostDetails(content.posts);
const archivePageCount = Math.max(1, Math.ceil(totalPosts / 50));
const routeCount =
  archivePageCount +
  4 +
  eligiblePostDetails.length +
  3 +
  6 +
  allLocalizedArticles.length * 3;

function isLocalizedLocaleReady(article, locale) {
  const localized = article.locales?.[locale];
  const verification = localized?.publicVerification;
  const expectedUrl = `${expectedSiteUrl()}/${locale}/news/${localized?.slug || ""}`;
  return Boolean(
    localized?.status === "ready" &&
      localized?.robots === "index,follow" &&
      /^sha256:[a-f0-9]{64}$/.test(article.sourceHash || "") &&
      localized.translatedFromSourceHash === article.sourceHash &&
      verification?.status === "verified" &&
      verification.httpStatus === 200 &&
      verification.checkedAt &&
      (verification.resolvedUrl || "").replace(/\/+$/, "") ===
        expectedUrl.replace(/\/+$/, ""),
  );
}

const readyHubLocales = ["ko", "en", "ja"].filter((locale) =>
  allLocalizedArticles.some((article) =>
    isLocalizedLocaleReady(article, locale),
  ),
);
const readyLocalizedPages = allLocalizedArticles.reduce(
  (total, article) =>
    total +
    ["ko", "en", "ja"].filter((locale) =>
      isLocalizedLocaleReady(article, locale),
    ).length,
  0,
);
const sitemapRouteCount =
  archivePageCount +
  4 +
  eligiblePostDetails.length +
  readyHubLocales.length +
  6 +
  readyLocalizedPages;

function normalizeSiteUrl(value) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function expectedSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  return "https://ssundesk.com";
}

function escapeHtmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function findIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return findIndexFiles(fullPath);
      return entry.name === "index.html" ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

test("Vercel export exposes all posts from root-relative pages", async () => {
  const indexFiles = await findIndexFiles(outputPath);
  assert.equal(indexFiles.length, routeCount);

  const html = (
    await Promise.all(indexFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");
  const logNos = new Set(
    [...html.matchAll(/href="https:\/\/blog\.naver\.com\/tnsqo1126\/(\d+)"/g)].map(
      (match) => match[1],
    ),
  );

  assert.equal(logNos.size, totalPosts);
  assert.doesNotMatch(html, /__VINEXT_RSC|sunstar-content-hub\.sites\.openai\.com/);
  assert.doesNotMatch(html, /\/sunstar-content-hub\/assets\//);
  assert.doesNotMatch(
    html,
    /https:\/\/(?:ssunlee\.github\.io\/sunstar-content-hub|sunstar-content-hub\.vercel\.app)/,
  );
  assert.match(html, /(href|src)="\/assets\//);
  assert.match(html, /data-analytics-event="article_outbound_clicked"/);
  const naverLinks = [
    ...html.matchAll(
      /<a\b[^>]*href="https:\/\/blog\.naver\.com\/tnsqo1126(?:\/\d+)?"[^>]*>/g,
    ),
  ].map((match) => match[0]);
  assert.ok(naverLinks.length > totalPosts);
  for (const link of naverLinks) {
    assert.match(link, /\brel="noopener"/);
    assert.match(link, /\breferrerPolicy="origin"/);
    assert.doesNotMatch(link, /\bnoreferrer\b/);
  }
  for (const post of eligiblePostDetails) {
    assert.ok(
      html.includes(`href="/news/${post.logNo}"`),
      `eligible detail ${post.logNo} has no internal inbound link`,
    );
  }
  assert.doesNotMatch(html, /http-equiv="refresh"|window\.location\.replace/);
});

test("Vercel homepage uses the production title, canonical, and WebSite graph", async () => {
  const [homepage, analyticsScript, staticSearch] = await Promise.all([
    readFile(join(outputPath, "index.html"), "utf8"),
    readFile(join(outputPath, "site-analytics.js"), "utf8"),
    readFile(join(outputPath, "static-search.js"), "utf8"),
  ]);
  const siteUrl = expectedSiteUrl();
  const escapedSiteUrl = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(
    homepage,
    /<title>오늘의 연예·주식 이슈 \| 썬데스크<\/title>/,
  );
  assert.match(
    homepage,
    new RegExp(`rel="canonical" href="${escapedSiteUrl}/"`),
  );
  assert.match(homepage, /"@graph":\[/);
  assert.match(homepage, /"@type":"WebSite"/);
  assert.match(homepage, /"@type":"Organization"/);
  assert.match(homepage, /"name":"썬데스크"/);
  assert.match(
    homepage,
    new RegExp(
      `"publisher":\\{"@id":"${escapedSiteUrl}/#organization"\\}`,
    ),
  );
  assert.match(
    homepage,
    /"alternateName":\["SS\.Desk","쑨쑨 콘텐츠 데스크","쑨쑨 데스크"\]/,
  );
  assert.match(
    homepage,
    new RegExp(`${escapedSiteUrl}/brand/ssdesk-logo-v1\\.png`),
  );
  assert.match(
    homepage,
    new RegExp(`${escapedSiteUrl}/brand/ssdesk-og-v1\\.png`),
  );
  assert.match(homepage, /src="\/brand\/ssdesk-logo-v1\.png"/);
  assert.match(
    homepage,
    new RegExp(`"url":"${escapedSiteUrl}/"`),
  );
  assert.match(
    homepage,
    /<meta name="msvalidate\.01" content="1155F1214144455C499E39A6173CFE8F"\/?>/,
  );
  assert.match(
    homepage,
    /<meta name="google-site-verification" content="gP_sQo1TJMDeAIUZpttQV4hrN8Zg7L48d1dQCQBpKbA"\/?>/,
  );
  assert.match(homepage, /window\.va\('beforeSend'/);
  assert.match(
    homepage,
    /<script defer src="\/_vercel\/insights\/script\.js"><\/script>/,
  );
  assert.match(homepage, /<script defer src="\/site-analytics\.js"><\/script>/);
  assert.ok(
    homepage.indexOf("window.va('beforeSend'") <
      homepage.indexOf("/_vercel/insights/script.js"),
  );
  assert.ok(
    homepage.indexOf("/_vercel/insights/script.js") <
      homepage.indexOf("/site-analytics.js"),
  );
  assert.match(analyticsScript, /article_outbound_clicked/);
  assert.match(analyticsScript, /archive_search_submitted/);
  assert.match(homepage, /searchParams\.delete\('q'\)/);
  assert.match(staticSearch, /analyticsEvent = "article_outbound_clicked"/);
  assert.match(staticSearch, /analyticsArticleId = post\.logNo/);
  assert.match(staticSearch, /referrerPolicy = "origin"/);
  assert.doesNotMatch(staticSearch, /noopener noreferrer/);
  const [logo, socialImage] = await Promise.all([
    readFile(join(outputPath, "brand", "ssdesk-logo-v1.png")),
    readFile(join(outputPath, "brand", "ssdesk-og-v1.png")),
  ]);
  assert.ok(logo.byteLength > 10_000 && logo.byteLength < 600_000);
  assert.ok(socialImage.byteLength > 10_000 && socialImage.byteLength < 600_000);
  const favicon = await readFile(join(outputPath, "favicon.svg"), "utf8");
  assert.match(favicon, /썬데스크 SS 심벌/);
  assert.doesNotMatch(favicon, /<text\b/);
});

test("Vercel search-engine files reference only the primary custom domain", async () => {
  const [sitemap, robots, indexNowKey] = await Promise.all([
    readFile(new URL("sitemap.xml", outputRoot), "utf8"),
    readFile(new URL("robots.txt", outputRoot), "utf8"),
    readFile(
      new URL("8fd6498b0d274934ad567cecd1fae369.txt", outputRoot),
      "utf8",
    ),
  ]);
  const siteUrl = expectedSiteUrl();

  assert.equal((sitemap.match(/<loc>/g) || []).length, sitemapRouteCount);
  assert.doesNotMatch(sitemap, /blog\.naver\.com|ssunlee\.github\.io/);
  assert.match(sitemap, new RegExp(`<loc>${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/</loc>`));
  assert.equal(robots, `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
  assert.equal(indexNowKey.trim(), "8fd6498b0d274934ad567cecd1fae369");
});

test("eligible Naver posts have indexable detail pages and truthful sitemap dates", async () => {
  assert.ok(
    eligiblePostDetails.some((post) => post.logNo === "224364909378"),
    "the Toy Story 5 post that prompted the detail-page rollout must remain indexable",
  );
  const siteUrl = expectedSiteUrl();
  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");

  for (const post of eligiblePostDetails) {
    const route = postDetailPath(post);
    const canonical = `${siteUrl}${route}`;
    const html = await readFile(
      join(outputPath, "news", post.logNo, "index.html"),
      "utf8",
    );
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
    assert.ok(html.includes(post.url));
    assert.ok(html.includes('"@type":"BlogPosting"'));
    assert.match(html, /<meta name="robots" content="index, follow"/i);
    assert.ok(html.includes(`<p>${escapeHtmlText(post.summary.trim())}</p>`));
    const publishedTimestamp = Date.parse(post.publishedAt);
    const detailTimestamp = Date.parse(post.detailUpdatedAt || "");
    const expectedLastmod = new Date(
      Number.isFinite(detailTimestamp)
        ? Math.max(publishedTimestamp, detailTimestamp)
        : publishedTimestamp,
    ).toISOString();
    assert.ok(html.includes(`"dateModified":"${expectedLastmod}"`));
    for (const section of post.detailSections) {
      assert.ok(html.includes(`<h2>${escapeHtmlText(section.heading.trim())}</h2>`));
      for (const paragraph of section.body.split(/\n{2,}/u)) {
        assert.ok(html.includes(`<p>${escapeHtmlText(paragraph.trim())}</p>`));
      }
    }

    const sitemapEntry = sitemap.match(
      new RegExp(
        `<url>\\s*<loc>${canonical.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}</loc>\\s*<lastmod>([^<]+)</lastmod>\\s*</url>`,
      ),
    );
    assert.ok(sitemapEntry, `sitemap entry is missing for ${post.logNo}`);
    assert.equal(sitemapEntry[1], expectedLastmod);
    assert.equal(new Date(sitemapEntry[1]).toISOString(), sitemapEntry[1]);
  }
});

test("IndexNow submits only same-host eligible detail URLs", () => {
  const output = execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/submit-indexnow.mjs", import.meta.url))],
    {
      encoding: "utf8",
      env: { ...process.env, INDEXNOW_DRY_RUN: "1" },
    },
  );
  const result = JSON.parse(output);
  const siteUrl = expectedSiteUrl();
  const expectedHost = new URL(siteUrl).host;
  const submitted = new Set(result.payload.urlList);
  const eligibleLogNos = new Set(
    eligiblePostDetails.map((post) => post.logNo),
  );

  assert.equal(submitted.size, result.payload.urlList.length);
  assert.ok(
    result.payload.urlList.every((url) => new URL(url).host === expectedHost),
  );
  for (const post of content.posts) {
    assert.equal(
      submitted.has(`${siteUrl}/news/${post.logNo}`),
      eligibleLogNos.has(post.logNo),
      `unexpected IndexNow eligibility for ${post.logNo}`,
    );
    assert.equal(submitted.has(post.url), false);
  }
});
