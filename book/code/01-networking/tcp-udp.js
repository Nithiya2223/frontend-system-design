// tcp-udp.js: the same "ping" over TCP (connection, byte stream) and UDP (datagram).
// Run: node tcp-udp.js
const net = require('net');
const dgram = require('dgram');

// TCP: connect first (three-way handshake), then exchange an ordered, reliable stream.
const tcpServer = net.createServer((socket) => {
  socket.on('data', (d) => {
    console.log('TCP server got:', d.toString());
    socket.end('pong over TCP');
  });
});
tcpServer.listen(0, '127.0.0.1', () => {
  const { port } = tcpServer.address();
  const tcpClient = net.connect(port, '127.0.0.1', () => tcpClient.write('ping'));
  tcpClient.on('data', (d) => {
    console.log('TCP client got:', d.toString(), `(client port ${tcpClient.localPort} -> server port ${port})`);
    tcpServer.close();
    udpDemo();
  });
});

// UDP: no connection and no delivery guarantee. Each send() is one independent datagram.
function udpDemo() {
  const udpServer = dgram.createSocket('udp4');
  const udpClient = dgram.createSocket('udp4');
  udpServer.on('message', (msg, rinfo) => {
    console.log('UDP server got:', msg.toString(), `from client port ${rinfo.port}`);
    udpServer.close();
    udpClient.close();
  });
  udpServer.bind(0, '127.0.0.1', () => udpClient.send('ping', udpServer.address().port, '127.0.0.1'));
}
