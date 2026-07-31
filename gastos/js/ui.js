// Estado, render y eventos. El único archivo que toca el DOM.

import * as almacen from './almacen.js';
import * as calculos from './calculos.js';
import * as graficas from './graficas.js';
import { generarInsights } from './insights.js';
import { generarId, validarMovimiento, mesActualStr, hoyISO, mesDeFecha, METODOS, crearDatosVacios, normalizarDatos } from './modelo.js';
import { descifrar, cifrarConClave, crearClaveSesion, esPaqueteCifrado } from '../../shared/cifrado.js';
import { getUsuario, cerrarSesion, exigirSesion } from '../../shared/sesion.js';

const E = {
  clave: null, // CryptoKey de la sesión (evita rederivar PBKDF2 en cada guardado)
  saltCifrado: null,
  passwordModo: 'entrar',
  datos: null,
  mes: mesActualStr(),
  vista: 'capturar',
  tema: localStorage.getItem('tema') || 'auto',
  captura: { tipo: 'gasto', montoStr: '', categoria: null, metodo: 'debito', fecha: hoyISO(), nota: '' },
  filtroMov: { texto: '', categoria: '' },
  deshacerTimeout: null,
};

const ICONOS_INSIGHT = {
  fuga: '🚨', hormiga: '🐜', fijos_variables: '📌', suscripciones_anual: '📺',
  dia_caro: '📅', racha: '🎯', proyeccion_riesgo: '⚠️', presupuesto: '💸', recurrente_faltante: '⏰',
};

// ---------- utilidades ----------

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n);
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function categoriaObj(id) {
  return E.datos.categorias.find((c) => c.id === id);
}
function categoriaNombre(id) {
  return categoriaObj(id)?.nombre || id;
}
function categoriaColor(id) {
  return categoriaObj(id)?.color || '#999999';
}
function metodoLabel(m) {
  return { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia' }[m] || m;
}
function iconoInsight(tipo) {
  return ICONOS_INSIGHT[tipo] || '💡';
}
function formatoFechaLarga(fecha) {
  const d = new Date(`${fecha}T00:00:00`);
  const texto = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatoFechaCorta(fecha) {
  const d = new Date(`${fecha}T00:00:00`);
  const texto = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(d);
  const capitalizada = texto.charAt(0).toUpperCase() + texto.slice(1);
  return fecha === hoyISO() ? `Hoy · ${capitalizada}` : capitalizada;
}

let toastTimeout;
function toast(msg, esError = false) {
  clearTimeout(toastTimeout);
  let el = document.getElementById('toast-simple');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-simple';
    el.className = 'deshacer-toast';
    document.body.appendChild(el);
  }
  el.style.background = esError ? 'var(--peligro)' : 'var(--texto)';
  el.style.color = esError ? '#fff' : 'var(--fondo)';
  el.innerHTML = `<span>${escapeHTML(msg)}</span>`;
  el.classList.remove('oculto');
  toastTimeout = setTimeout(() => el.classList.add('oculto'), 2200);
}

function abrirModal(html, onMount) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-fondo" id="modal-fondo"><div class="modal-caja">
    <div class="modal-cerrar"><div class="barra"></div></div>
    ${html}
  </div></div>`;
  document.getElementById('modal-fondo').addEventListener('click', (e) => {
    if (e.target.id === 'modal-fondo') cerrarModal();
  });
  if (onMount) onMount(root);
}
function cerrarModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ---------- persistencia ----------

async function persistir() {
  try {
    const r = await almacen.guardar(getUsuario(), E.datos, E.clave, E.saltCifrado);
    if (!r.sincronizado) toast('Guardado en este dispositivo — sincronizando...', true);
  } catch (e) {
    console.error(e);
    toast('No se pudo guardar.', true);
  }
}

// No espera a persistir() -- guardar cifra + sube al servidor y eso tarda;
// la UI ya reflejó el cambio antes de llamar esto (ver guardarMovimientoCaptura).
function persistirEnSegundoPlano() {
  persistir();
}

async function guardarYRefrescar() {
  await persistir();
  render();
}

// ---------- candado (contraseña de cifrado) ----------

function mostrarPantallaPassword(modo) {
  E.passwordModo = modo;
  document.getElementById('pantalla-password').classList.remove('oculto');
  document.getElementById('password-confirmar-envoltura').classList.toggle('oculto', modo !== 'crear');
  document.getElementById('password-advertencia').classList.toggle('oculto', modo !== 'crear');
  document.getElementById('password-titulo').textContent = modo === 'crear' ? 'Crea una contraseña' : 'Ingresa tu contraseña';
  document.getElementById('password-texto').textContent =
    modo === 'crear'
      ? 'Se va a usar para cifrar tus datos. Sin ella, nadie —ni tú— puede recuperarlos.'
      : 'Tus datos están cifrados. Escribe tu contraseña para abrirlos.';
  document.getElementById('password-error').classList.add('oculto');
  document.getElementById('password-input').value = '';
  document.getElementById('password-confirmar').value = '';
  document.getElementById('password-input').focus();
}

function mostrarErrorPassword(msg) {
  const el = document.getElementById('password-error');
  el.textContent = msg;
  el.classList.remove('oculto');
}

function finalizarConexion(pendienteDeSincronizar) {
  document.getElementById('pantalla-password').classList.add('oculto');
  document.getElementById('app').classList.remove('oculto');
  if (pendienteDeSincronizar) toast('Tenías cambios sin sincronizar — se están subiendo.', true);
  render();
  almacen.iniciarSincronizacionAutomatica(getUsuario(), () => toast('Sincronizado ✓'));
}

async function confirmarPassword() {
  const pass = document.getElementById('password-input').value;
  if (!pass || pass.length < 4) {
    mostrarErrorPassword('La contraseña debe tener al menos 4 caracteres.');
    return;
  }
  if (E.passwordModo === 'crear') {
    const confirmacion = document.getElementById('password-confirmar').value;
    if (pass !== confirmacion) {
      mostrarErrorPassword('Las contraseñas no coinciden.');
      return;
    }
    const { clave, saltB64 } = await crearClaveSesion(pass);
    E.clave = clave;
    E.saltCifrado = saltB64;
    E.datos = crearDatosVacios();
    await persistir();
    finalizarConexion(false);
  } else {
    try {
      const { datos, pendienteDeSincronizar, clave, saltB64 } = await almacen.cargar(getUsuario(), pass);
      E.clave = clave;
      E.saltCifrado = saltB64;
      E.datos = datos;
      const nuevos = calculos.generarMovimientosRecurrentes(E.datos.recurrentes, E.datos.movimientos, mesActualStr(), generarId);
      if (nuevos.length) {
        E.datos.movimientos.push(...nuevos);
        await persistir();
      }
      finalizarConexion(pendienteDeSincronizar);
    } catch (e) {
      mostrarErrorPassword(e.message || 'Contraseña incorrecta');
    }
  }
}

// ---------- navegación de vistas y mes ----------

function cambiarVista(nombre) {
  E.vista = nombre;
  document.querySelectorAll('.vista').forEach((v) => v.classList.remove('activa'));
  document.getElementById(`vista-${nombre}`).classList.add('activa');
  document.querySelectorAll('.nav-inferior button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === nombre));
  render();
}

function cambiarMes(delta) {
  const [y, m] = E.mes.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  E.mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  render();
}

function renderMesLabel() {
  const [y, m] = E.mes.split('-').map(Number);
  const texto = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  document.getElementById('mes-label').textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
}

function aplicarTema() {
  if (E.tema === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', E.tema);
}

function render() {
  if (!E.datos) return;
  renderMesLabel();
  if (E.vista === 'capturar') renderCapturar();
  else if (E.vista === 'movimientos') renderMovimientos();
  else if (E.vista === 'tablero') renderTablero();
  else if (E.vista === 'ajustes') renderAjustes();
}

// ---------- vista: capturar ----------

function tecla(t) {
  if (t === 'borrar') {
    E.captura.montoStr = E.captura.montoStr.slice(0, -1);
  } else if (t === '.') {
    if (!E.captura.montoStr.includes('.')) E.captura.montoStr += '.';
  } else {
    if (E.captura.montoStr.includes('.')) {
      const dec = E.captura.montoStr.split('.')[1];
      if (dec.length >= 2) return;
    }
    if (E.captura.montoStr.replace('.', '').length >= 8) return;
    E.captura.montoStr += t;
  }
  document.getElementById('captura-monto').textContent = '$' + (E.captura.montoStr || '0');
}

function renderCapturar() {
  document.getElementById('captura-monto').textContent = '$' + (E.captura.montoStr || '0');
  document.querySelectorAll('.captura-tipo button').forEach((b) => b.classList.toggle('activo', b.dataset.tipo === E.captura.tipo));

  const cats = E.datos.categorias.filter((c) => c.tipo === E.captura.tipo && c.activo !== false);
  if (!cats.some((c) => c.id === E.captura.categoria)) E.captura.categoria = cats[0]?.id || null;
  document.getElementById('categorias-grid').innerHTML = cats
    .map((c) => `<button class="categoria-btn ${c.id === E.captura.categoria ? 'activa' : ''}" data-id="${c.id}">
      <span class="emoji">${c.icono}</span>${escapeHTML(c.nombre)}
    </button>`)
    .join('');

  const metodosActivos = E.datos.config.metodosActivos || {};
  const metodosVisibles = METODOS.filter((m) => metodosActivos[m] !== false);
  if (!metodosVisibles.includes(E.captura.metodo)) E.captura.metodo = metodosVisibles[0] || METODOS[0];
  document.querySelectorAll('#metodo-grupo button[data-metodo]').forEach((b) => {
    b.classList.toggle('oculto', metodosActivos[b.dataset.metodo] === false);
    b.classList.toggle('activo', b.dataset.metodo === E.captura.metodo);
  });
  document.getElementById('captura-fecha').value = E.captura.fecha;
  document.getElementById('captura-fecha-texto').textContent = formatoFechaCorta(E.captura.fecha);
  document.getElementById('captura-nota').value = E.captura.nota;
}

async function guardarMovimientoCaptura() {
  const monto = parseFloat(E.captura.montoStr || '0');
  try {
    const mov = validarMovimiento({
      fecha: E.captura.fecha,
      tipo: E.captura.tipo,
      monto,
      categoria: E.captura.categoria,
      metodo: E.captura.metodo,
      nota: E.captura.nota,
    });
    E.datos.movimientos.push(mov);
    E.captura.montoStr = '';
    E.captura.nota = '';
    toast('Guardado ✓');
    renderCapturar();
    persistirEnSegundoPlano();
  } catch (e) {
    toast(e.message, true);
  }
}

function wireCaptura() {
  document.querySelectorAll('.captura-tipo button').forEach((b) => {
    b.addEventListener('click', () => {
      E.captura.tipo = b.dataset.tipo;
      E.captura.categoria = null;
      renderCapturar();
    });
  });
  document.getElementById('teclado').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tecla]');
    if (btn) tecla(btn.dataset.tecla);
  });
  document.getElementById('categorias-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.categoria-btn');
    if (!btn) return;
    E.captura.categoria = btn.dataset.id;
    renderCapturar();
  });
  document.getElementById('metodo-grupo').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-metodo]');
    if (!btn) return;
    E.captura.metodo = btn.dataset.metodo;
    renderCapturar();
  });
  document.getElementById('captura-fecha').addEventListener('change', (e) => {
    E.captura.fecha = e.target.value;
    renderCapturar();
  });
  document.getElementById('captura-nota').addEventListener('input', (e) => {
    E.captura.nota = e.target.value;
  });
  document.getElementById('btn-guardar-movimiento').addEventListener('click', guardarMovimientoCaptura);
}

// ---------- vista: movimientos ----------

function movimientosFiltrados() {
  const { texto, categoria } = E.filtroMov;
  const t = texto.trim().toLowerCase();
  return E.datos.movimientos
    .filter((m) => mesDeFecha(m.fecha) === E.mes)
    .filter((m) => !categoria || m.categoria === categoria)
    .filter((m) => !t || m.nota.toLowerCase().includes(t) || categoriaNombre(m.categoria).toLowerCase().includes(t))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado.localeCompare(a.creado));
}

function filaMovimientoHTML(m) {
  const cat = categoriaObj(m.categoria);
  return `<div class="movimiento-fila" data-id="${m.id}">
    <div class="emoji-cat" style="background:${(cat?.color || '#999999')}22;">${cat?.icono || '❓'}</div>
    <div class="detalle">
      <div class="nombre">${escapeHTML(cat?.nombre || m.categoria)}${m.nota ? ' · ' + escapeHTML(m.nota) : ''}</div>
      <div class="sub">${metodoLabel(m.metodo)}</div>
    </div>
    <div class="monto ${m.tipo}">${m.tipo === 'gasto' ? '-' : '+'}$${fmt(m.monto)}</div>
  </div>`;
}

function renderMovimientos() {
  const select = document.getElementById('mov-filtro-categoria');
  const valPrevio = select.value;
  select.innerHTML = '<option value="">Todas</option>' + E.datos.categorias.map((c) => `<option value="${c.id}">${c.icono} ${escapeHTML(c.nombre)}</option>`).join('');
  select.value = valPrevio;

  const movs = movimientosFiltrados();
  const totalGasto = calculos.aPesos(calculos.sumaCentavos(movs.filter((m) => m.tipo === 'gasto')));
  const totalIngreso = calculos.aPesos(calculos.sumaCentavos(movs.filter((m) => m.tipo === 'ingreso')));
  document.getElementById('mov-resumen').innerHTML = `<strong>${movs.length}</strong> movimientos · Gasto $${fmt(totalGasto)} · Ingreso $${fmt(totalIngreso)}`;

  const porDia = new Map();
  for (const m of movs) {
    if (!porDia.has(m.fecha)) porDia.set(m.fecha, []);
    porDia.get(m.fecha).push(m);
  }

  const contenedor = document.getElementById('lista-movimientos');
  if (!movs.length) {
    contenedor.innerHTML = '<p style="text-align:center;color:var(--texto-suave);padding:24px 0;">Sin movimientos este mes.</p>';
    return;
  }
  contenedor.innerHTML = [...porDia.entries()]
    .map(([fecha, lista]) => {
      const totalDiaCent = lista.reduce((acc, m) => acc + (m.tipo === 'gasto' ? -1 : 1) * calculos.aCentavos(m.monto), 0);
      const signo = totalDiaCent < 0 ? '-' : '';
      return `<div class="grupo-dia">
        <div class="grupo-dia-header"><span>${formatoFechaLarga(fecha)}</span><span>${signo}$${fmt(Math.abs(totalDiaCent) / 100)}</span></div>
        ${lista.map(filaMovimientoHTML).join('')}
      </div>`;
    })
    .join('');
}

function wireMovimientos() {
  document.getElementById('mov-buscar').addEventListener('input', (e) => {
    E.filtroMov.texto = e.target.value;
    renderMovimientos();
  });
  document.getElementById('mov-filtro-categoria').addEventListener('change', (e) => {
    E.filtroMov.categoria = e.target.value;
    renderMovimientos();
  });
  document.getElementById('lista-movimientos').addEventListener('click', (e) => {
    const fila = e.target.closest('.movimiento-fila');
    if (fila) abrirEditarMovimiento(fila.dataset.id);
  });
}

function abrirEditarMovimiento(id) {
  const m = E.datos.movimientos.find((x) => x.id === id);
  if (!m) return;
  const cats = E.datos.categorias.filter((c) => c.tipo === m.tipo);
  const html = `
    <h2>Editar movimiento</h2>
    <div class="campo"><label>Monto</label><input type="number" step="0.01" min="0.01" id="edit-monto" value="${m.monto}"></div>
    <div class="campo"><label>Categoría</label><select id="edit-categoria">${cats.map((c) => `<option value="${c.id}" ${c.id === m.categoria ? 'selected' : ''}>${c.icono} ${escapeHTML(c.nombre)}</option>`).join('')}</select></div>
    <div class="campo"><label>Método</label><select id="edit-metodo">${METODOS.map((mm) => `<option value="${mm}" ${mm === m.metodo ? 'selected' : ''}>${metodoLabel(mm)}</option>`).join('')}</select></div>
    <div class="campo"><label>Fecha</label><input type="date" id="edit-fecha" value="${m.fecha}"></div>
    <div class="campo"><label>Nota</label><input type="text" id="edit-nota" value="${escapeHTML(m.nota)}"></div>
    <button class="btn-primario" id="btn-guardar-edicion">Guardar cambios</button>
    <button class="btn-secundario btn-peligro" id="btn-eliminar-mov" style="margin-top:8px;">Eliminar</button>
  `;
  abrirModal(html, () => {
    document.getElementById('btn-guardar-edicion').addEventListener('click', async () => {
      try {
        const actualizado = validarMovimiento({
          ...m,
          monto: parseFloat(document.getElementById('edit-monto').value),
          categoria: document.getElementById('edit-categoria').value,
          metodo: document.getElementById('edit-metodo').value,
          fecha: document.getElementById('edit-fecha').value,
          nota: document.getElementById('edit-nota').value,
        });
        const idx = E.datos.movimientos.findIndex((x) => x.id === id);
        E.datos.movimientos[idx] = actualizado;
        await guardarYRefrescar();
        cerrarModal();
      } catch (e) {
        toast(e.message, true);
      }
    });
    document.getElementById('btn-eliminar-mov').addEventListener('click', async () => {
      cerrarModal();
      await eliminarMovimiento(id);
    });
  });
}

async function eliminarMovimiento(id) {
  const idx = E.datos.movimientos.findIndex((m) => m.id === id);
  if (idx === -1) return;
  const [removido] = E.datos.movimientos.splice(idx, 1);
  await guardarYRefrescar();
  mostrarDeshacer(removido);
}

function mostrarDeshacer(movimiento) {
  clearTimeout(E.deshacerTimeout);
  let el = document.getElementById('deshacer-toast');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'deshacer-toast';
  el.className = 'deshacer-toast';
  el.innerHTML = `<span>Movimiento eliminado</span><button id="btn-deshacer">Deshacer</button>`;
  document.body.appendChild(el);
  document.getElementById('btn-deshacer').addEventListener('click', async () => {
    E.datos.movimientos.push(movimiento);
    el.remove();
    await guardarYRefrescar();
  });
  E.deshacerTimeout = setTimeout(() => el.remove(), 5000);
}

// ---------- vista: tablero ----------

function serieAcumuladaDelMes(movimientos, mesStr) {
  const [y, m] = mesStr.split('-').map(Number);
  const dias = calculos.diasEnMes(y, m);
  const porDia = new Array(dias + 1).fill(0);
  for (const mv of calculos.filtrarPorMes(movimientos, mesStr, 'gasto')) {
    const d = Number(mv.fecha.slice(8, 10));
    porDia[d] += calculos.aCentavos(mv.monto);
  }
  let acc = 0;
  const serie = [];
  for (let d = 1; d <= dias; d++) {
    acc += porDia[d];
    serie.push({ dia: d, total: acc / 100 });
  }
  return serie;
}

function kpiMoneda(label, valor, sub, clase) {
  return `<div class="kpi"><div class="label">${label}</div><div class="valor ${clase || ''}">$${fmt(valor)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}
function kpiTexto(label, texto, clase) {
  return `<div class="kpi"><div class="label">${label}</div><div class="valor ${clase || ''}">${texto}</div></div>`;
}

function renderTablero() {
  const { movimientos, presupuestos, recurrentes } = E.datos;
  const mes = E.mes;
  const hoy = hoyISO();

  const gastado = calculos.totalPorTipo(movimientos, 'gasto', mes);
  const ingresos = calculos.totalPorTipo(movimientos, 'ingreso', mes);
  const netoMes = ingresos - gastado;
  const proyeccion = calculos.proyeccionCierre(movimientos, mes, hoy);
  const promDiario = calculos.promedioDiario(movimientos, mes, hoy);
  const mesAnterior = calculos.ultimosMeses(mes, 2)[0];
  const gastadoAnterior = calculos.totalPorTipo(movimientos, 'gasto', mesAnterior);
  const variacion = gastadoAnterior > 0 ? ((gastado - gastadoAnterior) / gastadoAnterior) * 100 : null;

  document.getElementById('kpis').innerHTML =
    kpiMoneda('Gastado este mes', gastado, null, 'negativo') +
    kpiMoneda('Ingresos', ingresos, null, 'positivo') +
    kpiMoneda('Neto', netoMes, null, netoMes >= 0 ? 'positivo' : 'negativo') +
    kpiMoneda('Proyección de cierre', proyeccion, `$${fmt(promDiario)}/día en promedio`) +
    (variacion !== null ? kpiTexto('Vs. mes anterior', `${variacion >= 0 ? '+' : ''}${variacion.toFixed(0)}%`, variacion > 0 ? 'negativo' : 'positivo') : '');

  const porCat = calculos.totalPorCategoria(movimientos, mes, 'gasto');
  const datosD = porCat.map((c) => ({ label: categoriaNombre(c.categoria), value: c.total, color: categoriaColor(c.categoria) }));
  document.getElementById('grafica-dona').innerHTML = graficas.svgDona(datosD);
  document.getElementById('leyenda-dona').innerHTML = datosD
    .slice(0, 8)
    .map((d) => `<div class="leyenda-item"><span class="leyenda-punto" style="background:${d.color}"></span>${escapeHTML(d.label)} · $${fmt(d.value)}</div>`)
    .join('');

  const b12 = calculos.totalesPorMes(movimientos, 'gasto', mes, 12);
  document.getElementById('grafica-barras12').innerHTML = graficas.svgBarras12Meses(b12);

  const serieActual = serieAcumuladaDelMes(movimientos, mes);
  const serieAnterior = serieAcumuladaDelMes(movimientos, mesAnterior);
  document.getElementById('grafica-linea').innerHTML = graficas.svgLineaAcumulada(serieActual, serieAnterior);

  const top8 = porCat.slice(0, 8).map((c) => ({ label: categoriaNombre(c.categoria), value: c.total, color: categoriaColor(c.categoria) }));
  document.getElementById('grafica-barrash').innerHTML = graficas.svgBarrasHorizontales(top8);

  const top5 = calculos.topGastos(movimientos, mes, 5);
  document.getElementById('lista-top-gastos').innerHTML = top5.length
    ? top5.map(filaMovimientoHTML).join('')
    : '<p style="color:var(--texto-suave);font-size:0.82rem;">Sin gastos este mes.</p>';

  const estados = calculos.estadoPresupuestos(movimientos, presupuestos, mes);
  document.getElementById('lista-presupuestos').innerHTML = estados.length
    ? estados
        .map(
          (p) => `<div class="presupuesto-fila">
        <div class="cabeza"><span>${escapeHTML(categoriaNombre(p.categoria))}</span><span>$${fmt(p.gastado)} / $${fmt(p.tope)}</span></div>
        <div class="presupuesto-barra"><div class="relleno ${p.nivel !== 'ok' ? p.nivel : ''}" style="width:${Math.min(p.pct, 1) * 100}%"></div></div>
      </div>`
        )
        .join('')
    : '<p style="color:var(--texto-suave);font-size:0.82rem;">Sin presupuestos configurados este mes. Agrégalos en Ajustes.</p>';

  const insights = generarInsights(E.datos, mes, hoy);
  document.getElementById('lista-insights').innerHTML = insights.length
    ? insights.map((i) => `<div class="insight ${i.nivel}"><span>${iconoInsight(i.tipo)}</span><span>${escapeHTML(i.texto)}</span></div>`).join('')
    : '<p style="color:var(--texto-suave);font-size:0.82rem;">Aún no hay suficientes datos para insights este mes.</p>';

  const anio = Number(mes.slice(0, 4));
  const porDiaAnio = new Map();
  for (const mv of movimientos) {
    if (mv.tipo !== 'gasto' || Number(mv.fecha.slice(0, 4)) !== anio) continue;
    porDiaAnio.set(mv.fecha, (porDiaAnio.get(mv.fecha) || 0) + mv.monto);
  }
  document.getElementById('grafica-calor').innerHTML = graficas.svgMapaCalor(porDiaAnio, anio);
}

// ---------- vista: ajustes ----------

function renderAjustes() {
  document.getElementById('ajustes-usuario').textContent = getUsuario();
  document.getElementById('lista-categorias').innerHTML = E.datos.categorias
    .map(
      (c) => `<div class="lista-item ${c.activo === false ? 'inactiva' : ''}">
      <span>${c.icono} ${escapeHTML(c.nombre)} <span class="badge">${c.tipo}</span></span>
      <span>
        <label class="switch" title="${c.activo === false ? 'Desactivada' : 'Activa'}">
          <input type="checkbox" data-activar-cat="${c.id}" ${c.activo === false ? '' : 'checked'}>
          <span class="switch-riel"></span>
        </label>
        <button class="icono" data-editar-cat="${c.id}">✏️</button><button class="icono" data-borrar-cat="${c.id}">🗑️</button>
      </span>
    </div>`
    )
    .join('');

  const metodosActivos = E.datos.config.metodosActivos || {};
  document.getElementById('lista-metodos').innerHTML = METODOS.map(
    (m) => `<div class="lista-item">
      <span>${metodoLabel(m)}</span>
      <label class="switch" title="${metodosActivos[m] === false ? 'Desactivado' : 'Activo'}">
        <input type="checkbox" data-activar-metodo="${m}" ${metodosActivos[m] === false ? '' : 'checked'}>
        <span class="switch-riel"></span>
      </label>
    </div>`
  ).join('');

  const catsGasto = E.datos.categorias.filter((c) => c.tipo === 'gasto');
  const topes = E.datos.presupuestos[E.mes] || {};
  document.getElementById('ajustes-presupuestos').innerHTML = catsGasto
    .map(
      (c) => `<div class="campo">
      <label>${c.icono} ${escapeHTML(c.nombre)}</label>
      <input type="number" min="0" step="50" data-presupuesto-cat="${c.id}" value="${topes[c.id] || ''}" placeholder="Sin tope">
    </div>`
    )
    .join('');

  document.getElementById('lista-recurrentes').innerHTML = E.datos.recurrentes.length
    ? E.datos.recurrentes
        .map(
          (r) => `<div class="lista-item">
        <span>${escapeHTML(r.nombre)} · $${fmt(r.monto)} · día ${r.dia} ${!r.activo ? '<span class="badge">pausado</span>' : ''}</span>
        <span><button class="icono" data-editar-rec="${r.id}">✏️</button><button class="icono" data-borrar-rec="${r.id}">🗑️</button></span>
      </div>`
        )
        .join('')
    : '<p style="color:var(--texto-suave);font-size:0.82rem;">Sin recurrentes configurados.</p>';

  document.getElementById('ajustes-info').textContent = `${E.datos.movimientos.length} movimientos registrados · ${E.datos.categorias.length} categorías.`;
}

function abrirModalCategoria(id) {
  const existente = id ? categoriaObj(id) : null;
  const html = `
    <h2>${existente ? 'Editar' : 'Nueva'} categoría</h2>
    <div class="campo"><label>Nombre</label><input id="cat-nombre" value="${escapeHTML(existente?.nombre || '')}"></div>
    <div class="fila">
      <div class="campo"><label>Ícono (emoji)</label><input id="cat-icono" value="${existente?.icono || '🏷️'}"></div>
      <div class="campo"><label>Color</label><input type="color" id="cat-color" value="${existente?.color || '#4c5fd5'}"></div>
    </div>
    <div class="campo"><label>Tipo</label>
      <select id="cat-tipo">
        <option value="gasto" ${!existente || existente.tipo === 'gasto' ? 'selected' : ''}>Gasto</option>
        <option value="ingreso" ${existente?.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
      </select>
    </div>
    <button class="btn-primario" id="btn-guardar-cat">Guardar</button>
  `;
  abrirModal(html, () => {
    document.getElementById('btn-guardar-cat').addEventListener('click', async () => {
      const nombre = document.getElementById('cat-nombre').value.trim();
      if (!nombre) {
        toast('El nombre es obligatorio', true);
        return;
      }
      const icono = document.getElementById('cat-icono').value.trim() || '🏷️';
      const color = document.getElementById('cat-color').value;
      const tipo = document.getElementById('cat-tipo').value;
      if (existente) Object.assign(existente, { nombre, icono, color, tipo });
      else E.datos.categorias.push({ id: generarId('cat'), nombre, icono, color, tipo });
      await guardarYRefrescar();
      cerrarModal();
    });
  });
}

async function borrarCategoria(id) {
  const enUso = E.datos.movimientos.some((m) => m.categoria === id) || E.datos.recurrentes.some((r) => r.categoria === id);
  if (enUso) {
    toast('No se puede borrar: hay movimientos con esta categoría', true);
    return;
  }
  if (!confirm('¿Borrar esta categoría?')) return;
  E.datos.categorias = E.datos.categorias.filter((c) => c.id !== id);
  await guardarYRefrescar();
}

function abrirModalRecurrente(id) {
  const existente = id ? E.datos.recurrentes.find((r) => r.id === id) : null;
  const cats = E.datos.categorias.filter((c) => c.tipo === 'gasto');
  const html = `
    <h2>${existente ? 'Editar' : 'Nuevo'} recurrente</h2>
    <div class="campo"><label>Nombre</label><input id="rec-nombre" value="${escapeHTML(existente?.nombre || '')}"></div>
    <div class="fila">
      <div class="campo"><label>Monto</label><input type="number" step="0.01" min="0.01" id="rec-monto" value="${existente?.monto ?? ''}"></div>
      <div class="campo"><label>Día del mes</label><input type="number" min="1" max="31" id="rec-dia" value="${existente?.dia ?? 1}"></div>
    </div>
    <div class="campo"><label>Categoría</label><select id="rec-categoria">${cats.map((c) => `<option value="${c.id}" ${existente?.categoria === c.id ? 'selected' : ''}>${c.icono} ${escapeHTML(c.nombre)}</option>`).join('')}</select></div>
    <div class="campo"><label><input type="checkbox" id="rec-activo" ${!existente || existente.activo ? 'checked' : ''}> Activo</label></div>
    <button class="btn-primario" id="btn-guardar-rec">Guardar</button>
    ${existente ? '<button class="btn-secundario btn-peligro" id="btn-borrar-rec" style="margin-top:8px;">Eliminar</button>' : ''}
  `;
  abrirModal(html, () => {
    document.getElementById('btn-guardar-rec').addEventListener('click', async () => {
      const nombre = document.getElementById('rec-nombre').value.trim();
      const monto = parseFloat(document.getElementById('rec-monto').value);
      const dia = Math.min(31, Math.max(1, parseInt(document.getElementById('rec-dia').value, 10) || 1));
      const categoria = document.getElementById('rec-categoria').value;
      const activo = document.getElementById('rec-activo').checked;
      if (!nombre || !monto || monto <= 0) {
        toast('Revisa nombre y monto', true);
        return;
      }
      if (existente) Object.assign(existente, { nombre, monto, dia, categoria, activo });
      else E.datos.recurrentes.push({ id: generarId('rec'), nombre, monto, dia, categoria, metodo: 'debito', activo });
      await guardarYRefrescar();
      cerrarModal();
    });
    const btnBorrar = document.getElementById('btn-borrar-rec');
    if (btnBorrar) {
      btnBorrar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este recurrente?')) return;
        E.datos.recurrentes = E.datos.recurrentes.filter((r) => r.id !== id);
        await guardarYRefrescar();
        cerrarModal();
      });
    }
  });
}

function wireAjustes() {
  document.getElementById('btn-nueva-categoria').addEventListener('click', () => abrirModalCategoria(null));
  document.getElementById('lista-categorias').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar-cat]');
    const borrar = e.target.closest('[data-borrar-cat]');
    if (editar) abrirModalCategoria(editar.dataset.editarCat);
    if (borrar) borrarCategoria(borrar.dataset.borrarCat);
  });
  document.getElementById('lista-categorias').addEventListener('change', async (e) => {
    const chk = e.target.closest('[data-activar-cat]');
    if (!chk) return;
    const cat = categoriaObj(chk.dataset.activarCat);
    if (cat) cat.activo = chk.checked;
    await guardarYRefrescar();
  });
  document.getElementById('lista-metodos').addEventListener('change', async (e) => {
    const chk = e.target.closest('[data-activar-metodo]');
    if (!chk) return;
    if (!E.datos.config.metodosActivos) E.datos.config.metodosActivos = {};
    E.datos.config.metodosActivos[chk.dataset.activarMetodo] = chk.checked;
    await guardarYRefrescar();
  });
  document.getElementById('ajustes-presupuestos').addEventListener('change', async (e) => {
    const catId = e.target.dataset.presupuestoCat;
    if (!catId) return;
    const val = parseFloat(e.target.value);
    if (!E.datos.presupuestos[E.mes]) E.datos.presupuestos[E.mes] = {};
    if (!val || val <= 0) delete E.datos.presupuestos[E.mes][catId];
    else E.datos.presupuestos[E.mes][catId] = val;
    await persistir();
  });
  document.getElementById('btn-nuevo-recurrente').addEventListener('click', () => abrirModalRecurrente(null));
  document.getElementById('lista-recurrentes').addEventListener('click', async (e) => {
    const editar = e.target.closest('[data-editar-rec]');
    const borrar = e.target.closest('[data-borrar-rec]');
    if (editar) abrirModalRecurrente(editar.dataset.editarRec);
    if (borrar) {
      if (!confirm('¿Eliminar este recurrente?')) return;
      E.datos.recurrentes = E.datos.recurrentes.filter((r) => r.id !== borrar.dataset.borrarRec);
      await guardarYRefrescar();
    }
  });
  document.getElementById('btn-exportar').addEventListener('click', async () => {
    const paquete = await cifrarConClave(E.datos, E.clave, E.saltCifrado);
    almacen.exportarPaquete(paquete);
  });
  document.getElementById('btn-importar').addEventListener('click', () => document.getElementById('input-importar').click());
  document.getElementById('input-importar').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const paquete = await almacen.leerArchivoSubido(file);
      let datos;
      if (esPaqueteCifrado(paquete)) {
        const passImport = prompt('Contraseña del archivo que estás importando:');
        if (passImport === null) return;
        datos = await descifrar(paquete, passImport);
      } else {
        datos = paquete; // respaldo de una versión anterior sin cifrar
      }
      if (!confirm('Esto reemplaza todos los datos actuales con el archivo importado. ¿Continuar?')) return;
      E.datos = normalizarDatos(datos);
      await guardarYRefrescar();
      toast('Importado ✓');
    } catch (err) {
      toast(err.message || 'Archivo inválido', true);
    }
  });
  document.getElementById('btn-cambiar-password').addEventListener('click', abrirModalCambiarPassword);
  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    cerrarSesion();
    location.href = '../index.html';
  });
  document.getElementById('btn-borrar-todo').addEventListener('click', async () => {
    const confirmacion = prompt('Esto borra TODOS tus movimientos, categorías y presupuestos (quedan los respaldos automáticos). Escribe BORRAR para confirmar:');
    if (confirmacion !== 'BORRAR') return;
    E.datos = crearDatosVacios();
    await guardarYRefrescar();
    toast('Todo borrado');
  });
}

function abrirModalCambiarPassword() {
  const html = `
    <h2>Cambiar contraseña</h2>
    <div class="campo"><label>Nueva contraseña</label><input type="password" id="nueva-pass" autocomplete="off"></div>
    <div class="campo"><label>Confirma la nueva contraseña</label><input type="password" id="nueva-pass-confirmar" autocomplete="off"></div>
    <button class="btn-primario" id="btn-guardar-nueva-pass">Guardar nueva contraseña</button>
  `;
  abrirModal(html, () => {
    document.getElementById('btn-guardar-nueva-pass').addEventListener('click', async () => {
      const p1 = document.getElementById('nueva-pass').value;
      const p2 = document.getElementById('nueva-pass-confirmar').value;
      if (!p1 || p1.length < 4) {
        toast('La contraseña debe tener al menos 4 caracteres', true);
        return;
      }
      if (p1 !== p2) {
        toast('Las contraseñas no coinciden', true);
        return;
      }
      const { clave, saltB64 } = await crearClaveSesion(p1);
      E.clave = clave;
      E.saltCifrado = saltB64;
      await persistir();
      cerrarModal();
      toast('Contraseña actualizada ✓');
    });
  });
}

// ---------- arranque ----------

function wireGlobal() {
  document.getElementById('btn-password-confirmar').addEventListener('click', confirmarPassword);
  document.getElementById('password-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmarPassword();
  });
  document.getElementById('password-confirmar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmarPassword();
  });
  document.getElementById('mes-prev').addEventListener('click', () => cambiarMes(-1));
  document.getElementById('mes-next').addEventListener('click', () => cambiarMes(1));
  document.getElementById('btn-tema').addEventListener('click', () => {
    const orden = ['auto', 'light', 'dark'];
    E.tema = orden[(orden.indexOf(E.tema) + 1) % 3];
    localStorage.setItem('tema', E.tema);
    aplicarTema();
  });
  document.querySelectorAll('[data-vista]').forEach((b) => {
    b.addEventListener('click', () => cambiarVista(b.dataset.vista));
  });
}

async function init() {
  aplicarTema();
  wireGlobal();
  wireCaptura();
  wireMovimientos();
  wireAjustes();

  if (!exigirSesion('../index.html')) return;

  const yaExiste = await almacen.existeGastos(getUsuario()).catch(() => false);
  mostrarPantallaPassword(yaExiste ? 'entrar' : 'crear');
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(() => {}));
}
