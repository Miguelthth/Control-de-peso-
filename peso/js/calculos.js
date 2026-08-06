// Toda la aritmética de peso/progreso. Puro: recibe datos, regresa números.

import { hoyISO } from './modelo.js';

export function pesosDeUsuario(pesos, usuario) {
  return pesos
    .filter((p) => p.usuario === usuario)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function ultimoPeso(pesos, usuario) {
  const propios = pesosDeUsuario(pesos, usuario);
  return propios.length ? propios[propios.length - 1] : null;
}

// Racha de días consecutivos (hasta hoy) con registro. Un hueco la corta.
export function racha(pesos, usuario, hoy = hoyISO()) {
  const fechas = new Set(pesosDeUsuario(pesos, usuario).map((p) => p.fecha));
  let n = 0;
  let cursor = new Date(`${hoy}T00:00:00`);
  if (!fechas.has(hoy)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!fechas.has(iso)) break;
    n++;
    cursor.setDate(cursor.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}

// Promedio móvil de `dias` (suaviza el ruido día a día: agua, comida, etc.)
export function promedioMovil(serie, dias) {
  return serie.map((punto, i) => {
    const desde = Math.max(0, i - dias + 1);
    const ventana = serie.slice(desde, i + 1);
    const prom = ventana.reduce((a, p) => a + p.pesoKg, 0) / ventana.length;
    return { fecha: punto.fecha, pesoKg: Math.round(prom * 10) / 10 };
  });
}

// {kgPerdidos, kgRestantes, pctAvance} -- null si no hay meta o no hay peso inicial.
export function avanceMeta(usuario, pesoActualKg) {
  const { metaKg, pesoInicialKg } = usuario;
  if (metaKg == null || pesoInicialKg == null || pesoActualKg == null) return null;
  const totalPorPerder = pesoInicialKg - metaKg;
  if (totalPorPerder === 0) return { kgPerdidos: 0, kgRestantes: 0, pctAvance: 1 };
  const perdidoHastaAhora = pesoInicialKg - pesoActualKg;
  const pct = perdidoHastaAhora / totalPorPerder;
  return {
    kgPerdidos: Math.round(perdidoHastaAhora * 10) / 10,
    kgRestantes: Math.round((pesoActualKg - metaKg) * 10) / 10,
    pctAvance: Math.max(0, Math.min(1.5, pct)), // permite pasarse de la meta (>1) sin romper la barra visualmente arriba de eso
  };
}

// Últimos `n` promedios semanales (domingo-sábado), para la gráfica de tendencia suave.
export function promedioSemanal(serie, semanas = 12) {
  if (!serie.length) return [];
  const porSemana = new Map();
  for (const p of serie) {
    const d = new Date(`${p.fecha}T00:00:00`);
    const inicioSemana = new Date(d);
    inicioSemana.setDate(d.getDate() - d.getDay());
    const clave = inicioSemana.toISOString().slice(0, 10);
    if (!porSemana.has(clave)) porSemana.set(clave, []);
    porSemana.get(clave).push(p.pesoKg);
  }
  const claves = [...porSemana.keys()].sort().slice(-semanas);
  return claves.map((clave) => {
    const valores = porSemana.get(clave);
    const prom = valores.reduce((a, v) => a + v, 0) / valores.length;
    return { semana: clave, pesoKg: Math.round(prom * 10) / 10 };
  });
}
