// raw-http.js: HTTP is just text over a TCP socket. Print one real request and response.
// Run: node raw-http.js
const net = require('net');
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ id: 42, name: 'Asha' }));
});

server.listen(0, '127.0.0.1', () => {
  const socket = net.connect(server.address().port, '127.0.0.1');
  // Start line, headers, blank line. That is the whole request.
  socket.write('GET /users/42 HTTP/1.1\r\nHost: localhost\r\nAccept: application/json\r\nConnection: close\r\n\r\n');
  let raw = '';
  socket.on('data', (chunk) => (raw += chunk));
  socket.on('end', () => {
    console.log(raw);
    server.close();
  });
});
