export function escapeHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caracter]);
}

export function escapeAtributo(valor) {
  return escapeHTML(valor).replace(/[\u0000-\u001f\u007f]/g, '');
}

export function idSeguro(valor) {
  const id = String(valor ?? '');
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : '';
}

export function urlLocalSegura(valor) {
  const url = String(valor ?? '');
  return /^(?:\.\.\/|\.\/)?(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(url) ? url : '';
}

export function colorSeguro(valor, respaldo = '#999999') {
  const color = String(valor ?? '');
  return /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/.test(color)
    ? color
    : respaldo;
}
