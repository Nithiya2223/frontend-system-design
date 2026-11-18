// ws-server.js: a minimal chat fan-out with the "ws" library.
// Run: npm install && node ws-server.js
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080 });
let seq = 0;

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; }); // reply to the protocol-level ping below
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'ping') return ws.send(JSON.stringify({ type: 'pong' })); // app-level heartbeat from browsers
    seq += 1; // server-assigned order lets clients detect gaps after a reconnect
    const out = JSON.stringify({ type: 'chat', seq, text: String(msg.text).slice(0, 500) });
    for (const client of wss.clients) if (client.readyState === 1) client.send(out); // fan-out to everyone
  });
});

// Drop connections that stopped answering (half-open TCP connections are common on mobile networks).
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
console.log('WebSocket server on ws://localhost:8080');
