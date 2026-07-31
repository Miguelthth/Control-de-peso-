// Frases automáticas sobre el mes, con reglas fijas (no IA). Puro: recibe datos, regresa insights.

import {
  totalPorCategoria,
  promedioCategoriaMesesPrevios,
  gastoHormiga,
  fijosVsVariables,
  costoAnualSuscripciones,
  diaSemanaMasCaro,
  rachaSinGastar,
  totalPorTipo,
  proyeccionCierre,
  estadoPresupuestos,
} from './calculos.js';
import { hoyISO } from './modelo.js';

function nombreCategoria(categorias, id) {
  return categorias.find((c) => c.id === id)?.nombre || id;
}

export function generarInsights(datos, mesStr, hoy = hoyISO()) {
  const { movimientos, categorias, recurrentes, presupuestos } = datos;
  const insights = [];

  // Fuga del mes: categoría que más subió vs su promedio de los últimos 3 meses.
  const porCategoria = totalPorCategoria(movimientos, mesStr, 'gasto');
  let fuga = null;
  for (const { categoria, total } of porCategoria) {
    const prom = promedioCategoriaMesesPrevios(movimientos, categoria, mesStr, 3);
    const diff = total - prom;
    if (prom > 0 && diff > 0 && (!fuga || diff > fuga.diff)) {
      fuga = { categoria, total, prom, diff };
    }
  }
  if (fuga && fuga.diff >= 200) {
    insights.push({
      tipo: 'fuga',
      nivel: 'alerta',
      texto: `${nombreCategoria(categorias, fuga.categoria)} va $${fuga.diff.toFixed(0)} arriba de tu promedio (${fuga.prom.toFixed(0)} → ${fuga.total.toFixed(0)}).`,
    });
  }

  // Gasto hormiga
  const hormiga = gastoHormiga(movimientos, mesStr);
  if (hormiga.cantidad >= 3) {
    insights.push({
      tipo: 'hormiga',
      nivel: 'info',
      texto: `Gasto hormiga: ${hormiga.cantidad} compras menores a $150 suman $${hormiga.total.toFixed(0)} este mes.`,
    });
  }

  // Fijos vs variables
  const fv = fijosVsVariables(movimientos, mesStr);
  if (fv.fijos + fv.variables > 0) {
    insights.push({
      tipo: 'fijos_variables',
      nivel: 'info',
      texto: `${Math.round(fv.pctFijos * 100)}% de tu gasto del mes ya es fijo ($${fv.fijos.toFixed(0)} en recurrentes).`,
    });
  }

  // Costo anual de suscripciones
  const anual = costoAnualSuscripciones(recurrentes);
  if (anual > 0) {
    const mensual = anual / 12;
    insights.push({
      tipo: 'suscripciones_anual',
      nivel: 'info',
      texto: `Tus suscripciones activas son $${mensual.toFixed(0)}/mes = $${anual.toFixed(0)} al año.`,
    });
  }

  // Día de la semana más caro
  const diaCaro = diaSemanaMasCaro(movimientos, mesStr);
  if (diaCaro) {
    insights.push({ tipo: 'dia_caro', nivel: 'info', texto: `Tu día más caro del mes: ${diaCaro.dia} ($${diaCaro.total.toFixed(0)}).` });
  }

  // Racha sin gastar
  const racha = rachaSinGastar(movimientos, hoy);
  if (racha >= 2) {
    insights.push({ tipo: 'racha', nivel: 'positivo', texto: `Llevas ${racha} días sin registrar un gasto.` });
  }

  // Proyección de cierre vs ingresos del mes
  const proyeccion = proyeccionCierre(movimientos, mesStr, hoy);
  const ingresos = totalPorTipo(movimientos, 'ingreso', mesStr);
  if (mesStr === hoy.slice(0, 7) && ingresos > 0 && proyeccion > ingresos) {
    insights.push({
      tipo: 'proyeccion_riesgo',
      nivel: 'alerta',
      texto: `A este ritmo cierras el mes en $${proyeccion.toFixed(0)}, por arriba de tus ingresos ($${ingresos.toFixed(0)}).`,
    });
  }

  // Presupuestos rebasados o en alerta
  for (const p of estadoPresupuestos(movimientos, presupuestos, mesStr)) {
    if (p.nivel === 'rebasado') {
      insights.push({
        tipo: 'presupuesto',
        nivel: 'alerta',
        texto: `Rebasaste el presupuesto de ${nombreCategoria(categorias, p.categoria)}: $${p.gastado.toFixed(0)} de $${p.tope.toFixed(0)}.`,
      });
    } else if (p.nivel === 'alerta') {
      insights.push({
        tipo: 'presupuesto',
        nivel: 'alerta',
        texto: `${nombreCategoria(categorias, p.categoria)} va en ${Math.round(p.pct * 100)}% de su presupuesto.`,
      });
    }
  }

  // Recurrente del mes que ya debió pagarse y no está registrado
  const diaHoy = mesStr === hoy.slice(0, 7) ? Number(hoy.slice(8, 10)) : null;
  if (diaHoy) {
    const generados = new Set(movimientos.filter((m) => m.recurrenteId).map((m) => m.recurrenteId));
    for (const r of recurrentes) {
      if (r.activo && r.dia < diaHoy && !generados.has(r.id)) {
        insights.push({
          tipo: 'recurrente_faltante',
          nivel: 'alerta',
          texto: `${r.nombre} (día ${r.dia}) no se ha registrado este mes.`,
        });
      }
    }
  }

  return insights;
}
