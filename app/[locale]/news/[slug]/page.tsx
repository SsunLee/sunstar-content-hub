import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { CoupangCategoryWidget } from "@/components/coupang-category-widget";
import { KakaoAdFitBanner } from "@/components/kakao-adfit-banner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedArticleCard } from "@/components/localized-article-card";
import { OwnedEditorialStory } from "@/components/owned-editorial-story";
import { SponsorBanner } from "@/components/sponsor-banner";
import {
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  getLocalizedArticle,
  getLocalizedDate,
  getLocalizedSourceName,
  getReadyArticleAlternates,
  getRelatedLocalizedArticles,
  isLocale,
  isLocalizedLocaleReady,
  localizedArticles,
  localizedArticlePath,
  type LocalizedArticle,
} from "@/lib/localized-content";
import {
  getOwnedArticle,
  isOwnedArticle,
  ownedArticles,
} from "@/lib/owned-content";
import { getArticleAdFitSectionIndexes } from "@/lib/article-adfit";
import {
  absoluteUrl,
  SITE_LOGO_PATH,
  SITE_OG_IMAGE_PATH,
} from "@/lib/site";

type LocalizedArticleProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return [...localizedArticles, ...ownedArticles].flatMap((article) =>
    SUPPORTED_LOCALES.map((locale) => ({
      locale,
      slug: article.locales[locale].slug,
    })),
  );
}

function absoluteAlternates(article: LocalizedArticle) {
  const paths = getReadyArticleAlternates(article);
  if (!paths) return null;
  return {
    ...Object.fromEntries(
      Object.entries(paths).map(([locale, path]) => [
        locale,
        absoluteUrl(path),
      ]),
    ),
  };
}

function resolveArticle(locale: string, slug: string) {
  if (!isLocale(locale)) return null;
  const article =
    getLocalizedArticle(locale, slug) ?? getOwnedArticle(locale, slug);
  return article ? { article, locale } : null;
}

export async function generateMetadata({
  params,
}: LocalizedArticleProps): Promise<Metadata> {
  const values = await params;
  const resolved = resolveArticle(values.locale, values.slug);
  if (!resolved) return {};
  const { article, locale } = resolved;
  const copy = article.locales[locale];
  const localeConfig = LOCALE_CONFIG[locale];
  const url = absoluteUrl(localizedArticlePath(article, locale));
  const title = `${copy.title} | SS.Desk`;
  const ready = isLocalizedLocaleReady(article, locale);
  const alternates = ready ? absoluteAlternates(article) : null;
  const socialImage = isOwnedArticle(article)
    ? absoluteUrl(article.gallery[0].src)
    : absoluteUrl(SITE_OG_IMAGE_PATH);
  const authorName = isOwnedArticle(article)
    ? { ko: "SS.Desk 편집부", en: "SS.Desk Editorial Team", ja: "SS.Desk編集部" }[locale]
    : localeConfig.authorName;

  return {
    title: { absolute: title },
    description: copy.description,
    keywords: copy.keywords,
    authors: [{
      name: authorName,
      url:
        !isOwnedArticle(article) && locale === "ko"
          ? "https://blog.naver.com/tnsqo1126"
          : absoluteUrl("/"),
    }],
    creator: authorName,
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
      type: "article",
      locale: localeConfig.ogLocale,
      alternateLocale: SUPPORTED_LOCALES.filter(
        (candidate) => candidate !== locale,
      ).map((candidate) => LOCALE_CONFIG[candidate].ogLocale),
      url,
      siteName: localeConfig.siteName,
      title,
      description: copy.description,
      publishedTime: article.publishedAt,
      images: [{ url: socialImage, alt: article.imageAlt[locale] }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: copy.description,
      images: [socialImage],
    },
  };
}

export default async function LocalizedArticlePage({
  params,
}: LocalizedArticleProps) {
  const values = await params;
  const resolved = resolveArticle(values.locale, values.slug);
  if (!resolved) notFound();
  const { article, locale } = resolved;
  const copy = article.locales[locale];
  const localeConfig = LOCALE_CONFIG[locale];
  const url = absoluteUrl(localizedArticlePath(article, locale));
  const hubUrl = absoluteUrl(`/${locale}`);
  const ready = isLocalizedLocaleReady(article, locale);
  const owned = isOwnedArticle(article);
  const displayAuthor = owned
    ? { ko: "SS.Desk 편집부", en: "SS.Desk Editorial Team", ja: "SS.Desk編集部" }[locale]
    : localeConfig.authorName;
  const readyRelated = getRelatedLocalizedArticles(article, locale);
  const related = ready
    ? readyRelated
    : getRelatedLocalizedArticles(article);
  const articleBody = copy.body.flatMap((section) => section.paragraphs).join("\n\n");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: copy.title,
        description: copy.description,
        articleBody,
        datePublished: article.publishedAt,
        dateModified: copy.updatedAt,
        inLanguage: localeConfig.htmlLang,
        keywords: copy.keywords,
        about: [copy.work, copy.subject],
        ...(owned ? {} : { isBasedOn: article.sourceUrl }),
        citation: article.sources.map((source) => source.url),
        ...(owned
          ? { image: article.gallery.map((image) => absoluteUrl(image.src)) }
          : {}),
        author: {
          "@type": owned || locale !== "ko" ? "Organization" : "Person",
          name: owned ? "SS.Desk Editorial Team" : localeConfig.authorName,
          url:
            locale === "ko"
              ? "https://blog.naver.com/tnsqo1126"
              : absoluteUrl("/"),
        },
        publisher: {
          "@type": "Organization",
          name: localeConfig.siteName,
          url: absoluteUrl("/"),
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl(SITE_LOGO_PATH),
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: localeConfig.hubTitle,
            item: hubUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: copy.title,
            item: url,
          },
        ],
      },
    ],
  };
  const articleAdFitIndexes = getArticleAdFitSectionIndexes(copy.body.length);

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
      <div className="page-shell localized-article-language-bar">
        <span>{localeConfig.languageVersionsLabel}</span>
        <LanguageSwitcher currentLocale={locale} article={article} />
      </div>

      <article className="localized-article">
        <header className="page-shell localized-article-header">
          <nav
            className="localized-breadcrumb"
            aria-label={localeConfig.breadcrumbLabel}
          >
            <Link href={`/${locale}`}>{localeConfig.hubTitle}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{localeConfig.articleLabel}</span>
          </nav>
          <p className="section-kicker">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="localized-dek">{copy.description}</p>
          <div className="localized-byline">
            <span>{displayAuthor}</span>
            <time dateTime={article.publishedAt}>
              {getLocalizedDate(article.publishedAt, locale)}
            </time>
          </div>
        </header>

        {owned ? (
          <OwnedEditorialStory article={article} locale={locale} />
        ) : (
          <>
            <div className="page-shell localized-hero-panel" aria-hidden="true">
              <span>SS.Desk Global</span>
              <strong>{copy.subject}</strong>
              <p>{copy.work}</p>
            </div>

            <div className="page-shell localized-article-layout">
              <div className="localized-article-body">
                {copy.body.map((section, sectionIndex) => (
                  <Fragment key={section.heading}>
                    <section>
                      <h2>{section.heading}</h2>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </section>
                    {locale === "ko" &&
                    sectionIndex === articleAdFitIndexes.first ? (
                      <KakaoAdFitBanner
                        placement="ko-article-first"
                        className="localized-article-adfit"
                      />
                    ) : null}
                    {locale === "ko" &&
                    sectionIndex === articleAdFitIndexes.second ? (
                      <KakaoAdFitBanner
                        placement="ko-article-second"
                        className="localized-article-adfit"
                      />
                    ) : null}
                  </Fragment>
                ))}
              </div>

              <aside className="localized-source-panel">
                <p>{localeConfig.sourceNote}</p>
                <a
                  className="localized-original-cta"
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener"
                  referrerPolicy="origin"
                  data-analytics-event="localized_article_outbound_clicked"
                  data-analytics-article-id={article.logNo}
                  data-analytics-locale={locale}
                >
                  {localeConfig.originalLabel} <span aria-hidden="true">↗</span>
                </a>
                <div className="localized-citations">
                  <h2>{localeConfig.sourceLabel}</h2>
                  <ul>
                    {article.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel={
                            source.url.startsWith("https://blog.naver.com/")
                              ? "noopener"
                              : "noopener noreferrer"
                          }
                          referrerPolicy={
                            source.url.startsWith("https://blog.naver.com/")
                              ? "origin"
                              : undefined
                          }
                        >
                          {getLocalizedSourceName(source, locale)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
      </article>

      {!owned ? <div className="page-shell">
        <SponsorBanner
          placement={
            article.category === "stocks"
              ? "stocks-article"
              : "entertainment-article"
          }
          locale={locale}
        />
        <CoupangCategoryWidget
          placement={
            article.category === "stocks"
              ? "stocks-article"
              : "entertainment-article"
          }
          locale={locale}
        />
      </div> : null}

      <section className="localized-related">
        <div className="page-shell">
          <div className="localized-index-heading">
            <h2>{localeConfig.relatedLabel}</h2>
            <Link href={`/${locale}`}>{localeConfig.backLabel} →</Link>
          </div>
          {related.length > 0 ? (
            <div className="localized-card-grid">
              {related.map((relatedArticle) => (
                <LocalizedArticleCard
                  key={relatedArticle.sourceId}
                  article={relatedArticle}
                  locale={locale}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
