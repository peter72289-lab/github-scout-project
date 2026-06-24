# Checkout Readiness

## Current State

The V9 site has safe checkout-intake routes and live Stripe Payment Links for recurring billing.

- Operator route: `netlify-v9-githubscout-ecommerce/checkout-operator.html`
- Director route: `netlify-v9-githubscout-ecommerce/checkout-director.html`
- Agency route: `netlify-v9-githubscout-ecommerce/agency-pricing.html`

Operator now captures high-intent leads through the Operator URL scan Netlify Function and can send qualified buyers to Stripe recurring checkout.

## Live Stripe Links

- Operator product: `github_scout_operator`
- Operator price: `price_1TlvIVBht9XEKTLjQUEoYXEU`
- Operator Payment Link: `https://buy.stripe.com/5kQ8wO0H268D5Hqh2zcQU00`
- Director product: `github_scout_director`
- Director price: `price_1TlvIWBht9XEKTLjnQ7iU1HM`
- Director Payment Link: `https://buy.stripe.com/dRm28q61m2Wrd9SfYvcQU01`

## Recommended Payment Setup

Use one of:

- Stripe Payment Link for the fastest path.
- Stripe Checkout Session if you want custom routing and webhook handling.
- Lemon Squeezy checkout if you want an easier software subscription flow.

## Operator Product

- Name: GitHub Scout Operator
- Price: `$17/month`
- Monthly capacity: `10 storefront URL analyses`
- Included sources: `All 15`
- Promise: Shopify/ecommerce software recommendations for savings and conversion.

Fastest payment route:

```text
checkout-operator.html -> Stripe Payment Link -> operator-thank-you.html
```

## Director Product

- Name: GitHub Scout Director
- Price: `$37/month`
- Monthly capacity: `30 storefront URL analyses`
- Included sources: `All 15`
- Promise: higher-volume storefront intelligence and reporting.

## Environment / Link Names

If checkout is handled outside the static site, keep these names consistent:

```text
OPERATOR_CHECKOUT_URL
DIRECTOR_CHECKOUT_URL
AGENCY_CONTACT_URL
GHL_WEBHOOK_URL
LEAD_WEBHOOK_URL
```

## Pre-Launch Checklist

- Confirm Stripe products and prices are in live mode.
- Confirm checkout success URL.
- Configure cancellation URL.
- Add test purchase.
- Confirm webhook or email notification path.
- Confirm Stripe links are present in `netlify-v9-githubscout-ecommerce/assets/launch-config.js`.
- Add `GHL_WEBHOOK_URL` to Netlify environment variables.
- Keep the intake form as backup lead capture.
