import type { Metadata } from "next";

import archiveData from "@/data/posts.json";

import ArchiveClient, {
  type ArchiveData,
  POSTS_PER_PAGE,
  prepareArchive,
  readSearchParam,
} from "../../archive-client";

const data = archiveData as ArchiveData;

type PagedArchiveProps = {
  params: Promise<{ page: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  const totalPages = Math.max(1, Math.ceil(data.posts.length / POSTS_PER_PAGE));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({ params }: PagedArchiveProps): Promise<Metadata> {
  const requestedPage = Math.max(1, Number.parseInt((await params).page, 10) || 1);
  return {
    title: `전체 글 아카이브 ${requestedPage}페이지`,
    description: `쑨쑨배 네이버 블로그 전체 기록 중 ${requestedPage}페이지입니다. 연예, 주식, 일상 글을 날짜순으로 살펴보세요.`,
    alternates: {
      canonical: requestedPage <= 1 ? "/archive" : `/archive/page/${requestedPage}`,
    },
  };
}

export default async function PagedArchive({ params, searchParams }: PagedArchiveProps) {
  const { page } = await params;
  const filters = (await searchParams) || {};
  const requestedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const query = readSearchParam(filters.q);
  const category = readSearchParam(filters.category, "all");
  const view = prepareArchive(data.posts, query, category, requestedPage);

  return <ArchiveClient {...view} />;
}
