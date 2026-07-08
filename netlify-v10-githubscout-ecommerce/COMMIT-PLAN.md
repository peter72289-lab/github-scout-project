# GitHub push plan

Target repo: `peter72289-lab/github-scout-project`
Branch: `v2-product-build` (open a PR from this into `main` after review)
Path in repo: the v2 build maps onto `netlify-v10-githubscout-ecommerce/`

Two ways to run it:
- **Automated:** run `push-to-github.sh` from your Mac (it clones, copies, and
  makes the six commits below, then stops before `git push` so you review).
- **Manual:** follow the same six commits yourself using the file lists here.

The script intentionally does **not** push and does **not** touch `main`. Nothing
is force-pushed. It also runs `git rm --cached` on `launch-config.js` so the
secret-bearing file stops being tracked going forward (rotate the key regardless
— see docs/SECRETS-PURGE.md).

## Commit sequence

**1. `feat(engine): multi-source scanner with SSRF-pinned fetch`**
- netlify/functions/lib/guard.js
- netlify/functions/lib/adapters.js
- netlify/functions/lib/rules.js
- netlify/functions/lib/aggregate.js
- netlify/functions/operator-url-scan.js

> 10 live detection sources, connect-time SSRF guard closing DNS rebinding,
> IP-keyed rate limiting, corroboration-based confidence, evidence-only savings,
> and the spend-tier fix.

**2. `feat(accounts): magic-link auth, Stripe webhook, entitlements, quotas`**
- netlify/functions/lib/supabase.js
- netlify/functions/lib/auth.js
- netlify/functions/auth-request-link.js
- netlify/functions/auth-verify.js
- netlify/functions/auth-me.js
- netlify/functions/auth-logout.js
- netlify/functions/stripe-webhook.js
- netlify/functions/dashboard-data.js
- supabase/schema.sql

> Purchase → account → entitlement → server-enforced monthly quota, with signed
> hashed tokens and atomic usage/rate-limit RPCs.

**3. `feat(dashboard): authenticated dashboard, login, report gating`**
- login.html
- dashboard.html

> Saved scans, usage meter, before/after compare, print-to-PDF, teaser-vs-full
> gating, and the quota/upgrade upsell.

**4. `fix(claims): evidence-based numbers and honest source count`**
- index.html
- operator-url-analysis.html
- terms.html
- privacy.html
- operator-thank-you.html
- operator-shopify-savings.html
- checkout-director.html
- checkout-operator.html

> Removes fabricated savings and the "15 sources" claim sitewide, labels the
> homepage demo as illustrative, fixes the client-side tier bug, adds legal
> entity placeholders, and points thank-you at real fulfillment.

**5. `feat(proof): methodology, sample report, changelog, pricing toggle`**
- methodology.html
- sample-report.html
- changelog.html
- assets/launch-config.js
- assets/launch-config.example.js

> Public methodology, format-accurate sample report, versioned changelog, and
> the config-gated annual billing toggle.

**6b. `hardening: security headers, webhook idempotency, ops functions`**
- netlify.toml (HSTS/COOP/noindex + cleanup schedule)
- netlify/functions/health.js, cleanup-scheduled.js, account-delete.js
- netlify/functions/stripe-webhook.js (idempotency + payment-failure)
- netlify/functions/lib/auth.js, guard.js, adapters.js, aggregate.js
- supabase/schema.sql (stripe_events), robots.txt, sitemap.xml, package.json

> Security headers, Stripe idempotency + past_due handling, per-email link
> throttle, DNS timeouts, GDPR delete, scheduled cleanup, health reporter, SEO.

**6c. `chore(docs,security): tests, runbooks, secret hygiene`**
- tests/run-tests.js
- .gitignore
- README.md
- SETUP.md
- LAUNCH-CHECKLIST.md
- DEPLOY-STAGING.md
- COMMIT-PLAN.md
- docs/AD-CLAIMS-GUIDE.md
- docs/SECRETS-PURGE.md
- docs/EMAIL-DNS-SETUP.md
- docs/DATA-RETENTION.md
- docs/RUNBOOK.md
- (also: `git rm --cached netlify-v10-githubscout-ecommerce/assets/launch-config.js`)

> 42-test suite, setup/launch/deploy runbooks, and the secret-purge kit; stops
> tracking the payment-link config.

## After the script
```bash
cd github-scout-project
git log --oneline -6        # review the six commits
git push -u origin v2-product-build
# then open a PR into main on github.com
```
