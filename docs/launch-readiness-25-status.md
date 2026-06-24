# Launch Readiness 25-Item Status

## Completed By Codex

1. Deploy V9 to Netlify production.
2. Verify the Operator landing page loads on production.
3. Verify the Operator URL analyzer flow works end to end.
4. Add safer storefront crawling controls: private URL blocking, HTML-only scanning, response caps, and timeout handling.
5. Add soft per-IP rate limiting to the analyzer Function.
6. Add GHL/Zapier/generic lead webhook support through `GHL_WEBHOOK_URL` or `LEAD_WEBHOOK_URL`.
7. Preserve UTM fields from ad click through landing, analyzer, checkout, and agency forms.
8. Add local launch event tracking and optional Meta Pixel bootstrap.
9. Add live Stripe Payment Links for Operator and Director in `assets/launch-config.js`.
10. Make Operator checkout display the live Stripe CTA automatically.
11. Make Director checkout display the live Stripe CTA automatically.
12. Keep backup Netlify lead forms in place while payment is being connected.
13. Add spam honeypots to the static Netlify forms.
14. Remove the old Command tier path from the active funnel by redirecting it to agency pricing.
15. Add extensionless route handling for the launch URLs.
16. Add production security headers and CSP in `netlify.toml`.
17. Add asset/page cache rules for a safer production deploy posture.
18. Add a health endpoint at `/.netlify/functions/health`.
19. Add `robots.txt`.
20. Add `sitemap.xml`.
21. Add `.well-known/security.txt`.
22. Add a branded `404.html`.
23. Add a reusable live verification script at `scripts/verify-v9-launch.js`.
24. Add weekend launch runbook and checkout readiness docs.
25. Push the completed repo-side launch work to GitHub.

## Needs Your Manual Account/Admin Action

- Confirm Stripe Operator product and Payment Link settings in dashboard.
- Confirm Stripe Director product and Payment Link settings in dashboard.
- Confirm Stripe success/cancel URLs.
- Turn on Stripe receipts, taxes if needed, and failed-payment recovery.
- Add the Meta Pixel ID to `assets/launch-config.js`, or send it to Codex to paste and redeploy.
- Create the GoHighLevel/Zapier webhook and add it to Netlify as `GHL_WEBHOOK_URL` or `LEAD_WEBHOOK_URL`.
- Connect custom domain/DNS in Netlify if you want a branded launch URL.
- Run one real Stripe test purchase from an incognito browser.
- Confirm GHL receives the lead payload and maps the custom fields correctly.
