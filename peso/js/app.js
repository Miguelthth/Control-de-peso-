// ARCHIVO GENERADO por build.py (paquete "peso") -- no editar a mano.
// Edita los archivos fuente y vuelve a correr: python build.py

// ── shared/autorizacion.js ──────────────────────────────────────────
const autorizacion = (function () {
const CLAVE_TOKEN = 'ma_token';
const PUBLICAS = new Set(['validarUsuario', 'validarPin', 'validarActivacion']);
const MENSAJE_BACKEND_ANTIGUO = 'El servidor necesita actualizarse primero. Pide al administrador desplegar la nueva versión de Apps Script.';

function storagePredeterminado() {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

function guardarToken(token, storage = storagePredeterminado()) {
  if (storage && token) storage.setItem(CLAVE_TOKEN, String(token));
}

function leerToken(storage = storagePredeterminado()) {
  return storage ? storage.getItem(CLAVE_TOKEN) || '' : '';
}

function borrarToken(storage = storagePredeterminado()) {
  if (storage) storage.removeItem(CLAVE_TOKEN);
}

function requiereAutorizacion(accion) {
  return !PUBLICAS.has(String(accion || ''));
}

function agregarCredenciales(solicitud, usuario, token) {
  if (!requiereAutorizacion(solicitud.accion)) return { ...solicitud };
  return { ...solicitud, usuario: solicitud.usuario || usuario, token };
}

function exigirBackendActual(respuesta, { requiereToken = false } = {}) {
  const version = Number(respuesta?.apiVersion);
  if (!Number.isFinite(version) || version < 2 || (requiereToken && respuesta?.ok === true && !String(respuesta?.token || ''))) {
    throw new Error(MENSAJE_BACKEND_ANTIGUO);
  }
  return true;
}

function validarSesion({
  sesion, usuarioActual, usuarioSolicitado, ahora = Date.now(), rolRequerido = null, alcancePermitido = null,
}) {
  if (!sesion || !usuarioActual || !usuarioActual.activo) return false;
  if (sesion.expira <= ahora) return false;
  if (sesion.usuario !== usuarioSolicitado || usuarioActual.usuario !== sesion.usuario) return false;
  if (usuarioActual.rol !== sesion.rol) return false;
  if (rolRequerido && usuarioActual.rol !== rolRequerido) return false;
  return sesion.alcance === 'completo' || sesion.alcance === alcancePermitido;
}

function puedeValidarPin(pinConfigurado, pinRecibido) {
  return String(pinConfigurado || '') !== '' && String(pinConfigurado) === String(pinRecibido || '').trim();
}

function siguienteBloqueoPin(intentosAnteriores, ahora = Date.now()) {
  const intentos = Math.max(0, Number(intentosAnteriores) || 0) + 1;
  const demora = Math.min(60000, Math.pow(2, Math.max(0, intentos - 3)) * 1000);
  return { intentos, hasta: ahora + demora };
}

function pinNuevoValido(pin) { return /^\d{4}$/.test(String(pin)); }

function usuarioValido(usuario) {
  return /^[\p{L}\p{N} _.-]{1,64}$/u.test(String(usuario || '')) && !String(usuario).includes('..');
}

function fechaISOValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function numeroEnRango(valor, minimo, maximo) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= minimo && n <= maximo;
}

function blobCifradoValido(blob, maximo = 1000000) {
  if (typeof blob !== 'string' || blob.length < 2 || blob.length > maximo || /^[=+\-@]/.test(blob)) return false;
  try {
    const p = JSON.parse(blob);
    const b64 = (v) => typeof v === 'string' && v.length <= maximo && /^[A-Za-z0-9+/]+={0,2}$/.test(v);
    return p && p.cifrado === true && p.v === 1 && b64(p.salt) && b64(p.iv) && b64(p.datos);
  } catch { return false; }
}

function dividirTexto(texto, maximo = 40000) {
  const valor = String(texto);
  if (!Number.isInteger(maximo) || maximo < 1) throw new Error('Tamaño de chunk inválido');
  if (valor === '') return [''];
  const chunks = [];
  for (let i = 0; i < valor.length; i += maximo) chunks.push(valor.slice(i, i + maximo));
  return chunks;
}

function reunirTexto(chunks) {
  return Array.isArray(chunks) ? chunks.map(String).join('') : '';
}

  return { guardarToken, leerToken, borrarToken, requiereAutorizacion, agregarCredenciales, exigirBackendActual, validarSesion, puedeValidarPin, siguienteBloqueoPin, pinNuevoValido, usuarioValido, fechaISOValida, numeroEnRango, blobCifradoValido, dividirTexto, reunirTexto };
})();
const guardarToken = autorizacion.guardarToken;
const leerToken = autorizacion.leerToken;
const borrarToken = autorizacion.borrarToken;
const requiereAutorizacion = autorizacion.requiereAutorizacion;
const agregarCredenciales = autorizacion.agregarCredenciales;
const exigirBackendActual = autorizacion.exigirBackendActual;
const validarSesion = autorizacion.validarSesion;
const puedeValidarPin = autorizacion.puedeValidarPin;
const siguienteBloqueoPin = autorizacion.siguienteBloqueoPin;
const pinNuevoValido = autorizacion.pinNuevoValido;
const usuarioValido = autorizacion.usuarioValido;
const fechaISOValida = autorizacion.fechaISOValida;
const numeroEnRango = autorizacion.numeroEnRango;
const blobCifradoValido = autorizacion.blobCifradoValido;
const dividirTexto = autorizacion.dividirTexto;
const reunirTexto = autorizacion.reunirTexto;

// ── shared/sesion.js ──────────────────────────────────────────
const sesion = (function () {
// Sesión compartida entre el launcher, Gastos y Peso (mismo origen -- misma
// localStorage). Login pasa UNA vez en el launcher; las sub-apps solo leen.

const CLAVE_URL = 'ma_url';
const CLAVE_USUARIO = 'ma_usuario';
const CLAVE_ROL = 'ma_rol';
const CLAVE_PERFILES = 'ma_perfiles_conocidos';
const CLAVE_SESION_PASS = 'ma_clave_sesion'; // sessionStorage, no localStorage -- ver comentario abajo

// Respaldo fijo: la liga del servidor no cambia (es la de Link_Servidor.txt)
// -- si el iPhone borra localStorage entre usos (pasa en algunos ajustes de
// privacidad de Safari), al menos ese paso no se repite cada vez. Si algún
// día se redespliega Apps Script con OTRA liga, hay que actualizarla aquí.
const URL_RESPALDO = 'https://script.google.com/macros/s/AKfycbw3v_9rf4lrf5x910CXedDcyJPIkAic-Dx1VF8Hiucf0RQWj3Pg77SXibvjT8TXKWu9/exec';

function getUrl() {
  return localStorage.getItem(CLAVE_URL) || URL_RESPALDO;
}

function setUrl(url) {
  localStorage.setItem(CLAVE_URL, url.trim());
}

function getUsuario() {
  return localStorage.getItem(CLAVE_USUARIO) || '';
}

function getRol() {
  return localStorage.getItem(CLAVE_ROL) || '';
}

function esAdmin() {
  return getRol() === 'admin';
}

// Solo guarda metadatos de navegación para evitar una consulta preliminar a
// Apps Script. No contiene PIN, token ni ningún secreto de autenticación.
function guardarPerfilConocido(usuario, rol, tienePin = true) {
  const nombre = String(usuario || '').trim();
  if (!nombre) return;
  let perfiles = {};
  try { perfiles = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || '{}'); } catch { perfiles = {}; }
  perfiles[nombre.toLowerCase()] = { usuario: nombre, rol: String(rol || ''), tienePin: tienePin === true };
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(perfiles));
}

function leerPerfilConocido(usuario) {
  try {
    const perfiles = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || '{}');
    const perfil = perfiles[String(usuario || '').trim().toLowerCase()];
    return perfil && typeof perfil.usuario === 'string' ? perfil : null;
  } catch {
    return null;
  }
}

function iniciarSesion(usuario, rol, token) {
  localStorage.setItem(CLAVE_USUARIO, usuario);
  localStorage.setItem(CLAVE_ROL, rol);
  if (token) guardarToken(token);
  guardarPerfilConocido(usuario, rol, true);
}

function cerrarSesion() {
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_ROL);
  borrarClaveSesion();
  borrarToken();
}

// Inicia la invalidación mientras el token todavía existe, limpia el estado
// local de inmediato y absorbe errores de red: salir nunca debe dejar la UI
// esperando ni conservar credenciales en el dispositivo.
function cerrarSesionEnSegundoPlano(invalidar) {
  let solicitud;
  try { solicitud = invalidar(); }
  catch { solicitud = undefined; }
  cerrarSesion();
  return Promise.resolve(solicitud).catch(() => undefined);
}

function debeConfirmarNavegacion({ valor, enviado }) {
  return !enviado && String(valor ?? '').trim().length > 0;
}

async function ejecutarUnaVez(boton, accion) {
  if (boton.disabled) return undefined;
  boton.disabled = true;
  try { return await accion(); }
  finally { boton.disabled = false; }
}

function sesionAutenticada(usuario, token) {
  return String(usuario || '').length > 0 && String(token || '').length > 0;
}

function accesoFaceIdValido(respuesta) {
  return respuesta?.ok === true && String(respuesta.token || '').length > 0;
}


// El PIN/contraseña que se escribió al entrar en el launcher, guardado SOLO
// en sessionStorage (se borra solo al cerrar la pestaña/navegador, nunca
// persiste como localStorage) -- Gastos lo prueba primero como su propia
// contraseña de cifrado antes de preguntar la suya, para no volver a pedir
// nada al pasar de Peso a Gastos. Nunca se manda al servidor -- solo se usa
// localmente para intentar descifrar (ver gastos/js/ui.js::intentarEntradaAutomatica).
function guardarClaveSesion(pass) {
  sessionStorage.setItem(CLAVE_SESION_PASS, pass);
}

function leerClaveSesion() {
  return sessionStorage.getItem(CLAVE_SESION_PASS) || '';
}

function borrarClaveSesion() {
  sessionStorage.removeItem(CLAVE_SESION_PASS);
}

// Llamar al cargar cualquier sub-app: si falta URL o sesión, regresa al
// launcher para iniciar sesión ahí. `rutaLauncher` es relativa a la sub-app
// (ej. '../index.html').
function exigirSesion(rutaLauncher) {
  if (!getUrl() || !getUsuario() || !leerToken()) {
    location.href = rutaLauncher;
    return false;
  }
  return true;
}

  return { getUrl, setUrl, getUsuario, getRol, esAdmin, guardarPerfilConocido, leerPerfilConocido, iniciarSesion, cerrarSesion, cerrarSesionEnSegundoPlano, debeConfirmarNavegacion, ejecutarUnaVez, sesionAutenticada, accesoFaceIdValido, guardarClaveSesion, leerClaveSesion, borrarClaveSesion, exigirSesion };
})();
const getUrl = sesion.getUrl;
const setUrl = sesion.setUrl;
const getUsuario = sesion.getUsuario;
const getRol = sesion.getRol;
const esAdmin = sesion.esAdmin;
const guardarPerfilConocido = sesion.guardarPerfilConocido;
const leerPerfilConocido = sesion.leerPerfilConocido;
const iniciarSesion = sesion.iniciarSesion;
const cerrarSesion = sesion.cerrarSesion;
const cerrarSesionEnSegundoPlano = sesion.cerrarSesionEnSegundoPlano;
const debeConfirmarNavegacion = sesion.debeConfirmarNavegacion;
const ejecutarUnaVez = sesion.ejecutarUnaVez;
const sesionAutenticada = sesion.sesionAutenticada;
const accesoFaceIdValido = sesion.accesoFaceIdValido;
const guardarClaveSesion = sesion.guardarClaveSesion;
const leerClaveSesion = sesion.leerClaveSesion;
const borrarClaveSesion = sesion.borrarClaveSesion;
const exigirSesion = sesion.exigirSesion;

// ── shared/api.js ──────────────────────────────────────────
const api = (function () {
// Llamadas HTTP crudas al Web App de Apps Script único (Gastos + Peso).
// Sin caché, sin cola -- eso vive en cola.js de cada app. Aquí solo se habla
// con el servidor.

const TIMEOUT_MS = 12000;
let manejadorAuth = null;

function configurarManejadorAuth(fn) {
  manejadorAuth = typeof fn === 'function' ? fn : null;
}

function esFalloAuth(resultado) {
  if (!resultado || resultado.ok !== false) return false;
  const detalle = `${resultado.codigo || ''} ${resultado.error || ''}`;
  return /(?:auth|sesi[oó]n.*(?:inv[aá]lida|vencida|expirada)|token)/i.test(detalle);
}

class ApiError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

async function solicitarJson(url, opciones = {}, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS, scheduler = globalThis } = {}) {
  const controlador = new AbortController();
  const signalExterno = opciones.signal;
  let vencioTimeout = false;
  const cancelarExterno = () => controlador.abort(signalExterno.reason);
  if (signalExterno?.aborted) cancelarExterno();
  else signalExterno?.addEventListener('abort', cancelarExterno, { once: true });
  const temporizador = scheduler.setTimeout(() => {
    vencioTimeout = true;
    controlador.abort();
  }, timeoutMs);
  try {
    const resp = await fetchImpl(url, { ...opciones, signal: controlador.signal });
    if (!resp.ok) {
      const code = resp.status === 401 || resp.status === 403 ? 'AUTH' : 'HTTP';
      throw new ApiError(`El servidor respondió HTTP ${resp.status}. Intenta de nuevo.`, { code, status: resp.status });
    }
    try {
      const resultado = await resp.json();
      if (esFalloAuth(resultado)) {
        try { manejadorAuth?.(); } catch { /* el manejo de UI no cambia el error de red */ }
        throw new ApiError(resultado.error || 'La sesión expiró. Vuelve a entrar.', { code: 'AUTH', status: resp.status });
      }
      return resultado;
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      throw new ApiError('El servidor devolvió una respuesta inválida. Intenta de nuevo.', { code: 'RESPONSE', cause });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signalExterno?.aborted && !vencioTimeout) {
      throw new ApiError('La solicitud fue cancelada.', { code: 'ABORTED', cause: error });
    }
    if (vencioTimeout || error?.name === 'AbortError') {
      throw new ApiError('La solicitud tardó demasiado. Revisa tu conexión e intenta de nuevo.', { code: 'TIMEOUT', cause: error });
    }
    if (error instanceof TypeError) {
      throw new ApiError('No se pudo establecer conexión. Revisa tu red e intenta de nuevo.', { code: 'NETWORK', cause: error });
    }
    throw new ApiError('No se pudo completar la solicitud. Intenta de nuevo.', { code: 'NETWORK', cause: error });
  } finally {
    scheduler.clearTimeout(temporizador);
    signalExterno?.removeEventListener('abort', cancelarExterno);
  }
}

async function _post(body) {
  const url = getUrl();
  if (!url) throw new Error('No hay URL de Apps Script configurada.');
  const resultado = await solicitarJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS con Apps Script
    body: JSON.stringify(agregarCredenciales(body, getUsuario(), leerToken())),
  });
  return resultado;
}

async function cerrarSesionServidor() {
  try { return await _post({ accion: 'cerrarSesion' }); }
  finally { borrarToken(); }
}

function leerDatos() {
  return _post({ accion: 'leerDatos' });
}

// Consulta barata (no toca Hojas) para saber si algo cambió en Peso antes
// de pedir 'datos' completo -- se puede llamar seguido sin gastar cuota.
function leerVersion() {
  return _post({ accion: 'leerVersion' });
}

function guardarFechasReto(usuario, inicio, fin) {
  return _post({ accion: 'guardarFechasReto', usuario, inicio, fin });
}

function validarUsuario(usuario) {
  return _post({ accion: 'validarUsuario', usuario });
}

function validarPin(usuario, pin) {
  return _post({ accion: 'validarPin', usuario, pin });
}

function validarActivacion(usuario, codigo) {
  return _post({ accion: 'validarActivacion', usuario, codigo });
}

function crearPin(usuario, pinNuevo) {
  return _post({ accion: 'crearPin', usuario, pinNuevo });
}

function cambiarPin(usuario, pinActual, pinNuevo) {
  return _post({ accion: 'cambiarPin', usuario, pinActual, pinNuevo });
}

function guardarPeso(usuario, fecha, pesoKg) {
  return _post({ accion: 'guardarPeso', usuario, fecha, pesoKg });
}

function guardarMeta(usuario, metaKg, pesoInicialKg) {
  return _post({ accion: 'guardarMeta', usuario, metaKg, pesoInicialKg });
}

function guardarUnidad(usuario, unidad) {
  return _post({ accion: 'guardarUnidad', usuario, unidad });
}

function borrarPesos(usuario) {
  return _post({ accion: 'borrarPesos', usuario });
}

function borrarPesoFecha(usuario, fecha) {
  return _post({ accion: 'borrarPesoFecha', usuario, fecha });
}

function crearUsuario(nombreNuevo, rolNuevo) {
  return _post({ accion: 'crearUsuario', nombreNuevo, rolNuevo });
}

function guardarGastos(usuario, blob) {
  return _post({ accion: 'guardarGastos', usuario, blob });
}

function leerGastos(usuario) {
  return _post({ accion: 'leerGastos', usuario });
}

  return { configurarManejadorAuth, ApiError, solicitarJson, cerrarSesionServidor, leerDatos, leerVersion, guardarFechasReto, validarUsuario, validarPin, validarActivacion, crearPin, cambiarPin, guardarPeso, guardarMeta, guardarUnidad, borrarPesos, borrarPesoFecha, crearUsuario, guardarGastos, leerGastos };
})();
const configurarManejadorAuth = api.configurarManejadorAuth;
const ApiError = api.ApiError;
const solicitarJson = api.solicitarJson;
const cerrarSesionServidor = api.cerrarSesionServidor;
const leerDatos = api.leerDatos;
const leerVersion = api.leerVersion;
const guardarFechasReto = api.guardarFechasReto;
const validarUsuario = api.validarUsuario;
const validarPin = api.validarPin;
const validarActivacion = api.validarActivacion;
const crearPin = api.crearPin;
const cambiarPin = api.cambiarPin;
const guardarPeso = api.guardarPeso;
const guardarMeta = api.guardarMeta;
const guardarUnidad = api.guardarUnidad;
const borrarPesos = api.borrarPesos;
const borrarPesoFecha = api.borrarPesoFecha;
const crearUsuario = api.crearUsuario;
const guardarGastos = api.guardarGastos;
const leerGastos = api.leerGastos;

// ── shared/fondo.js ──────────────────────────────────────────
const fondo = (function () {
// Fondo de pantalla personalizado (tu propia foto) -- vive en IndexedDB, no
// en localStorage: una foto pesa más de lo que localStorage aguanta cómodo
// sin arriesgar llenarlo y afectar lo demás guardado ahí (sesión, Face ID,
// caché de datos). Por dispositivo -- no se sincroniza entre celulares, pero
// SÍ es una sola clave por usuario (no por app): IndexedDB es del mismo
// origen para el launcher, Gastos y Peso, así que se elige una vez y se ve
// en las 3.

const NOMBRE_DB = 'ma_fondos';
const NOMBRE_TIENDA = 'fondos';

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(NOMBRE_TIENDA);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarFondo(usuario, blob) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOMBRE_TIENDA, 'readwrite');
    tx.objectStore(NOMBRE_TIENDA).put(blob, usuario);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function leerFondo(usuario) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOMBRE_TIENDA, 'readonly');
    const req = tx.objectStore(NOMBRE_TIENDA).get(usuario);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function borrarFondo(usuario) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOMBRE_TIENDA, 'readwrite');
    tx.objectStore(NOMBRE_TIENDA).delete(usuario);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Achica y recomprime la foto ANTES de guardarla -- una foto de celular
// puede pesar varios MB a full resolución; para un fondo de pantalla nadie
// necesita eso. 900px de ancho y calidad 0.72 deja algo de ~50-150 KB.
function comprimirImagen(archivo, maxAncho = 900, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const ratio = Math.min(1, maxAncho / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('No se pudo procesar la imagen'));
      }, 'image/jpeg', calidad);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagen inválida'));
    };
    img.src = url;
  });
}

  return { guardarFondo, leerFondo, borrarFondo, comprimirImagen };
})();
const guardarFondo = fondo.guardarFondo;
const leerFondo = fondo.leerFondo;
const borrarFondo = fondo.borrarFondo;
const comprimirImagen = fondo.comprimirImagen;

// ── shared/ui_seguridad.js ──────────────────────────────────────────
const ui_seguridad = (function () {
function escapeHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caracter]);
}

function escapeAtributo(valor) {
  return escapeHTML(valor).replace(/[\u0000-\u001f\u007f]/g, '');
}

function idSeguro(valor) {
  const id = String(valor ?? '');
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : '';
}

function urlLocalSegura(valor) {
  const url = String(valor ?? '');
  return /^(?:\.\.\/|\.\/)?(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(url) ? url : '';
}

function colorSeguro(valor, respaldo = '#999999') {
  const color = String(valor ?? '');
  return /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/.test(color)
    ? color
    : respaldo;
}

  return { escapeHTML, escapeAtributo, idSeguro, urlLocalSegura, colorSeguro };
})();
const escapeHTML = ui_seguridad.escapeHTML;
const escapeAtributo = ui_seguridad.escapeAtributo;
const idSeguro = ui_seguridad.idSeguro;
const urlLocalSegura = ui_seguridad.urlLocalSegura;
const colorSeguro = ui_seguridad.colorSeguro;

// ── peso/js/modelo.js ──────────────────────────────────────────
const modelo = (function () {
// Forma de los datos y validación. Sin DOM, sin red.

function hoyISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function validarPeso(pesoKg) {
  const n = Number(pesoKg);
  if (!Number.isFinite(n) || n <= 0 || n > 400) {
    throw new Error('Peso inválido');
  }
  return Math.round(n * 10) / 10;
}

function kgALb(kg) {
  return kg * 2.20462;
}

function lbAKg(lb) {
  return lb / 2.20462;
}

// El peso SIEMPRE se guarda en kg -- esto es solo para la pantalla de
// capturar: convierte lo que la persona tecleó (en SU unidad preferida) a
// kg antes de mandarlo al servidor.
function aKg(valor, unidad) {
  return unidad === 'lb' ? lbAKg(valor) : Number(valor);
}

// Cindy ve en lb, Miguel en kg, y quieren compararse sin tener que convertir
// mentalmente -- así que cualquier peso que se muestre en pantalla (fuera
// del campo de captura) se ve siempre en las dos unidades.
function formatoPesoDual(pesoKg, decimales = 1) {
  if (pesoKg == null || !Number.isFinite(pesoKg)) return '—';
  const kgTxt = pesoKg.toFixed(decimales);
  const lbTxt = kgALb(pesoKg).toFixed(decimales);
  return `${kgTxt} kg · ${lbTxt} lb`;
}

  return { hoyISO, validarPeso, kgALb, lbAKg, aKg, formatoPesoDual };
})();
const hoyISO = modelo.hoyISO;
const validarPeso = modelo.validarPeso;
const kgALb = modelo.kgALb;
const lbAKg = modelo.lbAKg;
const aKg = modelo.aKg;
const formatoPesoDual = modelo.formatoPesoDual;

// ── peso/js/calculos.js ──────────────────────────────────────────
const calculos = (function () {
// Toda la aritmética de peso/progreso. Puro: recibe datos, regresa números.

function pesosDeUsuario(pesos, usuario) {
  return pesos
    .filter((p) => p.usuario === usuario)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function ultimoPeso(pesos, usuario) {
  const propios = pesosDeUsuario(pesos, usuario);
  return propios.length ? propios[propios.length - 1] : null;
}

// Racha de días consecutivos (hasta hoy) con registro. Un hueco la corta.
function racha(pesos, usuario, hoy = hoyISO()) {
  const fechas = new Set(pesosDeUsuario(pesos, usuario).map((p) => p.fecha));
  let n = 0;
  let cursor = new Date(`${hoy}T00:00:00`);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!fechas.has(iso)) break;
    n++;
    cursor.setDate(cursor.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}

// Promedio móvil de `dias` (suaviza el ruido día a día: agua, comida, etc.)
function promedioMovil(serie, dias) {
  return serie.map((punto, i) => {
    const desde = Math.max(0, i - dias + 1);
    const ventana = serie.slice(desde, i + 1);
    const prom = ventana.reduce((a, p) => a + p.pesoKg, 0) / ventana.length;
    return { fecha: punto.fecha, pesoKg: Math.round(prom * 10) / 10 };
  });
}

// {kgPerdidos, kgRestantes, pctAvance} -- null si no hay meta o no hay peso inicial.
function avanceMeta(usuario, pesoActualKg) {
  const { metaKg, pesoInicialKg } = usuario;
  if (metaKg == null || pesoInicialKg == null || pesoActualKg == null) return null;
  const totalPorPerder = pesoInicialKg - metaKg;
  if (totalPorPerder === 0) return { kgPerdidos: 0, kgRestantes: 0, pctAvance: 1 };
  const perdidoHastaAhora = pesoInicialKg - pesoActualKg;
  const pct = perdidoHastaAhora / totalPorPerder;
  return {
    kgPerdidos: Math.round(perdidoHastaAhora * 10) / 10,
    kgRestantes: Math.round((pesoActualKg - metaKg) * 10) / 10,
    pctAvance: Math.max(0, Math.min(1.5, pct)), // permite pasarse de la meta (>1) sin romper la barra visualmente arriba de eso
  };
}

// Últimos `n` promedios semanales (domingo-sábado), para la gráfica de tendencia suave.
function promedioSemanal(serie, semanas = 12) {
  if (!serie.length) return [];
  const porSemana = new Map();
  for (const p of serie) {
    const d = new Date(`${p.fecha}T00:00:00`);
    const inicioSemana = new Date(d);
    inicioSemana.setDate(d.getDate() - d.getDay());
    const clave = inicioSemana.toISOString().slice(0, 10);
    if (!porSemana.has(clave)) porSemana.set(clave, []);
    porSemana.get(clave).push(p.pesoKg);
  }
  const claves = [...porSemana.keys()].sort().slice(-semanas);
  return claves.map((clave) => {
    const valores = porSemana.get(clave);
    const prom = valores.reduce((a, v) => a + v, 0) / valores.length;
    return { semana: clave, pesoKg: Math.round(prom * 10) / 10 };
  });
}

  return { pesosDeUsuario, ultimoPeso, racha, promedioMovil, avanceMeta, promedioSemanal };
})();
const pesosDeUsuario = calculos.pesosDeUsuario;
const ultimoPeso = calculos.ultimoPeso;
const racha = calculos.racha;
const promedioMovil = calculos.promedioMovil;
const avanceMeta = calculos.avanceMeta;
const promedioSemanal = calculos.promedioSemanal;

// ── peso/js/graficas.js ──────────────────────────────────────────
const graficas = (function () {
// Gráficas en SVG escrito a mano. Sin librerías. A diferencia de una gráfica
// de dinero, el eje Y aquí NO arranca en 0 (un peso de 0 no significa nada) --
// se ajusta al rango de los datos con un margen, para que se note el cambio.
//
// Pensadas para celular: el ancho crece con la cantidad de puntos (para que
// no se amontonen) y el contenedor hace scroll horizontal si no caben --
// ver .grafica-scroll en css/estilos.css. Con pocos puntos se ve completa
// sin necesidad de scroll.

const NS = 'http://www.w3.org/2000/svg';
const MIN_ANCHO = 320;
const PX_POR_PUNTO = 30;
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(fecha) {
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha; // ej. una clave de semana "YYYY-MM-DD" del lunes -- ya es fecha válida
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function anchoResponsivo(nPuntos) {
  return Math.max(MIN_ANCHO, nPuntos * PX_POR_PUNTO);
}

function escalaY(valores, alto, pad) {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const margen = rango * 0.15 + 0.5;
  const lo = min - margen;
  const hi = max + margen;
  return (v) => pad.top + (alto - pad.top - pad.bottom) * (1 - (v - lo) / (hi - lo));
}

function envolver(svg, width, height) {
  return `<div class="grafica-envoltura" style="min-width:${width}px;"><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="${NS}">${svg}</svg></div>`;
}

function svgLineaPeso(serie, { height = 220, color = '#4c5fd5', meta = null } = {}) {
  if (serie.length < 2) {
    return envolver(
      `<text x="50%" y="50%" text-anchor="middle" class="grafica-texto-vacio">Captura al menos 2 días para ver la tendencia</text>`,
      MIN_ANCHO, height
    );
  }
  const width = anchoResponsivo(serie.length);
  const pad = { top: 16, right: 16, bottom: 26, left: 46 };
  const valores = serie.map((p) => p.pesoKg);
  if (meta != null) valores.push(meta);
  const y = escalaY(valores, height, pad);
  const w = width - pad.left - pad.right;
  const idFiltro = `g${Math.random().toString(36).slice(2, 8)}`;
  const puntosXY = serie.map((p, i) => [pad.left + (i / (serie.length - 1)) * w, y(p.pesoKg)]);
  const puntos = puntosXY.map(([x, yy]) => `${x},${yy}`).join(' ');
  const area = `${pad.left},${pad.top + (height - pad.top - pad.bottom)} ${puntos} ${pad.left + w},${pad.top + (height - pad.top - pad.bottom)}`;

  const guias = [0, 0.5, 1].map((f) => {
    const min = Math.min(...valores), max = Math.max(...valores);
    const valor = min + (max - min) * f;
    const yy = y(valor);
    return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="var(--borde)" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="4" y="${yy + 4}" class="grafica-eje-texto">${valor.toFixed(1)}</text>`;
  }).join('');

  const etiquetasX = serie.map((p, i) => {
    // en pantallas chicas, una etiqueta por punto se amontona -- se salta
    // según cuánto espacio real hay por punto.
    const cada = Math.ceil(40 / PX_POR_PUNTO);
    if (i % cada !== 0 && i !== serie.length - 1) return '';
    const [x] = puntosXY[i];
    return `<text x="${x}" y="${height - 6}" text-anchor="middle" class="grafica-eje-texto">${fechaCorta(p.fecha)}</text>`;
  }).join('');

  const lineaMeta = meta != null
    ? `<line x1="${pad.left}" y1="${y(meta)}" x2="${width - pad.right}" y2="${y(meta)}" stroke="var(--exito)" stroke-width="1.5" stroke-dasharray="5 4"/>
       <text x="${width - pad.right}" y="${y(meta) - 4}" text-anchor="end" class="grafica-eje-texto" fill="var(--exito)">meta ${meta}</text>`
    : '';

  const svg = `
    <defs>
      <linearGradient id="${idFiltro}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${guias}
    ${lineaMeta}
    <polygon points="${area}" fill="url(#${idFiltro})"/>
    <polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${puntosXY.map(([x, yy], i) => {
      const p = serie[i];
      return `<circle cx="${x}" cy="${yy}" r="3" fill="var(--superficie)" stroke="${color}" stroke-width="2">
        <title>${fechaCorta(p.fecha)}: ${p.pesoKg.toFixed(1)} kg · ${kgALb(p.pesoKg).toFixed(1)} lb</title></circle>`;
    }).join('')}
    ${etiquetasX}
  `;
  return envolver(svg, width, height);
}

function svgLineaComparativa(serieA, serieB, { height = 240, colorA = '#4c5fd5', colorB = '#ff6b4a' } = {}) {
  const todas = [...serieA, ...serieB];
  const fechas = [...new Set(todas.map((p) => p.fecha))].sort();
  if (fechas.length < 2) {
    return envolver(
      `<text x="50%" y="50%" text-anchor="middle" class="grafica-texto-vacio">Faltan datos para comparar</text>`,
      MIN_ANCHO, height
    );
  }
  const width = anchoResponsivo(fechas.length);
  const pad = { top: 16, right: 16, bottom: 26, left: 46 };
  const valores = todas.map((p) => p.pesoKg);
  const y = escalaY(valores, height, pad);
  const w = width - pad.left - pad.right;
  const x = (fecha) => pad.left + (fechas.indexOf(fecha) / Math.max(1, fechas.length - 1)) * w;

  const linea = (serie, color) => {
    if (serie.length < 2) return '';
    const puntos = serie.map((p) => `${x(p.fecha)},${y(p.pesoKg)}`).join(' ');
    return `<polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${serie.map((p) => `<circle cx="${x(p.fecha)}" cy="${y(p.pesoKg)}" r="2.5" fill="${color}"><title>${fechaCorta(p.fecha)}: ${p.pesoKg.toFixed(1)} kg</title></circle>`).join('')}`;
  };

  const guias = [0, 0.5, 1].map((f) => {
    const min = Math.min(...valores), max = Math.max(...valores);
    const valor = min + (max - min) * f;
    const yy = y(valor);
    return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="var(--borde)" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="4" y="${yy + 4}" class="grafica-eje-texto">${valor.toFixed(1)}</text>`;
  }).join('');

  const cada = Math.ceil(40 / PX_POR_PUNTO);
  const etiquetasX = fechas.map((f, i) => {
    if (i % cada !== 0 && i !== fechas.length - 1) return '';
    return `<text x="${x(f)}" y="${height - 6}" text-anchor="middle" class="grafica-eje-texto">${fechaCorta(f)}</text>`;
  }).join('');

  const svg = `
    ${guias}
    ${linea(serieA, colorA)}
    ${linea(serieB, colorB)}
    ${etiquetasX}
  `;
  return envolver(svg, width, height);
}

// El avance hacia la meta, como una barra horizontal (índigo → coral, la
// paleta de la app) con el Rasengan real (peso/assets/rasengan.mp4) montado
// en la punta, como si la esfera fuera la que va empujando el avance.
function svgBarraAvance(pct, { width = 260, color = null } = {}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const pctTexto = Math.round(pct * 100);
  const estiloFill = color ? `width:${clamped * 100}%; background:${color};` : `width:${clamped * 100}%;`;
  return `<div class="rasengan-barra" style="max-width:${width}px;">
    <div class="rasengan-barra-track">
      <div class="rasengan-barra-fill" style="${estiloFill}"></div>
      <span class="rasengan-barra-pct">${pctTexto}%</span>
    </div>
    <div class="rasengan-barra-bola" style="left:${clamped * 100}%">
      <video src="assets/rasengan.mp4" autoplay muted loop playsinline></video>
    </div>
  </div>`;
}

// "Carrera al centro": cada quien avanza desde SU lado hacia la mitad según
// su propio % de avance a SU propia meta -- si los dos llegan al 100%, las
// dos barras se tocan justo en medio. Tarjeta fija en "Nuestro reto" (ya no
// es una pestaña que se cambia -- se ve siempre, junto a las tendencias).
function svgBarraVersus(pctA, pctB, nombreA, nombreB, { width = 300, colorA = '#4c5fd5', colorB = '#ff6b4a' } = {}) {
  const claA = Math.max(0, Math.min(1, pctA));
  const claB = Math.max(0, Math.min(1, pctB));
  const mitad = width / 2;
  const anchoA = claA * mitad;
  const anchoB = claB * mitad;
  const alturaPista = 26;
  const y = 32;
  return `<svg viewBox="0 0 ${width} 62" width="100%" xmlns="${NS}" style="display:block; max-width:${width}px; margin:0 auto;">
    <text x="2" y="16" font-size="13" font-weight="800" fill="${colorA}">${nombreA} · ${Math.round(claA * 100)}%</text>
    <text x="${width - 2}" y="16" font-size="13" font-weight="800" fill="${colorB}" text-anchor="end">${nombreB} · ${Math.round(claB * 100)}%</text>
    <rect x="0" y="${y}" width="${width}" height="${alturaPista}" rx="13" fill="var(--superficie-alt)" stroke="var(--borde)"/>
    <rect x="0" y="${y}" width="${Math.max(anchoA, claA > 0 ? 13 : 0)}" height="${alturaPista}" rx="13" fill="${colorA}"/>
    <rect x="${width - Math.max(anchoB, claB > 0 ? 13 : 0)}" y="${y}" width="${Math.max(anchoB, claB > 0 ? 13 : 0)}" height="${alturaPista}" rx="13" fill="${colorB}"/>
    <line x1="${mitad}" y1="${y - 4}" x2="${mitad}" y2="${y + alturaPista + 4}" stroke="var(--texto-suave)" stroke-width="2" stroke-dasharray="2 3"/>
  </svg>`;
}

  return { svgLineaPeso, svgLineaComparativa, svgBarraAvance, svgBarraVersus };
})();
const svgLineaPeso = graficas.svgLineaPeso;
const svgLineaComparativa = graficas.svgLineaComparativa;
const svgBarraAvance = graficas.svgBarraAvance;
const svgBarraVersus = graficas.svgBarraVersus;

// ── peso/js/cola.js ──────────────────────────────────────────
const cola = (function () {
// Cola offline (mismo patrón que el Cotizador): capturar nunca espera al
// servidor. Se guarda de una en localStorage, se ve en la app al instante, y
// se sincroniza cuando hay señal -- reintentando solo, sin que el usuario
// tenga que hacer nada.

const CLAVE_COLA = 'cp_cola_pesos';
const CLAVE_CACHE = 'cp_cache_datos';

function leerJSON(clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardarJSON(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

function compactarOperaciones(operaciones) {
  const ultimas = new Map();
  for (const entrada of operaciones || []) {
    if (!entrada?.usuario || !entrada?.fecha) continue;
    const clave = `${entrada.usuario}\u0000${entrada.fecha}`;
    if (ultimas.has(clave)) ultimas.set(clave, entrada);
    else ultimas.set(clave, entrada);
  }
  return [...ultimas.values()];
}

function nuevoOpId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function identidadOperacion(entrada) {
  return entrada.opId || `${entrada.usuario}\u0000${entrada.fecha}\u0000${entrada.tipo || 'guardar'}\u0000${entrada.ts || ''}`;
}

function claveCola(usuario) {
  return `${CLAVE_COLA}:${encodeURIComponent(String(usuario || '').trim())}`;
}

function migrarColaAnterior() {
  const anterior = leerJSON(CLAVE_COLA, []);
  if (!anterior.length) return;
  const usuarios = new Set(anterior.map((e) => e.usuario).filter(Boolean));
  for (const usuario of usuarios) {
    const clave = claveCola(usuario);
    const propias = anterior.filter((e) => e.usuario === usuario);
    const existentes = leerJSON(clave, []);
    guardarJSON(clave, compactarOperaciones(existentes.concat(propias)));
  }
  localStorage.removeItem(CLAVE_COLA);
}

function leerCola(usuario) {
  migrarColaAnterior();
  if (!usuario) return [];
  return leerJSON(claveCola(usuario), []).filter((e) => e.usuario === usuario);
}

function encolarPeso(usuario, fecha, pesoKg) {
  const cola = compactarOperaciones(leerCola(usuario).concat({ tipo: 'guardar', usuario, fecha, pesoKg, ts: Date.now(), opId: nuevoOpId() }));
  guardarJSON(claveCola(usuario), cola);
}

// Igual que encolarPeso pero para un borrado -- así "Borrar" funciona sin
// red exactamente igual que "Guardar" (antes solo guardar tenía cola).
function encolarBorrado(usuario, fecha) {
  const cola = compactarOperaciones(leerCola(usuario).concat({ tipo: 'borrar', usuario, fecha, ts: Date.now(), opId: nuevoOpId() }));
  guardarJSON(claveCola(usuario), cola);
}

function leerCache() {
  return leerJSON(CLAVE_CACHE, { usuarios: [], pesos: [], version: '0', retoInicio: null, retoFin: null });
}

function guardarCache(datos) {
  guardarJSON(CLAVE_CACHE, datos);
}

// Snapshot del servidor (o el último cacheado si no hay señal) + lo que
// todavía está en la cola sin confirmar, para que lo que acabas de capturar
// se vea de inmediato aunque no haya llegado al Sheet.
function conColaEncima(datos, usuario) {
  const cola = leerCola(usuario);
  if (!cola.length) return datos;
  const pesos = datos.pesos.filter(
    (p) => !cola.some((e) => e.usuario === p.usuario && e.fecha === p.fecha)
  );
  // Entradas viejas sin `tipo` (antes de que existiera el borrado en cola)
  // se tratan como 'guardar', para no perder nada ya encolado.
  for (const e of cola) {
    if (e.tipo !== 'borrar') pesos.push({ usuario: e.usuario, fecha: e.fecha, pesoKg: e.pesoKg });
  }
  return { ...datos, pesos };
}

async function refrescarDatos(usuario) {
  try {
    const datos = await api.leerDatos();
    if (datos.ok) {
      const plano = { usuarios: datos.usuarios, pesos: datos.pesos, version: datos.version, retoInicio: datos.retoInicio, retoFin: datos.retoFin };
      guardarCache(plano);
      return { datos: conColaEncima(plano, usuario), sinConexion: false };
    }
    throw new Error(datos.error || 'Error del servidor');
  } catch {
    return { datos: conColaEncima(leerCache(), usuario), sinConexion: true };
  }
}

// Chequeo barato: compara el número de versión del servidor contra el que
// se guardó en el último refrescarDatos(). Si no cambió, no vale la pena
// pedir 'datos' completo -- así se puede preguntar cada pocos segundos sin
// gastar cuota.
async function hayCambiosRemotos() {
  try {
    const r = await api.leerVersion();
    if (!r.ok) return false;
    return String(r.version) !== String(leerCache().version || '0');
  } catch {
    return false;
  }
}

let sincronizando = false;

async function sincronizar(usuario, transporte = api) {
  if (sincronizando) return;
  const cola = leerCola(usuario);
  if (!cola.length || !navigator.onLine) return;
  sincronizando = true;
  try {
  const pendientes = [];
  for (const entrada of cola) {
    try {
      const r = entrada.tipo === 'borrar'
        ? await transporte.borrarPesoFecha(entrada.usuario, entrada.fecha)
        : await transporte.guardarPeso(entrada.usuario, entrada.fecha, entrada.pesoKg);
      if (!r.ok) pendientes.push(entrada);
      else {
        const id = identidadOperacion(entrada);
        guardarJSON(claveCola(usuario), leerCola(usuario).filter((e) => identidadOperacion(e) !== id));
      }
    } catch {
      pendientes.push(entrada); // sigue sin señal -- se queda en la cola
    }
  }
  return { sincronizados: cola.length - pendientes.length, pendientes: leerCola(usuario).length };
  } finally {
    sincronizando = false;
  }
}

function iniciarSincronizacionAutomatica(usuario, alSincronizar) {
  const intentar = async () => {
    const r = await sincronizar(usuario);
    if (r && r.sincronizados > 0 && alSincronizar) alSincronizar(r);
  };
  window.addEventListener('online', intentar);
  setInterval(intentar, 15000);
  intentar();
}

  return { compactarOperaciones, leerCola, encolarPeso, encolarBorrado, leerCache, refrescarDatos, hayCambiosRemotos, sincronizar, iniciarSincronizacionAutomatica };
})();
const compactarOperaciones = cola.compactarOperaciones;
const leerCola = cola.leerCola;
const encolarPeso = cola.encolarPeso;
const encolarBorrado = cola.encolarBorrado;
const leerCache = cola.leerCache;
const refrescarDatos = cola.refrescarDatos;
const hayCambiosRemotos = cola.hayCambiosRemotos;
const sincronizar = cola.sincronizar;
const iniciarSincronizacionAutomatica = cola.iniciarSincronizacionAutomatica;

// ── peso/js/actualizacion.js ──────────────────────────────────────────
const actualizacion = (function () {
const URL_METADATA = '../__app_meta__.json';

function normalizarMetadata(valor) {
  if (!valor || typeof valor !== 'object') return null;
  const version = String(valor.version || '').trim();
  const installedAt = String(valor.installedAt || '').trim();
  if (!version || !installedAt || Number.isNaN(Date.parse(installedAt))) return null;
  return { version, installedAt: new Date(installedAt).toISOString() };
}

function formatearFechaActualizacion(installedAt, zonaHoraria = 'America/Tijuana') {
  const fecha = new Date(installedAt);
  if (Number.isNaN(fecha.getTime())) return 'Sin información';
  const opciones = {
    dateStyle: 'long', timeStyle: 'short', hour12: false,
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {}),
  };
  try { return new Intl.DateTimeFormat('es-MX', opciones).format(fecha); }
  catch { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(fecha); }
}

function obtenerEstadoActualizacion({ soportado, buscando = false, preparada = false, metadata = null }) {
  if (!soportado) return 'No disponible';
  if (buscando) return 'Buscando actualización…';
  if (preparada) return 'Actualización preparada';
  return metadata ? 'Actualizada' : 'Sin información';
}

async function leerMetadataActualizacion(fetchFn = fetch) {
  try {
    const respuesta = await fetchFn(URL_METADATA, { cache: 'no-store' });
    if (!respuesta.ok) return null;
    return normalizarMetadata(await respuesta.json());
  } catch { return null; }
}

async function buscarActualizacion(registro) {
  if (!registro?.update) throw new Error('Actualizaciones no disponibles');
  await registro.update();
  return registro;
}

function hayCapturaPesoPendiente(captura) {
  if (!captura) return false;
  const tienePeso = String(captura.pesoStr ?? '').trim().length > 0;
  const cambioFecha = captura.fechaOriginal && captura.fecha !== captura.fechaOriginal;
  return Boolean(tienePeso || cambioFecha);
}

function decidirRecargaActualizacion({ capturaPendiente, formularioPendiente = false, escribiendoActivo, recargaDiferida = false }) {
  if (capturaPendiente || formularioPendiente || escribiendoActivo) return { recargar: false, diferir: true };
  return { recargar: true, diferir: false };
}

const CAMPOS_AJUSTE_DIFERIBLES = new Set([
  'ajustes-meta', 'ajustes-inicial', 'reto-fecha-inicio', 'reto-fecha-fin',
]);

function esCampoAjusteDiferible(id, type) {
  return type !== 'file' && CAMPOS_AJUSTE_DIFERIBLES.has(String(id || ''));
}

  return { normalizarMetadata, formatearFechaActualizacion, obtenerEstadoActualizacion, leerMetadataActualizacion, buscarActualizacion, hayCapturaPesoPendiente, decidirRecargaActualizacion, esCampoAjusteDiferible };
})();
const normalizarMetadata = actualizacion.normalizarMetadata;
const formatearFechaActualizacion = actualizacion.formatearFechaActualizacion;
const obtenerEstadoActualizacion = actualizacion.obtenerEstadoActualizacion;
const leerMetadataActualizacion = actualizacion.leerMetadataActualizacion;
const buscarActualizacion = actualizacion.buscarActualizacion;
const hayCapturaPesoPendiente = actualizacion.hayCapturaPesoPendiente;
const decidirRecargaActualizacion = actualizacion.decidirRecargaActualizacion;
const esCampoAjusteDiferible = actualizacion.esCampoAjusteDiferible;

// ── peso/js/ui_helpers.js ──────────────────────────────────────────
const ui_helpers = (function () {
function prepararEdicion(registro, unidad) {
  const valor = unidad === 'lb' ? kgALb(registro.pesoKg) : registro.pesoKg;
  return { fecha: registro.fecha, pesoStr: Number(valor).toFixed(1) };
}

function mensajeBorrado({ sinConexion, pendientes }) {
  if (sinConexion) return 'Registro borrado en este dispositivo · pendiente de sincronizar';
  if (pendientes > 0) return 'Registro borrado · sincronización pendiente';
  return 'Registro borrado';
}

function planificarEdicion(fechaOriginal, fechaNueva, pesoKg) {
  const operaciones = [];
  if (fechaOriginal && fechaOriginal !== fechaNueva) operaciones.push({ tipo: 'borrar', fecha: fechaOriginal });
  operaciones.push({ tipo: 'guardar', fecha: fechaNueva, pesoKg });
  return operaciones;
}

  return { prepararEdicion, mensajeBorrado, planificarEdicion };
})();
const prepararEdicion = ui_helpers.prepararEdicion;
const mensajeBorrado = ui_helpers.mensajeBorrado;
const planificarEdicion = ui_helpers.planificarEdicion;

// ── peso/js/ui.js ──────────────────────────────────────────
// Estado, render y eventos. El único archivo que toca el DOM.
// El login (URL, usuario, PIN) ya pasó en el launcher (../index.html) antes
// de llegar aquí -- esta app solo confirma que hay sesión (exigirSesion) y
// usa getUsuario() para saber quién eres.

api.configurarManejadorAuth(() => {
  cerrarSesionEnSegundoPlano(() => undefined);
  location.href = '../index.html';
});

const E = {
  vista: 'capturar',
  datos: { usuarios: [], pesos: [], retoInicio: null, retoFin: null },
  sinConexion: false,
  captura: { fecha: hoyISO(), fechaOriginal: hoyISO(), editandoFechaOriginal: null, pesoStr: '' },
  graficaActiva: 'diaria',
  actualizacion: { metadata: null, buscando: false, preparada: false },
};

let registroSW = null;
let intentarRecargaDiferida = () => {};
const ajustesPendientes = new Set();

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Color fijo por persona (no "yo vs. el otro") -- los datos de Cindy siempre
// se ven morados y los de Miguel siempre rojos, sin importar en qué celular
// se estén viendo. Un tercer usuario que no sea ninguno de los dos cae en
// el índigo de la marca, para no romper si algún día se agrega alguien más.
const COLOR_POR_USUARIO = { Miguel: '#e5484d', Cindy: '#9333ea' };
function colorDeUsuario(nombre) {
  return COLOR_POR_USUARIO[nombre] || '#4c5fd5';
}

function formatoFechaCorta(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const texto = `${d}-${MESES_CORTOS[m - 1].charAt(0).toUpperCase()}${MESES_CORTOS[m - 1].slice(1)}`;
  return fechaISO === hoyISO() ? `Hoy · ${texto}` : texto;
}

function fmt1(n) {
  return Number(n).toFixed(1);
}

// Igual que formatoPesoDual (modelo.js) pero con kg/lb en colores distintos
// -- vive aquí (no en modelo.js) porque modelo.js es puro/sin DOM y esto
// regresa HTML para innerHTML, no texto plano.
function formatoPesoDualColor(pesoKg) {
  if (pesoKg == null || !Number.isFinite(pesoKg)) return '—';
  const kgTxt = fmt1(pesoKg);
  const lbTxt = fmt1(kgALb(pesoKg));
  return `<span class="unidad-kg">${kgTxt} kg</span> · <span class="unidad-lb">${lbTxt} lb</span>`;
}

function toast(msg, esError = false) {
  let el = document.getElementById('toast-simple');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-simple';
    el.className = 'toast-simple';
    document.body.appendChild(el);
  }
  el.setAttribute('role', esError ? 'alert' : 'status');
  el.setAttribute('aria-live', esError ? 'assertive' : 'polite');
  el.style.background = esError ? 'var(--peligro)' : 'var(--texto)';
  el.style.color = esError ? '#fff' : 'var(--fondo)';
  el.textContent = msg;
  el.classList.remove('oculto');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('oculto'), 2200);
}

function usuarioObj(nombre) {
  return E.datos.usuarios.find((u) => u.usuario === nombre) || { usuario: nombre, metaKg: null, pesoInicialKg: null, unidad: 'kg' };
}

function otroUsuario() {
  return E.datos.usuarios.map((u) => u.usuario).find((u) => u !== getUsuario());
}

// Unidad en la que ESTE usuario prefiere capturar (Cindy en lb, Miguel en
// kg) -- el peso guardado siempre es en kg, esto solo decide qué unidad le
// pide la app al teclear. Todo lo demás en pantalla se ve en las dos.
function miUnidad() {
  return usuarioObj(getUsuario()).unidad === 'lb' ? 'lb' : 'kg';
}

// ---------- arranque ----------

async function iniciarApp() {
  document.getElementById('app').classList.remove('oculto');
  cargarFondoGuardado(); // no bloquea el arranque -- se aplica en cuanto esté lista
  await cargarYRenderizar();
  cola.iniciarSincronizacionAutomatica(getUsuario(), () => cargarYRenderizar());
  // Para que el peso que capture Cindy/Miguel le llegue rápido al otro sin
  // recargar a mano: cada 8s se pregunta solo el número de versión (barato,
  // sin tocar Hojas) y nomás si cambió se jala 'datos' completo. Al volver
  // a primer plano (abrir la app, regresar de otra app) se refresca directo.
  const revisarVersion = async () => {
    if (document.hidden || E.vista === 'ajustes') return; // no pisar un campo a medio editar
    if (await cola.hayCambiosRemotos()) cargarYRenderizar();
  };
  setInterval(revisarVersion, 8000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && E.vista !== 'ajustes') cargarYRenderizar();
  });
}

async function cargarYRenderizar() {
  const { datos, sinConexion } = await cola.refrescarDatos(getUsuario());
  E.datos = datos;
  E.sinConexion = sinConexion;
  actualizarBadgeConexion();
  render();
}

function actualizarBadgeConexion() {
  const el = document.getElementById('badge-conexion');
  const pendientes = cola.leerCola(getUsuario()).length;
  if (E.sinConexion) {
    el.textContent = pendientes ? `📴 Sin conexión · ${pendientes} sin sincronizar` : '📴 Sin conexión (viendo lo último guardado)';
    el.classList.remove('oculto');
  } else if (pendientes) {
    el.textContent = `🔄 Sincronizando ${pendientes}...`;
    el.classList.remove('oculto');
  } else {
    el.classList.add('oculto');
  }
}

function cambiarVista(nombre) {
  E.vista = nombre;
  document.querySelectorAll('.vista').forEach((v) => v.classList.remove('activa'));
  document.getElementById(`vista-${nombre}`).classList.add('activa');
  document.querySelectorAll('.nav-inferior button').forEach((b) => {
    const activo = b.dataset.vista === nombre;
    b.classList.toggle('activo', activo);
    if (activo) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  render();
}

function render() {
  if (E.vista === 'capturar') renderCapturar();
  else if (E.vista === 'progreso') renderProgreso();
  else if (E.vista === 'reto') renderReto();
  else if (E.vista === 'ajustes') renderAjustes();
}

// ---------- capturar ----------

function renderCapturar() {
  const unidad = miUnidad();
  document.getElementById('captura-usuario').textContent = getUsuario();
  document.getElementById('captura-unidad').textContent = unidad;
  document.getElementById('captura-fecha').value = E.captura.fecha;
  document.getElementById('captura-fecha-texto').textContent = formatoFechaCorta(E.captura.fecha);
  document.getElementById('captura-peso-input').value = E.captura.pesoStr;
  document.getElementById('btn-guardar-captura').textContent = E.captura.editandoFechaOriginal ? 'Guardar cambios' : 'Registrar peso';
  const ultimo = ultimoPeso(E.datos.pesos, getUsuario());
  document.getElementById('captura-ultimo').innerHTML = ultimo
    ? `Última captura: ${escapeHTML(ultimo.fecha)} — ${formatoPesoDualColor(ultimo.pesoKg)}`
    : 'Todavía no capturas nada.';
  const r = racha(E.datos.pesos, getUsuario());
  document.getElementById('captura-racha').textContent = r > 0 ? `🔥 Racha: ${r} día(s)` : '';

  const otraUnidad = unidad === 'kg' ? 'lb' : 'kg';
  const valor = parseFloat(E.captura.pesoStr);
  document.getElementById('captura-peso-otro').textContent = Number.isFinite(valor)
    ? `≈ ${fmt1(unidad === 'kg' ? kgALb(valor) : lbAKg(valor))} ${otraUnidad}`
    : '';
}

async function guardarCaptura() {
  try {
    const unidad = miUnidad();
    const pesoKg = validarPeso(aKg(E.captura.pesoStr, unidad));
    const fecha = E.captura.fecha;
    const operaciones = uiHelpers.planificarEdicion(E.captura.editandoFechaOriginal, fecha, pesoKg);
    for (const operacion of operaciones) {
      if (operacion.tipo === 'borrar') cola.encolarBorrado(getUsuario(), operacion.fecha);
      else cola.encolarPeso(getUsuario(), operacion.fecha, operacion.pesoKg);
    }
    const fechasQuitadas = new Set(operaciones.map((o) => o.fecha));
    E.datos.pesos = E.datos.pesos.filter((p) => !(p.usuario === getUsuario() && fechasQuitadas.has(p.fecha)));
    E.datos.pesos.push({ usuario: getUsuario(), fecha, pesoKg });
    toast('Guardado ✓');
    E.captura = { fecha: hoyISO(), fechaOriginal: hoyISO(), editandoFechaOriginal: null, pesoStr: '' };
    document.getElementById('captura-peso-input').value = '';
    intentarRecargaDiferida();
    actualizarBadgeConexion();
    render();
    mostrarRegistroOverlay();
    cola.sincronizar(getUsuario()).then(() => { actualizarBadgeConexion(); });
  } catch (e) {
    toast(e.message, true);
  }
}

// El video de "premio" al guardar -- cubre la tarjeta de captura un rato y
// se quita solo, sin que el usuario tenga que hacer nada.
function mostrarRegistroOverlay() {
  const overlay = document.getElementById('registro-overlay');
  const video = document.getElementById('registro-video');
  overlay.classList.remove('oculto');
  video.currentTime = 0;
  video.play().catch(() => {});
  const ocultar = () => overlay.classList.add('oculto');
  video.onended = ocultar;
  setTimeout(ocultar, 9000); // respaldo por si 'ended' no dispara (iOS a veces no lo hace en loops cortos)
}

function wireCapturar() {
  document.getElementById('captura-peso-input').addEventListener('input', (e) => {
    E.captura.pesoStr = e.target.value;
    renderCapturar();
    intentarRecargaDiferida();
  });
  document.getElementById('captura-fecha').addEventListener('change', (e) => {
    E.captura.fecha = e.target.value;
    renderCapturar();
    intentarRecargaDiferida();
  });
  document.getElementById('btn-guardar-captura').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, guardarCaptura));
}

// ---------- mi progreso ----------

function renderProgreso() {
  const serie = pesosDeUsuario(E.datos.pesos, getUsuario());
  const u = usuarioObj(getUsuario());
  const ultimo = serie.length ? serie[serie.length - 1].pesoKg : null;

  document.getElementById('progreso-racha').textContent = `🔥 ${racha(E.datos.pesos, getUsuario())}`;
  const diasFaltan = diasFaltanReto();
  document.getElementById('progreso-dias-faltan').textContent =
    diasFaltan == null ? '—' : diasFaltan >= 0 ? diasFaltan : '¡ya!';
  document.getElementById('progreso-ultimo').innerHTML = formatoPesoDualColor(ultimo);

  const avance = avanceMeta(u, ultimo);
  const elAvance = document.getElementById('progreso-avance');
  if (avance) {
    elAvance.innerHTML = `
      <div class="fila-avance">
        <span>${formatoPesoDualColor(avance.kgPerdidos)} perdidos</span>
        <span>${formatoPesoDualColor(avance.kgRestantes)} para tu meta</span>
      </div>
      ${graficas.svgBarraAvance(avance.pctAvance, { color: colorDeUsuario(getUsuario()) })}
    `;
  } else {
    elAvance.innerHTML = '<p class="texto-suave">Define tu meta y tu peso inicial en Ajustes para ver tu avance.</p>';
  }

  document.getElementById('grafica-diaria').innerHTML = graficas.svgLineaPeso(serie, { meta: u.metaKg, color: '#ff6b4a' });

  const suavizada = promedioMovil(serie, 7);
  document.getElementById('grafica-progreso').innerHTML = graficas.svgLineaPeso(suavizada, { meta: u.metaKg });

  const semanal = promedioSemanal(serie, 12);
  document.getElementById('grafica-semanal').innerHTML = graficas.svgLineaPeso(semanal.map((s) => ({ fecha: s.semana, pesoKg: s.pesoKg })));

  mostrarGraficaActiva();
  renderHistorial(serie);
}

// Últimos 10, del más reciente al más viejo, con botón de borrar -- para
// cuando Cindy o Miguel se equivocan al capturar y quieren corregirlo sin
// tener que borrar TODO su historial (eso ya existía, esto no).
function renderHistorial(serie) {
  const ultimos = serie.slice(-10).reverse();
  const cont = document.getElementById('historial-pesos');
  if (!ultimos.length) {
    cont.innerHTML = '<p class="texto-suave">Todavía no capturas nada.</p>';
    return;
  }
  cont.innerHTML = ultimos
    .map(
      (p) => `<div class="lista-item">
      <span>${escapeHTML(formatoFechaCorta(p.fecha))} — ${formatoPesoDualColor(p.pesoKg)}</span>
      <span class="lista-acciones">
        <button class="icono" data-editar-peso="${escapeAtributo(p.fecha)}" aria-label="${escapeAtributo(`Editar registro del ${formatoFechaCorta(p.fecha)}`)}">✏️</button>
        <button class="icono" data-borrar-peso="${escapeAtributo(p.fecha)}" aria-label="${escapeAtributo(`Borrar registro del ${formatoFechaCorta(p.fecha)}`)}">🗑️</button>
      </span>
    </div>`
    )
    .join('');
  conectarAccionesHistorial(cont);
}

function conectarAccionesHistorial(cont) {
  cont.querySelectorAll('[data-editar-peso]').forEach((boton) => {
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      editarRegistroPeso(boton.dataset.editarPeso);
    });
  });
  cont.querySelectorAll('[data-borrar-peso]').forEach((boton) => {
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      borrarRegistroPeso(boton.dataset.borrarPeso);
    });
  });
}

function editarRegistroPeso(fecha) {
  const registro = E.datos.pesos.find((p) => p.usuario === getUsuario() && p.fecha === fecha);
  if (!registro) return;
  E.captura = { ...uiHelpers.prepararEdicion(registro, miUnidad()), fechaOriginal: fecha, editandoFechaOriginal: fecha };
  cambiarVista('capturar');
  const input = document.getElementById('captura-peso-input');
  input.value = E.captura.pesoStr;
  input.focus();
}

async function borrarRegistroPeso(fecha) {
  const ok = await confirmarPopup(`¿Borrar tu registro del ${formatoFechaCorta(fecha)}? No se puede deshacer.`);
  if (!ok) return;
  // Igual que guardarCaptura(): se encola y se refleja de una, no espera al
  // servidor -- antes esto sí esperaba la red y tronaba sin conexión.
  cola.encolarBorrado(getUsuario(), fecha);
  E.datos.pesos = E.datos.pesos.filter((p) => !(p.usuario === getUsuario() && p.fecha === fecha));
  const pendientes = cola.leerCola(getUsuario()).length;
  toast(uiHelpers.mensajeBorrado({ sinConexion: !navigator.onLine || E.sinConexion, pendientes }));
  actualizarBadgeConexion();
  render();
  cola.sincronizar(getUsuario()).then(() => { actualizarBadgeConexion(); });
}

const IDS_GRAFICA = { diaria: 'grafica-diaria', tendencia: 'grafica-progreso', semanal: 'grafica-semanal' };

function mostrarGraficaActiva() {
  document.querySelectorAll('#grafica-tabs button').forEach((b) => {
    const activo = b.dataset.grafica === E.graficaActiva;
    b.classList.toggle('activo', activo);
    b.setAttribute('aria-selected', String(activo));
    b.tabIndex = activo ? 0 : -1;
  });
  Object.entries(IDS_GRAFICA).forEach(([clave, id]) => {
    const panel = document.getElementById(id);
    const oculto = clave !== E.graficaActiva;
    panel.classList.toggle('oculto', oculto);
    panel.hidden = oculto;
  });
}

// ---------- nuestro reto ----------

// Las 4 figuras que mandó Miguel (de gordo a delgado) para marcar cada 25%
// de avance hacia la meta -- viven en Reto (donde ya se comparan las dos
// personas) y dejan el Rasengan solo para Mi progreso.
function avatarMeta(pctAvance) {
  const pct = Math.max(0, Math.min(1, pctAvance));
  const idx = pct >= 0.75 ? 4 : pct >= 0.5 ? 3 : pct >= 0.25 ? 2 : 1;
  return `assets/meta${idx}.png`;
}

// null si no hay fecha de fin guardada; si no, los días que faltan (negativo
// si ya pasó). Compartida entre "Mi progreso" (kpi) y "Nuestro reto" (texto).
function diasFaltanReto() {
  if (!E.datos.retoFin) return null;
  const hoy = hoyISO();
  return Math.ceil((new Date(`${E.datos.retoFin}T00:00:00`) - new Date(`${hoy}T00:00:00`)) / 86400000);
}

function textoFechasReto() {
  const { retoInicio, retoFin } = E.datos;
  if (!retoInicio && !retoFin) return '';
  const dias = diasFaltanReto();
  if (retoFin) {
    const rango = retoInicio ? `${retoInicio} → ${retoFin}` : `hasta ${retoFin}`;
    if (dias > 0) return `${rango} · faltan ${dias} día(s)`;
    if (dias === 0) return `${rango} · ¡hoy termina!`;
    return `${rango} · terminó hace ${Math.abs(dias)} día(s)`;
  }
  return `Empezó ${retoInicio}`;
}

function renderReto() {
  const otro = otroUsuario();
  const serieYo = pesosDeUsuario(E.datos.pesos, getUsuario());
  const serieOtro = otro ? pesosDeUsuario(E.datos.pesos, otro) : [];

  document.getElementById('reto-fechas').textContent = textoFechasReto();
  document.getElementById('reto-nombres').textContent = otro ? `${getUsuario()} vs. ${otro}` : getUsuario();
  document.getElementById('leyenda-yo').textContent = getUsuario();
  document.getElementById('leyenda-otro').textContent = otro || '—';
  document.getElementById('leyenda-punto-yo').style.background = colorDeUsuario(getUsuario());
  document.getElementById('leyenda-punto-otro').style.background = otro ? colorDeUsuario(otro) : '#999';
  document.getElementById('grafica-reto').innerHTML = graficas.svgLineaComparativa(
    promedioMovil(serieYo, 7), promedioMovil(serieOtro, 7),
    { colorA: colorDeUsuario(getUsuario()), colorB: otro ? colorDeUsuario(otro) : '#999' }
  );

  const nombres = otro ? [getUsuario(), otro] : [getUsuario()];
  const filas = nombres.map((nombre) => {
    const serie = pesosDeUsuario(E.datos.pesos, nombre);
    const u = usuarioObj(nombre);
    const ultimo = serie.length ? serie[serie.length - 1].pesoKg : null;
    const avance = avanceMeta(u, ultimo);
    const r = racha(E.datos.pesos, nombre);
    return { nombre, ultimo, avance, racha: r };
  });

  document.getElementById('grafica-versus').innerHTML = graficas.svgBarraVersus(
    filas[0]?.avance?.pctAvance || 0,
    filas[1]?.avance?.pctAvance || 0,
    escapeHTML(filas[0]?.nombre || getUsuario()),
    escapeHTML(filas[1]?.nombre || '—'),
    { width: 340, colorA: colorDeUsuario(filas[0]?.nombre || getUsuario()), colorB: colorDeUsuario(filas[1]?.nombre || '') }
  );

  document.getElementById('reto-tarjetas').innerHTML = filas.map((f) => `
    <div class="tarjeta-persona" style="border-top:3px solid ${colorSeguro(colorDeUsuario(f.nombre))};">
      ${f.avance ? `<img class="avatar-marca-agua" src="${escapeAtributo(urlLocalSegura(avatarMeta(f.avance.pctAvance)))}" alt="">` : ''}
      <div class="tarjeta-persona-contenido">
      <h3 style="color:${colorSeguro(colorDeUsuario(f.nombre))};">${escapeHTML(f.nombre === getUsuario() ? `${f.nombre} (tú)` : f.nombre)}</h3>
      <div class="dato-grande valor-dual">${formatoPesoDualColor(f.ultimo)}</div>
      <div class="texto-suave">🔥 ${f.racha} día(s) de racha</div>
      ${f.avance ? `
        <div class="fila-avance small">
          <span>${formatoPesoDualColor(f.avance.kgPerdidos)} perdidos</span>
        </div>
        <div class="texto-suave">${Math.round(f.avance.pctAvance * 100)}% de tu meta</div>
      ` : '<div class="texto-suave">Sin meta definida</div>'}
      </div>
    </div>
  `).join('');
}

// ---------- ajustes ----------

function renderAjustes() {
  const u = usuarioObj(getUsuario());
  const unidad = miUnidad();
  document.getElementById('ajustes-usuario').textContent = getUsuario();
  document.getElementById('ajustes-inicial-unidad').textContent = unidad;
  document.getElementById('ajustes-meta-unidad').textContent = unidad;
  asignarCampoAjuste('ajustes-meta', u.metaKg != null ? fmt1(unidad === 'kg' ? u.metaKg : kgALb(u.metaKg)) : '');
  asignarCampoAjuste('ajustes-inicial', u.pesoInicialKg != null ? fmt1(unidad === 'kg' ? u.pesoInicialKg : kgALb(u.pesoInicialKg)) : '');
  document.querySelectorAll('#unidad-grupo button').forEach((b) => {
    const activo = b.dataset.unidad === unidad;
    b.classList.toggle('activo', activo); b.setAttribute('aria-pressed', String(activo));
  });
  document.getElementById('tarjeta-borrar-datos').classList.toggle('oculto', !esAdmin());
  document.getElementById('tarjeta-fechas-reto').classList.toggle('oculto', !esAdmin());
  asignarCampoAjuste('reto-fecha-inicio', E.datos.retoInicio || '');
  asignarCampoAjuste('reto-fecha-fin', E.datos.retoFin || '');
  const meta = E.actualizacion.metadata;
  document.getElementById('actualizacion-version').textContent = meta?.version || '—';
  document.getElementById('actualizacion-fecha').textContent = meta
    ? actualizacion.formatearFechaActualizacion(meta.installedAt) : 'Sin información';
  document.getElementById('actualizacion-estado').textContent = actualizacion.obtenerEstadoActualizacion({
    soportado: 'serviceWorker' in navigator, metadata: meta,
    buscando: E.actualizacion.buscando, preparada: E.actualizacion.preparada,
  });
}

function asignarCampoAjuste(id, valor) {
  const campo = document.getElementById(id);
  if (ajustesPendientes.has(id)) return;
  campo.value = valor;
  campo.dataset.valorPersistido = valor;
}

function confirmarCamposAjuste(ids) {
  for (const id of ids) {
    const campo = document.getElementById(id);
    campo.dataset.valorPersistido = campo.value;
    ajustesPendientes.delete(id);
  }
  intentarRecargaDiferida();
}

async function releerMetadataActualizacion() {
  E.actualizacion.metadata = await actualizacion.leerMetadataActualizacion();
  if (E.vista === 'ajustes') renderAjustes();
}

function observarInstalacion(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      E.actualizacion.preparada = true;
      E.actualizacion.buscando = false;
      if (E.vista === 'ajustes') renderAjustes();
    }
  });
}

async function buscarActualizacionManual() {
  E.actualizacion.buscando = true;
  E.actualizacion.preparada = false;
  renderAjustes();
  try {
    await actualizacion.buscarActualizacion(registroSW);
    observarInstalacion(registroSW.installing);
    if (!registroSW.installing) E.actualizacion.buscando = false;
  } catch (e) {
    E.actualizacion.buscando = false;
    toast(e.message, true);
  }
  renderAjustes();
}

// ---------- fondo de pantalla personalizado ----------
//
// Por dispositivo, no por servidor -- cada quien elige la suya desde su
// propio Ajustes. Se guarda en IndexedDB (shared/fondo.js), no en
// localStorage. Va DETRÁS de #app (z-index -1, opacidad baja) -- todo el
// contenido real vive dentro de tarjetas con fondo sólido, así que por
// diseño no hay forma de que tape información.

let urlFondoActual = null; // para revocar el Object URL anterior y no acumular

function aplicarFondo(blob) {
  const el = document.getElementById('fondo-personalizado');
  if (urlFondoActual) URL.revokeObjectURL(urlFondoActual);
  urlFondoActual = blob ? URL.createObjectURL(blob) : null;
  el.style.backgroundImage = urlFondoActual ? `url(${urlFondoActual})` : '';
  el.classList.toggle('oculto', !urlFondoActual);
}

function actualizarVistaPreviaFondo() {
  const previa = document.getElementById('fondo-vista-previa');
  const btnQuitar = document.getElementById('btn-quitar-fondo');
  previa.style.backgroundImage = urlFondoActual ? `url(${urlFondoActual})` : '';
  previa.classList.toggle('oculto', !urlFondoActual);
  btnQuitar.classList.toggle('oculto', !urlFondoActual);
}

async function cargarFondoGuardado() {
  try {
    const blob = await fondo.leerFondo(getUsuario());
    aplicarFondo(blob);
    actualizarVistaPreviaFondo();
  } catch {
    // IndexedDB no disponible o falló -- no es crítico, la app sigue sin fondo.
  }
}

async function elegirFondo(archivo) {
  try {
    const comprimida = await fondo.comprimirImagen(archivo);
    await fondo.guardarFondo(getUsuario(), comprimida);
    aplicarFondo(comprimida);
    actualizarVistaPreviaFondo();
    toast('Fondo activado ✓');
  } catch (e) {
    toast('No se pudo usar esa foto: ' + e.message, true);
  }
}

async function quitarFondo() {
  await fondo.borrarFondo(getUsuario());
  aplicarFondo(null);
  actualizarVistaPreviaFondo();
  toast('Fondo quitado');
}

async function guardarFechasRetoAjustes() {
  const inicio = document.getElementById('reto-fecha-inicio').value;
  const fin = document.getElementById('reto-fecha-fin').value;
  try {
    const r = await api.guardarFechasReto(getUsuario(), inicio, fin);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el guardado');
    E.datos.retoInicio = inicio || null;
    E.datos.retoFin = fin || null;
    confirmarCamposAjuste(['reto-fecha-inicio', 'reto-fecha-fin']);
    toast('Fechas guardadas ✓');
  } catch (e) {
    toast('No se pudo guardar (¿sin conexión?): ' + e.message, true);
  }
}

async function guardarMetaAjustes() {
  const unidad = miUnidad();
  const valorMeta = parseFloat(document.getElementById('ajustes-meta').value);
  const valorInicial = parseFloat(document.getElementById('ajustes-inicial').value);
  const metaKg = Number.isFinite(valorMeta) ? Math.round(aKg(valorMeta, unidad) * 10) / 10 : null;
  const pesoInicialKg = Number.isFinite(valorInicial) ? Math.round(aKg(valorInicial, unidad) * 10) / 10 : null;
  try {
    const r = await api.guardarMeta(getUsuario(), metaKg, pesoInicialKg);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el guardado');
    const u = usuarioObj(getUsuario());
    u.metaKg = metaKg;
    u.pesoInicialKg = pesoInicialKg;
    confirmarCamposAjuste(['ajustes-meta', 'ajustes-inicial']);
    toast('Meta guardada ✓');
    render();
  } catch (e) {
    toast('No se pudo guardar (¿sin conexión?): ' + e.message, true);
  }
}

async function cambiarUnidadAjustes(unidad) {
  try {
    const r = await api.guardarUnidad(getUsuario(), unidad);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el cambio');
    usuarioObj(getUsuario()).unidad = unidad;
    toast(`Ahora capturas en ${unidad} ✓`);
    render();
  } catch (e) {
    toast('No se pudo cambiar (¿sin conexión?): ' + e.message, true);
  }
}

async function cambiarPinAjustes() {
  const actual = prompt('Tu PIN actual:') || '';
  const nuevo = prompt('Nuevo PIN (4 dígitos):');
  if (nuevo === null) return;
  if (!/^\d{4}$/.test(nuevo)) {
    toast('El PIN nuevo debe ser de 4 dígitos', true);
    return;
  }
  try {
    const r = await api.cambiarPin(getUsuario(), actual, nuevo);
    if (r.ok) toast('PIN actualizado ✓');
    else toast(r.error || 'PIN actual incorrecto', true);
  } catch (e) {
    toast('No se pudo cambiar (¿sin conexión?): ' + e.message, true);
  }
}

// Respaldo manual (Gastos ya tenía el suyo, a Peso le faltaba) -- descarga
// un .json con tus propios pesos + meta, sin pasar por el servidor (usa lo
// que ya está cargado en E.datos), funciona hasta sin conexión.
function exportarMisDatosPeso() {
  const usuario = getUsuario();
  const u = usuarioObj(usuario);
  const paquete = {
    usuario,
    unidad: u.unidad,
    metaKg: u.metaKg,
    pesoInicialKg: u.pesoInicialKg,
    pesos: E.datos.pesos.filter((p) => p.usuario === usuario),
    exportado: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `peso-respaldo-${usuario}-${hoyISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function wireAjustes() {
  document.getElementById('vista-ajustes').addEventListener('input', (e) => {
    if (!actualizacion.esCampoAjusteDiferible(e.target.id, e.target.type)) return;
    if (e.target.value === e.target.dataset.valorPersistido) ajustesPendientes.delete(e.target.id);
    else ajustesPendientes.add(e.target.id);
    intentarRecargaDiferida();
  });
  document.getElementById('btn-buscar-actualizacion').addEventListener('click', buscarActualizacionManual);
  document.getElementById('btn-exportar-peso').addEventListener('click', exportarMisDatosPeso);
  document.getElementById('btn-elegir-fondo').addEventListener('click', () => document.getElementById('input-fondo').click());
  document.getElementById('input-fondo').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (archivo) elegirFondo(archivo);
  });
  document.getElementById('btn-quitar-fondo').addEventListener('click', quitarFondo);
  document.getElementById('btn-guardar-meta').addEventListener('click', guardarMetaAjustes);
  document.getElementById('btn-guardar-fechas-reto').addEventListener('click', guardarFechasRetoAjustes);
  document.getElementById('btn-cambiar-pin').addEventListener('click', cambiarPinAjustes);
  document.getElementById('unidad-grupo').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-unidad]');
    if (!btn || btn.classList.contains('activo')) return;
    cambiarUnidadAjustes(btn.dataset.unidad);
  });
  document.getElementById('btn-cambiar-usuario').addEventListener('click', () => {
    cerrarSesionEnSegundoPlano(api.cerrarSesionServidor);
    location.href = '../index.html';
  });
  document.getElementById('btn-borrar-mis-datos').addEventListener('click', async () => {
    const confirmacion = prompt('Esto borra TODOS tus pesos registrados (los de la otra persona no se tocan). Escribe BORRAR para confirmar:');
    if (confirmacion !== 'BORRAR') return;
    try {
      const r = await api.borrarPesos(getUsuario());
      if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el borrado');
      toast('Tus datos fueron borrados');
      await cargarYRenderizar();
    } catch (e) {
      toast('No se pudo borrar (¿sin conexión?): ' + e.message, true);
    }
  });
}

// ---------- popup de confirmación (reemplaza confirm() nativo) ----------

let focoAntesPopup = null;
function activarPopupAccesible(fondo, cerrar) {
  focoAntesPopup = document.activeElement;
  const botones = [...fondo.querySelectorAll('button:not(:disabled)')];
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key !== 'Tab' || !botones.length) return;
    const primero = botones[0]; const ultimo = botones[botones.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  };
  fondo.addEventListener('keydown', onKey);
  botones[0]?.focus();
  return () => {
    fondo.removeEventListener('keydown', onKey);
    focoAntesPopup?.focus?.(); focoAntesPopup = null;
  };
}

function confirmarPopup(mensaje) {
  return new Promise((resolve) => {
    const fondo = document.getElementById('popup-confirmar');
    document.getElementById('popup-mensaje').textContent = mensaje;
    fondo.classList.remove('oculto');
    const btnSi = document.getElementById('popup-aceptar');
    const btnNo = document.getElementById('popup-cancelar');
    let limpiarAccesibilidad = () => {};
    const limpiar = (valor) => {
      fondo.classList.add('oculto');
      btnSi.removeEventListener('click', onSi);
      btnNo.removeEventListener('click', onNo);
      limpiarAccesibilidad();
      resolve(valor);
    };
    const onSi = () => limpiar(true);
    const onNo = () => limpiar(false);
    btnSi.addEventListener('click', onSi);
    btnNo.addEventListener('click', onNo);
    limpiarAccesibilidad = activarPopupAccesible(fondo, () => limpiar(false));
  });
}

// ---------- arranque ----------

function wireGlobal() {
  document.querySelectorAll('.nav-inferior button, .btn-ajustes').forEach((b) => {
    b.addEventListener('click', () => cambiarVista(b.dataset.vista));
  });
  document.getElementById('grafica-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grafica]');
    if (!btn) return;
    E.graficaActiva = btn.dataset.grafica;
    mostrarGraficaActiva();
  });
  document.getElementById('grafica-tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')];
    const actual = tabs.indexOf(document.activeElement);
    if (actual < 0) return;
    e.preventDefault();
    const siguiente = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (actual + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    E.graficaActiva = tabs[siguiente].dataset.grafica;
    mostrarGraficaActiva();
    tabs[siguiente].focus();
  });
  document.querySelectorAll('[data-confirmar-salida]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!debeConfirmarNavegacion({ valor: E.captura.pesoStr, enviado: false })) return;
      e.preventDefault();
      confirmarPopup('Hay un peso sin guardar. ¿Quieres salir?').then((ok) => { if (ok) location.href = a.href; });
    });
  });
  document.getElementById('btn-ver-historial').addEventListener('click', (e) => {
    const cont = document.getElementById('historial-pesos');
    const abierto = cont.classList.toggle('oculto') === false;
    e.target.textContent = abierto ? 'Ocultar tus últimos registros' : '¿Te equivocaste al capturar? Ver tus últimos registros';
  });
}

async function init() {
  wireGlobal();
  wireCapturar();
  wireAjustes();

  if (!exigirSesion('../index.html')) return;

  await iniciarApp();
}

// Ver comentario igual en gastos/js/ui.js.
window.addEventListener('unhandledrejection', (e) => {
  console.error('Error sin atrapar:', e.reason);
  toast('Ocurrió un error: ' + (e.reason?.message || e.reason), true);
});

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  // Ver comentario igual en js/ui.js (launcher) -- update() fuerza la
  // revisión sin cambiar la URL del service worker en cada carga.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js').then((r) => {
      registroSW = r;
      r.addEventListener('updatefound', () => observarInstalacion(r.installing));
      observarInstalacion(r.installing);
      releerMetadataActualizacion();
      return r.update();
    }).catch(() => {});
  });
  // Ver comentario igual en js/ui.js (launcher) -- autorefresca cuando toma
  // control un service worker nuevo, pero no si hay un campo con texto sin
  // mandar: espera a que la app pase a segundo plano para no borrarlo.
  let recargando = false;
  let recargaDiferida = false;
  function intentarRecargar() {
    if (recargando) return;
    const activo = document.activeElement;
    const escribiendo = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA') && activo.value;
    const decision = actualizacion.decidirRecargaActualizacion({
      capturaPendiente: actualizacion.hayCapturaPesoPendiente(E.captura),
      formularioPendiente: ajustesPendientes.size > 0,
      escribiendoActivo: Boolean(escribiendo), recargaDiferida,
    });
    recargaDiferida = decision.diferir;
    if (!decision.recargar) return;
    recargando = true;
    releerMetadataActualizacion().finally(() => location.reload());
  }
  intentarRecargaDiferida = function () {
    if (recargaDiferida && !actualizacion.hayCapturaPesoPendiente(E.captura) && ajustesPendientes.size === 0) intentarRecargar();
  };
  document.addEventListener('input', intentarRecargaDiferida);
  navigator.serviceWorker.addEventListener('controllerchange', intentarRecargar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) intentarRecargaDiferida(); });
  window.addEventListener('pagehide', intentarRecargaDiferida);
}
