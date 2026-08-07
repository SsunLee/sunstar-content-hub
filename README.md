# 썬데스크

네이버 블로그 `tnsqo1126`의 공개 글을 연예·주식·기록으로 분류하고, 원문으로 연결하는 독립 콘텐츠 허브입니다.

브랜드 표기는 `썬데스크`, 영문 워드마크는 `SS.Desk`입니다. 검정 바탕의 겹쳐진 `SS`가 `.Desk`로 이어지는 로고는 `public/brand/ssdesk-logo-v1.png`에 있으며, 소셜 공유에는 와이드 버전 `public/brand/ssdesk-og-v1.png`, 검색용 파비콘에는 작은 크기에 맞춘 `SS` 심벌을 사용합니다.

## 구성

- 공개 글 전체의 제목·날짜·정규 URL 동기화
- 연예 데스크와 주식 데스크
- 제목·배우·작품·종목명·종목코드 검색
- 50건 단위로 자동 확장되는 전체 아카이브
- 한국어·영어·일본어 기사 허브와 언어별 고유 URL
- 언어별 canonical, 상호 `hreflang`, `x-default`, NewsArticle JSON-LD
- `robots.txt`, `sitemap.xml`, Open Graph, JSON-LD
- Bing용 IndexNow 키와 제출 스크립트

## 로컬 실행

```bash
npm install
npm run sync:naver
npm run dev
```

프로덕션 검증:

```bash
npm test
npm run lint
npm run test:static
npm run test:vercel
```

## 콘텐츠 동기화

```bash
npm run sync:naver
```

`scripts/sync-naver.mjs`가 네이버 공개 목록과 RSS, 로컬 canonical 자료를 결합해 다음 파일을 갱신합니다.

- `data/posts.json`: 서버 렌더링용 원본
- `public/posts.json`: 공개 데이터 사본

기본키는 `naver:tnsqo1126:{logNo}`이며, 공개 목록에 없는 로컬 초안은 포함하지 않습니다.

다국어 기사는 `data/localized-articles.json`에서 관리합니다. 각 기사는
`ko`, `en`, `ja` 본문을 모두 갖춰야 공개되며 `/ko`, `/en`, `/ja` 허브와
`/{locale}/news/{slug}` 상세 페이지로 정적 생성됩니다. 브라우저 언어에 따른
강제 이동은 하지 않고 사용자가 화면의 언어 선택기를 사용합니다.

다국어 카드도 한국어 메인과 같은 공개 네이버 썸네일 URL을 사용합니다. 각
기사의 `imageAlt`에는 `ko`·`en`·`ja` 설명을 모두 기록하고, 외부 이미지 요청은
referrer 정보를 보내지 않습니다. 상세 기사의 공유 이미지는 SS.Desk 자체
브랜드 자산을 유지합니다.

새 언어판은 기본적으로 `draft`와 `noindex,nofollow`로 처리됩니다. 원문
`sourceHash`와 언어판 `translatedFromSourceHash`가 같고, `status: ready`,
`robots: index,follow`, 정확한 공개 URL의 HTTP 200 검증 기록이 모두 있어야만
release evidence가 됩니다. 같은 기사에서 이런 언어판이 2개 이상이고 상호
`hreflang` 클러스터가 완성돼야 실제 indexable 상태가 되며, 그 전에는 단일
언어판을 `ready`로 표시했더라도 사이트맵과 IndexNow에 포함하지 않습니다.

연예·주식 목록 번역은 `data/localized-post-index.json`의 번역 스냅샷으로
관리합니다. `translationLag.policy`는 `newer-source-posts-only`이며, 번역
스냅샷의 `sourceGeneratedAt`보다 새로운 동기화에서 처음 관측된 네이버 글만
일시적으로 영어·일본어 목록에서 빠질 수 있습니다. 게시 시각이 앞서더라도
네이버 목록 반영이 늦어 뒤늦게 수집된 글은 같은 방식으로 안전하게 대기합니다.
이런 글은 한국어 목록에는 즉시 반영되고, 번역이 추가된 뒤 영어·일본어 목록에
노출됩니다. 기준 스냅샷 자체의 누락,
이미 번역된 글의 제목·요약·작품·역할 변경, 원문 해시 불일치는 release 게이트를
계속 실패시키므로 번역 지연을 원문 변조나 과거 누락을 숨기는 용도로 사용할 수
없습니다. 현재 번역 스냅샷은 연예 107건과 주식 60건, 총 167건입니다.

### 자동 업데이트 배치

`.github/workflows/sync-naver.yml`이 2시간마다 네이버 공개 목록과 RSS를
동기화합니다. 수집 결과를 검증한 뒤 실제 변경이 있을 때만
`data/posts.json`과 `public/posts.json`을 커밋하며, `main` 푸시를 감지한
Vercel이 새 정적 사이트를 배포합니다. GitHub Actions의 `Run workflow`로
수동 실행할 수도 있습니다.

수집 건수가 네이버가 알린 전체 건수와 다르거나 기존 공개 글이 하나라도
사라진 경우에는 기존 데이터를 덮어쓰지 않고 실패합니다. 삭제·비공개
전환이 의도된 경우에만 공개 목록을 직접 확인한 뒤 로컬에서
`ALLOW_REMOVALS=1`로 실행합니다.

## 배포 환경 변수

최종 공개 주소는 `https://ssundesk.com`입니다. `NEXT_PUBLIC_SITE_URL`로 배포별 주소를 명시할 수 있으며, canonical, Open Graph, sitemap, robots의 호스트가 함께 바뀝니다.

GitHub Pages의 기존 검색 URL은 다음 명령으로 `docs/`에 생성합니다. 모든 생성
경로는 같은 경로의 `ssundesk.com` 주소로 즉시 이전되며, 0초 meta refresh와
canonical을 함께 사용합니다.

```bash
npm run export:static
```

Vercel 주 배포용 루트 정적 사이트는 다음 명령으로 `vercel-dist/`에 생성합니다. 기본값과 프로덕션 환경 변수 모두 `https://ssundesk.com`을 사용합니다.

```bash
npm run export:vercel
```

Vercel 프로젝트는 저장소의 `vercel.json`에 따라 `npm run test:release`를
실행합니다. 이 게이트가 번역 manifest·수치 대응·정적 산출물·lint를 모두
통과한 뒤 내부적으로 `npm run export:vercel`로 만든 `vercel-dist/`를
배포합니다. GitHub Pages의 `docs/`는 기존 검색 URL의 이전 신호로 최소 1년
유지하고, 별도 Sites 배포를 운영 백업으로 유지합니다.

공개 배포와 키 파일의 `200` 응답을 확인한 뒤에만 다음 명령으로 허브 URL을 IndexNow에 제출합니다.

```bash
npm run submit:indexnow
```

네이버 원문 URL은 이 사이트가 소유한 호스트가 아니므로 IndexNow 제출 대상에 포함하지 않습니다.

## 광고 운영

카카오 애드핏은 `ssundesk.com` 매체에서 발급된 실제 광고 단위가 등록된
위치에만 표시되며, 값이 없으면 광고 마크업과 외부 SDK를 모두 출력하지
않습니다. 최초 매체 등록과 Vercel 환경 변수, 광고 위치별 설정은
[ADFIT.md](./ADFIT.md)를 따릅니다.

다국어(ko/en/ja) 페이지에는 별도로 스폰서 이미지 배너([SPONSOR-BANNER.md](./SPONSOR-BANNER.md))와
쿠팡 파트너스 배너([COUPANG-PARTNERS.md](./COUPANG-PARTNERS.md))를 등록할 수
있습니다. 둘 다 값이 없으면 아무것도 출력하지 않는 동일한 fail-closed
방식입니다.

## 편집 원칙

허브는 네이버 원문 전체를 복제하지 않습니다. 공개·검색 허용, RSS 검증,
대표 이미지와 태그, 요약 120자 이상, 본문 3개 섹션·가시 텍스트 500자 이상을
모두 충족한 연예·주식 글만 `/news/{logNo}` 요약 아카이브로 생성합니다. 이
페이지는 원문의 핵심 문단을 최대 6개까지 선별·구조화하고, 전체 본문과 이미지는
깨끗한 네이버 permalink에서 읽도록 안내합니다. 나머지 글은 기존처럼 제목과
일반 링크만 제공합니다. 주식 콘텐츠는 정보 제공 목적이며 투자 권유가 아닙니다.
