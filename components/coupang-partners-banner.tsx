import type { CSSProperties } from "react";

import {
  COUPANG_PARTNERS_SDK_URL,
  resolveCoupangPartnersPlacement,
} from "@/lib/coupang-partners-config.mjs";
import type { Locale } from "@/lib/localized-content";

type CoupangPartnersBannerPlacement =
  | "home-after-lead"
  | "home-between-desks"
  | "entertainment-desk"
  | "stocks-desk"
  | "entertainment-article"
  | "stocks-article";

type CoupangPartnersBannerProps = {
  placement: CoupangPartnersBannerPlacement;
  locale?: Locale;
  className?: string;
};

const AD_LABEL: Record<Locale, string> = {
  ko: "광고",
  en: "AD",
  ja: "広告",
};

const DISCLOSURE: Record<Locale, string> = {
  ko: "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",
  en: "This is a Coupang Partners affiliate placement; we may earn a commission from qualifying purchases.",
  ja: "この記事はCoupangパートナーズ活動の一環として掲載しており、これに伴い一定の手数料を受け取ることがあります。",
};

export function CoupangPartnersBanner({
  placement,
  locale = "ko",
  className = "",
}: CoupangPartnersBannerProps) {
  if (process.env.NEXT_PUBLIC_EXPORT_TARGET === "github") return null;

  const configuration = resolveCoupangPartnersPlacement(placement);
  if (!configuration) return null;

  const style = {
    "--coupang-banner-width": `${configuration.width}px`,
    "--coupang-banner-height": `${configuration.height}px`,
  } as CSSProperties;

  return (
    <aside
      className={`coupang-partners-banner ${className}`.trim()}
      aria-label={`${AD_LABEL[locale]}: Coupang Partners`}
      data-coupang-partners-slot
      data-coupang-partners-placement={placement}
      data-coupang-partners-id={configuration.id}
      data-coupang-partners-tracking-code={configuration.trackingCode}
      data-coupang-partners-template={configuration.template}
      data-coupang-partners-width={configuration.width}
      data-coupang-partners-height={configuration.height}
      data-coupang-partners-sdk-src={COUPANG_PARTNERS_SDK_URL}
      style={style}
    >
      <p className="section-kicker sponsor-banner-kicker">{AD_LABEL[locale]}</p>
      {/* The Coupang widget script tags themselves are injected client-side
          by /coupang-partners-loader.js (see export-static.mjs), not
          rendered here directly: this server component's own inline
          <script> tags do not survive server rendering in this framework. */}
      <div className="coupang-partners-unit" />
      <p className="coupang-partners-disclosure">{DISCLOSURE[locale]}</p>
    </aside>
  );
}
