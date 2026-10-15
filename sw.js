// Service Worker: hält die App offline verfügbar und ermöglicht Updates per Hinweisbalken.
// WICHTIG: Bei jeder neuen Version die Nummer in CACHE erhöhen, sonst wird kein Update erkannt.
const CACHE = 'antrainieren-v9';
const FILES = ['./', 'index.html', 'anleitung.html', 'app.css', 'app.js', 'daten.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

// Neue Version herunterladen (am Browser-Zwischenspeicher vorbei), aber noch nicht aktivieren
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

// Aktivieren erst, wenn in der App auf „Jetzt aktualisieren“ getippt wurde
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Erst aus dem Speicher der installierten Version, sonst aus dem Netz
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => c.match('index.html'))))
  );
});
