/**
 * A service worker exists to demonstrate one thing here: it is another place
 * an identifier can hide. Registration and its cache survive clearing cookies.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("message", async (event) => {
  const { type, id } = event.data || {};
  const cache = await caches.open("dm-sw-id");
  if (type === "store" && id) {
    await cache.put("/__id", new Response(id));
    event.source.postMessage({ type: "stored", id });
  }
  if (type === "read") {
    const hit = await cache.match("/__id");
    event.source.postMessage({ type: "read", id: hit ? await hit.text() : null });
  }
});
