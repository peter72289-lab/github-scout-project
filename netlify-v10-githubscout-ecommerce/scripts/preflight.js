#!/usr/bin/env node
'use strict';
// Launch preflight gate. Run `node scripts/preflight.js` (or `npm run preflight`).
// Exits non-zero if any launch blocker is detected. This checks the CODEBASE;
// credential/account items (Stripe rotation, DNS, counsel) are tracked in
// LAUNCH-READINESS.md and can't be verified from here.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const rel = (p) => path.join(root, p);
const read = (p) => { try { return fs.readFileSync(rel(p), 'utf8'); } catch (e) { return null; } };

// The engine catalog is the only authority on source counts; every claim in the
// tree is checked against it rather than against another literal.
const {sourceCounts} = require(path.join(root, 'netlify/functions/lib/adapters.js'));
const CATALOG_COUNTS = sourceCounts();
const LIVE_SOURCES = CATALOG_COUNTS.live;

const problems = [];
const warnings = [];
const ok = [];
const fail = (m) => problems.push(m);
const warn = (m) => warnings.push(m);
const pass = (m) => ok.push(m);

// 1. Required files present
const required = [
  'index.html', 'login.html', 'dashboard.html', 'methodology.html',
  'sample-report.html', 'changelog.html', 'subprocessors.html',
  'netlify.toml', 'package.json', 'supabase/schema.sql',
  'netlify/functions/operator-url-scan.js', 'netlify/functions/stripe-webhook.js',
  'netlify/functions/auth-verify.js', 'netlify/functions/account-delete.js',
  'assets/consent.js', 'assets/launch-config.example.js'
];
required.forEach((f) => fs.existsSync(rel(f)) ? pass(`present: ${f}`) : fail(`MISSING required file: ${f}`));

// 2. Tests pass
try {
  execSync('node tests/run-tests.js', { cwd: root, stdio: 'pipe' });
  pass('unit tests pass');
} catch (e) {
  fail('unit tests FAILED — run `npm test` to see details');
}

// 3. No unresolved legal placeholders in terms/privacy
['terms.html', 'privacy.html'].forEach((f) => {
  const s = read(f) || '';
  if (s.includes('[[')) fail(`${f} still has [[placeholders]] — fill entity/jurisdiction/contact before launch`);
  else pass(`${f} placeholders resolved`);
});

// 4. No fabricated claims regressed
// Pages that are labelled samples: their numbers are illustrations of a report,
// not claims about what this visitor will get. Excluded from the dollar-range
// check by filename, and only from that check.
const SAMPLE_PAGES = new Set(['sample-report.html', 'operator-sample-reports.html', 'sample-shopify-url-analysis.html']);
// Form choices ($0-$100 spend brackets) are inputs the visitor picks, not
// figures we assert, so they are stripped before the dollar-range scan.
const stripFormChoices = (s) => s.replace(/<option\b[\s\S]*?<\/option>/gi, '').replace(/<option\b[^>]*>/gi, '');
const DOLLAR_RANGE = /\$\d[\d,.kK]*\s*-\s*\$\d/;
const claimFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
claimFiles.forEach((f) => {
  const s = read(f) || '';
  // Present-tense source-count inflation, in any phrasing. The honest forms
  // ("10 live sources (15 planned)") put the roadmap number AFTER the noun, so
  // they do not match.
  // `(?<![$\d.])` and `(?![-–%\d])` keep benchmark money ("$15 · 3 source(s)")
  // and the savings band ("15-40%") out of this; only a bare count matches.
  if (/(?<![$\d.])\b15\b(?![-–%\d])[^.]{0,40}sources?/i.test(s)) fail(`${f} claims 15 sources in the present tense — the catalog has ${LIVE_SOURCES} live`);
  if (/all 15/i.test(s)) fail(`${f} contains an "all 15" claim`);
  if (/\$21\.6k|\$78k/.test(s)) fail(`${f} reintroduced fabricated savings figures`);
  if (!SAMPLE_PAGES.has(f) && DOLLAR_RANGE.test(stripFormChoices(s))) {
    fail(`${f} hardcodes a dollar range — savings figures must come from a scan (labelled sample pages ${[...SAMPLE_PAGES].join(', ')} are exempt)`);
  }
});
if (!problems.some((p) => /sources|fabricated|dollar range/.test(p))) pass('no fabricated source/savings claims found');

// 4b. Source counts printed in HTML must match the engine catalog.
// Pages carry the honest count as static no-JS text in [data-source-count]
// elements; assets/source-counts.js refreshes them from /sources at runtime.
// This asserts the static fallback has not drifted from lib/adapters.js.
const countRe = /data-source-count="(live|planned|total)"[^>]*>([^<]*)</gi;
let countedNodes = 0;
claimFiles.forEach((f) => {
  const s = read(f) || '';
  let m;
  while ((m = countRe.exec(s))) {
    countedNodes++;
    const expected = String(CATALOG_COUNTS[m[1]]);
    if (m[2].trim() !== expected) fail(`${f} prints ${m[1]} source count "${m[2].trim()}" but lib/adapters.js says ${expected}`);
  }
});
if (countedNodes) pass(`${countedNodes} source-count element(s) match lib/adapters.js (${LIVE_SOURCES} live / ${CATALOG_COUNTS.total} total)`);
else warn('no [data-source-count] elements found — source counts may be hardcoded again');

// 5. Old spend-tier bug not present
const scanSrc = read('netlify/functions/operator-url-scan.js') || '';
const analysisSrc = read('operator-url-analysis.html') || '';
if (scanSrc.includes("includes('250,000')") || analysisSrc.includes("includes('250,000')")) {
  fail('spend-tier includes(250,000) bug is present again');
} else pass('spend-tier bug not present');

// 6. Live Stripe secret keys must not be tracked in source
claimFiles.concat(['assets/launch-config.js', 'assets/launch-config.example.js']).forEach((f) => {
  const s = read(f);
  if (s && /sk_live_[0-9a-zA-Z]{10,}/.test(s)) fail(`LIVE Stripe secret key found in ${f} — remove and rotate`);
});
// payment links present in tracked config = warning (should move to env/local)
const cfg = read('assets/launch-config.js');
if (cfg && /buy\.stripe\.com/.test(cfg)) warn('assets/launch-config.js contains payment links; keep it out of the public repo (see SECRETS-PURGE.md)');
pass('no live sk_live_ secret keys in tracked files');

// 7. Consent gate wired on ad pages
['index.html', 'operator-url-analysis.html', 'operator-shopify-savings.html'].forEach((f) => {
  const s = read(f) || '';
  if (s.includes('launch-analytics.js') && !s.includes('consent.js')) fail(`${f} loads analytics without consent.js`);
});
pass('consent gate present where analytics loads');

// 8. netlify.toml sanity
const toml = read('netlify.toml') || '';
if (!/\[functions\]/.test(toml)) fail('netlify.toml missing [functions] block');
if (!/Content-Security-Policy/.test(toml)) warn('netlify.toml has no CSP header');

// 9. Nothing internal is publicly served.
// `publish = "."` makes this whole folder the document root, so every runbook,
// the Supabase schema, the test suite, and the function sources would be
// fetchable at guessable URLs. netlify.toml denies them with forced 404
// redirects; this check is the thing that stops the deny list from drifting
// behind the file tree. It is default-deny: a file is allowed to reach the
// public web only if its extension is a site asset type, otherwise a matching
// deny rule must exist. Adding an internal file without a rule fails the gate.
const PUBLIC_EXT = new Set([
  '.html', '.css', '.js', '.txt', '.xml', '.ico', '.webmanifest',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
  '.mp4', '.webm', '.woff', '.woff2'
]);

// Minimal [[redirects]] reader — enough for `from`/`status`/`force`, and no
// TOML dependency (functions and scripts here stay dependency-free).
function parseRedirects(src) {
  return src.split(/\[\[redirects\]\]/).slice(1).map((block) => {
    const stop = block.search(/^\s*\[/m);
    const body = stop === -1 ? block : block.slice(0, stop);
    const grab = (key) => (body.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n]+)"?`, 'm')) || [])[1];
    return {from: grab('from'), status: grab('status'), force: /^\s*force\s*=\s*true/m.test(body)};
  });
}

// A rule denies a path when it returns 404 and forces past the real file.
// `from = "/dir/*"` covers everything under `dir/`; anything else is exact.
const denyRules = parseRedirects(toml).filter((r) => r.from && r.status === '404');
const isDenied = (relPath) => denyRules.some((r) => {
  const pattern = r.from.replace(/^\//, '');
  const hit = pattern.endsWith('/*')
    ? relPath === pattern.slice(0, -2) || relPath.startsWith(pattern.slice(0, -1))
    : relPath === pattern;
  if (!hit) return false;
  // An unforced rule loses to the file that actually exists at that path, so it
  // is not protection. Treat it as a miss and report it below.
  if (!r.force) fail(`netlify.toml denies "${r.from}" without force = true — the real file wins and is still served`);
  return r.force;
});

const publishRoot = root; // publish = "." in netlify.toml
const SKIP_DIRS = new Set(['node_modules', '.git', '.netlify']);
const walk = (dir, prefix = '') => fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
  const relPath = prefix ? `${prefix}/${e.name}` : e.name;
  if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : walk(path.join(dir, e.name), relPath);
  return [relPath];
});

const publishTomlValue = (toml.match(/^\s*publish\s*=\s*"([^"]*)"/m) || [])[1];
if (publishTomlValue !== '.') {
  warn(`netlify.toml publish = "${publishTomlValue}" — the exposure check assumes the folder root; update scripts/preflight.js section 9`);
} else {
  const exposed = walk(publishRoot).filter((f) => !PUBLIC_EXT.has(path.extname(f).toLowerCase()) && !isDenied(f));
  if (exposed.length) {
    fail(`${exposed.length} internal file(s) would be served publicly (publish = "."): ${exposed.slice(0, 12).join(', ')}${exposed.length > 12 ? ', …' : ''} — add a forced 404 redirect in netlify.toml`);
  } else {
    pass(`no internal files publicly served (${denyRules.length} deny rule(s) cover docs, tests, scripts, supabase, functions, and root notes)`);
  }
  // The deny list must not rot the other way either: a rule for a path that no
  // longer exists is dead weight that hides which files are actually covered.
  const stale = denyRules
    .map((r) => r.from.replace(/^\//, '').replace(/\/\*$/, ''))
    .filter((p) => !fs.existsSync(path.join(publishRoot, p)));
  if (stale.length) warn(`netlify.toml denies path(s) that no longer exist: ${stale.join(', ')}`);
}

// Report
const line = '─'.repeat(52);
console.log('\nPREFLIGHT LAUNCH GATE\n' + line);
ok.forEach((m) => console.log('  ✓ ' + m));
if (warnings.length) { console.log('\nWarnings (non-blocking):'); warnings.forEach((m) => console.log('  ! ' + m)); }
if (problems.length) {
  console.log('\nBLOCKERS:'); problems.forEach((m) => console.log('  ✗ ' + m));
  console.log(line + `\nFAIL — ${problems.length} blocker(s). Not launch-ready.\n`);
  process.exit(1);
}
console.log(line + '\nPASS — codebase checks clear. Credential/legal steps remain in LAUNCH-READINESS.md.\n');
