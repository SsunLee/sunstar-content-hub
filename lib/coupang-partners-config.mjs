const TRACKING_CODE_PATTERN = /^AF\d{5,12}$/;
const ID_PATTERN = /^[1-9]\d{0,15}$/;
const TEMPLATE_PATTERN = /^[a-z]{2,32}$/;
const DIMENSION_PATTERN = /^[1-9]\d{0,4}$/;

export const COUPANG_PARTNERS_FEATURE_FLAG = "COUPANG_PARTNERS_ENABLED";
export const COUPANG_PARTNERS_SDK_URL = "https://ads-partners.coupang.com/g.js";

export const COUPANG_PARTNERS_PLACEMENTS = Object.freeze({
  "home-after-lead": Object.freeze({
    id: "COUPANG_PARTNERS_HOME_AFTER_LEAD_ID",
    trackingCode: "COUPANG_PARTNERS_HOME_AFTER_LEAD_TRACKING_CODE",
    template: "COUPANG_PARTNERS_HOME_AFTER_LEAD_TEMPLATE",
    width: "COUPANG_PARTNERS_HOME_AFTER_LEAD_WIDTH",
    height: "COUPANG_PARTNERS_HOME_AFTER_LEAD_HEIGHT",
  }),
  "home-between-desks": Object.freeze({
    id: "COUPANG_PARTNERS_HOME_BETWEEN_DESKS_ID",
    trackingCode: "COUPANG_PARTNERS_HOME_BETWEEN_DESKS_TRACKING_CODE",
    template: "COUPANG_PARTNERS_HOME_BETWEEN_DESKS_TEMPLATE",
    width: "COUPANG_PARTNERS_HOME_BETWEEN_DESKS_WIDTH",
    height: "COUPANG_PARTNERS_HOME_BETWEEN_DESKS_HEIGHT",
  }),
  "entertainment-desk": Object.freeze({
    id: "COUPANG_PARTNERS_ENTERTAINMENT_DESK_ID",
    trackingCode: "COUPANG_PARTNERS_ENTERTAINMENT_DESK_TRACKING_CODE",
    template: "COUPANG_PARTNERS_ENTERTAINMENT_DESK_TEMPLATE",
    width: "COUPANG_PARTNERS_ENTERTAINMENT_DESK_WIDTH",
    height: "COUPANG_PARTNERS_ENTERTAINMENT_DESK_HEIGHT",
  }),
  "stocks-desk": Object.freeze({
    id: "COUPANG_PARTNERS_STOCKS_DESK_ID",
    trackingCode: "COUPANG_PARTNERS_STOCKS_DESK_TRACKING_CODE",
    template: "COUPANG_PARTNERS_STOCKS_DESK_TEMPLATE",
    width: "COUPANG_PARTNERS_STOCKS_DESK_WIDTH",
    height: "COUPANG_PARTNERS_STOCKS_DESK_HEIGHT",
  }),
  "entertainment-article": Object.freeze({
    id: "COUPANG_PARTNERS_ENTERTAINMENT_ARTICLE_ID",
    trackingCode: "COUPANG_PARTNERS_ENTERTAINMENT_ARTICLE_TRACKING_CODE",
    template: "COUPANG_PARTNERS_ENTERTAINMENT_ARTICLE_TEMPLATE",
    width: "COUPANG_PARTNERS_ENTERTAINMENT_ARTICLE_WIDTH",
    height: "COUPANG_PARTNERS_ENTERTAINMENT_ARTICLE_HEIGHT",
  }),
  "stocks-article": Object.freeze({
    id: "COUPANG_PARTNERS_STOCKS_ARTICLE_ID",
    trackingCode: "COUPANG_PARTNERS_STOCKS_ARTICLE_TRACKING_CODE",
    template: "COUPANG_PARTNERS_STOCKS_ARTICLE_TEMPLATE",
    width: "COUPANG_PARTNERS_STOCKS_ARTICLE_WIDTH",
    height: "COUPANG_PARTNERS_STOCKS_ARTICLE_HEIGHT",
  }),
});

function configuredPlacementCount(environment) {
  return Object.values(COUPANG_PARTNERS_PLACEMENTS).filter(
    ({ id, trackingCode, template, width, height }) =>
      [id, trackingCode, template, width, height].some((name) =>
        String(environment[name] || "").trim(),
      ),
  ).length;
}

export function resolveCoupangPartnersPlacement(placement, environment = process.env) {
  if (environment[COUPANG_PARTNERS_FEATURE_FLAG] !== "1") return null;

  if (configuredPlacementCount(environment) === 0) {
    throw new Error(
      "Coupang Partners banner is enabled but no placement has a configured unit.",
    );
  }

  const variableNames = COUPANG_PARTNERS_PLACEMENTS[placement];
  if (!variableNames) {
    throw new Error(`Unknown Coupang Partners placement: ${placement}`);
  }

  const id = String(environment[variableNames.id] || "").trim();
  const trackingCode = String(environment[variableNames.trackingCode] || "").trim();
  const template = String(environment[variableNames.template] || "").trim();
  const widthText = String(environment[variableNames.width] || "").trim();
  const heightText = String(environment[variableNames.height] || "").trim();
  const supplied = [id, trackingCode, template, widthText, heightText].filter(
    Boolean,
  ).length;
  if (supplied === 0) return null;

  if (
    supplied !== 5 ||
    !ID_PATTERN.test(id) ||
    !TRACKING_CODE_PATTERN.test(trackingCode) ||
    !TEMPLATE_PATTERN.test(template) ||
    !DIMENSION_PATTERN.test(widthText) ||
    !DIMENSION_PATTERN.test(heightText)
  ) {
    throw new Error(
      `Coupang Partners placement ${placement} must define a numeric unit id, a tracking code shaped like AF########, a lowercase template name, and numeric width/height.`,
    );
  }

  return Object.freeze({
    id: Number(id),
    trackingCode,
    template,
    width: Number(widthText),
    height: Number(heightText),
  });
}
