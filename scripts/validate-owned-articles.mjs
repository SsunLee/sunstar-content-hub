import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["ko", "en", "ja"];
const hashPattern = /^sha256:[a-f0-9]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sourceHashFor(article) {
  const payload = JSON.stringify({
    subject: article.subject,
    work: article.work,
    popularityEvidence: article.popularityEvidence,
    sources: article.sources,
    gallery: article.gallery.map(({ src, sha256 }) => ({ src, sha256 })),
  });
  return `sha256:${createHash("sha256").update(payload).digest("hex")}`;
}

async function validateGallery(article) {
  assert(article.gallery.length === 10, `${article.sourceId}: gallery must contain exactly 10 images`);
  assert(new Set(article.gallery.map((image) => image.src)).size === 10, `${article.sourceId}: image paths must be unique`);
  assert(new Set(article.gallery.map((image) => image.sha256)).size === 10, `${article.sourceId}: image hashes must be unique`);
  assert(article.image === article.gallery[0].src, `${article.sourceId}: lead image must be gallery image 1`);

  for (const [index, image] of article.gallery.entries()) {
    const label = `${article.sourceId}.gallery[${index}]`;
    assert(image.src.startsWith("/editorial/"), `${label}: image must be a local editorial asset`);
    assert(hashPattern.test(image.sha256), `${label}: invalid sha256`);
    assert(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(image.sourcePage), `${label}: missing Commons source page`);
    assert(/^https:\/\/creativecommons\.org\//.test(image.licenseUrl), `${label}: unsupported license URL`);
    assert(/^(CC0|CC BY|CC BY-SA)/.test(image.licenseName), `${label}: unsupported license name`);
    assert(typeof image.creator === "string" && image.creator.length > 1, `${label}: creator is required`);

    const filePath = resolve(projectRoot, "public", image.src.replace(/^\//, ""));
    assert((await stat(filePath)).isFile(), `${label}: local file is missing`);
    const bytes = await readFile(filePath);
    const actualHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    assert(actualHash === image.sha256, `${label}: file hash does not match manifest`);
    const metadata = await sharp(bytes).metadata();
    assert(metadata.width === image.width && metadata.height === image.height, `${label}: declared dimensions do not match the file`);

    for (const locale of locales) {
      const copy = image.locales?.[locale];
      assert(copy?.alt?.length >= 12, `${label}: ${locale} alt text is missing`);
      assert(copy?.caption?.length >= 30, `${label}: ${locale} caption is too short`);
    }
  }
}

export async function validateOwnedContent() {
  const document = JSON.parse(
    await readFile(resolve(projectRoot, "data", "owned-articles.json"), "utf8"),
  );
  assert(document.schemaVersion === 1, "owned content schemaVersion must be 1");
  assert(Array.isArray(document.articles), "owned content must contain an articles array");

  const ids = new Set();
  for (const article of document.articles) {
    assert(article.sourceKind === "owned", `${article.sourceId}: sourceKind must be owned`);
    assert(!ids.has(article.sourceId), `${article.sourceId}: duplicate sourceId`);
    ids.add(article.sourceId);
    assert(article.textRights === "SS.Desk original", `${article.sourceId}: text rights must be explicit`);
    assert(sourceHashFor(article) === article.sourceHash, `${article.sourceId}: sourceHash is stale`);

    const researchAt = new Date(article.researchVerifiedAt);
    const observedAt = new Date(article.popularityEvidence?.observedAt);
    const ageDays = (researchAt - observedAt) / 86_400_000;
    assert(Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= 7, `${article.sourceId}: popularity evidence must be no more than 7 days old`);
    assert(/^https:\/\//.test(article.popularityEvidence?.sourceUrl), `${article.sourceId}: popularity source is required`);
    assert(article.sources.length >= 3, `${article.sourceId}: at least three research sources are required`);

    const slugs = locales.map((locale) => article.locales?.[locale]?.slug);
    assert(new Set(slugs).size === 1, `${article.sourceId}: all locale routes must share one stable slug`);
    for (const locale of locales) {
      const copy = article.locales?.[locale];
      assert(copy, `${article.sourceId}: ${locale} locale is missing`);
      assert(["reviewed", "ready"].includes(copy.status), `${article.sourceId}: ${locale} has an unsupported release status`);
      if (copy.status === "reviewed") {
        assert(copy.robots === "noindex,nofollow", `${article.sourceId}: ${locale} reviewed copy must remain noindex`);
        assert(copy.publicVerification === null, `${article.sourceId}: ${locale} reviewed copy cannot claim public verification`);
      } else {
        const expectedUrl = `https://ssundesk.com/${locale}/news/${copy.slug}`;
        assert(copy.robots === "index,follow", `${article.sourceId}: ${locale} ready copy must be indexable`);
        assert(copy.publicVerification?.status === "verified", `${article.sourceId}: ${locale} ready copy lacks public verification`);
        assert(copy.publicVerification?.httpStatus === 200, `${article.sourceId}: ${locale} ready copy must verify HTTP 200`);
        assert(Number.isFinite(Date.parse(copy.publicVerification?.checkedAt)), `${article.sourceId}: ${locale} ready copy has an invalid checkedAt`);
        assert(copy.publicVerification?.resolvedUrl?.replace(/\/+$/, "") === expectedUrl, `${article.sourceId}: ${locale} ready copy resolved URL mismatch`);
      }
      assert(copy.translatedFromSourceHash === article.sourceHash, `${article.sourceId}: ${locale} source hash mismatch`);
      assert(copy.body?.length === 5, `${article.sourceId}: ${locale} must contain exactly five sections`);
      assert(copy.body.every((section) => section.paragraphs?.length >= 2), `${article.sourceId}: ${locale} sections need at least two paragraphs`);
      const compactLength = copy.body.flatMap((section) => section.paragraphs).join("").replace(/\s/g, "").length;
      assert(compactLength >= 600, `${article.sourceId}: ${locale} body is too short (${compactLength})`);
    }

    await validateGallery(article);
  }

  return { articles: document.articles.length, images: document.articles.reduce((sum, article) => sum + article.gallery.length, 0) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateOwnedContent();
  console.log(`Owned article validation passed: ${result.articles} article(s), ${result.images} licensed image(s).`);
}
