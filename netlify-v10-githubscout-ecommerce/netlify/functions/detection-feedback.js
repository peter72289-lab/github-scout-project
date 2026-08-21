'use strict';
// detection-feedback.js — a customer telling us a detection was right or wrong.
//
// This is ground truth for the 65 hand-authored signatures in lib/rules.js, and
// it is the one measurement nobody else can take for this ruleset. It is worth
// nothing if it is noisy, so:
//   * Authenticated only. A signed-in customer looking at their own report has
//     a reason to answer honestly; an open endpoint is a spam target.
//   * The scan must belong to the caller's account, checked server-side. The
//     scan id in the body is a claim, not a credential.
//   * The signature id must exist in the shipped ruleset, so a typo or a stale
//     client cannot mint verdicts for a signature that was never in it.
//   * Idempotent per (account, scan, signature): changing an answer updates the
//     row. Duplicates would silently weight one customer's opinion twice.

const auth = require('./lib/auth');
const db = require('./lib/supabase');
const {appSignatures} = require('./lib/rules');

const VERDICTS = new Set(['correct', 'incorrect', 'unsure']);
const SIGNATURE_IDS = new Set(appSignatures.map((s) => s.id));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFLICT_TARGET = 'account_id,scan_id,signature_id';

const json = (statusCode, body) => ({
  statusCode,
  headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
  body: JSON.stringify(body)
});

/** Validate the inbound body at the boundary. Returns {ok, value} or {ok, error}. */
function parseFeedback(raw) {
  let payload;
  try { payload = JSON.parse(raw || '{}'); } catch (e) { return {ok: false, error: 'Body must be JSON.'}; }
  if (!payload || typeof payload !== 'object') return {ok: false, error: 'Body must be a JSON object.'};
  const scanId = String(payload.scanId || '');
  const signatureId = String(payload.signatureId || '');
  const verdict = String(payload.verdict || '');
  if (!UUID_RE.test(scanId)) return {ok: false, error: 'scanId must be a scan identifier.'};
  if (!SIGNATURE_IDS.has(signatureId)) return {ok: false, error: 'signatureId is not in the current ruleset.'};
  if (!VERDICTS.has(verdict)) return {ok: false, error: `verdict must be one of ${[...VERDICTS].join(', ')}.`};
  return {ok: true, value: {scanId, signatureId, verdict}};
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {statusCode: 204, headers: {'Allow': 'POST, OPTIONS'}};
  }
  if (event.httpMethod !== 'POST') {
    return {statusCode: 405, headers: {'Allow': 'POST'}, body: JSON.stringify({ok: false, error: 'Method not allowed'})};
  }
  if (!db.enabled) return json(503, {ok: false, error: 'Feedback is unavailable right now.'});

  const session = await auth.currentAccount(event);
  if (!session) return json(401, {ok: false, error: 'Sign in to send feedback on a detection.'});

  const parsed = parseFeedback(event.body);
  if (!parsed.ok) return json(400, {ok: false, error: parsed.error});
  const {scanId, signatureId, verdict} = parsed.value;

  try {
    // Ownership, not existence: a scan id belonging to another account must be
    // indistinguishable from one that does not exist.
    const rows = await db.select('scans', `id=eq.${encodeURIComponent(scanId)}&account_id=eq.${encodeURIComponent(session.account.id)}&select=id,depth`);
    const scan = rows[0];
    if (!scan) return json(404, {ok: false, error: 'That scan is not on your account.'});
    // A teaser report never names a signature, so a verdict against one cannot
    // have come from something the customer actually saw.
    if (scan.depth !== 'full') return json(409, {ok: false, error: 'Feedback applies to full-depth reports only.'});

    await db.upsert('detection_feedback', {
      account_id: session.account.id,
      scan_id: scanId,
      signature_id: signatureId,
      verdict,
      updated_at: new Date().toISOString()
    }, CONFLICT_TARGET);

    return json(200, {ok: true, scanId, signatureId, verdict});
  } catch (e) {
    console.error('detection-feedback', e.message);
    return json(502, {ok: false, error: 'Feedback could not be saved. Try again.'});
  }
};

module.exports.parseFeedback = parseFeedback;
module.exports.VERDICTS = VERDICTS;
module.exports.CONFLICT_TARGET = CONFLICT_TARGET;
