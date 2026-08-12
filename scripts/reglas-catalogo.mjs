/* ================================================================
   ARENAS MOTOCICLETAS — scripts/reglas-catalogo.mjs
   Tablas de reglas compartidas por las herramientas de Node.

   POR QUÉ EXISTE ESTE ARCHIVO
   Las mismas reglas viven en dos mundos: los módulos del navegador
   (script clásico, `window.ARENAS_CATALOGO`) y las herramientas de línea
   de comandos (ESM de Node). Unificarlos en un solo archivo obligaría a
   que el navegador descargase un JSON extra en cada visita solo para
   saber qué palabras indican «texto pendiente» — un coste real para el
   visitante a cambio de una comodidad nuestra.

   La decisión es: se duplican, pero la duplicación está VIGILADA.
   scripts/qa-tests.mjs carga los archivos del navegador de verdad y
   comprueba que digan exactamente lo mismo que este módulo. Si alguien
   toca una copia y no la otra, ese test falla.

   Aquí solo hay datos. Ninguna lógica.
   ================================================================ */

/** Taxonomía cerrada. Espejo de CATEGORIAS en catalogo-schema.js. */
export const CATEGORIAS = ["ciudad", "trabajo", "deportiva", "aventura", "carga"];

/** Estados editoriales. Espejo de ESTADOS_CONTENIDO en catalogo-schema.js. */
export const ESTADOS = ["BORRADOR", "EN_REVISION", "APROBADO"];

/** Prefijos de ruta admitidos. Espejo de PREFIJOS_LOCALES en catalogo-utils.js. */
export const PREFIJOS_LOCALES = ["assets/", "data/", "legales/"];

/** Espejo de MARCAS_PROVISIONALES en catalogo-completitud.js. */
export const PROVISIONALES = [
  "pendiente",
  "por completar",
  "por definir",
  "descripcion ampliada",
  "texto provisional",
  "lorem ipsum",
  "tbd",
];

/**
 * Prioridad de cada campo que puede faltar. Espejo de la propiedad
 * `prioridad` de REQUISITOS en catalogo-completitud.js.
 *
 *   P0  bloquea: sin esto la tarjeta no comunica nada
 *   P1  necesario antes de publicar
 *   P2  mejora clara
 *   P3  opcional
 *
 * Las claves son los nombres de columna de MODELOS_WEB; en el módulo del
 * navegador son los nombres internos del requisito. La correspondencia
 * entre ambos vocabularios está en EQUIVALENCIA_CLAVES.
 */
export const PRIORIDADES = {
  imagen_principal: "P0",
  alt_text: "P1",
  descripcion_corta: "P1",
  imagen_mobile: "P1",
  descripcion_larga: "P2",
  caracteristicas: "P2",
  linea: "P2",
};

/** columna de la hoja → clave del requisito en catalogo-completitud.js */
export const EQUIVALENCIA_CLAVES = {
  imagen_principal: "imagen",
  alt_text: "alt",
  descripcion_corta: "descripcionCorta",
  imagen_mobile: "imagenMobile",
  descripcion_larga: "descripcionLarga",
  caracteristicas: "caracteristicas",
  linea: "linea",
};

/** Extensiones de imagen admitidas en assets/catalogo/. */
export const EXTENSIONES_IMAGEN = [".webp", ".jpg", ".jpeg", ".png", ".avif"];

/** Formato preferente; las demás extensiones se avisan pero no fallan. */
export const EXTENSION_PREFERENTE = ".webp";

/**
 * Archivos esperados en la carpeta de un modelo, con su medida y peso.
 * Derivado de la medición del layout — ver
 * docs/especificacion-imagenes-catalogo.md.
 */
export const ARCHIVOS_ESPERADOS = [
  { nombre: "portada.webp", ancho: 1600, alto: 1000, kbMax: 250, obligatorio: true },
  { nombre: "portada-mobile.webp", ancho: 1280, alto: 800, kbMax: 160, obligatorio: false },
  { nombre: "galeria-01.webp", ancho: 1600, alto: 1000, kbMax: 250, obligatorio: false },
  { nombre: "galeria-02.webp", ancho: 1600, alto: 1000, kbMax: 250, obligatorio: false },
];

/** Proporción de la caja de imagen, idéntica en todos los anchos. */
export const PROPORCION = 16 / 10;

/** Tolerancia de proporción antes de avisar (±2 %). */
export const PROPORCION_TOLERANCIA = 0.02;
