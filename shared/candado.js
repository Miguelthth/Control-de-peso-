// Guarda localmente (por usuario, por app) el secreto que Face ID va a
// "revelar" en vez de pedirte que lo teclees: el PIN de sesión del launcher,
// o la contraseña de cifrado de Gastos. Vive en localStorage -- protegido
// solo por el sandbox/bloqueo del dispositivo, no por cifrado propio. Un XSS
// que ejecute JavaScript en este mismo origen podría leerlo. Task 4/5 debe
// añadir una CSP estricta y revisar los puntos de inyección. Ver
// shared/passkey.js: esto es un candado local, no autenticación remota real.

function clave(app, usuario) {
  return `ma_candado_${app}_${usuario}`;
}

// Nombres con sufijo "Candado" (no "guardar"/"leer" a secas) a propósito:
// build.py junta todo en un solo archivo por app y expone cada export como
// global suelta -- "guardar" ya lo usa gastos/js/almacen.js, y chocarían.
export function guardarCandado(app, usuario, valorObjeto) {
  localStorage.setItem(clave(app, usuario), JSON.stringify(valorObjeto));
}

export function leerCandado(app, usuario) {
  try {
    const crudo = localStorage.getItem(clave(app, usuario));
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function borrarCandado(app, usuario) {
  localStorage.removeItem(clave(app, usuario));
}

// "Ya hiciste Face ID hace un momento" -- así Gastos no lo vuelve a pedir si
// acabas de confirmarlo en el launcher (o viceversa). Ventana corta a
// propósito: es para cubrir "abrí la app y de ahí entré a Gastos", no para
// dejar la sesión abierta indefinidamente sin Face ID.
const CLAVE_RECIENTE = 'ma_faceid_reciente';
const VENTANA_RECIENTE_MS = 3 * 60 * 1000; // 3 minutos

export function marcarFaceIdConfirmado() {
  localStorage.setItem(CLAVE_RECIENTE, String(Date.now()));
}

export function faceIdConfirmadoReciente() {
  const ts = Number(localStorage.getItem(CLAVE_RECIENTE) || 0);
  return Date.now() - ts < VENTANA_RECIENTE_MS;
}
