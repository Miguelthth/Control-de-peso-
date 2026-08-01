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

export async function disponible() {
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
export function porQueNoDisponible() {
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

export function tieneRegistro(usuario) {
  return !!localStorage.getItem(claveUsuario(usuario));
}

export function olvidar(usuario) {
  localStorage.removeItem(claveUsuario(usuario));
}

export function usuariosRegistrados() {
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
export async function registrar(usuario) {
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
export async function verificar(usuario) {
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
