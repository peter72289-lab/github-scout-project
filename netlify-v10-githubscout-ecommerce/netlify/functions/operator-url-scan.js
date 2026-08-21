'use strict';
// operator-url-scan.js v2 — orchestrates the multi-source scan engine.
// Free (anonymous): teaser-depth report, IP rate-limited.
// Signed-in + active subscription: full-depth report, monthly quota enforced
// server-side, scan persisted to the dashboard.

const {clientIp, checkRateLimitShared, RATE_LIMIT_MAX} = require('./lib/guard');
const {runAdapters} = require('./lib/adapters');
const {buildReport} = require('./lib/aggregate');
const db = require('./lib/supabase');
const auth = require('./lib/auth');
const plans = require('./lib/plans');

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

// Returns null quota when the plan on the subscription row cannot be resolved
// (unknown id, or the retired `command` tier). The caller must refuse the scan
// rather than assume a tier — see the 403 below.
async function checkQuota(accountId, plan) {
  const quota = plans.quotaFor(plan);
  if (quota === null) return {allowed: false, used: null, quota: null, unresolved: true};
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const result = await db.rpc('usage_increment', {p_account_id: accountId, p_period: period, p_max: quota});
  return {allowed: Boolean(result?.allowed), used: result?.used ?? null, quota};
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
  if (session?.subscription) {
    const q = await checkQuota(session.account.id, session.subscription.plan);
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
  }

  let scan;
  try {
    scan = await runAdapters(submission.store_url);
  } catch (e) {
    scan = {pages: [], sources: [], sourcesLive: 9, sourcesSucceeded: 0, sourcesPlanned: [], error: e.message};
  }
  const report = buildReport(scan, submission, depth);
  if (scan.error) report.crawl.statusLabel = `Live crawl unavailable: ${scan.error}. No savings estimate is shown without evidence.`;

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
