// ARCHIVO GENERADO por build.py (paquete "launcher") -- no editar a mano.
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

// ── shared/passkey.js ──────────────────────────────────────────
const passkey = (function () {
// Face ID / Touch ID vía WebAuthn -- candado LOCAL por dispositivo, no una
// autenticación remota real: no hay servidor (Apps Script no es buen lugar
// para verificar firmas WebAuthn) validando la respuesta del sensor. Lo que
// de verdad protege el dato sigue siendo el bloqueo del propio iPhone --
// esto solo evita volver a teclear el PIN o la contraseña en TU equipo cada
// vez que abres la app. Coherente con cómo ya describe este proyecto su PIN
// de sesión (ver CLAUDE.md: "no es cifrado real").
//
// Un registro (passkey) es por usuario + por dispositivo: si cambias de
// iPhone o borras Safari, tienes que volver a activarlo -- por eso el PIN o
// la contraseña normal siempre se quedan como respaldo, nunca se quitan.

const PREFIJO = 'ma_passkey_';

function claveUsuario(usuario) {
  return `${PREFIJO}${usuario}`;
}

function aBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function aBuffer(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function disponible() {
  return (await porQueNoDisponible()) === null;
}

// La consulta al sensor (isUserVerifyingPlatformAuthenticatorAvailable) es
// la parte lenta -- unos cientos de ms. Su resultado no cambia mientras la
// página siga abierta, así que se pregunta UNA vez y se reusa -- antes se
// repetía cada vez que se mostraba una pantalla, y por eso el botón de Face
// ID tardaba en aparecer cada vez.
let cachePromesaMotivo = null;

// Regresa null si Face ID se puede usar, o el motivo en texto claro si no --
// sin esto el usuario solo ve que "no pasa nada" y no hay forma de saber si
// es el navegador, el dispositivo, o que la app se abrió desde un archivo
// local en vez de su liga https.
function porQueNoDisponible() {
  if (!cachePromesaMotivo) cachePromesaMotivo = _calcularMotivo();
  return cachePromesaMotivo;
}

async function _calcularMotivo() {
  if (!window.isSecureContext) {
    return 'Face ID solo funciona con la app abierta desde su liga https, no desde el archivo en la computadora.';
  }
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return 'Este navegador no soporta Face ID para apps web (en iPhone tiene que ser Safari).';
  }
  try {
    const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!ok) return 'Este dispositivo no tiene Face ID / Touch ID disponible.';
  } catch (e) {
    return 'No se pudo consultar el sensor: ' + e.message;
  }
  return null;
}

function tieneRegistro(usuario) {
  return !!localStorage.getItem(claveUsuario(usuario));
}

function olvidar(usuario) {
  localStorage.removeItem(claveUsuario(usuario));
}

function usuariosRegistrados() {
  const usuarios = [];
  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    if (clave && clave.startsWith(PREFIJO)) usuarios.push(clave.slice(PREFIJO.length));
  }
  return usuarios;
}

// IMPORTANTE: esto TIENE que llamarse desde el handler de un toque del
// usuario, y ser lo PRIMERO que se hace ahí (nada de await, confirm() ni
// prompt() antes). Safari exige que la llamada salga directo del toque; si
// algo se mete en medio, la rechaza con NotAllowedError sin explicación.
async function registrar(usuario) {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Mis Apps' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: usuario, displayName: usuario },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      },
    });
    if (!cred) throw new Error('No se pudo activar Face ID.');
    localStorage.setItem(claveUsuario(usuario), aBase64(cred.rawId));
  } catch (e) {
    throw new Error(mensajeError(e));
  }
}

// OJO: igual que registrar(), TIENE que llamarse dentro del handler de un
// toque del usuario. Avienta con un mensaje legible si falla, en vez de
// regresar false en silencio -- así el error sí llega a la pantalla.
async function verificar(usuario) {
  const idGuardado = localStorage.getItem(claveUsuario(usuario));
  if (!idGuardado) throw new Error('Face ID no está activado en este dispositivo.');
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: aBuffer(idGuardado), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (!cred) throw new Error('Face ID no confirmó.');
    return true;
  } catch (e) {
    throw new Error(mensajeError(e));
  }
}

// Traduce los errores de WebAuthn a algo que se entienda. NotAllowedError
// sale tanto si el usuario canceló como si el navegador bloqueó la llamada
// por no venir de un toque directo -- de ahí la mención al toque.
function mensajeError(e) {
  if (e && e.name === 'NotAllowedError') return 'Face ID se canceló o el navegador lo bloqueó. Toca el botón otra vez.';
  if (e && e.name === 'InvalidStateError') return 'Este dispositivo ya tenía un registro distinto. Desactiva y vuelve a activar Face ID.';
  if (e && e.name === 'SecurityError') return 'Face ID necesita que la app esté abierta desde su liga https.';
  if (e && e.name === 'AbortError') return 'Se agotó el tiempo de Face ID. Intenta de nuevo.';
  return (e && e.message) || 'No se pudo usar Face ID.';
}

  return { disponible, porQueNoDisponible, tieneRegistro, olvidar, usuariosRegistrados, registrar, verificar };
})();
const disponible = passkey.disponible;
const porQueNoDisponible = passkey.porQueNoDisponible;
const tieneRegistro = passkey.tieneRegistro;
const olvidar = passkey.olvidar;
const usuariosRegistrados = passkey.usuariosRegistrados;
const registrar = passkey.registrar;
const verificar = passkey.verificar;

// ── shared/candado.js ──────────────────────────────────────────
const candado = (function () {
// Guarda localmente (por usuario, por app) el secreto que Face ID va a
// "revelar" en vez de pedirte que lo teclees: el PIN de sesión del launcher,
// o la contraseña de cifrado de Gastos. Vive en localStorage -- protegido
// solo por el sandbox/bloqueo del dispositivo, no por cifrado propio. Un XSS
// que ejecute JavaScript en este mismo origen podría leerlo. Task 4/5 debe
// añadir una CSP estricta y revisar los puntos de inyección. Ver
// shared/passkey.js: esto es un candado local, no autenticación remota real.

function clave(app, usuario) {
  return `ma_candado_${app}_${usuario}`;
}

// Nombres con sufijo "Candado" (no "guardar"/"leer" a secas) a propósito:
// build.py junta todo en un solo archivo por app y expone cada export como
// global suelta -- "guardar" ya lo usa gastos/js/almacen.js, y chocarían.
function guardarCandado(app, usuario, valorObjeto) {
  localStorage.setItem(clave(app, usuario), JSON.stringify(valorObjeto));
}

function leerCandado(app, usuario) {
  try {
    const crudo = localStorage.getItem(clave(app, usuario));
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function borrarCandado(app, usuario) {
  localStorage.removeItem(clave(app, usuario));
}

// "Ya hiciste Face ID hace un momento" -- así Gastos no lo vuelve a pedir si
// acabas de confirmarlo en el launcher (o viceversa). Ventana corta a
// propósito: es para cubrir "abrí la app y de ahí entré a Gastos", no para
// dejar la sesión abierta indefinidamente sin Face ID.
const CLAVE_RECIENTE = 'ma_faceid_reciente';
const VENTANA_RECIENTE_MS = 3 * 60 * 1000; // 3 minutos

function marcarFaceIdConfirmado() {
  localStorage.setItem(CLAVE_RECIENTE, String(Date.now()));
}

function faceIdConfirmadoReciente() {
  const ts = Number(localStorage.getItem(CLAVE_RECIENTE) || 0);
  return Date.now() - ts < VENTANA_RECIENTE_MS;
}

  return { guardarCandado, leerCandado, borrarCandado, marcarFaceIdConfirmado, faceIdConfirmadoReciente };
})();
const guardarCandado = candado.guardarCandado;
const leerCandado = candado.leerCandado;
const borrarCandado = candado.borrarCandado;
const marcarFaceIdConfirmado = candado.marcarFaceIdConfirmado;
const faceIdConfirmadoReciente = candado.faceIdConfirmadoReciente;

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

// ── js/ui.js ──────────────────────────────────────────
// Launcher: login (URL → usuario → PIN) y los dos botones grandes.

api.configurarManejadorAuth(() => {
  cerrarSesionEnSegundoPlano(() => undefined);
  location.href = 'index.html';
});

let usuarioTemp = null;
let rolTemp = null;

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function renderFaceIdUsuarios() {
  const cont = document.getElementById('faceid-usuarios');
  // Solo los que además tienen su PIN cacheado aquí -- si el passkey se creó
  // desde Gastos, el launcher no tiene con qué entrar y el botón sobraría.
  const registrados = passkey.usuariosRegistrados().filter((u) => candado.leerCandado('launcher', u));
  if (!registrados.length || !(await passkey.disponible())) {
    cont.classList.add('oculto');
    cont.innerHTML = '';
    return;
  }
  cont.innerHTML = registrados
    .map((u) => `<button class="btn-faceid" data-usuario="${escapeHTML(u)}">🔒 Entrar como ${escapeHTML(u)} con Face ID</button>`)
    .join('') + '<p class="faceid-separador">— o escribe tu usuario —</p>';
  cont.classList.remove('oculto');
}

// OJO con TODAS las llamadas a passkey.*: Safari exige que salgan directo
// del toque del usuario. Por eso `verificar`/`registrar` van siempre como lo
// PRIMERO dentro de un handler de click -- nunca después de un await, un
// confirm() nativo, ni al cargar la página (ahí las rechaza en seco).
async function autenticarConFaceId(usuario, mostrarError) {
  try {
    await passkey.verificar(usuario);
  } catch (e) {
    mostrarError(e.message);
    return false;
  }
  const datos = candado.leerCandado('launcher', usuario);
  if (!datos) {
    mostrarError('Face ID activado pero falta la info guardada en este dispositivo — entra normal esta vez.');
    return false;
  }
  let acceso;
  try {
    acceso = await api.validarPin(usuario, datos.pin || '');
    exigirBackendActual(acceso, { requiereToken: true });
  } catch (e) {
    mostrarError('No se pudo validar la sesión: ' + e.message);
    return false;
  }
  if (!accesoFaceIdValido(acceso)) {
    mostrarError('La sesión expiró. Entra con tu PIN para continuar.');
    return false;
  }
  candado.marcarFaceIdConfirmado(); // Gastos no lo vuelve a pedir si entras ahí en los próximos minutos
  guardarClaveSesion(datos.pin || ''); // misma idea: Gastos la prueba sola, sin volver a preguntar
  iniciarSesion(usuario, datos.rol, acceso.token);
  mostrarInicio();
  return true;
}

function entrarConFaceId(usuario) {
  return autenticarConFaceId(usuario, mostrarErrorUsuario);
}

function mostrarPantallaCandado(usuario) {
  mostrarPantalla('pantalla-candado');
  document.getElementById('candado-saludo').textContent = `Hola, ${usuario}`;
  document.getElementById('candado-texto').textContent = 'Confirma que eres tú para entrar.';
}

// Va colgada del botón, NO se dispara sola al abrir: ninguna app web puede
// lanzar Face ID sin que toques algo primero (Safari lo bloquea).
function intentarCandado(usuario) {
  return autenticarConFaceId(usuario, (mensaje) => {
    document.getElementById('candado-texto').textContent = mensaje;
  });
}

// El callback corre DENTRO del click en "Sí, activar" -- ese es el toque que
// Safari necesita para dejar pasar el registro biométrico.
function popupFaceId(mensaje, onAceptar) {
  const focoAnterior = document.activeElement;
  const fondo = document.getElementById('popup-faceid');
  document.getElementById('popup-faceid-mensaje').textContent = mensaje;
  fondo.classList.remove('oculto');
  const btnSi = document.getElementById('popup-faceid-si');
  const btnNo = document.getElementById('popup-faceid-no');
  const cerrar = () => {
    fondo.classList.add('oculto');
    btnSi.removeEventListener('click', onSi);
    btnNo.removeEventListener('click', onNo);
    fondo.removeEventListener('keydown', onKey);
    focoAnterior?.focus?.();
  };
  const onSi = () => { cerrar(); onAceptar(); };
  const onNo = () => cerrar();
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    if (e.key === 'Tab' && e.shiftKey && document.activeElement === btnNo) { e.preventDefault(); btnSi.focus(); }
    else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === btnSi) { e.preventDefault(); btnNo.focus(); }
  };
  btnSi.addEventListener('click', onSi);
  btnNo.addEventListener('click', onNo);
  fondo.addEventListener('keydown', onKey);
  btnNo.focus();
}

// El passkey (registro biométrico) es UNO por usuario y sirve para las dos
// apps -- lo que decide si el launcher lo usa es si hay un PIN cacheado
// aquí (candado 'launcher'), no si el passkey existe (pudo haberse creado
// desde Gastos sin que el launcher lo sepa).
async function actualizarBotonesFaceId() {
  const motivo = await passkey.porQueNoDisponible();
  const disponible = motivo === null;
  const activado = disponible && !!candado.leerCandado('launcher', getUsuario());
  document.getElementById('btn-faceid-activar').classList.toggle('oculto', !disponible || activado);
  document.getElementById('btn-faceid-desactivar').classList.toggle('oculto', !activado);
  // Antes, si `disponible` salía falso, el botón se quedaba oculto sin
  // explicar por qué -- ahora el motivo (https, navegador, o sin sensor)
  // queda a la vista en vez de ser una caja negra.
  const elMotivo = document.getElementById('faceid-motivo');
  elMotivo.textContent = motivo ? '🔒 Face ID no disponible: ' + motivo : '';
  elMotivo.classList.toggle('oculto', !motivo);
}

// Esta función es la que va DENTRO del click del popup: el registro
// biométrico es lo primero que hace, sin nada en medio.
async function activarFaceIdConPin(usuario, rol, pin) {
  try {
    if (!passkey.tieneRegistro(usuario)) await passkey.registrar(usuario); // reusa el de Gastos si ya existe
    candado.guardarCandado('launcher', usuario, { pin, rol });
    candado.marcarFaceIdConfirmado();
    alert('Face ID activado ✓ — la próxima vez que abras la app te lo va a pedir.');
    actualizarBotonesFaceId();
  } catch (e) {
    alert('No se pudo activar Face ID: ' + e.message);
  }
}

// Se ofrece solo justo después de entrar con PIN por primera vez. El
// `await disponible()` va ANTES de mostrar el popup a propósito: lo que no
// puede llevar awaits en medio es el tramo entre el toque y el registro.
async function ofrecerFaceId(usuario, rol, pin) {
  if (candado.leerCandado('launcher', usuario)) return; // ya activado -- no volver a preguntar
  if (passkey.tieneRegistro(usuario)) {
    candado.guardarCandado('launcher', usuario, { pin, rol });
    actualizarBotonesFaceId();
    return;
  }
  if (!(await passkey.disponible())) return;
  popupFaceId(
    '¿Activar Face ID en este iPhone para no volver a teclear tu PIN?',
    () => activarFaceIdConPin(usuario, rol, pin)
  );
}

async function activarFaceId() {
  const usuario = getUsuario();
  const motivo = await passkey.porQueNoDisponible();
  if (motivo) {
    alert('No se puede activar Face ID aquí:\n\n' + motivo);
    return;
  }
  const pin = prompt('Para activar Face ID, confirma tu PIN actual:') || '';
  try {
    const r = await api.validarPin(usuario, pin);
    exigirBackendActual(r, { requiereToken: true });
    if (!r.ok) {
      alert('PIN incorrecto');
      return;
    }
  } catch (e) {
    alert('No se pudo confirmar: ' + e.message);
    return;
  }
  // El PIN ya quedó validado arriba; el registro se hace hasta que toques
  // el botón del popup, porque Safari lo exige (el prompt y la llamada de
  // red de arriba ya "gastaron" el toque original del botón de Ajustes).
  popupFaceId('Confirma para activar Face ID en este iPhone.', () => activarFaceIdConPin(usuario, getRol(), pin));
}

function desactivarFaceId() {
  // Solo borra el PIN cacheado del launcher -- el passkey en sí se queda
  // (lo puede seguir usando Gastos para su contraseña).
  candado.borrarCandado('launcher', getUsuario());
  actualizarBotonesFaceId();
}

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((p) => p.classList.add('oculto'));
  const pantalla = document.getElementById(id);
  pantalla.classList.remove('oculto');
  // Enfoca el primer campo de texto -- ej. usuario-input no lo tenía y por
  // eso no salía el teclado solo. En iOS esto solo funciona si viene de un
  // toque (un botón que llamó a mostrarPantalla); al abrir la app por
  // primera vez, sin gesto, iOS lo ignora -- eso ya no depende del código.
  const campo = pantalla.querySelector('input[type="text"], input[type="password"]');
  if (campo) campo.focus();
}

// El fondo se ELIGE desde Peso → Ajustes, no aquí -- esto solo lo pinta,
// leyéndolo de la misma IndexedDB (mismo origen para las 3 apps).
let urlFondoActual = null;
async function cargarFondoGuardado() {
  try {
    const blob = await fondo.leerFondo(getUsuario());
    const el = document.getElementById('fondo-personalizado');
    if (urlFondoActual) URL.revokeObjectURL(urlFondoActual);
    urlFondoActual = blob ? URL.createObjectURL(blob) : null;
    el.style.backgroundImage = urlFondoActual ? `url(${urlFondoActual})` : '';
    el.classList.toggle('oculto', !urlFondoActual);
  } catch {
    // IndexedDB no disponible o falló -- no es crítico, la app sigue sin fondo.
  }
}

function mostrarInicio() {
  document.getElementById('saludo').textContent = `Hola, ${getUsuario()}`;
  document.getElementById('btn-agregar-usuario').classList.toggle('oculto', !esAdmin());
  mostrarPantalla('pantalla-inicio');
  actualizarBotonesFaceId();
  cargarFondoGuardado();
}

async function agregarUsuario() {
  const nombreNuevo = prompt('Nombre del usuario nuevo:');
  if (!nombreNuevo || !nombreNuevo.trim()) return;
  const esOtroAdmin = confirm('¿Este usuario también es administrador?\n\nAceptar = sí, administrador.\nCancelar = no, usuario normal.');
  try {
    const r = await api.crearUsuario(nombreNuevo.trim(), esOtroAdmin ? 'admin' : 'normal');
    exigirBackendActual(r);
    if (r.ok && r.codigoActivacion) alert(`Usuario creado. Código de activación de un solo uso para ${nombreNuevo.trim()}:\n\n${r.codigoActivacion}\n\nEntrégaselo por un canal privado; no volverá a mostrarse.`);
    else alert(r.error || 'No se pudo crear');
  } catch (e) {
    alert('No se pudo crear: ' + e.message);
  }
}

function mostrarErrorUsuario(msg) {
  const el = document.getElementById('usuario-error');
  el.textContent = msg;
  el.classList.remove('oculto');
}

function mostrarErrorPin(msg) {
  const el = document.getElementById('pin-error');
  el.textContent = msg;
  el.classList.remove('oculto');
}

async function continuarUsuario() {
  const usuario = document.getElementById('usuario-input').value.trim();
  if (!usuario) return;
  document.getElementById('usuario-error').classList.add('oculto');
  const conocido = leerPerfilConocido(usuario);
  if (conocido?.tienePin) {
    usuarioTemp = conocido.usuario;
    rolTemp = conocido.rol;
    mostrarPantallaPin();
    return;
  }
  try {
    const r = await api.validarUsuario(usuario);
    exigirBackendActual(r);
    if (!r.ok) {
      mostrarErrorUsuario('Usuario incorrecto');
      return;
    }
    usuarioTemp = usuario;
    rolTemp = r.rol;
    guardarPerfilConocido(usuario, r.rol, r.tienePin);
    if (r.tienePin) {
      mostrarPantallaPin();
    } else {
      mostrarPantalla('pantalla-pin-nuevo');
      document.getElementById('codigo-activacion-input').value = '';
      document.getElementById('codigo-activacion-input').disabled = false;
      document.getElementById('activacion-error').classList.add('oculto');
      document.getElementById('pin-nuevo-input').classList.add('oculto');
      document.getElementById('btn-pin-nuevo-guardar').classList.add('oculto');
      document.getElementById('btn-pin-nuevo-mostrar').classList.remove('oculto');
    }
  } catch (e) {
    mostrarErrorUsuario('No se pudo validar (¿la URL es correcta?): ' + e.message);
  }
}

function mostrarPantallaPin() {
  mostrarPantalla('pantalla-pin');
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-error').classList.add('oculto');
  document.getElementById('pin-input').focus();
}

function volverAUsuario() {
  document.getElementById('pin-input').value = '';
  document.getElementById('codigo-activacion-input').value = '';
  mostrarPantalla('pantalla-usuario');
  document.getElementById('usuario-input').focus();
}

async function continuarPin() {
  const pin = document.getElementById('pin-input').value;
  const boton = document.getElementById('btn-pin-continuar');
  boton.textContent = 'Verificando…';
  try {
    const r = await api.validarPin(usuarioTemp, pin);
    exigirBackendActual(r, { requiereToken: true });
    if (!r.ok) {
      mostrarErrorPin('PIN incorrecto');
      return;
    }
    iniciarSesion(usuarioTemp, r.rol || rolTemp, r.token);
    guardarClaveSesion(pin); // Gastos la prueba sola al abrir, sin volver a preguntar
    mostrarInicio();
    ofrecerFaceId(usuarioTemp, rolTemp, pin);
  } catch (e) {
    mostrarErrorPin('No se pudo validar: ' + e.message);
  } finally {
    boton.textContent = 'Entrar';
  }
}

async function validarCodigoActivacion() {
  const codigo = document.getElementById('codigo-activacion-input').value.trim();
  const error = document.getElementById('activacion-error');
  error.classList.add('oculto');
  if (!/^\d{8,}$/.test(codigo)) {
    error.textContent = 'El código de activación debe tener al menos 8 dígitos.';
    error.classList.remove('oculto');
    return;
  }
  try {
    const r = await api.validarActivacion(usuarioTemp, codigo);
    exigirBackendActual(r, { requiereToken: true });
    if (!r.ok) throw new Error(r.error || 'Código de activación incorrecto');
    guardarToken(r.token);
    document.getElementById('codigo-activacion-input').disabled = true;
    document.getElementById('pin-nuevo-input').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-guardar').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-mostrar').classList.add('oculto');
    document.getElementById('pin-nuevo-input').focus();
  } catch (e) {
    borrarToken();
    error.textContent = e.message;
    error.classList.remove('oculto');
  }
}

async function guardarPinNuevo() {
  const pin = document.getElementById('pin-nuevo-input').value;
  if (!/^\d{4}$/.test(pin)) {
    alert('El PIN debe ser de 4 dígitos');
    return;
  }
  const r = await api.crearPin(usuarioTemp, pin);
  exigirBackendActual(r, { requiereToken: true });
  if (!r.ok || !r.token) throw new Error(r.error || 'No se pudo crear el PIN');
  iniciarSesion(usuarioTemp, r.rol || rolTemp, r.token);
  guardarClaveSesion(pin); // Gastos la prueba sola al abrir, sin volver a preguntar
  mostrarInicio();
  ofrecerFaceId(usuarioTemp, rolTemp, pin);
}

function wireEventos() {
  document.getElementById('btn-url-continuar').addEventListener('click', () => {
    const v = document.getElementById('url-input').value.trim();
    if (!v) return;
    setUrl(v);
    mostrarPantalla('pantalla-usuario');
  });

  document.getElementById('btn-usuario-continuar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, continuarUsuario));
  document.getElementById('usuario-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-usuario-continuar').click();
  });

  document.getElementById('btn-pin-continuar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, continuarPin));
  document.getElementById('btn-pin-volver').addEventListener('click', volverAUsuario);
  document.getElementById('btn-activacion-volver').addEventListener('click', volverAUsuario);
  document.getElementById('pin-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-pin-continuar').click();
  });

  document.getElementById('btn-pin-nuevo-mostrar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, validarCodigoActivacion));
  document.getElementById('btn-pin-nuevo-guardar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, guardarPinNuevo));

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    cerrarSesionEnSegundoPlano(api.cerrarSesionServidor);
    document.getElementById('usuario-input').value = '';
    mostrarPantalla('pantalla-usuario');
    renderFaceIdUsuarios();
  });

  document.getElementById('btn-agregar-usuario').addEventListener('click', agregarUsuario);
  document.getElementById('btn-candado-entrar').addEventListener('click', () => intentarCandado(getUsuario()));
  document.getElementById('btn-candado-pin').addEventListener('click', () => {
    const usuario = getUsuario();
    cerrarSesionEnSegundoPlano(api.cerrarSesionServidor);
    document.getElementById('usuario-input').value = usuario;
    mostrarPantalla('pantalla-usuario');
    renderFaceIdUsuarios();
  });
  document.getElementById('btn-faceid-activar').addEventListener('click', activarFaceId);
  document.getElementById('btn-faceid-desactivar').addEventListener('click', desactivarFaceId);
  document.getElementById('faceid-usuarios').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-faceid[data-usuario]');
    if (btn) entrarConFaceId(btn.dataset.usuario);
  });
}

async function init() {
  wireEventos();
  if (!getUrl()) {
    mostrarPantalla('pantalla-url');
    return;
  }
  if (sesionAutenticada(getUsuario(), leerToken())) {
    // Sesión ya guardada -- si activaste Face ID para este usuario, hay que
    // re-confirmar cada vez que se abre la app (no basta con haber entrado
    // una vez); si no lo activaste, entra directo como siempre. La pantalla
    // solo se MUESTRA aquí: el Face ID en sí espera tu toque en el botón.
    const usuario = getUsuario();
    cargarFondoGuardado(); // aquí, no solo en mostrarInicio() -- si no, la
    // pantalla de candado (Face ID), que es la PRIMERA que ves al reabrir la
    // app, se quedaba sin fondo hasta que pasabas de esa pantalla.
    //
    // Optimista a propósito: NO se espera a passkey.disponible() (esa
    // consulta al sensor tarda un rato y era justo el "tarda en aparecer")
    // para decidir qué pantalla mostrar -- si hay PIN cacheado, se muestra
    // la pantalla de candado de una vez; si el sensor resulta no estar
    // disponible, intentarCandado() ya lo explica ahí mismo con un mensaje
    // claro y el botón de "Usar mi PIN" sigue ahí como respaldo.
    if (candado.leerCandado('launcher', usuario)) {
      mostrarPantallaCandado(usuario);
      intentarCandado(usuario);
    } else {
      mostrarInicio();
    }
    return;
  }
  mostrarPantalla('pantalla-usuario');
  renderFaceIdUsuarios();
}

// Ver comentario igual en gastos/js/ui.js -- aquí con alert() porque el
// launcher no tiene toast propio (usa alert() para todo su feedback).
window.addEventListener('unhandledrejection', (e) => {
  console.error('Error sin atrapar:', e.reason);
  alert('Ocurrió un error: ' + (e.reason?.message || e.reason));
});

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  // registration.update() fuerza a revisar si hay un sw.js más nuevo,
  // saltándose el retraso normal del navegador -- sin cambiar la URL del
  // service worker en cada carga (eso sí llegó a causar recargas de más:
  // un ?ts= distinto cada vez podía hacer que el navegador tratara cada
  // apertura como "service worker nuevo" aunque no hubiera cambiado nada).
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {});
  });
  // En cuanto el service worker NUEVO toma control, recarga la página sola
  // -- así nadie tiene que cerrar y volver a abrir la app a mano. PERO si
  // hay un campo de texto con algo escrito, se espera a que la app pase a
  // segundo plano (visibilitychange) para no borrar lo que ibas a mandar.
  let recargando = false;
  function intentarRecargar() {
    if (recargando) return;
    const activo = document.activeElement;
    const escribiendo = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA') && activo.value;
    if (escribiendo) return;
    recargando = true;
    location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', intentarRecargar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) intentarRecargar(); });
}
