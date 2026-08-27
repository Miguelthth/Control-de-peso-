// Liquid Glass: reflejo de luz que sigue al cursor sobre las superficies de
// cristal (.tarjeta, .popup-caja, .btn-primario, .btn-secundario, .encabezado,
// .nav-inferior -- ver shared/tema.css). Mismo mecanismo que
// 1.- SUMETEC-PY-SQL/static/js/liquid-glass-theme.js del proyecto hermano:
// un solo listener delegado desde document, un requestAnimationFrame, sin
// timers ni un listener por tarjeta. En pantallas táctiles no hay pointermove
// de "hover" real, así que el efecto simplemente no se activa -- el material
// (blur, borde, sombra) se sigue viendo igual, solo falta el brillo animado.
//
// No exporta nada: como js/ui.js, gastos/js/ui.js y peso/js/ui.js, es un
// punto de entrada de efecto lateral que se ejecuta solo al cargar.

const LG_SELECTOR = '.tarjeta, .popup-caja, .btn-primario, .btn-secundario, .encabezado, .nav-inferior';

(function iniciarLuzLiquida() {
  let activo = null;
  let pendiente = null;
  let ticking = false;

  function aplicar() {
    ticking = false;
    if (!pendiente) return;
    const { el, x, y } = pendiente;
    if (activo && activo !== el) activo.classList.remove('lg-activa');
    el.style.setProperty('--lg-x', x + 'px');
    el.style.setProperty('--lg-y', y + 'px');
    el.classList.add('lg-activa');
    activo = el;
  }

  document.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const el = ev.target.closest(LG_SELECTOR);
    if (!el) {
      if (activo) { activo.classList.remove('lg-activa'); activo = null; }
      return;
    }
    const r = el.getBoundingClientRect();
    pendiente = { el, x: ev.clientX - r.left, y: ev.clientY - r.top };
    if (!ticking) { ticking = true; requestAnimationFrame(aplicar); }
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    if (activo) { activo.classList.remove('lg-activa'); activo = null; }
  }, { passive: true, capture: true });
})();
