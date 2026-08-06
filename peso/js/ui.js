// Estado, render y eventos. El único archivo que toca el DOM.
// El login (URL, usuario, PIN) ya pasó en el launcher (../index.html) antes
// de llegar aquí -- esta app solo confirma que hay sesión (exigirSesion) y
// usa getUsuario() para saber quién eres.

import * as cola from './cola.js';
import * as api from '../../shared/api.js';
import * as graficas from './graficas.js';
import * as actualizacion from './actualizacion.js';
import * as uiHelpers from './ui_helpers.js';
import { hoyISO, validarPeso, kgALb, lbAKg, aKg } from './modelo.js';
import {
  pesosDeUsuario, ultimoPeso, racha, promedioMovil, avanceMeta, promedioSemanal,
} from './calculos.js';
import { getUsuario, esAdmin, exigirSesion, cerrarSesionEnSegundoPlano, debeConfirmarNavegacion, ejecutarUnaVez } from '../../shared/sesion.js';
import * as fondo from '../../shared/fondo.js';
import { escapeHTML, escapeAtributo, idSeguro, colorSeguro, urlLocalSegura } from '../../shared/ui_seguridad.js';

api.configurarManejadorAuth(() => {
  cerrarSesionEnSegundoPlano(() => undefined);
  location.href = '../index.html';
});

const E = {
  vista: 'capturar',
  datos: { usuarios: [], pesos: [], retoInicio: null, retoFin: null },
  sinConexion: false,
  captura: { fecha: hoyISO(), fechaOriginal: hoyISO(), editandoFechaOriginal: null, pesoStr: '' },
  graficaActiva: 'diaria',
  actualizacion: { metadata: null, buscando: false, preparada: false },
};

let registroSW = null;
let intentarRecargaDiferida = () => {};
const ajustesPendientes = new Set();

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Color fijo por persona (no "yo vs. el otro") -- los datos de Cindy siempre
// se ven morados y los de Miguel siempre rojos, sin importar en qué celular
// se estén viendo. Un tercer usuario que no sea ninguno de los dos cae en
// el índigo de la marca, para no romper si algún día se agrega alguien más.
const COLOR_POR_USUARIO = { Miguel: '#e5484d', Cindy: '#9333ea' };
function colorDeUsuario(nombre) {
  return COLOR_POR_USUARIO[nombre] || '#4c5fd5';
}

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
  el.setAttribute('role', esError ? 'alert' : 'status');
  el.setAttribute('aria-live', esError ? 'assertive' : 'polite');
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
  cargarFondoGuardado(); // no bloquea el arranque -- se aplica en cuanto esté lista
  await cargarYRenderizar();
  cola.iniciarSincronizacionAutomatica(getUsuario(), () => cargarYRenderizar());
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
  const { datos, sinConexion } = await cola.refrescarDatos(getUsuario());
  E.datos = datos;
  E.sinConexion = sinConexion;
  actualizarBadgeConexion();
  render();
}

function actualizarBadgeConexion() {
  const el = document.getElementById('badge-conexion');
  const pendientes = cola.leerCola(getUsuario()).length;
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
  document.querySelectorAll('.nav-inferior button').forEach((b) => {
    const activo = b.dataset.vista === nombre;
    b.classList.toggle('activo', activo);
    if (activo) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
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
    ? `Última captura: ${escapeHTML(ultimo.fecha)} — ${formatoPesoDualColor(ultimo.pesoKg)}`
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
    const operaciones = uiHelpers.planificarEdicion(E.captura.editandoFechaOriginal, fecha, pesoKg);
    for (const operacion of operaciones) {
      if (operacion.tipo === 'borrar') cola.encolarBorrado(getUsuario(), operacion.fecha);
      else cola.encolarPeso(getUsuario(), operacion.fecha, operacion.pesoKg);
    }
    const fechasQuitadas = new Set(operaciones.map((o) => o.fecha));
    E.datos.pesos = E.datos.pesos.filter((p) => !(p.usuario === getUsuario() && fechasQuitadas.has(p.fecha)));
    E.datos.pesos.push({ usuario: getUsuario(), fecha, pesoKg });
    toast('Guardado ✓');
    E.captura = { fecha: hoyISO(), fechaOriginal: hoyISO(), editandoFechaOriginal: null, pesoStr: '' };
    document.getElementById('captura-peso-input').value = '';
    intentarRecargaDiferida();
    actualizarBadgeConexion();
    render();
    mostrarRegistroOverlay();
    cola.sincronizar(getUsuario()).then(() => { actualizarBadgeConexion(); });
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
    intentarRecargaDiferida();
  });
  document.getElementById('captura-fecha').addEventListener('change', (e) => {
    E.captura.fecha = e.target.value;
    renderCapturar();
    intentarRecargaDiferida();
  });
  document.getElementById('btn-guardar-captura').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, guardarCaptura));
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
      ${graficas.svgBarraAvance(avance.pctAvance, { color: colorDeUsuario(getUsuario()) })}
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
  renderHistorial(serie);
}

// Últimos 10, del más reciente al más viejo, con botón de borrar -- para
// cuando Cindy o Miguel se equivocan al capturar y quieren corregirlo sin
// tener que borrar TODO su historial (eso ya existía, esto no).
function renderHistorial(serie) {
  const ultimos = serie.slice(-10).reverse();
  const cont = document.getElementById('historial-pesos');
  if (!ultimos.length) {
    cont.innerHTML = '<p class="texto-suave">Todavía no capturas nada.</p>';
    return;
  }
  cont.innerHTML = ultimos
    .map(
      (p) => `<div class="lista-item">
      <span>${escapeHTML(formatoFechaCorta(p.fecha))} — ${formatoPesoDualColor(p.pesoKg)}</span>
      <span class="lista-acciones">
        <button class="icono" data-editar-peso="${escapeAtributo(p.fecha)}" aria-label="${escapeAtributo(`Editar registro del ${formatoFechaCorta(p.fecha)}`)}">✏️</button>
        <button class="icono" data-borrar-peso="${escapeAtributo(p.fecha)}" aria-label="${escapeAtributo(`Borrar registro del ${formatoFechaCorta(p.fecha)}`)}">🗑️</button>
      </span>
    </div>`
    )
    .join('');
}

function editarRegistroPeso(fecha) {
  const registro = E.datos.pesos.find((p) => p.usuario === getUsuario() && p.fecha === fecha);
  if (!registro) return;
  E.captura = { ...uiHelpers.prepararEdicion(registro, miUnidad()), fechaOriginal: fecha, editandoFechaOriginal: fecha };
  cambiarVista('capturar');
  const input = document.getElementById('captura-peso-input');
  input.value = E.captura.pesoStr;
  input.focus();
}

async function borrarRegistroPeso(fecha) {
  const ok = await confirmarPopup(`¿Borrar tu registro del ${formatoFechaCorta(fecha)}? No se puede deshacer.`);
  if (!ok) return;
  // Igual que guardarCaptura(): se encola y se refleja de una, no espera al
  // servidor -- antes esto sí esperaba la red y tronaba sin conexión.
  cola.encolarBorrado(getUsuario(), fecha);
  E.datos.pesos = E.datos.pesos.filter((p) => !(p.usuario === getUsuario() && p.fecha === fecha));
  const pendientes = cola.leerCola(getUsuario()).length;
  toast(uiHelpers.mensajeBorrado({ sinConexion: !navigator.onLine || E.sinConexion, pendientes }));
  actualizarBadgeConexion();
  render();
  cola.sincronizar(getUsuario()).then(() => { actualizarBadgeConexion(); });
}

const IDS_GRAFICA = { diaria: 'grafica-diaria', tendencia: 'grafica-progreso', semanal: 'grafica-semanal' };

function mostrarGraficaActiva() {
  document.querySelectorAll('#grafica-tabs button').forEach((b) => {
    const activo = b.dataset.grafica === E.graficaActiva;
    b.classList.toggle('activo', activo);
    b.setAttribute('aria-selected', String(activo));
    b.tabIndex = activo ? 0 : -1;
  });
  Object.entries(IDS_GRAFICA).forEach(([clave, id]) => {
    const panel = document.getElementById(id);
    const oculto = clave !== E.graficaActiva;
    panel.classList.toggle('oculto', oculto);
    panel.hidden = oculto;
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
  document.getElementById('leyenda-punto-yo').style.background = colorDeUsuario(getUsuario());
  document.getElementById('leyenda-punto-otro').style.background = otro ? colorDeUsuario(otro) : '#999';
  document.getElementById('grafica-reto').innerHTML = graficas.svgLineaComparativa(
    promedioMovil(serieYo, 7), promedioMovil(serieOtro, 7),
    { colorA: colorDeUsuario(getUsuario()), colorB: otro ? colorDeUsuario(otro) : '#999' }
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

  document.getElementById('grafica-versus').innerHTML = graficas.svgBarraVersus(
    filas[0]?.avance?.pctAvance || 0,
    filas[1]?.avance?.pctAvance || 0,
    escapeHTML(filas[0]?.nombre || getUsuario()),
    escapeHTML(filas[1]?.nombre || '—'),
    { width: 340, colorA: colorDeUsuario(filas[0]?.nombre || getUsuario()), colorB: colorDeUsuario(filas[1]?.nombre || '') }
  );

  document.getElementById('reto-tarjetas').innerHTML = filas.map((f) => `
    <div class="tarjeta-persona" style="border-top:3px solid ${colorSeguro(colorDeUsuario(f.nombre))};">
      ${f.avance ? `<img class="avatar-marca-agua" src="${escapeAtributo(urlLocalSegura(avatarMeta(f.avance.pctAvance)))}" alt="">` : ''}
      <div class="tarjeta-persona-contenido">
      <h3 style="color:${colorSeguro(colorDeUsuario(f.nombre))};">${escapeHTML(f.nombre === getUsuario() ? `${f.nombre} (tú)` : f.nombre)}</h3>
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
  asignarCampoAjuste('ajustes-meta', u.metaKg != null ? fmt1(unidad === 'kg' ? u.metaKg : kgALb(u.metaKg)) : '');
  asignarCampoAjuste('ajustes-inicial', u.pesoInicialKg != null ? fmt1(unidad === 'kg' ? u.pesoInicialKg : kgALb(u.pesoInicialKg)) : '');
  document.querySelectorAll('#unidad-grupo button').forEach((b) => {
    const activo = b.dataset.unidad === unidad;
    b.classList.toggle('activo', activo); b.setAttribute('aria-pressed', String(activo));
  });
  document.getElementById('tarjeta-borrar-datos').classList.toggle('oculto', !esAdmin());
  document.getElementById('tarjeta-fechas-reto').classList.toggle('oculto', !esAdmin());
  asignarCampoAjuste('reto-fecha-inicio', E.datos.retoInicio || '');
  asignarCampoAjuste('reto-fecha-fin', E.datos.retoFin || '');
  const meta = E.actualizacion.metadata;
  document.getElementById('actualizacion-version').textContent = meta?.version || '—';
  document.getElementById('actualizacion-fecha').textContent = meta
    ? actualizacion.formatearFechaActualizacion(meta.installedAt) : 'Sin información';
  document.getElementById('actualizacion-estado').textContent = actualizacion.obtenerEstadoActualizacion({
    soportado: 'serviceWorker' in navigator, metadata: meta,
    buscando: E.actualizacion.buscando, preparada: E.actualizacion.preparada,
  });
}

function asignarCampoAjuste(id, valor) {
  const campo = document.getElementById(id);
  if (ajustesPendientes.has(id)) return;
  campo.value = valor;
  campo.dataset.valorPersistido = valor;
}

function confirmarCamposAjuste(ids) {
  for (const id of ids) {
    const campo = document.getElementById(id);
    campo.dataset.valorPersistido = campo.value;
    ajustesPendientes.delete(id);
  }
  intentarRecargaDiferida();
}

async function releerMetadataActualizacion() {
  E.actualizacion.metadata = await actualizacion.leerMetadataActualizacion();
  if (E.vista === 'ajustes') renderAjustes();
}

function observarInstalacion(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      E.actualizacion.preparada = true;
      E.actualizacion.buscando = false;
      if (E.vista === 'ajustes') renderAjustes();
    }
  });
}

async function buscarActualizacionManual() {
  E.actualizacion.buscando = true;
  E.actualizacion.preparada = false;
  renderAjustes();
  try {
    await actualizacion.buscarActualizacion(registroSW);
    observarInstalacion(registroSW.installing);
    if (!registroSW.installing) E.actualizacion.buscando = false;
  } catch (e) {
    E.actualizacion.buscando = false;
    toast(e.message, true);
  }
  renderAjustes();
}

// ---------- fondo de pantalla personalizado ----------
//
// Por dispositivo, no por servidor -- cada quien elige la suya desde su
// propio Ajustes. Se guarda en IndexedDB (shared/fondo.js), no en
// localStorage. Va DETRÁS de #app (z-index -1, opacidad baja) -- todo el
// contenido real vive dentro de tarjetas con fondo sólido, así que por
// diseño no hay forma de que tape información.

let urlFondoActual = null; // para revocar el Object URL anterior y no acumular

function aplicarFondo(blob) {
  const el = document.getElementById('fondo-personalizado');
  if (urlFondoActual) URL.revokeObjectURL(urlFondoActual);
  urlFondoActual = blob ? URL.createObjectURL(blob) : null;
  el.style.backgroundImage = urlFondoActual ? `url(${urlFondoActual})` : '';
  el.classList.toggle('oculto', !urlFondoActual);
}

function actualizarVistaPreviaFondo() {
  const previa = document.getElementById('fondo-vista-previa');
  const btnQuitar = document.getElementById('btn-quitar-fondo');
  previa.style.backgroundImage = urlFondoActual ? `url(${urlFondoActual})` : '';
  previa.classList.toggle('oculto', !urlFondoActual);
  btnQuitar.classList.toggle('oculto', !urlFondoActual);
}

async function cargarFondoGuardado() {
  try {
    const blob = await fondo.leerFondo(getUsuario());
    aplicarFondo(blob);
    actualizarVistaPreviaFondo();
  } catch {
    // IndexedDB no disponible o falló -- no es crítico, la app sigue sin fondo.
  }
}

async function elegirFondo(archivo) {
  try {
    const comprimida = await fondo.comprimirImagen(archivo);
    await fondo.guardarFondo(getUsuario(), comprimida);
    aplicarFondo(comprimida);
    actualizarVistaPreviaFondo();
    toast('Fondo activado ✓');
  } catch (e) {
    toast('No se pudo usar esa foto: ' + e.message, true);
  }
}

async function quitarFondo() {
  await fondo.borrarFondo(getUsuario());
  aplicarFondo(null);
  actualizarVistaPreviaFondo();
  toast('Fondo quitado');
}

async function guardarFechasRetoAjustes() {
  const inicio = document.getElementById('reto-fecha-inicio').value;
  const fin = document.getElementById('reto-fecha-fin').value;
  try {
    const r = await api.guardarFechasReto(getUsuario(), inicio, fin);
    if (!r.ok) throw new Error(r.error || 'el servidor no confirmó el guardado');
    E.datos.retoInicio = inicio || null;
    E.datos.retoFin = fin || null;
    confirmarCamposAjuste(['reto-fecha-inicio', 'reto-fecha-fin']);
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
    confirmarCamposAjuste(['ajustes-meta', 'ajustes-inicial']);
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
  const actual = prompt('Tu PIN actual:') || '';
  const nuevo = prompt('Nuevo PIN (4 dígitos):');
  if (nuevo === null) return;
  if (!/^\d{4}$/.test(nuevo)) {
    toast('El PIN nuevo debe ser de 4 dígitos', true);
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
  document.getElementById('vista-ajustes').addEventListener('input', (e) => {
    if (!actualizacion.esCampoAjusteDiferible(e.target.id, e.target.type)) return;
    if (e.target.value === e.target.dataset.valorPersistido) ajustesPendientes.delete(e.target.id);
    else ajustesPendientes.add(e.target.id);
    intentarRecargaDiferida();
  });
  document.getElementById('btn-buscar-actualizacion').addEventListener('click', buscarActualizacionManual);
  document.getElementById('btn-exportar-peso').addEventListener('click', exportarMisDatosPeso);
  document.getElementById('btn-elegir-fondo').addEventListener('click', () => document.getElementById('input-fondo').click());
  document.getElementById('input-fondo').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (archivo) elegirFondo(archivo);
  });
  document.getElementById('btn-quitar-fondo').addEventListener('click', quitarFondo);
  document.getElementById('btn-guardar-meta').addEventListener('click', guardarMetaAjustes);
  document.getElementById('btn-guardar-fechas-reto').addEventListener('click', guardarFechasRetoAjustes);
  document.getElementById('btn-cambiar-pin').addEventListener('click', cambiarPinAjustes);
  document.getElementById('unidad-grupo').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-unidad]');
    if (!btn || btn.classList.contains('activo')) return;
    cambiarUnidadAjustes(btn.dataset.unidad);
  });
  document.getElementById('btn-cambiar-usuario').addEventListener('click', () => {
    cerrarSesionEnSegundoPlano(api.cerrarSesionServidor);
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

let focoAntesPopup = null;
function activarPopupAccesible(fondo, cerrar) {
  focoAntesPopup = document.activeElement;
  const botones = [...fondo.querySelectorAll('button:not(:disabled)')];
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key !== 'Tab' || !botones.length) return;
    const primero = botones[0]; const ultimo = botones[botones.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  };
  fondo.addEventListener('keydown', onKey);
  botones[0]?.focus();
  return () => {
    fondo.removeEventListener('keydown', onKey);
    focoAntesPopup?.focus?.(); focoAntesPopup = null;
  };
}

function confirmarPopup(mensaje) {
  return new Promise((resolve) => {
    const fondo = document.getElementById('popup-confirmar');
    document.getElementById('popup-mensaje').textContent = mensaje;
    fondo.classList.remove('oculto');
    const btnSi = document.getElementById('popup-aceptar');
    const btnNo = document.getElementById('popup-cancelar');
    let limpiarAccesibilidad = () => {};
    const limpiar = (valor) => {
      fondo.classList.add('oculto');
      btnSi.removeEventListener('click', onSi);
      btnNo.removeEventListener('click', onNo);
      limpiarAccesibilidad();
      resolve(valor);
    };
    const onSi = () => limpiar(true);
    const onNo = () => limpiar(false);
    btnSi.addEventListener('click', onSi);
    btnNo.addEventListener('click', onNo);
    limpiarAccesibilidad = activarPopupAccesible(fondo, () => limpiar(false));
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
  document.getElementById('grafica-tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')];
    const actual = tabs.indexOf(document.activeElement);
    if (actual < 0) return;
    e.preventDefault();
    const siguiente = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (actual + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    E.graficaActiva = tabs[siguiente].dataset.grafica;
    mostrarGraficaActiva();
    tabs[siguiente].focus();
  });
  document.querySelectorAll('[data-confirmar-salida]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!debeConfirmarNavegacion({ valor: E.captura.pesoStr, enviado: false })) return;
      e.preventDefault();
      confirmarPopup('Hay un peso sin guardar. ¿Quieres salir?').then((ok) => { if (ok) location.href = a.href; });
    });
  });
  document.getElementById('historial-pesos').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar-peso]');
    const borrar = e.target.closest('[data-borrar-peso]');
    if (editar) editarRegistroPeso(editar.dataset.editarPeso);
    else if (borrar) borrarRegistroPeso(borrar.dataset.borrarPeso);
  });
  document.getElementById('btn-ver-historial').addEventListener('click', (e) => {
    const cont = document.getElementById('historial-pesos');
    const abierto = cont.classList.toggle('oculto') === false;
    e.target.textContent = abierto ? 'Ocultar tus últimos registros' : '¿Te equivocaste al capturar? Ver tus últimos registros';
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
    navigator.serviceWorker.register('../sw.js').then((r) => {
      registroSW = r;
      r.addEventListener('updatefound', () => observarInstalacion(r.installing));
      observarInstalacion(r.installing);
      releerMetadataActualizacion();
      return r.update();
    }).catch(() => {});
  });
  // Ver comentario igual en js/ui.js (launcher) -- autorefresca cuando toma
  // control un service worker nuevo, pero no si hay un campo con texto sin
  // mandar: espera a que la app pase a segundo plano para no borrarlo.
  let recargando = false;
  let recargaDiferida = false;
  function intentarRecargar() {
    if (recargando) return;
    const activo = document.activeElement;
    const escribiendo = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA') && activo.value;
    const decision = actualizacion.decidirRecargaActualizacion({
      capturaPendiente: actualizacion.hayCapturaPesoPendiente(E.captura),
      formularioPendiente: ajustesPendientes.size > 0,
      escribiendoActivo: Boolean(escribiendo), recargaDiferida,
    });
    recargaDiferida = decision.diferir;
    if (!decision.recargar) return;
    recargando = true;
    releerMetadataActualizacion().finally(() => location.reload());
  }
  intentarRecargaDiferida = function () {
    if (recargaDiferida && !actualizacion.hayCapturaPesoPendiente(E.captura) && ajustesPendientes.size === 0) intentarRecargar();
  };
  document.addEventListener('input', intentarRecargaDiferida);
  navigator.serviceWorker.addEventListener('controllerchange', intentarRecargar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) intentarRecargaDiferida(); });
  window.addEventListener('pagehide', intentarRecargaDiferida);
}
