// Gráficas en SVG escrito a mano. Cada función regresa un string de SVG listo para innerHTML.
// Sin librerías: así la app no depende de nada externo para verse.

const NS = 'http://www.w3.org/2000/svg';

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n);
}

export function svgDona(datos, { size = 220, grosor = 34 } = {}) {
  const total = datos.reduce((a, d) => a + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - grosor / 2 - 2;
  if (total <= 0 || !datos.length) {
    return `<svg viewBox="0 0 ${size} ${size}" xmlns="${NS}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--borde)" stroke-width="${grosor}"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" class="grafica-texto-vacio">Sin datos</text>
    </svg>`;
  }
  let acumulado = 0;
  const circunferencia = 2 * Math.PI * r;
  const segmentos = datos
    .map((d) => {
      const frac = d.value / total;
      const largo = frac * circunferencia;
      const offset = -acumulado * circunferencia;
      acumulado += frac;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${grosor}"
        stroke-dasharray="${largo} ${circunferencia - largo}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})"><title>${d.label}: $${fmt(d.value)}</title></circle>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="${NS}">
    ${segmentos}
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" class="grafica-total-num">$${fmt(total)}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="grafica-total-label">total</text>
  </svg>`;
}

export function svgBarras12Meses(datos, { width = 600, height = 200 } = {}) {
  const pad = { top: 16, right: 10, bottom: 26, left: 10 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(1, ...datos.map((d) => d.total));
  const promedio = datos.reduce((a, d) => a + d.total, 0) / (datos.length || 1);
  const anchoBarra = (w / datos.length) * 0.6;
  const paso = w / datos.length;
  const nombresMes = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  const barras = datos
    .map((d, i) => {
      const alto = (d.total / max) * h;
      const x = pad.left + i * paso + (paso - anchoBarra) / 2;
      const y = pad.top + (h - alto);
      const mesNum = Number(d.mes.slice(5, 7)) - 1;
      const esUltimo = i === datos.length - 1;
      return `<g>
        <rect x="${x}" y="${y}" width="${anchoBarra}" height="${Math.max(alto, 1)}" rx="3"
          fill="${esUltimo ? 'var(--acento)' : 'var(--primario)'}" opacity="${esUltimo ? '1' : '0.55'}">
          <title>${d.mes}: $${fmt(d.total)}</title>
        </rect>
        <text x="${x + anchoBarra / 2}" y="${height - 8}" text-anchor="middle" class="grafica-eje-texto">${nombresMes[mesNum]}</text>
      </g>`;
    })
    .join('');

  const yProm = pad.top + (h - (promedio / max) * h);
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="${NS}">
    <line x1="${pad.left}" y1="${yProm}" x2="${width - pad.right}" y2="${yProm}"
      stroke="var(--texto-suave)" stroke-width="1" stroke-dasharray="4 3"/>
    ${barras}
  </svg>`;
}

export function svgLineaAcumulada(actual, anterior, { width = 600, height = 220 } = {}) {
  const pad = { top: 16, right: 10, bottom: 22, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(1, ...actual.map((d) => d.total), ...anterior.map((d) => d.total));
  const nDias = Math.max(actual.length, anterior.length, 1);

  const puntos = (serie) =>
    serie
      .map((d, i) => {
        const x = pad.left + (i / (nDias - 1 || 1)) * w;
        const y = pad.top + (h - (d.total / max) * h);
        return `${x},${y}`;
      })
      .join(' ');

  const guiaY = [0, 0.5, 1].map((f) => {
    const y = pad.top + h * (1 - f);
    return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="var(--borde)" stroke-width="1"/>
      <text x="4" y="${y + 4}" class="grafica-eje-texto">$${fmt(max * f)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="${NS}">
    ${guiaY}
    ${anterior.length ? `<polyline points="${puntos(anterior)}" fill="none" stroke="var(--texto-suave)" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
    ${actual.length ? `<polyline points="${puntos(actual)}" fill="none" stroke="var(--acento)" stroke-width="2.5"/>` : ''}
  </svg>`;
}

export function svgBarrasHorizontales(datos, { width = 500, filaAlto = 32 } = {}) {
  const max = Math.max(1, ...datos.map((d) => d.value));
  const height = datos.length * filaAlto + 8;
  const labelW = 140;
  const barW = width - labelW - 60;

  const filas = datos
    .map((d, i) => {
      const y = i * filaAlto + 4;
      const w = (d.value / max) * barW;
      return `<g>
        <text x="${labelW - 8}" y="${y + filaAlto / 2}" text-anchor="end" dominant-baseline="middle" class="grafica-fila-label">${d.label}</text>
        <rect x="${labelW}" y="${y + 6}" width="${Math.max(w, 2)}" height="${filaAlto - 14}" rx="3" fill="${d.color}"/>
        <text x="${labelW + w + 8}" y="${y + filaAlto / 2}" dominant-baseline="middle" class="grafica-fila-valor">$${fmt(d.value)}</text>
      </g>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="${NS}">${filas}</svg>`;
}

// movimientosPorDia: Map de "YYYY-MM-DD" -> total gastado ese día.
export function svgMapaCalor(movimientosPorDia, anio, { celda = 12, hueco = 3 } = {}) {
  const max = Math.max(1, ...movimientosPorDia.values());
  const primerDia = new Date(anio, 0, 1);
  const offsetSemana = primerDia.getDay();
  const width = 54 * (celda + hueco) + 20;
  const height = 7 * (celda + hueco) + 20;

  const celdas = [];
  const nombresMes = [];
  let ultimoMes = -1;
  for (let d = 0; d < 366; d++) {
    const fecha = new Date(anio, 0, 1 + d);
    if (fecha.getFullYear() !== anio) break;
    const diaAnio = d + offsetSemana;
    const semana = Math.floor(diaAnio / 7);
    const diaSemana = fecha.getDay();
    const iso = fecha.toISOString().slice(0, 10);
    const valor = movimientosPorDia.get(iso) || 0;
    const intensidad = valor > 0 ? 0.15 + 0.85 * (valor / max) : 0;
    const x = 20 + semana * (celda + hueco);
    const y = 20 + diaSemana * (celda + hueco);
    celdas.push(
      `<rect x="${x}" y="${y}" width="${celda}" height="${celda}" rx="2"
        fill="${valor > 0 ? 'var(--acento)' : 'var(--borde)'}" fill-opacity="${valor > 0 ? intensidad.toFixed(2) : '0.4'}">
        <title>${iso}: $${fmt(valor)}</title></rect>`
    );
    if (fecha.getMonth() !== ultimoMes) {
      ultimoMes = fecha.getMonth();
      nombresMes.push(`<text x="${x}" y="12" class="grafica-eje-texto">${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][ultimoMes]}</text>`);
    }
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="${NS}">${nombresMes.join('')}${celdas.join('')}</svg>`;
}
