// latency-math.js: why round trips often matter more than bandwidth.
// Run: node latency-math.js
function loadTimeMs({ rttMs, roundTrips, bytes, mbps }) {
  const transferMs = (bytes * 8) / (mbps * 1000); // bits divided by bits-per-millisecond
  return rttMs * roundTrips + transferMs;
}

const page = { bytes: 200 * 1024, roundTrips: 4 }; // DNS + TCP + TLS 1.3 + request (simplified)
console.log('Fast fibre (RTT 10 ms, 100 Mbps):', loadTimeMs({ ...page, rttMs: 10, mbps: 100 }).toFixed(0), 'ms');
console.log('Mobile 4G  (RTT 100 ms, 20 Mbps):', loadTimeMs({ ...page, rttMs: 100, mbps: 20 }).toFixed(0), 'ms');
console.log('Mobile, 5x bandwidth (100 Mbps):', loadTimeMs({ ...page, rttMs: 100, mbps: 100 }).toFixed(0), 'ms');
// 5x the bandwidth only makes it about 14% faster: 400 ms of round trips dominates. Fewer round trips beat more bandwidth.
