# Weekend Sales Launch Runbook

## Already Prepared In The Repo

- Operator analyzer route works: `/operator-shopify-savings.html#capture` to `/operator-url-analysis.html`.
- Lead/analyzer payloads carry UTM fields.
- Netlify Function can send payloads to `GHL_WEBHOOK_URL` or `LEAD_WEBHOOK_URL`.
- Scanner has a soft per-IP rate limit, response size limits, private URL blocking, and HTML-only scanning.
- Checkout pages show live Stripe CTAs through `assets/launch-config.js`.
- Meta Pixel bootstrap exists in `assets/launch-analytics.js`; add the pixel ID in `assets/launch-config.js`.
- Security headers and CSP are configured in `netlify.toml`.
- Command-tier checkout routes redirect to agency pricing.
- Extensionless launch routes, `robots.txt`, `sitemap.xml`, `.well-known/security.txt`, branded `404.html`, and a health endpoint are in place.
- Live verification can be rerun with `node scripts/verify-v9-launch.js`.

## Account Values You Need To Add

Edit `netlify-v9-githubscout-ecommerce/assets/launch-config.js`:

```js
window.GITHUB_SCOUT_LAUNCH_CONFIG = {
  operatorCheckoutUrl: 'https://buy.stripe.com/5kQ8wO0H268D5Hqh2zcQU00',
  directorCheckoutUrl: 'https://buy.stripe.com/dRm28q61m2Wrd9SfYvcQU01',
  agencyContactUrl: 'agency-pricing.html',
  metaPixelId: 'PASTE_META_PIXEL_ID',
  analyticsEnabled: true
};
```

Add this Netlify environment variable:

```text
GHL_WEBHOOK_URL=PASTE_GOHIGHLEVEL_OR_ZAPIER_WEBHOOK_URL
```

Optional fallback name:

```text
LEAD_WEBHOOK_URL=PASTE_ANY_GENERIC_LEAD_WEBHOOK_URL
```

## Stripe Setup

- `GitHub Scout Operator` is live as a recurring product at `$17/month`.
- `GitHub Scout Director` is live as a recurring product at `$37/month`.
- Stripe Payment Links are wired into the live V9 site.
- Success URL: `https://githubscout-ecommerce-v9-20260609.netlify.app/operator-thank-you.html?checkout=success&plan=...`
- Cancel URL: `https://githubscout-ecommerce-v9-20260609.netlify.app/operator-shopify-savings.html#capture`
- Turn on Stripe receipts and failed-payment recovery.

## GHL Pipeline

Create these stages:

- New Scan
- Viewed Report
- Checkout Clicked
- Paid Operator
- Paid Director
- Follow-up Needed

Suggested custom fields:

- Store URL
- Monthly ad spend
- Primary goal
- UTM source
- UTM campaign
- Analyzer score
- Detected app count
- Monthly savings range

## Weekend QA

Before ads go live:

- Submit the analyzer form from mobile and desktop.
- Confirm the GHL webhook receives the lead.
- Confirm the analyzer report renders.
- Click Operator checkout and confirm Stripe opens.
- Complete one Stripe test purchase.
- Confirm the Stripe receipt arrives.
- Confirm the success URL loads.
- Check Netlify function logs for errors.
- Verify Meta Pixel events in Events Manager.
- Test one ad URL with UTM parameters.
