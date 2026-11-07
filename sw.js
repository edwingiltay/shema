// Service worker voor Shema op een eigen adres (GitHub Pages, 28 okt 2026): de app opent ook zonder verbinding.
// Alle paden relatief, zodat het werkt in /shema/ en op een eigen domein.
// Sinds 7 nov 2026 (verbeterideeën punt 4): bij een haperende verbinding niet blijven wachten. De pagina komt van het net als dat
// binnen 3 seconden lukt, anders uit de cache (het net ververst de cache daarna alsnog). Opnames en vertaalde kaarten dragen een
// versie in hun adres (?v=…, maak_site.py): die komen eerst uit de cache en worden alleen opgehaald als de versie nieuw is.
// Lettertypen van Google uit de cache, op de achtergrond ververst.
const CACHE = 'shema-3';
const VAST = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
const BASIS = self.registration.scope;
const WACHT = 3000;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(VAST)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shema-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// opnames en kaarten met een versie: uit de cache; nieuw opgehaald alleen bij een nieuwe versie, en dan de oude versie weg
function metVersie(e, r, u) {
  e.respondWith(caches.open(CACHE).then(c => c.match(r).then(oud => oud || fetch(r).then(a => {
    if (a.ok) {
      const k = a.clone();
      e.waitUntil(c.keys().then(ks => Promise.all(ks.filter(x => { const y = new URL(x.url); return y.pathname === u.pathname && y.search !== u.search; }).map(x => c.delete(x))))
        .then(() => c.put(r, k)));
    }
    return a;
  }))));
}
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
  if (u.searchParams.has('v') && /\/(klank|talen)\/[^/]+\.json$/.test(u.pathname)) return metVersie(e, r, u);
  // de pagina zelf heet 'index.html' in de cache, of ze nu als …/shema/ of als …/shema/index.html wordt opgevraagd
  const pagina = u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
  const sleutel = pagina ? 'index.html' : r;
  // no-cache: altijd bij de server navragen (met ETag, dus goedkoop), anders geeft de browsercache tot 10 minuten de oude versie (28 okt 2026)
  const net = fetch(r, {cache: 'no-cache'}).then(a => {
    if (a.ok) { const k = a.clone(); return caches.open(CACHE).then(c => c.put(sleutel, k)).then(() => a, () => a); }
    return a;
  });
  e.waitUntil(net.catch(() => {}));   // ook als de cache al geantwoord heeft: het net mag de cache nog verversen
  e.respondWith(caches.match(sleutel, {ignoreSearch: true}).then(oud => {
    if (!oud) return net;
    let klok;
    const wacht = new Promise(res => { klok = setTimeout(() => res(oud), WACHT); });
    return Promise.race([net.then(a => a.ok ? a : oud, () => oud), wacht]).finally(() => clearTimeout(klok));
  }));
});
