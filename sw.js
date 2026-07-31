// Cachea el "shell" de las 3 pantallas (launcher, Gastos, Peso) para que
// abran sin internet. Los datos NUNCA pasan por aquí (van directo al Web
// App de Apps Script vía shared/api.js) -- esto es solo para que la PÁGINA
// cargue sin señal.

const CACHE = 'mis-apps-v4';
const ARCHIVOS = [
  './index.html',
  './css/estilos.css',
  './js/app.js',
  './manifest.json',
  './icon-512.png',
  './gastos/index.html',
  './gastos/css/estilos.css',
  './gastos/js/app.js',
  './peso/index.html',
  './peso/css/estilos.css',
  './peso/js/app.js',
  './peso/assets/rasengan.mp4',
  './peso/assets/meta1.png',
  './peso/assets/meta2.png',
  './peso/assets/meta3.png',
  './peso/assets/meta4.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Nunca cachear llamadas al Web App de Apps Script -- siempre datos frescos.
  if (e.request.url.includes('script.google.com')) return;
  e.respondWith(
    caches.match(e.request).then((cacheado) => {
      const red = fetch(e.request)
        .then((resp) => {
          if (resp.ok) caches.open(CACHE).then((c) => c.put(e.request, resp.clone()));
          return resp;
        })
        .catch(() => cacheado);
      return cacheado || red;
    })
  );
});
