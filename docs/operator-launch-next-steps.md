# GitHub Scout Operator Launch Notes

## Completed In Repo

- Expanded Shopify app signature coverage across reviews, email/SMS, subscriptions, upsells, loyalty, analytics, search, personalization, quizzes, referrals, testing, forms, shipping, support, and payments.
- Added evidence-backed recommendation details when the crawler detects public app signatures.
- Added report actions on the Operator URL Analysis page: export JSON, copy share link, and print report.
- Added local conversion/event tracking for analyzer render, checkout CTA clicks, export, print, and share-link actions.
- Added a five-pattern sample report gallery at `operator-sample-reports.html`.

## Field Testing Queue

Run the live analyzer against 20 to 30 real Shopify stores and record:

- URL scanned.
- Whether the crawl completed.
- Detected apps.
- Missed apps visible in the page source or browser inspector.
- Whether the recommendation felt specific enough to sell Operator.
- Whether the savings range felt credible.

## Paid Traffic Test Plan

Create three Meta ad angles and route all traffic to `/operator-shopify-savings.html#capture`:

- Cost savings: app bloat, monthly waste, and renewal urgency.
- Better plugins: compare what the store has now against cleaner alternatives.
- Conversion lift: AOV, reviews, capture, and paid-traffic payback.

Track these events:

- Landing page view.
- Analyzer form started.
- Analyzer completed.
- Export report clicked.
- Checkout CTA clicked.
- Operator checkout completed.

## Productization Queue

- Persist scan submissions and analysis payloads in a real datastore.
- Add logged-in Operator dashboard with saved scans and 10-storefront monthly usage.
- Add PDF export once the report format stabilizes.
- Add before/after comparison between saved scans.
- Add payment-gated full report depth for all 15 sources.
