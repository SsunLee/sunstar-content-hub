/* eslint-disable @next/next/no-img-element -- 정적 내보내기에서 생성 원본 로고 경로를 그대로 보존합니다. */
import Link from "next/link";

import { TOTAL_PUBLIC_POSTS } from "@/lib/site";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/entertainment", label: "연예 데스크" },
  { href: "/stocks", label: "주식 데스크" },
  { href: "/archive", label: "전체 아카이브" },
  { href: "/about", label: "소개" },
];

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문 바로가기
      </a>
      <div className="utility-bar">
        <div className="page-shell utility-inner">
          <p>
            2013—{new Date().getFullYear()} · 공개 글{" "}
            {TOTAL_PUBLIC_POSTS.toLocaleString("ko-KR")}건을 한곳에
          </p>
          <a
            href="https://blog.naver.com/tnsqo1126"
            target="_blank"
            rel="noopener noreferrer"
          >
            네이버 블로그 원문 ↗
          </a>
        </div>
      </div>
      <header className="site-header">
        <div className="page-shell masthead">
          <Link className="wordmark" href="/" aria-label="썬데스크 홈">
            <span className="wordmark-frame" aria-hidden="true">
              <img
                className="wordmark-image"
                src="/brand/ssdesk-logo-v1.png"
                alt=""
                width="1536"
                height="1536"
                decoding="async"
                fetchPriority="high"
              />
            </span>
            <span className="wordmark-meta">
              <strong>썬데스크</strong>
              <span>문화와 시장을 읽는 에디토리얼 허브</span>
            </span>
          </Link>
          <p className="masthead-note">
            지금 화제가 되는 작품과 배우,
            <br />
            오늘 움직인 종목을 차분하게 읽습니다.
          </p>
        </div>
        <nav className="main-nav" aria-label="주요 메뉴">
          <div className="page-shell nav-track">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="nav-search" href="/archive">
              검색 <span aria-hidden="true">⌕</span>
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
