# Checkout Readiness

## Current State

The V9 site has safe checkout-intake routes, but not real payment processing yet.

- Operator route: `netlify-v9-githubscout-ecommerce/checkout-operator.html`
- Director route: `netlify-v9-githubscout-ecommerce/checkout-director.html`
- Agency route: `netlify-v9-githubscout-ecommerce/agency-pricing.html`

Operator now captures high-intent leads through the Operator URL scan Netlify Function while the payment provider is being connected.

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

- Create Operator subscription product.
- Create Director subscription product.
- Configure checkout success URL.
- Configure cancellation URL.
- Add test purchase.
- Confirm webhook or email notification path.
- Paste Stripe links into `netlify-v9-githubscout-ecommerce/assets/launch-config.js`.
- Add `GHL_WEBHOOK_URL` to Netlify environment variables.
- Keep the intake form as backup lead capture.
