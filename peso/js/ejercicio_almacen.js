import { crearDocumentoEjercicio } from './ejercicio_modelo.js';

const claveDatos = (u) => `cp_ejercicio_datos:${u}`;
const claveCola = (u) => `cp_ejercicio_cola:${u}`;
const obtenerStorage = (s) => s || localStorage;

function leerJSON(storage, clave, defecto) {
  try { return JSON.parse(storage.getItem(clave)) || defecto; } catch { return defecto; }
}

export function leerLocal(usuario, storage) {
  return leerJSON(obtenerStorage(storage), claveDatos(usuario), crearDocumentoEjercicio());
}

export function guardarLocal(usuario, datos, storage) {
  obtenerStorage(storage).setItem(claveDatos(usuario), JSON.stringify(datos));
  return datos;
}

export function leerPendientes(usuario, storage) {
  return leerJSON(obtenerStorage(storage), claveCola(usuario), []);
}

function guardarPendientes(usuario, cola, storage) {
  obtenerStorage(storage).setItem(claveCola(usuario), JSON.stringify(cola));
}

export function mutarLocal(usuario, mutador, { storage, now = () => new Date().toISOString(), uuid = () => crypto.randomUUID(), tipo = 'reemplazar_documento', entidadId = 'documento' } = {}) {
  const s = obtenerStorage(storage), datos = structuredClone(leerLocal(usuario, s));
  mutador(datos);
  const modificadoEn = now();
  datos.modificadoEn = modificadoEn;
  guardarLocal(usuario, datos, s);
  const operacion = { opId: uuid(), tipo, entidadId, modificadoEn };
  guardarPendientes(usuario, [...leerPendientes(usuario, s), operacion], s);
  return { datos, operacion };
}

export function confirmarOperacion(usuario, opId, storage) {
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

export function mezclarDocumento(local, remoto) {
  const base = crearDocumentoEjercicio();
  const resultado = { ...base, ...remoto, ...local };
  for (const campo of ['categorias', 'ejercicios', 'rutinas', 'sesiones', 'hiits']) resultado[campo] = mezclarLista(local?.[campo], remoto?.[campo]);
  resultado.version = 2;
  resultado.modificadoEn = [local?.modificadoEn, remoto?.modificadoEn].filter(Boolean).sort().at(-1) || base.modificadoEn;
  return resultado;
}

export async function sincronizarPendientes(usuario, api, { storage, alCambiar } = {}) {
  const s = obtenerStorage(storage);
  for (const operacion of leerPendientes(usuario, s)) {
    const respuesta = await api.guardarOperacionEjercicio(operacion, leerLocal(usuario, s));
    if (!respuesta?.ok) throw new Error(respuesta?.error || 'No se pudo sincronizar Ejercicio');
    confirmarOperacion(usuario, operacion.opId, s);
    alCambiar?.();
  }
  return leerPendientes(usuario, s).length;
}
