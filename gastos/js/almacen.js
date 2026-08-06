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

export function crearLecturaApertura(usuario, dependencias = {}) {
  const leerLocal = dependencias.leerPendiente || leerPendiente;
  const leerRemoto = dependencias.leerRemoto || leerGastos;
  let promesa;
  return {
    leer() {
      if (!promesa) {
        promesa = Promise.resolve().then(async () => {
          const pendiente = leerLocal(usuario);
          if (pendiente) return { ok: true, blob: pendiente, pendienteDeSincronizar: true };
          const respuesta = await leerRemoto(usuario);
          return { ...respuesta, pendienteDeSincronizar: false };
        }).catch((error) => {
          promesa = null;
          throw error;
        });
      }
      return promesa;
    },
  };
}

export async function intentarEntradaGuardada(datosCache, confirmadoReciente, confirmar) {
  if (!datosCache || !confirmadoReciente) return false;
  return (await confirmar(datosCache.password)) === true;
}

// Para decidir "crear contraseña" vs "ingresar contraseña" al conectar, sin
// necesitar la contraseña todavía.
export async function existeGastos(usuario, lectura = crearLecturaApertura(usuario)) {
  const r = await lectura.leer();
  if (!r.ok) throw new Error(r.error || 'No se pudo verificar el acceso. Intenta de nuevo.');
  return !!(r.ok && r.blob);
}

// Regresa también {clave, saltB64}: la CryptoKey ya derivada, para que las
// escrituras subsecuentes (cada "Guardar") no repitan PBKDF2 (250k
// iteraciones, cientos de ms) -- solo el primer descifrado de la sesión paga
// ese costo.
export async function cargar(usuario, password, lectura = crearLecturaApertura(usuario)) {
  const r = await lectura.leer();
  if (r.pendienteDeSincronizar) {
    // Hay un guardado que no llegó al servidor todavía -- es más reciente
    // que lo que haya en la Hoja, así que se usa este.
    const paquete = JSON.parse(r.blob);
    const { clave, saltB64 } = await crearClaveSesion(password, paquete.salt);
    const datos = await descifrarConClave(paquete, clave); // avienta si password mal
    return { datos: normalizarDatos(datos), pendienteDeSincronizar: true, clave, saltB64 };
  }
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
export function crearRegistroColas() {
  const colas = new Map();
  return {
    encolar(usuario, tarea) {
      const anterior = colas.get(usuario) || Promise.resolve();
      const operacion = anterior.then(tarea);
      colas.set(usuario, operacion.catch(() => {}));
      return operacion;
    },
  };
}

export function crearColaGuardados(dependencias = {}) {
  const cifrar = dependencias.cifrar || cifrarConClave;
  const enviar = dependencias.enviar || guardarGastos;
  const guardarLocal = dependencias.guardarPendiente || guardarPendiente;
  const limpiarLocal = dependencias.limpiarPendiente || limpiarPendiente;
  const registroColas = dependencias.registroColas || crearRegistroColas();
  const versiones = new Map();
  return {
    guardar(usuario, datos, clave, saltB64) {
      const version = (versiones.get(usuario) || 0) + 1;
      versiones.set(usuario, version);
      const operacion = registroColas.encolar(usuario, async () => {
        const paquete = await cifrar(datos, clave, saltB64);
        const blobStr = JSON.stringify(paquete);
        guardarLocal(usuario, blobStr);
        try {
          const r = await enviar(usuario, blobStr);
          if (r.ok) {
            if (versiones.get(usuario) === version) limpiarLocal(usuario);
            return { sincronizado: true };
          }
        } catch {
          // queda en la cola local
        }
        return { sincronizado: false };
      });
      return operacion;
    },
  };
}

async function ejecutarSincronizacion(usuario, estado, dependencias) {
  const estaEnLinea = dependencias.estaEnLinea || (() => navigator.onLine);
  const leerLocal = dependencias.leerPendiente || leerPendiente;
  const enviar = dependencias.enviar || guardarGastos;
  const limpiarLocal = dependencias.limpiarPendiente || limpiarPendiente;
  if (estado.sincronizando || !estaEnLinea()) return false;
  const pendiente = leerLocal(usuario);
  if (!pendiente) return false;
  estado.sincronizando = true;
  let ok = false;
  try {
    const r = await enviar(usuario, pendiente);
    if (r.ok && leerLocal(usuario) === pendiente) {
      limpiarLocal(usuario);
      ok = true;
    }
  } catch {
    // sigue pendiente, se reintenta después
  }
  estado.sincronizando = false;
  return ok;
}

export function crearAlmacenSesion(dependencias = {}) {
  const registroColas = dependencias.registroColas || crearRegistroColas();
  const colaGuardados = crearColaGuardados({ ...dependencias, registroColas });
  const estados = new Map();
  return {
    guardar: (usuario, datos, clave, saltB64) => colaGuardados.guardar(usuario, datos, clave, saltB64),
    sincronizarPendiente(usuario, estado = null) {
      const estadoUsuario = estado || estados.get(usuario) || { sincronizando: false };
      estados.set(usuario, estadoUsuario);
      return registroColas.encolar(usuario, () => ejecutarSincronizacion(usuario, estadoUsuario, dependencias));
    },
  };
}

const almacenSesion = crearAlmacenSesion();

export function guardar(usuario, datos, clave, saltB64) {
  return almacenSesion.guardar(usuario, datos, clave, saltB64);
}

export function sincronizarPendiente(usuario, estado = { sincronizando: false }, dependencias) {
  if (dependencias) return ejecutarSincronizacion(usuario, estado, dependencias);
  return almacenSesion.sincronizarPendiente(usuario, estado);
}

export function crearSincronizadorAutomatico(dependencias = {}) {
  const sincronizar = dependencias.sincronizar || ((usuario, estado) => sincronizarPendiente(usuario, estado));
  const eventTarget = dependencias.eventTarget || globalThis;
  const scheduler = dependencias.scheduler || globalThis;
  return function iniciar(usuario, alSincronizar) {
    const estado = { sincronizando: false };
  const intentar = async () => {
      const sincronizo = await sincronizar(usuario, estado);
    if (sincronizo && alSincronizar) alSincronizar();
  };
    eventTarget.addEventListener('online', intentar);
    const intervalo = scheduler.setInterval(intentar, 15000);
    return () => {
      eventTarget.removeEventListener('online', intentar);
      scheduler.clearInterval(intervalo);
    };
  };
}

const iniciarSincronizador = crearSincronizadorAutomatico();

export function iniciarSincronizacionAutomatica(usuario, alSincronizar) {
  return iniciarSincronizador(usuario, alSincronizar);
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
