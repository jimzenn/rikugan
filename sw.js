'use strict';

// Bump the version only when the file list changes; edits to these files are picked up anyway.
const SCOPE = self.registration.scope;
const CACHE = SCOPE + ':v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'trip.json'];
const NETWORK_TIMEOUT_MS = 4000; // weak signal: stop waiting and show the cached copy

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Only touch our own caches: other GitHub Pages sites of the same user share this origin.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(SCOPE) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  const isData = new URL(req.url).pathname.endsWith('/trip.json');
  event.respondWith(isData ? networkFirst(event) : staleWhileRevalidate(event));
});

// trip.json: try the network so edits show up, fall back to the last good copy.
async function networkFirst(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const fresh = fetch(req.url, { cache: 'no-cache' }).then(async res => {
    if (res.ok) {
      try {
        JSON.parse(await res.clone().text()); // never replace a good copy with a broken edit
        await cache.put(req, res.clone());
      } catch { /* keep the old copy */ }
    }
    return res;
  });
  event.waitUntil(fresh.catch(() => {}));
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  const res = await Promise.race([fresh, timeout]).catch(() => null);
  return res || (await cache.match(req, { ignoreSearch: true })) || fresh;
}

// Page, CSS, JS: answer from cache instantly, refresh the cache in the background.
async function staleWhileRevalidate(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });
  const fresh = fetch(req.url, { cache: 'no-cache' }).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  event.waitUntil(fresh.catch(() => {}));
  return cached || fresh;
}
