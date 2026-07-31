import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const [dataText, publicText] = await Promise.all([
  readFile(path.join(projectRoot, "data", "posts.json"), "utf8"),
  readFile(path.join(projectRoot, "public", "posts.json"), "utf8"),
]);

assert.equal(publicText, dataText, "data/posts.json and public/posts.json differ");

const content = JSON.parse(dataText);
assert.ok(Array.isArray(content.posts), "posts must be an array");
assert.equal(content.total, content.posts.length, "total does not match posts");
assert.equal(
  content.expectedPublicCount,
  content.total,
  "Naver public count does not match the collected post count",
);

const categoryLabels = {
  entertainment: "연예",
  stocks: "주식",
  archive: "기록",
};
const counts = { entertainment: 0, stocks: 0, archive: 0 };
const ids = new Set();
const logNos = new Set();
const urls = new Set();

for (const [index, post] of content.posts.entries()) {
  assert.match(post.id, /^naver:[^:]+:\d+$/, `invalid id at ${index}`);
  assert.match(post.logNo, /^\d+$/, `invalid logNo at ${index}`);
  assert.equal(
    post.url,
    `https://blog.naver.com/${content.blog.id}/${post.logNo}`,
    `invalid URL at ${index}`,
  );
  assert.ok(post.title?.trim(), `missing title at ${index}`);
  assert.ok(
    Number.isFinite(new Date(post.publishedAt).getTime()),
    `invalid publishedAt at ${index}`,
  );
  assert.ok(post.category in categoryLabels, `invalid category at ${index}`);
  assert.equal(
    post.categoryLabel,
    categoryLabels[post.category],
    `invalid category label at ${index}`,
  );
  assert.ok(!ids.has(post.id), `duplicate id: ${post.id}`);
  assert.ok(!logNos.has(post.logNo), `duplicate logNo: ${post.logNo}`);
  assert.ok(!urls.has(post.url), `duplicate URL: ${post.url}`);
  ids.add(post.id);
  logNos.add(post.logNo);
  urls.add(post.url);
  counts[post.category] += 1;

  if (index > 0) {
    const previous = content.posts[index - 1];
    const previousTime = new Date(previous.publishedAt).getTime();
    const currentTime = new Date(post.publishedAt).getTime();
    assert.ok(
      previousTime > currentTime ||
        (previousTime === currentTime && Number(previous.logNo) >= Number(post.logNo)),
      `posts are not sorted newest-first at ${index}`,
    );
  }
}

assert.deepEqual(content.counts, counts, "category counts do not match posts");

console.log(
  JSON.stringify(
    {
      ok: true,
      generatedAt: content.generatedAt,
      total: content.total,
      counts,
      latest: content.posts[0]?.url || null,
    },
    null,
    2,
  ),
);
