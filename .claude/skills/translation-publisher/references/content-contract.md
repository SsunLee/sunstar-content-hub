# Content contract

Use UTF-8 JSON. Validators accept no network input and return deterministic JSON to stdout.

## Localized article manifest

Required shape:

```json
{
  "schemaVersion": 1,
  "mode": "translation",
  "articleId": "stable-id",
  "source": {
    "locale": "ko",
    "url": "https://source.example/post/1",
    "title": "Full source title",
    "body": "Full source body",
    "rights": {
      "status": "verified",
      "basis": "owned",
      "evidenceUrl": "https://source.example/post/1"
    }
  },
  "localized": {
    "locale": "en",
    "url": "https://example.com/en/news/stable-id",
    "title": "Localized title",
    "description": "Localized search description",
    "body": "Localized full body"
  },
  "sourceHash": "sha256:...",
  "translatedFromSourceHash": "sha256:...",
  "status": "ready",
  "robots": "index,follow",
  "canonical": "https://example.com/en/news/stable-id",
  "verification": {
    "fullBody": true,
    "facts": [{"id":"fact-1","source":"...","localized":"...","verified":true}],
    "properNames": [{"id":"name-1","source":"...","localized":"...","verified":true}],
    "numbers": [{
      "id":"number-1",
      "source":"1·2회 방송",
      "localized":"the first two episodes",
      "values":[
        {"sourceToken":"1","localizedToken":"first"},
        {"sourceToken":"2","localizedToken":"two"}
      ],
      "verified":true
    }]
  },
  "corrections": [{
    "id": "sibling-count",
    "sourceValue": "the eldest with five younger siblings",
    "localizedValue": "the eldest of five siblings, with four younger siblings",
    "reason": "The official character profile defines a five-sibling household.",
    "evidenceUrl": "https://official.example/character-profile"
  }],
  "publicVerification": {
    "status": "verified",
    "checkedAt": "2026-08-01T12:00:00Z",
    "httpStatus": 200,
    "resolvedUrl": "https://example.com/en/news/stable-id"
  }
}
```

`verification.numbers`는 숫자가 든 원문 주장마다 한 항목을 만들고, 원문의 모든 숫자 토큰을 `values.sourceToken`으로 덮어야 한다. 번역문이 `first`, `two`, `Three Days of Rain`처럼 숫자를 단어나 고유명사로 표현하면 정확한 대응 문자열을 `localizedToken`에 기록한다. 본문 전체나 장 전체를 대응값으로 쓰지 않는다.

`corrections` is a required array; use `[]` when no factual correction is needed. Each correction must have a stable URL-safe `id`, an exact `sourceValue` that occurs in the source content, an exact `localizedValue` that occurs in the localized content, a non-empty `reason`, and an HTTPS `evidenceUrl`. Use it only when authoritative evidence justifies correcting an owned source fact. It is not a substitute for ordinary translation verification, and it must not hide unsupported changes.

Use `mode: "translation"` when source and localized locales differ. Use
`mode: "source-edition"` only for the site's maintained edition in the source
language; in that mode the two locale tags must match. Both modes retain the
same rights, full-body, hash, verification-pair, robots, and public-verification
gates. Omitting `mode` preserves backward compatibility and means
`translation`.

Allowed rights bases: `owned`, `licensed`, `open-license`, `public-domain`, `permission`.

Normalize source hash material by converting CRLF/CR to LF, applying Unicode NFC, trimming the title and body separately, and joining them as `title + "\n\n" + body`. Encode as UTF-8 and store lowercase SHA-256 as `sha256:<64 hex>`.

The validator requires at least 600 non-whitespace characters in both source and localized bodies, one verified fact pair, one verified proper-name pair, and verified number pairs whenever the source contains digits. Every number pair must define non-empty `values`, cover every numeric token in its source fragment, and contain each mapped source and localized token exactly. Localized number words and official names are valid through this explicit mapping; a localized numeric glyph is not required. Every verification pair and correction fragment must occur in its corresponding text.

Use `draft` or `reviewed` with `noindex,nofollow` before release. Use `stale` with `noindex,nofollow` when the translated hash differs. The default validator succeeds only for a publishable `ready` manifest; pass `--allow-noindex` to validate a structurally correct noindex artifact.

## Hreflang cluster manifest

Required shape:

```json
{
  "schemaVersion": 1,
  "clusterId": "stable-id",
  "xDefaultLocale": "ko",
  "members": [
    {
      "locale": "ko",
      "url": "https://example.com/ko/news/stable-id",
      "canonical": "https://example.com/ko/news/stable-id",
      "robots": "index,follow",
      "publicVerification": {
        "status": "verified",
        "checkedAt": "2026-08-01T12:00:00Z",
        "httpStatus": 200,
        "resolvedUrl": "https://example.com/ko/news/stable-id"
      },
      "alternates": {
        "ko": "https://example.com/ko/news/stable-id",
        "en": "https://example.com/en/news/stable-id",
        "x-default": "https://example.com/ko/news/stable-id"
      }
    }
  ]
}
```

Include at least two ready members. URLs must be HTTPS, use the matching locale path, share an origin, be unique, self-canonical, publicly verified, and expose the exact same reciprocal alternate map.
