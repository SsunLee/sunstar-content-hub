import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COUPANG_PARTNERS_FEATURE_FLAG,
  COUPANG_PARTNERS_PLACEMENTS,
  COUPANG_PARTNERS_SDK_URL,
  resolveCoupangPartnersPlacement,
} from "../lib/coupang-partners-config.mjs";

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

function coupangBlocks(html) {
  return [
    ...html.matchAll(
      /<aside\b(?=[^>]*\bdata-coupang-partners-slot(?:=|\s|>))[^>]*>[\s\S]*?<\/aside>/gu,
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

test("Coupang Partners configuration is disabled by default and fails closed", () => {
  assert.equal(resolveCoupangPartnersPlacement("home-after-lead", {}), null);

  assert.throws(
    () =>
      resolveCoupangPartnersPlacement("home-after-lead", {
        [COUPANG_PARTNERS_FEATURE_FLAG]: "1",
      }),
    /no placement has a configured unit/u,
  );

  const valid = {
    [COUPANG_PARTNERS_FEATURE_FLAG]: "1",
    COUPANG_PARTNERS_HOME_AFTER_LEAD_ID: "1015317",
    COUPANG_PARTNERS_HOME_AFTER_LEAD_TRACKING_CODE: "AF8916827",
    COUPANG_PARTNERS_HOME_AFTER_LEAD_TEMPLATE: "banner",
    COUPANG_PARTNERS_HOME_AFTER_LEAD_WIDTH: "728",
    COUPANG_PARTNERS_HOME_AFTER_LEAD_HEIGHT: "90",
  };
  assert.deepEqual(resolveCoupangPartnersPlacement("home-after-lead", valid), {
    id: 1015317,
    trackingCode: "AF8916827",
    template: "banner",
    width: 728,
    height: 90,
  });
  assert.equal(resolveCoupangPartnersPlacement("stocks-desk", valid), null);

  assert.throws(
    () =>
      resolveCoupangPartnersPlacement("home-after-lead", {
        ...valid,
        COUPANG_PARTNERS_HOME_AFTER_LEAD_TRACKING_CODE: "not-a-tracking-code",
      }),
    /must define a numeric unit id/u,
  );
});

test("Coupang Partners banner is invisible everywhere when unset, and only appears where wired in when configured", async () => {
  const htmlFiles = await findFiles(outputPath, [".html"]);
  const allHtml = (
    await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  if (process.env[COUPANG_PARTNERS_FEATURE_FLAG] !== "1") {
    assert.doesNotMatch(allHtml, /data-coupang-partners-slot/u);
    assert.doesNotMatch(allHtml, /coupang-partners-loader\.js/u);
    return;
  }

  const configurations = new Map(
    Object.keys(COUPANG_PARTNERS_PLACEMENTS).map((placement) => [
      placement,
      resolveCoupangPartnersPlacement(placement),
    ]),
  );

  for (const locale of ["ko", "en", "ja"]) {
    const homepage = await readFile(
      join(outputPath, locale, "index.html"),
      "utf8",
    );
    const blocks = coupangBlocks(homepage);
    const configuration = configurations.get("home-after-lead");
    assert.equal(blocks.length, configuration ? 1 : 0, locale);
    if (!configuration) continue;

    const block = blocks[0];
    assert.equal(attribute(block, "data-coupang-partners-placement"), "home-after-lead");
    assert.equal(attribute(block, "data-coupang-partners-id"), String(configuration.id));
    assert.equal(
      attribute(block, "data-coupang-partners-tracking-code"),
      configuration.trackingCode,
    );
    assert.equal(attribute(block, "data-coupang-partners-template"), configuration.template);
    assert.equal(attribute(block, "data-coupang-partners-width"), String(configuration.width));
    assert.equal(attribute(block, "data-coupang-partners-height"), String(configuration.height));
    assert.equal(attribute(block, "data-coupang-partners-sdk-src"), COUPANG_PARTNERS_SDK_URL);
    assert.match(block, /coupang-partners-disclosure/u);
    assert.match(
      homepage,
      /<script defer src="\/coupang-partners-loader\.js"><\/script>/u,
    );
  }
});
