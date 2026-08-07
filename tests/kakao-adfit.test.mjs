import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ADFIT_FEATURE_FLAG,
  ADFIT_PLACEMENTS,
  ADFIT_SDK_VARIABLE,
  normalizeAdFitSdkUrl,
  resolveAdFitPlacement,
} from "../lib/adfit-config.mjs";
import { getEligiblePostDetails } from "../scripts/post-detail-eligibility.mjs";

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const outputPath = fileURLToPath(outputRoot);
const posts = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
).posts;
const detailPosts = getEligiblePostDetails(posts);

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

function adFitBlocks(html) {
  return [
    ...html.matchAll(
      /<aside\b(?=[^>]*\bdata-adfit-slot(?:=|\s|>))[^>]*>[\s\S]*?<\/aside>/gu,
    ),
  ].map((match) => match[0]);
}

function assertBetween(html, previous, placement, next) {
  const previousIndex = html.indexOf(previous);
  const bannerIndex = html.indexOf(`data-adfit-placement="${placement}"`);
  const nextIndex = html.indexOf(next);
  assert.ok(previousIndex >= 0, `missing previous marker: ${previous}`);
  assert.ok(bannerIndex > previousIndex, `${placement} precedes its content`);
  assert.ok(nextIndex > bannerIndex, `${placement} follows the next section`);
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

function configuredPlacements() {
  return new Map(
    Object.keys(ADFIT_PLACEMENTS).map((placement) => [
      placement,
      resolveAdFitPlacement(placement),
    ]),
  );
}

function assertBlock(block, placement, configuration) {
  const openingTag = block.match(/^<aside\b[^>]*>/u)?.[0];
  const ins = block.match(/<ins\b[^>]*class="kakao_ad_area"[^>]*>/u)?.[0];
  assert.ok(openingTag && ins, `incomplete AdFit block: ${placement}`);
  assert.equal(attribute(openingTag, "data-adfit-placement"), placement);
  assert.equal(
    attribute(openingTag, "data-adfit-sdk-src"),
    configuration.sdkUrl,
  );
  assert.equal(attribute(ins, "data-ad-unit"), configuration.unit);
  assert.equal(attribute(ins, "data-ad-width"), String(configuration.width));
  assert.equal(attribute(ins, "data-ad-height"), String(configuration.height));
  assert.equal(attribute(ins, "data-ad-onfail"), "ssDeskAdFitNoAd");
  assert.match(attribute(openingTag, "style"), /--adfit-unit-width:/u);
  assert.match(attribute(openingTag, "style"), /--adfit-unit-height:/u);
  assert.doesNotMatch(block, /<a\b|data-analytics-event/u);
}

test("AdFit configuration is disabled by default and fails closed", () => {
  assert.equal(resolveAdFitPlacement("home-after-lead", {}), null);

  assert.throws(
    () =>
      resolveAdFitPlacement("home-after-lead", {
        [ADFIT_FEATURE_FLAG]: "1",
      }),
    new RegExp(ADFIT_SDK_VARIABLE, "u"),
  );

  const valid = {
    [ADFIT_FEATURE_FLAG]: "1",
    [ADFIT_SDK_VARIABLE]: "//t1.daumcdn.net/adfit/static/ad.min.js",
    KAKAO_ADFIT_HOME_AFTER_LEAD_UNIT: "DAN-example123",
    KAKAO_ADFIT_HOME_AFTER_LEAD_WIDTH: "300",
    KAKAO_ADFIT_HOME_AFTER_LEAD_HEIGHT: "250",
  };
  assert.deepEqual(resolveAdFitPlacement("home-after-lead", valid), {
    unit: "DAN-example123",
    width: 300,
    height: 250,
    sdkUrl: "https://t1.daumcdn.net/adfit/static/ad.min.js",
  });
  assert.equal(resolveAdFitPlacement("stocks-desk", valid), null);

  assert.throws(
    () =>
      resolveAdFitPlacement("home-after-lead", {
        ...valid,
        KAKAO_ADFIT_HOME_AFTER_LEAD_WIDTH: "728",
        KAKAO_ADFIT_HOME_AFTER_LEAD_HEIGHT: "90",
      }),
    /console-confirmed sizes/u,
  );
  assert.equal(
    normalizeAdFitSdkUrl("https://malicious.example/ad.js"),
    null,
  );
});

test("Kakao AdFit does not resurrect the old Coupang proxy-widget integration", async () => {
  const textFiles = await findFiles(outputPath, [".html", ".js", ".css"]);
  const outputText = (
    await Promise.all(textFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");
  // The site once embedded Coupang Partners through a third-party proxy
  // widget (coupang-partners-banner.vercel.app). That integration is gone
  // for good. The current, deliberate Coupang Partners integration uses
  // Coupang's own official script (ads-partners.coupang.com) instead and is
  // covered by tests/coupang-partners.test.mjs, so it is not banned here.
  assert.doesNotMatch(
    outputText,
    /coupang-partners-banner\.vercel\.app|coupang_banner_clicked|coupang-interlude/u,
  );

  const htmlFiles = await findFiles(outputPath, [".html"]);
  const allHtml = (
    await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  if (process.env[ADFIT_FEATURE_FLAG] !== "1") {
    assert.doesNotMatch(
      allHtml,
      /data-adfit-slot|kakao_ad_area|\/adfit-loader\.js/u,
    );
    return;
  }

  const configurations = configuredPlacements();
  const homepage = await readFile(join(outputPath, "index.html"), "utf8");
  const entertainment = await readFile(
    join(outputPath, "entertainment", "index.html"),
    "utf8",
  );
  const stocks = await readFile(
    join(outputPath, "stocks", "index.html"),
    "utf8",
  );

  const pageExpectations = [
    [
      homepage,
      ["home-after-lead", "home-between-desks"],
      [
        ['class="page-shell lead-grid"', "home-after-lead", 'class="statement-band"'],
        ['class="page-shell desk-section entertainment-desk"', "home-between-desks", 'class="stock-stage"'],
      ],
    ],
    [
      entertainment,
      ["entertainment-desk"],
      [['class="page-shell desk-lead"', "entertainment-desk", 'class="page-shell all-stories"']],
    ],
    [
      stocks,
      ["stocks-desk"],
      [['class="page-shell desk-lead"', "stocks-desk", 'class="page-shell all-stories"']],
    ],
  ];

  for (const [html, placements, orderChecks] of pageExpectations) {
    const expected = placements.filter((placement) => configurations.get(placement));
    const blocks = adFitBlocks(html);
    assert.equal(blocks.length, expected.length);
    expected.forEach((placement, index) =>
      assertBlock(blocks[index], placement, configurations.get(placement)),
    );
    for (const [previous, placement, next] of orderChecks) {
      if (configurations.get(placement)) assertBetween(html, previous, placement, next);
    }
    assert.equal(
      (html.match(/<script defer src="\/adfit-loader\.js"><\/script>/gu) || [])
        .length,
      expected.length > 0 ? 1 : 0,
    );
  }

  for (const post of detailPosts) {
    const placement =
      post.category === "entertainment"
        ? "entertainment-article"
        : "stocks-article";
    const configuration = configurations.get(placement);
    const html = await readFile(
      join(outputPath, "news", post.logNo, "index.html"),
      "utf8",
    );
    const blocks = adFitBlocks(html);
    assert.equal(blocks.length, configuration ? 1 : 0, post.logNo);
    if (configuration) {
      assertBlock(blocks[0], placement, configuration);
      assertBetween(
        html,
        'class="post-detail-summary"',
        placement,
        'class="post-detail-section"',
      );
      assert.equal(
        (html.match(/<script defer src="\/adfit-loader\.js"><\/script>/gu) || [])
          .length,
        1,
      );
    }
  }

  for (const route of ["archive", "about", "ko", "en", "ja"]) {
    const localizedFiles = await findFiles(join(outputPath, route), [".html"]);
    const html = (
      await Promise.all(localizedFiles.map((file) => readFile(file, "utf8")))
    ).join("\n");
    assert.doesNotMatch(html, /data-adfit-slot|kakao_ad_area|\/adfit-loader\.js/u, route);
  }
});
