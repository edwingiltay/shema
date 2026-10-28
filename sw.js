// Service worker voor Shema op een eigen adres (GitHub Pages, 28 okt 2026): de app opent ook zonder verbinding.
// Alle paden relatief, zodat het werkt in /shema/ en op een eigen domein. Pagina eerst van het net, anders uit de cache;
// lettertypen van Google uit de cache, op de achtergrond ververst.
const CACHE = 'shema-1';
const VAST = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
const BASIS = self.registration.scope;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(VAST)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shema-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(oud => {
      const nieuw = fetch(r).then(a => { c.put(r, a.clone()); return a; }).catch(() => oud);
      return oud || nieuw;
    })));
    return;
  }
  if (!u.href.startsWith(BASIS)) return;
  // de pagina zelf heet 'index.html' in de cache, of ze nu als …/shema/ of als …/shema/index.html wordt opgevraagd
  const pagina = u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
  const sleutel = pagina ? 'index.html' : r;
  e.respondWith(fetch(r).then(a => {
    if (a.ok) { const k = a.clone(); caches.open(CACHE).then(c => c.put(sleutel, k)); }
    return a;
  }).catch(() => caches.match(sleutel, {ignoreSearch: true})));
});
