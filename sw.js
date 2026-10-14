// Service worker de Albardón: permite abrir la app sin conexión.
// - Archivos propios (index.html, logo...): primero la red, y si no hay conexión, la copia guardada.
// - Librerías externas (Tailwind, Firebase, iconos...): copia guardada y actualización en segundo plano.
// - Firestore / Auth: no se tocan (Firebase maneja su propio modo sin conexión).
const CACHE = 'albardon-v1';
const BASE = ['./', './index.html', './logo.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (!/^https?:$/.test(url.protocol)) return;
    if (/googleapis\.com$|firebaseio\.com$|firebaseinstallations/.test(url.hostname)) return;

    const guardar = r => {
        if (r && (r.ok || r.type === 'opaque')) {
            const copia = r.clone();
            caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        }
        return r;
    };

    if (url.origin === self.location.origin) {
        e.respondWith(
            fetch(req).then(guardar).catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
        );
    } else {
        e.respondWith(
            caches.match(req).then(m => {
                const red = fetch(req).then(guardar).catch(() => m);
                return m || red;
            })
        );
    }
});
