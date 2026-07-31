// Forma de los datos y validación. Sin DOM, sin red.

export function hoyISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export function validarPeso(pesoKg) {
  const n = Number(pesoKg);
  if (!Number.isFinite(n) || n <= 0 || n > 400) {
    throw new Error('Peso inválido');
  }
  return Math.round(n * 10) / 10;
}

export function kgALb(kg) {
  return kg * 2.20462;
}

export function lbAKg(lb) {
  return lb / 2.20462;
}

// El peso SIEMPRE se guarda en kg -- esto es solo para la pantalla de
// capturar: convierte lo que la persona tecleó (en SU unidad preferida) a
// kg antes de mandarlo al servidor.
export function aKg(valor, unidad) {
  return unidad === 'lb' ? lbAKg(valor) : Number(valor);
}

// Cindy ve en lb, Miguel en kg, y quieren compararse sin tener que convertir
// mentalmente -- así que cualquier peso que se muestre en pantalla (fuera
// del campo de captura) se ve siempre en las dos unidades.
export function formatoPesoDual(pesoKg, decimales = 1) {
  if (pesoKg == null || !Number.isFinite(pesoKg)) return '—';
  const kgTxt = pesoKg.toFixed(decimales);
  const lbTxt = kgALb(pesoKg).toFixed(decimales);
  return `${kgTxt} kg · ${lbTxt} lb`;
}
