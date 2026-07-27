import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const docsRoot = new URL("../docs/", import.meta.url);
const docsPath = fileURLToPath(docsRoot);

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

test("static mirror exposes every Naver post across indexable pages", async () => {
  const indexFiles = await findIndexFiles(docsPath);
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
  assert.doesNotMatch(html, /(href|src)="\/assets\//);
  assert.match(html, /https:\/\/ssunlee\.github\.io\/sunstar-content-hub/);
  assert.doesNotMatch(
    html,
    /rel="canonical" href="https:\/\/ssunlee\.github\.io\/(?!sunstar-content-hub)/,
  );
  assert.doesNotMatch(
    html,
    /rel="(?:shortcut )?icon" href="https:\/\/ssunlee\.github\.io\/favicon\.svg"/,
  );
});

test("static search-engine files stay on the owned mirror host", async () => {
  const [sitemap, robots, indexNowKey] = await Promise.all([
    readFile(new URL("sitemap.xml", docsRoot), "utf8"),
    readFile(new URL("robots.txt", docsRoot), "utf8"),
    readFile(
      new URL("8fd6498b0d274934ad567cecd1fae369.txt", docsRoot),
      "utf8",
    ),
  ]);

  assert.equal((sitemap.match(/<loc>/g) || []).length, 26);
  assert.doesNotMatch(sitemap, /blog\.naver\.com/);
  assert.match(
    robots,
    /Sitemap: https:\/\/ssunlee\.github\.io\/sunstar-content-hub\/sitemap\.xml/,
  );
  assert.equal(indexNowKey.trim(), "8fd6498b0d274934ad567cecd1fae369");
});
