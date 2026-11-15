// FrameLog service worker: caches static app files only.
// Never caches Supabase requests, the config file, or any HTML page (including login).
const CACHE = 'framelog-static-v1';
const STATIC = ['/style.css', '/app.js', '/manifest.webmanifest', '/offline.html',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-192.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return; // Supabase, CDN, fonts: untouched
  if (r.mode === 'navigate') { // pages always come from the network; only offline gets the generic page
    e.respondWith(fetch(r).catch(() => caches.match('/offline.html')));
    return;
  }
  if (!STATIC.includes(u.pathname)) return; // config.js and anything else: untouched
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r)));
});
