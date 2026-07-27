import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  absoluteUrl,
  HOME_TITLE,
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
} from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: HOME_TITLE,
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
    apple: absoluteUrl(SITE_LOGO_PATH),
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl(SITE_OG_IMAGE_PATH),
        width: 1731,
        height: 909,
        alt: "검정 배경에 겹쳐진 SS와 Desk를 결합한 썬데스크 로고",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl(SITE_OG_IMAGE_PATH)],
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
    google: "gP_sQo1TJMDeAIUZpttQV4hrN8Zg7L48d1dQCQBpKbA",
    other: {
      "msvalidate.01": "1155F1214144455C499E39A6173CFE8F",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
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
