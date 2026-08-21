'use strict';
// telemetry.js — one PII-free row per scan, signed-in or not.
//
// Why this exists: every scan used to be computed and thrown away, and only
// signed-in scans persisted at all. The engine therefore had no measured record
// of what it detects, what it fails to detect, or which apps really co-occur.
// That record is the one asset a detection product can own; BuiltWith and
// Wappalyzer already do detection, but nobody else can measure THIS ruleset.
//
// PII-free BY CONSTRUCTION, not by convention:
//   * SCAN_EVENT_FIELDS below is the whole column set. buildScanEvent() returns
//     exactly those keys and tests assert on the literal list, so a field that
//     carries personal data cannot be added without changing both.
//   * No email, no IP, no account id, no session id, no UTM, no referrer, no
//     landing page, no submitted spend or goal. None of it is passed in.
//   * No URLs. `report.crawl.pagesFetched` and `detectedApps[].evidence` both
//     carry storefront page URLs; only their counts and signature ids survive.
//   * The storefront hostname is stored as an HMAC (see hashStoreHost).
//
// The row is not linked to `scans` or `accounts` by any key. Repeat-scan and
// co-occurrence analysis run off store_hash and the detections array alone, so
// there is no join back to a customer for anyone holding this table.

const crypto = require('node:crypto');

// Secret keyed into the storefront hostname HMAC. Set in the Netlify UI, never
// in a file. See docs/DATA-RETENTION.md for why an unset value means no hash
// rather than a plain digest.
const SALT_ENV = 'SCAN_TELEMETRY_SALT';

// The exact column set of supabase/schema.sql `scan_events`. This list is the
// privacy contract for the table.
const SCAN_EVENT_FIELDS = [
  'rules_version',
  'depth',
  'store_hash',
  'shopify_confirmed',
  'crawl_ok',
  'crawl_blocked',
  'blocked_by',
  'blocked_reason',
  'pages_fetched',
  'sources_live',
  'sources_succeeded',
  'source_results',
  'detections',
  'detected_count',
  'strength_counts',
  'savings_suppressed_reason',
  'duration_ms'
];

// Hostname only, lowercased, `www.` dropped, port and path discarded, so the
// same store hashes the same however the customer typed it.
function normalizeHost(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch (e) {
    return null;
  }
}

/**
 * Salted (HMAC-SHA256) digest of the normalized storefront hostname, or null.
 *
 * Why not the hostname itself: a storefront domain is arguably not personal
 * data, but it names a customer's business and is their confidential context,
 * and this table is written for anonymous visitors who were never asked for
 * anything. The analysis this data is for — how often a signature fires, which
 * apps co-occur, whether a store was rescanned — needs a stable identifier, not
 * a readable one, so it gets the identifier and nothing more.
 *
 * Why not a bare sha256: the set of live domains is small enough to enumerate,
 * so an unkeyed digest of a hostname is reversible by brute force and would be
 * pseudonymity in name only. The key makes the table useless to anyone who has
 * the rows but not the secret.
 *
 * Why null when the key is unset rather than falling back to a bare digest:
 * a silent fallback would store something weaker than what the privacy policy
 * describes. Losing repeat-scan analysis is the cheaper failure — per-signature
 * frequency and co-occurrence still work, because both read one row at a time.
 */
function hashStoreHost(value) {
  const salt = process.env[SALT_ENV] || '';
  const host = normalizeHost(value);
  if (!host || !salt) return null;
  return crypto.createHmac('sha256', salt).update(host).digest('hex');
}

const intOr0 = (v) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);
const strOrNull = (v) => (typeof v === 'string' && v ? v : null);

/**
 * Build the scan_events row. Pure, synchronous, and the only place the payload
 * is assembled.
 * @param {object} report a FULL-depth report (lib/aggregate.js buildFullReport);
 *   the teaser view drops signature ids, and anonymous scans are the reason this
 *   table exists.
 * @param {object} scan raw runAdapters() output, for per-source results.
 * @param {string} storeUrl the submitted URL. Hashed, never stored.
 * @param {string} depth what the customer was actually served ('teaser'|'full').
 * @param {number} durationMs crawl wall time, or null.
 */
function buildScanEvent({report = {}, scan = {}, storeUrl = '', depth = 'teaser', durationMs = null} = {}) {
  const crawl = report.crawl || {};
  const summary = report.summary || {};
  const detections = (report.detectedApps || [])
    .filter((a) => a && a.id)
    .map((a) => ({
      id: a.id,
      strength: strOrNull(a.strength),
      confidence: Number.isFinite(Number(a.confidence)) ? Number(a.confidence) : null
    }));
  // `detail` is dropped: it is a human sentence that can quote the fetched URL.
  const sourceResults = (scan.sources || [])
    .filter((s) => s && s.id)
    .map((s) => ({id: s.id, ok: Boolean(s.ok)}));

  return {
    rules_version: strOrNull(report.rulesVersion),
    depth: depth === 'full' ? 'full' : 'teaser',
    store_hash: hashStoreHost(storeUrl),
    shopify_confirmed: Boolean(crawl.shopifyConfirmed),
    crawl_ok: Boolean(crawl.ok),
    crawl_blocked: Boolean(crawl.blocked),
    blocked_by: strOrNull(crawl.blockedBy),
    blocked_reason: strOrNull(crawl.blockedReason),
    pages_fetched: (crawl.pagesFetched || []).length,
    sources_live: intOr0(scan.sourcesLive),
    sources_succeeded: intOr0(scan.sourcesSucceeded),
    source_results: sourceResults,
    detections,
    detected_count: detections.length,
    strength_counts: summary.strengthCounts || {detected: 0, likely: 0, possible: 0},
    savings_suppressed_reason: strOrNull(summary.savingsSuppressedReason),
    duration_ms: typeof durationMs === 'number' && Number.isFinite(durationMs) ? Math.max(0, Math.trunc(durationMs)) : null
  };
}

/**
 * Write the row. Never throws, never rejects: the scan response is what the
 * customer paid for, and a telemetry failure must not touch it. The caller does
 * NOT await this — see operator-url-scan.js for how the write is overlapped with
 * work the handler was going to do anyway.
 */
function recordScanEvent(db, payload) {
  if (!db || !db.enabled) return Promise.resolve({written: false, reason: 'db_disabled'});
  return Promise.resolve()
    .then(() => db.insert('scan_events', payload))
    .then(() => ({written: true}))
    .catch((e) => {
      console.error('scan-telemetry', e.message);
      return {written: false, reason: e.message};
    });
}

module.exports = {SALT_ENV, SCAN_EVENT_FIELDS, normalizeHost, hashStoreHost, buildScanEvent, recordScanEvent};
