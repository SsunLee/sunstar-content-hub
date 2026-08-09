/* eslint-disable @next/next/no-img-element -- 정적 내보내기에서 브랜드 원본 자산을 그대로 사용합니다. */
import Link from "next/link";

import { LocalizedRouteLanguageSwitcher } from "@/components/localized-route-language-switcher";
import {
  LOCALE_CONFIG,
  type Locale,
} from "@/lib/localized-content";
import { index } from "@/lib/posts";

type LocalizedSiteHeaderProps = {
  locale: Locale;
};

export function LocalizedSiteHeader({ locale }: LocalizedSiteHeaderProps) {
  const copy = LOCALE_CONFIG[locale];
  const localeHome = `/${locale}`;
  const navigation = [
    { href: localeHome, label: copy.navHome },
    { href: `${localeHome}/entertainment`, label: copy.navEntertainment },
    { href: `${localeHome}/stocks`, label: copy.navMarket },
    { href: `${localeHome}#full-archive`, label: copy.navArchive },
    { href: "/about", label: copy.navAbout, koreanOnly: true },
  ];

  return (
    <>
      <div className="utility-bar localized-utility-bar">
        <div className="page-shell utility-inner">
          <p>
            2013—{new Date().getFullYear()} · {copy.utilityPrefix}{" "}
            {index.total.toLocaleString(locale)} {copy.utilitySuffix}
          </p>
          <LocalizedRouteLanguageSwitcher
            currentLocale={locale}
            label={copy.languageVersionsLabel}
            languageNames={{
              ko: LOCALE_CONFIG.ko.languageName,
              en: LOCALE_CONFIG.en.languageName,
              ja: LOCALE_CONFIG.ja.languageName,
            }}
          />
        </div>
      </div>
      <header className="site-header localized-site-header">
        <div className="page-shell masthead">
          <Link
            className="wordmark"
            href={localeHome}
            aria-label={`${copy.brandLabel} ${copy.navHome}`}
          >
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
              <strong>{copy.brandLabel}</strong>
              <span>{copy.brandTagline}</span>
            </span>
          </Link>
          <div className="masthead-aside">
            {locale === "ko" ? (
              <div
                className="masthead-adfit-host"
                data-adfit-host-target="ko-home-header"
              />
            ) : null}
            <p className="masthead-note">
              {copy.mastheadNoteLine1}
              <br />
              {copy.mastheadNoteLine2}
            </p>
          </div>
        </div>
        <nav className="main-nav" aria-label={copy.navLabel}>
          <div className="page-shell nav-track">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                hrefLang={item.koreanOnly ? "ko" : locale}
              >
                {item.label}
                {item.koreanOnly && locale !== "ko" ? (
                  <span className="nav-language-note">KO</span>
                ) : null}
              </Link>
            ))}
            <Link
              className="nav-search"
              href="/archive"
              hrefLang="ko"
              title={locale === "ko" ? undefined : copy.koreanOriginalLabel}
            >
              {copy.navSearch} <span aria-hidden="true">⌕</span>
              {locale !== "ko" ? (
                <span className="nav-language-note">KO</span>
              ) : null}
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
