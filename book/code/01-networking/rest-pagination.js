// rest-pagination.js: cursor-based pagination, fetched page by page.
// Run: node rest-pagination.js
const http = require('http');
const ITEMS = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, title: `Post ${i + 1}` }));

// Server: the cursor is "the id of the last item you saw", so inserts do not shift pages.
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const after = Number(url.searchParams.get('cursor') || 0);
  const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50); // cap the page size
  const data = ITEMS.filter((p) => p.id > after).slice(0, limit);
  const nextCursor = data.length === limit ? data[data.length - 1].id : null;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ data, nextCursor }));
});

// Client: follow nextCursor until it is null.
async function fetchAll(base) {
  const all = [];
  let cursor = null;
  do {
    const url = `${base}/posts?limit=10${cursor ? `&cursor=${cursor}` : ''}`;
    const page = await (await fetch(url)).json();
    all.push(...page.data);
    cursor = page.nextCursor;
    console.log(`fetched ${page.data.length} items, nextCursor = ${cursor}`);
  } while (cursor);
  return all;
}

server.listen(0, '127.0.0.1', async () => {
  const all = await fetchAll(`http://127.0.0.1:${server.address().port}`);
  console.log('total items:', all.length);
  server.close();
});
