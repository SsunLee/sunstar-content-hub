import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocalizedDeskPage } from "@/components/localized-desk-page";
import {
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  isLocale,
} from "@/lib/localized-content";
import { absoluteUrl, SITE_OG_IMAGE_PATH } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const metadataCopy = {
  ko: {
    title: "주식 데스크 전체 글 | 썬데스크",
    description: "급등락 이유, 실적, 공시와 배당을 다룬 주식 글을 최신순으로 살펴봅니다.",
    keywords: "주식, 급등 이유, 실적 발표, 공시, 배당",
  },
  en: {
    title: "Market Desk | SS.Desk",
    description: "Browse English summaries covering market moves, earnings, disclosures, and dividends.",
    keywords: "Korean stocks, market moves, earnings, disclosures, dividends",
  },
  ja: {
    title: "マーケットデスク | SS.Desk",
    description: "急騰・急落、決算、開示、配当を扱う記事を日本語で紹介します。",
    keywords: "韓国株, 株価変動, 決算, 開示, 配当",
  },
} as const;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) return {};
  const locale = requestedLocale;
  const copy = metadataCopy[locale];
  const url = absoluteUrl(`/${locale}/stocks`);
  const languages = Object.fromEntries([
    ...SUPPORTED_LOCALES.map((candidate) => [
      candidate,
      absoluteUrl(`/${candidate}/stocks`),
    ]),
    ["x-default", absoluteUrl("/ko/stocks")],
  ]);
  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    authors: [{
      name: LOCALE_CONFIG[locale].authorName,
      url: locale === "ko" ? "https://blog.naver.com/tnsqo1126" : absoluteUrl("/"),
    }],
    creator: LOCALE_CONFIG[locale].authorName,
    alternates: { canonical: url, languages },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: LOCALE_CONFIG[locale].ogLocale,
      url,
      siteName: LOCALE_CONFIG[locale].siteName,
      title: copy.title,
      description: copy.description,
      images: [absoluteUrl(SITE_OG_IMAGE_PATH)],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [absoluteUrl(SITE_OG_IMAGE_PATH)],
    },
  };
}

export default async function StocksPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) notFound();
  return <LocalizedDeskPage category="stocks" locale={requestedLocale} />;
}
