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
const dns = require('node:dns');
const net = require('node:net');
const {URL} = require('node:url');

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

function readLimitedBody(res, maxChars = MAX_HTML_CHARS) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(res.headers['content-length'] || 0);
    if (contentLength > MAX_CONTENT_LENGTH) {
      res.destroy();
      return reject(new Error('Response too large to scan safely.'));
    }
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      body += chunk;
      if (body.length >= maxChars) { res.destroy(); resolve(body.slice(0, maxChars)); }
    });
    res.on('end', () => resolve(body.slice(0, maxChars)));
    res.on('error', reject);
  });
}

/**
 * Fetch a public URL with SSRF guards, manual redirects (each hop re-guarded),
 * size caps, and timeouts. Returns {ok, status, headers, body, finalUrl}.
 */
async function fetchPublic(target, {accept = 'text/html,application/xhtml+xml,application/json,text/plain', maxChars = MAX_HTML_CHARS, allowTypes = null} = {}) {
  let url = target instanceof URL ? target : normalizeUrl(target);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const {res} = await guardedRequest(url, {
      headers: {
        'User-Agent': `Mozilla/5.0 (compatible; GitHubScoutOperatorScan/2.0; +${process.env.URL || 'https://githubscout.example'})`,
        'Accept': accept
      }
    });
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
  guardedLookup, fetchPublic, clientIp, checkRateLimit, checkRateLimitShared,
  rateBuckets, RATE_LIMIT_MAX, MAX_HTML_CHARS
};
