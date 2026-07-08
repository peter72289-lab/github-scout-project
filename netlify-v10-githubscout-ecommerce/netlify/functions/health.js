'use strict';
// Health + configuration reporter. Reports which subsystems are wired up by
// checking for the PRESENCE of env vars only — never echoes secret values.
const has = (k) => Boolean(process.env[k]);

exports.handler = async () => {
  const config = {
    database: has('SUPABASE_URL') && has('SUPABASE_SERVICE_ROLE_KEY'),
    stripe_webhook: has('STRIPE_WEBHOOK_SECRET'),
    stripe_prices: has('STRIPE_PRICE_OPERATOR') || has('STRIPE_PRICE_DIRECTOR'),
    email: has('RESEND_API_KEY'),
    lead_webhook: has('GHL_WEBHOOK_URL') || has('LEAD_WEBHOOK_URL')
  };
  const ready = config.database && config.stripe_webhook && config.email;
  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
    body: JSON.stringify({
      ok: true,
      service: 'github-scout-v2-ecommerce',
      productionReady: ready,
      config, // booleans only
      note: ready ? 'All core subsystems configured.' : 'Some subsystems unconfigured; free teaser scans still work. See SETUP.md.',
      checked_at: new Date().toISOString()
    })
  };
};
