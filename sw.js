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
const CACHE = 'mis-apps-631d4a397c';
const PREFIJO = 'mis-apps-';
const CACHE_ASSETS = 'mis-apps-assets-v2';
const VERSION = '631d4a397c';
const URL_METADATA = './__app_meta__.json';

const CACHE_CONTROL = PREFIJO.replace(/-$/, '') + '@aceptada';
const CLAVE_ACEPTADA = './__version_aceptada__';
const esCacheDeVersion = k => k.startsWith(PREFIJO) && !k.startsWith(PREFIJO + 'assets-');
const codigoDe = nombre => String(nombre || '').slice(PREFIJO.length);
let aceptadaMemoria = null;
async function leerAceptada() {
  if (aceptadaMemoria !== null) return aceptadaMemoria;
  try {
    const r = await (await caches.open(CACHE_CONTROL)).match(CLAVE_ACEPTADA);
    aceptadaMemoria = r ? await r.text() : '';
  } catch (_) { aceptadaMemoria = ''; }
  return aceptadaMemoria;
}
async function guardarAceptada(nombre) {
  await (await caches.open(CACHE_CONTROL)).put(CLAVE_ACEPTADA, new Response(nombre));
  aceptadaMemoria = nombre;
}
// Se sirve la aceptada mientras exista; si no hay (primera vez) o el navegador la borró
// por falta de espacio, la de esta versión.
async function cacheServida() {
  const aceptada = await leerAceptada();
  return aceptada && aceptada !== CACHE && await caches.has(aceptada) ? aceptada : CACHE;
}
const abrirServida = () => cacheServida().then(nombre => caches.open(nombre));


const ARCHIVOS = [
  './index.html',
  './version.js',
  './css/estilos.css',
  './shared/tema.css',
  './shared/perro-actualizacion.png',
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
    if (!resp.ok) throw new Error('Shell incompleto: ' + url);
    await cache.put(url, resp);
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([precachearShell(), precachearAssets()])
      .then(async () => {
        const cache = await caches.open(CACHE);
        await cache.put(URL_METADATA, new Response(JSON.stringify({
          version: '631d4a397c', installedAt: new Date().toISOString(),
        }), { headers: { 'Content-Type': 'application/json' } }));
      })
      .then(async () => {
        // Migración desde la app que se actualizaba sola: aceptar esta primera
        // versión permite que llegue el nuevo botón. Las siguientes esperan clic.
        if (!(await leerAceptada())) await guardarAceptada(CACHE);
        await self.skipWaiting();
      })
  );
});

async function limpiarCachesAnteriores() {
  const aceptada = await leerAceptada();
  const claves = await caches.keys();
  await Promise.all(claves.filter((k) =>
    k.startsWith(PREFIJO) && k !== CACHE && k !== aceptada && k !== CACHE_ASSETS
  ).map((k) => caches.delete(k)));
}

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await limpiarCachesAnteriores();
    await self.clients.claim();
    (await self.clients.matchAll({ type: 'window' })).forEach((c) => c.postMessage({ type: 'VERSION_LISTA' }));
  })());
});

self.addEventListener('message', (e) => {
  const tipo = e.data?.type;
  const responder = (datos) => e.ports?.[0]?.postMessage(datos);
  if (tipo === 'ESTADO') e.waitUntil(cacheServida().then((n) => responder({ aceptada: codigoDe(n), lista: VERSION })));
  if (tipo === 'ACEPTAR') e.waitUntil(guardarAceptada(CACHE).then(() => responder({ ok: true, lista: VERSION })));
  if (tipo === 'ACTIVAR_ACTUALIZACION') self.skipWaiting();
  if (tipo === 'CONFIRMAR_ARRANQUE') e.waitUntil(limpiarCachesAnteriores());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Solo archivos de esta app. El servidor y release.json siempre usan la red.
  if (!url.href.startsWith(self.registration.scope) || url.pathname.endsWith('/release.json')) return;
  e.respondWith((async () => {
    // HTML y JS salen de la MISMA versión aceptada, incluso al volver a abrir.
    const ruta = url.pathname.endsWith('/') ? new URL('index.html', url).href : e.request;
    const cache = await abrirServida();
    const shell = await cache.match(ruta, { ignoreSearch: true });
    if (shell) {
      // Al aceptar una versión, Chromium puede reutilizar scripts de memoria sin
      // disparar fetch. El shell sigue offline en CacheStorage; no-store obliga
      // al navegador a consultar al worker para usar la versión aceptada.
      const headers = new Headers(shell.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(shell.body, { status: shell.status, statusText: shell.statusText, headers });
    }
    const assets = await caches.open(CACHE_ASSETS);
    const asset = await assets.match(ruta);
    if (asset) return asset;
    const respuesta = await fetch(e.request);
    if (respuesta.ok && /\/peso\/(assets|imagenes|audio)\//.test(url.pathname)) {
      await assets.put(e.request, respuesta.clone());
    }
    return respuesta;
  })());
});
