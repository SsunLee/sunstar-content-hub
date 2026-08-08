# 쿠팡 파트너스 배너 운영 설정

썬데스크는 두 가지 쿠팡 관련 통합을 씁니다. 사용자가 직접 요청·전달한
코드에 한해서만 등록하며, 둘 다 값이 없으면 아무것도 출력하지 않는
fail-closed 방식입니다.

1. **쿠팡 공식 배너 위젯** — 쿠팡이 공식 제공하는 스크립트
   (`https://ads-partners.coupang.com/g.js` + `PartnersCoupang.G(...)`).
   [components/coupang-partners-banner.tsx](components/coupang-partners-banner.tsx).
2. **쿠팡 카테고리 위젯** — 사용자 본인이 직접 운영하는 프록시 위젯
   (`https://coupang-partners-banner.vercel.app/widget.js`). 카테고리·키워드
   기반으로 상품을 순환 노출하는 위젯입니다.
   [components/coupang-category-widget.tsx](components/coupang-category-widget.tsx).
   이 프록시는 한 번 제거됐다가 본인 서비스가 맞다는 확인을 받고 다시
   연결했습니다 — `coupang-partners-banner.vercel.app` 자체는 더 이상
   금지 대상이 아니며, `tests/kakao-adfit.test.mjs`에는 옛 구현(제거된
  `coupang_banner_clicked`/`coupang-interlude` 마크업)만 금지 목록으로
   남아 있습니다.

카카오 애드핏(`ssundesk.com` 원본 페이지)이나 스폰서 이미지
배너([SPONSOR-BANNER.md](SPONSOR-BANNER.md))와 마찬가지로 값이 없으면
아무것도 출력하지 않는 fail-closed 방식이며, 일부만 채우면 배포가
실패합니다.

## 노출 위치

다국어(ko/en/ja) 페이지에만 적용됩니다. 6개 위치 모두 연결되어 있으며,
`home-after-lead`는 공식 배너 위젯을, 나머지 5곳은 카테고리 위젯을
씁니다.

| 위치 | 페이지 | 통합 | 환경 변수 접두어 |
| --- | --- | --- | --- |
| 홈 주요 기사 뒤 | `/{locale}` | 공식 배너 위젯 | `COUPANG_PARTNERS_HOME_AFTER_LEAD` |
| 홈 연예·주식 사이 | `/{locale}` | 카테고리 위젯 | `COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS` |
| 연예 데스크 주요 기사 뒤 | `/{locale}/entertainment` | 카테고리 위젯 | `COUPANG_CATEGORY_WIDGET_ENTERTAINMENT_DESK` |
| 주식 데스크 주요 기사 뒤 | `/{locale}/stocks` | 카테고리 위젯 | `COUPANG_CATEGORY_WIDGET_STOCKS_DESK` |
| 연예 상세 본문 뒤 | `/{locale}/news/:slug` (연예) | 카테고리 위젯 | `COUPANG_CATEGORY_WIDGET_ENTERTAINMENT_ARTICLE` |
| 주식 상세 본문 뒤 | `/{locale}/news/:slug` (주식) | 카테고리 위젯 | `COUPANG_CATEGORY_WIDGET_STOCKS_ARTICLE` |

## 카테고리 위젯 활성화

```text
COUPANG_CATEGORY_WIDGET_ENABLED=1
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_PARTNER_ID=AF8916827
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_SOURCE=best-category
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_KEYWORD=주방가전
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_CATEGORY_ID=1016
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_BRAND_ID=1001
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_LIMIT=20
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_IMAGE_SIZE=512x512
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_THEME=light
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_ROTATION=60
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_WIDTH=728
COUPANG_CATEGORY_WIDGET_HOME_BETWEEN_DESKS_HEIGHT=250
```

11개 값을 모두 한 묶음으로 등록해야 하며, `entertainment-desk` 등 다른
위치는 접두어만 바꿔 동일한 11개 변수를 각각 등록합니다. 위치마다 다른
`KEYWORD`/`CATEGORY_ID`/`BRAND_ID`를 넣어 문맥에 맞는 카테고리로 바꿀 수
있습니다.

## 공식 배너 위젯 활성화

```text
COUPANG_PARTNERS_ENABLED=1
COUPANG_PARTNERS_HOME_AFTER_LEAD_ID=<쿠팡이 발급한 숫자 id>
COUPANG_PARTNERS_HOME_AFTER_LEAD_TRACKING_CODE=<AF로 시작하는 트래킹 코드>
COUPANG_PARTNERS_HOME_AFTER_LEAD_TEMPLATE=<쿠팡 위젯 template 값, 예: banner>
COUPANG_PARTNERS_HOME_AFTER_LEAD_WIDTH=<위젯 width>
COUPANG_PARTNERS_HOME_AFTER_LEAD_HEIGHT=<위젯 height>
```

다섯 값을 한 묶음으로 등록해야 합니다. id는 숫자, 트래킹 코드는
`AF########` 형태, width/height는 숫자만 허용합니다.

## 구현 방식 메모

이 프레임워크(vinext/React 서버 렌더링)는 컴포넌트가 직접 쓴 `<script>`
JSX 태그를 서버 렌더링 결과물에 출력하지 않습니다. 그래서 두 위젯 모두
컴포넌트는 필요한 값을 `data-*` 속성으로만 내보내고, 실제 `<script>`
태그는 카카오 애드핏(`adfit-loader.js`)과 같은 방식으로 클라이언트
로더가 동적으로 주입합니다
([public/coupang-partners-loader.js](public/coupang-partners-loader.js),
[public/coupang-category-widget-loader.js](public/coupang-category-widget-loader.js)).

또한 두 위젯 모두 자신이 만든 광고 요소(`<ins>` 등)를 호출 스크립트의
DOM 위치가 아니라 **`<body>` 최하단에 직접 삽입**하는 것으로 실측
확인됐습니다. 그래서 두 로더 모두 `MutationObserver`로 `<body>`에
새로 추가되는 요소를 감지해 의도한 자리(placeholder 컨테이너)로
옮깁니다. 실제 배포 후 라이브에서 `iframe`이 컨테이너 안에 들어갔는지
직접 확인하는 절차를 거쳤습니다.

한 페이지에 같은 위젯을 두 곳 이상 쓰게 되면 SDK 스크립트 중복 로드를
막는 추가 작업이 필요합니다 — 지금은 페이지마다 각 위젯이 최대 1곳만
연결되어 있어 해당하지 않습니다.

## 법적 표시 의무

쿠팡 파트너스 운영정책상 배너 인접 위치에 활동 고지 문구가 필요합니다.
컴포넌트가 배너 바로 아래에 언어별 고지 문구를 자동으로 함께 출력합니다
(한국어: "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의
수수료를 제공받습니다."). 문구를 임의로 지우거나 숨기지 않습니다.

## 노출 원칙

- 자체 클릭 추적을 추가하지 않습니다. 성과는 쿠팡 파트너스 대시보드에서
  트래킹 코드로 확인합니다.
- 이미지·배너 자체를 임의로 확대·축소하지 않습니다. 쿠팡 콘솔이 제공하는
  width/height를 그대로 사용합니다.
- 자동 클릭, 본인 테스트 클릭을 하지 않습니다.
