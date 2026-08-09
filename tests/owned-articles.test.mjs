import test from "node:test";
import { readFile } from "node:fs/promises";

import { validateOwnedContent } from "../scripts/validate-owned-articles.mjs";

test("owned articles keep the research, locale, image and review contracts", async () => {
  const result = await validateOwnedContent();
  if (result.articles < 1) throw new Error("expected at least one owned article");
  if (result.images !== result.articles * 10) throw new Error("every owned article must contain 10 images");
});

test("owned review routes render all 10 images without indexing or legacy CTAs", async () => {
  for (const locale of ["ko", "en", "ja"]) {
    const html = await readFile(
      new URL(
        `../vercel-dist/${locale}/news/zendaya-spider-man-brand-new-day/index.html`,
        import.meta.url,
      ),
      "utf8",
    );
    if ((html.match(/<figure class="owned-figure/g) ?? []).length !== 10) {
      throw new Error(`${locale} review route must render exactly 10 figures`);
    }
    if (!html.includes('meta name="robots" content="noindex, nofollow"')) {
      throw new Error(`${locale} review route must remain noindex`);
    }
    if (html.includes("localized-original-cta") || html.includes("coupang-category-widget")) {
      throw new Error(`${locale} owned review route contains a legacy outbound or ad widget`);
    }
  }

  const sitemap = await readFile(new URL("../vercel-dist/sitemap.xml", import.meta.url), "utf8");
  if (sitemap.includes("zendaya-spider-man-brand-new-day")) {
    throw new Error("reviewed owned article must not appear in sitemap.xml");
  }
});
