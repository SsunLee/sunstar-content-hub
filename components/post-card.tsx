import {
  isPostDetailIndexable,
  postDetailPath,
} from "@/lib/post-detail";
import type { Post } from "@/lib/posts";
import { getDisplayDate } from "@/lib/posts";

type PostCardProps = {
  post: Post;
  variant?: "lead" | "story" | "compact" | "row";
  number?: number;
};

function articleAnalytics(post: Post) {
  return {
    "data-analytics-event": "article_outbound_clicked",
    "data-analytics-article-id": post.logNo,
    "data-analytics-category": post.category,
  };
}

function detailAnalytics(post: Post) {
  return {
    "data-analytics-event": "article_detail_opened",
    "data-analytics-article-id": post.logNo,
    "data-analytics-category": post.category,
  };
}

function storyLink(post: Post) {
  if (isPostDetailIndexable(post)) {
    return {
      href: postDetailPath(post),
      analytics: detailAnalytics(post),
      isExternal: false,
    };
  }
  return {
    href: post.url,
    analytics: articleAnalytics(post),
    isExternal: true,
  };
}

export function PostCard({
  post,
  variant = "story",
  number,
}: PostCardProps) {
  const primaryLink = storyLink(post);

  if (variant === "row") {
    return (
      <article className={`post-row post-row-${post.category}`}>
        {number ? <span className="post-rank">{number}</span> : null}
        <div>
          <p className="story-meta">
            {post.categoryLabel} · {getDisplayDate(post.publishedAt)}
          </p>
          <h3>
            <a
              href={primaryLink.href}
              target={primaryLink.isExternal ? "_blank" : undefined}
              rel={primaryLink.isExternal ? "noopener" : undefined}
              referrerPolicy={primaryLink.isExternal ? "origin" : undefined}
              {...primaryLink.analytics}
            >
              {post.title}
            </a>
          </h3>
        </div>
        <span className="external-arrow" aria-hidden="true">
          {primaryLink.isExternal ? "↗" : "→"}
        </span>
      </article>
    );
  }

  return (
    <article className={`post-card post-card-${variant} ${post.category}`}>
      {post.image ? (
        <a
          className="story-image"
          href={primaryLink.href}
          target={primaryLink.isExternal ? "_blank" : undefined}
          rel={primaryLink.isExternal ? "noopener" : undefined}
          referrerPolicy={primaryLink.isExternal ? "origin" : undefined}
          tabIndex={-1}
          aria-hidden="true"
          {...primaryLink.analytics}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image}
            alt=""
            loading={variant === "lead" ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
          />
        </a>
      ) : null}
      <div className="story-body">
        <p className="story-meta">
          <span>{post.categoryLabel}</span>
          <span aria-hidden="true">/</span>
          <time dateTime={post.publishedAt}>
            {getDisplayDate(post.publishedAt)}
          </time>
        </p>
        <h3>
          <a
            href={primaryLink.href}
            target={primaryLink.isExternal ? "_blank" : undefined}
            rel={primaryLink.isExternal ? "noopener" : undefined}
            referrerPolicy={primaryLink.isExternal ? "origin" : undefined}
            {...primaryLink.analytics}
          >
            {post.title}
          </a>
        </h3>
        {post.summary && variant !== "compact" ? (
          <p className="story-summary">{post.summary}</p>
        ) : null}
        <a
          className="read-original"
          href={post.url}
          target="_blank"
          rel="noopener"
          referrerPolicy="origin"
          aria-label={`${post.title} 네이버 원문 읽기`}
          {...articleAnalytics(post)}
        >
          원문 읽기 <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
