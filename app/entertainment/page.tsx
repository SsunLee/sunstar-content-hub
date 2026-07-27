import type { Metadata } from "next";

import { DeskPage } from "@/components/desk-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "연예 데스크",
  description:
    "플랫폼에 한정하지 않고 지금 화제가 되는 작품과 배우의 근황을 모은 연예 콘텐츠 아카이브",
  alternates: { canonical: absoluteUrl("/entertainment") },
};

export default function EntertainmentPage() {
  return <DeskPage category="entertainment" />;
}
