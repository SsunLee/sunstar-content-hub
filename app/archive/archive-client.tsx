import Link from "next/link";

import {
  isPostDetailIndexable,
  postDetailPath,
} from "@/lib/post-detail";
import type { Post } from "@/lib/posts";

export const POSTS_PER_PAGE = 50;

export type ArchivePost = {
  id: string;
  logNo: string;
  title: string;
  url: string;
  publishedAt: string;
  dateLabel: string;
  category: string;
  categoryLabel: string;
  summary: string;
  image: string;
  tags: string[];
  candidate?: string;
  work?: string;
  role?: string;
  stockCode?: string;
  sourceCategoryNo: string;
  searchAllowed: boolean;
  verificationLevel: string;
  detailSections?: Array<{ heading: string; body: string }>;
  detailUpdatedAt?: string;
  detailExtractionVersion?: number;
  detailContentHash?: string;
};

export type ArchiveData = {
  generatedAt: string;
  total: number;
  counts: Record<string, number>;
  posts: ArchivePost[];
};

export type ArchiveView = {
  posts: ArchivePost[];
  query: string;
  category: string;
  requestedPage: number;
  currentPage: number;
  totalResults: number;
  totalPages: number;
  startIndex: number;
  categoryCounts: Record<string, number>;
};

type ArchiveClientProps = ArchiveView;

const categoryOptions = [
  { value: "all", label: "전체" },
  { value: "entertainment", label: "연예" },
  { value: "stocks", label: "주식" },
  { value: "archive", label: "기록" },
] as const;

function normalized(value = "") {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

function safeCategory(category = "") {
  return categoryOptions.some((option) => option.value === category) ? category : "all";
}

export function readSearchParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  const resolved = Array.isArray(value) ? value[0] : value;
  return (resolved || fallback).trim();
}

export function prepareArchive(
  allPosts: ArchivePost[],
  rawQuery: string,
  rawCategory: string,
  rawPage: number,
): ArchiveView {
  const query = rawQuery.trim();
  const category = safeCategory(rawCategory);
  const queryTokens = normalized(query).split(" ").filter(Boolean);

  const filtered = allPosts.filter((post) => {
    if (category !== "all" && post.category !== category) return false;
    if (queryTokens.length === 0) return true;

    const haystack = normalized(
      [
        post.title,
        post.summary,
        post.categoryLabel,
        post.dateLabel,
        post.candidate,
        post.work,
        post.role,
        post.stockCode,
        ...(post.tags || []),
      ]
        .filter(Boolean)
        .join(" "),
    );

    return queryTokens.every((token) => haystack.includes(token));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const requestedPage = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const categoryCounts = allPosts.reduce<Record<string, number>>(
    (counts, post) => {
      counts[post.category] = (counts[post.category] || 0) + 1;
      return counts;
    },
    { entertainment: 0, stocks: 0, archive: 0 },
  );

  return {
    posts: filtered.slice(startIndex, startIndex + POSTS_PER_PAGE),
    query,
    category,
    requestedPage,
    currentPage,
    totalResults: filtered.length,
    totalPages,
    startIndex,
    categoryCounts,
  };
}

function archiveHref(page: number, query: string, category: string) {
  const pathname = page <= 1 ? "/archive" : `/archive/page/${page}`;
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (category !== "all") search.set("category", category);
  const suffix = search.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const ordered = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  ordered.forEach((page, index) => {
    if (index > 0 && page - ordered[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

function cleanNaverUrl(post: ArchivePost) {
  return post.logNo
    ? `https://blog.naver.com/tnsqo1126/${encodeURIComponent(post.logNo)}`
    : post.url;
}

function archiveDetailPath(post: ArchivePost) {
  return isPostDetailIndexable(post as Post) ? postDetailPath(post.logNo) : null;
}

function categoryTone(category: string) {
  if (category === "entertainment") {
    return "border-[#6750a4]/30 bg-[#6750a4]/10 text-[#50398f]";
  }
  if (category === "stocks") {
    return "border-[#0f7354]/30 bg-[#0f7354]/10 text-[#075f45]";
  }
  return "border-black/15 bg-black/[0.04] text-black/60";
}

export default function ArchiveClient({
  posts,
  query,
  category,
  currentPage,
  totalResults,
  totalPages,
  startIndex,
  categoryCounts,
}: ArchiveClientProps) {
  const firstResult = totalResults === 0 ? 0 : startIndex + 1;
  const lastResult = Math.min(startIndex + posts.length, totalResults);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-10 text-[#171714] sm:px-8 lg:px-12 lg:pt-16">
      <header className="grid gap-8 border-b border-black/80 pb-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
        <div>
          <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">
            Complete story index · 2013—Now
          </p>
          <h1 className="max-w-4xl text-balance font-serif text-[clamp(2.65rem,7vw,6.4rem)] font-medium leading-[0.92] tracking-[-0.055em]">
            모든 글을
            <br />
            한곳에서 찾습니다.
          </h1>
        </div>
        <div className="border-l-2 border-[#6750a4] pl-5 text-sm leading-6 text-black/65">
          <strong className="block font-serif text-4xl font-medium tracking-[-0.04em] text-black">
            {new Intl.NumberFormat("ko-KR").format(
              Object.values(categoryCounts).reduce((sum, count) => sum + count, 0),
            )}
          </strong>
          공개된 네이버 블로그 글을 제목, 배우·작품, 종목명과 코드로 탐색할 수 있습니다.
        </div>
      </header>

      <section aria-labelledby="archive-search-heading" className="border-b border-black/20 py-7">
        <h2 id="archive-search-heading" className="sr-only">
          글 검색 및 분류
        </h2>
        <form
          action="/archive"
          method="get"
          data-analytics-event="archive_search_submitted"
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]"
        >
          <label className="group relative block">
            <span className="sr-only">검색어</span>
            <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-black/45">
              ⌕
            </span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="배우, 작품, 종목명, 제목 검색"
              className="h-14 w-full rounded-none border border-black/25 bg-white/55 pl-11 pr-4 text-base outline-none transition placeholder:text-black/35 focus:border-black focus:bg-white focus:ring-2 focus:ring-[#6750a4]/25"
            />
          </label>
          <label>
            <span className="sr-only">분류</span>
            <select
              name="category"
              defaultValue={category}
              className="h-14 w-full rounded-none border border-black/25 bg-white/55 px-4 text-base outline-none focus:border-black focus:bg-white focus:ring-2 focus:ring-[#6750a4]/25"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.value === "all"
                    ? ""
                    : ` · ${new Intl.NumberFormat("ko-KR").format(categoryCounts[option.value] || 0)}`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-14 border border-black bg-black px-7 text-sm font-semibold tracking-[-0.01em] text-white transition hover:bg-[#6750a4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            찾아보기
          </button>
        </form>

        <nav aria-label="글 분류 바로가기" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {categoryOptions.map((option) => {
            const active = category === option.value;
            return (
              <a
                key={option.value}
                href={archiveHref(1, query, option.value)}
                aria-current={active ? "page" : undefined}
                className={`border-b py-1 transition ${
                  active
                    ? "border-black font-semibold text-black"
                    : "border-transparent text-black/50 hover:border-black/40 hover:text-black"
                }`}
              >
                {option.label}
              </a>
            );
          })}
          {(query || category !== "all") && (
            <Link href="/archive" className="ml-auto py-1 text-black/45 underline underline-offset-4 hover:text-black">
              조건 지우기
            </Link>
          )}
        </nav>
      </section>

      <section aria-labelledby="archive-results-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/80 pb-4 pt-10">
          <div>
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-black/45">
              Search results
            </p>
            <h2 id="archive-results-heading" className="font-serif text-3xl font-medium tracking-[-0.035em]">
              {query ? `‘${query}’ 검색 결과` : categoryOptions.find((option) => option.value === category)?.label + " 글"}
            </h2>
          </div>
          <p className="text-sm tabular-nums text-black/55" aria-live="polite">
            총 {new Intl.NumberFormat("ko-KR").format(totalResults)}건 · {firstResult}–{lastResult}
          </p>
        </div>

        {posts.length > 0 ? (
          <ol start={startIndex + 1}>
            {posts.map((post, index) => {
              const detailPath = archiveDetailPath(post);
              return (
                <li
                key={post.id}
                className="group grid gap-3 border-b border-black/15 py-6 transition-colors hover:bg-white/45 sm:grid-cols-[3.5rem_minmax(0,1fr)_1.5rem] sm:px-2"
              >
                <span className="pt-1 font-mono text-xs tabular-nums text-black/35" aria-hidden="true">
                  {String(startIndex + index + 1).padStart(4, "0")}
                </span>
                <article>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`border px-2 py-1 font-semibold ${categoryTone(post.category)}`}>
                      {post.categoryLabel || "기록"}
                    </span>
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt} className="text-black/45">
                        {post.dateLabel || post.publishedAt.slice(0, 10)}
                      </time>
                    ) : (
                      <span className="text-black/45">{post.dateLabel}</span>
                    )}
                    {post.stockCode && <span className="font-mono text-black/45">{post.stockCode}</span>}
                  </div>
                  <h3 className="max-w-4xl text-balance font-serif text-[1.4rem] font-medium leading-snug tracking-[-0.025em] sm:text-[1.65rem]">
                    <a
                      href={detailPath || cleanNaverUrl(post)}
                      target={detailPath ? undefined : "_blank"}
                      rel={detailPath ? undefined : "noopener noreferrer"}
                      data-analytics-event={detailPath ? "article_detail_opened" : "article_outbound_clicked"}
                      data-analytics-article-id={post.logNo}
                      data-analytics-category={post.category}
                      className="decoration-1 underline-offset-4 outline-none group-hover:underline focus-visible:underline"
                    >
                      {post.title}
                    </a>
                  </h3>
                  {post.summary && (
                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-black/60">
                      {post.summary}
                    </p>
                  )}
                  {detailPath && (
                    <a
                      href={cleanNaverUrl(post)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-analytics-event="article_outbound_clicked"
                      data-analytics-article-id={post.logNo}
                      data-analytics-category={post.category}
                      className="mt-3 inline-block text-xs font-semibold text-black/50 underline decoration-black/25 underline-offset-4 hover:text-black"
                    >
                      네이버 원문 ↗
                    </a>
                  )}
                  {post.tags?.length > 0 && (
                    <ul aria-label="관련 키워드" className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/42">
                      {post.tags.slice(0, 4).map((tag) => (
                        <li key={tag}>#{tag}</li>
                      ))}
                    </ul>
                  )}
                </article>
                <span
                  aria-hidden="true"
                  className="hidden pt-2 text-lg text-black/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black sm:block"
                >
                  {detailPath ? "→" : "↗"}
                </span>
              </li>
              );
            })}
          </ol>
        ) : (
          <div className="border-b border-black/20 py-24 text-center">
            <p className="font-serif text-3xl tracking-[-0.035em]">일치하는 글이 없습니다.</p>
            <p className="mt-3 text-sm text-black/55">검색어를 줄이거나 다른 분류를 선택해 보세요.</p>
            <Link
              href="/archive"
              className="mt-7 inline-block border-b border-black pb-1 text-sm font-semibold"
            >
              전체 글로 돌아가기
            </Link>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav aria-label="아카이브 페이지" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {currentPage > 1 && (
            <a
              href={archiveHref(currentPage - 1, query, category)}
              rel="prev"
              className="mr-2 border-b border-black/30 px-1 py-2 text-sm hover:border-black"
            >
              ← 이전
            </a>
          )}
          {paginationItems(currentPage, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-black/35" aria-hidden="true">
                …
              </span>
            ) : (
              <a
                key={item}
                href={archiveHref(item, query, category)}
                aria-current={item === currentPage ? "page" : undefined}
                className={`grid min-h-10 min-w-10 place-items-center border text-sm tabular-nums transition ${
                  item === currentPage
                    ? "border-black bg-black text-white"
                    : "border-black/15 hover:border-black hover:bg-white/55"
                }`}
              >
                <span className="sr-only">페이지 </span>
                {item}
              </a>
            ),
          )}
          {currentPage < totalPages && (
            <a
              href={archiveHref(currentPage + 1, query, category)}
              rel="next"
              className="ml-2 border-b border-black/30 px-1 py-2 text-sm hover:border-black"
            >
              다음 →
            </a>
          )}
        </nav>
      )}
    </main>
  );
}
