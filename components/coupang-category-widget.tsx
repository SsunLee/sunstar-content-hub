import type { CSSProperties } from "react";

import {
  COUPANG_CATEGORY_WIDGET_SRC,
  resolveCoupangCategoryWidgetPlacement,
} from "@/lib/coupang-category-widget-config.mjs";
import type { Locale } from "@/lib/localized-content";

type CoupangCategoryWidgetPlacement =
  | "home-after-lead"
  | "home-between-desks"
  | "entertainment-desk"
  | "stocks-desk"
  | "entertainment-article"
  | "stocks-article";

type CoupangCategoryWidgetProps = {
  placement: CoupangCategoryWidgetPlacement;
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

export function CoupangCategoryWidget({
  placement,
  locale = "ko",
  className = "",
}: CoupangCategoryWidgetProps) {
  if (process.env.NEXT_PUBLIC_EXPORT_TARGET === "github") return null;

  const configuration = resolveCoupangCategoryWidgetPlacement(placement);
  if (!configuration) return null;

  const style = {
    "--coupang-banner-width": `${configuration.width}px`,
    "--coupang-banner-height": `${configuration.height}px`,
  } as CSSProperties;

  return (
    <aside
      className={`coupang-partners-banner ${className}`.trim()}
      aria-label={`${AD_LABEL[locale]}: Coupang Partners`}
      data-coupang-category-widget-slot
      data-coupang-category-widget-placement={placement}
      data-coupang-category-widget-src={COUPANG_CATEGORY_WIDGET_SRC}
      data-partner-id={configuration.partnerId}
      data-source={configuration.source}
      data-keyword={configuration.keyword}
      data-category-id={configuration.categoryId}
      data-brand-id={configuration.brandId}
      data-limit={configuration.limit}
      data-image-size={configuration.imageSize}
      data-theme={configuration.theme}
      data-rotation={configuration.rotation}
      data-width={configuration.width}
      data-height={configuration.height}
      style={style}
    >
      <p className="section-kicker sponsor-banner-kicker">{AD_LABEL[locale]}</p>
      {/* The widget script tag is injected client-side by
          /coupang-category-widget-loader.js (see export-static.mjs), not
          rendered here directly: this server component's own inline
          <script> tags do not survive server rendering in this framework. */}
      <div className="coupang-partners-unit" />
      <p className="coupang-partners-disclosure">{DISCLOSURE[locale]}</p>
    </aside>
  );
}
