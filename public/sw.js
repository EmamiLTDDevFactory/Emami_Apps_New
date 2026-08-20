// Minimal service worker whose only job is to make the hub installable as a
// PWA (Chromium's install heuristics require a registered SW with a fetch
// handler). It intentionally does no caching — every request still goes
// straight to the network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {});
