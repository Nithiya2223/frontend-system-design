// dns-lookup.js: ask the operating system's resolver (and its caches) for an address.
// Run: node dns-lookup.js        (works offline for "localhost"; try your own domain online)
const dns = require('dns').promises;

(async () => {
  console.log('Resolvers in use:', require('dns').getServers());
  const t0 = process.hrtime.bigint();
  const records = await dns.lookup('localhost', { all: true });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log('localhost ->', records.map((r) => `${r.address} (IPv${r.family})`).join(', '), `in ${ms.toFixed(2)} ms`);
})();
