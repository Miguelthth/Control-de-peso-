// Distribuye los bloques existentes en páginas según el espacio real disponible.
// Conserva los mismos elementos, valores y eventos; no corta ni copia formularios.
(() => {
  const estados = new WeakMap();
  let marco = 0;
  const selector = '.vista.activa, .pantalla:not(.oculto), #pantalla-password:not(.oculto), .popup-fondo:not(.oculto) > .popup-caja, .modal-caja, .dlg-caja, #modal-cuerpo';
  const ocultar = (el, si) => el.toggleAttribute('data-pagina-oculta', si);
  const visible = (el) => el.getClientRects().length && getComputedStyle(el).display !== 'none';
  const observar = () => observador.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'hidden', 'open'] });

  function ajustar(host) {
    host.querySelectorAll('[data-pagina-oculta]').forEach((el) => ocultar(el, false));
    let estado = estados.get(host);
    if (!estado) {
      const barra = document.createElement('nav');
      barra.className = 'paginas-pantalla';
      barra.setAttribute('aria-label', 'Páginas de esta pantalla');
      const anterior = document.createElement('button');
      anterior.type = 'button'; anterior.textContent = '‹ Anterior';
      const indicador = document.createElement('span');
      indicador.setAttribute('role', 'status'); indicador.setAttribute('aria-live', 'polite');
      const siguiente = document.createElement('button');
      siguiente.type = 'button'; siguiente.textContent = 'Siguiente ›';
      barra.append(anterior, indicador, siguiente);
      host.append(barra);
      estado = { pagina: 0, barra, anterior, siguiente, indicador, paginas: [] };
      estados.set(host, estado);
      anterior.onclick = () => { estado.pagina--; programar(); };
      siguiente.onclick = () => { estado.pagina++; programar(); };
    }
    const { barra, anterior, siguiente, indicador } = estado;
    if (!host.contains(barra)) host.append(barra);
    barra.hidden = true;
    host.classList.add('pantalla-ajustada');
    const nav = document.querySelector('.nav-inferior');
    const esVista = host.matches('.vista');
    const alto = window.visualViewport?.height || innerHeight;
    const limiteInferior = esVista && nav && visible(nav) ? nav.getBoundingClientRect().top : alto - 12;
    if (esVista) {
      host.style.height = Math.max(100, limiteInferior - host.getBoundingClientRect().top) + 'px';
    } else if (host.id === 'modal-cuerpo' && host.closest('dialog')) {
      const cabecera = host.closest('dialog').querySelector('header');
      host.style.height = Math.max(100, alto - 28 - (cabecera?.getBoundingClientRect().height || 0)) + 'px';
    } else {
      host.style.height = Math.max(100, alto - (host.matches('.pantalla, #pantalla-password') ? 0 : 40)) + 'px';
    }
    host.style.setProperty('--alto-contenido', Math.max(44, host.clientHeight - 140) + 'px');
    host.classList.remove('con-paginas');
    const hijos = [...host.children].filter((el) => el !== barra && visible(el));
    const cabe = () => {
      const fin = host.getBoundingClientRect().bottom - (barra.hidden ? 8 : 60);
      return hijos.filter(visible).every((el) => el.getBoundingClientRect().bottom <= fin + 1)
        && hijos.filter(visible).every((el) => el.getBoundingClientRect().top >= host.getBoundingClientRect().top - 1);
    };
    if (cabe()) { estado.paginas = []; return; }
    barra.hidden = false;
    host.classList.add('con-paginas');
    const capacidad = Math.max(44, host.clientHeight - 140);
    const envolturas = [];
    function recoger(el) {
      const cs = getComputedStyle(el);
      const hijosVisibles = [...el.children].filter(visible);
      if (!hijosVisibles.length || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.matches('svg, canvas, img, video, input, textarea, select, button, a, .campo, .teclado, .fila-superior, .popup-botones, .dlg-botones') ||
          el.getBoundingClientRect().height + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0) <= capacidad) return [[el]];
      envolturas.push(el);
      const resultado = [];
      for (let i = 0; i < hijosVisibles.length; i++) {
        const hijo = hijosVisibles[i];
        if (hijo.tagName === 'LABEL' && hijosVisibles[i + 1]?.matches('input, select, textarea, .dlg-envoltura-pass')) {
          resultado.push([hijo, hijosVisibles[++i]]);
        } else resultado.push(...recoger(hijo));
      }
      return resultado;
    }
    const unidades = hijos.flatMap(recoger);
    const mostrar = (grupo) => {
      const elegidos = new Set(grupo.flat());
      for (const unidad of unidades) for (const el of unidad) ocultar(el, !elegidos.has(el));
      for (const el of [...envolturas].reverse()) ocultar(el, ![...elegidos].some((nodo) => el.contains(nodo)));
    };
    const paginas = [];
    let pagina = [];
    // ponytail: mide cada bloque; virtualizar solo si las listas llegan a miles de filas.
    for (const unidad of unidades) {
      mostrar([...pagina, unidad]);
      if (pagina.length && !cabe()) { paginas.push(pagina); pagina = []; }
      pagina.push(unidad);
    }
    if (pagina.length) paginas.push(pagina);
    const activo = estado.enfocar || document.activeElement;
    const enfocada = paginas.findIndex((p) => p.flat().some((el) => el.contains(activo)));
    if (enfocada >= 0 && activo !== anterior && activo !== siguiente) estado.pagina = enfocada;
    estado.pagina = Math.max(0, Math.min(estado.pagina, paginas.length - 1));
    estado.paginas = paginas;
    mostrar(paginas[estado.pagina] || []);
    anterior.disabled = estado.pagina === 0;
    siguiente.disabled = estado.pagina >= paginas.length - 1;
    indicador.textContent = (estado.pagina + 1) + ' / ' + paginas.length;
    host.scrollTop = 0;
    if (estado.enfocar) {
      const campo = estado.enfocar; estado.enfocar = null;
      campo.focus(); campo.reportValidity?.();
    }
  }

  function actualizar() {
    marco = 0;
    observador.disconnect();
    const alto = window.visualViewport?.height || innerHeight;
    document.documentElement.style.setProperty('--alto-pantalla', alto + 'px');
    const modalNativo = document.querySelector('dialog[open]');
    document.querySelectorAll(selector).forEach((host) => {
      if (visible(host) && !(modalNativo && host.matches('.vista'))) ajustar(host);
    });
    window.scrollTo(0, 0);
    observar();
  }
  function programar() { if (!marco) marco = requestAnimationFrame(actualizar); }
  const observador = new MutationObserver((cambios) => {
    const clases = (valor) => String(valor || '').replace(/\blg-activa\b/g, '').trim();
    if (cambios.some((c) => c.type !== 'attributes' || c.attributeName !== 'class'
        || clases(c.oldValue) !== clases(c.target.className))) programar();
  });
  function iniciar() {
    observar(); programar();
    document.addEventListener('invalid', (e) => {
      if (visible(e.target)) return;
      const host = e.target.closest('.pantalla-ajustada');
      const estado = host && estados.get(host);
      if (estado) {
        e.preventDefault();
        if (!estado.enfocar) estado.enfocar = e.target;
        programar();
      }
    }, true);
    window.addEventListener('resize', programar);
    window.visualViewport?.addEventListener('resize', programar);
    window.visualViewport?.addEventListener('scroll', programar);
    document.addEventListener('load', programar, true);
    document.addEventListener('focusin', (e) => { if (!e.target.closest('.paginas-pantalla')) programar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
