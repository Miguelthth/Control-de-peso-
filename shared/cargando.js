// Overlay centrado con spinner -- feedback visible mientras Face ID hace su
// trabajo (sensor + validarPin contra el servidor). Antes no había nada en
// pantalla entre tocar el botón y que la sesión abriera o fallara, así que
// Miguel no sabía si el toque se había registrado. Se crea una sola vez y se
// reusa (no hay que tocar los 3 HTML a mano para agregar el marcado).
//
// OJO: mostrarCargando() es solo una mutación de DOM síncrona -- se puede
// llamar como PRIMERA línea de un handler de toque, antes de
// passkey.verificar(), sin romper la regla de Safari (nada de await/confirm
// antes de la llamada real a WebAuthn).

let overlay = null;

function asegurarOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'cargando-overlay oculto';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = '<div class="cargando-caja"><div class="spinner" aria-hidden="true"></div><p class="cargando-texto"></p></div>';
  document.body.appendChild(overlay);
  return overlay;
}

export function mostrarCargando(texto) {
  const el = asegurarOverlay();
  el.querySelector('.cargando-texto').textContent = texto || 'Cargando…';
  el.classList.remove('oculto');
}

export function ocultarCargando() {
  if (overlay) overlay.classList.add('oculto');
}
