import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ssundesk.com"
).replace(/\/+$/, "");

const indexNowKey = "8fd6498b0d274934ad567cecd1fae369";
const content = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
);
const archivePageCount = Math.max(1, Math.ceil(content.posts.length / 50));
const archivePages = Array.from(
  { length: Math.max(0, archivePageCount - 1) },
  (_, index) => `${siteUrl}/archive/page/${index + 2}`,
);
const urlList = [
  `${siteUrl}/`,
  `${siteUrl}/entertainment`,
  `${siteUrl}/stocks`,
  `${siteUrl}/archive`,
  `${siteUrl}/about`,
  ...archivePages,
];

const payload = {
  host: new URL(siteUrl).host,
  key: indexNowKey,
  keyLocation: `${siteUrl}/${indexNowKey}.txt`,
  urlList,
};

const maxAttempts = Number(process.env.INDEXNOW_ATTEMPTS || 4);
let response;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  if ([200, 202].includes(response.status)) break;

  const detail = await response.text();
  if (attempt === maxAttempts || ![429, 500, 502, 503, 504].includes(response.status)) {
    throw new Error(
      `IndexNow submission failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const retryAfter = Number(response.headers.get("retry-after"));
  await delay(
    Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1_000, 30_000)
      : 1_000 * 2 ** (attempt - 1),
  );
}

if (!response) throw new Error("IndexNow submission did not run.");

console.log(
  JSON.stringify(
    {
      accepted: true,
      status: response.status,
      host: payload.host,
      submitted: urlList.length,
      keyLocation: payload.keyLocation,
    },
    null,
    2,
  ),
);
