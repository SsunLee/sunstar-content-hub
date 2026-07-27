# 쑨쑨 콘텐츠 데스크

네이버 블로그 `tnsqo1126`의 공개 글을 연예·주식·기록으로 분류하고, 원문으로 연결하는 독립 콘텐츠 허브입니다.

## 구성

- 공개 글 1,084건의 제목·날짜·정규 URL 동기화
- 연예 데스크와 주식 데스크
- 제목·배우·작품·종목명·종목코드 검색
- 50건 단위의 22페이지 전체 아카이브
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
```

## 콘텐츠 동기화

```bash
npm run sync:naver
```

`scripts/sync-naver.mjs`가 네이버 공개 목록과 RSS, 로컬 canonical 자료를 결합해 다음 파일을 갱신합니다.

- `data/posts.json`: 서버 렌더링용 원본
- `public/posts.json`: 공개 데이터 사본

기본키는 `naver:tnsqo1126:{logNo}`이며, 공개 목록에 없는 로컬 초안은 포함하지 않습니다.

## 배포 환경 변수

`NEXT_PUBLIC_SITE_URL`에 최종 공개 주소를 넣으면 canonical, Open Graph, sitemap, robots의 호스트가 함께 바뀝니다.

GitHub Pages용 정적 미러는 다음 명령으로 `docs/`에 생성합니다. 전체 26개 허브 경로를 HTML로 내보내며, 검색은 `public/posts.json`을 이용해 브라우저에서 동작합니다.

```bash
npm run export:static
```

공개 배포와 키 파일의 `200` 응답을 확인한 뒤에만 다음 명령으로 허브 URL을 IndexNow에 제출합니다.

```bash
npm run submit:indexnow
```

네이버 원문 URL은 이 사이트가 소유한 호스트가 아니므로 IndexNow 제출 대상에 포함하지 않습니다.

## 편집 원칙

허브는 네이버 원문 전체를 복제하지 않습니다. 제목, 공개일, 짧은 요약과 일반 링크를 제공하며 모든 본문 읽기는 깨끗한 네이버 permalink로 이어집니다. 주식 콘텐츠는 정보 제공 목적이며 투자 권유가 아닙니다.
