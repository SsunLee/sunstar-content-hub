import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const outputRoot = new URL("../vercel-dist/", import.meta.url);
const outputPath = fileURLToPath(outputRoot);

function normalizeSiteUrl(value) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function expectedSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  return "https://ssundesk.com";
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

test("Vercel export exposes all posts from root-relative pages", async () => {
  const indexFiles = await findIndexFiles(outputPath);
  assert.equal(indexFiles.length, 26);

  const html = (
    await Promise.all(indexFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");
  const logNos = new Set(
    [...html.matchAll(/href="https:\/\/blog\.naver\.com\/tnsqo1126\/(\d+)"/g)].map(
      (match) => match[1],
    ),
  );

  assert.equal(logNos.size, 1084);
  assert.doesNotMatch(html, /__VINEXT_RSC|sunstar-content-hub\.sites\.openai\.com/);
  assert.doesNotMatch(html, /\/sunstar-content-hub\/assets\//);
  assert.doesNotMatch(
    html,
    /https:\/\/(?:ssunlee\.github\.io\/sunstar-content-hub|sunstar-content-hub\.vercel\.app)/,
  );
  assert.match(html, /(href|src)="\/assets\//);
  assert.doesNotMatch(html, /http-equiv="refresh"|window\.location\.replace/);
});

test("Vercel homepage uses the production title, canonical, and WebSite graph", async () => {
  const homepage = await readFile(join(outputPath, "index.html"), "utf8");
  const siteUrl = expectedSiteUrl();
  const escapedSiteUrl = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(
    homepage,
    /<title>오늘의 연예·주식 이슈 \| 쑨쑨 콘텐츠 데스크<\/title>/,
  );
  assert.match(
    homepage,
    new RegExp(`rel="canonical" href="${escapedSiteUrl}/"`),
  );
  assert.match(homepage, /"@graph":\[/);
  assert.match(homepage, /"@type":"WebSite"/);
  assert.match(homepage, /"name":"쑨쑨 콘텐츠 데스크"/);
  assert.match(homepage, /"alternateName":\["쑨쑨 데스크"\]/);
  assert.match(
    homepage,
    new RegExp(`"url":"${escapedSiteUrl}/"`),
  );
  assert.match(
    homepage,
    /<meta name="msvalidate\.01" content="1155F1214144455C499E39A6173CFE8F"\/?>/,
  );
  assert.match(
    homepage,
    /<meta name="google-site-verification" content="gP_sQo1TJMDeAIUZpttQV4hrN8Zg7L48d1dQCQBpKbA"\/?>/,
  );
});

test("Vercel search-engine files reference only the primary custom domain", async () => {
  const [sitemap, robots, indexNowKey] = await Promise.all([
    readFile(new URL("sitemap.xml", outputRoot), "utf8"),
    readFile(new URL("robots.txt", outputRoot), "utf8"),
    readFile(
      new URL("8fd6498b0d274934ad567cecd1fae369.txt", outputRoot),
      "utf8",
    ),
  ]);
  const siteUrl = expectedSiteUrl();

  assert.equal((sitemap.match(/<loc>/g) || []).length, 26);
  assert.doesNotMatch(sitemap, /blog\.naver\.com|ssunlee\.github\.io/);
  assert.match(sitemap, new RegExp(`<loc>${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/</loc>`));
  assert.equal(robots, `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
  assert.equal(indexNowKey.trim(), "8fd6498b0d274934ad567cecd1fae369");
});
