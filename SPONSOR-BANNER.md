# 스폰서 배너 운영 설정

썬데스크의 다국어(ko/en/ja) 페이지에 특정 스폰서의 고정 이미지 배너를 노출하는
기능입니다. 광고 네트워크 SDK가 아니라 **이미지 하나 + 링크 하나**로 구성된
단순 배너이므로, 카카오 애드핏과 달리 외부 스크립트를 불러오지 않습니다.

쿠팡 파트너스는 사용하지 않습니다([ADFIT.md](ADFIT.md) 참고). 이 기능은 쿠팡
이외의 스폰서 배너 전용입니다.

## 노출 위치

카카오 애드핏과 동일한 6개 위치 개념을 그대로 사용하되, **한국어 원본
페이지(`/`, `/entertainment`, `/stocks`, `/news/:logNo`)가 아니라 다국어 페이지
(`/ko`, `/en`, `/ja`)에만** 적용됩니다. 한국어 원본 페이지는 이미 같은 자리에
카카오 애드핏이 있습니다.

| 위치 | 페이지 | 환경 변수 접두어 |
| --- | --- | --- |
| 홈 주요 기사 뒤 | `/{locale}` | `SPONSOR_BANNER_HOME_AFTER_LEAD` |
| 홈 연예·주식 사이 | `/{locale}` | `SPONSOR_BANNER_HOME_BETWEEN_DESKS` |
| 연예 데스크 주요 기사 뒤 | `/{locale}/entertainment` | `SPONSOR_BANNER_ENTERTAINMENT_DESK` |
| 주식 데스크 주요 기사 뒤 | `/{locale}/stocks` | `SPONSOR_BANNER_STOCKS_DESK` |
| 연예 상세 본문 뒤 | `/{locale}/news/:slug` (연예) | `SPONSOR_BANNER_ENTERTAINMENT_ARTICLE` |
| 주식 상세 본문 뒤 | `/{locale}/news/:slug` (주식) | `SPONSOR_BANNER_STOCKS_ARTICLE` |

## 활성화

1. 기능 플래그를 켭니다.

   ```text
   SPONSOR_BANNER_ENABLED=1
   ```

2. 노출할 위치마다 아래 다섯 변수를 **한 묶음**으로 등록합니다. 값이 없을 때는
   광고 DOM 자체를 출력하지 않습니다. 일부만 채우고 일부가 비어 있으면
   배포가 실패합니다(빈 배너나 깨진 배너가 노출되는 것을 막기 위함).

   ```text
   SPONSOR_BANNER_HOME_AFTER_LEAD_IMAGE_URL=<https 이미지 URL>
   SPONSOR_BANNER_HOME_AFTER_LEAD_LINK_URL=<https 랜딩 URL>
   SPONSOR_BANNER_HOME_AFTER_LEAD_ALT=<대체 텍스트 겸 스폰서명>
   SPONSOR_BANNER_HOME_AFTER_LEAD_WIDTH=300
   SPONSOR_BANNER_HOME_AFTER_LEAD_HEIGHT=250
   ```

3. 이미지 URL은 반드시 HTTPS여야 합니다. 크기는 다음 중 하나만 허용합니다:
   `300x250`, `320x100`, `320x50`, `728x90`, `160x600`, `250x250`. 스폰서가
   준 이미지가 이 비율이 아니면 임의로 늘리거나 줄이지 말고 스폰서에게 맞는
   크기를 다시 요청합니다.
4. 한 위치에 하나의 이미지만 등록됩니다(언어별로 다른 이미지를 쓰고 싶다면
   같은 자리 대신 별도 요청으로 알려주세요 — 지금 구조는 언어 공용
   이미지·링크에 "광고"/"SPONSORED"/"広告" 라벨만 언어별로 자동 표시합니다).

## 노출 원칙

- 링크는 `rel="noopener noreferrer sponsored"`로 열리며 새 탭에서 열립니다.
- 이미지에는 항상 스폰서 표시(광고/SPONSORED/広告)가 함께 노출되어 광고임을
  숨기지 않습니다.
- 클릭을 자체 추적하지 않고, `data-analytics-event="sponsor_banner_clicked"`
  속성만 남겨 기존 사이트 분석 파이프라인이 노출/클릭을 셀 수 있게 합니다.
- 자동 새로고침이나 임의 노출 조작을 하지 않습니다 — 정적으로 렌더링된
  이미지 하나가 페이지 로드 시 그대로 보입니다.
