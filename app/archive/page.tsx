import type { Metadata } from "next";

import archiveData from "@/data/posts.json";

import ArchiveClient, {
  type ArchiveData,
  prepareArchive,
  readSearchParam,
} from "./archive-client";

export const metadata: Metadata = {
  title: "전체 글 아카이브",
  description:
    "쑨쑨배 네이버 블로그의 연예·주식·일상 기록을 제목, 배우, 작품, 종목명과 코드로 찾아보세요.",
  alternates: {
    canonical: "/archive",
  },
};

type ArchivePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const params = (await searchParams) || {};
  const data = archiveData as ArchiveData;
  const query = readSearchParam(params.q);
  const category = readSearchParam(params.category, "all");
  const view = prepareArchive(data.posts, query, category, 1);

  return <ArchiveClient {...view} />;
}
