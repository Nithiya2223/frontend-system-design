// compression-demo.js: why servers send Content-Encoding: gzip or br for text.
// Run: node compression-demo.js
const zlib = require('zlib');
const json = JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ id: i, name: `User ${i}`, active: i % 2 === 0 })));
const raw = Buffer.byteLength(json);
const gzip = zlib.gzipSync(json).length;
const brotli = zlib.brotliCompressSync(json).length;
console.log(`raw ${raw} B | gzip ${gzip} B (${((gzip / raw) * 100).toFixed(0)}%) | brotli ${brotli} B (${((brotli / raw) * 100).toFixed(0)}%)`);
// Repetitive text shrinks a lot. Already-compressed files (JPEG, MP4, WOFF2) do not, so skip them.
