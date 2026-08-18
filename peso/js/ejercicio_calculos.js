export function filtrarPeriodo(registros, periodo = 'total', ahora = new Date()) {
  if (periodo === 'total') return [...registros];
  const limite = new Date(ahora);
  if (periodo === 'semana') limite.setDate(limite.getDate() - 7);
  else if (periodo === 'mes') limite.setMonth(limite.getMonth() - 1);
  return registros.filter((r) => new Date(r.fecha || r.inicio || r.creadoEn) >= limite);
}

export function seriesContables(sesiones = []) {
  return sesiones.filter((s) => s.estado === 'completada').flatMap((s) => s.series || []);
}

export function resumenModalidades(series = []) {
  const r = { discos: { grande: 0, chico: 0 }, niveles: { mejor: 0, repeticiones: 0 }, PC: { repeticiones: 0, series: 0 } };
  for (const s of series) {
    const reps = Number(s.repeticiones || 0);
    if (s.modalidad === 'discos') for (const tam of ['grande', 'chico']) r.discos[tam] += Number(s.carga?.[tam] || 0) * reps;
    else if (s.modalidad === 'niveles') { r.niveles.mejor = Math.max(r.niveles.mejor, Number(s.carga || 0)); r.niveles.repeticiones += reps; }
    else if (s.modalidad === 'PC') { r.PC.repeticiones += reps; r.PC.series += 1; }
  }
  return r;
}

export function descansoPromedio(series = []) {
  const xs = series.map((s) => Number(s.descansoRealSeg)).filter(Number.isFinite);
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
}

export function resumenHiit(hiits = []) {
  if (!hiits.length) return { minutos: 0, porcentajePromedio: 0, completadas: 0, abandonos: 0 };
  return { minutos: Math.round(hiits.reduce((n, h) => n + Number(h.duracionRealSeg || 0), 0) / 60), porcentajePromedio: Math.round(hiits.reduce((n, h) => n + Number(h.porcentaje || 0), 0) / hiits.length), completadas: hiits.filter((h) => h.estado === 'completada').length, abandonos: hiits.filter((h) => h.estado === 'detenida').length };
}

export function resumenWr(wrs = []) {
  if (!wrs.length) return { sesiones: 0, completadas: 0, minutosTotales: 0, minutosCaminando: 0, minutosCorriendo: 0, ultima: null };
  const suma = (campo) => wrs.reduce((n, w) => n + Number(w[campo] || 0), 0);
  const ultima = wrs.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).at(-1);
  return {
    sesiones: wrs.length,
    completadas: wrs.filter((w) => w.estado === 'completada').length,
    minutosTotales: Math.round(suma('realSeg') / 60),
    minutosCaminando: Math.round(suma('caminarSeg') / 60),
    minutosCorriendo: Math.round(suma('correrSeg') / 60),
    ultima,
  };
}

export function serieProgreso(sesiones = [], ejercicioId) {
  return sesiones.filter((s) => s.estado === 'completada').flatMap((s) => (s.series || []).filter((x) => x.ejercicioId === ejercicioId).map((x) => ({ fecha: s.fecha || s.fin, valor: x.modalidad === 'niveles' ? Number(x.carga || 0) : Number(x.repeticiones || 0), unidad: x.modalidad })));
}

// ────────── Análisis deportivo (Fase 3) — todo sin kg, en unidades relativas ──────────
// Estándares usados (evidencia de fuerza/hipertrofia, no inventados):
// 10-20 series semanales por músculo, frecuencia 2x/semana, ventana de
// recuperación 48-72h, zonas de repeticiones 1-5/6-12/13+.

function seriesConEjercicio(sesiones, ejercicios) {
  const porId = new Map(ejercicios.map((e) => [e.id, e]));
  return seriesContables(sesiones).map((s) => ({ serie: s, ejercicio: porId.get(s.ejercicioId) })).filter((x) => x.ejercicio);
}

export function volumenPorGrupo(sesiones, ejercicios, categorias) {
  const conteo = new Map(categorias.map((c) => [c.id, { nombre: c.nombre, series: 0 }]));
  for (const { ejercicio } of seriesConEjercicio(sesiones, ejercicios)) {
    if (conteo.has(ejercicio.categoriaId)) conteo.get(ejercicio.categoriaId).series += 1;
    for (const nombreSecundario of ejercicio.gruposSecundarios || []) {
      const cat = categorias.find((c) => c.nombre === nombreSecundario);
      if (cat && conteo.has(cat.id)) conteo.get(cat.id).series += 0.5;
    }
  }
  return [...conteo.values()].map((v) => ({
    ...v,
    series: Math.round(v.series * 10) / 10,
    etiqueta: v.series < 10 ? 'bajo' : v.series <= 20 ? 'en-rango' : 'alto',
  }));
}

export function frecuenciaPorGrupo(sesiones, ejercicios, categorias) {
  const dias = new Map(categorias.map((c) => [c.id, new Set()]));
  for (const s of sesiones.filter((x) => x.estado === 'completada')) {
    const fecha = String(s.fecha || s.fin || '').slice(0, 10);
    for (const serie of s.series || []) {
      const ej = ejercicios.find((e) => e.id === serie.ejercicioId);
      if (ej && dias.has(ej.categoriaId)) dias.get(ej.categoriaId).add(fecha);
    }
  }
  return categorias.map((c) => ({ nombre: c.nombre, dias: dias.get(c.id).size }));
}

export function balancePatron(sesiones, ejercicios) {
  const conteo = { empuje: 0, tiron: 0, pierna: 0, core: 0 };
  for (const { ejercicio } of seriesConEjercicio(sesiones, ejercicios)) {
    if (conteo[ejercicio.patron] != null) conteo[ejercicio.patron] += 1;
  }
  const { empuje, tiron } = conteo;
  let mensaje = 'Balanceado';
  if (empuje > 0 && tiron === 0) mensaje = 'Todo empuje, nada de tirón -- riesgo de hombro';
  else if (empuje > tiron * 1.5) mensaje = 'Más empuje que tirón -- agrega remo o jalón';
  else if (tiron > empuje * 1.5) mensaje = 'Más tirón que empuje -- también es un desbalance';
  return { ...conteo, mensaje };
}

export function balanceSuperiorInferior(sesiones, ejercicios) {
  let superior = 0, inferior = 0;
  for (const { ejercicio } of seriesConEjercicio(sesiones, ejercicios)) {
    if (ejercicio.patron === 'pierna') inferior += 1;
    else if (ejercicio.patron === 'empuje' || ejercicio.patron === 'tiron') superior += 1;
  }
  let mensaje = 'Balanceado';
  if (superior > 0 && inferior === 0) mensaje = 'Nada de pierna -- el error más común';
  else if (superior > inferior * 2) mensaje = 'Mucho más tren superior que pierna';
  return { superior, inferior, mensaje };
}

export function musculosAtrasados(sesiones, ejercicios, categorias, ahora = new Date()) {
  const ultima = new Map(categorias.map((c) => [c.id, null]));
  for (const s of sesiones.filter((x) => x.estado === 'completada')) {
    const fecha = s.fecha || s.fin;
    for (const serie of s.series || []) {
      const ej = ejercicios.find((e) => e.id === serie.ejercicioId);
      if (!ej || !ultima.has(ej.categoriaId)) continue;
      if (!ultima.get(ej.categoriaId) || fecha > ultima.get(ej.categoriaId)) ultima.set(ej.categoriaId, fecha);
    }
  }
  return categorias.map((c) => {
    const fecha = ultima.get(c.id);
    const dias = fecha ? Math.floor((ahora - new Date(fecha)) / 86400000) : null;
    return { nombre: c.nombre, dias, recuperado: dias == null ? null : dias >= 2 };
  }).sort((a, b) => (b.dias ?? 999) - (a.dias ?? 999));
}

// Fase 4: coaching en la pantalla de descanso -- "la vez pasada hiciste X".
export function ultimaMarcaEjercicio(sesiones, ejercicioId) {
  const puntos = serieProgreso(sesiones, ejercicioId);
  if (!puntos.length) return null;
  return [...puntos].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
}

export function consejoRepeticiones(repeticionesObjetivo) {
  const reps = Number(repeticionesObjetivo) || 0;
  if (reps >= 1 && reps <= 5) return 'Zona de fuerza (1-5 reps): descansa completo entre series, prioriza técnica sobre velocidad.';
  if (reps >= 6 && reps <= 12) return 'Zona de hipertrofia (6-12 reps): busca llegar cerca del fallo técnico en la última serie.';
  if (reps >= 13) return 'Zona de resistencia (13+ reps): el descanso puede ser más corto, el reto es sostener la técnica cansado.';
  return '';
}

export function mejorSerieHistorica(sesiones, ejercicioId) {
  const puntos = serieProgreso(sesiones, ejercicioId);
  if (!puntos.length) return null;
  return puntos.reduce((mejor, p) => (p.valor > mejor.valor ? p : mejor), puntos[0]);
}

export function detectarEstancamiento(sesiones, ejercicioId, ahora = new Date(), semanas = 4) {
  const puntos = serieProgreso(sesiones, ejercicioId);
  if (puntos.length < 2) return false;
  const limite = new Date(ahora); limite.setDate(limite.getDate() - semanas * 7);
  const recientes = puntos.filter((p) => new Date(p.fecha) >= limite);
  if (recientes.length < 2) return false;
  const maximoAntes = Math.max(...puntos.filter((p) => new Date(p.fecha) < limite).map((p) => p.valor), 0);
  const maximoReciente = Math.max(...recientes.map((p) => p.valor));
  return maximoAntes > 0 && maximoReciente <= maximoAntes;
}

export function zonaRepeticiones(series = []) {
  const r = { fuerza: 0, hipertrofia: 0, resistencia: 0 };
  for (const s of series) {
    const reps = Number(s.repeticiones || 0);
    if (reps >= 1 && reps <= 5) r.fuerza += 1;
    else if (reps >= 6 && reps <= 12) r.hipertrofia += 1;
    else if (reps >= 13) r.resistencia += 1;
  }
  const total = r.fuerza + r.hipertrofia + r.resistencia;
  const dominante = total === 0 ? null : Object.entries(r).sort((a, b) => b[1] - a[1])[0][0];
  return { ...r, dominante };
}

export function descansoRealVsProgramado(series = []) {
  const reales = series.map((s) => Number(s.descansoRealSeg)).filter(Number.isFinite);
  const planeados = series.map((s) => Number(s.descansoPlaneadoSeg)).filter(Number.isFinite);
  if (!reales.length || !planeados.length) return { real: 0, planeado: 0, cumplimientoPct: 0 };
  const real = Math.round(reales.reduce((a, b) => a + b, 0) / reales.length);
  const planeado = Math.round(planeados.reduce((a, b) => a + b, 0) / planeados.length);
  return { real, planeado, cumplimientoPct: planeado ? Math.round((real / planeado) * 100) : 0 };
}

export function ratioTrabajoDescansoHiit(hiits = []) {
  const completados = hiits.filter((h) => Number(h.actividadSeg) > 0 && Number(h.descansoSeg) > 0);
  if (!completados.length) return null;
  const actividad = completados.reduce((a, h) => a + Number(h.actividadSeg), 0) / completados.length;
  const descanso = completados.reduce((a, h) => a + Number(h.descansoSeg), 0) / completados.length;
  const ratio = descanso ? actividad / descanso : actividad;
  let sistema = 'Mixto';
  if (ratio >= 1.8) sistema = 'Fuerza-resistencia (trabajo largo vs descanso)';
  else if (ratio <= 0.6) sistema = 'Capacidad aláctica/potencia (descansos largos)';
  else sistema = 'Metabólico/cardiovascular (1:1 aprox.)';
  return { actividadProm: Math.round(actividad), descansoProm: Math.round(descanso), ratio: Math.round(ratio * 10) / 10, sistema };
}

export function constancia(sesiones = [], hiits = [], ahora = new Date()) {
  const fechas = new Set([...sesiones, ...hiits].filter((r) => r.estado === 'completada').map((r) => String(r.fecha || r.fin || '').slice(0, 10)));
  let racha = 0;
  const cursor = new Date(ahora);
  while (fechas.has(cursor.toISOString().slice(0, 10))) { racha += 1; cursor.setDate(cursor.getDate() - 1); }
  const completadas = sesiones.filter((s) => s.estado === 'completada').length + hiits.filter((h) => h.estado === 'completada').length;
  const descartadas = sesiones.filter((s) => s.estado === 'descartada').length + hiits.filter((h) => h.estado === 'detenida').length;
  return { rachaDias: racha, completadas, descartadas, diasActivos: fechas.size };
}
