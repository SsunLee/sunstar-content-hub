# Locale policy

## Initial locale set

- Use `ko` for the Korean source, `en` for international English, and `ja` for Japanese.
- Add a locale only when the full article, UI labels, metadata, QA, and future refreshes can be maintained.
- Use valid BCP 47 tags. Use language-region variants only for materially different content, such as `en-US` and `en-GB`.

## URL and navigation

- Give every language a stable URL: `/{locale}/news/{articleId}`.
- Serve one language consistently at each URL. Do not vary indexed content by IP, cookies, browser language, or query parameters.
- Offer a visible language selector that links directly to equivalents. A first-visit suggestion is acceptable; a forced redirect is not.
- Use lowercase locale path segments. Preserve the same article ID across equivalents.

## Search metadata

- Use a self-referencing canonical on every locale page. Never canonicalize a translation to the Korean page.
- Add the same complete alternate set to every equivalent page. Each member must link to itself and every other ready member.
- Point `x-default` to the neutral/default experience, normally `ko` for 썬데스크.
- Include only HTTP 200, indexable, publicly verified locale URLs in hreflang clusters and sitemaps.
- Localize the HTML `lang`, title, description, Open Graph locale, structured data, breadcrumbs, and visible navigation.

## Indexing states

- `draft`, `reviewed`, and `stale`: `noindex,nofollow`; exclude from ready hreflang and sitemap sets.
- `ready`: `index,follow`; require matching hashes and public verification.
- Never describe URL submission as proof of indexing or ranking.
