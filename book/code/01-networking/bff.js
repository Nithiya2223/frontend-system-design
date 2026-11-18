// bff.js: a Backend-for-Frontend that merges two internal services into one response for one screen.
// Run: node bff.js
const http = require('http');

const json = (res, data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
const start = (handler) => new Promise((ok) => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => ok(s)); });
const getJson = async (s, path) => (await fetch(`http://127.0.0.1:${s.address().port}${path}`)).json();

(async () => {
  // Two internal services with big, general-purpose payloads.
  const users = await start((req, res) => json(res, { id: 1, name: 'Asha', email: 'a@x.dev', address: '...', prefs: {} }));
  const feed = await start((req, res) => json(res, { items: [{ id: 1, title: 'Hello', body: '...' }, { id: 2, title: 'World', body: '...' }] }));

  // The BFF: one call from the browser, parallel calls inside, and only the fields this screen needs.
  const bff = await start(async (req, res) => {
    const [me, top] = await Promise.all([getJson(users, '/me'), getJson(feed, '/top')]);
    json(res, { name: me.name, headlines: top.items.map((i) => i.title) });
  });

  console.log('browser gets:', JSON.stringify(await getJson(bff, '/bff/home')));
  [users, feed, bff].forEach((s) => s.close());
})();
