// Sesión compartida entre el launcher, Gastos y Peso (mismo origen -- misma
// localStorage). Login pasa UNA vez en el launcher; las sub-apps solo leen.

const CLAVE_URL = 'ma_url';
const CLAVE_USUARIO = 'ma_usuario';
const CLAVE_ROL = 'ma_rol';

export function getUrl() {
  return localStorage.getItem(CLAVE_URL) || '';
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

export function iniciarSesion(usuario, rol) {
  localStorage.setItem(CLAVE_USUARIO, usuario);
  localStorage.setItem(CLAVE_ROL, rol);
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_ROL);
}

// Llamar al cargar cualquier sub-app: si falta URL o sesión, regresa al
// launcher para iniciar sesión ahí. `rutaLauncher` es relativa a la sub-app
// (ej. '../index.html').
export function exigirSesion(rutaLauncher) {
  if (!getUrl() || !getUsuario()) {
    location.href = rutaLauncher;
    return false;
  }
  return true;
}
