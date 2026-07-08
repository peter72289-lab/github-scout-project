'use strict';
// supabase.js — minimal dependency-free Supabase REST client (service role).
// If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset, `enabled` is false and
// callers degrade gracefully (free scans still work, nothing persists).

const BASE = process.env.SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const enabled = Boolean(BASE && KEY);

async function rest(path, {method = 'GET', body, headers = {}} = {}) {
  if (!enabled) throw new Error('Supabase is not configured.');
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': KEY, 'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function rpc(fn, args = {}) {
  if (!enabled) throw new Error('Supabase is not configured.');
  const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(args)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase rpc ${fn} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const select = (table, query) => rest(`${table}?${query}`);
const insert = (table, row) => rest(table, {method: 'POST', body: row});
const update = (table, query, patch) => rest(`${table}?${query}`, {method: 'PATCH', body: patch});
const del = (table, query) => rest(`${table}?${query}`, {method: 'DELETE'});

module.exports = {enabled, rest, rpc, select, insert, update, del};
