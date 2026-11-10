# Conversational funnel pages

New sales pages built from the 2026-11-09 red-team analysis. They sit beside the existing pages
and change none of them. Audience: store owners, ecommerce and marketing managers, and solo
operators, not technical founders. Copy is plain, second person, and avoids engine vocabulary
(sources, signatures, corroboration).

## Value propositions

- **Merchants (primary):** we find the overlapping paid apps on your store and tell you which to
  cut first. Sold as a one-time reviewed audit.
- **Agencies and multi-store operators:** see any Shopify store's visible apps, with evidence,
  before the call. Sold later on the existing Director plan (`lib/plans.js`, 30 scans).
- Back-end tools (shipping, returns, accounting, inventory, help desk) are not claimed as detected.
  They are asked for on the intake form and reviewed by hand.

## Page map

| Page                      | Role                                                                  | Next step                      |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| `audit.html`              | Scan-first front door: the free check is the landing page             | Result, then `reviewed-audit`  |
| `app-bill.html`           | Long-form letter, cost angle ("nobody owns the list")                 | Free check or `reviewed-audit` |
| `before-you-rebuild.html` | Long-form letter, decision angle; trigger picker before the scan box  | Free check or `audit-intake`   |
| `stack-quiz.html`         | Seven-question quiz, segments, hybrid result with a live scan         | Segment offer                  |
| `watch.html`              | Five-minute micro-video page; video slot, chapters, scan box          | Free check or `reviewed-audit` |
| `for-agencies.html`       | Long-form letter for agencies; early-access form                      | `audit-thanks?for=agency`      |
| `reviewed-audit.html`     | One-time audit offer                                                  | `audit-intake` or Payment Link |
| `audit-intake.html`       | Netlify form `reviewed-audit-intake`: app list, costs, back-end tools | `audit-thanks`                 |
| `audit-thanks.html`       | Confirmation for both forms                                           | none                           |

Shared assets: `assets/funnel.css` (tokens and section rhythm from `index.html`), `assets/funnel-icons.svg`
(icon sprite), `assets/funnel-art/*.svg` (original illustrations, no third-party marks),
`assets/funnel-calc.js` ("your numbers" calculator: visitor inputs only, starts empty), `assets/funnel-scan.js`
(plain-language renderer over the existing `operator-url-scan` function at teaser depth),
`assets/audit-offer.js` (price and Payment Link, both null), `assets/funnel-example.js` (generated
by `scripts/build-funnel-example.js` from the real engine; labelled "Example store, not yours").

The quiz result shows a cleanup-priority meter computed only from the visitor's answers and
labelled as such. No slider or meter on these pages starts with a figure we supplied.

## Owner decisions these pages wait on

- **Audit price and Payment Link.** Set both in `assets/audit-offer.js`. While null, pages say the
  price is confirmed by email before payment and the button goes to the intake form. The repo's
  own range is roughly $99 to $149 (`docs/GAP-TO-MARKET.md` Phase 2); not decided.
- **Which page is the front door.** `index.html` is untouched. Pointing `/` at `audit.html` is a
  separate unit.
- **Rename.** Pages use the current wordmark. The scanner's User-Agent also carries the old name
  (`lib/guard.js`).
- **Refund wording for a one-time product.** `refunds.html` is written for subscriptions, so the
  new pages promise no refund. They promise only: price agreed before payment, and "if the free
  check finds nothing worth fixing, we will tell you not to buy".
- **Intake data policy** (`TASKS_FOR_USER.md` item 20) before the intake form takes real lists.

## Walkthrough video (for `watch.html`)

`assets/video/bloat-walkthrough.mp4`, 4:42, 1920x1080, whiteboard style, captions burnt in, soft
synthesized music bed, no voice. It walks an example store (not a real merchant): storefront,
the admin app list, who installed each app for which project, idle versus working, the three
kinds of bloat (idle, leftover, doubled), the free check, the reviewed audit, and how to cut
safely. It shows no dollar figures.

Source lives in `scripts/video/` (denied from the public site by `/scripts/*`): `scenes.py` holds
every scene, caption and timing; `vidlib.py` the drawing helpers; `NARRATION.md` and
`bloat-walkthrough.srt` the script for recording a voiceover. To rebuild: `pip install pycairo
numpy`, install the Kalam font, then `python3 render.py 0 1 2 ... 10`, join the parts with ffmpeg's
concat demuxer, and add `music.wav` from `music.py`. A recorded voiceover can replace the music
track with `ffmpeg -i video.mp4 -i voice.wav -map 0:v -map 1:a -c:v copy`.

## Test order and what to measure

1. Cold outbound with a pre-run check, linking to `audit.html` or `app-bill.html`.
2. `audit.html` as the front door once deployed.
3. `stack-quiz.html` once there is traffic to segment.

Measure: checks started per visit, check outcomes (found, blocked, quiet, not Shopify), audit
button clicks, intake submissions, audits paid. Proposed kill and scale thresholds are in the
red-team report section 6; they are proposals, not benchmarks.
