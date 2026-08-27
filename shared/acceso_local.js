// Verificador local para poder abrir la app sin señal después de un inicio
// correcto en este mismo teléfono. Nunca guarda la contraseña ni un token del
// servidor: solo un derivado PBKDF2 con sal aleatoria.

const VERSION = 1;
const ITERACIONES = 210000;
const BYTES_SAL = 16;
const BITS_DERIVADOS = 256;

function aBase64(bytes) {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function desdeBase64(texto) {
  if (typeof texto !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(texto)) return null;
  try {
    const binario = atob(texto);
    return Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
  } catch {
    return null;
  }
}

async function derivar(password, sal) {
  const claveBase = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACIONES },
    claveBase,
    BITS_DERIVADOS,
  );
  return new Uint8Array(bits);
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

export async function crearVerificadorLocal(password) {
  if (typeof password !== 'string' || password.length === 0) throw new Error('La contraseña es obligatoria.');
  const sal = crypto.getRandomValues(new Uint8Array(BYTES_SAL));
  const derivado = await derivar(password, sal);
  return { v: VERSION, salt: aBase64(sal), derivado: aBase64(derivado) };
}

export async function verificarAccesoLocal(password, verificador) {
  if (!verificador || verificador.v !== VERSION || typeof password !== 'string' || password.length === 0) return false;
  const sal = desdeBase64(verificador.salt);
  const esperado = desdeBase64(verificador.derivado);
  if (!sal || sal.length !== BYTES_SAL || !esperado || esperado.length !== BITS_DERIVADOS / 8) return false;
  try {
    return iguales(await derivar(password, sal), esperado);
  } catch {
    return false;
  }
}
