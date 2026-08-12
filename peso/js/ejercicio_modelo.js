// Reglas puras del módulo Ejercicio: sin DOM, almacenamiento ni red.

export const MODALIDADES_CARGA = ['discos', 'niveles', 'PC'];
export const CATEGORIAS_INICIALES = ['Pierna', 'Pecho', 'Bíceps', 'Tríceps', 'Abdomen', 'Espalda', 'Hombro'];

const EJERCICIOS_INICIALES = [
  // Pecho (categoria-2)
  { nombre: 'Press de banca con barra', categoriaId: 'categoria-2', modalidad: 'discos', imagen: 'imagenes/pecho-press-banca-barra.jpg', descripcion: 'Acuéstate en el banco con los pies firmes en el piso y agarra la barra un poco más ancho que los hombros. Baja controlado hasta rozar el pecho y empuja hacia arriba sin bloquear de golpe los codos. Mantén los omóplatos retraídos contra el banco durante todo el movimiento.' },
  { nombre: 'Press inclinado con mancuerna', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-press-inclinado-mancuerna.jpg', descripcion: 'En un banco inclinado 30-45°, sube las mancuernas desde la altura del pecho hasta extender los brazos sin chocarlas arriba. Baja controlado sintiendo el estiramiento en la parte alta del pectoral. Evita arquear demasiado la espalda baja.' },
  { nombre: 'Aperturas con mancuerna', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-aperturas-mancuerna.jpg', descripcion: 'Acostado en banco plano, con los codos ligeramente flexionados, abre los brazos en arco hasta sentir el estiramiento del pecho y cierra juntando las mancuernas arriba como abrazando un tronco. Es un movimiento de aislamiento: usa poco peso y controla la bajada.' },
  { nombre: 'Press de pecho en polea (Marcy)', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-press-polea-marcy.jpg', descripcion: 'Ajusta las poleas a la altura del pecho, un pie adelantado para estabilidad, y empuja ambos mangos al frente hasta extender los brazos. Regresa controlado sin dejar que las poleas te jalen de golpe. Bueno para trabajar al fallo con seguridad porque no hay barra que se pueda caer.' },
  { nombre: 'Fondos (dips) para pecho', categoriaId: 'categoria-2', modalidad: 'PC', imagen: 'imagenes/pecho-fondos.jpg', descripcion: 'En las paralelas, inclina el torso hacia adelante y los codos ligeramente hacia afuera para enfatizar pectoral inferior. Baja hasta que el hombro quede a la altura del codo y empuja de regreso. Si es muy exigente, apoya los pies en el piso para restar peso corporal.' },
  { nombre: 'Flexiones (push-ups)', categoriaId: 'categoria-2', modalidad: 'PC', imagen: 'imagenes/pecho-flexiones.jpg', descripcion: 'Manos un poco más anchas que los hombros, cuerpo en línea recta de cabeza a talones. Baja el pecho casi hasta tocar el piso y empuja de regreso sin que la cadera se hunda. Sirve como calentamiento o accesorio de alto volumen.' },
  // Espalda (categoria-6)
  { nombre: 'Peso muerto con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-peso-muerto-barra.jpg', descripcion: 'Pies al ancho de cadera, barra pegada a las espinillas, espalda neutra y pecho arriba. Empuja el piso con las piernas mientras la barra sube pegada al cuerpo, terminando con cadera y rodillas extendidas. Es el ejercicio base de fuerza de toda la cadena posterior: prioriza técnica sobre peso.' },
  { nombre: 'Remo con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-remo-barra.jpg', descripcion: 'Con el torso inclinado unos 45°, espalda recta, jala la barra hacia el abdomen apretando los omóplatos al final del recorrido. Baja controlado sin dejar que la espalda se redondee. Aporta densidad y grosor a la espalda media.' },
  { nombre: 'Jalón al pecho en polea alta (Marcy)', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-jalon-pecho-marcy.jpg', descripcion: 'Agarre ancho en la barra alta, jala hacia la parte alta del pecho llevando los codos hacia abajo y atrás, sin usar impulso del torso. Sustituye a la dominada mientras construyes fuerza para hacerla sin ayuda. Controla la subida en vez de dejar que el peso te jale los brazos.' },
  { nombre: 'Remo bajo en polea (Marcy)', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-remo-bajo-marcy.jpg', descripcion: 'Sentado, rodillas ligeramente flexionadas, jala el mango hacia el abdomen manteniendo la espalda recta y apretando omóplatos. Deja que el torso se incline un poco adelante al soltar para aumentar el rango. Trabaja trapecio medio y romboides.' },
  { nombre: 'Remo con mancuerna a una mano', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-remo-mancuerna-una-mano.jpg', descripcion: 'Apoya una rodilla y una mano en el banco, espalda paralela al piso, y jala la mancuerna hacia la cadera llevando el codo pegado al cuerpo. Trabajar un lado a la vez ayuda a corregir desbalances entre tu lado dominante y el no dominante.' },
  { nombre: 'Superman', categoriaId: 'categoria-6', modalidad: 'PC', imagen: 'imagenes/espalda-superman.jpg', descripcion: 'Boca abajo en el piso, levanta al mismo tiempo brazos, pecho y piernas unos centímetros, apretando la zona lumbar y glúteos. Sostén 1-2 segundos arriba y baja controlado. Fortalece la zona lumbar y mejora la estabilidad de tronco sin necesidad de equipo.' },
  // Hombro (categoria-7)
  { nombre: 'Press militar con barra', categoriaId: 'categoria-7', modalidad: 'discos', imagen: 'imagenes/hombro-press-militar-barra.jpg', descripcion: 'Sentado o de pie, barra a la altura de los hombros, empuja hacia arriba hasta extender los brazos sin arquear en exceso la espalda baja. Baja controlado hasta la altura de la barbilla. Es el ejercicio de empuje vertical más completo para deltoides.' },
  { nombre: 'Press de hombro con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-press-mancuerna.jpg', descripcion: 'Mancuernas a la altura de los hombros con las palmas al frente, empuja hacia arriba hasta casi juntar las mancuernas sin bloquear los codos de golpe. El mayor rango de movimiento respecto a la barra ayuda a activar más fibra del deltoides.' },
  { nombre: 'Elevación lateral con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-elevacion-lateral.jpg', descripcion: 'De pie, mancuernas a los costados, sube los brazos hacia los lados hasta la altura del hombro con un ligero quiebre en el codo. Sube y baja controlado, sin usar impulso de la cadera. Es el ejercicio clave para dar la forma de "V" al hombro (deltoides medio).' },
  { nombre: 'Elevación frontal con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-elevacion-frontal.jpg', descripcion: 'De pie, sube una mancuerna (o ambas) al frente hasta la altura del hombro con el brazo casi extendido, y baja controlado. Aísla el deltoides anterior; no balancees el torso para generar impulso.' },
  { nombre: 'Face pull en polea (Marcy)', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-face-pull-marcy.jpg', descripcion: 'Con la polea a la altura de la cara y cuerda o mango doble, jala hacia tu rostro separando las manos y llevando los codos hacia atrás y arriba. Trabaja el deltoides posterior y los rotadores externos, clave para la salud del hombro si entrenas mucho press.' },
  { nombre: 'Flexión de pica contra pared', categoriaId: 'categoria-7', modalidad: 'PC', imagen: 'imagenes/hombro-flexion-pica.jpg', descripcion: 'Con los pies apoyados en una pared y el cuerpo casi vertical (o en posición de pica con cadera elevada si eres principiante), baja la cabeza hacia el piso doblando los codos y empuja de regreso. Es la versión de peso corporal más exigente para el deltoides; progresa gradualmente.' },
  // Bíceps (categoria-3)
  { nombre: 'Curl de bíceps con barra', categoriaId: 'categoria-3', modalidad: 'discos', imagen: 'imagenes/biceps-curl-barra.jpg', descripcion: 'De pie, agarre supino al ancho de hombros, sube la barra flexionando el codo sin mover los hombros ni balancear la cadera. Baja controlado hasta extensión casi completa. El básico para construir grosor de bíceps.' },
  { nombre: 'Curl martillo con mancuerna', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-martillo.jpg', descripcion: 'Con las mancuernas en agarre neutro (pulgares arriba), sube alternando o al mismo tiempo sin girar la muñeca. Trabaja bíceps y braquial, y ayuda al grosor del antebrazo.' },
  { nombre: 'Curl predicador en banco Scott (Marcy)', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-predicador-marcy.jpg', descripcion: 'Con el brazo apoyado sobre el banco inclinado del predicador, sube el peso sin despegar el tríceps del acolchado. Al fijar el brazo se elimina el impulso, aislando por completo el bíceps.' },
  { nombre: 'Curl en polea baja (Marcy)', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-polea-marcy.jpg', descripcion: 'De pie frente a la polea baja, sube el mango flexionando el codo sin mover el torso. La polea mantiene tensión constante en el músculo durante todo el recorrido, a diferencia de la mancuerna o barra.' },
  { nombre: 'Curl concentrado con mancuerna', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-concentrado.jpg', descripcion: 'Sentado, apoya el codo en la cara interna del muslo y sube la mancuerna flexionando solo el codo, sin mover el hombro. Es el ejercicio de mayor aislamiento para el pico del bíceps.' },
  // Tríceps (categoria-4)
  { nombre: 'Press francés con barra (skullcrusher)', categoriaId: 'categoria-4', modalidad: 'discos', imagen: 'imagenes/triceps-press-frances-barra.jpg', descripcion: 'Acostado en banco, baja la barra hacia la frente doblando solo los codos, manteniendo los brazos superiores quietos y perpendiculares al piso. Extiende de regreso sin abrir los codos hacia afuera. Trabaja las tres cabezas del tríceps con buen estiramiento.' },
  { nombre: 'Extensión de tríceps en polea alta (Marcy)', categoriaId: 'categoria-4', modalidad: 'niveles', imagen: 'imagenes/triceps-extension-polea-marcy.jpg', descripcion: 'De pie frente a la polea alta, codos pegados al torso, empuja la barra o cuerda hacia abajo hasta extender el brazo y regresa controlado sin que el codo se despegue del cuerpo. Es el clásico de gimnasio para definir tríceps.' },
  { nombre: 'Patada de tríceps con mancuerna', categoriaId: 'categoria-4', modalidad: 'niveles', imagen: 'imagenes/triceps-patada-mancuerna.jpg', descripcion: 'Con el torso inclinado y el brazo superior pegado al cuerpo y paralelo al piso, extiende el antebrazo hacia atrás hasta que el brazo quede recto, y regresa controlado. Aísla bien el tríceps si mantienes el codo fijo.' },
  { nombre: 'Fondos en paralelas para tríceps', categoriaId: 'categoria-4', modalidad: 'PC', imagen: 'imagenes/triceps-fondos-paralelas.jpg', descripcion: 'A diferencia del fondo de pecho, mantén el torso lo más vertical posible y los codos cerca del cuerpo. Baja hasta 90° en el codo y empuja de regreso. Muy exigente: si te falta fuerza, apoya un pie en el piso para asistirte.' },
  { nombre: 'Press cerrado con barra', categoriaId: 'categoria-4', modalidad: 'discos', imagen: 'imagenes/triceps-press-cerrado-barra.jpg', descripcion: 'Acostado en banco, agarre un poco más cerrado que el ancho de hombros, baja la barra hacia la parte baja del pecho manteniendo los codos cerca del torso, y empuja de regreso. Es un compuesto que suma tríceps y pecho, ideal para mover más peso que en aislamiento.' },
  // Pierna (categoria-1)
  { nombre: 'Sentadilla con barra', categoriaId: 'categoria-1', modalidad: 'discos', imagen: 'imagenes/pierna-sentadilla-barra.jpg', descripcion: 'Barra sobre la espalda alta (no el cuello), pies al ancho de hombros, baja como si te sentaras manteniendo el pecho arriba y las rodillas siguiendo la dirección de los pies. Baja al menos hasta que el muslo quede paralelo al piso y sube empujando por el talón. El patrón más importante para pierna completa.' },
  { nombre: 'Peso muerto rumano con barra', categoriaId: 'categoria-1', modalidad: 'discos', imagen: 'imagenes/pierna-peso-muerto-rumano.jpg', descripcion: 'Con las rodillas casi extendidas (ligero quiebre), empuja la cadera hacia atrás bajando la barra pegada a las piernas hasta sentir estiramiento en isquiotibiales, y regresa apretando el glúteo. La espalda se mantiene neutra todo el tiempo, no se redondea.' },
  { nombre: 'Extensión de cuádriceps en máquina (Marcy)', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-extension-cuadriceps-marcy.jpg', descripcion: 'Sentado en la máquina, extiende las rodillas hasta casi estirar por completo la pierna y baja controlado sin soltar de golpe. Aísla el cuádriceps sin involucrar cadera ni espalda.' },
  { nombre: 'Curl femoral en máquina (Marcy)', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-curl-femoral-marcy.jpg', descripcion: 'Sentado o acostado según tu máquina, flexiona la rodilla llevando el talón hacia el glúteo y regresa controlado. Trabaja isquiotibiales, el músculo antagonista del cuádriceps y clave para prevenir lesiones de rodilla.' },
  { nombre: 'Zancada con mancuerna', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-zancada-mancuerna.jpg', descripcion: 'Con una mancuerna en cada mano, da un paso al frente y baja hasta que ambas rodillas formen aproximadamente 90°, sin que la rodilla de atrás toque el piso con fuerza. Empuja con el talón delantero para regresar o continuar caminando.' },
  { nombre: 'Sentadilla búlgara con mancuerna', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-sentadilla-bulgara.jpg', descripcion: 'Con el pie de atrás elevado en un banco y una mancuerna en cada mano, baja doblando la rodilla delantera hasta formar casi 90° y sube empujando por ese talón. Trabaja pierna de forma unilateral, muy exigente para cuádriceps y glúteo.' },
  { nombre: 'Puente de glúteo', categoriaId: 'categoria-1', modalidad: 'PC', imagen: 'imagenes/pierna-puente-gluteo.jpg', descripcion: 'Acostado boca arriba, rodillas flexionadas y pies apoyados, sube la cadera apretando el glúteo hasta que el cuerpo forme una línea recta de hombro a rodilla, y baja controlado. Para más intensidad, hazlo con una sola pierna apoyada.' },
  // Abdomen (categoria-5)
  { nombre: 'Rueda abdominal (ab wheel rollout)', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-rueda-abdominal.jpg', descripcion: 'De rodillas, sostén la rueda con ambas manos y rueda hacia adelante extendiendo el cuerpo lo más que puedas sin que la cadera se hunda, manteniendo el abdomen apretado todo el tiempo. Regresa a la posición inicial usando el core, no la espalda baja. Empieza con un rango corto si eres principiante.' },
  { nombre: 'Plancha (plank)', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-plancha.jpg', descripcion: 'Apoya antebrazos y puntas de pies, cuerpo en línea recta de cabeza a talón, abdomen y glúteo apretados. Sostén sin que la cadera suba ni se hunda. Es un ejercicio isométrico: mide tu progreso en tiempo sostenido con buena forma, no solo en segundos totales.' },
  { nombre: 'Crunch en polea alta (Marcy)', categoriaId: 'categoria-5', modalidad: 'niveles', imagen: 'imagenes/abdomen-crunch-polea-marcy.jpg', descripcion: 'De rodillas frente a la polea alta con la cuerda detrás de la cabeza, flexiona el torso hacia abajo usando el abdomen, no los brazos ni la cadera. Permite agregar carga progresiva al abdomen una vez que el crunch normal se queda corto.' },
  { nombre: 'Elevación de piernas', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-elevacion-piernas.jpg', descripcion: 'Colgado de una barra (o acostado en un banco si aún no tienes suficiente fuerza de agarre), sube las piernas flexionando la cadera hasta donde puedas sin balancear el cuerpo, y baja controlado. Trabaja la parte baja del abdomen y el control de cadera.' },
  { nombre: 'Crunch bicicleta', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-crunch-bicicleta.jpg', descripcion: 'Acostado boca arriba, manos detrás de la cabeza, lleva un codo hacia la rodilla contraria mientras extiendes la otra pierna, alternando en un movimiento de pedaleo controlado. Trabaja el recto abdominal y los oblicuos al mismo tiempo.' },
  { nombre: 'Giro ruso', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-giro-ruso.jpg', descripcion: 'Sentado con las rodillas flexionadas y el torso inclinado hacia atrás unos 45°, gira el tronco de lado a lado tocando el piso a cada costado (con o sin peso en las manos). Mantén el abdomen apretado para que el giro venga del torso, no solo de los brazos.' },
];

const ahoraISO = () => new Date().toISOString();
const idNuevo = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function crearDocumentoEjercicio(fecha = ahoraISO()) {
  return {
    version: 2,
    categorias: CATEGORIAS_INICIALES.map((nombre, i) => ({ id: `categoria-${i + 1}`, nombre, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    ejercicios: EJERCICIOS_INICIALES.map((e, i) => ({ id: `ejercicio-inicial-${i + 1}`, ...e, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    rutinas: [], sesiones: [], hiits: [], modificadoEn: fecha,
  };
}

export function calcularDuracionHiit({ vueltas, actividadSeg, descansoSeg }) {
  const n = Number(vueltas), actividad = Number(actividadSeg), descanso = Number(descansoSeg);
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(actividad) || actividad < 1 || !Number.isFinite(descanso) || descanso < 0) throw new Error('Configuración HIIT inválida');
  return n * actividad + Math.max(0, n - 1) * descanso;
}

export function normalizarEjercicio(ejercicio, fecha = ahoraISO()) {
  const nombre = String(ejercicio.nombre || '').trim();
  const categoriaId = String(ejercicio.categoriaId || '').trim();
  if (!nombre) throw new Error('Nombre de ejercicio requerido');
  if (!categoriaId) throw new Error('El ejercicio requiere una categoría');
  if (!MODALIDADES_CARGA.includes(ejercicio.modalidad)) throw new Error('Modalidad inválida');
  return { ...ejercicio, id: ejercicio.id || idNuevo(), nombre, categoriaId, modalidad: ejercicio.modalidad, activo: ejercicio.activo !== false, creadoEn: ejercicio.creadoEn || fecha, modificadoEn: fecha };
}

function normalizarDiscos(carga = {}) {
  const discos = { grande: Number(carga.grande || 0), chico: Number(carga.chico || 0) };
  if (Object.values(discos).some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Las cantidades de discos deben ser enteros no negativos');
  return discos;
}

export function normalizarSerie(serie, fecha = ahoraISO()) {
  const repeticiones = Number(serie.repeticiones);
  if (!serie.ejercicioId || !Number.isInteger(repeticiones) || repeticiones < 1) throw new Error('Serie inválida');
  if (!MODALIDADES_CARGA.includes(serie.modalidad)) throw new Error('Modalidad inválida');
  let carga = null;
  if (serie.modalidad === 'discos') carga = normalizarDiscos(serie.carga);
  else if (serie.modalidad !== 'PC') {
    carga = Number(serie.carga);
    if (!Number.isFinite(carga) || carga < 0) throw new Error('Carga inválida');
  }
  return { ...serie, id: serie.id || idNuevo(), repeticiones, carga, descansoPlaneadoSeg: Math.max(0, Number(serie.descansoPlaneadoSeg || 0)), descansoRealSeg: Math.max(0, Number(serie.descansoRealSeg || 0)), extraSeg: Math.max(0, Number(serie.extraSeg || 0)), creadoEn: serie.creadoEn || fecha, modificadoEn: fecha };
}

export function crearHiit(config, inicioMs = Date.now()) {
  const planeadoSeg = calcularDuracionHiit(config);
  return { id: config.id || idNuevo(), nombre: String(config.nombre || '').trim(), vueltas: Number(config.vueltas), actividadSeg: Number(config.actividadSeg), descansoSeg: Number(config.descansoSeg), cuentaRegresivaSeg: Math.max(0, Number(config.cuentaRegresivaSeg || 0)), planeadoSeg, estado: Number(config.cuentaRegresivaSeg || 0) > 0 ? 'cuenta_regresiva' : 'actividad', fase: Number(config.cuentaRegresivaSeg || 0) > 0 ? 'cuenta_regresiva' : 'actividad', vuelta: 1, inicioMs, faseInicioMs: inicioMs, activoAcumuladoMs: 0, pausaInicioMs: null };
}

export function pausarHiit(hiit, ahoraMs = Date.now()) {
  if (hiit.estado === 'pausado') return hiit;
  return { ...hiit, estadoAntesPausa: hiit.estado, estado: 'pausado', activoAcumuladoMs: (hiit.activoAcumuladoMs || 0) + Math.max(0, ahoraMs - hiit.faseInicioMs), pausaInicioMs: ahoraMs };
}

export function reanudarHiit(hiit, ahoraMs = Date.now()) {
  if (hiit.estado !== 'pausado') return hiit;
  return { ...hiit, estado: hiit.estadoAntesPausa || 'actividad', faseInicioMs: ahoraMs, pausaInicioMs: null };
}

export function finalizarHiit(datos) {
  const planeado = Number(datos.planeadoSeg);
  if (!Number.isFinite(planeado) || planeado < 1) throw new Error('Duración planeada inválida');
  const finMs = Number(datos.finMs);
  const activoMs = Number.isFinite(datos.activoAcumuladoMs)
    ? datos.activoAcumuladoMs + (datos.estado === 'pausado' ? 0 : Math.max(0, finMs - Number(datos.faseInicioMs || datos.inicioMs)))
    : Math.max(0, finMs - Number(datos.inicioMs));
  const duracionRealSeg = Math.max(0, Math.round(activoMs / 1000));
  return { duracionRealSeg, porcentaje: datos.detenido ? Math.min(100, Math.round(duracionRealSeg / planeado * 100)) : 100, estado: datos.detenido ? 'detenida' : 'completada' };
}

export function sumarExtensionDescanso(descansoSeg, toques = 1) {
  return Math.max(0, Number(descansoSeg) || 0) + Math.max(0, Number(toques) || 0) * 5;
}

export function ajustarCantidad(valor, direccion, { minimo = 0, maximo = Number.POSITIVE_INFINITY, paso = 1 } = {}) {
  const actual = Number(valor) || 0;
  const siguiente = actual + (direccion < 0 ? -paso : paso);
  return Math.min(maximo, Math.max(minimo, siguiente));
}

export function sonidosEnSegundo({ tipo, restanteSeg, esInicio = false }) {
  if (tipo === 'descanso' && esInicio) return ['rapido', 'rapido', 'rapido'];
  if (tipo === 'cuenta' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
  if (tipo === 'descanso' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
  if (tipo === 'actividad' && esInicio) return ['largo'];
  if (tipo === 'final') return ['final'];
  return [];
}

export function normalizarRutina(rutina, fecha = ahoraISO()) {
  const nombre = String(rutina.nombre || '').trim();
  if (!nombre) throw new Error('Nombre de rutina requerido');
  if (!Array.isArray(rutina.entradas) || !rutina.entradas.length) throw new Error('Agrega al menos un ejercicio');
  const entradas = rutina.entradas.map((e, orden) => {
    const series = Number(e.series), repeticiones = Number(e.repeticiones), descansoSeg = Number(e.descansoSeg);
    if (!e.ejercicioId || !Number.isInteger(series) || series < 1 || !Number.isInteger(repeticiones) || repeticiones < 1 || !Number.isFinite(descansoSeg) || descansoSeg < 0) throw new Error('Entrada de rutina inválida');
    return { ejercicioId: e.ejercicioId, orden, series, repeticiones, descansoSeg };
  });
  return { ...rutina, id: rutina.id || idNuevo(), nombre, entradas, ejercicioIds: entradas.map((e) => e.ejercicioId), activo: rutina.activo !== false, creadoEn: rutina.creadoEn || fecha, modificadoEn: fecha };
}

export function siguientePasoRutina(paso, entradas) {
  const actual = entradas[paso.ejercicioIndice];
  if (!actual) return { ...paso, terminada: true };
  if (paso.serieNumero < actual.series) return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero + 1, terminada: false };
  if (paso.ejercicioIndice + 1 < entradas.length) return { ejercicioIndice: paso.ejercicioIndice + 1, serieNumero: 1, terminada: false };
  return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero, terminada: true };
}
