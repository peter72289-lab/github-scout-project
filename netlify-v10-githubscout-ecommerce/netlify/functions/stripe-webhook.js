'use strict';
// stripe-webhook.js — turns a Stripe payment into a real entitlement.
// Verifies the Stripe-Signature header manually (HMAC-SHA256, no SDK needed),
// then provisions/updates the account + subscription and emails a sign-in link.
// Configure in Stripe: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted -> POST /.netlify/functions/stripe-webhook

const crypto = require('node:crypto');
const db = require('./lib/supabase');
const auth = require('./lib/auth');

const PLAN_BY_PRICE = () => {
  // Map your Stripe price IDs to plans via env, e.g.
  // STRIPE_PRICE_OPERATOR=price_xxx STRIPE_PRICE_COMMAND=price_yyy
  const map = {};
  if (process.env.STRIPE_PRICE_OPERATOR) map[process.env.STRIPE_PRICE_OPERATOR] = 'operator';
  if (process.env.STRIPE_PRICE_COMMAND) map[process.env.STRIPE_PRICE_COMMAND] = 'command';
  if (process.env.STRIPE_PRICE_DIRECTOR) map[process.env.STRIPE_PRICE_DIRECTOR] = 'director';
  return map;
};

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
      const priceId = session.metadata?.price_id || null;
      const plan = PLAN_BY_PRICE()[priceId] || session.metadata?.plan || 'operator';
      await upsertSubscription(account.id, {
        stripe_customer_id: session.customer || null,
        stripe_subscription_id: session.subscription || session.id,
        plan, status: 'active'
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
