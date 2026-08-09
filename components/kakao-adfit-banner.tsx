import type { CSSProperties } from "react";

import { resolveAdFitPlacement } from "@/lib/adfit-config.mjs";

type AdFitPlacement =
  | "header-desktop"
  | "header-mobile"
  | "home-after-lead"
  | "home-between-desks"
  | "entertainment-desk"
  | "stocks-desk"
  | "entertainment-article"
  | "stocks-article";

type KakaoAdFitBannerProps = {
  placement: AdFitPlacement;
  className?: string;
  host?: string;
  media?: string;
};

export function KakaoAdFitBanner({
  placement,
  className = "",
  host,
  media,
}: KakaoAdFitBannerProps) {
  if (process.env.NEXT_PUBLIC_EXPORT_TARGET === "github") return null;

  const configuration = resolveAdFitPlacement(placement);
  if (!configuration) return null;

  const style = {
    "--adfit-unit-width": `${configuration.width}px`,
    "--adfit-unit-height": `${configuration.height}px`,
  } as CSSProperties;

  return (
    <aside
      className={`adfit-interlude ${className}`.trim()}
      aria-label="카카오 애드핏 광고"
      data-adfit-slot
      data-adfit-placement={placement}
      data-adfit-sdk-src={configuration.sdkUrl}
      data-adfit-host={host}
      data-adfit-media={media}
      style={style}
    >
      <div className="adfit-interlude-heading">
        <p className="section-kicker">ADVERTISEMENT</p>
        <p>카카오 애드핏 광고</p>
      </div>
      <div className="adfit-banner-media">
        <div className="adfit-banner-unit">
          <ins
            className="kakao_ad_area"
            style={{ display: "none" }}
            data-ad-unit={configuration.unit}
            data-ad-width={String(configuration.width)}
            data-ad-height={String(configuration.height)}
            data-ad-onfail="ssDeskAdFitNoAd"
          />
        </div>
      </div>
    </aside>
  );
}
