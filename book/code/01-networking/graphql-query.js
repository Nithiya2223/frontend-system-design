// graphql-query.js: a GraphQL request is one POST with a query string and a variables object.
// Run: node graphql-query.js      (a tiny mock server stands in for a real GraphQL server)
const http = require('http');

const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const { variables } = JSON.parse(body); // a real server would parse and validate the query here
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: { user: { name: 'Asha', posts: [{ title: `Post for user ${variables.id}` }] } } }));
  });
});

const QUERY = `
  query UserWithPosts($id: ID!, $first: Int) {
    user(id: $id) {            # ask for exactly the fields the screen needs
      name
      posts(first: $first) { title }
    }
  }`;

async function graphql(url, query, variables) {
  const res = await fetch(url, {
    method: 'POST', // always POST to ONE endpoint, so HTTP caching does not apply by default
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message); // GraphQL often returns 200 with an "errors" array
  return data;
}

mock.listen(0, '127.0.0.1', async () => {
  const data = await graphql(`http://127.0.0.1:${mock.address().port}/graphql`, QUERY, { id: '42', first: 1 });
  console.log(JSON.stringify(data));
  mock.close();
});
