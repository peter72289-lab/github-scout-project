'use strict';
// adapters.js — pluggable evidence sources. Each adapter checks one place a
// store's software stack leaves fingerprints. All live adapters are free and
// keyless. The catalog is HONEST: sources are reported as live or planned,
// and the report shows exactly which sources ran and what each found.

const dns = require('node:dns').promises;
const {fetchPublic, normalizeUrl} = require('./guard');

const SOURCE_CATALOG = [
  {id: 'home-html', name: 'Storefront homepage HTML', status: 'live'},
  {id: 'product-html', name: 'Product page HTML', status: 'live'},
  {id: 'cart-html', name: 'Cart page HTML', status: 'live'},
  {id: 'products-json', name: 'Shopify /products.json catalog', status: 'live'},
  {id: 'robots-sitemap', name: 'robots.txt + sitemap', status: 'live'},
  {id: 'http-headers', name: 'HTTP response headers', status: 'live'},
  {id: 'dns-records', name: 'DNS TXT/MX records', status: 'live'},
  {id: 'script-hosts', name: 'Third-party script host census', status: 'live'},
  {id: 'structured-data', name: 'JSON-LD / meta generator tags', status: 'live'},
  {id: 'checkout-fingerprint', name: 'Checkout / payment provider fingerprint', status: 'live'},
  {id: 'app-store-listings', name: 'Shopify App Store listing cross-check', status: 'planned'},
  {id: 'page-speed', name: 'Script weight / performance impact', status: 'planned'},
  {id: 'wayback-history', name: 'Historical stack changes (web archive)', status: 'planned'},
  {id: 'ad-library', name: 'Ad library creative fingerprints', status: 'planned'},
  {id: 'email-capture-flow', name: 'Signup flow / ESP fingerprint', status: 'planned'}
];
// Removed: 'checkout-fingerprint-plan' ("Deeper checkout flow trace"). It
// duplicated the live 'checkout-fingerprint' source, which inflated the catalog
// to 16 and made the roadmap read as 10 live + 6 planned. The catalog is the one
// source of truth for every published count: 10 live, 15 total.

// Payment/checkout provider fingerprints for the checkout-fingerprint source.
// Providers are informational (they inform recommendations, not savings).
const CHECKOUT_PROVIDERS = [
  {id: 'shop-pay', name: 'Shop Pay / Shopify Checkout', patterns: ['shop_pay', 'shopify_pay', 'shop-pay', 'shopifycloud/checkout'], hosts: ['shop.app']},
  {id: 'stripe', name: 'Stripe', patterns: ['js.stripe.com', 'stripe('], hosts: ['js.stripe.com', 'm.stripe.network']},
  {id: 'paypal-checkout', name: 'PayPal / Braintree', patterns: ['paypal.com/sdk', 'braintreegateway'], hosts: ['www.paypal.com', 'js.braintreegateway.com']},
  {id: 'bolt', name: 'Bolt', patterns: ['connect.bolt'], hosts: ['connect.bolt.com']},
  {id: 'fastspring', name: 'FastSpring', patterns: ['fastspring'], hosts: ['sbl.onfastspring.com']},
  {id: 'recharge-checkout', name: 'Recharge Checkout', patterns: ['checkout.rechargeapps'], hosts: ['checkout.rechargeapps.com']},
  {id: 'bigcommerce-checkout', name: 'BigCommerce Checkout', patterns: ['checkout.bigcommerce'], hosts: ['checkout.bigcommerce.com']}
];

function detectCheckoutProviders(pages, hostSet) {
  const found = [];
  const hay = pages.map((p) => p.evidence.haystack).join(' ');
  for (const prov of CHECKOUT_PROVIDERS) {
    const byPattern = (prov.patterns || []).some((p) => hay.includes(p.toLowerCase()));
    const byHost = (prov.hosts || []).some((h) => hostSet.has(h.toLowerCase()) || [...hostSet].some((sh) => sh.endsWith(h.toLowerCase())));
    if (byPattern || byHost) found.push({id: prov.id, name: prov.name, via: byHost ? 'script-host' : 'page-pattern'});
  }
  return found;
}

// --- Bot-protection detection ---------------------------------------------
// A store behind Cloudflare, Akamai, PerimeterX, DataDome, or Imperva answers an
// automated request with a refusal or an interstitial instead of the page. That
// is a fact about the store's edge configuration, not a finding about its app
// stack, and reporting the two identically is what makes "we could not see your
// store" read as "your store is clean". Everything below exists to keep them
// apart.
//
// Statuses that mean refusal on their own. 503 is NOT here: a genuine outage
// also returns 503, so it only counts as a block when a challenge marker is in
// the body as well.
const BLOCKING_STATUSES = new Set([403, 429]);

const CHALLENGE_VENDORS = [
  {vendor: 'Cloudflare', body: ['cf_chl_opt', 'cf-browser-verification', '/cdn-cgi/challenge-platform', 'ddos protection by cloudflare', 'cf-error-details'], title: ['just a moment', 'attention required', 'access denied']},
  {vendor: 'Akamai', body: ['errors.edgesuite.net', 'akamai reference', 'ak-bmsc'], title: ['access denied', 'pardon our interruption']},
  {vendor: 'PerimeterX', body: ['perimeterx', '_pxhd', 'px-captcha', 'captcha.px-cdn.net'], title: ['access to this page has been denied', 'pardon our interruption']},
  {vendor: 'DataDome', body: ['datadome', 'geo.captcha-delivery.com'], title: []},
  {vendor: 'Imperva', body: ['_incapsula_resource', 'incapsula incident id', 'incident id:'], title: ['request unsuccessful']},
  {vendor: 'Vercel', body: ['vercel security checkpoint'], title: ['vercel security checkpoint']},
  {vendor: 'Shopify bot protection', body: [], title: ['sorry, you have been blocked']}
];

// Titles that are a challenge/refusal on their own, whatever the vendor.
const CHALLENGE_TITLES = ['just a moment', 'attention required', 'access denied', 'has been denied', 'are you a robot', 'pardon our interruption', 'checking your browser', 'you have been blocked', 'request unsuccessful', 'verify you are human'];

function pageTitle(body) {
  const m = String(body || '').match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim().toLowerCase() : '';
}

function vendorFor(body, title) {
  const hay = String(body || '').toLowerCase();
  for (const v of CHALLENGE_VENDORS) {
    if (v.body.some((p) => hay.includes(p))) return v.vendor;
    if (title && v.title.some((p) => title.includes(p))) return v.vendor;
  }
  return null;
}

/**
 * Classify one fetchPublic() result as a bot-protection block.
 *
 * Two rules, deliberately asymmetric:
 *  - Non-2xx: HTTP 403/429 is a block by itself; any other failing status is a
 *    block only when the body carries a vendor challenge marker.
 *  - 2xx: only the <title> is consulted. Cloudflare injects
 *    `/cdn-cgi/challenge-platform/...` script tags into perfectly normal pages
 *    under Bot Fight Mode, so matching body markers on a successful fetch would
 *    label healthy stores as blocked.
 *
 * @returns {{blocked: true, status: number, reason: string, vendor: string|null}|null}
 */
function classifyBlock(res) {
  if (!res || typeof res.status !== 'number') return null;
  const ok = res.status >= 200 && res.status < 300;
  const title = pageTitle(res.body);
  const vendor = vendorFor(res.body, title);
  if (!ok && BLOCKING_STATUSES.has(res.status)) {
    return {blocked: true, status: res.status, reason: 'http-status', vendor};
  }
  if (!ok && vendor) return {blocked: true, status: res.status, reason: 'challenge-page', vendor};
  if (ok && title && CHALLENGE_TITLES.some((p) => title.includes(p))) {
    return {blocked: true, status: res.status, reason: 'challenge-page', vendor};
  }
  return null;
}

function blockDetail(block) {
  const who = block.vendor ? `${block.vendor} bot protection` : 'bot protection';
  return block.reason === 'http-status'
    ? `Blocked by ${who} (HTTP ${block.status}).`
    : `Blocked by ${who}: an automated-traffic challenge page was returned instead of the store page (HTTP ${block.status}).`;
}

/**
 * Roll per-source block signals up into one crawl-level verdict.
 *
 * `low-success-ratio` is the third detector the report needs: the domain
 * clearly resolves and the edge answered with real HTTP responses, yet not one
 * storefront page came back. A store that is merely offline fails DNS or the
 * TCP connect; a store behind bot management answers, then refuses.
 */
function summarizeBlock({signals, pagesFetched, domainResolves, httpResponses}) {
  const list = (signals || []).filter(Boolean);
  if (list.length && pagesFetched === 0) {
    const primary = list.find((s) => s.reason === 'http-status') || list[0];
    return {blocked: true, reason: primary.reason, vendor: list.map((s) => s.vendor).find(Boolean) || null, signals: list};
  }
  if (pagesFetched === 0 && domainResolves && httpResponses > 0) {
    return {blocked: true, reason: 'low-success-ratio', vendor: list.map((s) => s.vendor).find(Boolean) || null, signals: list};
  }
  // Signals exist but pages came back too: partial refusal, not a blocked crawl.
  return {blocked: false, reason: null, vendor: null, signals: list};
}

function liveSourceCount() { return SOURCE_CATALOG.filter((s) => s.status === 'live').length; }
function plannedSourceCount() { return SOURCE_CATALOG.filter((s) => s.status === 'planned').length; }

/**
 * The only numbers any page, doc, or receipt may quote.
 * `total` is the whole roadmap (live + planned), which is what "planned" means
 * in customer copy: "10 live, 15 planned", not "15 more on top of 10".
 */
function sourceCounts() {
  const live = liveSourceCount();
  const planned = plannedSourceCount();
  return {live, planned, total: live + planned};
}

// --- HTML evidence extraction (structure-aware, not just substring soup) ---
function parseHtmlEvidence(html) {
  const text = String(html || '');
  const scriptHosts = new Set();
  const hostRe = /<(?:script|link|img|iframe)[^>]+(?:src|href)=["']?(?:https?:)?\/\/([^/"'\s>]+)/gi;
  let m;
  while ((m = hostRe.exec(text))) scriptHosts.add(m[1].toLowerCase());
  const generator = (text.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i) || [])[1] || null;
  const jsonLdTypes = [];
  const ldRe = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(text))) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach((item) => item && item['@type'] && jsonLdTypes.push(String(item['@type'])));
    } catch (e) { /* malformed ld+json is common; skip */ }
  }
  return {haystack: text.toLowerCase(), scriptHosts: [...scriptHosts], generator, jsonLdTypes};
}

async function fetchPage(url, sourceId) {
  try {
    const res = await fetchPublic(url, {allowTypes: ['text/html', 'application/xhtml+xml', 'text/plain']});
    const block = classifyBlock(res);
    // A 2xx challenge page is not a storefront page: parsing it would file the
    // challenge vendor's own scripts as the merchant's app stack.
    if (block) return {sourceId, ok: false, status: res.status, block, detail: blockDetail(block), url: String(url)};
    if (!res.ok) return {sourceId, ok: false, status: res.status, detail: res.skipped || `HTTP ${res.status}`, url: String(url)};
    return {sourceId, ok: true, url: res.finalUrl, status: res.status, headers: res.headers, evidence: parseHtmlEvidence(res.body), bytes: res.body.length};
  } catch (e) {
    return {sourceId, ok: false, detail: e.message, url: String(url)};
  }
}

async function adapterProductsJson(base) {
  try {
    const res = await fetchPublic(new URL('/products.json?limit=5', base), {allowTypes: ['application/json', 'text/plain', 'text/html'], maxChars: 60000});
    const block = classifyBlock(res);
    if (block) return {ok: false, status: res.status, block, detail: blockDetail(block)};
    if (!res.ok) return {ok: false, status: res.status, detail: `HTTP ${res.status}`};
    const data = JSON.parse(res.body);
    const products = Array.isArray(data.products) ? data.products : [];
    const sample = products.find((p) => p.handle);
    return {
      ok: true,
      shopifyConfirmed: true,
      productCount: products.length,
      sampleProductUrl: sample ? new URL(`/products/${sample.handle}`, base).toString() : null,
      detail: `Shopify catalog endpoint responded with ${products.length} product(s).`
    };
  } catch (e) {
    return {ok: false, detail: /json/i.test(e.message) ? 'Endpoint present but not Shopify catalog JSON.' : e.message};
  }
}

async function adapterRobots(base) {
  try {
    const res = await fetchPublic(new URL('/robots.txt', base), {allowTypes: ['text/plain', 'text/html'], maxChars: 20000});
    const block = classifyBlock(res);
    if (block) return {ok: false, status: res.status, block, detail: blockDetail(block)};
    if (!res.ok) return {ok: false, status: res.status, detail: `HTTP ${res.status}`};
    const body = res.body.toLowerCase();
    const shopify = body.includes('shopify');
    const sitemaps = [...res.body.matchAll(/sitemap:\s*(\S+)/gi)].map((x) => x[1]);
    return {ok: true, shopifyConfirmed: shopify, sitemaps, haystack: body, detail: `robots.txt fetched${shopify ? '; Shopify-generated' : ''}; ${sitemaps.length} sitemap(s).`};
  } catch (e) { return {ok: false, detail: e.message}; }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
  ]);
}

async function adapterDns(hostname) {
  const apex = hostname.replace(/^www\./, '');
  const out = {ok: false, txt: [], mx: [], detail: ''};
  try {
    const [txt, mx] = await Promise.allSettled([
      withTimeout(dns.resolveTxt(apex), 3500, 'TXT lookup'),
      withTimeout(dns.resolveMx(apex), 3500, 'MX lookup')
    ]);
    if (txt.status === 'fulfilled') out.txt = txt.value.map((r) => r.join('')).slice(0, 30);
    if (mx.status === 'fulfilled') out.mx = mx.value.map((r) => r.exchange.toLowerCase());
    out.ok = txt.status === 'fulfilled' || mx.status === 'fulfilled';
    out.detail = out.ok ? `${out.txt.length} TXT, ${out.mx.length} MX records inspected.` : 'DNS lookup failed.';
  } catch (e) { out.detail = e.message; }
  return out;
}

function headerEvidence(headers = {}) {
  const interesting = {};
  ['server', 'x-shopify-stage', 'x-shopid', 'x-sorting-hat-shopid', 'powered-by', 'x-powered-by', 'x-cache', 'x-served-by', 'via'].forEach((k) => {
    if (headers[k]) interesting[k] = String(headers[k]).slice(0, 120);
  });
  return interesting;
}

/**
 * Run all live adapters against a storefront. Returns pages, dns, headers,
 * shopify confirmation, and a per-source status list for the report.
 */
async function runAdapters(storeUrl) {
  const base = normalizeUrl(storeUrl);
  const sources = [];
  const mark = (id, ok, detail) => sources.push({id, name: SOURCE_CATALOG.find((s) => s.id === id).name, ok, detail});

  // Home page first (headers come from it), then parallel secondary fetches.
  const home = await fetchPage(base, 'home-html');
  mark('home-html', home.ok, home.ok ? `Fetched ${home.url} (${home.bytes.toLocaleString('en-US')} chars).` : home.detail);
  const headers = home.ok ? headerEvidence(home.headers) : {};
  mark('http-headers', home.ok, home.ok ? (Object.keys(headers).length ? `Signals: ${Object.keys(headers).join(', ')}` : 'No distinctive headers.') : 'Home fetch failed.');

  const [productsJson, robots, dnsInfo, cart] = await Promise.all([
    adapterProductsJson(base),
    adapterRobots(base),
    adapterDns(base.hostname),
    fetchPage(new URL('/cart', base), 'cart-html')
  ]);
  mark('products-json', productsJson.ok, productsJson.detail);
  mark('robots-sitemap', robots.ok, robots.detail);
  mark('dns-records', dnsInfo.ok, dnsInfo.detail);
  mark('cart-html', cart.ok, cart.ok ? `Fetched ${cart.url}.` : cart.detail);

  let product = {ok: false, detail: 'No product URL discovered.'};
  if (productsJson.ok && productsJson.sampleProductUrl) {
    product = await fetchPage(productsJson.sampleProductUrl, 'product-html');
  }
  mark('product-html', product.ok, product.ok ? `Fetched ${product.url}.` : product.detail);

  const pages = [home, cart, product].filter((p) => p.ok);
  const allHosts = new Set();
  pages.forEach((p) => p.evidence.scriptHosts.forEach((h) => allHosts.add(h)));
  mark('script-hosts', pages.length > 0, pages.length ? `${allHosts.size} distinct third-party hosts across ${pages.length} page(s).` : 'No pages fetched.');
  const generators = pages.map((p) => p.evidence.generator).filter(Boolean);
  const jsonLd = pages.flatMap((p) => p.evidence.jsonLdTypes);
  mark('structured-data', pages.length > 0, pages.length ? `${jsonLd.length} JSON-LD item(s)${generators.length ? `; generator: ${generators[0]}` : ''}.` : 'No pages fetched.');
  const checkoutProviders = detectCheckoutProviders(pages, allHosts);
  mark('checkout-fingerprint', pages.length > 0, pages.length ? (checkoutProviders.length ? `Checkout/payment: ${checkoutProviders.map((c) => c.name).join(', ')}.` : 'No distinct checkout provider fingerprint found.') : 'No pages fetched.');

  const shopifyConfirmed = Boolean(productsJson.shopifyConfirmed || robots.shopifyConfirmed || headers['x-shopify-stage'] || headers['x-shopid'] || headers['x-sorting-hat-shopid']);

  const fetches = [home, cart, product, productsJson, robots];
  const crawlBlock = summarizeBlock({
    signals: fetches.map((f) => f && f.block),
    pagesFetched: pages.length,
    domainResolves: Boolean(dnsInfo.ok),
    httpResponses: fetches.filter((f) => f && typeof f.status === 'number').length
  });

  return {
    baseUrl: base.toString(),
    pages, headers, dnsInfo, robots, productsJson,
    scriptHosts: [...allHosts],
    checkoutProviders,
    shopifyConfirmed,
    crawlBlock,
    sources,
    sourcesLive: liveSourceCount(),
    sourcesPlanned: SOURCE_CATALOG.filter((s) => s.status === 'planned').map((s) => s.name),
    sourcesSucceeded: sources.filter((s) => s.ok).length
  };
}

module.exports = {
  SOURCE_CATALOG, CHECKOUT_PROVIDERS, liveSourceCount, plannedSourceCount, sourceCounts,
  parseHtmlEvidence, detectCheckoutProviders, runAdapters, headerEvidence, adapterDns,
  classifyBlock, summarizeBlock, blockDetail, BLOCKING_STATUSES
};
