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

export function esPaqueteCifrado(obj) {
  return !!obj && typeof obj === 'object' && obj.cifrado === true && typeof obj.salt === 'string' && typeof obj.iv === 'string' && typeof obj.datos === 'string';
}
