'use strict';
// Public source-catalog reporter. The site is static with no build step, so
// pages cannot import lib/adapters.js. Without this endpoint every page has to
// hardcode a source count, which is exactly how "15 sources" outlived the
// engine. Pages ship the honest count as static no-JS text and let
// assets/source-counts.js correct it from here, so the catalog stays the single
// source of truth. No secrets, no env, no database — safe to cache.
const {SOURCE_CATALOG, sourceCounts} = require('./lib/adapters');

exports.handler = async () => {
  const counts = sourceCounts();
  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300'},
    body: JSON.stringify({
      ok: true,
      live: counts.live,
      planned: counts.planned,
      total: counts.total,
      catalog: SOURCE_CATALOG.map((s) => ({id: s.id, name: s.name, status: s.status}))
    })
  };
};
