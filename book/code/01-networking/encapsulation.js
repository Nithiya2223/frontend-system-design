// encapsulation.js: each layer wraps the data from the layer above with its own header.
// Run: node encapsulation.js
const http = 'GET /users/42 HTTP/1.1\r\nHost: api.example.com\r\n\r\n';              // L7 data
const segment = { srcPort: 51724, dstPort: 443, seq: 1, payload: http };               // L4 segment
const packet = { srcIp: '192.168.1.20', dstIp: '203.0.113.10', ttl: 64, payload: segment }; // L3 packet
const frame = { srcMac: 'aa:bb:cc:00:00:01', dstMac: 'aa:bb:cc:00:00:99', payload: packet }; // L2 frame

// Receiving side: each layer strips its own header and hands the payload upward.
function decapsulate(f) {
  console.log('L2 data link : read MAC', f.dstMac, '-> mine, pass payload up');
  console.log('L3 network   : read IP ', f.payload.dstIp, '-> mine, pass payload up');
  console.log('L4 transport : read port', f.payload.payload.dstPort, '-> deliver to the process listening on it');
  console.log('L7 application:\n' + f.payload.payload.payload);
}
decapsulate(frame);
// With HTTPS, TLS encrypts the HTTP text before it becomes the TCP payload.
