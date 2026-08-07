import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  SPONSOR_BANNER_FEATURE_FLAG,
  SPONSOR_BANNER_PLACEMENTS,
  resolveSponsorBannerPlacement,
} from "../lib/sponsor-banner-config.mjs";

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

function sponsorBannerBlocks(html) {
  return [
    ...html.matchAll(
      /<aside\b(?=[^>]*\bdata-sponsor-banner-slot(?:=|\s|>))[^>]*>[\s\S]*?<\/aside>/gu,
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

test("sponsor banner configuration is disabled by default and fails closed", () => {
  assert.equal(resolveSponsorBannerPlacement("home-after-lead", {}), null);

  assert.throws(
    () =>
      resolveSponsorBannerPlacement("home-after-lead", {
        [SPONSOR_BANNER_FEATURE_FLAG]: "1",
      }),
    /no placement has a configured image/u,
  );

  const valid = {
    [SPONSOR_BANNER_FEATURE_FLAG]: "1",
    SPONSOR_BANNER_HOME_AFTER_LEAD_IMAGE_URL: "https://cdn.example.com/banner.png",
    SPONSOR_BANNER_HOME_AFTER_LEAD_LINK_URL: "https://sponsor.example.com/",
    SPONSOR_BANNER_HOME_AFTER_LEAD_ALT: "Example Sponsor",
    SPONSOR_BANNER_HOME_AFTER_LEAD_WIDTH: "300",
    SPONSOR_BANNER_HOME_AFTER_LEAD_HEIGHT: "250",
  };
  assert.deepEqual(resolveSponsorBannerPlacement("home-after-lead", valid), {
    imageUrl: "https://cdn.example.com/banner.png",
    linkUrl: "https://sponsor.example.com/",
    alt: "Example Sponsor",
    width: 300,
    height: 250,
  });
  assert.equal(resolveSponsorBannerPlacement("stocks-desk", valid), null);

  assert.throws(
    () =>
      resolveSponsorBannerPlacement("home-after-lead", {
        ...valid,
        SPONSOR_BANNER_HOME_AFTER_LEAD_WIDTH: "999",
        SPONSOR_BANNER_HOME_AFTER_LEAD_HEIGHT: "999",
      }),
    /console-confirmed sizes|one of these sizes/u,
  );

  assert.throws(
    () =>
      resolveSponsorBannerPlacement("home-after-lead", {
        ...valid,
        SPONSOR_BANNER_HOME_AFTER_LEAD_LINK_URL: "javascript:alert(1)",
      }),
    /must define an HTTPS image URL/u,
  );
});

test("sponsor banner is invisible everywhere when unset, and appears only on locale pages when configured", async () => {
  const htmlFiles = await findFiles(outputPath, [".html"]);
  const allHtml = (
    await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  if (process.env[SPONSOR_BANNER_FEATURE_FLAG] !== "1") {
    assert.doesNotMatch(allHtml, /data-sponsor-banner-slot/u);
    return;
  }

  const configurations = new Map(
    Object.keys(SPONSOR_BANNER_PLACEMENTS).map((placement) => [
      placement,
      resolveSponsorBannerPlacement(placement),
    ]),
  );

  // The sponsor banner is only wired into the locale-aware pages, never the
  // Korean-only root pages that already carry Kakao AdFit in the same slots.
  for (const route of ["", "entertainment", "stocks"]) {
    const html = await readFile(
      join(outputPath, ...(route ? [route] : []), "index.html"),
      "utf8",
    );
    assert.doesNotMatch(html, /data-sponsor-banner-slot/u, `/${route}`);
  }

  for (const locale of ["ko", "en", "ja"]) {
    const homepage = await readFile(
      join(outputPath, locale, "index.html"),
      "utf8",
    );
    const entertainment = await readFile(
      join(outputPath, locale, "entertainment", "index.html"),
      "utf8",
    );
    const stocks = await readFile(
      join(outputPath, locale, "stocks", "index.html"),
      "utf8",
    );

    for (const [html, placements] of [
      [homepage, ["home-after-lead", "home-between-desks"]],
      [entertainment, ["entertainment-desk"]],
      [stocks, ["stocks-desk"]],
    ]) {
      const expected = placements.filter((placement) =>
        configurations.get(placement),
      );
      const blocks = sponsorBannerBlocks(html);
      assert.equal(blocks.length, expected.length, `${locale}: ${placements}`);
      expected.forEach((placement, index) => {
        const configuration = configurations.get(placement);
        const block = blocks[index];
        const link = block.match(/<a\b[^>]*class="sponsor-banner-link"[^>]*>/u)?.[0];
        const img = block.match(/<img\b[^>]*>/u)?.[0];
        assert.ok(link && img, `incomplete sponsor banner block: ${placement}`);
        assert.equal(attribute(block, "data-sponsor-banner-placement"), placement);
        assert.equal(attribute(link, "href"), configuration.linkUrl);
        assert.equal(attribute(link, "target"), "_blank");
        assert.equal(attribute(img, "src"), configuration.imageUrl);
        assert.equal(attribute(img, "alt"), configuration.alt);
        assert.equal(attribute(img, "width"), String(configuration.width));
        assert.equal(attribute(img, "height"), String(configuration.height));
      });
    }
  }
});
