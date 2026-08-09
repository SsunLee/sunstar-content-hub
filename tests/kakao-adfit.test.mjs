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

function assertBlock(block, placement, configuration, attributes = {}) {
  const openingTag = block.match(/^<aside\b[^>]*>/u)?.[0];
  const ins = block.match(/<ins\b[^>]*class="kakao_ad_area"[^>]*>/u)?.[0];
  assert.ok(openingTag && ins, `incomplete AdFit block: ${placement}`);
  assert.equal(attribute(openingTag, "data-adfit-placement"), placement);
  for (const [name, value] of Object.entries(attributes)) {
    assert.equal(attribute(openingTag, name), value, `${placement} ${name}`);
  }
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
    KAKAO_ADFIT_HEADER_DESKTOP_UNIT: "DAN-example123",
    KAKAO_ADFIT_HEADER_DESKTOP_WIDTH: "728",
    KAKAO_ADFIT_HEADER_DESKTOP_HEIGHT: "90",
  };
  assert.deepEqual(resolveAdFitPlacement("header-desktop", valid), {
    unit: "DAN-example123",
    width: 728,
    height: 90,
    sdkUrl: "https://t1.daumcdn.net/adfit/static/ad.min.js",
  });
  assert.equal(resolveAdFitPlacement("stocks-desk", valid), null);

  assert.throws(
    () =>
      resolveAdFitPlacement("header-desktop", {
        ...valid,
        KAKAO_ADFIT_HEADER_DESKTOP_WIDTH: "970",
        KAKAO_ADFIT_HEADER_DESKTOP_HEIGHT: "90",
      }),
    /console-confirmed sizes/u,
  );
  assert.equal(
    normalizeAdFitSdkUrl("https://malicious.example/ad.js"),
    null,
  );
});

test("AdFit slot stays visible while Kakao decides whether it can fill", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const initialRule = css.match(/\.adfit-interlude\s*\{([^}]*)\}/u)?.[1];
  const emptyRule = css.match(
    /\.adfit-interlude\.is-adfit-empty,\s*\.adfit-interlude\[hidden\]\s*\{([^}]*)\}/u,
  )?.[1];
  const emptyHeaderHostRule = css.match(
    /\.masthead-adfit-host:empty,\s*\.masthead-adfit-host:not\(:has\(\.adfit-interlude:not\(\[hidden\]\)\)\)\s*\{([^}]*)\}/u,
  )?.[1];

  assert.ok(initialRule, "missing initial AdFit slot rule");
  assert.doesNotMatch(initialRule, /visibility\s*:\s*hidden|display\s*:\s*none/u);
  assert.match(emptyRule || "", /display\s*:\s*none/u);
  assert.match(emptyHeaderHostRule || "", /display\s*:\s*none/u);
});

test("header AdFit loader moves only the active responsive unit into the masthead", async () => {
  const loader = await readFile(
    new URL("../public/adfit-loader.js", import.meta.url),
    "utf8",
  );
  assert.match(loader, /window\.matchMedia\(media\)\.matches/u);
  assert.match(loader, /slot\.remove\(\)/u);
  assert.match(loader, /host\.appendChild\(slot\)/u);
});

test("Kakao AdFit does not resurrect the old Coupang proxy-widget markup shape", async () => {
  const textFiles = await findFiles(outputPath, [".html", ".js", ".css"]);
  const outputText = (
    await Promise.all(textFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");
  // The site previously embedded coupang-partners-banner.vercel.app (the
  // user's own proxy widget) once, removed it, and later deliberately
  // reintroduced it (see tests/coupang-category-widget.test.mjs and
  // COUPANG-PARTNERS.md) with new markup. Only the old implementation's own
  // specific markers stay banned here, not the domain itself.
  assert.doesNotMatch(
    outputText,
    /coupang_banner_clicked|coupang-interlude/u,
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
      ["header-desktop", "header-mobile"],
      [
        ['id="main-content"', "header-desktop", 'class="page-shell dateline"'],
        ['data-adfit-placement="header-desktop"', "header-mobile", 'class="page-shell dateline"'],
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
    expected.forEach((placement, index) => {
      const headerAttributes = placement.startsWith("header-")
        ? {
            "data-adfit-host": "home-header",
            "data-adfit-media":
              placement === "header-desktop"
                ? "(min-width: 761px)"
                : "(max-width: 760px)",
          }
        : {};
      assertBlock(
        blocks[index],
        placement,
        configurations.get(placement),
        headerAttributes,
      );
    });
    for (const [previous, placement, next] of orderChecks) {
      if (configurations.get(placement)) assertBetween(html, previous, placement, next);
    }
    assert.equal(
      (html.match(/<script defer src="\/adfit-loader\.js"><\/script>/gu) || [])
        .length,
      expected.length > 0 ? 1 : 0,
    );
  }

  assert.match(homepage, /data-adfit-host-target="home-header"/u);
  assert.doesNotMatch(
    homepage,
    /data-adfit-placement="home-(?:after-lead|between-desks)"/u,
  );

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
