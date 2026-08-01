const INDEXABLE_CATEGORIES = new Set(["entertainment", "stocks"]);
const INDEXABLE_IMAGE_HOSTS = new Set([
  "blogthumb.pstatic.net",
  "phinf.pstatic.net",
]);

function hasIndexableImage(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && INDEXABLE_IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function hasSubstantialDetailContent(post) {
  if (!Array.isArray(post.detailSections) || post.detailSections.length < 3) {
    return false;
  }

  let visibleTextLength = post.summary.trim().length;
  for (const section of post.detailSections) {
    if (
      !section ||
      typeof section.heading !== "string" ||
      !section.heading.trim() ||
      typeof section.body !== "string" ||
      !section.body.trim()
    ) {
      return false;
    }
    visibleTextLength += section.body.trim().length;
  }

  return visibleTextLength >= 500;
}

export function isPostDetailEligible(post) {
  if (!post || typeof post !== "object") return false;
  if (post.searchAllowed !== true) return false;
  if (!INDEXABLE_CATEGORIES.has(post.category)) return false;
  if (post.verificationLevel !== "rss_verified") return false;
  if (!/^\d{12}$/.test(post.logNo || "")) return false;
  if (
    post.url !== `https://blog.naver.com/tnsqo1126/${post.logNo}`
  ) {
    return false;
  }
  if (typeof post.summary !== "string" || post.summary.trim().length < 120) {
    return false;
  }
  if (!hasSubstantialDetailContent(post)) return false;
  if (!Number.isFinite(Date.parse(post.publishedAt || ""))) return false;
  if (!hasIndexableImage(post.image)) return false;
  return Array.isArray(post.tags) && post.tags.length >= 3;
}

export function getEligiblePostDetails(posts) {
  if (!Array.isArray(posts)) {
    throw new TypeError("Post detail eligibility expects a posts array.");
  }

  return posts.filter(isPostDetailEligible);
}

export function postDetailPath(postOrLogNo) {
  const logNo =
    typeof postOrLogNo === "string" ? postOrLogNo : postOrLogNo?.logNo;
  if (!/^\d{12}$/.test(logNo || "")) {
    throw new Error(`Invalid post detail logNo: ${logNo || "missing"}.`);
  }
  return `/news/${logNo}`;
}

export function postDetailLastmod(post) {
  const publishedTimestamp = Date.parse(post?.publishedAt || "");
  const detailTimestamp = Date.parse(post?.detailUpdatedAt || "");
  if (!Number.isFinite(publishedTimestamp)) {
    throw new Error(
      `Post detail ${post?.logNo || "unknown"} has an invalid publishedAt.`,
    );
  }
  return new Date(
    Number.isFinite(detailTimestamp)
      ? Math.max(publishedTimestamp, detailTimestamp)
      : publishedTimestamp,
  ).toISOString();
}
