// ARCHIVO GENERADO por build.py (paquete "launcher") -- no editar a mano.
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

// ── shared/passkey.js ──────────────────────────────────────────
const passkey = (function () {
// Face ID / Touch ID vía WebAuthn -- candado LOCAL por dispositivo, no una
// autenticación remota real: no hay servidor (Apps Script no es buen lugar
// para verificar firmas WebAuthn) validando la respuesta del sensor. Lo que
// de verdad protege el dato sigue siendo el bloqueo del propio iPhone --
// esto solo evita volver a teclear el PIN o la contraseña en TU equipo cada
// vez que abres la app. Coherente con cómo ya describe este proyecto su PIN
// de sesión (ver CLAUDE.md: "no es cifrado real").
//
// Un registro (passkey) es por usuario + por dispositivo: si cambias de
// iPhone o borras Safari, tienes que volver a activarlo -- por eso el PIN o
// la contraseña normal siempre se quedan como respaldo, nunca se quitan.

const PREFIJO = 'ma_passkey_';

function claveUsuario(usuario) {
  return `${PREFIJO}${usuario}`;
}

function aBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function aBuffer(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function disponible() {
  return (await porQueNoDisponible()) === null;
}

// La consulta al sensor (isUserVerifyingPlatformAuthenticatorAvailable) es
// la parte lenta -- unos cientos de ms. Su resultado no cambia mientras la
// página siga abierta, así que se pregunta UNA vez y se reusa -- antes se
// repetía cada vez que se mostraba una pantalla, y por eso el botón de Face
// ID tardaba en aparecer cada vez.
let cachePromesaMotivo = null;

// Regresa null si Face ID se puede usar, o el motivo en texto claro si no --
// sin esto el usuario solo ve que "no pasa nada" y no hay forma de saber si
// es el navegador, el dispositivo, o que la app se abrió desde un archivo
// local en vez de su liga https.
function porQueNoDisponible() {
  if (!cachePromesaMotivo) cachePromesaMotivo = _calcularMotivo();
  return cachePromesaMotivo;
}

async function _calcularMotivo() {
  if (!window.isSecureContext) {
    return 'Face ID solo funciona con la app abierta desde su liga https, no desde el archivo en la computadora.';
  }
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return 'Este navegador no soporta Face ID para apps web (en iPhone tiene que ser Safari).';
  }
  try {
    const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!ok) return 'Este dispositivo no tiene Face ID / Touch ID disponible.';
  } catch (e) {
    return 'No se pudo consultar el sensor: ' + e.message;
  }
  return null;
}

function tieneRegistro(usuario) {
  return !!localStorage.getItem(claveUsuario(usuario));
}

function olvidar(usuario) {
  localStorage.removeItem(claveUsuario(usuario));
}

function usuariosRegistrados() {
  const usuarios = [];
  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    if (clave && clave.startsWith(PREFIJO)) usuarios.push(clave.slice(PREFIJO.length));
  }
  return usuarios;
}

// IMPORTANTE: esto TIENE que llamarse desde el handler de un toque del
// usuario, y ser lo PRIMERO que se hace ahí (nada de await, confirm() ni
// prompt() antes). Safari exige que la llamada salga directo del toque; si
// algo se mete en medio, la rechaza con NotAllowedError sin explicación.
async function registrar(usuario) {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Mis Apps' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: usuario, displayName: usuario },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      },
    });
    if (!cred) throw new Error('No se pudo activar Face ID.');
    localStorage.setItem(claveUsuario(usuario), aBase64(cred.rawId));
  } catch (e) {
    throw new Error(mensajeError(e));
  }
}

// OJO: igual que registrar(), TIENE que llamarse dentro del handler de un
// toque del usuario. Avienta con un mensaje legible si falla, en vez de
// regresar false en silencio -- así el error sí llega a la pantalla.
async function verificar(usuario) {
  const idGuardado = localStorage.getItem(claveUsuario(usuario));
  if (!idGuardado) throw new Error('Face ID no está activado en este dispositivo.');
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: aBuffer(idGuardado), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (!cred) throw new Error('Face ID no confirmó.');
    return true;
  } catch (e) {
    throw new Error(mensajeError(e));
  }
}

// Traduce los errores de WebAuthn a algo que se entienda. NotAllowedError
// sale tanto si el usuario canceló como si el navegador bloqueó la llamada
// por no venir de un toque directo -- de ahí la mención al toque.
function mensajeError(e) {
  if (e && e.name === 'NotAllowedError') return 'Face ID se canceló o el navegador lo bloqueó. Toca el botón otra vez.';
  if (e && e.name === 'InvalidStateError') return 'Este dispositivo ya tenía un registro distinto. Desactiva y vuelve a activar Face ID.';
  if (e && e.name === 'SecurityError') return 'Face ID necesita que la app esté abierta desde su liga https.';
  if (e && e.name === 'AbortError') return 'Se agotó el tiempo de Face ID. Intenta de nuevo.';
  return (e && e.message) || 'No se pudo usar Face ID.';
}

  return { disponible, porQueNoDisponible, tieneRegistro, olvidar, usuariosRegistrados, registrar, verificar };
})();
const disponible = passkey.disponible;
const porQueNoDisponible = passkey.porQueNoDisponible;
const tieneRegistro = passkey.tieneRegistro;
const olvidar = passkey.olvidar;
const usuariosRegistrados = passkey.usuariosRegistrados;
const registrar = passkey.registrar;
const verificar = passkey.verificar;

// ── shared/candado.js ──────────────────────────────────────────
const candado = (function () {
// Guarda localmente (por usuario, por app) el secreto que Face ID va a
// "revelar" en vez de pedirte que lo teclees: el PIN de sesión del launcher,
// o la contraseña de cifrado de Gastos. Vive en localStorage -- protegido
// por el propio bloqueo del iPhone, igual que cualquier sesión guardada en
// Safari. Ver shared/passkey.js para el porqué esto es un candado local y
// no una autenticación remota real.

function clave(app, usuario) {
  return `ma_candado_${app}_${usuario}`;
}

// Nombres con sufijo "Candado" (no "guardar"/"leer" a secas) a propósito:
// build.py junta todo en un solo archivo por app y expone cada export como
// global suelta -- "guardar" ya lo usa gastos/js/almacen.js, y chocarían.
function guardarCandado(app, usuario, valorObjeto) {
  localStorage.setItem(clave(app, usuario), JSON.stringify(valorObjeto));
}

function leerCandado(app, usuario) {
  try {
    const crudo = localStorage.getItem(clave(app, usuario));
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function borrarCandado(app, usuario) {
  localStorage.removeItem(clave(app, usuario));
}

  return { guardarCandado, leerCandado, borrarCandado };
})();
const guardarCandado = candado.guardarCandado;
const leerCandado = candado.leerCandado;
const borrarCandado = candado.borrarCandado;

// ── js/ui.js ──────────────────────────────────────────
// Launcher: login (URL → usuario → PIN o sin PIN) y los dos botones grandes.

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

function mostrarInicio() {
  document.getElementById('saludo').textContent = `Hola, ${getUsuario()}`;
  document.getElementById('btn-agregar-usuario').classList.toggle('oculto', !esAdmin());
  mostrarPantalla('pantalla-inicio');
  actualizarBotonesFaceId();
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
  // ?ts=... obliga al navegador a pedir sw.js siempre por red (nunca de su
  // caché HTTP normal, que es distinta al Cache Storage que sw.js controla)
  // -- así nunca corre una versión vieja del propio service worker sin
  // enterarse de que hay una nueva.
  window.addEventListener('load', () => navigator.serviceWorker.register(`sw.js?ts=${Date.now()}`).catch(() => {}));
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
