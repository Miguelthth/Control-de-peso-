// Forma de los datos, valores por defecto y validación. Sin DOM, sin storage.

export const CATEGORIAS_DEFECTO = [
  { id: 'despensa', nombre: 'Despensa', icono: '🛒', color: '#e8743b', tipo: 'gasto' },
  { id: 'comida_fuera', nombre: 'Comida fuera', icono: '🍔', color: '#e5484d', tipo: 'gasto' },
  { id: 'gasolina', nombre: 'Gasolina / Transporte', icono: '⛽', color: '#c2410c', tipo: 'gasto' },
  { id: 'casa', nombre: 'Casa y servicios', icono: '🏠', color: '#4c5fd5', tipo: 'gasto' },
  { id: 'salud', nombre: 'Salud', icono: '💊', color: '#22a06b', tipo: 'gasto' },
  { id: 'suscripciones', nombre: 'Suscripciones', icono: '📺', color: '#9333ea', tipo: 'gasto' },
  { id: 'ropa', nombre: 'Ropa', icono: '👕', color: '#0891b2', tipo: 'gasto' },
  { id: 'otros_gasto', nombre: 'Otros', icono: '📦', color: '#6b7280', tipo: 'gasto' },
  { id: 'sueldo', nombre: 'Sueldo', icono: '💼', color: '#22a06b', tipo: 'ingreso' },
  { id: 'retiro_negocio', nombre: 'Retiro del negocio', icono: '🏪', color: '#16a34a', tipo: 'ingreso' },
  { id: 'otros_ingreso', nombre: 'Otros', icono: '➕', color: '#65a30d', tipo: 'ingreso' },
];

export const METODOS = ['efectivo', 'debito', 'credito', 'transferencia'];

export function generarId(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function crearDatosVacios() {
  return {
    version: 1,
    config: { moneda: 'MXN', tema: 'auto', inicioMes: 1, mostrarMetodo: true },
    movimientos: [],
    categorias: CATEGORIAS_DEFECTO.map((c) => ({ ...c })),
    presupuestos: {},
    recurrentes: [],
  };
}

export function mesDeFecha(fecha) {
  return fecha.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}

export function hoyISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export function mesActualStr() {
  return hoyISO().slice(0, 7);
}

export function validarMovimiento(mov) {
  const errores = [];
  if (!mov.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(mov.fecha)) errores.push('Fecha inválida');
  if (mov.tipo !== 'gasto' && mov.tipo !== 'ingreso') errores.push('Tipo inválido');
  if (typeof mov.monto !== 'number' || !Number.isFinite(mov.monto) || mov.monto <= 0) {
    errores.push('El monto debe ser mayor a 0');
  }
  if (!mov.categoria) errores.push('Falta categoría');
  if (!METODOS.includes(mov.metodo)) errores.push('Método inválido');
  if (errores.length) throw new Error(errores.join('. '));
  return {
    id: mov.id || generarId('mov'),
    fecha: mov.fecha,
    tipo: mov.tipo,
    monto: Math.round(mov.monto * 100) / 100,
    categoria: mov.categoria,
    metodo: mov.metodo,
    nota: (mov.nota || '').trim(),
    etiquetas: Array.isArray(mov.etiquetas) ? mov.etiquetas : [],
    recurrenteId: mov.recurrenteId || null,
    creado: mov.creado || new Date().toISOString(),
    modificado: new Date().toISOString(),
  };
}

// Repara una estructura de datos posiblemente incompleta/vieja (versión futura: migraciones).
export function normalizarDatos(datos) {
  const base = crearDatosVacios();
  if (!datos || typeof datos !== 'object') return base;
  return {
    version: datos.version || 1,
    config: { ...base.config, ...(datos.config || {}) },
    movimientos: Array.isArray(datos.movimientos) ? datos.movimientos : [],
    categorias: Array.isArray(datos.categorias) && datos.categorias.length ? datos.categorias : base.categorias,
    presupuestos: datos.presupuestos && typeof datos.presupuestos === 'object' ? datos.presupuestos : {},
    recurrentes: Array.isArray(datos.recurrentes) ? datos.recurrentes : [],
  };
}
