import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "docs");
const clientRoot = resolve(projectRoot, "dist", "client");
const workerPath = resolve(projectRoot, "dist", "server", "index.js");
const basePath = "/sunstar-content-hub";
const siteUrl = "https://ssunlee.github.io/sunstar-content-hub";

const primaryRoutes = ["/", "/entertainment", "/stocks", "/archive", "/about"];
const archiveRoutes = Array.from(
  { length: 21 },
  (_, index) => `/archive/page/${index + 2}`,
);
const routes = [...primaryRoutes, ...archiveRoutes];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(clientRoot, outputRoot, { recursive: true });

const { default: worker } = await import(
  `${pathToFileURL(workerPath).href}?static-export=${Date.now()}`
);

function outputPath(route) {
  if (route === "/") return resolve(outputRoot, "index.html");
  return resolve(outputRoot, route.slice(1), "index.html");
}

function toStaticHtml(html, route) {
  let result = html
    .replace(
      /<script(?![^>]*type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/gi,
      "",
    )
    .replace(/<link[^>]*rel="modulepreload"[^>]*\/?>/gi, "")
    .replace(/\sdata-rsc-css-href="[^"]*"/gi, "")
    .replace(/(href|src|action)="\/(?!\/)/g, `$1="${basePath}/`);

  if (route.startsWith("/archive")) {
    result = result
      .replace(
        "</head>",
        `<meta name="static-base" content="${basePath}"></head>`,
      )
      .replace(
        "</body>",
        `<script src="${basePath}/static-search.js" defer></script></body>`,
      );
  }

  return result;
}

for (const route of routes) {
  const response = await worker.fetch(
    new Request(`http://static.local${route}`, {
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

  if (response.status !== 200) {
    throw new Error(`Static render failed for ${route}: ${response.status}`);
  }

  const destination = outputPath(route);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, toStaticHtml(await response.text(), route));
}

const sitemapUrls = routes.map((route) => {
  const loc = route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`;
  return `  <url><loc>${loc}</loc></url>`;
});
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapUrls,
  "</urlset>",
  "",
].join("\n");
const robots = [
  "User-agent: *",
  "Allow: /",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  "",
].join("\n");

await Promise.all([
  writeFile(resolve(outputRoot, ".nojekyll"), ""),
  writeFile(resolve(outputRoot, "sitemap.xml"), sitemap),
  writeFile(resolve(outputRoot, "robots.txt"), robots),
]);

console.log(
  JSON.stringify(
    {
      output: outputRoot,
      routes: routes.length,
      sitemapUrls: sitemapUrls.length,
      siteUrl,
    },
    null,
    2,
  ),
);
