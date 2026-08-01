import Link from "next/link";

import { isLocale } from "@/lib/localized-content";

type LocalizedLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const shellCopy = {
  ko: {
    skip: "본문 바로가기",
    description: "세계가 주목하는 작품과 배우를 세 언어로 연결하는 썬데스크 글로벌 에디션입니다.",
    hub: "한국어 기사",
    archive: "한국어 아카이브",
    original: "네이버 블로그",
    rights: "원문과 이미지의 권리는 각 출처에 있습니다.",
    footerLabel: "하단 메뉴",
  },
  en: {
    skip: "Skip to content",
    description: "The SS.Desk global edition connects timely film, series, and actor stories across three languages.",
    hub: "English stories",
    archive: "Korean archive",
    original: "Naver blog",
    rights: "Original text and image rights remain with their respective owners.",
    footerLabel: "Footer",
  },
  ja: {
    skip: "本文へ移動",
    description: "世界で注目される作品と俳優の話題を3つの言語でつなぐ、SS.Deskのグローバル版です。",
    hub: "日本語の記事",
    archive: "韓国語アーカイブ",
    original: "Naverブログ",
    rights: "原文および画像の権利は各権利者に帰属します。",
    footerLabel: "フッターメニュー",
  },
} as const;

export default async function LocalizedLayout({
  children,
  params,
}: LocalizedLayoutProps) {
  const { locale: requestedLocale } = await params;
  const locale = isLocale(requestedLocale) ? requestedLocale : "ko";
  const copy = shellCopy[locale];

  return (
    <div className="localized-route-shell" lang={locale}>
      <a className="skip-link localized-skip-link" href="#main-content">
        {copy.skip}
      </a>
      {children}
      <footer className="localized-footer">
        <div className="page-shell localized-footer-grid">
          <div>
            <Link className="localized-footer-brand" href={`/${locale}`}>
              SS.Desk <span>Global</span>
            </Link>
            <p>{copy.description}</p>
          </div>
          <nav aria-label={copy.footerLabel}>
            <Link href={`/${locale}`}>{copy.hub}</Link>
            <Link href="/">{copy.archive}</Link>
            <a
              href="https://blog.naver.com/tnsqo1126"
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="naver_profile_clicked"
              data-analytics-placement={`localized_footer_${locale}`}
            >
              {copy.original} ↗
            </a>
          </nav>
        </div>
        <div className="page-shell localized-footer-bottom">
          <span>© 2026 SS.Desk</span>
          <span>{copy.rights}</span>
        </div>
      </footer>
    </div>
  );
}
