import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LocalizedArticleCard } from "@/components/localized-article-card";
import { LocalizedPostCard } from "@/components/localized-post-card";
import { SponsorBanner } from "@/components/sponsor-banner";
import {
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  getLocalizedDate,
  getReadyLocalizedArticles,
  isLocale,
  localizedArticles,
  localizedArticlePath,
  localizedContent,
  type Locale,
} from "@/lib/localized-content";
import {
  getFeaturedLocalizedPosts,
  getLocalizedPosts,
} from "@/lib/localized-posts";
import { index } from "@/lib/posts";
import {
  absoluteUrl,
  SITE_LOGO_PATH,
} from "@/lib/site";

type LocalizedHubProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

function hubAlternates() {
  const readyLocales = SUPPORTED_LOCALES.filter(
    (locale) => getReadyLocalizedArticles(locale).length > 0,
  );
  if (readyLocales.length < 2) return null;
  const defaultLocale = readyLocales.includes("ko") ? "ko" : readyLocales[0];
  return {
    ...Object.fromEntries(
      readyLocales.map((locale) => [locale, absoluteUrl(`/${locale}`)]),
    ),
    "x-default": absoluteUrl(`/${defaultLocale}`),
  };
}

export async function generateMetadata({
  params,
}: LocalizedHubProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) return {};
  const locale = requestedLocale;
  const copy = LOCALE_CONFIG[locale];
  const url = absoluteUrl(`/${locale}`);
  const title = `${copy.hubTitle} | SS.Desk`;
  const ready = getReadyLocalizedArticles(locale).length > 0;
  const alternates = ready ? hubAlternates() : null;

  return {
    title: { absolute: title },
    description: copy.hubDescription,
    keywords: copy.metaKeywords,
    authors: [{
      name: copy.authorName,
      url: locale === "ko" ? "https://blog.naver.com/tnsqo1126" : absoluteUrl("/"),
    }],
    creator: copy.authorName,
    alternates: {
      canonical: url,
      ...(alternates ? { languages: alternates } : {}),
    },
    robots: {
      index: ready,
      follow: ready,
      googleBot: { index: ready, follow: ready },
    },
    openGraph: {
      type: "website",
      locale: copy.ogLocale,
      alternateLocale: SUPPORTED_LOCALES.filter(
        (candidate) => candidate !== locale,
      ).map((candidate) => LOCALE_CONFIG[candidate].ogLocale),
      url,
      siteName: copy.siteName,
      title,
      description: copy.hubDescription,
      images: [absoluteUrl(SITE_LOGO_PATH)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: copy.hubDescription,
      images: [absoluteUrl(SITE_LOGO_PATH)],
    },
  };
}

export default async function LocalizedHub({ params }: LocalizedHubProps) {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) notFound();
  const locale: Locale = requestedLocale;
  const copy = LOCALE_CONFIG[locale];
  const readyArticles = getReadyLocalizedArticles(locale);
  const ready = readyArticles.length > 0;
  const displayedArticles = ready ? readyArticles : localizedArticles;
  const entertainment = getFeaturedLocalizedPosts(locale, "entertainment", 7);
  const stocks = getFeaturedLocalizedPosts(locale, "stocks", 6);
  const localizedPosts = getLocalizedPosts(locale);
  const latest = localizedPosts.slice(0, 6);
  const lead = entertainment[0];
  const support = entertainment.slice(1, 3);
  const hubUrl = absoluteUrl(`/${locale}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${hubUrl}#collection-page`,
        name: copy.hubTitle,
        description: copy.hubDescription,
        url: hubUrl,
        inLanguage: copy.htmlLang,
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
      },
      {
        "@type": "ItemList",
        itemListElement: displayedArticles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(localizedArticlePath(article, locale)),
          name: article.locales[locale].title,
        })),
      },
      {
        "@type": "Organization",
        name: copy.siteName,
        alternateName: "SS.Desk",
        url: absoluteUrl("/"),
        logo: absoluteUrl(SITE_LOGO_PATH),
      },
    ],
  };

  return (
    <main
      id="main-content"
      className="localized-site"
      lang={locale}
      data-indexing-state={ready ? "ready" : "noindex_pending_review"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />
      <section className="page-shell dateline localized-dateline" aria-label={copy.translatedStatusLabel}>
        <p>
          <span className="live-dot" aria-hidden="true" />
          {copy.translatedStatusLabel}{" "}
          {getLocalizedDate(localizedContent.generatedAt, locale)}
        </p>
        <p>
          {copy.translatedCountLabel}{" "}
          {localizedPosts.length.toLocaleString(locale)} · {copy.fullArchiveCountLabel}{" "}
          {index.total.toLocaleString(locale)}
        </p>
      </section>

      <section
        className="page-shell lead-grid localized-lead-grid"
        aria-labelledby="localized-top-stories"
      >
        <h1 className="sr-only" id="localized-top-stories">
          {copy.topStoriesLabel}
        </h1>
        {lead ? (
          <LocalizedPostCard
            post={lead.post}
            localized={lead.copy}
            locale={locale}
            variant="lead"
          />
        ) : null}
        <div className="support-column">
          {support.map(({ post, copy: localized }) => (
            <LocalizedPostCard
              key={post.logNo}
              post={post}
              localized={localized}
              locale={locale}
              variant="compact"
            />
          ))}
        </div>
        <aside className="latest-rail" aria-labelledby="localized-latest-rail">
          <div className="rail-heading">
            <p className="section-kicker">JUST IN</p>
            <h2 id="localized-latest-rail">{copy.justInLabel}</h2>
          </div>
          <div>
            {latest.map(({ post, copy: localized }, articleIndex) => (
              <LocalizedPostCard
                key={post.logNo}
                post={post}
                localized={localized}
                locale={locale}
                variant="row"
                number={articleIndex + 1}
              />
            ))}
          </div>
          <Link className="rail-link" href={`/${locale}/entertainment`}>
            {copy.allTranslatedLabel} <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>

      <div className="page-shell">
        <SponsorBanner placement="home-after-lead" locale={locale} />
      </div>

      <section className="statement-band">
        <div className="page-shell statement-grid localized-statement-grid">
          <p className="statement-number">
            {index.total.toLocaleString(locale)}
          </p>
          <div>
            <p className="section-kicker">{copy.completeIndexEyebrow}</p>
            <h2>{copy.completeIndexTitle}</h2>
          </div>
          <p>{copy.completeIndexDescription}</p>
          <Link className="inverse-button" href="/archive" hrefLang="ko">
            {copy.completeIndexCta}
          </Link>
        </div>
      </section>

      <section
        className="page-shell desk-section entertainment-desk"
        id="translated-stories"
        aria-labelledby="localized-latest"
      >
        <div className="section-heading localized-section-heading">
          <div>
            <p className="section-kicker">{copy.hubEyebrow}</p>
            <h2 id="localized-latest">{copy.hubTitle}</h2>
          </div>
          <p>{copy.hubDescription}</p>
          <Link href={`/${locale}/entertainment`}>
            {copy.translatedDeskCta} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="desk-story-grid">
          {entertainment.slice(3, 7).map(({ post, copy: localized }) => (
            <LocalizedPostCard
              key={post.logNo}
              post={post}
              localized={localized}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <div className="page-shell">
        <SponsorBanner placement="home-between-desks" locale={locale} />
      </div>

      <section className="stock-stage" id="market-desk">
        <div className="page-shell desk-section localized-source-desk">
          <div className="section-heading">
            <div>
              <p className="section-kicker">MARKET DESK</p>
              <h2>{copy.marketTitle}</h2>
            </div>
            <p>{copy.marketDescription}</p>
            <Link href={`/${locale}/stocks`}>
              {copy.marketCta} <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="market-layout">
            {stocks[0] ? (
              <LocalizedPostCard
                post={stocks[0].post}
                localized={stocks[0].copy}
                locale={locale}
                variant="lead"
              />
            ) : null}
            <div className="market-list">
              {stocks.slice(1, 6).map(({ post, copy: localized }, rowIndex) => (
                <LocalizedPostCard
                  key={post.logNo}
                  post={post}
                  localized={localized}
                  locale={locale}
                  variant="row"
                  number={rowIndex + 1}
                />
              ))}
            </div>
          </div>
          <p className="market-disclaimer">{copy.marketDisclaimer}</p>
        </div>
      </section>

      <section className="page-shell localized-index" aria-labelledby="localized-reviewed">
        <div className="localized-index-heading">
          <h2 id="localized-reviewed">{copy.translatedSectionTitle}</h2>
          <span>{copy.translatedSectionCount}</span>
        </div>
        <p className="localized-index-description">
          {copy.translatedSectionDescription}
        </p>
        <div className="localized-card-grid">
          {displayedArticles.map((article) => (
            <LocalizedArticleCard
              key={article.sourceId}
              article={article}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section className="page-shell archive-teaser" id="full-archive">
        <div>
          <p className="section-kicker">FROM THE ARCHIVE</p>
          <h2>{copy.archiveTitle}</h2>
        </div>
        <div className="archive-years" aria-label="2013–2026">
          <span>2013</span>
          <span aria-hidden="true">—</span>
          <span>2026</span>
        </div>
        <div>
          <p>{copy.archiveDescription}</p>
          <Link className="text-link" href="/archive" hrefLang="ko">
            {copy.archiveCta} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
