import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getEligiblePostDetails } from "../scripts/post-detail-eligibility.mjs";

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const outputPath = fileURLToPath(outputRoot);
const posts = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
).posts;
const detailPosts = getEligiblePostDetails(posts);
const bannerOrigin = "https://coupang-partners-banner.vercel.app";
const disclosure =
  "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

function decodeAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");
}

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = tag.match(new RegExp(`\\b${escapedName}="([^"]*)"`, "u"))?.[1];
  return value === undefined ? null : decodeAttribute(value);
}

function bannerBlocks(html) {
  return [
    ...html.matchAll(
      /<aside\b(?=[^>]*\bdata-coupang-banner(?:=|\s|>))[^>]*>[\s\S]*?<\/aside>/gu,
    ),
  ].map((match) => match[0]);
}

function bannerVariants(block) {
  return [
    ...block.matchAll(
      /<div\b[^>]*\bdata-coupang-banner-variant="(desktop|mobile)"[^>]*>([\s\S]*?)<\/div>/gu,
    ),
  ].map((match) => ({ viewport: match[1], html: match[2] }));
}

function assertBetween(html, previous, placement, next) {
  const previousIndex = html.indexOf(previous);
  const bannerIndex = html.indexOf(`data-coupang-placement="${placement}"`);
  const nextIndex = html.indexOf(next);
  assert.ok(previousIndex >= 0, `missing previous marker: ${previous}`);
  assert.ok(bannerIndex > previousIndex, `${placement} precedes its content`);
  assert.ok(nextIndex > bannerIndex, `${placement} follows the next section`);
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

test("Coupang banners occupy the requested editorial positions only", async () => {
  const homepage = await readFile(join(outputPath, "index.html"), "utf8");
  const entertainment = await readFile(
    join(outputPath, "entertainment", "index.html"),
    "utf8",
  );
  const stocks = await readFile(
    join(outputPath, "stocks", "index.html"),
    "utf8",
  );

  assert.equal(bannerBlocks(homepage).length, 2);
  assert.equal(bannerBlocks(entertainment).length, 1);
  assert.equal(bannerBlocks(stocks).length, 1);
  assertBetween(homepage, 'class="page-shell lead-grid"', "home-after-lead", 'class="statement-band"');
  assertBetween(homepage, 'class="page-shell desk-section entertainment-desk"', "home-between-desks", 'class="stock-stage"');
  assertBetween(entertainment, 'class="page-shell desk-lead"', "entertainment-after-lead", 'class="page-shell all-stories"');
  assertBetween(stocks, 'class="page-shell desk-lead"', "stocks-after-lead", 'class="page-shell all-stories"');

  for (const post of detailPosts) {
    const html = await readFile(
      join(outputPath, "news", post.logNo, "index.html"),
      "utf8",
    );
    const blocks = bannerBlocks(html);
    assert.equal(blocks.length, 1, `detail ${post.logNo}`);
    assertBetween(
      html,
      'class="post-detail-summary"',
      `news-${post.logNo}-after-summary`,
      'class="post-detail-section"',
    );
    const desktopVariant = bannerVariants(blocks[0]).find(
      (variant) => variant.viewport === "desktop",
    );
    const desktopAnchor = desktopVariant?.html.match(/<a\b[^>]*>/u)?.[0];
    assert.ok(desktopAnchor);
    const bannerUrl = new URL(attribute(desktopAnchor, "href"));
    assert.equal(
      bannerUrl.searchParams.get("keyword"),
      post.category === "entertainment"
        ? "영화 굿즈"
        : "사무용품 모니터",
    );
  }

  for (const route of ["archive", "about"]) {
    const html = await readFile(join(outputPath, route, "index.html"), "utf8");
    assert.equal(bannerBlocks(html).length, 0, route);
  }

  for (const locale of ["ko", "en", "ja"]) {
    const localizedFiles = await findIndexFiles(join(outputPath, locale));
    for (const file of localizedFiles) {
      const html = await readFile(file, "utf8");
      assert.doesNotMatch(html, /data-coupang-banner/u, file);
      assert.doesNotMatch(html, /coupang-partners-banner\.vercel\.app/u, file);
    }
  }
});

test("every banner preserves URL parity, stable slots, disclosure, and CLS dimensions", async () => {
  const pageFiles = [
    join(outputPath, "index.html"),
    join(outputPath, "entertainment", "index.html"),
    join(outputPath, "stocks", "index.html"),
    ...detailPosts.map((post) =>
      join(outputPath, "news", post.logNo, "index.html"),
    ),
  ];
  const blocks = (
    await Promise.all(
      pageFiles.map(async (file) => bannerBlocks(await readFile(file, "utf8"))),
    )
  ).flat();

  assert.equal(blocks.length, detailPosts.length + 4);
  const slots = new Set();
  const productPools = new Set();

  for (const block of blocks) {
    const openingTag = block.match(/^<aside\b[^>]*>/u)?.[0];
    assert.ok(openingTag);
    const placement = attribute(openingTag, "data-coupang-placement");
    const slot = attribute(openingTag, "data-coupang-slot");
    const category = attribute(openingTag, "data-coupang-category");
    const source = attribute(openingTag, "data-coupang-source");
    assert.ok(placement && /^[a-z0-9-]{1,40}$/u.test(placement));
    assert.equal(slot, `ssdesk-${placement}`);
    assert.equal(slots.has(slot), false, `duplicate slot ${slot}`);
    slots.add(slot);
    assert.ok(["home", "entertainment", "stocks"].includes(category));
    assert.ok(["goldbox", "search"].includes(source));
    assert.ok(block.includes(disclosure));

    const variants = bannerVariants(block);
    assert.deepEqual(
      variants.map((variant) => variant.viewport),
      ["desktop", "mobile"],
    );

    for (const { viewport, html } of variants) {
      const anchor = html.match(/<a\b[^>]*>/u)?.[0];
      const image = html.match(/<img\b[^>]*>/u)?.[0];
      assert.ok(anchor && image);
      const href = new URL(attribute(anchor, "href"));
      const src = new URL(attribute(image, "src"));
      assert.equal(`${href.origin}${href.pathname}`, `${bannerOrigin}/api/banner/click`);
      assert.equal(`${src.origin}${src.pathname}`, `${bannerOrigin}/api/banner/image`);
      assert.equal(href.search, src.search, `${placement} ${viewport} URL mismatch`);
      assert.equal(href.searchParams.get("partnerId"), "AF8916827");
      assert.equal(href.searchParams.get("source"), source);
      assert.equal(href.searchParams.get("slot"), slot);
      assert.equal(href.searchParams.get("rotation"), "60");
      assert.equal(href.searchParams.get("imageSize"), "512x512");
      assert.equal(
        href.searchParams.get("limit"),
        source === "goldbox" ? "20" : "10",
      );
      assert.equal(href.searchParams.has("keyword"), source === "search");

      const keyword = href.searchParams.get("keyword");
      if (category === "home") {
        assert.equal(source, "goldbox");
        assert.equal(keyword, null);
      } else if (category === "entertainment") {
        assert.equal(source, "search");
        assert.equal(keyword, "영화 굿즈");
      } else {
        assert.equal(source, "search");
        assert.equal(keyword, "사무용품 모니터");
      }
      productPools.add(source === "goldbox" ? source : `${source}:${keyword}`);

      const expectedWidth =
        viewport === "mobile"
          ? "320"
          : placement === "home-after-lead"
            ? "970"
            : "728";
      const expectedHeight = viewport === "mobile" ? "100" : "250";
      assert.equal(href.searchParams.get("width"), expectedWidth);
      assert.equal(href.searchParams.get("height"), expectedHeight);
      assert.equal(attribute(image, "width"), expectedWidth);
      assert.equal(attribute(image, "height"), expectedHeight);
      assert.equal(attribute(image, "loading"), "lazy");
      assert.equal(attribute(image, "decoding"), "async");
      assert.equal(attribute(anchor, "target"), "_blank");
      assert.deepEqual(
        new Set(attribute(anchor, "rel").split(/\s+/u)),
        new Set(["noopener", "sponsored"]),
      );
      assert.equal(attribute(anchor, "data-analytics-event"), "coupang_banner_clicked");
      assert.equal(attribute(anchor, "data-analytics-placement"), placement);
      assert.equal(attribute(anchor, "data-analytics-size"), `${expectedWidth}x${expectedHeight}`);
      assert.equal(attribute(anchor, "data-analytics-category"), category);
      assert.match(attribute(anchor, "style"), /aspect-ratio:/u);
    }
  }

  assert.equal(slots.size, detailPosts.length + 4);
  assert.deepEqual(
    productPools,
    new Set(["goldbox", "search:영화 굿즈", "search:사무용품 모니터"]),
  );
});
