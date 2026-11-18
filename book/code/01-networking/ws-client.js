// ws-client.js (browser): one shared WebSocket with heartbeat and reconnect (exponential backoff + jitter).
class ReconnectingSocket {
  constructor(url) {
    this.url = url;
    this.attempt = 0;
    this.listeners = new Set(); // Observer: components subscribe, the socket publishes
    this.connect();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  send(obj) { if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj)); }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => { this.attempt = 0; this.startHeartbeat(); };
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'pong') return clearTimeout(this.pongTimer); // the server is alive
      this.listeners.forEach((fn) => fn(msg));
    };
    this.ws.onclose = () => { this.stopHeartbeat(); this.scheduleReconnect(); };
  }
  startHeartbeat() {
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
      this.pongTimer = setTimeout(() => this.ws.close(), 5000); // no pong in 5 s: treat as dead
    }, 20000);
  }
  stopHeartbeat() { clearInterval(this.pingTimer); clearTimeout(this.pongTimer); }
  scheduleReconnect() {
    const delay = Math.random() * Math.min(30000, 500 * 2 ** this.attempt); // full jitter, 30 s cap
    this.attempt += 1;
    console.log(`socket closed, reconnecting in ${Math.round(delay)} ms`);
    setTimeout(() => this.connect(), delay);
  }
}

// Singleton: the whole app shares one connection instead of opening one per component.
const socket = new ReconnectingSocket('ws://localhost:8080');
socket.subscribe((msg) => console.log('message', msg));
