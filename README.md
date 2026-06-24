# GitHub Scout Project

GitHub Scout is an ecommerce intelligence project for finding better software, plugins, embeds, widgets, open-source alternatives, and storefront recommendations from public signals.

## Live / Share Links

- GitHub repo: https://github.com/peter72289-lab/github-scout-project
- V9 Netlify site: https://githubscout-ecommerce-v9-20260609.netlify.app
- V8 Netlify site: https://githubscout-ecommerce-v8-20260605.netlify.app

## Current Status

- V9 ecommerce page is built and includes the clicked-tabs cockpit demo video.
- Operator Shopify savings funnel is now added at `netlify-v9-githubscout-ecommerce/operator-shopify-savings.html`.
- Operator URL intake runs through the Netlify Function analyzer flow; checkout pages are Stripe Payment Link-ready through `assets/launch-config.js`.
- Static 9:16 ad batches are stored under `ads/`.
- V9 production deploy is live again as of June 10, 2026.

## Key Folders

- `netlify-v9-githubscout-ecommerce/` - current V9 static Netlify site.
- `netlify-v8-githubscout/` - earlier V8 Netlify site.
- `ads/v9-static-9x16/` - broad V9 Meta-style ad set.
- `ads/operator-shopify-savings-9x16/` - Operator Shopify cost-savings ad set.
- `cockpit-v2-demo/` - cockpit demo capture/render assets and finished MP4s.
- `docs/` - campaign, checkout, and deployment operating notes.
- `servers/` - prototype server-side scanner code.

## Most Important Funnel

The next GTM path is:

1. Run Operator Shopify savings ads.
2. Send traffic to `operator-shopify-savings.html`.
3. Capture email, store URL, app spend, and primary goal.
4. Show sample report to set expectations.
5. Route high-intent leads to `checkout-operator.html`.

## Deploy Command

To redeploy V9:

```bash
npx netlify deploy --prod --dir netlify-v9-githubscout-ecommerce --site 3f86b1e7-82aa-4919-8ef7-55289185cc16
```

## Latest Useful Commits

- `e9a10ef` - Operator Shopify savings ad set.
- `aa117a9` - V9 static ad image set.
- `21b17ed` - Cockpit demo video added to V9.
