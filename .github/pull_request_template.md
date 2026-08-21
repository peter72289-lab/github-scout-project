<!-- Keep PRs small and single-purpose. One unit, one branch cut from fresh origin/main. -->

## What & why

<!-- One or two sentences. Link the GAP-TO-MARKET.md unit and any ledger entry. -->

## How verified

<!-- Commands run and their observed output (bun tests/run-tests.js, bun scripts/preflight.js,
     netlify dev driven by hand, live smoke test URL). Evidence, not "should work". -->

## Checklist

- [ ] Grounded: every price, count, source, or savings figure cites a file and line; nothing invented
- [ ] `bun tests/run-tests.js` green; new behavior has a test that exercises the real function
- [ ] `bun scripts/preflight.js` unchanged or improved; preflight itself not weakened
- [ ] Prettier clean: `bunx prettier@3 --check "*.md" "status/**/*.md" ".github/**/*.md" "docs/{GAP-TO-MARKET,PRODUCT-OVERVIEW,ARCHITECTURE}.md"` from the repo root (same scope as `ci.yml`; widens once the v10 tree is formatted)
- [ ] Copy obeys `netlify-v10-githubscout-ecommerce/docs/AD-CLAIMS-GUIDE.md` (10 live sources, no uncomputed dollars, no fake proof)
- [ ] Facts intact: Operator $17/10 scans, Director $37/30 scans, savings only from detections, confidence capped 95
- [ ] Schema or webhook change? `supabase/schema.sql` and `stripe-webhook.js` updated together; env names listed in SETUP.md
- [ ] Legacy folders (`netlify-v9-githubscout-ecommerce/`, `ads/`, `cockpit-v2-demo/`) untouched, or this PR is purely an archive/delete
- [ ] New file under the v10 publish root that must not be public? Forced 404 rule added in `netlify.toml` (preflight section 9 enforces this)
- [ ] Owning `status/<stream>.md` updated (`STATUS.md` only if milestones or the blockers index changed)
- [ ] Serialized zone (`netlify.toml`, `supabase/schema.sql`, `package.json`, `.github/`, `STATUS.md`, `TASKS_FOR_USER.md`)? Stated in the body
- [ ] No secrets, `.env*`, zips, or build output; Conventional Commit title; no AI attribution

## Blockers

<!-- New or affected blocker? Reference stream-prefixed IDs from status/<stream>.md (e.g. PLT-1). "none" if none. -->
