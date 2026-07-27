const DEFAULT_SITE_URL = "https://ssundesk.com";

export const SITE_NAME = "썬데스크";
export const SITE_ALTERNATE_NAMES = [
  "SS.Desk",
  "쑨쑨 콘텐츠 데스크",
  "쑨쑨 데스크",
] as const;
export const SITE_LOGO_PATH = "/brand/ssdesk-logo-v1.png";
export const SITE_OG_IMAGE_PATH = "/brand/ssdesk-og-v1.png";
export const HOME_TITLE = `오늘의 연예·주식 이슈 | ${SITE_NAME}`;
export const SITE_DESCRIPTION =
  "연예와 주식, 그리고 쑨쑨배 블로그의 공개 기록을 한곳에서 찾는 썬데스크 콘텐츠 허브";
export const NAVER_BLOG_URL = "https://blog.naver.com/tnsqo1126";

export const TOTAL_PUBLIC_POSTS = 1084;
export const ARCHIVE_PAGE_SIZE = 50;
export const ARCHIVE_PAGE_COUNT = Math.ceil(
  TOTAL_PUBLIC_POSTS / ARCHIVE_PAGE_SIZE,
);

/**
 * 배포 주소는 NEXT_PUBLIC_SITE_URL 하나만 바꾸면 모든 SEO 경로에 반영됩니다.
 * 끝의 슬래시는 제거해 canonical URL이 중복되지 않도록 합니다.
 */
export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  return configuredUrl.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
