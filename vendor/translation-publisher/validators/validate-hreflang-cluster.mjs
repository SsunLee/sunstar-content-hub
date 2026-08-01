#!/usr/bin/env node

import { readFileSync } from "node:fs";

const LOCALE_RE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/;

function usage() {
  console.error("Usage: node validate-hreflang-cluster.mjs <cluster.json>");
  process.exit(2);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function sameUrl(left, right) {
  const a = parseHttps(left);
  const b = parseHttps(right);
  return Boolean(a && b && a.href === b.href);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

if (process.argv.length !== 3) usage();
let data;
try {
  data = JSON.parse(readFileSync(process.argv[2], "utf8"));
} catch (error) {
  console.error(JSON.stringify({ valid: false, errors: [`Unable to read JSON: ${error.message}`] }, null, 2));
  process.exit(1);
}

const errors = [];
const add = (condition, message) => { if (!condition) errors.push(message); };
add(isObject(data), "cluster must be a JSON object");
add(data.schemaVersion === 1, "schemaVersion must be 1");
add(typeof data.clusterId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(data.clusterId), "clusterId must be a stable URL-safe identifier");
add(LOCALE_RE.test(data.xDefaultLocale ?? ""), "xDefaultLocale must be a valid BCP 47 tag");
add(Array.isArray(data.members) && data.members.length >= 2, "members must contain at least two locale pages");

const members = Array.isArray(data.members) ? data.members : [];
const byLocale = new Map();
const urls = new Set();
let origin = null;

for (const [index, member] of members.entries()) {
  const prefix = `members[${index}]`;
  add(isObject(member), `${prefix} must be an object`);
  if (!isObject(member)) continue;
  add(LOCALE_RE.test(member.locale ?? ""), `${prefix}.locale must be a valid BCP 47 tag`);
  add(!byLocale.has(member.locale), `${prefix}.locale must be unique`);
  byLocale.set(member.locale, member);
  const url = parseHttps(member.url);
  add(Boolean(url), `${prefix}.url must be an HTTPS URL`);
  if (url) {
    add(!urls.has(url.href), `${prefix}.url must be unique`);
    urls.add(url.href);
    add(origin === null || origin === url.origin, `${prefix}.url must share the cluster origin`);
    origin ??= url.origin;
    const segment = url.pathname.split("/").filter(Boolean)[0];
    add(segment === String(member.locale).toLowerCase(), `${prefix}.url must begin with the lowercase locale path segment`);
  }
  add(sameUrl(member.canonical, member.url), `${prefix}.canonical must be self-referencing`);
  add(member.robots === "index,follow", `${prefix}.robots must be index,follow`);
  const publicCheck = isObject(member.publicVerification) ? member.publicVerification : {};
  add(publicCheck.status === "verified", `${prefix} requires verified publicVerification.status`);
  add(publicCheck.httpStatus === 200, `${prefix} requires publicVerification.httpStatus 200`);
  add(isIsoDate(publicCheck.checkedAt), `${prefix} requires an ISO UTC publicVerification.checkedAt`);
  add(sameUrl(publicCheck.resolvedUrl, member.url), `${prefix}.publicVerification.resolvedUrl must equal its URL`);
  add(isObject(member.alternates), `${prefix}.alternates must be an object`);
}

add(byLocale.has(data.xDefaultLocale), "xDefaultLocale must identify a cluster member");
const locales = [...byLocale.keys()].sort();
const expectedKeys = [...locales, "x-default"].sort();
const expectedUrls = Object.fromEntries(locales.map((locale) => [locale, byLocale.get(locale)?.url]));
expectedUrls["x-default"] = byLocale.get(data.xDefaultLocale)?.url;

for (const [locale, member] of byLocale) {
  if (!isObject(member.alternates)) continue;
  const actualKeys = Object.keys(member.alternates).sort();
  add(JSON.stringify(actualKeys) === JSON.stringify(expectedKeys), `${locale} alternates must contain exactly every member locale plus x-default`);
  for (const key of expectedKeys) {
    add(sameUrl(member.alternates[key], expectedUrls[key]), `${locale} alternate ${key} must reciprocate the cluster URL map`);
  }
}

const valid = errors.length === 0;
console.log(JSON.stringify({ valid, clusterId: data.clusterId ?? null, locales, xDefaultLocale: data.xDefaultLocale ?? null, errors }, null, 2));
if (!valid) process.exit(1);
