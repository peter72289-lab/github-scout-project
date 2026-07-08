'use strict';
// POST {email} -> sends a magic sign-in link. Always returns generic success
// (no account enumeration). Rate-limited per IP.
const {clientIp, checkRateLimit} = require('./lib/guard');
const db = require('./lib/supabase');
const auth = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return {statusCode: 405, body: JSON.stringify({ok: false, error: 'Method not allowed'})};
  if (!db.enabled) return {statusCode: 503, body: JSON.stringify({ok: false, error: 'Accounts are not configured yet on this deployment.'})};

  const limit = checkRateLimit(`auth:${clientIp(event)}`);
  if (!limit.allowed) return {statusCode: 429, body: JSON.stringify({ok: false, error: 'Too many requests. Try again in a minute.'})};

  let email = '';
  try { email = auth.normEmail(JSON.parse(event.body || '{}').email); } catch (e) {}
  if (!auth.isEmail(email)) return {statusCode: 400, body: JSON.stringify({ok: false, error: 'A valid email is required.'})};

  try {
    const {token} = await auth.createMagicLink(email);
    const base = process.env.URL || 'http://localhost:8888';
    const link = `${base}/.netlify/functions/auth-verify?token=${token}`;
    await auth.sendMagicEmail(email, link);
  } catch (e) { console.error('auth-request-link', e.message); }

  // Generic response regardless of outcome — prevents email enumeration.
  return {statusCode: 200, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ok: true, message: 'If that email is valid, a sign-in link is on its way. It expires in 15 minutes.'})};
};
