import { posts, type Post, type PostCategory } from "@/lib/posts";

const NAVER_BLOG_HOST = "blog.naver.com";
const NAVER_BLOG_ID = "tnsqo1126";
const MIN_SUMMARY_LENGTH = 120;
const MIN_TAG_COUNT = 3;
const MIN_DETAIL_SECTIONS = 3;
const MIN_VISIBLE_CHARACTERS = 500;
const INDEXABLE_IMAGE_HOSTS = new Set([
  "blogthumb.pstatic.net",
  "phinf.pstatic.net",
]);

export const POST_DETAIL_POLICY = {
  categories: ["entertainment", "stocks"] as const,
  verificationLevel: "rss_verified",
  minSummaryLength: MIN_SUMMARY_LENGTH,
  minTagCount: MIN_TAG_COUNT,
  minDetailSections: MIN_DETAIL_SECTIONS,
  minVisibleCharacters: MIN_VISIBLE_CHARACTERS,
  logNoPattern: /^\d{12}$/,
} as const;

export type PostDetailSection = {
  heading: string;
  body: string;
};

export type PostDetailPost = Post & {
  detailSections: PostDetailSection[];
};

function isEligibleCategory(
  category: PostCategory,
): category is (typeof POST_DETAIL_POLICY.categories)[number] {
  return POST_DETAIL_POLICY.categories.includes(
    category as (typeof POST_DETAIL_POLICY.categories)[number],
  );
}

function isCanonicalNaverPostUrl(post: Post) {
  return post.url === `https://${NAVER_BLOG_HOST}/${NAVER_BLOG_ID}/${post.logNo}`;
}

function isPstaticImage(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      INDEXABLE_IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function parseDetailSections(post: Post): PostDetailSection[] | null {
  const value = (post as Post & { detailSections?: unknown }).detailSections;
  if (
    !Array.isArray(value) ||
    value.length < POST_DETAIL_POLICY.minDetailSections
  ) {
    return null;
  }

  const sections: PostDetailSection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const section = item as Record<string, unknown>;
    if (typeof section.heading !== "string" || typeof section.body !== "string") {
      return null;
    }
    const heading = section.heading.trim();
    const body = section.body.trim();
    if (!heading || !body) return null;
    sections.push({ heading, body });
  }

  return sections;
}

/**
 * 독립 검색 페이지는 RSS로 검증된 최신 연예·주식 글 중 충분한 요약과
 * 대표 이미지, 태그를 갖춘 글만 생성합니다. 얇은 과거 아카이브를 대량
 * 복제하지 않도록 이 함수를 정적 경로·사이트맵·IndexNow의 공통 기준으로 씁니다.
 */
export function isPostDetailIndexable(post: Post): post is PostDetailPost {
  const detailSections = parseDetailSections(post);
  const visibleCharacters =
    post.summary.trim().length +
    (detailSections?.reduce((total, section) => total + section.body.length, 0) ??
      0);

  return Boolean(
    post.searchAllowed === true &&
      isEligibleCategory(post.category) &&
      post.verificationLevel === POST_DETAIL_POLICY.verificationLevel &&
      POST_DETAIL_POLICY.logNoPattern.test(post.logNo) &&
      post.summary.trim().length >= POST_DETAIL_POLICY.minSummaryLength &&
      post.tags.length >= POST_DETAIL_POLICY.minTagCount &&
      detailSections &&
      visibleCharacters >= POST_DETAIL_POLICY.minVisibleCharacters &&
      !Number.isNaN(Date.parse(post.publishedAt)) &&
      isCanonicalNaverPostUrl(post) &&
      isPstaticImage(post.image),
  );
}

export function getIndexablePostDetails() {
  return posts.filter(isPostDetailIndexable);
}

export function getPostDetailByLogNo(logNo: string) {
  return getIndexablePostDetails().find((post) => post.logNo === logNo);
}

export function postDetailPath(post: Post | string) {
  const logNo = typeof post === "string" ? post : post.logNo;
  if (!POST_DETAIL_POLICY.logNoPattern.test(logNo)) {
    throw new Error(`Invalid post detail logNo: ${logNo || "missing"}.`);
  }
  return `/news/${logNo}`;
}

export function getPostDetailDescription(post: Post, maxLength = 158) {
  const summary = post.summary.replace(/\s+/g, " ").trim();
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getPostDetailTags(post: Post) {
  return Array.from(
    new Set(post.tags.map((tag) => tag.trim()).filter(Boolean)),
  ).slice(0, 10);
}

export function getPostDetailSections(post: PostDetailPost) {
  return parseDetailSections(post) ?? [];
}

export function getPostDetailArticleBody(post: PostDetailPost) {
  return [
    post.summary.trim(),
    ...getPostDetailSections(post).map(
      (section) => `${section.heading}\n${section.body}`,
    ),
  ].join("\n\n");
}

export function getPostDetailLastModified(post: PostDetailPost) {
  const publishedTimestamp = Date.parse(post.publishedAt);
  const detailTimestamp = Date.parse(post.detailUpdatedAt || "");
  return new Date(
    Number.isFinite(detailTimestamp)
      ? Math.max(publishedTimestamp, detailTimestamp)
      : publishedTimestamp,
  );
}

export function getPostCategoryPath(post: Post) {
  return post.category === "stocks" ? "/stocks" : "/entertainment";
}

function relatedScore(source: Post, candidate: Post) {
  const sourceTags = new Set(getPostDetailTags(source).map((tag) => tag.toLowerCase()));
  const sharedTags = getPostDetailTags(candidate).filter((tag) =>
    sourceTags.has(tag.toLowerCase()),
  ).length;
  let score = sharedTags * 10;

  if (source.candidate && source.candidate === candidate.candidate) score += 8;
  if (source.work && source.work === candidate.work) score += 8;
  if (source.stockCode && source.stockCode === candidate.stockCode) score += 8;

  return score;
}

export function getRelatedPostDetails(post: PostDetailPost, limit = 3) {
  return getIndexablePostDetails()
    .filter(
      (candidate) =>
        candidate.logNo !== post.logNo && candidate.category === post.category,
    )
    .map((candidate, sourceOrder) => ({
      candidate,
      score: relatedScore(post, candidate),
      sourceOrder,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.sourceOrder - right.sourceOrder;
    })
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
