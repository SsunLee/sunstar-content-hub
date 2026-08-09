import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { validateOwnedContent } from "../scripts/validate-owned-articles.mjs";

const owned = JSON.parse(
  await readFile(new URL("../data/owned-articles.json", import.meta.url), "utf8"),
);

test("owned articles keep the research, locale, image and review contracts", async () => {
  const result = await validateOwnedContent();
  if (result.articles < 1) throw new Error("expected at least one owned article");
  if (result.images !== result.articles * 10) throw new Error("every owned article must contain 10 images");
});

test("IndexNow includes ready owned locales and excludes reviewed ones", () => {
  const output = execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/submit-indexnow.mjs", import.meta.url))],
    { encoding: "utf8", env: { ...process.env, INDEXNOW_DRY_RUN: "1" } },
  );
  const submitted = new Set(JSON.parse(output).payload.urlList);
  for (const article of owned.articles) {
    for (const locale of ["ko", "en", "ja"]) {
      const copy = article.locales[locale];
      const url = `https://ssundesk.com/${locale}/news/${copy.slug}`;
      if (submitted.has(url) !== (copy.status === "ready")) {
        throw new Error(`${url} IndexNow eligibility does not match release state`);
      }
    }
  }
});

test("owned routes render 10 images and expose only approved releases", async () => {
  const sitemap = await readFile(new URL("../vercel-dist/sitemap.xml", import.meta.url), "utf8");
  const home = await readFile(new URL("../vercel-dist/ko/index.html", import.meta.url), "utf8");
  const entertainment = await readFile(new URL("../vercel-dist/ko/entertainment/index.html", import.meta.url), "utf8");

  for (const article of owned.articles) {
    for (const locale of ["ko", "en", "ja"]) {
      const copy = article.locales[locale];
      const path = `${locale}/news/${copy.slug}`;
      const html = await readFile(
        new URL(`../vercel-dist/${path}/index.html`, import.meta.url),
        "utf8",
      );
      if ((html.match(/<figure class="owned-figure/g) ?? []).length !== 10) {
        throw new Error(`${path} must render exactly 10 figures`);
      }
      const ready = copy.status === "ready";
      const robots = ready ? "index, follow" : "noindex, nofollow";
      if (!html.includes(`meta name="robots" content="${robots}"`)) {
        throw new Error(`${path} has the wrong robots state`);
      }
      if (sitemap.includes(`/${path}</loc>`) !== ready) {
        throw new Error(`${path} sitemap eligibility does not match release state`);
      }
      if (ready) {
        for (const alternateLocale of ["ko", "en", "ja"]) {
          if (!html.includes(`hrefLang="${alternateLocale}"`) && !html.includes(`hreflang="${alternateLocale}"`)) {
            throw new Error(`${path} is missing ${alternateLocale} alternate metadata`);
          }
        }
      }
      if (html.includes("localized-original-cta") || html.includes("coupang-category-widget")) {
        throw new Error(`${path} contains a legacy outbound or ad widget`);
      }
    }

    const koPath = `/ko/news/${article.locales.ko.slug}`;
    if (article.locales.ko.status === "ready") {
      if (!home.includes(`href="${koPath}"`) || !entertainment.includes(`href="${koPath}"`)) {
        throw new Error(`${koPath} must be discoverable from the Korean hub and entertainment desk`);
      }
    }
  }
});
