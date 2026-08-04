import type { Metadata } from "next";
import Link from "next/link";

import { KakaoAdFitBanner } from "@/components/kakao-adfit-banner";
import { PostCard } from "@/components/post-card";
import {
  getFeaturedPosts,
  getUpdatedAt,
  index,
  posts,
} from "@/lib/posts";
import {
  absoluteUrl,
  HOME_TITLE,
  SITE_ALTERNATE_NAMES,
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
} from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
};

export default function Home() {
  const entertainment = getFeaturedPosts("entertainment", 7);
  const stocks = getFeaturedPosts("stocks", 6);
  const lead = entertainment[0];
  const support = entertainment.slice(1, 3);
  const latest = posts.slice(0, 6);
  const homeUrl = absoluteUrl("/");
  const websiteId = `${homeUrl}#website`;
  const organizationId = `${homeUrl}#organization`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: homeUrl,
        publisher: {
          "@id": organizationId,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${absoluteUrl("/archive")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: homeUrl,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(SITE_LOGO_PATH),
          width: 1536,
          height: 1536,
        },
      },
      {
        "@type": "CollectionPage",
        "@id": `${homeUrl}#collection-page`,
        name: HOME_TITLE,
        description: SITE_DESCRIPTION,
        url: homeUrl,
        isPartOf: {
          "@id": websiteId,
        },
      },
    ],
  };

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="page-shell dateline" aria-label="사이트 현황">
        <p>
          <span className="live-dot" aria-hidden="true" />
          마지막 수집 {getUpdatedAt()}
        </p>
        <p>
          연예 {index.counts.entertainment} · 주식 {index.counts.stocks} · 기록{" "}
          {index.counts.archive}
        </p>
      </section>

      <section className="page-shell lead-grid" aria-labelledby="top-stories">
        <h1 className="sr-only" id="top-stories">
          오늘의 주요 글
        </h1>
        {lead ? <PostCard post={lead} variant="lead" /> : null}
        <div className="support-column">
          {support.map((post) => (
            <PostCard key={post.id} post={post} variant="compact" />
          ))}
        </div>
        <aside className="latest-rail" aria-labelledby="latest-title">
          <div className="rail-heading">
            <p className="section-kicker">JUST IN</p>
            <h2 id="latest-title">방금 업데이트</h2>
          </div>
          <div>
            {latest.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                variant="row"
                number={index + 1}
              />
            ))}
          </div>
          <Link className="rail-link" href="/archive">
            최신 글 모두 보기 <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>

      <div className="page-shell">
        <KakaoAdFitBanner placement="home-after-lead" />
      </div>

      <section className="statement-band">
        <div className="page-shell statement-grid">
          <p className="statement-number">
            {index.total.toLocaleString("ko-KR")}
          </p>
          <div>
            <p className="section-kicker">THE COMPLETE INDEX</p>
            <h2>13년의 공개 기록을, 다시 찾기 쉬운 한 권으로.</h2>
          </div>
          <p>
            제목·날짜·주제를 한 번에 검색하고, 품질 기준을 갖춘 글은 핵심 문단을
            주제별로 살펴본 뒤 네이버 원문으로 이어서 읽을 수 있습니다.
          </p>
          <Link className="inverse-button" href="/archive">
            전체 아카이브 검색
          </Link>
        </div>
      </section>

      <section className="page-shell desk-section entertainment-desk">
        <div className="section-heading">
          <div>
            <p className="section-kicker">ENTERTAINMENT DESK</p>
            <h2>요즘 이야기되는 작품과 배우</h2>
          </div>
          <p>
            특정 플랫폼에 가두지 않고, 지금 화제가 되는 영화·드라마·예능과
            그 안의 배우를 따라갑니다.
          </p>
          <Link href="/entertainment">
            연예 글 전체 <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="desk-story-grid">
          {entertainment.slice(3, 7).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <div className="page-shell">
        <KakaoAdFitBanner placement="home-between-desks" />
      </div>

      <section className="stock-stage">
        <div className="page-shell desk-section stock-desk">
          <div className="section-heading">
            <div>
              <p className="section-kicker">MARKET DESK</p>
              <h2>오늘 움직인 이유를 숫자와 함께</h2>
            </div>
            <p>
              급등락 이유, 실적 발표, 공시처럼 ‘오늘 궁금한 것’을 확인 가능한
              근거와 시점에 맞춰 정리합니다.
            </p>
            <Link href="/stocks">
              주식 글 전체 <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="market-layout">
            {stocks[0] ? <PostCard post={stocks[0]} variant="lead" /> : null}
            <div className="market-list">
              {stocks.slice(1, 6).map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="row"
                  number={index + 1}
                />
              ))}
            </div>
          </div>
          <p className="market-disclaimer">
            주식 콘텐츠는 정보 제공 목적이며 투자 권유가 아닙니다. 수치와
            공시는 원문 게시 시점을 기준으로 확인해 주세요.
          </p>
        </div>
      </section>

      <section className="page-shell archive-teaser">
        <div>
          <p className="section-kicker">FROM THE ARCHIVE</p>
          <h2>
            안드로이드부터 VBA,
            <br />
            오래된 실무 기록도 남겨두었습니다.
          </h2>
        </div>
        <div className="archive-years" aria-label="아카이브 기간">
          <span>2013</span>
          <span aria-hidden="true">—</span>
          <span>2026</span>
        </div>
        <div>
          <p>
            최신 연예·주식 글뿐 아니라 블로그 초창기의 개발·업무 메모까지
            공개된 모든 글을 날짜순으로 탐색할 수 있습니다.
          </p>
          <Link className="text-link" href="/archive?category=archive">
            오래된 기록 둘러보기 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
