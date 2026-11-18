// api-client.js: a small API client layer (Facade + Adapter) that every component uses.
// Run: node api-client.js
const http = require('http');

// Facade: one place for base URL, auth, timeout, retry and error shape. Components never call fetch directly.
function createApiClient({ baseUrl, getToken, timeoutMs = 3000, retries = 2 }) {
  async function request(path, { method = 'GET', body } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(baseUrl + path, {
          method,
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status >= 500 && method === 'GET' && attempt < retries) continue; // retry only safe requests
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        return toViewModel(await res.json()); // Adapter: translate the wire format into what the UI wants
      } catch (err) {
        if (err.name === 'AbortError' && attempt < retries && method === 'GET') continue;
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return { get: (p) => request(p), post: (p, body) => request(p, { method: 'POST', body }) };
}
const toViewModel = (dto) => ({ id: dto.user_id, displayName: `${dto.first_name} ${dto.last_name}` }); // snake_case in, camelCase out

// Demo server: fails once with 503, then answers.
let calls = 0;
const server = http.createServer((req, res) => {
  calls += 1;
  if (calls === 1) { res.statusCode = 503; return res.end(); }
  res.end(JSON.stringify({ user_id: 7, first_name: 'Asha', last_name: 'Rao' }));
});
server.listen(0, '127.0.0.1', async () => {
  const api = createApiClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, getToken: () => 'demo-token' });
  console.log(await api.get('/users/7'), `(server saw ${calls} calls)`);
  server.close();
});
