// dedupe-debounce.js: share identical in-flight requests, and debounce input-driven calls.
// Run: node dedupe-debounce.js
const http = require('http');
let hits = 0;
const server = http.createServer((req, res) => { hits += 1; setTimeout(() => res.end(JSON.stringify({ hits })), 100); });

// Deduplication: three callers asking for the same URL share ONE network request.
const inflight = new Map();
function dedupedGet(url) {
  if (!inflight.has(url)) {
    inflight.set(url, fetch(url).then((r) => r.json()).finally(() => inflight.delete(url)));
  }
  return inflight.get(url); // the same promise for every caller
}

// Debounce: run only after calls stop for `ms`.
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

server.listen(0, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${server.address().port}/data`;
  await Promise.all([dedupedGet(url), dedupedGet(url), dedupedGet(url)]);
  console.log('3 callers, server hits:', hits); // 1

  const search = debounce((q) => dedupedGet(`${url}?q=${q}`).then(() => console.log('search sent for:', q, '| server hits:', hits)), 150);
  ['r', 're', 'rea', 'reac', 'react'].forEach((q) => search(q)); // 5 keystrokes, 1 request
  setTimeout(() => server.close(), 600);
});
