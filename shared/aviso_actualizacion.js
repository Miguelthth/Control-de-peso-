// La versión nueva se descarga automáticamente; se aplica al pulsar Actualizar.
// La captura y el entrenamiento deben terminar antes de cambiar de versión.
const CLAVE = 'misapps_actualizado_en';
const ID = 'misapps-actualizacion';
const VIGENCIA_MS = 10 * 60 * 1000;
const PAUSA_ANTES_DE_RECARGAR_MS = 700;
const DURACION_CONFIRMACION_MS = 2800;
let registro = null;
let opciones = {};
let pendiente = null;
let aplicando = false;
let revisando = false;
let reintento = null;

function obtenerCapa() {
  let capa = document.getElementById(ID);
  if (capa) return capa;
  capa = document.createElement('div');
  capa.id = ID;
  capa.setAttribute('role', 'status');
  capa.setAttribute('aria-live', 'assertive');
  const tarjeta = document.createElement('div');
  tarjeta.className = 'misapps-actualizacion-tarjeta';
  const imagen = document.createElement('img');
  imagen.className = 'misapps-perro-actualizacion';
  const manifiesto = document.querySelector?.('link[rel="manifest"]')?.href;
  imagen.src = manifiesto ? new URL('shared/perro-actualizacion.png', manifiesto).href : 'shared/perro-actualizacion.png';
  imagen.alt = '';
  imagen.setAttribute('aria-hidden', 'true');
  const engrane = document.createElement('span');
  engrane.className = 'misapps-engrane';
  engrane.setAttribute('aria-hidden', 'true');
  const titulo = document.createElement('strong');
  titulo.id = ID + '-titulo';
  const mensaje = document.createElement('p');
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-primario';
  boton.textContent = 'Actualizar';
  boton.hidden = true;
  boton.onclick = aplicarActualizacion;
  capa.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !boton.hidden) { e.preventDefault(); boton.focus(); }
  });
  tarjeta.append(imagen, engrane, titulo, mensaje, boton);
  capa.append(tarjeta);
  document.body.append(capa);
  return capa;
}

function pintar({ icono, titulo, mensaje, girar }) {
  const capa = obtenerCapa();
  const engrane = capa.querySelector('.misapps-engrane');
  engrane.textContent = icono;
  engrane.classList.toggle('girando', girar);
  capa.querySelector('strong').textContent = titulo;
  capa.querySelector('p').textContent = mensaje;
  capa.querySelector('button').hidden = true;
  capa.setAttribute('role', 'status');
  capa.removeAttribute?.('aria-modal');
  capa.classList.add('activo');
}

async function leerVersion() {
  if (typeof VERSION_CODIGO !== 'undefined') return VERSION_CODIGO;
  try {
    const r = registro || await navigator.serviceWorker.getRegistration();
    if (!r) return '';
    const respuesta = await fetch(new URL('__app_meta__.json', r.scope), { cache: 'no-store' });
    return respuesta.ok ? String((await respuesta.json()).version || '') : '';
  } catch { return ''; }
}

export function mostrarActualizando() {
  try { localStorage.setItem(CLAVE, String(Date.now())); } catch {}
  pintar({ icono: '⚙', titulo: 'Actualizando Mis Apps', mensaje: 'Espera un momento…', girar: true });
  return new Promise((resolver) => setTimeout(resolver, PAUSA_ANTES_DE_RECARGAR_MS));
}

export async function mostrarSiActualizo() {
  let marca;
  try { marca = Number(localStorage.getItem(CLAVE)); localStorage.removeItem(CLAVE); } catch { return; }
  if (!marca || Date.now() - marca > VIGENCIA_MS) return;
  const version = await leerVersion();
  pintar({ icono: '✅', titulo: 'Mis Apps actualizada', girar: false,
    mensaje: version ? 'Versión ' + version + ' instalada.' : 'Ya tienes la versión más reciente.' });
  setTimeout(() => document.getElementById(ID)?.classList.remove('activo'), DURACION_CONFIRMACION_MS);
}

function preguntarSW(tipo) {
  const sw = navigator.serviceWorker.controller;
  if (!sw) return Promise.resolve(null);
  return new Promise((resolve) => {
    const canal = new MessageChannel();
    const terminar = (datos) => {
      clearTimeout(espera);
      canal.port1.close();
      canal.port2.close();
      resolve(datos);
    };
    const espera = setTimeout(() => terminar(null), 5000);
    canal.port1.onmessage = (e) => terminar(e.data || null);
    sw.postMessage({ type: tipo }, [canal.port2]);
  });
}

function formularioActivo() {
  const activo = document.activeElement;
  const dialogoOEscritura = [...(document.querySelectorAll?.('dialog[open], [aria-modal="true"], [aria-busy="true"]') || [])]
    .some((el) => el !== document.getElementById(ID) && el.getClientRects().length > 0);
  return dialogoOEscritura || Boolean(activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA') && activo.value);
}

export function reintentarActualizacion() {
  clearTimeout(reintento);
  if (!pendiente || aplicando || document.hidden) return;
  if (formularioActivo() || opciones.puedeActualizar?.() === false) {
    document.getElementById(ID)?.classList.remove('activo');
    reintento = setTimeout(reintentarActualizacion, 1000);
    return;
  }
  const capa = obtenerCapa();
  const primeraVez = !capa.classList.contains('activo');
  pintar({ icono: '⚙', titulo: 'Actualización disponible', girar: false,
    mensaje: 'Versión ' + pendiente.version + '. Actualiza para seguir usando la app.' });
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', ID + '-titulo');
  const boton = capa.querySelector('button');
  boton.disabled = false;
  boton.hidden = false;
  if (primeraVez) boton.focus?.();
}

async function aplicarActualizacion() {
  if (!pendiente || aplicando) return;
  if (formularioActivo() || opciones.puedeActualizar?.() === false) {
    reintentarActualizacion();
    return;
  }
  aplicando = true;
  try {
    await mostrarActualizando();
    const resultado = await pendiente.aceptar();
    if (!resultado?.ok) throw new Error('No se pudo aplicar la versión. Intenta de nuevo.');
    if (!resultado.esperar) location.reload();
  } catch (error) {
    aplicando = false;
    try { localStorage.removeItem(CLAVE); } catch {}
    reintentarActualizacion();
    obtenerCapa().querySelector('p').textContent = error.message;
  }
}

export async function revisarActualizacion() {
  if (!registro || aplicando || revisando) return;
  revisando = true;
  try {
    if (navigator.onLine !== false) await registro.update().catch(() => {});
    if (registro.waiting) {
      const respuesta = await fetch(new URL('release.json', registro.scope), { cache: 'no-store' }).catch(() => null);
      const release = respuesta?.ok ? await respuesta.json() : null;
      const worker = registro.waiting;
      pendiente = { version: release?.build || 'nueva', aceptar: async () => {
        worker.postMessage({ type: 'ACTIVAR_ACTUALIZACION' });
        return { ok: true, esperar: true };
      } };
    } else {
      const estado = await preguntarSW('ESTADO');
      if (!estado?.lista) return;
      const versionAbierta = typeof VERSION_CODIGO !== 'undefined' ? VERSION_CODIGO : '';
      if (estado.lista === estado.aceptada && (!versionAbierta || versionAbierta === estado.lista)) return;
      pendiente = { version: estado.lista, aceptar: () => preguntarSW('ACEPTAR') };
    }
    reintentarActualizacion();
  } finally { revisando = false; }
}

export async function iniciarActualizaciones(config = {}) {
  if (!('serviceWorker' in navigator)) return null;
  opciones = config;
  registro = await navigator.serviceWorker.register(config.rutaSW || 'sw.js');
  config.alRegistrar?.(registro);
  const _revisar = () => revisarActualizacion().catch((error) => console.warn('Actualización:', error));
  registro.addEventListener('updatefound', () => {
    const worker = registro.installing;
    worker?.addEventListener('statechange', () => { if (worker.state === 'installed') _revisar(); });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (aplicando) location.reload(); else _revisar(); });
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'VERSION_LISTA') _revisar(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') _revisar(); });
  window.addEventListener('online', _revisar);
  setInterval(_revisar, 5 * 60 * 1000);
  navigator.serviceWorker.controller?.postMessage({ type: 'CONFIRMAR_ARRANQUE' });
  await _revisar();
  return registro;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mostrarSiActualizo());
  else mostrarSiActualizo();
}
