// tcp-connect-time.js: measure how long the TCP handshake takes (one round trip).
// Run: node tcp-connect-time.js
// Change HOST/PORT to a remote server to feel a real round trip, for example ['example.com', 80] when online.
const net = require('net');
const HOST = process.argv[2] || '127.0.0.1';
let port = Number(process.argv[3]) || 0;

const server = net.createServer((s) => s.end());
function measure(host, p) {
  const start = process.hrtime.bigint();
  const socket = net.connect(p, host, () => { // fires after SYN, SYN-ACK, ACK
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`TCP connect to ${host}:${p} took ${ms.toFixed(2)} ms (about one round trip)`);
    socket.destroy();
    server.close();
  });
  socket.on('error', (e) => { console.log('connect failed:', e.message); server.close(); });
}
if (process.argv[2]) { measure(HOST, port || 80); server.close(); } else server.listen(0, '127.0.0.1', () => measure(HOST, server.address().port));
