'use strict';
// Scheduled housekeeping: purge expired magic links, dead sessions, and stale
// rate-limit rows. Runs daily. Configure the schedule in netlify.toml under
// [functions."cleanup-scheduled"] or leave the default below.
const db = require('./lib/supabase');

exports.handler = async () => {
  if (!db.enabled) return {statusCode: 200, body: 'skipped: db not configured'};
  const nowIso = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const results = {};
  const tryDel = async (label, table, query) => {
    try { await db.del(table, query); results[label] = 'ok'; }
    catch (e) { results[label] = e.message; }
  };
  await tryDel('expired_magic_links', 'magic_links', `expires_at=lt.${dayAgo}`);
  await tryDel('expired_sessions', 'sessions', `expires_at=lt.${nowIso}`);
  await tryDel('stale_rate_limits', 'rate_limits', `window_start=lt.${hourAgo}`);
  console.log('cleanup', results);
  return {statusCode: 200, body: JSON.stringify({ok: true, results})};
};
