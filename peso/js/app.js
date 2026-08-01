// ARCHIVO GENERADO por build.py (paquete "peso") -- no editar a mano.
// Edita los archivos fuente y vuelve a correr: python build.py

// ── shared/sesion.js ──────────────────────────────────────────
const sesion = (function () {
// Sesión compartida entre el launcher, Gastos y Peso (mismo origen -- misma
// localStorage). Login pasa UNA vez en el launcher; las sub-apps solo leen.

const CLAVE_URL = 'ma_url';
const CLAVE_USUARIO = 'ma_usuario';
const CLAVE_ROL = 'ma_rol';

// Respaldo fijo: la liga del servidor no cambia (es la de Link_Servidor.txt)
// -- si el iPhone borra localStorage entre usos (pasa en algunos ajustes de
// privacidad de Safari), al menos ese paso no se repite cada vez. Si algún
// día se redespliega Apps Script con OTRA liga, hay que actualizarla aquí.
const URL_RESPALDO = 'https://script.google.com/macros/s/AKfycbw3v_9rf4lrf5x910CXedDcyJPIkAic-Dx1VF8Hiucf0RQWj3Pg77SXibvjT8TXKWu9/exec';

function getUrl() {
  return localStorage.getItem(CLAVE_URL) || URL_RESPALDO;
}

function setUrl(url) {
  localStorage.setItem(CLAVE_URL, url.trim());
}

function getUsuario() {
  return localStorage.getItem(CLAVE_USUARIO) || '';
}

function getRol() {
  return localStorage.getItem(CLAVE_ROL) || '';
}

function esAdmin() {
  return getRol() === 'admin';
}

function iniciarSesion(usuario, rol) {
  localStorage.setItem(CLAVE_USUARIO, usuario);
  localStorage.setItem(CLAVE_ROL, rol);
}

function cerrarSesion() {
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_ROL);
}

// Llamar al cargar cualquier sub-app: si falta URL o sesión, regresa al
// launcher para iniciar sesión ahí. `rutaLauncher` es relativa a la sub-app
// (ej. '../index.html').
function exigirSesion(rutaLauncher) {
  if (!getUrl() || !getUsuario()) {
    location.href = rutaLauncher;
    return false;
  }
  return true;
}

  return { getUrl, setUrl, getUsuario, getRol, esAdmin, iniciarSesion, cerrarSesion, exigirSesion };
})();
const getUrl = sesion.getUrl;
const setUrl = sesion.setUrl;
const getUsuario = sesion.getUsuario;
const getRol = sesion.getRol;
const esAdmin = sesion.esAdmin;
const iniciarSesion = sesion.iniciarSesion;
const cerrarSesion = sesion.cerrarSesion;
const exigirSesion = sesion.exigirSesion;

// ── shared/api.js ──────────────────────────────────────────
const api = (function () {
// Llamadas HTTP crudas al Web App de Apps Script único (Gastos + Peso).
// Sin caché, sin cola -- eso vive en cola.js de cada app. Aquí solo se habla
// con el servidor.

async function _get(params) {
  const url = getUrl();
  if (!url) throw new Error('No hay URL de Apps Script configurada.');
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${url}?${qs}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function _post(body) {
  const url = getUrl();
  if (!url) throw new Error('No hay URL de Apps Script configurada.');
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS con Apps Script
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function leerDatos() {
  return _get({ accion: 'datos' });
}

// Consulta barata (no toca Hojas) para saber si algo cambió en Peso antes
// de pedir 'datos' completo -- se puede llamar seguido sin gastar cuota.
function leerVersion() {
  return _get({ accion: 'version' });
}

function guardarFechasReto(usuario, inicio, fin) {
  return _post({ accion: 'guardarFechasReto', usuario, inicio, fin });
}

function validarUsuario(usuario) {
  return _post({ accion: 'validarUsuario', usuario });
}

function validarPin(usuario, pin) {
  return _post({ accion: 'validarPin', usuario, pin });
}

function crearPin(usuario, pinNuevo) {
  return _post({ accion: 'crearPin', usuario, pinNuevo });
}

function cambiarPin(usuario, pinActual, pinNuevo) {
  return _post({ accion: 'cambiarPin', usuario, pinActual, pinNuevo });
}

function guardarPeso(usuario, fecha, pesoKg) {
  return _post({ accion: 'guardarPeso', usuario, fecha, pesoKg });
}

function guardarMeta(usuario, metaKg, pesoInicialKg) {
  return _post({ accion: 'guardarMeta', usuario, metaKg, pesoInicialKg });
}

function guardarUnidad(usuario, unidad) {
  return _post({ accion: 'guardarUnidad', usuario, unidad });
}

function borrarPesos(usuario) {
  return _post({ accion: 'borrarPesos', usuario });
}

function crearUsuario(usuarioAdmin, pinAdmin, nombreNuevo, rolNuevo) {
  return _post({ accion: 'crearUsuario', usuarioAdmin, pinAdmin, nombreNuevo, rolNuevo });
}

function guardarGastos(usuario, blob) {
  return _post({ accion: 'guardarGastos', usuario, blob });
}

function leerGastos(usuario) {
  return _get({ accion: 'leerGastos', usuario });
}

  return { leerDatos, leerVersion, guardarFechasReto, validarUsuario, validarPin, crearPin, cambiarPin, guardarPeso, guardarMeta, guardarUnidad, borrarPesos, crearUsuario, guardarGastos, leerGastos };
})();
const leerDatos = api.leerDatos;
const leerVersion = api.leerVersion;
const guardarFechasReto = api.guardarFechasReto;
const validarUsuario = api.validarUsuario;
const validarPin = api.validarPin;
const crearPin = api.crearPin;
const cambiarPin = api.cambiarPin;
const guardarPeso = api.guardarPeso;
const guardarMeta = api.guardarMeta;
const guardarUnidad = api.guardarUnidad;
const borrarPesos = api.borrarPesos;
const crearUsuario = api.crearUsuario;
const guardarGastos = api.guardarGastos;
const leerGastos = api.leerGastos;

// ── peso/js/modelo.js ──────────────────────────────────────────
const modelo = (function () {
// Forma de los datos y validación. Sin DOM, sin red.

function hoyISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function validarPeso(pesoKg) {
  const n = Number(pesoKg);
  if (!Number.isFinite(n) || n <= 0 || n > 400) {
    throw new Error('Peso inválido');
  }
  return Math.round(n * 10) / 10;
}

function kgALb(kg) {
  return kg * 2.20462;
}

function lbAKg(lb) {
  return lb / 2.20462;
}

// El peso SIEMPRE se guarda en kg -- esto es solo para la pantalla de
// capturar: convierte lo que la persona tecleó (en SU unidad preferida) a
// kg antes de mandarlo al servidor.
function aKg(valor, unidad) {
  return unidad === 'lb' ? lbAKg(valor) : Number(valor);
}

// Cindy ve en lb, Miguel en kg, y quieren compararse sin tener que convertir
// mentalmente -- así que cualquier peso que se muestre en pantalla (fuera
// del campo de captura) se ve siempre en las dos unidades.
function formatoPesoDual(pesoKg, decimales = 1) {
  if (pesoKg == null || !Number.isFinite(pesoKg)) return '—';
  const kgTxt = pesoKg.toFixed(decimales);
  const lbTxt = kgALb(pesoKg).toFixed(decimales);
  return `${kgTxt} kg · ${lbTxt} lb`;
}

  return { hoyISO, validarPeso, kgALb, lbAKg, aKg, formatoPesoDual };
})();
const hoyISO = modelo.hoyISO;
const validarPeso = modelo.validarPeso;
const kgALb = modelo.kgALb;
const lbAKg = modelo.lbAKg;
const aKg = modelo.aKg;
const formatoPesoDual = modelo.formatoPesoDual;

// ── peso/js/calculos.js ──────────────────────────────────────────
const calculos = (function () {
// Toda la aritmética de peso/progreso. Puro: recibe datos, regresa números.

function pesosDeUsuario(pesos, usuario) {
  return pesos
    .filter((p) => p.usuario === usuario)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function ultimoPeso(pesos, usuario) {
  const propios = pesosDeUsuario(pesos, usuario);
  return propios.length ? propios[propios.length - 1] : null;
}

// Racha de días consecutivos (hasta hoy) con registro. Un hueco la corta.
function racha(pesos, usuario, hoy = hoyISO()) {
  const fechas = new Set(pesosDeUsuario(pesos, usuario).map((p) => p.fecha));
  let n = 0;
  let cursor = new Date(`${hoy}T00:00:00`);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!fechas.has(iso)) break;
    n++;
    cursor.setDate(cursor.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}

// Promedio móvil de `dias` (suaviza el ruido día a día: agua, comida, etc.)
function promedioMovil(serie, dias) {
  return serie.map((punto, i) => {
    const desde = Math.max(0, i - dias + 1);
    const ventana = serie.slice(desde, i + 1);
    const prom = ventana.reduce((a, p) => a + p.pesoKg, 0) / ventana.length;
    return { fecha: punto.fecha, pesoKg: Math.round(prom * 10) / 10 };
  });
}

// {kgPerdidos, kgRestantes, pctAvance} -- null si no hay meta o no hay peso inicial.
function avanceMeta(usuario, pesoActualKg) {
  const { metaKg, pesoInicialKg } = usuario;
  if (metaKg == null || pesoInicialKg == null || pesoActualKg == null) return null;
  const totalPorPerder = pesoInicialKg - metaKg;
  if (totalPorPerder === 0) return { kgPerdidos: 0, kgRestantes: 0, pctAvance: 1 };
  const perdidoHastaAhora = pesoInicialKg - pesoActualKg;
  const pct = perdidoHastaAhora / totalPorPerder;
  return {
    kgPerdidos: Math.round(perdidoHastaAhora * 10) / 10,
    kgRestantes: Math.round((pesoActualKg - metaKg) * 10) / 10,
    pctAvance: Math.max(0, Math.min(1.5, pct)), // permite pasarse de la meta (>1) sin romper la barra visualmente arriba de eso
  };
}

// Últimos `n` promedios semanales (domingo-sábado), para la gráfica de tendencia suave.
function promedioSemanal(serie, semanas = 12) {
  if (!serie.length) return [];
  const porSemana = new Map();
  for (const p of serie) {
    const d = new Date(`${p.fecha}T00:00:00`);
    const inicioSemana = new Date(d);
    inicioSemana.setDate(d.getDate() - d.getDay());
    const clave = inicioSemana.toISOString().slice(0, 10);
    if (!porSemana.has(clave)) porSemana.set(clave, []);
    porSemana.get(clave).push(p.pesoKg);
  }
  const claves = [...porSemana.keys()].sort().slice(-semanas);
  return claves.map((clave) => {
    const valores = porSemana.get(clave);
    const prom = valores.reduce((a, v) => a + v, 0) / valores.length;
    return { semana: clave, pesoKg: Math.round(prom * 10) / 10 };
  });
}

  return { pesosDeUsuario, ultimoPeso, racha, promedioMovil, avanceMeta, promedioSemanal };
})();
const pesosDeUsuario = calculos.pesosDeUsuario;
const ultimoPeso = calculos.ultimoPeso;
const racha = calculos.racha;
const promedioMovil = calculos.promedioMovil;
const avanceMeta = calculos.avanceMeta;
const promedioSemanal = calculos.promedioSemanal;

// ── peso/js/graficas.js ──────────────────────────────────────────
const graficas = (function () {
// Gráficas en SVG escrito a mano. Sin librerías. A diferencia de una gráfica
// de dinero, el eje Y aquí NO arranca en 0 (un peso de 0 no significa nada) --
// se ajusta al rango de los datos con un margen, para que se note el cambio.
//
// Pensadas para celular: el ancho crece con la cantidad de puntos (para que
// no se amontonen) y el contenedor hace scroll horizontal si no caben --
// ver .grafica-scroll en css/estilos.css. Con pocos puntos se ve completa
// sin necesidad de scroll.

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

function svgLineaPeso(serie, { height = 220, color = '#4c5fd5', meta = null } = {}) {
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

function svgLineaComparativa(serieA, serieB, { height = 240, colorA = '#4c5fd5', colorB = '#ff6b4a' } = {}) {
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

// El avance hacia la meta, como una barra horizontal (índigo → coral, la
// paleta de la app) con el Rasengan real (peso/assets/rasengan.mp4) montado
// en la punta, como si la esfera fuera la que va empujando el avance.
function svgBarraAvance(pct, { width = 260 } = {}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const pctTexto = Math.round(pct * 100);
  return `<div class="rasengan-barra" style="max-width:${width}px;">
    <div class="rasengan-barra-track">
      <div class="rasengan-barra-fill" style="width:${clamped * 100}%"></div>
      <span class="rasengan-barra-pct">${pctTexto}%</span>
    </div>
    <div class="rasengan-barra-bola" style="left:${clamped * 100}%">
      <video src="assets/rasengan.mp4" autoplay muted loop playsinline></video>
    </div>
  </div>`;
}

  return { svgLineaPeso, svgLineaComparativa, svgBarraAvance };
})();
const svgLineaPeso = graficas.svgLineaPeso;
const svgLineaComparativa = graficas.svgLineaComparativa;
const svgBarraAvance = graficas.svgBarraAvance;

// ── peso/js/cola.js ──────────────────────────────────────────
const cola = (function () {
// Cola offline (mismo patrón que el Cotizador): capturar nunca espera al
// servidor. Se guarda de una en localStorage, se ve en la app al instante, y
// se sincroniza cuando hay señal -- reintentando solo, sin que el usuario
// tenga que hacer nada.

const CLAVE_COLA = 'cp_cola_pesos';
const CLAVE_CACHE = 'cp_cache_datos';

function leerJSON(clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardarJSON(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

function leerCola() {
  return leerJSON(CLAVE_COLA, []);
}

function encolarPeso(usuario, fecha, pesoKg) {
  const cola = leerCola().filter((e) => !(e.usuario === usuario && e.fecha === fecha));
  cola.push({ usuario, fecha, pesoKg, ts: Date.now() });
  guardarJSON(CLAVE_COLA, cola);
}

function leerCache() {
  return leerJSON(CLAVE_CACHE, { usuarios: [], pesos: [], version: '0', retoInicio: null, retoFin: null });
}

function guardarCache(datos) {
  guardarJSON(CLAVE_CACHE, datos);
}

// Snapshot del servidor (o el último cacheado si no hay señal) + lo que
// todavía está en la cola sin confirmar, para que lo que acabas de capturar
// se vea de inmediato aunque no haya llegado al Sheet.
function conColaEncima(datos) {
  const cola = leerCola();
  if (!cola.length) return datos;
  const pesos = datos.pesos.filter(
    (p) => !cola.some((e) => e.usuario === p.usuario && e.fecha === p.fecha)
  );
  for (const e of cola) pesos.push({ usuario: e.usuario, fecha: e.fecha, pesoKg: e.pesoKg });
  return { ...datos, pesos };
}

async function refrescarDatos() {
  try {
    const datos = await api.leerDatos();
    if (datos.ok) {
      const plano = { usuarios: datos.usuarios, pesos: datos.pesos, version: datos.version, retoInicio: datos.retoInicio, retoFin: datos.retoFin };
      guardarCache(plano);
      return { datos: conColaEncima(plano), sinConexion: false };
    }
    throw new Error(datos.error || 'Error del servidor');
  } catch {
    return { datos: conColaEncima(leerCache()), sinConexion: true };
  }
}

// Chequeo barato: compara el número de versión del servidor contra el que
// se guardó en el último refrescarDatos(). Si no cambió, no vale la pena
// pedir 'datos' completo -- así se puede preguntar cada pocos segundos sin
// gastar cuota.
async function hayCambiosRemotos() {
  try {
    const r = await api.leerVersion();
    if (!r.ok) return false;
    return String(r.version) !== String(leerCache().version || '0');
  } catch {
    return false;
  }
}

let sincronizando = false;

async function sincronizar() {
  if (sincronizando) return;
  const cola = leerCola();
  if (!cola.length || !navigator.onLine) return;
  sincronizando = true;
  const pendientes = [];
  for (const entrada of cola) {
    try {
      const r = await api.guardarPeso(entrada.usuario, entrada.fecha, entrada.pesoKg);
      if (!r.ok) pendientes.push(entrada);
    } catch {
      pendientes.push(entrada); // sigue sin señal -- se queda en la cola
    }
  }
  guardarJSON(CLAVE_COLA, pendientes);
  sincronizando = false;
  return { sincronizados: cola.length - pendientes.length, pendientes: pendientes.length };
}

function iniciarSincronizacionAutomatica(alSincronizar) {
  const intentar = async () => {
    const r = await sincronizar();
    if (r && r.sincronizados > 0 && alSincronizar) alSincronizar(r);
  };
  window.addEventListener('online', intentar);
  setInterval(intentar, 15000);
  intentar();
}

  return { leerCola, encolarPeso, leerCache, refrescarDatos, hayCambiosRemotos, sincronizar, iniciarSincronizacionAutomatica };
})();
const leerCola = cola.leerCola;
const encolarPeso = cola.encolarPeso;
const leerCache = cola.leerCache;
const refrescarDatos = cola.refrescarDatos;
const hayCambiosRemotos = cola.hayCambiosRemotos;
const sincronizar = cola.sincronizar;
const iniciarSincronizacionAutomatica = cola.iniciarSincronizacionAutomatica;

// ── peso/js/ui.js ──────────────────────────────────────────
// Estado, render y eventos. El único archivo que toca el DOM.
// El login (URL, usuario, PIN) ya pasó en el launcher (../index.html) antes
// de llegar aquí -- esta app solo confirma que hay sesión (exigirSesion) y
// usa getUsuario() para saber quién eres.

const E = {
  vista: 'capturar',
  datos: { usuarios: [], pesos: [], retoInicio: null, retoFin: null },
  sinConexion: false,
  captura: { fecha: hoyISO(), pesoStr: '' },
  graficaActiva: 'diaria',
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatoFechaCorta(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const texto = `${d}-${MESES_CORTOS[m - 1].charAt(0).toUpperCase()}${MESES_CORTOS[m - 1].slice(1)}`;
  return fechaISO === hoyISO() ? `Hoy · ${texto}` : texto;
}

function fmt1(n) {
  return Number(n).toFixed(1);
}

// Igual que formatoPesoDual (modelo.js) pero con kg/lb en colores distintos
// -- vive aquí (no en modelo.js) porque modelo.js es puro/sin DOM y esto
// regresa HTML para innerHTML, no texto plano.
function formatoPesoDualColor(pesoKg) {
  if (pesoKg == null || !Number.isFinite(pesoKg)) return '—';
  const kgTxt = fmt1(pesoKg);
  const lbTxt = fmt1(kgALb(pesoKg));
  return `<span class="unidad-kg">${kgTxt} kg</span> · <span class="unidad-lb">${lbTxt} lb</span>`;
}

function toast(msg, esError = false) {
  let el = document.getElementById('toast-simple');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-simple';
    el.className = 'toast-simple';
    document.body.appendChild(el);
  }
  el.style.background = esError ? 'var(--peligro)' : 'var(--texto)';
  el.style.color = esError ? '#fff' : 'var(--fondo)';
  el.textContent = msg;
  el.classList.remove('oculto');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('oculto'), 2200);
}

function usuarioObj(nombre) {
  return E.datos.usuarios.find((u) => u.usuario === nombre) || { usuario: nombre, metaKg: null, pesoInicialKg: null, unidad: 'kg' };
}

function otroUsuario() {
  return E.datos.usuarios.map((u) => u.usuario).find((u) => u !== getUsuario());
}

// Unidad en la que ESTE usuario prefiere capturar (Cindy en lb, Miguel en
// kg) -- el peso guardado siempre es en kg, esto solo decide qué unidad le
// pide la app al teclear. Todo lo demás en pantalla se ve en las dos.
function miUnidad() {
  return usuarioObj(getUsuario()).unidad === 'lb' ? 'lb' : 'kg';
}

// ---------- arranque ----------

async function iniciarApp() {
  document.getElementById('app').classList.remove('oculto');
  await cargarYRenderizar();
  cola.iniciarSincronizacionAutomatica(() => cargarYRenderizar());
  // Para que el peso que capture Cindy/Miguel le llegue rápido al otro sin
  // recargar a mano: cada 8s se pregunta solo el número de versión (barato,
  // sin tocar Hojas) y nomás si cambió se jala 'datos' completo. Al volver
  // a primer plano (abrir la app, regresar de otra app) se refresca directo.
  const revisarVersion = async () => {
    if (document.hidden || E.vista === 'ajustes') return; // no pisar un campo a medio editar
    if (await cola.hayCambiosRemotos()) cargarYRenderizar();
  };
  setInterval(revisarVersion, 8000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && E.vista !== 'ajustes') cargarYRenderizar();
  });
}

async function cargarYRenderizar() {
  const { datos, sinConexion } = await cola.refrescarDatos();
  E.datos = datos;
  E.sinConexion = sinConexion;
  actualizarBadgeConexion();
  render();
}

function actualizarBadgeConexion() {
  const el = document.getElementById('badge-conexion');
  const pendientes = cola.leerCola().length;
  if (E.sinConexion) {
    el.textContent = pendientes ? `📴 Sin conexión · ${pendientes} sin sincronizar` : '📴 Sin conexión (viendo lo último guardado)';
    el.classList.remove('oculto');
  } else if (pendientes) {
    el.textContent = `🔄 Sincronizando ${pendientes}...`;
    el.classList.remove('oculto');
  } else {
    el.classList.add('oculto');
  }
}

function cambiarVista(nombre) {
  E.vista = nombre;
  document.querySelectorAll('.vista').forEach((v) => v.classList.remove('activa'));
  document.getElementById(`vista-${nombre}`).classList.add('activa');
  document.querySelectorAll('.nav-inferior button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === nombre));
  render();
}

function render() {
  if (E.vista === 'capturar') renderCapturar();
  else if (E.vista === 'progreso') renderProgreso();
  else if (E.vista === 'reto') renderReto();
  else if (E.vista === 'ajustes') renderAjustes();
}

// ---------- capturar ----------

function renderCapturar() {
  const unidad = miUnidad();
  document.getElementById('captura-usuario').textContent = getUsuario();
  document.getElementById('captura-unidad').textContent = unidad;
  document.getElementById('captura-fecha').value = E.captura.fecha;
  document.getElementById('captura-fecha-texto').textContent = formatoFechaCorta(E.captura.fecha);
  const ultimo = ultimoPeso(E.datos.pesos, getUsuario());
  document.getElementById('captura-ultimo').innerHTML = ultimo
    ? `Última captura: ${ultimo.fecha} — ${formatoPesoDualColor(ultimo.pesoKg)}`
    : 'Todavía no capturas nada.';
  const r = racha(E.datos.pesos, getUsuario());
  document.getElementById('captura-racha').textContent = r > 0 ? `🔥 Racha: ${r} día(s)` : '';

  const otraUnidad = unidad === 'kg' ? 'lb' : 'kg';
  const valor = parseFloat(E.captura.pesoStr);
  document.getElementById('captura-peso-otro').textContent = Number.isFinite(valor)
    ? `≈ ${fmt1(unidad === 'kg' ? kgALb(valor) : lbAKg(valor))} ${otraUnidad}`
    : '';
}

async function guardarCaptura() {
  try {
    const unidad = miUnidad();
    const pesoKg = validarPeso(aKg(E.captura.pesoStr, unidad));
    const fecha = E.captura.fecha;
    cola.encolarPeso(getUsuario(), fecha, pesoKg);
    E.datos.pesos = E.datos.pesos.filter((p) => !(p.usuario === getUsuario() && p.fecha === fecha));
    E.datos.pesos.push({ usuario: getUsuario(), fecha, pesoKg });
    toast('Guardado ✓');
    E.captura.pesoStr = '';
    document.getElementById('captura-peso-input').value = '';
    actualizarBadgeConexion();
    render();
    mostrarRegistroOverlay();
    cola.sincronizar().then(() => { actualizarBadgeConexion(); });
  } catch (e) {
    toast(e.message, true);
  }
}

// El video de "premio" al guardar -- cubre la tarjeta de captura un rato y
// se quita solo, sin que el usuario tenga que hacer nada.
function mostrarRegistroOverlay() {
  const overlay = document.getElementById('registro-overlay');
  const video = document.getElementById('registro-video');
  overlay.classList.remove('oculto');
  video.currentTime = 0;
  video.play().catch(() => {});
  const ocultar = () => overlay.classList.add('oculto');
  video.onended = ocultar;
  setTimeout(ocultar, 9000); // respaldo por si 'ended' no dispara (iOS a veces no lo hace en loops cortos)
}

function wireCapturar() {
  document.getElementById('captura-peso-input').addEventListener('input', (e) => {
    E.captura.pesoStr = e.target.value;
    renderCapturar();
  });
  document.getElementById('captura-fecha').addEventListener('change', (e) => {
    E.captura.fecha = e.target.value;
    renderCapturar();
  });
  document.getElementById('btn-guardar-captura').addEventListener('click', guardarCaptura);
}

// ---------- mi progreso ----------

function renderProgreso() {
  const serie = pesosDeUsuario(E.datos.pesos, getUsuario());
  const u = usuarioObj(getUsuario());
  const ultimo = serie.length ? serie[serie.length - 1].pesoKg : null;

  document.getElementById('progreso-racha').textContent = `🔥 ${racha(E.datos.pesos, getUsuario())}`;
  const diasFaltan = diasFaltanReto();
  document.getElementById('progreso-dias-faltan').textContent =
    diasFaltan == null ? '—' : diasFaltan >= 0 ? diasFaltan : '¡ya!';
  document.getElementById('progreso-ultimo').innerHTML = formatoPesoDualColor(ultimo);

  const avance = avanceMeta(u, ultimo);
  const elAvance = document.getElementById('progreso-avance');
  if (avance) {
    elAvance.innerHTML = `
      <div class="fila-avance">
        <span>${formatoPesoDualColor(avance.kgPerdidos)} perdidos</span>
        <span>${formatoPesoDualColor(avance.kgRestantes)} para tu meta</span>
      </div>
      ${graficas.svgBarraAvance(avance.pctAvance)}
    `;
  } else {
    elAvance.innerHTML = '<p class="texto-suave">Define tu meta y tu peso inicial en Ajustes para ver tu avance.</p>';
  }

  document.getElementById('grafica-diaria').innerHTML = graficas.svgLineaPeso(serie, { meta: u.metaKg, color: '#ff6b4a' });

  const suavizada = promedioMovil(serie, 7);
  document.getElementById('grafica-progreso').innerHTML = graficas.svgLineaPeso(suavizada, { meta: u.metaKg });

  const semanal = promedioSemanal(serie, 12);
  document.getElementById('grafica-semanal').innerHTML = graficas.svgLineaPeso(semanal.map((s) => ({ fecha: s.semana, pesoKg: s.pesoKg })));

  mostrarGraficaActiva();
}

const IDS_GRAFICA = { diaria: 'grafica-diaria', tendencia: 'grafica-progreso', semanal: 'grafica-semanal' };

function mostrarGraficaActiva() {
  document.querySelectorAll('#grafica-tabs button').forEach((b) => b.classList.toggle('activo', b.dataset.grafica === E.graficaActiva));
  Object.entries(IDS_GRAFICA).forEach(([clave, id]) => {
    document.getElementById(id).classList.toggle('oculto', clave !== E.graficaActiva);
  });
}

// ---------- nuestro reto ----------

// Las 4 figuras que mandó Miguel (de gordo a delgado) para marcar cada 25%
// de avance hacia la meta -- viven en Reto (donde ya se comparan las dos
// personas) y dejan el Rasengan solo para Mi progreso.
function avatarMeta(pctAvance) {
  const pct = Math.max(0, Math.min(1, pctAvance));
  const idx = pct >= 0.75 ? 4 : pct >= 0.5 ? 3 : pct >= 0.25 ? 2 : 1;
  return `assets/meta${idx}.png`;
}

// null si no hay fecha de fin guardada; si no, los días que faltan (negativo
// si ya pasó). Compartida entre "Mi progreso" (kpi) y "Nuestro reto" (texto).
function diasFaltanReto() {
  if (!E.datos.retoFin) return null;
  const hoy = hoyISO();
  return Math.ceil((new Date(`${E.datos.retoFin}T00:00:00`) - new Date(`${hoy}T00:00:00`)) / 86400000);
}

function textoFechasReto() {
  const { retoInicio, retoFin } = E.datos;
  if (!retoInicio && !retoFin) return '';
  const dias = diasFaltanReto();
  if (retoFin) {
    const rango = retoInicio ? `${retoInicio} → ${retoFin}` : `hasta ${retoFin}`;
    if (dias > 0) return `${rango} · faltan ${dias} día(s)`;
    if (dias === 0) return `${rango} · ¡hoy termina!`;
    return `${rango} · terminó hace ${Math.abs(dias)} día(s)`;
  }
  return `Empezó ${retoInicio}`;
}

function renderReto() {
  const otro = otroUsuario();
  const serieYo = pesosDeUsuario(E.datos.pesos, getUsuario());
  const serieOtro = otro ? pesosDeUsuario(E.datos.pesos, otro) : [];

  document.getElementById('reto-fechas').textContent = textoFechasReto();
  document.getElementById('reto-nombres').textContent = otro ? `${getUsuario()} vs. ${otro}` : getUsuario();
  document.getElementById('leyenda-yo').textContent = getUsuario();
  document.getElementById('leyenda-otro').textContent = otro || '—';
  document.getElementById('grafica-reto').innerHTML = graficas.svgLineaComparativa(
    promedioMovil(serieYo, 7), promedioMovil(serieOtro, 7),
    { colorA: '#4c5fd5', colorB: '#ff6b4a' }
  );

  const nombres = otro ? [getUsuario(), otro] : [getUsuario()];
  const filas = nombres.map((nombre) => {
    const serie = pesosDeUsuario(E.datos.pesos, nombre);
    const u = usuarioObj(nombre);
    const ultimo = serie.length ? serie[serie.length - 1].pesoKg : null;
    const avance = avanceMeta(u, ultimo);
    const r = racha(E.datos.pesos, nombre);
    return { nombre, ultimo, avance, racha: r };
  });

  document.getElementById('reto-tarjetas').innerHTML = filas.map((f) => `
    <div class="tarjeta-persona">
      ${f.avance ? `<img class="avatar-marca-agua" src="${avatarMeta(f.avance.pctAvance)}" alt="">` : ''}
      <div class="tarjeta-persona-contenido">
      <h3>${f.nombre === getUsuario() ? `${f.nombre} (tú)` : f.nombre}</h3>
      <div class="dato-grande valor-dual">${formatoPesoDualColor(f.ultimo)}</div>
      <div class="texto-suave">🔥 ${f.racha} día(s) de racha</div>
      ${f.avance ? `
        <div class="fila-avance small">
          <span>${formatoPesoDualColor(f.avance.kgPerdidos)} perdidos</span>
        </div>
        <div class="texto-suave">${Math.round(f.avance.pctAvance * 100)}% de tu meta</div>
      ` : '<div class="texto-suave">Sin meta definida</div>'}
      </div>
    </div>
  `).join('');
}

// ---------- ajustes ----------

function renderAjustes() {
  const u = usuarioObj(getUsuario());
  const unidad = miUnidad();
  document.getElementById('ajustes-usuario').textContent = getUsuario();
  document.getElementById('ajustes-inicial-unidad').textContent = unidad;
  document.getElementById('ajustes-meta-unidad').textContent = unidad;
  document.getElementById('ajustes-meta').value = u.metaKg != null ? fmt1(unidad === 'kg' ? u.metaKg : kgALb(u.metaKg)) : '';
  document.getElementById('ajustes-inicial').value = u.pesoInicialKg != null ? fmt1(unidad === 'kg' ? u.pesoInicialKg : kgALb(u.pesoInicialKg)) : '';
  document.querySelectorAll('#unidad-grupo button').forEach((b) => b.classList.toggle('activo', b.dataset.unidad === unidad));
  document.getElementById('tarjeta-borrar-datos').classList.toggle('oculto', !esAdmin());
  document.getElementById('tarjeta-fechas-reto').classList.toggle('oculto', !esAdmin());
  document.getElementById('reto-fecha-inicio').value = E.datos.retoInicio || '';
  document.getElementById('reto-fecha-fin').value = E.datos.retoFin || '';
}

async function guardarFechasRetoAjustes() {
  const inicio = document.getElementById('reto-fecha-inicio').value;
  const fin = document.getElementById('reto-fecha-fin').value;
  try {
    const r = await api.guardarFechasReto(getUsuario(), inicio, fin);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el guardado');
    E.datos.retoInicio = inicio || null;
    E.datos.retoFin = fin || null;
    toast('Fechas guardadas ✓');
  } catch (e) {
    toast('No se pudo guardar (¿sin conexión?): ' + e.message, true);
  }
}

async function guardarMetaAjustes() {
  const unidad = miUnidad();
  const valorMeta = parseFloat(document.getElementById('ajustes-meta').value);
  const valorInicial = parseFloat(document.getElementById('ajustes-inicial').value);
  const metaKg = Number.isFinite(valorMeta) ? Math.round(aKg(valorMeta, unidad) * 10) / 10 : null;
  const pesoInicialKg = Number.isFinite(valorInicial) ? Math.round(aKg(valorInicial, unidad) * 10) / 10 : null;
  try {
    const r = await api.guardarMeta(getUsuario(), metaKg, pesoInicialKg);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el guardado');
    const u = usuarioObj(getUsuario());
    u.metaKg = metaKg;
    u.pesoInicialKg = pesoInicialKg;
    toast('Meta guardada ✓');
    render();
  } catch (e) {
    toast('No se pudo guardar (¿sin conexión?): ' + e.message, true);
  }
}

async function cambiarUnidadAjustes(unidad) {
  try {
    const r = await api.guardarUnidad(getUsuario(), unidad);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el cambio');
    usuarioObj(getUsuario()).unidad = unidad;
    toast(`Ahora capturas en ${unidad} ✓`);
    render();
  } catch (e) {
    toast('No se pudo cambiar (¿sin conexión?): ' + e.message, true);
  }
}

async function cambiarPinAjustes() {
  const actual = prompt('Tu PIN actual (vacío si no tienes uno):') || '';
  const nuevo = prompt('Nuevo PIN (4 dígitos, vacío para quedarte sin PIN):');
  if (nuevo === null) return;
  if (nuevo !== '' && !/^\d{4}$/.test(nuevo)) {
    toast('El PIN nuevo debe ser de 4 dígitos (o vacío para quitarlo)', true);
    return;
  }
  try {
    const r = await api.cambiarPin(getUsuario(), actual, nuevo);
    if (r.ok) toast('PIN actualizado ✓');
    else toast(r.error || 'PIN actual incorrecto', true);
  } catch (e) {
    toast('No se pudo cambiar (¿sin conexión?): ' + e.message, true);
  }
}

// Respaldo manual (Gastos ya tenía el suyo, a Peso le faltaba) -- descarga
// un .json con tus propios pesos + meta, sin pasar por el servidor (usa lo
// que ya está cargado en E.datos), funciona hasta sin conexión.
function exportarMisDatosPeso() {
  const usuario = getUsuario();
  const u = usuarioObj(usuario);
  const paquete = {
    usuario,
    unidad: u.unidad,
    metaKg: u.metaKg,
    pesoInicialKg: u.pesoInicialKg,
    pesos: E.datos.pesos.filter((p) => p.usuario === usuario),
    exportado: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `peso-respaldo-${usuario}-${hoyISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function wireAjustes() {
  document.getElementById('btn-exportar-peso').addEventListener('click', exportarMisDatosPeso);
  document.getElementById('btn-guardar-meta').addEventListener('click', guardarMetaAjustes);
  document.getElementById('btn-guardar-fechas-reto').addEventListener('click', guardarFechasRetoAjustes);
  document.getElementById('btn-cambiar-pin').addEventListener('click', cambiarPinAjustes);
  document.getElementById('unidad-grupo').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-unidad]');
    if (!btn || btn.classList.contains('activo')) return;
    cambiarUnidadAjustes(btn.dataset.unidad);
  });
  document.getElementById('btn-cambiar-usuario').addEventListener('click', () => {
    cerrarSesion();
    location.href = '../index.html';
  });
  document.getElementById('btn-borrar-mis-datos').addEventListener('click', async () => {
    const confirmacion = prompt('Esto borra TODOS tus pesos registrados (los de la otra persona no se tocan). Escribe BORRAR para confirmar:');
    if (confirmacion !== 'BORRAR') return;
    try {
      const r = await api.borrarPesos(getUsuario());
      if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el borrado');
      toast('Tus datos fueron borrados');
      await cargarYRenderizar();
    } catch (e) {
      toast('No se pudo borrar (¿sin conexión?): ' + e.message, true);
    }
  });
}

// ---------- popup de confirmación (reemplaza confirm() nativo) ----------

function confirmarPopup(mensaje) {
  return new Promise((resolve) => {
    const fondo = document.getElementById('popup-confirmar');
    document.getElementById('popup-mensaje').textContent = mensaje;
    fondo.classList.remove('oculto');
    const btnSi = document.getElementById('popup-aceptar');
    const btnNo = document.getElementById('popup-cancelar');
    const limpiar = (valor) => {
      fondo.classList.add('oculto');
      btnSi.removeEventListener('click', onSi);
      btnNo.removeEventListener('click', onNo);
      resolve(valor);
    };
    const onSi = () => limpiar(true);
    const onNo = () => limpiar(false);
    btnSi.addEventListener('click', onSi);
    btnNo.addEventListener('click', onNo);
  });
}

// ---------- arranque ----------

function wireGlobal() {
  document.querySelectorAll('.nav-inferior button, .btn-ajustes').forEach((b) => {
    b.addEventListener('click', () => cambiarVista(b.dataset.vista));
  });
  document.getElementById('grafica-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grafica]');
    if (!btn) return;
    E.graficaActiva = btn.dataset.grafica;
    mostrarGraficaActiva();
  });
  document.querySelectorAll('[data-confirmar-salida]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      confirmarPopup('¿Seguro que quieres ir a Gastos?').then((ok) => { if (ok) location.href = a.href; });
    });
  });
}

async function init() {
  wireGlobal();
  wireCapturar();
  wireAjustes();

  if (!exigirSesion('../index.html')) return;

  await iniciarApp();
}

// Ver comentario igual en gastos/js/ui.js.
window.addEventListener('unhandledrejection', (e) => {
  console.error('Error sin atrapar:', e.reason);
  toast('Ocurrió un error: ' + (e.reason?.message || e.reason), true);
});

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  // Ver comentario igual en js/ui.js (launcher) -- update() fuerza la
  // revisión sin cambiar la URL del service worker en cada carga.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js').then((r) => r.update()).catch(() => {});
  });
  // Ver comentario igual en js/ui.js (launcher) -- autorefresca cuando toma
  // control un service worker nuevo, pero no si hay un campo con texto sin
  // mandar: espera a que la app pase a segundo plano para no borrarlo.
  let recargando = false;
  function intentarRecargar() {
    if (recargando) return;
    const activo = document.activeElement;
    const escribiendo = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA') && activo.value;
    if (escribiendo) return;
    recargando = true;
    location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', intentarRecargar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) intentarRecargar(); });
}
