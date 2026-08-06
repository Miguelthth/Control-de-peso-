// Cola offline (mismo patrón que el Cotizador): capturar nunca espera al
// servidor. Se guarda de una en localStorage, se ve en la app al instante, y
// se sincroniza cuando hay señal -- reintentando solo, sin que el usuario
// tenga que hacer nada.

import * as api from '../../shared/api.js';

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

export function compactarOperaciones(operaciones) {
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

export function leerCola(usuario) {
  migrarColaAnterior();
  if (!usuario) return [];
  return leerJSON(claveCola(usuario), []).filter((e) => e.usuario === usuario);
}

export function encolarPeso(usuario, fecha, pesoKg) {
  const cola = compactarOperaciones(leerCola(usuario).concat({ tipo: 'guardar', usuario, fecha, pesoKg, ts: Date.now(), opId: nuevoOpId() }));
  guardarJSON(claveCola(usuario), cola);
}

// Igual que encolarPeso pero para un borrado -- así "Borrar" funciona sin
// red exactamente igual que "Guardar" (antes solo guardar tenía cola).
export function encolarBorrado(usuario, fecha) {
  const cola = compactarOperaciones(leerCola(usuario).concat({ tipo: 'borrar', usuario, fecha, ts: Date.now(), opId: nuevoOpId() }));
  guardarJSON(claveCola(usuario), cola);
}

export function leerCache() {
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

export async function refrescarDatos(usuario) {
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
export async function hayCambiosRemotos() {
  try {
    const r = await api.leerVersion();
    if (!r.ok) return false;
    return String(r.version) !== String(leerCache().version || '0');
  } catch {
    return false;
  }
}

let sincronizando = false;

export async function sincronizar(usuario, transporte = api) {
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

export function iniciarSincronizacionAutomatica(usuario, alSincronizar) {
  const intentar = async () => {
    const r = await sincronizar(usuario);
    if (r && r.sincronizados > 0 && alSincronizar) alSincronizar(r);
  };
  window.addEventListener('online', intentar);
  setInterval(intentar, 15000);
  intentar();
}
