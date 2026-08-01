import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { isLocalizedLocaleReady as isIndexNowReady } from "../scripts/localized-release-readiness.mjs";

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const outputPath = fileURLToPath(outputRoot);
const localized = JSON.parse(
  await readFile(
    new URL("../data/localized-articles.json", import.meta.url),
    "utf8",
  ),
);
const locales = ["ko", "en", "ja"];

function normalizeSiteUrl(value) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://ssundesk.com",
);

function articlePath(article, locale) {
  return `/${locale}/news/${article.locales[locale].slug}`;
}

function alternateTags(html) {
  return html.match(/<link\b[^>]*\brel="alternate"[^>]*>/gi) || [];
}

function hasAlternate(html, locale, href) {
  return alternateTags(html).some(
    (tag) =>
      new RegExp(`\\bhreflang="${locale}"`, "i").test(tag) &&
      tag.includes(`href="${href}"`),
  );
}

function hasReleaseEvidence(article, locale) {
  const localizedArticle = article.locales[locale];
  const verification = localizedArticle.publicVerification;
  return Boolean(
    localizedArticle.status === "ready" &&
      localizedArticle.robots === "index,follow" &&
      /^sha256:[a-f0-9]{64}$/.test(article.sourceHash || "") &&
      localizedArticle.translatedFromSourceHash === article.sourceHash &&
      verification?.status === "verified" &&
      verification.httpStatus === 200 &&
      verification.checkedAt &&
      (verification.resolvedUrl || "").replace(/\/+$/, "") ===
        `${siteUrl}${articlePath(article, locale)}`,
  );
}

function readyLocales(article) {
  return locales.filter((locale) => hasReleaseEvidence(article, locale));
}

function isReady(article, locale) {
  return hasReleaseEvidence(article, locale) && readyLocales(article).length >= 2;
}

const readyHubLocales = locales.filter((locale) =>
  localized.articles.some((article) => isReady(article, locale)),
);

test("a single verified locale is not indexable without a reciprocal cluster", () => {
  const article = structuredClone(localized.articles[0]);
  for (const locale of locales) {
    const copy = article.locales[locale];
    copy.status = locale === "ko" ? "ready" : "reviewed";
    copy.robots = locale === "ko" ? "index,follow" : "noindex,nofollow";
    copy.publicVerification =
      locale === "ko"
        ? {
            status: "verified",
            checkedAt: "2026-08-01T08:00:00.000Z",
            httpStatus: 200,
            resolvedUrl: `${siteUrl}${articlePath(article, locale)}`,
          }
        : null;
  }
  assert.deepEqual(readyLocales(article), ["ko"]);
  assert.equal(isReady(article, "ko"), false);
  assert.equal(isIndexNowReady(article, "ko", siteUrl), false);
});

test("localized hubs use native shells and fail closed until content is ready", async () => {
  const homepage = await readFile(join(outputPath, "index.html"), "utf8");
  for (const locale of locales) {
    const html = await readFile(
      join(outputPath, locale, "index.html"),
      "utf8",
    );
    assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`, "i"));
    const expectedAuthor =
      locale === "ko"
        ? "쑨쑨배"
        : locale === "en"
          ? "SS.Desk Editorial Team"
          : "SS.Desk編集部";
    assert.ok(html.includes(`<meta name="author" content="${expectedAuthor}"`));
    assert.ok(html.includes(`<meta name="creator" content="${expectedAuthor}"`));
    if (locale !== "ko") {
      const keywordMeta = html.match(/<meta name="keywords" content="([^"]*)"/i)?.[1] || "";
      assert.doesNotMatch(keywordMeta, /[가-힣]/u);
      assert.equal(html.includes('content="쑨쑨배"'), false);
    }
    const languageLabel =
      locale === "ko" ? "언어별 기사" : locale === "en" ? "Language versions" : "言語別の記事";
    const footerLabel =
      locale === "ko" ? "하단 메뉴" : locale === "en" ? "Footer" : "フッターメニュー";
    assert.ok(html.includes(`aria-label="${languageLabel}"`));
    assert.ok(html.includes(`aria-label="${footerLabel}"`));
    assert.match(
      html,
      new RegExp(`rel="canonical" href="${siteUrl}/${locale}"`),
    );
    assert.ok(homepage.includes(`href="/${locale}"`));
    const hubReady = readyHubLocales.includes(locale);
    assert.match(
      html,
      hubReady
        ? /data-indexing-state="ready"/
        : /data-indexing-state="noindex_pending_review"/,
    );
    assert.match(
      html,
      hubReady
        ? /<meta name="robots" content="index, follow"/i
        : /<meta name="robots" content="noindex, nofollow"/i,
    );
    if (readyHubLocales.length >= 2) {
      for (const alternateLocale of readyHubLocales) {
        assert.ok(
          hasAlternate(html, alternateLocale, `${siteUrl}/${alternateLocale}`),
        );
      }
    } else {
      assert.equal(alternateTags(html).length, 0);
    }
    const displayed = hubReady
      ? localized.articles.filter((article) => isReady(article, locale))
      : localized.articles;
    for (const article of displayed) {
      assert.ok(
        html.includes(`href="${articlePath(article, locale)}"`),
        `${locale} hub does not link ${article.sourceId}`,
      );
    }
    assert.match(html, /data-analytics-event="localized_article_opened"/);
    assert.doesNotMatch(html, /<header class="site-header"|<footer class="site-footer"/);
    assert.doesNotMatch(html, /data-static-shell-marker=/);
    assert.match(html, /class="localized-footer"/);
    assert.doesNotMatch(html, /http-equiv="refresh"|window\.location\.replace/);
  }
});

test("localized stories expose complete metadata, schema, switching, and source CTAs", async () => {
  for (const article of localized.articles) {
    for (const locale of locales) {
      const currentPath = articlePath(article, locale);
      const html = await readFile(
        join(
          outputPath,
          locale,
          "news",
          article.locales[locale].slug,
          "index.html",
        ),
        "utf8",
      );
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`, "i"));
      const expectedMetaAuthor =
        locale === "ko"
          ? "쑨쑨배"
          : locale === "en"
            ? "SS.Desk Editorial Team"
            : "SS.Desk編集部";
      assert.ok(html.includes(`<meta name="author" content="${expectedMetaAuthor}"`));
      assert.ok(html.includes(`<meta name="creator" content="${expectedMetaAuthor}"`));
      if (locale !== "ko") {
        const keywordMeta = html.match(/<meta name="keywords" content="([^"]*)"/i)?.[1] || "";
        assert.doesNotMatch(keywordMeta, /[가-힣]/u);
        assert.equal(html.includes('content="쑨쑨배"'), false);
      }
      const articleLanguageLabel =
        locale === "ko" ? "언어별 기사" : locale === "en" ? "Language versions" : "言語別の記事";
      const breadcrumbLabel =
        locale === "ko" ? "현재 위치" : locale === "en" ? "Breadcrumb" : "現在位置";
      const articleFooterLabel =
        locale === "ko" ? "하단 메뉴" : locale === "en" ? "Footer" : "フッターメニュー";
      assert.ok(html.includes(`aria-label="${articleLanguageLabel}"`));
      assert.ok(html.includes(`aria-label="${breadcrumbLabel}"`));
      assert.ok(html.includes(`aria-label="${articleFooterLabel}"`));
      assert.ok(html.includes(article.locales[locale].title));
      assert.ok(html.includes(article.locales[locale].work));
      assert.ok(html.includes(article.locales[locale].subject));
      if (locale !== "ko") {
        assert.equal(html.includes(article.work), false);
        assert.equal(html.includes(article.subject), false);
      }
      assert.equal(
        html.includes(article.image),
        false,
        `${currentPath} must not reuse an unverified source thumbnail`,
      );
      assert.match(
        html,
        new RegExp(`rel="canonical" href="${siteUrl}${currentPath}"`),
      );
      const ready = isReady(article, locale);
      assert.match(
        html,
        ready
          ? /<meta name="robots" content="index, follow"/i
          : /<meta name="robots" content="noindex, nofollow"/i,
      );
      assert.match(
        html,
        ready
          ? /data-indexing-state="ready"/
          : /data-indexing-state="noindex_pending_review"/,
      );
      const cluster = readyLocales(article);
      for (const alternateLocale of locales) {
        if (alternateLocale === locale) {
          assert.match(
            html,
            new RegExp(
              `<span[^>]*lang="${locale}"[^>]*aria-current="page"|<span[^>]*aria-current="page"[^>]*lang="${locale}"`,
              "i",
            ),
          );
          assert.equal(
            html.includes(`data-analytics-to-locale="${locale}"`),
            false,
            `${currentPath} must not track a same-language switch`,
          );
        } else {
          assert.ok(
            html.includes(`href="${articlePath(article, alternateLocale)}"`),
            `${currentPath} is missing the ${alternateLocale} language switch`,
          );
        }
      }
      if (ready && cluster.length >= 2) {
        for (const alternateLocale of cluster) {
          assert.ok(
            hasAlternate(
              html,
              alternateLocale,
              `${siteUrl}${articlePath(article, alternateLocale)}`,
            ),
          );
        }
        assert.ok(alternateTags(html).some((tag) => /hreflang="x-default"/i.test(tag)));
      } else {
        assert.equal(alternateTags(html).length, 0);
      }
      assert.match(html, /property="og:type" content="article"/);
      assert.match(html, /"@type":"NewsArticle"/);
      assert.match(html, /"@type":"BreadcrumbList"/);
      assert.ok(html.includes(`"dateModified":"${article.locales[locale].updatedAt}"`));
      assert.ok(html.includes(`"name":"${
        locale === "ko"
          ? "쑨쑨배"
          : locale === "en"
            ? "SS.Desk Editorial Team"
            : "SS.Desk編集部"
      }"`));
      for (const source of article.sources) {
        const localizedName = source.names?.[locale] || source.name;
        assert.ok(html.includes(localizedName));
        if (locale !== "ko") assert.doesNotMatch(localizedName, /[가-힣]/u);
      }
      assert.ok(html.includes(`href="/${locale}"`));
      assert.ok(html.includes(`href="${article.sourceUrl}"`));
      assert.match(
        html,
        /data-analytics-event="localized_article_outbound_clicked"/,
      );
      assert.ok(html.includes(`data-analytics-locale="${locale}"`));
      assert.doesNotMatch(html, /<header class="site-header"|<footer class="site-footer"/);
      assert.doesNotMatch(html, /data-static-shell-marker=/);
      assert.doesNotMatch(html, /http-equiv="refresh"|window\.location\.replace/);
    }
  }
});

test("sitemap includes only release-ready localized URLs and clusters", async () => {
  const sitemap = await readFile(join(outputPath, "sitemap.xml"), "utf8");
  assert.match(
    sitemap,
    /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/,
  );
  for (const locale of locales) {
    assert.equal(
      sitemap.includes(`<loc>${siteUrl}/${locale}</loc>`),
      readyHubLocales.includes(locale),
    );
  }
  for (const article of localized.articles) {
    for (const locale of locales) {
      const url = `${siteUrl}${articlePath(article, locale)}`;
      assert.equal(sitemap.includes(`<loc>${url}</loc>`), isReady(article, locale));
      if (isReady(article, locale) && readyLocales(article).length >= 2) {
        assert.ok(sitemap.includes(`hreflang="${locale}" href="${url}"`));
      }
    }
  }
});

test("IndexNow submits only ready localized pages without external sources", () => {
  const output = execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/submit-indexnow.mjs", import.meta.url))],
    {
      encoding: "utf8",
      env: { ...process.env, INDEXNOW_DRY_RUN: "1" },
    },
  );
  const result = JSON.parse(output);
  assert.equal(result.dryRun, true);
  const submitted = new Set(result.payload.urlList);
  for (const locale of locales) {
    assert.equal(
      submitted.has(`${siteUrl}/${locale}`),
      readyHubLocales.includes(locale),
    );
  }
  for (const article of localized.articles) {
    for (const locale of locales) {
      assert.equal(
        submitted.has(`${siteUrl}${articlePath(article, locale)}`),
        isReady(article, locale),
      );
    }
    assert.equal(submitted.has(article.sourceUrl), false);
  }
});
