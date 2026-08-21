'use strict';
// auth.js — passwordless (magic-link) auth + server-side sessions.
// Tokens are random 32-byte hex, stored HASHED (sha256) so a DB leak does not
// leak live login links. Sessions are HttpOnly cookies, 30 days.

const crypto = require('node:crypto');
const db = require('./supabase');

const MAGIC_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;
const COOKIE_NAME = 'gs_session';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

async function getOrCreateAccount(email) {
  const found = await db.select('accounts', `email=eq.${encodeURIComponent(email)}&select=*`);
  if (found.length) return found[0];
  const created = await db.insert('accounts', {email});
  return created[0];
}

const MAGIC_MAX_PER_HOUR = 5;

// Throttle links per email so nobody can flood an inbox by rotating IPs.
// Returns false if the address has already been sent MAGIC_MAX_PER_HOUR links
// in the last hour.
async function magicLinkAllowedForEmail(accountId) {
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await db.select('magic_links', `account_id=eq.${accountId}&created_at=gte.${since}&select=id`);
  return recent.length < MAGIC_MAX_PER_HOUR;
}

async function createMagicLink(email) {
  const account = await getOrCreateAccount(email);
  if (!(await magicLinkAllowedForEmail(account.id))) {
    const err = new Error('link_rate_limited');
    err.code = 'RATE_LIMITED';
    throw err;
  }
  const token = randomToken();
  await db.insert('magic_links', {
    account_id: account.id, token_hash: sha256(token),
    expires_at: new Date(Date.now() + MAGIC_TTL_MIN * 60000).toISOString()
  });
  return {account, token};
}

async function consumeMagicLink(token) {
  const hash = sha256(String(token || ''));
  const rows = await db.select('magic_links', `token_hash=eq.${hash}&used_at=is.null&select=*`);
  const link = rows[0];
  if (!link) throw new Error('Invalid or already-used sign-in link.');
  if (new Date(link.expires_at) < new Date()) throw new Error('Sign-in link expired. Request a new one.');
  await db.update('magic_links', `id=eq.${link.id}`, {used_at: new Date().toISOString()});
  const session = randomToken();
  await db.insert('sessions', {
    account_id: link.account_id, token_hash: sha256(session),
    expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 86400000).toISOString()
  });
  return {sessionToken: session, accountId: link.account_id};
}

function sessionCookie(token) {
  const maxAge = SESSION_TTL_DAYS * 86400;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
const clearCookie = () => `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

function readSessionToken(event) {
  const cookies = String(event.headers.cookie || '');
  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([a-f0-9]{64})`));
  return match ? match[1] : null;
}

/** Returns {account, subscription} or null. Never throws on missing config. */
async function currentAccount(event) {
  if (!db.enabled) return null;
  const token = readSessionToken(event);
  if (!token) return null;
  try {
    const rows = await db.select('sessions', `token_hash=eq.${sha256(token)}&select=*`);
    const session = rows[0];
    if (!session || new Date(session.expires_at) < new Date()) return null;
    const accounts = await db.select('accounts', `id=eq.${session.account_id}&select=*`);
    if (!accounts.length) return null;
    // `needs_review` is included on purpose: the buyer paid but the webhook
    // could not resolve their plan (stripe-webhook.js). The row must surface so
    // the scan function can refuse with a 403 and the dashboard can tell them
    // to contact support, instead of the account silently looking unsubscribed.
    const subs = await db.select('subscriptions', `account_id=eq.${session.account_id}&status=in.(active,trialing,needs_review)&select=*&order=created_at.desc&limit=1`);
    return {account: accounts[0], subscription: subs[0] || null, sessionId: session.id};
  } catch (e) {
    console.error('auth-current-account', e.message);
    return null;
  }
}

async function destroySession(event) {
  const token = readSessionToken(event);
  if (token && db.enabled) {
    try { await db.del('sessions', `token_hash=eq.${sha256(token)}`); } catch (e) {}
  }
}

// Email delivery: Resend if configured, otherwise the link is logged so the
// flow is testable pre-launch. NEVER return the link in the HTTP response.
// `kind` = 'signin' (default) or 'welcome' (post-purchase) for tailored copy.
function emailBody(link, kind) {
  const welcome = kind === 'welcome';
  const heading = welcome ? 'Welcome — your subscription is active' : 'Sign in to Scout';
  const intro = welcome
    ? 'Thanks for subscribing. Your account is ready. Use the button below to open your dashboard, where your scans are saved and your monthly quota is tracked.'
    : 'Use the button below to sign in. It works once and expires in ' + MAGIC_TTL_MIN + ' minutes.';
  const text = `${heading}\n\n${intro}\n\n${link}\n\n`
    + (welcome ? 'Getting started: run your first scan from the dashboard, then use "Compare" after a later scan to see what changed.\n\n' : '')
    + `If you didn't request this, you can ignore this email.\n\n— Scout`;
  const html = `<!doctype html><html><body style="margin:0;background:#0d0f12;font-family:system-ui,-apple-system,Segoe UI,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">`
    + `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#15181d;border:1px solid #262b33;border-radius:12px">`
    + `<tr><td style="padding:32px">`
    + `<h1 style="color:#e8e6e1;font-size:22px;margin:0 0 12px">${heading}</h1>`
    + `<p style="color:#9aa3ad;font-size:15px;line-height:1.6;margin:0 0 24px">${intro}</p>`
    + `<a href="${link}" style="display:inline-block;background:#f5b642;color:#151004;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:8px">${welcome ? 'Open my dashboard' : 'Sign in'}</a>`
    + `<p style="color:#6b7280;font-size:12px;line-height:1.6;margin:24px 0 0">If the button doesn't work, paste this link:<br><span style="color:#9aa3ad;word-break:break-all">${link}</span></p>`
    + `<p style="color:#6b7280;font-size:12px;margin:16px 0 0">If you didn't request this, ignore this email.</p>`
    + `</td></tr></table></td></tr></table></body></html>`;
  return {subject: welcome ? 'Your Scout subscription is active' : 'Your Scout sign-in link', text, html};
}

async function sendMagicEmail(email, link, kind = 'signin') {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || 'Scout <login@transactional.githubscout.ai>';
  const {subject, text, html} = emailBody(link, kind);
  if (!key) {
    console.log(`magic-link (RESEND_API_KEY unset, logging only) [${kind}]:`, email, link);
    return {sent: false, reason: 'email_not_configured'};
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from, to: [email], subject, text, html})
  });
  return {sent: res.ok, status: res.status};
}

module.exports = {
  normEmail, isEmail, sha256, getOrCreateAccount, createMagicLink, consumeMagicLink,
  sessionCookie, clearCookie, currentAccount, destroySession, sendMagicEmail, COOKIE_NAME
};
