# GitHub Scout — v2 build

A Shopify storefront app-stack scanner. Given a store URL, it detects the apps
and third-party scripts running across up to 10 live sources, flags overlapping
paid tools, and estimates savings **only** from what it actually detects.

This v2 turns the original static marketing site into a working product:
multi-source scanning, passwordless accounts, Stripe-driven entitlements,
server-enforced quotas, and a dashboard with saved scans.

## Quick start

```bash
npm test          # 49 unit tests — no network needed
npm run dev       # netlify dev (functions + static site locally)
```

Deploy and configuration: see **SETUP.md**. Launch gate: **LAUNCH-CHECKLIST.md**.

## Layout

```
index.html, operator-*.html, checkout-*.html   Marketing + funnel
login.html, dashboard.html                     Authenticated app
methodology.html, sample-report.html, changelog.html   Proof
netlify/functions/
  operator-url-scan.js     Scan orchestration (rate limit, entitlement, persist)
  auth-*.js                Magic-link sign-in
  stripe-webhook.js        Purchase -> account -> entitlement (idempotent)
  dashboard-data.js        Saved scans, detail, compare
  account-delete.js        GDPR erasure
  cleanup-scheduled.js     Daily housekeeping
  health.js                Config/health reporter (booleans only)
  lib/
    guard.js       SSRF-pinned fetch + rate limiting
    adapters.js    10 live detection sources
    rules.js       Versioned signatures + cited benchmarks
    aggregate.js   Detection -> corroboration -> report
    supabase.js    REST client (service role)
    auth.js        Sessions + magic links (hashed tokens)
supabase/schema.sql        Tables + atomic quota/rate RPCs
tests/run-tests.js         Unit tests
docs/                      Runbooks (secrets purge, ad claims, email/DNS, ops)
```

## Design guarantees (enforced by tests)

- Savings are computed only from detected paid apps; no detections → no estimate.
- Ad-spend input sets urgency framing only — never dollar figures.
- Detection confidence is corroboration-based, capped at 95%.
- Cost figures are published-pricing benchmarks, cited, never store invoices.
- Free scans return teaser depth; paid returns full depth with evidence.
- Scanner is SSRF-guarded (connect-time validation, per-hop redirect checks).

## What needs credentials to go live

Supabase, Stripe (webhook + price IDs), and Resend env vars. Without them,
free/teaser scans still work; accounts and paid depth stay off. See SETUP.md.
