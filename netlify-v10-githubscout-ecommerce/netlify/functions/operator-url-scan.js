'use strict';
// operator-url-scan.js v2 — orchestrates the multi-source scan engine.
// Free (anonymous): teaser-depth report, IP rate-limited.
// Signed-in + active subscription: full-depth report, monthly quota enforced
// server-side, scan persisted to the dashboard.

const {clientIp, checkRateLimitShared, RATE_LIMIT_MAX} = require('./lib/guard');
const {runAdapters, liveSourceCount} = require('./lib/adapters');
const {buildFullReport, toTeaser} = require('./lib/aggregate');
const db = require('./lib/supabase');
const auth = require('./lib/auth');
const plans = require('./lib/plans');
const telemetry = require('./lib/telemetry');

function publicSubmission(s) {
  return {
    email: s.email || null, store_url: s.store_url || null,
    monthly_ad_spend: s.monthly_ad_spend || null, monthly_app_spend: s.monthly_app_spend || null,
    primary_goal: s.primary_goal || null, intent: s.intent || 'lead',
    utm_source: s.utm_source || null, utm_medium: s.utm_medium || null, utm_campaign: s.utm_campaign || null,
    landing_page: s.landing_page || null, referrer: s.referrer || null,
    received_at: new Date().toISOString()
  };
}

async function sendWebhook(submission, summary) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL || process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) return {sent: false, reason: 'not_configured'};
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({source: 'github-scout-operator', submission: publicSubmission(submission), analysis_summary: summary || null})
    });
    return {sent: res.ok, status: res.status};
  } catch (e) { return {sent: false, reason: e.message}; }
}

const usagePeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM

// A scan "produced something" when at least one storefront page was actually
// read and the crawl was not refused by bot protection. That is deliberately
// the same bar lib/aggregate.js uses to allow a dollar figure (`no-pages-fetched`
// / `crawl-blocked` in savingsGateReason): if the report cannot contain a single
// storefront-derived finding, the customer did not get a scan.
function producedEvidence(report) {
  return Boolean(report && report.crawl && report.crawl.ok && !report.crawl.blocked);
}

// --- Quota: reserve, then release if the scan produced nothing --------------
// `usage_increment` (supabase/schema.sql) stays the ONE atomic gate. It
// increments and range-checks inside a single statement, so two concurrent
// requests for the last credit can never both be allowed: one gets
// allowed:true, the other gets allowed:false and is refused before any fetch
// happens. Checking a remaining balance first and incrementing after the crawl
// would break exactly that property — both requests would read the same
// remaining count, both would crawl, and the quota would be overrun by the
// number of requests in flight. So the credit is taken up front as a
// reservation and released afterwards when there was nothing to charge for.
//
// Failure modes, stated plainly:
//  - Race: unchanged from before this fix. The increment is atomic; over-quota
//    requests are refused before runAdapters is reached, so forcing crawl
//    failures cannot buy a scan and an unauthenticated caller never touches
//    this path at all (they get teaser depth under the IP rate limit).
//  - Crash between the crawl and the release (lambda killed, DB unreachable):
//    the reservation stays consumed and the customer is charged for a scan that
//    returned nothing. This is the one case that errs toward us. It is bounded
//    to a single credit, needs a process death inside a few milliseconds, and
//    is the price of keeping the enforcement gate atomic. The release itself is
//    floored at zero server-side, so a retry or duplicate invocation replaying
//    it can never mint credits in the other direction.
//  - Ordinary blocked/failed crawl: released, so the customer keeps the credit
//    and can retry for free. That is the intended, common outcome.
//
// Returns null quota when the plan on the subscription row cannot be resolved
// (unknown id, or the retired `command` tier). The caller must refuse the scan
// rather than assume a tier — see the 403 below.
async function reserveQuota(accountId, plan) {
  const quota = plans.quotaFor(plan);
  if (quota === null) return {allowed: false, used: null, quota: null, unresolved: true};
  const result = await db.rpc('usage_increment', {p_account_id: accountId, p_period: usagePeriod(), p_max: quota});
  return {allowed: Boolean(result?.allowed), used: result?.used ?? null, quota};
}

// Best-effort: a failed release must never turn a nothing-scan into an error
// the customer sees, so it is logged and swallowed.
async function releaseQuota(accountId) {
  try {
    const result = await db.rpc('usage_decrement', {p_account_id: accountId, p_period: usagePeriod()});
    return {released: Boolean(result?.released), used: result?.used ?? null};
  } catch (e) {
    console.error('quota-release', `account=${accountId} ${e.message}`);
    return {released: false, used: null};
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {statusCode: 204, headers: {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS'}};
  }
  if (event.httpMethod !== 'POST') {
    return {statusCode: 405, headers: {'Allow': 'POST'}, body: JSON.stringify({ok: false, error: 'Method not allowed'})};
  }

  const params = new URLSearchParams(event.body || '');
  const submission = Object.fromEntries(params.entries());
  const ip = clientIp(event);

  // Rate limit on IP only (shared store when Supabase is configured).
  const limit = await checkRateLimitShared(ip, db);
  if (!limit.allowed) {
    return {
      statusCode: 429,
      headers: {'Content-Type': 'application/json', 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))), 'X-RateLimit-Limit': String(RATE_LIMIT_MAX)},
      body: JSON.stringify({ok: false, error: 'Too many scan requests. Please wait a minute and try again.'})
    };
  }

  if (submission.intent === 'lead') {
    const webhook = await sendWebhook(submission, null);
    return {statusCode: 200, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ok: true, webhook})};
  }

  // Entitlement: signed-in with active subscription = full report + quota.
  const session = await auth.currentAccount(event);
  let depth = 'teaser';
  let usage = null;
  let reserved = false;
  if (session?.subscription) {
    const q = await reserveQuota(session.account.id, session.subscription.plan);
    usage = {used: q.used, quota: q.quota};
    if (q.unresolved) {
      // The subscription exists but names a plan we cannot price. Granting the
      // smallest tier would be a silent, wrong entitlement decision about money,
      // so refuse and make a human look at the row.
      console.error('scan-entitlement-unresolved', `account=${session.account.id} plan=${String(session.subscription.plan)}`);
      return {statusCode: 403, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ok: false, error: 'Your subscription is on hold pending review, so scans are paused. Contact support@githubscout.ai and we will sort it out.', usage})};
    }
    if (!q.allowed) {
      return {statusCode: 402, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ok: false, error: `Monthly scan quota reached (${q.quota}). Quota resets at the start of next month.`, usage})};
    }
    depth = 'full';
    reserved = true;
  }

  let scan;
  const crawlStartedAt = Date.now();
  try {
    scan = await runAdapters(submission.store_url);
  } catch (e) {
    // Count comes from the catalog, never a literal: the crawl-failure report
    // still prints "0 of N live sources" and N must match lib/adapters.js.
    scan = {pages: [], sources: [], sourcesLive: liveSourceCount(), sourcesSucceeded: 0, sourcesPlanned: [], error: e.message};
  }
  const crawlMs = Date.now() - crawlStartedAt;
  // Built once at full depth: the teaser view is derived from it, and the
  // telemetry row needs the untrimmed detection list (a free scan's report shows
  // three apps with no signature ids, which is exactly the data worth keeping).
  const fullReport = buildFullReport(scan, submission);
  const report = depth === 'teaser' ? toTeaser(fullReport) : fullReport;
  if (scan.error) report.crawl.statusLabel = `Live crawl unavailable: ${scan.error}. No savings estimate is shown without evidence.`;

  // Release the reservation for a scan that produced nothing. See the comment
  // on reserveQuota for the race and crash analysis.
  if (reserved && !producedEvidence(report)) {
    const release = await releaseQuota(session.account.id);
    if (release.released) {
      usage = {used: release.used ?? Math.max(0, (usage?.used ?? 1) - 1), quota: usage?.quota ?? null, refunded: true};
    }
  }

  // PII-free engine telemetry for EVERY scan, signed-in or not (lib/telemetry.js).
  // Deliberately not awaited: the report is what the customer came for, and a
  // slow or broken insert must not show up in their latency or their response.
  // It is fired here rather than after the response is assembled so the insert
  // is in flight across the sendWebhook await below — network time the handler
  // was going to spend anyway. `recordScanEvent` never rejects. If the runtime
  // freezes the container before the insert lands, the row is lost, which is the
  // accepted price of keeping this off the paid path.
  telemetry.recordScanEvent(db, telemetry.buildScanEvent({
    report: fullReport, scan, storeUrl: submission.store_url, depth, durationMs: crawlMs
  }));

  // Persist for signed-in users (best-effort; scan still returns on DB failure).
  let scanId = null;
  if (session && db.enabled) {
    try {
      const saved = await db.insert('scans', {
        account_id: session.account.id, store_url: submission.store_url || null,
        depth, report, detected_count: report.summary.detectedCount,
        evidence_score: report.summary.evidenceScore
      });
      scanId = saved[0]?.id || null;
    } catch (e) { console.error('scan-persist', e.message); }
  }

  const webhook = await sendWebhook(submission, {
    crawl_ok: report.crawl.ok, detected_count: report.summary.detectedCount,
    monthly_savings: report.summary.monthlySavings, evidence_score: report.summary.evidenceScore
  });

  return {
    statusCode: 200, headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ok: true, analysis: report, scanId, usage, authenticated: Boolean(session), entitled: depth === 'full', webhook})
  };
};
