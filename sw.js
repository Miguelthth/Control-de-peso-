// Cachea el "shell" de las 3 pantallas (launcher, Gastos, Peso) para que
// abran sin internet. Los datos NUNCA pasan por aquí (van directo al Web
// App de Apps Script vía shared/api.js) -- esto es solo para que la PÁGINA
// cargue sin señal.

// CACHE (con número de versión) es el "shell" -- html/css/js, cambia cada
// vez que se sube algo, así que se vuelve a bajar completo cada vez, a
// propósito. CACHE_ASSETS tiene su propia versión: fotos y videos rara vez
// cambian, pero al incrementarla se invalidan de forma explícita y activate
// elimina las versiones anteriores (ver precachearAssets).
// Antes todo vivía junto en CACHE: cada versión nueva volvía a bajar los
// videos completos aunque no hubieran cambiado -- eso era la parte lenta.
const CACHE = 'mis-apps-eb9b6009f6';
const CACHE_ASSETS = 'mis-apps-assets-v2';
const VERSION = 'eb9b6009f6';
const URL_METADATA = './__app_meta__.json';

const ARCHIVOS = [
  './index.html',
  './css/estilos.css',
  './shared/tema.css',
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

// cache.addAll() hace fetch() normal por dentro -- respeta la caché HTTP
// del navegador. Si el hosting sirve estos archivos con Cache-Control (p.
// ej. GitHub Pages, ~10 min), un install() disparado poco después de subir
// cambios puede terminar precacheando el JS/HTML VIEJO que el navegador ya
// tenía guardado, aunque el nombre de la caché (CACHE) sea nuevo -- el SW
// "detecta la actualización" y se activa, pero el contenido adentro sigue
// siendo el de antes. { cache: 'reload' } fuerza a saltarse la caché HTTP
// y pedir cada archivo del shell directo al servidor.
async function precachearShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(ARCHIVOS.map(async (url) => {
    const resp = await fetch(url, { cache: 'reload' });
    await cache.put(url, resp);
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([precachearShell(), precachearAssets()])
      .then(async () => {
        const cache = await caches.open(CACHE);
        await cache.put(URL_METADATA, new Response(JSON.stringify({
          version: 'eb9b6009f6', installedAt: new Date().toISOString(),
        }), { headers: { 'Content-Type': 'application/json' } }));
      })
      .then(() => self.skipWaiting())
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
