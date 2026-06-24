#!/usr/bin/env node

const fs = require('node:fs');

function readKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY.trim();
  if (process.argv.includes('--read-key-stdin')) {
    return fs.readFileSync(0, 'utf8').trim();
  }
  return '';
}

const key = readKey();
const siteUrl = process.env.GITHUB_SCOUT_SITE_URL || 'https://githubscout-ecommerce-v9-20260609.netlify.app';

if (!key) {
  console.error('Missing STRIPE_SECRET_KEY. Use a live restricted key for production links or a test key for sandbox links.');
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
const isLive = key.startsWith('sk_live_') || key.startsWith('rk_live_');

const plans = [
  {
    id: 'github_scout_operator',
    lookupKey: 'github_scout_operator_monthly_17',
    paymentLinkKey: 'github_scout_operator_monthly_payment_link',
    name: 'GitHub Scout Operator',
    amount: 1700,
    description: '10 storefront URL analyses per month across all 15 GitHub Scout sources.'
  },
  {
    id: 'github_scout_director',
    lookupKey: 'github_scout_director_monthly_37',
    paymentLinkKey: 'github_scout_director_monthly_payment_link',
    name: 'GitHub Scout Director',
    amount: 3700,
    description: '30 storefront URL analyses per month across all 15 GitHub Scout sources.'
  }
];

async function stripe(method, path, body, idempotencyKey) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? {'Idempotency-Key': idempotencyKey} : {})
    },
    body: body ? new URLSearchParams(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload.error?.message || JSON.stringify(payload);
    const code = payload.error?.code || response.status;
    const error = new Error(`${path} failed: ${message}`);
    error.code = code;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function getOrCreateProduct(plan) {
  try {
    return await stripe('GET', `/v1/products/${plan.id}`);
  } catch (error) {
    if (error.payload?.error?.code !== 'resource_missing') throw error;
  }
  return stripe('POST', '/v1/products', {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    'metadata[github_scout_plan]': plan.id
  }, `${plan.id}_product_v1`);
}

async function getOrCreatePrice(plan, productId) {
  const existing = await stripe('GET', `/v1/prices?lookup_keys[]=${encodeURIComponent(plan.lookupKey)}&active=true&limit=1`);
  if (existing.data?.[0]) return existing.data[0];
  return stripe('POST', '/v1/prices', {
    currency: 'usd',
    unit_amount: String(plan.amount),
    product: productId,
    lookup_key: plan.lookupKey,
    'recurring[interval]': 'month',
    'metadata[github_scout_plan]': plan.id
  }, `${plan.id}_monthly_price_v1`);
}

async function getOrCreatePaymentLink(plan, priceId) {
  const links = await stripe('GET', '/v1/payment_links?active=true&limit=100');
  const existing = links.data?.find((link) => link.metadata?.github_scout_payment_link === plan.paymentLinkKey);
  if (existing) return existing;
  return stripe('POST', '/v1/payment_links', {
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    allow_promotion_codes: 'true',
    'after_completion[type]': 'redirect',
    'after_completion[redirect][url]': `${siteUrl}/operator-thank-you.html?checkout=success&plan=${encodeURIComponent(plan.id)}`,
    'metadata[github_scout_payment_link]': plan.paymentLinkKey,
    'metadata[github_scout_plan]': plan.id
  }, `${plan.id}_payment_link_v1`);
}

async function main() {
  const results = {};
  for (const plan of plans) {
    const product = await getOrCreateProduct(plan);
    const price = await getOrCreatePrice(plan, product.id);
    const paymentLink = await getOrCreatePaymentLink(plan, price.id);
    results[plan.id.includes('operator') ? 'operator' : 'director'] = {
      product_id: product.id,
      price_id: price.id,
      payment_link_id: paymentLink.id,
      payment_link_url: paymentLink.url,
      mode: isLive ? 'live' : 'test'
    };
  }

  console.log(JSON.stringify({
    ok: true,
    mode: isLive ? 'live' : 'test',
    site_url: siteUrl,
    results
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
