// Estado, render y eventos. El único archivo que toca el DOM.
// El login (URL, usuario, PIN) ya pasó en el launcher (../index.html) antes
// de llegar aquí -- esta app solo confirma que hay sesión (exigirSesion) y
// usa getUsuario() para saber quién eres.

import * as cola from './cola.js';
import * as api from '../../shared/api.js';
import * as graficas from './graficas.js';
import { hoyISO, validarPeso, kgALb, lbAKg, aKg, formatoPesoDual } from './modelo.js';
import {
  pesosDeUsuario, ultimoPeso, racha, promedioMovil, avanceMeta, promedioSemanal,
} from './calculos.js';
import { getUsuario, exigirSesion, cerrarSesion } from '../../shared/sesion.js';

const E = {
  vista: 'capturar',
  datos: { usuarios: [], pesos: [] },
  sinConexion: false,
  captura: { fecha: hoyISO(), pesoStr: '' },
};

function fmt1(n) {
  return Number(n).toFixed(1);
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
  const ultimo = ultimoPeso(E.datos.pesos, getUsuario());
  document.getElementById('captura-ultimo').textContent = ultimo
    ? `Última captura: ${ultimo.fecha} — ${formatoPesoDual(ultimo.pesoKg)}`
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
    cola.sincronizar().then(() => { actualizarBadgeConexion(); });
  } catch (e) {
    toast(e.message, true);
  }
}

function wireCapturar() {
  document.getElementById('captura-peso-input').addEventListener('input', (e) => {
    E.captura.pesoStr = e.target.value;
    renderCapturar();
  });
  document.getElementById('captura-fecha').addEventListener('change', (e) => {
    E.captura.fecha = e.target.value;
  });
  document.getElementById('btn-guardar-captura').addEventListener('click', guardarCaptura);
}

// ---------- mi progreso ----------

function renderProgreso() {
  const serie = pesosDeUsuario(E.datos.pesos, getUsuario());
  const u = usuarioObj(getUsuario());
  const ultimo = serie.length ? serie[serie.length - 1].pesoKg : null;

  document.getElementById('progreso-racha').textContent = racha(E.datos.pesos, getUsuario());
  document.getElementById('progreso-ultimo').textContent = formatoPesoDual(ultimo);

  const avance = avanceMeta(u, ultimo);
  const elAvance = document.getElementById('progreso-avance');
  if (avance) {
    elAvance.innerHTML = `
      <div class="fila-avance">
        <span>${formatoPesoDual(avance.kgPerdidos)} perdidos</span>
        <span>${formatoPesoDual(avance.kgRestantes)} para tu meta</span>
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
}

// ---------- nuestro reto ----------

function renderReto() {
  const otro = otroUsuario();
  const serieYo = pesosDeUsuario(E.datos.pesos, getUsuario());
  const serieOtro = otro ? pesosDeUsuario(E.datos.pesos, otro) : [];

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
      <h3>${f.nombre === getUsuario() ? `${f.nombre} (tú)` : f.nombre}</h3>
      <div class="dato-grande valor-dual">${formatoPesoDual(f.ultimo)}</div>
      <div class="texto-suave">🔥 ${f.racha} día(s) de racha</div>
      ${f.avance ? `
        <div class="fila-avance small">
          <span>${formatoPesoDual(f.avance.kgPerdidos)} perdidos</span>
        </div>
        ${graficas.svgBarraAvance(f.avance.pctAvance, { width: 220 })}
      ` : '<div class="texto-suave">Sin meta definida</div>'}
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

function wireAjustes() {
  document.getElementById('btn-guardar-meta').addEventListener('click', guardarMetaAjustes);
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
}

// ---------- arranque ----------

function wireGlobal() {
  document.querySelectorAll('.nav-inferior button').forEach((b) => {
    b.addEventListener('click', () => cambiarVista(b.dataset.vista));
  });
}

async function init() {
  wireGlobal();
  wireCapturar();
  wireAjustes();

  if (!exigirSesion('../index.html')) return;

  await iniciarApp();
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(() => {}));
}
