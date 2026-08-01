import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostDetailArticle } from "@/components/post-detail-article";
import {
  getIndexablePostDetails,
  getPostCategoryPath,
  getPostDetailByLogNo,
  getPostDetailArticleBody,
  getPostDetailDescription,
  getPostDetailLastModified,
  getPostDetailTags,
  getRelatedPostDetails,
  postDetailPath,
} from "@/lib/post-detail";
import {
  absoluteUrl,
  SITE_LOGO_PATH,
  SITE_NAME,
} from "@/lib/site";

type PostDetailPageProps = {
  params: Promise<{ logNo: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getIndexablePostDetails().map((post) => ({ logNo: post.logNo }));
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { logNo } = await params;
  const post = getPostDetailByLogNo(logNo);

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const path = postDetailPath(post);
  const url = absoluteUrl(path);
  const description = getPostDetailDescription(post);
  const title = `${post.title} | ${SITE_NAME}`;

  return {
    title: { absolute: title },
    description,
    keywords: getPostDetailTags(post),
    authors: [{ name: "쑨쑨배", url: "https://blog.naver.com/tnsqo1126" }],
    creator: "쑨쑨배",
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url,
      siteName: SITE_NAME,
      title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: getPostDetailLastModified(post).toISOString(),
      authors: ["쑨쑨배"],
      tags: getPostDetailTags(post),
      images: [{ url: post.image, alt: `${post.title} 대표 이미지` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.image],
    },
  };
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { logNo } = await params;
  const post = getPostDetailByLogNo(logNo);
  if (!post) notFound();

  const path = postDetailPath(post);
  const url = absoluteUrl(path);
  const categoryUrl = absoluteUrl(getPostCategoryPath(post));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: post.title,
        description: post.summary,
        articleBody: getPostDetailArticleBody(post),
        image: post.image,
        thumbnailUrl: post.image,
        datePublished: post.publishedAt,
        dateModified: getPostDetailLastModified(post).toISOString(),
        inLanguage: "ko-KR",
        articleSection: post.categoryLabel,
        keywords: getPostDetailTags(post),
        isAccessibleForFree: true,
        isBasedOn: post.url,
        citation: post.url,
        author: {
          "@type": "Person",
          name: "쑨쑨배",
          url: "https://blog.naver.com/tnsqo1126",
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl(SITE_LOGO_PATH),
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "홈",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `${post.categoryLabel} 데스크`,
            item: categoryUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />
      <PostDetailArticle
        post={post}
        relatedPosts={getRelatedPostDetails(post, 3)}
      />
    </>
  );
}
