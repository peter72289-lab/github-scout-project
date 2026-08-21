'use strict';
// plans.js — the single source of truth for what a plan is, costs, and grants.
//
// WHY THIS FILE EXISTS
// Plan facts used to live in four places that disagreed with each other:
//   - `PLAN_QUOTAS` in `operator-url-scan.js` said director 100
//   - `dashboard.html` repeated that same 100 in client JS
//   - `terms.html` and `index.html` sell director as 30 scans/month
//   - `stripe-webhook.js` built its own price-id -> plan map
// The customer-facing promise is the contract we are legally and commercially
// bound to, so the sold numbers win and the code was the bug.
//
// THE NUMBERS AND WHERE THEY COME FROM
//   Operator  $17/mo, 10 scans/mo  — terms.html:20, index.html:529
//   Director  $37/mo, 30 scans/mo  — terms.html:21, index.html:529
//   Prices also appear in `assets/launch-config.js` (`pricing.operatorMonthly`
//   / `pricing.directorMonthly`), which is browser config and cannot require()
//   this module.
//
// FILES THAT MUST MATCH THIS MODULE
// Any change to a label, price, or quota here is one unit that also updates:
//   terms.html, index.html, checkout-operator.html, checkout-director.html,
//   dashboard.html (which now reads `quota` from `auth-me.js` rather than
//   duplicating the table), and `assets/launch-config.js` for the prices.
//
// Zero dependencies, CommonJS, Node 18+ — same contract as every other file
// under netlify/functions/.

// Live, purchasable plans, in upgrade order. `priceIdEnv` names the Netlify
// env var holding the Stripe price id; it is read at call time, never at module
// load, so tests (and Netlify's lazy env injection) can set it after require().
const PLANS = [
  {id: 'operator', label: 'Operator', monthlyPrice: 17, quota: 10, priceIdEnv: 'STRIPE_PRICE_OPERATOR'},
  {id: 'director', label: 'Director', monthlyPrice: 37, quota: 30, priceIdEnv: 'STRIPE_PRICE_DIRECTOR'}
];

// `command` was a middle tier that was withdrawn before launch. Its checkout
// pages 301 to agency pricing (see the redirects for `/checkout-command.html`
// and `/checkout-command` in `netlify.toml`), so nothing can buy it any more.
// A `command` value surviving on a subscription row is stale data, not an
// entitlement: it must resolve to no quota so a human reviews the account.
// `STRIPE_PRICE_COMMAND` is deliberately left unreferenced by this module.
const RETIRED_PLAN_IDS = ['command'];

function getPlan(id) {
  if (!id) return null;
  return PLANS.find((p) => p.id === id) || null;
}

function isRetired(id) {
  return RETIRED_PLAN_IDS.includes(id);
}

// Returns the monthly scan allowance, or null for an unknown, retired, or
// missing plan. Null is deliberate: silently falling back to the operator quota
// would grant scans to an account whose entitlement we cannot prove, and would
// hide the bug that produced the bad plan value in the first place. Callers
// must treat null as "unresolved entitlement", not as "free tier".
function quotaFor(id) {
  const plan = getPlan(id);
  return plan ? plan.quota : null;
}

// Maps a Stripe price id back to a plan. Env is read here (not at module load)
// so a redeploy-free env change and the test suite both work.
function planByPriceId(priceId) {
  if (!priceId) return null;
  return PLANS.find((p) => process.env[p.priceIdEnv] && process.env[p.priceIdEnv] === priceId) || null;
}

module.exports = {PLANS, RETIRED_PLAN_IDS, getPlan, isRetired, quotaFor, planByPriceId};
