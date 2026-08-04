import Link from "next/link";

import { KakaoAdFitBanner } from "@/components/kakao-adfit-banner";
import { PostCard } from "@/components/post-card";
import { getPosts, type PostCategory } from "@/lib/posts";

type DeskPageProps = {
  category: Extract<PostCategory, "entertainment" | "stocks">;
};

const deskCopy = {
  entertainment: {
    eyebrow: "ENTERTAINMENT DESK",
    title: "지금 가장 궁금한 작품과 사람",
    description:
      "OTT 한 곳에 한정하지 않습니다. 영화·드라마·예능에서 새롭게 주목받는 작품과 배우의 현재를 공개 자료를 바탕으로 정리합니다.",
    note: "작품·배우·방송 정보는 원문 게시 시점의 공개 자료를 기준으로 합니다.",
  },
  stocks: {
    eyebrow: "MARKET DESK",
    title: "오늘의 움직임에 이유를 붙이다",
    description:
      "급등락 배경, 실적 발표, 공시와 배당처럼 오늘 바로 궁금해지는 질문부터 살핍니다. 숫자와 시점을 분리해 읽기 쉽게 정리합니다.",
    note: "모든 글은 정보 제공 목적이며 투자 판단과 결과의 책임은 투자자 본인에게 있습니다.",
  },
} as const;

export function DeskPage({ category }: DeskPageProps) {
  const copy = deskCopy[category];
  const categoryPosts = getPosts(category);
  const richPosts = categoryPosts.filter((post) => post.image && post.summary);
  const lead = richPosts[0];
  const cards = richPosts.slice(1, 9);
  const latest = categoryPosts
    .filter((post) => post.id !== lead?.id)
    .slice(0, 6);

  return (
    <main id="main-content">
      <section className={`desk-hero desk-hero-${category}`}>
        <div className="page-shell desk-hero-grid">
          <div>
            <p className="section-kicker">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
          </div>
          <div>
            <p>{copy.description}</p>
            <div className="desk-count">
              <strong>{categoryPosts.length}</strong>
              <span>개의 공개 글</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell desk-lead">
        {lead ? <PostCard post={lead} variant="lead" /> : null}
        <aside>
          <p className="section-kicker">LATEST INDEX</p>
          <h2>최신 글</h2>
          <div className="desk-latest-list">
            {latest.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                variant="row"
                number={index + 1}
              />
            ))}
          </div>
        </aside>
      </section>

      <div className="page-shell">
        <KakaoAdFitBanner
          placement={
            category === "entertainment"
              ? "entertainment-desk"
              : "stocks-desk"
          }
        />
      </div>

      <section className="page-shell all-stories">
        <div className="section-heading">
          <div>
            <p className="section-kicker">MORE STORIES</p>
            <h2>더 읽어볼 글</h2>
          </div>
          <p>{copy.note}</p>
          <Link href={`/archive?category=${category}`}>
            전체 검색 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="desk-story-grid">
          {cards.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        <div className="center-action">
          <Link className="outline-button" href={`/archive?category=${category}`}>
            {categoryPosts.length}개 글 모두 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
