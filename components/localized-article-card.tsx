import Link from "next/link";

import {
  getLocalizedDate,
  localizedArticlePath,
  type Locale,
  type LocalizedArticle,
} from "@/lib/localized-content";

type LocalizedArticleCardProps = {
  article: LocalizedArticle;
  locale: Locale;
};

export function LocalizedArticleCard({
  article,
  locale,
}: LocalizedArticleCardProps) {
  const copy = article.locales[locale];
  const analytics = {
    "data-analytics-event": "localized_article_opened",
    "data-analytics-article-id": article.logNo,
    "data-analytics-locale": locale,
  };

  return (
    <article className="localized-card">
      <Link
        className="localized-card-image"
        href={localizedArticlePath(article, locale)}
        {...analytics}
      >
        {/* The static export keeps parity with the existing Korean thumbnail feed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.image}
          alt={article.imageAlt[locale]}
          width={365}
          height={365}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <span className="localized-card-monogram" aria-hidden="true">
          SS
        </span>
        <span className="localized-card-work" aria-hidden="true">
          {copy.work}
        </span>
      </Link>
      <div className="localized-card-copy">
        <p className="localized-card-meta">
          {copy.eyebrow} · {getLocalizedDate(article.publishedAt, locale)}
        </p>
        <h2>
          <Link href={localizedArticlePath(article, locale)} {...analytics}>
            {copy.title}
          </Link>
        </h2>
        <p>{copy.description}</p>
        <span className="localized-card-link" aria-hidden="true">
          {locale === "ko" ? "글 읽기" : locale === "ja" ? "記事を読む" : "Read story"}
          <span aria-hidden="true"> →</span>
        </span>
      </div>
    </article>
  );
}
