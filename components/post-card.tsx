import type { Post } from "@/lib/posts";
import { getDisplayDate } from "@/lib/posts";

type PostCardProps = {
  post: Post;
  variant?: "lead" | "story" | "compact" | "row";
  number?: number;
};

export function PostCard({
  post,
  variant = "story",
  number,
}: PostCardProps) {
  if (variant === "row") {
    return (
      <article className={`post-row post-row-${post.category}`}>
        {number ? <span className="post-rank">{number}</span> : null}
        <div>
          <p className="story-meta">
            {post.categoryLabel} · {getDisplayDate(post.publishedAt)}
          </p>
          <h3>
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              {post.title}
            </a>
          </h3>
        </div>
        <span className="external-arrow" aria-hidden="true">
          ↗
        </span>
      </article>
    );
  }

  return (
    <article className={`post-card post-card-${variant} ${post.category}`}>
      {post.image ? (
        <a
          className="story-image"
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden="true"
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
          <a href={post.url} target="_blank" rel="noopener noreferrer">
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
          rel="noopener noreferrer"
          aria-label={`${post.title} 네이버 원문 읽기`}
        >
          원문 읽기 <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
