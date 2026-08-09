const UNIT_PATTERN = /^DAN-[A-Za-z0-9_-]{6,64}$/u;
const SUPPORTED_DIMENSIONS = new Set([
  "300x250",
  "320x100",
  "320x50",
  "728x90",
]);
const ALLOWED_SDK_HOSTS = new Set(["t1.daumcdn.net", "t1.kakaocdn.net"]);

export const ADFIT_FEATURE_FLAG = "KAKAO_ADFIT_ENABLED";
export const ADFIT_SDK_VARIABLE = "KAKAO_ADFIT_SCRIPT_URL";

export const ADFIT_PLACEMENTS = Object.freeze({
  "header-desktop": Object.freeze({
    unit: "KAKAO_ADFIT_HEADER_DESKTOP_UNIT",
    width: "KAKAO_ADFIT_HEADER_DESKTOP_WIDTH",
    height: "KAKAO_ADFIT_HEADER_DESKTOP_HEIGHT",
  }),
  "header-mobile": Object.freeze({
    unit: "KAKAO_ADFIT_HEADER_MOBILE_UNIT",
    width: "KAKAO_ADFIT_HEADER_MOBILE_WIDTH",
    height: "KAKAO_ADFIT_HEADER_MOBILE_HEIGHT",
  }),
  "home-after-lead": Object.freeze({
    unit: "KAKAO_ADFIT_HOME_AFTER_LEAD_UNIT",
    width: "KAKAO_ADFIT_HOME_AFTER_LEAD_WIDTH",
    height: "KAKAO_ADFIT_HOME_AFTER_LEAD_HEIGHT",
  }),
  "home-between-desks": Object.freeze({
    unit: "KAKAO_ADFIT_HOME_BETWEEN_DESKS_UNIT",
    width: "KAKAO_ADFIT_HOME_BETWEEN_DESKS_WIDTH",
    height: "KAKAO_ADFIT_HOME_BETWEEN_DESKS_HEIGHT",
  }),
  "entertainment-desk": Object.freeze({
    unit: "KAKAO_ADFIT_ENTERTAINMENT_DESK_UNIT",
    width: "KAKAO_ADFIT_ENTERTAINMENT_DESK_WIDTH",
    height: "KAKAO_ADFIT_ENTERTAINMENT_DESK_HEIGHT",
  }),
  "stocks-desk": Object.freeze({
    unit: "KAKAO_ADFIT_STOCKS_DESK_UNIT",
    width: "KAKAO_ADFIT_STOCKS_DESK_WIDTH",
    height: "KAKAO_ADFIT_STOCKS_DESK_HEIGHT",
  }),
  "entertainment-article": Object.freeze({
    unit: "KAKAO_ADFIT_ENTERTAINMENT_ARTICLE_UNIT",
    width: "KAKAO_ADFIT_ENTERTAINMENT_ARTICLE_WIDTH",
    height: "KAKAO_ADFIT_ENTERTAINMENT_ARTICLE_HEIGHT",
  }),
  "stocks-article": Object.freeze({
    unit: "KAKAO_ADFIT_STOCKS_ARTICLE_UNIT",
    width: "KAKAO_ADFIT_STOCKS_ARTICLE_WIDTH",
    height: "KAKAO_ADFIT_STOCKS_ARTICLE_HEIGHT",
  }),
});

export function isValidAdFitUnit(value) {
  return UNIT_PATTERN.test(String(value || "").trim());
}

export function normalizeAdFitSdkUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    !ALLOWED_SDK_HOSTS.has(parsed.hostname) ||
    !parsed.pathname.endsWith(".js")
  ) {
    return null;
  }
  return parsed.toString();
}

function configuredPlacementCount(environment) {
  return Object.values(ADFIT_PLACEMENTS).filter(({ unit, width, height }) =>
    [unit, width, height].some((name) =>
      String(environment[name] || "").trim(),
    ),
  ).length;
}

export function resolveAdFitPlacement(placement, environment = process.env) {
  if (environment[ADFIT_FEATURE_FLAG] !== "1") return null;

  const sdkUrl = normalizeAdFitSdkUrl(environment[ADFIT_SDK_VARIABLE]);
  if (!sdkUrl) {
    throw new Error(
      `${ADFIT_SDK_VARIABLE} must be the current Kakao AdFit script URL copied from the dashboard.`,
    );
  }
  if (configuredPlacementCount(environment) === 0) {
    throw new Error(
      "Kakao AdFit is enabled but no placement has a configured unit and dimensions.",
    );
  }

  const variableNames = ADFIT_PLACEMENTS[placement];
  if (!variableNames) {
    throw new Error(`Unknown Kakao AdFit placement: ${placement}`);
  }

  const unit = String(environment[variableNames.unit] || "").trim();
  const widthText = String(environment[variableNames.width] || "").trim();
  const heightText = String(environment[variableNames.height] || "").trim();
  const supplied = [unit, widthText, heightText].filter(Boolean).length;
  if (supplied === 0) return null;

  const dimensions = `${widthText}x${heightText}`;
  if (
    supplied !== 3 ||
    !isValidAdFitUnit(unit) ||
    !SUPPORTED_DIMENSIONS.has(dimensions)
  ) {
    throw new Error(
      `Kakao AdFit placement ${placement} must use a valid DAN unit and one of the console-confirmed sizes: ${[
        ...SUPPORTED_DIMENSIONS,
      ].join(", ")}.`,
    );
  }

  return Object.freeze({
    unit,
    width: Number(widthText),
    height: Number(heightText),
    sdkUrl,
  });
}
