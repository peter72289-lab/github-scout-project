# GitHub Scout — end-to-end launch readiness

The 50 steps to go from repo to live, in order. Legend: **[✅ done]** built and
verified in this codebase · **[⬜ you]** needs your credentials/decision/deploy ·
**[◑ me-after-you]** I can do it once you unblock the dependency.

Run `npm run preflight` anytime — it re-checks the code-side items automatically.

---

## A. Product engineering — COMPLETE
1. ✅ Multi-source scan engine (10 live sources) replacing single-HTML matching
2. ✅ SSRF-pinned fetch (connect-time validation, per-hop redirect checks)
3. ✅ Evidence-only savings; no detections → no estimate
4. ✅ Spend-tier bug fixed (server + client); ad-spend never sets dollars
5. ✅ Corroboration-based confidence, capped at 95%
6. ✅ Cited published-pricing benchmarks; fabricated PayPal fee removed
7. ✅ Checkout/payment-provider fingerprint (source #10)
8. ✅ Passwordless magic-link auth, hashed tokens, server sessions
9. ✅ Stripe webhook → account + entitlement + welcome email
10. ✅ Idempotent webhook + payment-failure (`past_due`) handling
11. ✅ Server-enforced monthly quotas (operator/command/director)
12. ✅ Free = teaser depth, paid = full depth with evidence trails
13. ✅ Dashboard: saved scans, usage meter, before/after compare, print-to-PDF
14. ✅ GDPR account deletion endpoint + dashboard control
15. ✅ Daily cleanup of expired tokens/sessions/rate rows
16. ✅ IP-keyed rate limiting + optional shared store; DNS timeouts; input caps
17. ✅ Health/config reporter (booleans only)
18. ✅ 49 unit tests (integrity, gating, SSRF, signatures, auth)

## B. Trust, claims & compliance — COMPLETE (code) / NEEDS YOU (legal)
19. ✅ "15 sources" claim replaced sitewide with honest "10 live / 15 planned"
20. ✅ Public methodology page (sources, scoring, what we won't estimate)
21. ✅ Format-accurate sample report from the real engine
22. ✅ Versioned changelog + homepage proof strip
23. ✅ Ad-claims guide (substantiated vs prohibited)
24. ✅ Cookie-consent banner gating the Meta pixel (ePrivacy/GDPR)
25. ✅ Subprocessor list + cookie disclosure in privacy
26. ✅ Security headers (CSP, HSTS, COOP, noindex on auth pages)
27. ✅ Secrets: `.gitignore`, example config, purge runbook
28. ⬜ **you** — Fill `[[entity/jurisdiction/contact]]` in terms.html + privacy.html
29. ⬜ **you** — Counsel review of terms/privacy/refunds before paid acquisition
30. ⬜ **you** — Decide + execute rename off "GitHub Scout" (trademark exposure)

## C. Accounts & infrastructure — NEEDS YOU
31. ⬜ **you** — Create Supabase project; run `supabase/schema.sql`
32. ⬜ **you** — Set env vars in Netlify (SETUP.md table)
33. ⬜ **you** — Stripe webhook endpoint + 5 events + signing secret + price IDs
34. ⬜ **you** — Resend: verify domain, SPF/DKIM/DMARC (EMAIL-DNS-SETUP.md)
35. ⬜ **you** — Rotate the previously-committed live Stripe key (confirm in Stripe)
36. ⬜ **you** — Make the repo private; then run the git-history purge (SECRETS-PURGE.md)
37. ⬜ **you** — Confirm the support mailbox actually receives mail
38. ◑ **me-after-you** — Push v2 via `push-to-github.sh` once GitHub connector is authorized

## D. Deploy & live verification — NEEDS YOU, THEN ME
39. ⬜ **you** — Deploy to staging `githubscout-v2-staging` (DEPLOY-STAGING.md; sandbox egress blocks me)
40. ◑ **me-after-you** — Scan 3–5 real Shopify stores; confirm ≥7/10 sources + evidence
41. ◑ **me-after-you** — Stripe test-mode purchase → webhook → welcome email → full-depth scan → quota decrement
42. ◑ **me-after-you** — Confirm anonymous scans return teaser (shallower than paid)
43. ◑ **me-after-you** — Abuse test deployed scanner (rate limit, redirect-to-internal, oversized)
44. ◑ **me-after-you** — `/health` shows `productionReady:true`; fix anything 40–43 surfaces

## E. Proof & go-to-market — MIXED
45. ⬜ **you** — Recruit 3–5 beta merchants (BETA-OUTREACH.md kit ready)
46. ◑ **me-after-you** — Turn consented beta scans into anonymized case study + real testimonials
47. ✅ Annual pricing toggle (activates when you add annual Stripe URLs)
48. ✅ Dashboard upgrade/upsell (quota-based) — mitigates $17 CAC problem
49. ⬜ **you** — Create annual price IDs; add URLs to config to switch on the toggle

## F. Launch
50. ◑ **me-after-you** — Final red-team re-review of the deployed build, then go/no-go
    against this list. **Do not run paid traffic until 28–37 and 45 are checked.**

---

## Critical path (shortest route to a real launch)
31 → 32 → 33 → 34 → 35 → 36 (infra + secrets) → 39 (deploy) → 40–44 (verify)
→ 28–30 + 45 (legal + proof) → 49 → 50. Everything in A/B-code is already done.

## The one-paragraph "why not yet"
The machine works and is honest. What's left is not more building — it's you
plugging in accounts, rotating the exposed key, getting a legal entity and a real
name behind it, proving it on a few real stores, and running one deploy I can't
run from here. Do those and Scout is genuinely live.
