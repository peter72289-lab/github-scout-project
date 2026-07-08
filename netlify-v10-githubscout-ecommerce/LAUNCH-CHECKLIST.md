# Launch checklist — do not run paid traffic until every box is checked

## Blockers (product breaks or legal risk without these)
- [ ] Supabase project created, `supabase/schema.sql` applied
- [ ] All env vars set in Netlify (see SETUP.md table)
- [ ] Stripe webhook endpoint added + signing secret set + test-mode purchase verified end-to-end (payment → subscription row → sign-in email → full-depth scan → quota decrements)
- [ ] Old committed live Stripe key ROTATED in Stripe dashboard (confirm in key list)
- [ ] Repo made private (it currently publishes payment links, site IDs, runbooks)
- [ ] `support@githubscout.ai` mailbox exists and receives mail (refund policy points here)
- [ ] Legal entity name + jurisdiction added to terms.html and privacy.html
- [ ] Live-store scan verified on the deployed site (≥7/9 sources succeed on a known Shopify store, e.g. a friendly beta merchant)

## High (burns trust or money fast)
- [ ] Rename off "GitHub" (trademark exposure; also confuses buyers) — grep for "GitHub Scout" sitewide when ready
- [ ] 3+ real beta users scanned, with permission to reference results
- [ ] Refund flow tested (Stripe refund → subscription status updates via webhook)
- [ ] Ad creative reviewed against the new claims: no dollar figures that the scan can't substantiate, no "15 sources"

## Medium (first weeks)
- [ ] Annual plan + upgrade path (single $17/mo cannot sustain paid CAC)
- [ ] CSP: remove `unsafe-inline` by moving inline scripts to files
- [ ] pg_cron cleanup jobs for expired sessions/magic links/rate rows
- [ ] Ship the next planned source (checkout fingerprint is the cheapest win) and update methodology.html

## Verification commands
```
node tests/run-tests.js          # 40 tests: integrity, gating, SSRF, rate limit
netlify dev                      # then POST intent=analyze to operator-url-scan
```
