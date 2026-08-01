import type { Metadata } from "next";
import Link from "next/link";

import {
  absoluteUrl,
  NAVER_BLOG_URL,
  SITE_NAME,
  TOTAL_PUBLIC_POSTS,
} from "../../lib/site";

export const metadata: Metadata = {
  title: "소개와 편집 원칙",
  description:
    "썬데스크가 네이버 블로그 원문을 연결하고 분류하는 방식, 편집 원칙과 수정 정책을 안내합니다.",
  alternates: { canonical: absoluteUrl("/about") },
};

const principles = [
  {
    number: "01",
    title: "원문을 가장 먼저 둡니다",
    body: "이 사이트는 별도의 복제 매체가 아니라 공개된 네이버 블로그 글을 발견하기 쉽게 정리한 링크 허브입니다. 제목과 요약을 확인한 뒤 모든 글은 원문으로 이동합니다.",
  },
  {
    number: "02",
    title: "사실과 의견을 구분합니다",
    body: "연예 글은 공개된 작품·인물 정보를, 주식 글은 당일 이슈와 공시·실적 등 확인 가능한 근거를 우선합니다. 추정이나 해석은 사실처럼 단정하지 않습니다.",
  },
  {
    number: "03",
    title: "검색보다 독자를 먼저 봅니다",
    body: "같은 키워드를 기계적으로 반복하거나 의미가 겹치는 페이지를 늘리지 않습니다. 카테고리와 아카이브는 독자가 원하는 원문을 더 빨리 찾도록 설계합니다.",
  },
];

const correctionSteps = [
  "원문의 제목·공개 상태가 바뀌면 다음 수집 시 허브 정보에도 반영합니다.",
  "사실관계 오류나 링크 문제를 확인하면 해당 항목을 수정하거나 노출에서 제외합니다.",
  "투자 판단이 필요한 내용은 원문과 공시 등 1차 자료를 함께 확인해야 합니다.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f3efe5] text-[#171714]">
      <section className="border-b border-black/20 px-5 pb-14 pt-12 sm:px-8 lg:px-12 lg:pb-20 lg:pt-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-black/55">
            <span className="h-px w-8 bg-black/45" aria-hidden="true" />
            About the desk
          </p>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.06] tracking-[-0.045em] sm:text-6xl lg:text-[5.25rem]">
            좋은 글이 묻히지 않도록,
            <br />
            원문으로 가는 길을 엽니다.
          </h1>
          <div className="mt-10 grid gap-7 border-t border-black/80 pt-6 text-base leading-7 text-black/68 lg:grid-cols-[1.45fr_0.55fr] lg:gap-16">
            <p className="max-w-2xl">
              {SITE_NAME}는 2013년부터 공개된 쑨쑨배 네이버 블로그의{" "}
              <strong className="font-semibold text-black">
                {TOTAL_PUBLIC_POSTS.toLocaleString("ko-KR")}개 글
              </strong>
              을 연예·주식·아카이브로 분류해 보여주는 독립 콘텐츠
              안내판입니다. 이곳에서 글의 맥락을 살펴보고, 읽을 때는
              네이버 블로그 원문으로 이동합니다.
            </p>
            <div className="flex items-start lg:justify-end">
              <a
                className="inline-flex items-center gap-3 border-b border-black pb-1 text-sm font-semibold transition-colors hover:border-[#5f3dc4] hover:text-[#5f3dc4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                href={NAVER_BLOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics-event="naver_profile_clicked"
                data-analytics-placement="about"
              >
                네이버 블로그 원문 보기
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.42fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5f3dc4]">
                Editorial principles
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-[-0.035em]">
                편집 원칙
              </h2>
            </div>
            <ol className="divide-y divide-black/20 border-y border-black/80">
              {principles.map((principle) => (
                <li
                  className="grid gap-4 py-7 sm:grid-cols-[3rem_0.7fr_1fr] sm:gap-7 sm:py-9"
                  key={principle.number}
                >
                  <span className="font-mono text-xs text-black/45">
                    {principle.number}
                  </span>
                  <h3 className="font-serif text-2xl tracking-[-0.025em]">
                    {principle.title}
                  </h3>
                  <p className="text-sm leading-7 text-black/65">
                    {principle.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-[#171714] px-5 py-14 text-[#f3efe5] sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.42fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">
              Corrections
            </p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.035em]">
              수정 정책
            </h2>
          </div>
          <div>
            <p className="max-w-2xl text-lg leading-8 text-white/72">
              공개된 글도 시간이 지나면 정보가 달라질 수 있습니다. 링크와
              분류를 정기적으로 점검하고, 확인된 오류는 조용히 방치하지
              않습니다.
            </p>
            <ul className="mt-8 divide-y divide-white/15 border-y border-white/50">
              {correctionSteps.map((step, index) => (
                <li className="flex gap-5 py-5 text-sm leading-7" key={step}>
                  <span className="font-mono text-xs text-white/40">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-white/72">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 border-t border-black/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-black/58">
            둘러볼 준비가 되셨나요? 최신 글과 오래된 기록을 한 번에
            찾아보세요.
          </p>
          <Link
            className="inline-flex items-center gap-3 text-sm font-semibold text-[#5f3dc4] transition-transform hover:translate-x-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            href="/archive"
          >
            전체 아카이브 열기
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
