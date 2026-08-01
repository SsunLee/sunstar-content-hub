"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/localized-content";

const LOCALES: Locale[] = ["ko", "en", "ja"];

type LocalizedRouteLanguageSwitcherProps = {
  currentLocale: Locale;
  label: string;
  languageNames: Record<Locale, string>;
};

function currentDeskSection(pathname: string) {
  const match = pathname.match(
    /^\/(?:ko|en|ja)\/(entertainment|stocks)(?:\/|$)/u,
  );
  return match?.[1] || null;
}

export function LocalizedRouteLanguageSwitcher({
  currentLocale,
  label,
  languageNames,
}: LocalizedRouteLanguageSwitcherProps) {
  const pathname = usePathname();
  const deskSection = currentDeskSection(pathname);

  return (
    <nav className="language-switcher" aria-label={label}>
      {LOCALES.map((locale) => {
        if (locale === currentLocale) {
          return (
            <span key={locale} lang={locale} aria-current="page">
              {languageNames[locale]}
            </span>
          );
        }

        const href = `/${locale}${deskSection ? `/${deskSection}` : ""}`;
        return (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            lang={locale}
            data-analytics-event="language_version_clicked"
            data-analytics-from-locale={currentLocale}
            data-analytics-to-locale={locale}
          >
            {languageNames[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
