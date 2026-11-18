// polling.js: short polling vs long polling against a tiny local server.
// Run: node polling.js
const http = require('http');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- server: "version" changes every 1.5 s -------------------------------------------------
let version = 0;
const waiting = []; // long-poll requests parked until the next change
const ticker = setInterval(() => {
  version += 1;
  waiting.splice(0).forEach((res) => res.end(JSON.stringify({ version })));
}, 1500);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/short') return res.end(JSON.stringify({ version })); // answer immediately
  if (Number(url.searchParams.get('since')) < version) return res.end(JSON.stringify({ version }));
  waiting.push(res); // long poll: hold the connection open
  setTimeout(() => {
    if (waiting.includes(res)) { waiting.splice(waiting.indexOf(res), 1); res.statusCode = 204; res.end(); }
  }, 5000); // give up after 5 s so proxies do not kill the request
});

// --- clients -------------------------------------------------------------------------------
async function shortPoll(base, times) {
  for (let i = 0; i < times; i += 1) {
    const { version: v } = await (await fetch(`${base}/short`)).json();
    console.log(`short poll #${i + 1}: version ${v}`);
    await sleep(1000); // fixed interval: most answers are "nothing new"
  }
}

async function longPoll(base, updates) {
  let since = version;
  for (let got = 0; got < updates; ) {
    const res = await fetch(`${base}/long?since=${since}`); // waits until something changes
    if (res.status === 204) continue; // timed out with no news: ask again immediately
    since = (await res.json()).version;
    got += 1;
    console.log(`long poll update: version ${since}`);
  }
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  await shortPoll(base, 4);
  await longPoll(base, 2);
  clearInterval(ticker);
  server.closeAllConnections();
  server.close();
});
