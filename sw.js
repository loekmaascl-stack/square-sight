// Keeps Square Sight fast and working offline.
// Opens instantly from the copy saved on the phone, and fetches any update quietly in the background.
// Bump VERSION when the app changes.
const VERSION = "square-sight-v3";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const own = url.origin === location.origin;
  const fonts = url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com");
  if (!own && !fonts) return;

  e.respondWith(caches.open(VERSION).then(cache =>
    cache.match(e.request, { ignoreSearch: own }).then(saved => {
      const fresh = fetch(e.request).then(res => {
        if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      if (saved){
        if (own) e.waitUntil(fresh);  // update in the background for next time
        return saved;
      }
      return fresh.then(res => res || (own ? cache.match("index.html") : Response.error()));
    })
  ));
});
