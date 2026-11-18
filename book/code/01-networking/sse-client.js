// sse-client.js (browser): EventSource reconnects by itself and sends Last-Event-ID.
const source = new EventSource('/events');

source.addEventListener('tick', (event) => {
  const { id, at } = JSON.parse(event.data);
  console.log(`tick ${id} at ${new Date(at).toLocaleTimeString()} (lastEventId=${event.lastEventId})`);
});
source.onopen = () => console.log('SSE connected');
source.onerror = () => console.log('SSE dropped, the browser will retry automatically');
// source.close() stops it for good, for example when the component unmounts.
