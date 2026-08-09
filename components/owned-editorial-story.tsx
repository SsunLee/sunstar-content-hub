import type { Locale } from "@/lib/localized-content";
import type { OwnedArticle, OwnedGalleryImage } from "@/lib/owned-content";
import { Fragment } from "react";

import { KakaoAdFitBanner } from "@/components/kakao-adfit-banner";

const OWNED_COPY = {
  ko: {
    original: "SS.Desk 자체 취재·편집 원고",
    rights: "사진 출처와 이용 조건",
    research: "확인한 자료",
    photo: "사진",
    rightsNote: "Wikimedia Commons 원본 파일을 변경 없이 표시합니다. 저작자와 개별 CC·CC0 조건은 각 사진 캡션에서 확인할 수 있습니다.",
  },
  en: {
    original: "Original reporting and editing by SS.Desk",
    rights: "Image sources and licenses",
    research: "Research sources",
    photo: "Photo",
    rightsNote: "Original files from Wikimedia Commons are displayed without editorial alteration. Creator credits and individual CC or CC0 terms appear with every photograph.",
  },
  ja: {
    original: "SS.Deskによる独自取材・編集記事",
    rights: "写真の出典とライセンス",
    research: "確認資料",
    photo: "写真",
    rightsNote: "Wikimedia Commonsの原本を編集せずに表示しています。撮影者と個別のCC・CC0条件は各写真のキャプションで確認できます。",
  },
} as const;

function EditorialFigure({
  image,
  index,
  locale,
  hero = false,
}: {
  image: OwnedGalleryImage;
  index: number;
  locale: Locale;
  hero?: boolean;
}) {
  const copy = image.locales[locale];
  const labels = OWNED_COPY[locale];

  return (
    <figure className={hero ? "owned-figure owned-figure-hero" : "owned-figure"}>
      <div className="owned-image-frame">
        {/* Local originals preserve the Commons file and reserve dimensions for CLS. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          width={image.width}
          height={image.height}
          alt={copy.alt}
          loading={hero ? "eager" : "lazy"}
          fetchPriority={hero ? "high" : "auto"}
        />
        <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <figcaption>
        <p>{copy.caption}</p>
        <small>
          {labels.photo}: {" "}
          <a href={image.sourcePage} target="_blank" rel="noopener noreferrer">
            {image.creator}
          </a>{" "}
          · {" "}
          <a href={image.licenseUrl} target="_blank" rel="license noopener noreferrer">
            {image.licenseName}
          </a>
        </small>
      </figcaption>
    </figure>
  );
}

export function OwnedEditorialStory({
  article,
  locale,
}: {
  article: OwnedArticle;
  locale: Locale;
}) {
  const labels = OWNED_COPY[locale];
  const copy = article.locales[locale];
  const imageGroups = [
    article.gallery.slice(1, 2),
    article.gallery.slice(2, 4),
    article.gallery.slice(4, 6),
    article.gallery.slice(6, 8),
    article.gallery.slice(8, 10),
  ];

  return (
    <>
      <div className="page-shell owned-hero">
        <EditorialFigure image={article.gallery[0]} index={0} locale={locale} hero />
      </div>

      <div className="page-shell owned-article-layout">
        <div className="owned-article-body">
          {copy.body.map((section, sectionIndex) => (
            <Fragment key={section.heading}>
              <section className="owned-story-section">
                <div className="owned-section-copy">
                  <span aria-hidden="true">0{sectionIndex + 1}</span>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div
                  className={
                    imageGroups[sectionIndex].length > 1
                      ? "owned-gallery-pair"
                      : "owned-gallery-single"
                  }
                >
                  {imageGroups[sectionIndex].map((image) => {
                    const imageIndex = article.gallery.indexOf(image);
                    return (
                      <EditorialFigure
                        key={image.src}
                        image={image}
                        index={imageIndex}
                        locale={locale}
                      />
                    );
                  })}
                </div>
              </section>
              {locale === "ko" && sectionIndex === 0 ? (
                <KakaoAdFitBanner
                  placement="ko-article-first"
                  className="localized-article-adfit"
                />
              ) : null}
              {locale === "ko" && sectionIndex === copy.body.length - 1 ? (
                <KakaoAdFitBanner
                  placement="ko-article-second"
                  className="localized-article-adfit"
                />
              ) : null}
            </Fragment>
          ))}
        </div>

        <aside className="owned-source-panel">
          <p className="owned-original-mark">{labels.original}</p>
          <div>
            <h2>{labels.research}</h2>
            <ul>
              {article.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.names?.[locale] ?? source.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{labels.rights}</h2>
            <p>{labels.rightsNote}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
