# 카카오 애드핏 운영 설정

카카오 애드핏은 `ssundesk.com`을 별도 Web 매체로 등록하고, 그 매체에서 생성한
실제 광고 단위만 사용합니다. 다른 사이트의 `DAN-...` 코드나 예시 코드는 넣지
않습니다.

쿠팡 파트너스는 사용자가 직접 요청해 준 실제 배너 코드에 한해서만
등록합니다 — 자세한 내용은 [COUPANG-PARTNERS.md](COUPANG-PARTNERS.md)를
참고하세요.

## 최초 활성화

1. 카카오 애드핏에서 `ssundesk.com` Web 매체를 등록합니다.
2. 홈 최상단용 광고 단위를 데스크톱 `728x90`, 모바일 `320x100`으로 각각
   만듭니다. 한 화면에서는 현재 폭에 맞는 단위 하나만 요청합니다.
3. 광고 단위의 **스크립트 보기**에서 `DAN-...`, `data-ad-width`,
   `data-ad-height`, SDK 스크립트 URL을 그대로 확인합니다.
4. Vercel Production 환경에 아래 첫 단위와 기능 플래그를 등록합니다.
5. 배포가 정상 완료되면 본인 광고 클릭 없이 광고 요청과 애드핏 심사 상태만
   확인합니다.

```text
KAKAO_ADFIT_ENABLED=1
KAKAO_ADFIT_SCRIPT_URL=<스크립트 보기에서 제공된 최신 URL>
KAKAO_ADFIT_HEADER_DESKTOP_UNIT=<728x90 DAN 코드>
KAKAO_ADFIT_HEADER_DESKTOP_WIDTH=728
KAKAO_ADFIT_HEADER_DESKTOP_HEIGHT=90
KAKAO_ADFIT_HEADER_MOBILE_UNIT=<320x100 DAN 코드>
KAKAO_ADFIT_HEADER_MOBILE_WIDTH=320
KAKAO_ADFIT_HEADER_MOBILE_HEIGHT=100
```

값이 없을 때는 광고 DOM과 SDK를 모두 출력하지 않습니다. 기능을 켰지만 SDK
URL이나 단위의 코드·크기가 잘못되면 배포를 실패시켜 빈 광고나 임시 광고가
운영에 노출되지 않게 합니다.

## 추가 광고 위치

각 위치는 단위 코드·너비·높이 세 값을 한 묶음으로 등록합니다. 일부 위치만
등록해도 되며, 등록하지 않은 위치는 렌더링하지 않습니다.

| 위치 | 환경 변수 접두어 |
| --- | --- |
| 홈 최상단 데스크톱 | `KAKAO_ADFIT_HEADER_DESKTOP` |
| 홈 최상단 모바일 | `KAKAO_ADFIT_HEADER_MOBILE` |
| `/ko` 홈 로고 오른쪽 상단 데스크톱 | `KAKAO_ADFIT_KO_HOME_FIRST_DESKTOP` |
| `/ko` 홈 로고 아래 상단 모바일 | `KAKAO_ADFIT_KO_HOME_FIRST_MOBILE` |
| `/ko` 홈 주식 섹션 뒤 데스크톱 | `KAKAO_ADFIT_KO_HOME_SECOND_DESKTOP` |
| `/ko` 홈 주식 섹션 뒤 모바일 | `KAKAO_ADFIT_KO_HOME_SECOND_MOBILE` |
| `/ko` 기사 본문 첫 구간 뒤 | `KAKAO_ADFIT_KO_ARTICLE_FIRST` |
| `/ko` 기사 본문 말미 | `KAKAO_ADFIT_KO_ARTICLE_SECOND` |
| 홈 주요 기사 뒤 | `KAKAO_ADFIT_HOME_AFTER_LEAD` |
| 홈 연예·주식 사이 | `KAKAO_ADFIT_HOME_BETWEEN_DESKS` |
| 연예 데스크 주요 기사 뒤 | `KAKAO_ADFIT_ENTERTAINMENT_DESK` |
| 주식 데스크 주요 기사 뒤 | `KAKAO_ADFIT_STOCKS_DESK` |
| 연예 상세 핵심 요약 뒤 | `KAKAO_ADFIT_ENTERTAINMENT_ARTICLE` |
| 주식 상세 핵심 요약 뒤 | `KAKAO_ADFIT_STOCKS_ARTICLE` |

예를 들어 접두어가 `KAKAO_ADFIT_STOCKS_DESK`라면 다음 세 변수를 사용합니다.

```text
KAKAO_ADFIT_STOCKS_DESK_UNIT=<DAN 코드>
KAKAO_ADFIT_STOCKS_DESK_WIDTH=<스크립트의 data-ad-width>
KAKAO_ADFIT_STOCKS_DESK_HEIGHT=<스크립트의 data-ad-height>
```

현재 코드는 카카오 애드핏 콘솔에서 확인한 `300x250`, `320x100`, `320x50`,
`728x90`만 허용합니다. 콘솔에서 다른 크기를 제공하면 임의로 확대·축소하지
말고 코드의 허용 크기를 함께 검토합니다.

## 노출 원칙

- 루트 홈에서는 최상단에 현재 화면 폭에 맞는 광고 하나만 표시합니다.
- `/ko` 홈은 로고 옆 상단과 주식 섹션 뒤에 2개, `/ko/news/*` 기사는
  본문을 세 구간으로 나누는 약 1/3·2/3 지점에 2개를 표시합니다. `/en`, `/ja`, 아카이브·소개
  페이지에는 표시하지 않습니다.
- `/ko`의 기존 쿠팡 파트너스 광고 위치와 설정은 애드핏과 독립적으로
  유지합니다.
- 광고를 링크로 감싸거나 클릭을 자체 추적하지 않습니다. 성과는 애드핏
  대시보드에서 확인합니다.
- SDK는 광고가 실제 구성된 운영 페이지에서만 한 번 로드합니다.
- 광고가 채워지지 않거나 SDK가 실패하면 광고 영역 전체를 숨깁니다.
- 자동 클릭, 본인 테스트 클릭, 임의 새로고침 타이머를 사용하지 않습니다.

공식 안내:

- [카카오 애드핏 매체 관리](https://kakaobusiness.gitbook.io/main/partner/adfit/start/media-manage)
- [카카오 애드핏 광고 관리](https://kakaobusiness.gitbook.io/main/partner/adfit/start/ad-manage)
- [카카오 애드핏 운영정책](https://adfit.kakao.com/web/html/use_kakao.html)
