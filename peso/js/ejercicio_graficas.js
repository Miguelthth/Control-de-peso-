import { escapeHTML } from '../../shared/ui_seguridad.js';

export function svgProgreso(puntos = [], { unidad = '', titulo = 'Progreso' } = {}) {
  if (!puntos.length) return '<p class="texto-suave">Aún no hay datos para esta gráfica.</p>';
  const width = Math.max(320, puntos.length * 56), height = 180, pad = 28;
  const valores = puntos.map((p) => Number(p.valor || 0)), max = Math.max(...valores, 1);
  const coords = puntos.map((p, i) => `${pad + i * ((width - pad * 2) / Math.max(1, puntos.length - 1))},${height - pad - (Number(p.valor || 0) / max) * (height - pad * 2)}`);
  return `<svg class="grafica-ejercicio" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(titulo)}"><polyline fill="none" stroke="currentColor" stroke-width="4" points="${coords.join(' ')}"/>${puntos.map((p, i) => { const [x, y] = coords[i].split(','); return `<circle cx="${x}" cy="${y}" r="5"><title>${escapeHTML(`${p.fecha}: ${p.valor} ${unidad}`)}</title></circle>`; }).join('')}</svg>`;
}
