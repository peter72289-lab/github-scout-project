'use strict';
// POST -> cancels billing, then deletes the signed-in account and all
// associated data (GDPR/CCPA erasure). Requires an active session and an
// explicit confirm flag. Cascade deletes handle scans/sessions/usage/
// subscriptions via FK ON DELETE CASCADE.
//
// Order matters and is not negotiable: Stripe is cancelled BEFORE any row is
// removed. Deleting the `subscriptions` row first strands the subscription —
// Stripe keeps charging the card and stripe-webhook.js drops the resulting
// lifecycle events because no row matches the subscription id any more, so
// nothing can ever reconcile it. A failed cancel therefore aborts the whole
// deletion rather than leaving a customer billed for an account that is gone.
const db = require('./lib/supabase');
const auth = require('./lib/auth');

const json = (code, body) => ({statusCode: code, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(body)});

const STRIPE_TIMEOUT_MS = 8000;

// Statuses where Stripe can still charge the card. `canceled` and
// `incomplete_expired` are terminal; `needs_review` is a paid purchase whose
// plan we failed to resolve (stripe-webhook.js) and is very much still billing.
const BILLABLE_STATUS = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'needs_review']);

// Rows written by stripe-webhook.js for a one-time (`mode: payment`) purchase
// carry the checkout session id in place of a subscription id. There is nothing
// recurring to cancel, so those rows never block a deletion.
const isSubscriptionId = (id) => /^sub_[A-Za-z0-9_]+$/.test(String(id || ''));

/** Subscription rows for this account that can still bill the customer. */
async function billableSubscriptions(accountId) {
  const rows = await db.select('subscriptions', `account_id=eq.${accountId}&select=id,stripe_subscription_id,status,plan`);
  return rows.filter((r) => BILLABLE_STATUS.has(r.status) && isSubscriptionId(r.stripe_subscription_id));
}

// Requires STRIPE_BILLING_KEY: a RESTRICTED key with Subscriptions -> write and
// nothing else. Deliberately NOT the webhook's STRIPE_SECRET_KEY, which
// SETUP.md documents as read-only (checkout_sessions:read + prices:read);
// handing the public webhook endpoint write access to billing is a far larger
// blast radius than plan lookup needs. See SETUP.md for both keys.
async function cancelSubscription(subscriptionId, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STRIPE_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'DELETE',
      headers: {Authorization: `Bearer ${key}`},
      signal: controller.signal
    });
    await res.text().catch(() => ''); // release the socket; the body is not needed
    if (res.ok) return {ok: true};
    // Every non-2xx aborts, 404 included. "No such subscription" is also what a
    // wrong-mode key answers, and guessing wrong there leaves a live
    // subscription billing a customer whose account row we just erased.
    return {ok: false, detail: `status=${res.status}`};
  } catch (e) {
    return {ok: false, detail: e.message};
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, {ok: false, error: 'Method not allowed'});
  if (!db.enabled) return json(503, {ok: false, error: 'Accounts are not configured.'});
  const session = await auth.currentAccount(event);
  if (!session) return json(401, {ok: false, error: 'Sign in first.'});

  let confirm = false;
  try { confirm = JSON.parse(event.body || '{}').confirm === true; } catch (e) {}
  if (!confirm) return json(400, {ok: false, error: 'Deletion requires {"confirm": true}. This is irreversible.'});

  let billable;
  try {
    billable = await billableSubscriptions(session.account.id);
  } catch (e) {
    console.error('account-delete-subscriptions', e.message);
    return json(500, {ok: false, error: 'Could not check your billing status, so nothing was deleted. Contact support.'});
  }

  const key = process.env.STRIPE_BILLING_KEY || '';
  // No key configured: we cannot cancel, so we must not delete. Refusing keeps
  // the subscription findable; the customer cancels in the portal and comes
  // back. (California's ARL requires that cancel path to exist and work.)
  if (billable.length && !key) {
    return json(409, {
      ok: false,
      reason: 'subscription_active',
      error: 'Your subscription is still billing, and we cannot cancel it for you from here. Cancel it first in the billing portal (Manage billing on your dashboard), then delete your account. Nothing has been deleted.'
    });
  }

  const canceled = [];
  for (const row of billable) {
    const result = await cancelSubscription(row.stripe_subscription_id, key);
    if (!result.ok) {
      console.error('account-delete-cancel', `subscription=${row.stripe_subscription_id} ${result.detail}`);
      return json(502, {
        ok: false,
        reason: 'cancel_failed',
        error: 'We could not cancel your subscription with Stripe, so nothing was deleted — erasing your account now would leave that subscription charging you with no record left to cancel it from. Your data is untouched. Try again in a few minutes, or contact support and we will cancel and delete together.'
      });
    }
    canceled.push(row.stripe_subscription_id);
  }

  try {
    // Explicit deletes first (in case cascade isn't configured), then account.
    // detection_feedback goes before scans: it references both, so deleting it
    // first is correct with or without the cascades.
    await db.del('detection_feedback', `account_id=eq.${session.account.id}`);
    await db.del('scans', `account_id=eq.${session.account.id}`);
    await db.del('sessions', `account_id=eq.${session.account.id}`);
    await db.del('magic_links', `account_id=eq.${session.account.id}`);
    await db.del('usage', `account_id=eq.${session.account.id}`);
    await db.del('subscriptions', `account_id=eq.${session.account.id}`);
    await db.del('accounts', `id=eq.${session.account.id}`);
  } catch (e) {
    console.error('account-delete', e.message);
    return json(500, {
      ok: false,
      error: canceled.length
        ? 'Your subscription was cancelled, so you will not be billed again, but the data deletion did not finish. Contact support to complete it.'
        : 'Could not complete deletion. Contact support.'
    });
  }
  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json', 'Set-Cookie': auth.clearCookie(), 'Cache-Control': 'no-store'},
    body: JSON.stringify({
      ok: true,
      subscriptionsCanceled: canceled.length,
      message: canceled.length
        ? 'Your subscription has been cancelled with Stripe and your account and all associated data have been deleted.'
        : 'Your account and all associated data have been deleted.'
    })
  };
};

// Exported for tests/run-tests.js so the shipped rules are the ones under test.
exports.BILLABLE_STATUS = BILLABLE_STATUS;
exports.isSubscriptionId = isSubscriptionId;
