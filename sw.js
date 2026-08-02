// Cachea el "shell" de las 3 pantallas (launcher, Gastos, Peso) para que
// abran sin internet. Los datos NUNCA pasan por aquí (van directo al Web
// App de Apps Script vía shared/api.js) -- esto es solo para que la PÁGINA
// cargue sin señal.

// CACHE (con número de versión) es el "shell" -- html/css/js, cambia cada
// vez que se sube algo, así que se vuelve a bajar completo cada vez, a
// propósito. CACHE_ASSETS NO lleva número de versión y NUNCA se borra en
// activate -- fotos y videos rara vez cambian, así que si ya están ahí de
// una versión anterior, NO se vuelven a descargar (ver precachearAssets).
// Antes todo vivía junto en CACHE: cada versión nueva volvía a bajar los
// videos completos aunque no hubieran cambiado -- eso era la parte lenta.
const CACHE = 'mis-apps-v21';
const CACHE_ASSETS = 'mis-apps-assets';

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
];

const ARCHIVOS_ASSETS = [
  './peso/assets/rasengan.mp4',
  './peso/assets/registro.mp4',
  './peso/assets/meta1.png',
  './peso/assets/meta2.png',
  './peso/assets/meta3.png',
  './peso/assets/meta4.png',
];

async function precachearAssets() {
  const cache = await caches.open(CACHE_ASSETS);
  for (const url of ARCHIVOS_ASSETS) {
    const yaEsta = await cache.match(url);
    if (!yaEsta) await cache.add(url); // solo se baja si de verdad falta
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)), precachearAssets()]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE && k !== CACHE_ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
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
