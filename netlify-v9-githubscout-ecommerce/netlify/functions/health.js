exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify({
    ok: true,
    service: 'github-scout-v9-ecommerce',
    checked_at: new Date().toISOString()
  })
});
