'use strict';
const assert = require('node:assert');
const guard = require('../netlify/functions/lib/guard.js');
const {parseHtmlEvidence, SOURCE_CATALOG, liveSourceCount, detectCheckoutProviders} = require('../netlify/functions/lib/adapters.js');
const agg = require('../netlify/functions/lib/aggregate.js');
const {appSignatures} = require('../netlify/functions/lib/rules.js');
const costOf = (id) => appSignatures.find((s) => s.id === id).cost;

let pass = 0; const fail = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail.push(`${name}: ${e.message}`); } };
// Async cases are queued and drained after the sync ones so a rejected promise
// cannot slip past the counter.
const asyncTests = [];
const ta = (name, fn) => { asyncTests.push([name, fn]); };

// ---------- Phase 1 regression: spend tiers must NOT collapse ----------
t('tier: under 10k', () => assert.equal(agg.spendContext('Under $10,000 a month').tier, 'under-10k'));
t('tier: 10k-100k', () => assert.equal(agg.spendContext('$10,000 to $100,000 a month').tier, '10k-100k'));
t('tier: 100k-250k (v10 bug: matched 250,000)', () => assert.equal(agg.spendContext('$100,000 to $250,000 a month').tier, '100k-250k'));
t('tier: 250k+', () => assert.equal(agg.spendContext('More than $250,000 a month').tier, '250k+'));
t('tier: empty defaults to under-10k, Medium urgency', () => {
  const c = agg.spendContext('');
  assert.equal(c.tier, 'under-10k'); assert.equal(c.urgency, 'Medium');
});

// ---------- Integrity: savings derive ONLY from detected apps ----------
// A scan context that cleared the crawl gate: Shopify confirmed and at least
// one storefront page actually fetched.
const reachedScan = {shopifyConfirmed: true, pages: [{sourceId: 'home-html', url: 'https://x.example/'}]};
t('savings null when nothing detected', () => {
  const s = agg.savingsFromDetected([], reachedScan);
  assert.equal(s.monthly, null); assert.equal(s.annual, null); assert.equal(s.detectedMonthly, 0);
  assert.equal(s.suppressedReason, 'no-paid-detections');
});
t('savings null when only free apps detected', () => {
  const s = agg.savingsFromDetected([{cost: 0, strength: 'detected'}, {cost: 0, strength: 'detected'}], reachedScan);
  assert.equal(s.monthly, null);
});
t('savings = 15-40% of detected benchmark', () => {
  const s = agg.savingsFromDetected([{cost: 200, strength: 'detected'}, {cost: 100, strength: 'likely'}], reachedScan);
  assert.equal(s.detectedMonthly, 300);
  assert.match(s.monthly, /\$45-\$120\/mo/);
  assert.match(s.basis, /benchmark/i);
  assert.equal(s.suppressedReason, null);
});
t('moneyRange null on zero', () => assert.equal(agg.moneyRange(0, 0), null));

// ---------- Multi-source detection + corroboration confidence ----------
function fakeScan({html = '', hosts = [], txt = [], mx = [], robots = '', shopify = false} = {}) {
  return {
    pages: html ? [{sourceId: 'home-html', url: 'https://x.example/', evidence: parseHtmlEvidence(html)}] : [],
    scriptHosts: hosts, dnsInfo: {txt, mx}, robots: robots ? {haystack: robots} : null,
    shopifyConfirmed: shopify,
    sourcesLive: 9, sourcesSucceeded: html ? 5 : 0, sourcesPlanned: [], sources: []
  };
}
t('detect Klaviyo from html pattern', () => {
  const d = agg.detectFromEvidence(fakeScan({html: '<script src="https://static.klaviyo.com/onsite/js"></script>'}));
  assert.ok(d.find((a) => a.id === 'klaviyo'));
});
t('clean html detects nothing', () => {
  assert.equal(agg.detectFromEvidence(fakeScan({html: '<html><body>hello</body></html>'})).length, 0);
});
t('corroboration raises confidence', () => {
  const one = agg.detectFromEvidence(fakeScan({html: '<script>var _learnq=[]</script>'})).find((a) => a.id === 'klaviyo');
  const multi = agg.detectFromEvidence(fakeScan({
    html: '<script src="https://static.klaviyo.com/x.js"></script>',
    hosts: ['static.klaviyo.com'], txt: ['klaviyo-site-verification=abc']
  })).find((a) => a.id === 'klaviyo');
  assert.ok(multi.confidence > one.confidence, `${multi.confidence} > ${one.confidence}`);
  assert.ok(multi.corroboratingSources >= 3);
});
t('confidence capped at 95', () => {
  const d = agg.detectFromEvidence(fakeScan({html: 'klaviyo _learnq', hosts: ['static.klaviyo.com', 'a.klaviyo.com'], txt: ['klaviyo'], robots: 'klaviyo'}));
  d.forEach((a) => assert.ok(a.confidence <= 95));
});
t('PayPal carries no fabricated monthly cost', () => {
  const d = agg.detectFromEvidence(fakeScan({html: '<script src="https://www.paypalobjects.com/x.js"></script>'}));
  const pp = d.find((a) => a.id === 'paypal');
  assert.ok(pp); assert.equal(pp.cost, 0);
});

// ---------- Overlaps ----------
t('two paid review apps flag consolidation', () => {
  const scan = fakeScan({html: 'staticw2.yotpo.com cdn.judge.me judgeme yotpo-widget', shopify: true});
  const d = agg.detectFromEvidence(scan);
  const overlaps = agg.findOverlaps(d, scan);
  const reviews = overlaps.find((o) => o.category === 'Reviews');
  assert.ok(reviews, 'expected Reviews overlap'); assert.ok(reviews.apps.length >= 2);
});

// ---------- Report gating ----------
t('teaser hides depth; full shows evidence', () => {
  const scan = fakeScan({html: 'klaviyo staticw2.yotpo.com yotpo-widget cdn.judge.me judgeme gorgias.chat rebuyengine'});
  const teaser = agg.buildReport(scan, {monthly_ad_spend: '$10,000 to $100,000 a month'}, 'teaser');
  const full = agg.buildReport(scan, {monthly_ad_spend: '$10,000 to $100,000 a month'}, 'full');
  assert.equal(teaser.depth, 'teaser');
  assert.ok(teaser.detectedApps.length <= 3);
  assert.ok(!teaser.detectedApps[0].evidence, 'teaser must not leak evidence trails');
  assert.ok(full.detectedApps[0].evidence, 'full report includes evidence');
  assert.ok(full.detectedApps.length >= teaser.detectedApps.length);
  assert.ok(teaser.teaser.message.length > 0);
});
t('no-crawl report shows no invented numbers', () => {
  const r = agg.buildReport(fakeScan({}), {monthly_ad_spend: 'More than $250,000 a month'}, 'full');
  assert.equal(r.summary.monthlySavings, null);
  assert.equal(r.summary.annualSavings, null);
  assert.match(r.crawl.statusLabel, /No savings estimate/i);
});

// ---------- B3: evidence strength gates every dollar figure ----------
// The nytimes.com case: not a Shopify store, zero pages fetched, one DNS TXT
// substring. The old engine answered "Klaviyo, 62% confidence, $27-$72/mo".
const nytimesLikeScan = fakeScan({txt: ['klaviyo-site-verification=9f2c1', 'v=spf1 include:_spf.google.com ~all']});
t('B3 negative: DNS-only match on a non-Shopify domain is possible-strength', () => {
  const d = agg.detectFromEvidence(nytimesLikeScan);
  const klaviyo = d.find((a) => a.id === 'klaviyo');
  assert.ok(klaviyo, 'the DNS signal is still reported');
  assert.equal(klaviyo.strength, 'possible');
  assert.equal(klaviyo.countsTowardSavings, false);
  assert.ok(klaviyo.confidence < 50, `possible must read as weak, got ${klaviyo.confidence}`);
});
t('B3 negative: non-Shopify, zero pages produces no savings and says why', () => {
  const r = agg.buildReport(nytimesLikeScan, {monthly_ad_spend: '$10,000 to $100,000 a month'}, 'full');
  assert.equal(r.summary.monthlySavings, null);
  assert.equal(r.summary.annualSavings, null);
  assert.equal(r.summary.detectedMonthlyBenchmark, 0);
  assert.equal(r.summary.savingsSuppressedReason, 'not-shopify');
  assert.equal(r.summary.strengthCounts.possible, r.summary.detectedCount);
  assert.equal(r.overlaps.length, 0);
  assert.ok(!JSON.stringify(r.recommendations).includes('$'), 'no benchmark dollars from possible-only evidence');
});
t('B3: Shopify confirmed but no page fetched is no-pages-fetched', () => {
  const scan = {...nytimesLikeScan, shopifyConfirmed: true};
  assert.equal(agg.savingsGateReason(scan), 'no-pages-fetched');
  assert.equal(agg.buildReport(scan, {}, 'full').summary.savingsSuppressedReason, 'no-pages-fetched');
});
t('B3 positive: page pattern plus script host is detected-strength with savings', () => {
  const scan = fakeScan({
    html: '<script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script>',
    hosts: ['static.klaviyo.com'], shopify: true
  });
  const r = agg.buildReport(scan, {monthly_ad_spend: '$10,000 to $100,000 a month'}, 'full');
  const klaviyo = r.detectedApps.find((a) => a.id === 'klaviyo');
  assert.equal(klaviyo.strength, 'detected');
  assert.equal(klaviyo.countsTowardSavings, true);
  assert.ok(klaviyo.confidence >= 70);
  assert.equal(r.summary.savingsSuppressedReason, null);
  assert.equal(r.summary.detectedMonthlyBenchmark, costOf('klaviyo'));
  assert.equal(r.summary.monthlySavings, agg.moneyRange(costOf('klaviyo') * 0.15, costOf('klaviyo') * 0.40));
  assert.ok(r.summary.annualSavings);
});
t('B3 mixed: a possible app adds zero dollars to the band', () => {
  // Klaviyo on the page + Mailchimp in DNS only (rules.js mailchimp dns: mcsv.net).
  const scan = fakeScan({
    html: '<script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script>',
    hosts: ['static.klaviyo.com'], txt: ['v=spf1 include:servers.mcsv.net ~all'], shopify: true
  });
  const r = agg.buildReport(scan, {}, 'full');
  const mailchimp = r.detectedApps.find((a) => a.id === 'mailchimp');
  assert.ok(mailchimp, 'the DNS-only app is still reported');
  assert.equal(mailchimp.strength, 'possible');
  assert.ok(costOf('mailchimp') > 0, 'fixture needs a paid DNS-only app to be meaningful');
  assert.equal(r.summary.detectedMonthlyBenchmark, costOf('klaviyo'));
  assert.equal(r.summary.monthlySavings, agg.moneyRange(costOf('klaviyo') * 0.15, costOf('klaviyo') * 0.40));
  assert.equal(r.summary.strengthCounts.possible, 1);
  assert.equal(r.summary.detectedCount, r.detectedApps.length);
});
t('B3 overlap: two possible apps in one category are not a consolidation finding', () => {
  // Storefront reached (clean page fetched), but both review apps are named
  // only in robots.txt — an index reference, not an observed page load.
  const scan = fakeScan({html: '<html><body>hello</body></html>', robots: 'sitemap: /judgeme.xml yotpo-widget', shopify: true});
  const d = agg.detectFromEvidence(scan);
  const reviews = d.filter((a) => a.category === 'Reviews');
  assert.equal(reviews.length, 2, 'both review apps are reported');
  reviews.forEach((a) => assert.equal(a.strength, 'possible'));
  assert.equal(agg.findOverlaps(d, scan).length, 0);
  assert.equal(agg.savingsFromDetected(d, scan).monthly, null);
});
t('B3: strength bands never overlap (possible < likely < detected)', () => {
  const possible = agg.detectFromEvidence(fakeScan({txt: ['klaviyo']})).find((a) => a.id === 'klaviyo');
  const likely = agg.detectFromEvidence(fakeScan({html: '<script>var _learnq=[]</script>'})).find((a) => a.id === 'klaviyo');
  const detected = agg.detectFromEvidence(fakeScan({html: 'klaviyo', hosts: ['static.klaviyo.com']})).find((a) => a.id === 'klaviyo');
  assert.equal(likely.strength, 'likely');
  assert.equal(detected.strength, 'detected');
  assert.ok(possible.confidence < likely.confidence, 'possible must sit below likely');
  assert.ok(likely.confidence < detected.confidence, 'likely must sit below detected');
  assert.ok(detected.confidence <= 95);
});
t('B3: teaser carries strength but still hides evidence trails', () => {
  const scan = fakeScan({html: 'klaviyo staticw2.yotpo.com yotpo-widget cdn.judge.me judgeme gorgias.chat rebuyengine', shopify: true});
  const teaser = agg.buildReport(scan, {}, 'teaser');
  assert.ok(teaser.detectedApps.length <= 3);
  teaser.detectedApps.forEach((a) => {
    assert.ok(['detected', 'likely', 'possible'].includes(a.strength));
    assert.ok(!a.evidence, 'teaser must not leak evidence trails');
    assert.equal(a.cost, undefined, 'teaser must not leak raw benchmark costs');
  });
  assert.equal(teaser.summary.savingsSuppressedReason, null);
  assert.equal(teaser.summary.strengthCounts.detected + teaser.summary.strengthCounts.likely + teaser.summary.strengthCounts.possible, teaser.summary.detectedCount);
});

// ---------- Rate limiting (IP-keyed, intent cannot mint buckets) ----------
t('rate limit blocks after RATE_LIMIT_MAX', () => {
  guard.rateBuckets.clear();
  let last; for (let i = 0; i < guard.RATE_LIMIT_MAX + 1; i++) last = guard.checkRateLimit('1.2.3.4');
  assert.equal(last.allowed, false);
});
t('different IPs independent', () => {
  guard.rateBuckets.clear();
  guard.checkRateLimit('9.9.9.9');
  assert.equal(guard.checkRateLimit('8.8.8.8').allowed, true);
});

// ---------- SSRF regression ----------
const blocked = ['localhost', '127.0.0.1', '10.0.0.1', '172.16.5.5', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', 'metadata.google.internal', 'foo.internal', 'bar.local', '[::1]', '[fd00::1]', '[::ffff:127.0.0.1]', '[fe80::1]'];
blocked.forEach((h) => t(`SSRF blocked: ${h}`, () => assert.throws(() => guard.assertPublicHostname(h))));
t('public hostname allowed', () => guard.assertPublicHostname('shop.example.com'));
t('normalizeUrl rejects ftp', () => assert.throws(() => guard.normalizeUrl('ftp://example.com')));
t('normalizeUrl rejects private redirect target', () => assert.throws(() => guard.normalizeUrl('http://169.254.169.254/latest/meta-data')));
t('guardedLookup rejects literal private IP', (done) => {
  guard.guardedLookup('127.0.0.1', {}, (err) => assert.ok(err, 'expected error'));
});
t('parseHtmlEvidence extracts script hosts', () => {
  const ev = parseHtmlEvidence('<script src="https://static.klaviyo.com/onsite.js"></script><link href="//cdn.judge.me/w.css">');
  assert.ok(ev.scriptHosts.includes('static.klaviyo.com'));
  assert.ok(ev.scriptHosts.includes('cdn.judge.me'));
});
t('source catalog: 10 live, honestly labeled', () => {
  assert.equal(liveSourceCount(), 10);
  assert.ok(SOURCE_CATALOG.length >= liveSourceCount());
  assert.ok(SOURCE_CATALOG.every((s) => ['live', 'planned'].includes(s.status)));
  assert.equal(new Set(SOURCE_CATALOG.map((s) => s.id)).size, SOURCE_CATALOG.length, 'source ids unique');
});
t('checkout fingerprint: detects Stripe by host', () => {
  const found = detectCheckoutProviders([{evidence: {haystack: '<script src="https://js.stripe.com/v3"></script>'.toLowerCase()}}], new Set(['js.stripe.com']));
  assert.ok(found.find((c) => c.id === 'stripe'));
});
t('checkout fingerprint: none on clean page', () => {
  assert.equal(detectCheckoutProviders([{evidence: {haystack: '<html>hi</html>'}}], new Set()).length, 0);
});

// ---------- URL length cap ----------
t('normalizeUrl rejects absurdly long URLs', () => assert.throws(() => guard.normalizeUrl('https://x.example/' + 'a'.repeat(2100))));

// ---------- Stripe signature verification (unit) ----------
const crypto = require('node:crypto');
function signStripe(payload, secret, t0) {
  const ts = t0 ?? Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}
// Re-implement the verifier's contract to test the algorithm we ship.
function verify(payload, header, secret, tol = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const ts = Number(parts.t); const signature = parts.v1;
  if (!ts || !signature) return false;
  if (Math.abs(Date.now() / 1000 - ts) > tol) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex')); } catch (e) { return false; }
}
t('stripe sig: valid passes', () => { const p = '{"id":"evt_1"}'; assert.equal(verify(p, signStripe(p, 'whsec_x'), 'whsec_x'), true); });
t('stripe sig: wrong secret fails', () => { const p = '{"id":"evt_1"}'; assert.equal(verify(p, signStripe(p, 'whsec_x'), 'whsec_y'), false); });
t('stripe sig: tampered payload fails', () => { const h = signStripe('{"id":"evt_1"}', 'whsec_x'); assert.equal(verify('{"id":"evt_2"}', h, 'whsec_x'), false); });
t('stripe sig: expired timestamp fails', () => { const p = '{"id":"evt_1"}'; assert.equal(verify(p, signStripe(p, 'whsec_x', 1), 'whsec_x'), false); });

// ---------- sha256 token hashing is stable + non-reversible-looking ----------
const auth = require('../netlify/functions/lib/auth.js');
t('auth.sha256 deterministic + 64 hex', () => {
  const a = auth.sha256('token-abc'); const b = auth.sha256('token-abc');
  assert.equal(a, b); assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(auth.sha256('token-abd'), a);
});
t('auth.isEmail validates', () => {
  assert.ok(auth.isEmail('a@b.co')); assert.ok(!auth.isEmail('nope')); assert.ok(!auth.isEmail('a@b'));
});

// ---------- Plans: the single source of truth for quota + price mapping ----------
const plans = require('../netlify/functions/lib/plans.js');
t('quotaFor: operator = 10 (terms.html:20)', () => assert.equal(plans.quotaFor('operator'), 10));
t('quotaFor: director = 30, not 100 (terms.html:21, index.html:529)', () => assert.equal(plans.quotaFor('director'), 30));
t('quotaFor: retired command grants nothing', () => assert.equal(plans.quotaFor('command'), null));
t('quotaFor: unknown plan grants nothing (no operator fallback)', () => assert.equal(plans.quotaFor('nonsense'), null));
t('quotaFor: missing plan grants nothing', () => assert.equal(plans.quotaFor(undefined), null));
t('isRetired: command retired, live plans are not', () => {
  assert.ok(plans.isRetired('command'));
  assert.ok(!plans.isRetired('operator')); assert.ok(!plans.isRetired('director'));
});
t('PLANS holds only the two live plans at the sold prices', () => {
  assert.deepEqual(plans.PLANS.map((p) => p.id), ['operator', 'director']);
  assert.deepEqual(plans.PLANS.map((p) => p.monthlyPrice), [17, 37]);
});
t('planByPriceId maps env price ids to plans', () => {
  process.env.STRIPE_PRICE_OPERATOR = 'price_test_operator';
  process.env.STRIPE_PRICE_DIRECTOR = 'price_test_director';
  assert.equal(plans.planByPriceId('price_test_operator').id, 'operator');
  assert.equal(plans.planByPriceId('price_test_director').id, 'director');
});
t('planByPriceId returns null for unknown or missing price ids', () => {
  assert.equal(plans.planByPriceId('price_never_seen'), null);
  assert.equal(plans.planByPriceId(undefined), null);
  assert.equal(plans.planByPriceId(''), null);
});
t('planByPriceId ignores the retired command price', () => {
  process.env.STRIPE_PRICE_COMMAND = 'price_test_command';
  assert.equal(plans.planByPriceId('price_test_command'), null);
});

// ---------- Webhook plan resolution (the shipped resolver, not a copy) ----------
const webhook = require('../netlify/functions/stripe-webhook.js');
const checkoutSession = (metadata) => ({id: 'cs_test_1', mode: 'subscription', object: 'checkout_session', metadata});
t('stripe-webhook still exports a handler function', () => assert.equal(typeof webhook.handler, 'function'));
t('stripe-webhook exports resolvePlanFromSession', () => assert.equal(typeof webhook.resolvePlanFromSession, 'function'));
t('PLAN_BY_PRICE carries the live plans only', () => {
  const map = webhook.PLAN_BY_PRICE();
  assert.equal(map['price_test_operator'], 'operator');
  assert.equal(map['price_test_director'], 'director');
  assert.equal(map['price_test_command'], undefined);
});
ta('resolve: metadata.plan wins over every other signal', async () => {
  const r = await webhook.resolvePlanFromSession(checkoutSession({plan: 'director', github_scout_plan: 'operator', price_id: 'price_test_operator'}));
  assert.equal(r.plan, 'director'); assert.equal(r.source, 'metadata.plan');
});
ta('resolve: github_scout_plan (the key the live Payment Links carry)', async () => {
  const r = await webhook.resolvePlanFromSession(checkoutSession({github_scout_plan: 'director'}));
  assert.equal(r.plan, 'director'); assert.equal(r.source, 'metadata.github_scout_plan');
});
ta('resolve: price_id maps through lib/plans.js', async () => {
  const r = await webhook.resolvePlanFromSession(checkoutSession({price_id: 'price_test_director'}));
  assert.equal(r.plan, 'director'); assert.equal(r.source, 'metadata.price_id');
});
ta('resolve: retired command in metadata does not entitle', async () => {
  const r = await webhook.resolvePlanFromSession(checkoutSession({plan: 'command'}));
  assert.equal(r.plan, null);
});
ta('resolve: no signal is UNRESOLVED, never a silent operator', async () => {
  delete process.env.STRIPE_SECRET_KEY; // no API fallback, so no network in tests
  const r = await webhook.resolvePlanFromSession(checkoutSession({}));
  assert.equal(r.plan, null); assert.equal(r.source, 'unresolved');
  assert.equal(webhook.UNRESOLVED_PLAN, 'unresolved');
});
ta('resolve: missing metadata object does not throw', async () => {
  const r = await webhook.resolvePlanFromSession({id: 'cs_test_2', mode: 'subscription'});
  assert.equal(r.plan, null);
});

(async () => {
  for (const [name, fn] of asyncTests) {
    try { await fn(); pass++; } catch (e) { fail.push(`${name}: ${e.message}`); }
  }
  console.log(`\n${pass} passed, ${fail.length} failed`);
  if (fail.length) { fail.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
  console.log('All integrity, gating, rate-limit, SSRF, and plan-resolution tests passed.');
})();
