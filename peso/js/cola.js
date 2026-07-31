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

export function leerCola() {
  return leerJSON(CLAVE_COLA, []);
}

export function encolarPeso(usuario, fecha, pesoKg) {
  const cola = leerCola().filter((e) => !(e.usuario === usuario && e.fecha === fecha));
  cola.push({ usuario, fecha, pesoKg, ts: Date.now() });
  guardarJSON(CLAVE_COLA, cola);
}

export function leerCache() {
  return leerJSON(CLAVE_CACHE, { usuarios: [], pesos: [] });
}

function guardarCache(datos) {
  guardarJSON(CLAVE_CACHE, datos);
}

// Snapshot del servidor (o el último cacheado si no hay señal) + lo que
// todavía está en la cola sin confirmar, para que lo que acabas de capturar
// se vea de inmediato aunque no haya llegado al Sheet.
function conColaEncima(datos) {
  const cola = leerCola();
  if (!cola.length) return datos;
  const pesos = datos.pesos.filter(
    (p) => !cola.some((e) => e.usuario === p.usuario && e.fecha === p.fecha)
  );
  for (const e of cola) pesos.push({ usuario: e.usuario, fecha: e.fecha, pesoKg: e.pesoKg });
  return { ...datos, pesos };
}

export async function refrescarDatos() {
  try {
    const datos = await api.leerDatos();
    if (datos.ok) {
      guardarCache({ usuarios: datos.usuarios, pesos: datos.pesos });
      return { datos: conColaEncima({ usuarios: datos.usuarios, pesos: datos.pesos }), sinConexion: false };
    }
    throw new Error(datos.error || 'Error del servidor');
  } catch {
    return { datos: conColaEncima(leerCache()), sinConexion: true };
  }
}

let sincronizando = false;

export async function sincronizar() {
  if (sincronizando) return;
  const cola = leerCola();
  if (!cola.length || !navigator.onLine) return;
  sincronizando = true;
  const pendientes = [];
  for (const entrada of cola) {
    try {
      const r = await api.guardarPeso(entrada.usuario, entrada.fecha, entrada.pesoKg);
      if (!r.ok) pendientes.push(entrada);
    } catch {
      pendientes.push(entrada); // sigue sin señal -- se queda en la cola
    }
  }
  guardarJSON(CLAVE_COLA, pendientes);
  sincronizando = false;
  return { sincronizados: cola.length - pendientes.length, pendientes: pendientes.length };
}

export function iniciarSincronizacionAutomatica(alSincronizar) {
  const intentar = async () => {
    const r = await sincronizar();
    if (r && r.sincronizados > 0 && alSincronizar) alSincronizar(r);
  };
  window.addEventListener('online', intentar);
  setInterval(intentar, 15000);
  intentar();
}
