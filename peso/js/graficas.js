// Gráficas en SVG escrito a mano. Sin librerías. A diferencia de una gráfica
// de dinero, el eje Y aquí NO arranca en 0 (un peso de 0 no significa nada) --
// se ajusta al rango de los datos con un margen, para que se note el cambio.
//
// Pensadas para celular: el ancho crece con la cantidad de puntos (para que
// no se amontonen) y el contenedor hace scroll horizontal si no caben --
// ver .grafica-scroll en css/estilos.css. Con pocos puntos se ve completa
// sin necesidad de scroll.

import { kgALb } from './modelo.js';

const NS = 'http://www.w3.org/2000/svg';
const MIN_ANCHO = 320;
const PX_POR_PUNTO = 30;
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(fecha) {
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha; // ej. una clave de semana "YYYY-MM-DD" del lunes -- ya es fecha válida
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function anchoResponsivo(nPuntos) {
  return Math.max(MIN_ANCHO, nPuntos * PX_POR_PUNTO);
}

function escalaY(valores, alto, pad) {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const margen = rango * 0.15 + 0.5;
  const lo = min - margen;
  const hi = max + margen;
  return (v) => pad.top + (alto - pad.top - pad.bottom) * (1 - (v - lo) / (hi - lo));
}

function envolver(svg, width, height) {
  return `<div class="grafica-envoltura" style="min-width:${width}px;"><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="${NS}">${svg}</svg></div>`;
}

export function svgLineaPeso(serie, { height = 220, color = '#4c5fd5', meta = null } = {}) {
  if (serie.length < 2) {
    return envolver(
      `<text x="50%" y="50%" text-anchor="middle" class="grafica-texto-vacio">Captura al menos 2 días para ver la tendencia</text>`,
      MIN_ANCHO, height
    );
  }
  const width = anchoResponsivo(serie.length);
  const pad = { top: 16, right: 16, bottom: 26, left: 46 };
  const valores = serie.map((p) => p.pesoKg);
  if (meta != null) valores.push(meta);
  const y = escalaY(valores, height, pad);
  const w = width - pad.left - pad.right;
  const idFiltro = `g${Math.random().toString(36).slice(2, 8)}`;
  const puntosXY = serie.map((p, i) => [pad.left + (i / (serie.length - 1)) * w, y(p.pesoKg)]);
  const puntos = puntosXY.map(([x, yy]) => `${x},${yy}`).join(' ');
  const area = `${pad.left},${pad.top + (height - pad.top - pad.bottom)} ${puntos} ${pad.left + w},${pad.top + (height - pad.top - pad.bottom)}`;

  const guias = [0, 0.5, 1].map((f) => {
    const min = Math.min(...valores), max = Math.max(...valores);
    const valor = min + (max - min) * f;
    const yy = y(valor);
    return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="var(--borde)" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="4" y="${yy + 4}" class="grafica-eje-texto">${valor.toFixed(1)}</text>`;
  }).join('');

  const etiquetasX = serie.map((p, i) => {
    // en pantallas chicas, una etiqueta por punto se amontona -- se salta
    // según cuánto espacio real hay por punto.
    const cada = Math.ceil(40 / PX_POR_PUNTO);
    if (i % cada !== 0 && i !== serie.length - 1) return '';
    const [x] = puntosXY[i];
    return `<text x="${x}" y="${height - 6}" text-anchor="middle" class="grafica-eje-texto">${fechaCorta(p.fecha)}</text>`;
  }).join('');

  const lineaMeta = meta != null
    ? `<line x1="${pad.left}" y1="${y(meta)}" x2="${width - pad.right}" y2="${y(meta)}" stroke="var(--exito)" stroke-width="1.5" stroke-dasharray="5 4"/>
       <text x="${width - pad.right}" y="${y(meta) - 4}" text-anchor="end" class="grafica-eje-texto" fill="var(--exito)">meta ${meta}</text>`
    : '';

  const svg = `
    <defs>
      <linearGradient id="${idFiltro}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${guias}
    ${lineaMeta}
    <polygon points="${area}" fill="url(#${idFiltro})"/>
    <polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${puntosXY.map(([x, yy], i) => {
      const p = serie[i];
      return `<circle cx="${x}" cy="${yy}" r="3" fill="var(--superficie)" stroke="${color}" stroke-width="2">
        <title>${fechaCorta(p.fecha)}: ${p.pesoKg.toFixed(1)} kg · ${kgALb(p.pesoKg).toFixed(1)} lb</title></circle>`;
    }).join('')}
    ${etiquetasX}
  `;
  return envolver(svg, width, height);
}

export function svgLineaComparativa(serieA, serieB, { height = 240, colorA = '#4c5fd5', colorB = '#ff6b4a' } = {}) {
  const todas = [...serieA, ...serieB];
  const fechas = [...new Set(todas.map((p) => p.fecha))].sort();
  if (fechas.length < 2) {
    return envolver(
      `<text x="50%" y="50%" text-anchor="middle" class="grafica-texto-vacio">Faltan datos para comparar</text>`,
      MIN_ANCHO, height
    );
  }
  const width = anchoResponsivo(fechas.length);
  const pad = { top: 16, right: 16, bottom: 26, left: 46 };
  const valores = todas.map((p) => p.pesoKg);
  const y = escalaY(valores, height, pad);
  const w = width - pad.left - pad.right;
  const x = (fecha) => pad.left + (fechas.indexOf(fecha) / Math.max(1, fechas.length - 1)) * w;

  const linea = (serie, color) => {
    if (serie.length < 2) return '';
    const puntos = serie.map((p) => `${x(p.fecha)},${y(p.pesoKg)}`).join(' ');
    return `<polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${serie.map((p) => `<circle cx="${x(p.fecha)}" cy="${y(p.pesoKg)}" r="2.5" fill="${color}"><title>${fechaCorta(p.fecha)}: ${p.pesoKg.toFixed(1)} kg</title></circle>`).join('')}`;
  };

  const guias = [0, 0.5, 1].map((f) => {
    const min = Math.min(...valores), max = Math.max(...valores);
    const valor = min + (max - min) * f;
    const yy = y(valor);
    return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="var(--borde)" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="4" y="${yy + 4}" class="grafica-eje-texto">${valor.toFixed(1)}</text>`;
  }).join('');

  const cada = Math.ceil(40 / PX_POR_PUNTO);
  const etiquetasX = fechas.map((f, i) => {
    if (i % cada !== 0 && i !== fechas.length - 1) return '';
    return `<text x="${x(f)}" y="${height - 6}" text-anchor="middle" class="grafica-eje-texto">${fechaCorta(f)}</text>`;
  }).join('');

  const svg = `
    ${guias}
    ${linea(serieA, colorA)}
    ${linea(serieB, colorB)}
    ${etiquetasX}
  `;
  return envolver(svg, width, height);
}

export function svgBarraAvance(pct, { width = 260, height = 22, color = '#22a06b' } = {}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const w = width * clamped;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="${NS}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${height / 2}" fill="var(--borde)"/>
    <rect x="0" y="0" width="${Math.max(w, clamped > 0 ? height : 0)}" height="${height}" rx="${height / 2}" fill="${color}"/>
    <text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700"
      fill="${clamped > 0.5 ? '#fff' : 'var(--texto)'}">${Math.round(pct * 100)}%</text>
  </svg>`;
}
