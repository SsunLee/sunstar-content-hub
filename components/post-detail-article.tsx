/* eslint-disable @next/next/no-img-element -- 네이버 원문의 공개 대표 이미지를 재저장하지 않고 직접 표시합니다. */
import Link from "next/link";

import { KakaoAdFitBanner } from "@/components/kakao-adfit-banner";
import {
  getPostCategoryPath,
  getPostDetailSections,
  getPostDetailTags,
  postDetailPath,
  type PostDetailPost,
} from "@/lib/post-detail";
import { getDisplayDate, type Post } from "@/lib/posts";

type PostDetailArticleProps = {
  post: PostDetailPost;
  relatedPosts: PostDetailPost[];
};

function PostFacts({ post }: { post: Post }) {
  const facts = [
    post.candidate ? ["인물", post.candidate] : null,
    post.work ? ["작품", post.work] : null,
    post.role ? ["역할", post.role] : null,
    post.stockCode ? ["종목 코드", post.stockCode] : null,
  ].filter((fact): fact is string[] => Boolean(fact));

  if (facts.length === 0) return null;

  return (
    <dl className="post-detail-facts" aria-label="글 핵심 정보">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PostDetailArticle({
  post,
  relatedPosts,
}: PostDetailArticleProps) {
  const categoryPath = getPostCategoryPath(post);
  const tags = getPostDetailTags(post);
  const detailSections = getPostDetailSections(post);

  return (
    <main id="main-content" className={`post-detail post-detail-${post.category}`}>
      <article>
        <header className="page-shell post-detail-header">
          <nav className="post-detail-breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <Link href={categoryPath}>{post.categoryLabel} 데스크</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">편집 요약</span>
          </nav>

          <p className="post-detail-kicker">SS.DESK EDITORIAL SUMMARY</p>
          <h1>{post.title}</h1>
          <p className="post-detail-disclosure">
            네이버 원문에서 핵심 문단을 선별해 주제별로 구성한 탐색용
            요약 아카이브입니다.
          </p>
          <div className="post-detail-meta">
            <span>{post.categoryLabel}</span>
            <time dateTime={post.publishedAt}>
              {getDisplayDate(post.publishedAt)}
            </time>
            <span>쑨쑨배</span>
          </div>
        </header>

        <div className="page-shell post-detail-hero">
          <div className="post-detail-image">
            <img
              src={post.image}
              alt={`${post.title} 네이버 원문 대표 이미지`}
              width="1200"
              height="750"
              decoding="async"
              fetchPriority="high"
              referrerPolicy="no-referrer"
            />
          </div>
          <aside className="post-detail-source-card">
            <p>ORIGINAL SOURCE</p>
            <strong>전체 내용과 원문 이미지는 네이버 블로그에서 확인하세요.</strong>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="article_outbound_clicked"
              data-analytics-article-id={post.logNo}
              data-analytics-category={post.category}
              data-analytics-placement="post_detail"
            >
              네이버 원문 읽기 <span aria-hidden="true">↗</span>
            </a>
          </aside>
        </div>

        <div className="page-shell post-detail-layout">
          <div className="post-detail-copy">
            <section className="post-detail-summary" aria-labelledby="summary-heading">
              <p className="post-detail-section-number" aria-hidden="true">01</p>
              <div>
                <h2 id="summary-heading">핵심 요약</h2>
                <p>{post.summary}</p>
              </div>
            </section>
            <KakaoAdFitBanner
              placement={
                post.category === "entertainment"
                  ? "entertainment-article"
                  : "stocks-article"
              }
              className="adfit-interlude-detail"
            />
            {detailSections.map((section, sectionIndex) => (
              <section
                className="post-detail-section"
                key={`${section.heading}-${sectionIndex}`}
              >
                <p className="post-detail-section-number" aria-hidden="true">
                  {String(sectionIndex + 2).padStart(2, "0")}
                </p>
                <div>
                  <h2>{section.heading}</h2>
                  {section.body
                    .split(/\n{2,}/u)
                    .map((paragraph) => paragraph.trim())
                    .filter(Boolean)
                    .map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="post-detail-aside">
            <PostFacts post={post} />
            <section className="post-detail-tags" aria-labelledby="tag-heading">
              <h2 id="tag-heading">관련 검색어</h2>
              <ul>
                {tags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </article>

      <section className="post-detail-related" aria-labelledby="related-heading">
        <div className="page-shell">
          <div className="post-detail-related-heading">
            <div>
              <p className="post-detail-kicker">CONTINUE READING</p>
              <h2 id="related-heading">함께 읽을 글</h2>
            </div>
            <Link href={categoryPath}>{post.categoryLabel} 글 전체 보기 →</Link>
          </div>
          <div className="post-detail-related-grid">
            {relatedPosts.map((relatedPost) => (
              <article key={relatedPost.logNo}>
                <p>
                  {relatedPost.categoryLabel} · {getDisplayDate(relatedPost.publishedAt)}
                </p>
                <h3>
                  <Link
                    href={postDetailPath(relatedPost)}
                    data-analytics-event="article_detail_opened"
                    data-analytics-article-id={relatedPost.logNo}
                    data-analytics-category={relatedPost.category}
                  >
                    {relatedPost.title}
                  </Link>
                </h3>
                <span className="post-detail-related-link" aria-hidden="true">
                  편집 요약 읽기 →
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
