import rawContent from "@/data/localized-articles.json";

import { absoluteUrl } from "@/lib/site";

export const SUPPORTED_LOCALES = ["ko", "en", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type LocalizedSource = {
  name: string;
  names?: Record<Locale, string>;
  url: string;
};

export type LocalizedFact = {
  label: string;
  value: string;
};

export type LocalizedSection = {
  heading: string;
  paragraphs: string[];
};

export type LocalizedReleaseStatus = "draft" | "reviewed" | "stale" | "ready";
export type LocalizedRobots = "noindex,nofollow" | "index,follow";

export type LocalizedPublicVerification = {
  status: "pending" | "verified";
  checkedAt: string;
  httpStatus: number;
  resolvedUrl: string;
};

export type ArticleLocale = {
  slug: string;
  work: string;
  subject: string;
  updatedAt: string;
  title: string;
  description: string;
  eyebrow: string;
  body: LocalizedSection[];
  keywords: string[];
  status: LocalizedReleaseStatus;
  robots: LocalizedRobots;
  translatedFromSourceHash: string;
  publicVerification: LocalizedPublicVerification | null;
};

export type LocalizedArticle = {
  sourceId: string;
  logNo: string;
  category: string;
  sourceUrl: string;
  publishedAt: string;
  image: string;
  imageAlt: Record<Locale, string>;
  work: string;
  subject: string;
  sourceHash: string;
  sources: LocalizedSource[];
  facts: LocalizedFact[];
  locales: Record<Locale, ArticleLocale>;
};

export type LocalizedContentIndex = {
  schemaVersion: number;
  generatedAt: string;
  articles: LocalizedArticle[];
};

export const LOCALE_CONFIG = {
  ko: {
    htmlLang: "ko",
    siteName: "썬데스크",
    languageName: "한국어",
    ogLocale: "ko_KR",
    hubTitle: "세계가 주목하는 작품과 배우",
    hubDescription:
      "해외에서도 검색되는 최신 작품과 배우 이야기를 한국어·영어·일본어로 연결합니다.",
    hubEyebrow: "GLOBAL ENTERTAINMENT DESK",
    latestLabel: "새로 번역한 이야기",
    articleLabel: "기사",
    originalLabel: "네이버 원문 읽기",
    relatedLabel: "함께 읽을 이야기",
    backLabel: "한국어 글 목록",
    sourceNote: "이 글은 썬데스크가 공개 자료를 바탕으로 재구성한 다국어 요약입니다.",
    sourceLabel: "출처",
    authorName: "쑨쑨배",
    metaKeywords: "연예, 배우, 영화, 드라마, 글로벌 엔터테인먼트",
    languageVersionsLabel: "언어별 기사",
    breadcrumbLabel: "현재 위치",
    utilityPrefix: "공개 글",
    utilitySuffix: "건을 한곳에",
    brandLabel: "썬데스크",
    brandTagline: "문화와 시장을 읽는 에디토리얼 허브",
    mastheadNoteLine1: "지금 화제가 되는 작품과 배우,",
    mastheadNoteLine2: "오늘 움직인 종목을 차분하게 읽습니다.",
    navHome: "홈",
    navEntertainment: "연예 데스크",
    navMarket: "주식 데스크",
    navArchive: "전체 아카이브",
    navAbout: "소개",
    navSearch: "검색",
    navLabel: "주요 메뉴",
    translatedStatusLabel: "번역판 업데이트",
    translatedCountLabel: "번역 기사",
    fullArchiveCountLabel: "전체 원문",
    topStoriesLabel: "오늘의 다국어 주요 글",
    justInLabel: "방금 업데이트",
    allTranslatedLabel: "번역 기사 모두 보기",
    readLabel: "글 읽기",
    completeIndexEyebrow: "THE COMPLETE INDEX",
    completeIndexTitle: "1,088개의 공개 기록을 한곳에서 찾습니다.",
    completeIndexDescription:
      "연예 108건과 주식 60건은 세 언어로 제목·요약을 제공하고, 6편의 심층 기사는 본문까지 검수해 공개합니다.",
    completeIndexCta: "전체 아카이브 검색",
    translatedSectionTitle: "세 언어로 읽는 최신 작품과 배우",
    translatedSectionDescription:
      "한국어·영어·일본어가 모두 검수된 기사만 이 목록에 공개합니다.",
    translatedSectionCount: "검수 완료 6편",
    translatedDeskCta: "연예 번역 108건 모두 보기",
    marketTitle: "오늘 움직인 이유를 숫자와 함께",
    marketDescription:
      "급등락 이유, 실적 발표, 공시처럼 오늘 궁금한 주식 글을 번역 요약과 한국어 원문으로 함께 확인합니다.",
    marketCta: "주식 번역 60건 모두 보기",
    marketCountLabel: "번역된 주식 글",
    marketDisclaimer:
      "주식 콘텐츠는 정보 제공 목적이며 투자 권유가 아닙니다. 원문 게시 시점의 수치와 공시를 확인해 주세요.",
    archiveTitle: "2013년부터 쌓인 전체 기록",
    archiveDescription:
      "연예·주식뿐 아니라 개발과 실무 메모까지 공개된 원문을 날짜와 주제로 탐색할 수 있습니다.",
    archiveCta: "한국어 원문 아카이브 보기",
    koreanOriginalLabel: "한국어 원문",
  },
  en: {
    htmlLang: "en",
    siteName: "SS.Desk",
    languageName: "English",
    ogLocale: "en_US",
    hubTitle: "The Stars and Stories Everyone Is Watching",
    hubDescription:
      "Discover timely stories about globally searched films, series, and actors, edited for English readers.",
    hubEyebrow: "SS.DESK GLOBAL",
    latestLabel: "Latest translated stories",
    articleLabel: "Story",
    originalLabel: "Read the original on Naver",
    relatedLabel: "More stories to explore",
    backLabel: "Back to English stories",
    sourceNote:
      "This localized summary was independently edited by SS.Desk using publicly available sources.",
    sourceLabel: "Sources",
    authorName: "SS.Desk Editorial Team",
    metaKeywords: "entertainment, actors, films, series, global entertainment",
    languageVersionsLabel: "Language versions",
    breadcrumbLabel: "Breadcrumb",
    utilityPrefix: "public posts",
    utilitySuffix: "in one searchable archive",
    brandLabel: "SS.Desk",
    brandTagline: "An editorial hub for culture and markets",
    mastheadNoteLine1: "The films and stars people are talking about,",
    mastheadNoteLine2: "plus the market moves shaping today.",
    navHome: "Home",
    navEntertainment: "Entertainment",
    navMarket: "Market desk",
    navArchive: "Full archive",
    navAbout: "About",
    navSearch: "Search",
    navLabel: "Primary navigation",
    translatedStatusLabel: "Translation desk updated",
    translatedCountLabel: "translated stories",
    fullArchiveCountLabel: "Korean originals",
    topStoriesLabel: "Top multilingual stories",
    justInLabel: "Just in",
    allTranslatedLabel: "View all translations",
    readLabel: "Read story",
    completeIndexEyebrow: "THE COMPLETE INDEX",
    completeIndexTitle: "1,088 public posts, connected in one desk.",
    completeIndexDescription:
      "English headlines and summaries cover 108 entertainment and 60 market posts, with six fully reviewed long-form translations.",
    completeIndexCta: "Search the Korean archive",
    translatedSectionTitle: "Films and stars, edited in three languages",
    translatedSectionDescription:
      "This section includes only stories reviewed in Korean, English, and Japanese.",
    translatedSectionCount: "6 reviewed stories",
    translatedDeskCta: "Browse all 108 entertainment posts",
    marketTitle: "Today’s market moves, with the numbers behind them",
    marketDescription:
      "Read translated summaries of sharp moves, earnings, and disclosures, each paired with its dated Korean source.",
    marketCta: "Browse all 60 market posts",
    marketCountLabel: "translated market posts",
    marketDisclaimer:
      "Market content is for information only and is not investment advice. Check figures and disclosures against the publication date.",
    archiveTitle: "The complete record, from 2013 onward",
    archiveDescription:
      "Browse the original Korean archive by date and topic, including entertainment, markets, development, and practical notes.",
    archiveCta: "Browse Korean originals",
    koreanOriginalLabel: "Korean original",
  },
  ja: {
    htmlLang: "ja",
    siteName: "SS.Desk",
    languageName: "日本語",
    ogLocale: "ja_JP",
    hubTitle: "いま注目したい作品と俳優",
    hubDescription:
      "世界で検索されている映画・ドラマ・俳優の話題を、日本語で読みやすく紹介します。",
    hubEyebrow: "SS.DESK グローバル",
    latestLabel: "新着の翻訳記事",
    articleLabel: "記事",
    originalLabel: "Naverの原文を読む",
    relatedLabel: "あわせて読みたい記事",
    backLabel: "日本語の記事一覧へ",
    sourceNote:
      "この記事は、公開情報をもとにSS.Deskが独自に編集した多言語要約です。",
    sourceLabel: "出典",
    authorName: "SS.Desk編集部",
    metaKeywords: "エンタメ, 俳優, 映画, ドラマ, 海外エンタメ",
    languageVersionsLabel: "言語別の記事",
    breadcrumbLabel: "現在位置",
    utilityPrefix: "公開記事",
    utilitySuffix: "件をひとつのアーカイブに",
    brandLabel: "SS.Desk",
    brandTagline: "カルチャーと市場を読む編集ハブ",
    mastheadNoteLine1: "いま話題の作品と俳優、",
    mastheadNoteLine2: "今日動いた銘柄を落ち着いて読み解きます。",
    navHome: "ホーム",
    navEntertainment: "エンタメ",
    navMarket: "マーケット",
    navArchive: "全記事",
    navAbout: "紹介",
    navSearch: "検索",
    navLabel: "メインメニュー",
    translatedStatusLabel: "翻訳版の更新",
    translatedCountLabel: "翻訳記事",
    fullArchiveCountLabel: "韓国語の原文",
    topStoriesLabel: "注目の多言語記事",
    justInLabel: "新着記事",
    allTranslatedLabel: "翻訳記事をすべて見る",
    readLabel: "記事を読む",
    completeIndexEyebrow: "THE COMPLETE INDEX",
    completeIndexTitle: "1,088件の公開記録を、ひとつのデスクに。",
    completeIndexDescription:
      "エンタメ108件と株式60件の見出し・要約を日本語で提供し、6本の特集記事は本文まで確認して公開します。",
    completeIndexCta: "韓国語アーカイブを検索",
    translatedSectionTitle: "3つの言語で読む、いま注目の作品と俳優",
    translatedSectionDescription:
      "韓国語・英語・日本語のすべてで確認が完了した記事だけを掲載します。",
    translatedSectionCount: "確認済み6記事",
    translatedDeskCta: "エンタメ108件をすべて見る",
    marketTitle: "今日動いた理由を数字とともに",
    marketDescription:
      "急騰・急落、決算、開示情報を日本語の要約で読み、掲載日の韓国語原文も確認できます。",
    marketCta: "株式60件をすべて見る",
    marketCountLabel: "翻訳済みの株式記事",
    marketDisclaimer:
      "株式コンテンツは情報提供を目的としており、投資勧誘ではありません。数値と開示は掲載時点を基準に確認してください。",
    archiveTitle: "2013年から続く、すべての記録",
    archiveDescription:
      "エンタメ・株式だけでなく、開発や実務メモまで、公開された韓国語の原文を日付とテーマから探せます。",
    archiveCta: "韓国語の原文を見る",
    koreanOriginalLabel: "韓国語の原文",
  },
} as const satisfies Record<Locale, Record<string, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(path: string, message: string): never {
  throw new Error(`Invalid localized content at ${path}: ${message}`);
}

function requireRecord(value: unknown, path: string) {
  if (!isRecord(value)) fail(path, "expected an object");
  return value;
}

function requireString(value: unknown, path: string) {
  if (typeof value !== "string" || !value.trim()) {
    fail(path, "expected a non-empty string");
  }
  return value.trim();
}

function requireDate(value: unknown, path: string) {
  const text = requireString(value, path);
  if (Number.isNaN(Date.parse(text))) fail(path, "expected an ISO date");
  return text;
}

function requireUrl(value: unknown, path: string) {
  const text = requireString(value, path);
  try {
    const url = new URL(text);
    if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
      fail(path, "expected an HTTP(S) URL");
    }
  } catch {
    fail(path, "expected a valid URL");
  }
  return text;
}

const NAVER_IMAGE_HOSTS = new Set([
  "blogthumb.pstatic.net",
  "phinf.pstatic.net",
]);

function requireNaverThumbnailUrl(value: unknown, path: string) {
  const text = requireUrl(value, path);
  const url = new URL(text);
  if (url.protocol !== "https:" || !NAVER_IMAGE_HOSTS.has(url.hostname)) {
    fail(path, "expected an HTTPS Naver thumbnail URL");
  }
  return text;
}

function parseLocalizedStrings(value: unknown, path: string) {
  const record = requireRecord(value, path);
  const localized = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      requireString(record[locale], `${path}.${locale}`),
    ]),
  ) as Record<Locale, string>;
  for (const locale of ["en", "ja"] as const) {
    if (/[가-힣]/u.test(localized[locale])) {
      fail(`${path}.${locale}`, "must not contain untranslated Korean text");
    }
  }
  return localized;
}

function requireStringArray(value: unknown, path: string) {
  if (!Array.isArray(value)) fail(path, "expected an array");
  return value.map((item, index) => requireString(item, `${path}[${index}]`));
}

function optionalHash(value: unknown, path: string) {
  if (value === undefined || value === null || value === "") return "";
  const hash = requireString(value, path).toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(hash)) {
    fail(path, "expected sha256:<64 lowercase hex characters>");
  }
  return hash;
}

function parseStatus(value: unknown, path: string): LocalizedReleaseStatus {
  if (value === undefined) return "draft";
  if (
    value !== "draft" &&
    value !== "reviewed" &&
    value !== "stale" &&
    value !== "ready"
  ) {
    fail(path, "expected draft, reviewed, stale, or ready");
  }
  return value;
}

function parseRobots(value: unknown, path: string): LocalizedRobots {
  if (value === undefined) return "noindex,nofollow";
  if (value !== "noindex,nofollow" && value !== "index,follow") {
    fail(path, "expected noindex,nofollow or index,follow");
  }
  return value;
}

function parsePublicVerification(
  value: unknown,
  path: string,
): LocalizedPublicVerification | null {
  if (value === undefined || value === null) return null;
  const record = requireRecord(value, path);
  const status = record.status === "verified" ? "verified" : "pending";
  const httpStatus = Number(record.httpStatus || 0);
  if (!Number.isInteger(httpStatus) || httpStatus < 0 || httpStatus > 599) {
    fail(`${path}.httpStatus`, "expected a valid HTTP status or 0");
  }
  return {
    status,
    checkedAt:
      record.checkedAt === "" || record.checkedAt === undefined
        ? ""
        : requireDate(record.checkedAt, `${path}.checkedAt`),
    httpStatus,
    resolvedUrl:
      record.resolvedUrl === "" || record.resolvedUrl === undefined
        ? ""
        : requireUrl(record.resolvedUrl, `${path}.resolvedUrl`),
  };
}

function parseSources(value: unknown, path: string): LocalizedSource[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(path, "expected at least one source");
  }
  return value.map((source, index) => {
    const sourcePath = `${path}[${index}]`;
    const record = requireRecord(source, sourcePath);
    const name = requireString(record.name, `${sourcePath}.name`);
    let names: Record<Locale, string> | undefined;
    if (record.names !== undefined) {
      const localizedNames = requireRecord(record.names, `${sourcePath}.names`);
      names = Object.fromEntries(
        SUPPORTED_LOCALES.map((locale) => [
          locale,
          requireString(localizedNames[locale], `${sourcePath}.names.${locale}`),
        ]),
      ) as Record<Locale, string>;
      for (const locale of ["en", "ja"] as const) {
        if (/[가-힣]/u.test(names[locale])) {
          fail(
            `${sourcePath}.names.${locale}`,
            "must not contain untranslated Korean text",
          );
        }
      }
    }
    if (/[가-힣]/u.test(name) && !names) {
      fail(
        `${sourcePath}.names`,
        "localized source names are required when the fallback name contains Korean text",
      );
    }
    return {
      name,
      ...(names ? { names } : {}),
      url: requireUrl(record.url, `${sourcePath}.url`),
    };
  });
}

function parseFacts(value: unknown, path: string): LocalizedFact[] {
  if (!Array.isArray(value)) fail(path, "expected an array");
  return value.map((fact, index) => {
    const factPath = `${path}[${index}]`;
    const record = requireRecord(fact, factPath);
    return {
      label: requireString(record.label, `${factPath}.label`),
      value: requireString(record.value, `${factPath}.value`),
    };
  });
}

function parseLocale(value: unknown, path: string): ArticleLocale {
  const record = requireRecord(value, path);
  const slug = requireString(record.slug, `${path}.slug`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail(`${path}.slug`, "use a lowercase ASCII slug with hyphens");
  }
  if (!Array.isArray(record.body) || record.body.length === 0) {
    fail(`${path}.body`, "expected at least one section");
  }
  const body = record.body.map((section, sectionIndex) => {
    const sectionPath = `${path}.body[${sectionIndex}]`;
    const sectionRecord = requireRecord(section, sectionPath);
    const paragraphs = requireStringArray(
      sectionRecord.paragraphs,
      `${sectionPath}.paragraphs`,
    );
    if (paragraphs.length === 0) {
      fail(`${sectionPath}.paragraphs`, "expected at least one paragraph");
    }
    return {
      heading: requireString(sectionRecord.heading, `${sectionPath}.heading`),
      paragraphs,
    };
  });
  const keywords = requireStringArray(record.keywords, `${path}.keywords`);
  if (keywords.length === 0) {
    fail(`${path}.keywords`, "expected at least one keyword");
  }

  return {
    slug,
    work: requireString(record.work, `${path}.work`),
    subject: requireString(record.subject, `${path}.subject`),
    updatedAt: requireDate(record.updatedAt, `${path}.updatedAt`),
    title: requireString(record.title, `${path}.title`),
    description: requireString(record.description, `${path}.description`),
    eyebrow: requireString(record.eyebrow, `${path}.eyebrow`),
    body,
    keywords,
    status: parseStatus(record.status, `${path}.status`),
    robots: parseRobots(record.robots, `${path}.robots`),
    translatedFromSourceHash: optionalHash(
      record.translatedFromSourceHash,
      `${path}.translatedFromSourceHash`,
    ),
    publicVerification: parsePublicVerification(
      record.publicVerification,
      `${path}.publicVerification`,
    ),
  };
}

export function parseLocalizedContent(value: unknown): LocalizedContentIndex {
  const root = requireRecord(value, "root");
  if (!Number.isInteger(root.schemaVersion) || Number(root.schemaVersion) < 1) {
    fail("root.schemaVersion", "expected a positive integer");
  }
  if (!Array.isArray(root.articles)) fail("root.articles", "expected an array");
  if (root.articles.length === 0) {
    fail("root.articles", "expected at least one article");
  }

  const sourceIds = new Set<string>();
  const logNos = new Set<string>();
  const localeSlugs = new Map<Locale, Set<string>>(
    SUPPORTED_LOCALES.map((locale) => [locale, new Set<string>()]),
  );
  const articles = root.articles.map((value, index) => {
    const path = `root.articles[${index}]`;
    const article = requireRecord(value, path);
    const sourceId = requireString(article.sourceId, `${path}.sourceId`);
    if (sourceIds.has(sourceId)) fail(`${path}.sourceId`, "must be unique");
    sourceIds.add(sourceId);

    const localeRecords = requireRecord(article.locales, `${path}.locales`);
    const locales = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => {
        const parsed = parseLocale(
          localeRecords[locale],
          `${path}.locales.${locale}`,
        );
        const seen = localeSlugs.get(locale)!;
        if (seen.has(parsed.slug)) {
          fail(`${path}.locales.${locale}.slug`, "must be unique per locale");
        }
        seen.add(parsed.slug);
        return [locale, parsed];
      }),
    ) as Record<Locale, ArticleLocale>;

    const logNo = requireString(article.logNo, `${path}.logNo`);
    if (logNos.has(logNo)) fail(`${path}.logNo`, "must be unique");
    logNos.add(logNo);

    return {
      sourceId,
      logNo,
      category: requireString(article.category, `${path}.category`),
      sourceUrl: requireUrl(article.sourceUrl, `${path}.sourceUrl`),
      publishedAt: requireDate(article.publishedAt, `${path}.publishedAt`),
      image: requireNaverThumbnailUrl(article.image, `${path}.image`),
      imageAlt: parseLocalizedStrings(article.imageAlt, `${path}.imageAlt`),
      work: requireString(article.work, `${path}.work`),
      subject: requireString(article.subject, `${path}.subject`),
      sourceHash: optionalHash(article.sourceHash, `${path}.sourceHash`),
      sources: parseSources(article.sources, `${path}.sources`),
      facts: parseFacts(article.facts, `${path}.facts`),
      locales,
    };
  });

  return {
    schemaVersion: Number(root.schemaVersion),
    generatedAt: requireDate(root.generatedAt, "root.generatedAt"),
    articles,
  };
}

export const localizedContent = parseLocalizedContent(rawContent);
export const localizedArticles = localizedContent.articles;

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localizedArticlePath(article: LocalizedArticle, locale: Locale) {
  return `/${locale}/news/${article.locales[locale].slug}`;
}

export function getLocalizedArticle(locale: Locale, slug: string) {
  return localizedArticles.find(
    (article) => article.locales[locale].slug === slug,
  );
}

export function getLocalizedAlternates(article: LocalizedArticle) {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      localizedArticlePath(article, locale),
    ]),
  ) as Record<Locale, string>;
}

function normalizeVerifiedUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function hasLocalizedLocaleReleaseEvidence(
  article: LocalizedArticle,
  locale: Locale,
) {
  const localized = article.locales[locale];
  const verification = localized.publicVerification;
  const expectedUrl = absoluteUrl(localizedArticlePath(article, locale));
  return Boolean(
    localized.status === "ready" &&
      localized.robots === "index,follow" &&
      article.sourceHash &&
      localized.translatedFromSourceHash === article.sourceHash &&
      verification?.status === "verified" &&
      verification.httpStatus === 200 &&
      verification.checkedAt &&
      normalizeVerifiedUrl(verification.resolvedUrl) ===
        normalizeVerifiedUrl(expectedUrl),
  );
}

export function getReadyLocales(article: LocalizedArticle) {
  return SUPPORTED_LOCALES.filter((locale) =>
    hasLocalizedLocaleReleaseEvidence(article, locale),
  );
}

export function isLocalizedLocaleReady(
  article: LocalizedArticle,
  locale: Locale,
) {
  return (
    hasLocalizedLocaleReleaseEvidence(article, locale) &&
    getReadyLocales(article).length >= 2
  );
}

export function getReadyLocalizedArticles(locale: Locale) {
  return localizedArticles.filter((article) =>
    isLocalizedLocaleReady(article, locale),
  );
}

export function getReadyArticleAlternates(article: LocalizedArticle) {
  const locales = getReadyLocales(article);
  if (locales.length < 2) return null;
  const paths = Object.fromEntries(
    locales.map((locale) => [locale, localizedArticlePath(article, locale)]),
  ) as Partial<Record<Locale, string>>;
  const defaultLocale = locales.includes("ko") ? "ko" : locales[0];
  return {
    ...paths,
    "x-default": paths[defaultLocale]!,
  };
}

export function getRelatedLocalizedArticles(
  article: LocalizedArticle,
  locale?: Locale,
  limit = 3,
) {
  return localizedArticles
    .filter(
      (candidate) =>
        candidate.sourceId !== article.sourceId &&
        (!locale || isLocalizedLocaleReady(candidate, locale)),
    )
    .sort((left, right) => {
      const leftScore =
        Number(left.work === article.work) * 2 +
        Number(left.category === article.category);
      const rightScore =
        Number(right.work === article.work) * 2 +
        Number(right.category === article.category);
      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function getLocalizedDate(value: string, locale: Locale) {
  const localeTag = { ko: "ko-KR", en: "en-US", ja: "ja-JP" }[locale];
  return new Intl.DateTimeFormat(localeTag, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function getLocalizedSourceName(
  source: LocalizedSource,
  locale: Locale,
) {
  return source.names?.[locale] ?? source.name;
}
