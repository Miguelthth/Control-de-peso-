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
export async function cifrar(objeto, password) {
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
export async function descifrar(paquete, password) {
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
export async function crearClaveSesion(password, saltB64) {
  const salt = saltB64 ? base64ABuffer(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const clave = await derivarClaveAmbosUsos(password, salt);
  return { clave, saltB64: bufferABase64(salt) };
}

export async function cifrarConClave(objeto, clave, saltB64) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, bytes);
  return { cifrado: true, v: 1, salt: saltB64, iv: bufferABase64(iv), datos: bufferABase64(cifrado) };
}

export async function descifrarConClave(paquete, clave) {
  const iv = base64ABuffer(paquete.iv);
  const bytesCifrados = base64ABuffer(paquete.datos);
  try {
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, clave, bytesCifrados);
    return JSON.parse(new TextDecoder().decode(plano));
  } catch {
    throw new Error('Contraseña incorrecta');
  }
}

export function esPaqueteCifrado(obj) {
  return !!obj && typeof obj === 'object' && obj.cifrado === true && typeof obj.salt === 'string' && typeof obj.iv === 'string' && typeof obj.datos === 'string';
}
