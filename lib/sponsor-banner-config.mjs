const SUPPORTED_DIMENSIONS = new Set([
  "300x250",
  "320x100",
  "320x50",
  "728x90",
  "160x600",
  "250x250",
]);
const ALLOWED_LINK_PROTOCOLS = new Set(["https:"]);

export const SPONSOR_BANNER_FEATURE_FLAG = "SPONSOR_BANNER_ENABLED";

export const SPONSOR_BANNER_PLACEMENTS = Object.freeze({
  "home-after-lead": Object.freeze({
    image: "SPONSOR_BANNER_HOME_AFTER_LEAD_IMAGE_URL",
    link: "SPONSOR_BANNER_HOME_AFTER_LEAD_LINK_URL",
    alt: "SPONSOR_BANNER_HOME_AFTER_LEAD_ALT",
    width: "SPONSOR_BANNER_HOME_AFTER_LEAD_WIDTH",
    height: "SPONSOR_BANNER_HOME_AFTER_LEAD_HEIGHT",
  }),
  "home-between-desks": Object.freeze({
    image: "SPONSOR_BANNER_HOME_BETWEEN_DESKS_IMAGE_URL",
    link: "SPONSOR_BANNER_HOME_BETWEEN_DESKS_LINK_URL",
    alt: "SPONSOR_BANNER_HOME_BETWEEN_DESKS_ALT",
    width: "SPONSOR_BANNER_HOME_BETWEEN_DESKS_WIDTH",
    height: "SPONSOR_BANNER_HOME_BETWEEN_DESKS_HEIGHT",
  }),
  "entertainment-desk": Object.freeze({
    image: "SPONSOR_BANNER_ENTERTAINMENT_DESK_IMAGE_URL",
    link: "SPONSOR_BANNER_ENTERTAINMENT_DESK_LINK_URL",
    alt: "SPONSOR_BANNER_ENTERTAINMENT_DESK_ALT",
    width: "SPONSOR_BANNER_ENTERTAINMENT_DESK_WIDTH",
    height: "SPONSOR_BANNER_ENTERTAINMENT_DESK_HEIGHT",
  }),
  "stocks-desk": Object.freeze({
    image: "SPONSOR_BANNER_STOCKS_DESK_IMAGE_URL",
    link: "SPONSOR_BANNER_STOCKS_DESK_LINK_URL",
    alt: "SPONSOR_BANNER_STOCKS_DESK_ALT",
    width: "SPONSOR_BANNER_STOCKS_DESK_WIDTH",
    height: "SPONSOR_BANNER_STOCKS_DESK_HEIGHT",
  }),
  "entertainment-article": Object.freeze({
    image: "SPONSOR_BANNER_ENTERTAINMENT_ARTICLE_IMAGE_URL",
    link: "SPONSOR_BANNER_ENTERTAINMENT_ARTICLE_LINK_URL",
    alt: "SPONSOR_BANNER_ENTERTAINMENT_ARTICLE_ALT",
    width: "SPONSOR_BANNER_ENTERTAINMENT_ARTICLE_WIDTH",
    height: "SPONSOR_BANNER_ENTERTAINMENT_ARTICLE_HEIGHT",
  }),
  "stocks-article": Object.freeze({
    image: "SPONSOR_BANNER_STOCKS_ARTICLE_IMAGE_URL",
    link: "SPONSOR_BANNER_STOCKS_ARTICLE_LINK_URL",
    alt: "SPONSOR_BANNER_STOCKS_ARTICLE_ALT",
    width: "SPONSOR_BANNER_STOCKS_ARTICLE_WIDTH",
    height: "SPONSOR_BANNER_STOCKS_ARTICLE_HEIGHT",
  }),
});

function isHttpsImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedLinkUrl(value) {
  try {
    const url = new URL(value);
    return ALLOWED_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function configuredPlacementCount(environment) {
  return Object.values(SPONSOR_BANNER_PLACEMENTS).filter(
    ({ image, link, alt, width, height }) =>
      [image, link, alt, width, height].some((name) =>
        String(environment[name] || "").trim(),
      ),
  ).length;
}

export function resolveSponsorBannerPlacement(placement, environment = process.env) {
  if (environment[SPONSOR_BANNER_FEATURE_FLAG] !== "1") return null;

  if (configuredPlacementCount(environment) === 0) {
    throw new Error(
      "Sponsor banner is enabled but no placement has a configured image, link, and dimensions.",
    );
  }

  const variableNames = SPONSOR_BANNER_PLACEMENTS[placement];
  if (!variableNames) {
    throw new Error(`Unknown sponsor banner placement: ${placement}`);
  }

  const imageUrl = String(environment[variableNames.image] || "").trim();
  const linkUrl = String(environment[variableNames.link] || "").trim();
  const alt = String(environment[variableNames.alt] || "").trim();
  const widthText = String(environment[variableNames.width] || "").trim();
  const heightText = String(environment[variableNames.height] || "").trim();
  const supplied = [imageUrl, linkUrl, alt, widthText, heightText].filter(
    Boolean,
  ).length;
  if (supplied === 0) return null;

  const dimensions = `${widthText}x${heightText}`;
  if (
    supplied !== 5 ||
    !isHttpsImageUrl(imageUrl) ||
    !isAllowedLinkUrl(linkUrl) ||
    !SUPPORTED_DIMENSIONS.has(dimensions)
  ) {
    throw new Error(
      `Sponsor banner placement ${placement} must define an HTTPS image URL, an HTTPS link URL, non-empty alt text, and one of these sizes: ${[
        ...SUPPORTED_DIMENSIONS,
      ].join(", ")}.`,
    );
  }

  return Object.freeze({
    imageUrl,
    linkUrl,
    alt,
    width: Number(widthText),
    height: Number(heightText),
  });
}
