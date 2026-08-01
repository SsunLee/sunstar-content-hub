import Link from "next/link";

import {
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  getReadyLocalizedArticles,
  isLocalizedLocaleReady,
  localizedArticlePath,
  type Locale,
  type LocalizedArticle,
} from "@/lib/localized-content";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  article?: LocalizedArticle;
};

export function LanguageSwitcher({
  currentLocale,
  article,
}: LanguageSwitcherProps) {
  return (
    <nav
      className="language-switcher"
      aria-label={LOCALE_CONFIG[currentLocale].languageVersionsLabel}
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const href = article
          ? localizedArticlePath(article, locale)
          : `/${locale}`;
        const ready = article
          ? isLocalizedLocaleReady(article, locale)
          : getReadyLocalizedArticles(locale).length > 0;
        if (locale === currentLocale) {
          return (
            <span key={locale} lang={locale} aria-current="page">
              {LOCALE_CONFIG[locale].languageName}
            </span>
          );
        }
        return (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            lang={locale}
            rel={ready ? undefined : "nofollow"}
            data-analytics-event="language_version_clicked"
            data-analytics-from-locale={currentLocale}
            data-analytics-to-locale={locale}
          >
            {LOCALE_CONFIG[locale].languageName}
          </Link>
        );
      })}
    </nav>
  );
}
