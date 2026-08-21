'use strict';
// GET -> the signed-in account's own data as a JSON download. privacy.html
// promises correction, export, or deletion on request; deletion was already
// self-service (account-delete.js) and export was not, so the promise was only
// as good as someone reading a support mailbox. This makes it a control.
const db = require('./lib/supabase');
const auth = require('./lib/auth');

const json = (code, body) => ({statusCode: code, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(body)});

const EXPORT_FORMAT = 'githubscout-account-export/1';

// Stripe ids identify records inside our billing account, not the customer's
// own data. Plan, status and dates are what they actually asked for; echoing
// stripe_customer_id / stripe_subscription_id into a file they may forward
// gives them nothing and hands anyone else a working billing handle.
const publicSubscription = (row) => ({plan: row.plan, status: row.status, created_at: row.created_at});

exports.handler = async (event = {}) => {
  const method = event.httpMethod || 'GET';
  if (method !== 'GET') return json(405, {ok: false, error: 'Method not allowed'});
  if (!db.enabled) return json(503, {ok: false, error: 'Accounts are not configured.'});
  const session = await auth.currentAccount(event);
  if (!session) return json(401, {ok: false, error: 'Sign in to export your data.'});

  const accountId = session.account.id;
  let subscriptions, usage, scans;
  try {
    subscriptions = await db.select('subscriptions', `account_id=eq.${accountId}&select=plan,status,created_at&order=created_at.desc`);
    usage = await db.select('usage', `account_id=eq.${accountId}&select=period,used&order=period.desc`);
    scans = await db.select('scans', `account_id=eq.${accountId}&select=id,store_url,depth,detected_count,evidence_score,report,created_at&order=created_at.desc`);
  } catch (e) {
    console.error('account-export', e.message);
    return json(500, {ok: false, error: 'Could not build your export. Contact support.'});
  }

  const payload = {
    ok: true,
    format: EXPORT_FORMAT,
    generated_at: new Date().toISOString(),
    account: {email: session.account.email, created_at: session.account.created_at || null},
    subscriptions: (subscriptions || []).map(publicSubscription),
    usage: usage || [],
    scans: scans || [],
    // Say plainly what a "full export" cannot include, so the file does not
    // read as more complete than it is (docs/DATA-RETENTION.md).
    not_included: {
      auth_tokens: 'Sign-in and session tokens are stored only as SHA-256 hashes and are not exported; the plaintext does not exist on our side.',
      payment_records: 'Card, charge, invoice and refund records are held by Stripe, not by us. Request those from Stripe or through support.',
      analytics_and_leads: 'Consent-gated ad-pixel events and lead-form submissions live with the providers listed on subprocessors.html, not in this database.'
    }
  };

  // Filename carries the date only — never the email, which would leak into
  // the customer's own filesystem, backups and any screen share.
  const day = new Date().toISOString().slice(0, 10);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="githubscout-account-export-${day}.json"`,
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload, null, 2)
  };
};

exports.EXPORT_FORMAT = EXPORT_FORMAT;
