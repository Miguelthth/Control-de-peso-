// Launcher: login (URL → usuario → PIN o sin PIN) y los dos botones grandes.

import { getUrl, setUrl, getUsuario, getRol, esAdmin, iniciarSesion, cerrarSesion } from '../shared/sesion.js';
import * as api from '../shared/api.js';
import * as passkey from '../shared/passkey.js';
import * as candado from '../shared/candado.js';
import * as fondo from '../shared/fondo.js';

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
async function entrarConFaceId(usuario) {
  try {
    await passkey.verificar(usuario);
  } catch (e) {
    mostrarErrorUsuario(e.message);
    return;
  }
  const datos = candado.leerCandado('launcher', usuario);
  if (!datos) {
    mostrarErrorUsuario('Face ID activado pero falta la info guardada en este dispositivo — entra normal esta vez.');
    return;
  }
  iniciarSesion(usuario, datos.rol);
  mostrarInicio();
}

function mostrarPantallaCandado(usuario) {
  mostrarPantalla('pantalla-candado');
  document.getElementById('candado-saludo').textContent = `Hola, ${usuario}`;
  document.getElementById('candado-texto').textContent = 'Confirma que eres tú para entrar.';
}

// Va colgada del botón, NO se dispara sola al abrir: ninguna app web puede
// lanzar Face ID sin que toques algo primero (Safari lo bloquea).
async function intentarCandado(usuario) {
  try {
    await passkey.verificar(usuario);
  } catch (e) {
    document.getElementById('candado-texto').textContent = e.message;
    return;
  }
  mostrarInicio();
}

// El callback corre DENTRO del click en "Sí, activar" -- ese es el toque que
// Safari necesita para dejar pasar el registro biométrico.
function popupFaceId(mensaje, onAceptar) {
  const fondo = document.getElementById('popup-faceid');
  document.getElementById('popup-faceid-mensaje').textContent = mensaje;
  fondo.classList.remove('oculto');
  const btnSi = document.getElementById('popup-faceid-si');
  const btnNo = document.getElementById('popup-faceid-no');
  const cerrar = () => {
    fondo.classList.add('oculto');
    btnSi.removeEventListener('click', onSi);
    btnNo.removeEventListener('click', onNo);
  };
  const onSi = () => { cerrar(); onAceptar(); };
  const onNo = () => cerrar();
  btnSi.addEventListener('click', onSi);
  btnNo.addEventListener('click', onNo);
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
  const pin = prompt('Para activar Face ID, confirma tu PIN actual (vacío si no tienes uno):') || '';
  try {
    const r = await api.validarPin(usuario, pin);
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
  const pinAdmin = prompt('Tu PIN (vacío si no tienes uno):') || '';
  try {
    const r = await api.crearUsuario(getUsuario(), pinAdmin, nombreNuevo.trim(), esOtroAdmin ? 'admin' : 'normal');
    if (r.ok) alert(`Listo, "${nombreNuevo.trim()}" ya puede entrar (sin PIN hasta que decida ponerse uno).`);
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
  try {
    const r = await api.validarUsuario(usuario);
    if (!r.ok) {
      mostrarErrorUsuario('Usuario incorrecto');
      return;
    }
    usuarioTemp = usuario;
    rolTemp = r.rol;
    if (r.tienePin) {
      mostrarPantalla('pantalla-pin');
      document.getElementById('pin-input').value = '';
      document.getElementById('pin-error').classList.add('oculto');
      document.getElementById('pin-input').focus();
    } else {
      mostrarPantalla('pantalla-pin-nuevo');
    }
  } catch (e) {
    mostrarErrorUsuario('No se pudo validar (¿la URL es correcta?): ' + e.message);
  }
}

async function continuarPin() {
  const pin = document.getElementById('pin-input').value;
  try {
    const r = await api.validarPin(usuarioTemp, pin);
    if (!r.ok) {
      mostrarErrorPin('PIN incorrecto');
      return;
    }
    iniciarSesion(usuarioTemp, rolTemp);
    mostrarInicio();
    ofrecerFaceId(usuarioTemp, rolTemp, pin);
  } catch (e) {
    mostrarErrorPin('No se pudo validar: ' + e.message);
  }
}

async function guardarPinNuevo() {
  const pin = document.getElementById('pin-nuevo-input').value;
  if (!/^\d{4}$/.test(pin)) {
    alert('El PIN debe ser de 4 dígitos');
    return;
  }
  await api.crearPin(usuarioTemp, pin);
  iniciarSesion(usuarioTemp, rolTemp);
  mostrarInicio();
  ofrecerFaceId(usuarioTemp, rolTemp, pin);
}

function entrarSinPin() {
  iniciarSesion(usuarioTemp, rolTemp);
  mostrarInicio();
  ofrecerFaceId(usuarioTemp, rolTemp, '');
}

function wireEventos() {
  document.getElementById('btn-url-continuar').addEventListener('click', () => {
    const v = document.getElementById('url-input').value.trim();
    if (!v) return;
    setUrl(v);
    mostrarPantalla('pantalla-usuario');
  });

  document.getElementById('btn-usuario-continuar').addEventListener('click', continuarUsuario);
  document.getElementById('usuario-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') continuarUsuario();
  });

  document.getElementById('btn-pin-continuar').addEventListener('click', continuarPin);
  document.getElementById('pin-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') continuarPin();
  });

  document.getElementById('btn-pin-nuevo-mostrar').addEventListener('click', () => {
    document.getElementById('pin-nuevo-input').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-guardar').classList.remove('oculto');
    document.getElementById('btn-pin-nuevo-mostrar').classList.add('oculto');
  });
  document.getElementById('btn-pin-nuevo-guardar').addEventListener('click', guardarPinNuevo);
  document.getElementById('btn-sin-pin').addEventListener('click', entrarSinPin);

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    cerrarSesion();
    document.getElementById('usuario-input').value = '';
    mostrarPantalla('pantalla-usuario');
    renderFaceIdUsuarios();
  });

  document.getElementById('btn-agregar-usuario').addEventListener('click', agregarUsuario);
  document.getElementById('btn-candado-entrar').addEventListener('click', () => intentarCandado(getUsuario()));
  document.getElementById('btn-candado-pin').addEventListener('click', () => {
    const usuario = getUsuario();
    cerrarSesion();
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
  if (getUsuario()) {
    // Sesión ya guardada -- si activaste Face ID para este usuario, hay que
    // re-confirmar cada vez que se abre la app (no basta con haber entrado
    // una vez); si no lo activaste, entra directo como siempre. La pantalla
    // solo se MUESTRA aquí: el Face ID en sí espera tu toque en el botón.
    const usuario = getUsuario();
    if (candado.leerCandado('launcher', usuario) && (await passkey.disponible())) {
      mostrarPantallaCandado(usuario);
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
    navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {});
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
