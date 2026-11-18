# Chapter 1 code: Networking

Node 18.2 or newer. Run from this folder.

## No installation needed (Node built-ins only)

Each script starts its own local server, so none of them need the internet.

| File | Run | What it shows |
| --- | --- | --- |
| `latency-math.js` | `node latency-math.js` | Round trips vs bandwidth |
| `encapsulation.js` | `node encapsulation.js` | Wrapping and unwrapping through the layers |
| `tcp-udp.js` | `node tcp-udp.js` | The same message over TCP and UDP sockets |
| `dns-lookup.js` | `node dns-lookup.js` | An OS resolver lookup (use your own domain when online) |
| `raw-http.js` | `node raw-http.js` | A raw HTTP request and response over a socket |
| `fetch-timeout.js` | `node fetch-timeout.js` | Timeout and cancellation with `AbortController` |
| `url-parse.js` | `node url-parse.js` | The parts of a URL |
| `tcp-connect-time.js` | `node tcp-connect-time.js [host port]` | Time for a TCP handshake |
| `compression-demo.js` | `node compression-demo.js` | gzip vs Brotli sizes |
| `dedupe-debounce.js` | `node dedupe-debounce.js` | Request deduplication and debounce |
| `api-client.js` | `node api-client.js` | A Facade/Adapter API client with timeout and retry |
| `bff.js` | `node bff.js` | A Backend-for-Frontend merging two services |
| `retry-backoff.js` | `node retry-backoff.js` | Retry with exponential backoff and jitter |
| `polling.js` | `node polling.js` | Short polling and long polling |
| `rest-pagination.js` | `node rest-pagination.js` | Cursor pagination |
| `rest-idempotency.js` | `node rest-idempotency.js` | POST vs PUT vs `Idempotency-Key` |
| `graphql-query.js` | `node graphql-query.js` | A GraphQL request with variables (mock server) |

`schema.graphql` and `chat.proto` are contract files, not runnable programs.

## Needs `npm install` (Express and ws)

```bash
npm install
node sse-server.js            # then open http://localhost:3000/demo.html and watch the console
node ws-server.js             # in a second terminal; demo.html connects to ws://localhost:8080
node express-cache.js         # ETag and Cache-Control, API on http://localhost:3001
node express-cors.js          # CORS and preflight, API on http://localhost:3002
```

- `sse-client.js` and `ws-client.js` run in the browser, loaded by `demo.html`.
- Test CORS by calling `http://localhost:3002/api/profile` from a page served on `http://localhost:5173`.
- `perf-timing.js` is for the browser console, not Node.
- gRPC: `chat.proto` is only a contract. To generate a client, use the tooling of your gRPC library, for example `protoc` or `@grpc/proto-loader`. Browsers need gRPC-Web through a proxy (see the chapter).
