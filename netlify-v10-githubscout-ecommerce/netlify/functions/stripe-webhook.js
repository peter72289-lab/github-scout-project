'use strict';
// stripe-webhook.js — turns a Stripe payment into a real entitlement.
// Verifies the Stripe-Signature header manually (HMAC-SHA256, no SDK needed),
// then provisions/updates the account + subscription and emails a sign-in link.
// Configure in Stripe: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted -> POST /.netlify/functions/stripe-webhook

const crypto = require('node:crypto');
const db = require('./lib/supabase');
const auth = require('./lib/auth');
const plans = require('./lib/plans');

// price id -> plan id, derived from lib/plans.js so the table exists once.
// `command` is retired (netlify.toml 301s its checkout pages), so
// STRIPE_PRICE_COMMAND is deliberately not mapped here any more.
const PLAN_BY_PRICE = () => {
  const map = {};
  plans.PLANS.forEach((p) => {
    const priceId = process.env[p.priceIdEnv];
    if (priceId) map[priceId] = p.id;
  });
  return map;
};

// A plan we could not determine. Written to the subscription row so a human can
// find it; the scan function refuses to run scans for it (403), which is the
// safe direction to fail when money has already changed hands.
const UNRESOLVED_PLAN = 'unresolved';

// Asks Stripe what was actually bought. Requires STRIPE_SECRET_KEY to be a
// RESTRICTED, read-only key (checkout_sessions:read + prices:read) — this
// function never writes to Stripe, and a live secret key here would be a much
// larger blast radius than the job needs. Any failure returns null: plan
// resolution degrades, the webhook never throws.
async function planFromLineItems(sessionId) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !sessionId) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=10`,
      {headers: {Authorization: `Bearer ${key}`}, signal: controller.signal}
    );
    if (!res.ok) {
      console.error('stripe-line-items', `status=${res.status} session=${sessionId}`);
      return null;
    }
    const body = await res.json();
    for (const item of body.data || []) {
      const plan = plans.planByPriceId(item.price?.id);
      if (plan) return plan.id;
    }
    return null;
  } catch (e) {
    console.error('stripe-line-items', e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Resolve which plan a completed checkout session bought. First hit wins:
//   1. session.metadata.plan / session.metadata.github_scout_plan. The live
//      Payment Links were created with `metadata[github_scout_plan]`
//      (scripts/create-stripe-githubscout-links.js:75,88,103), and Stripe only
//      copies Payment Link metadata onto the session when the link is
//      configured to; both keys are checked and both are validated against
//      lib/plans.js so a stale `command` cannot slip through.
//   2. session.metadata.price_id, if the link was configured to pass one.
//   3. The Stripe API, using the restricted read-only key (see above).
//   4. null — UNRESOLVED. Never default to operator: that is how every Director
//      buyer silently received the 10-scan tier.
async function resolvePlanFromSession(session) {
  const meta = session?.metadata || {};
  for (const key of ['plan', 'github_scout_plan']) {
    const plan = plans.getPlan(meta[key]);
    if (plan) return {plan: plan.id, source: `metadata.${key}`};
  }
  const byPriceId = plans.planByPriceId(meta.price_id);
  if (byPriceId) return {plan: byPriceId.id, source: 'metadata.price_id'};
  const fromApi = await planFromLineItems(session?.id);
  if (fromApi) return {plan: fromApi, source: 'stripe_line_items'};
  return {plan: null, source: 'unresolved'};
}

// Log the buyer's email domain only. The full address is customer data and
// function logs are not the place for it.
function emailDomain(email) {
  const at = String(email || '').lastIndexOf('@');
  return at === -1 ? 'unknown' : String(email).slice(at + 1);
}

function verifyStripeSignature(payload, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch (e) { return false; }
}

async function upsertSubscription(accountId, sub) {
  const rows = await db.select('subscriptions', `stripe_subscription_id=eq.${encodeURIComponent(sub.stripe_subscription_id)}&select=id`);
  if (rows.length) {
    await db.update('subscriptions', `id=eq.${rows[0].id}`, sub);
  } else {
    await db.insert('subscriptions', {account_id: accountId, ...sub});
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return {statusCode: 405, body: 'Method not allowed'};
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!db.enabled || !secret) {
    console.error('stripe-webhook: missing SUPABASE or STRIPE_WEBHOOK_SECRET config');
    return {statusCode: 503, body: 'Webhook not configured'};
  }
  const payload = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body || '');
  if (!verifyStripeSignature(payload, event.headers['stripe-signature'], secret)) {
    return {statusCode: 400, body: 'Invalid signature'};
  }

  let evt;
  try { evt = JSON.parse(payload); } catch (e) { return {statusCode: 400, body: 'Bad payload'}; }

  // Idempotency: Stripe can deliver the same event more than once. Record the
  // event id first; if it's already there, ack without reprocessing.
  if (evt.id) {
    try {
      await db.insert('stripe_events', {id: evt.id, type: evt.type});
    } catch (e) {
      if (/duplicate key|already exists|23505/.test(e.message)) {
        return {statusCode: 200, body: 'ok (duplicate ignored)'};
      }
      // If the idempotency insert fails for another reason, fall through and
      // process — better to risk a rare double-apply than to drop the event.
      console.error('stripe-idempotency', e.message);
    }
  }

  try {
    if (evt.type === 'checkout.session.completed') {
      const session = evt.data.object;
      const email = auth.normEmail(session.customer_details?.email || session.customer_email);
      if (!email) return {statusCode: 200, body: 'No email on session; ignored'};
      const account = await auth.getOrCreateAccount(email);
      const resolved = await resolvePlanFromSession(session);
      if (!resolved.plan) {
        console.error('stripe-plan-unresolved', `session=${session.id} mode=${session.mode || 'unknown'} email_domain=${emailDomain(email)}`);
      }
      // Subscription id: Payment Links running in one-time (`mode: 'payment'`)
      // mode produce no subscription, so we keep the session id as the row key
      // rather than dropping a paid record. Both modes are recorded `active` —
      // the buyer paid either way and must be able to sign in — but a one-time
      // purchase is logged so the operator can see it will never renew or emit
      // invoice.paid / customer.subscription.* events to keep that status
      // honest. An unresolved plan overrides status with `needs_review`.
      if (session.mode && session.mode !== 'subscription') {
        console.error('stripe-one-time-purchase', `session=${session.id} mode=${session.mode} — recorded active but will not renew`);
      }
      await upsertSubscription(account.id, {
        stripe_customer_id: session.customer || null,
        stripe_subscription_id: session.subscription || session.id,
        plan: resolved.plan || UNRESOLVED_PLAN,
        status: resolved.plan ? 'active' : 'needs_review'
      });
      // Fulfillment: send sign-in link so the buyer lands in a real dashboard.
      try {
        const {token} = await auth.createMagicLink(email);
        const base = process.env.URL || '';
        await auth.sendMagicEmail(email, `${base}/.netlify/functions/auth-verify?token=${token}`, 'welcome');
      } catch (e) { console.error('post-purchase-link', e.message); }
    }

    if (evt.type === 'customer.subscription.updated' || evt.type === 'customer.subscription.deleted') {
      const sub = evt.data.object;
      const status = evt.type.endsWith('deleted') ? 'canceled' : sub.status;
      const rows = await db.select('subscriptions', `stripe_subscription_id=eq.${encodeURIComponent(sub.id)}&select=id`);
      if (rows.length) await db.update('subscriptions', `id=eq.${rows[0].id}`, {status});
    }

    // Payment lifecycle: suspend access on failed payment, restore on recovery.
    if (evt.type === 'invoice.payment_failed' || evt.type === 'invoice.paid') {
      const invoice = evt.data.object;
      const subId = invoice.subscription;
      if (subId) {
        const status = evt.type === 'invoice.paid' ? 'active' : 'past_due';
        const rows = await db.select('subscriptions', `stripe_subscription_id=eq.${encodeURIComponent(subId)}&select=id`);
        if (rows.length) await db.update('subscriptions', `id=eq.${rows[0].id}`, {status});
      }
    }
  } catch (e) {
    console.error('stripe-webhook', e.message);
    return {statusCode: 500, body: 'Processing error'}; // Stripe retries
  }
  return {statusCode: 200, body: 'ok'};
};

// Exported for tests/run-tests.js so the shipped resolver is the one under test.
// Exported so tests exercise the shipped verifier. The suite used to carry its
// own copy of this algorithm, which meant the signature tests passed whatever
// this file did — including if it stopped verifying at all.
exports.verifyStripeSignature = verifyStripeSignature;
exports.resolvePlanFromSession = resolvePlanFromSession;
exports.PLAN_BY_PRICE = PLAN_BY_PRICE;
exports.UNRESOLVED_PLAN = UNRESOLVED_PLAN;
