// ARCHIVO GENERADO por build.py (paquete "gastos") -- no editar a mano.
// Edita los archivos fuente y vuelve a correr: python build.py

// ── shared/sesion.js ──────────────────────────────────────────
const sesion = (function () {
// Sesión compartida entre el launcher, Gastos y Peso (mismo origen -- misma
// localStorage). Login pasa UNA vez en el launcher; las sub-apps solo leen.

const CLAVE_URL = 'ma_url';
const CLAVE_USUARIO = 'ma_usuario';
const CLAVE_ROL = 'ma_rol';

function getUrl() {
  return localStorage.getItem(CLAVE_URL) || '';
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

  return { leerDatos, validarUsuario, validarPin, crearPin, cambiarPin, guardarPeso, guardarMeta, guardarUnidad, borrarPesos, crearUsuario, guardarGastos, leerGastos };
})();
const leerDatos = api.leerDatos;
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

// ── shared/cifrado.js ──────────────────────────────────────────
const cifrado = (function () {
// Cifrado local de los datos con una contraseña (AES-GCM + PBKDF2, Web Crypto nativo).
// No hay forma de recuperar los datos si se pierde la contraseña: no queda en ningún
// lado, ni "pista", ni respaldo en claro. Esa es la garantía de que es privado de verdad.
//
// OJO: esta "contraseña" es la de CIFRADO de Gastos -- distinta del PIN de
// inicio de sesión (ese solo protege el dispositivo, no es criptografía real).

const ITERACIONES = 250000;

function bufferABase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ABuffer(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

async function derivarClave(password, salt, uso) {
  const claveBase = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERACIONES, hash: 'SHA-256' },
    claveBase,
    { name: 'AES-GCM', length: 256 },
    false,
    [uso]
  );
}

// Regresa un "paquete" (objeto plano, serializable a JSON) con los datos cifrados.
async function cifrar(objeto, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await derivarClave(password, salt, 'encrypt');
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, bytes);
  return { cifrado: true, v: 1, salt: bufferABase64(salt), iv: bufferABase64(iv), datos: bufferABase64(cifrado) };
}

// Descifra un paquete producido por cifrar(). Si la contraseña es incorrecta, avienta
// un error (AES-GCM trae verificación de integridad: no hay forma de "descifrar mal
// en silencio", o truena o el resultado es exactamente el original).
async function descifrar(paquete, password) {
  const salt = base64ABuffer(paquete.salt);
  const iv = base64ABuffer(paquete.iv);
  const clave = await derivarClave(password, salt, 'decrypt');
  const bytesCifrados = base64ABuffer(paquete.datos);
  try {
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, clave, bytesCifrados);
    return JSON.parse(new TextDecoder().decode(plano));
  } catch {
    throw new Error('Contraseña incorrecta');
  }
}

// ---------- clave de sesión (evita repetir PBKDF2 en cada guardado) ----------
//
// derivarClave() con 250,000 iteraciones tarda cientos de ms en un celular --
// aceptable una vez al conectarte, pero notorio si se repite en cada "Guardar".
// Reusar la misma CryptoKey durante la sesión es seguro: lo que protege cada
// cifrado individual es el IV (siempre aleatorio, ver cifrarConClave), no que
// la clave cambie: la sal solo hace falta cambiarla para volver a derivar de
// la contraseña (login, cambio de contraseña), no en cada guardado.

async function derivarClaveAmbosUsos(password, salt) {
  const claveBase = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERACIONES, hash: 'SHA-256' },
    claveBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// saltB64 opcional: si ya existe un paquete guardado, se reusa su sal (para
// poder descifrarlo); si no, se genera una nueva (cuenta nueva / contraseña nueva).
async function crearClaveSesion(password, saltB64) {
  const salt = saltB64 ? base64ABuffer(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const clave = await derivarClaveAmbosUsos(password, salt);
  return { clave, saltB64: bufferABase64(salt) };
}

async function cifrarConClave(objeto, clave, saltB64) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, bytes);
  return { cifrado: true, v: 1, salt: saltB64, iv: bufferABase64(iv), datos: bufferABase64(cifrado) };
}

async function descifrarConClave(paquete, clave) {
  const iv = base64ABuffer(paquete.iv);
  const bytesCifrados = base64ABuffer(paquete.datos);
  try {
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, clave, bytesCifrados);
    return JSON.parse(new TextDecoder().decode(plano));
  } catch {
    throw new Error('Contraseña incorrecta');
  }
}

function esPaqueteCifrado(obj) {
  return !!obj && typeof obj === 'object' && obj.cifrado === true && typeof obj.salt === 'string' && typeof obj.iv === 'string' && typeof obj.datos === 'string';
}

  return { cifrar, descifrar, crearClaveSesion, cifrarConClave, descifrarConClave, esPaqueteCifrado };
})();
const cifrar = cifrado.cifrar;
const descifrar = cifrado.descifrar;
const crearClaveSesion = cifrado.crearClaveSesion;
const cifrarConClave = cifrado.cifrarConClave;
const descifrarConClave = cifrado.descifrarConClave;
const esPaqueteCifrado = cifrado.esPaqueteCifrado;

// ── gastos/js/modelo.js ──────────────────────────────────────────
const modelo = (function () {
// Forma de los datos, valores por defecto y validación. Sin DOM, sin storage.

const CATEGORIAS_DEFECTO = [
  { id: 'despensa', nombre: 'Despensa', icono: '🛒', color: '#e8743b', tipo: 'gasto' },
  { id: 'comida_fuera', nombre: 'Comida fuera', icono: '🍔', color: '#e5484d', tipo: 'gasto' },
  { id: 'gasolina', nombre: 'Gasolina / Transporte', icono: '⛽', color: '#c2410c', tipo: 'gasto' },
  { id: 'casa', nombre: 'Casa y servicios', icono: '🏠', color: '#4c5fd5', tipo: 'gasto' },
  { id: 'salud', nombre: 'Salud', icono: '💊', color: '#22a06b', tipo: 'gasto' },
  { id: 'suscripciones', nombre: 'Suscripciones', icono: '📺', color: '#9333ea', tipo: 'gasto' },
  { id: 'ropa', nombre: 'Ropa', icono: '👕', color: '#0891b2', tipo: 'gasto' },
  { id: 'otros_gasto', nombre: 'Otros', icono: '📦', color: '#6b7280', tipo: 'gasto' },
  { id: 'sueldo', nombre: 'Sueldo', icono: '💼', color: '#22a06b', tipo: 'ingreso' },
  { id: 'retiro_negocio', nombre: 'Retiro del negocio', icono: '🏪', color: '#16a34a', tipo: 'ingreso' },
  { id: 'otros_ingreso', nombre: 'Otros', icono: '➕', color: '#65a30d', tipo: 'ingreso' },
];

const METODOS = ['efectivo', 'debito', 'credito', 'transferencia'];

const METODOS_ACTIVOS_DEFECTO = { efectivo: true, debito: true, credito: true, transferencia: true };

function generarId(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function crearDatosVacios() {
  return {
    version: 1,
    config: { moneda: 'MXN', tema: 'auto', inicioMes: 1, metodosActivos: { ...METODOS_ACTIVOS_DEFECTO } },
    movimientos: [],
    categorias: CATEGORIAS_DEFECTO.map((c) => ({ ...c })),
    presupuestos: {},
    recurrentes: [],
  };
}

function mesDeFecha(fecha) {
  return fecha.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}

function hoyISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function mesActualStr() {
  return hoyISO().slice(0, 7);
}

function validarMovimiento(mov) {
  const errores = [];
  if (!mov.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(mov.fecha)) errores.push('Fecha inválida');
  if (mov.tipo !== 'gasto' && mov.tipo !== 'ingreso') errores.push('Tipo inválido');
  if (typeof mov.monto !== 'number' || !Number.isFinite(mov.monto) || mov.monto <= 0) {
    errores.push('El monto debe ser mayor a 0');
  }
  if (!mov.categoria) errores.push('Falta categoría');
  if (!METODOS.includes(mov.metodo)) errores.push('Método inválido');
  if (errores.length) throw new Error(errores.join('. '));
  return {
    id: mov.id || generarId('mov'),
    fecha: mov.fecha,
    tipo: mov.tipo,
    monto: Math.round(mov.monto * 100) / 100,
    categoria: mov.categoria,
    metodo: mov.metodo,
    nota: (mov.nota || '').trim(),
    etiquetas: Array.isArray(mov.etiquetas) ? mov.etiquetas : [],
    recurrenteId: mov.recurrenteId || null,
    creado: mov.creado || new Date().toISOString(),
    modificado: new Date().toISOString(),
  };
}

// Repara una estructura de datos posiblemente incompleta/vieja (versión futura: migraciones).
function normalizarDatos(datos) {
  const base = crearDatosVacios();
  if (!datos || typeof datos !== 'object') return base;
  return {
    version: datos.version || 1,
    config: {
      ...base.config,
      ...(datos.config || {}),
      metodosActivos: { ...METODOS_ACTIVOS_DEFECTO, ...((datos.config || {}).metodosActivos || {}) },
    },
    movimientos: Array.isArray(datos.movimientos) ? datos.movimientos : [],
    categorias: Array.isArray(datos.categorias) && datos.categorias.length ? datos.categorias : base.categorias,
    presupuestos: datos.presupuestos && typeof datos.presupuestos === 'object' ? datos.presupuestos : {},
    recurrentes: Array.isArray(datos.recurrentes) ? datos.recurrentes : [],
  };
}

  return { CATEGORIAS_DEFECTO, METODOS, METODOS_ACTIVOS_DEFECTO, generarId, crearDatosVacios, mesDeFecha, hoyISO, mesActualStr, validarMovimiento, normalizarDatos };
})();
const CATEGORIAS_DEFECTO = modelo.CATEGORIAS_DEFECTO;
const METODOS = modelo.METODOS;
const METODOS_ACTIVOS_DEFECTO = modelo.METODOS_ACTIVOS_DEFECTO;
const generarId = modelo.generarId;
const crearDatosVacios = modelo.crearDatosVacios;
const mesDeFecha = modelo.mesDeFecha;
const hoyISO = modelo.hoyISO;
const mesActualStr = modelo.mesActualStr;
const validarMovimiento = modelo.validarMovimiento;
const normalizarDatos = modelo.normalizarDatos;

// ── gastos/js/calculos.js ──────────────────────────────────────────
const calculos = (function () {
// Toda la aritmética de dinero. Puro: recibe datos, regresa números. Sin DOM, sin storage.
// Todas las sumas se hacen en centavos enteros para evitar errores de punto flotante.

function aCentavos(pesos) {
  return Math.round(pesos * 100);
}

function aPesos(centavos) {
  return centavos / 100;
}

function sumaCentavos(movimientos) {
  return movimientos.reduce((acc, m) => acc + aCentavos(m.monto), 0);
}

function filtrarPorMes(movimientos, mesStr, tipo = null) {
  return movimientos.filter((m) => mesDeFecha(m.fecha) === mesStr && (!tipo || m.tipo === tipo));
}

function totalPorTipo(movimientos, tipo, mesStr) {
  return aPesos(sumaCentavos(filtrarPorMes(movimientos, mesStr, tipo)));
}

function neto(movimientos, mesStr) {
  return totalPorTipo(movimientos, 'ingreso', mesStr) - totalPorTipo(movimientos, 'gasto', mesStr);
}

function totalPorCategoria(movimientos, mesStr, tipo = 'gasto') {
  const mapa = new Map();
  for (const m of filtrarPorMes(movimientos, mesStr, tipo)) {
    mapa.set(m.categoria, (mapa.get(m.categoria) || 0) + aCentavos(m.monto));
  }
  return [...mapa.entries()]
    .map(([categoria, centavos]) => ({ categoria, total: aPesos(centavos) }))
    .sort((a, b) => b.total - a.total);
}

// Últimos `n` meses (incluyendo el de `mesRef`), en orden cronológico.
function ultimosMeses(mesRef, n = 12) {
  const [y, m] = mesRef.split('-').map(Number);
  const meses = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}

function totalesPorMes(movimientos, tipo, mesRef, n = 12) {
  const meses = ultimosMeses(mesRef, n);
  return meses.map((mes) => ({ mes, total: totalPorTipo(movimientos, tipo, mes) }));
}

function promedioDiario(movimientos, mesStr, hoy = hoyISO()) {
  const [y, m] = mesStr.split('-').map(Number);
  const esMesActual = mesStr === hoy.slice(0, 7);
  const diaHoy = Number(hoy.slice(8, 10));
  const diasTranscurridos = esMesActual ? diaHoy : diasEnMes(y, m);
  const total = totalPorTipo(movimientos, 'gasto', mesStr);
  return diasTranscurridos > 0 ? total / diasTranscurridos : 0;
}

function diasEnMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

function proyeccionCierre(movimientos, mesStr, hoy = hoyISO()) {
  const [y, m] = mesStr.split('-').map(Number);
  const totalDias = diasEnMes(y, m);
  if (mesStr !== hoy.slice(0, 7)) {
    return totalPorTipo(movimientos, 'gasto', mesStr);
  }
  const prom = promedioDiario(movimientos, mesStr, hoy);
  return Math.round(prom * totalDias * 100) / 100;
}

function gastoHormiga(movimientos, mesStr, umbral = 150) {
  const chicos = filtrarPorMes(movimientos, mesStr, 'gasto').filter((m) => m.monto < umbral);
  return { total: aPesos(sumaCentavos(chicos)), cantidad: chicos.length };
}

function topGastos(movimientos, mesStr, n = 5) {
  return [...filtrarPorMes(movimientos, mesStr, 'gasto')].sort((a, b) => b.monto - a.monto).slice(0, n);
}

function diaSemanaMasCaro(movimientos, mesStr) {
  const nombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const porDia = new Array(7).fill(0);
  for (const m of filtrarPorMes(movimientos, mesStr, 'gasto')) {
    const dow = new Date(`${m.fecha}T00:00:00`).getDay();
    porDia[dow] += aCentavos(m.monto);
  }
  let idx = 0;
  for (let i = 1; i < 7; i++) if (porDia[i] > porDia[idx]) idx = i;
  return porDia[idx] > 0 ? { dia: nombres[idx], total: aPesos(porDia[idx]) } : null;
}

// Racha de días consecutivos (hasta hoy) sin ningún movimiento de gasto.
function rachaSinGastar(movimientos, hoy = hoyISO()) {
  const fechasConGasto = new Set(movimientos.filter((m) => m.tipo === 'gasto').map((m) => m.fecha));
  let racha = 0;
  let cursor = new Date(`${hoy}T00:00:00`);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (fechasConGasto.has(iso)) break;
    racha++;
    cursor.setDate(cursor.getDate() - 1);
    if (racha > 366) break;
  }
  return racha;
}

// Promedio de gasto de una categoría en los `n` meses anteriores a mesStr (sin incluirlo).
function promedioCategoriaMesesPrevios(movimientos, categoria, mesStr, n = 3) {
  const meses = ultimosMeses(mesStr, n + 1).slice(0, -1);
  if (!meses.length) return 0;
  const totalCentavos = meses.reduce((acc, mes) => {
    const filas = filtrarPorMes(movimientos, mes, 'gasto').filter((m) => m.categoria === categoria);
    return acc + sumaCentavos(filas);
  }, 0);
  return aPesos(totalCentavos) / meses.length;
}

function estadoPresupuestos(movimientos, presupuestos, mesStr) {
  const topes = presupuestos[mesStr] || {};
  const gastosPorCat = new Map(totalPorCategoria(movimientos, mesStr, 'gasto').map((c) => [c.categoria, c.total]));
  return Object.entries(topes).map(([categoria, tope]) => {
    const gastado = gastosPorCat.get(categoria) || 0;
    const pct = tope > 0 ? gastado / tope : 0;
    let nivel = 'ok';
    if (pct >= 1) nivel = 'rebasado';
    else if (pct >= 0.8) nivel = 'alerta';
    return { categoria, tope, gastado, pct, nivel };
  });
}

// Genera los movimientos de recurrentes que falten para `mesStr`. Idempotente:
// nunca duplica (revisa recurrenteId + mes ya presentes en `movimientosExistentes`).
function generarMovimientosRecurrentes(recurrentes, movimientosExistentes, mesStr, crearId) {
  const yaGenerados = new Set(
    movimientosExistentes
      .filter((m) => m.recurrenteId && mesDeFecha(m.fecha) === mesStr)
      .map((m) => m.recurrenteId)
  );
  const nuevos = [];
  const [y, m] = mesStr.split('-').map(Number);
  for (const r of recurrentes) {
    if (!r.activo || yaGenerados.has(r.id)) continue;
    const dia = Math.min(r.dia, diasEnMes(y, m));
    nuevos.push({
      id: crearId('mov'),
      fecha: `${mesStr}-${String(dia).padStart(2, '0')}`,
      tipo: 'gasto',
      monto: r.monto,
      categoria: r.categoria,
      metodo: r.metodo || 'debito',
      nota: r.nombre,
      etiquetas: ['recurrente'],
      recurrenteId: r.id,
      creado: new Date().toISOString(),
      modificado: new Date().toISOString(),
    });
  }
  return nuevos;
}

function costoAnualSuscripciones(recurrentes) {
  return recurrentes.filter((r) => r.activo).reduce((acc, r) => acc + aCentavos(r.monto) * 12, 0) / 100;
}

// % del gasto del mes que viene de movimientos recurrentes (fijos) vs el resto (variables).
function fijosVsVariables(movimientos, mesStr) {
  const delMes = filtrarPorMes(movimientos, mesStr, 'gasto');
  const totalCent = sumaCentavos(delMes);
  const fijosCent = sumaCentavos(delMes.filter((m) => m.recurrenteId));
  const pctFijos = totalCent > 0 ? fijosCent / totalCent : 0;
  return { fijos: aPesos(fijosCent), variables: aPesos(totalCent - fijosCent), pctFijos };
}

  return { aCentavos, aPesos, sumaCentavos, filtrarPorMes, totalPorTipo, neto, totalPorCategoria, ultimosMeses, totalesPorMes, promedioDiario, diasEnMes, proyeccionCierre, gastoHormiga, topGastos, diaSemanaMasCaro, rachaSinGastar, promedioCategoriaMesesPrevios, estadoPresupuestos, generarMovimientosRecurrentes, costoAnualSuscripciones, fijosVsVariables };
})();
const aCentavos = calculos.aCentavos;
const aPesos = calculos.aPesos;
const sumaCentavos = calculos.sumaCentavos;
const filtrarPorMes = calculos.filtrarPorMes;
const totalPorTipo = calculos.totalPorTipo;
const neto = calculos.neto;
const totalPorCategoria = calculos.totalPorCategoria;
const ultimosMeses = calculos.ultimosMeses;
const totalesPorMes = calculos.totalesPorMes;
const promedioDiario = calculos.promedioDiario;
const diasEnMes = calculos.diasEnMes;
const proyeccionCierre = calculos.proyeccionCierre;
const gastoHormiga = calculos.gastoHormiga;
const topGastos = calculos.topGastos;
const diaSemanaMasCaro = calculos.diaSemanaMasCaro;
const rachaSinGastar = calculos.rachaSinGastar;
const promedioCategoriaMesesPrevios = calculos.promedioCategoriaMesesPrevios;
const estadoPresupuestos = calculos.estadoPresupuestos;
const generarMovimientosRecurrentes = calculos.generarMovimientosRecurrentes;
const costoAnualSuscripciones = calculos.costoAnualSuscripciones;
const fijosVsVariables = calculos.fijosVsVariables;

// ── gastos/js/insights.js ──────────────────────────────────────────
const insights = (function () {
// Frases automáticas sobre el mes, con reglas fijas (no IA). Puro: recibe datos, regresa insights.

function nombreCategoria(categorias, id) {
  return categorias.find((c) => c.id === id)?.nombre || id;
}

function generarInsights(datos, mesStr, hoy = hoyISO()) {
  const { movimientos, categorias, recurrentes, presupuestos } = datos;
  const insights = [];

  // Fuga del mes: categoría que más subió vs su promedio de los últimos 3 meses.
  const porCategoria = totalPorCategoria(movimientos, mesStr, 'gasto');
  let fuga = null;
  for (const { categoria, total } of porCategoria) {
    const prom = promedioCategoriaMesesPrevios(movimientos, categoria, mesStr, 3);
    const diff = total - prom;
    if (prom > 0 && diff > 0 && (!fuga || diff > fuga.diff)) {
      fuga = { categoria, total, prom, diff };
    }
  }
  if (fuga && fuga.diff >= 200) {
    insights.push({
      tipo: 'fuga',
      nivel: 'alerta',
      texto: `${nombreCategoria(categorias, fuga.categoria)} va $${fuga.diff.toFixed(0)} arriba de tu promedio (${fuga.prom.toFixed(0)} → ${fuga.total.toFixed(0)}).`,
    });
  }

  // Gasto hormiga
  const hormiga = gastoHormiga(movimientos, mesStr);
  if (hormiga.cantidad >= 3) {
    insights.push({
      tipo: 'hormiga',
      nivel: 'info',
      texto: `Gasto hormiga: ${hormiga.cantidad} compras menores a $150 suman $${hormiga.total.toFixed(0)} este mes.`,
    });
  }

  // Fijos vs variables
  const fv = fijosVsVariables(movimientos, mesStr);
  if (fv.fijos + fv.variables > 0) {
    insights.push({
      tipo: 'fijos_variables',
      nivel: 'info',
      texto: `${Math.round(fv.pctFijos * 100)}% de tu gasto del mes ya es fijo ($${fv.fijos.toFixed(0)} en recurrentes).`,
    });
  }

  // Costo anual de suscripciones
  const anual = costoAnualSuscripciones(recurrentes);
  if (anual > 0) {
    const mensual = anual / 12;
    insights.push({
      tipo: 'suscripciones_anual',
      nivel: 'info',
      texto: `Tus suscripciones activas son $${mensual.toFixed(0)}/mes = $${anual.toFixed(0)} al año.`,
    });
  }

  // Día de la semana más caro
  const diaCaro = diaSemanaMasCaro(movimientos, mesStr);
  if (diaCaro) {
    insights.push({ tipo: 'dia_caro', nivel: 'info', texto: `Tu día más caro del mes: ${diaCaro.dia} ($${diaCaro.total.toFixed(0)}).` });
  }

  // Racha sin gastar
  const racha = rachaSinGastar(movimientos, hoy);
  if (racha >= 2) {
    insights.push({ tipo: 'racha', nivel: 'positivo', texto: `Llevas ${racha} días sin registrar un gasto.` });
  }

  // Proyección de cierre vs ingresos del mes
  const proyeccion = proyeccionCierre(movimientos, mesStr, hoy);
  const ingresos = totalPorTipo(movimientos, 'ingreso', mesStr);
  if (mesStr === hoy.slice(0, 7) && ingresos > 0 && proyeccion > ingresos) {
    insights.push({
      tipo: 'proyeccion_riesgo',
      nivel: 'alerta',
      texto: `A este ritmo cierras el mes en $${proyeccion.toFixed(0)}, por arriba de tus ingresos ($${ingresos.toFixed(0)}).`,
    });
  }

  // Presupuestos rebasados o en alerta
  for (const p of estadoPresupuestos(movimientos, presupuestos, mesStr)) {
    if (p.nivel === 'rebasado') {
      insights.push({
        tipo: 'presupuesto',
        nivel: 'alerta',
        texto: `Rebasaste el presupuesto de ${nombreCategoria(categorias, p.categoria)}: $${p.gastado.toFixed(0)} de $${p.tope.toFixed(0)}.`,
      });
    } else if (p.nivel === 'alerta') {
      insights.push({
        tipo: 'presupuesto',
        nivel: 'alerta',
        texto: `${nombreCategoria(categorias, p.categoria)} va en ${Math.round(p.pct * 100)}% de su presupuesto.`,
      });
    }
  }

  // Recurrente del mes que ya debió pagarse y no está registrado
  const diaHoy = mesStr === hoy.slice(0, 7) ? Number(hoy.slice(8, 10)) : null;
  if (diaHoy) {
    const generados = new Set(movimientos.filter((m) => m.recurrenteId).map((m) => m.recurrenteId));
    for (const r of recurrentes) {
      if (r.activo && r.dia < diaHoy && !generados.has(r.id)) {
        insights.push({
          tipo: 'recurrente_faltante',
          nivel: 'alerta',
          texto: `${r.nombre} (día ${r.dia}) no se ha registrado este mes.`,
        });
      }
    }
  }

  return insights;
}

  return { generarInsights };
})();
const generarInsights = insights.generarInsights;

// ── gastos/js/graficas.js ──────────────────────────────────────────
const graficas = (function () {
// Gráficas en SVG escrito a mano. Cada función regresa un string de SVG listo para innerHTML.
// Sin librerías: así la app no depende de nada externo para verse.

const NS = 'http://www.w3.org/2000/svg';

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n);
}

function svgDona(datos, { size = 220, grosor = 34 } = {}) {
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

function svgBarras12Meses(datos, { width = 600, height = 200 } = {}) {
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

function svgLineaAcumulada(actual, anterior, { width = 600, height = 220 } = {}) {
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

function svgBarrasHorizontales(datos, { width = 500, filaAlto = 32 } = {}) {
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
function svgMapaCalor(movimientosPorDia, anio, { celda = 12, hueco = 3 } = {}) {
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

  return { svgDona, svgBarras12Meses, svgLineaAcumulada, svgBarrasHorizontales, svgMapaCalor };
})();
const svgDona = graficas.svgDona;
const svgBarras12Meses = graficas.svgBarras12Meses;
const svgLineaAcumulada = graficas.svgLineaAcumulada;
const svgBarrasHorizontales = graficas.svgBarrasHorizontales;
const svgMapaCalor = graficas.svgMapaCalor;

// ── gastos/js/almacen.js ──────────────────────────────────────────
const almacen = (function () {
// Lee/escribe los Gastos de un usuario en su Hoja privada (backend en
// shared/api.js). El contenido SIEMPRE viaja cifrado (shared/cifrado.js) --
// este archivo nunca ve un movimiento en claro, solo el "paquete" cifrado.
//
// Cola offline: si guardar falla (sin señal), el paquete se queda en
// localStorage y se reintenta solo -- mismo espíritu que Control de Peso.

function clavePendiente(usuario) {
  return `gastos_pendiente_${usuario}`;
}

function guardarPendiente(usuario, blobStr) {
  localStorage.setItem(clavePendiente(usuario), blobStr);
}
function leerPendiente(usuario) {
  return localStorage.getItem(clavePendiente(usuario));
}
function limpiarPendiente(usuario) {
  localStorage.removeItem(clavePendiente(usuario));
}

// Para decidir "crear contraseña" vs "ingresar contraseña" al conectar, sin
// necesitar la contraseña todavía.
async function existeGastos(usuario) {
  if (leerPendiente(usuario)) return true;
  const r = await leerGastos(usuario);
  return !!(r.ok && r.blob);
}

// Regresa también {clave, saltB64}: la CryptoKey ya derivada, para que las
// escrituras subsecuentes (cada "Guardar") no repitan PBKDF2 (250k
// iteraciones, cientos de ms) -- solo el primer descifrado de la sesión paga
// ese costo.
async function cargar(usuario, password) {
  const pendiente = leerPendiente(usuario);
  if (pendiente) {
    // Hay un guardado que no llegó al servidor todavía -- es más reciente
    // que lo que haya en la Hoja, así que se usa este.
    const paquete = JSON.parse(pendiente);
    const { clave, saltB64 } = await crearClaveSesion(password, paquete.salt);
    const datos = await descifrarConClave(paquete, clave); // avienta si password mal
    return { datos: normalizarDatos(datos), pendienteDeSincronizar: true, clave, saltB64 };
  }
  const r = await leerGastos(usuario);
  if (!r.ok) throw new Error(r.error || 'No se pudo leer');
  if (!r.blob) {
    const { clave, saltB64 } = await crearClaveSesion(password);
    return { datos: crearDatosVacios(), pendienteDeSincronizar: false, clave, saltB64 };
  }
  const paquete = JSON.parse(r.blob);
  const { clave, saltB64 } = await crearClaveSesion(password, paquete.salt);
  const datos = await descifrarConClave(paquete, clave); // avienta si password mal
  return { datos: normalizarDatos(datos), pendienteDeSincronizar: false, clave, saltB64 };
}

// Regresa {sincronizado}: true si ya llegó al servidor, false si quedó en
// cola local (sin señal) -- en ambos casos el dato ya está a salvo.
// `clave`/`saltB64` vienen de cargar() o crearClaveSesion() -- ya no se
// vuelve a pedir la contraseña ni a rederivarla en cada guardado.
async function guardar(usuario, datos, clave, saltB64) {
  const paquete = await cifrarConClave(datos, clave, saltB64);
  const blobStr = JSON.stringify(paquete);
  try {
    const r = await guardarGastos(usuario, blobStr);
    if (r.ok) {
      limpiarPendiente(usuario);
      return { sincronizado: true };
    }
    guardarPendiente(usuario, blobStr);
    return { sincronizado: false };
  } catch {
    guardarPendiente(usuario, blobStr);
    return { sincronizado: false };
  }
}

let sincronizando = false;

async function sincronizarPendiente(usuario) {
  if (sincronizando || !navigator.onLine) return false;
  const pendiente = leerPendiente(usuario);
  if (!pendiente) return false;
  sincronizando = true;
  let ok = false;
  try {
    const r = await guardarGastos(usuario, pendiente);
    if (r.ok) {
      limpiarPendiente(usuario);
      ok = true;
    }
  } catch {
    // sigue pendiente, se reintenta después
  }
  sincronizando = false;
  return ok;
}

function iniciarSincronizacionAutomatica(usuario, alSincronizar) {
  const intentar = async () => {
    const sincronizo = await sincronizarPendiente(usuario);
    if (sincronizo && alSincronizar) alSincronizar();
  };
  window.addEventListener('online', intentar);
  setInterval(intentar, 15000);
}

function exportarPaquete(paquete) {
  const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gastos-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function leerArchivoSubido(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        resolve(JSON.parse(lector.result));
      } catch (e) {
        reject(e);
      }
    };
    lector.onerror = reject;
    lector.readAsText(archivo);
  });
}

  return { existeGastos, cargar, guardar, sincronizarPendiente, iniciarSincronizacionAutomatica, exportarPaquete, leerArchivoSubido };
})();
const existeGastos = almacen.existeGastos;
const cargar = almacen.cargar;
const guardar = almacen.guardar;
const sincronizarPendiente = almacen.sincronizarPendiente;
const iniciarSincronizacionAutomatica = almacen.iniciarSincronizacionAutomatica;
const exportarPaquete = almacen.exportarPaquete;
const leerArchivoSubido = almacen.leerArchivoSubido;

// ── gastos/js/ui.js ──────────────────────────────────────────
// Estado, render y eventos. El único archivo que toca el DOM.

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
  if (modo === 'entrar') intentarFaceId();
  else document.getElementById('btn-faceid-password').classList.add('oculto');
}

// Face ID es un candado local por dispositivo (ver shared/passkey.js) que
// evita volver a teclear la contraseña de cifrado cada vez que abres Gastos
// -- se intenta solo, y además queda el botón por si el navegador bloqueó
// el intento automático (WebAuthn a veces pide un toque previo del usuario).
async function intentarFaceId() {
  const usuario = getUsuario();
  const disponible = await passkey.disponible();
  const mostrar = disponible && passkey.tieneRegistro('gastos', usuario);
  document.getElementById('btn-faceid-password').classList.toggle('oculto', !mostrar);
  if (!mostrar) return;
  const ok = await passkey.verificar(usuario);
  if (!ok) return;
  const datos = candado.leer('gastos', usuario);
  if (!datos || !datos.password) return;
  document.getElementById('password-input').value = datos.password;
  await confirmarPassword();
}

async function ofrecerActivarFaceId(pass) {
  const usuario = getUsuario();
  if (passkey.tieneRegistro('gastos', usuario)) return; // ya activado -- no volver a preguntar
  if (!(await passkey.disponible())) return;
  if (!confirm('¿Activar Face ID en este iPhone para no volver a teclear tu contraseña de Gastos?')) return;
  try {
    await passkey.registrar(usuario);
    candado.guardar('gastos', usuario, { password: pass });
    toast('Face ID activado ✓');
  } catch (e) {
    toast('No se pudo activar Face ID', true);
  }
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
    ofrecerActivarFaceId(pass);
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
      ofrecerActivarFaceId(pass);
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
  actualizarBotonesFaceIdAjustes();
}

async function actualizarBotonesFaceIdAjustes() {
  const disponible = await passkey.disponible();
  const registrado = disponible && passkey.tieneRegistro('gastos', getUsuario());
  document.getElementById('btn-faceid-activar').classList.toggle('oculto', !disponible || registrado);
  document.getElementById('btn-faceid-desactivar').classList.toggle('oculto', !registrado);
}

async function activarFaceIdDesdeAjustes() {
  const pass = prompt('Escribe tu contraseña de Gastos para activar Face ID:');
  if (!pass) return;
  try {
    await almacen.cargar(getUsuario(), pass); // avienta "Contraseña incorrecta" si no es la correcta
  } catch (e) {
    toast(e.message || 'Contraseña incorrecta', true);
    return;
  }
  try {
    await passkey.registrar(getUsuario());
    candado.guardar('gastos', getUsuario(), { password: pass });
    toast('Face ID activado ✓');
    actualizarBotonesFaceIdAjustes();
  } catch (e) {
    toast('No se pudo activar Face ID', true);
  }
}

function desactivarFaceIdDesdeAjustes() {
  passkey.olvidar(getUsuario());
  candado.borrar('gastos', getUsuario());
  actualizarBotonesFaceIdAjustes();
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
  document.getElementById('btn-faceid-activar').addEventListener('click', activarFaceIdDesdeAjustes);
  document.getElementById('btn-faceid-desactivar').addEventListener('click', desactivarFaceIdDesdeAjustes);
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
      if (passkey.tieneRegistro('gastos', getUsuario())) candado.guardar('gastos', getUsuario(), { password: p1 });
      cerrarModal();
      toast('Contraseña actualizada ✓');
    });
  });
}

// ---------- arranque ----------

function wireGlobal() {
  document.getElementById('btn-password-confirmar').addEventListener('click', confirmarPassword);
  document.getElementById('btn-faceid-password').addEventListener('click', intentarFaceId);
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
