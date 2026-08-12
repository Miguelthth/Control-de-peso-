// Launcher: login (URL → usuario → PIN) y los dos botones grandes.

import { getUrl, setUrl, getUsuario, getRol, esAdmin, iniciarSesion, cerrarSesionEnSegundoPlano, guardarClaveSesion, ejecutarUnaVez, leerToken, sesionAutenticada, accesoFaceIdValido, guardarPerfilConocido, leerPerfilConocido } from '../shared/sesion.js';
import * as api from '../shared/api.js';
import * as passkey from '../shared/passkey.js';
import * as candado from '../shared/candado.js';
import * as fondo from '../shared/fondo.js';
import { exigirBackendActual, guardarToken, borrarToken, pinNuevoValido } from '../shared/autorizacion.js';

api.configurarManejadorAuth(() => {
  cerrarSesionEnSegundoPlano(() => undefined);
  location.href = 'index.html';
});

let usuarioTemp = null;
let rolTemp = null;

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function renderFaceIdUsuarios() {
  const cont = document.getElementById('faceid-usuarios');
  // Solo los que además tienen su PIN cacheado aquí -- si el passkey se creó
  // desde Gastos, el launcher no tiene con qué entrar y el botón sobraría.
  const registrados = passkey.usuariosRegistrados().filter((u) => candado.leerCandado('launcher', u));
  if (!registrados.length || !(await passkey.disponible())) {
    cont.classList.add('oculto');
    cont.innerHTML = '';
    return;
  }
  cont.innerHTML = registrados
    .map((u) => `<button class="btn-faceid" data-usuario="${escapeHTML(u)}">🔒 Entrar como ${escapeHTML(u)} con Face ID</button>`)
    .join('') + '<p class="faceid-separador">— o escribe tu usuario —</p>';
  cont.classList.remove('oculto');
}

// OJO con TODAS las llamadas a passkey.*: Safari exige que salgan directo
// del toque del usuario. Por eso `verificar`/`registrar` van siempre como lo
// PRIMERO dentro de un handler de click -- nunca después de un await, un
// confirm() nativo, ni al cargar la página (ahí las rechaza en seco).
async function autenticarConFaceId(usuario, mostrarError) {
  try {
    await passkey.verificar(usuario);
  } catch (e) {
    mostrarError(e.message);
    return false;
  }
  const datos = candado.leerCandado('launcher', usuario);
  if (!datos) {
    mostrarError('Face ID activado pero falta la info guardada en este dispositivo — entra normal esta vez.');
    return false;
  }
  let acceso;
  try {
    acceso = await api.validarPin(usuario, datos.pin || '');
    exigirBackendActual(acceso, { requiereToken: true });
  } catch (e) {
    mostrarError('No se pudo validar la sesión: ' + e.message);
    return false;
  }
  if (!accesoFaceIdValido(acceso)) {
    mostrarError('La sesión expiró. Entra con tu PIN para continuar.');
    return false;
  }
  candado.marcarFaceIdConfirmado(); // Gastos no lo vuelve a pedir si entras ahí en los próximos minutos
  guardarClaveSesion(datos.pin || ''); // misma idea: Gastos la prueba sola, sin volver a preguntar
  iniciarSesion(usuario, datos.rol, acceso.token);
  mostrarInicio();
  return true;
}

function entrarConFaceId(usuario) {
  return autenticarConFaceId(usuario, mostrarErrorUsuario);
}

function mostrarPantallaCandado(usuario) {
  mostrarPantalla('pantalla-candado');
  document.getElementById('candado-saludo').textContent = `Hola, ${usuario}`;
  document.getElementById('candado-texto').textContent = 'Confirma que eres tú para entrar.';
}

// Va colgada del botón, NO se dispara sola al abrir: ninguna app web puede
// lanzar Face ID sin que toques algo primero (Safari lo bloquea).
function intentarCandado(usuario) {
  return autenticarConFaceId(usuario, (mensaje) => {
    document.getElementById('candado-texto').textContent = mensaje;
  });
}

// El callback corre DENTRO del click en "Sí, activar" -- ese es el toque que
// Safari necesita para dejar pasar el registro biométrico.
function popupFaceId(mensaje, onAceptar) {
  const focoAnterior = document.activeElement;
  const fondo = document.getElementById('popup-faceid');
  document.getElementById('popup-faceid-mensaje').textContent = mensaje;
  fondo.classList.remove('oculto');
  const btnSi = document.getElementById('popup-faceid-si');
  const btnNo = document.getElementById('popup-faceid-no');
  const cerrar = () => {
    fondo.classList.add('oculto');
    btnSi.removeEventListener('click', onSi);
    btnNo.removeEventListener('click', onNo);
    fondo.removeEventListener('keydown', onKey);
    focoAnterior?.focus?.();
  };
  const onSi = () => { cerrar(); onAceptar(); };
  const onNo = () => cerrar();
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    if (e.key === 'Tab' && e.shiftKey && document.activeElement === btnNo) { e.preventDefault(); btnSi.focus(); }
    else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === btnSi) { e.preventDefault(); btnNo.focus(); }
  };
  btnSi.addEventListener('click', onSi);
  btnNo.addEventListener('click', onNo);
  fondo.addEventListener('keydown', onKey);
  btnNo.focus();
}

// El passkey (registro biométrico) es UNO por usuario y sirve para las dos
// apps -- lo que decide si el launcher lo usa es si hay un PIN cacheado
// aquí (candado 'launcher'), no si el passkey existe (pudo haberse creado
// desde Gastos sin que el launcher lo sepa).
async function actualizarBotonesFaceId() {
  const motivo = await passkey.porQueNoDisponible();
  const disponible = motivo === null;
  const activado = disponible && !!candado.leerCandado('launcher', getUsuario());
  document.getElementById('btn-faceid-activar').classList.toggle('oculto', !disponible || activado);
  document.getElementById('btn-faceid-desactivar').classList.toggle('oculto', !activado);
  // Antes, si `disponible` salía falso, el botón se quedaba oculto sin
  // explicar por qué -- ahora el motivo (https, navegador, o sin sensor)
  // queda a la vista en vez de ser una caja negra.
  const elMotivo = document.getElementById('faceid-motivo');
  elMotivo.textContent = motivo ? '🔒 Face ID no disponible: ' + motivo : '';
  elMotivo.classList.toggle('oculto', !motivo);
}

// Esta función es la que va DENTRO del click del popup: el registro
// biométrico es lo primero que hace, sin nada en medio.
async function activarFaceIdConPin(usuario, rol, pin) {
  try {
    if (!passkey.tieneRegistro(usuario)) await passkey.registrar(usuario); // reusa el de Gastos si ya existe
    candado.guardarCandado('launcher', usuario, { pin, rol });
    candado.marcarFaceIdConfirmado();
    alert('Face ID activado ✓ — la próxima vez que abras la app te lo va a pedir.');
    actualizarBotonesFaceId();
  } catch (e) {
    alert('No se pudo activar Face ID: ' + e.message);
  }
}

// Se ofrece solo justo después de entrar con PIN por primera vez. El
// `await disponible()` va ANTES de mostrar el popup a propósito: lo que no
// puede llevar awaits en medio es el tramo entre el toque y el registro.
async function ofrecerFaceId(usuario, rol, pin) {
  if (candado.leerCandado('launcher', usuario)) return; // ya activado -- no volver a preguntar
  if (passkey.tieneRegistro(usuario)) {
    candado.guardarCandado('launcher', usuario, { pin, rol });
    actualizarBotonesFaceId();
    return;
  }
  if (!(await passkey.disponible())) return;
  popupFaceId(
    '¿Activar Face ID en este iPhone para no volver a teclear tu PIN?',
    () => activarFaceIdConPin(usuario, rol, pin)
  );
}

async function activarFaceId() {
  const usuario = getUsuario();
  const motivo = await passkey.porQueNoDisponible();
  if (motivo) {
    alert('No se puede activar Face ID aquí:\n\n' + motivo);
    return;
  }
  const pin = prompt('Para activar Face ID, confirma tu PIN actual:') || '';
  try {
    const r = await api.validarPin(usuario, pin);
    exigirBackendActual(r, { requiereToken: true });
    if (!r.ok) {
      alert('PIN incorrecto');
      return;
    }
  } catch (e) {
    alert('No se pudo confirmar: ' + e.message);
    return;
  }
  // El PIN ya quedó validado arriba; el registro se hace hasta que toques
  // el botón del popup, porque Safari lo exige (el prompt y la llamada de
  // red de arriba ya "gastaron" el toque original del botón de Ajustes).
  popupFaceId('Confirma para activar Face ID en este iPhone.', () => activarFaceIdConPin(usuario, getRol(), pin));
}

function desactivarFaceId() {
  // Solo borra el PIN cacheado del launcher -- el passkey en sí se queda
  // (lo puede seguir usando Gastos para su contraseña).
  candado.borrarCandado('launcher', getUsuario());
  actualizarBotonesFaceId();
}

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((p) => p.classList.add('oculto'));
  const pantalla = document.getElementById(id);
  pantalla.classList.remove('oculto');
  // Enfoca el primer campo de texto -- ej. usuario-input no lo tenía y por
  // eso no salía el teclado solo. En iOS esto solo funciona si viene de un
  // toque (un botón que llamó a mostrarPantalla); al abrir la app por
  // primera vez, sin gesto, iOS lo ignora -- eso ya no depende del código.
  const campo = pantalla.querySelector('input[type="text"], input[type="password"]');
  if (campo) campo.focus();
}

// El fondo se ELIGE desde Peso → Ajustes, no aquí -- esto solo lo pinta,
// leyéndolo de la misma IndexedDB (mismo origen para las 3 apps).
let urlFondoActual = null;
async function cargarFondoGuardado() {
  try {
    const blob = await fondo.leerFondo(getUsuario());
    const el = document.getElementById('fondo-personalizado');
    if (urlFondoActual) URL.revokeObjectURL(urlFondoActual);
    urlFondoActual = blob ? URL.createObjectURL(blob) : null;
    el.style.backgroundImage = urlFondoActual ? `url(${urlFondoActual})` : '';
    el.classList.toggle('oculto', !urlFondoActual);
  } catch {
    // IndexedDB no disponible o falló -- no es crítico, la app sigue sin fondo.
  }
}

function mostrarInicio() {
  document.getElementById('saludo').textContent = `Hola, ${getUsuario()}`;
  document.getElementById('btn-agregar-usuario').classList.toggle('oculto', !esAdmin());
  mostrarPantalla('pantalla-inicio');
  actualizarBotonesFaceId();
  cargarFondoGuardado();
}

async function agregarUsuario() {
  const nombreNuevo = prompt('Nombre del usuario nuevo:');
  if (!nombreNuevo || !nombreNuevo.trim()) return;
  const esOtroAdmin = confirm('¿Este usuario también es administrador?\n\nAceptar = sí, administrador.\nCancelar = no, usuario normal.');
  try {
    const r = await api.crearUsuario(nombreNuevo.trim(), esOtroAdmin ? 'admin' : 'normal');
    exigirBackendActual(r);
    if (r.ok && r.codigoActivacion) alert(`Usuario creado. Código de activación de un solo uso para ${nombreNuevo.trim()}:\n\n${r.codigoActivacion}\n\nEntrégaselo por un canal privado; no volverá a mostrarse.`);
    else alert(r.error || 'No se pudo crear');
  } catch (e) {
    alert('No se pudo crear: ' + e.message);
  }
}

function mostrarErrorUsuario(msg) {
  const el = document.getElementById('usuario-error');
  el.textContent = msg;
  el.classList.remove('oculto');
}

function mostrarErrorPin(msg) {
  const el = document.getElementById('pin-error');
  el.textContent = msg;
  el.classList.remove('oculto');
}

async function continuarUsuario() {
  const usuario = document.getElementById('usuario-input').value.trim();
  if (!usuario) return;
  document.getElementById('usuario-error').classList.add('oculto');
  const conocido = leerPerfilConocido(usuario);
  if (conocido?.tienePin) {
    usuarioTemp = conocido.usuario;
    rolTemp = conocido.rol;
    mostrarPantallaPin();
    return;
  }
  try {
    const r = await api.validarUsuario(usuario);
    exigirBackendActual(r);
    if (!r.ok) {
      mostrarErrorUsuario('Usuario incorrecto');
      return;
    }
    usuarioTemp = usuario;
    rolTemp = r.rol;
    guardarPerfilConocido(usuario, r.rol, r.tienePin);
    if (r.tienePin) {
      mostrarPantallaPin();
    } else {
      mostrarPantalla('pantalla-pin-nuevo');
      document.getElementById('codigo-activacion-input').value = '';
      document.getElementById('codigo-activacion-input').disabled = false;
      document.getElementById('activacion-error').classList.add('oculto');
      document.getElementById('pin-nuevo-input').classList.add('oculto');
      document.getElementById('btn-pin-nuevo-guardar').classList.add('oculto');
      document.getElementById('btn-pin-nuevo-mostrar').classList.remove('oculto');
    }
  } catch (e) {
    mostrarErrorUsuario('No se pudo validar (¿la URL es correcta?): ' + e.message);
  }
}

function mostrarPantallaPin() {
  mostrarPantalla('pantalla-pin');
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-error').classList.add('oculto');
  document.getElementById('pin-input').focus();
}

function volverAUsuario() {
  document.getElementById('pin-input').value = '';
  document.getElementById('codigo-activacion-input').value = '';
  mostrarPantalla('pantalla-usuario');
  document.getElementById('usuario-input').focus();
}

async function continuarPin() {
  const pin = document.getElementById('pin-input').value;
  const boton = document.getElementById('btn-pin-continuar');
  boton.textContent = 'Verificando…';
  try {
    const r = await api.validarPin(usuarioTemp, pin);
    exigirBackendActual(r, { requiereToken: true });
    if (!r.ok) {
      mostrarErrorPin('PIN incorrecto');
      return;
    }
    iniciarSesion(usuarioTemp, r.rol || rolTemp, r.token);
    guardarClaveSesion(pin); // Gastos la prueba sola al abrir, sin volver a preguntar
    mostrarInicio();
    ofrecerFaceId(usuarioTemp, rolTemp, pin);
  } catch (e) {
    mostrarErrorPin('No se pudo validar: ' + e.message);
  } finally {
    boton.textContent = 'Entrar';
  }
}

async function validarCodigoActivacion() {
  const codigo = document.getElementById('codigo-activacion-input').value.trim();
  const error = document.getElementById('activacion-error');
  error.classList.add('oculto');
  if (!/^\d{8,}$/.test(codigo)) {
    error.textContent = 'El código de activación debe tener al menos 8 dígitos.';
    error.classList.remove('oculto');
    return;
  }
  try {
    const r = await api.validarActivacion(usuarioTemp, codigo);
    exigirBackendActual(r, { requiereToken: true });
    if (!r.ok) throw new Error(r.error || 'Código de activación incorrecto');
    guardarToken(r.token);
    document.getElementById('codigo-activacion-input').disabled = true;
    document.getElementById('pin-nuevo-input').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-guardar').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-mostrar').classList.add('oculto');
    document.getElementById('pin-nuevo-input').focus();
  } catch (e) {
    borrarToken();
    error.textContent = e.message;
    error.classList.remove('oculto');
  }
}

async function guardarPinNuevo() {
  const pin = document.getElementById('pin-nuevo-input').value;
  if (!pinNuevoValido(pin)) {
    alert('La contraseña debe tener al menos 6 caracteres');
    return;
  }
  const r = await api.crearPin(usuarioTemp, pin);
  exigirBackendActual(r, { requiereToken: true });
  if (!r.ok || !r.token) throw new Error(r.error || 'No se pudo crear el PIN');
  iniciarSesion(usuarioTemp, r.rol || rolTemp, r.token);
  guardarClaveSesion(pin); // Gastos la prueba sola al abrir, sin volver a preguntar
  mostrarInicio();
  ofrecerFaceId(usuarioTemp, rolTemp, pin);
}

function wireEventos() {
  document.getElementById('btn-url-continuar').addEventListener('click', () => {
    const v = document.getElementById('url-input').value.trim();
    if (!v) return;
    setUrl(v);
    mostrarPantalla('pantalla-usuario');
  });

  document.getElementById('btn-usuario-continuar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, continuarUsuario));
  document.getElementById('usuario-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-usuario-continuar').click();
  });

  document.getElementById('btn-pin-continuar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, continuarPin));
  document.getElementById('btn-pin-volver').addEventListener('click', volverAUsuario);
  document.getElementById('btn-activacion-volver').addEventListener('click', volverAUsuario);
  document.getElementById('pin-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-pin-continuar').click();
  });

  document.getElementById('btn-pin-nuevo-mostrar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, validarCodigoActivacion));
  document.getElementById('btn-pin-nuevo-guardar').addEventListener('click', (e) => ejecutarUnaVez(e.currentTarget, guardarPinNuevo));

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    cerrarSesionEnSegundoPlano(api.cerrarSesionServidor);
    document.getElementById('usuario-input').value = '';
    mostrarPantalla('pantalla-usuario');
    renderFaceIdUsuarios();
  });

  document.getElementById('btn-agregar-usuario').addEventListener('click', agregarUsuario);
  document.getElementById('btn-candado-entrar').addEventListener('click', () => intentarCandado(getUsuario()));
  document.getElementById('btn-candado-pin').addEventListener('click', () => {
    const usuario = getUsuario();
    cerrarSesionEnSegundoPlano(api.cerrarSesionServidor);
    document.getElementById('usuario-input').value = usuario;
    mostrarPantalla('pantalla-usuario');
    renderFaceIdUsuarios();
  });
  document.getElementById('btn-faceid-activar').addEventListener('click', activarFaceId);
  document.getElementById('btn-faceid-desactivar').addEventListener('click', desactivarFaceId);
  document.getElementById('faceid-usuarios').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-faceid[data-usuario]');
    if (btn) entrarConFaceId(btn.dataset.usuario);
  });
}

async function init() {
  wireEventos();
  if (!getUrl()) {
    mostrarPantalla('pantalla-url');
    return;
  }
  if (sesionAutenticada(getUsuario(), leerToken())) {
    // Sesión ya guardada -- si activaste Face ID para este usuario, hay que
    // re-confirmar cada vez que se abre la app (no basta con haber entrado
    // una vez); si no lo activaste, entra directo como siempre. La pantalla
    // solo se MUESTRA aquí: el Face ID en sí espera tu toque en el botón.
    const usuario = getUsuario();
    cargarFondoGuardado(); // aquí, no solo en mostrarInicio() -- si no, la
    // pantalla de candado (Face ID), que es la PRIMERA que ves al reabrir la
    // app, se quedaba sin fondo hasta que pasabas de esa pantalla.
    //
    // Optimista a propósito: NO se espera a passkey.disponible() (esa
    // consulta al sensor tarda un rato y era justo el "tarda en aparecer")
    // para decidir qué pantalla mostrar -- si hay PIN cacheado, se muestra
    // la pantalla de candado de una vez; si el sensor resulta no estar
    // disponible, intentarCandado() ya lo explica ahí mismo con un mensaje
    // claro y el botón de "Usar mi PIN" sigue ahí como respaldo.
    if (candado.leerCandado('launcher', usuario)) {
      mostrarPantallaCandado(usuario);
      intentarCandado(usuario);
    } else {
      mostrarInicio();
    }
    return;
  }
  mostrarPantalla('pantalla-usuario');
  renderFaceIdUsuarios();
}

// Ver comentario igual en gastos/js/ui.js -- aquí con alert() porque el
// launcher no tiene toast propio (usa alert() para todo su feedback).
window.addEventListener('unhandledrejection', (e) => {
  console.error('Error sin atrapar:', e.reason);
  alert('Ocurrió un error: ' + (e.reason?.message || e.reason));
});

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  // registration.update() fuerza a revisar si hay un sw.js más nuevo,
  // saltándose el retraso normal del navegador -- sin cambiar la URL del
  // service worker en cada carga (eso sí llegó a causar recargas de más:
  // un ?ts= distinto cada vez podía hacer que el navegador tratara cada
  // apertura como "service worker nuevo" aunque no hubiera cambiado nada).
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((r) => {
      // El navegador solo revisa sw.js por su cuenta cada ~24h -- una PWA
      // abierta desde el ícono de inicio (retomada de segundo plano, sin
      // recarga completa) puede tardar horas o días en notar que hay una
      // versión nueva si no se le pregunta activamente. Mismo patrón que
      // COTIZADOR (2.- COTIZADOR/remision.html).
      const _revisar = () => r.update().catch(() => {});
      setInterval(_revisar, 5 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') _revisar(); });
      window.addEventListener('online', _revisar);
      return r.update();
    }).catch(() => {});
  });
  // En cuanto el service worker NUEVO toma control, recarga la página sola
  // -- así nadie tiene que cerrar y volver a abrir la app a mano. PERO si
  // hay un campo de texto con algo escrito, se espera a que la app pase a
  // segundo plano (visibilitychange) para no borrar lo que ibas a mandar.
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
