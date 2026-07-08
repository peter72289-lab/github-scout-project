'use strict';
// GET ?token=... -> consumes magic link, sets session cookie, redirects to dashboard.
const db = require('./lib/supabase');
const auth = require('./lib/auth');

exports.handler = async (event) => {
  if (!db.enabled) return {statusCode: 503, body: 'Accounts are not configured yet.'};
  const token = (event.queryStringParameters || {}).token || '';
  try {
    const {sessionToken} = await auth.consumeMagicLink(token);
    return {
      statusCode: 302,
      headers: {'Set-Cookie': auth.sessionCookie(sessionToken), 'Location': '/dashboard.html', 'Cache-Control': 'no-store'},
      body: ''
    };
  } catch (e) {
    return {statusCode: 302, headers: {'Location': `/login.html?error=${encodeURIComponent(e.message)}`, 'Cache-Control': 'no-store'}, body: ''};
  }
};
