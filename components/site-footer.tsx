/* eslint-disable @next/next/no-img-element -- 정적 내보내기에서 생성 원본 로고 경로를 그대로 보존합니다. */
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-grid">
        <div>
          <Link className="footer-brand" href="/" aria-label="썬데스크 홈">
            <span className="footer-logo-frame" aria-hidden="true">
              <img
                className="footer-logo-image"
                src="/brand/ssdesk-logo-v1.png"
                alt=""
                width="1536"
                height="1536"
                decoding="async"
                loading="lazy"
              />
            </span>
            <span>썬데스크</span>
          </Link>
          <p className="footer-copy">
            흩어진 네이버 블로그 글을 주제와 날짜로 다시 발견하는 독립
            아카이브입니다.
          </p>
        </div>
        <div className="footer-links">
          <Link href="/entertainment">연예</Link>
          <Link href="/stocks">주식</Link>
          <Link href="/archive">전체 글</Link>
          <Link href="/about">편집 원칙</Link>
          <a
            href="https://blog.naver.com/tnsqo1126"
            target="_blank"
            rel="noopener noreferrer"
          >
            네이버 블로그 ↗
          </a>
        </div>
      </div>
      <div className="page-shell footer-bottom">
        <span>© 2026 SS.Desk</span>
        <span>원문과 이미지의 권리는 각 출처에 있습니다.</span>
      </div>
    </footer>
  );
}
