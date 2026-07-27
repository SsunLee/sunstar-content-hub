import content from "@/data/posts.json";

export type PostCategory = "entertainment" | "stocks" | "archive";

export type Post = {
  id: string;
  logNo: string;
  title: string;
  url: string;
  publishedAt: string;
  dateLabel: string;
  category: PostCategory;
  categoryLabel: string;
  sourceCategoryNo: string;
  summary: string;
  image: string;
  tags: string[];
  candidate: string;
  work: string;
  role: string;
  stockCode: string;
  searchAllowed: boolean;
  verificationLevel: string;
};

type ContentIndex = {
  blog: {
    id: string;
    title: string;
    url: string;
  };
  generatedAt: string;
  expectedPublicCount: number;
  total: number;
  counts: Record<PostCategory, number>;
  posts: Post[];
};

export const index = content as ContentIndex;
export const posts = index.posts;

export function getPosts(category?: PostCategory) {
  return category ? posts.filter((post) => post.category === category) : posts;
}

export function getFeaturedPosts(category: PostCategory, limit = 6) {
  return getPosts(category)
    .filter((post) => post.image && post.summary)
    .slice(0, limit);
}

export function getDisplayDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function getUpdatedAt() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(index.generatedAt));
}
