// Toda la aritmética de dinero. Puro: recibe datos, regresa números. Sin DOM, sin storage.
// Todas las sumas se hacen en centavos enteros para evitar errores de punto flotante.

import { mesDeFecha, hoyISO } from './modelo.js';

export function aCentavos(pesos) {
  return Math.round(pesos * 100);
}

export function aPesos(centavos) {
  return centavos / 100;
}

export function sumaCentavos(movimientos) {
  return movimientos.reduce((acc, m) => acc + aCentavos(m.monto), 0);
}

export function filtrarPorMes(movimientos, mesStr, tipo = null) {
  return movimientos.filter((m) => mesDeFecha(m.fecha) === mesStr && (!tipo || m.tipo === tipo));
}

export function totalPorTipo(movimientos, tipo, mesStr) {
  return aPesos(sumaCentavos(filtrarPorMes(movimientos, mesStr, tipo)));
}

export function neto(movimientos, mesStr) {
  return totalPorTipo(movimientos, 'ingreso', mesStr) - totalPorTipo(movimientos, 'gasto', mesStr);
}

export function totalPorCategoria(movimientos, mesStr, tipo = 'gasto') {
  const mapa = new Map();
  for (const m of filtrarPorMes(movimientos, mesStr, tipo)) {
    mapa.set(m.categoria, (mapa.get(m.categoria) || 0) + aCentavos(m.monto));
  }
  return [...mapa.entries()]
    .map(([categoria, centavos]) => ({ categoria, total: aPesos(centavos) }))
    .sort((a, b) => b.total - a.total);
}

// Últimos `n` meses (incluyendo el de `mesRef`), en orden cronológico.
export function ultimosMeses(mesRef, n = 12) {
  const [y, m] = mesRef.split('-').map(Number);
  const meses = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}

export function totalesPorMes(movimientos, tipo, mesRef, n = 12) {
  const meses = ultimosMeses(mesRef, n);
  return meses.map((mes) => ({ mes, total: totalPorTipo(movimientos, tipo, mes) }));
}

export function promedioDiario(movimientos, mesStr, hoy = hoyISO()) {
  const [y, m] = mesStr.split('-').map(Number);
  const esMesActual = mesStr === hoy.slice(0, 7);
  const diaHoy = Number(hoy.slice(8, 10));
  const diasTranscurridos = esMesActual ? diaHoy : diasEnMes(y, m);
  const total = totalPorTipo(movimientos, 'gasto', mesStr);
  return diasTranscurridos > 0 ? total / diasTranscurridos : 0;
}

export function diasEnMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

export function proyeccionCierre(movimientos, mesStr, hoy = hoyISO()) {
  const [y, m] = mesStr.split('-').map(Number);
  const totalDias = diasEnMes(y, m);
  if (mesStr !== hoy.slice(0, 7)) {
    return totalPorTipo(movimientos, 'gasto', mesStr);
  }
  const prom = promedioDiario(movimientos, mesStr, hoy);
  return Math.round(prom * totalDias * 100) / 100;
}

export function gastoHormiga(movimientos, mesStr, umbral = 150) {
  const chicos = filtrarPorMes(movimientos, mesStr, 'gasto').filter((m) => m.monto < umbral);
  return { total: aPesos(sumaCentavos(chicos)), cantidad: chicos.length };
}

export function topGastos(movimientos, mesStr, n = 5) {
  return [...filtrarPorMes(movimientos, mesStr, 'gasto')].sort((a, b) => b.monto - a.monto).slice(0, n);
}

export function diaSemanaMasCaro(movimientos, mesStr) {
  const nombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const porDia = new Array(7).fill(0);
  for (const m of filtrarPorMes(movimientos, mesStr, 'gasto')) {
    const dow = new Date(`${m.fecha}T00:00:00`).getDay();
    porDia[dow] += aCentavos(m.monto);
  }
  let idx = 0;
  for (let i = 1; i < 7; i++) if (porDia[i] > porDia[idx]) idx = i;
  return porDia[idx] > 0 ? { dia: nombres[idx], total: aPesos(porDia[idx]) } : null;
}

// Racha de días consecutivos (hasta hoy) sin ningún movimiento de gasto.
export function rachaSinGastar(movimientos, hoy = hoyISO()) {
  const fechasConGasto = new Set(movimientos.filter((m) => m.tipo === 'gasto').map((m) => m.fecha));
  let racha = 0;
  let cursor = new Date(`${hoy}T00:00:00`);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (fechasConGasto.has(iso)) break;
    racha++;
    cursor.setDate(cursor.getDate() - 1);
    if (racha > 366) break;
  }
  return racha;
}

// Promedio de gasto de una categoría en los `n` meses anteriores a mesStr (sin incluirlo).
export function promedioCategoriaMesesPrevios(movimientos, categoria, mesStr, n = 3) {
  const meses = ultimosMeses(mesStr, n + 1).slice(0, -1);
  if (!meses.length) return 0;
  const totalCentavos = meses.reduce((acc, mes) => {
    const filas = filtrarPorMes(movimientos, mes, 'gasto').filter((m) => m.categoria === categoria);
    return acc + sumaCentavos(filas);
  }, 0);
  return aPesos(totalCentavos) / meses.length;
}

export function estadoPresupuestos(movimientos, presupuestos, mesStr) {
  const topes = presupuestos[mesStr] || {};
  const gastosPorCat = new Map(totalPorCategoria(movimientos, mesStr, 'gasto').map((c) => [c.categoria, c.total]));
  return Object.entries(topes).map(([categoria, tope]) => {
    const gastado = gastosPorCat.get(categoria) || 0;
    const pct = tope > 0 ? gastado / tope : 0;
    let nivel = 'ok';
    if (pct >= 1) nivel = 'rebasado';
    else if (pct >= 0.8) nivel = 'alerta';
    return { categoria, tope, gastado, pct, nivel };
  });
}

// Genera los movimientos de recurrentes que falten para `mesStr`. Idempotente:
// nunca duplica (revisa recurrenteId + mes ya presentes en `movimientosExistentes`).
export function generarMovimientosRecurrentes(recurrentes, movimientosExistentes, mesStr, crearId) {
  const yaGenerados = new Set(
    movimientosExistentes
      .filter((m) => m.recurrenteId && mesDeFecha(m.fecha) === mesStr)
      .map((m) => m.recurrenteId)
  );
  const nuevos = [];
  const [y, m] = mesStr.split('-').map(Number);
  for (const r of recurrentes) {
    if (!r.activo || yaGenerados.has(r.id)) continue;
    const dia = Math.min(r.dia, diasEnMes(y, m));
    nuevos.push({
      id: crearId('mov'),
      fecha: `${mesStr}-${String(dia).padStart(2, '0')}`,
      tipo: 'gasto',
      monto: r.monto,
      categoria: r.categoria,
      metodo: r.metodo || 'debito',
      nota: r.nombre,
      etiquetas: ['recurrente'],
      recurrenteId: r.id,
      creado: new Date().toISOString(),
      modificado: new Date().toISOString(),
    });
  }
  return nuevos;
}

export function costoAnualSuscripciones(recurrentes) {
  return recurrentes.filter((r) => r.activo).reduce((acc, r) => acc + aCentavos(r.monto) * 12, 0) / 100;
}

// % del gasto del mes que viene de movimientos recurrentes (fijos) vs el resto (variables).
export function fijosVsVariables(movimientos, mesStr) {
  const delMes = filtrarPorMes(movimientos, mesStr, 'gasto');
  const totalCent = sumaCentavos(delMes);
  const fijosCent = sumaCentavos(delMes.filter((m) => m.recurrenteId));
  const pctFijos = totalCent > 0 ? fijosCent / totalCent : 0;
  return { fijos: aPesos(fijosCent), variables: aPesos(totalCent - fijosCent), pctFijos };
}
