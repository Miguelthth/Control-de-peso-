// Diálogos propios en lugar de alert() / confirm() / prompt() nativos: el
// prompt() nativo muestra en claro lo que escribes (contraseñas incluidas) y
// en iPhone el texto de un alert() no se puede copiar. Arma su propio DOM;
// los estilos viven en shared/tema.css (clases dlg-*).
//
// OJO Face ID: todo aquí regresa promesas -- nunca va entre un toque y
// passkey.registrar()/verificar() (ver shared/passkey.js).

let secuencia = 0;
const abiertos = [];

function crear(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== null) el.textContent = texto;
  return el;
}

function valoresDe(inputs) {
  const valores = {};
  for (const input of inputs) valores[input.name] = input.type === 'checkbox' ? input.checked : input.value;
  return valores;
}

function crearCampo(caja, campo, id) {
  const esCheck = campo.tipo === 'checkbox';
  const input = crear('input', esCheck ? 'dlg-check' : 'dlg-input');
  input.type = campo.tipo || 'text';
  input.name = campo.nombre;
  input.id = id;
  if (esCheck) {
    input.checked = Boolean(campo.valor);
    const etiqueta = crear('label', 'dlg-etiqueta-check');
    etiqueta.htmlFor = id;
    etiqueta.append(input, crear('span', null, campo.etiqueta));
    caja.appendChild(etiqueta);
    return input;
  }
  input.value = campo.valor || '';
  input.autocomplete = campo.autocomplete || 'off';
  if (campo.placeholder) input.placeholder = campo.placeholder;
  if (campo.inputmode) input.inputMode = campo.inputmode;
  if (input.type !== 'password') {
    input.setAttribute('autocapitalize', campo.autocapitalize || 'off');
    input.setAttribute('autocorrect', 'off');
    input.spellcheck = false;
  }
  const etiqueta = crear('label', 'dlg-etiqueta', campo.etiqueta);
  etiqueta.htmlFor = id;
  caja.appendChild(etiqueta);
  if (input.type !== 'password') {
    caja.appendChild(input);
    return input;
  }
  const envoltura = crear('div', 'dlg-envoltura-pass');
  const ver = crear('button', 'dlg-ver', 'Mostrar');
  ver.type = 'button';
  ver.setAttribute('aria-controls', id);
  ver.setAttribute('aria-pressed', 'false');
  ver.addEventListener('click', () => {
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    ver.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    ver.setAttribute('aria-pressed', String(mostrar));
    input.focus();
  });
  envoltura.append(input, ver);
  caja.appendChild(envoltura);
  return input;
}

function crearCodigo(caja, codigo) {
  const bloque = crear('div', 'dlg-codigo');
  const valor = crear('code', 'dlg-codigo-valor', codigo);
  const copiar = crear('button', 'btn-secundario', 'Copiar');
  copiar.type = 'button';
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      copiar.textContent = 'Copiado ✓';
    } catch {
      const rango = document.createRange();
      rango.selectNodeContents(valor);
      getSelection().removeAllRanges();
      getSelection().addRange(rango);
      copiar.textContent = 'Seleccionado';
    }
  });
  bloque.append(valor, copiar);
  caja.appendChild(bloque);
}

// Base de todos los demás. Regresa los valores de los campos ({} si no hay
// campos) al aceptar, o null al cancelar. `validar(valores)` puede ser async
// (ej. revisar la contraseña con el servidor): si regresa un texto -- o
// { mensaje, campo } -- el diálogo sigue abierto y lo muestra ahí mismo.
export function pedirFormulario({
  titulo, mensaje = '', campos = [], codigo = null, aceptar = 'Aceptar', cancelar = 'Cancelar',
  peligro = false, validar = null, habilitarSi = null, textoProcesando = 'Verificando…',
} = {}) {
  return new Promise((resolve) => {
    const id = `dlg-${++secuencia}`;
    const focoAnterior = document.activeElement;
    const fondo = crear('div', 'dlg-fondo');
    const caja = crear('form', 'dlg-caja');
    caja.noValidate = true;
    caja.setAttribute('role', campos.length ? 'dialog' : 'alertdialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-labelledby', `${id}-titulo`);
    const h = crear('h2', 'dlg-titulo', titulo);
    h.id = `${id}-titulo`;
    caja.appendChild(h);
    if (mensaje) {
      const p = crear('p', 'dlg-mensaje', mensaje);
      p.id = `${id}-mensaje`;
      caja.setAttribute('aria-describedby', p.id);
      caja.appendChild(p);
    }
    if (codigo) crearCodigo(caja, codigo);
    const inputs = campos.map((campo, i) => crearCampo(caja, campo, `${id}-campo-${i}`));
    const error = crear('p', 'dlg-error oculto');
    error.setAttribute('role', 'alert');
    caja.appendChild(error);

    const botones = crear('div', 'dlg-botones');
    const btnCancelar = cancelar ? crear('button', 'btn-secundario', cancelar) : null;
    if (btnCancelar) {
      btnCancelar.type = 'button';
      botones.appendChild(btnCancelar);
    }
    const btnAceptar = crear('button', peligro ? 'btn-primario dlg-peligro' : 'btn-primario', aceptar);
    btnAceptar.type = 'submit';
    botones.appendChild(btnAceptar);
    caja.appendChild(botones);
    fondo.appendChild(caja);

    let procesando = false;
    const actualizarHabilitado = () => {
      if (habilitarSi && !procesando) btnAceptar.disabled = !habilitarSi(valoresDe(inputs));
    };
    const cerrar = (resultado) => {
      abiertos.splice(abiertos.indexOf(fondo), 1);
      document.removeEventListener('keydown', onKey, true);
      fondo.remove();
      if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus?.();
      resolve(resultado);
    };
    const cancelarDialogo = () => {
      if (!procesando) cerrar(cancelar ? null : {});
    };
    const onKey = (e) => {
      if (abiertos[abiertos.length - 1] !== fondo) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelarDialogo();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = [...caja.querySelectorAll('button, input')].filter((el) => !el.disabled);
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && (document.activeElement === primero || !caja.contains(document.activeElement))) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (document.activeElement === ultimo || !caja.contains(document.activeElement))) { e.preventDefault(); primero.focus(); }
    };

    caja.addEventListener('input', () => {
      error.classList.add('oculto');
      inputs.forEach((input) => input.removeAttribute('aria-invalid'));
      actualizarHabilitado();
    });
    btnCancelar?.addEventListener('click', cancelarDialogo);
    fondo.addEventListener('click', (e) => {
      if (e.target === fondo && !campos.length) cancelarDialogo();
    });
    caja.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (procesando || btnAceptar.disabled) return;
      const valores = valoresDe(inputs);
      if (validar) {
        procesando = true;
        const texto = btnAceptar.textContent;
        btnAceptar.disabled = true;
        btnAceptar.textContent = textoProcesando;
        btnAceptar.setAttribute('aria-busy', 'true');
        if (btnCancelar) btnCancelar.disabled = true;
        let problema;
        try { problema = await validar(valores); }
        catch (err) { problema = err?.message || 'Algo salió mal. Intenta de nuevo.'; }
        procesando = false;
        btnAceptar.textContent = texto;
        btnAceptar.removeAttribute('aria-busy');
        btnAceptar.disabled = false;
        if (btnCancelar) btnCancelar.disabled = false;
        actualizarHabilitado();
        if (problema) {
          error.textContent = typeof problema === 'string' ? problema : problema.mensaje;
          error.classList.remove('oculto');
          const campo = inputs.find((input) => input.name === problema.campo) || inputs.find((input) => input.type !== 'checkbox');
          if (campo) {
            campo.setAttribute('aria-invalid', 'true');
            campo.focus();
            campo.select?.();
          }
          return;
        }
      }
      cerrar(valores);
    });

    abiertos.push(fondo);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(fondo);
    actualizarHabilitado();
    const focoInicial = inputs.find((input) => input.type !== 'checkbox') || (peligro && btnCancelar) || btnAceptar;
    focoInicial.focus();
  });
}

export async function pedirTexto({ campo = {}, validar = null, ...opciones } = {}) {
  const r = await pedirFormulario({
    ...opciones,
    campos: [{ nombre: 'valor', ...campo }],
    validar: validar && ((valores) => validar(valores.valor)),
  });
  return r ? r.valor : null;
}

export async function pedirConfirmacion(opciones) {
  return (await pedirFormulario({ ...opciones, campos: [] })) !== null;
}

export async function mostrarAviso(opciones) {
  await pedirFormulario({ aceptar: 'Entendido', ...opciones, campos: [], cancelar: null });
}

// Para lo que no tiene vuelta atrás: el botón se habilita solo cuando
// escribes la palabra, en vez de fallar en silencio si la escribes mal.
export async function pedirConfirmacionEscrita({ palabra = 'BORRAR', ...opciones }) {
  const r = await pedirFormulario({
    peligro: true,
    ...opciones,
    campos: [{ nombre: 'palabra', etiqueta: `Escribe ${palabra} para confirmar`, placeholder: palabra, autocapitalize: 'characters' }],
    habilitarSi: (valores) => valores.palabra.trim().toUpperCase() === palabra,
  });
  return r !== null;
}

let aviso = null;
let avisoTimer = null;

export function avisoBreve(texto, { error = false } = {}) {
  if (!aviso) {
    aviso = crear('div', 'dlg-aviso');
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');
    document.body.appendChild(aviso);
  }
  clearTimeout(avisoTimer);
  aviso.classList.toggle('dlg-aviso-error', error);
  aviso.textContent = texto;
  aviso.classList.add('visible');
  avisoTimer = setTimeout(() => aviso.classList.remove('visible'), error ? 4500 : 2600);
}
