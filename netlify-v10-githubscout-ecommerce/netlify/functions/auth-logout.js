'use strict';
const auth = require('./lib/auth');
exports.handler = async (event) => {
  await auth.destroySession(event);
  return {statusCode: 302, headers: {'Set-Cookie': auth.clearCookie(), 'Location': '/login.html', 'Cache-Control': 'no-store'}, body: ''};
};
