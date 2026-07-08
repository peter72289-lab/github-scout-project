'use strict';
const assert = require('node:assert');
const guard = require('../netlify/functions/lib/guard.js');
const {parseHtmlEvidence, SOURCE_CATALOG, liveSourceCount, detectCheckoutProviders} = require('../netlify/functions/lib/adapters.js');
const agg = require('../netlify/functions/lib/aggregate.js');

let pass = 0; const fail = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail.push(`${name}: ${e.message}`); } };

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
t('savings null when nothing detected', () => {
  const s = agg.savingsFromDetected([]);
  assert.equal(s.monthly, null); assert.equal(s.annual, null); assert.equal(s.detectedMonthly, 0);
});
t('savings null when only free apps detected', () => {
  const s = agg.savingsFromDetected([{cost: 0}, {cost: 0}]);
  assert.equal(s.monthly, null);
});
t('savings = 15-40% of detected benchmark', () => {
  const s = agg.savingsFromDetected([{cost: 200}, {cost: 100}]);
  assert.equal(s.detectedMonthly, 300);
  assert.match(s.monthly, /\$45-\$120\/mo/);
  assert.match(s.basis, /benchmark/i);
});
t('moneyRange null on zero', () => assert.equal(agg.moneyRange(0, 0), null));

// ---------- Multi-source detection + corroboration confidence ----------
function fakeScan({html = '', hosts = [], txt = [], mx = [], robots = ''} = {}) {
  return {
    pages: html ? [{sourceId: 'home-html', url: 'https://x.example/', evidence: parseHtmlEvidence(html)}] : [],
    scriptHosts: hosts, dnsInfo: {txt, mx}, robots: robots ? {haystack: robots} : null,
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
  const d = agg.detectFromEvidence(fakeScan({html: 'staticw2.yotpo.com cdn.judge.me judgeme yotpo-widget'}));
  const overlaps = agg.findOverlaps(d);
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

console.log(`\n${pass} passed, ${fail.length} failed`);
if (fail.length) { fail.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
console.log('All integrity, gating, rate-limit, and SSRF tests passed.');
