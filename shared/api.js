// Llamadas HTTP crudas al Web App de Apps Script único (Gastos + Peso).
// Sin caché, sin cola -- eso vive en cola.js de cada app. Aquí solo se habla
// con el servidor.

import { getUrl, getUsuario, leerToken, borrarToken } from './sesion.js';
import { agregarCredenciales } from './autorizacion.js';

const TIMEOUT_MS = 12000;
let manejadorAuth = null;

export function configurarManejadorAuth(fn) {
  manejadorAuth = typeof fn === 'function' ? fn : null;
}

function esFalloAuth(resultado) {
  if (!resultado || resultado.ok !== false) return false;
  const detalle = `${resultado.codigo || ''} ${resultado.error || ''}`;
  return /(?:auth|sesi[oó]n.*(?:inv[aá]lida|vencida|expirada)|token)/i.test(detalle);
}

export class ApiError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

export async function solicitarJson(url, opciones = {}, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS, scheduler = globalThis } = {}) {
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

export async function cerrarSesionServidor() {
  try { return await _post({ accion: 'cerrarSesion' }); }
  finally { borrarToken(); }
}

export function leerDatos() {
  return _post({ accion: 'leerDatos' });
}

// Consulta barata (no toca Hojas) para saber si algo cambió en Peso antes
// de pedir 'datos' completo -- se puede llamar seguido sin gastar cuota.
export function leerVersion() {
  return _post({ accion: 'leerVersion' });
}

export function guardarFechasReto(usuario, inicio, fin) {
  return _post({ accion: 'guardarFechasReto', usuario, inicio, fin });
}

export function validarUsuario(usuario) {
  return _post({ accion: 'validarUsuario', usuario });
}

export function validarPin(usuario, pin) {
  return _post({ accion: 'validarPin', usuario, pin });
}

export function validarActivacion(usuario, codigo) {
  return _post({ accion: 'validarActivacion', usuario, codigo });
}

export function crearPin(usuario, pinNuevo) {
  return _post({ accion: 'crearPin', usuario, pinNuevo });
}

export function cambiarPin(usuario, pinActual, pinNuevo) {
  return _post({ accion: 'cambiarPin', usuario, pinActual, pinNuevo });
}

export function guardarPeso(usuario, fecha, pesoKg) {
  return _post({ accion: 'guardarPeso', usuario, fecha, pesoKg });
}

export function guardarMeta(usuario, metaKg, pesoInicialKg) {
  return _post({ accion: 'guardarMeta', usuario, metaKg, pesoInicialKg });
}

export function guardarUnidad(usuario, unidad) {
  return _post({ accion: 'guardarUnidad', usuario, unidad });
}

export function borrarPesos(usuario) {
  return _post({ accion: 'borrarPesos', usuario });
}

export function borrarPesoFecha(usuario, fecha) {
  return _post({ accion: 'borrarPesoFecha', usuario, fecha });
}

export function crearUsuario(nombreNuevo, rolNuevo) {
  return _post({ accion: 'crearUsuario', nombreNuevo, rolNuevo });
}

export function guardarGastos(usuario, blob) {
  return _post({ accion: 'guardarGastos', usuario, blob });
}

export function leerGastos(usuario) {
  return _post({ accion: 'leerGastos', usuario });
}
