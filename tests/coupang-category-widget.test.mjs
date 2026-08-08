import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COUPANG_CATEGORY_WIDGET_FEATURE_FLAG,
  COUPANG_CATEGORY_WIDGET_PLACEMENTS,
  COUPANG_CATEGORY_WIDGET_SRC,
  resolveCoupangCategoryWidgetPlacement,
} from "../lib/coupang-category-widget-config.mjs";

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const outputPath = fileURLToPath(outputRoot);

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

function widgetBlocks(html) {
  return [
    ...html.matchAll(
      /<aside\b(?=[^>]*\bdata-coupang-category-widget-slot(?:=|\s|>))[^>]*>[\s\S]*?<\/aside>/gu,
    ),
  ].map((match) => match[0]);
}

async function findFiles(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(fullPath, extensions);
      return extensions.some((extension) => entry.name.endsWith(extension))
        ? [fullPath]
        : [];
    }),
  );
  return nested.flat();
}

const validEnv = {
  [COUPANG_CATEGORY_WIDGET_FEATURE_FLAG]: "1",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_PARTNER_ID: "AF8916827",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_SOURCE: "best-category",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_KEYWORD: "주방가전",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_CATEGORY_ID: "1016",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_BRAND_ID: "1001",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_LIMIT: "20",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_IMAGE_SIZE: "512x512",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_THEME: "light",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_ROTATION: "60",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_WIDTH: "728",
  COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_HEIGHT: "250",
};

test("Coupang category widget configuration is disabled by default and fails closed", () => {
  assert.equal(
    resolveCoupangCategoryWidgetPlacement("home-between-desks", {}),
    null,
  );

  assert.throws(
    () =>
      resolveCoupangCategoryWidgetPlacement("home-between-desks", {
        [COUPANG_CATEGORY_WIDGET_FEATURE_FLAG]: "1",
      }),
    /no placement has a configured unit/u,
  );

  assert.deepEqual(
    resolveCoupangCategoryWidgetPlacement("home-between-desks", validEnv),
    {
      partnerId: "AF8916827",
      source: "best-category",
      keyword: "주방가전",
      categoryId: "1016",
      brandId: "1001",
      limit: "20",
      imageSize: "512x512",
      theme: "light",
      rotation: "60",
      width: 728,
      height: 250,
    },
  );
  assert.equal(
    resolveCoupangCategoryWidgetPlacement("stocks-desk", validEnv),
    null,
  );

  assert.throws(
    () =>
      resolveCoupangCategoryWidgetPlacement("home-between-desks", {
        ...validEnv,
        COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_IMAGE_SIZE: "not-a-size",
      }),
    /must define all of/u,
  );
});

test("Coupang category widget is invisible everywhere when unset, and only appears where wired in when configured", async () => {
  const htmlFiles = await findFiles(outputPath, [".html"]);
  const allHtml = (
    await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  if (process.env[COUPANG_CATEGORY_WIDGET_FEATURE_FLAG] !== "1") {
    assert.doesNotMatch(allHtml, /data-coupang-category-widget-slot/u);
    assert.doesNotMatch(allHtml, /coupang-category-widget-loader\.js/u);
    return;
  }

  const configurations = new Map(
    Object.keys(COUPANG_CATEGORY_WIDGET_PLACEMENTS).map((placement) => [
      placement,
      resolveCoupangCategoryWidgetPlacement(placement),
    ]),
  );

  for (const locale of ["ko", "en", "ja"]) {
    const homepage = await readFile(
      join(outputPath, locale, "index.html"),
      "utf8",
    );
    const blocks = widgetBlocks(homepage);
    const configuration = configurations.get("home-between-desks");
    assert.equal(blocks.length, configuration ? 1 : 0, locale);
    if (!configuration) continue;

    const block = blocks[0];
    assert.equal(
      attribute(block, "data-coupang-category-widget-placement"),
      "home-between-desks",
    );
    assert.equal(
      attribute(block, "data-coupang-category-widget-src"),
      COUPANG_CATEGORY_WIDGET_SRC,
    );
    assert.equal(attribute(block, "data-partner-id"), configuration.partnerId);
    assert.equal(attribute(block, "data-source"), configuration.source);
    assert.equal(attribute(block, "data-keyword"), configuration.keyword);
    assert.equal(attribute(block, "data-category-id"), configuration.categoryId);
    assert.equal(attribute(block, "data-brand-id"), configuration.brandId);
    assert.equal(attribute(block, "data-limit"), configuration.limit);
    assert.equal(attribute(block, "data-image-size"), configuration.imageSize);
    assert.equal(attribute(block, "data-theme"), configuration.theme);
    assert.equal(attribute(block, "data-rotation"), configuration.rotation);
    assert.equal(attribute(block, "data-width"), String(configuration.width));
    assert.equal(attribute(block, "data-height"), String(configuration.height));
    assert.match(block, /coupang-partners-disclosure/u);
    assert.match(
      homepage,
      /<script defer src="\/coupang-category-widget-loader\.js"><\/script>/u,
    );
  }
});
