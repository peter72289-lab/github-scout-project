'use strict';
// GET -> current account + subscription + usage, or {authenticated:false}.
const db = require('./lib/supabase');
const auth = require('./lib/auth');
const plans = require('./lib/plans');

exports.handler = async (event) => {
  const session = await auth.currentAccount(event);
  if (!session) return {statusCode: 200, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify({authenticated: false})};
  let usage = null;
  try {
    const period = new Date().toISOString().slice(0, 7);
    const rows = await db.select('usage', `account_id=eq.${session.account.id}&period=eq.${period}&select=used`);
    usage = rows[0]?.used ?? 0;
  } catch (e) {}
  return {
    statusCode: 200, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
    body: JSON.stringify({
      authenticated: true,
      email: session.account.email,
      plan: session.subscription?.plan || null,
      // Served from lib/plans.js so dashboard.html does not keep its own copy of
      // the quota table. Null when there is no subscription, or when the plan is
      // retired/unresolved — the dashboard renders that as "needs review", not 0.
      quota: plans.quotaFor(session.subscription?.plan),
      subscriptionStatus: session.subscription?.status || null,
      usageThisMonth: usage
    })
  };
};
