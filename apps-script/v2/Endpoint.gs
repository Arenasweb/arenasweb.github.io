/**
 * ARENAS MOTOCICLETAS — Endpoint.gs  (backend v2)
 * ===============================================
 * La única capa que habla con Apps Script. Todo lo demás —normalizar,
 * filtrar, decidir qué se publica— vive en Nucleo.gs y se puede probar
 * en Node sin desplegar nada.
 *
 * Este archivo solo hace tres cosas: abrir el libro, leer hojas y
 * devolver JSON.
 *
 * SOLO LECTURA. No hay doPost. No hay setValue, appendRow, insertSheet
 * ni ninguna operación de escritura. Tampoco escribe configuración:
 * lee la propiedad del script, nunca la modifica.
 *
 * ⚠️ NO DESPLEGADO. Ver apps-script/v2/README.md antes de publicar.
 */

/**
 * Clave de caché. Lleva las DOS versiones: si cambia el contrato de
 * datos o la interfaz del endpoint, las respuestas guardadas con la
 * forma antigua dejan de usarse solas.
 */
var CACHE_CLAVE = 'arenas_catalogo_v' + CONTRATO_MAYOR + '_api' + API_VERSION;

/** Marca de los errores de configuración, para distinguirlos de un fallo real. */
var ERROR_CONFIG = 'ARENAS_BACKEND_NO_CONFIGURADO';

/* ============================================================
   PUNTO DE ENTRADA
   ============================================================ */

/**
 * Única entrada pública.
 *
 *   ?action=catalogo   (por defecto)  contrato público completo
 *   ?action=salud                     estado del servicio
 *
 * Se llama `action` porque es lo que el cliente ya envía hoy
 * (catalogo-data.js → cargarRemoto).
 *
 * NO existe ningún parámetro que permita ver borradores, elegir libro,
 * elegir hoja ni acotar un rango. Todo lo que no sea `action` se
 * ignora, y un `action` desconocido se rechaza en vez de caer al
 * catálogo.
 */
function doGet(e) {
  var accion = (e && e.parameter && e.parameter.action) || 'catalogo';

  if (accion === 'salud') {
    return responderJson_(salud_());
  }
  if (accion !== 'catalogo') {
    return responderJson_({ ok: false, error: 'accion_desconocida' });
  }

  try {
    return responderJson_(obtenerCatalogo_());
  } catch (error) {
    // Falta de configuración y avería son cosas distintas: quien opera
    // el sistema necesita distinguirlas, y ninguna de las dos puede
    // revelar el identificador del libro ni el texto de la excepción.
    if (error && error.message === ERROR_CONFIG) {
      registrar_('configuracion', 'falta la propiedad del script o su valor no es utilizable');
      return responderJson_({
        ok: false,
        version: CONTRATO_MAYOR,
        api_version: API_VERSION,
        error: 'backend_no_configurado',
        mensaje: 'El catálogo no está disponible en este momento.'
      });
    }
    registrar_('doGet', error && error.name ? error.name : 'error');
    return responderJson_({
      ok: false,
      version: CONTRATO_MAYOR,
      api_version: API_VERSION,
      error: 'error_interno',
      mensaje: 'El catálogo no está disponible en este momento.'
    });
  }
}

/**
 * Estado del servicio. Responde SIEMPRE, aunque no haya configuración:
 * su función es decir si el endpoint está vivo.
 *
 *   ok          el endpoint responde
 *   configurado hay un identificador de libro utilizable
 *
 * `configurado: true` NO afirma que el catálogo funcione: no se abre el
 * libro ni se lee ninguna hoja. Comprobarlo obligaría a leer cuatro
 * hojas en cada sondeo, y una comprobación de vida no debe costar eso.
 * Para saber si el catálogo responde de verdad, se pide `action=catalogo`.
 *
 * No revela el identificador, ni el nombre de la propiedad, ni las hojas.
 */
function salud_() {
  var configurado = false;
  try {
    configurado = !!idLibro_();
  } catch (error) {
    configurado = false;
  }
  return {
    ok: true,
    servicio: 'arenas-catalogo',
    api_version: API_VERSION,
    version: CONTRATO_MAYOR,
    configurado: configurado
  };
}

/** Serializa como JSON. Nunca HTML: no se usa HtmlService en este proyecto. */
function responderJson_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   ORIGEN DE DATOS
   ============================================================ */

/**
 * Identificador del libro, leído de las propiedades del script.
 * Devuelve '' si no hay nada utilizable. Nunca lanza.
 *
 * Es el ÚNICO origen admitido. No se acepta por parámetro de la URL, ni
 * desde una hoja, ni como constante en el código: si se pudiera elegir
 * el libro desde fuera, cualquiera podría apuntar el endpoint a un
 * documento suyo — o a uno nuestro que no debería publicarse.
 */
function idLibro_() {
  var propiedades = PropertiesService.getScriptProperties();
  if (!propiedades) return '';
  var valor = propiedades.getProperty(PROP_ID_LIBRO);
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

/**
 * Abre el libro. Falla CERRADO ante cualquier problema.
 *
 * No hay respaldo con getActiveSpreadsheet(), getActive() ni
 * getActiveSheet(). Un respaldo así es justamente lo que enmascaraba el
 * problema: en el editor funcionaba y en la Web App no, porque una Web
 * App independiente no tiene libro activo.
 */
function abrirLibro_() {
  var id = idLibro_();
  if (!id) throw new Error(ERROR_CONFIG);

  var libro;
  try {
    libro = SpreadsheetApp.openById(id);
  } catch (error) {
    // El mensaje de esta excepción incluye el identificador: no se
    // propaga ni se registra.
    throw new Error(ERROR_CONFIG);
  }
  if (!libro) throw new Error(ERROR_CONFIG);
  return libro;
}

/* ============================================================
   LECTURA Y CACHÉ
   ============================================================ */

/**
 * Devuelve el contrato público, de la caché si está fresca.
 *
 * El TTL lo gobierna `cache_segundos` de CONFIG_PUBLICA, acotado entre
 * 30 s y 1 h. Esto es lo que permite que editar la hoja se refleje en la
 * web sin volver a desplegar: pasado el TTL, la siguiente visita relee.
 *
 * Solo se cachean las respuestas correctas. Guardar un error dejaría el
 * catálogo caído durante todo el TTL aunque la hoja ya estuviera
 * arreglada; así, en cuanto se corrige, la siguiente visita lo ve.
 */
function obtenerCatalogo_() {
  var cache = CacheService.getScriptCache();

  var guardado = cache.get(CACHE_CLAVE);
  if (guardado) {
    try {
      return JSON.parse(guardado);
    } catch (error) {
      cache.remove(CACHE_CLAVE);
    }
  }

  var libro = abrirLibro_();

  var completo = construirRespuesta_({
    modelos: leerHoja_(libro, HOJA_MODELOS),
    config: leerHoja_(libro, HOJA_CONFIG),
    categorias: leerHoja_(libro, HOJA_CATEGORIAS),
    // Hoja opcional: si no existe, leerHoja_ devuelve null y el catálogo
    // se publica con colores: [] en vez de fallar entero.
    colores: leerHoja_(libro, HOJA_COLORES)
  }, new Date().toISOString());

  if (completo._diagnostico && completo._diagnostico.length) {
    registrarDiagnostico_(completo._diagnostico);
  }

  var publico = limpiarParaCliente_(completo);

  if (completo.ok === true) {
    try {
      cache.put(CACHE_CLAVE, JSON.stringify(publico), completo._cache_segundos || 300);
    } catch (error) {
      // Si la respuesta supera el tamaño máximo de la caché se sirve
      // igual, solo que sin cachear. No es motivo para fallar.
      registrar_('cache.put', error && error.name ? error.name : 'error');
    }
  }

  return publico;
}

/**
 * Lee una hoja completa como matriz.
 * @returns {Array|null} null si la hoja no existe (caso previsto para
 *          COLORES_MODELO_WEB, que todavía no se ha creado)
 */
function leerHoja_(libro, nombre) {
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) return null;
  var rango = hoja.getDataRange();
  if (!rango) return null;
  var valores = rango.getValues();
  return valores && valores.length ? valores : null;
}

/* ============================================================
   REGISTRO
   ============================================================ */

/**
 * Registro mínimo. NUNCA se vuelca una hoja, ni valores de celdas, ni
 * el identificador del libro: solo dónde ocurrió y de qué tipo fue.
 */
function registrar_(donde, detalle) {
  Logger.log('[arenas] ' + donde + ': ' + String(detalle));
}

/** El diagnóstico nombra modelos y columnas: se queda en el registro. */
function registrarDiagnostico_(lista) {
  Logger.log('[arenas] diagnóstico (' + lista.length + ' avisos)');
  for (var i = 0; i < lista.length && i < 40; i++) {
    Logger.log('  · ' + lista[i]);
  }
}

/* ============================================================
   UTILIDAD MANUAL
   ============================================================ */

/**
 * Vacía la caché para ver un cambio de la hoja al instante.
 * Se ejecuta a mano desde el editor de Apps Script. No es una ruta
 * pública: doGet no la expone bajo ningún parámetro.
 */
function limpiarCache() {
  CacheService.getScriptCache().remove(CACHE_CLAVE);
  Logger.log('[arenas] caché vaciada');
}
