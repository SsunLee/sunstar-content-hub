import assert from "node:assert/strict";
import test from "node:test";

import {
  extractDetailSections,
  hasStrongDetailSections,
  validatePostViewIdentity,
} from "../scripts/sync-naver.mjs";

const post = {
  logNo: "224364909378",
  url: "https://blog.naver.com/tnsqo1126/224364909378",
  title: "테스트 A·B 핵심 정리",
  summary:
    "이 글은 자동 상세 페이지의 공개 요약이 올바르게 분리되는지 확인하기 위한 충분히 긴 도입 문단입니다. 제목과 사진 설명은 제외하고 실제 소제목과 본문만 선택해야 하며, 잘못된 네이버 응답은 기존 데이터를 덮어쓰지 않아야 합니다.",
};

function paragraph(value) {
  return `<p class="se-text-paragraph"><span>${value}</span></p>`;
}

function paragraphMarkup(value) {
  return `<p class="se-text-paragraph">${value}</p>`;
}

function postViewHtml({
  url = post.url,
  title = "테스트 A&middot;B 핵심 정리",
  robots = "index,follow",
} = {}) {
  const bodies = [
    "첫 번째 본문은 공개 원문에서 핵심 문단을 선별하는 동작을 확인합니다. 같은 글의 제목과 도입 요약을 다시 노출하지 않고, 독자가 내용을 이해할 만큼 충분한 길이의 실제 문단만 남겨야 합니다. 이 기준은 새 글을 수집할 때마다 동일하게 적용됩니다.",
    "두 번째 본문은 사진 출처나 차트 원자료 같은 설명 문구가 소제목으로 잘못 들어오지 않는지 점검합니다. 본문 텍스트는 유지하되 출처 캡션은 상세 섹션의 제목으로 사용할 수 없습니다. 숫자만 있는 차트 값도 같은 방식으로 제외합니다.",
    "세 번째 본문은 최소 섹션 수와 전체 가시 글자 수 기준을 함께 확인합니다. 조건을 모두 충족한 글만 독립 주소와 사이트맵, 검색 알림 대상에 포함되어야 합니다. 수집 결과가 부족하면 페이지 생성은 안전하게 중단됩니다.",
  ];
  return [
    "<!doctype html><html><head>",
    `<meta property="og:url" content="${url}">`,
    `<meta content="${title}" property="og:title">`,
    `<meta name="robots" content="${robots}">`,
    "</head><body>",
    paragraph(post.title),
    paragraph(post.summary),
    paragraph("사진 출처: 공식 이미지"),
    paragraph("차트 원자료: OpenDART 공시"),
    paragraph("시장 비교: 코스피 장중 지수"),
    paragraph("-69.4% ▼"),
    paragraph("이 문단은 캡션 바로 뒤에 있지만 별도 소제목이 없으므로 섹션으로 채택되면 안 됩니다. 충분히 길더라도 구조가 없는 문단은 자동 상세 페이지의 제목과 본문 쌍으로 사용할 수 없습니다."),
    paragraph("첫 번째 핵심"),
    paragraphMarkup(
      `<span>${bodies[0]} 통역사</span><a href="#source">와</a><span> 글로벌 톱스타</span><span>가 이름</span><span>,</span><span> 역할을 정확히 이어 읽습니다.</span>`,
    ),
    paragraph("두 번째 핵심"),
    paragraph(bodies[1]),
    paragraph("세 번째 핵심"),
    paragraph(bodies[2]),
    "</body></html>",
  ].join("");
}

test("PostView identity validation accepts the exact public post", () => {
  assert.doesNotThrow(() => validatePostViewIdentity(postViewHtml(), post));
});

test("PostView identity validation rejects a wrong URL, title, or noindex", () => {
  assert.throws(
    () =>
      validatePostViewIdentity(
        postViewHtml({ url: "https://blog.naver.com/tnsqo1126/224000000000" }),
        post,
      ),
    /URL mismatch/,
  );
  assert.throws(
    () => validatePostViewIdentity(postViewHtml({ title: "다른 글" }), post),
    /title mismatch/,
  );
  assert.throws(
    () => validatePostViewIdentity(postViewHtml({ robots: "noindex" }), post),
    /noindex/,
  );
});

test("detail extraction keeps real sections and drops titles, summaries, and captions", () => {
  const sections = extractDetailSections(postViewHtml(), post);
  assert.deepEqual(
    sections.map((section) => section.heading),
    ["첫 번째 핵심", "두 번째 핵심", "세 번째 핵심"],
  );
  assert.ok(sections.every((section) => section.body.length >= 80));
  assert.equal(hasStrongDetailSections(post, sections), true);
  assert.match(sections[0].body, /통역사와 글로벌 톱스타가 이름, 역할/);
  assert.doesNotMatch(sections[0].body, /통역사 와|톱스타 가|이름 ,/);
  assert.doesNotMatch(
    sections.map((section) => section.heading).join(" "),
    /사진 출처|차트 원자료|시장 비교|-69\.4%/,
  );
});
