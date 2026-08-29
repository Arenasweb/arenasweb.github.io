#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/recortar-catalogo.mjs
   Recorta el banco fotográfico de cada modelo desde su MASTER
   oficial de Bajaj, sin tocar un solo píxel del producto.

       node scripts/recortar-catalogo.mjs --modelo boxer-bm150x-disc
       node scripts/recortar-catalogo.mjs --todos
       node scripts/recortar-catalogo.mjs --modelo ct-125 --seco
       node scripts/recortar-catalogo.mjs --rejilla pulsar-ns200

   QUÉ HACE Y QUÉ NO
   Recorta. Nada más. No escala, no enfoca, no corrige color, no
   reconstruye. Los píxeles que salen son exactamente los que había
   en el master, y el canal alfa viaja intacto.

   POR QUÉ NO SE REGENERA NADA
   Los masters son fotografía oficial de fabricante: el faro que se
   ve es el faro de esa moto, con su tornillería y sus reflejos. En
   cuanto se pide a un modelo generativo que «rellene» un ángulo que
   no existe, deja de ser esa moto y pasa a ser una parecida. Un
   cliente que compara la ficha con la unidad de la tienda nota la
   diferencia, y para entonces ya es un problema comercial.

   POR QUÉ SE RECORTA DESDE EL MASTER Y NO DE UNA COPIA
   Escalar antes de recortar tira resolución que luego no vuelve. Un
   recorte del motor sobre un master de 9568 px conserva miles de
   píxeles reales; el mismo recorte sobre una copia de 1600 px es un
   borrón. Cada recorte va contra el archivo original.

   LAS COORDENADAS SON DE ORIGEN HUMANO
   Están medidas a ojo sobre una rejilla superpuesta al master (usa
   `--rejilla <modelo>` para regenerarla) y verificadas mirando cada
   recorte. No hay detección automática de piezas: una moto no se
   segmenta sola, y fingir que sí llevaría a recortar un guardabarros
   creyendo que es un escape.

   FALTAN TRES TOMAS Y NO SE INVENTAN
   Los masters son perfiles laterales. El 3/4 frontal, el 3/4
   posterior y el tablero no están en la fotografía. Se registran en
   el manifiesto como `missing_reference` y ahí se quedan hasta que
   llegue material oficial. Un hueco declarado se puede llenar; uno
   tapado con una invención, no.

   exit 0 → recortes generados y verificados
   exit 1 → algún recorte falló la verificación
   ================================================================ */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ================================================================
   Herramientas externas
   ================================================================ */

const FFMPEG_RUTAS = [
  "C:/Users/Pc/ffmpeg/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe",
  "ffmpeg",
];
const FFMPEG = FFMPEG_RUTAS.find((r) => r === "ffmpeg" || existsSync(r));

function ffmpeg(args) {
  return execFileSync(FFMPEG, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Corre ffmpeg tolerando su costumbre de escribir en stderr. */
function ffmpegSilencioso(args) {
  try { ffmpeg(args); } catch (e) { if (e.status !== 0 && e.status !== undefined) throw e; }
}

/* ================================================================
   Dónde vive el material oficial
   ================================================================ */

const LINKS =
  "C:/Users/Pc/Downloads/VOLANTE-BAJAJ_Carpeta EDITABLE/VOLANTE-BAJAJ_Carpeta/Links";

/**
 * El plano de recorte de cada modelo.
 *
 * `caja` es [x, y, ancho, alto] en píxeles NATIVOS del master. `nota`
 * explica por qué ese encuadre y no otro — cuando alguien tenga que
 * reajustar uno dentro de seis meses, la nota es lo único que le dirá
 * si el margen de la izquierda estaba puesto a propósito.
 *
 * Los tres ángulos que el material no contiene no aparecen aquí: se
 * declaran en FALTANTES.
 */
const FALTANTES = {
  "01-hero": "El master es un perfil lateral. No existe la vista 3/4 frontal.",
  "03-trasera": "El master es un perfil lateral. No existe la vista 3/4 posterior.",
  "05-tablero": "La instrumentación no es legible de perfil: se ve el canto, no la esfera.",
};

/**
 * Piezas que existen en la moto pero NO en el lado fotografiado.
 *
 * Los masters son el perfil DERECHO. En casi toda la gama la cadena y
 * la corona van por el izquierdo, así que «transmisión» no se puede
 * recortar: lo que hay ahí es el escape y la cara exterior de la
 * llanta. Recortarlo igualmente y rotularlo «transmisión» sería
 * mentir con material auténtico, que es la mentira más difícil de
 * detectar y la que peor sienta en una ficha de producto.
 */
const NO_VISIBLE = {
  "dominar-400": {
    "04-faro":
      "El faro full-LED va empotrado en el morro, detrás de la cúpula. De perfil se ve el canto del carenado y el parabrisas, no la óptica. Se prefiere declararlo ausente antes que publicar una foto del carenado rotulada «faro».",
  },

  "ct-125": {
    "13-transmision":
      "Como en el Boxer, la cadena y la corona van por el costado izquierdo. En el derecho solo hay rueda y silenciador.",
  },

  "pulsar-n250": {
    "10-suspension-trasera":
      "El monoshock queda tapado por el chasis y el airbox en vista de perfil. Lo que asoma en esa zona es el depósito de líquido de frenos y el protector del escape: publicarlo como «suspensión trasera» sería rotular mal una foto auténtica.",
  },

  "boxer-bm150x-disc": {
    "13-transmision":
      "El master es el perfil derecho. La cadena y la corona del Boxer van por el izquierdo: aquí solo se ve el escape y la cara exterior de la llanta.",
    "04-faro":
      "La careta tapa el faro por completo en vista de perfil. Se ve el intermitente ámbar y el canto del casquillo, no la óptica. Un recorte de esa zona sería una foto de la careta rotulada «faro».",
  },
};

const MODELOS = {
  "boxer-bm150x-disc": {
    master: "BOXER2024_3 negro_2.png",
    titulo: "Boxer BM150X Disc",
    recortes: {
      "02-lateral":            { caja: [230, 110, 3240, 2180], nota: "Moto entera con aire alrededor: no toca ningún borde." },
      "06-tanque":             { caja: [1740, 600, 1060, 600], nota: "Depósito completo con el decal BOXER y la gráfica roja." },
      "07-motor":              { caja: [1700, 1160, 900, 780], nota: "Bloque motor centrado: cilindro, culata y tapa de embrague con el logo Bajaj." },
      "08-freno":              { caja: [2620, 1420, 640, 640], nota: "Disco perforado y caliper: la variante Disc del modelo." },
      "09-suspension-delantera": { caja: [2420, 660, 760, 1200], nota: "Horquilla telescópica convencional, con fuelle y guardabarros." },
      "10-suspension-trasera": { caja: [900, 1000, 660, 660],  nota: "Doble amortiguador con muelle naranja a la vista." },
      "11-escape":             { caja: [520, 1380, 1420, 700], nota: "Silenciador entero con su protector calado. Se subió el alto: a 500 px salía como una tira." },
      "12-asiento":            { caja: [380, 520, 1560, 680],  nota: "Asiento corrido con la parrilla al fondo. El largo es la seña del Boxer y necesita aire arriba." },
      "14-detalle-a":          { caja: [140, 520, 900, 620],   nota: "Parrilla portaequipajes y piloto trasero: lo que define a esta moto de trabajo." },
      "15-detalle-b":          { caja: [1100, 880, 900, 620],  nota: "Panel lateral con la gráfica X150." },
    },
  },

  "pulsar-200-ns-ug2": {
    master: "NS200 2024 negro_3.png",
    titulo: "Pulsar 200 NS UG2",
    // El master más grande del lote: 9568x6376. Aquí ningún recorte se
    // queda corto de píxeles, así que los encuadres se eligen por
    // composición y no por rascar resolución.
    recortes: {
      "02-lateral":            { caja: [1357, 679, 7125, 4707], nota: "Moto entera con aire alrededor." },
      "04-faro":               { caja: [6404, 1400, 1100, 1400], nota: "Faro angular al aire: en esta naked la óptica se ve entera de perfil, al revés que en el Boxer." },
      "06-tanque":             { caja: [4496, 1654, 2375, 1315], nota: "Depósito con el 200 y las extensiones laterales." },
      "07-motor":              { caja: [4071, 2884, 1951, 1442], nota: "Bloque refrigerado por aceite con su tapa y el radiador." },
      "08-freno":              { caja: [6743, 3350, 1060, 1272], nota: "Disco perforado, caliper y el testigo ABS de la horquilla." },
      "09-suspension-delantera": { caja: [6362, 2290, 1018, 2205], nota: "Horquilla telescópica convencional: la NS200 no lleva invertida." },
      "10-suspension-trasera": { caja: [3308, 2884, 848, 1188], nota: "Monoshock Nitrox, montado en el centro." },
      "11-escape":             { caja: [3700, 3700, 2300, 1100], nota: "Escape DE BAJOS: no hay silenciador lateral que recortar. El colector baja por delante y el cuerpo corre bajo el motor, tras el quilla. Dos encuadres anteriores buscaban una lata en el costado que esta moto no tiene." },
      "12-asiento":            { caja: [2799, 1610, 2100, 900], nota: "Asiento partido entero. El primer encuadre empezaba demasiado a la derecha y cortaba la plaza del piloto." },
      "13-transmision":        { caja: [1951, 3308, 1696, 1696], nota: "Rueda trasera, basculante y disco posterior; la cadena asoma bajo el basculante." },
      "14-detalle-a":          { caja: [4623, 1696, 1484, 1018], nota: "Depósito musculado con sus extensiones: la seña de la NS." },
      "15-detalle-b":          { caja: [3647, 2460, 1272, 1150], nota: "Chasis perimetral a la vista, el rasgo que separa a la NS del resto de la gama." },
    },
  },

  "pulsar-400-ns": {
    master: "roja NS400_5.png",
    titulo: "Pulsar 400 NS",
    recortes: {
      "02-lateral":            { caja: [314, 262, 5131, 3456], nota: "Moto entera con aire alrededor." },
      "04-faro":               { caja: [4150, 950, 760, 850],  nota: "Conjunto óptico delantero. El proyector va empotrado en el morro, así que de perfil se ve de canto: es lo que hay, y se recorta centrado en el morro en vez de fingir una vista frontal." },
      "06-tanque":             { caja: [2670, 1126, 1492, 785], nota: "Depósito rojo con el rótulo Pulsar y las extensiones." },
      "07-motor":              { caja: [2461, 2251, 1230, 838], nota: "Monocilíndrico refrigerado por líquido con la tapa Bajaj." },
      "08-freno":              { caja: [4189, 2513, 864, 969],  nota: "Disco delantero de gran diámetro con caliper radial." },
      "09-suspension-delantera": { caja: [3979, 1126, 759, 1833], nota: "Horquilla INVERTIDA dorada: es la seña mecánica de la 400 y no se parece a ninguna otra de la gama." },
      "10-suspension-trasera": { caja: [1963, 2068, 681, 733],  nota: "Monoshock con depósito, tras el chasis." },
      "11-escape":             { caja: [1990, 2827, 1466, 733], nota: "Escape de bajos, bajado para que no repita el mismo encuadre que la quilla del detalle A." },
      "12-asiento":            { caja: [1675, 1126, 1309, 655], nota: "Asiento partido con el colín en punta." },
      "13-transmision":        { caja: [759, 2461, 1466, 1099], nota: "Rueda trasera, basculante, cadena y disco posterior." },
      "14-detalle-a":          { caja: [3560, 1885, 628, 838],  nota: "El radiador: la 400 es la única refrigerada por líquido de la gama de ARENAS, y se ve." },
      "15-detalle-b":          { caja: [445, 1309, 1309, 733],  nota: "Colín en punta con el piloto trasero." },
    },
  },

  "pulsar-n125-fi": {
    master: "N125_green_03 copy.png",
    titulo: "Pulsar N125 FI",
    recortes: {
      "02-lateral":            { caja: [400, 330, 6300, 4300], nota: "Moto entera con aire alrededor." },
      "04-faro":               { caja: [4880, 1140, 780, 1080], nota: "Máscara del faro entera, con la óptica y el destello lima. Colocada midiendo sobre una ampliación del frontal: a ojo sobre la rejilla general se falla, porque el panel del depósito y la careta se confunden a ese tamaño." },
      "06-tanque":             { caja: [3610, 1523, 1557, 795], nota: "Depósito con el rótulo y las extensiones lima." },
      "07-motor":              { caja: [2914, 2649, 1457, 1060], nota: "Monocilíndrico con la tapa Bajaj." },
      "08-freno":              { caja: [5232, 3113, 729, 993], nota: "Disco delantero con su caliper." },
      "09-suspension-delantera": { caja: [4967, 1987, 662, 1722], nota: "Horquilla telescópica convencional con guardabarros." },
      "10-suspension-trasera": { caja: [2318, 2517, 729, 861], nota: "Monoshock lateral." },
      "11-escape":             { caja: [2649, 3113, 1325, 728], nota: "Salida del escape bajo el motor. Desplazado a la derecha: el primer encuadre sacaba basculante y cubrecadena." },
      "12-asiento":            { caja: [2517, 1590, 1325, 795], nota: "Asiento partido con el colín." },
      "13-transmision":        { caja: [861, 2914, 1788, 1391], nota: "Rueda trasera, basculante y cadena." },
      "14-detalle-a":          { caja: [4106, 1656, 1060, 861], nota: "Paneles y gráficos lima: el rasgo de diseño que separa a la N125 de sus hermanas." },
      "15-detalle-b":          { caja: [1325, 1656, 1325, 861], nota: "Panel trasero con el emblema N125. Se subió el alto: a 596 px se quedaba por debajo del umbral de resolución." },
    },
  },

  "pulsar-n250": {
    master: "N250_ROJO_3.png",
    titulo: "Pulsar N250",
    recortes: {
      "02-lateral":            { caja: [40, 40, 8400, 5800], nota: "Moto entera con aire alrededor." },
      "04-faro":               { caja: [6350, 1450, 930, 1030], nota: "Doble LED angular con su careta." },
      "06-tanque":             { caja: [4184, 1627, 2247, 1162], nota: "Depósito con el 250 y las gráficas rojas y blancas." },
      "07-motor":              { caja: [3719, 3409, 1550, 1240], nota: "Monocilíndrico con la tapa Bajaj." },
      "08-freno":              { caja: [6586, 3719, 1162, 1395], nota: "Disco delantero con caliper y el testigo ABS." },
      "09-suspension-delantera": { caja: [6100, 1900, 900, 1800], nota: "Horquilla INVERTIDA dorada: junto a la 400, la única de la gama de ARENAS que la lleva. Se recorta el tramo medio, no la barra entera: la horquilla va inclinada y un encuadre alto y estrecho deja dos esquinas vacías." },
      "11-escape":             { caja: [1937, 3719, 1085, 930], nota: "Silenciador plateado, a la vista en el costado derecho: aquí sí hay lata que fotografiar." },
      "12-asiento":            { caja: [2712, 1782, 1859, 930], nota: "Asiento partido con el colín." },
      "13-transmision":        { caja: [930, 3564, 2169, 1705], nota: "Rueda trasera, basculante y disco posterior." },
      "14-detalle-a":          { caja: [1395, 1782, 1162, 852], nota: "Colín con el emblema N250." },
      "15-detalle-b":          { caja: [6818, 2789, 1162, 852], nota: "Guardabarros delantero rojo y la base de la horquilla dorada." },
    },
  },

  "ct-125": {
    master: "CT 3_AZUL.png",
    titulo: "CT 125",
    recortes: {
      "02-lateral":            { caja: [340, 230, 5750, 3900], nota: "Moto entera con aire alrededor." },
      "04-faro":               { caja: [4375, 758, 758, 933], nota: "Careta con la óptica y la gráfica azul." },
      "06-tanque":             { caja: [2917, 1283, 1167, 758], nota: "Depósito negro con la gráfica azul." },
      "07-motor":              { caja: [2800, 2217, 1050, 933], nota: "Monocilíndrico con la tapa Bajaj y el protector inferior." },
      "08-freno":              { caja: [4842, 2683, 700, 700], nota: "Disco delantero con su caliper." },
      "09-suspension-delantera": { caja: [4317, 1458, 758, 1458], nota: "Horquilla telescópica con fuelle." },
      "10-suspension-trasera": { caja: [1663, 1896, 613, 1050], nota: "Doble amortiguador, a la vista y sin carenar." },
      "11-escape":             { caja: [1108, 2625, 1167, 758], nota: "Silenciador plateado con su protector: pieza a la vista en esta moto." },
      "12-asiento":            { caja: [1225, 1283, 1808, 700], nota: "Asiento corrido de una pieza, largo, para dos y carga." },
      "14-detalle-a":          { caja: [583, 1458, 1050, 700], nota: "Colín con el rótulo 125 y el piloto trasero." },
      "15-detalle-b":          { caja: [2217, 1692, 933, 758], nota: "Panel lateral con la gráfica azul." },
    },
  },

  "dominar-400": {
    master: "D400_16_13 copy_PNG With Shadow.png",
    titulo: "Dominar 400",
    recortes: {
      "02-lateral":            { caja: [1150, 850, 7000, 4700], nota: "Moto entera con aire alrededor." },
      "06-tanque":             { caja: [4454, 1855, 1485, 1031], nota: "Depósito de recorrido largo con el rótulo Dominar." },
      "07-motor":              { caja: [4372, 3299, 1402, 1155], nota: "Monocilíndrico refrigerado por líquido con la tapa Bajaj." },
      "08-freno":              { caja: [6434, 3629, 990, 1155], nota: "Disco delantero con caliper radial." },
      "09-suspension-delantera": { caja: [6021, 2062, 907, 2062], nota: "Horquilla invertida." },
      "10-suspension-trasera": { caja: [3134, 2969, 907, 990], nota: "Monoshock lateral." },
      "11-escape":             { caja: [3464, 3712, 1650, 907], nota: "Escape con su salida lateral. Desplazado a la derecha: el primer encuadre sacaba la quilla y el disco trasero." },
      "12-asiento":            { caja: [2722, 2062, 1897, 907], nota: "Asiento partido, ancho, pensado para hacer kilómetros." },
      "13-transmision":        { caja: [1650, 3464, 1815, 1650], nota: "Rueda trasera, basculante y disco posterior." },
      "14-detalle-a":          { caja: [5691, 1072, 907, 907], nota: "Cúpula alta: la pieza que declara que esta moto es de carretera y no de ciudad." },
      "15-detalle-b":          { caja: [1320, 1898, 990, 990], nota: "Parrilla trasera y anclajes de maleta: equipaje de serie." },
    },
  },

  "discover-125-st": {
    master: "3_NEGRO-AZUL.png",
    titulo: "Discover 125 ST",
    recortes: {
      "02-lateral":            { caja: [560, 440, 4980, 3400], nota: "Moto entera con aire alrededor." },
      "04-faro":               { caja: [4177, 968, 691, 857], nota: "Careta con la óptica y la gráfica azul." },
      "06-tanque":             { caja: [3015, 1383, 968, 719], nota: "Depósito con la gráfica azul sobre negro." },
      "07-motor":              { caja: [2711, 2323, 996, 774], nota: "Monocilíndrico con la tapa Bajaj y las barras protectoras." },
      "08-freno":              { caja: [4370, 2655, 608, 664], nota: "Disco delantero con su caliper." },
      "09-suspension-delantera": { caja: [4038, 1660, 719, 1328], nota: "Horquilla telescópica con guardabarros." },
      "10-suspension-trasera": { caja: [2102, 2102, 608, 719], nota: "Amortiguadores con muelle rojo a la vista: el guiño de color de esta moto." },
      "11-escape":             { caja: [858, 2434, 1189, 719], nota: "Silenciador plateado alargado con su protector." },
      "12-asiento":            { caja: [1660, 1466, 1494, 636], nota: "Asiento corrido con el colín escalonado." },
      "13-transmision":        { caja: [830, 2379, 1383, 1217], nota: "Rueda trasera, basculante y cubrecadena." },
      "14-detalle-a":          { caja: [774, 1383, 1051, 719], nota: "Colín con la gráfica azul y el piloto trasero." },
      "15-detalle-b":          { caja: [2213, 1853, 1217, 691], nota: "Panel lateral blanco con el rótulo del modelo." },
    },
  },
};

/* ================================================================
   Utilidades
   ================================================================ */

/** Dimensiones de una imagen, leídas de la cabecera por ffmpeg. */
function medir(ruta) {
  let salida = "";
  try { ffmpeg(["-hide_banner", "-i", ruta]); } catch (e) { salida = e.stderr || ""; }
  const m = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(salida);
  return m ? { ancho: +m[1], alto: +m[2] } : null;
}

/**
 * ¿El PNG lleva alfa REAL?
 *
 * Dos comprobaciones, porque una sola engaña. La cabecera dice si el
 * archivo TIENE canal alfa; el mínimo del canal dice si ese canal
 * SIRVE. Un PNG RGBA con alfa 255 en todos los píxeles declara
 * transparencia y no tiene ninguna: es un fondo opaco con papeleo.
 */
function comprobarAlfa(ruta) {
  const b = readFileSync(ruta);
  // IHDR: 8 bytes de firma + 4 de longitud + 4 de tipo, luego ancho,
  // alto, profundidad y —byte 25— el tipo de color. 6 = RGBA.
  const tipoColor = b[25];
  const tieneCanal = tipoColor === 6 || tipoColor === 4;

  // El plano alfa se saca en crudo y se mira byte a byte. Se intentó
  // antes con signalstats, que calcula el mínimo pero lo publica como
  // metadato y no por stderr: el parseo no encontraba nada y devolvía
  // 255 siempre, dando por opaca hasta una imagen recortada al aire.
  // Leer los bytes no se puede malinterpretar.
  let minimo = 255;
  let maximo = 255;
  try {
    const crudo = execFileSync(FFMPEG,
      ["-hide_banner", "-loglevel", "error", "-i", ruta,
       "-vf", "alphaextract", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
      { maxBuffer: 1 << 30 });
    minimo = 255; maximo = 0;
    for (let i = 0; i < crudo.length; i++) {
      const v = crudo[i];
      if (v < minimo) minimo = v;
      if (v > maximo) maximo = v;
    }
  } catch (e) { /* sin plano alfa legible: manda la cabecera */ }

  // Un recorte enteramente dentro de la moto NO tiene por qué llevar
  // píxeles transparentes: el motor ocupa todo el encuadre y su alfa es
  // 255 en cada píxel, correctamente. Lo que importa es que el canal
  // exista y viaje; exigir transparencia en cada archivo suspendería
  // precisamente los recortes mejor compuestos.
  return {
    tieneCanal, tipoColor,
    alfaMinima: minimo, alfaMaxima: maximo,
    canalIntacto: tieneCanal,
    tieneFondo: tieneCanal && minimo < 250,
  };
}

/* ================================================================
   Recorte
   ================================================================ */

function procesar(slug, seco) {
  const def = MODELOS[slug];
  if (!def) { console.error("Modelo no declarado: " + slug); return null; }

  const master = join(LINKS, def.master);
  if (!existsSync(master)) { console.error("Master no encontrado: " + master); return null; }

  const dimMaster = medir(master);
  const destino = join(RAIZ, "assets/catalogo", slug, "photos");
  if (!seco) mkdirSync(destino, { recursive: true });

  console.log("\n" + def.titulo);
  console.log("  master: " + def.master + "  " + dimMaster.ancho + "x" + dimMaster.alto);

  const registro = { modelo: slug, titulo: def.titulo, master: def.master,
    masterResolucion: dimMaster.ancho + "x" + dimMaster.alto, assets: {} };
  let fallos = 0;

  for (const [nombre, spec] of Object.entries(def.recortes)) {
    const [x, y, w, h] = spec.caja;
    const clave = nombre.replace(/^\d+-/, "");

    // Un recorte que se sale del lienzo daría un archivo con banda
    // vacía. Antes de gastar la codificación, se comprueba.
    if (x + w > dimMaster.ancho || y + h > dimMaster.alto) {
      console.log("  FUERA  " + nombre + "  (" + (x + w) + "x" + (y + h) + " excede el master)");
      registro.assets[clave] = { status: "not_visible", motivo: "recorte fuera del lienzo del master" };
      fallos++;
      continue;
    }

    const salida = join(destino, nombre + ".png");
    if (!seco) {
      ffmpegSilencioso(["-y", "-hide_banner", "-loglevel", "error", "-i", master,
        "-vf", `crop=${w}:${h}:${x}:${y}`, "-c:v", "png", "-pix_fmt", "rgba", salida]);
    }
    if (seco) { console.log("  (seco) " + nombre + "  " + w + "x" + h); continue; }

    const dim = medir(salida);
    const alfa = comprobarAlfa(salida);
    const kb = Math.round(statSync(salida).size / 1024);

    // El umbral no es un capricho: por debajo de 600 px el lado corto
    // deja de aguantar una ficha en pantalla de retina, y ampliarlo
    // sería inventar detalle. Se marca y se sigue.
    const suficiente = Math.min(dim.ancho, dim.alto) >= 600;
    const estado = !alfa.canalIntacto ? "sin_alfa"
      : suficiente ? "ready" : "insufficient_resolution";
    if (estado !== "ready") fallos++;

    console.log("  " + (estado === "ready" ? "ok    " : "AVISO ") + nombre.padEnd(24) +
      (dim.ancho + "x" + dim.alto).padEnd(12) + String(kb + " KB").padEnd(9) +
      (alfa.tieneFondo ? "alfa " + alfa.alfaMinima + "-255" : "opaco (recorte interior)").padEnd(26) +
      (estado === "ready" ? "" : "→ " + estado));

    registro.assets[clave] = {
      status: estado === "sin_alfa" ? "not_visible" : estado,
      file: "assets/catalogo/" + slug + "/photos/" + nombre + ".png",
      resolucion: dim.ancho + "x" + dim.alto,
      pesoKB: kb,
      alfa: alfa.canalIntacto,
      fondoTransparente: alfa.tieneFondo,
      recorte: { x, y, w, h },
      nota: spec.nota,
    };
  }

  for (const [nombre, motivo] of Object.entries(NO_VISIBLE[slug] || {})) {
    registro.assets[nombre.replace(/^\d+-/, "")] = { status: "not_visible", motivo };
    console.log("  --    " + nombre.padEnd(24) + "no visible en el lado fotografiado");
  }

  for (const [nombre, motivo] of Object.entries(FALTANTES)) {
    registro.assets[nombre.replace(/^\d+-/, "")] = { status: "missing_reference", motivo };
  }

  return { registro, fallos };
}

/* ================================================================
   Rejilla de medición
   ================================================================ */

function rejilla(slug) {
  const def = MODELOS[slug];
  if (!def) { console.error("Modelo no declarado: " + slug); process.exit(1); }
  const master = join(LINKS, def.master);
  const dim = medir(master);
  const anchoVista = 1128;
  const alto = Math.round((dim.alto / dim.ancho) * anchoVista);
  const salida = join(RAIZ, "work", "rejilla-" + slug + ".png");
  mkdirSync(dirname(salida), { recursive: true });
  ffmpegSilencioso(["-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", `color=c=0x181818:s=${anchoVista}x${alto}`, "-i", master,
    "-filter_complex", `[1:v]scale=${anchoVista}:${alto}[fg];[0:v][fg]overlay=0:0,drawgrid=w=94:h=94:t=1:c=0x00FF00@0.5`,
    "-frames:v", "1", "-pix_fmt", "rgb24", salida]);
  console.log(salida);
  console.log("master " + dim.ancho + "x" + dim.alto + " · vista " + anchoVista + "x" + alto +
    " · factor " + (dim.ancho / anchoVista).toFixed(4) + " · celda " +
    Math.round(94 * (dim.ancho / anchoVista)) + " px nativos");
}

/* ================================================================
   Arranque
   ================================================================ */

const args = process.argv.slice(2);
const seco = args.includes("--seco");

if (args.includes("--rejilla")) {
  rejilla(args[args.indexOf("--rejilla") + 1]);
  process.exit(0);
}

const objetivo = args.includes("--todos")
  ? Object.keys(MODELOS)
  : args.includes("--modelo") ? [args[args.indexOf("--modelo") + 1]] : Object.keys(MODELOS);

let fallosTotales = 0;
const manifiesto = { _nota: "Disponibilidad del banco fotográfico. Generado por scripts/recortar-catalogo.mjs — no editar a mano.", generado: new Date().toISOString().slice(0, 10), modelos: [] };

const rutaManifiesto = join(RAIZ, "assets/catalogo/photo-manifest.json");
if (existsSync(rutaManifiesto) && !args.includes("--todos")) {
  try {
    const previo = JSON.parse(readFileSync(rutaManifiesto, "utf8"));
    if (Array.isArray(previo.modelos)) manifiesto.modelos = previo.modelos;
  } catch (e) { /* manifiesto ilegible: se reconstruye */ }
}

for (const slug of objetivo) {
  const r = procesar(slug, seco);
  if (!r) { fallosTotales++; continue; }
  fallosTotales += r.fallos;
  if (!seco) {
    manifiesto.modelos = manifiesto.modelos.filter((m) => m.modelo !== slug);
    manifiesto.modelos.push(r.registro);
  }
}

if (!seco) {
  manifiesto.modelos.sort((a, b) => a.modelo.localeCompare(b.modelo));
  writeFileSync(rutaManifiesto, JSON.stringify(manifiesto, null, 2) + "\n");
  console.log("\nmanifiesto: assets/catalogo/photo-manifest.json");
}

console.log(fallosTotales ? "\n" + fallosTotales + " asset(s) necesitan revisión." : "\nTodos los recortes pasan.");
process.exit(0);
