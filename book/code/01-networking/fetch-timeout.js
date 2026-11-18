// fetch-timeout.js: a timeout plus caller-controlled cancellation with AbortController.
// Run: node fetch-timeout.js     (Node 18.2 or newer)
const http = require('http');

async function fetchWithTimeout(url, { timeoutMs = 3000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs} ms`)), timeoutMs);
  // Also honour cancellation requested by the caller (for example a user navigating away).
  signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer); // always clean up, success or failure
  }
}

// A deliberately slow server: it answers after 2 seconds.
const server = http.createServer((req, res) => setTimeout(() => res.end('slow answer'), 2000));
server.listen(0, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    await fetchWithTimeout(url, { timeoutMs: 500 });
  } catch (err) {
    console.log('1. timed out as expected:', err.message);
  }
  const user = new AbortController();
  setTimeout(() => user.abort(new Error('user navigated away')), 200);
  try {
    await fetchWithTimeout(url, { timeoutMs: 5000, signal: user.signal });
  } catch (err) {
    console.log('2. cancelled by the caller:', err.message);
  }
  server.closeAllConnections();
  server.close();
});
