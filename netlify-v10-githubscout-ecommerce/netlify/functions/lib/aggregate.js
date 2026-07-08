'use strict';
// aggregate.js — merges adapter evidence into detections, confidence, and
// savings. Integrity rules enforced here:
//  1. Savings derive ONLY from apps actually detected. No detections ⇒ null.
//  2. Confidence comes from corroboration (how many independent sources saw
//     the app), not from an arbitrary formula on pattern count alone.
//  3. Spend tier is used for messaging/urgency only — never to invent dollars.
//  4. All costs are labeled benchmarks with citation where available.

const {appSignatures, categoryRules, RULES_VERSION} = require('./rules');
const money = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

// FIXED tier matching (v10 bug: includes('250,000') also matched the
// "$100,000 to $250,000" option, shifting bands up a tier).
function spendContext(range = '') {
  const r = String(range);
  if (/more than\s*\$?\s*250,?000|\$?250,?000\s*\+/i.test(r)) {
    return {tier: '250k+', urgency: 'Critical', note: 'At this ad volume, stack waste compounds fast — audit before the next billing cycle.'};
  }
  if (/100,?000\s*(to|-|–)\s*\$?\s*250,?000/i.test(r)) {
    return {tier: '100k-250k', urgency: 'High', note: 'Your app stack should be conversion-accountable, not just feature-rich.'};
  }
  if (/10,?000\s*(to|-|–)\s*\$?\s*100,?000/i.test(r)) {
    return {tier: '10k-100k', urgency: 'High', note: 'This is the sweet spot for consolidation and better CRO tooling.'};
  }
  return {tier: 'under-10k', urgency: 'Medium', note: 'Lean software choices matter most when every paid click has to work.'};
}

/**
 * Detect apps from multi-source evidence.
 * @param {object} scan output of runAdapters(); may be partial.
 * @returns detections sorted by (confidence, cost)
 */
function detectFromEvidence(scan) {
  const detections = [];
  const seen = new Set(); // guard against duplicate signature ids in the ruleset
  const pages = scan.pages || [];
  const hostSet = new Set((scan.scriptHosts || []).slice(0, 500).map((h) => h.toLowerCase()));
  const dnsBlob = [...(scan.dnsInfo?.txt || []), ...(scan.dnsInfo?.mx || [])].join(' ').toLowerCase();
  const robotsBlob = scan.robots?.haystack || '';

  for (const sig of appSignatures) {
    const evidence = [];
    for (const page of pages) {
      const matchedPatterns = (sig.patterns || []).filter((p) => page.evidence.haystack.includes(p.toLowerCase()));
      if (matchedPatterns.length) evidence.push({source: page.sourceId, kind: 'pattern', values: matchedPatterns, page: page.url});
    }
    const matchedHosts = (sig.hosts || []).filter((h) => hostSet.has(h.toLowerCase()) || [...hostSet].some((sh) => sh.endsWith(h.toLowerCase())));
    if (matchedHosts.length) evidence.push({source: 'script-hosts', kind: 'host', values: matchedHosts});
    const matchedDns = (sig.dns || []).filter((d) => dnsBlob.includes(d.toLowerCase()));
    if (matchedDns.length) evidence.push({source: 'dns-records', kind: 'dns', values: matchedDns});
    if (robotsBlob && (sig.patterns || []).some((p) => robotsBlob.includes(p.toLowerCase()))) {
      evidence.push({source: 'robots-sitemap', kind: 'pattern', values: ['robots.txt reference']});
    }
    if (!evidence.length) continue;
    if (seen.has(sig.id)) continue;
    seen.add(sig.id);

    const distinctSources = new Set(evidence.map((e) => e.source)).size;
    const hostBoost = evidence.some((e) => e.kind === 'host') ? 10 : 0;
    const confidence = Math.min(95, 50 + distinctSources * 12 + hostBoost);
    detections.push({
      id: sig.id, name: sig.name, category: sig.category,
      cost: sig.cost, costBasis: 'benchmark', pricingUrl: sig.pricingUrl || null, costNote: sig.note || null,
      monthlyCost: sig.cost ? money.format(sig.cost) : 'Free/native',
      confidence, corroboratingSources: distinctSources, evidence
    });
  }
  return detections.sort((a, b) => (b.confidence - a.confidence) || (b.cost - a.cost));
}

function moneyRange(low, high) {
  if (!high || high <= 0) return null;
  return `${money.format(Math.round(low))}-${money.format(Math.round(high))}/mo`;
}

// Savings from detected paid apps only: 15%-40% of benchmarked detected spend
// (consolidation/downgrade band), plus explicit overlap line items.
function savingsFromDetected(detectedApps) {
  const paid = (detectedApps || []).filter((a) => Number(a.cost) > 0);
  const detectedMonthly = paid.reduce((s, a) => s + Number(a.cost), 0);
  if (!detectedMonthly) {
    return {monthly: null, annual: null, detectedMonthly: 0, basis: 'No paid app signatures detected; no savings estimate is made.'};
  }
  const low = detectedMonthly * 0.15;
  const high = detectedMonthly * 0.40;
  return {
    monthly: moneyRange(low, high),
    annual: moneyRange(low * 12, high * 12),
    detectedMonthly,
    basis: `15-40% consolidation/downgrade band applied to ${money.format(detectedMonthly)}/mo of benchmarked cost across ${paid.length} detected paid app(s). Benchmarks are typical published pricing, not this store's invoices.`
  };
}

// Category overlaps: 2+ paid apps in one category = concrete consolidation target.
function findOverlaps(detectedApps) {
  const byCat = {};
  (detectedApps || []).forEach((a) => { if (a.cost > 0) (byCat[a.category] = byCat[a.category] || []).push(a); });
  return Object.entries(byCat)
    .filter(([, apps]) => apps.length >= 2)
    .map(([category, apps]) => {
      const sorted = [...apps].sort((a, b) => b.cost - a.cost);
      const redundant = sorted.slice(1);
      const saving = redundant.reduce((s, a) => s + a.cost, 0);
      return {
        category,
        apps: sorted.map((a) => a.name),
        potentialMonthly: money.format(saving),
        detail: `${sorted.length} paid ${category} tools detected (${sorted.map((a) => `${a.name} ~${a.monthlyCost}`).join(', ')}). Consolidating to one could free up to ${money.format(saving)}/mo of benchmarked cost.`,
        native: categoryRules[category]?.native || null,
        cheaper: categoryRules[category]?.cheaper || null
      };
    });
}

// Evidence score: how much the scan actually saw (replaces the old
// dropdown-driven "urgency score").
function evidenceScore(scan, detectedApps) {
  const src = Math.min(40, (scan.sourcesSucceeded || 0) * 5);
  const det = Math.min(40, (detectedApps || []).length * 5);
  const corr = Math.min(20, (detectedApps || []).filter((a) => a.corroboratingSources >= 2).length * 5);
  return src + det + corr;
}

function buildRecommendations(detectedApps, overlaps, goal) {
  const recs = [];
  overlaps.forEach((o) => recs.push({
    category: o.category, title: `Consolidate ${o.category}`, severity: 'High',
    current: o.detail,
    recommend: `Keep one ${o.category} tool. Native option: ${o.native || 'platform features'}. Lower-cost option: ${o.cheaper || 'lighter alternative'}.`,
    monthly: o.potentialMonthly + '/mo (benchmark)',
    confidence: 'Detected overlap',
    action: `Export data from the redundant tool(s), run both for one billing cycle max, then cancel the loser.`
  }));
  const expensive = (detectedApps || []).filter((a) => a.cost > (categoryRules[a.category]?.threshold ?? 120));
  expensive.slice(0, 4).forEach((a) => recs.push({
    category: a.category, title: `Pressure-test ${a.name}`, severity: 'Medium',
    current: `${a.name} detected (${a.corroboratingSources} corroborating source${a.corroboratingSources === 1 ? '' : 's'}). Benchmark cost ${a.monthlyCost}${a.pricingUrl ? ` (per ${a.pricingUrl})` : ''} — above the ${a.category} value threshold.`,
    recommend: `Compare against ${categoryRules[a.category]?.cheaper || 'a lower-cost tier'} or native ${categoryRules[a.category]?.native || 'platform features'} before the next renewal.`,
    monthly: `Up to ${a.monthlyCost} (benchmark)`,
    confidence: `${a.confidence}% detection confidence`,
    action: `Pull the actual invoice, measure the revenue this tool owns, and get a downgrade or replacement quote this week.`
  }));
  if (!recs.length) {
    recs.push({
      category: 'Visibility', title: 'Stack is quiet from the outside', severity: 'Low',
      current: 'Few or no paid app signatures were visible across the crawled pages and DNS. Apps may be tag-managed, consent-gated, or server-side.',
      recommend: 'Run the authenticated audit from inside the Shopify admin (app embed list) — external scanning has hit its honest limit for this store.',
      monthly: null, confidence: 'No fabricated estimate is shown', action: 'Export the app list from Shopify admin and re-run a manual review.'
    });
  }
  if (goal === 'Cut app costs') recs.sort((a, b) => (b.severity === 'High') - (a.severity === 'High'));
  return recs.slice(0, 6);
}

function buildActionPlan(urgency) {
  return [
    ['Today', 'Save the current app list and identify every script, widget, pixel, and analytics tag touching the storefront.'],
    ['24 hours', `Challenge ${urgency === 'Critical' ? 'three paid app renewals' : 'one paid app renewal'} before the next billing cycle, starting with the weakest measurable revenue impact.`],
    ['48 hours', 'Pick one compare-and-contrast test: current widget vs lower-cost replacement.'],
    ['7 days', 'Measure app cost, speed, add-to-cart rate, checkout progression, and AOV before the next software purchase.']
  ];
}

/**
 * Build the full report. depth: 'full' | 'teaser' (free tier sees teaser).
 */
function buildReport(scan, submission, depth = 'full') {
  const context = spendContext(submission.monthly_ad_spend || '');
  const detected = detectFromEvidence(scan);
  const savings = savingsFromDetected(detected);
  const overlaps = findOverlaps(detected);
  const score = evidenceScore(scan, detected);
  const recommendations = buildRecommendations(detected, overlaps, submission.primary_goal || '');

  const full = {
    rulesVersion: RULES_VERSION,
    depth,
    crawl: {
      ok: (scan.pages || []).length > 0,
      shopifyConfirmed: Boolean(scan.shopifyConfirmed),
      pagesFetched: (scan.pages || []).map((p) => p.url),
      statusLabel: (scan.pages || []).length
        ? `Checked ${scan.sourcesSucceeded} of ${scan.sourcesLive} live sources; fetched ${(scan.pages || []).length} page(s).`
        : 'Live crawl unavailable. No savings estimate is shown without evidence.'
    },
    sources: {
      live: scan.sourcesLive, succeeded: scan.sourcesSucceeded,
      planned: scan.sourcesPlanned, detail: scan.sources
    },
    summary: {
      monthlySavings: savings.monthly, annualSavings: savings.annual,
      savingsBasis: savings.basis, detectedMonthlyBenchmark: savings.detectedMonthly,
      evidenceScore: score, urgency: context.urgency, tier: context.tier, tierNote: context.note,
      detectedCount: detected.length
    },
    detectedApps: detected, overlaps, recommendations,
    checkoutProviders: scan.checkoutProviders || [],
    actionPlan: buildActionPlan(context.urgency),
    methodology: 'Detection: public storefront pages, headers, robots.txt, catalog endpoint, and DNS records matched against ruleset v' + RULES_VERSION + '. Costs are published-pricing benchmarks (cited where available), not store invoices. Savings shown only when paid apps are detected.'
  };

  if (depth === 'teaser') {
    return {
      ...full,
      detectedApps: detected.slice(0, 3).map((a) => ({name: a.name, category: a.category, confidence: a.confidence, monthlyCost: a.monthlyCost})),
      overlaps: overlaps.map((o) => ({category: o.category, apps: o.apps.length})),
      recommendations: recommendations.slice(0, 2),
      teaser: {
        hiddenApps: Math.max(0, detected.length - 3),
        hiddenRecommendations: Math.max(0, recommendations.length - 2),
        message: detected.length > 3
          ? `${detected.length - 3} more detected app(s), full evidence trails, overlap costing, and the action plan are in the full report.`
          : 'Full evidence trails, overlap costing, and the action plan are in the full report.'
      }
    };
  }
  return full;
}

module.exports = {
  spendContext, detectFromEvidence, savingsFromDetected, findOverlaps,
  evidenceScore, buildRecommendations, buildReport, moneyRange
};
