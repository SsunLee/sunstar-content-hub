import Link from "next/link";

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
          <p>2013—2026 · 공개 글 1,084건을 한곳에</p>
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
          <Link className="wordmark" href="/" aria-label="쑨쑨 콘텐츠 데스크 홈">
            <span className="wordmark-kicker">SUNSUN CONTENT ARCHIVE</span>
            <span>쑨쑨 콘텐츠 데스크</span>
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
