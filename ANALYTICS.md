# 썬데스크 측정 계획

## 목적

Vercel Web Analytics로 어떤 페이지가 방문을 만들고, 그 방문이 실제 네이버
원문 열람으로 이어지는지 확인합니다. 개별 방문자의 행동을 재구성하는 로그가
아니라 익명 집계 지표만 사용합니다.

## 핵심 지표

- 페이지별 방문자와 페이지뷰
- 네이버 원문 클릭 수와 클릭 방문자
- 글별·분류별 원문 클릭 수
- 네이버 블로그 프로필 이동 수
- 아카이브 검색 사용량

## 이벤트

| 이벤트 | 의미 | 속성 | 발생 조건 |
| --- | --- | --- | --- |
| `pageview` | 페이지 열람 | Vercel 자동 수집 항목 | 모든 썬데스크 운영 페이지 |
| `article_outbound_clicked` | 네이버 글 원문 열기 | `article_id`, `category` | 카드 이미지·제목·원문 읽기 또는 아카이브 제목 클릭 |
| `naver_profile_clicked` | 네이버 블로그 홈 열기 | `placement` | 헤더·푸터의 네이버 블로그 링크 클릭 |
| `archive_search_submitted` | 아카이브 검색 실행 | `category`, `has_query` | 검색 폼 제출 |
| `localized_article_opened` | 언어 허브에서 번역 기사 열기 | `article_id`, `locale` | 번역 기사 카드 클릭 |
| `localized_article_outbound_clicked` | 번역 기사에서 네이버 원문 열기 | `article_id`, `locale` | 언어별 상세 페이지 원문 CTA 클릭 |
| `language_version_clicked` | 표시 언어 변경 | `from_locale`, `to_locale` | 전역 또는 기사별 언어 선택 클릭 |
| `coupang_banner_clicked` | 쿠팡 파트너스 배너 열기 | `placement`, `variant` (`category:size`) | 홈·데스크·한국어 상세의 가로 배너 클릭 |

## 개인정보와 데이터 품질

- 이름, 이메일, IP, 사용자 ID를 이벤트 속성으로 보내지 않습니다.
- 검색어 원문은 이벤트로 보내지 않으며 페이지뷰 URL에서도 `q` 값을 제거합니다.
- 글 제목 대신 공개 글 번호인 `article_id`를 사용합니다.
- 운영 주소에만 분석 스크립트를 삽입하며 GitHub 이전 주소에는 삽입하지 않습니다.

## 보는 방법

Vercel의 `sunstar-content-hub` 프로젝트에서 **Analytics**를 열어 페이지 지표를
확인하고, **Events**에서 위 커스텀 이벤트를 선택합니다.
`article_id`와 `category`로 나누면 어떤 글과 분야가 네이버 원문 유입을 만드는지
볼 수 있습니다.

주간 검토 시에는 조회수만 보지 말고
`article_outbound_clicked 방문자 / 해당 페이지 방문자`를 원문 이동률로 함께
비교합니다.
