import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const expected = JSON.parse(
  await readFile(new URL("../data/posts.json", import.meta.url), "utf8"),
);
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ssundesk.com"
).replace(/\/+$/, "");
const attempts = Number(process.env.VERIFY_ATTEMPTS || 36);
const intervalMs = Number(process.env.VERIFY_INTERVAL_MS || 10_000);
const expectedLatest = expected.posts[0]?.logNo || "";
const expectedLatestUrl = expected.posts[0]?.url || "";
const expectedLatestCategory = expected.posts[0]?.category || "";

async function fetchFresh(pathname) {
  const separator = pathname.includes("?") ? "&" : "?";
  const response = await fetch(
    `${siteUrl}${pathname}${separator}sync=${encodeURIComponent(expected.generatedAt)}`,
    {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    },
  );
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}.`);
  }
  return response;
}

async function verifyRenderedPages() {
  const paths = ["/", "/archive"];
  if (["entertainment", "stocks"].includes(expectedLatestCategory)) {
    paths.push(`/${expectedLatestCategory}`);
  }

  const pages = await Promise.all(
    [...new Set(paths)].map(async (pathname) => ({
      pathname,
      html: await (await fetchFresh(pathname)).text(),
    })),
  );
  const missing = pages
    .filter(({ html }) => !html.includes(expectedLatestUrl))
    .map(({ pathname }) => pathname);
  if (missing.length > 0) {
    throw new Error(
      `Latest post ${expectedLatest} is missing from rendered pages: ${missing.join(", ")}.`,
    );
  }
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const response = await fetchFresh("/posts.json");
    if (response.ok) {
      const deployed = await response.json();
      const deployedLatest = deployed.posts?.[0]?.logNo || "";
      if (
        deployed.generatedAt === expected.generatedAt &&
        deployed.total === expected.total &&
        deployedLatest === expectedLatest
      ) {
        await verifyRenderedPages();
        console.log(
          JSON.stringify(
            {
              ok: true,
              siteUrl,
              generatedAt: deployed.generatedAt,
              total: deployed.total,
              latestLogNo: deployedLatest,
              attempt,
            },
            null,
            2,
          ),
        );
        process.exit(0);
      }
    }
  } catch (error) {
    if (attempt === attempts) throw error;
  }

  if (attempt < attempts) await delay(intervalMs);
}

throw new Error(
  `Production did not expose sync ${expected.generatedAt} ` +
    `(${expected.total} posts, latest ${expectedLatest}) within the verification window.`,
);
