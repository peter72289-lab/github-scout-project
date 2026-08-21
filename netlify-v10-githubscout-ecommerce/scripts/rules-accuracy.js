#!/usr/bin/env node
'use strict';
// rules-accuracy.js — what the 65 signatures in lib/rules.js actually did.
//
// A local operator script, not a deployed function: it needs the service-role
// key and prints the whole corpus, so it runs on a laptop with env vars set and
// is denied on the public site by netlify.toml. Run `bun scripts/rules-accuracy.js`
// from the v10 root.
//
// It answers four questions the ruleset cannot answer about itself:
//   1. Which signatures fire, and how often.
//   2. Where a customer has told us we were right or wrong (detection_feedback).
//   3. Which signatures have never fired at all — dead rules, carrying a price
//      benchmark we have never once had to defend.
//   4. Which apps co-occur, which is what a consolidation pitch is built on.
//
// Supabase does not exist yet, so with no DB configured this prints why and
// exits 0. Nothing here is a claim about the product; it is a read of our own
// telemetry, and an empty table prints as empty.

const path = require('node:path');
const db = require(path.join(__dirname, '../netlify/functions/lib/supabase.js'));
const {appSignatures, RULES_VERSION} = require(path.join(__dirname, '../netlify/functions/lib/rules.js'));

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;
const TOP_PAIRS = 20;

/** Page through a table until it is exhausted or MAX_ROWS is reached. */
async function fetchAll(table, query) {
  const rows = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const page = await db.select(table, `${query}&limit=${PAGE_SIZE}&offset=${offset}`);
    if (!page || !page.length) break;
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Aggregate telemetry and feedback into the numbers the report prints. Pure, so
 * the shape of the report is testable without a database.
 */
function summarize(events, feedback) {
  const byId = new Map(appSignatures.map((s) => [s.id, {id: s.id, name: s.name, category: s.category, cost: s.cost, fired: 0, strengths: {detected: 0, likely: 0, possible: 0}, correct: 0, incorrect: 0, unsure: 0}]));
  const unknown = new Map(); // signature ids seen in telemetry but no longer in the ruleset
  const pairs = new Map();

  for (const ev of events) {
    const ids = [...new Set((ev.detections || []).map((d) => d && d.id).filter(Boolean))].sort();
    for (const d of ev.detections || []) {
      if (!d || !d.id) continue;
      const row = byId.get(d.id);
      if (!row) { unknown.set(d.id, (unknown.get(d.id) || 0) + 1); continue; }
      row.fired++;
      if (d.strength && row.strengths[d.strength] !== undefined) row.strengths[d.strength]++;
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`;
        pairs.set(key, (pairs.get(key) || 0) + 1);
      }
    }
  }

  for (const f of feedback) {
    const row = byId.get(f.signature_id);
    if (!row) { unknown.set(f.signature_id, unknown.get(f.signature_id) || 0); continue; }
    if (row[f.verdict] !== undefined) row[f.verdict]++;
  }

  const signatures = [...byId.values()];
  return {
    scans: events.length,
    feedbackCount: feedback.length,
    fired: signatures.filter((s) => s.fired > 0).sort((a, b) => b.fired - a.fired),
    dead: signatures.filter((s) => s.fired === 0).sort((a, b) => b.cost - a.cost),
    unknown: [...unknown.entries()].map(([id, count]) => ({id, count})),
    pairs: [...pairs.entries()]
      .map(([key, count]) => ({apps: key.split('|'), count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PAIRS)
  };
}

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '—');
const scans = (n) => `${n} scan${n === 1 ? '' : 's'}`;

function printReport(s) {
  const line = '─'.repeat(72);
  console.log(`\nRULESET ACCURACY — lib/rules.js v${RULES_VERSION}, ${appSignatures.length} signatures\n${line}`);
  console.log(`scan_events rows: ${s.scans}    detection_feedback rows: ${s.feedbackCount}`);

  if (!s.scans) {
    console.log('\nNo scans recorded yet, so there is nothing to measure. Every signature below is untested.');
  }

  console.log(`\nSIGNATURES THAT FIRED (${s.fired.length})`);
  if (!s.fired.length) console.log('  none');
  s.fired.forEach((r) => {
    const verdicts = r.correct + r.incorrect + r.unsure
      ? `  feedback: ${r.correct} correct / ${r.incorrect} incorrect / ${r.unsure} unsure`
      : '  feedback: none';
    console.log(`  ${r.id.padEnd(22)} ${scans(r.fired).padStart(11)} (${pct(r.fired, s.scans).padStart(4)})  ` +
      `d/l/p ${r.strengths.detected}/${r.strengths.likely}/${r.strengths.possible}${verdicts}`);
  });

  console.log(`\nNEVER FIRED — dead rules (${s.dead.length})`);
  if (!s.dead.length) console.log('  none');
  s.dead.forEach((r) => console.log(`  ${r.id.padEnd(22)} ${r.category.padEnd(16)} benchmark cost ${r.cost}`));

  if (s.unknown.length) {
    console.log('\nSEEN IN TELEMETRY BUT NOT IN THE CURRENT RULESET');
    s.unknown.forEach((u) => console.log(`  ${u.id.padEnd(22)} ${u.count} scan(s)`));
  }

  console.log(`\nMOST COMMON CO-OCCURRING PAIRS (top ${TOP_PAIRS})`);
  if (!s.pairs.length) console.log('  none');
  s.pairs.forEach((p) => console.log(`  ${scans(p.count).padStart(11)}  ${p.apps[0]} + ${p.apps[1]}`));
  console.log('');
}

async function main() {
  if (!db.enabled) {
    console.log('\nNo database configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to read scan_events\n' +
      'and detection_feedback. Supabase has never been stood up for this project, so there is\n' +
      'nothing to read yet and nothing is inferred.\n');
    return {ok: false, reason: 'db-not-configured'};
  }
  const events = await fetchAll('scan_events', 'select=detections&order=occurred_at.desc');
  const feedback = await fetchAll('detection_feedback', 'select=signature_id,verdict&order=created_at.desc');
  const summary = summarize(events, feedback);
  printReport(summary);
  return {ok: true, summary};
}

if (require.main === module) {
  main().catch((e) => { console.error(`rules-accuracy failed: ${e.message}`); process.exit(1); });
}

module.exports = {main, summarize, printReport, fetchAll};
