const PARTNER_ID_PATTERN = /^AF\d{5,12}$/;
const SOURCE_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;
const CATEGORY_KEYWORD_PATTERN = /^.{1,64}$/u;
const ID_PATTERN = /^[1-9]\d{0,9}$/;
const LIMIT_PATTERN = /^[1-9]\d{0,2}$/;
const IMAGE_SIZE_PATTERN = /^[1-9]\d{0,3}x[1-9]\d{0,3}$/;
const THEME_PATTERN = /^[a-z]{2,16}$/;
const ROTATION_PATTERN = /^[1-9]\d{0,5}$/;
const DIMENSION_PATTERN = /^[1-9]\d{0,4}$/;

export const COUPANG_CATEGORY_WIDGET_FEATURE_FLAG =
  "COUPANG_CATEGORY_WIDGET_ENABLED";
export const COUPANG_CATEGORY_WIDGET_SRC =
  "https://coupang-partners-banner.vercel.app/widget.js";

function placementVars(prefix) {
  return Object.freeze({
    partnerId: `${prefix}_PARTNER_ID`,
    source: `${prefix}_SOURCE`,
    keyword: `${prefix}_KEYWORD`,
    categoryId: `${prefix}_CATEGORY_ID`,
    brandId: `${prefix}_BRAND_ID`,
    limit: `${prefix}_LIMIT`,
    imageSize: `${prefix}_IMAGE_SIZE`,
    theme: `${prefix}_THEME`,
    rotation: `${prefix}_ROTATION`,
    width: `${prefix}_WIDTH`,
    height: `${prefix}_HEIGHT`,
  });
}

export const COUPANG_CATEGORY_WIDGET_PLACEMENTS = Object.freeze({
  "home-after-lead": placementVars("COUPANG_CATEGORY_WIDGET_HOME_AFTER_LEAD"),
  "home-between-desks": placementVars(
    "COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS",
  ),
  "entertainment-desk": placementVars(
    "COUPANG_CATEGORY_WIDGET_ENTERTAINMENT_DESK",
  ),
  "stocks-desk": placementVars("COUPANG_CATEGORY_WIDGET_STOCKS_DESK"),
  "entertainment-article": placementVars(
    "COUPANG_CATEGORY_WIDGET_ENTERTAINMENT_ARTICLE",
  ),
  "stocks-article": placementVars("COUPANG_CATEGORY_WIDGET_STOCKS_ARTICLE"),
});

const FIELD_VALIDATORS = {
  partnerId: PARTNER_ID_PATTERN,
  source: SOURCE_PATTERN,
  keyword: CATEGORY_KEYWORD_PATTERN,
  categoryId: ID_PATTERN,
  brandId: ID_PATTERN,
  limit: LIMIT_PATTERN,
  imageSize: IMAGE_SIZE_PATTERN,
  theme: THEME_PATTERN,
  rotation: ROTATION_PATTERN,
  width: DIMENSION_PATTERN,
  height: DIMENSION_PATTERN,
};
const FIELD_NAMES = Object.keys(FIELD_VALIDATORS);

function configuredPlacementCount(environment) {
  return Object.values(COUPANG_CATEGORY_WIDGET_PLACEMENTS).filter((vars) =>
    FIELD_NAMES.some((field) => String(environment[vars[field]] || "").trim()),
  ).length;
}

export function resolveCoupangCategoryWidgetPlacement(
  placement,
  environment = process.env,
) {
  if (environment[COUPANG_CATEGORY_WIDGET_FEATURE_FLAG] !== "1") return null;

  if (configuredPlacementCount(environment) === 0) {
    throw new Error(
      "Coupang category widget is enabled but no placement has a configured unit.",
    );
  }

  const variableNames = COUPANG_CATEGORY_WIDGET_PLACEMENTS[placement];
  if (!variableNames) {
    throw new Error(`Unknown Coupang category widget placement: ${placement}`);
  }

  const values = {};
  for (const field of FIELD_NAMES) {
    values[field] = String(environment[variableNames[field]] || "").trim();
  }
  const supplied = FIELD_NAMES.filter((field) => values[field]).length;
  if (supplied === 0) return null;

  const invalid = FIELD_NAMES.some(
    (field) => !FIELD_VALIDATORS[field].test(values[field]),
  );
  if (supplied !== FIELD_NAMES.length || invalid) {
    throw new Error(
      `Coupang category widget placement ${placement} must define all of: ${FIELD_NAMES.join(", ")}, each in a valid shape.`,
    );
  }

  return Object.freeze({
    partnerId: values.partnerId,
    source: values.source,
    keyword: values.keyword,
    categoryId: values.categoryId,
    brandId: values.brandId,
    limit: values.limit,
    imageSize: values.imageSize,
    theme: values.theme,
    rotation: values.rotation,
    width: Number(values.width),
    height: Number(values.height),
  });
}
