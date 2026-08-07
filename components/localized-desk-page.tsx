import Link from "next/link";

import { LocalizedPostCard } from "@/components/localized-post-card";
import { SponsorBanner } from "@/components/sponsor-banner";
import {
  LOCALE_CONFIG,
  type Locale,
} from "@/lib/localized-content";
import { getLocalizedPosts } from "@/lib/localized-posts";
import {
  isPostDetailIndexable,
  postDetailPath,
} from "@/lib/post-detail";
import type { PostCategory } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

type LocalizedDeskPageProps = {
  category: Extract<PostCategory, "entertainment" | "stocks">;
  locale: Locale;
};

const deskCopy = {
  ko: {
    entertainment: {
      eyebrow: "ENTERTAINMENT DESK",
      title: "지금 가장 궁금한 작품과 사람",
      description:
        "영화·드라마·예능에서 새롭게 주목받는 작품과 배우 이야기를 최신순으로 살펴봅니다.",
      latest: "최신 연예 글",
      more: "전체 연예 번역 목록",
      note: "목록의 제목과 요약은 한국어 원문을 기준으로 세 언어가 함께 갱신됩니다.",
      countLabel: "개의 연예 글",
    },
    stocks: {
      eyebrow: "MARKET DESK",
      title: "오늘의 움직임에 이유를 붙이다",
      description:
        "급등락 배경, 실적 발표, 공시와 배당처럼 오늘 궁금해지는 주식 글을 모았습니다.",
      latest: "최신 주식 글",
      more: "전체 주식 번역 목록",
      note: "모든 글은 정보 제공 목적이며 투자 판단과 결과의 책임은 투자자 본인에게 있습니다.",
      countLabel: "개의 주식 글",
    },
  },
  en: {
    entertainment: {
      eyebrow: "ENTERTAINMENT DESK",
      title: "The films, series, and people worth following now",
      description:
        "Explore English entertainment summaries, from newly watched films and series to the actors drawing attention.",
      latest: "Latest entertainment",
      more: "All translated entertainment posts",
      note: "English headlines and summaries stay paired with the dated Korean source for context and verification.",
      countLabel: "entertainment posts",
    },
    stocks: {
      eyebrow: "MARKET DESK",
      title: "Putting context behind today’s market moves",
      description:
        "Browse English summaries covering sharp moves, earnings, disclosures, and dividend questions.",
      latest: "Latest market posts",
      more: "All translated market posts",
      note: "This material is for information only and is not investment advice. Figures reflect the Korean source date.",
      countLabel: "market posts",
    },
  },
  ja: {
    entertainment: {
      eyebrow: "ENTERTAINMENT DESK",
      title: "いま知りたい作品と俳優",
      description:
        "映画・ドラマ・バラエティーで注目される作品と俳優の記事を日本語で紹介します。",
      latest: "新着エンタメ記事",
      more: "エンタメ翻訳記事の全一覧",
      note: "日本語の見出しと要約は、掲載日の韓国語原文と対応させて更新します。",
      countLabel: "件のエンタメ記事",
    },
    stocks: {
      eyebrow: "MARKET DESK",
      title: "今日の値動きに理由を添える",
      description:
        "急騰・急落、決算、開示、配当など、いま知りたい株式記事を日本語でまとめました。",
      latest: "新着マーケット記事",
      more: "株式翻訳記事の全一覧",
      note: "情報提供を目的としており、投資勧誘ではありません。数値は韓国語原文の掲載時点に基づきます。",
      countLabel: "件の株式記事",
    },
  },
} as const;

export function LocalizedDeskPage({
  category,
  locale,
}: LocalizedDeskPageProps) {
  const copy = deskCopy[locale][category];
  const categoryPosts = getLocalizedPosts(locale, category);
  const richPosts = categoryPosts.filter(({ post }) => post.image);
  const lead = richPosts[0] || categoryPosts[0];
  const latest = categoryPosts
    .filter(({ post }) => post.logNo !== lead?.post.logNo)
    .slice(0, 6);
  const listId = `localized-${category}-list`;
  const canonicalPath = `/${locale}/${category}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(canonicalPath),
    inLanguage: LOCALE_CONFIG[locale].htmlLang,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: categoryPosts.length,
      itemListElement: categoryPosts.map(({ post, copy: localized }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: localized.title,
        url: isPostDetailIndexable(post)
          ? absoluteUrl(postDetailPath(post))
          : post.url,
      })),
    },
  };

  return (
    <main id="main-content" className="localized-site" lang={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />
      <section className={`desk-hero desk-hero-${category}`}>
        <div className="page-shell desk-hero-grid">
          <div>
            <p className="section-kicker">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
          </div>
          <div>
            <p>{copy.description}</p>
            <div className="desk-count">
              <strong>{categoryPosts.length.toLocaleString(locale)}</strong>
              <span>{copy.countLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell desk-lead">
        {lead ? (
          <LocalizedPostCard
            post={lead.post}
            localized={lead.copy}
            locale={locale}
            variant="lead"
          />
        ) : null}
        <aside>
          <p className="section-kicker">LATEST INDEX</p>
          <h2>{copy.latest}</h2>
          <div className="desk-latest-list">
            {latest.map(({ post, copy: localized }, index) => (
              <LocalizedPostCard
                key={post.logNo}
                post={post}
                localized={localized}
                locale={locale}
                variant="row"
                number={index + 1}
              />
            ))}
          </div>
        </aside>
      </section>

      <div className="page-shell">
        <SponsorBanner
          placement={
            category === "entertainment" ? "entertainment-desk" : "stocks-desk"
          }
          locale={locale}
        />
      </div>

      <section className="page-shell all-stories" id={listId}>
        <div className="section-heading localized-section-heading">
          <div>
            <p className="section-kicker">ALL STORIES</p>
            <h2>{copy.more}</h2>
          </div>
          <p>{copy.note}</p>
          <Link href={`/${locale}`}>{LOCALE_CONFIG[locale].navHome} →</Link>
        </div>
        <div className="desk-story-grid localized-complete-grid">
          {categoryPosts.map(({ post, copy: localized }) => (
            <LocalizedPostCard
              key={post.logNo}
              post={post}
              localized={localized}
              locale={locale}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
