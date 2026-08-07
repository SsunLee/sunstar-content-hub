# 쿠팡 파트너스 배너 운영 설정

과거 썬데스크는 쿠팡 파트너스 배너를 프록시 위젯
(`coupang-partners-banner.vercel.app`)으로 연결했다가 제거한 이력이
있습니다. 그 통합은 완전히 폐기되었고, 지금 이 문서가 다루는 건 **사용자가
직접 요청·전달한 쿠팡 공식 배너 코드**만 심는 새 통합입니다. 쿠팡이 공식
제공하는 스크립트(`https://ads-partners.coupang.com/g.js` +
`PartnersCoupang.G(...)`)를 그대로 사용하며, 대체 프록시나 예시 코드는
넣지 않습니다.

카카오 애드핏(`ssundesk.com` 원본 페이지)이나 스폰서 이미지
배너([SPONSOR-BANNER.md](SPONSOR-BANNER.md))와 마찬가지로 값이 없으면
아무것도 출력하지 않는 fail-closed 방식이며, 일부만 채우면 배포가
실패합니다.

## 노출 위치

다국어(ko/en/ja) 페이지에만 적용됩니다. 현재는 `home-after-lead`
(각 언어 홈, 주요 기사 뒤) 한 곳만 실제로 연결되어 있고, 나머지 5곳은
카카오 애드핏·스폰서 배너와 동일한 이름 규칙으로 코드에 준비만 되어 있어
필요할 때 값만 추가하면 됩니다.

| 위치 | 페이지 | 환경 변수 접두어 | 연결 상태 |
| --- | --- | --- | --- |
| 홈 주요 기사 뒤 | `/{locale}` | `COUPANG_PARTNERS_HOME_AFTER_LEAD` | 연결됨 |
| 홈 연예·주식 사이 | `/{locale}` | `COUPANG_PARTNERS_HOME_BETWEEN_DESKS` | 미연결 |
| 연예 데스크 주요 기사 뒤 | `/{locale}/entertainment` | `COUPANG_PARTNERS_ENTERTAINMENT_DESK` | 미연결 |
| 주식 데스크 주요 기사 뒤 | `/{locale}/stocks` | `COUPANG_PARTNERS_STOCKS_DESK` | 미연결 |
| 연예 상세 본문 뒤 | `/{locale}/news/:slug` (연예) | `COUPANG_PARTNERS_ENTERTAINMENT_ARTICLE` | 미연결 |
| 주식 상세 본문 뒤 | `/{locale}/news/:slug` (주식) | `COUPANG_PARTNERS_STOCKS_ARTICLE` | 미연결 |

## 활성화

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

쿠팡의 `PartnersCoupang.G(...)` 위젯은 자신을 호출한 `<script>` 태그의
DOM 위치를 기준으로 스스로 자리를 잡는 방식이라, 카카오 애드핏처럼
클라이언트에서 나중에 스크립트를 동적으로 주입하는 방식(`adfit-loader.js`)이
아니라 **서버 렌더링 시점에 정확히 그 위치에 두 `<script>` 태그를 그대로
출력**합니다([components/coupang-partners-banner.tsx](components/coupang-partners-banner.tsx)).
한 페이지에 이 배너를 두 곳 이상 쓰게 되면 SDK 스크립트(`g.js`)를 중복
로드하지 않도록 추가 작업이 필요합니다 — 지금은 위치당 최대 1곳만 실제로
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
