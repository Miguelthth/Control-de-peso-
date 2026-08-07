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

export function serieProgreso(sesiones = [], ejercicioId) {
  return sesiones.filter((s) => s.estado === 'completada').flatMap((s) => (s.series || []).filter((x) => x.ejercicioId === ejercicioId).map((x) => ({ fecha: s.fecha || s.fin, valor: x.modalidad === 'niveles' ? Number(x.carga || 0) : Number(x.repeticiones || 0), unidad: x.modalidad })));
}
