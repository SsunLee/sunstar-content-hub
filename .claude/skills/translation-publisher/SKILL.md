---
name: translation-publisher
description: Localize eligible full-length ssundesk (썬데스크) articles into search-ready multilingual pages (ko/en/ja) while preserving facts, proper names, numbers, and source rights. Use when translating or refreshing ssundesk articles, building locale-specific URLs, hreflang metadata, sitemap entries, or verifying multilingual pages before publish.
---

# Translation Publisher

Ported from `write-blog-translation-release/translation-publisher/` (a Codex-CLI
skill) so Claude Code can run the same workflow directly in this repo. The
validator scripts are not duplicated — this skill calls the copies already
vendored at [`vendor/translation-publisher/validators/`](../../vendor/translation-publisher/validators/),
which are the ones `scripts/build-translation-manifests.mjs` also uses.

Build one useful page per language. Never swap page text at the same URL based on IP, browser language, or a search query.

## Read the relevant references

- Read [locale-policy.md](references/locale-policy.md) before choosing locales, URLs, canonical tags, redirects, or `hreflang`.
- Read [content-contract.md](references/content-contract.md) before creating or validating article and cluster JSON.
- Read [terminology.md](references/terminology.md) before translating names, titles, tickers, dates, measurements, or quotations.

## Workflow

1. **Qualify the source.** Confirm the source is owned, licensed, public domain, openly licensed, or used with documented permission. Require a substantive full body, not a title, snippet, feed summary, or search extract. Record a rights evidence URL. If either gate fails, keep the candidate `noindex,nofollow` and stop.
2. **Freeze the source.** Normalize the source title and body as defined in the content contract, calculate its SHA-256 hash, and record it as `sourceHash`. Never translate from an unrecorded or partial source.
3. **Select locales.** Start with locales supported by the site and justified by audience demand. For 썬데스크, prefer `ko`, `en`, and `ja`; add a language only when its full page, navigation, metadata, and QA can be maintained. Use manifest `mode: "translation"` when the locales differ and `mode: "source-edition"` for the maintained Korean edition; never disguise the same language with different locale spellings.
4. **Translate for meaning.** Preserve claims, uncertainty, relationships, quotations, numbers, and chronology. Localize phrasing and search intent without inventing facts or stuffing keywords. Apply the terminology rules and create explicit verification pairs for facts, proper names, and every material number. For every numeric source claim, map each exact `sourceToken` to its exact localized `localizedToken`; number words and official titles are valid only when this mapping is explicit. If authoritative evidence requires correcting an owned source fact, do not silently rewrite it: add a structured `corrections` entry with the exact `sourceValue`, exact `localizedValue`, a reason, and an HTTPS evidence URL.
5. **Prepare a noindex page.** Use a stable locale URL such as `/{locale}/news/{articleId}`. Set a self-canonical. Keep `status` as `draft` or `reviewed` and `robots` as `noindex,nofollow` until QA and public verification finish.
6. **Validate the article manifest.** Run:

   ```bash
   node vendor/translation-publisher/validators/validate-localized-article.mjs path/to/article.json --allow-noindex
   ```

   Fix every error. Do not weaken minimum-body, rights, fact, name, number, correction-evidence, hash, or URL gates to force a pass.
7. **Deploy and verify.** Open the exact public locale URL, confirm HTTP 200, final resolved URL, rendered language, title, body, canonical, robots, and alternate links. Record the verification timestamp and resolved URL. A build result or redirect alone is not proof.
8. **Promote only a verified page.** Set `status: "ready"` and `robots: "index,follow"` only when `translatedFromSourceHash` equals the current `sourceHash` and public verification is complete. Re-run the validator without `--allow-noindex`.
9. **Build and validate the cluster.** Include only ready, public, indexable pages. Give every member the identical complete alternate map plus `x-default`, then run:

   ```bash
   node vendor/translation-publisher/validators/validate-hreflang-cluster.mjs path/to/cluster.json
   ```

10. **Expose discovery surfaces.** Add every ready locale URL to the appropriate sitemap, keep a visible language selector, and link equivalent pages directly. Do not auto-redirect crawlers or users away from a locale URL.
11. **Verify production again.** Recheck the production HTML and sitemap after deployment. Report a page as published only after the clean public URL renders correctly. Report search indexing separately; submission never guarantees indexing or ranking.

## This repo's existing pipeline

`scripts/build-translation-manifests.mjs` already implements a stricter,
site-specific version of steps 2–9 for celebrity-update articles: it reads
`vendor/translation-publisher/sources/*.publish.json` (full source article
content, keyed by a verified Naver URL), cross-checks `data/localized-articles.json`
and `data/localization-verification.json`, materializes selector-based fact
and number pairs, runs both validators, and writes the results to
`translation-manifests/articles/*.json` and `translation-manifests/clusters/*.json`.
Prefer wiring a new article through those two data files and re-running that
script over hand-writing manifest JSON directly, since it also enforces the
numeric-claim coverage and Naver-source cross-checks that the standalone
validators do not.

## Refresh and failure policy

- Recalculate `sourceHash` whenever source content changes. If it differs from `translatedFromSourceHash`, immediately set `status: "stale"` and `robots: "noindex,nofollow"`; remove that member from ready hreflang and sitemap sets until retranslation passes.
- Never index machine output that has not passed the manifest checks and rendered-page verification.
- Never translate a third-party full article without sufficient rights. Summarize with attribution only when the governing rights and publication policy permit it.
- Never fabricate a localized quotation, official spelling, credit, financial value, date, audience figure, or ranking.
- Never use `corrections` as a general paraphrase log or as permission to alter uncertain facts. Record only evidence-backed factual corrections, and keep their exact source and localized fragments auditable in the manifest.
- Preserve existing verified pages when one locale fails. Omit the failed locale from the reciprocal cluster and rebuild every remaining member's alternate map.
- Store no raw personal search terms in translation manifests or analytics events.

## Outputs

Return or persist:

- one validated localized article manifest per locale;
- locale page content and metadata with a self-canonical;
- one validated reciprocal hreflang cluster;
- localized sitemap entries and language-selector links;
- public verification evidence for each indexable URL;
- an explicit result: `published_and_verified`, `noindex_pending_review`, `stale_noindex`, or `blocked_by_source_rights`.
