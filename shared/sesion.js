// Sesión compartida entre el launcher, Gastos y Peso (mismo origen -- misma
// localStorage). Login pasa UNA vez en el launcher; las sub-apps solo leen.

import { borrarToken, guardarToken, leerToken } from './autorizacion.js';
import { crearVerificadorLocal, verificarAccesoLocal } from './acceso_local.js';

const CLAVE_URL = 'ma_url';
const CLAVE_USUARIO = 'ma_usuario';
const CLAVE_ROL = 'ma_rol';
const CLAVE_PERFILES = 'ma_perfiles_conocidos';
const CLAVE_SESION_PASS = 'ma_clave_sesion'; // sessionStorage, no localStorage -- ver comentario abajo
const CLAVE_SESION_LOCAL = 'ma_sesion_local';
const PREFIJO_ACCESO_LOCAL = 'ma_acceso_local_v1:';
const TOKEN_SESION_LOCAL = 'local-sin-conexion';

// Respaldo fijo: la liga del servidor no cambia (es la de Link_Servidor.txt)
// -- si el iPhone borra localStorage entre usos (pasa en algunos ajustes de
// privacidad de Safari), al menos ese paso no se repite cada vez. Si algún
// día se redespliega Apps Script con OTRA liga, hay que actualizarla aquí.
const URL_RESPALDO = 'https://script.google.com/macros/s/AKfycbw3v_9rf4lrf5x910CXedDcyJPIkAic-Dx1VF8Hiucf0RQWj3Pg77SXibvjT8TXKWu9/exec';

export function getUrl() {
  return localStorage.getItem(CLAVE_URL) || URL_RESPALDO;
}

export function setUrl(url) {
  localStorage.setItem(CLAVE_URL, url.trim());
}

export function getUsuario() {
  return localStorage.getItem(CLAVE_USUARIO) || '';
}

export function getRol() {
  return localStorage.getItem(CLAVE_ROL) || '';
}

export function esAdmin() {
  return getRol() === 'admin';
}

// Solo guarda metadatos de navegación para evitar una consulta preliminar a
// Apps Script. No contiene PIN, token ni ningún secreto de autenticación.
export function guardarPerfilConocido(usuario, rol, tienePin = true) {
  const nombre = String(usuario || '').trim();
  if (!nombre) return;
  let perfiles = {};
  try { perfiles = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || '{}'); } catch { perfiles = {}; }
  perfiles[nombre.toLowerCase()] = { usuario: nombre, rol: String(rol || ''), tienePin: tienePin === true };
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(perfiles));
}

export function leerPerfilConocido(usuario) {
  try {
    const perfiles = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || '{}');
    const perfil = perfiles[String(usuario || '').trim().toLowerCase()];
    return perfil && typeof perfil.usuario === 'string' ? perfil : null;
  } catch {
    return null;
  }
}

export function iniciarSesion(usuario, rol, token) {
  localStorage.setItem(CLAVE_USUARIO, usuario);
  localStorage.setItem(CLAVE_ROL, rol);
  sessionStorage.removeItem(CLAVE_SESION_LOCAL);
  if (token) guardarToken(token);
  guardarPerfilConocido(usuario, rol, true);
}

function claveAccesoLocal(usuario) {
  return `${PREFIJO_ACCESO_LOCAL}${String(usuario || '').trim().toLocaleLowerCase()}`;
}

export async function guardarAccesoLocal(usuario, password) {
  const nombre = String(usuario || '').trim();
  if (!nombre) throw new Error('Falta el usuario.');
  const verificador = await crearVerificadorLocal(password);
  localStorage.setItem(claveAccesoLocal(nombre), JSON.stringify(verificador));
}

export async function validarAccesoLocal(usuario, password) {
  try {
    const crudo = localStorage.getItem(claveAccesoLocal(usuario));
    return verificarAccesoLocal(password, JSON.parse(crudo));
  } catch {
    return false;
  }
}

export function iniciarSesionLocal(usuario, rol) {
  const nombre = String(usuario || '').trim();
  if (!nombre) throw new Error('Falta el usuario.');
  localStorage.setItem(CLAVE_USUARIO, nombre);
  localStorage.setItem(CLAVE_ROL, String(rol || 'normal'));
  sessionStorage.setItem(CLAVE_SESION_LOCAL, '1');
  guardarToken(TOKEN_SESION_LOCAL);
}

export function esSesionLocal() {
  return sessionStorage.getItem(CLAVE_SESION_LOCAL) === '1' && leerToken() === TOKEN_SESION_LOCAL;
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_ROL);
  sessionStorage.removeItem(CLAVE_SESION_LOCAL);
  borrarClaveSesion();
  borrarToken();
}

// Inicia la invalidación mientras el token todavía existe, limpia el estado
// local de inmediato y absorbe errores de red: salir nunca debe dejar la UI
// esperando ni conservar credenciales en el dispositivo.
export function cerrarSesionEnSegundoPlano(invalidar) {
  let solicitud;
  try { solicitud = invalidar(); }
  catch { solicitud = undefined; }
  cerrarSesion();
  return Promise.resolve(solicitud).catch(() => undefined);
}

export function debeConfirmarNavegacion({ valor, enviado }) {
  return !enviado && String(valor ?? '').trim().length > 0;
}

// El texto mientras trabaja sale de data-cargando en el botón -- no todo
// botón "guarda" (ej. el de entrar solo verifica).
export async function ejecutarUnaVez(boton, accion) {
  if (boton.disabled) return undefined;
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.setAttribute('aria-busy', 'true');
  boton.textContent = boton.dataset.cargando || 'Guardando…';
  try { return await accion(); }
  finally {
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    boton.textContent = textoOriginal;
  }
}

export function sesionAutenticada(usuario, token) {
  return String(usuario || '').length > 0 && String(token || '').length > 0;
}

export function accesoFaceIdValido(respuesta) {
  return respuesta?.ok === true && String(respuesta.token || '').length > 0;
}

export { guardarToken, leerToken, borrarToken };

// El PIN/contraseña que se escribió al entrar en el launcher, guardado SOLO
// en sessionStorage (se borra solo al cerrar la pestaña/navegador, nunca
// persiste como localStorage) -- Gastos lo prueba primero como su propia
// contraseña de cifrado antes de preguntar la suya, para no volver a pedir
// nada al pasar de Peso a Gastos. Nunca se manda al servidor -- solo se usa
// localmente para intentar descifrar (ver gastos/js/ui.js::intentarEntradaAutomatica).
export function guardarClaveSesion(pass) {
  sessionStorage.setItem(CLAVE_SESION_PASS, pass);
}

export function leerClaveSesion() {
  return sessionStorage.getItem(CLAVE_SESION_PASS) || '';
}

export function borrarClaveSesion() {
  sessionStorage.removeItem(CLAVE_SESION_PASS);
}

// Llamar al cargar cualquier sub-app: si falta URL o sesión, regresa al
// launcher para iniciar sesión ahí. `rutaLauncher` es relativa a la sub-app
// (ej. '../index.html').
export function exigirSesion(rutaLauncher) {
  if (!getUrl() || !getUsuario() || !leerToken()) {
    location.href = rutaLauncher;
    return false;
  }
  return true;
}
