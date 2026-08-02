/* eslint-disable @next/next/no-img-element -- 외부 배너 API의 고정 크기 PNG를 원본 응답 그대로 표시합니다. */
import type { CSSProperties } from "react";

const BANNER_ORIGIN = "https://coupang-partners-banner.vercel.app";
const PARTNER_ID = "AF8916827";
const IS_LEGACY_GITHUB_EXPORT =
  process.env.NEXT_PUBLIC_EXPORT_TARGET === "github";
const DISCLOSURE =
  "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

type BannerCategory = "home" | "entertainment" | "stocks";
type BannerSource = "goldbox" | "search";
type DesktopBannerSize = "970x250" | "728x250";

type CoupangHorizontalBannerProps = {
  placement: string;
  category: BannerCategory;
  desktopSize?: DesktopBannerSize;
  source?: BannerSource;
  keyword?: string;
  className?: string;
};

type BannerDimensions = {
  width: number;
  height: number;
};

const DESKTOP_DIMENSIONS: Record<DesktopBannerSize, BannerDimensions> = {
  "970x250": { width: 970, height: 250 },
  "728x250": { width: 728, height: 250 },
};

const MOBILE_DIMENSIONS: BannerDimensions = { width: 320, height: 100 };

function buildSlot(placement: string) {
  const slot = `ssdesk-${placement}`;
  if (!/^[a-z0-9-]{1,40}$/u.test(slot)) {
    throw new Error(`Invalid Coupang banner placement: ${placement}`);
  }
  return slot;
}

function buildBannerQuery({
  dimensions,
  keyword,
  slot,
  source,
}: {
  dimensions: BannerDimensions;
  keyword?: string;
  slot: string;
  source: BannerSource;
}) {
  const query = new URLSearchParams({
    partnerId: PARTNER_ID,
    source,
    limit: source === "goldbox" ? "20" : "10",
    imageSize: "512x512",
    slot,
    rotation: "60",
    width: String(dimensions.width),
    height: String(dimensions.height),
  });

  if (source === "search") {
    const normalizedKeyword = keyword?.trim();
    if (!normalizedKeyword) {
      throw new Error(`Search banner ${slot} requires a keyword`);
    }
    query.set("keyword", normalizedKeyword);
  }

  return query.toString();
}

function BannerVariant({
  category,
  dimensions,
  keyword,
  placement,
  slot,
  source,
  viewport,
}: {
  category: BannerCategory;
  dimensions: BannerDimensions;
  keyword?: string;
  placement: string;
  slot: string;
  source: BannerSource;
  viewport: "desktop" | "mobile";
}) {
  const query = buildBannerQuery({ dimensions, keyword, slot, source });
  const size = `${dimensions.width}x${dimensions.height}`;
  const imageUrl = `${BANNER_ORIGIN}/api/banner/image?${query}`;
  const clickUrl = `${BANNER_ORIGIN}/api/banner/click?${query}`;

  return (
    <div
      className={`coupang-banner-variant coupang-banner-${viewport}`}
      data-coupang-banner-variant={viewport}
      data-coupang-size={size}
    >
      <a
        className="coupang-banner-link"
        href={clickUrl}
        target="_blank"
        rel="noopener sponsored"
        aria-label="쿠팡에서 관련 상품 보기 (새 창)"
        data-analytics-event="coupang_banner_clicked"
        data-analytics-placement={placement}
        data-analytics-size={size}
        data-analytics-category={category}
        style={{
          aspectRatio: `${dimensions.width} / ${dimensions.height}`,
        }}
      >
        <span className="coupang-banner-fallback" aria-hidden="true">
          관련 상품을 불러오지 못했습니다.
        </span>
        <img
          src={imageUrl}
          alt={`${keyword || "오늘의 추천"} 쿠팡 파트너스 상품 배너`}
          width={dimensions.width}
          height={dimensions.height}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          data-coupang-banner-image
        />
      </a>
    </div>
  );
}

export function CoupangHorizontalBanner({
  placement,
  category,
  desktopSize = "728x250",
  source = "goldbox",
  keyword,
  className = "",
}: CoupangHorizontalBannerProps) {
  if (IS_LEGACY_GITHUB_EXPORT) return null;

  const slot = buildSlot(placement);
  const desktopDimensions = DESKTOP_DIMENSIONS[desktopSize];
  const style = {
    "--coupang-banner-max-width": `${desktopDimensions.width}px`,
  } as CSSProperties;

  return (
    <aside
      className={`coupang-interlude ${className}`.trim()}
      aria-label="쿠팡 파트너스 관련 상품"
      data-coupang-banner
      data-coupang-placement={placement}
      data-coupang-slot={slot}
      data-coupang-category={category}
      data-coupang-source={source}
      style={style}
    >
      <div className="coupang-interlude-heading">
        <p className="section-kicker">PARTNER PICK</p>
        <p>지금 읽은 이야기와 함께 살펴볼 상품</p>
      </div>

      <div className="coupang-banner-media">
        <BannerVariant
          category={category}
          dimensions={desktopDimensions}
          keyword={keyword}
          placement={placement}
          slot={slot}
          source={source}
          viewport="desktop"
        />
        <BannerVariant
          category={category}
          dimensions={MOBILE_DIMENSIONS}
          keyword={keyword}
          placement={placement}
          slot={slot}
          source={source}
          viewport="mobile"
        />
      </div>

      <p className="coupang-partners-disclosure">{DISCLOSURE}</p>
    </aside>
  );
}
