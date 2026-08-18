// Reglas puras del módulo Ejercicio: sin DOM, almacenamiento ni red.

export const MODALIDADES_CARGA = ['discos', 'niveles', 'PC'];
export const CATEGORIAS_INICIALES = ['Pierna', 'Pecho', 'Bíceps', 'Tríceps', 'Abdomen', 'Espalda', 'Hombro'];

const EJERCICIOS_INICIALES = [
  // Pecho (categoria-2) -- sin banco: se quitó press de banca, press inclinado y aperturas
  { nombre: 'Press de pecho en polea (Marcy)', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-press-polea-marcy.jpg', patron: 'empuje', equipo: ['marcy'], gruposSecundarios: ['Hombro', 'Tríceps'], descripcion: 'Ajusta las poleas a la altura del pecho, un pie adelantado para estabilidad, y empuja ambos mangos al frente hasta extender los brazos. Regresa controlado sin dejar que las poleas te jalen de golpe. Bueno para trabajar al fallo con seguridad porque no hay barra que se pueda caer.' },
  { nombre: 'Fondos (dips) para pecho', categoriaId: 'categoria-2', modalidad: 'PC', imagen: 'imagenes/pecho-fondos.jpg', patron: 'empuje', equipo: ['fondos'], gruposSecundarios: ['Tríceps', 'Hombro'], descripcion: 'En las paralelas, inclina el torso hacia adelante y los codos ligeramente hacia afuera para enfatizar pectoral inferior. Baja hasta que el hombro quede a la altura del codo y empuja de regreso. Si es muy exigente, apoya los pies en el piso para restar peso corporal.' },
  { nombre: 'Flexiones (push-ups)', categoriaId: 'categoria-2', modalidad: 'PC', imagen: 'imagenes/pecho-flexiones.jpg', patron: 'empuje', equipo: ['PC'], gruposSecundarios: ['Tríceps', 'Hombro'], descripcion: 'Manos un poco más anchas que los hombros, cuerpo en línea recta de cabeza a talones. Baja el pecho casi hasta tocar el piso y empuja de regreso sin que la cadera se hunda. Sirve como calentamiento o accesorio de alto volumen.' },
  { nombre: 'Press de piso con mancuerna', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-press-piso-mancuerna.jpg', patron: 'empuje', equipo: ['mancuerna'], gruposSecundarios: ['Tríceps', 'Hombro'], descripcion: 'Acostado en el piso (no en banco), rodillas flexionadas y pies apoyados, empuja las mancuernas hacia arriba desde el pecho hasta casi extender los brazos. El piso frena el recorrido a la altura del codo, así que hay menos riesgo de sobrecargar el hombro que en banco. Sustituto directo del press de banca sin necesitar uno.' },
  { nombre: 'Butterfly (pec deck) en la Marcy', categoriaId: 'categoria-2', modalidad: 'niveles', imagen: 'imagenes/pecho-butterfly-marcy.jpg', patron: 'empuje', equipo: ['marcy'], gruposSecundarios: ['Hombro'], descripcion: 'Sentado frente a las poleas a la altura del pecho, junta ambos brazos al frente en arco, casi extendidos, apretando el pectoral en el centro. Regresa controlado sintiendo el estiramiento. Es de aislamiento: úsalo después de un ejercicio de empuje más pesado, no como el primero de tu rutina.' },
  // Espalda (categoria-6)
  { nombre: 'Peso muerto con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-peso-muerto-barra.jpg', patron: 'tiron', equipo: ['barra'], gruposSecundarios: ['Pierna'], descripcion: 'Pies al ancho de cadera, barra pegada a las espinillas, espalda neutra y pecho arriba. Empuja el piso con las piernas mientras la barra sube pegada al cuerpo, terminando con cadera y rodillas extendidas. Es el ejercicio base de fuerza de toda la cadena posterior: prioriza técnica sobre peso.' },
  { nombre: 'Remo con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-remo-barra.jpg', patron: 'tiron', equipo: ['barra'], gruposSecundarios: ['Bíceps'], descripcion: 'Con el torso inclinado unos 45°, espalda recta, jala la barra hacia el abdomen apretando los omóplatos al final del recorrido. Baja controlado sin dejar que la espalda se redondee. Aporta densidad y grosor a la espalda media.' },
  { nombre: 'Jalón al pecho en polea alta (Marcy)', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-jalon-pecho-marcy.jpg', patron: 'tiron', equipo: ['marcy'], gruposSecundarios: ['Bíceps'], descripcion: 'Agarre ancho en la barra alta, jala hacia la parte alta del pecho llevando los codos hacia abajo y atrás, sin usar impulso del torso. Sustituye a la dominada mientras construyes fuerza para hacerla sin ayuda. Controla la subida en vez de dejar que el peso te jale los brazos.' },
  { nombre: 'Remo bajo en polea (Marcy)', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-remo-bajo-marcy.jpg', patron: 'tiron', equipo: ['marcy'], gruposSecundarios: ['Bíceps'], descripcion: 'Sentado, rodillas ligeramente flexionadas, jala el mango hacia el abdomen manteniendo la espalda recta y apretando omóplatos. Deja que el torso se incline un poco adelante al soltar para aumentar el rango. Trabaja trapecio medio y romboides.' },
  { nombre: 'Remo con mancuerna a una mano', categoriaId: 'categoria-6', modalidad: 'niveles', imagen: 'imagenes/espalda-remo-mancuerna-una-mano.jpg', patron: 'tiron', equipo: ['mancuerna'], gruposSecundarios: ['Bíceps'], descripcion: 'Apoya una rodilla y una mano en el banco, espalda paralela al piso, y jala la mancuerna hacia la cadera llevando el codo pegado al cuerpo. Trabajar un lado a la vez ayuda a corregir desbalances entre tu lado dominante y el no dominante.' },
  { nombre: 'Superman', categoriaId: 'categoria-6', modalidad: 'PC', imagen: 'imagenes/espalda-superman.jpg', patron: 'core', equipo: ['PC'], gruposSecundarios: [], descripcion: 'Boca abajo en el piso, levanta al mismo tiempo brazos, pecho y piernas unos centímetros, apretando la zona lumbar y glúteos. Sostén 1-2 segundos arriba y baja controlado. Fortalece la zona lumbar y mejora la estabilidad de tronco sin necesidad de equipo.' },
  { nombre: 'Dominadas', categoriaId: 'categoria-6', modalidad: 'PC', imagen: 'imagenes/espalda-dominadas.jpg', patron: 'tiron', equipo: ['dominadas'], gruposSecundarios: ['Bíceps'], descripcion: 'Cuelga de la barra con agarre prono (palmas viendo hacia adelante) un poco más ancho que los hombros, y jala hasta que la barbilla pase la barra. Baja controlado hasta extensión completa del brazo, sin balancear el cuerpo. El mejor ejercicio de espalda que existe; si aún no puedes hacer una completa, empieza con negativas (bájate despacio desde arriba).' },
  { nombre: 'Encogimientos con barra', categoriaId: 'categoria-6', modalidad: 'discos', imagen: 'imagenes/espalda-encogimientos-barra.jpg', patron: 'tiron', equipo: ['barra'], gruposSecundarios: [], descripcion: 'De pie, barra sujeta con ambas manos al frente de los muslos, sube los hombros lo más que puedas directo hacia arriba (sin rodarlos hacia adelante ni atrás) y sostén un segundo arriba. Baja controlado. Es el ejercicio directo para el trapecio, que ningún otro de la rutina trabaja de lleno.' },
  // Hombro (categoria-7)
  { nombre: 'Press militar con barra', categoriaId: 'categoria-7', modalidad: 'discos', imagen: 'imagenes/hombro-press-militar-barra.jpg', patron: 'empuje', equipo: ['barra'], gruposSecundarios: ['Tríceps'], descripcion: 'Sentado o de pie, barra a la altura de los hombros, empuja hacia arriba hasta extender los brazos sin arquear en exceso la espalda baja. Baja controlado hasta la altura de la barbilla. Es el ejercicio de empuje vertical más completo para deltoides.' },
  { nombre: 'Press de hombro con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-press-mancuerna.jpg', patron: 'empuje', equipo: ['mancuerna'], gruposSecundarios: ['Tríceps'], descripcion: 'Mancuernas a la altura de los hombros con las palmas al frente, empuja hacia arriba hasta casi juntar las mancuernas sin bloquear los codos de golpe. El mayor rango de movimiento respecto a la barra ayuda a activar más fibra del deltoides.' },
  { nombre: 'Elevación lateral con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-elevacion-lateral.jpg', patron: 'empuje', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'De pie, mancuernas a los costados, sube los brazos hacia los lados hasta la altura del hombro con un ligero quiebre en el codo. Sube y baja controlado, sin usar impulso de la cadera. Es el ejercicio clave para dar la forma de "V" al hombro (deltoides medio).' },
  { nombre: 'Elevación frontal con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-elevacion-frontal.jpg', patron: 'empuje', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'De pie, sube una mancuerna (o ambas) al frente hasta la altura del hombro con el brazo casi extendido, y baja controlado. Aísla el deltoides anterior; no balancees el torso para generar impulso.' },
  { nombre: 'Face pull en polea (Marcy)', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-face-pull-marcy.jpg', patron: 'tiron', equipo: ['marcy'], gruposSecundarios: ['Espalda'], descripcion: 'Con la polea a la altura de la cara y cuerda o mango doble, jala hacia tu rostro separando las manos y llevando los codos hacia atrás y arriba. Trabaja el deltoides posterior y los rotadores externos, clave para la salud del hombro si entrenas mucho press.' },
  { nombre: 'Flexión de pica contra pared', categoriaId: 'categoria-7', modalidad: 'PC', imagen: 'imagenes/hombro-flexion-pica.jpg', patron: 'empuje', equipo: ['PC'], gruposSecundarios: ['Tríceps'], descripcion: 'Con los pies apoyados en una pared y el cuerpo casi vertical (o en posición de pica con cadera elevada si eres principiante), baja la cabeza hacia el piso doblando los codos y empuja de regreso. Es la versión de peso corporal más exigente para el deltoides; progresa gradualmente.' },
  { nombre: 'Remo al mentón con mancuerna', categoriaId: 'categoria-7', modalidad: 'niveles', imagen: 'imagenes/hombro-remo-menton-mancuerna.jpg', patron: 'tiron', equipo: ['mancuerna'], gruposSecundarios: ['Espalda'], descripcion: 'De pie, mancuernas al frente de los muslos, jala hacia arriba llevando los codos por encima de las manos hasta que las mancuernas lleguen casi a la altura del mentón. Baja controlado. Trabaja deltoides lateral y trapecio; si sientes pellizco en el hombro, sube menos alto.' },
  // Bíceps (categoria-3)
  { nombre: 'Curl de bíceps con barra', categoriaId: 'categoria-3', modalidad: 'discos', imagen: 'imagenes/biceps-curl-barra.jpg', patron: 'tiron', equipo: ['barra'], gruposSecundarios: [], descripcion: 'De pie, agarre supino al ancho de hombros, sube la barra flexionando el codo sin mover los hombros ni balancear la cadera. Baja controlado hasta extensión casi completa. El básico para construir grosor de bíceps.' },
  { nombre: 'Curl martillo con mancuerna', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-martillo.jpg', patron: 'tiron', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'Con las mancuernas en agarre neutro (pulgares arriba), sube alternando o al mismo tiempo sin girar la muñeca. Trabaja bíceps y braquial, y ayuda al grosor del antebrazo.' },
  { nombre: 'Curl predicador en banco Scott (Marcy)', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-predicador-marcy.jpg', patron: 'tiron', equipo: ['marcy'], gruposSecundarios: [], descripcion: 'Con el brazo apoyado sobre el banco inclinado del predicador, sube el peso sin despegar el tríceps del acolchado. Al fijar el brazo se elimina el impulso, aislando por completo el bíceps.' },
  { nombre: 'Curl en polea baja (Marcy)', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-polea-marcy.jpg', patron: 'tiron', equipo: ['marcy'], gruposSecundarios: [], descripcion: 'De pie frente a la polea baja, sube el mango flexionando el codo sin mover el torso. La polea mantiene tensión constante en el músculo durante todo el recorrido, a diferencia de la mancuerna o barra.' },
  { nombre: 'Curl concentrado con mancuerna', categoriaId: 'categoria-3', modalidad: 'niveles', imagen: 'imagenes/biceps-curl-concentrado.jpg', patron: 'tiron', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'Sentado, apoya el codo en la cara interna del muslo y sube la mancuerna flexionando solo el codo, sin mover el hombro. Es el ejercicio de mayor aislamiento para el pico del bíceps.' },
  { nombre: 'Dominadas supinas (chin-ups)', categoriaId: 'categoria-3', modalidad: 'PC', imagen: 'imagenes/biceps-dominadas-supinas.jpg', patron: 'tiron', equipo: ['dominadas'], gruposSecundarios: ['Espalda'], descripcion: 'Igual que la dominada, pero con agarre supino (palmas viendo hacia ti) y manos al ancho de hombros. El giro de muñeca mete más al bíceps en el jalón, sin dejar de trabajar espalda. Buena opción para alternar con las dominadas normales.' },
  // Tríceps (categoria-4) -- sin banco: se quitó press francés y press cerrado (acostados)
  { nombre: 'Extensión de tríceps en polea alta (Marcy)', categoriaId: 'categoria-4', modalidad: 'niveles', imagen: 'imagenes/triceps-extension-polea-marcy.jpg', patron: 'empuje', equipo: ['marcy'], gruposSecundarios: [], descripcion: 'De pie frente a la polea alta, codos pegados al torso, empuja la barra o cuerda hacia abajo hasta extender el brazo y regresa controlado sin que el codo se despegue del cuerpo. Es el clásico de gimnasio para definir tríceps.' },
  { nombre: 'Patada de tríceps con mancuerna', categoriaId: 'categoria-4', modalidad: 'niveles', imagen: 'imagenes/triceps-patada-mancuerna.jpg', patron: 'empuje', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'Con el torso inclinado y el brazo superior pegado al cuerpo y paralelo al piso, extiende el antebrazo hacia atrás hasta que el brazo quede recto, y regresa controlado. Aísla bien el tríceps si mantienes el codo fijo.' },
  { nombre: 'Fondos en paralelas para tríceps', categoriaId: 'categoria-4', modalidad: 'PC', imagen: 'imagenes/triceps-fondos-paralelas.jpg', patron: 'empuje', equipo: ['fondos'], gruposSecundarios: ['Pecho', 'Hombro'], descripcion: 'A diferencia del fondo de pecho, mantén el torso lo más vertical posible y los codos cerca del cuerpo. Baja hasta 90° en el codo y empuja de regreso. Muy exigente: si te falta fuerza, apoya un pie en el piso para asistirte.' },
  { nombre: 'Extensión de tríceps sobre la cabeza', categoriaId: 'categoria-4', modalidad: 'discos', imagen: 'imagenes/triceps-extension-sobre-cabeza-barra.jpg', patron: 'empuje', equipo: ['barra'], gruposSecundarios: [], descripcion: 'De pie, barra sujeta con ambas manos por encima de la cabeza, baja doblando solo los codos hasta sentir el estiramiento detrás del brazo, y extiende de regreso. Mantén los codos apuntando al frente, sin abrirlos. Sustituto de pie del press francés, no necesita banco.' },
  // Pierna (categoria-1) -- sin rack: se quitó sentadilla con barra y búlgara
  { nombre: 'Peso muerto rumano con barra', categoriaId: 'categoria-1', modalidad: 'discos', imagen: 'imagenes/pierna-peso-muerto-rumano.jpg', patron: 'pierna', equipo: ['barra'], gruposSecundarios: ['Espalda'], descripcion: 'Con las rodillas casi extendidas (ligero quiebre), empuja la cadera hacia atrás bajando la barra pegada a las piernas hasta sentir estiramiento en isquiotibiales, y regresa apretando el glúteo. La espalda se mantiene neutra todo el tiempo, no se redondea.' },
  { nombre: 'Extensión de cuádriceps en máquina (Marcy)', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-extension-cuadriceps-marcy.jpg', patron: 'pierna', equipo: ['marcy'], gruposSecundarios: [], descripcion: 'Sentado en la máquina, extiende las rodillas hasta casi estirar por completo la pierna y baja controlado sin soltar de golpe. Aísla el cuádriceps sin involucrar cadera ni espalda.' },
  { nombre: 'Curl femoral en máquina (Marcy)', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-curl-femoral-marcy.jpg', patron: 'pierna', equipo: ['marcy'], gruposSecundarios: [], descripcion: 'Sentado o acostado según tu máquina, flexiona la rodilla llevando el talón hacia el glúteo y regresa controlado. Trabaja isquiotibiales, el músculo antagonista del cuádriceps y clave para prevenir lesiones de rodilla.' },
  { nombre: 'Zancada con mancuerna', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-zancada-mancuerna.jpg', patron: 'pierna', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'Con una mancuerna en cada mano, da un paso al frente y baja hasta que ambas rodillas formen aproximadamente 90°, sin que la rodilla de atrás toque el piso con fuerza. Empuja con el talón delantero para regresar o continuar caminando.' },
  { nombre: 'Puente de glúteo', categoriaId: 'categoria-1', modalidad: 'PC', imagen: 'imagenes/pierna-puente-gluteo.jpg', patron: 'pierna', equipo: ['PC'], gruposSecundarios: [], descripcion: 'Acostado boca arriba, rodillas flexionadas y pies apoyados, sube la cadera apretando el glúteo hasta que el cuerpo forme una línea recta de hombro a rodilla, y baja controlado. Para más intensidad, hazlo con una sola pierna apoyada.' },
  { nombre: 'Sentadilla goblet con mancuerna', categoriaId: 'categoria-1', modalidad: 'niveles', imagen: 'imagenes/pierna-sentadilla-goblet-mancuerna.jpg', patron: 'pierna', equipo: ['mancuerna'], gruposSecundarios: [], descripcion: 'Sostén una mancuerna vertical pegada al pecho con ambas manos, pies al ancho de hombros. Baja como sentadilla manteniendo el pecho arriba y los codos rozando las rodillas al fondo, sube empujando por los talones. Sustituto de la sentadilla con barra: no necesita rack, y el peso al frente ayuda a mantener la postura.' },
  { nombre: 'Sentadilla al aire', categoriaId: 'categoria-1', modalidad: 'PC', imagen: 'imagenes/pierna-sentadilla-aire.jpg', patron: 'pierna', equipo: ['PC'], gruposSecundarios: [], descripcion: 'Pies al ancho de hombros, brazos al frente para el balance, baja como si te fueras a sentar hasta que el muslo quede paralelo al piso, y sube. Sirve como calentamiento antes de cargar peso, o como accesorio de alto volumen sin equipo.' },
  // Abdomen (categoria-5)
  { nombre: 'Rueda abdominal (ab wheel rollout)', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-rueda-abdominal.jpg', patron: 'core', equipo: ['rueda'], gruposSecundarios: ['Hombro'], descripcion: 'De rodillas, sostén la rueda con ambas manos y rueda hacia adelante extendiendo el cuerpo lo más que puedas sin que la cadera se hunda, manteniendo el abdomen apretado todo el tiempo. Regresa a la posición inicial usando el core, no la espalda baja. Empieza con un rango corto si eres principiante.' },
  { nombre: 'Plancha (plank)', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-plancha.jpg', patron: 'core', equipo: ['PC'], gruposSecundarios: [], descripcion: 'Apoya antebrazos y puntas de pies, cuerpo en línea recta de cabeza a talón, abdomen y glúteo apretados. Sostén sin que la cadera suba ni se hunda. Es un ejercicio isométrico: mide tu progreso en tiempo sostenido con buena forma, no solo en segundos totales.' },
  { nombre: 'Crunch en polea alta (Marcy)', categoriaId: 'categoria-5', modalidad: 'niveles', imagen: 'imagenes/abdomen-crunch-polea-marcy.jpg', patron: 'core', equipo: ['marcy'], gruposSecundarios: [], descripcion: 'De rodillas frente a la polea alta con la cuerda detrás de la cabeza, flexiona el torso hacia abajo usando el abdomen, no los brazos ni la cadera. Permite agregar carga progresiva al abdomen una vez que el crunch normal se queda corto.' },
  { nombre: 'Elevación de piernas', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-elevacion-piernas.jpg', patron: 'core', equipo: ['dominadas', 'PC'], gruposSecundarios: [], descripcion: 'Colgado de una barra (o acostado en un banco si aún no tienes suficiente fuerza de agarre), sube las piernas flexionando la cadera hasta donde puedas sin balancear el cuerpo, y baja controlado. Trabaja la parte baja del abdomen y el control de cadera.' },
  { nombre: 'Crunch bicicleta', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-crunch-bicicleta.jpg', patron: 'core', equipo: ['PC'], gruposSecundarios: [], descripcion: 'Acostado boca arriba, manos detrás de la cabeza, lleva un codo hacia la rodilla contraria mientras extiendes la otra pierna, alternando en un movimiento de pedaleo controlado. Trabaja el recto abdominal y los oblicuos al mismo tiempo.' },
  { nombre: 'Giro ruso', categoriaId: 'categoria-5', modalidad: 'PC', imagen: 'imagenes/abdomen-giro-ruso.jpg', patron: 'core', equipo: ['PC'], gruposSecundarios: [], descripcion: 'Sentado con las rodillas flexionadas y el torso inclinado hacia atrás unos 45°, gira el tronco de lado a lado tocando el piso a cada costado (con o sin peso en las manos). Mantén el abdomen apretado para que el giro venga del torso, no solo de los brazos.' },
];

// ────────── Catálogo de HIIT (Fase 5) — separado del catálogo de pesas ──────────
// Cada rutina de HIIT trae su propia lista de ejercicios (nombre/descripción/
// imagen autocontenidos, no referencian ejercicios de EJERCICIOS_INICIALES)
// porque son de peso corporal y rotan por vuelta, no se cargan con equipo.

const EJ_HIIT = {
  mountainClimbers: { nombre: 'Mountain climbers', descripcion: 'En posición de plancha con brazos extendidos, lleva las rodillas al pecho alternando rápido, como si corrieras en el piso. Mantén la cadera baja, sin que suba.', imagen: 'imagenes/hiit-mountain-climbers.jpg' },
  sentadillaAire: { nombre: 'Sentadilla al aire', descripcion: 'Pies al ancho de hombros, baja como si te sentaras hasta que el muslo quede paralelo al piso, y sube. Ritmo constante, sin pausas.', imagen: 'imagenes/pierna-sentadilla-aire.jpg' },
  sentadillaSalto: { nombre: 'Sentadilla con salto', descripcion: 'Baja como sentadilla normal y explota hacia arriba saltando lo más alto posible, aterrizando suave con las rodillas flexionadas. Enlaza el aterrizaje directo con la siguiente bajada.', imagen: 'imagenes/hiit-sentadilla-salto.jpg' },
  flexionPliometrica: { nombre: 'Flexión pliométrica', descripcion: 'Baja como una flexión normal y empuja con fuerza suficiente para que las manos se despeguen del piso. Aterriza suave y baja directo a la siguiente. Si es muy exigente, alterna con flexiones normales.', imagen: 'imagenes/hiit-flexion-pliometrica.jpg' },
  flexiones: { nombre: 'Flexiones', descripcion: 'Manos un poco más anchas que los hombros, cuerpo en línea recta. Baja el pecho casi al piso y empuja de regreso, sin que la cadera se hunda.', imagen: 'imagenes/pecho-flexiones.jpg' },
  saltarCuerda: { nombre: 'Saltar la cuerda', descripcion: 'Saltos pequeños y constantes, apoyando en la punta del pie, con la cuerda girando desde las muñecas, no desde el hombro. Si no tienes cuerda, simula el movimiento igual (saltos con giro de muñeca).', imagen: 'imagenes/hiit-saltar-cuerda.jpg' },
  talonesGluteo: { nombre: 'Talones al glúteo', descripcion: 'Trota en el mismo lugar llevando los talones hacia atrás hasta tocar el glúteo con cada paso, lo más rápido que puedas mantener la técnica.', imagen: 'imagenes/hiit-talones-gluteo.jpg' },
  stepUpRodilla: { nombre: 'Step-up con rodilla', descripcion: 'Sube a un escalón o banco firme con una pierna, y al llegar arriba sube la otra rodilla al pecho. Baja controlado y alterna la pierna que sube.', imagen: 'imagenes/hiit-step-up-rodilla.jpg' },
  saltosLaterales: { nombre: 'Saltos laterales', descripcion: 'Salta de lado a lado sobre una línea imaginaria en el piso, aterrizando suave con ambos pies. Mantén el ritmo constante sin perder el equilibrio.', imagen: 'imagenes/hiit-saltos-laterales.jpg' },
  plancha: { nombre: 'Plancha', descripcion: 'Antebrazos y puntas de pies en el piso, cuerpo en línea recta de cabeza a talón, abdomen apretado. Sostén sin que la cadera suba ni se hunda.', imagen: 'imagenes/abdomen-plancha.jpg' },
  bicicleta: { nombre: 'Crunch bicicleta', descripcion: 'Acostado boca arriba, manos detrás de la cabeza, lleva un codo hacia la rodilla contraria mientras extiendes la otra pierna, alternando en pedaleo controlado.', imagen: 'imagenes/abdomen-crunch-bicicleta.jpg' },
  giroRuso: { nombre: 'Giro ruso', descripcion: 'Sentado, rodillas flexionadas, torso inclinado hacia atrás unos 45°, gira el tronco de lado a lado tocando el piso a cada costado.', imagen: 'imagenes/abdomen-giro-ruso.jpg' },
  burpees: { nombre: 'Burpees', descripcion: 'De pie, baja a cuclillas y apoya las manos, avienta los pies hacia atrás quedando en plancha, haz una flexión (opcional), regresa los pies de un salto y salta hacia arriba con los brazos extendidos. El más completo y el más exigente.', imagen: '' },
  jumpingJacks: { nombre: 'Jumping jacks', descripcion: 'Salta separando piernas y brazos al mismo tiempo (brazos arriba), y vuelve a juntar todo en el siguiente salto. Ritmo constante, buen calentamiento o relleno de intervalo.', imagen: '' },
};

const RUTINAS_HIIT_INICIALES = [
  { nombre: 'Tabata', descripcion: 'El protocolo clásico: 20 segundos al máximo esfuerzo, 10 de descanso, 8 vueltas (4 minutos). Corto pero brutal.', vueltas: 8, actividadSeg: 20, descansoSeg: 10, ejercicios: [EJ_HIIT.burpees, EJ_HIIT.mountainClimbers, EJ_HIIT.sentadillaSalto, EJ_HIIT.flexionPliometrica] },
  { nombre: '30/30', descripcion: 'Trabajo y descanso iguales, 30 segundos cada uno, 10 vueltas. Buen punto de entrada al HIIT clásico.', vueltas: 10, actividadSeg: 30, descansoSeg: 30, ejercicios: [EJ_HIIT.jumpingJacks, EJ_HIIT.sentadillaAire, EJ_HIIT.mountainClimbers, EJ_HIIT.plancha] },
  { nombre: '40/20', descripcion: '40 segundos de trabajo, 20 de descanso, 8 vueltas. Más tiempo bajo esfuerzo que el 30/30.', vueltas: 8, actividadSeg: 40, descansoSeg: 20, ejercicios: [EJ_HIIT.sentadillaSalto, EJ_HIIT.flexiones, EJ_HIIT.talonesGluteo, EJ_HIIT.bicicleta] },
  { nombre: '45/15', descripcion: '45 segundos de trabajo, 15 de descanso, 8 vueltas. Exige mantener el ritmo con poco tiempo para recuperar.', vueltas: 8, actividadSeg: 45, descansoSeg: 15, ejercicios: [EJ_HIIT.mountainClimbers, EJ_HIIT.stepUpRodilla, EJ_HIIT.saltosLaterales, EJ_HIIT.giroRuso] },
  { nombre: 'Sprints (estilo Wingate)', descripcion: '30 segundos al máximo esfuerzo, 90 de descanso completo, 6 vueltas. Protocolo de potencia: cada repetición debe salir casi al 100%, por eso el descanso es largo.', vueltas: 6, actividadSeg: 30, descansoSeg: 90, ejercicios: [EJ_HIIT.sentadillaSalto, EJ_HIIT.burpees, EJ_HIIT.saltosLaterales] },
  { nombre: 'Principiante', descripcion: '20 segundos de trabajo, 40 de descanso, 8 vueltas. Más tiempo para recuperar entre cada intervalo; ideal para empezar.', vueltas: 8, actividadSeg: 20, descansoSeg: 40, ejercicios: [EJ_HIIT.sentadillaAire, EJ_HIIT.flexiones, EJ_HIIT.plancha, EJ_HIIT.jumpingJacks] },
];

// Presets de Caminar/Correr -- progresión clásica de menos a más carrera,
// para que la pestaña no arranque vacía (mismo criterio que RUTINAS_HIIT_INICIALES).
const RUTINAS_WR_INICIALES = [
  {
    nombre: 'Principiante', descripcion: 'Camina 4 min, corre 1 min. Empieza aquí si tienes tiempo sin correr.',
    vueltas: 6, calentamientoSeg: 300, enfriamientoSeg: 0,
    fases: [
      { nombre: 'Caminar', tipo: 'caminar', duracionSeg: 240 },
      { nombre: 'Correr', tipo: 'correr', duracionSeg: 60 },
    ],
  },
  {
    nombre: 'Intermedio', descripcion: 'Mitad y mitad: 2 min caminando, 2 min corriendo.',
    vueltas: 8, calentamientoSeg: 300, enfriamientoSeg: 0,
    fases: [
      { nombre: 'Caminar', tipo: 'caminar', duracionSeg: 120 },
      { nombre: 'Correr', tipo: 'correr', duracionSeg: 120 },
    ],
  },
  {
    nombre: 'Avanzado', descripcion: 'Corre 3 min con solo 1 min de caminata para recuperar.',
    vueltas: 8, calentamientoSeg: 300, enfriamientoSeg: 300,
    fases: [
      { nombre: 'Caminar', tipo: 'caminar', duracionSeg: 60 },
      { nombre: 'Correr', tipo: 'correr', duracionSeg: 180 },
    ],
  },
];

const ahoraISO = () => new Date().toISOString();
const idNuevo = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function crearDocumentoEjercicio(fecha = ahoraISO()) {
  return {
    version: 2,
    categorias: CATEGORIAS_INICIALES.map((nombre, i) => ({ id: `categoria-${i + 1}`, nombre, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    ejercicios: EJERCICIOS_INICIALES.map((e, i) => ({ id: `ejercicio-inicial-${i + 1}`, ...e, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    rutinasHiit: RUTINAS_HIIT_INICIALES.map((r, i) => ({ id: `rutina-hiit-inicial-${i + 1}`, ...r, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    rutinasWr: RUTINAS_WR_INICIALES.map((r, i) => ({ id: `rutina-wr-inicial-${i + 1}`, ...r, activo: true, creadoEn: fecha, modificadoEn: fecha })),
    rutinas: [], sesiones: [], hiits: [], wrs: [], modificadoEn: fecha,
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
  if (tipo === 'actividad' && restanteSeg >= 1 && restanteSeg <= 3) return ['cuenta'];
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

// Banco de ejercicios de HIIT disponible al armar una rutina propia --
// exportado como arreglo (no el objeto EJ_HIIT interno con llaves en
// inglés) para que la UI lo recorra sin exponer los nombres de propiedad.
export const BANCO_EJERCICIOS_HIIT = Object.values(EJ_HIIT);

export function normalizarRutinaHiit(rutina, fecha = ahoraISO()) {
  const nombre = String(rutina.nombre || '').trim();
  if (!nombre) throw new Error('Nombre de rutina requerido');
  const vueltas = Number(rutina.vueltas), actividadSeg = Number(rutina.actividadSeg), descansoSeg = Number(rutina.descansoSeg);
  if (!Number.isInteger(vueltas) || vueltas < 1) throw new Error('Vueltas inválidas');
  if (!Number.isFinite(actividadSeg) || actividadSeg < 1) throw new Error('Actividad inválida');
  if (!Number.isFinite(descansoSeg) || descansoSeg < 0) throw new Error('Descanso inválido');
  if (!Array.isArray(rutina.ejercicios) || !rutina.ejercicios.length) throw new Error('Agrega al menos un ejercicio');
  const ejercicios = rutina.ejercicios.map((e) => ({ nombre: String(e.nombre || '').trim(), descripcion: String(e.descripcion || ''), imagen: String(e.imagen || '') }));
  if (ejercicios.some((e) => !e.nombre)) throw new Error('Cada ejercicio de la rutina necesita nombre');
  return {
    ...rutina, id: rutina.id || idNuevo(), nombre, descripcion: String(rutina.descripcion || ''),
    vueltas, actividadSeg, descansoSeg, ejercicios,
    activo: rutina.activo !== false, creadoEn: rutina.creadoEn || fecha, modificadoEn: fecha,
  };
}

export function siguientePasoRutina(paso, entradas) {
  const actual = entradas[paso.ejercicioIndice];
  if (!actual) return { ...paso, terminada: true };
  if (paso.serieNumero < actual.series) return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero + 1, terminada: false };
  if (paso.ejercicioIndice + 1 < entradas.length) return { ejercicioIndice: paso.ejercicioIndice + 1, serieNumero: 1, terminada: false };
  return { ejercicioIndice: paso.ejercicioIndice, serieNumero: paso.serieNumero, terminada: true };
}

// ────────── Caminar/Correr (W/R) ──────────
// A diferencia de HIIT (dos duraciones fijas que se alternan), una rutina
// W/R es una LISTA ORDENADA de fases que el usuario arma como quiera y que
// se repite `vueltas` veces, con calentamiento/enfriamiento opcionales
// alrededor. Eso permite desde el clásico "camina 3 / corre 1" hasta una
// pirámide con duraciones distintas en cada tramo.

export const TIPOS_FASE_WR = ['caminar', 'correr', 'calentamiento', 'enfriamiento'];

export function normalizarRutinaWr(rutina, fecha = ahoraISO()) {
  const nombre = String(rutina.nombre || '').trim();
  if (!nombre) throw new Error('Nombre de rutina requerido');
  const vueltas = Number(rutina.vueltas);
  if (!Number.isInteger(vueltas) || vueltas < 1) throw new Error('Vueltas inválidas');
  const calentamientoSeg = Number(rutina.calentamientoSeg || 0);
  if (!Number.isFinite(calentamientoSeg) || calentamientoSeg < 0) throw new Error('Calentamiento inválido');
  const enfriamientoSeg = Number(rutina.enfriamientoSeg || 0);
  if (!Number.isFinite(enfriamientoSeg) || enfriamientoSeg < 0) throw new Error('Enfriamiento inválido');
  if (!Array.isArray(rutina.fases) || !rutina.fases.length) throw new Error('Agrega al menos una fase');
  const fases = rutina.fases.map((f) => {
    const duracionSeg = Number(f.duracionSeg);
    if (!Number.isFinite(duracionSeg) || duracionSeg < 1) throw new Error('Cada fase necesita una duración de al menos 1 segundo');
    if (!TIPOS_FASE_WR.includes(f.tipo)) throw new Error('Tipo de fase inválido');
    return { nombre: String(f.nombre || '').trim() || (f.tipo === 'correr' ? 'Correr' : 'Caminar'), tipo: f.tipo, duracionSeg };
  });
  return {
    ...rutina, id: rutina.id || idNuevo(), nombre, descripcion: String(rutina.descripcion || ''),
    vueltas, calentamientoSeg, enfriamientoSeg, fases,
    activo: rutina.activo !== false, creadoEn: rutina.creadoEn || fecha, modificadoEn: fecha,
  };
}

// La secuencia completa y plana de fases que se van a ejecutar, en orden.
// `vuelta` es 0 para calentamiento/enfriamiento (no pertenecen a ninguna
// vuelta) y 1..N para las fases del ciclo.
export function fasesWr(rutina) {
  const fases = [];
  if (rutina.calentamientoSeg > 0) fases.push({ tipo: 'calentamiento', nombre: 'Calentamiento', seg: rutina.calentamientoSeg, vuelta: 0 });
  for (let v = 1; v <= rutina.vueltas; v++) {
    for (const f of rutina.fases) fases.push({ tipo: f.tipo, nombre: f.nombre, seg: f.duracionSeg, vuelta: v });
  }
  if (rutina.enfriamientoSeg > 0) fases.push({ tipo: 'enfriamiento', nombre: 'Enfriamiento', seg: rutina.enfriamientoSeg, vuelta: 0 });
  return fases;
}

export function calcularDuracionWr(rutina) {
  return fasesWr(rutina).reduce((n, f) => n + f.seg, 0);
}

// Dado el segundo N desde que arrancó la sesión, en qué fase vas, cuánto
// le falta, y cuál sigue (para poder anunciarla en pantalla antes de que
// llegue). null significa que la sesión ya terminó.
export function faseEnSegundo(fases, transcurridoSeg) {
  let t = Math.max(0, Math.floor(transcurridoSeg));
  for (let i = 0; i < fases.length; i++) {
    if (t < fases[i].seg) {
      return { ...fases[i], indice: i, restante: fases[i].seg - t, siguiente: fases[i + 1] || null };
    }
    t -= fases[i].seg;
  }
  return null;
}

// Cuánto tiempo REAL se acumuló en cada tipo de fase -- si la sesión se
// detiene a la mitad, solo cuenta lo que de verdad se hizo, no lo planeado.
export function tiempoPorTipoWr(fases, transcurridoSeg) {
  let restante = Math.max(0, Math.floor(transcurridoSeg));
  const acumulado = { caminar: 0, correr: 0, calentamiento: 0, enfriamiento: 0 };
  for (const f of fases) {
    if (restante <= 0) break;
    const usado = Math.min(f.seg, restante);
    acumulado[f.tipo] = (acumulado[f.tipo] || 0) + usado;
    restante -= usado;
  }
  return acumulado;
}

// El aviso al ENTRAR a una fase le dice al cuerpo qué hacer sin tener que
// mirar la pantalla: un tono largo para acelerar, tres cortos para bajar.
export function avisoWrAlEntrarAFase(tipo) {
  if (tipo === 'correr') return ['largo'];
  if (tipo === 'caminar') return ['rapido', 'rapido', 'rapido'];
  if (tipo === 'calentamiento') return ['rapido'];
  if (tipo === 'enfriamiento') return ['rapido', 'rapido'];
  return [];
}

export function avisoWrCuentaFinal(restanteSeg) {
  return (restanteSeg >= 1 && restanteSeg <= 3) ? ['cuenta'] : [];
}

// ────────── GPS de W/R (Fase 2) ──────────
// El GPS del celular rebota: en interiores, entre edificios o con señal
// débil manda lecturas que "saltan" decenas de metros sin que te muevas.
// Sin filtrar, esos saltos inflan la distancia hasta volverla inútil.

const PRECISION_MINIMA_M = 50; // peor que esto no se puede confiar
const VELOCIDAD_MAXIMA_MS = 30; // ~108 km/h: nadie corre así, es un salto de GPS

export function distanciaMetros(a, b) {
  const R = 6371000; // radio de la Tierra en metros
  const rad = (g) => g * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Estado inmutable: {ultimo, distanciaM} -> {ultimo, distanciaM}. Descarta
// la lectura (sin cambiar nada) si es imprecisa o implica una velocidad
// imposible; así una mala lectura no contamina el total.
export function acumularPuntoGps(estado, punto) {
  if (!punto || !Number.isFinite(punto.lat) || !Number.isFinite(punto.lon)) return estado;
  if (Number.isFinite(punto.accuracy) && punto.accuracy > PRECISION_MINIMA_M) return estado;
  if (!estado.ultimo) return { ultimo: punto, distanciaM: estado.distanciaM || 0 };
  const metros = distanciaMetros(estado.ultimo, punto);
  const segundos = Math.max(0.001, (punto.tMs - estado.ultimo.tMs) / 1000);
  if (metros / segundos > VELOCIDAD_MAXIMA_MS) return estado;
  return { ultimo: punto, distanciaM: (estado.distanciaM || 0) + metros };
}

export function ritmoSegPorKm(segundos, metros) {
  if (!metros || metros <= 0) return null;
  return Math.round(segundos / (metros / 1000));
}
