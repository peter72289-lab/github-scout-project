exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {'Allow': 'POST'},
      body: JSON.stringify({ok: false, error: 'Method not allowed'})
    };
  }

  const params = new URLSearchParams(event.body || '');
  const submission = Object.fromEntries(params.entries());

  console.log('operator-url-scan', {
    email: submission.email || null,
    store_url: submission.store_url || null,
    monthly_ad_spend: submission.monthly_ad_spend || null,
    primary_goal: submission.primary_goal || null,
    received_at: new Date().toISOString()
  });

  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ok: true})
  };
};
