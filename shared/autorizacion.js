const CLAVE_TOKEN = 'ma_token';
const PUBLICAS = new Set(['validarUsuario', 'validarPin', 'validarActivacion']);
const MENSAJE_BACKEND_ANTIGUO = 'El servidor necesita actualizarse primero. Pide al administrador desplegar la nueva versión de Apps Script.';

function storagePredeterminado() {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

export function guardarToken(token, storage = storagePredeterminado()) {
  if (storage && token) storage.setItem(CLAVE_TOKEN, String(token));
}

export function leerToken(storage = storagePredeterminado()) {
  return storage ? storage.getItem(CLAVE_TOKEN) || '' : '';
}

export function borrarToken(storage = storagePredeterminado()) {
  if (storage) storage.removeItem(CLAVE_TOKEN);
}

export function requiereAutorizacion(accion) {
  return !PUBLICAS.has(String(accion || ''));
}

export function agregarCredenciales(solicitud, usuario, token) {
  if (!requiereAutorizacion(solicitud.accion)) return { ...solicitud };
  return { ...solicitud, usuario: solicitud.usuario || usuario, token };
}

export function exigirBackendActual(respuesta, { requiereToken = false } = {}) {
  const version = Number(respuesta?.apiVersion);
  if (!Number.isFinite(version) || version < 2 || (requiereToken && respuesta?.ok === true && !String(respuesta?.token || ''))) {
    throw new Error(MENSAJE_BACKEND_ANTIGUO);
  }
  return true;
}

export function validarSesion({
  sesion, usuarioActual, usuarioSolicitado, ahora = Date.now(), rolRequerido = null, alcancePermitido = null,
}) {
  if (!sesion || !usuarioActual || !usuarioActual.activo) return false;
  if (sesion.expira <= ahora) return false;
  if (sesion.usuario !== usuarioSolicitado || usuarioActual.usuario !== sesion.usuario) return false;
  if (usuarioActual.rol !== sesion.rol) return false;
  if (rolRequerido && usuarioActual.rol !== rolRequerido) return false;
  return sesion.alcance === 'completo' || sesion.alcance === alcancePermitido;
}

export function puedeValidarPin(pinConfigurado, pinRecibido) {
  return String(pinConfigurado || '') !== '' && String(pinConfigurado) === String(pinRecibido || '').trim();
}

export function siguienteBloqueoPin(intentosAnteriores, ahora = Date.now()) {
  const intentos = Math.max(0, Number(intentosAnteriores) || 0) + 1;
  const demora = Math.min(60000, Math.pow(2, Math.max(0, intentos - 3)) * 1000);
  return { intentos, hasta: ahora + demora };
}

export function pinNuevoValido(pin) { return /^\d{4}$/.test(String(pin)); }

export function usuarioValido(usuario) {
  return /^[\p{L}\p{N} _.-]{1,64}$/u.test(String(usuario || '')) && !String(usuario).includes('..');
}

export function fechaISOValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export function numeroEnRango(valor, minimo, maximo) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= minimo && n <= maximo;
}

export function blobCifradoValido(blob, maximo = 1000000) {
  if (typeof blob !== 'string' || blob.length < 2 || blob.length > maximo || /^[=+\-@]/.test(blob)) return false;
  try {
    const p = JSON.parse(blob);
    const b64 = (v) => typeof v === 'string' && v.length <= maximo && /^[A-Za-z0-9+/]+={0,2}$/.test(v);
    return p && p.cifrado === true && p.v === 1 && b64(p.salt) && b64(p.iv) && b64(p.datos);
  } catch { return false; }
}

export function dividirTexto(texto, maximo = 40000) {
  const valor = String(texto);
  if (!Number.isInteger(maximo) || maximo < 1) throw new Error('Tamaño de chunk inválido');
  if (valor === '') return [''];
  const chunks = [];
  for (let i = 0; i < valor.length; i += maximo) chunks.push(valor.slice(i, i + maximo));
  return chunks;
}

export function reunirTexto(chunks) {
  return Array.isArray(chunks) ? chunks.map(String).join('') : '';
}
