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

function pinNuevoValido(pin) { return String(pin).length >= 6; }

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
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  try { return await accion(); }
  finally { boton.disabled = false; boton.textContent = textoOriginal; }
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

// Ejercicio se guarda en la Hoja central; el caché del teléfono es solo una
// copia de trabajo y se puede reconstruir al entrar de nuevo.
function leerEjercicio() {
  return _post({ accion: 'leerEjercicio' });
}

function guardarEjercicio(datos) {
  return guardarOperacionEjercicio({ opId: crypto.randomUUID(), tipo: 'reemplazar_documento', entidadId: 'documento', modificadoEn: datos.modificadoEn || new Date().toISOString() }, datos);
}

function guardarOperacionEjercicio(operacion, datos) {
  return _post({ accion: 'guardarEjercicio', operacion, datos });
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

  return { configurarManejadorAuth, ApiError, solicitarJson, cerrarSesionServidor, leerDatos, leerEjercicio, guardarEjercicio, guardarOperacionEjercicio, leerVersion, guardarFechasReto, validarUsuario, validarPin, validarActivacion, crearPin, cambiarPin, guardarPeso, guardarMeta, guardarUnidad, borrarPesos, borrarPesoFecha, crearUsuario, guardarGastos, leerGastos };
})();
const configurarManejadorAuth = api.configurarManejadorAuth;
const ApiError = api.ApiError;
const solicitarJson = api.solicitarJson;
const cerrarSesionServidor = api.cerrarSesionServidor;
const leerDatos = api.leerDatos;
const leerEjercicio = api.leerEjercicio;
const guardarEjercicio = api.guardarEjercicio;
const guardarOperacionEjercicio = api.guardarOperacionEjercicio;
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

// ── shared/actualizacion.js ──────────────────────────────────────────
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

  return { normalizarMetadata, formatearFechaActualizacion, obtenerEstadoActualizacion, leerMetadataActualizacion, buscarActualizacion };
})();
const normalizarMetadata = actualizacion.normalizarMetadata;
const formatearFechaActualizacion = actualizacion.formatearFechaActualizacion;
const obtenerEstadoActualizacion = actualizacion.obtenerEstadoActualizacion;
const leerMetadataActualizacion = actualizacion.leerMetadataActualizacion;
const buscarActualizacion = actualizacion.buscarActualizacion;

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
  return Math.round(n * 100) / 100;
}

function normalizarEntradaPeso(valor) {
  const texto = String(valor ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
  const punto = texto.indexOf('.');
  if (punto < 0) return texto.slice(0, 3);
  const entero = texto.slice(0, punto).slice(0, 3);
  const decimales = texto.slice(punto + 1).replace(/\./g, '').slice(0, 2);
  return `${entero}.${decimales}`;
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

  return { hoyISO, validarPeso, normalizarEntradaPeso, kgALb, lbAKg, aKg, formatoPesoDual };
})();
const hoyISO = modelo.hoyISO;
const validarPeso = modelo.validarPeso;
const normalizarEntradaPeso = modelo.normalizarEntradaPeso;
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
  if (!fechas.has(hoy)) cursor.setDate(cursor.getDate() - 1);
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

// ── peso/js/actualizacion_peso.js ──────────────────────────────────────────
const actualizacion_peso = (function () {
// Las funciones genéricas de "hay una versión nueva" viven en
// shared/actualizacion.js (las usan Peso y Gastos por igual). Aquí solo se
// re-exportan, junto con las que sí son específicas de Peso (abajo). El
// import + export por separado (no "export {...} from") es a propósito:
// build.py solo sabe borrar en el bundle un "export { nombre };" suelto,
// no la sintaxis combinada con "from".

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

  return { hayCapturaPesoPendiente, decidirRecargaActualizacion, esCampoAjusteDiferible };
})();
const hayCapturaPesoPendiente = actualizacion_peso.hayCapturaPesoPendiente;
const decidirRecargaActualizacion = actualizacion_peso.decidirRecargaActualizacion;
const esCampoAjusteDiferible = actualizacion_peso.esCampoAjusteDiferible;

// ── peso/js/ui_helpers.js ──────────────────────────────────────────
const ui_helpers = (function () {
function prepararEdicion(registro, unidad) {
  const valor = unidad === 'lb' ? kgALb(registro.pesoKg) : registro.pesoKg;
  return { fecha: registro.fecha, pesoStr: Number(valor).toFixed(2).replace(/0$/, '') };
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

// ── peso/js/ejercicio_modelo.js ──────────────────────────────────────────
const ejercicio_modelo = (function () {
// Reglas puras del módulo Ejercicio: sin DOM, almacenamiento ni red.

const MODALIDADES_CARGA = ['discos', 'niveles', 'PC'];
const CATEGORIAS_INICIALES = ['Pierna', 'Pecho', 'Bíceps', 'Tríceps', 'Abdomen', 'Espalda', 'Hombro'];

const EJERCICIOS_INICIALES = [
  // Pecho (categoria-2)
  { nombre: 'Press de banca con barra', categoriaId: 'categoria-2', modalidad: 'discos', imagen: 'imagenes/pecho-press-banca-barra.jpg', descripcion: 'Acuéstate en el banco con los pies firmes en el piso y agarra la barra un poco más ancho que los hombros. Baja controlado hasta rozar el pecho y empuja hacia arriba sin bloquear de golpe los codos. Mantén los omóplatos retraídos contra el banco durante todo el movimiento.' },
  { nombre: 'Press inclinado con mancuerna', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-press-inclinado-mancuerna.jpg', descripcion: 'En un banco inclinado 30-45°, sube las mancuernas desde la altura del pecho hasta extender los brazos sin chocarlas arriba. Baja controlado sintiendo el estiramiento en la parte alta del pectoral. Evita arquear demasiado la espalda baja.' },
  { nombre: 'Aperturas con mancuerna', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-aperturas-mancuerna.jpg', descripcion: 'Acostado en banco plano, con los codos ligeramente flexionados, abre los brazos en arco hasta sentir el estiramiento del pecho y cierra juntando las mancuernas arriba como abrazando un tronco. Es un movimiento de aislamiento: usa poco peso y controla la bajada.' },
  { nombre: 'Press de pecho en polea (Marcy)', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-press-polea-marcy.jpg', descripcion: 'Ajusta las poleas a la altura del pecho, un pie adelantado para estabilidad, y empuja ambos mangos al frente hasta extender los brazos. Regresa controlado sin dejar que las poleas te jalen de golpe. Bueno para trabajar al fallo con seguridad porque no hay barra que se pueda caer.' },
  { nombre: 'Fondos (dips) para pecho', categoriaId: 'categoria-2', modalidad: 'PC', imagen: 'imagenes/pecho-fondos.jpg', descripcion: 'En las paralelas, inclina el torso hacia adelante y los codos ligeramente hacia afuera para enfatizar pectoral inferior. Baja hasta que el hombro quede a la altura del codo y empuja de regreso. Si es muy exigente, apoya los pies en el piso para restar peso corporal.' },
  { nombre: 'Flexiones (push-ups)', categoriaId: 'categoria-2', modalidad: 'PC', imagen: 'imagenes/pecho-flexiones.jpg', descripcion: 'Manos un poco más anchas que los hombros, cuerpo en línea recta de cabeza a talones. Baja el pecho casi hasta tocar el piso y empuja de regreso sin que la cadera se hunda. Sirve como calentamiento o accesorio de alto volumen.' },
  // Espalda (categoria-6)
  { nombre: 'Peso muerto con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-peso-muerto-barra.jpg', descripcion: 'Pies al ancho de cadera, barra pegada a las espinillas, espalda neutra y pecho arriba. Empuja el piso con las piernas mientras la barra sube pegada al cuerpo, terminando con cadera y rodillas extendidas. Es el ejercicio base de fuerza de toda la cadena posterior: prioriza técnica sobre peso.' },
  { nombre: 'Remo con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-remo-barra.jpg', descripcion: 'Con el torso inclinado unos 45°, espalda recta, jala la barra hacia el abdomen apretando los omóplatos al final del recorrido. Baja controlado sin dejar que la espalda se redondee. Aporta densidad y grosor a la espalda media.' },
  { nombre: 'Jalón al pecho en polea alta (Marcy)', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-jalon-pecho-marcy.jpg', descripcion: 'Agarre ancho en la barra alta, jala hacia la parte alta del pecho llevando los codos hacia abajo y atrás, sin usar impulso del torso. Sustituye a la dominada mientras construyes fuerza para hacerla sin ayuda. Controla la subida en vez de dejar que el peso te jale los brazos.' },
  { nombre: 'Remo bajo en polea (Marcy)', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-remo-bajo-marcy.jpg', descripcion: 'Sentado, rodillas ligeramente flexionadas, jala el mango hacia el abdomen manteniendo la espalda recta y apretando omóplatos. Deja que el torso se incline un poco adelante al soltar para aumentar el rango. Trabaja trapecio medio y romboides.' },
  { nombre: 'Remo con mancuerna a una mano', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-remo-mancuerna-una-mano.jpg', descripcion: 'Apoya una rodilla y una mano en el banco, espalda paralela al piso, y jala la mancuerna hacia la cadera llevando el codo pegado al cuerpo. Trabajar un lado a la vez ayuda a corregir desbalances entre tu lado dominante y el no dominante.' },
  { nombre: 'Superman', categoriaId: 'categoria-6', modalidad: 'PC', imagen: 'imagenes/espalda-superman.jpg', descripcion: 'Boca abajo en el piso, levanta al mismo tiempo brazos, pecho y piernas unos centímetros, apretando la zona lumbar y glúteos. Sostén 1-2 segundos arriba y baja controlado. Fortalece la zona lumbar y mejora la estabilidad de tronco sin necesidad de equipo.' },
  // Hombro (categoria-7)
  { nombre: 'Press militar con barra', categoriaId: 'categoria-7', modalidad: 'discos', imagen: 'imagenes/hombro-press-militar-barra.jpg', descripcion: 'Sentado o de pie, barra a la altura de los hombros, empuja hacia arriba hasta extender los brazos sin arquear en exceso la espalda baja. Baja controlado hasta la altura de la barbilla. Es el ejercicio de empuje vertical más completo para deltoides.' },
  { nombre: 'Press de hombro con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-press-mancuerna.jpg', descripcion: 'Mancuernas a la altura de los hombros con las palmas al frente, empuja hacia arriba hasta casi juntar las mancuernas sin bloquear los codos de golpe. El mayor rango de movimiento respecto a la barra ayuda a activar más fibra del deltoides.' },
  { nombre: 'Elevación lateral con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-elevacion-lateral.jpg', descripcion: 'De pie, mancuernas a los costados, sube los brazos hacia los lados hasta la altura del hombro con un ligero quiebre en el codo. Sube y baja controlado, sin usar impulso de la cadera. Es el ejercicio clave para dar la forma de "V" al hombro (deltoides medio).' },
  { nombre: 'Elevación frontal con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-elevacion-frontal.jpg', descripcion: 'De pie, sube una mancuerna (o ambas) al frente hasta la altura del hombro con el brazo casi extendido, y baja controlado. Aísla el deltoides anterior; no balancees el torso para generar impulso.' },
  { nombre: 'Face pull en polea (Marcy)', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-face-pull-marcy.jpg', descripcion: 'Con la polea a la altura de la cara y cuerda o mango doble, jala hacia tu rostro separando las manos y llevando los codos hacia atrás y arriba. Trabaja el deltoides posterior y los rotadores externos, clave para la salud del hombro si entrenas mucho press.' },
  { nombre: 'Flexión de pica contra pared', categoriaId: 'categoria-7', modalidad: 'PC', imagen: 'imagenes/hombro-flexion-pica.jpg', descripcion: 'Con los pies apoyados en una pared y el cuerpo casi vertical (o en posición de pica con cadera elevada si eres principiante), baja la cabeza hacia el piso doblando los codos y empuja de regreso. Es la versión de peso corporal más exigente para el deltoides; progresa gradualmente.' },
  // Bíceps (categoria-3)
  { nombre: 'Curl de bíceps con barra', categoriaId: 'categoria-3', modalidad: 'discos', imagen: 'imagenes/biceps-curl-barra.jpg', descripcion: 'De pie, agarre supino al ancho de hombros, sube la barra flexionando el codo sin mover los hombros ni balancear la cadera. Baja controlado hasta extensión casi completa. El básico para construir grosor de bíceps.' },
  { nombre: 'Curl martillo con mancuerna', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-martillo.jpg', descripcion: 'Con las mancuernas en agarre neutro (pulgares arriba), sube alternando o al mismo tiempo sin girar la muñeca. Trabaja bíceps y braquial, y ayuda al grosor del antebrazo.' },
  { nombre: 'Curl predicador en banco Scott (Marcy)', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-predicador-marcy.jpg', descripcion: 'Con el brazo apoyado sobre el banco inclinado del predicador, sube el peso sin despegar el tríceps del acolchado. Al fijar el brazo se elimina el impulso, aislando por completo el bíceps.' },
  { nombre: 'Curl en polea baja (Marcy)', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-polea-marcy.jpg', descripcion: 'De pie frente a la polea baja, sube el mango flexionando el codo sin mover el torso. La polea mantiene tensión constante en el músculo durante todo el recorrido, a diferencia de la mancuerna o barra.' },
  { nombre: 'Curl concentrado con mancuerna', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-concentrado.jpg', descripcion: 'Sentado, apoya el codo en la cara interna del muslo y sube la mancuerna flexionando solo el codo, sin mover el hombro. Es el ejercicio de mayor aislamiento para el pico del bíceps.' },
  // Tríceps (categoria-4)
  { nombre: 'Press francés con barra (skullcrusher)', categoriaId: 'categoria-4', modalidad: 'discos', imagen: 'imagenes/triceps-press-frances-barra.jpg', descripcion: 'Acostado en banco, baja la barra hacia la frente doblando solo los codos, manteniendo los brazos superiores quietos y perpendiculares al piso. Extiende de regreso sin abrir los codos hacia afuera. Trabaja las tres cabezas del tríceps con buen estiramiento.' },
  { nombre: 'Extensión de tríceps en polea alta (Marcy)', categoriaId: 'categoria-4', modalidad: 'niveles', imagen: 'imagenes/triceps-extension-polea-marcy.jpg', descripcion: 'De pie frente a la polea alta, codos pegados al torso, empuja la barra o cuerda hacia abajo hasta extender el brazo y regresa controlado sin que el codo se despegue del cuerpo. Es el clásico de gimnasio para definir tríceps.' },
  { nombre: 'Patada de tríceps con mancuerna', categoriaId: 'categoria-4', modalidad: 'niveles', imagen: 'imagenes/triceps-patada-mancuerna.jpg', descripcion: 'Con el torso inclinado y el brazo superior pegado al cuerpo y paralelo al piso, extiende el antebrazo hacia atrás hasta que el brazo quede recto, y regresa controlado. Aísla bien el tríceps si mantienes el codo fijo.' },
  { nombre: 'Fondos en paralelas para tríceps', categoriaId: 'categoria-4', modalidad: 'PC', imagen: 'imagenes/triceps-fondos-paralelas.jpg', descripcion: 'A diferencia del fondo de pecho, mantén el torso lo más vertical posible y los codos cerca del cuerpo. Baja hasta 90° en el codo y empuja de regreso. Muy exigente: si te falta fuerza, apoya un pie en el piso para asistirte.' },
  { nombre: 'Press cerrado con barra', categoriaId: 'categoria-4', modalidad: 'discos', imagen: 'imagenes/triceps-press-cerrado-barra.jpg', descripcion: 'Acostado en banco, agarre un poco más cerrado que el ancho de hombros, baja la barra hacia la parte baja del pecho manteniendo los codos cerca del torso, y empuja de regreso. Es un compuesto que suma tríceps y pecho, ideal para mover más peso que en aislamiento.' },
  // Pierna (categoria-1)
  { nombre: 'Sentadilla con barra', categoriaId: 'categoria-1', modalidad: 'discos', imagen: 'imagenes/pierna-sentadilla-barra.jpg', descripcion: 'Barra sobre la espalda alta (no el cuello), pies al ancho de hombros, baja como si te sentaras manteniendo el pecho arriba y las rodillas siguiendo la dirección de los pies. Baja al menos hasta que el muslo quede paralelo al piso y sube empujando por el talón. El patrón más importante para pierna completa.' },
  { nombre: 'Peso muerto rumano con barra', categoriaId: 'categoria-1', modalidad: 'discos', imagen: 'imagenes/pierna-peso-muerto-rumano.jpg', descripcion: 'Con las rodillas casi extendidas (ligero quiebre), empuja la cadera hacia atrás bajando la barra pegada a las piernas hasta sentir estiramiento en isquiotibiales, y regresa apretando el glúteo. La espalda se mantiene neutra todo el tiempo, no se redondea.' },
  { nombre: 'Extensión de cuádriceps en máquina (Marcy)', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-extension-cuadriceps-marcy.jpg', descripcion: 'Sentado en la máquina, extiende las rodillas hasta casi estirar por completo la pierna y baja controlado sin soltar de golpe. Aísla el cuádriceps sin involucrar cadera ni espalda.' },
  { nombre: 'Curl femoral en máquina (Marcy)', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-curl-femoral-marcy.jpg', descripcion: 'Sentado o acostado según tu máquina, flexiona la rodilla llevando el talón hacia el glúteo y regresa controlado. Trabaja isquiotibiales, el músculo antagonista del cuádriceps y clave para prevenir lesiones de rodilla.' },
  { nombre: 'Zancada con mancuerna', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-zancada-mancuerna.jpg', descripcion: 'Con una mancuerna en cada mano, da un paso al frente y baja hasta que ambas rodillas formen aproximadamente 90°, sin que la rodilla de atrás toque el piso con fuerza. Empuja con el talón delantero para regresar o continuar caminando.' },
  { nombre: 'Sentadilla búlgara con mancuerna', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-sentadilla-bulgara.jpg', descripcion: 'Con el pie de atrás elevado en un banco y una mancuerna en cada mano, baja doblando la rodilla delantera hasta formar casi 90° y sube empujando por ese talón. Trabaja pierna de forma unilateral, muy exigente para cuádriceps y glúteo.' },
  { nombre: 'Puente de glúteo', categoriaId: 'categoria-1', modalidad: 'PC', imagen: 'imagenes/pierna-puente-gluteo.jpg', descripcion: 'Acostado boca arriba, rodillas flexionadas y pies apoyados, sube la cadera apretando el glúteo hasta que el cuerpo forme una línea recta de hombro a rodilla, y baja controlado. Para más intensidad, hazlo con una sola pierna apoyada.' },
  // Abdomen (categoria-5)
  { nombre: 'Rueda abdominal (ab wheel rollout)', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-rueda-abdominal.jpg', descripcion: 'De rodillas, sostén la rueda con ambas manos y rueda hacia adelante extendiendo el cuerpo lo más que puedas sin que la cadera se hunda, manteniendo el abdomen apretado todo el tiempo. Regresa a la posición inicial usando el core, no la espalda baja. Empieza con un rango corto si eres principiante.' },
  { nombre: 'Plancha (plank)', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-plancha.jpg', descripcion: 'Apoya antebrazos y puntas de pies, cuerpo en línea recta de cabeza a talón, abdomen y glúteo apretados. Sostén sin que la cadera suba ni se hunda. Es un ejercicio isométrico: mide tu progreso en tiempo sostenido con buena forma, no solo en segundos totales.' },
  { nombre: 'Crunch en polea alta (Marcy)', categoriaId: 'categoria-5', modalidad: 'niveles', imagen: 'imagenes/abdomen-crunch-polea-marcy.jpg', descripcion: 'De rodillas frente a la polea alta con la cuerda detrás de la cabeza, flexiona el torso hacia abajo usando el abdomen, no los brazos ni la cadera. Permite agregar carga progresiva al abdomen una vez que el crunch normal se queda corto.' },
  { nombre: 'Elevación de piernas', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-elevacion-piernas.jpg', descripcion: 'Colgado de una barra (o acostado en un banco si aún no tienes suficiente fuerza de agarre), sube las piernas flexionando la cadera hasta donde puedas sin balancear el cuerpo, y baja controlado. Trabaja la parte baja del abdomen y el control de cadera.' },
  { nombre: 'Crunch bicicleta', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-crunch-bicicleta.jpg', descripcion: 'Acostado boca arriba, manos detrás de la cabeza, lleva un codo hacia la rodilla contraria mientras extiendes la otra pierna, alternando en un movimiento de pedaleo controlado. Trabaja el recto abdominal y los oblicuos al mismo tiempo.' },
  { nombre: 'Giro ruso', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-giro-ruso.jpg', descripcion: 'Sentado con las rodillas flexionadas y el torso inclinado hacia atrás unos 45°, gira el tronco de lado a lado tocando el piso a cada costado (con o sin peso en las manos). Mantén el abdomen apretado para que el giro venga del torso, no solo de los brazos.' },
];

const ahoraISO = () => new Date().toISOString();
const idNuevo = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function crearDocumentoEjercicio(fecha = ahoraISO()) {
  return {
    version: 2,
    categorias: CATEGORIAS_INICIALES.map((nombre, i) => ({ id: `categoria-${i + 1}`, nombre, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    ejercicios: EJERCICIOS_INICIALES.map((e, i) => ({ id: `ejercicio-inicial-${i + 1}`, ...e, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    rutinas: [], sesiones: [], hiits: [], modificadoEn: fecha,
  };
}

function calcularDuracionHiit({ vueltas, actividadSeg, descansoSeg }) {
  const n = Number(vueltas), actividad = Number(actividadSeg), descanso = Number(descansoSeg);
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(actividad) || actividad < 1 || !Number.isFinite(descanso) || descanso < 0) throw new Error('Configuración HIIT inválida');
  return n * actividad + Math.max(0, n - 1) * descanso;
}

function normalizarEjercicio(ejercicio, fecha = ahoraISO()) {
  const nombre = String(ejercicio.nombre || '').trim();
  const categoriaId = String(ejercicio.categoriaId || '').trim();
  if (!nombre) throw new Error('Nombre de ejercicio requerido');
  if (!categoriaId) throw new Error('El ejercicio requiere una categoría');
  if (!MODALIDADES_CARGA.includes(ejercicio.modalidad)) throw new Error('Modalidad inválida');
  return { ...ejercicio, id: ejercicio.id || idNuevo(), nombre, categoriaId, modalidad: ejercicio.modalidad, activo: ejercicio.activo !== false, creadoEn: ejercicio.creadoEn || fecha, modificadoEn: fecha };
}

function normalizarDiscos(carga = {}) {
  const discos = { grande: Number(carga.grande || 0), chico: Number(carga.chico || 0) };
  if (Object.values(discos).some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Las cantidades de discos deben ser enteros no negativos');
  return discos;
}

function normalizarSerie(serie, fecha = ahoraISO()) {
  const repeticiones = Number(serie.repeticiones);
  if (!serie.ejercicioId || !Number.isInteger(repeticiones) || repeticiones < 1) throw new Error('Serie inválida');
  if (!MODALIDADES_CARGA.includes(serie.modalidad)) throw new Error('Modalidad inválida');
  let carga = null;
  if (serie.modalidad === 'discos') carga = normalizarDiscos(serie.carga);
  else if (serie.modalidad !== 'PC') {
    carga = Number(serie.carga);
    if (!Number.isFinite(carga) || carga < 0) throw new Error('Carga inválida');
  }
  return { ...serie, id: serie.id || idNuevo(), repeticiones, carga, descansoPlaneadoSeg: Math.max(0, Number(serie.descansoPlaneadoSeg || 0)), descansoRealSeg: Math.max(0, Number(serie.descansoRealSeg || 0)), extraSeg: Math.max(0, Number(serie.extraSeg || 0)), creadoEn: serie.creadoEn || fecha, modificadoEn: fecha };
}

function crearHiit(config, inicioMs = Date.now()) {
  const planeadoSeg = calcularDuracionHiit(config);
  return { id: config.id || idNuevo(), nombre: String(config.nombre || '').trim(), vueltas: Number(config.vueltas), actividadSeg: Number(config.actividadSeg), descansoSeg: Number(config.descansoSeg), cuentaRegresivaSeg: Math.max(0, Number(config.cuentaRegresivaSeg || 0)), planeadoSeg, estado: Number(config.cuentaRegresivaSeg || 0) > 0 ? 'cuenta_regresiva' : 'actividad', fase: Number(config.cuentaRegresivaSeg || 0) > 0 ? 'cuenta_regresiva' : 'actividad', vuelta: 1, inicioMs, faseInicioMs: inicioMs, activoAcumuladoMs: 0, pausaInicioMs: null };
}

function pausarHiit(hiit, ahoraMs = Date.now()) {
  if (hiit.estado === 'pausado') return hiit;
  return { ...hiit, estadoAntesPausa: hiit.estado, estado: 'pausado', activoAcumuladoMs: (hiit.activoAcumuladoMs || 0) + Math.max(0, ahoraMs - hiit.faseInicioMs), pausaInicioMs: ahoraMs };
}

function reanudarHiit(hiit, ahoraMs = Date.now()) {
  if (hiit.estado !== 'pausado') return hiit;
  return { ...hiit, estado: hiit.estadoAntesPausa || 'actividad', faseInicioMs: ahoraMs, pausaInicioMs: null };
}

function finalizarHiit(datos) {
  const planeado = Number(datos.planeadoSeg);
  if (!Number.isFinite(planeado) || planeado < 1) throw new Error('Duración planeada inválida');
  const finMs = Number(datos.finMs);
  const activoMs = Number.isFinite(datos.activoAcumuladoMs)
    ? datos.activoAcumuladoMs + (datos.estado === 'pausado' ? 0 : Math.max(0, finMs - Number(datos.faseInicioMs || datos.inicioMs)))
    : Math.max(0, finMs - Number(datos.inicioMs));
  const duracionRealSeg = Math.max(0, Math.round(activoMs / 1000));
  return { duracionRealSeg, porcentaje: datos.detenido ? Math.min(100, Math.round(duracionRealSeg / planeado * 100)) : 100, estado: datos.detenido ? 'detenida' : 'completada' };
}

function sumarExtensionDescanso(descansoSeg, toques = 1) {
  return Math.max(0, Number(descansoSeg) || 0) + Math.max(0, Number(toques) || 0) * 5;
}

function ajustarCantidad(valor, direccion, { minimo = 0, maximo = Number.POSITIVE_INFINITY, paso = 1 } = {}) {
  const actual = Number(valor) || 0;
  const siguiente = actual + (direccion < 0 ? -paso : paso);
  return Math.min(maximo, Math.max(minimo, siguiente));
}

function sonidosEnSegundo({ tipo, restanteSeg, esInicio = false }) {
  if (tipo === 'descanso' && esInicio) return ['rapido', 'rapido', 'rapido'];
  if (tipo === 'cuenta' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
  if (tipo === 'descanso' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
  if (tipo === 'actividad' && esInicio) return ['largo'];
  if (tipo === 'final') return ['final'];
  return [];
}

function normalizarRutina(rutina, fecha = ahoraISO()) {
  const nombre = String(rutina.nombre || '').trim();
  if (!nombre) throw new Error('Nombre de rutina requerido');
  if (!Array.isArray(rutina.entradas) || !rutina.entradas.length) throw new Error('Agrega al menos un ejercicio');
  const entradas = rutina.entradas.map((e, orden) => {
    const series = Number(e.series), repeticiones = Number(e.repeticiones), descansoSeg = Number(e.descansoSeg);
    if (!e.ejercicioId || !Number.isInteger(series) || series < 1 || !Number.isInteger(repeticiones) || repeticiones < 1 || !Number.isFinite(descansoSeg) || descansoSeg < 0) throw new Error('Entrada de rutina inválida');
    return { ejercicioId: e.ejercicioId, orden, series, repeticiones, descansoSeg };
  });
  return { ...rutina, id: rutina.id || idNuevo(), nombre, entradas, ejercicioIds: entradas.map((e) => e.ejercicioId), activo: rutina.activo !== false, creadoEn: rutina.creadoEn || fecha, modificadoEn: fecha };
}

function siguientePasoRutina(paso, entradas) {
  const actual = entradas[paso.ejercicioIndice];
  if (!actual) return { ...paso, terminada: true };
  if (paso.serieNumero < actual.series) return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero + 1, terminada: false };
  if (paso.ejercicioIndice + 1 < entradas.length) return { ejercicioIndice: paso.ejercicioIndice + 1, serieNumero: 1, terminada: false };
  return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero, terminada: true };
}

  return { MODALIDADES_CARGA, CATEGORIAS_INICIALES, crearDocumentoEjercicio, calcularDuracionHiit, normalizarEjercicio, normalizarSerie, crearHiit, pausarHiit, reanudarHiit, finalizarHiit, sumarExtensionDescanso, ajustarCantidad, sonidosEnSegundo, normalizarRutina, siguientePasoRutina };
})();
const MODALIDADES_CARGA = ejercicio_modelo.MODALIDADES_CARGA;
const CATEGORIAS_INICIALES = ejercicio_modelo.CATEGORIAS_INICIALES;
const crearDocumentoEjercicio = ejercicio_modelo.crearDocumentoEjercicio;
const calcularDuracionHiit = ejercicio_modelo.calcularDuracionHiit;
const normalizarEjercicio = ejercicio_modelo.normalizarEjercicio;
const normalizarSerie = ejercicio_modelo.normalizarSerie;
const crearHiit = ejercicio_modelo.crearHiit;
const pausarHiit = ejercicio_modelo.pausarHiit;
const reanudarHiit = ejercicio_modelo.reanudarHiit;
const finalizarHiit = ejercicio_modelo.finalizarHiit;
const sumarExtensionDescanso = ejercicio_modelo.sumarExtensionDescanso;
const ajustarCantidad = ejercicio_modelo.ajustarCantidad;
const sonidosEnSegundo = ejercicio_modelo.sonidosEnSegundo;
const normalizarRutina = ejercicio_modelo.normalizarRutina;
const siguientePasoRutina = ejercicio_modelo.siguientePasoRutina;

// ── peso/js/ejercicio_almacen.js ──────────────────────────────────────────
const ejercicio_almacen = (function () {
const claveDatos = (u) => `cp_ejercicio_datos:${u}`;
const claveCola = (u) => `cp_ejercicio_cola:${u}`;
const obtenerStorage = (s) => s || localStorage;

function leerJSON(storage, clave, defecto) {
  try { return JSON.parse(storage.getItem(clave)) || defecto; } catch { return defecto; }
}

function leerLocal(usuario, storage) {
  return leerJSON(obtenerStorage(storage), claveDatos(usuario), crearDocumentoEjercicio());
}

function guardarLocal(usuario, datos, storage) {
  obtenerStorage(storage).setItem(claveDatos(usuario), JSON.stringify(datos));
  return datos;
}

function leerPendientes(usuario, storage) {
  return leerJSON(obtenerStorage(storage), claveCola(usuario), []);
}

function guardarPendientes(usuario, cola, storage) {
  obtenerStorage(storage).setItem(claveCola(usuario), JSON.stringify(cola));
}

function mutarLocal(usuario, mutador, { storage, now = () => new Date().toISOString(), uuid = () => crypto.randomUUID(), tipo = 'reemplazar_documento', entidadId = 'documento' } = {}) {
  const s = obtenerStorage(storage), datos = structuredClone(leerLocal(usuario, s));
  mutador(datos);
  const modificadoEn = now();
  datos.modificadoEn = modificadoEn;
  guardarLocal(usuario, datos, s);
  const operacion = { opId: uuid(), tipo, entidadId, modificadoEn };
  guardarPendientes(usuario, [...leerPendientes(usuario, s), operacion], s);
  return { datos, operacion };
}

function confirmarOperacion(usuario, opId, storage) {
  const s = obtenerStorage(storage);
  guardarPendientes(usuario, leerPendientes(usuario, s).filter((o) => o.opId !== opId), s);
}

function mezclarLista(a = [], b = []) {
  const mapa = new Map();
  for (const item of [...b, ...a]) {
    const anterior = mapa.get(item.id);
    if (!anterior || String(item.modificadoEn || '') >= String(anterior.modificadoEn || '')) mapa.set(item.id, item);
  }
  return [...mapa.values()];
}

function mezclarDocumento(local, remoto) {
  const base = crearDocumentoEjercicio();
  const resultado = { ...base, ...remoto, ...local };
  for (const campo of ['categorias', 'ejercicios', 'rutinas', 'sesiones', 'hiits']) resultado[campo] = mezclarLista(local?.[campo], remoto?.[campo]);
  resultado.version = 2;
  resultado.modificadoEn = [local?.modificadoEn, remoto?.modificadoEn].filter(Boolean).sort().at(-1) || base.modificadoEn;
  return resultado;
}

async function sincronizarPendientes(usuario, api, { storage, alCambiar } = {}) {
  const s = obtenerStorage(storage);
  for (const operacion of leerPendientes(usuario, s)) {
    const respuesta = await api.guardarOperacionEjercicio(operacion, leerLocal(usuario, s));
    if (!respuesta?.ok) throw new Error(respuesta?.error || 'No se pudo sincronizar Ejercicio');
    confirmarOperacion(usuario, operacion.opId, s);
    alCambiar?.();
  }
  return leerPendientes(usuario, s).length;
}

  return { leerLocal, guardarLocal, leerPendientes, mutarLocal, confirmarOperacion, mezclarDocumento, sincronizarPendientes };
})();
const leerLocal = ejercicio_almacen.leerLocal;
const guardarLocal = ejercicio_almacen.guardarLocal;
const leerPendientes = ejercicio_almacen.leerPendientes;
const mutarLocal = ejercicio_almacen.mutarLocal;
const confirmarOperacion = ejercicio_almacen.confirmarOperacion;
const mezclarDocumento = ejercicio_almacen.mezclarDocumento;
const sincronizarPendientes = ejercicio_almacen.sincronizarPendientes;

// ── peso/js/ejercicio_calculos.js ──────────────────────────────────────────
const ejercicio_calculos = (function () {
function filtrarPeriodo(registros, periodo = 'total', ahora = new Date()) {
  if (periodo === 'total') return [...registros];
  const limite = new Date(ahora);
  if (periodo === 'semana') limite.setDate(limite.getDate() - 7);
  else if (periodo === 'mes') limite.setMonth(limite.getMonth() - 1);
  return registros.filter((r) => new Date(r.fecha || r.inicio || r.creadoEn) >= limite);
}

function seriesContables(sesiones = []) {
  return sesiones.filter((s) => s.estado === 'completada').flatMap((s) => s.series || []);
}

function resumenModalidades(series = []) {
  const r = { discos: { grande: 0, chico: 0 }, niveles: { mejor: 0, repeticiones: 0 }, PC: { repeticiones: 0, series: 0 } };
  for (const s of series) {
    const reps = Number(s.repeticiones || 0);
    if (s.modalidad === 'discos') for (const tam of ['grande', 'chico']) r.discos[tam] += Number(s.carga?.[tam] || 0) * reps;
    else if (s.modalidad === 'niveles') { r.niveles.mejor = Math.max(r.niveles.mejor, Number(s.carga || 0)); r.niveles.repeticiones += reps; }
    else if (s.modalidad === 'PC') { r.PC.repeticiones += reps; r.PC.series += 1; }
  }
  return r;
}

function descansoPromedio(series = []) {
  const xs = series.map((s) => Number(s.descansoRealSeg)).filter(Number.isFinite);
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
}

function resumenHiit(hiits = []) {
  if (!hiits.length) return { minutos: 0, porcentajePromedio: 0, completadas: 0, abandonos: 0 };
  return { minutos: Math.round(hiits.reduce((n, h) => n + Number(h.duracionRealSeg || 0), 0) / 60), porcentajePromedio: Math.round(hiits.reduce((n, h) => n + Number(h.porcentaje || 0), 0) / hiits.length), completadas: hiits.filter((h) => h.estado === 'completada').length, abandonos: hiits.filter((h) => h.estado === 'detenida').length };
}

function serieProgreso(sesiones = [], ejercicioId) {
  return sesiones.filter((s) => s.estado === 'completada').flatMap((s) => (s.series || []).filter((x) => x.ejercicioId === ejercicioId).map((x) => ({ fecha: s.fecha || s.fin, valor: x.modalidad === 'niveles' ? Number(x.carga || 0) : Number(x.repeticiones || 0), unidad: x.modalidad })));
}

  return { filtrarPeriodo, seriesContables, resumenModalidades, descansoPromedio, resumenHiit, serieProgreso };
})();
const filtrarPeriodo = ejercicio_calculos.filtrarPeriodo;
const seriesContables = ejercicio_calculos.seriesContables;
const resumenModalidades = ejercicio_calculos.resumenModalidades;
const descansoPromedio = ejercicio_calculos.descansoPromedio;
const resumenHiit = ejercicio_calculos.resumenHiit;
const serieProgreso = ejercicio_calculos.serieProgreso;

// ── peso/js/ejercicio_graficas.js ──────────────────────────────────────────
const ejercicio_graficas = (function () {
function svgProgreso(puntos = [], { unidad = '', titulo = 'Progreso' } = {}) {
  if (!puntos.length) return '<p class="texto-suave">Aún no hay datos para esta gráfica.</p>';
  const width = Math.max(320, puntos.length * 56), height = 180, pad = 28;
  const valores = puntos.map((p) => Number(p.valor || 0)), max = Math.max(...valores, 1);
  const coords = puntos.map((p, i) => `${pad + i * ((width - pad * 2) / Math.max(1, puntos.length - 1))},${height - pad - (Number(p.valor || 0) / max) * (height - pad * 2)}`);
  return `<svg class="grafica-ejercicio" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(titulo)}"><polyline fill="none" stroke="currentColor" stroke-width="4" points="${coords.join(' ')}"/>${puntos.map((p, i) => { const [x, y] = coords[i].split(','); return `<circle cx="${x}" cy="${y}" r="5"><title>${escapeHTML(`${p.fecha}: ${p.valor} ${unidad}`)}</title></circle>`; }).join('')}</svg>`;
}

  return { svgProgreso };
})();
const svgProgreso = ejercicio_graficas.svgProgreso;

// ── peso/js/ejercicio_ui.js ──────────────────────────────────────────
const ejercicio_ui = (function () {
const S = { datos: null, tab: 'entrenar', toast: () => {}, audio: null, intervalo: null, wake: null, hiit: null, entrenamiento: null, descanso: null, rutinaSeleccionada: '', periodo: 'semana', sonidosEmitidos: new Set(), redLista: false };
const uid = () => crypto.randomUUID();
const iso = () => new Date().toISOString();

function guardar(mutador, tipo = 'editar', entidadId = 'documento') {
  const r = mutarLocal(getUsuario(), mutador, { tipo, entidadId });
  S.datos = r.datos;
  sincronizar().catch(() => {});
  S.toast('Guardado ✓');
  return r.datos;
}

async function sincronizar() {
  await sincronizarPendientes(getUsuario(), api, { alCambiar: actualizarSync });
  actualizarSync();
}

async function refrescarRemoto() {
  await sincronizar().catch(() => {});
  const r = await api.leerEjercicio();
  if (r.ok) { S.datos = mezclarDocumento(S.datos, r.datos); guardarLocal(getUsuario(), S.datos); if (document.getElementById('vista-ejercicio')?.classList.contains('activa')) renderModuloEjercicio(); }
}

function actualizarSync() {
  const el = document.getElementById('ejercicio-sync');
  if (el) el.textContent = leerPendientes(getUsuario()).length ? `${leerPendientes(getUsuario()).length} pendiente(s)` : 'Drive al día';
}

async function iniciarModuloEjercicio(toast) {
  S.toast = toast || S.toast;
  S.datos = leerLocal(getUsuario());
  if (!S.datos?.version) S.datos = crearDocumentoEjercicio();
  try { const r = await api.leerEjercicio(); if (r.ok) { S.datos = mezclarDocumento(S.datos, r.datos); guardarLocal(getUsuario(), S.datos); } } catch {}
  await sincronizar().catch(() => {});
  if (!S.redLista) { S.redLista = true; addEventListener('online', () => refrescarRemoto().catch(() => {})); document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescarRemoto().catch(() => {}); }); }
}

function salirModuloEjercicio() { liberarWake(); }

function renderModuloEjercicio() {
  if (!S.datos) S.datos = leerLocal(getUsuario());
  const raiz = document.getElementById('ejercicio-contenido');
  raiz.innerHTML = `<header class="ejercicio-hero"><div><span class="ejercicio-kicker">ENTRENAMIENTO</span><h2>Muévete. Registra. Mejora.</h2></div><small id="ejercicio-sync"></small></header><nav id="ejercicio-tabs" class="ejercicio-tabs" role="tablist"><button role="tab" data-etab="entrenar">Entrenar</button><button role="tab" data-etab="hiit">HIIT</button><button role="tab" data-etab="progreso">Progreso</button></nav><main id="ejercicio-panel"></main><dialog id="ejercicio-modal" class="ejercicio-modal"><div class="modal-ejercicio-contenido"><header><div><small id="modal-kicker">CONFIGURAR</small><h2 id="modal-titulo"></h2></div><button type="button" class="modal-cerrar" aria-label="Cerrar">×</button></header><div id="modal-cuerpo"></div></div></dialog>`;
  raiz.querySelectorAll('[data-etab]').forEach((b) => { b.setAttribute('aria-selected', String(b.dataset.etab === S.tab)); b.onclick = () => { S.tab = b.dataset.etab; renderModuloEjercicio(); }; });
  actualizarSync();
  raiz.querySelector('.modal-cerrar').onclick = cerrarModal;
  if (S.tab === 'entrenar') renderEntrenar(); else if (S.tab === 'hiit') renderHiit(); else renderProgreso();
}

function abrirModal(titulo, html, configurar, kicker = 'CONFIGURAR') {
  const dialog = document.getElementById('ejercicio-modal');
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-kicker').textContent = kicker;
  document.getElementById('modal-cuerpo').innerHTML = html;
  configurar?.(document.getElementById('modal-cuerpo'), dialog);
  if (!dialog.open) dialog.showModal();
}

function cerrarModal() { document.getElementById('ejercicio-modal')?.close(); }

function abrirDetalleEjercicio(ejercicioId, volver) {
  const ejercicio = S.datos.ejercicios.find((e) => e.id === ejercicioId);
  if (!ejercicio) return;
  const imagenHtml = ejercicio.imagen ? `<img src="${escapeAtributo(ejercicio.imagen)}" alt="${escapeAtributo(ejercicio.nombre)}" loading="lazy">` : '';
  const descripcionHtml = `<p>${escapeHTML(ejercicio.descripcion || 'Este ejercicio todavía no tiene descripción.')}</p>`;
  const volverHtml = volver ? '<button type="button" id="detalle-volver" class="btn-primario ancho-completo">← Volver</button>' : '';
  abrirModal(ejercicio.nombre, `<div class="detalle-ejercicio">${imagenHtml}${descripcionHtml}${volverHtml}</div>`, (c) => {
    c.querySelector('#detalle-volver')?.addEventListener('click', volver);
  }, 'EJERCICIO');
}
function opciones(items, seleccionado = '') { return (items || []).filter((x) => x.activo !== false).map((x) => `<option value="${escapeAtributo(x.id)}" ${x.id === seleccionado ? 'selected' : ''}>${escapeHTML(x.nombre)}</option>`).join(''); }

function renderEntrenar() {
  const p = document.getElementById('ejercicio-panel');
  if (S.entrenamiento) return renderEntrenamientoActivo();
  const rutinas = (S.datos.rutinas || []).filter((r) => r.activo !== false);
  const seleccionada = rutinas.find((r) => r.id === S.rutinaSeleccionada) || rutinas[0];
  if (seleccionada) S.rutinaSeleccionada = seleccionada.id;
  p.innerHTML = `<section class="entrenar-portada"><div class="entrenar-icono">⚡</div><h1>${seleccionada ? escapeHTML(seleccionada.nombre) : 'Tu entrenamiento empieza aquí'}</h1><p>${seleccionada ? `${(seleccionada.entradas || []).length} ejercicios · ${seleccionada.entradas?.reduce((n, e) => n + e.series, 0) || 0} series` : 'Crea ejercicios y arma tu primera rutina.'}</p>${rutinas.length ? `<label class="selector-rutina">Rutina<select id="rutina-seleccion">${opciones(rutinas, S.rutinaSeleccionada)}</select></label><div class="resumen-rutina">${(seleccionada.entradas || []).map((e, i) => { const ej = S.datos.ejercicios.find((x) => x.id === e.ejercicioId); return `<div><b>${i + 1}</b><span><strong>${escapeHTML(ej?.nombre || 'Ejercicio')}</strong><small>${e.series} × ${e.repeticiones} · descanso ${e.descansoSeg}s</small></span></div>`; }).join('')}</div><button id="comenzar-entrenamiento" class="btn-entrenar">Comenzar entrenamiento</button>` : '<button id="crear-primer-ejercicio" class="btn-entrenar">Crear primer ejercicio</button>'}<div class="acciones-gestion"><button id="gestionar-ejercicios">Ejercicios</button><button id="gestionar-rutinas">Rutinas</button></div></section>`;
  p.querySelector('#rutina-seleccion')?.addEventListener('change', (e) => { S.rutinaSeleccionada = e.target.value; renderEntrenar(); });
  p.querySelector('#comenzar-entrenamiento')?.addEventListener('click', comenzarEntrenamiento);
  p.querySelector('#crear-primer-ejercicio')?.addEventListener('click', () => abrirEjercicios());
  p.querySelector('#gestionar-ejercicios').onclick = () => abrirEjercicios();
  p.querySelector('#gestionar-rutinas').onclick = () => abrirRutinas();
}

function abrirEjercicios() {
  const ejercicios = (S.datos.ejercicios || []).filter((e) => e.activo !== false);
  abrirModal('Ejercicios', `<div class="modal-toolbar"><button type="button" id="nuevo-ejercicio" class="btn-primario">+ Nuevo ejercicio</button><button type="button" id="categorias">Categorías</button></div><div class="lista-modal">${ejercicios.map((e) => `<button type="button" data-ejercicio="${e.id}"><span><b>${escapeHTML(e.nombre)}</b><small>${escapeHTML(S.datos.categorias.find((c) => c.id === e.categoriaId)?.nombre || '')} · ${escapeHTML(e.modalidad)}</small></span><i>Editar</i></button>`).join('') || '<p class="estado-vacio">Todavía no hay ejercicios.</p>'}</div>`, (c) => {
    c.querySelector('#nuevo-ejercicio').onclick = () => abrirFormularioEjercicio();
    c.querySelector('#categorias').onclick = abrirCategorias;
    c.querySelectorAll('[data-ejercicio]').forEach((b) => b.onclick = () => abrirFormularioEjercicio(b.dataset.ejercicio));
  }, 'CATÁLOGO');
}

function abrirCategorias() {
  abrirModal('Categorías', `<form id="form-categoria" class="form-modal"><input type="hidden" id="categoria-id"><label>Nombre<input id="categoria-nombre" required maxlength="40"></label><button class="btn-primario">Guardar categoría</button></form><div class="chips-editables">${S.datos.categorias.filter((c) => c.activo !== false).map((c) => `<button type="button" data-categoria="${c.id}">${escapeHTML(c.nombre)} · Editar</button>`).join('')}</div>`, (c) => {
    c.querySelectorAll('[data-categoria]').forEach((b) => b.onclick = () => { const cat = S.datos.categorias.find((x) => x.id === b.dataset.categoria); c.querySelector('#categoria-id').value = cat.id; c.querySelector('#categoria-nombre').value = cat.nombre; c.querySelector('#categoria-nombre').focus(); });
    c.querySelector('#form-categoria').onsubmit = (e) => { e.preventDefault(); const id = c.querySelector('#categoria-id').value, nombre = c.querySelector('#categoria-nombre').value.trim(); if (!nombre) return; guardar((d) => { const x = d.categorias.find((y) => y.id === id); if (x) Object.assign(x, { nombre, modificadoEn: iso() }); else d.categorias.push({ id: uid(), nombre, activo: true, creadoEn: iso(), modificadoEn: iso() }); }, 'guardar_categoria', id || 'nueva'); cerrarModal(); renderEntrenar(); };
  });
}

function abrirFormularioEjercicio(id = '') {
  const actual = S.datos.ejercicios.find((e) => e.id === id);
  abrirModal(actual ? 'Editar ejercicio' : 'Nuevo ejercicio', `<form id="form-ejercicio" class="form-modal"><label>Nombre<input id="ejercicio-nombre" required maxlength="60" value="${escapeAtributo(actual?.nombre || '')}"></label><label>Categoría<select id="ejercicio-categoria" required>${opciones(S.datos.categorias, actual?.categoriaId)}</select></label><fieldset><legend>Modalidad</legend><label class="opcion-modalidad"><input type="radio" name="modalidad" value="discos" ${!actual || actual.modalidad === 'discos' ? 'checked' : ''}><span>Discos<small>Grande y chico por lado</small></span></label><label class="opcion-modalidad"><input type="radio" name="modalidad" value="niveles" ${actual?.modalidad === 'niveles' ? 'checked' : ''}><span>Niveles<small>Máquina o mancuerna (un número)</small></span></label><label class="opcion-modalidad"><input type="radio" name="modalidad" value="PC" ${actual?.modalidad === 'PC' ? 'checked' : ''}><span>PC<small>Peso corporal</small></span></label></fieldset><label>Descripción / cómo hacerlo<textarea id="ejercicio-descripcion" rows="4" maxlength="600" placeholder="Posición inicial, ejecución y algún tip técnico">${escapeHTML(actual?.descripcion || '')}</textarea></label><button class="btn-primario">Guardar ejercicio</button></form>`, (c) => {
    c.querySelector('#form-ejercicio').onsubmit = (e) => { e.preventDefault(); try { const ejercicio = normalizarEjercicio({ ...actual, id: actual?.id || uid(), nombre: c.querySelector('#ejercicio-nombre').value, categoriaId: c.querySelector('#ejercicio-categoria').value, modalidad: c.querySelector('[name="modalidad"]:checked').value, descripcion: c.querySelector('#ejercicio-descripcion').value.trim() }); guardar((d) => { const i = d.ejercicios.findIndex((x) => x.id === ejercicio.id); if (i >= 0) d.ejercicios[i] = ejercicio; else d.ejercicios.push(ejercicio); }, 'guardar_ejercicio', ejercicio.id); cerrarModal(); renderEntrenar(); } catch (err) { S.toast(err.message, true); } };
  });
}

function abrirRutinas() {
  const rutinas = S.datos.rutinas.filter((r) => r.activo !== false);
  abrirModal('Rutinas', `<button type="button" id="nueva-rutina" class="btn-primario ancho-completo">+ Nueva rutina</button><div class="lista-modal">${rutinas.map((r) => `<button type="button" data-rutina="${r.id}"><span><b>${escapeHTML(r.nombre)}</b><small>${(r.entradas || []).length} ejercicios</small></span><i>Editar</i></button>`).join('') || '<p class="estado-vacio">Crea una rutina y agrega ejercicios.</p>'}</div>`, (c) => { c.querySelector('#nueva-rutina').onclick = () => abrirConstructorRutina(); c.querySelectorAll('[data-rutina]').forEach((b) => b.onclick = () => abrirConstructorRutina(b.dataset.rutina)); }, 'PLANIFICACIÓN');
}

function abrirConstructorRutina(id = '') {
  const actual = S.datos.rutinas.find((r) => r.id === id);
  const borrador = { id: actual?.id || '', nombre: actual?.nombre || '', entradas: structuredClone(actual?.entradas || []) };
  const pintar = () => abrirModal(actual ? 'Editar rutina' : 'Nueva rutina', `<form id="form-rutina" class="form-modal"><label>Nombre de la rutina<input id="rutina-nombre" required value="${escapeAtributo(borrador.nombre)}" placeholder="Ej. Pecho y tríceps"></label><div class="constructor-rutina"><div class="constructor-titulo"><b>Ejercicios</b><button type="button" id="agregar-ejercicio">+ Agregar ejercicio</button></div>${borrador.entradas.map((e, i) => { const ej = S.datos.ejercicios.find((x) => x.id === e.ejercicioId); return `<article data-entrada="${i}"><header><span><b>${i + 1}. ${escapeHTML(ej?.nombre || 'Ejercicio')}</b><small>${escapeHTML(ej?.modalidad || '')}</small></span><div><button type="button" data-subir="${i}" aria-label="Subir">↑ Subir</button><button type="button" data-bajar="${i}" aria-label="Bajar">↓ Bajar</button><button type="button" data-quitar="${i}">Quitar</button></div></header><div class="grid-form"><label>Series<input data-campo="series" type="number" min="1" value="${e.series}"></label><label>Repeticiones<input data-campo="repeticiones" type="number" min="1" value="${e.repeticiones}"></label><label>Descanso (s)<input data-campo="descansoSeg" type="number" min="0" value="${e.descansoSeg}"></label></div></article>`; }).join('') || '<p class="estado-vacio">Pulsa “Agregar ejercicio” para construir la rutina.</p>'}</div><button class="btn-primario ancho-completo">Guardar rutina</button></form>`, (c) => {
      c.querySelector('#rutina-nombre').oninput = (e) => { borrador.nombre = e.target.value; };
      c.querySelectorAll('[data-entrada]').forEach((art) => art.querySelectorAll('[data-campo]').forEach((inp) => inp.oninput = () => { borrador.entradas[Number(art.dataset.entrada)][inp.dataset.campo] = Number(inp.value); }));
      c.querySelector('#agregar-ejercicio').onclick = () => abrirSelectorEjercicio(borrador, pintar);
      c.querySelectorAll('[data-quitar]').forEach((b) => b.onclick = () => { borrador.entradas.splice(Number(b.dataset.quitar), 1); pintar(); });
      c.querySelectorAll('[data-subir]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.subir); if (i > 0) [borrador.entradas[i - 1], borrador.entradas[i]] = [borrador.entradas[i], borrador.entradas[i - 1]]; pintar(); });
      c.querySelectorAll('[data-bajar]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.bajar); if (i < borrador.entradas.length - 1) [borrador.entradas[i + 1], borrador.entradas[i]] = [borrador.entradas[i], borrador.entradas[i + 1]]; pintar(); });
      c.querySelector('#form-rutina').onsubmit = (e) => { e.preventDefault(); try { const rutina = normalizarRutina({ ...actual, id: actual?.id || uid(), nombre: borrador.nombre, entradas: borrador.entradas }); guardar((d) => { const i = d.rutinas.findIndex((x) => x.id === rutina.id); if (i >= 0) d.rutinas[i] = rutina; else d.rutinas.push(rutina); }, 'guardar_rutina', rutina.id); S.rutinaSeleccionada = rutina.id; cerrarModal(); renderEntrenar(); } catch (err) { S.toast(err.message, true); } };
    }, 'CONSTRUCTOR');
  pintar();
}

function abrirSelectorEjercicio(borrador, volver) {
  abrirModal('Agregar ejercicio', `<label class="filtro-catalogo">Filtrar por categoría<select id="filtro-categoria"><option value="">Todas</option>${opciones(S.datos.categorias)}</select></label><div id="selector-lista" class="lista-modal"></div>`, (c) => {
    const pintar = () => {
      const cat = c.querySelector('#filtro-categoria').value;
      c.querySelector('#selector-lista').innerHTML = S.datos.ejercicios.filter((e) => e.activo !== false && (!cat || e.categoriaId === cat)).map((e) => `<div class="fila-selector-ejercicio"><button type="button" data-elegir="${e.id}"><span><b>${escapeHTML(e.nombre)}</b><small>${escapeHTML(e.modalidad)}</small></span><i>Agregar</i></button><button type="button" class="btn-info-ejercicio" data-detalle="${e.id}" aria-label="Ver cómo hacerlo">ⓘ</button></div>`).join('') || '<p class="estado-vacio">No hay ejercicios en esta categoría.</p>';
      c.querySelectorAll('[data-elegir]').forEach((b) => b.onclick = () => { borrador.entradas.push({ ejercicioId: b.dataset.elegir, series: 3, repeticiones: 10, descansoSeg: 60 }); volver(); });
      c.querySelectorAll('[data-detalle]').forEach((b) => b.onclick = () => abrirDetalleEjercicio(b.dataset.detalle, pintar));
    };
    c.querySelector('#filtro-categoria').onchange = pintar; pintar();
  }, 'CATÁLOGO');
}

function comenzarEntrenamiento() {
  const rutina = S.datos.rutinas.find((r) => r.id === S.rutinaSeleccionada); if (!rutina?.entradas?.length) return;
  S.entrenamiento = { id: uid(), rutinaId: rutina.id, nombre: rutina.nombre, entradas: structuredClone(rutina.entradas), ejercicioIndice: 0, serieNumero: 1, fase: 'cuenta', cuenta: 3, series: [], fecha: iso(), creadoEn: iso(), modificadoEn: iso() };
  S.sonidosEmitidos.clear();
  clearInterval(S.intervalo); S.intervalo = setInterval(tickEntrenamiento, 250); S.entrenamiento.cuentaFinMs = Date.now() + 3000; solicitarWake(); renderEntrenamientoActivo();
}

function tickEntrenamiento() {
  if (!S.entrenamiento) return;
  if (S.entrenamiento.fase === 'cuenta') {
    const n = Math.max(0, Math.ceil((S.entrenamiento.cuentaFinMs - Date.now()) / 1000));
    emitirUnaVez(`inicio-${n}`, sonidosEnSegundo({ tipo: 'cuenta', restanteSeg: n }));
    if (n <= 0) { S.entrenamiento.fase = 'serie'; beep('largo'); }
  } else if (S.entrenamiento.fase === 'descanso') tickDescanso();
  renderEntrenamientoActivo();
}

function ejercicioActual() { const entrada = S.entrenamiento?.entradas[S.entrenamiento.ejercicioIndice]; return { entrada, ejercicio: S.datos.ejercicios.find((e) => e.id === entrada?.ejercicioId) }; }

function renderEntrenamientoActivo() {
  const p = document.getElementById('ejercicio-panel'), t = S.entrenamiento; if (!t) return renderEntrenar();
  if (t.fase === 'cuenta') { const n = Math.max(1, Math.ceil((t.cuentaFinMs - Date.now()) / 1000)); p.innerHTML = `<section class="cuenta-gigante"><small>PREPÁRATE</small><strong>${n}</strong><span>${escapeHTML(t.nombre)}</span></section>`; return; }
  if (t.fase === 'confirmar') {
    const siguienteEntrada = t.entradas[t.pasoSiguiente.ejercicioIndice], siguienteEjercicio = S.datos.ejercicios.find((e) => e.id === siguienteEntrada.ejercicioId);
    p.innerHTML = `<section class="descanso-pantalla"><small>EJERCICIO COMPLETADO</small><strong>✓</strong><div class="progreso-circular"><span>Siguiente</span><b>${escapeHTML(siguienteEjercicio?.nombre || '')}</b></div><button id="confirmar-siguiente" class="btn-primario">Continuar</button></section>`;
    p.querySelector('#confirmar-siguiente').onclick = confirmarSiguienteEjercicio;
    return;
  }
  const { entrada, ejercicio } = ejercicioActual(), totalSeries = t.entradas.reduce((n, e) => n + e.series, 0), hechas = t.series.length;
  if (t.fase === 'descanso') { const restante = Math.max(0, Math.ceil((S.descanso.finMs - Date.now()) / 1000)); p.innerHTML = `<section class="descanso-pantalla"><small>DESCANSO</small><strong>${restante}</strong><div class="progreso-circular"><span>Siguiente</span><b>${escapeHTML(ejercicio?.nombre || '')}</b><small>Serie ${t.serieNumero} de ${entrada.series}</small></div><button id="sumar-cinco">+5 s</button><button id="saltar-descanso">Saltar descanso</button></section>`; p.querySelector('#sumar-cinco').onclick = () => { S.descanso.finMs += 5000; S.descanso.extraSeg += 5; }; p.querySelector('#saltar-descanso').onclick = cerrarDescanso; return; }
  p.innerHTML = `<section class="entrenamiento-activo"><header><button id="salir-rutina">×</button><div><small>${escapeHTML(t.nombre)}</small><b>${hechas}/${totalSeries} series</b></div><span>${Math.round(hechas / totalSeries * 100)}%</span></header><div class="barra-rutina"><i style="width:${hechas / totalSeries * 100}%"></i></div><article class="tarjeta-ejercicio-actual"><span class="numero-ejercicio">${t.ejercicioIndice + 1}/${t.entradas.length}</span><h1>${escapeHTML(ejercicio?.nombre || 'Ejercicio')}</h1><button type="button" id="ver-como-hacerlo" class="btn-discreto">Ver cómo hacerlo</button><p>Serie <b>${t.serieNumero}</b> de ${entrada.series} · meta ${entrada.repeticiones} reps</p>${stepperCantidad('serie-reps', 'Repeticiones', entrada.repeticiones, 1)}${cargaEntrenamiento(ejercicio)}<button id="terminar-serie" class="btn-terminar-serie">Terminar serie</button><small>Descanso programado: ${entrada.descansoSeg}s</small>${t.ejercicioIndice + 1 < t.entradas.length ? '<button id="saltar-ejercicio" class="btn-discreto">Saltar este ejercicio</button>' : ''}</article></section>`;
  conectarSteppers(p);
  const btnTerminar = p.querySelector('#terminar-serie');
  const actualizarBotonTerminar = () => { btnTerminar.disabled = Number(p.querySelector('#serie-reps').value) < 1; };
  p.querySelector('#serie-reps').addEventListener('input', actualizarBotonTerminar);
  actualizarBotonTerminar();
  btnTerminar.onclick = terminarSerieGuiada;
  p.querySelector('#ver-como-hacerlo').onclick = () => abrirDetalleEjercicio(ejercicio.id);
  p.querySelector('#salir-rutina').onclick = salirRutina;
  p.querySelector('#saltar-ejercicio')?.addEventListener('click', saltarEjercicio);
}

function salirRutina() {
  const t = S.entrenamiento;
  if (!t.series.length) { if (!confirm('¿Terminar esta rutina sin guardarla?')) return; S.entrenamiento = null; clearInterval(S.intervalo); liberarWake(); return renderEntrenar(); }
  if (!confirm(`¿Salir? Se guardarán ${t.series.length} serie(s) ya completadas como rutina incompleta.`)) return;
  const sesion = { id: t.id, rutinaId: t.rutinaId, nombre: t.nombre, fecha: t.fecha, fin: iso(), estado: 'descartada', series: t.series, creadoEn: t.creadoEn, modificadoEn: iso() };
  guardar((d) => d.sesiones.push(sesion), 'guardar_sesion', sesion.id);
  S.entrenamiento = null; S.descanso = null; clearInterval(S.intervalo); liberarWake(); S.toast('Rutina guardada como incompleta'); renderEntrenar();
}

function saltarEjercicio() {
  if (!confirm('¿Saltar este ejercicio? No se registrarán series para él.')) return;
  const t = S.entrenamiento;
  Object.assign(t, { ejercicioIndice: t.ejercicioIndice + 1, serieNumero: 1, fase: 'serie' });
  renderEntrenamientoActivo();
}

function cargaEntrenamiento(ejercicio) {
  if (ejercicio?.modalidad === 'discos') return `<div class="carga-discos">${stepperCantidad('carga-grande', 'Grandes / lado', 0, 0)}${stepperCantidad('carga-chico', 'Chicos / lado', 0, 0)}</div>`;
  if (ejercicio?.modalidad === 'niveles') return stepperCantidad('carga-nivel', 'Peso / nivel', 1, 0);
  return '<div class="pc-indicador">PC <small>Peso corporal</small></div>';
}

function stepperCantidad(id, etiqueta, valor, minimo) {
  return `<div class="control-cantidad"><span>${escapeHTML(etiqueta)}</span><div><button type="button" data-stepper="menos" data-objetivo="${id}" aria-label="Restar ${escapeAtributo(etiqueta)}">−</button><input id="${id}" type="number" inputmode="numeric" min="${minimo}" value="${valor}" aria-label="${escapeAtributo(etiqueta)}"><button type="button" data-stepper="mas" data-objetivo="${id}" aria-label="Sumar ${escapeAtributo(etiqueta)}">+</button></div></div>`;
}

function conectarSteppers(contenedor) {
  contenedor.querySelectorAll('[data-stepper]').forEach((boton) => boton.onclick = () => {
    const input = contenedor.querySelector(`#${boton.dataset.objetivo}`); if (!input) return;
    input.value = String(ajustarCantidad(input.value, boton.dataset.stepper === 'menos' ? -1 : 1, { minimo: Number(input.min || 0), paso: Number(input.step || 1) }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function terminarSerieGuiada() {
  const { entrada, ejercicio } = ejercicioActual();
  let carga = null; if (ejercicio.modalidad === 'discos') carga = { grande: Number(document.getElementById('carga-grande').value), chico: Number(document.getElementById('carga-chico').value) }; else if (ejercicio.modalidad === 'niveles') carga = Number(document.getElementById('carga-nivel').value);
  try { S.entrenamiento.series.push(normalizarSerie({ ejercicioId: ejercicio.id, repeticiones: Number(document.getElementById('serie-reps').value), modalidad: ejercicio.modalidad, carga, descansoPlaneadoSeg: entrada.descansoSeg })); } catch (err) { return S.toast(err.message, true); }
  S.entrenamiento.fase = 'descanso'; S.descanso = { inicioMs: Date.now(), finMs: Date.now() + entrada.descansoSeg * 1000, extraSeg: 0 }; S.sonidosEmitidos.clear(); emitirSonidos(['rapido', 'rapido', 'rapido']); renderEntrenamientoActivo();
}

function tickDescanso() {
  const restante = Math.max(0, Math.ceil((S.descanso.finMs - Date.now()) / 1000));
  emitirUnaVez(`descanso-${restante}`, sonidosEnSegundo({ tipo: 'descanso', restanteSeg: restante }));
  if (restante <= 0) cerrarDescanso();
}

function cerrarDescanso() {
  const ultima = S.entrenamiento.series.at(-1); ultima.descansoRealSeg = Math.round((Date.now() - S.descanso.inicioMs) / 1000); ultima.extraSeg = S.descanso.extraSeg;
  const paso = siguientePasoRutina(S.entrenamiento, S.entrenamiento.entradas);
  S.descanso = null;
  if (paso.terminada) return finalizarEntrenamiento();
  if (paso.ejercicioIndice !== S.entrenamiento.ejercicioIndice) { S.entrenamiento.fase = 'confirmar'; S.entrenamiento.pasoSiguiente = paso; beep('final'); return renderEntrenamientoActivo(); }
  Object.assign(S.entrenamiento, paso, { fase: 'serie' }); beep('largo'); renderEntrenamientoActivo();
}

function confirmarSiguienteEjercicio() {
  Object.assign(S.entrenamiento, S.entrenamiento.pasoSiguiente, { fase: 'serie' }); delete S.entrenamiento.pasoSiguiente; renderEntrenamientoActivo();
}

function finalizarEntrenamiento() {
  const t = S.entrenamiento, sesion = { id: t.id, rutinaId: t.rutinaId, nombre: t.nombre, fecha: t.fecha, fin: iso(), estado: 'completada', series: t.series, creadoEn: t.creadoEn, modificadoEn: iso() };
  guardar((d) => d.sesiones.push(sesion), 'guardar_sesion', sesion.id); S.entrenamiento = null; S.descanso = null; clearInterval(S.intervalo); liberarWake(); beep('final'); S.toast('Rutina completada'); renderEntrenar();
}

function renderHiit() {
  const p = document.getElementById('ejercicio-panel');
  if (S.hiit) return renderHiitActivo();
  p.innerHTML = `<section class="hiit-config"><div class="hiit-emblema">HIIT</div><h1>Intervalos precisos</h1><p>Actividad intensa, descansos claros y avisos que no tienes que mirar.</p><div class="grid-form"><label>Vueltas<input id="hiit-vueltas" type="number" min="1" value="6"></label><label>Actividad (s)<input id="hiit-actividad" type="number" min="1" value="30"></label><label>Descanso (s)<input id="hiit-descanso" type="number" min="0" value="20"></label></div><button id="hiit-iniciar" class="btn-entrenar">Iniciar HIIT</button></section>`;
  p.querySelector('#hiit-iniciar').onclick = iniciarHiit;
}

function iniciarHiit() {
  const config = { vueltas: Number(document.getElementById('hiit-vueltas').value), actividadSeg: Number(document.getElementById('hiit-actividad').value), descansoSeg: Number(document.getElementById('hiit-descanso').value) };
  try { calcularDuracionHiit(config); } catch (err) { return S.toast(err.message, true); }
  S.hiit = { id: uid(), ...config, planeadoSeg: calcularDuracionHiit(config), inicioMs: Date.now(), pausaMs: 0, pausaInicio: null, faseIndice: -1, cuentaFinMs: Date.now() + 3000, estado: 'cuenta', sonidos: new Set() };
  S.sonidosEmitidos.clear();
  clearInterval(S.intervalo); S.intervalo = setInterval(tickHiit, 200); solicitarWake(); tickHiit();
}

function fasesHiit(h) { const xs = []; for (let i = 1; i <= h.vueltas; i++) { xs.push({ tipo: 'actividad', seg: h.actividadSeg, vuelta: i }); if (i < h.vueltas) xs.push({ tipo: 'descanso', seg: h.descansoSeg, vuelta: i }); } return xs; }
function estadoHiit() { const h = S.hiit, ahora = h.pausaInicio || Date.now(); if (h.estado === 'cuenta') return { tipo: 'cuenta', restante: Math.max(0, Math.ceil((h.cuentaFinMs - ahora) / 1000)), vuelta: 0, transcurrido: 0 }; let t = Math.max(0, Math.floor((ahora - h.actividadInicioMs - h.pausaMs) / 1000)), indice = 0; for (const f of fasesHiit(h)) { if (t < f.seg) return { ...f, restante: f.seg - t, indice, transcurrido: Math.floor((ahora - h.actividadInicioMs - h.pausaMs) / 1000) }; t -= f.seg; indice++; } return { tipo: 'final', restante: 0, transcurrido: h.planeadoSeg }; }
function tickHiit() { if (!S.hiit || S.hiit.pausaInicio) return renderHiitActivo(); const e = estadoHiit(); if (S.hiit.estado === 'cuenta' && e.restante <= 0) { S.hiit.estado = 'activo'; S.hiit.actividadInicioMs = Date.now(); S.hiit.pausaMs = 0; S.hiit.faseIndice = 0; beep('largo'); } else { const clave = `${e.indice ?? -1}-${e.tipo}-${e.restante}`; if (e.tipo === 'descanso' && e.indice !== S.hiit.faseIndice) { S.hiit.faseIndice = e.indice; emitirSonidos(['rapido', 'rapido', 'rapido']); } else if (e.tipo === 'actividad' && e.indice !== S.hiit.faseIndice) { S.hiit.faseIndice = e.indice; beep('largo'); } emitirUnaVez(clave, sonidosEnSegundo({ tipo: e.tipo, restanteSeg: e.restante })); if (e.tipo === 'final') return finalizarHiit(false); } renderHiitActivo(); }

function renderHiitActivo() {
  const p = document.getElementById('ejercicio-panel'), e = estadoHiit();
  p.innerHTML = `<section class="hiit-activo ${e.tipo}"><small>${S.hiit.pausaInicio ? 'PAUSADO' : e.tipo === 'cuenta' ? 'PREPÁRATE' : e.tipo.toUpperCase()}</small><strong>${e.restante}</strong><span>${e.vuelta ? `Vuelta ${e.vuelta}/${S.hiit.vueltas}` : 'Comienza en'}</span><div class="acciones"><button id="hiit-pausa">${S.hiit.pausaInicio ? 'Reanudar' : 'Pausar'}</button><button id="hiit-detener">Detener</button></div></section>`;
  p.querySelector('#hiit-pausa').onclick = alternarPausaHiit; p.querySelector('#hiit-detener').onclick = () => finalizarHiit(true);
}
function alternarPausaHiit() { const h = S.hiit; if (h.pausaInicio) { const pausa = Date.now() - h.pausaInicio; if (h.estado === 'cuenta') h.cuentaFinMs += pausa; else h.pausaMs += pausa; h.pausaInicio = null; solicitarWake(); } else { h.pausaInicio = Date.now(); liberarWake(); } renderHiitActivo(); }
function finalizarHiit(detenido) { if (!S.hiit) return; const h = S.hiit, e = estadoHiit(), real = detenido ? Math.min(h.planeadoSeg, e.transcurrido || 0) : h.planeadoSeg; const r = { id: h.id, nombre: 'HIIT', fecha: iso(), vueltas: h.vueltas, actividadSeg: h.actividadSeg, descansoSeg: h.descansoSeg, duracionPlaneadaSeg: h.planeadoSeg, duracionRealSeg: real, porcentaje: detenido ? Math.round(real / h.planeadoSeg * 100) : 100, estado: detenido ? 'detenida' : 'completada', creadoEn: iso(), modificadoEn: iso() }; guardar((d) => d.hiits.push(r), 'guardar_hiit', r.id); S.hiit = null; clearInterval(S.intervalo); liberarWake(); beep('final'); renderHiit(); }

const SONIDOS = { rapido: 'audio/rapido.mp3', cuenta: 'audio/cuenta.mp3', largo: 'audio/largo.mp3', final: 'audio/final.mp3' };
function beep(tipo) { try { const a = new Audio(SONIDOS[tipo]); a.volume = .6; a.play().catch(() => {}); } catch {} }
function emitirSonidos(tipos) { tipos.forEach((tipo, i) => setTimeout(() => beep(tipo), i * 170)); }
function emitirUnaVez(clave, tipos) { if (!tipos.length || S.sonidosEmitidos.has(clave)) return; S.sonidosEmitidos.add(clave); emitirSonidos(tipos); }
async function solicitarWake() { try { S.wake = await navigator.wakeLock?.request('screen'); } catch { S.wake = null; } }
function liberarWake() { S.wake?.release().catch(() => {}); S.wake = null; }

function renderProgreso() {
  const p = document.getElementById('ejercicio-panel'), sesiones = filtrarPeriodo(S.datos.sesiones || [], S.periodo), hiits = filtrarPeriodo(S.datos.hiits || [], S.periodo), series = seriesContables(sesiones), m = resumenModalidades(series), h = resumenHiit(hiits);
  p.innerHTML = `<section class="progreso-ejercicio"><header><div><small>TU CONSTANCIA</small><h1>Progreso</h1></div><div class="filtros-periodo"><button data-periodo="semana">Semana</button><button data-periodo="mes">Mes</button><button data-periodo="total">Total</button></div></header><div class="kpis-ejercicio"><div><b>${sesiones.filter((s) => s.estado === 'completada').length}</b><span>Sesiones</span></div><div><b>${series.length}</b><span>Series</span></div><div><b>${descansoPromedio(series)}s</b><span>Descanso promedio</span></div><div><b>${h.minutos}m</b><span>HIIT activo</span></div><div><b>${h.porcentajePromedio}%</b><span>HIIT promedio</span></div><div><b>${h.abandonos}</b><span>Abandonos</span></div></div><article class="tarjeta marca-resumen"><h3>Mejores esfuerzos</h3><p>Discos × reps: grandes ${m.discos.grande}, chicos ${m.discos.chico}</p><p>Nivel máximo ${m.niveles.mejor} · PC ${m.PC.repeticiones} reps</p></article><article class="tarjeta"><h3>Historial</h3><div class="historial-entrenamiento">${[...(S.datos.sesiones || []), ...(S.datos.hiits || [])].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map((r) => `<div><span><b>${escapeHTML(r.nombre || 'Entrenamiento')}</b><small>${escapeHTML(String(r.fecha || '').slice(0, 10))} · ${escapeHTML(r.estado)}</small></span><div><button data-editar-registro="${r.id}">Editar</button><button data-eliminar="${r.id}">Eliminar</button></div></div>`).join('') || '<p class="estado-vacio">Completa una rutina para ver tu historial.</p>'}</div></article></section>`;
  p.querySelectorAll('[data-periodo]').forEach((b) => b.onclick = () => { S.periodo = b.dataset.periodo; renderProgreso(); });
  p.querySelectorAll('[data-editar-registro]').forEach((b) => b.onclick = () => abrirEditarRegistro(b.dataset.editarRegistro));
  p.querySelectorAll('[data-eliminar]').forEach((b) => b.onclick = () => { if (!confirm('¿Eliminar este registro?')) return; guardar((d) => { d.sesiones = d.sesiones.filter((x) => x.id !== b.dataset.eliminar); d.hiits = d.hiits.filter((x) => x.id !== b.dataset.eliminar); }, 'eliminar_registro', b.dataset.eliminar); renderProgreso(); });
}

function abrirEditarRegistro(id) {
  const lista = S.datos.sesiones.some((x) => x.id === id) ? 'sesiones' : 'hiits';
  const registro = structuredClone(S.datos[lista].find((x) => x.id === id));
  if (lista === 'hiits') {
    abrirModal('Editar HIIT', `<form id="form-registro" class="form-modal"><label>Nombre<input id="registro-nombre" value="${escapeAtributo(registro.nombre || 'HIIT')}"></label><label>Vueltas<input id="registro-vueltas" type="number" min="1" value="${registro.vueltas}"></label><label>Actividad (s)<input id="registro-actividad" type="number" min="1" value="${registro.actividadSeg}"></label><label>Descanso (s)<input id="registro-descanso" type="number" min="0" value="${registro.descansoSeg}"></label><label>Duración real (s)<input id="registro-real" type="number" min="0" value="${registro.duracionRealSeg}"></label><button class="btn-primario">Guardar cambios</button></form>`, (c) => { c.querySelector('#form-registro').onsubmit = (e) => { e.preventDefault(); Object.assign(registro, { nombre: c.querySelector('#registro-nombre').value.trim(), vueltas: Number(c.querySelector('#registro-vueltas').value), actividadSeg: Number(c.querySelector('#registro-actividad').value), descansoSeg: Number(c.querySelector('#registro-descanso').value), duracionRealSeg: Number(c.querySelector('#registro-real').value), modificadoEn: iso() }); registro.duracionPlaneadaSeg = calcularDuracionHiit(registro); registro.porcentaje = Math.min(100, Math.round(registro.duracionRealSeg / registro.duracionPlaneadaSeg * 100)); guardar((d) => { d.hiits[d.hiits.findIndex((x) => x.id === id)] = registro; }, 'editar_registro', id); cerrarModal(); renderProgreso(); }; }, 'HISTORIAL');
  } else {
    abrirModal('Editar entrenamiento', `<form id="form-registro" class="form-modal"><label>Nombre<input id="registro-nombre" value="${escapeAtributo(registro.nombre || '')}"></label><div class="constructor-rutina">${(registro.series || []).map((s, i) => `<article data-serie-historial="${i}"><b>${escapeHTML(S.datos.ejercicios.find((x) => x.id === s.ejercicioId)?.nombre || 'Ejercicio')}</b><div class="grid-form"><label>Reps<input data-historial="repeticiones" type="number" min="1" value="${s.repeticiones}"></label><label>Descanso real<input data-historial="descansoRealSeg" type="number" min="0" value="${s.descansoRealSeg || 0}"></label></div></article>`).join('')}</div><button class="btn-primario">Guardar cambios</button></form>`, (c) => { c.querySelector('#form-registro').onsubmit = (e) => { e.preventDefault(); registro.nombre = c.querySelector('#registro-nombre').value.trim(); c.querySelectorAll('[data-serie-historial]').forEach((art) => art.querySelectorAll('[data-historial]').forEach((inp) => { registro.series[Number(art.dataset.serieHistorial)][inp.dataset.historial] = Number(inp.value); })); registro.modificadoEn = iso(); guardar((d) => { d.sesiones[d.sesiones.findIndex((x) => x.id === id)] = registro; }, 'editar_registro', id); cerrarModal(); renderProgreso(); }; }, 'HISTORIAL');
  }
}

  return { iniciarModuloEjercicio, salirModuloEjercicio, renderModuloEjercicio };
})();
const iniciarModuloEjercicio = ejercicio_ui.iniciarModuloEjercicio;
const salirModuloEjercicio = ejercicio_ui.salirModuloEjercicio;
const renderModuloEjercicio = ejercicio_ui.renderModuloEjercicio;

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
  await iniciarModuloEjercicio(toast);
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
  if (E.vista === 'ejercicio' && nombre !== 'ejercicio') salirModuloEjercicio();
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
  else if (E.vista === 'ejercicio') renderModuloEjercicio();
}

// ---------- capturar ----------

function renderCapturar() {
  const unidad = miUnidad();
  document.getElementById('captura-usuario').textContent = getUsuario();
  document.getElementById('captura-unidad').textContent = unidad;
  document.getElementById('captura-fecha').value = E.captura.fecha;
  document.getElementById('captura-fecha-texto').textContent = formatoFechaCorta(E.captura.fecha);
  document.getElementById('btn-guardar-captura').textContent = E.captura.editandoFechaOriginal ? 'Guardar cambios' : 'Registrar peso';
  document.getElementById('captura-modo-edicion').classList.toggle('oculto', !E.captura.editandoFechaOriginal);
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
    const operaciones = ui_helpers.planificarEdicion(E.captura.editandoFechaOriginal, fecha, pesoKg);
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
    const limpio = normalizarEntradaPeso(e.target.value);
    if (limpio !== e.target.value) e.target.value = limpio;
    E.captura.pesoStr = limpio;
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
        <button type="button" class="accion-historial accion-editar" data-editar-peso="${escapeAtributo(p.fecha)}" aria-label="${escapeAtributo(`Editar registro del ${formatoFechaCorta(p.fecha)}`)}">Editar</button>
        <button type="button" class="accion-historial accion-borrar" data-borrar-peso="${escapeAtributo(p.fecha)}" aria-label="${escapeAtributo(`Borrar registro del ${formatoFechaCorta(p.fecha)}`)}">Borrar</button>
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
  E.captura = { ...ui_helpers.prepararEdicion(registro, miUnidad()), fechaOriginal: fecha, editandoFechaOriginal: fecha };
  cambiarVista('capturar');
  const input = document.getElementById('captura-peso-input');
  input.value = E.captura.pesoStr;
  input.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Registro abierto para editar');
}

async function borrarRegistroPeso(fecha) {
  const ok = await confirmarPopup(`¿Borrar tu registro del ${formatoFechaCorta(fecha)}? No se puede deshacer.`);
  if (!ok) return;
  // Igual que guardarCaptura(): se encola y se refleja de una, no espera al
  // servidor -- antes esto sí esperaba la red y tronaba sin conexión.
  cola.encolarBorrado(getUsuario(), fecha);
  E.datos.pesos = E.datos.pesos.filter((p) => !(p.usuario === getUsuario() && p.fecha === fecha));
  const pendientes = cola.leerCola(getUsuario()).length;
  toast(ui_helpers.mensajeBorrado({ sinConexion: !navigator.onLine || E.sinConexion, pendientes }));
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
  const actual = prompt('Tu contraseña actual:') || '';
  const nuevo = prompt('Nueva contraseña (mínimo 6 caracteres):');
  if (nuevo === null) return;
  if (!pinNuevoValido(nuevo)) {
    toast('La contraseña nueva debe tener al menos 6 caracteres', true);
    return;
  }
  try {
    const r = await api.cambiarPin(getUsuario(), actual, nuevo);
    if (r.ok) toast('Contraseña actualizada ✓');
    else toast(r.error || 'Contraseña actual incorrecta', true);
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
