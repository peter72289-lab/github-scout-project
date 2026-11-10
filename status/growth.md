# Growth stream ledger

Owns customer-facing funnel pages and offers. Blocker prefix `GRO-`. Page map and decisions:
`netlify-v10-githubscout-ecommerce/docs/FUNNEL-PAGES.md`.

## Current state

**Nine conversational funnel pages exist on branch `feat/conversational-funnels`; none is deployed
or linked from `index.html`.** They sell a one-time reviewed audit to merchants and collect early
interest from agencies. The audit price and Payment Link are unset, so every buy button routes to
the intake form and the price is confirmed by email.

### History

- 2026-11-09: stream opened after the red-team analysis; first page set built.

## Next steps

- DONE Scan-first page, two long-form letters, quiz, micro-video page, agency letter, offer,
  intake, thank-you
- TODO Owner sets audit price and one-time Payment Link in `assets/audit-offer.js`
- TODO Record the micro-video on a permissioned store and swap it into `watch.html`
- TODO Decide whether `/` points at `audit.html`
- BLOCKED Deploy: needs the platform blockers (PLT-3, PLT-6) and preflight green

## Blockers (GRO-)

**GRO-1: no audit price or Payment Link, so the audit can be requested but not bought online.**

| ID    | Type     | Blocked                      | Unblocks                                        | Owner |
| ----- | -------- | ---------------------------- | ----------------------------------------------- | ----- |
| GRO-1 | decision | Online purchase of the audit | Price and one-time Payment Link (TASKS item 11) | user  |

## Recently completed

- **2026-11-09: nine plain-language funnel pages built on a branch; tests 143 green, preflight
  unchanged (fails only on the two legal placeholders).**
