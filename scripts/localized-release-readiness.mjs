export const SUPPORTED_LOCALES = ["ko", "en", "ja"];

function normalizeVerifiedUrl(value) {
  return typeof value === "string" ? value.replace(/\/+$/, "") : "";
}

export function hasLocalizedReleaseEvidence(article, locale, siteUrl) {
  const localized = article.locales?.[locale];
  const verification = localized?.publicVerification;
  const expectedUrl = `${siteUrl.replace(/\/+$/, "")}/${locale}/news/${localized?.slug || ""}`;
  return Boolean(
    localized?.status === "ready" &&
      localized?.robots === "index,follow" &&
      /^sha256:[a-f0-9]{64}$/.test(article.sourceHash || "") &&
      localized.translatedFromSourceHash === article.sourceHash &&
      verification?.status === "verified" &&
      verification.httpStatus === 200 &&
      verification.checkedAt &&
      normalizeVerifiedUrl(verification.resolvedUrl) ===
        normalizeVerifiedUrl(expectedUrl),
  );
}

export function getLocalizedReleaseCluster(article, siteUrl) {
  return SUPPORTED_LOCALES.filter((locale) =>
    hasLocalizedReleaseEvidence(article, locale, siteUrl),
  );
}

export function isLocalizedLocaleReady(article, locale, siteUrl) {
  return (
    hasLocalizedReleaseEvidence(article, locale, siteUrl) &&
    getLocalizedReleaseCluster(article, siteUrl).length >= 2
  );
}
