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
    title: "연예 데스크 전체 글 | 썬데스크",
    description: "영화·드라마·예능과 배우를 다룬 연예 글을 최신순으로 살펴봅니다.",
  },
  en: {
    title: "Entertainment Desk | SS.Desk",
    description: "Browse English summaries about films, series, shows, and the actors drawing attention.",
  },
  ja: {
    title: "エンタメデスク | SS.Desk",
    description: "映画・ドラマ・バラエティーと俳優を扱う記事を日本語で紹介します。",
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
  const url = absoluteUrl(`/${locale}/entertainment`);
  const languages = Object.fromEntries([
    ...SUPPORTED_LOCALES.map((candidate) => [
      candidate,
      absoluteUrl(`/${candidate}/entertainment`),
    ]),
    ["x-default", absoluteUrl("/ko/entertainment")],
  ]);
  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: LOCALE_CONFIG[locale].metaKeywords,
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

export default async function EntertainmentPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) notFound();
  return <LocalizedDeskPage category="entertainment" locale={requestedLocale} />;
}
