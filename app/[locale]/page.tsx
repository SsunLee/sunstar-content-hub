import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedArticleCard } from "@/components/localized-article-card";
import {
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  getReadyLocalizedArticles,
  isLocale,
  localizedArticles,
  localizedArticlePath,
  type Locale,
} from "@/lib/localized-content";
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
      <div className="page-shell localized-context-bar">
        <Link className="localized-brand" href={`/${locale}`}>
          SS.Desk <span>Global</span>
        </Link>
        <LanguageSwitcher currentLocale={locale} />
      </div>

      <section className="localized-hub-hero">
        <div className="page-shell localized-hub-intro">
          <p className="section-kicker">{copy.hubEyebrow}</p>
          <h1>{copy.hubTitle}</h1>
          <p>{copy.hubDescription}</p>
          <p className="localized-count">
            {displayedArticles.length.toLocaleString(locale)} {copy.articleLabel}
          </p>
        </div>
      </section>

      <section
        className="page-shell localized-index"
        aria-labelledby="localized-latest"
      >
        <div className="localized-index-heading">
          <h2 id="localized-latest">{copy.latestLabel}</h2>
          <span>{locale.toUpperCase()}</span>
        </div>
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
    </main>
  );
}
