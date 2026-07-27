import type { Metadata } from "next";

import { DeskPage } from "@/components/desk-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "주식 데스크",
  description:
    "오늘 급등락한 이유, 실적 발표와 공시처럼 지금 궁금한 주식 이슈를 모은 콘텐츠 아카이브",
  alternates: { canonical: absoluteUrl("/stocks") },
};

export default function StocksPage() {
  return <DeskPage category="stocks" />;
}
