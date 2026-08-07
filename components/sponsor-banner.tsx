import type { CSSProperties } from "react";

import { resolveSponsorBannerPlacement } from "@/lib/sponsor-banner-config.mjs";
import type { Locale } from "@/lib/localized-content";

type SponsorBannerPlacement =
  | "home-after-lead"
  | "home-between-desks"
  | "entertainment-desk"
  | "stocks-desk"
  | "entertainment-article"
  | "stocks-article";

type SponsorBannerProps = {
  placement: SponsorBannerPlacement;
  locale: Locale;
  className?: string;
};

const SPONSORED_LABEL: Record<Locale, string> = {
  ko: "광고",
  en: "SPONSORED",
  ja: "広告",
};

export function SponsorBanner({
  placement,
  locale,
  className = "",
}: SponsorBannerProps) {
  if (process.env.NEXT_PUBLIC_EXPORT_TARGET === "github") return null;

  const configuration = resolveSponsorBannerPlacement(placement);
  if (!configuration) return null;

  const style = {
    "--sponsor-banner-width": `${configuration.width}px`,
    "--sponsor-banner-height": `${configuration.height}px`,
  } as CSSProperties;

  return (
    <aside
      className={`sponsor-banner ${className}`.trim()}
      aria-label={`${SPONSORED_LABEL[locale]}: ${configuration.alt}`}
      data-sponsor-banner-slot
      data-sponsor-banner-placement={placement}
      style={style}
    >
      <p className="section-kicker sponsor-banner-kicker">
        {SPONSORED_LABEL[locale]}
      </p>
      <a
        className="sponsor-banner-link"
        href={configuration.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-analytics-event="sponsor_banner_clicked"
        data-analytics-placement={placement}
        data-analytics-locale={locale}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={configuration.imageUrl}
          alt={configuration.alt}
          width={configuration.width}
          height={configuration.height}
          loading="lazy"
          decoding="async"
        />
      </a>
    </aside>
  );
}
