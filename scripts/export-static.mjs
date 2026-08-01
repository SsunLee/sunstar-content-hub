import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  getEligiblePostDetails,
  postDetailLastmod,
  postDetailPath,
} from "./post-detail-eligibility.mjs";

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
const analyticsScripts =
  targetName === "vercel"
    ? [
        "<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.va('beforeSend',function(event){try{var url=new URL(event.url,window.location.origin);url.searchParams.delete('q');url.hash='';return Object.assign({},event,{url:url.toString()})}catch{return event}});</script>",
        '<script defer src="/_vercel/insights/script.js"></script>',
        '<script defer src="/site-analytics.js"></script>',
      ].join("")
    : "";

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

const content = JSON.parse(
  await readFile(resolve(projectRoot, "data", "posts.json"), "utf8"),
);
const localizedContent = JSON.parse(
  await readFile(
    resolve(projectRoot, "data", "localized-articles.json"),
    "utf8",
  ),
);
const supportedLocales = ["ko", "en", "ja"];
if (!Array.isArray(localizedContent.articles)) {
  throw new Error("Localized content must contain an articles array.");
}
const archivePageCount = Math.max(1, Math.ceil(content.posts.length / 50));
const eligiblePostDetails = getEligiblePostDetails(content.posts);
const postDetailRoutes = eligiblePostDetails.map(postDetailPath);
const primaryRoutes = ["/", "/entertainment", "/stocks", "/archive", "/about"];
const archiveRoutes = Array.from(
  { length: Math.max(0, archivePageCount - 1) },
  (_, index) => `/archive/page/${index + 2}`,
);
const localizedHubRoutes = supportedLocales.map((locale) => `/${locale}`);
const localizedDeskRoutes = supportedLocales.flatMap((locale) => [
  `/${locale}/entertainment`,
  `/${locale}/stocks`,
]);
const localizedArticleRoutes = localizedContent.articles.flatMap((article) =>
  supportedLocales.map((locale) => {
    const slug = article.locales?.[locale]?.slug;
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(
        `Localized article ${article.sourceId || "unknown"} has an invalid ${locale} slug.`,
      );
    }
    return `/${locale}/news/${slug}`;
  }),
);
const routes = [
  ...primaryRoutes,
  ...archiveRoutes,
  ...(targetName === "vercel" ? postDetailRoutes : []),
  ...localizedHubRoutes,
  ...localizedDeskRoutes,
  ...localizedArticleRoutes,
];

function normalizeVerifiedUrl(value) {
  return value.replace(/\/+$/, "");
}

function isLocalizedLocaleReady(article, locale) {
  const localized = article.locales?.[locale];
  const verification = localized?.publicVerification;
  const path = `/${locale}/news/${localized?.slug || ""}`;
  const expectedUrl = routeUrl(siteUrl, path);
  return Boolean(
    localized?.status === "ready" &&
      localized?.robots === "index,follow" &&
      /^sha256:[a-f0-9]{64}$/.test(article.sourceHash || "") &&
      localized.translatedFromSourceHash === article.sourceHash &&
      verification?.status === "verified" &&
      verification.httpStatus === 200 &&
      verification.checkedAt &&
      normalizeVerifiedUrl(verification.resolvedUrl || "") ===
        normalizeVerifiedUrl(expectedUrl),
  );
}

const readyHubLocales = supportedLocales.filter((locale) =>
  localizedContent.articles.some((article) =>
    isLocalizedLocaleReady(article, locale),
  ),
);
const readyLocalizedHubRoutes = readyHubLocales.map((locale) => `/${locale}`);
const readyLocalizedArticleRoutes = localizedContent.articles.flatMap(
  (article) =>
    supportedLocales
      .filter((locale) => isLocalizedLocaleReady(article, locale))
      .map((locale) => `/${locale}/news/${article.locales[locale].slug}`),
);
const sitemapRoutes = [
  ...primaryRoutes,
  ...archiveRoutes,
  ...(targetName === "vercel" ? postDetailRoutes : []),
  ...(targetName === "vercel" ? readyLocalizedHubRoutes : []),
  ...(targetName === "vercel" ? localizedDeskRoutes : []),
  ...(targetName === "vercel" ? readyLocalizedArticleRoutes : []),
];
const sitemapLastmods = new Map(
  eligiblePostDetails.map((post) => [
    postDetailPath(post),
    postDetailLastmod(post),
  ]),
);

const localizedAlternates = new Map();
const defaultHubLocale = readyHubLocales.includes("ko")
  ? "ko"
  : readyHubLocales[0];
const hubAlternates = Object.fromEntries(
  readyHubLocales.map((locale) => [locale, `/${locale}`]),
);
if (readyHubLocales.length >= 2) {
  for (const route of readyLocalizedHubRoutes) {
    localizedAlternates.set(route, {
      ...hubAlternates,
      "x-default": `/${defaultHubLocale}`,
    });
  }
}
for (const desk of ["entertainment", "stocks"]) {
  const alternates = {
    ...Object.fromEntries(
      supportedLocales.map((locale) => [locale, `/${locale}/${desk}`]),
    ),
    "x-default": `/ko/${desk}`,
  };
  for (const locale of supportedLocales) {
    localizedAlternates.set(`/${locale}/${desk}`, alternates);
  }
}
for (const article of localizedContent.articles) {
  const readyLocales = supportedLocales.filter((locale) =>
    isLocalizedLocaleReady(article, locale),
  );
  if (readyLocales.length < 2) continue;
  const alternates = Object.fromEntries(
    readyLocales.map((locale) => [
      locale,
      `/${locale}/news/${article.locales[locale].slug}`,
    ]),
  );
  const defaultLocale = readyLocales.includes("ko") ? "ko" : readyLocales[0];
  for (const route of Object.values(alternates)) {
    localizedAlternates.set(route, {
      ...alternates,
      "x-default": alternates[defaultLocale],
    });
  }
}

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

function routeLocale(route) {
  const locale = route.split("/")[1];
  return supportedLocales.includes(locale) ? locale : null;
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

  const locale = routeLocale(route);
  if (locale) {
    result = result.replace(
      /(<html\b[^>]*\blang=")[^"]*(")/i,
      `$1${locale}$2`,
    );
    const headerShell =
      /<template\b[^>]*data-static-shell-marker="header-start"[^>]*><\/template>[\s\S]*?<template\b[^>]*data-static-shell-marker="header-end"[^>]*><\/template>/i;
    const footerShell =
      /<template\b[^>]*data-static-shell-marker="footer-start"[^>]*><\/template>[\s\S]*?<template\b[^>]*data-static-shell-marker="footer-end"[^>]*><\/template>/i;
    if (!headerShell.test(result) || !footerShell.test(result)) {
      throw new Error(`Localized shell markers are missing for ${route}.`);
    }
    result = result.replace(headerShell, "").replace(footerShell, "");
  }

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

  if (analyticsScripts) {
    result = result.replace("</body>", `${analyticsScripts}</body>`);
  }

  if (redirectSiteUrl) {
    result = result.replaceAll(
      `href="${basePath}/news/`,
      `href="${redirectSiteUrl}/news/`,
    );
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

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const sitemapUrls = sitemapRoutes.map((route) => {
  const loc = routeUrl(sitemapSiteUrl, route);
  const alternates = localizedAlternates.get(route);
  const lastmod = sitemapLastmods.get(route);
  if (!alternates) {
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
      "  </url>",
    ].join("\n");
  }
  const links = Object.entries(alternates).map(
    ([locale, alternateRoute]) =>
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(routeUrl(sitemapSiteUrl, alternateRoute))}" />`,
  );
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    ...links,
    "  </url>",
  ].join("\n");
});
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
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
