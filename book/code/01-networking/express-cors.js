// express-cors.js: CORS headers and the preflight (OPTIONS) answer as Express middleware.
// Run: npm install && node express-cors.js
const express = require('express');
const app = express();

const ALLOWED_ORIGINS = new Set(['http://localhost:5173']); // an explicit allow-list, never "reflect any origin"

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true'); // needed for cookies; "*" is not allowed together with this
    res.set('Access-Control-Expose-Headers', 'ETag');    // lets page scripts read this response header
    res.vary('Origin');                                  // caches must keep one copy per origin
  }
  if (req.method === 'OPTIONS') { // the preflight: the browser asks permission before the real request
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '600'); // the browser may reuse this answer for 10 minutes
    return res.sendStatus(204);
  }
  next();
});

app.get('/api/profile', (req, res) => res.json({ name: 'Asha' }));
app.listen(3002, () => console.log('API with CORS on http://localhost:3002'));
