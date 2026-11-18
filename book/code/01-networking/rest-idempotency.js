// rest-idempotency.js: PUT is idempotent, POST is not (unless you add an Idempotency-Key).
// Run: node rest-idempotency.js
const http = require('http');
const orders = new Map(); // id -> order
const seenKeys = new Map(); // Idempotency-Key -> created order
let nextId = 1;

const server = http.createServer((req, res) => {
  const key = req.headers['idempotency-key'];
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  if (req.method === 'POST' && req.url === '/orders') { // create: server picks the id
    if (key && seenKeys.has(key)) return send(200, seenKeys.get(key)); // replay of the same request
    const order = { id: nextId++, item: 'book' };
    orders.set(order.id, order);
    if (key) seenKeys.set(key, order);
    return send(201, order);
  }
  if (req.method === 'PUT' && req.url === '/orders/100') { // replace: client picks the id, same result every time
    orders.set(100, { id: 100, item: 'book' });
    return send(200, orders.get(100));
  }
  send(404, {});
});

const call = (base, method, path, headers = {}) => fetch(base + path, { method, headers }).then((r) => r.status);

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  await call(base, 'POST', '/orders'); await call(base, 'POST', '/orders');
  console.log('POST twice            -> orders:', orders.size, '(a duplicate)');
  orders.clear(); seenKeys.clear();
  await call(base, 'PUT', '/orders/100'); await call(base, 'PUT', '/orders/100');
  console.log('PUT twice             -> orders:', orders.size);
  orders.clear();
  await call(base, 'POST', '/orders', { 'Idempotency-Key': 'abc-1' }); await call(base, 'POST', '/orders', { 'Idempotency-Key': 'abc-1' });
  console.log('POST + same key twice -> orders:', orders.size);
  server.close();
});
