// express-cache.js: HTTP caching headers with Express (ETag revalidation and immutable assets).
// Run: npm install && node express-cache.js
const express = require('express');
const crypto = require('crypto');
const app = express();

// Revalidation: the browser may keep a copy but must ask before reusing it.
app.get('/api/profile', (req, res) => {
  const body = JSON.stringify({ name: 'Asha' });
  const etag = `"${crypto.createHash('sha1').update(body).digest('hex')}"`; // fingerprint of the content
  res.set('Cache-Control', 'private, max-age=0, must-revalidate'); // private: only the user's browser may store it
  res.set('ETag', etag);
  if (req.get('If-None-Match') === etag) return res.sendStatus(304); // unchanged: send headers only, no body
  res.type('json').send(body);
});

// Fingerprinted files (app.3f9a1c.js) never change under the same name, so cache them for a year.
app.get('/assets/app.:hash.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type('js').send('/* demo asset */');
});

app.listen(3001, () => console.log('API on http://localhost:3001'));
