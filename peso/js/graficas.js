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

// Qué índices de una serie de n puntos llevan etiqueta de fecha en el eje X,
// sin que dos etiquetas queden pegadas. Se muestra 1 de cada `cada` puntos
// (según cuánto espacio real hay por punto) -- pero SIEMPRE se incluye el
// último punto (para siempre ver la fecha más reciente), REEMPLAZANDO (no
// sumando) a la última etiqueta alineada si esa quedaría a menos de un paso
// de distancia: mostrar las dos ahí encima solapa el texto en vez de ayudar
// a leerlo (bug real: "los meses se leen amontonados" en la gráfica de
// tendencias).
function indicesConEtiqueta(n) {
  const cada = Math.ceil(40 / PX_POR_PUNTO);
  const indices = new Set();
  for (let i = 0; i < n; i += cada) indices.add(i);
  const ultimo = n - 1;
  if (!indices.has(ultimo)) {
    indices.delete(Math.floor(ultimo / cada) * cada);
    indices.add(ultimo);
  }
  return indices;
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

  const indicesEtiqueta = indicesConEtiqueta(serie.length);
  const etiquetasX = serie.map((p, i) => {
    if (!indicesEtiqueta.has(i)) return '';
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

  const indicesEtiqueta = indicesConEtiqueta(fechas.length);
  const etiquetasX = fechas.map((f, i) => {
    if (!indicesEtiqueta.has(i)) return '';
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

// El avance hacia la meta, como una barra horizontal (índigo → coral, la
// paleta de la app) con el Rasengan real (peso/assets/rasengan.mp4) montado
// en la punta, como si la esfera fuera la que va empujando el avance.
export function svgBarraAvance(pct, { width = 260, color = null } = {}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const pctTexto = Math.round(pct * 100);
  const estiloFill = color ? `width:${clamped * 100}%; background:${color};` : `width:${clamped * 100}%;`;
  return `<div class="rasengan-barra" style="max-width:${width}px;">
    <div class="rasengan-barra-track">
      <div class="rasengan-barra-fill" style="${estiloFill}"></div>
      <span class="rasengan-barra-pct">${pctTexto}%</span>
    </div>
    <div class="rasengan-barra-bola" style="left:${clamped * 100}%">
      <video src="assets/rasengan.mp4" autoplay muted loop playsinline></video>
    </div>
  </div>`;
}

// "Carrera al centro": cada quien avanza desde SU lado hacia la mitad según
// su propio % de avance a SU propia meta -- si los dos llegan al 100%, las
// dos barras se tocan justo en medio. Tarjeta fija en "Nuestro reto" (ya no
// es una pestaña que se cambia -- se ve siempre, junto a las tendencias).
export function svgBarraVersus(pctA, pctB, nombreA, nombreB, { width = 300, colorA = '#4c5fd5', colorB = '#ff6b4a' } = {}) {
  const claA = Math.max(0, Math.min(1, pctA));
  const claB = Math.max(0, Math.min(1, pctB));
  const mitad = width / 2;
  const anchoA = claA * mitad;
  const anchoB = claB * mitad;
  const alturaPista = 26;
  const y = 32;
  return `<svg viewBox="0 0 ${width} 62" width="100%" xmlns="${NS}" style="display:block; max-width:${width}px; margin:0 auto;">
    <text x="2" y="16" font-size="13" font-weight="800" fill="${colorA}">${nombreA} · ${Math.round(claA * 100)}%</text>
    <text x="${width - 2}" y="16" font-size="13" font-weight="800" fill="${colorB}" text-anchor="end">${nombreB} · ${Math.round(claB * 100)}%</text>
    <rect x="0" y="${y}" width="${width}" height="${alturaPista}" rx="13" fill="var(--superficie-alt)" stroke="var(--borde)"/>
    <rect x="0" y="${y}" width="${Math.max(anchoA, claA > 0 ? 13 : 0)}" height="${alturaPista}" rx="13" fill="${colorA}"/>
    <rect x="${width - Math.max(anchoB, claB > 0 ? 13 : 0)}" y="${y}" width="${Math.max(anchoB, claB > 0 ? 13 : 0)}" height="${alturaPista}" rx="13" fill="${colorB}"/>
    <line x1="${mitad}" y1="${y - 4}" x2="${mitad}" y2="${y + alturaPista + 4}" stroke="var(--texto-suave)" stroke-width="2" stroke-dasharray="2 3"/>
  </svg>`;
}
