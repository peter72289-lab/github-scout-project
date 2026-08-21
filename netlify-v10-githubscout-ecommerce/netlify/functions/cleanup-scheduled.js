'use strict';
// Scheduled housekeeping: purge expired magic links, dead sessions, stale
// rate-limit rows, and scan telemetry past its retention window. Runs daily.
// Configure the schedule in netlify.toml under [functions."cleanup-scheduled"].
// It still does not touch `scans`, `accounts`, or `detection_feedback`: the
// first two are the customer's to delete, and feedback cascades away with the
// account rather than aging out (docs/DATA-RETENTION.md).
const db = require('./lib/supabase');

// 24 months, in days. Exported so the retention window is asserted in tests and
// quoted from one place rather than restated in the docs by hand.
const TELEMETRY_RETENTION_DAYS = 730;

exports.handler = async () => {
  if (!db.enabled) return {statusCode: 200, body: 'skipped: db not configured'};
  const nowIso = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  // scan_events carries no personal data (lib/telemetry.js), so it is kept long
  // enough to compare a ruleset against the one before it and to see a full
  // year of seasonality twice — not indefinitely. Two years is also the window
  // docs/DATA-RETENTION.md proposes for saved scans, so the two agree.
  const retentionCutoff = new Date(Date.now() - TELEMETRY_RETENTION_DAYS * 86400000).toISOString();
  const results = {};
  const tryDel = async (label, table, query) => {
    try { await db.del(table, query); results[label] = 'ok'; }
    catch (e) { results[label] = e.message; }
  };
  await tryDel('expired_magic_links', 'magic_links', `expires_at=lt.${dayAgo}`);
  await tryDel('expired_sessions', 'sessions', `expires_at=lt.${nowIso}`);
  await tryDel('stale_rate_limits', 'rate_limits', `window_start=lt.${hourAgo}`);
  await tryDel('aged_scan_events', 'scan_events', `occurred_at=lt.${retentionCutoff}`);
  console.log('cleanup', results);
  return {statusCode: 200, body: JSON.stringify({ok: true, results})};
};

module.exports.TELEMETRY_RETENTION_DAYS = TELEMETRY_RETENTION_DAYS;
