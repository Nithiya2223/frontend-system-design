# Sources

Facts were checked against the sources below. Text, code and diagrams are original. Sources are listed for verification, not copied.

## Chapter 1: Networking

| Claim in the chapter | Source | Status |
| --- | --- | --- |
| Chromium caps `Access-Control-Max-Age` at 2 hours (since v76); Firefox at 24 hours | MDN, "Access-Control-Max-Age" (developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age) | Seen in search results on 2026-11-18. The page itself could not be fetched (HTTP 403). |
| gRPC-Web supports unary and server-streaming calls; client and bidirectional streaming are not supported in browsers | grpc.io blog "Can gRPC replace REST and WebSockets..." (grpc.io/blog/postman-grpcweb) and the grpc-web README (github.com/grpc/grpc-web) | Seen in search results. Pages not fetched. |
| Browsers allow about 6 SSE/HTTP/1.1 connections per domain; HTTP/2 negotiates streams (default 100) | MDN, "EventSource" (developer.mozilla.org/en-US/docs/Web/API/EventSource) | Seen in search results. Page not fetched. |
| gRPC final status travels in HTTP/2 trailers, which browser APIs do not expose | Search results citing the gRPC-Web protocol (kreya.app, oneuptime.com) | Secondary sources. VERIFY against the gRPC protocol spec (github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md). |
| HTTP semantics, caching, HTTP/3, QUIC, WebSocket definitions | RFC 9110, RFC 9111, RFC 9114, RFC 9000, RFC 6455 (rfc-editor.org) | Written from established knowledge. Links not fetched (HTTP 403). VERIFY section numbers before quoting. |
| TLS 1.3 handshake takes 1 RTT after TCP; TLS 1.2 takes 2 | RFC 8446 (TLS 1.3) | From established knowledge. Not re-checked online. |
| GraphQL operation types, N+1 and DataLoader batching | graphql.org/learn | From established knowledge. Not re-checked online. |

## Items marked VERIFY in the chapter text
- Header names that CDNs add (`x-cache`, `cf-cache-status`) differ per provider.
- Streaming request bodies with `fetch` have partial browser support.
- Whether to recommend browser-friendly alternatives to gRPC-Web (for example the Connect protocol) depends on current support.
- The 6-connection limit per host is browser-specific and may change.

## Code verification (2026-11-18, Node 22, sandbox without network)
- Executed successfully: latency-math, encapsulation, tcp-udp, dns-lookup, raw-http, fetch-timeout, retry-backoff, polling, rest-pagination, rest-idempotency, graphql-query, url-parse, tcp-connect-time, compression-demo, dedupe-debounce, api-client, bff.
- Syntax-checked only (need `npm install` for express or ws, or run in a browser): sse-server, sse-client, ws-server, ws-client, express-cache, express-cors, perf-timing.
