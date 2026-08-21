'use strict';
// aggregate.js — merges adapter evidence into detections, confidence, and
// savings. Integrity rules enforced here:
//  1. Savings derive ONLY from apps actually detected. No detections ⇒ null.
//  2. Confidence comes from corroboration (how many independent sources saw
//     the app), not from an arbitrary formula on pattern count alone.
//  3. Spend tier is used for messaging/urgency only — never to invent dollars.
//  4. All costs are labeled benchmarks with citation where available.
//  5. Evidence strength gates dollars: only evidence seen ON the storefront can
//     produce a savings figure (see STRENGTH below).

const {appSignatures, categoryRules, RULES_VERSION} = require('./rules');
const money = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

// --- Evidence-strength taxonomy -------------------------------------------
// Why: the old formula scored one DNS TXT substring at 62% confidence, which a
// customer reads as "we found this". A TXT or MX record proves a *domain*
// relationship (usually just email routing or an old verification token); it
// does not prove the app runs on the storefront. Same for a robots.txt line.
// Strength is therefore computed from the KIND and INDEPENDENCE of evidence,
// never from the raw count of matched substrings.
//
//   detected  — 2+ distinct sources agree, OR a third-party script host was
//               parsed off a fetched page. A script host is direct evidence the
//               app's code loads on the storefront. Band 70-95.
//   likely    — exactly one storefront page matched a pattern, nothing else.
//               The app is almost certainly there, but nothing corroborates it.
//               Band 55-65.
//   possible  — the only evidence is DNS records, a robots.txt reference, or a
//               lone generic substring with no page and no host behind it.
//               Band 20-35: deliberately below `likely` so it can never read as
//               "we found this", and excluded from every dollar figure.
//
// The overall cap stays 95: confidence is a corroboration score, never a
// probability, and the engine never claims certainty.
const STRENGTH = {DETECTED: 'detected', LIKELY: 'likely', POSSIBLE: 'possible'};
// Only these strengths may contribute dollars (savings, overlaps, benchmarks).
const DOLLAR_STRENGTHS = new Set([STRENGTH.DETECTED, STRENGTH.LIKELY]);
// Sources that are not the storefront itself. A pattern hit from one of these
// is a domain-level or index-level reference, not an observed page load.
const OFF_STOREFRONT_SOURCES = new Set(['dns-records', 'robots-sitemap']);

function classifyStrength(evidence) {
  const hasHost = evidence.some((e) => e.kind === 'host');
  const hasStorefrontPage = evidence.some((e) => e.kind === 'pattern' && !OFF_STOREFRONT_SOURCES.has(e.source));
  const distinctSources = new Set(evidence.map((e) => e.source)).size;
  if (hasHost || distinctSources >= 2) return STRENGTH.DETECTED;
  if (hasStorefrontPage) return STRENGTH.LIKELY;
  return STRENGTH.POSSIBLE;
}

// Bands are contiguous and non-overlapping so a numeric comparison and a
// strength comparison can never disagree.
function scoreConfidence(strength, distinctSources, hasHost) {
  if (strength === STRENGTH.DETECTED) return Math.min(95, 70 + (distinctSources - 1) * 8 + (hasHost ? 10 : 0));
  if (strength === STRENGTH.LIKELY) return 60;
  return 25;
}

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
    const hasHost = evidence.some((e) => e.kind === 'host');
    const strength = classifyStrength(evidence);
    const confidence = scoreConfidence(strength, distinctSources, hasHost);
    detections.push({
      id: sig.id, name: sig.name, category: sig.category,
      cost: sig.cost, costBasis: 'benchmark', pricingUrl: sig.pricingUrl || null, costNote: sig.note || null,
      monthlyCost: sig.cost ? money.format(sig.cost) : 'Free/native',
      strength, countsTowardSavings: DOLLAR_STRENGTHS.has(strength) && Number(sig.cost) > 0,
      confidence, corroboratingSources: distinctSources, evidence
    });
  }
  return detections.sort((a, b) => (b.confidence - a.confidence) || (b.cost - a.cost));
}

// `unit` is part of the returned string because the client renders these
// verbatim: it must never have to string-patch a server value to fix a label.
// The annual figure was previously suffixed "/mo", so a correct annual number
// was displayed as a monthly one.
function moneyRange(low, high, unit = '/mo') {
  if (!high || high <= 0) return null;
  return `${money.format(Math.round(low))}-${money.format(Math.round(high))}${unit}`;
}

// True when the crawl was refused by bot protection (lib/adapters.js
// summarizeBlock). Kept separate from "nothing found" everywhere it is used.
function crawlBlocked(scan) {
  return Boolean(scan && scan.crawlBlock && scan.crawlBlock.blocked);
}

// The crawl gate: dollars require that the scan actually reached the thing it
// is pricing. A domain that is not a Shopify storefront, or a storefront no
// page of which was fetched, yields no estimate — never a smaller one.
// `crawl-blocked` is checked first because it is the *cause* of the other two:
// a store that refuses us is also unconfirmable as Shopify, and telling a
// merchant "this is not a Shopify store" when their edge simply refused us
// would be a false statement about their store.
// Returns null when the gate passes, otherwise the machine-readable reason.
function savingsGateReason(scan) {
  if (crawlBlocked(scan)) return 'crawl-blocked';
  if (!scan || !scan.shopifyConfirmed) return 'not-shopify';
  if (((scan && scan.pages) || []).length < 1) return 'no-pages-fetched';
  return null;
}

// Detections that may contribute dollars: paid, and seen on the storefront.
function billableDetections(detectedApps) {
  return (detectedApps || []).filter((a) => Number(a.cost) > 0 && DOLLAR_STRENGTHS.has(a.strength));
}

const SUPPRESSION_BASIS = {
  'crawl-blocked': 'No savings estimate: the store refused our automated requests, so no page of it was seen. This says nothing about which apps the store runs.',
  'not-shopify':'No savings estimate: this URL was not confirmed as a Shopify storefront, so app costs cannot be attributed to a store.',
  'no-pages-fetched': 'No savings estimate: no storefront page could be fetched, so nothing was observed running on the site.',
  'no-paid-detections': 'No paid app signatures were seen on the storefront; no savings estimate is made. Possible-strength signals (DNS or robots.txt only) are reported but never priced.'
};

// Savings from detected paid apps only: 15%-40% of benchmarked detected spend
// (consolidation/downgrade band), plus explicit overlap line items.
// `scan` is required: without the crawl context there is no evidence the store
// was reached, and the honest answer is no number at all.
function savingsFromDetected(detectedApps, scan) {
  const gated = savingsGateReason(scan);
  if (gated) {
    return {monthly: null, annual: null, detectedMonthly: 0, suppressedReason: gated, basis: SUPPRESSION_BASIS[gated]};
  }
  const paid = billableDetections(detectedApps);
  const detectedMonthly = paid.reduce((s, a) => s + Number(a.cost), 0);
  if (!detectedMonthly) {
    return {monthly: null, annual: null, detectedMonthly: 0, suppressedReason: 'no-paid-detections', basis: SUPPRESSION_BASIS['no-paid-detections']};
  }
  const low = detectedMonthly * 0.15;
  const high = detectedMonthly * 0.40;
  return {
    monthly: moneyRange(low, high),
    annual: moneyRange(low * 12, high * 12, '/yr'),
    detectedMonthly,
    suppressedReason: null,
    basis: `15-40% consolidation/downgrade band applied to ${money.format(detectedMonthly)}/mo of benchmarked cost across ${paid.length} detected paid app(s). Benchmarks are typical published pricing, not this store's invoices.`
  };
}

// Category overlaps: 2+ paid apps in one category = concrete consolidation
// target. Same gate as savings — two possible-strength matches in a category
// are not a consolidation finding, they are two unconfirmed guesses.
function findOverlaps(detectedApps, scan) {
  if (savingsGateReason(scan)) return [];
  const byCat = {};
  billableDetections(detectedApps).forEach((a) => { (byCat[a.category] = byCat[a.category] || []).push(a); });
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

// The only recommendation a blocked crawl may produce. It replaces the whole
// list rather than joining it, because every other recommendation on this page
// is a statement about what was observed on the storefront and nothing was.
function blockedRecommendation(scan) {
  const block = (scan && scan.crawlBlock) || {};
  const who = block.vendor ? `${block.vendor} bot protection` : 'bot protection on the store';
  return {
    category: 'Access',
    title: 'The store blocked the scan',
    severity: 'High',
    current: `${who} refused our requests, so no storefront page was read. No conclusion about this store's apps can be drawn from this scan, in either direction.`,
    recommend: 'Run the audit from inside the Shopify admin instead: the app list there is the complete, authoritative version of what external scanning was prevented from seeing.',
    monthly: null,
    confidence: 'No detection was possible',
    action: 'Open Shopify admin > Settings > Apps and sales channels, export the installed app list, and re-run the review against that list.'
  };
}

function buildRecommendations(detectedApps, overlaps, goal, scan) {
  if (crawlBlocked(scan)) return [blockedRecommendation(scan)];
  const recs = [];
  overlaps.forEach((o) => recs.push({
    category: o.category, title: `Consolidate ${o.category}`, severity: 'High',
    current: o.detail,
    recommend: `Keep one ${o.category} tool. Native option: ${o.native || 'platform features'}. Lower-cost option: ${o.cheaper || 'lighter alternative'}.`,
    monthly: o.potentialMonthly + '/mo (benchmark)',
    confidence: 'Detected overlap',
    action: `Export data from the redundant tool(s), run both for one billing cycle max, then cancel the loser.`
  }));
  // Only storefront-observed apps get a benchmark dollar figure attached.
  const expensive = billableDetections(detectedApps).filter((a) => a.cost > (categoryRules[a.category]?.threshold ?? 120));
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

// The one sentence a merchant reads first when their store refused us. It has
// to say three things and no more: they blocked us, this is not a finding about
// their stack, and here is the way to get the answer anyway.
function crawlBlockedLabel(block) {
  const who = block.vendor ? `${block.vendor} bot protection` : 'Bot protection on this store';
  const how = block.reason === 'http-status'
    ? `refused our requests (HTTP ${block.signals.find((s) => typeof s.status === 'number')?.status ?? 'error'})`
    : block.reason === 'challenge-page'
      ? 'answered with an automated-traffic challenge instead of the store pages'
      : 'answered every request without ever returning a store page';
  return `${who} ${how}, so no page of the storefront was read. This is not a finding about the store's apps — a blocked scan and a clean stack look identical from outside, and we will not report one as the other. Export the installed app list from Shopify admin > Settings > Apps and sales channels and review that instead.`;
}

/**
 * Build the full report. depth: 'full' | 'teaser' (free tier sees teaser).
 */
function buildReport(scan, submission, depth = 'full') {
  const context = spendContext(submission.monthly_ad_spend || '');
  const detected = detectFromEvidence(scan);
  const savings = savingsFromDetected(detected, scan);
  const overlaps = findOverlaps(detected, scan);
  const strengthCounts = {
    detected: detected.filter((a) => a.strength === STRENGTH.DETECTED).length,
    likely: detected.filter((a) => a.strength === STRENGTH.LIKELY).length,
    possible: detected.filter((a) => a.strength === STRENGTH.POSSIBLE).length
  };
  const score = evidenceScore(scan, detected);
  const recommendations = buildRecommendations(detected, overlaps, submission.primary_goal || '', scan);
  const block = (scan.crawlBlock && scan.crawlBlock.blocked) ? scan.crawlBlock : null;

  const full = {
    rulesVersion: RULES_VERSION,
    depth,
    crawl: {
      ok: (scan.pages || []).length > 0,
      shopifyConfirmed: Boolean(scan.shopifyConfirmed),
      pagesFetched: (scan.pages || []).map((p) => p.url),
      // Machine-readable blocked state. `blocked` is what the client branches
      // on; the rest is for the evidence trail and support triage.
      blocked: Boolean(block),
      blockedBy: block ? (block.vendor || null) : null,
      blockedReason: block ? block.reason : null,
      blockedSignals: block ? block.signals.map((s) => ({status: s.status, reason: s.reason, vendor: s.vendor || null})) : [],
      statusLabel: block
        ? crawlBlockedLabel(block)
        : ((scan.pages || []).length
          ? `Checked ${scan.sourcesSucceeded} of ${scan.sourcesLive} live sources; fetched ${(scan.pages || []).length} page(s).`
          : 'Live crawl unavailable. No savings estimate is shown without evidence.')
    },
    sources: {
      live: scan.sourcesLive, succeeded: scan.sourcesSucceeded,
      planned: scan.sourcesPlanned, detail: scan.sources
    },
    summary: {
      monthlySavings: savings.monthly, annualSavings: savings.annual,
      savingsBasis: savings.basis, detectedMonthlyBenchmark: savings.detectedMonthly,
      // null when a savings range is shown; otherwise why it is withheld.
      savingsSuppressedReason: savings.suppressedReason || null,
      evidenceScore: score, urgency: context.urgency, tier: context.tier, tierNote: context.note,
      // detectedCount keeps its existing meaning for the client: every signal
      // found, at any strength (operator-url-analysis.html:346, dashboard.html:195).
      detectedCount: detected.length, strengthCounts
    },
    detectedApps: detected, overlaps, recommendations,
    checkoutProviders: scan.checkoutProviders || [],
    actionPlan: buildActionPlan(context.urgency),
    methodology: 'Detection: public storefront pages, headers, robots.txt, catalog endpoint, and DNS records matched against ruleset v' + RULES_VERSION + '. Costs are published-pricing benchmarks (cited where available), not store invoices. Savings shown only when paid apps are detected.'
  };

  if (depth === 'teaser') {
    return {
      ...full,
      detectedApps: detected.slice(0, 3).map((a) => ({
        name: a.name, category: a.category, confidence: a.confidence,
        strength: a.strength, countsTowardSavings: a.countsTowardSavings, monthlyCost: a.monthlyCost
      })),
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
  evidenceScore, buildRecommendations, buildReport, moneyRange,
  STRENGTH, DOLLAR_STRENGTHS, savingsGateReason, classifyStrength,
  crawlBlocked, crawlBlockedLabel, SUPPRESSION_BASIS
};
