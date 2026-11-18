// perf-timing.js (browser): paste into the DevTools console on any page.
// Shows where the time went for the page load, one row per phase.
const [nav] = performance.getEntriesByType('navigation');
console.table({
  'DNS lookup (ms)': nav.domainLookupEnd - nav.domainLookupStart,
  'TCP + TLS connect (ms)': nav.connectEnd - nav.connectStart,
  'of which TLS (ms)': nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
  'Waiting for server (ms)': nav.responseStart - nav.requestStart, // time to first byte after the request is sent
  'Download (ms)': nav.responseEnd - nav.responseStart,
  'Protocol': nav.nextHopProtocol, // 'http/1.1', 'h2' (HTTP/2) or 'h3' (HTTP/3)
});
// A zero for DNS or connect means a cached lookup or a reused connection (keep-alive).
