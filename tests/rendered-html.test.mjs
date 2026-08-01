import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const content = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
);
const totalPosts = content.posts.length;
const archivePageCount = Math.max(1, Math.ceil(totalPosts / 50));

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished editorial home", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const textHtml = html.replaceAll("<!-- -->", "");
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /썬데스크/);
  assert.match(textHtml, new RegExp(`2013—${new Date().getFullYear()}`));
  assert.ok(textHtml.includes(totalPosts.toLocaleString("ko-KR")));
  assert.match(html, /연예 데스크/);
  assert.match(html, /주식 데스크/);
  assert.match(html, /brand\/ssdesk-logo-v1\.png/);
  assert.match(html, /brand\/ssdesk-og-v1\.png/);
  assert.match(html, /"@type":"Organization"/);
  assert.match(html, /"@type":"ImageObject"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /data-analytics-event="article_outbound_clicked"/);
  assert.match(html, /data-analytics-event="naver_profile_clicked"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("archive exposes public Naver links in paged HTML", async () => {
  const [firstResponse, lastResponse] = await Promise.all([
    render("/archive"),
    render(
      archivePageCount === 1
        ? "/archive"
        : `/archive/page/${archivePageCount}`,
    ),
  ]);

  assert.equal(firstResponse.status, 200);
  assert.equal(lastResponse.status, 200);

  const firstHtml = await firstResponse.text();
  const lastHtml = await lastResponse.text();
  const naverLink = /href="https:\/\/blog\.naver\.com\/tnsqo1126\/\d+"/g;

  assert.equal(new Set(firstHtml.match(naverLink)).size, 50);
  assert.equal(
    new Set(lastHtml.match(naverLink)).size,
    totalPosts % 50 || Math.min(50, totalPosts),
  );
  assert.match(firstHtml, /배우, 작품, 종목명, 제목 검색/);
  assert.match(firstHtml, /data-analytics-event="archive_search_submitted"/);
  assert.match(firstHtml, /data-analytics-article-id="\d+"/);
  if (archivePageCount > 1) {
    assert.match(lastHtml, new RegExp(`${archivePageCount}페이지`));
  }
});
