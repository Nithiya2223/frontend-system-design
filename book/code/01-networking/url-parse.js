// url-parse.js: the parts of a URL, as the platform parses them.
// Run: node url-parse.js     (the same API exists in browsers)
const u = new URL('https://shop.example.com:8443/items/42?color=red&size=m#reviews');
console.log({
  scheme: u.protocol,                 // 'https:' decides the protocol (and the default port)
  host: u.hostname,                   // looked up with DNS
  port: u.port,                       // '' when it is the default (443 for https, 80 for http)
  path: u.pathname,                   // identifies the resource
  query: Object.fromEntries(u.searchParams), // key/value pairs
  fragment: u.hash,                   // handled by the browser only, never sent to the server
});
console.log('default https port:', new URL('https://shop.example.com/').port === '' ? '443 (implied)' : 'explicit');
