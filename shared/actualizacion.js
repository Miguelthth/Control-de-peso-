const URL_METADATA = '../__app_meta__.json';

export function normalizarMetadata(valor) {
  if (!valor || typeof valor !== 'object') return null;
  const version = String(valor.version || '').trim();
  const installedAt = String(valor.installedAt || '').trim();
  if (!version || !installedAt || Number.isNaN(Date.parse(installedAt))) return null;
  return { version, installedAt: new Date(installedAt).toISOString() };
}

export function formatearFechaActualizacion(installedAt, zonaHoraria = 'America/Tijuana') {
  const fecha = new Date(installedAt);
  if (Number.isNaN(fecha.getTime())) return 'Sin información';
  const opciones = {
    dateStyle: 'long', timeStyle: 'short', hour12: false,
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {}),
  };
  try { return new Intl.DateTimeFormat('es-MX', opciones).format(fecha); }
  catch { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(fecha); }
}

export function obtenerEstadoActualizacion({ soportado, buscando = false, preparada = false, metadata = null }) {
  if (!soportado) return 'No disponible';
  if (buscando) return 'Buscando actualización…';
  if (preparada) return 'Actualización preparada';
  return metadata ? 'Actualizada' : 'Sin información';
}

export async function leerMetadataActualizacion(fetchFn = fetch) {
  try {
    const respuesta = await fetchFn(URL_METADATA, { cache: 'no-store' });
    if (!respuesta.ok) return null;
    return normalizarMetadata(await respuesta.json());
  } catch { return null; }
}

export async function buscarActualizacion(registro) {
  if (!registro?.update) throw new Error('Actualizaciones no disponibles');
  await registro.update();
  return registro;
}
