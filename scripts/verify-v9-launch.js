#!/usr/bin/env node

const base = process.argv[2] || 'https://githubscout-ecommerce-v9-20260609.netlify.app';

const requiredPages = [
  '/',
  '/operator-shopify-savings.html',
  '/operator-url-analysis.html?store_url=https%3A%2F%2Fexample.com&monthly_ad_spend=Under+%2410%2C000+a+month&primary_goal=Cut+app+costs',
  '/checkout-operator.html',
  '/checkout-director.html',
  '/agency-pricing.html',
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known/security.txt',
  '/.netlify/functions/health'
];

async function assertOk(path) {
  const url = new URL(path, base).toString();
  const response = await fetch(url, {redirect: 'manual'});
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  const text = await response.text();
  return {path, status: response.status, bytes: text.length};
}

async function verifyAnalyzeFunction() {
  const response = await fetch(new URL('/.netlify/functions/operator-url-scan', base), {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      intent: 'lead',
      email: 'launch-check@example.com',
      store_url: 'https://example.com',
      monthly_ad_spend: 'Under $10,000 a month',
      primary_goal: 'Cut app costs',
      utm_source: 'verification'
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(`operator-url-scan failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  return {path: '/.netlify/functions/operator-url-scan', status: response.status, webhook: payload.webhook?.sent ? 'sent' : payload.webhook?.reason || 'unknown'};
}

(async () => {
  const pageResults = [];
  for (const path of requiredPages) {
    pageResults.push(await assertOk(path));
  }
  pageResults.push(await verifyAnalyzeFunction());
  console.log(JSON.stringify({ok: true, base, checked_at: new Date().toISOString(), results: pageResults}, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ok: false, base, error: error.message}, null, 2));
  process.exit(1);
});
