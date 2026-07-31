// Lee/escribe los Gastos de un usuario en su Hoja privada (backend en
// shared/api.js). El contenido SIEMPRE viaja cifrado (shared/cifrado.js) --
// este archivo nunca ve un movimiento en claro, solo el "paquete" cifrado.
//
// Cola offline: si guardar falla (sin señal), el paquete se queda en
// localStorage y se reintenta solo -- mismo espíritu que Control de Peso.

import { leerGastos, guardarGastos } from '../../shared/api.js';
import { crearClaveSesion, cifrarConClave, descifrarConClave } from '../../shared/cifrado.js';
import { normalizarDatos, crearDatosVacios } from './modelo.js';

function clavePendiente(usuario) {
  return `gastos_pendiente_${usuario}`;
}

function guardarPendiente(usuario, blobStr) {
  localStorage.setItem(clavePendiente(usuario), blobStr);
}
function leerPendiente(usuario) {
  return localStorage.getItem(clavePendiente(usuario));
}
function limpiarPendiente(usuario) {
  localStorage.removeItem(clavePendiente(usuario));
}

// Para decidir "crear contraseña" vs "ingresar contraseña" al conectar, sin
// necesitar la contraseña todavía.
export async function existeGastos(usuario) {
  if (leerPendiente(usuario)) return true;
  const r = await leerGastos(usuario);
  return !!(r.ok && r.blob);
}

// Regresa también {clave, saltB64}: la CryptoKey ya derivada, para que las
// escrituras subsecuentes (cada "Guardar") no repitan PBKDF2 (250k
// iteraciones, cientos de ms) -- solo el primer descifrado de la sesión paga
// ese costo.
export async function cargar(usuario, password) {
  const pendiente = leerPendiente(usuario);
  if (pendiente) {
    // Hay un guardado que no llegó al servidor todavía -- es más reciente
    // que lo que haya en la Hoja, así que se usa este.
    const paquete = JSON.parse(pendiente);
    const { clave, saltB64 } = await crearClaveSesion(password, paquete.salt);
    const datos = await descifrarConClave(paquete, clave); // avienta si password mal
    return { datos: normalizarDatos(datos), pendienteDeSincronizar: true, clave, saltB64 };
  }
  const r = await leerGastos(usuario);
  if (!r.ok) throw new Error(r.error || 'No se pudo leer');
  if (!r.blob) {
    const { clave, saltB64 } = await crearClaveSesion(password);
    return { datos: crearDatosVacios(), pendienteDeSincronizar: false, clave, saltB64 };
  }
  const paquete = JSON.parse(r.blob);
  const { clave, saltB64 } = await crearClaveSesion(password, paquete.salt);
  const datos = await descifrarConClave(paquete, clave); // avienta si password mal
  return { datos: normalizarDatos(datos), pendienteDeSincronizar: false, clave, saltB64 };
}

// Regresa {sincronizado}: true si ya llegó al servidor, false si quedó en
// cola local (sin señal) -- en ambos casos el dato ya está a salvo.
// `clave`/`saltB64` vienen de cargar() o crearClaveSesion() -- ya no se
// vuelve a pedir la contraseña ni a rederivarla en cada guardado.
export async function guardar(usuario, datos, clave, saltB64) {
  const paquete = await cifrarConClave(datos, clave, saltB64);
  const blobStr = JSON.stringify(paquete);
  try {
    const r = await guardarGastos(usuario, blobStr);
    if (r.ok) {
      limpiarPendiente(usuario);
      return { sincronizado: true };
    }
    guardarPendiente(usuario, blobStr);
    return { sincronizado: false };
  } catch {
    guardarPendiente(usuario, blobStr);
    return { sincronizado: false };
  }
}

let sincronizando = false;

export async function sincronizarPendiente(usuario) {
  if (sincronizando || !navigator.onLine) return false;
  const pendiente = leerPendiente(usuario);
  if (!pendiente) return false;
  sincronizando = true;
  let ok = false;
  try {
    const r = await guardarGastos(usuario, pendiente);
    if (r.ok) {
      limpiarPendiente(usuario);
      ok = true;
    }
  } catch {
    // sigue pendiente, se reintenta después
  }
  sincronizando = false;
  return ok;
}

export function iniciarSincronizacionAutomatica(usuario, alSincronizar) {
  const intentar = async () => {
    const sincronizo = await sincronizarPendiente(usuario);
    if (sincronizo && alSincronizar) alSincronizar();
  };
  window.addEventListener('online', intentar);
  setInterval(intentar, 15000);
}

export function exportarPaquete(paquete) {
  const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gastos-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function leerArchivoSubido(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        resolve(JSON.parse(lector.result));
      } catch (e) {
        reject(e);
      }
    };
    lector.onerror = reject;
    lector.readAsText(archivo);
  });
}
