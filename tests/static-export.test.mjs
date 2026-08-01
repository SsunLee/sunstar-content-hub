import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const docsRoot = new URL("../docs/", import.meta.url);
const docsPath = fileURLToPath(docsRoot);
const content = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
);
const totalPosts = content.posts.length;
const archivePageCount = Math.max(1, Math.ceil(totalPosts / 50));
const routeCount = archivePageCount + 4;

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

test("legacy static pages preserve every Naver link while redirecting", async () => {
  const indexFiles = await findIndexFiles(docsPath);
  assert.equal(indexFiles.length, routeCount);

  const html = (
    await Promise.all(indexFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");
  const logNos = new Set(
    [...html.matchAll(/href="https:\/\/blog\.naver\.com\/tnsqo1126\/(\d+)"/g)].map(
      (match) => match[1],
    ),
  );

  assert.equal(logNos.size, totalPosts);
  assert.doesNotMatch(html, /__VINEXT_RSC|sunstar-content-hub\.sites\.openai\.com/);
  assert.doesNotMatch(html, /(href|src)="\/assets\//);
  assert.doesNotMatch(
    html,
    /rel="canonical" href="https:\/\/ssunlee\.github\.io\//,
  );
  assert.equal(
    (
      html.match(
        /rel="canonical" href="https:\/\/ssundesk\.com(?:\/[^"]*)?"/g,
      ) || []
    ).length,
      routeCount,
  );
  assert.equal(
    (
      html.match(
        /<meta http-equiv="refresh" content="0;url=https:\/\/ssundesk\.com(?:\/[^"]*)?">/g,
      ) || []
    ).length,
      routeCount,
  );
  assert.equal(
    (html.match(/window\.location\.replace\(/g) || []).length,
    routeCount,
  );
  assert.equal(
    (html.match(/새 주소에서 이 페이지 보기/g) || []).length,
      routeCount,
  );
  assert.doesNotMatch(
    html,
    /rel="(?:shortcut )?icon" href="https:\/\/ssunlee\.github\.io\/favicon\.svg"/,
  );
  assert.doesNotMatch(html, /name="robots" content="noindex/i);
  assert.doesNotMatch(
    html,
    /_vercel\/insights\/script\.js|\/site-analytics\.js|window\.va\('beforeSend'/,
  );
});

test("legacy sitemap keeps old URLs discoverable during migration", async () => {
  const [sitemap, robots, indexNowKey] = await Promise.all([
    readFile(new URL("sitemap.xml", docsRoot), "utf8"),
    readFile(new URL("robots.txt", docsRoot), "utf8"),
    readFile(
      new URL("8fd6498b0d274934ad567cecd1fae369.txt", docsRoot),
      "utf8",
    ),
  ]);

  assert.equal((sitemap.match(/<loc>/g) || []).length, routeCount);
  assert.doesNotMatch(sitemap, /blog\.naver\.com/);
  assert.doesNotMatch(sitemap, /ssundesk\.com/);
  assert.match(
    robots,
    /Sitemap: https:\/\/ssunlee\.github\.io\/sunstar-content-hub\/sitemap\.xml/,
  );
  assert.equal(indexNowKey.trim(), "8fd6498b0d274934ad567cecd1fae369");
});

test("static homepage exposes search-console ownership tokens", async () => {
  const [homepage, lastArchivePage, favicon] = await Promise.all([
    readFile(join(docsPath, "index.html"), "utf8"),
    readFile(
      archivePageCount === 1
        ? join(docsPath, "archive", "index.html")
        : join(
            docsPath,
            "archive",
            "page",
            String(archivePageCount),
            "index.html",
          ),
      "utf8",
    ),
    readFile(join(docsPath, "favicon.svg"), "utf8"),
  ]);
  assert.match(
    homepage,
    /<title>오늘의 연예·주식 이슈 \| 썬데스크<\/title>/,
  );
  assert.match(homepage, /"@graph":\[/);
  assert.match(homepage, /"@type":"WebSite"/);
  assert.match(homepage, /"@type":"Organization"/);
  assert.match(
    homepage,
    /"publisher":\{"@id":"https:\/\/ssundesk\.com\/#organization"\}/,
  );
  assert.match(
    homepage,
    /"alternateName":\["SS\.Desk","쑨쑨 콘텐츠 데스크","쑨쑨 데스크"\]/,
  );
  assert.match(
    homepage,
    /https:\/\/ssundesk\.com\/brand\/ssdesk-logo-v1\.png/,
  );
  assert.match(
    homepage,
    /src="\/sunstar-content-hub\/brand\/ssdesk-logo-v1\.png"/,
  );
  assert.match(
    homepage,
    /https:\/\/ssundesk\.com\/brand\/ssdesk-og-v1\.png/,
  );
  assert.match(homepage, /"url":"https:\/\/ssundesk\.com\/"/);
  assert.match(
    lastArchivePage,
    archivePageCount === 1
      ? /http-equiv="refresh" content="0;url=https:\/\/ssundesk\.com\/archive"/
      : new RegExp(
          `http-equiv="refresh" content="0;url=https://ssundesk\\.com/archive/page/${archivePageCount}"`,
        ),
  );
  assert.match(
    homepage,
    /<meta name="msvalidate\.01" content="1155F1214144455C499E39A6173CFE8F"\/?>/,
  );
  assert.match(
    homepage,
    /<meta name="google-site-verification" content="gP_sQo1TJMDeAIUZpttQV4hrN8Zg7L48d1dQCQBpKbA"\/?>/,
  );
  const [logo, socialImage] = await Promise.all([
    readFile(join(docsPath, "brand", "ssdesk-logo-v1.png")),
    readFile(join(docsPath, "brand", "ssdesk-og-v1.png")),
  ]);
  assert.ok(logo.byteLength > 10_000 && logo.byteLength < 600_000);
  assert.ok(socialImage.byteLength > 10_000 && socialImage.byteLength < 600_000);
  assert.match(favicon, /썬데스크 SS 심벌/);
  assert.doesNotMatch(favicon, /<text\b/);
});
