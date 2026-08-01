import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isPostDetailEligible } from "./post-detail-eligibility.mjs";

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
let detailReady = 0;

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

  if (post.detailSections !== undefined) {
    assert.ok(
      Array.isArray(post.detailSections),
      `detailSections must be an array at ${index}`,
    );
    assert.ok(
      post.detailSections.length === 0 || post.detailSections.length >= 3,
      `detailSections must be empty or contain at least 3 sections at ${index}`,
    );
    const sectionHeadings = new Set();
    const sectionBodies = new Set();
    for (const [sectionIndex, section] of post.detailSections.entries()) {
      assert.ok(
        section && typeof section === "object" && !Array.isArray(section),
        `invalid detail section at ${index}:${sectionIndex}`,
      );
      assert.ok(
        typeof section.heading === "string" && section.heading.trim(),
        `missing detail heading at ${index}:${sectionIndex}`,
      );
      assert.ok(
        section.heading.trim().length <= 80,
        `detail heading is too long at ${index}:${sectionIndex}`,
      );
      assert.ok(
        typeof section.body === "string" && section.body.trim().length >= 80,
        `detail body is too short at ${index}:${sectionIndex}`,
      );
      assert.doesNotMatch(
        section.heading,
        /^(?:(?:사진|이미지|영상)\s*출처|차트 원자료|누계 실적|시장 데이터|주주환원 공시|시세 확인|시장 비교|(?:\d{1,2}시대\s*)?거래량 확인)\s*:/i,
        `detail heading contains a caption at ${index}:${sectionIndex}`,
      );
      assert.doesNotMatch(
        section.heading,
        /[▲▼△▽]/,
        `detail heading contains a chart marker at ${index}:${sectionIndex}`,
      );
      assert.doesNotMatch(
        section.heading,
        /^[+\-−]?\s*\d[\d,.]*(?:\s*(?:조|억|만|천))?\s*(?:원|주|명|건|%|%p|배)?\s*$/i,
        `detail heading is a standalone chart value at ${index}:${sectionIndex}`,
      );
      assert.doesNotMatch(
        section.body,
        /^(?:사진|이미지|영상)\s*출처\s*:/i,
        `detail body contains a caption at ${index}:${sectionIndex}`,
      );
      const headingKey = section.heading.trim().toLocaleLowerCase("ko-KR");
      const bodyKey = section.body.trim().slice(0, 120).toLocaleLowerCase("ko-KR");
      assert.ok(
        !sectionHeadings.has(headingKey),
        `duplicate detail heading at ${index}:${sectionIndex}`,
      );
      assert.ok(
        !sectionBodies.has(bodyKey),
        `duplicate detail body at ${index}:${sectionIndex}`,
      );
      sectionHeadings.add(headingKey);
      sectionBodies.add(bodyKey);
    }
    if (post.detailSections.length > 0) {
      assert.ok(
        Number.isFinite(Date.parse(post.detailUpdatedAt || "")),
        `detailUpdatedAt is missing or invalid at ${index}`,
      );
      assert.equal(
        post.detailExtractionVersion,
        3,
        `unsupported detailExtractionVersion at ${index}`,
      );
      assert.match(
        post.detailContentHash || "",
        /^sha256:[a-f0-9]{64}$/,
        `detailContentHash is missing or invalid at ${index}`,
      );
    }
  }

  if (isPostDetailEligible(post)) detailReady += 1;

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
      detailReady,
      latest: content.posts[0]?.url || null,
    },
    null,
    2,
  ),
);
