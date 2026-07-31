import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const BLOG_ID = process.env.NAVER_BLOG_ID || "tnsqo1126";
const BLOG_BASE = `https://blog.naver.com/${BLOG_ID}`;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRoot =
  process.env.NAVER_CANONICAL_ROOT ||
  path.resolve(projectRoot, "..", "articles");
const dataPath = path.join(projectRoot, "data", "posts.json");
const publicPath = path.join(projectRoot, "public", "posts.json");

const categoryLabels = {
  entertainment: "연예",
  stocks: "주식",
  archive: "기록",
};
const stockTitleKeyword =
  /(?:^|[^가-힣A-Za-z0-9])(?:코스피|코스닥|주가|실적|공시|배당|급등|증시)(?=$|[^가-힣A-Za-z0-9])/;

function decodeEntities(value = "") {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
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
        "user-agent": "SunstarContentHub/1.0 (+https://blog.naver.com/tnsqo1126)",
        accept: "application/json,text/xml,text/plain,*/*",
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

  posts.push({
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
  });
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
      ? new Date().toISOString()
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
      changed,
      removed: removedCount,
    },
    null,
    2,
  ),
);
