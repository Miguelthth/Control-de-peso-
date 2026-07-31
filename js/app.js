// ARCHIVO GENERADO por build.py (paquete "launcher") -- no editar a mano.
// Edita los archivos fuente y vuelve a correr: python build.py

// ── shared/sesion.js ──────────────────────────────────────────
const sesion = (function () {
// Sesión compartida entre el launcher, Gastos y Peso (mismo origen -- misma
// localStorage). Login pasa UNA vez en el launcher; las sub-apps solo leen.

const CLAVE_URL = 'ma_url';
const CLAVE_USUARIO = 'ma_usuario';
const CLAVE_ROL = 'ma_rol';

function getUrl() {
  return localStorage.getItem(CLAVE_URL) || '';
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

function iniciarSesion(usuario, rol) {
  localStorage.setItem(CLAVE_USUARIO, usuario);
  localStorage.setItem(CLAVE_ROL, rol);
}

function cerrarSesion() {
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_ROL);
}

// Llamar al cargar cualquier sub-app: si falta URL o sesión, regresa al
// launcher para iniciar sesión ahí. `rutaLauncher` es relativa a la sub-app
// (ej. '../index.html').
function exigirSesion(rutaLauncher) {
  if (!getUrl() || !getUsuario()) {
    location.href = rutaLauncher;
    return false;
  }
  return true;
}

  return { getUrl, setUrl, getUsuario, getRol, esAdmin, iniciarSesion, cerrarSesion, exigirSesion };
})();
const getUrl = sesion.getUrl;
const setUrl = sesion.setUrl;
const getUsuario = sesion.getUsuario;
const getRol = sesion.getRol;
const esAdmin = sesion.esAdmin;
const iniciarSesion = sesion.iniciarSesion;
const cerrarSesion = sesion.cerrarSesion;
const exigirSesion = sesion.exigirSesion;

// ── shared/api.js ──────────────────────────────────────────
const api = (function () {
// Llamadas HTTP crudas al Web App de Apps Script único (Gastos + Peso).
// Sin caché, sin cola -- eso vive en cola.js de cada app. Aquí solo se habla
// con el servidor.

async function _get(params) {
  const url = getUrl();
  if (!url) throw new Error('No hay URL de Apps Script configurada.');
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${url}?${qs}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function _post(body) {
  const url = getUrl();
  if (!url) throw new Error('No hay URL de Apps Script configurada.');
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS con Apps Script
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function leerDatos() {
  return _get({ accion: 'datos' });
}

function validarUsuario(usuario) {
  return _post({ accion: 'validarUsuario', usuario });
}

function validarPin(usuario, pin) {
  return _post({ accion: 'validarPin', usuario, pin });
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

function crearUsuario(usuarioAdmin, pinAdmin, nombreNuevo, rolNuevo) {
  return _post({ accion: 'crearUsuario', usuarioAdmin, pinAdmin, nombreNuevo, rolNuevo });
}

function guardarGastos(usuario, blob) {
  return _post({ accion: 'guardarGastos', usuario, blob });
}

function leerGastos(usuario) {
  return _get({ accion: 'leerGastos', usuario });
}

  return { leerDatos, validarUsuario, validarPin, crearPin, cambiarPin, guardarPeso, guardarMeta, guardarUnidad, crearUsuario, guardarGastos, leerGastos };
})();
const leerDatos = api.leerDatos;
const validarUsuario = api.validarUsuario;
const validarPin = api.validarPin;
const crearPin = api.crearPin;
const cambiarPin = api.cambiarPin;
const guardarPeso = api.guardarPeso;
const guardarMeta = api.guardarMeta;
const guardarUnidad = api.guardarUnidad;
const crearUsuario = api.crearUsuario;
const guardarGastos = api.guardarGastos;
const leerGastos = api.leerGastos;

// ── js/ui.js ──────────────────────────────────────────
// Launcher: login (URL → usuario → PIN o sin PIN) y los dos botones grandes.

let usuarioTemp = null;
let rolTemp = null;

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((p) => p.classList.add('oculto'));
  document.getElementById(id).classList.remove('oculto');
}

function mostrarInicio() {
  document.getElementById('saludo').textContent = `Hola, ${getUsuario()}`;
  document.getElementById('btn-agregar-usuario').classList.toggle('oculto', !esAdmin());
  mostrarPantalla('pantalla-inicio');
}

async function agregarUsuario() {
  const nombreNuevo = prompt('Nombre del usuario nuevo:');
  if (!nombreNuevo || !nombreNuevo.trim()) return;
  const esOtroAdmin = confirm('¿Este usuario también es administrador?\n\nAceptar = sí, administrador.\nCancelar = no, usuario normal.');
  const pinAdmin = prompt('Tu PIN (vacío si no tienes uno):') || '';
  try {
    const r = await api.crearUsuario(getUsuario(), pinAdmin, nombreNuevo.trim(), esOtroAdmin ? 'admin' : 'normal');
    if (r.ok) alert(`Listo, "${nombreNuevo.trim()}" ya puede entrar (sin PIN hasta que decida ponerse uno).`);
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
  try {
    const r = await api.validarUsuario(usuario);
    if (!r.ok) {
      mostrarErrorUsuario('Usuario incorrecto');
      return;
    }
    usuarioTemp = usuario;
    rolTemp = r.rol;
    if (r.tienePin) {
      mostrarPantalla('pantalla-pin');
      document.getElementById('pin-input').value = '';
      document.getElementById('pin-error').classList.add('oculto');
      document.getElementById('pin-input').focus();
    } else {
      mostrarPantalla('pantalla-pin-nuevo');
    }
  } catch (e) {
    mostrarErrorUsuario('No se pudo validar (¿la URL es correcta?): ' + e.message);
  }
}

async function continuarPin() {
  const pin = document.getElementById('pin-input').value;
  try {
    const r = await api.validarPin(usuarioTemp, pin);
    if (!r.ok) {
      mostrarErrorPin('PIN incorrecto');
      return;
    }
    iniciarSesion(usuarioTemp, rolTemp);
    mostrarInicio();
  } catch (e) {
    mostrarErrorPin('No se pudo validar: ' + e.message);
  }
}

async function guardarPinNuevo() {
  const pin = document.getElementById('pin-nuevo-input').value;
  if (!/^\d{4}$/.test(pin)) {
    alert('El PIN debe ser de 4 dígitos');
    return;
  }
  await api.crearPin(usuarioTemp, pin);
  iniciarSesion(usuarioTemp, rolTemp);
  mostrarInicio();
}

function entrarSinPin() {
  iniciarSesion(usuarioTemp, rolTemp);
  mostrarInicio();
}

function wireEventos() {
  document.getElementById('btn-url-continuar').addEventListener('click', () => {
    const v = document.getElementById('url-input').value.trim();
    if (!v) return;
    setUrl(v);
    mostrarPantalla('pantalla-usuario');
  });

  document.getElementById('btn-usuario-continuar').addEventListener('click', continuarUsuario);
  document.getElementById('usuario-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') continuarUsuario();
  });

  document.getElementById('btn-pin-continuar').addEventListener('click', continuarPin);
  document.getElementById('pin-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') continuarPin();
  });

  document.getElementById('btn-pin-nuevo-mostrar').addEventListener('click', () => {
    document.getElementById('pin-nuevo-input').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-guardar').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-mostrar').classList.add('oculto');
  });
  document.getElementById('btn-pin-nuevo-guardar').addEventListener('click', guardarPinNuevo);
  document.getElementById('btn-sin-pin').addEventListener('click', entrarSinPin);

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    cerrarSesion();
    document.getElementById('usuario-input').value = '';
    mostrarPantalla('pantalla-usuario');
  });

  document.getElementById('btn-agregar-usuario').addEventListener('click', agregarUsuario);
}

function init() {
  wireEventos();
  if (!getUrl()) {
    mostrarPantalla('pantalla-url');
    return;
  }
  if (getUsuario()) {
    mostrarInicio();
    return;
  }
  mostrarPantalla('pantalla-usuario');
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
