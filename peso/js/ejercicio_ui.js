import * as api from '../../shared/api.js';
import { getUsuario } from '../../shared/sesion.js';
import { escapeHTML, escapeAtributo } from '../../shared/ui_seguridad.js';
import { acumularPuntoGps, ajustarCantidad, calcularDuracionHiit, calcularDuracionWr, crearDocumentoEjercicio, fasesWr, faseEnSegundo, ritmoSegPorKm, tiempoPorTipoWr, avisoWrAlEntrarAFase, avisoWrCuentaFinal, normalizarEjercicio, normalizarRutina, normalizarRutinaHiit, normalizarRutinaWr, normalizarSerie, siguientePasoRutina, sonidosEnSegundo, TIPOS_FASE_WR, BANCO_EJERCICIOS_HIIT } from './ejercicio_modelo.js';
import { guardarLocal, leerLocal, leerPendientes, mezclarDocumento, mutarLocal, sincronizarPendientes } from './ejercicio_almacen.js';
import {
  descansoPromedio, filtrarPeriodo, resumenHiit, resumenModalidades, seriesContables,
  volumenPorGrupo, frecuenciaPorGrupo, balancePatron, balanceSuperiorInferior, musculosAtrasados,
  mejorSerieHistorica, detectarEstancamiento, zonaRepeticiones, descansoRealVsProgramado,
  ratioTrabajoDescansoHiit, constancia, ultimaMarcaEjercicio, consejoRepeticiones, resumenWr,
} from './ejercicio_calculos.js';

const S = { datos: null, tab: 'entrenar', toast: () => {}, audio: null, intervalo: null, wake: null, hiit: null, wr: null, entrenamiento: null, descanso: null, rutinaSeleccionada: '', periodo: 'semana', sonidosEmitidos: new Set(), redLista: false };
const uid = () => crypto.randomUUID();
const iso = () => new Date().toISOString();

function guardar(mutador, tipo = 'editar', entidadId = 'documento') {
  const r = mutarLocal(getUsuario(), mutador, { tipo, entidadId });
  S.datos = r.datos;
  sincronizar().catch(() => {});
  S.toast('Guardado ✓');
  return r.datos;
}

async function sincronizar() {
  await sincronizarPendientes(getUsuario(), api, { alCambiar: actualizarSync });
  actualizarSync();
}

async function refrescarRemoto() {
  await sincronizar().catch(() => {});
  const r = await api.leerEjercicio();
  if (r.ok) { S.datos = mezclarDocumento(S.datos, r.datos); guardarLocal(getUsuario(), S.datos); if (document.getElementById('vista-ejercicio')?.classList.contains('activa')) renderModuloEjercicio(); }
}

function actualizarSync() {
  const el = document.getElementById('ejercicio-sync');
  if (el) el.textContent = leerPendientes(getUsuario()).length ? `${leerPendientes(getUsuario()).length} pendiente(s)` : 'Drive al día';
}

// Rellena por NOMBRE lo que falte del catálogo inicial (categorías y
// ejercicios), sin tocar rutinas/sesiones/hiits. A propósito NO depende de
// cuántos ejercicios ya haya -- un solo ejercicio de prueba bastaba para
// que una versión anterior de este arreglo (que solo actuaba con 0) se
// saltara por completo y nunca rellenara el resto. Exportada para que
// tanto el arranque del módulo como el botón "Buscar actualización" de
// Ajustes (peso/js/ui.js) puedan llamarla -- un usuario no debería
// necesitar un botón aparte para "arreglar mi catálogo".
export function rellenarCatalogoFaltante(datos) {
  const base = crearDocumentoEjercicio();
  const nombresCategoria = new Set((datos.categorias || []).map((c) => c.nombre));
  const faltanCategorias = base.categorias.filter((c) => !nombresCategoria.has(c.nombre));
  const nombresEjercicio = new Set((datos.ejercicios || []).map((e) => e.nombre));
  const faltanEjercicios = base.ejercicios.filter((e) => !nombresEjercicio.has(e.nombre));
  const nombresRutinaHiit = new Set((datos.rutinasHiit || []).map((r) => r.nombre));
  const faltanRutinasHiit = base.rutinasHiit.filter((r) => !nombresRutinaHiit.has(r.nombre));
  if (!faltanCategorias.length && !faltanEjercicios.length && !faltanRutinasHiit.length) return false;
  datos.categorias = [...(datos.categorias || []), ...faltanCategorias];
  datos.ejercicios = [...(datos.ejercicios || []), ...faltanEjercicios];
  datos.rutinasHiit = [...(datos.rutinasHiit || []), ...faltanRutinasHiit];
  return true;
}

export async function iniciarModuloEjercicio(toast) {
  S.toast = toast || S.toast;
  S.datos = leerLocal(getUsuario());
  if (!S.datos?.version) S.datos = crearDocumentoEjercicio();
  else if (rellenarCatalogoFaltante(S.datos)) guardarLocal(getUsuario(), S.datos);
  try { const r = await api.leerEjercicio(); if (r.ok) { S.datos = mezclarDocumento(S.datos, r.datos); guardarLocal(getUsuario(), S.datos); } } catch {}
  await sincronizar().catch(() => {});
  if (!S.redLista) { S.redLista = true; addEventListener('online', () => refrescarRemoto().catch(() => {})); document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescarRemoto().catch(() => {}); }); }
}

export function salirModuloEjercicio() { liberarWake(); }

// Usado por actualizacion_peso.js (vía app.js) para no recargar la página
// de golpe -- perdiendo la rutina o el HIIT en curso -- cuando llega una
// versión nueva del service worker mientras el usuario está entrenando.
export function hayEntrenamientoActivo() { return Boolean(S.entrenamiento || S.hiit || S.wr); }

export function renderModuloEjercicio() {
  if (!S.datos) S.datos = leerLocal(getUsuario());
  const raiz = document.getElementById('ejercicio-contenido');
  raiz.innerHTML = `<header class="ejercicio-hero"><div><span class="ejercicio-kicker">ENTRENAMIENTO</span><h2>Muévete. Registra. Mejora.</h2></div><small id="ejercicio-sync"></small></header><nav id="ejercicio-tabs" class="ejercicio-tabs" role="tablist"><button role="tab" data-etab="entrenar">Entrenar</button><button role="tab" data-etab="hiit">HIIT</button><button role="tab" data-etab="wr">W/R</button><button role="tab" data-etab="progreso">Progreso</button></nav><main id="ejercicio-panel"></main><dialog id="ejercicio-modal" class="ejercicio-modal"><div class="modal-ejercicio-contenido"><header><div><small id="modal-kicker">CONFIGURAR</small><h2 id="modal-titulo"></h2></div><button type="button" class="modal-cerrar" aria-label="Cerrar">×</button></header><div id="modal-cuerpo"></div></div></dialog>`;
  raiz.querySelectorAll('[data-etab]').forEach((b) => { b.setAttribute('aria-selected', String(b.dataset.etab === S.tab)); b.onclick = () => { S.tab = b.dataset.etab; renderModuloEjercicio(); }; });
  actualizarSync();
  raiz.querySelector('.modal-cerrar').onclick = cerrarModal;
  if (S.tab === 'entrenar') renderEntrenar(); else if (S.tab === 'hiit') renderHiit(); else if (S.tab === 'wr') renderWr(); else renderProgreso();
}

function abrirModal(titulo, html, configurar, kicker = 'CONFIGURAR') {
  const dialog = document.getElementById('ejercicio-modal');
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-kicker').textContent = kicker;
  document.getElementById('modal-cuerpo').innerHTML = html;
  configurar?.(document.getElementById('modal-cuerpo'), dialog);
  if (!dialog.open) dialog.showModal();
}

function cerrarModal() { document.getElementById('ejercicio-modal')?.close(); }

function abrirDetalleEjercicio(ejercicioId, volver) {
  const ejercicio = S.datos.ejercicios.find((e) => e.id === ejercicioId);
  if (!ejercicio) return;
  const imagenHtml = ejercicio.imagen ? `<img src="${escapeAtributo(ejercicio.imagen)}" alt="${escapeAtributo(ejercicio.nombre)}" loading="lazy">` : '';
  const descripcionHtml = `<p>${escapeHTML(ejercicio.descripcion || 'Este ejercicio todavía no tiene descripción.')}</p>`;
  const volverHtml = volver ? '<button type="button" id="detalle-volver" class="btn-primario ancho-completo">← Volver</button>' : '';
  abrirModal(ejercicio.nombre, `<div class="detalle-ejercicio">${imagenHtml}${descripcionHtml}${volverHtml}</div>`, (c) => {
    c.querySelector('#detalle-volver')?.addEventListener('click', volver);
  }, 'EJERCICIO');
}
function opciones(items, seleccionado = '') { return (items || []).filter((x) => x.activo !== false).map((x) => `<option value="${escapeAtributo(x.id)}" ${x.id === seleccionado ? 'selected' : ''}>${escapeHTML(x.nombre)}</option>`).join(''); }

function renderEntrenar() {
  const p = document.getElementById('ejercicio-panel');
  if (S.entrenamiento) return renderEntrenamientoActivo();
  const rutinas = (S.datos.rutinas || []).filter((r) => r.activo !== false);
  const seleccionada = rutinas.find((r) => r.id === S.rutinaSeleccionada) || rutinas[0];
  if (seleccionada) S.rutinaSeleccionada = seleccionada.id;
  p.innerHTML = `<section class="entrenar-portada"><div class="entrenar-icono">⚡</div><h1>${seleccionada ? escapeHTML(seleccionada.nombre) : 'Tu entrenamiento empieza aquí'}</h1><p>${seleccionada ? `${(seleccionada.entradas || []).length} ejercicios · ${seleccionada.entradas?.reduce((n, e) => n + e.series, 0) || 0} series` : 'Crea ejercicios y arma tu primera rutina.'}</p>${rutinas.length ? `<label class="selector-rutina">Rutina<select id="rutina-seleccion">${opciones(rutinas, S.rutinaSeleccionada)}</select></label><div class="resumen-rutina">${(seleccionada.entradas || []).map((e, i) => { const ej = S.datos.ejercicios.find((x) => x.id === e.ejercicioId); return `<div><b>${i + 1}</b><span><strong>${escapeHTML(ej?.nombre || 'Ejercicio')}</strong><small>${e.series} × ${e.repeticiones} · descanso ${e.descansoSeg}s</small></span></div>`; }).join('')}</div><button id="comenzar-entrenamiento" class="btn-entrenar">Comenzar entrenamiento</button>` : '<button id="crear-primer-ejercicio" class="btn-entrenar">Crear primer ejercicio</button>'}<div class="acciones-gestion"><button id="gestionar-ejercicios">Ejercicios</button><button id="gestionar-rutinas">Rutinas</button></div></section>`;
  p.querySelector('#rutina-seleccion')?.addEventListener('change', (e) => { S.rutinaSeleccionada = e.target.value; renderEntrenar(); });
  p.querySelector('#comenzar-entrenamiento')?.addEventListener('click', comenzarEntrenamiento);
  p.querySelector('#crear-primer-ejercicio')?.addEventListener('click', () => abrirEjercicios());
  p.querySelector('#gestionar-ejercicios').onclick = () => abrirEjercicios();
  p.querySelector('#gestionar-rutinas').onclick = () => abrirRutinas();
}

function abrirEjercicios() {
  const pintar = (c) => {
    const ejercicios = (S.datos.ejercicios || []).filter((e) => e.activo !== false);
    c.querySelector('#lista-ejercicios').innerHTML = ejercicios.map((e) => `<div class="fila-selector-ejercicio"><button type="button" data-ejercicio="${e.id}"><span><b>${escapeHTML(e.nombre)}</b><small>${escapeHTML(S.datos.categorias.find((cat) => cat.id === e.categoriaId)?.nombre || '')} · ${escapeHTML(e.modalidad)}</small></span><i>Editar</i></button><button type="button" class="btn-info-ejercicio" data-borrar-ejercicio="${e.id}" aria-label="Borrar ${escapeAtributo(e.nombre)}">🗑️</button></div>`).join('') || '<p class="estado-vacio">Todavía no hay ejercicios.</p>';
    c.querySelectorAll('[data-ejercicio]').forEach((b) => b.onclick = () => abrirFormularioEjercicio(b.dataset.ejercicio));
    c.querySelectorAll('[data-borrar-ejercicio]').forEach((b) => b.onclick = () => {
      const ejercicio = S.datos.ejercicios.find((x) => x.id === b.dataset.borrarEjercicio);
      if (!confirm(`¿Borrar "${ejercicio.nombre}"? Las rutinas que ya lo usan lo conservan en tu historial, pero ya no lo podrás agregar a rutinas nuevas.`)) return;
      guardar((d) => { const x = d.ejercicios.find((y) => y.id === ejercicio.id); if (x) x.activo = false; }, 'borrar_ejercicio', ejercicio.id);
      pintar(c);
    });
  };
  abrirModal('Ejercicios', `<div class="modal-toolbar"><button type="button" id="nuevo-ejercicio" class="btn-primario">+ Nuevo ejercicio</button><button type="button" id="categorias">Categorías</button></div><div id="lista-ejercicios" class="lista-modal"></div>`, (c) => {
    c.querySelector('#nuevo-ejercicio').onclick = () => abrirFormularioEjercicio();
    c.querySelector('#categorias').onclick = abrirCategorias;
    pintar(c);
  }, 'CATÁLOGO');
}

function abrirCategorias() {
  abrirModal('Categorías', `<form id="form-categoria" class="form-modal"><input type="hidden" id="categoria-id"><label>Nombre<input id="categoria-nombre" required maxlength="40"></label><button class="btn-primario">Guardar categoría</button></form><div class="chips-editables">${S.datos.categorias.filter((c) => c.activo !== false).map((c) => `<button type="button" data-categoria="${c.id}">${escapeHTML(c.nombre)} · Editar</button>`).join('')}</div>`, (c) => {
    c.querySelectorAll('[data-categoria]').forEach((b) => b.onclick = () => { const cat = S.datos.categorias.find((x) => x.id === b.dataset.categoria); c.querySelector('#categoria-id').value = cat.id; c.querySelector('#categoria-nombre').value = cat.nombre; c.querySelector('#categoria-nombre').focus(); });
    c.querySelector('#form-categoria').onsubmit = (e) => { e.preventDefault(); const id = c.querySelector('#categoria-id').value, nombre = c.querySelector('#categoria-nombre').value.trim(); if (!nombre) return; guardar((d) => { const x = d.categorias.find((y) => y.id === id); if (x) Object.assign(x, { nombre, modificadoEn: iso() }); else d.categorias.push({ id: uid(), nombre, activo: true, creadoEn: iso(), modificadoEn: iso() }); }, 'guardar_categoria', id || 'nueva'); cerrarModal(); renderEntrenar(); };
  });
}

function abrirFormularioEjercicio(id = '') {
  const actual = S.datos.ejercicios.find((e) => e.id === id);
  abrirModal(actual ? 'Editar ejercicio' : 'Nuevo ejercicio', `<form id="form-ejercicio" class="form-modal"><label>Nombre<input id="ejercicio-nombre" required maxlength="60" value="${escapeAtributo(actual?.nombre || '')}"></label><label>Categoría<select id="ejercicio-categoria" required>${opciones(S.datos.categorias, actual?.categoriaId)}</select></label><fieldset><legend>Modalidad</legend><label class="opcion-modalidad"><input type="radio" name="modalidad" value="discos" ${!actual || actual.modalidad === 'discos' ? 'checked' : ''}><span>Discos<small>Grande y chico por lado</small></span></label><label class="opcion-modalidad"><input type="radio" name="modalidad" value="niveles" ${actual?.modalidad === 'niveles' ? 'checked' : ''}><span>Niveles<small>Máquina o mancuerna (un número)</small></span></label><label class="opcion-modalidad"><input type="radio" name="modalidad" value="PC" ${actual?.modalidad === 'PC' ? 'checked' : ''}><span>PC<small>Peso corporal</small></span></label></fieldset><label>Descripción / cómo hacerlo<textarea id="ejercicio-descripcion" rows="4" maxlength="600" placeholder="Posición inicial, ejecución y algún tip técnico">${escapeHTML(actual?.descripcion || '')}</textarea></label><button class="btn-primario">Guardar ejercicio</button></form>`, (c) => {
    c.querySelector('#form-ejercicio').onsubmit = (e) => { e.preventDefault(); try { const ejercicio = normalizarEjercicio({ ...actual, id: actual?.id || uid(), nombre: c.querySelector('#ejercicio-nombre').value, categoriaId: c.querySelector('#ejercicio-categoria').value, modalidad: c.querySelector('[name="modalidad"]:checked').value, descripcion: c.querySelector('#ejercicio-descripcion').value.trim() }); guardar((d) => { const i = d.ejercicios.findIndex((x) => x.id === ejercicio.id); if (i >= 0) d.ejercicios[i] = ejercicio; else d.ejercicios.push(ejercicio); }, 'guardar_ejercicio', ejercicio.id); cerrarModal(); renderEntrenar(); } catch (err) { S.toast(err.message, true); } };
  });
}

function abrirRutinas() {
  const rutinas = S.datos.rutinas.filter((r) => r.activo !== false);
  abrirModal('Rutinas', `<button type="button" id="nueva-rutina" class="btn-primario ancho-completo">+ Nueva rutina</button><div class="lista-modal">${rutinas.map((r) => `<button type="button" data-rutina="${r.id}"><span><b>${escapeHTML(r.nombre)}</b><small>${(r.entradas || []).length} ejercicios</small></span><i>Editar</i></button>`).join('') || '<p class="estado-vacio">Crea una rutina y agrega ejercicios.</p>'}</div>`, (c) => { c.querySelector('#nueva-rutina').onclick = () => abrirConstructorRutina(); c.querySelectorAll('[data-rutina]').forEach((b) => b.onclick = () => abrirConstructorRutina(b.dataset.rutina)); }, 'PLANIFICACIÓN');
}

function abrirConstructorRutina(id = '') {
  const actual = S.datos.rutinas.find((r) => r.id === id);
  const borrador = { id: actual?.id || '', nombre: actual?.nombre || '', entradas: structuredClone(actual?.entradas || []) };
  const pintar = () => abrirModal(actual ? 'Editar rutina' : 'Nueva rutina', `<form id="form-rutina" class="form-modal"><label>Nombre de la rutina<input id="rutina-nombre" required value="${escapeAtributo(borrador.nombre)}" placeholder="Ej. Pecho y tríceps"></label><div class="constructor-rutina"><div class="constructor-titulo"><b>Ejercicios</b><button type="button" id="agregar-ejercicio">+ Agregar ejercicio</button></div>${borrador.entradas.map((e, i) => { const ej = S.datos.ejercicios.find((x) => x.id === e.ejercicioId); return `<article data-entrada="${i}"><header><span><b>${i + 1}. ${escapeHTML(ej?.nombre || 'Ejercicio')}</b><small>${escapeHTML(ej?.modalidad || '')}</small></span><div><button type="button" data-subir="${i}" aria-label="Subir">↑ Subir</button><button type="button" data-bajar="${i}" aria-label="Bajar">↓ Bajar</button><button type="button" data-quitar="${i}">Quitar</button></div></header><div class="grid-form"><label>Series<input data-campo="series" type="number" min="1" value="${e.series}"></label><label>Repeticiones<input data-campo="repeticiones" type="number" min="1" value="${e.repeticiones}"></label><label>Descanso (s)<input data-campo="descansoSeg" type="number" min="0" value="${e.descansoSeg}"></label></div></article>`; }).join('') || '<p class="estado-vacio">Pulsa “Agregar ejercicio” para construir la rutina.</p>'}</div><button class="btn-primario ancho-completo">Guardar rutina</button></form>`, (c) => {
      c.querySelector('#rutina-nombre').oninput = (e) => { borrador.nombre = e.target.value; };
      c.querySelectorAll('[data-entrada]').forEach((art) => art.querySelectorAll('[data-campo]').forEach((inp) => inp.oninput = () => { borrador.entradas[Number(art.dataset.entrada)][inp.dataset.campo] = Number(inp.value); }));
      c.querySelector('#agregar-ejercicio').onclick = () => abrirSelectorEjercicio(borrador, pintar);
      c.querySelectorAll('[data-quitar]').forEach((b) => b.onclick = () => { borrador.entradas.splice(Number(b.dataset.quitar), 1); pintar(); });
      c.querySelectorAll('[data-subir]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.subir); if (i > 0) [borrador.entradas[i - 1], borrador.entradas[i]] = [borrador.entradas[i], borrador.entradas[i - 1]]; pintar(); });
      c.querySelectorAll('[data-bajar]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.bajar); if (i < borrador.entradas.length - 1) [borrador.entradas[i + 1], borrador.entradas[i]] = [borrador.entradas[i], borrador.entradas[i + 1]]; pintar(); });
      c.querySelector('#form-rutina').onsubmit = (e) => { e.preventDefault(); try { const rutina = normalizarRutina({ ...actual, id: actual?.id || uid(), nombre: borrador.nombre, entradas: borrador.entradas }); guardar((d) => { const i = d.rutinas.findIndex((x) => x.id === rutina.id); if (i >= 0) d.rutinas[i] = rutina; else d.rutinas.push(rutina); }, 'guardar_rutina', rutina.id); S.rutinaSeleccionada = rutina.id; cerrarModal(); renderEntrenar(); } catch (err) { S.toast(err.message, true); } };
    }, 'CONSTRUCTOR');
  pintar();
}

function abrirSelectorEjercicio(borrador, volver) {
  abrirModal('Agregar ejercicio', `<label class="filtro-catalogo">Filtrar por categoría<select id="filtro-categoria"><option value="">Todas</option>${opciones(S.datos.categorias)}</select></label><div id="selector-lista" class="lista-modal"></div>`, (c) => {
    const pintar = () => {
      const cat = c.querySelector('#filtro-categoria').value;
      c.querySelector('#selector-lista').innerHTML = S.datos.ejercicios.filter((e) => e.activo !== false && (!cat || e.categoriaId === cat)).map((e) => `<div class="fila-selector-ejercicio"><button type="button" data-elegir="${e.id}"><span><b>${escapeHTML(e.nombre)}</b><small>${escapeHTML(e.modalidad)}</small></span><i>Agregar</i></button><button type="button" class="btn-info-ejercicio" data-detalle="${e.id}" aria-label="Ver cómo hacerlo">ⓘ</button></div>`).join('') || '<p class="estado-vacio">No hay ejercicios en esta categoría.</p>';
      c.querySelectorAll('[data-elegir]').forEach((b) => b.onclick = () => { borrador.entradas.push({ ejercicioId: b.dataset.elegir, series: 3, repeticiones: 10, descansoSeg: 60 }); volver(); });
      c.querySelectorAll('[data-detalle]').forEach((b) => b.onclick = () => abrirDetalleEjercicio(b.dataset.detalle, pintar));
    };
    c.querySelector('#filtro-categoria').onchange = pintar; pintar();
  }, 'CATÁLOGO');
}

function comenzarEntrenamiento() {
  const rutina = S.datos.rutinas.find((r) => r.id === S.rutinaSeleccionada); if (!rutina?.entradas?.length) return;
  S.entrenamiento = { id: uid(), rutinaId: rutina.id, nombre: rutina.nombre, entradas: structuredClone(rutina.entradas), ejercicioIndice: 0, serieNumero: 1, fase: 'cuenta', cuenta: 3, series: [], fecha: iso(), creadoEn: iso(), modificadoEn: iso() };
  S.sonidosEmitidos.clear();
  clearInterval(S.intervalo); S.intervalo = setInterval(tickEntrenamiento, 250); S.entrenamiento.cuentaFinMs = Date.now() + 3000; solicitarWake(); renderEntrenamientoActivo();
}

function tickEntrenamiento() {
  if (!S.entrenamiento) return;
  if (S.entrenamiento.fase === 'cuenta') {
    const n = Math.max(0, Math.ceil((S.entrenamiento.cuentaFinMs - Date.now()) / 1000));
    emitirUnaVez(`inicio-${n}`, sonidosEnSegundo({ tipo: 'cuenta', restanteSeg: n }));
    if (n <= 0) { S.entrenamiento.fase = 'serie'; beep('largo'); }
  } else if (S.entrenamiento.fase === 'descanso') tickDescanso();
  renderEntrenamientoActivo();
}

function ejercicioActual() { const entrada = S.entrenamiento?.entradas[S.entrenamiento.ejercicioIndice]; return { entrada, ejercicio: S.datos.ejercicios.find((e) => e.id === entrada?.ejercicioId) }; }

function renderEntrenamientoActivo() {
  const p = document.getElementById('ejercicio-panel'), t = S.entrenamiento; if (!t) return renderEntrenar();
  if (t.fase === 'cuenta') { const n = Math.max(1, Math.ceil((t.cuentaFinMs - Date.now()) / 1000)); p.innerHTML = `<section class="cuenta-gigante"><small>PREPÁRATE</small><strong>${n}</strong><span>${escapeHTML(t.nombre)}</span></section>`; return; }
  if (t.fase === 'confirmar') {
    const siguienteEntrada = t.entradas[t.pasoSiguiente.ejercicioIndice], siguienteEjercicio = S.datos.ejercicios.find((e) => e.id === siguienteEntrada.ejercicioId);
    p.innerHTML = `<section class="descanso-pantalla"><small>EJERCICIO COMPLETADO</small><strong>✓</strong><div class="progreso-circular"><span>Siguiente</span><b>${escapeHTML(siguienteEjercicio?.nombre || '')}</b></div><button id="confirmar-siguiente" class="btn-primario">Continuar</button></section>`;
    p.querySelector('#confirmar-siguiente').onclick = confirmarSiguienteEjercicio;
    return;
  }
  const { entrada, ejercicio } = ejercicioActual(), totalSeries = t.entradas.reduce((n, e) => n + e.series, 0), hechas = t.series.length;
  if (t.fase === 'descanso') {
    const restante = Math.max(0, Math.ceil((S.descanso.finMs - Date.now()) / 1000));
    // Coaching en vivo (Fase 4): qué hiciste la vez pasada en este ejercicio,
    // si en esta sesión vas mejor/igual/peor, y un consejo de zona de reps
    // según lo que buscas hacer. Todo con datos que la app ya guardaba.
    const marcaAnterior = ejercicio ? ultimaMarcaEjercicio(S.datos.sesiones || [], ejercicio.id) : null;
    const ultimaHoy = ejercicio ? t.series.filter((s) => s.ejercicioId === ejercicio.id).at(-1) : null;
    let comparacion = '';
    if (marcaAnterior && ultimaHoy) {
      const valorHoy = ultimaHoy.modalidad === 'niveles' ? Number(ultimaHoy.carga || 0) : Number(ultimaHoy.repeticiones || 0);
      comparacion = valorHoy > marcaAnterior.valor ? '📈 Vas mejorando' : valorHoy === marcaAnterior.valor ? '➡️ Vas igual que la vez pasada' : '📉 Por debajo de tu marca anterior';
    }
    const consejo = consejoRepeticiones(entrada.repeticiones);
    const coachingHtml = (marcaAnterior || consejo) ? `<div class="coaching-descanso">${marcaAnterior ? `<p>La vez pasada: <b>${marcaAnterior.valor} ${marcaAnterior.unidad === 'niveles' ? 'nivel' : 'reps'}</b>${comparacion ? ` · ${comparacion}` : ''}</p>` : ''}${consejo ? `<p class="texto-suave">${escapeHTML(consejo)}</p>` : ''}</div>` : '';
    p.innerHTML = `<section class="descanso-pantalla"><small>DESCANSO</small><strong>${restante}</strong><div class="progreso-circular"><span>Siguiente</span><b>${escapeHTML(ejercicio?.nombre || '')}</b><small>Serie ${t.serieNumero} de ${entrada.series}</small></div>${coachingHtml}<button id="sumar-cinco">+5 s</button><button id="saltar-descanso">Saltar descanso</button></section>`;
    p.querySelector('#sumar-cinco').onclick = () => { S.descanso.finMs += 5000; S.descanso.extraSeg += 5; };
    p.querySelector('#saltar-descanso').onclick = cerrarDescanso;
    return;
  }
  p.innerHTML = `<section class="entrenamiento-activo"><header><button id="salir-rutina">×</button><div><small>${escapeHTML(t.nombre)}</small><b>${hechas}/${totalSeries} series</b></div><span>${Math.round(hechas / totalSeries * 100)}%</span></header><div class="barra-rutina"><i style="width:${hechas / totalSeries * 100}%"></i></div><article class="tarjeta-ejercicio-actual"><span class="numero-ejercicio">${t.ejercicioIndice + 1}/${t.entradas.length}</span><h1>${escapeHTML(ejercicio?.nombre || 'Ejercicio')}</h1><button type="button" id="ver-como-hacerlo" class="btn-discreto">Ver cómo hacerlo</button><p>Serie <b>${t.serieNumero}</b> de ${entrada.series} · meta ${entrada.repeticiones} reps</p>${stepperCantidad('serie-reps', 'Repeticiones', entrada.repeticiones, 1)}${cargaEntrenamiento(ejercicio)}<button id="terminar-serie" class="btn-terminar-serie">Terminar serie</button><small>Descanso programado: ${entrada.descansoSeg}s</small>${t.ejercicioIndice + 1 < t.entradas.length ? '<button id="saltar-ejercicio" class="btn-discreto">Saltar este ejercicio</button>' : ''}</article></section>`;
  conectarSteppers(p);
  const btnTerminar = p.querySelector('#terminar-serie');
  const actualizarBotonTerminar = () => { btnTerminar.disabled = Number(p.querySelector('#serie-reps').value) < 1; };
  p.querySelector('#serie-reps').addEventListener('input', actualizarBotonTerminar);
  actualizarBotonTerminar();
  btnTerminar.onclick = terminarSerieGuiada;
  p.querySelector('#ver-como-hacerlo').onclick = () => abrirDetalleEjercicio(ejercicio.id);
  p.querySelector('#salir-rutina').onclick = salirRutina;
  p.querySelector('#saltar-ejercicio')?.addEventListener('click', saltarEjercicio);
}

function salirRutina() {
  const t = S.entrenamiento;
  if (!t.series.length) { if (!confirm('¿Terminar esta rutina sin guardarla?')) return; S.entrenamiento = null; clearInterval(S.intervalo); liberarWake(); return renderEntrenar(); }
  if (!confirm(`¿Salir? Se guardarán ${t.series.length} serie(s) ya completadas como rutina incompleta.`)) return;
  const sesion = { id: t.id, rutinaId: t.rutinaId, nombre: t.nombre, fecha: t.fecha, fin: iso(), estado: 'descartada', series: t.series, creadoEn: t.creadoEn, modificadoEn: iso() };
  guardar((d) => d.sesiones.push(sesion), 'guardar_sesion', sesion.id);
  S.entrenamiento = null; S.descanso = null; clearInterval(S.intervalo); liberarWake(); S.toast('Rutina guardada como incompleta'); renderEntrenar();
}

function saltarEjercicio() {
  if (!confirm('¿Saltar este ejercicio? No se registrarán series para él.')) return;
  const t = S.entrenamiento;
  Object.assign(t, { ejercicioIndice: t.ejercicioIndice + 1, serieNumero: 1, fase: 'serie' });
  renderEntrenamientoActivo();
}

function cargaEntrenamiento(ejercicio) {
  if (ejercicio?.modalidad === 'discos') return `<div class="carga-discos">${stepperCantidad('carga-grande', 'Grandes / lado', 0, 0)}${stepperCantidad('carga-chico', 'Chicos / lado', 0, 0)}</div>`;
  if (ejercicio?.modalidad === 'niveles') return stepperCantidad('carga-nivel', 'Peso / nivel', 1, 0);
  return '<div class="pc-indicador">PC <small>Peso corporal</small></div>';
}

function stepperCantidad(id, etiqueta, valor, minimo) {
  return `<div class="control-cantidad"><span>${escapeHTML(etiqueta)}</span><div><button type="button" data-stepper="menos" data-objetivo="${id}" aria-label="Restar ${escapeAtributo(etiqueta)}">−</button><input id="${id}" type="number" inputmode="numeric" min="${minimo}" value="${valor}" aria-label="${escapeAtributo(etiqueta)}"><button type="button" data-stepper="mas" data-objetivo="${id}" aria-label="Sumar ${escapeAtributo(etiqueta)}">+</button></div></div>`;
}

function conectarSteppers(contenedor) {
  contenedor.querySelectorAll('[data-stepper]').forEach((boton) => boton.onclick = () => {
    const input = contenedor.querySelector(`#${boton.dataset.objetivo}`); if (!input) return;
    input.value = String(ajustarCantidad(input.value, boton.dataset.stepper === 'menos' ? -1 : 1, { minimo: Number(input.min || 0), paso: Number(input.step || 1) }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function terminarSerieGuiada() {
  const { entrada, ejercicio } = ejercicioActual();
  let carga = null; if (ejercicio.modalidad === 'discos') carga = { grande: Number(document.getElementById('carga-grande').value), chico: Number(document.getElementById('carga-chico').value) }; else if (ejercicio.modalidad === 'niveles') carga = Number(document.getElementById('carga-nivel').value);
  try { S.entrenamiento.series.push(normalizarSerie({ ejercicioId: ejercicio.id, repeticiones: Number(document.getElementById('serie-reps').value), modalidad: ejercicio.modalidad, carga, descansoPlaneadoSeg: entrada.descansoSeg })); } catch (err) { return S.toast(err.message, true); }
  S.entrenamiento.fase = 'descanso'; S.descanso = { inicioMs: Date.now(), finMs: Date.now() + entrada.descansoSeg * 1000, extraSeg: 0 }; S.sonidosEmitidos.clear(); emitirSonidos(['rapido', 'rapido', 'rapido']); renderEntrenamientoActivo();
}

function tickDescanso() {
  const restante = Math.max(0, Math.ceil((S.descanso.finMs - Date.now()) / 1000));
  emitirUnaVez(`descanso-${restante}`, sonidosEnSegundo({ tipo: 'descanso', restanteSeg: restante }));
  if (restante <= 0) cerrarDescanso();
}

function cerrarDescanso() {
  const ultima = S.entrenamiento.series.at(-1); ultima.descansoRealSeg = Math.round((Date.now() - S.descanso.inicioMs) / 1000); ultima.extraSeg = S.descanso.extraSeg;
  const paso = siguientePasoRutina(S.entrenamiento, S.entrenamiento.entradas);
  S.descanso = null;
  if (paso.terminada) return finalizarEntrenamiento();
  if (paso.ejercicioIndice !== S.entrenamiento.ejercicioIndice) { S.entrenamiento.fase = 'confirmar'; S.entrenamiento.pasoSiguiente = paso; beep('final'); return renderEntrenamientoActivo(); }
  Object.assign(S.entrenamiento, paso, { fase: 'serie' }); beep('largo'); renderEntrenamientoActivo();
}

function confirmarSiguienteEjercicio() {
  Object.assign(S.entrenamiento, S.entrenamiento.pasoSiguiente, { fase: 'serie' }); delete S.entrenamiento.pasoSiguiente; renderEntrenamientoActivo();
}

function finalizarEntrenamiento() {
  const t = S.entrenamiento, sesion = { id: t.id, rutinaId: t.rutinaId, nombre: t.nombre, fecha: t.fecha, fin: iso(), estado: 'completada', series: t.series, creadoEn: t.creadoEn, modificadoEn: iso() };
  guardar((d) => d.sesiones.push(sesion), 'guardar_sesion', sesion.id); S.entrenamiento = null; S.descanso = null; clearInterval(S.intervalo); liberarWake(); beep('final'); S.toast('Rutina completada'); renderEntrenar();
}

// ────────── Caminar/Correr (W/R) ──────────
// Portada de la pestaña: elegir una rutina guardada y arrancar. A
// diferencia de HIIT (que permite un modo "manual" con dos duraciones),
// aquí SIEMPRE se corre desde una rutina, porque la gracia de W/R son las
// fases libres -- y armarlas requiere el constructor, no tres inputs.
function formatoDuracionWr(segundos) {
  const min = Math.floor(segundos / 60), seg = segundos % 60;
  return seg ? `${min}:${String(seg).padStart(2, '0')} min` : `${min} min`;
}

function resumenFasesWr(rutina) {
  return rutina.fases.map((f) => `${escapeHTML(f.nombre)} ${formatoDuracionWr(f.duracionSeg)}`).join(' → ');
}

function renderWr() {
  const p = document.getElementById('ejercicio-panel');
  if (S.wr) return renderWrActivo();
  const rutinas = (S.datos.rutinasWr || []).filter((r) => r.activo !== false);
  p.innerHTML = `<section class="wr-config"><div class="wr-emblema">W/R</div><h1>Caminar y correr</h1><p>Arma tus propios intervalos. La app te avisa cuándo acelerar y cuándo bajar el ritmo, sin que tengas que ver la pantalla.</p><button type="button" id="wr-nueva" class="btn-primario ancho-completo">+ Nueva rutina</button><div class="lista-modal">${rutinas.map((r) => `<div class="fila-selector-ejercicio"><button type="button" data-usar-wr="${escapeAtributo(r.id)}"><span><b>${escapeHTML(r.nombre)}</b><small>${r.vueltas} vueltas · ${formatoDuracionWr(calcularDuracionWr(r))} · ${resumenFasesWr(r)}</small></span><i>Iniciar</i></button><button type="button" class="btn-info-ejercicio" data-borrar-wr="${escapeAtributo(r.id)}" aria-label="Borrar ${escapeAtributo(r.nombre)}">🗑️</button></div>`).join('') || '<p class="estado-vacio">Crea tu primera rutina de caminar/correr.</p>'}</div></section>`;
  p.querySelector('#wr-nueva').onclick = () => abrirFormularioRutinaWr();
  p.querySelectorAll('[data-usar-wr]').forEach((b) => b.onclick = () => iniciarWr(S.datos.rutinasWr.find((r) => r.id === b.dataset.usarWr)));
  p.querySelectorAll('[data-borrar-wr]').forEach((b) => b.onclick = () => {
    if (!confirm('¿Borrar esta rutina de caminar/correr?')) return;
    guardar((d) => { const x = (d.rutinasWr || []).find((y) => y.id === b.dataset.borrarWr); if (x) x.activo = false; }, 'borrar_rutina_wr', b.dataset.borrarWr);
    renderWr();
  });
}

// Constructor de rutinas W/R: fases que se pueden agregar, quitar y
// reordenar, con duración en minutos + segundos. Mismo patrón de
// "borrador en memoria + repintar" que abrirConstructorRutina (pesas),
// porque aquí también hay una lista editable antes de guardar.
function abrirFormularioRutinaWr(id = '') {
  const actual = (S.datos.rutinasWr || []).find((r) => r.id === id);
  const borrador = actual
    ? { id: actual.id, nombre: actual.nombre, descripcion: actual.descripcion || '', vueltas: actual.vueltas, calentamientoMin: Math.round(actual.calentamientoSeg / 60), enfriamientoMin: Math.round(actual.enfriamientoSeg / 60), fases: structuredClone(actual.fases) }
    : { id: '', nombre: '', descripcion: '', vueltas: 6, calentamientoMin: 5, enfriamientoMin: 0, fases: [{ nombre: 'Caminar', tipo: 'caminar', duracionSeg: 180 }, { nombre: 'Correr', tipo: 'correr', duracionSeg: 60 }] };

  const pintar = () => {
    const rutinaPrevia = { vueltas: Number(borrador.vueltas) || 1, calentamientoSeg: (Number(borrador.calentamientoMin) || 0) * 60, enfriamientoSeg: (Number(borrador.enfriamientoMin) || 0) * 60, fases: borrador.fases };
    let totalTexto = '—';
    try { totalTexto = formatoDuracionWr(calcularDuracionWr(rutinaPrevia)); } catch { totalTexto = '—'; }
    abrirModal(actual ? 'Editar rutina W/R' : 'Nueva rutina W/R', `<form id="form-rutina-wr" class="form-modal">
      <label>Nombre<input id="wr-nombre" required maxlength="40" value="${escapeAtributo(borrador.nombre)}" placeholder="Ej. Mi rutina de la mañana"></label>
      <label>Descripción (opcional)<textarea id="wr-descripcion" rows="2" maxlength="200">${escapeHTML(borrador.descripcion)}</textarea></label>
      <div class="grid-form">
        <label>Vueltas<input id="wr-vueltas" type="number" min="1" value="${borrador.vueltas}"></label>
        <label>Calentamiento (min)<input id="wr-calentamiento" type="number" min="0" value="${borrador.calentamientoMin}"></label>
        <label>Enfriamiento (min)<input id="wr-enfriamiento" type="number" min="0" value="${borrador.enfriamientoMin}"></label>
      </div>
      <div class="constructor-rutina">
        <div class="constructor-titulo"><b>Fases (se repiten cada vuelta)</b><button type="button" id="wr-agregar-fase">+ Agregar fase</button></div>
        ${borrador.fases.map((f, i) => `<article data-fase="${i}"><header><span><b>${i + 1}. ${escapeHTML(f.nombre)}</b><small>${escapeHTML(f.tipo)}</small></span><div><button type="button" data-subir-fase="${i}" aria-label="Subir">↑</button><button type="button" data-bajar-fase="${i}" aria-label="Bajar">↓</button><button type="button" data-quitar-fase="${i}">Quitar</button></div></header><div class="grid-form"><label>Nombre<input data-campo-fase="nombre" maxlength="24" value="${escapeAtributo(f.nombre)}"></label><label>Tipo<select data-campo-fase="tipo">${TIPOS_FASE_WR.map((t) => `<option value="${t}" ${t === f.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>Minutos<input data-campo-fase="min" type="number" min="0" value="${Math.floor(f.duracionSeg / 60)}"></label><label>Segundos<input data-campo-fase="seg" type="number" min="0" max="59" value="${f.duracionSeg % 60}"></label></div></article>`).join('') || '<p class="estado-vacio">Agrega al menos una fase.</p>'}
      </div>
      <p class="texto-suave">Duración total: <b>${totalTexto}</b></p>
      <button class="btn-primario ancho-completo">Guardar rutina</button>
    </form>`, (c) => {
      c.querySelector('#wr-nombre').oninput = (e) => { borrador.nombre = e.target.value; };
      c.querySelector('#wr-descripcion').oninput = (e) => { borrador.descripcion = e.target.value; };
      c.querySelector('#wr-vueltas').oninput = (e) => { borrador.vueltas = e.target.value; };
      c.querySelector('#wr-calentamiento').oninput = (e) => { borrador.calentamientoMin = e.target.value; };
      c.querySelector('#wr-enfriamiento').oninput = (e) => { borrador.enfriamientoMin = e.target.value; };
      c.querySelectorAll('[data-fase]').forEach((art) => {
        const i = Number(art.dataset.fase);
        art.querySelectorAll('[data-campo-fase]').forEach((inp) => inp.oninput = () => {
          const campo = inp.dataset.campoFase;
          if (campo === 'nombre') borrador.fases[i].nombre = inp.value;
          else if (campo === 'tipo') borrador.fases[i].tipo = inp.value;
          else {
            const min = Number(art.querySelector('[data-campo-fase="min"]').value) || 0;
            const seg = Number(art.querySelector('[data-campo-fase="seg"]').value) || 0;
            borrador.fases[i].duracionSeg = min * 60 + seg;
          }
        });
      });
      c.querySelector('#wr-agregar-fase').onclick = () => { borrador.fases.push({ nombre: 'Caminar', tipo: 'caminar', duracionSeg: 60 }); pintar(); };
      c.querySelectorAll('[data-quitar-fase]').forEach((b) => b.onclick = () => { borrador.fases.splice(Number(b.dataset.quitarFase), 1); pintar(); });
      c.querySelectorAll('[data-subir-fase]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.subirFase); if (i > 0) [borrador.fases[i - 1], borrador.fases[i]] = [borrador.fases[i], borrador.fases[i - 1]]; pintar(); });
      c.querySelectorAll('[data-bajar-fase]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.bajarFase); if (i < borrador.fases.length - 1) [borrador.fases[i + 1], borrador.fases[i]] = [borrador.fases[i], borrador.fases[i + 1]]; pintar(); });
      c.querySelector('#form-rutina-wr').onsubmit = (e) => {
        e.preventDefault();
        try {
          const rutina = normalizarRutinaWr({
            ...actual, id: actual?.id || uid(), nombre: borrador.nombre, descripcion: borrador.descripcion,
            vueltas: Number(borrador.vueltas), calentamientoSeg: (Number(borrador.calentamientoMin) || 0) * 60,
            enfriamientoSeg: (Number(borrador.enfriamientoMin) || 0) * 60, fases: borrador.fases,
          });
          guardar((d) => { d.rutinasWr = d.rutinasWr || []; const i = d.rutinasWr.findIndex((x) => x.id === rutina.id); if (i >= 0) d.rutinasWr[i] = rutina; else d.rutinasWr.push(rutina); }, 'guardar_rutina_wr', rutina.id);
          cerrarModal(); renderWr();
        } catch (err) { S.toast(err.message, true); }
      };
    }, 'W/R');
  };
  pintar();
}

// El GPS es OPCIONAL: si el usuario niega el permiso, el navegador no lo
// soporta, o la señal es mala, la sesión sigue funcionando igual solo con
// los tiempos. Nunca se bloquea el entrenamiento por esto.
function iniciarGpsWr() {
  if (!navigator.geolocation) return;
  try {
    S.wr.gps = { ultimo: null, distanciaM: 0, porTipo: { caminar: 0, correr: 0 }, activo: true };
    S.wr.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!S.wr || !S.wr.gps) return;
        const punto = { lat: pos.coords.latitude, lon: pos.coords.longitude, tMs: pos.timestamp || Date.now(), accuracy: pos.coords.accuracy };
        const antes = S.wr.gps.distanciaM;
        const nuevo = acumularPuntoGps(S.wr.gps, punto);
        S.wr.gps = { ...S.wr.gps, ...nuevo };
        // El tramo recorrido se le acredita a la fase que está corriendo
        // AHORA, para poder dar ritmo de caminata vs de carrera por separado.
        const avance = S.wr.gps.distanciaM - antes;
        if (avance > 0 && S.wr.estado === 'activo') {
          const e = faseEnSegundo(S.wr.fases, transcurridoWr());
          if (e && (e.tipo === 'caminar' || e.tipo === 'correr')) S.wr.gps.porTipo[e.tipo] += avance;
        }
      },
      () => { if (S.wr && S.wr.gps) S.wr.gps.activo = false; }, // permiso negado o sin señal: se sigue sin GPS
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  } catch { S.wr.gps = null; }
}

function detenerGpsWr() {
  if (S.wr && S.wr.watchId != null && navigator.geolocation) {
    try { navigator.geolocation.clearWatch(S.wr.watchId); } catch { /* ya estaba detenido */ }
  }
}

// Ejecución de una sesión W/R. Mismo esqueleto que el HIIT (cuenta
// regresiva de 3s, tick cada 200ms, pausa acumulada en `pausaMs`), pero
// recorriendo la lista de fases expandida en vez de dos duraciones fijas.
function iniciarWr(rutina) {
  if (!rutina) return S.toast('Elige una rutina primero', true);
  let planeadoSeg;
  try { planeadoSeg = calcularDuracionWr(rutina); } catch (err) { return S.toast(err.message, true); }
  S.wr = {
    id: uid(), rutinaId: rutina.id, nombre: rutina.nombre,
    fases: fasesWr(rutina), planeadoSeg, vueltas: rutina.vueltas,
    inicioMs: Date.now(), actividadInicioMs: null, pausaMs: 0, pausaInicio: null,
    faseIndice: -1, cuentaFinMs: Date.now() + 3000, estado: 'cuenta', creadoEn: iso(),
  };
  S.sonidosEmitidos.clear();
  iniciarGpsWr();
  clearInterval(S.intervalo); S.intervalo = setInterval(tickWr, 200); solicitarWake(); tickWr();
}

// Segundos REALES transcurridos de la sesión (descontando pausas), o 0 si
// todavía está en la cuenta regresiva inicial.
function transcurridoWr() {
  const w = S.wr;
  if (!w || w.estado === 'cuenta') return 0;
  const ahora = w.pausaInicio || Date.now();
  return Math.max(0, Math.floor((ahora - w.actividadInicioMs - w.pausaMs) / 1000));
}

function tickWr() {
  if (!S.wr || S.wr.pausaInicio) return renderWrActivo();
  const w = S.wr;
  if (w.estado === 'cuenta') {
    const restante = Math.max(0, Math.ceil((w.cuentaFinMs - Date.now()) / 1000));
    emitirUnaVez(`wr-cuenta-${restante}`, avisoWrCuentaFinal(restante));
    if (restante <= 0) {
      w.estado = 'activo'; w.actividadInicioMs = Date.now(); w.pausaMs = 0; w.faseIndice = -1;
    }
    return renderWrActivo();
  }
  const e = faseEnSegundo(w.fases, transcurridoWr());
  if (!e) return finalizarWr(false);
  // Al ENTRAR a una fase nueva suena su aviso (una sola vez por fase).
  if (e.indice !== w.faseIndice) { w.faseIndice = e.indice; emitirSonidos(avisoWrAlEntrarAFase(e.tipo)); }
  emitirUnaVez(`wr-${e.indice}-${e.restante}`, avisoWrCuentaFinal(e.restante));
  renderWrActivo();
}

function renderWrActivo() {
  const p = document.getElementById('ejercicio-panel'), w = S.wr;
  if (!w) return renderWr();
  if (w.estado === 'cuenta') {
    const restante = Math.max(0, Math.ceil((w.cuentaFinMs - (w.pausaInicio || Date.now())) / 1000));
    p.innerHTML = `<section class="wr-activo cuenta"><small>${w.pausaInicio ? 'PAUSADO' : 'PREPÁRATE'}</small><strong>${restante}</strong><span>${escapeHTML(w.nombre)}</span><div class="acciones"><button id="wr-pausa">${w.pausaInicio ? 'Reanudar' : 'Pausar'}</button><button id="wr-detener">Detener</button></div></section>`;
  } else {
    const e = faseEnSegundo(w.fases, transcurridoWr());
    if (!e) return;
    const min = Math.floor(e.restante / 60), seg = e.restante % 60;
    const reloj = `${min}:${String(seg).padStart(2, '0')}`;
    const vueltaTexto = e.vuelta ? `Vuelta ${e.vuelta}/${w.vueltas}` : e.nombre;
    const siguienteTexto = e.siguiente ? `Sigue: ${escapeHTML(e.siguiente.nombre)}` : 'Última fase';
    const gps = w.gps;
    const kmTexto = gps && gps.activo && gps.distanciaM > 0 ? `${(gps.distanciaM / 1000).toFixed(2)} km` : '';
    const ritmoActual = (gps && gps.activo && (e.tipo === 'caminar' || e.tipo === 'correr'))
      ? ritmoSegPorKm(tiempoPorTipoWr(w.fases, transcurridoWr())[e.tipo], gps.porTipo[e.tipo]) : null;
    const ritmoTexto = ritmoActual ? `${Math.floor(ritmoActual / 60)}:${String(ritmoActual % 60).padStart(2, '0')} min/km` : '';
    const gpsHtml = (kmTexto || ritmoTexto) ? `<p class="wr-gps">${kmTexto}${kmTexto && ritmoTexto ? ' · ' : ''}${ritmoTexto}</p>` : '';
    p.innerHTML = `<section class="wr-activo ${e.tipo}"><small>${w.pausaInicio ? 'PAUSADO' : escapeHTML(e.nombre.toUpperCase())}</small><strong>${reloj}</strong><span>${escapeHTML(vueltaTexto)}</span><p class="wr-siguiente">${siguienteTexto}</p>${gpsHtml}<div class="acciones"><button id="wr-pausa">${w.pausaInicio ? 'Reanudar' : 'Pausar'}</button><button id="wr-detener">Detener</button></div></section>`;
  }
  p.querySelector('#wr-pausa').onclick = alternarPausaWr;
  p.querySelector('#wr-detener').onclick = () => finalizarWr(true);
}

function alternarPausaWr() {
  const w = S.wr;
  if (w.pausaInicio) {
    const pausa = Date.now() - w.pausaInicio;
    if (w.estado === 'cuenta') w.cuentaFinMs += pausa; else w.pausaMs += pausa;
    w.pausaInicio = null; solicitarWake();
  } else { w.pausaInicio = Date.now(); liberarWake(); }
  renderWrActivo();
}

function finalizarWr(detenido) {
  const w = S.wr;
  if (!w) return;
  const realSeg = detenido ? Math.min(w.planeadoSeg, transcurridoWr()) : w.planeadoSeg;
  const porTipo = tiempoPorTipoWr(w.fases, realSeg);
  // Cuántas vueltas COMPLETAS se alcanzaron: la vuelta de la última fase
  // terminada, no la que iba a medias.
  const faseActual = faseEnSegundo(w.fases, realSeg);
  const vueltasCompletadas = faseActual ? Math.max(0, (faseActual.vuelta || 1) - 1) : w.vueltas;
  const registro = {
    id: w.id, rutinaId: w.rutinaId, nombre: w.nombre || 'Caminar/Correr',
    fecha: iso(), fin: iso(),
    planeadoSeg: w.planeadoSeg, realSeg,
    caminarSeg: porTipo.caminar, correrSeg: porTipo.correr,
    vueltasCompletadas,
    porcentaje: w.planeadoSeg ? Math.min(100, Math.round(realSeg / w.planeadoSeg * 100)) : 0,
    estado: detenido ? 'detenida' : 'completada',
    creadoEn: w.creadoEn, modificadoEn: iso(),
  };
  // Solo se guardan campos de GPS si de verdad hubo señal -- si no, el
  // registro queda idéntico al de una sesión sin GPS, sin campos vacíos.
  const gps = w.gps;
  if (gps && gps.activo && gps.distanciaM > 0) {
    registro.distanciaM = Math.round(gps.distanciaM);
    registro.distanciaCaminarM = Math.round(gps.porTipo.caminar);
    registro.distanciaCorrerM = Math.round(gps.porTipo.correr);
    registro.ritmoCaminarSegPorKm = ritmoSegPorKm(porTipo.caminar, gps.porTipo.caminar);
    registro.ritmoCorrerSegPorKm = ritmoSegPorKm(porTipo.correr, gps.porTipo.correr);
  }
  detenerGpsWr();
  guardar((d) => { d.wrs = d.wrs || []; d.wrs.push(registro); }, 'guardar_wr', registro.id);
  S.wr = null; clearInterval(S.intervalo); liberarWake(); beep('final');
  S.toast(detenido ? 'Sesión guardada como incompleta' : 'Sesión completada');
  renderWr();
}

function renderHiit() {
  const p = document.getElementById('ejercicio-panel');
  if (S.hiit) return renderHiitActivo();
  p.innerHTML = `<section class="hiit-config"><div class="hiit-emblema">HIIT</div><h1>Intervalos precisos</h1><p>Actividad intensa, descansos claros y avisos que no tienes que mirar.</p><button type="button" id="hiit-rutinas" class="btn-discreto">📋 Rutinas HIIT</button><div class="grid-form"><label>Vueltas<input id="hiit-vueltas" type="number" min="1" value="6"></label><label>Actividad (s)<input id="hiit-actividad" type="number" min="1" value="30"></label><label>Descanso (s)<input id="hiit-descanso" type="number" min="0" value="20"></label></div><button id="hiit-iniciar" class="btn-entrenar">Iniciar HIIT (manual)</button></section>`;
  p.querySelector('#hiit-iniciar').onclick = () => iniciarHiit();
  p.querySelector('#hiit-rutinas').onclick = abrirRutinasHiit;
}

// Catálogo de rutinas HIIT (Fase 5): presets + las que Miguel/Cindy hayan
// creado -- cada usuario tiene el suyo porque S.datos ya es por usuario
// (leerLocal(getUsuario())). Tocar "Usar esta" arranca el HIIT directo con
// esa configuración y su lista de ejercicios, sin pasar por el formulario
// manual.
function abrirRutinasHiit() {
  const rutinas = (S.datos.rutinasHiit || []).filter((r) => r.activo !== false);
  abrirModal('Rutinas HIIT', `<button type="button" id="nueva-rutina-hiit" class="btn-primario ancho-completo">+ Nueva rutina</button><div class="lista-modal">${rutinas.map((r) => `<div class="fila-selector-ejercicio"><button type="button" data-usar-hiit="${r.id}"><span><b>${escapeHTML(r.nombre)}</b><small>${r.vueltas} vueltas · ${r.actividadSeg}s/${r.descansoSeg}s · ${r.ejercicios.length} ejercicios</small></span><i>Usar</i></button><button type="button" class="btn-info-ejercicio" data-borrar-hiit="${r.id}" aria-label="Borrar ${escapeAtributo(r.nombre)}">🗑️</button></div>`).join('') || '<p class="estado-vacio">Sin rutinas todavía.</p>'}</div>`, (c) => {
    c.querySelector('#nueva-rutina-hiit').onclick = () => abrirFormularioRutinaHiit();
    c.querySelectorAll('[data-usar-hiit]').forEach((b) => b.onclick = () => { cerrarModal(); iniciarHiit(S.datos.rutinasHiit.find((r) => r.id === b.dataset.usarHiit)); });
    c.querySelectorAll('[data-borrar-hiit]').forEach((b) => b.onclick = () => {
      if (!confirm('¿Borrar esta rutina de HIIT?')) return;
      guardar((d) => { const x = d.rutinasHiit.find((y) => y.id === b.dataset.borrarHiit); if (x) x.activo = false; }, 'borrar_rutina_hiit', b.dataset.borrarHiit);
      abrirRutinasHiit();
    });
  }, 'HIIT');
}

function abrirFormularioRutinaHiit() {
  const seleccionados = new Set();
  const marcado = (n) => seleccionados.has(n) ? 'checked' : '';
  abrirModal('Nueva rutina HIIT', `<form id="form-rutina-hiit" class="form-modal">
    <label>Nombre<input id="hiit-rutina-nombre" required maxlength="40"></label>
    <label>Descripción (opcional)<textarea id="hiit-rutina-descripcion" rows="2" maxlength="200"></textarea></label>
    <div class="grid-form"><label>Vueltas<input id="hiit-rutina-vueltas" type="number" min="1" value="8"></label><label>Actividad (s)<input id="hiit-rutina-actividad" type="number" min="1" value="30"></label><label>Descanso (s)<input id="hiit-rutina-descanso" type="number" min="0" value="20"></label></div>
    <fieldset><legend>Ejercicios (elige el orden en que quieres que roten)</legend><div id="hiit-rutina-ejercicios">${BANCO_EJERCICIOS_HIIT.map((e) => `<label class="opcion-modalidad"><input type="checkbox" data-ejercicio-hiit="${escapeAtributo(e.nombre)}" ${marcado(e.nombre)}><span>${escapeHTML(e.nombre)}${e.imagen ? '' : ' <small>(sin foto)</small>'}</span></label>`).join('')}</div></fieldset>
    <button class="btn-primario">Guardar rutina</button>
  </form>`, (c) => {
    c.querySelector('#form-rutina-hiit').onsubmit = (e) => {
      e.preventDefault();
      const elegidos = [...c.querySelectorAll('[data-ejercicio-hiit]:checked')].map((chk) => BANCO_EJERCICIOS_HIIT.find((ej) => ej.nombre === chk.dataset.ejercicioHiit));
      try {
        const rutina = normalizarRutinaHiit({
          nombre: c.querySelector('#hiit-rutina-nombre').value,
          descripcion: c.querySelector('#hiit-rutina-descripcion').value,
          vueltas: c.querySelector('#hiit-rutina-vueltas').value,
          actividadSeg: c.querySelector('#hiit-rutina-actividad').value,
          descansoSeg: c.querySelector('#hiit-rutina-descanso').value,
          ejercicios: elegidos,
        });
        guardar((d) => { d.rutinasHiit = d.rutinasHiit || []; d.rutinasHiit.push(rutina); }, 'guardar_rutina_hiit', rutina.id);
        abrirRutinasHiit();
      } catch (err) { S.toast(err.message, true); }
    };
  }, 'HIIT');
}

function iniciarHiit(rutina) {
  const config = rutina
    ? { vueltas: rutina.vueltas, actividadSeg: rutina.actividadSeg, descansoSeg: rutina.descansoSeg }
    : { vueltas: Number(document.getElementById('hiit-vueltas').value), actividadSeg: Number(document.getElementById('hiit-actividad').value), descansoSeg: Number(document.getElementById('hiit-descanso').value) };
  try { calcularDuracionHiit(config); } catch (err) { return S.toast(err.message, true); }
  S.hiit = {
    id: uid(), ...config, planeadoSeg: calcularDuracionHiit(config), inicioMs: Date.now(), pausaMs: 0, pausaInicio: null,
    faseIndice: -1, cuentaFinMs: Date.now() + 3000, estado: 'cuenta', sonidos: new Set(),
    nombre: rutina?.nombre || '', ejercicios: rutina?.ejercicios || null,
  };
  S.sonidosEmitidos.clear();
  clearInterval(S.intervalo); S.intervalo = setInterval(tickHiit, 200); solicitarWake(); tickHiit();
}

function fasesHiit(h) { const xs = []; for (let i = 1; i <= h.vueltas; i++) { xs.push({ tipo: 'actividad', seg: h.actividadSeg, vuelta: i }); if (i < h.vueltas) xs.push({ tipo: 'descanso', seg: h.descansoSeg, vuelta: i }); } return xs; }
function estadoHiit() { const h = S.hiit, ahora = h.pausaInicio || Date.now(); if (h.estado === 'cuenta') return { tipo: 'cuenta', restante: Math.max(0, Math.ceil((h.cuentaFinMs - ahora) / 1000)), vuelta: 0, transcurrido: 0 }; let t = Math.max(0, Math.floor((ahora - h.actividadInicioMs - h.pausaMs) / 1000)), indice = 0; for (const f of fasesHiit(h)) { if (t < f.seg) return { ...f, restante: f.seg - t, indice, transcurrido: Math.floor((ahora - h.actividadInicioMs - h.pausaMs) / 1000) }; t -= f.seg; indice++; } return { tipo: 'final', restante: 0, transcurrido: h.planeadoSeg }; }
function tickHiit() { if (!S.hiit || S.hiit.pausaInicio) return renderHiitActivo(); const e = estadoHiit(); if (S.hiit.estado === 'cuenta' && e.restante <= 0) { S.hiit.estado = 'activo'; S.hiit.actividadInicioMs = Date.now(); S.hiit.pausaMs = 0; S.hiit.faseIndice = 0; beep('largo'); } else { const clave = `${e.indice ?? -1}-${e.tipo}-${e.restante}`; if (e.tipo === 'descanso' && e.indice !== S.hiit.faseIndice) { S.hiit.faseIndice = e.indice; emitirSonidos(['rapido', 'rapido', 'rapido']); } else if (e.tipo === 'actividad' && e.indice !== S.hiit.faseIndice) { S.hiit.faseIndice = e.indice; beep('largo'); } emitirUnaVez(clave, sonidosEnSegundo({ tipo: e.tipo, restanteSeg: e.restante })); if (e.tipo === 'final') return finalizarHiit(false); } renderHiitActivo(); }

function renderHiitActivo() {
  const p = document.getElementById('ejercicio-panel'), e = estadoHiit();
  // Fase 5: qué ejercicio toca en esta vuelta, rotando la lista de la
  // rutina elegida. Solo aplica en fase 'actividad' y si el HIIT arrancó
  // desde una rutina (el manual/sin rutina no tiene ejercicios que mostrar).
  const ejercicioActual = (e.tipo === 'actividad' && S.hiit.ejercicios?.length) ? S.hiit.ejercicios[(e.vuelta - 1) % S.hiit.ejercicios.length] : null;
  const ejercicioHtml = ejercicioActual ? `<div class="hiit-ejercicio-actual">${ejercicioActual.imagen ? `<img src="${escapeAtributo(ejercicioActual.imagen)}" alt="${escapeAtributo(ejercicioActual.nombre)}" loading="lazy">` : ''}<b>${escapeHTML(ejercicioActual.nombre)}</b></div>` : '';
  p.innerHTML = `<section class="hiit-activo ${e.tipo}"><small>${S.hiit.pausaInicio ? 'PAUSADO' : e.tipo === 'cuenta' ? 'PREPÁRATE' : e.tipo.toUpperCase()}</small><strong>${e.restante}</strong><span>${e.vuelta ? `Vuelta ${e.vuelta}/${S.hiit.vueltas}` : 'Comienza en'}</span>${ejercicioHtml}<div class="acciones"><button id="hiit-pausa">${S.hiit.pausaInicio ? 'Reanudar' : 'Pausar'}</button><button id="hiit-detener">Detener</button></div></section>`;
  p.querySelector('#hiit-pausa').onclick = alternarPausaHiit; p.querySelector('#hiit-detener').onclick = () => finalizarHiit(true);
}
function alternarPausaHiit() { const h = S.hiit; if (h.pausaInicio) { const pausa = Date.now() - h.pausaInicio; if (h.estado === 'cuenta') h.cuentaFinMs += pausa; else h.pausaMs += pausa; h.pausaInicio = null; solicitarWake(); } else { h.pausaInicio = Date.now(); liberarWake(); } renderHiitActivo(); }
function finalizarHiit(detenido) { if (!S.hiit) return; const h = S.hiit, e = estadoHiit(), real = detenido ? Math.min(h.planeadoSeg, e.transcurrido || 0) : h.planeadoSeg; const r = { id: h.id, nombre: h.nombre || 'HIIT', fecha: iso(), vueltas: h.vueltas, actividadSeg: h.actividadSeg, descansoSeg: h.descansoSeg, duracionPlaneadaSeg: h.planeadoSeg, duracionRealSeg: real, porcentaje: detenido ? Math.round(real / h.planeadoSeg * 100) : 100, estado: detenido ? 'detenida' : 'completada', creadoEn: iso(), modificadoEn: iso() }; guardar((d) => d.hiits.push(r), 'guardar_hiit', r.id); S.hiit = null; clearInterval(S.intervalo); liberarWake(); beep('final'); renderHiit(); }

const SONIDOS = { rapido: 'audio/rapido.mp3', cuenta: 'audio/cuenta.mp3', largo: 'audio/largo.mp3', final: 'audio/final.mp3' };
function beep(tipo) { try { const a = new Audio(SONIDOS[tipo]); a.volume = .6; a.play().catch(() => {}); } catch {} }
function emitirSonidos(tipos) { tipos.forEach((tipo, i) => setTimeout(() => beep(tipo), i * 170)); }
function emitirUnaVez(clave, tipos) { if (!tipos.length || S.sonidosEmitidos.has(clave)) return; S.sonidosEmitidos.add(clave); emitirSonidos(tipos); }
async function solicitarWake() { try { S.wake = await navigator.wakeLock?.request('screen'); } catch { S.wake = null; } }
function liberarWake() { S.wake?.release().catch(() => {}); S.wake = null; }

function renderProgreso() {
  const p = document.getElementById('ejercicio-panel'), sesiones = filtrarPeriodo(S.datos.sesiones || [], S.periodo), hiits = filtrarPeriodo(S.datos.hiits || [], S.periodo), wrs = filtrarPeriodo(S.datos.wrs || [], S.periodo), series = seriesContables(sesiones), m = resumenModalidades(series), h = resumenHiit(hiits), w = resumenWr(wrs);
  p.innerHTML = `<section class="progreso-ejercicio"><header><div><small>TU CONSTANCIA</small><h1>Progreso</h1></div><div class="filtros-periodo"><button data-periodo="semana" class="${S.periodo === 'semana' ? 'activo' : ''}" aria-pressed="${S.periodo === 'semana'}">Semana</button><button data-periodo="mes" class="${S.periodo === 'mes' ? 'activo' : ''}" aria-pressed="${S.periodo === 'mes'}">Mes</button><button data-periodo="total" class="${S.periodo === 'total' ? 'activo' : ''}" aria-pressed="${S.periodo === 'total'}">Total</button></div></header><button type="button" id="ver-analisis-completo" class="btn-discreto">📊 Ver análisis completo</button><div class="kpis-ejercicio"><div><b>${sesiones.filter((s) => s.estado === 'completada').length}</b><span>Sesiones</span></div><div><b>${series.length}</b><span>Series</span></div><div><b>${descansoPromedio(series)}s</b><span>Descanso promedio</span></div><div><b>${h.minutos}m</b><span>HIIT activo</span></div><div><b>${h.porcentajePromedio}%</b><span>HIIT promedio</span></div><div><b>${h.abandonos}</b><span>Abandonos</span></div></div><article class="tarjeta marca-resumen"><h3>Mejores esfuerzos</h3><p>Discos × reps: grandes ${m.discos.grande}, chicos ${m.discos.chico}</p><p>Nivel máximo ${m.niveles.mejor} · PC ${m.PC.repeticiones} reps</p></article><article class="tarjeta"><h3>Historial</h3><div class="historial-entrenamiento">${[...sesiones, ...hiits, ...wrs].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map((r) => `<div><span><b>${escapeHTML(r.nombre || 'Entrenamiento')}</b><small>${escapeHTML(String(r.fecha || '').slice(0, 10))} · ${escapeHTML(r.estado)}</small></span><div><button data-editar-registro="${r.id}">Editar</button><button data-eliminar="${r.id}">Eliminar</button></div></div>`).join('') || '<p class="estado-vacio">Sin registros en este periodo.</p>'}</div></article><article class="tarjeta"><h3>Caminar / Correr</h3><div class="kpis-ejercicio"><div><b>${w.sesiones}</b><span>Sesiones</span></div><div><b>${w.minutosCaminando}m</b><span>Caminando</span></div><div><b>${w.minutosCorriendo}m</b><span>Corriendo</span></div><div><b>${w.minutosTotales}m</b><span>Total</span></div></div>${w.ultima ? `<p class="texto-suave">Última: ${escapeHTML(w.ultima.nombre || 'Sesión')} · ${escapeHTML(String(w.ultima.fecha || '').slice(0, 10))} · ${w.ultima.porcentaje}% completado</p>` : '<p class="estado-vacio">Sin sesiones de caminar/correr en este periodo.</p>'}</article></section>`;
  p.querySelectorAll('[data-periodo]').forEach((b) => b.onclick = () => { S.periodo = b.dataset.periodo; renderProgreso(); });
  p.querySelector('#ver-analisis-completo').onclick = abrirAnalisisCompleto;
  p.querySelectorAll('[data-editar-registro]').forEach((b) => b.onclick = () => abrirEditarRegistro(b.dataset.editarRegistro));
  p.querySelectorAll('[data-eliminar]').forEach((b) => b.onclick = () => { if (!confirm('¿Eliminar este registro?')) return; guardar((d) => { d.sesiones = d.sesiones.filter((x) => x.id !== b.dataset.eliminar); d.hiits = d.hiits.filter((x) => x.id !== b.dataset.eliminar); d.wrs = (d.wrs || []).filter((x) => x.id !== b.dataset.eliminar); }, 'eliminar_registro', b.dataset.eliminar); renderProgreso(); });
}

// Análisis deportivo completo: volumen semanal por músculo, balance,
// progreso por ejercicio, zona de repeticiones, descansos y HIIT. Se abre
// como modal (igual que el catálogo) en vez de una vista nueva, para no
// tocar la pantalla de Progreso que ya funciona bien.
function abrirAnalisisCompleto() {
  const todasSesiones = S.datos.sesiones || [], todosHiits = S.datos.hiits || [], categorias = (S.datos.categorias || []).filter((c) => c.activo !== false), ejercicios = S.datos.ejercicios || [];
  const sesionesSemana = filtrarPeriodo(todasSesiones, 'semana');
  const volumen = volumenPorGrupo(sesionesSemana, ejercicios, categorias);
  const frecuencia = frecuenciaPorGrupo(sesionesSemana, ejercicios, categorias);
  const patron = balancePatron(sesionesSemana, ejercicios);
  const superiorInferior = balanceSuperiorInferior(sesionesSemana, ejercicios);
  const atrasados = musculosAtrasados(todasSesiones, ejercicios, categorias);
  const seriesTodas = seriesContables(todasSesiones);
  const zonas = zonaRepeticiones(seriesTodas);
  const descanso = descansoRealVsProgramado(seriesTodas);
  const ratioHiit = ratioTrabajoDescansoHiit(todosHiits);
  const rachaInfo = constancia(todasSesiones, todosHiits);

  const idsEntrenados = [...new Set(todasSesiones.flatMap((s) => (s.series || []).map((x) => x.ejercicioId)))];
  const filasEjercicio = idsEntrenados.map((id) => {
    const ej = ejercicios.find((e) => e.id === id);
    if (!ej) return '';
    const mejor = mejorSerieHistorica(todasSesiones, id);
    const estancado = detectarEstancamiento(todasSesiones, id);
    return `<div><span><b>${escapeHTML(ej.nombre)}</b><small>Mejor: ${mejor ? `${mejor.valor} ${mejor.unidad === 'niveles' ? 'nivel' : 'reps'}` : '—'}${estancado ? ' · sin mejora en 4 semanas' : ''}</small></span></div>`;
  }).filter(Boolean).join('') || '<p class="estado-vacio">Todavía no hay ejercicios entrenados.</p>';

  const html = `
    <article class="tarjeta"><h3>Volumen semanal por músculo</h3><p class="texto-suave" style="margin-top:0">Referencia: 10-20 series por semana por músculo.</p>
      <div class="historial-entrenamiento">${volumen.map((v) => `<div><span><b>${escapeHTML(v.nombre)}</b><small>${v.series} series · ${frecuencia.find((f) => f.nombre === v.nombre)?.dias || 0} día(s)/semana</small></span><span class="badge">${v.etiqueta === 'bajo' ? 'Bajo' : v.etiqueta === 'alto' ? 'Alto' : 'En rango'}</span></div>`).join('')}</div>
    </article>
    <article class="tarjeta"><h3>Balance y riesgo</h3>
      <p>Empuje ${patron.empuje} · Tirón ${patron.tiron} · Pierna ${patron.pierna} · Core ${patron.core}</p>
      <p>${escapeHTML(patron.mensaje)}</p>
      <p>${escapeHTML(superiorInferior.mensaje)} (superior ${superiorInferior.superior} · pierna ${superiorInferior.inferior})</p>
    </article>
    <article class="tarjeta"><h3>Músculos atrasados</h3>
      <div class="historial-entrenamiento">${atrasados.map((a) => `<div><span><b>${escapeHTML(a.nombre)}</b><small>${a.dias == null ? 'sin entrenar todavía' : `hace ${a.dias} día(s)${a.recuperado ? '' : ' · aún en recuperación'}`}</small></span></div>`).join('')}</div>
    </article>
    <article class="tarjeta"><h3>Progreso por ejercicio</h3>
      <div class="historial-entrenamiento">${filasEjercicio}</div>
    </article>
    <article class="tarjeta"><h3>Zona de repeticiones</h3>
      <p>Fuerza (1-5): ${zonas.fuerza} · Hipertrofia (6-12): ${zonas.hipertrofia} · Resistencia (13+): ${zonas.resistencia}</p>
      <p>${zonas.dominante ? `Entrenas sobre todo en zona de <b>${escapeHTML(zonas.dominante)}</b>.` : 'Sin series registradas todavía.'}</p>
    </article>
    <article class="tarjeta"><h3>Descansos</h3>
      <p>Real ${descanso.real}s vs. programado ${descanso.planeado}s (${descanso.cumplimientoPct}% de cumplimiento).</p>
      <p class="texto-suave" style="margin-top:0">Menos de 90s favorece hipertrofia/metabólico · 2-5 min favorece fuerza.</p>
    </article>
    <article class="tarjeta"><h3>HIIT</h3>
      ${ratioHiit ? `<p>Trabajo ${ratioHiit.actividadProm}s / descanso ${ratioHiit.descansoProm}s (ratio ${ratioHiit.ratio}:1).</p><p>${escapeHTML(ratioHiit.sistema)}</p>` : '<p class="estado-vacio">Sin HIIT registrado todavía.</p>'}
    </article>
    <article class="tarjeta"><h3>Constancia</h3>
      <p>Racha actual: ${rachaInfo.rachaDias} día(s) · Completadas ${rachaInfo.completadas} · Descartadas ${rachaInfo.descartadas} · Días activos ${rachaInfo.diasActivos}</p>
    </article>
  `;
  abrirModal('Análisis completo', html, () => {}, 'ANÁLISIS');
}

function abrirEditarRegistro(id) {
  const lista = S.datos.sesiones.some((x) => x.id === id) ? 'sesiones' : 'hiits';
  const registro = structuredClone(S.datos[lista].find((x) => x.id === id));
  if (lista === 'hiits') {
    abrirModal('Editar HIIT', `<form id="form-registro" class="form-modal"><label>Nombre<input id="registro-nombre" value="${escapeAtributo(registro.nombre || 'HIIT')}"></label><label>Vueltas<input id="registro-vueltas" type="number" min="1" value="${registro.vueltas}"></label><label>Actividad (s)<input id="registro-actividad" type="number" min="1" value="${registro.actividadSeg}"></label><label>Descanso (s)<input id="registro-descanso" type="number" min="0" value="${registro.descansoSeg}"></label><label>Duración real (s)<input id="registro-real" type="number" min="0" value="${registro.duracionRealSeg}"></label><button class="btn-primario">Guardar cambios</button></form>`, (c) => { c.querySelector('#form-registro').onsubmit = (e) => { e.preventDefault(); Object.assign(registro, { nombre: c.querySelector('#registro-nombre').value.trim(), vueltas: Number(c.querySelector('#registro-vueltas').value), actividadSeg: Number(c.querySelector('#registro-actividad').value), descansoSeg: Number(c.querySelector('#registro-descanso').value), duracionRealSeg: Number(c.querySelector('#registro-real').value), modificadoEn: iso() }); registro.duracionPlaneadaSeg = calcularDuracionHiit(registro); registro.porcentaje = Math.min(100, Math.round(registro.duracionRealSeg / registro.duracionPlaneadaSeg * 100)); guardar((d) => { d.hiits[d.hiits.findIndex((x) => x.id === id)] = registro; }, 'editar_registro', id); cerrarModal(); renderProgreso(); }; }, 'HISTORIAL');
  } else {
    abrirModal('Editar entrenamiento', `<form id="form-registro" class="form-modal"><label>Nombre<input id="registro-nombre" value="${escapeAtributo(registro.nombre || '')}"></label><div class="constructor-rutina">${(registro.series || []).map((s, i) => `<article data-serie-historial="${i}"><b>${escapeHTML(S.datos.ejercicios.find((x) => x.id === s.ejercicioId)?.nombre || 'Ejercicio')}</b><div class="grid-form"><label>Reps<input data-historial="repeticiones" type="number" min="1" value="${s.repeticiones}"></label><label>Descanso real<input data-historial="descansoRealSeg" type="number" min="0" value="${s.descansoRealSeg || 0}"></label></div></article>`).join('')}</div><button class="btn-primario">Guardar cambios</button></form>`, (c) => { c.querySelector('#form-registro').onsubmit = (e) => { e.preventDefault(); registro.nombre = c.querySelector('#registro-nombre').value.trim(); c.querySelectorAll('[data-serie-historial]').forEach((art) => art.querySelectorAll('[data-historial]').forEach((inp) => { registro.series[Number(art.dataset.serieHistorial)][inp.dataset.historial] = Number(inp.value); })); registro.modificadoEn = iso(); guardar((d) => { d.sesiones[d.sesiones.findIndex((x) => x.id === id)] = registro; }, 'editar_registro', id); cerrarModal(); renderProgreso(); }; }, 'HISTORIAL');
  }
}
