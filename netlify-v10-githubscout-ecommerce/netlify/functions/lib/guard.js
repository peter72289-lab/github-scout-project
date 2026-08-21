'use strict';
// guard.js — SSRF protection + rate limiting for all outbound storefront fetches.
// Fixes applied vs original v10:
//  - DNS rebinding TOCTOU closed: hostname is validated at CONNECT time via a
//    custom `lookup` passed to node:https, so the address the socket dials is
//    the address that was validated. Every redirect hop re-runs the same guard.
//  - Rate limit keyed on client IP ONLY (the old key included attacker-supplied
//    `intent`, letting anyone mint unlimited buckets).
//  - Optional shared-store rate limiting via Supabase RPC when configured
//    (in-memory Map is per-warm-lambda and documented as best-effort).

const https = require('node:https');
const http = require('node:http');
const zlib = require('node:zlib');
const dns = require('node:dns');
const net = require('node:net');
const {URL} = require('node:url');

// --- Request identity ------------------------------------------------------
// We identify ourselves. A browser-shaped User-Agent was tried and measured
// against five live storefronts (bombas, gymshark, allbirds, brooklinen,
// ruggable, `/` and `/products.json` each): it changed zero source counts.
// bombas.com refuses us because it serves a JavaScript security checkpoint that
// no header set defeats, not because of the UA.
//
// So the disguise bought nothing, and it would have cost something real:
// robots.txt is fetched here as an evidence source but its Disallow rules are
// NOT evaluated, and Shopify's default robots.txt disallows `/cart`, which the
// cart adapter fetches. Ignoring Disallow while wearing a browser's UA is
// evasion. Ignoring it under a name the site operator can read, block, and
// contact is a disagreement conducted in the open. Until the Disallow question
// is decided (TASKS_FOR_USER.md; it changes the published live-source count),
// we stay identifiable.
//
// This is also the product's whole differentiator: an integrity-first scanner
// does not sneak.
const SCAN_USER_AGENT = `Mozilla/5.0 (compatible; GitHubScoutOperatorScan/2.0; +${process.env.URL || 'https://githubscout.example'})`;
const ACCEPT_LANGUAGE = 'en-US,en;q=0.9';
// Only encodings decodeStream() below actually decodes may be advertised.
const ACCEPT_ENCODING = 'gzip, deflate, br';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 12;
const MAX_REDIRECTS = 3;
const MAX_HTML_CHARS = 180000;
const MAX_CONTENT_LENGTH = 900000;
const FETCH_TIMEOUT_MS = 6500;

const rateBuckets = new Map();

function isPrivateIpv4(host) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
  const parts = host.split('.').map(Number);
  if (parts.some((p) => p < 0 || p > 255)) return true;
  return parts[0] === 10 || parts[0] === 0 || parts[0] === 127 ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) || // CGNAT
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19));
}

function isPrivateIpv6(host) {
  const value = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  const v4 = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) return isPrivateIpv4(v4[1]);
  return false;
}

function isPrivateAddress(address, family) {
  return family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address);
}

function assertPublicHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host === 'metadata.google.internal' ||
      host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost') ||
      isPrivateIpv4(host) || isPrivateIpv6(host)) {
    throw new Error('Private or local URLs cannot be scanned.');
  }
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Store URL is required.');
  if (raw.length > 2000) throw new Error('Store URL is too long.');
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (scheme && !/^https?$/i.test(scheme[1])) throw new Error('Only http and https URLs can be scanned.');
  const withProtocol = scheme ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https URLs can be scanned.');
  assertPublicHostname(url.hostname);
  return url;
}

// Connect-time guarded lookup: the socket dials the exact address we validate.
function guardedLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  try { assertPublicHostname(hostname); } catch (e) { return callback(e); }
  if (net.isIP(hostname)) {
    const family = net.isIP(hostname);
    if (isPrivateAddress(hostname, family)) return callback(new Error('Private address blocked.'));
    return callback(null, hostname, family);
  }
  dns.lookup(hostname, {...options, all: true, verbatim: true}, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{address: addresses, family: options.family || 4}];
    for (const rec of list) {
      if (isPrivateAddress(rec.address, rec.family)) {
        return callback(new Error('Host resolves to a private address; scan blocked.'));
      }
    }
    const first = list[0];
    if (options.all) return callback(null, list);
    callback(null, first.address, first.family);
  });
}

// Minimal guarded fetch built on node core so `lookup` is honored.
function guardedRequest(url, {headers = {}, timeoutMs = FETCH_TIMEOUT_MS} = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'http:' ? http : https;
    const req = mod.request(url, {
      method: 'GET',
      headers,
      lookup: guardedLookup,
      timeout: timeoutMs
    }, (res) => resolve({req, res}));
    req.on('timeout', () => { req.destroy(new Error('Storefront request timed out.')); });
    req.on('error', reject);
    req.end();
  });
}

// Because we advertise gzip/deflate/br we must decode them. `createUnzip`
// auto-detects gzip vs zlib-deflate framing; an unknown or absent encoding is
// passed through untouched. Raw (headerless) deflate is not decodable here and
// fails like any other unreadable body — no CDN in front of a Shopify
// storefront serves it, and guessing at a body we cannot read would be worse.
function decodeStream(res) {
  const encoding = String(res.headers['content-encoding'] || '').toLowerCase().trim();
  if (encoding === 'gzip' || encoding === 'x-gzip' || encoding === 'deflate') return res.pipe(zlib.createUnzip());
  if (encoding === 'br') return res.pipe(zlib.createBrotliDecompress());
  return res;
}

// The cap is applied to the DECOMPRESSED stream, so it still bounds memory for
// a compression bomb exactly as it does for an oversized plain body: the moment
// the decoded text reaches maxChars both streams are destroyed.
function readLimitedBody(res, maxChars = MAX_HTML_CHARS) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(res.headers['content-length'] || 0);
    if (contentLength > MAX_CONTENT_LENGTH) {
      res.destroy();
      return reject(new Error('Response too large to scan safely.'));
    }
    const stream = decodeStream(res);
    const stop = () => { if (stream !== res) stream.destroy(); res.destroy(); };
    let body = '';
    let settled = false;
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      body += chunk;
      if (body.length >= maxChars && !settled) { settled = true; stop(); resolve(body.slice(0, maxChars)); }
    });
    stream.on('end', () => { if (!settled) { settled = true; resolve(body.slice(0, maxChars)); } });
    stream.on('error', (e) => { if (!settled) { settled = true; stop(); reject(e); } });
    if (stream !== res) res.on('error', (e) => { if (!settled) { settled = true; stop(); reject(e); } });
  });
}

// Headers sent on every outbound storefront fetch. `From` is only added when a
// contact mailbox is configured; we never fabricate an address that would
// bounce.
function requestHeaders(accept) {
  const headers = {
    'User-Agent': SCAN_USER_AGENT,
    'Accept': accept,
    'Accept-Language': ACCEPT_LANGUAGE,
    'Accept-Encoding': ACCEPT_ENCODING
  };
  const contact = String(process.env.SCAN_CONTACT_EMAIL || '').trim();
  if (contact) headers['From'] = contact;
  return headers;
}

/**
 * Fetch a public URL with SSRF guards, manual redirects (each hop re-guarded),
 * size caps, and timeouts. Returns {ok, status, headers, body, finalUrl}.
 */
async function fetchPublic(target, {accept = 'text/html,application/xhtml+xml,application/json,text/plain', maxChars = MAX_HTML_CHARS, allowTypes = null} = {}) {
  let url = target instanceof URL ? target : normalizeUrl(target);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const {res} = await guardedRequest(url, {headers: requestHeaders(accept)});
    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
      res.resume();
      const location = res.headers.location;
      if (!location) throw new Error('Redirect without destination.');
      if (hop === MAX_REDIRECTS) throw new Error('Too many redirects to scan safely.');
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }
    const contentType = String(res.headers['content-type'] || '');
    if (allowTypes && contentType && !allowTypes.some((t) => contentType.includes(t))) {
      res.destroy();
      return {ok: false, status: res.statusCode, headers: res.headers, body: '', finalUrl: url.toString(), skipped: `unsupported content-type ${contentType}`};
    }
    const body = await readLimitedBody(res, maxChars);
    return {ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, headers: res.headers, body, finalUrl: url.toString()};
  }
  throw new Error('Too many redirects.');
}

function clientIp(event) {
  return event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown';
}

// Rate limit keyed on IP only. In-memory fallback is per-instance best-effort;
// use checkRateLimitShared (Supabase) for cross-instance enforcement.
function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || {count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS};
  if (now > bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + RATE_LIMIT_WINDOW_MS; }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 5000) rateBuckets.clear(); // memory cap
  return {allowed: bucket.count <= RATE_LIMIT_MAX, resetAt: bucket.resetAt, remaining: Math.max(0, RATE_LIMIT_MAX - bucket.count)};
}

async function checkRateLimitShared(ip, supabase) {
  if (!supabase || !supabase.enabled) return checkRateLimit(ip);
  try {
    const result = await supabase.rpc('rate_limit_hit', {p_key: ip, p_window_seconds: 60, p_max: RATE_LIMIT_MAX});
    if (result && typeof result.allowed === 'boolean') {
      return {allowed: result.allowed, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS, remaining: result.remaining ?? 0};
    }
  } catch (e) { /* fall through to local */ }
  return checkRateLimit(ip);
}

module.exports = {
  normalizeUrl, assertPublicHostname, isPrivateIpv4, isPrivateIpv6,
  guardedLookup, fetchPublic, requestHeaders, readLimitedBody, clientIp,
  checkRateLimit, checkRateLimitShared,
  rateBuckets, RATE_LIMIT_MAX, MAX_HTML_CHARS, SCAN_USER_AGENT
};
