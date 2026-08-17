// Las funciones genéricas de "hay una versión nueva" viven en
// shared/actualizacion.js (las usan Peso y Gastos por igual). Aquí solo se
// re-exportan, junto con las que sí son específicas de Peso (abajo). El
// import + export por separado (no "export {...} from") es a propósito:
// build.py solo sabe borrar en el bundle un "export { nombre };" suelto,
// no la sintaxis combinada con "from".
import { normalizarMetadata, formatearFechaActualizacion, obtenerEstadoActualizacion, leerMetadataActualizacion, buscarActualizacion } from '../../shared/actualizacion.js';
export { normalizarMetadata, formatearFechaActualizacion, obtenerEstadoActualizacion, leerMetadataActualizacion, buscarActualizacion };

export function hayCapturaPesoPendiente(captura) {
  if (!captura) return false;
  const tienePeso = String(captura.pesoStr ?? '').trim().length > 0;
  const cambioFecha = captura.fechaOriginal && captura.fecha !== captura.fechaOriginal;
  return Boolean(tienePeso || cambioFecha);
}

export function decidirRecargaActualizacion({ capturaPendiente, formularioPendiente = false, escribiendoActivo, entrenamientoActivo = false, recargaDiferida = false }) {
  if (capturaPendiente || formularioPendiente || escribiendoActivo || entrenamientoActivo) return { recargar: false, diferir: true };
  return { recargar: true, diferir: false };
}

const CAMPOS_AJUSTE_DIFERIBLES = new Set([
  'ajustes-meta', 'ajustes-inicial', 'reto-fecha-inicio', 'reto-fecha-fin',
]);

export function esCampoAjusteDiferible(id, type) {
  return type !== 'file' && CAMPOS_AJUSTE_DIFERIBLES.has(String(id || ''));
}
