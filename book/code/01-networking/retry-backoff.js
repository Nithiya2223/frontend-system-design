// retry-backoff.js: retry transient failures with exponential backoff and full jitter.
// Run: node retry-backoff.js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry network errors, 429 and 5xx. Never retry other 4xx: the request itself is wrong.
const isRetryable = (err) => err.status === undefined || err.status === 429 || err.status >= 500;

async function retry(fn, { retries = 4, baseMs = 200, capMs = 5000 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      // Respect the server's Retry-After if it sent one; otherwise wait a random time in [0, base * 2^attempt].
      const delay = err.retryAfterMs ?? Math.random() * Math.min(capMs, baseMs * 2 ** attempt);
      console.log(`attempt ${attempt + 1} failed (${err.message}); retrying in ${Math.round(delay)} ms`);
      await sleep(delay);
    }
  }
}

// Demo: a flaky call that fails twice with 503 and then succeeds.
retry(async (attempt) => {
  if (attempt < 2) throw Object.assign(new Error('503 Service Unavailable'), { status: 503 });
  return 'success on attempt ' + (attempt + 1);
}).then(console.log);
