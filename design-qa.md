# Design QA

## Source visual truth

- Full editorial home: `C:/Users/tnsqo/OneDrive/문서/블로그 관리/sunstar-content-hub/design-qa-artifacts/reference-main.png`
- Thumbnail treatment: `C:/Users/tnsqo/OneDrive/문서/블로그 관리/sunstar-content-hub/design-qa-artifacts/reference-thumbnails.png`

## Browser-rendered implementation evidence

- English localized home: `C:/Users/tnsqo/OneDrive/문서/블로그 관리/sunstar-content-hub/design-qa-artifacts/implementation-en-1264x774-pass1.png`
- English entertainment index, post-fix: `C:/Users/tnsqo/OneDrive/문서/블로그 관리/sunstar-content-hub/design-qa-artifacts/implementation-en-entertainment-1264x774-pass2.png`
- English mobile home: `C:/Users/tnsqo/OneDrive/문서/블로그 관리/sunstar-content-hub/design-qa-artifacts/implementation-en-mobile-390x844-pass1.png`
- Same-input comparison board, post-fix: `C:/Users/tnsqo/OneDrive/문서/블로그 관리/sunstar-content-hub/design-qa-artifacts/comparison-pass2.png`

## Viewport and normalization

- Desktop browser viewport: 1264 x 774 CSS px. Browser content capture: 1249 x 765 px at device scale factor 1.
- Mobile browser viewport: 390 x 844 requested CSS px; captured page content is 375 x 812 px at device scale factor 1 after browser chrome and scrollbar allocation.
- Full source pixels: 1266 x 1099. The comparison removes the 74 px browser chrome and normalizes the visible region into a 1264 x 774 CSS frame.
- Full implementation pixels: 1249 x 765, normalized into the adjacent 1264 x 774 CSS frame without density conversion.
- Focused thumbnail source pixels: 1224 x 410. Focused implementation source pixels: 1249 x 765, cropped from the entertainment card region and normalized into a 1264 x 410 CSS frame.
- No `@2x` or other density downsampling was required.

## State

- `/en`: localized editorial home with masthead, utility bar, full navigation, lead story, supporting stories, and latest-story rail.
- `/en/entertainment`: complete translated entertainment index with real thumbnails, SS monogram, and translated work/title overlays.
- `/ja/stocks`: complete Japanese stock index with branded fallbacks where the source has no image.
- `/en` mobile: responsive masthead, horizontally scrollable primary navigation, and single-column story flow.

## Comparison evidence

- Full-view: `comparison-pass2.png` places the source and implementation at the same normalized size. Major-region proportions, masthead hierarchy, navigation, rules, lead/support/latest columns, paper palette, and editorial typography are materially consistent.
- Focused region: the lower comparison pair isolates the requested thumbnail treatment. Both use the same image-first 16:10 card structure, white SS mark at upper left, readable lower overlay, category/date metadata, serif headline, and short summary.
- Imagery: available source images render in every localized card; image-less stock posts use the branded SS.Desk fallback instead of a broken or blank thumbnail.
- Typography and copy: English and Japanese naturally wrap more than Korean, but hierarchy, line length, and card rhythm remain consistent without clipping.
- Responsive behavior: the mobile capture has no horizontal document overflow; navigation remains reachable by horizontal scrolling and story content stays in a readable single column.

## Primary interactions and runtime checks

- Navigated from the localized home to the entertainment and stock category routes.
- Checked locale switcher targets, main navigation targets, category links, and article/original links in the rendered DOM.
- Confirmed 167 translated summaries are represented: entertainment 107 and stocks 60.
- Confirmed 60 cards and 60 image slots on `/ja/stocks`.
- Confirmed no Korean text leaked into the English/Japanese localized main content.
- Console errors checked on localized category pages: none.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: longer English stock headlines can use an extra line compared with Korean; the current grid handles this without overlap or truncation.

## Comparison history

- Pass 1: the visual comparison showed no major layout mismatch, but the subsequent code review found two P2 edge cases: category context was lost by the utility language switcher, and a long translated headline could overfill the thumbnail overlay.
- Fix: added category-aware locale links; shortened overlay labels to at most 32 characters; added a two-line clamp, bounded width, and overflow protection.
- Pass 2: `implementation-en-entertainment-1264x774-pass2.png` and `comparison-pass2.png` confirm that overlay copy remains clear of the SS monogram and preserves the reference card rhythm. Exported-route tests confirm that language switching retains `entertainment` or `stocks`. No actionable P0/P1/P2 finding remains.

final result: passed
