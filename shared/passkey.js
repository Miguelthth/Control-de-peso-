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
  if (!window.PublicKeyCredential || !navigator.credentials) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
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

export async function registrar(usuario) {
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
  if (!cred) throw new Error('No se pudo activar Face ID');
  localStorage.setItem(claveUsuario(usuario), aBase64(cred.rawId));
}

// true si el sensor confirmó (Face ID / Touch ID / código del iPhone como
// respaldo del sistema); false si canceló o falló -- nunca truena para eso.
export async function verificar(usuario) {
  const idGuardado = localStorage.getItem(claveUsuario(usuario));
  if (!idGuardado) return false;
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: aBuffer(idGuardado), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!cred;
  } catch {
    return false;
  }
}
