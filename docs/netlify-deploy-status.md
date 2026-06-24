# Netlify Deploy Status

## Current V9 Site

- Site name: `githubscout-ecommerce-v9-20260609`
- Site ID: `3f86b1e7-82aa-4919-8ef7-55289185cc16`
- Site URL: https://githubscout-ecommerce-v9-20260609.netlify.app
- Admin URL: https://app.netlify.com/projects/githubscout-ecommerce-v9-20260609

## Current Deploy State

As of June 24, 2026, the V9 site is active and production deploy succeeded.

```text
disabled: false
disabled_reason: null
```

Latest successful deploy:

```text
Production URL: https://githubscout-ecommerce-v9-20260609.netlify.app
Unique deploy URL: https://6a3c1fbf6ce2c85348f3f28d--githubscout-ecommerce-v9-20260609.netlify.app
```

## Redeploy Command

Run this from the V9 app folder so Netlify picks up `netlify.toml`, redirects, headers, and Functions:

```bash
cd netlify-v9-githubscout-ecommerce
npx netlify deploy --prod --dir . --functions netlify/functions --site 3f86b1e7-82aa-4919-8ef7-55289185cc16
```

## What Should Go Live After Deploy

- V9 homepage update with Shopify Scan links.
- Cockpit demo video in the Product Demo section.
- Operator Shopify savings landing page.
- Robust Operator URL analyzer results page with compare-and-contrast recommendation blocks.
- Operator URL scan Netlify Function endpoint with public storefront crawl/signature detection.
- Operator sample report gallery.
- Operator analyzer export/share/print actions and local event tracking.
- Launch config for Stripe links and Meta Pixel ID.
- Live Stripe Payment Links wired for Operator `$17/month` and Director `$37/month`.
- Operator and Director CTAs across the homepage, URL analysis page, and Operator savings page resolve directly to their corresponding Stripe order forms.
- UTM capture, webhook-ready lead handoff, rate limiting, scanner hardening, and production security headers.
- Forced Command checkout redirect to agency pricing.
- Extensionless launch routes, robots, sitemap, security.txt, branded 404, and health endpoint.
- Sample Shopify URL analysis page.
- Operator URL scan lead/function flow.
- Operator checkout intake Netlify Form.

## Verification After Deploy

Check these URLs:

- `/`
- `/operator-shopify-savings.html`
- `/sample-shopify-url-analysis.html`
- `/checkout-operator.html`
- `/operator-thank-you.html`
- `/robots.txt`
- `/sitemap.xml`
- `/.well-known/security.txt`
- `/.netlify/functions/health`
- `/assets/githubscout-cockpit-v2-clicked-tabs-demo-60s.mp4`

Run the production verification script:

```bash
node scripts/verify-v9-launch.js https://githubscout-ecommerce-v9-20260609.netlify.app
```

Submit one test form with a clearly marked test email and confirm it appears in Netlify Forms or your configured webhook.
