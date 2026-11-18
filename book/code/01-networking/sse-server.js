// sse-server.js: Server-Sent Events with Express.
// Run: npm install && node sse-server.js   then open http://localhost:3000/demo.html
const express = require('express');
const app = express();
const clients = new Set(); // Observer / Pub-Sub: every open response is a subscriber
let id = 0;

app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n'); // tell the browser how long to wait before reconnecting
  // After a reconnect the browser sends Last-Event-ID, so the server could replay what was missed.
  console.log('client connected, Last-Event-ID =', req.get('Last-Event-ID') || 'none');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

setInterval(() => { // publish an event to every subscriber
  id += 1;
  for (const res of clients) res.write(`id: ${id}\nevent: tick\ndata: ${JSON.stringify({ id, at: Date.now() })}\n\n`);
}, 2000);
setInterval(() => { for (const res of clients) res.write(': heartbeat\n\n'); }, 15000); // comment line keeps proxies awake

app.use(express.static(__dirname)); // serves demo.html and the client scripts
app.listen(3000, () => console.log('SSE on http://localhost:3000'));
