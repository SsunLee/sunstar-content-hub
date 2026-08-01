import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const BLOG_ID = process.env.NAVER_BLOG_ID || "tnsqo1126";
const BLOG_BASE = `https://blog.naver.com/${BLOG_ID}`;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRoot =
  process.env.NAVER_CANONICAL_ROOT ||
  path.resolve(projectRoot, "..", "articles");
const dataPath = path.join(projectRoot, "data", "posts.json");
const publicPath = path.join(projectRoot, "public", "posts.json");
const syncStartedAt = new Date().toISOString();
const INDEXABLE_IMAGE_HOSTS = new Set([
  "blogthumb.pstatic.net",
  "phinf.pstatic.net",
]);
const DETAIL_REFRESH_COUNT = 5;
const DETAIL_FETCH_CONCURRENCY = 4;
const DETAIL_EXTRACTION_VERSION = 3;
const MIN_DETAIL_SECTIONS = 3;
const MIN_DETAIL_VISIBLE_CHARACTERS = 500;

const categoryLabels = {
  entertainment: "연예",
  stocks: "주식",
  archive: "기록",
};
const stockTitleKeyword =
  /(?:^|[^가-힣A-Za-z0-9])(?:코스피|코스닥|주가|실적|공시|배당|급등|증시)(?=$|[^가-힣A-Za-z0-9])/;

function decodeEntities(value = "") {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&middot;", "·")
    .replaceAll("&ndash;", "–")
    .replaceAll("&mdash;", "—")
    .replaceAll("&lsquo;", "‘")
    .replaceAll("&rsquo;", "’")
    .replaceAll("&ldquo;", "“")
    .replaceAll("&rdquo;", "”")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function normalizeComparableText(value = "") {
  return normalizeTitle(value)
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPostViewMarkup(value = "") {
  return normalizeComparableText(
    decodeEntities(
      value
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<!--[^]*?-->/g, "")
        .replace(/<[^>]+>/g, ""),
    ),
  );
}

function isDetailNoise(value = "") {
  const text = normalizeComparableText(value);
  return (
    !text ||
    /^(?:사진|이미지|영상)\s*출처\s*:/i.test(text) ||
    /^(?:출처|자료)\s*:/i.test(text) ||
    /^(?:차트 원자료|누계 실적|시장 데이터|주주환원 공시)\s*:/i.test(text) ||
    /^(?:시세 확인|시장 비교|(?:\d{1,2}시대\s*)?거래량 확인)\s*:/i.test(text) ||
    /^[+\-−]?\s*\d[\d,.]*(?:\s*(?:조|억|만|천))?\s*(?:원|주|명|건|%|%p|배)?\s*[▲▼△▽]?$/i.test(
      text,
    ) ||
    /[▲▼△▽]/.test(text) ||
    /^https?:\/\//i.test(text) ||
    /^(?:#\S+\s*)+$/.test(text) ||
    /^(?:이 글은|본 포스팅은).*?(?:광고|협찬|제공)/i.test(text)
  );
}

function readMetaContent(html, attributeName, attributeValue) {
  const attributePattern = /([:\w-]+)\s*=\s*(["'])([^"']*)\2/g;
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = Object.fromEntries(
      Array.from(tag.matchAll(attributePattern), (match) => [
        match[1].toLocaleLowerCase("en-US"),
        decodeEntities(match[3]),
      ]),
    );
    if (
      attributes[attributeName.toLocaleLowerCase("en-US")] === attributeValue
    ) {
      return attributes.content || "";
    }
  }
  return "";
}

function validatePostViewIdentity(html, post) {
  const ogUrl = readMetaContent(html, "property", "og:url");
  const ogTitle = readMetaContent(html, "property", "og:title");
  const robots = readMetaContent(html, "name", "robots");
  if (ogUrl !== post.url) {
    throw new Error(
      `PostView URL mismatch for ${post.logNo}: ${ogUrl || "missing og:url"}.`,
    );
  }
  if (normalizeComparableText(ogTitle) !== normalizeComparableText(post.title)) {
    throw new Error(`PostView title mismatch for ${post.logNo}.`);
  }
  if (/\bnoindex\b/i.test(robots)) {
    throw new Error(`PostView is noindex for ${post.logNo}.`);
  }
}

function isLikelySectionHeading(value = "") {
  const text = normalizeComparableText(value);
  return (
    text.length >= 2 &&
    text.length <= 55 &&
    !isDetailNoise(text) &&
    !/[.!?。！？…]$/.test(text) &&
    !/(?:습니다|했습니다|됩니다|입니다|했어요|해요|이다|였다)$/.test(text)
  );
}

function isSameExcerpt(left = "", right = "") {
  const normalizedLeft = normalizeComparableText(left);
  const normalizedRight = normalizeComparableText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  const sampleLength = Math.min(90, normalizedLeft.length, normalizedRight.length);
  if (sampleLength < 45) return false;
  return (
    normalizedLeft.slice(0, sampleLength) ===
    normalizedRight.slice(0, sampleLength)
  );
}

function clipDetailBody(value = "", max = 320) {
  const text = normalizeComparableText(value);
  if (text.length <= max) return text;

  const clipped = text.slice(0, max);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("다."),
    clipped.lastIndexOf("요."),
  );
  if (sentenceEnd >= max * 0.55) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }
  return `${clipped.trim()}…`;
}

function extractDetailSections(html, post) {
  const paragraphs = Array.from(
    html.matchAll(
      /<p\b[^>]*class=["'][^"']*\bse-text-paragraph\b[^"']*["'][^>]*>([^]*?)<\/p>/gi,
    ),
    (match) => stripPostViewMarkup(match[1]),
  ).filter((paragraph) => !isDetailNoise(paragraph));

  const content = paragraphs.filter(
    (paragraph) =>
      !isSameExcerpt(paragraph, post.title) &&
      !isSameExcerpt(paragraph, post.summary),
  );
  const sections = [];
  const seenHeadings = new Set();
  const seenBodies = new Set();

  for (let index = 0; index < content.length - 1; index += 1) {
    const heading = content[index];
    const body = content[index + 1];
    if (!isLikelySectionHeading(heading) || body.length < 80) continue;

    const clippedBody = clipDetailBody(body);
    const headingKey = heading.toLocaleLowerCase("ko-KR");
    const bodyKey = clippedBody.slice(0, 120).toLocaleLowerCase("ko-KR");
    if (seenHeadings.has(headingKey) || seenBodies.has(bodyKey)) continue;

    seenHeadings.add(headingKey);
    seenBodies.add(bodyKey);
    sections.push({ heading, body: clippedBody });
    index += 1;
  }

  return sections.slice(0, 6);
}

function hasStrongDetailSections(post, sections = post.detailSections) {
  if (!Array.isArray(sections) || sections.length < MIN_DETAIL_SECTIONS) {
    return false;
  }
  const visibleCharacters =
    normalizeComparableText(post.summary).length +
    sections.reduce(
      (total, section) =>
        total + normalizeComparableText(section?.body || "").length,
      0,
    );
  return visibleCharacters >= MIN_DETAIL_VISIBLE_CHARACTERS;
}

function detailContentHash(post) {
  const visibleDetail = {
    title: post.title,
    summary: post.summary,
    image: post.image,
    publishedAt: post.publishedAt,
    category: post.category,
    categoryLabel: post.categoryLabel,
    tags: post.tags,
    candidate: post.candidate,
    work: post.work,
    role: post.role,
    stockCode: post.stockCode,
    detailSections: post.detailSections,
  };
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(visibleDetail))
    .digest("hex")}`;
}

function hasIndexableImage(value = "") {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && INDEXABLE_IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function isDetailBaseCandidate(post) {
  return Boolean(
    post.searchAllowed === true &&
      ["entertainment", "stocks"].includes(post.category) &&
      post.verificationLevel === "rss_verified" &&
      /^\d{12}$/.test(post.logNo) &&
      post.url === `${BLOG_BASE}/${post.logNo}` &&
      normalizeComparableText(post.summary).length >= 120 &&
      Array.isArray(post.tags) &&
      post.tags.length >= 3 &&
      hasIndexableImage(post.image),
  );
}

async function mapWithConcurrency(items, concurrency, operation) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(items.length, 1)) },
      () => worker(),
    ),
  );
  return results;
}

function postViewUrls(logNo) {
  const search = new URLSearchParams({
    blogId: BLOG_ID,
    logNo,
    redirect: "Dlog",
    widgetTypeCall: "true",
    noTrackingCode: "true",
    directAccess: "false",
  }).toString();
  return [
    `https://m.blog.naver.com/PostView.naver?${search}`,
    `https://blog.naver.com/PostView.naver?${search}`,
  ];
}

async function fetchDetailSections(post) {
  let lastError;
  for (const url of postViewUrls(post.logNo)) {
    try {
      const html = await fetchText(url, 3);
      validatePostViewIdentity(html, post);
      const sections = extractDetailSections(html, post);
      if (hasStrongDetailSections(post, sections)) return sections;
      lastError = new Error(
        `PostView detail gate failed for ${post.logNo}: ${sections.length} sections.`,
      );
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`PostView detail fetch failed for ${post.logNo}.`);
}

function decodeTitle(value = "") {
  try {
    return decodeEntities(decodeURIComponent(value.replaceAll("+", " ")))
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return decodeEntities(value.replaceAll("+", " "))
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }
}

function normalizeTitle(value = "") {
  return decodeEntities(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkup(value = "") {
  return decodeEntities(
    value
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function clipSummary(value = "", max = 210) {
  const cleaned = stripMarkup(value)
    .split(/사진\s*출처\s*:/)[0]
    .replace(/https?:\/\/\S+/g, "")
    .trim();
  if (cleaned.length <= max) return cleaned;
  const clipped = cleaned.slice(0, max);
  const sentence = clipped.lastIndexOf(".");
  return `${(sentence > max * 0.55 ? clipped.slice(0, sentence + 1) : clipped).trim()}…`;
}

function parseAbsoluteDate(value = "") {
  const match = value.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00+09:00`;
}

function formatDateLabel(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function pickTag(block, tag) {
  const cdata = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
  );
  if (cdata) return cdata[1].trim();
  const plain = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return plain ? plain[1].trim() : "";
}

function parseRss(xml) {
  const items = new Map();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const guid = pickTag(block, "guid");
    const logNo = guid.match(/\/(\d+)(?:\?|$)/)?.[1];
    if (!logNo) continue;
    const description = pickTag(block, "description");
    const image = description.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || "";
    const tagText = pickTag(block, "tag");
    items.set(logNo, {
      title: normalizeTitle(pickTag(block, "title")),
      summary: clipSummary(description),
      image: decodeEntities(image).replace(/^http:/, "https:"),
      publishedAt: new Date(pickTag(block, "pubDate")).toISOString(),
      sourceCategory: normalizeTitle(pickTag(block, "category")),
      tags: tagText
        .split(",")
        .map((tag) => normalizeTitle(tag))
        .filter(Boolean)
        .slice(0, 8),
    });
  }
  return items;
}

async function listMarkdownFiles(root) {
  try {
    await access(root);
  } catch {
    return [];
  }
  const results = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          !["work-cache", "paste-ready", "assets", "_workspace"].includes(
            entry.name,
          )
        ) {
          await walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  }
  await walk(root);
  return results;
}

function localSummary(markdown) {
  const body = markdown.replace(/^---[\s\S]*?---\s*/m, "");
  const paragraphs = body
    .split(/\r?\n\r?\n/)
    .map((paragraph) =>
      paragraph
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/^#{1,6}\s+.*$/gm, "")
        .replace(/^!\[[^\]]*]\([^)]*\)\s*$/gm, "")
        .replace(/^\s*사진\s*출처\s*:.*$/gm, "")
        .replace(/^\s*출처\s*:.*$/gm, "")
        .replace(/^\s*#\S+(?:\s+#\S+)*\s*$/gm, "")
        .replace(/^\s*>\s*/gm, "")
        .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((paragraph) => paragraph.length >= 45);
  return clipSummary(paragraphs.slice(0, 2).join(" "), 230);
}

async function readLocalCanonicals() {
  const byTitle = new Map();
  for (const filePath of await listMarkdownFiles(canonicalRoot)) {
    const name = path.basename(filePath).toLowerCase();
    if (
      name === "guidelines.md" ||
      name.includes("run-report") ||
      name.endsWith("-body.md") ||
      name.startsWith("readme")
    ) {
      continue;
    }
    const markdown = await readFile(filePath, "utf8");
    const title = markdown.match(/^# (?!#)(.+)$/m)?.[1]?.trim();
    if (!title) continue;
    const normalized = normalizeTitle(title);
    const relative = path.relative(canonicalRoot, filePath).replaceAll("\\", "/");
    let category = relative.startsWith("celebrity-updates/")
      ? "entertainment"
      : relative.startsWith("mac-guides/") || relative.startsWith("docs/")
        ? "archive"
        : "stocks";
    if (/넷플릭스|영화|드라마|배우|연예|모아나|워터밤/i.test(title)) {
      category = "entertainment";
    }
    const candidate =
      markdown.match(/^(?:candidate|actor):\s*["']?(.+?)["']?\s*$/m)?.[1] || "";
    const work =
      markdown.match(/^work_title:\s*["']?(.+?)["']?\s*$/m)?.[1] || "";
    const role = markdown.match(/^role:\s*["']?(.+?)["']?\s*$/m)?.[1] || "";
    const code =
      markdown.match(/^(?:stock_code|code):\s*["']?(\d{6})["']?\s*$/m)?.[1] ||
      title.match(/\b(\d{6})\b/)?.[1] ||
      "";
    byTitle.set(normalized, {
      category,
      summary: localSummary(markdown),
      candidate: normalizeTitle(candidate),
      work: normalizeTitle(work),
      role: normalizeTitle(role),
      code,
      canonicalSource: relative,
    });
  }
  return byTitle;
}

async function fetchText(url, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "SunstarContentHub/1.0 (+https://ssundesk.com)",
        accept: "text/html,application/json,text/xml,text/plain,*/*",
      },
    });
    if (response.ok) return response.text();

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maxAttempts) {
      throw new Error(`Fetch failed: ${response.status} ${url}`);
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1_000, 30_000)
      : Math.min(1_000 * 2 ** (attempt - 1), 8_000);
    await delay(waitMs);
  }

  throw new Error(`Fetch failed after retries: ${url}`);
}

async function fetchPublicIndex() {
  const records = new Map();
  let expected = Number.POSITIVE_INFINITY;
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL("https://blog.naver.com/PostTitleListAsync.naver");
    url.search = new URLSearchParams({
      blogId: BLOG_ID,
      viewdate: "",
      currentPage: String(page),
      categoryNo: "",
      parentCategoryNo: "",
      countPerPage: "30",
    }).toString();
    // Naver's response is JSON-shaped, but pagingHtml contains JavaScript-style
    // escaped single quotes (\') that JSON.parse rejects. A raw apostrophe is
    // valid inside the surrounding JSON double-quoted string.
    const rawPayload = await fetchText(url);
    const payload = JSON.parse(rawPayload.replaceAll("\\'", "'"));
    expected = Number(payload.totalCount || expected);
    let added = 0;
    for (const post of payload.postList || []) {
      if (!records.has(post.logNo)) added += 1;
      records.set(post.logNo, post);
    }
    if (records.size >= expected || !payload.postList?.length || added === 0) break;
    await delay(150);
  }
  return { records, expected };
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(dataPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeAtomic(filePath, contents) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, contents, "utf8");
  await rename(temporaryPath, filePath);
}

export {
  extractDetailSections,
  hasStrongDetailSections,
  validatePostViewIdentity,
};

async function main() {
const [rssXml, localByTitle, publicIndex, existingIndex] = await Promise.all([
  fetchText(`https://rss.blog.naver.com/${BLOG_ID}.xml`),
  readLocalCanonicals(),
  fetchPublicIndex(),
  loadExisting(),
]);

const rssByLogNo = parseRss(rssXml);
const existing = new Map(
  (existingIndex?.posts || []).map((post) => [post.logNo, post]),
);

if (!Number.isFinite(publicIndex.expected) || publicIndex.expected <= 0) {
  throw new Error("Naver public index returned an invalid total count.");
}
if (publicIndex.records.size !== publicIndex.expected) {
  throw new Error(
    `Naver public index was incomplete: ${publicIndex.records.size}/${publicIndex.expected}.`,
  );
}

const removedCount = [...existing.keys()].filter(
  (logNo) => !publicIndex.records.has(logNo),
).length;
if (removedCount > 0 && process.env.ALLOW_REMOVALS !== "1") {
  throw new Error(
    `Refusing to remove ${removedCount} posts in one sync. ` +
      "Set ALLOW_REMOVALS=1 only after verifying the Naver index.",
  );
}

const posts = [];

for (const source of publicIndex.records.values()) {
  const logNo = String(source.logNo);
  const title = decodeTitle(source.title);
  const local = localByTitle.get(normalizeTitle(title));
  const rss = rssByLogNo.get(logNo);
  const previous = existing.get(logNo);

  const sourceCategoryNo = String(source.categoryNo || "");
  const sourceCategory =
    sourceCategoryNo === "110"
      ? "entertainment"
      : sourceCategoryNo === "109"
        ? "stocks"
        : "archive";
  let category =
    local?.category ||
    (previous?.sourceCategoryNo === sourceCategoryNo
      ? previous.category
      : sourceCategory);

  if (local?.code || stockTitleKeyword.test(title)) {
    category = "stocks";
  }

  const publishedAt =
    rss?.publishedAt ||
    previous?.publishedAt ||
    parseAbsoluteDate(source.addDate) ||
    "";
  const summary =
    rss?.summary || previous?.summary || local?.summary || "";
  const tags = Array.from(
    new Set(
      [
        ...(rss?.tags || previous?.tags || []),
        local?.candidate,
        local?.work,
        local?.role,
        local?.code,
        ...(rss ? previous?.tags || [] : []),
      ].filter(Boolean),
    ),
  ).slice(0, 8);

  const post = {
    id: `naver:${BLOG_ID}:${logNo}`,
    logNo,
    title,
    url: `${BLOG_BASE}/${logNo}`,
    publishedAt,
    dateLabel:
      formatDateLabel(publishedAt) || source.addDate || previous?.dateLabel || "",
    category,
    categoryLabel: categoryLabels[category],
    sourceCategoryNo,
    summary,
    image: rss?.image || previous?.image || "",
    tags,
    candidate: local?.candidate || previous?.candidate || "",
    work: local?.work || previous?.work || "",
    role: local?.role || previous?.role || "",
    stockCode: local?.code || previous?.stockCode || "",
    searchAllowed: String(source.searchYn).toLowerCase() === "true",
    verificationLevel: rss
      ? "rss_verified"
      : previous?.verificationLevel === "rss_verified"
        ? "rss_verified"
        : local
          ? "canonical_public"
          : previous?.verificationLevel || "public_index_confirmed",
  };

  if (Array.isArray(previous?.detailSections)) {
    post.detailSections = previous.detailSections;
    post.detailUpdatedAt =
      previous.detailUpdatedAt || existingIndex?.generatedAt || publishedAt;
    post.detailExtractionVersion = previous.detailExtractionVersion;
    post.detailContentHash = previous.detailContentHash;
  }
  posts.push(post);
}

const detailCandidates = posts.filter(isDetailBaseCandidate);
const refreshLogNos = new Set(
  detailCandidates
    .toSorted((left, right) => {
      const timeDifference =
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
      return timeDifference || Number(right.logNo) - Number(left.logNo);
    })
    .slice(0, DETAIL_REFRESH_COUNT)
    .map((post) => post.logNo),
);
const detailHydrationTargets = detailCandidates.filter(
  (post) =>
    refreshLogNos.has(post.logNo) ||
    !hasStrongDetailSections(post) ||
    post.detailExtractionVersion !== DETAIL_EXTRACTION_VERSION,
);
let detailFetchFailures = 0;

await mapWithConcurrency(
  detailHydrationTargets,
  DETAIL_FETCH_CONCURRENCY,
  async (post) => {
    try {
      const sections = await fetchDetailSections(post);
      if (JSON.stringify(sections) !== JSON.stringify(post.detailSections || [])) {
        post.detailSections = sections;
        post.detailUpdatedAt = syncStartedAt;
      }
      post.detailExtractionVersion = DETAIL_EXTRACTION_VERSION;
    } catch (error) {
      detailFetchFailures += 1;
      console.warn(
        `[detail] ${post.logNo}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);

for (const post of detailCandidates) {
  if (!hasStrongDetailSections(post)) continue;
  const currentHash = detailContentHash(post);
  const previousHash = existing.get(post.logNo)?.detailContentHash;
  if (!previousHash || previousHash !== currentHash) {
    post.detailUpdatedAt = syncStartedAt;
  }
  post.detailContentHash = currentHash;
}

posts.sort((a, b) => {
  const aTime = Date.parse(a.publishedAt);
  const bTime = Date.parse(b.publishedAt);
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  return Number(b.logNo) - Number(a.logNo);
});

const counts = Object.fromEntries(
  Object.keys(categoryLabels).map((category) => [
    category,
    posts.filter((post) => post.category === category).length,
  ]),
);

const snapshot = {
  blog: {
    id: BLOG_ID,
    title: "쑨쑨배 블로그",
    url: BLOG_BASE,
  },
  expectedPublicCount: publicIndex.expected,
  total: posts.length,
  counts,
  posts,
};

const previousSnapshot = existingIndex
  ? {
      blog: existingIndex.blog,
      expectedPublicCount: existingIndex.expectedPublicCount,
      total: existingIndex.total,
      counts: existingIndex.counts,
      posts: existingIndex.posts,
    }
  : null;
const changed = JSON.stringify(snapshot) !== JSON.stringify(previousSnapshot);
const output = {
  blog: snapshot.blog,
  generatedAt:
    changed || !existingIndex?.generatedAt
      ? syncStartedAt
      : existingIndex.generatedAt,
  expectedPublicCount: snapshot.expectedPublicCount,
  total: snapshot.total,
  counts: snapshot.counts,
  posts: snapshot.posts,
};

await Promise.all([
  mkdir(path.dirname(dataPath), { recursive: true }),
  mkdir(path.dirname(publicPath), { recursive: true }),
]);
const serialized = `${JSON.stringify(output, null, 2)}\n`;
await Promise.all([
  writeAtomic(dataPath, serialized),
  writeAtomic(publicPath, serialized),
]);

console.log(
  JSON.stringify(
    {
      total: output.total,
      expected: output.expectedPublicCount,
      counts: output.counts,
      rssEnriched: posts.filter((post) => post.verificationLevel === "rss_verified")
        .length,
      canonicalEnriched: posts.filter(
        (post) => post.verificationLevel === "canonical_public",
      ).length,
      detailCandidates: detailCandidates.length,
      detailReady: posts.filter(
        (post) => isDetailBaseCandidate(post) && hasStrongDetailSections(post),
      ).length,
      detailFetched: detailHydrationTargets.length,
      detailFetchFailures,
      changed,
      removed: removedCount,
    },
    null,
    2,
  ),
);
}

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedModuleUrl) {
  await main();
}
