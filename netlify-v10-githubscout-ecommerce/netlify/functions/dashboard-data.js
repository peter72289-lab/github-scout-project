'use strict';
// GET -> saved scans for the signed-in account. ?id=<scanId> returns one full
// report; ?compare=<idA>,<idB> returns both for before/after diffing.
const db = require('./lib/supabase');
const auth = require('./lib/auth');

const json = (code, body) => ({statusCode: code, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(body)});

exports.handler = async (event) => {
  const session = await auth.currentAccount(event);
  if (!session) return json(401, {ok: false, error: 'Sign in to view your dashboard.'});
  const q = event.queryStringParameters || {};

  try {
    if (q.id) {
      const rows = await db.select('scans', `id=eq.${encodeURIComponent(q.id)}&account_id=eq.${session.account.id}&select=*`);
      if (!rows.length) return json(404, {ok: false, error: 'Scan not found.'});
      return json(200, {ok: true, scan: rows[0]});
    }
    if (q.compare) {
      const [a, b] = String(q.compare).split(',').map((s) => s.trim()).filter(Boolean);
      if (!a || !b) return json(400, {ok: false, error: 'compare needs two scan ids.'});
      const rows = await db.select('scans', `id=in.(${encodeURIComponent(a)},${encodeURIComponent(b)})&account_id=eq.${session.account.id}&select=*`);
      if (rows.length !== 2) return json(404, {ok: false, error: 'One or both scans not found.'});
      return json(200, {ok: true, scans: rows});
    }
    const scans = await db.select('scans', `account_id=eq.${session.account.id}&select=id,store_url,depth,detected_count,evidence_score,created_at&order=created_at.desc&limit=50`);
    return json(200, {ok: true, email: session.account.email, plan: session.subscription?.plan || null, scans});
  } catch (e) {
    console.error('dashboard-data', e.message);
    return json(500, {ok: false, error: 'Could not load dashboard data.'});
  }
};
