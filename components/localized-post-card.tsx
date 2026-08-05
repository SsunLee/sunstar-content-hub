import {
  isPostDetailIndexable,
  postDetailPath,
} from "@/lib/post-detail";
import {
  getLocalizedDate,
  hasLocalizedLocaleReleaseEvidence,
  localizedArticlePath,
  localizedArticles,
  type Locale,
} from "@/lib/localized-content";
import type { LocalizedPostCopy } from "@/lib/localized-posts";
import type { Post } from "@/lib/posts";

type LocalizedPostCardProps = {
  post: Post;
  localized: LocalizedPostCopy;
  locale: Locale;
  variant?: "lead" | "story" | "compact" | "row";
  number?: number;
};

function sourceLink(post: Post, locale: Locale) {
  if (locale !== "ko") {
    const article = localizedArticles.find(
      (candidate) => candidate.logNo === post.logNo,
    );
    if (article && hasLocalizedLocaleReleaseEvidence(article, locale)) {
      return { href: localizedArticlePath(article, locale), external: false };
    }
    // No full translation exists for this post yet: send the reader to the
    // Korean original in a new tab instead of the site's own Korean-only
    // /news/:logNo page, which would silently drop them out of the locale
    // they were browsing in.
    return { href: post.url, external: true };
  }
  if (isPostDetailIndexable(post)) {
    return { href: postDetailPath(post), external: false };
  }
  return { href: post.url, external: true };
}

const MAX_THUMBNAIL_LABEL_LENGTH = 32;

function conciseLabel(value: string) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  const characters = Array.from(normalized);
  if (characters.length <= MAX_THUMBNAIL_LABEL_LENGTH) return normalized;

  const hardCut = characters
    .slice(0, MAX_THUMBNAIL_LABEL_LENGTH - 1)
    .join("")
    .trimEnd();
  const wordBoundary = hardCut.lastIndexOf(" ");
  const readableCut =
    wordBoundary >= Math.floor(MAX_THUMBNAIL_LABEL_LENGTH * 0.65)
      ? hardCut.slice(0, wordBoundary)
      : hardCut;
  return `${readableCut.replace(/[,:;·\-–—]+$/u, "")}…`;
}

function thumbnailLabel(post: Post, localized: LocalizedPostCopy) {
  const namedWork = localized.work?.trim() || localized.role?.trim();
  if (namedWork) return conciseLabel(namedWork);
  const divider = post.category === "stocks" ? /[:：,]/u : /[,｜|]/u;
  const titleLead = localized.title.split(divider)[0]?.trim() || localized.title;
  return conciseLabel(titleLead);
}

export function LocalizedPostCard({
  post,
  localized,
  locale,
  variant = "story",
  number,
}: LocalizedPostCardProps) {
  const link = sourceLink(post, locale);
  const linkHrefLang = link.external ? "ko" : locale;
  const label = thumbnailLabel(post, localized);
  const categoryLabel =
    post.category === "stocks"
      ? locale === "ko"
        ? "주식"
        : locale === "ja"
          ? "マーケット"
          : "Market"
      : locale === "ko"
        ? "연예"
        : locale === "ja"
          ? "エンタメ"
          : "Entertainment";
  const analytics = {
    "data-analytics-event": "localized_source_article_opened",
    "data-analytics-article-id": post.logNo,
    "data-analytics-locale": locale,
  };
  const sourceLabel = link.external
    ? locale === "ko"
      ? "원문 읽기"
      : locale === "ja"
        ? "韓国語の原文を読む"
        : "Read the Korean original"
    : locale === "ja"
      ? "記事を読む"
      : "Read the full story";

  if (variant === "row") {
    return (
      <article className={`post-row post-row-${post.category} localized-post-row`}>
        {number ? <span className="post-rank">{number}</span> : null}
        <div>
          <p className="story-meta">
            {categoryLabel} · {getLocalizedDate(post.publishedAt, locale)}
          </p>
          <h3>
            <a
              href={link.href}
              hrefLang={linkHrefLang}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              {...analytics}
            >
              {localized.title}
            </a>
          </h3>
        </div>
        <span className="external-arrow" aria-hidden="true">
          {link.external ? "↗" : "→"}
        </span>
      </article>
    );
  }

  return (
    <article
      className={`post-card post-card-${variant} ${post.category} localized-source-card`}
    >
      <a
        className={`story-image localized-source-image${post.image ? "" : " localized-source-image-fallback"}`}
        href={link.href}
        hrefLang={linkHrefLang}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        tabIndex={-1}
        aria-hidden="true"
        {...analytics}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image || "/brand/ssdesk-logo-v1.png"}
          alt=""
          loading={variant === "lead" ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <span className="localized-card-monogram" aria-hidden="true">
          SS
        </span>
        <span className="localized-card-work" aria-hidden="true">
          {label}
        </span>
      </a>
      <div className="story-body">
        <p className="story-meta">
          <span>{categoryLabel}</span>
          <span aria-hidden="true">/</span>
          <time dateTime={post.publishedAt}>
            {getLocalizedDate(post.publishedAt, locale)}
          </time>
        </p>
        <h3>
          <a
            href={link.href}
            hrefLang={linkHrefLang}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            {...analytics}
          >
            {localized.title}
          </a>
        </h3>
        {variant !== "compact" ? (
          <p className="story-summary">{localized.summary}</p>
        ) : null}
        <a
          className="read-original"
          href={link.href}
          hrefLang={linkHrefLang}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          aria-label={`${localized.title}: ${sourceLabel}`}
          {...analytics}
        >
          {sourceLabel}{" "}
          <span aria-hidden="true">{link.external ? "↗" : "→"}</span>
        </a>
      </div>
    </article>
  );
}
