// Guarda localmente (por usuario, por app) el secreto que Face ID va a
// "revelar" en vez de pedirte que lo teclees: el PIN de sesión del launcher,
// o la contraseña de cifrado de Gastos. Vive en localStorage -- protegido
// por el propio bloqueo del iPhone, igual que cualquier sesión guardada en
// Safari. Ver shared/passkey.js para el porqué esto es un candado local y
// no una autenticación remota real.

function clave(app, usuario) {
  return `ma_candado_${app}_${usuario}`;
}

export function guardar(app, usuario, valorObjeto) {
  localStorage.setItem(clave(app, usuario), JSON.stringify(valorObjeto));
}

export function leer(app, usuario) {
  try {
    const crudo = localStorage.getItem(clave(app, usuario));
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function borrar(app, usuario) {
  localStorage.removeItem(clave(app, usuario));
}
