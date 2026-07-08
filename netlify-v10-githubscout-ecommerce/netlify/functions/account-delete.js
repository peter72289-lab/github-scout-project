'use strict';
// POST -> deletes the signed-in account and all associated data (GDPR/CCPA
// erasure). Requires an active session and an explicit confirm flag. Cascade
// deletes handle scans/sessions/usage/subscriptions via FK ON DELETE CASCADE.
const db = require('./lib/supabase');
const auth = require('./lib/auth');

const json = (code, body) => ({statusCode: code, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(body)});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, {ok: false, error: 'Method not allowed'});
  if (!db.enabled) return json(503, {ok: false, error: 'Accounts are not configured.'});
  const session = await auth.currentAccount(event);
  if (!session) return json(401, {ok: false, error: 'Sign in first.'});

  let confirm = false;
  try { confirm = JSON.parse(event.body || '{}').confirm === true; } catch (e) {}
  if (!confirm) return json(400, {ok: false, error: 'Deletion requires {"confirm": true}. This is irreversible.'});

  try {
    // Explicit deletes first (in case cascade isn't configured), then account.
    await db.del('scans', `account_id=eq.${session.account.id}`);
    await db.del('sessions', `account_id=eq.${session.account.id}`);
    await db.del('magic_links', `account_id=eq.${session.account.id}`);
    await db.del('usage', `account_id=eq.${session.account.id}`);
    await db.del('subscriptions', `account_id=eq.${session.account.id}`);
    await db.del('accounts', `id=eq.${session.account.id}`);
  } catch (e) {
    console.error('account-delete', e.message);
    return json(500, {ok: false, error: 'Could not complete deletion. Contact support.'});
  }
  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json', 'Set-Cookie': auth.clearCookie(), 'Cache-Control': 'no-store'},
    body: JSON.stringify({ok: true, message: 'Your account and all associated data have been deleted.'})
  };
};
