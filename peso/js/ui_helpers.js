import { kgALb } from './modelo.js';

export function prepararEdicion(registro, unidad) {
  const valor = unidad === 'lb' ? kgALb(registro.pesoKg) : registro.pesoKg;
  return { fecha: registro.fecha, pesoStr: Number(valor).toFixed(1) };
}

export function mensajeBorrado({ sinConexion, pendientes }) {
  if (sinConexion) return 'Registro borrado en este dispositivo · pendiente de sincronizar';
  if (pendientes > 0) return 'Registro borrado · sincronización pendiente';
  return 'Registro borrado';
}

export function planificarEdicion(fechaOriginal, fechaNueva, pesoKg) {
  const operaciones = [];
  if (fechaOriginal && fechaOriginal !== fechaNueva) operaciones.push({ tipo: 'borrar', fecha: fechaOriginal });
  operaciones.push({ tipo: 'guardar', fecha: fechaNueva, pesoKg });
  return operaciones;
}
