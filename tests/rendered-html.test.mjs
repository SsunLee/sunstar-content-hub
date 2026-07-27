import assert from "node:assert/strict";
import test from "node:test";

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
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /썬데스크/);
  assert.match(html, /2013—2026/);
  assert.match(html, /1,084/);
  assert.match(html, /연예 데스크/);
  assert.match(html, /주식 데스크/);
  assert.match(html, /brand\/ssdesk-logo-v1\.png/);
  assert.match(html, /brand\/ssdesk-og-v1\.png/);
  assert.match(html, /"@type":"Organization"/);
  assert.match(html, /"@type":"ImageObject"/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("archive exposes public Naver links in paged HTML", async () => {
  const [firstResponse, lastResponse] = await Promise.all([
    render("/archive"),
    render("/archive/page/22"),
  ]);

  assert.equal(firstResponse.status, 200);
  assert.equal(lastResponse.status, 200);

  const firstHtml = await firstResponse.text();
  const lastHtml = await lastResponse.text();
  const naverLink = /href="https:\/\/blog\.naver\.com\/tnsqo1126\/\d+"/g;

  assert.equal(new Set(firstHtml.match(naverLink)).size, 50);
  assert.equal(new Set(lastHtml.match(naverLink)).size, 34);
  assert.match(firstHtml, /배우, 작품, 종목명, 제목 검색/);
  assert.match(lastHtml, /22페이지/);
});
