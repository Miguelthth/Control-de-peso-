// Reglas puras del módulo Ejercicio: sin DOM, almacenamiento ni red.

export const MODALIDADES_CARGA = ['discos', 'niveles', 'PC'];
export const CATEGORIAS_INICIALES = ['Pierna', 'Pecho', 'Bíceps', 'Tríceps', 'Abdomen', 'Espalda'];

const ahoraISO = () => new Date().toISOString();
const idNuevo = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function crearDocumentoEjercicio(fecha = ahoraISO()) {
  return {
    version: 2,
    categorias: CATEGORIAS_INICIALES.map((nombre, i) => ({ id: `categoria-${i + 1}`, nombre, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    ejercicios: [], rutinas: [], sesiones: [], hiits: [], modificadoEn: fecha,
  };
}

export function calcularDuracionHiit({ vueltas, actividadSeg, descansoSeg }) {
  const n = Number(vueltas), actividad = Number(actividadSeg), descanso = Number(descansoSeg);
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(actividad) || actividad < 1 || !Number.isFinite(descanso) || descanso < 0) throw new Error('Configuración HIIT inválida');
  return n * actividad + Math.max(0, n - 1) * descanso;
}

export function normalizarEjercicio(ejercicio, fecha = ahoraISO()) {
  const nombre = String(ejercicio.nombre || '').trim();
  const categoriaId = String(ejercicio.categoriaId || '').trim();
  if (!nombre) throw new Error('Nombre de ejercicio requerido');
  if (!categoriaId) throw new Error('El ejercicio requiere una categoría');
  if (!MODALIDADES_CARGA.includes(ejercicio.modalidad)) throw new Error('Modalidad inválida');
  return { ...ejercicio, id: ejercicio.id || idNuevo(), nombre, categoriaId, modalidad: ejercicio.modalidad, activo: ejercicio.activo !== false, creadoEn: ejercicio.creadoEn || fecha, modificadoEn: fecha };
}

function normalizarDiscos(carga = {}) {
  const discos = { grande: Number(carga.grande || 0), chico: Number(carga.chico || 0) };
  if (Object.values(discos).some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Las cantidades de discos deben ser enteros no negativos');
  return discos;
}

export function normalizarSerie(serie, fecha = ahoraISO()) {
  const repeticiones = Number(serie.repeticiones);
  if (!serie.ejercicioId || !Number.isInteger(repeticiones) || repeticiones < 1) throw new Error('Serie inválida');
  if (!MODALIDADES_CARGA.includes(serie.modalidad)) throw new Error('Modalidad inválida');
  let carga = null;
  if (serie.modalidad === 'discos') carga = normalizarDiscos(serie.carga);
  else if (serie.modalidad !== 'PC') {
    carga = Number(serie.carga);
    if (!Number.isFinite(carga) || carga < 0) throw new Error('Carga inválida');
  }
  return { ...serie, id: serie.id || idNuevo(), repeticiones, carga, descansoPlaneadoSeg: Math.max(0, Number(serie.descansoPlaneadoSeg || 0)), descansoRealSeg: Math.max(0, Number(serie.descansoRealSeg || 0)), extraSeg: Math.max(0, Number(serie.extraSeg || 0)), creadoEn: serie.creadoEn || fecha, modificadoEn: fecha };
}

export function crearHiit(config, inicioMs = Date.now()) {
  const planeadoSeg = calcularDuracionHiit(config);
  return { id: config.id || idNuevo(), nombre: String(config.nombre || '').trim(), vueltas: Number(config.vueltas), actividadSeg: Number(config.actividadSeg), descansoSeg: Number(config.descansoSeg), cuentaRegresivaSeg: Math.max(0, Number(config.cuentaRegresivaSeg || 0)), planeadoSeg, estado: Number(config.cuentaRegresivaSeg || 0) > 0 ? 'cuenta_regresiva' : 'actividad', fase: Number(config.cuentaRegresivaSeg || 0) > 0 ? 'cuenta_regresiva' : 'actividad', vuelta: 1, inicioMs, faseInicioMs: inicioMs, activoAcumuladoMs: 0, pausaInicioMs: null };
}

export function pausarHiit(hiit, ahoraMs = Date.now()) {
  if (hiit.estado === 'pausado') return hiit;
  return { ...hiit, estadoAntesPausa: hiit.estado, estado: 'pausado', activoAcumuladoMs: (hiit.activoAcumuladoMs || 0) + Math.max(0, ahoraMs - hiit.faseInicioMs), pausaInicioMs: ahoraMs };
}

export function reanudarHiit(hiit, ahoraMs = Date.now()) {
  if (hiit.estado !== 'pausado') return hiit;
  return { ...hiit, estado: hiit.estadoAntesPausa || 'actividad', faseInicioMs: ahoraMs, pausaInicioMs: null };
}

export function finalizarHiit(datos) {
  const planeado = Number(datos.planeadoSeg);
  if (!Number.isFinite(planeado) || planeado < 1) throw new Error('Duración planeada inválida');
  const finMs = Number(datos.finMs);
  const activoMs = Number.isFinite(datos.activoAcumuladoMs)
    ? datos.activoAcumuladoMs + (datos.estado === 'pausado' ? 0 : Math.max(0, finMs - Number(datos.faseInicioMs || datos.inicioMs)))
    : Math.max(0, finMs - Number(datos.inicioMs));
  const duracionRealSeg = Math.max(0, Math.round(activoMs / 1000));
  return { duracionRealSeg, porcentaje: datos.detenido ? Math.min(100, Math.round(duracionRealSeg / planeado * 100)) : 100, estado: datos.detenido ? 'detenida' : 'completada' };
}

export function sumarExtensionDescanso(descansoSeg, toques = 1) {
  return Math.max(0, Number(descansoSeg) || 0) + Math.max(0, Number(toques) || 0) * 5;
}

export function ajustarCantidad(valor, direccion, { minimo = 0, maximo = Number.POSITIVE_INFINITY, paso = 1 } = {}) {
  const actual = Number(valor) || 0;
  const siguiente = actual + (direccion < 0 ? -paso : paso);
  return Math.min(maximo, Math.max(minimo, siguiente));
}

export function sonidosEnSegundo({ tipo, restanteSeg, esInicio = false }) {
  if (tipo === 'descanso' && esInicio) return ['rapido', 'rapido', 'rapido'];
  if (tipo === 'cuenta' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
  if (tipo === 'descanso' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
  if (tipo === 'actividad' && esInicio) return ['largo'];
  if (tipo === 'final') return ['final'];
  return [];
}

export function normalizarRutina(rutina, fecha = ahoraISO()) {
  const nombre = String(rutina.nombre || '').trim();
  if (!nombre) throw new Error('Nombre de rutina requerido');
  if (!Array.isArray(rutina.entradas) || !rutina.entradas.length) throw new Error('Agrega al menos un ejercicio');
  const entradas = rutina.entradas.map((e, orden) => {
    const series = Number(e.series), repeticiones = Number(e.repeticiones), descansoSeg = Number(e.descansoSeg);
    if (!e.ejercicioId || !Number.isInteger(series) || series < 1 || !Number.isInteger(repeticiones) || repeticiones < 1 || !Number.isFinite(descansoSeg) || descansoSeg < 0) throw new Error('Entrada de rutina inválida');
    return { ejercicioId: e.ejercicioId, orden, series, repeticiones, descansoSeg };
  });
  return { ...rutina, id: rutina.id || idNuevo(), nombre, entradas, ejercicioIds: entradas.map((e) => e.ejercicioId), activo: rutina.activo !== false, creadoEn: rutina.creadoEn || fecha, modificadoEn: fecha };
}

export function siguientePasoRutina(paso, entradas) {
  const actual = entradas[paso.ejercicioIndice];
  if (!actual) return { ...paso, terminada: true };
  if (paso.serieNumero < actual.series) return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero + 1, terminada: false };
  if (paso.ejercicioIndice + 1 < entradas.length) return { ejercicioIndice: paso.ejercicioIndice + 1, serieNumero: 1, terminada: false };
  return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero, terminada: true };
}
