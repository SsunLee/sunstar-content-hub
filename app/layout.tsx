import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${SITE_NAME} | 연예·주식 원문 아카이브`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "연예 블로그",
    "배우 근황",
    "드라마",
    "영화",
    "오늘 급등 이유",
    "주식 실적",
    "네이버 블로그 아카이브",
  ],
  authors: [{ name: "쑨쑨배" }],
  creator: "쑨쑨배",
  icons: {
    icon: absoluteUrl("/favicon.svg"),
    shortcut: absoluteUrl("/favicon.svg"),
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: `${SITE_NAME} | 연예·주식 원문 아카이브`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/og-editorial.png"),
        width: 1536,
        height: 1024,
        alt: "연예와 주식 콘텐츠를 상징하는 쑨쑨 콘텐츠 데스크 편집 일러스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | 연예·주식 원문 아카이브`,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/og-editorial.png")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    other: {
      "msvalidate.01": "1155F1214144455C499E39A6173CFE8F",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2ede2",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
