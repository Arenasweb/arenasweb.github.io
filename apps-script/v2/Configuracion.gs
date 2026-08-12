/**
 * ARENAS MOTOCICLETAS — Configuracion.gs  (backend v2)
 * ====================================================
 * Constantes del contrato público. Aquí no hay lógica: solo las tablas
 * que gobiernan qué se lee, qué se publica y qué jamás sale.
 *
 * NO CONTIENE NINGUNA LLAMADA A APPS SCRIPT.
 * Se carga tal cual en Node para las pruebas (scripts/qa-api-catalogo.mjs).
 *
 * ⚠️ Este archivo pertenece a la generación v2 y SUSTITUYE a
 * apps-script/Code.gs. Apps Script concatena todos los .gs en un mismo
 * ámbito global: si conviven dos definiciones de doGet, gana la última
 * cargada y sin ningún aviso. En el proyecto de Apps Script solo puede
 * existir UNA generación a la vez.
 */

/**
 * Hay DOS versiones y no son la misma cosa. Conviene tenerlo claro
 * antes de tocar ninguna:
 *
 *   API_VERSION     versión de la interfaz pública, la que declara
 *                   CONFIG_PUBLICA. Cambia si cambia la forma de la
 *                   respuesta o los parámetros admitidos.
 *
 *   CONTRATO_MAYOR  versión mayor del contrato de DATOS que el
 *                   frontend sabe leer. Está en catalogo-schema.js
 *                   (VERSION) y el navegador RECHAZA la respuesta
 *                   entera si no coincide. Cambia solo si cambian los
 *                   campos de los modelos.
 *
 * Empezaron desalineadas —el backend decía 1 y el frontend espera 2—,
 * lo que habría dejado el catálogo vacío sin ningún mensaje de error.
 * scripts/qa-api-catalogo.mjs comprueba que sigan coincidiendo.
 */
var API_VERSION = '1.0';
var CONTRATO_MAYOR = '2';

/* ============================================================
   HOJAS
   ============================================================ */

/**
 * Nombre de la propiedad de script que guarda el identificador del libro.
 *
 * El VALOR no está aquí ni en ningún archivo del repositorio: se
 * configura a mano en el proyecto de Apps Script
 * (Configuración del proyecto → Propiedades del script) durante el
 * despliegue. Ver apps-script/v2/README.md.
 *
 * Antes el endpoint usaba SpreadsheetApp.getActiveSpreadsheet(), que
 * devuelve null en una Web App independiente: el catálogo respondía
 * siempre con error interno. Es el hallazgo crítico de la auditoría.
 */
var PROP_ID_LIBRO = 'ARENAS_CATALOGO_SPREADSHEET_ID';

var HOJA_MODELOS = 'MODELOS_WEB';
var HOJA_CONFIG = 'CONFIG_PUBLICA';
var HOJA_CATEGORIAS = 'CATEGORIAS';

/**
 * Hoja de variantes de color. Todavía no existe en el libro real.
 * Su ausencia NO es un error: el catálogo funciona sin colores.
 */
var HOJA_COLORES = 'COLORES_MODELO_WEB';

/**
 * Hojas que este endpoint NO debe leer jamás, aunque existan en el
 * mismo libro. Cada una pertenece a otra fase o es de uso interno.
 * La lista es informativa para quien mantenga el código: la protección
 * real es que solo se leen las cuatro hojas declaradas arriba.
 */
var HOJAS_FUERA_DE_ALCANCE = [
  'CONTACTOS_INTERNOS',  // privada, jamás pública
  'PROMOCIONES_WEB',     // fase 5
  'SEDES_WEB',           // fase 4
  'FINANCIAMIENTO_WEB',  // fase 4
  'CATALOGO_PUBLICO'     // legacy: sustituida por MODELOS_WEB
];

/* ============================================================
   CONTRATO DE MODELOS_WEB — 28 columnas
   ============================================================ */

/**
 * Columnas requeridas. Si falta una de estas, la hoja no cumple el
 * contrato y se responde con error controlado en vez de publicar datos
 * a medias.
 */
var COLUMNAS_REQUERIDAS = ['id', 'slug', 'modelo', 'categoria', 'activo', 'estado_contenido'];

/**
 * Whitelist de salida. Una columna que no esté aquí NO se publica,
 * aunque exista en la hoja y aunque alguien la añada mañana.
 *
 *   destino  nombre del campo en el JSON público
 *   tipo     normalizador que se le aplica
 *   nivel    PUBLICO    → viaja siempre
 *            EDITORIAL  → viaja porque el frontend lo revalida
 *            INTERNO    → NO viaja (declarado aquí para dejar constancia
 *                         de que la decisión fue deliberada, no un olvido)
 */
var CAMPOS_MODELO = {
  id:                { destino: 'id',               tipo: 'texto',      nivel: 'PUBLICO', max: 40 },
  slug:              { destino: 'slug',             tipo: 'slug',       nivel: 'PUBLICO' },
  modelo:            { destino: 'modelo',           tipo: 'texto',      nivel: 'PUBLICO', max: 120 },
  linea:             { destino: 'linea',            tipo: 'texto',      nivel: 'PUBLICO', max: 60 },
  categoria:         { destino: 'categoria',        tipo: 'texto',      nivel: 'PUBLICO', max: 40 },
  subcategoria:      { destino: 'subcategoria',     tipo: 'texto',      nivel: 'PUBLICO', max: 60 },
  titulo_web:        { destino: 'titulo_web',       tipo: 'texto',      nivel: 'PUBLICO', max: 120 },
  descripcion_corta: { destino: 'descripcion_corta', tipo: 'texto',     nivel: 'PUBLICO', max: 220 },
  descripcion_larga: { destino: 'descripcion_larga', tipo: 'textoLargo', nivel: 'PUBLICO', max: 2000 },
  precio_publico:    { destino: 'precio_publico',   tipo: 'numero',     nivel: 'PUBLICO' },
  mostrar_precio:    { destino: 'mostrar_precio',   tipo: 'booleano',   nivel: 'PUBLICO' },
  imagen_principal:  { destino: 'imagen_principal', tipo: 'ruta',       nivel: 'PUBLICO' },
  imagen_mobile:     { destino: 'imagen_mobile',    tipo: 'ruta',       nivel: 'PUBLICO' },
  galeria_1:         { destino: 'galeria_1',        tipo: 'ruta',       nivel: 'PUBLICO' },
  galeria_2:         { destino: 'galeria_2',        tipo: 'ruta',       nivel: 'PUBLICO' },
  colores:           { destino: 'colores',          tipo: 'texto',      nivel: 'PUBLICO', max: 240 },
  caracteristica_1:  { destino: 'caracteristica_1', tipo: 'texto',      nivel: 'PUBLICO', max: 120 },
  caracteristica_2:  { destino: 'caracteristica_2', tipo: 'texto',      nivel: 'PUBLICO', max: 120 },
  caracteristica_3:  { destino: 'caracteristica_3', tipo: 'texto',      nivel: 'PUBLICO', max: 120 },
  destacado:         { destino: 'destacado',        tipo: 'booleano',   nivel: 'PUBLICO' },
  nuevo:             { destino: 'nuevo',            tipo: 'booleano',   nivel: 'PUBLICO' },
  cta_label:         { destino: 'cta_label',        tipo: 'texto',      nivel: 'PUBLICO', max: 40 },
  orden:             { destino: 'orden',            tipo: 'entero',     nivel: 'PUBLICO' },
  alt_text:          { destino: 'alt_text',         tipo: 'texto',      nivel: 'PUBLICO', max: 160 },
  foco_imagen:       { destino: 'foco_imagen',      tipo: 'foco',       nivel: 'PUBLICO' },

  // Viajan para que el frontend pueda VOLVER a comprobar la publicación
  // por su cuenta. El endpoint ya ha filtrado; esto es la segunda capa.
  activo:            { destino: 'activo',           tipo: 'booleano',   nivel: 'EDITORIAL' },
  estado_contenido:  { destino: 'estado_contenido', tipo: 'texto',      nivel: 'EDITORIAL', max: 20 },

  // NO viaja. Es trazabilidad para las personas que mantienen la hoja;
  // el navegador no la consume en ningún punto (0 usos medidos en el
  // frontend). Lo que no se envía no puede filtrarse.
  ultima_revision:   { destino: null,               tipo: 'texto',      nivel: 'INTERNO' }
};

/* ============================================================
   CONTRATO DE COLORES_MODELO_WEB — 15 columnas
   ============================================================ */

var COLUMNAS_COLOR_REQUERIDAS = ['modelo_id', 'slug_color', 'nombre_color', 'activo', 'estado_aprobacion'];

/**
 * Mínimos estructurales de las otras dos hojas. Son los que el runtime
 * necesita de verdad para funcionar, no el contrato completo:
 *
 *   CONTRATO COMPLETO   todas las columnas que la hoja debería tener
 *   MÍNIMO ESTRUCTURAL  sin esto no se puede decidir nada, y la hoja se
 *                       descarta entera
 *
 * `titulo`, `descripcion` y `orden` de CATEGORIAS son opcionales: sin
 * ellos la categoría sigue siendo utilizable (el título cae al slug y el
 * orden al final). Sin `slug` y sin `activo`, en cambio, no hay forma de
 * saber qué categoría es ni si debe publicarse.
 */
var CATEGORIAS_REQUERIDAS = ['slug', 'activo'];
var CONFIG_REQUERIDAS = ['clave', 'valor'];

var CAMPOS_COLOR = {
  id:                { destino: 'id',                tipo: 'texto',    max: 40 },
  modelo_id:         { destino: 'modelo_id',         tipo: 'texto',    max: 40 },
  slug_color:        { destino: 'slug_color',        tipo: 'slug' },
  nombre_color:      { destino: 'nombre_color',      tipo: 'texto',    max: 60 },
  hex_color:         { destino: 'hex_color',         tipo: 'hex' },
  imagen_principal:  { destino: 'imagen_principal',  tipo: 'ruta' },
  imagen_mobile:     { destino: 'imagen_mobile',     tipo: 'ruta' },
  galeria_1:         { destino: 'galeria_1',         tipo: 'ruta' },
  galeria_2:         { destino: 'galeria_2',         tipo: 'ruta' },
  orden:             { destino: 'orden',             tipo: 'entero' },
  activo:            { destino: 'activo',            tipo: 'booleano' },
  estado_aprobacion: { destino: 'estado_aprobacion', tipo: 'texto',    max: 20 },
  alt_text:          { destino: 'alt_text',          tipo: 'texto',    max: 160 },
  foco_imagen:       { destino: 'foco_imagen',       tipo: 'foco' },
  ultima_revision:   { destino: null,                tipo: 'texto' }
};

/* ============================================================
   CONFIG_PUBLICA
   ============================================================ */

/**
 * Solo estas claves se leen de CONFIG_PUBLICA, y cada una con su tipo y
 * su valor por defecto. Una fila nueva en la hoja no llega al JSON.
 *
 * Los valores por defecto son siempre los MÁS RESTRICTIVOS: si la hoja
 * dice algo que no se entiende, se decide no mostrar.
 */
var CAMPOS_CONFIG = {
  api_version:            { destino: 'api_version',            tipo: 'texto',    defecto: API_VERSION, max: 12 },
  moneda_default:         { destino: 'moneda',                 tipo: 'moneda',   defecto: 'PEN' },
  mostrar_precios:        { destino: 'mostrar_precios',        tipo: 'booleano', defecto: false },
  mostrar_stock:          { destino: null,                     tipo: 'booleano', defecto: false },
  mostrar_promociones:    { destino: null,                     tipo: 'booleano', defecto: false },
  cache_segundos:         { destino: null,                     tipo: 'entero',   defecto: 300 },
  mensaje_sin_resultados: { destino: 'mensaje_sin_resultados', tipo: 'texto',    defecto: 'No encontramos modelos con esos filtros.', max: 180 },
  mensaje_catalogo_vacio: { destino: 'mensaje_catalogo_vacio', tipo: 'texto',    defecto: 'Estamos preparando la publicación del catálogo.', max: 240 },
  promociones_max_home:    { destino: null,                    tipo: 'entero',   defecto: 0 },
  promociones_max_catalogo:{ destino: null,                    tipo: 'entero',   defecto: 0 }
};

/**
 * `mostrar_stock` y `mostrar_promociones` se LEEN pero su destino es
 * null: no viajan al cliente. No es un descuido.
 *
 * `mostrar_stock` no viaja porque este endpoint no puede publicar stock
 * bajo ninguna circunstancia — no hay ninguna columna de stock en la
 * whitelist de modelos, así que la bandera no gobierna nada y enviarla
 * solo sugeriría que existe una función que no existe.
 *
 * `mostrar_promociones` y los dos topes de promociones pertenecen a la
 * fase 5 y a otra hoja. Se leen para validar tipos y para que quien
 * mantenga esto vea que se han tenido en cuenta.
 *
 * `cache_segundos` gobierna la caché del servidor; el cliente no la
 * necesita.
 */

/** Monedas admitidas. Cualquier otra cae a PEN. */
var MONEDAS = ['PEN', 'USD'];

/** Estados editoriales admitidos. Cualquier otro se trata como BORRADOR. */
var ESTADOS_CONTENIDO = ['BORRADOR', 'EN_REVISION', 'APROBADO'];

/** El único estado que autoriza la publicación. */
var ESTADO_PUBLICABLE = 'APROBADO';

/**
 * Marcadores de texto pendiente. Espejo EXACTO de MARCAS_PROVISIONALES
 * en catalogo-completitud.js y de PROVISIONALES en
 * scripts/reglas-catalogo.mjs. scripts/qa-api-catalogo.mjs compara las
 * tres y falla si alguna se desvía.
 *
 * Una celda que contenga cualquiera de estas expresiones no es
 * contenido: es una nota para uno mismo. Hasta ahora el backend solo
 * comprobaba que la descripción no estuviera vacía, así que un
 * "PENDIENTE" bastaba para publicar la ficha.
 *
 * La comparación es sobre el texto en minúsculas y sin tildes, por
 * inclusión. Deliberadamente NO se marca como provisional un texto solo
 * por ser corto: «Ágil para la ciudad.» es una descripción legítima.
 */
var MARCAS_PROVISIONALES = [
  'pendiente',
  'por completar',
  'por definir',
  'descripcion ampliada',
  'texto provisional',
  'lorem ipsum',
  'tbd'
];

/* ============================================================
   RUTAS Y CATEGORÍAS
   ============================================================ */

/**
 * Prefijos de ruta admitidos. Idénticos a PREFIJOS_LOCALES en
 * assets/js/catalogo/catalogo-utils.js — si divergen, el backend emite
 * rutas que el frontend descarta en silencio y las fotos desaparecen.
 * scripts/qa-api-catalogo.mjs comprueba la equivalencia.
 */
var PREFIJOS_RUTA = ['assets/', 'data/', 'legales/'];

/**
 * Dominios externos admitidos para imágenes. VACÍO a propósito.
 *
 * El legacy Code.gs admitía 'arenasweb.github.io' y
 * 'raw.githubusercontent.com', pero DOMINIOS_AUTORIZADOS del frontend
 * está vacío: cualquier URL absoluta que emitiera el backend sería
 * rechazada al llegar, y la imagen desaparecería sin explicación.
 * Se mantienen alineados en cero.
 */
var DOMINIOS_IMAGEN = [];

/**
 * Taxonomía cerrada. Cinco categorías, incluida `carga`.
 *
 * NO es la lista de categorías publicadas: eso lo decide la hoja
 * CATEGORIAS con su columna `activo`. Esta lista solo dice qué valores
 * son gramaticalmente válidos, y existe para que una errata
 * ("deportivas", "ciudadd") no cree una categoría fantasma.
 *
 * El legacy tenía aquí cuatro y omitía `carga`, que es justamente la
 * categoría de 5 modelos del catálogo.
 */
var CATEGORIAS_VALIDAS = ['ciudad', 'trabajo', 'deportiva', 'aventura', 'carga'];

/**
 * Nombres de columna que se rechazan aunque alguien los añada a la
 * hoja. La protección real es la whitelist —lo que no está en
 * CAMPOS_MODELO no sale—; esta lista es una segunda barrera que además
 * deja constancia en el diagnóstico de que alguien intentó publicar
 * algo que no debe publicarse.
 */
var COLUMNAS_PROHIBIDAS = [
  'stock', 'stock_real', 'stock_publico', 'stock_almacen', 'stock_tienda',
  'estado_stock', 'mostrar_stock', 'mostrar_stock_exacto', 'cantidad', 'unidades',
  'numero_chasis', 'chasis', 'numero_motor', 'motor_serie', 'vin',
  'ubicacion', 'ubicacion_almacen', 'almacen', 'deposito',
  'costo', 'costo_compra', 'margen', 'margen_porcentaje', 'proveedor',
  'telefono', 'telefono_cliente', 'whatsapp', 'correo', 'email', 'direccion',
  'asesor', 'vendedor', 'dni', 'ruc', 'cliente', 'contrato',
  'cuota', 'cuota_inicial', 'financiamiento', 'financiamiento_interno',
  'nota_interna', 'comentario_interno', 'observacion_interna',
  'password', 'token', 'token_secreto', 'api_key', 'secret', 'credencial'
];
