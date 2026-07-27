import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetName = process.argv[2] ?? "github";
const primarySiteUrl = "https://ssundesk.com";
const legacyGithubSiteUrl =
  "https://ssunlee.github.io/sunstar-content-hub";
const vercelSiteUrl = resolveVercelSiteUrl();
const targets = {
  github: {
    outputDirectory: "docs",
    basePath: "/sunstar-content-hub",
    siteUrl: primarySiteUrl,
    sitemapSiteUrl: legacyGithubSiteUrl,
    redirectSiteUrl: primarySiteUrl,
  },
  vercel: {
    outputDirectory: "vercel-dist",
    basePath: "",
    siteUrl: vercelSiteUrl,
    sitemapSiteUrl: vercelSiteUrl,
    redirectSiteUrl: null,
  },
};
const target = targets[targetName];

if (!target) {
  throw new Error(
    `Unknown static export target "${targetName}". Use "github" or "vercel".`,
  );
}

const outputRoot = resolve(projectRoot, target.outputDirectory);
const clientRoot = resolve(projectRoot, "dist", "client");
const workerPath = resolve(projectRoot, "dist", "server", "index.js");
const { basePath, redirectSiteUrl, sitemapSiteUrl, siteUrl } = target;

function normalizeSiteUrl(value) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function resolveVercelSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return normalizeSiteUrl(configuredUrl);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return normalizeSiteUrl(productionHost);

  return primarySiteUrl;
}

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["run", "build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
  shell: isWindows,
  stdio: "inherit",
});

if (build.error) throw build.error;
if (build.status !== 0) {
  throw new Error(`Application build failed with exit code ${build.status}.`);
}

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

function routeUrl(rootUrl, route) {
  return route === "/" ? `${rootUrl}/` : `${rootUrl}${route}`;
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

  if (redirectSiteUrl) {
    const destination = routeUrl(redirectSiteUrl, route);
    const redirectScript = [
      "<script>",
      `window.location.replace(${JSON.stringify(destination)} + window.location.search + window.location.hash);`,
      "</script>",
    ].join("");
    const redirectMeta =
      `<meta http-equiv="refresh" content="0;url=${destination}">`;
    const fallback =
      `<noscript><p><a href="${destination}">새 주소에서 이 페이지 보기</a></p></noscript>`;

    result = result
      .replace("</head>", `${redirectScript}${redirectMeta}</head>`)
      .replace(/<body([^>]*)>/i, `<body$1>${fallback}`);
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
  const loc = routeUrl(sitemapSiteUrl, route);
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
  `Sitemap: ${sitemapSiteUrl}/sitemap.xml`,
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
      target: targetName,
      routes: routes.length,
      sitemapUrls: sitemapUrls.length,
      siteUrl,
      sitemapSiteUrl,
      redirectSiteUrl,
    },
    null,
    2,
  ),
);
