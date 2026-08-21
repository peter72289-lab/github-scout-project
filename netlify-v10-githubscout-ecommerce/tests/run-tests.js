'use strict';
const assert = require('node:assert');
const guard = require('../netlify/functions/lib/guard.js');
const adapters = require('../netlify/functions/lib/adapters.js');
const {parseHtmlEvidence, SOURCE_CATALOG, liveSourceCount, sourceCounts, detectCheckoutProviders} = adapters;
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
t('moneyRange labels the unit it was given', () => {
  assert.ok(agg.moneyRange(10, 20).endsWith('/mo'));
  assert.ok(agg.moneyRange(120, 240, '/yr').endsWith('/yr'));
});

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
  assert.ok(r.summary.annualSavings.endsWith('/yr'), 'annual figure must not be labelled per month');
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
t('source catalog: 10 live + 5 planned = 15 total, no duplicate checkout entry', () => {
  const c = sourceCounts();
  assert.equal(c.live, 10); assert.equal(c.planned, 5); assert.equal(c.total, 15);
  assert.equal(c.live + c.planned, SOURCE_CATALOG.length);
  // 'checkout-fingerprint-plan' duplicated the live checkout source and pushed
  // the catalog to 16; every published count is derived from this list.
  assert.equal(SOURCE_CATALOG.filter((s) => /checkout/.test(s.id)).length, 1);
});
ta('sources endpoint reports the catalog, not a literal', async () => {
  const res = await require('../netlify/functions/sources.js').handler();
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const c = sourceCounts();
  assert.equal(body.live, c.live); assert.equal(body.planned, c.planned); assert.equal(body.total, c.total);
  assert.equal(body.catalog.length, SOURCE_CATALOG.length);
});
t('crawl-failure fallback derives its source count from the catalog', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../netlify/functions/operator-url-scan.js'), 'utf8');
  assert.ok(/sourcesLive: liveSourceCount\(\)/.test(src), 'sourcesLive must come from lib/adapters.js');
  assert.ok(!/sourcesLive: \d/.test(src), 'no hardcoded sourcesLive literal');
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

// ---------- M1 Unit 2: request headers ----------
// The crawler must stay identifiable. A browser-shaped UA was measured against
// five live storefronts and changed zero source counts, while making our
// unevaluated robots.txt Disallow rules indefensible. See lib/guard.js.
t('request headers: the crawler identifies itself', () => {
  const h = guard.requestHeaders('text/html');
  assert.match(h['User-Agent'], /GitHubScoutOperatorScan/, 'the scanner must name itself');
  assert.ok(!/Chrome\/[\d.]+ Safari/.test(h['User-Agent']), 'must not impersonate a browser');
});
t('request headers: only advertise encodings guard.js decodes', () => {
  const advertised = guard.requestHeaders('text/html')['Accept-Encoding'].split(',').map((s) => s.trim());
  const decoded = new Set(['gzip', 'deflate', 'br']); // decodeStream() in lib/guard.js
  advertised.forEach((enc) => assert.ok(decoded.has(enc), `advertised ${enc} but nothing decodes it`));
  assert.ok(advertised.length > 0);
});
t('request headers: Accept-Language sent, Accept passed through', () => {
  const h = guard.requestHeaders('application/json');
  assert.equal(h['Accept'], 'application/json');
  assert.match(h['Accept-Language'], /^en-US,en;q=/);
});
t('request headers: From only when a real mailbox is configured', () => {
  delete process.env.SCAN_CONTACT_EMAIL;
  assert.equal(guard.requestHeaders('text/html').From, undefined, 'never invent a contact address');
  process.env.SCAN_CONTACT_EMAIL = 'scans@example.com';
  assert.equal(guard.requestHeaders('text/html').From, 'scans@example.com');
  delete process.env.SCAN_CONTACT_EMAIL;
});
ta('guard decodes a gzip body it asked for, and still honours the char cap', async () => {
  const zlib = require('node:zlib');
  const {Readable} = require('node:stream');
  const make = (buf, headers) => Object.assign(Readable.from([buf]), {headers});
  const plain = await guard.readLimitedBody(make(zlib.gzipSync(Buffer.from('<title>hello</title>')), {'content-encoding': 'gzip'}));
  assert.equal(plain, '<title>hello</title>');
  // Compression bomb: 2MB of one byte gzips small, but the cap is applied to the
  // DECOMPRESSED text, so memory stays bounded exactly as for a plain body.
  const bomb = await guard.readLimitedBody(make(zlib.gzipSync(Buffer.alloc(2000000, 0x61)), {'content-encoding': 'gzip'}), 500);
  assert.equal(bomb.length, 500);
});

// ---------- M1 Unit 3: blocked is not "nothing found" ----------
t('block: HTTP 403 is a block on its own', () => {
  const b = adapters.classifyBlock({status: 403, body: 'nope'});
  assert.ok(b && b.blocked);
  assert.equal(b.reason, 'http-status');
  assert.equal(b.status, 403);
});
t('block: HTTP 429 is a block on its own (the measured bombas.com case)', () => {
  assert.equal(adapters.classifyBlock({status: 429, body: ''}).reason, 'http-status');
});
t('block: challenge-page body names the vendor', () => {
  const b = adapters.classifyBlock({status: 503, body: '<html><head><title>Just a moment...</title></head><body><script src="/cdn-cgi/challenge-platform/h/b/orchestrate/jsd/v1"></script></body></html>'});
  assert.ok(b && b.blocked);
  assert.equal(b.reason, 'challenge-page');
  assert.equal(b.vendor, 'Cloudflare');
});
t('block: a 200 challenge interstitial is not a storefront page', () => {
  const b = adapters.classifyBlock({status: 200, body: '<html><head><title>Access to this page has been denied</title></head><body>press &amp; hold</body></html>'});
  assert.ok(b && b.blocked);
  assert.equal(b.reason, 'challenge-page');
});
t('block: a healthy 200 page with Cloudflare bot-fight JS is NOT blocked', () => {
  // Cloudflare injects challenge-platform scripts into perfectly normal pages;
  // matching body markers on a 2xx would label healthy stores as blocked.
  const b = adapters.classifyBlock({status: 200, body: '<html><head><title>Shop socks</title></head><body><script src="/cdn-cgi/challenge-platform/h/b/scripts/jsd/main.js"></script></body></html>'});
  assert.equal(b, null);
});
t('block: a plain 404 with no challenge marker is not a block', () => {
  assert.equal(adapters.classifyBlock({status: 404, body: '<title>Not found</title>'}), null);
});
t('block rollup: signals with zero pages fetched is a blocked crawl', () => {
  const s = adapters.summarizeBlock({signals: [{blocked: true, status: 403, reason: 'http-status', vendor: 'Cloudflare'}], pagesFetched: 0, domainResolves: true, httpResponses: 4});
  assert.equal(s.blocked, true); assert.equal(s.vendor, 'Cloudflare'); assert.equal(s.reason, 'http-status');
});
t('block rollup: one refused source but pages returned is not a blocked crawl', () => {
  const s = adapters.summarizeBlock({signals: [{blocked: true, status: 403, reason: 'http-status', vendor: null}], pagesFetched: 2, domainResolves: true, httpResponses: 5});
  assert.equal(s.blocked, false);
});
t('block rollup: domain resolves, edge answers, no page ever comes back', () => {
  const s = adapters.summarizeBlock({signals: [], pagesFetched: 0, domainResolves: true, httpResponses: 3});
  assert.equal(s.blocked, true); assert.equal(s.reason, 'low-success-ratio');
});
t('block rollup: dead domain (no DNS, no responses) is not reported as blocked', () => {
  const s = adapters.summarizeBlock({signals: [], pagesFetched: 0, domainResolves: false, httpResponses: 0});
  assert.equal(s.blocked, false);
});

const blockedScan = {
  pages: [], scriptHosts: [], dnsInfo: {txt: [], mx: []}, robots: null, shopifyConfirmed: false,
  sourcesLive: liveSourceCount(), sourcesSucceeded: 1, sourcesPlanned: [], sources: [],
  crawlBlock: {blocked: true, reason: 'http-status', vendor: 'Cloudflare', signals: [{status: 403, reason: 'http-status', vendor: 'Cloudflare'}]}
};
t('blocked: savings gate reports crawl-blocked, not not-shopify', () => {
  assert.equal(agg.savingsGateReason(blockedScan), 'crawl-blocked');
  assert.equal(agg.savingsFromDetected([{cost: 200, strength: 'detected'}], blockedScan).monthly, null);
});
t('blocked: report carries the machine-readable state and no savings', () => {
  const r = agg.buildReport(blockedScan, {monthly_ad_spend: 'More than $250,000 a month'}, 'full');
  assert.equal(r.crawl.blocked, true);
  assert.equal(r.crawl.blockedBy, 'Cloudflare');
  assert.equal(r.crawl.blockedReason, 'http-status');
  assert.equal(r.crawl.blockedSignals[0].status, 403);
  assert.equal(r.summary.savingsSuppressedReason, 'crawl-blocked');
  assert.equal(r.summary.monthlySavings, null);
  assert.equal(r.summary.annualSavings, null);
  assert.equal(r.summary.detectedMonthlyBenchmark, 0);
});
t('blocked: statusLabel tells the truth and points at the Shopify admin', () => {
  const label = agg.buildReport(blockedScan, {}, 'full').crawl.statusLabel;
  assert.match(label, /Cloudflare bot protection/);
  assert.match(label, /not a finding about the store/i);
  assert.match(label, /Shopify admin/);
  assert.ok(!/No savings estimate is shown without evidence/.test(label), 'the generic no-crawl label must not be reused');
});
t('blocked: no recommendation claims the stack is clean or quiet', () => {
  const r = agg.buildReport(blockedScan, {}, 'full');
  const text = JSON.stringify(r.recommendations);
  assert.equal(r.recommendations.length, 1);
  assert.equal(r.recommendations[0].category, 'Access');
  assert.ok(!/quiet from the outside|Stack is quiet/i.test(text), 'a blocked scan must never read as a clean stack');
  assert.ok(!/\$/.test(text), 'a blocked scan produces no dollar figure');
  assert.equal(r.recommendations[0].monthly, null);
});
t('blocked: an unblocked clean store still gets the honest quiet-stack card', () => {
  const clean = fakeScan({html: '<html><body>hello</body></html>', shopify: true});
  const r = agg.buildReport(clean, {}, 'full');
  assert.equal(r.crawl.blocked, false);
  assert.match(JSON.stringify(r.recommendations), /quiet from the outside/);
});

// ---------- M1 Unit 1: quota is a reservation, released when nothing came back ----------
// The shipped handler is exercised, with only its two external edges stubbed:
// the crawl (no network in tests) and Supabase.
const dbMod = require('../netlify/functions/lib/supabase.js');
const authMod = require('../netlify/functions/lib/auth.js');
const realRunAdapters = adapters.runAdapters;
let stubCrawl = null;
adapters.runAdapters = (url) => (stubCrawl ? stubCrawl(url) : realRunAdapters(url));
const scanHandler = require('../netlify/functions/operator-url-scan.js').handler;

let rpcCalls = [];
let crawlRuns = 0;
function stubQuota({allowed, used}) {
  rpcCalls = [];
  dbMod.enabled = false; // no persistence, no shared rate limiter, no network
  dbMod.rpc = async (fn, args) => {
    rpcCalls.push({fn, args});
    if (fn === 'usage_increment') return {allowed, used};
    if (fn === 'usage_decrement') return {released: true, used: Math.max(0, used - 1)};
    return null;
  };
  authMod.currentAccount = async () => ({account: {id: 'acct-test'}, subscription: {plan: 'director'}});
}
const scanEvent = (ip) => ({httpMethod: 'POST', headers: {'client-ip': ip}, body: 'intent=analyze&store_url=https://store.example'});
const crawlOf = (extra) => {
  crawlRuns = 0;
  stubCrawl = async () => {
    crawlRuns++;
    return {pages: [], scriptHosts: [], dnsInfo: {txt: [], mx: []}, robots: null, shopifyConfirmed: false,
      sourcesLive: liveSourceCount(), sourcesSucceeded: 0, sourcesPlanned: [], sources: [], ...extra};
  };
};
const calledFns = () => rpcCalls.map((c) => c.fn);

ta('quota: over the monthly limit is refused BEFORE the crawl runs', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: false, used: 30});
  crawlOf({});
  const res = await scanHandler(scanEvent('198.51.100.11'));
  assert.equal(res.statusCode, 402);
  assert.equal(crawlRuns, 0, 'an over-quota account must never reach the crawler');
  assert.deepEqual(calledFns(), ['usage_increment'], 'no release for a reservation that was never granted');
  assert.match(JSON.parse(res.body).error, /quota reached \(30\)/);
});
ta('quota: a blocked crawl releases the credit', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: true, used: 5});
  crawlOf({crawlBlock: {blocked: true, reason: 'http-status', vendor: 'Cloudflare', signals: [{status: 403, reason: 'http-status', vendor: 'Cloudflare'}]}});
  const res = await scanHandler(scanEvent('198.51.100.12'));
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(crawlRuns, 1);
  assert.deepEqual(calledFns(), ['usage_increment', 'usage_decrement']);
  assert.equal(body.usage.used, 4, 'the reserved credit is given back');
  assert.equal(body.usage.refunded, true);
  assert.equal(body.analysis.crawl.blocked, true);
  assert.equal(body.analysis.summary.savingsSuppressedReason, 'crawl-blocked');
});
ta('quota: a crawl that fetched nothing releases the credit', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: true, used: 5});
  crawlOf({});
  const res = await scanHandler(scanEvent('198.51.100.13'));
  assert.deepEqual(calledFns(), ['usage_increment', 'usage_decrement']);
  assert.equal(JSON.parse(res.body).usage.used, 4);
});
ta('quota: a crawl that threw releases the credit', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: true, used: 5});
  crawlRuns = 0;
  stubCrawl = async () => { crawlRuns++; throw new Error('Storefront request timed out.'); };
  const res = await scanHandler(scanEvent('198.51.100.14'));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calledFns(), ['usage_increment', 'usage_decrement']);
});
ta('quota: a scan that fetched a page KEEPS the credit', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: true, used: 5});
  crawlOf({
    shopifyConfirmed: true, sourcesSucceeded: 10,
    pages: [{sourceId: 'home-html', url: 'https://store.example/', evidence: parseHtmlEvidence('<script src="https://static.klaviyo.com/x.js"></script>')}],
    scriptHosts: ['static.klaviyo.com'],
    crawlBlock: {blocked: false, reason: null, vendor: null, signals: []}
  });
  const res = await scanHandler(scanEvent('198.51.100.15'));
  const body = JSON.parse(res.body);
  assert.deepEqual(calledFns(), ['usage_increment'], 'a scan that produced evidence must not be refunded');
  assert.equal(body.usage.used, 5);
  assert.equal(body.usage.refunded, undefined);
  assert.equal(body.analysis.crawl.blocked, false);
  assert.ok(body.analysis.summary.monthlySavings, 'a real scan still prices its detections');
});
ta('quota: an unresolved plan is refused before the crawl and takes no credit', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: true, used: 0});
  crawlOf({});
  authMod.currentAccount = async () => ({account: {id: 'acct-test'}, subscription: {plan: 'command'}});
  const res = await scanHandler(scanEvent('198.51.100.16'));
  assert.equal(res.statusCode, 403);
  assert.equal(crawlRuns, 0);
  assert.deepEqual(calledFns(), [], 'the retired plan never reaches the counter');
});
ta('quota: a release that fails does not break the response', async () => {
  guard.rateBuckets.clear();
  stubQuota({allowed: true, used: 5});
  dbMod.rpc = async (fn, args) => {
    rpcCalls.push({fn, args});
    if (fn === 'usage_increment') return {allowed: true, used: 5};
    throw new Error('Supabase rpc usage_decrement -> 500');
  };
  crawlOf({});
  const res = await scanHandler(scanEvent('198.51.100.17'));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).usage.used, 5, 'an unreleased reservation is reported honestly, not guessed at');
});

// ---------- M3/M4: deletion must not strand billing; data export exists ----------
// The shipped handlers are exercised with only their two edges stubbed:
// Supabase and the Stripe REST call. `acctCalls` records every side effect in
// order, so "cancelled BEFORE any row was deleted" is an assertion, not a hope.
const deleteFn = require('../netlify/functions/account-delete.js');
const exportFn = require('../netlify/functions/account-export.js');
const realFetch = globalThis.fetch;

let acctCalls = [];
let stripeReply = {ok: true, status: 200};
const testAccount = {id: 'acct-del', email: 'buyer@example.com', created_at: '2026-01-02T03:04:05Z'};

function stubAccount({subscriptions = [], usage = [], scans = [], stripe = {ok: true, status: 200}} = {}) {
  acctCalls = [];
  stripeReply = stripe;
  dbMod.enabled = true;
  dbMod.select = async (table) => {
    acctCalls.push({op: 'select', table});
    if (table === 'subscriptions') return subscriptions;
    if (table === 'usage') return usage;
    if (table === 'scans') return scans;
    return [];
  };
  dbMod.del = async (table) => { acctCalls.push({op: 'del', table}); return null; };
  authMod.currentAccount = async () => ({account: testAccount, subscription: subscriptions[0] || null});
  globalThis.fetch = async (url, opts) => {
    acctCalls.push({op: 'stripe', method: opts && opts.method, url: String(url)});
    return {ok: stripeReply.ok, status: stripeReply.status, text: async () => ''};
  };
}
const deleteEvent = () => ({httpMethod: 'POST', headers: {}, body: JSON.stringify({confirm: true})});
const deletedTables = () => acctCalls.filter((c) => c.op === 'del').map((c) => c.table);
const stripeCalls = () => acctCalls.filter((c) => c.op === 'stripe');
const liveSub = {id: 'sub-row-1', stripe_subscription_id: 'sub_live_1', status: 'active', plan: 'operator'};

ta('delete: an active subscription with no billing key refuses, and deletes nothing', async () => {
  delete process.env.STRIPE_BILLING_KEY;
  stubAccount({subscriptions: [liveSub]});
  const res = await deleteFn.handler(deleteEvent());
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 409);
  assert.equal(body.ok, false);
  assert.equal(body.reason, 'subscription_active');
  assert.match(body.error, /billing portal/i);
  assert.match(body.error, /nothing has been deleted/i);
  assert.deepEqual(deletedTables(), [], 'a subscription we cannot cancel must not lose its account row');
  assert.equal(stripeCalls().length, 0, 'no key means no Stripe call was even attempted');
});

ta('delete: a failed Stripe cancel aborts the deletion entirely', async () => {
  process.env.STRIPE_BILLING_KEY = 'rk_test_billing';
  stubAccount({subscriptions: [liveSub], stripe: {ok: false, status: 500}});
  const res = await deleteFn.handler(deleteEvent());
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 502);
  assert.equal(body.reason, 'cancel_failed');
  assert.match(body.error, /your data is untouched/i);
  assert.equal(stripeCalls().length, 1, 'the cancel was attempted');
  assert.deepEqual(deletedTables(), [], 'a stranded subscription is worse than a delayed deletion');
});

ta('delete: a 404 from Stripe also aborts (a wrong-mode key answers the same way)', async () => {
  process.env.STRIPE_BILLING_KEY = 'rk_test_billing';
  stubAccount({subscriptions: [liveSub], stripe: {ok: false, status: 404}});
  const res = await deleteFn.handler(deleteEvent());
  assert.equal(res.statusCode, 502);
  assert.deepEqual(deletedTables(), []);
});

ta('delete: an account with no billable subscription deletes, and claims nothing more', async () => {
  process.env.STRIPE_BILLING_KEY = 'rk_test_billing';
  stubAccount({subscriptions: [{id: 'sub-row-0', stripe_subscription_id: 'sub_old_1', status: 'canceled', plan: 'operator'}]});
  const res = await deleteFn.handler(deleteEvent());
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.subscriptionsCanceled, 0);
  assert.ok(!/cancel/i.test(body.message), 'do not claim a cancellation that never happened');
  assert.deepEqual(deletedTables(), ['scans', 'sessions', 'magic_links', 'usage', 'subscriptions', 'accounts']);
  assert.equal(stripeCalls().length, 0, 'a canceled row has nothing left to cancel');
  assert.match(res.headers['Set-Cookie'], /gs_session=; /);
});

ta('delete: a one-time purchase row never reaches the Stripe subscriptions API', async () => {
  // stripe-webhook.js stores the checkout session id when mode !== subscription.
  // Nothing recurring exists, so it must neither block the delete nor be DELETEd.
  delete process.env.STRIPE_BILLING_KEY;
  stubAccount({subscriptions: [{id: 'sub-row-2', stripe_subscription_id: 'cs_test_9', status: 'active', plan: 'operator'}]});
  const res = await deleteFn.handler(deleteEvent());
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).subscriptionsCanceled, 0);
  assert.equal(stripeCalls().length, 0);
  assert.equal(deletedTables().length, 6);
});

ta('delete: the success path cancels with Stripe BEFORE the first row is deleted', async () => {
  process.env.STRIPE_BILLING_KEY = 'rk_test_billing';
  stubAccount({subscriptions: [liveSub]});
  const res = await deleteFn.handler(deleteEvent());
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.subscriptionsCanceled, 1);
  assert.match(body.message, /cancelled with Stripe/);
  const call = stripeCalls()[0];
  assert.equal(call.method, 'DELETE');
  assert.equal(call.url, 'https://api.stripe.com/v1/subscriptions/sub_live_1');
  const cancelAt = acctCalls.findIndex((c) => c.op === 'stripe');
  const firstDelete = acctCalls.findIndex((c) => c.op === 'del');
  assert.ok(cancelAt < firstDelete, `cancel (${cancelAt}) must precede the first delete (${firstDelete})`);
  assert.deepEqual(deletedTables(), ['scans', 'sessions', 'magic_links', 'usage', 'subscriptions', 'accounts']);
});

ta('delete: a past_due subscription still counts as billing', async () => {
  delete process.env.STRIPE_BILLING_KEY;
  stubAccount({subscriptions: [{id: 'sub-row-3', stripe_subscription_id: 'sub_live_2', status: 'past_due', plan: 'operator'}]});
  const res = await deleteFn.handler(deleteEvent());
  assert.equal(res.statusCode, 409);
  assert.deepEqual(deletedTables(), []);
  assert.ok(deleteFn.BILLABLE_STATUS.has('needs_review'), 'an unresolved paid purchase is still charging the card');
  assert.ok(!deleteFn.BILLABLE_STATUS.has('canceled'));
});

ta('export: refuses without a session', async () => {
  stubAccount({});
  authMod.currentAccount = async () => null;
  const res = await exportFn.handler({httpMethod: 'GET', headers: {}});
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).ok, false);
  assert.equal(acctCalls.filter((c) => c.op === 'select').length, 0, 'no data is read for an anonymous caller');
});

ta('export: refuses a non-GET method', async () => {
  stubAccount({});
  const res = await exportFn.handler({httpMethod: 'POST', headers: {}});
  assert.equal(res.statusCode, 405);
});

ta('export: returns the whole account as a JSON attachment, without Stripe ids', async () => {
  stubAccount({
    subscriptions: [{plan: 'operator', status: 'active', created_at: '2026-02-01T00:00:00Z', stripe_customer_id: 'cus_leak', stripe_subscription_id: 'sub_leak'}],
    usage: [{period: '2026-08', used: 3}],
    scans: [{id: 'scan-1', store_url: 'https://store.example', depth: 'full', detected_count: 2, evidence_score: 71, report: {summary: {detectedCount: 2}}, created_at: '2026-08-01T00:00:00Z'}]
  });
  const res = await exportFn.handler({httpMethod: 'GET', headers: {}});
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json');
  assert.match(res.headers['Content-Disposition'], /^attachment; filename="githubscout-account-export-\d{4}-\d{2}-\d{2}\.json"$/);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  const body = JSON.parse(res.body);
  assert.deepEqual(Object.keys(body), ['ok', 'format', 'generated_at', 'account', 'subscriptions', 'usage', 'scans', 'not_included']);
  assert.equal(body.format, exportFn.EXPORT_FORMAT);
  assert.equal(body.account.email, testAccount.email);
  assert.deepEqual(body.subscriptions, [{plan: 'operator', status: 'active', created_at: '2026-02-01T00:00:00Z'}]);
  assert.ok(!/cus_leak|sub_leak/.test(res.body), 'internal Stripe ids must not be echoed into a downloadable file');
  assert.deepEqual(body.usage, [{period: '2026-08', used: 3}]);
  assert.equal(body.scans[0].report.summary.detectedCount, 2, 'the full saved report is included, not just the row summary');
  // privacy.html promises export; the file must not read broader than the DB is.
  assert.match(body.not_included.payment_records, /Stripe/);
  assert.match(body.not_included.auth_tokens, /hash/i);
  globalThis.fetch = realFetch;
});

(async () => {
  for (const [name, fn] of asyncTests) {
    try { await fn(); pass++; } catch (e) { fail.push(`${name}: ${e.message}`); }
  }
  console.log(`\n${pass} passed, ${fail.length} failed`);
  if (fail.length) { fail.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
  console.log('All integrity, gating, rate-limit, SSRF, and plan-resolution tests passed.');
})();
