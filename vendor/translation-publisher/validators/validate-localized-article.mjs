#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const MIN_BODY_CHARS = 600;
const RIGHTS_BASES = new Set(["owned", "licensed", "open-license", "public-domain", "permission"]);
const STATUSES = new Set(["draft", "reviewed", "stale", "ready"]);
const MODES = new Set(["translation", "source-edition"]);
const LOCALE_RE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/;

function usage() {
  console.error("Usage: node validate-localized-article.mjs <article.json> [--allow-noindex]");
  process.exit(2);
}

function normalize(value) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").normalize("NFC").trim()
    : "";
}

function compactLength(value) {
  return normalize(value).replace(/\s/gu, "").length;
}

function sourceDigest(source) {
  const material = `${normalize(source?.title)}\n\n${normalize(source?.body)}`;
  return `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function sameUrl(left, right) {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const allowNoindex = args.includes("--allow-noindex");
const positional = args.filter((arg) => !arg.startsWith("--"));
if (positional.length !== 1 || args.some((arg) => arg.startsWith("--") && arg !== "--allow-noindex")) usage();

let data;
try {
  data = JSON.parse(readFileSync(positional[0], "utf8"));
} catch (error) {
  console.error(JSON.stringify({ valid: false, errors: [`Unable to read JSON: ${error.message}`] }, null, 2));
  process.exit(1);
}

const errors = [];
const add = (condition, message) => { if (!condition) errors.push(message); };
add(isObject(data), "manifest must be a JSON object");
add(data.schemaVersion === 1, "schemaVersion must be 1");
const mode = data.mode ?? "translation";
add(MODES.has(mode), "mode must be translation or source-edition");
add(typeof data.articleId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(data.articleId), "articleId must be a stable URL-safe identifier");
add(isObject(data.source), "source must be an object");
add(isObject(data.localized), "localized must be an object");

const source = isObject(data.source) ? data.source : {};
const localized = isObject(data.localized) ? data.localized : {};
add(LOCALE_RE.test(source.locale ?? ""), "source.locale must be a valid supported BCP 47 tag");
add(LOCALE_RE.test(localized.locale ?? ""), "localized.locale must be a valid supported BCP 47 tag");
if (mode === "translation") {
  add(source.locale !== localized.locale, "translation mode requires different source and localized locales");
} else if (mode === "source-edition") {
  add(source.locale === localized.locale, "source-edition mode requires matching source and localized locales");
}
add(isHttpsUrl(source.url), "source.url must be an HTTPS URL");
add(isHttpsUrl(localized.url), "localized.url must be an HTTPS URL");
add(compactLength(source.title) >= 8, "source.title must contain at least 8 non-whitespace characters");
add(compactLength(localized.title) >= 8, "localized.title must contain at least 8 non-whitespace characters");
add(compactLength(source.body) >= MIN_BODY_CHARS, `source.body must contain at least ${MIN_BODY_CHARS} non-whitespace characters`);
add(compactLength(localized.body) >= MIN_BODY_CHARS, `localized.body must contain at least ${MIN_BODY_CHARS} non-whitespace characters`);
const descriptionLength = compactLength(localized.description);
add(descriptionLength >= 40 && descriptionLength <= 220, "localized.description must contain 40-220 non-whitespace characters");

const rights = isObject(source.rights) ? source.rights : {};
add(rights.status === "verified", "source.rights.status must be verified");
add(RIGHTS_BASES.has(rights.basis), `source.rights.basis must be one of: ${[...RIGHTS_BASES].join(", ")}`);
add(isHttpsUrl(rights.evidenceUrl), "source.rights.evidenceUrl must be an HTTPS URL");

const expectedHash = sourceDigest(source);
add(data.sourceHash === expectedHash, `sourceHash does not match normalized source content; expected ${expectedHash}`);
add(typeof data.translatedFromSourceHash === "string" && /^sha256:[a-f0-9]{64}$/.test(data.translatedFromSourceHash), "translatedFromSourceHash must be a lowercase SHA-256 value");
add(STATUSES.has(data.status), "status must be draft, reviewed, stale, or ready");
add(data.robots === "index,follow" || data.robots === "noindex,nofollow", "robots must be index,follow or noindex,nofollow");
add(sameUrl(data.canonical, localized.url), "canonical must be the localized page's self URL");
if (isHttpsUrl(localized.url) && LOCALE_RE.test(localized.locale ?? "")) {
  const segment = new URL(localized.url).pathname.split("/").filter(Boolean)[0];
  add(segment === localized.locale.toLowerCase(), "localized.url must begin with the lowercase locale path segment");
}

const combinedSource = `${normalize(source.title)}\n${normalize(source.body)}`;
const combinedLocalized = `${normalize(localized.title)}\n${normalize(localized.description)}\n${normalize(localized.body)}`;
const verification = isObject(data.verification) ? data.verification : {};
add(verification.fullBody === true, "verification.fullBody must be true");

function containsExactToken(fragment, token) {
  const normalizedFragment = normalize(fragment);
  const normalizedToken = normalize(token);
  const escaped = normalizedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/^\p{Number}+(?:[,.]\p{Number}+)*$/u.test(normalizedToken)) {
    return new RegExp(`(?<!\\p{Number})${escaped}(?!\\p{Number})`, "u").test(
      normalizedFragment,
    );
  }
  if (/^[A-Za-z]+$/u.test(normalizedToken)) {
    return new RegExp(`\\b${escaped}\\b`, "i").test(normalizedFragment);
  }
  return normalizedFragment.includes(normalizedToken);
}

function numericTokens(value) {
  return [...normalize(value).matchAll(/\p{Number}+(?:[,.]\p{Number}+)*/gu)].map(
    (match) => match[0],
  );
}

function verifyPairs(field, minimum, requireDigit = false) {
  const items = verification[field];
  add(Array.isArray(items), `verification.${field} must be an array`);
  if (!Array.isArray(items)) return;
  add(items.length >= minimum, `verification.${field} must contain at least ${minimum} verified pair(s)`);
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    const prefix = `verification.${field}[${index}]`;
    add(isObject(item), `${prefix} must be an object`);
    if (!isObject(item)) continue;
    add(typeof item.id === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(item.id), `${prefix}.id must be stable and URL-safe`);
    add(!ids.has(item.id), `${prefix}.id must be unique within ${field}`);
    ids.add(item.id);
    const sourceValue = normalize(item.source);
    const localizedValue = normalize(item.localized);
    add(sourceValue.length > 0 && combinedSource.includes(sourceValue), `${prefix}.source must occur in the source title or body`);
    add(localizedValue.length > 0 && combinedLocalized.includes(localizedValue), `${prefix}.localized must occur in the localized content`);
    add(item.verified === true, `${prefix}.verified must be true`);
    if (requireDigit) {
      add(/\p{Number}/u.test(sourceValue), `${prefix}.source must contain a number`);
      add(Array.isArray(item.values) && item.values.length > 0, `${prefix}.values must contain explicit number mappings`);
      const values = Array.isArray(item.values) ? item.values : [];
      for (const [valueIndex, value] of values.entries()) {
        const valuePrefix = `${prefix}.values[${valueIndex}]`;
        add(isObject(value), `${valuePrefix} must be an object`);
        if (!isObject(value)) continue;
        const sourceToken = normalize(value.sourceToken);
        const localizedToken = normalize(value.localizedToken);
        add(sourceToken.length > 0, `${valuePrefix}.sourceToken must not be empty`);
        add(localizedToken.length > 0, `${valuePrefix}.localizedToken must not be empty`);
        add(
          containsExactToken(sourceValue, sourceToken),
          `${valuePrefix}.sourceToken must occur exactly in the source fragment`,
        );
        add(
          containsExactToken(localizedValue, localizedToken),
          `${valuePrefix}.localizedToken must occur exactly in the localized fragment`,
        );
      }
      for (const token of numericTokens(sourceValue)) {
        add(
          values.some((value) =>
            isObject(value) && containsExactToken(normalize(value.sourceToken), token),
          ),
          `${prefix}.values must cover source numeric token ${token}`,
        );
      }
    }
  }
}

verifyPairs("facts", 1);
verifyPairs("properNames", 1);
const sourceHasNumbers = /\p{Number}/u.test(combinedSource);
verifyPairs("numbers", sourceHasNumbers ? 1 : 0, sourceHasNumbers);

const corrections = data.corrections;
add(Array.isArray(corrections), "corrections must be an array");
if (Array.isArray(corrections)) {
  const correctionIds = new Set();
  for (const [index, correction] of corrections.entries()) {
    const prefix = `corrections[${index}]`;
    add(isObject(correction), `${prefix} must be an object`);
    if (!isObject(correction)) continue;
    add(
      typeof correction.id === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(correction.id),
      `${prefix}.id must be stable and URL-safe`,
    );
    add(!correctionIds.has(correction.id), `${prefix}.id must be unique`);
    correctionIds.add(correction.id);
    const sourceValue = normalize(correction.sourceValue);
    const localizedValue = normalize(correction.localizedValue);
    add(
      sourceValue.length > 0 && combinedSource.includes(sourceValue),
      `${prefix}.sourceValue must occur in the source content`,
    );
    add(
      localizedValue.length > 0 && combinedLocalized.includes(localizedValue),
      `${prefix}.localizedValue must occur in the localized content`,
    );
    add(
      typeof correction.reason === "string" && correction.reason.trim().length > 0,
      `${prefix}.reason must not be empty`,
    );
    add(isHttpsUrl(correction.evidenceUrl), `${prefix}.evidenceUrl must be an HTTPS URL`);
  }
}

const hashesMatch = data.sourceHash === data.translatedFromSourceHash;
if (data.status === "ready") {
  add(hashesMatch, "ready translation must match the current sourceHash");
  add(data.robots === "index,follow", "ready translation must use index,follow");
  const publicCheck = isObject(data.publicVerification) ? data.publicVerification : {};
  add(publicCheck.status === "verified", "ready translation requires verified publicVerification.status");
  add(publicCheck.httpStatus === 200, "ready translation requires publicVerification.httpStatus 200");
  add(isIsoDate(publicCheck.checkedAt), "ready translation requires an ISO UTC publicVerification.checkedAt");
  add(sameUrl(publicCheck.resolvedUrl, localized.url), "publicVerification.resolvedUrl must equal localized.url");
} else {
  add(data.robots === "noindex,nofollow", "non-ready translation must fail closed with noindex,nofollow");
}
if (data.status === "stale") add(!hashesMatch, "stale translation must retain the older translatedFromSourceHash");
if (!hashesMatch && data.status !== "stale") add(false, "hash mismatch requires status stale");

const publishable = errors.length === 0 && data.status === "ready" && data.robots === "index,follow";
const valid = errors.length === 0;
console.log(JSON.stringify({ valid, publishable, articleId: data.articleId ?? null, mode, locale: localized.locale ?? null, sourceHash: expectedHash, errors }, null, 2));
if (!valid || (!publishable && !allowNoindex)) process.exit(1);
