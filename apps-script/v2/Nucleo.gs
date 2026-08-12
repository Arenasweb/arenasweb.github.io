/**
 * ARENAS MOTOCICLETAS — Nucleo.gs  (backend v2)
 * =============================================
 * Toda la lógica del contrato: normalizar, filtrar, decidir qué se
 * publica y armar la respuesta.
 *
 * REGLA DE ESTE ARCHIVO — no contiene NINGUNA llamada a
 * SpreadsheetApp, CacheService, ContentService, UrlFetchApp, DriveApp,
 * Logger ni Utilities. Recibe matrices y devuelve objetos.
 *
 * Existe así por una razón práctica: permite ejecutarlo entero en Node
 * y probar la publicabilidad, la lista blanca y los normalizadores sin
 * desplegar nada y sin tocar la hoja. Ver scripts/qa-api-catalogo.mjs.
 *
 * Endpoint.gs es la única parte que habla con Apps Script.
 */

/* ============================================================
   NORMALIZADORES
   ============================================================ */

/** Texto plano acotado: sin etiquetas, sin caracteres de control. */
function normTexto_(valor, maximo) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object' && !(valor instanceof Date)) return '';
  if (typeof valor === 'number' && !isFinite(valor)) return '';
  var t = String(valor)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  var tope = typeof maximo === 'number' ? maximo : 240;
  return t.length > tope ? t.substring(0, tope).trim() : t;
}

/** Texto largo: conserva los saltos de párrafo, quita el marcado. */
function normTextoLargo_(valor, maximo) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object' && !(valor instanceof Date)) return '';
  var t = String(valor)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  var tope = typeof maximo === 'number' ? maximo : 2000;
  return t.length > tope ? t.substring(0, tope).trim() : t;
}

/**
 * Booleano tolerante con lo que escribe una persona en una hoja.
 *
 * NO se usa Boolean(valor): Boolean('FALSE') es true, y esa sola línea
 * publicaría todo el catálogo. Solo una lista cerrada de formas de
 * decir «sí» devuelve true; cualquier otra cosa, incluida una celda
 * vacía, es false. El valor por defecto seguro es «no publicar».
 */
function normBooleano_(valor) {
  if (valor === true) return true;
  if (valor === false || valor === null || valor === undefined) return false;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor !== 'string') return false;
  var v = valor.trim().toLowerCase();
  return v === 'true' || v === 'verdadero' || v === 'si' || v === 'sí' ||
         v === 'yes' || v === 'x' || v === '1';
}

/**
 * Importe positivo o null. Nunca NaN, nunca Infinity, nunca 0 ni negativo.
 *
 * LA CELDA DEBERÍA SER NUMÉRICA. Cuando lo es, este camino es trivial.
 * El texto se acepta solo por compatibilidad y únicamente en formatos
 * SIN AMBIGÜEDAD, con el punto como separador decimal:
 *
 *     12990          ✓        12990,50       ✗  ¿12 990,50 o 1 299 050?
 *     12990.50       ✓        12.990,50      ✗  formato europeo
 *     12,990         ✓        1,23           ✗  coma fuera de posición de millar
 *     S/ 12,990.00   ✓        12990.505      ✗  más de dos decimales
 *
 * La versión anterior borraba todos los caracteres que no fueran dígito
 * o punto, así que "12990,50" se convertía en 1 299 050: un precio cien
 * veces mayor, publicado sin ningún aviso. Ante un formato ambiguo se
 * devuelve null y el precio sencillamente no se muestra; es preferible
 * no enseñar un precio a enseñar uno equivocado.
 */
var PRECIO_TEXTO = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;

function normNumero_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  if (typeof valor === 'number') {
    return isFinite(valor) && valor > 0 ? valor : null;
  }
  if (typeof valor !== 'string') return null;

  // Se quitan símbolo de moneda y espacios; nada más.
  var limpio = valor.replace(/^\s*(?:S\/\.?|PEN|USD|\$)\s*/i, '').trim();
  if (!PRECIO_TEXTO.test(limpio)) return null;

  var n = parseFloat(limpio.replace(/,/g, ''));
  return isFinite(n) && n > 0 ? n : null;
}

/** Entero con valor por defecto. */
function normEntero_(valor, porDefecto) {
  var n;
  if (typeof valor === 'number') n = valor;
  else n = parseInt(String(valor === null || valor === undefined ? '' : valor).replace(/[^\d\-]/g, ''), 10);
  if (!isFinite(n)) return porDefecto;
  return Math.trunc(n);
}

/**
 * Slug de URL. NO se genera uno automáticamente si falta o es
 * inválido: se devuelve '' y la fila se descarta.
 *
 * Corregir un slug en silencio produciría una URL que nadie escribió,
 * distinta de la que figura en la hoja, y que cambiaría sola el día que
 * alguien retoque el nombre del modelo. Es mejor que la fila no salga y
 * que el diagnóstico lo diga.
 */
function normSlug_(valor) {
  var v = normTexto_(valor, 80).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? v : '';
}

/**
 * Ruta de imagen. Solo rutas relativas dentro de los prefijos del
 * repositorio. Misma política que rutaImagen() del frontend: si aquí se
 * admitiera algo que allí se rechaza, la imagen desaparecería sin
 * ningún mensaje.
 */
function normRuta_(valor) {
  var url = normTexto_(valor, 300);
  if (!url) return '';
  if (/^\s*(javascript|data|vbscript|file|blob|about):/i.test(url)) return '';
  if (/[<>"'\\]/.test(url)) return '';
  if (url.indexOf('//') === 0) return '';
  if (url.indexOf('..') !== -1) return '';
  if (!/^[A-Za-z0-9._\/-]+$/.test(url)) return '';
  for (var i = 0; i < PREFIJOS_RUTA.length; i++) {
    if (url.indexOf(PREFIJOS_RUTA[i]) === 0) return url;
  }
  for (var k = 0; k < DOMINIOS_IMAGEN.length; k++) {
    if (url.indexOf('https://' + DOMINIOS_IMAGEN[k] + '/') === 0) return url;
  }
  return '';
}

/**
 * Punto focal para object-position. Palabras clave y porcentajes de
 * 0 a 100; nada más. Es uno de los dos únicos valores de la hoja que
 * acaban tocando CSS, así que el formato es cerrado: ni calc(), ni
 * url(), ni var(), ni expresiones.
 */
function normFoco_(valor) {
  var v = normTexto_(valor, 40).toLowerCase();
  if (!v) return 'center center';
  // En la sintaxis de dos valores, el primero es el eje horizontal y el
  // segundo el vertical. Con una sola lista pasaban combinaciones que
  // CSS no admite —"top bottom", "left right"— y que el navegador
  // descarta en silencio.
  var pct = '(?:100|[0-9]{1,2})%';
  var uno = new RegExp('^(?:left|center|right|top|bottom|' + pct + ')$');
  var dos = new RegExp('^(?:left|center|right|' + pct + ')\\s+(?:top|center|bottom|' + pct + ')$');
  if (v.indexOf(' ') === -1) return uno.test(v) ? v : 'center center';
  return dos.test(v) ? v : 'center center';
}

/** Color hexadecimal #RGB o #RRGGBB. El otro valor que toca CSS. */
function normHex_(valor) {
  var v = normTexto_(valor, 12);
  if (!v) return '';
  if (v.charAt(0) !== '#') v = '#' + v;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v.toLowerCase() : '';
}

/**
 * ¿Este texto es un marcador de trabajo pendiente en vez de contenido?
 *
 * Misma política que esProvisional() en catalogo-completitud.js: se
 * compara en minúsculas y sin tildes, por inclusión, contra una lista
 * cerrada. Un texto corto NO es provisional por serlo.
 */
function esProvisional_(valor) {
  var t = normTexto_(valor, 400)
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u');
  if (!t) return false;
  for (var i = 0; i < MARCAS_PROVISIONALES.length; i++) {
    if (t.indexOf(MARCAS_PROVISIONALES[i]) !== -1) return true;
  }
  return false;
}

/** Texto real: existe y no es un marcador de pendiente. */
function textoReal_(valor, maximo) {
  var t = normTexto_(valor, maximo);
  return t && !esProvisional_(t) ? t : '';
}

/** Moneda de la lista cerrada; cualquier otra cosa cae a PEN. */
function normMoneda_(valor) {
  var v = normTexto_(valor, 8).toUpperCase();
  for (var i = 0; i < MONEDAS.length; i++) {
    if (MONEDAS[i] === v) return v;
  }
  return 'PEN';
}

/** Estado editorial de la lista cerrada; cualquier otro es BORRADOR. */
function normEstado_(valor) {
  var v = normTexto_(valor, 20).toUpperCase().replace(/\s+/g, '_');
  for (var i = 0; i < ESTADOS_CONTENIDO.length; i++) {
    if (ESTADOS_CONTENIDO[i] === v) return v;
  }
  return 'BORRADOR';
}

/** Fecha en ISO, o '' si no se entiende. */
function normFechaIso_(valor) {
  if (!valor) return '';
  var d = valor instanceof Date ? valor : new Date(String(valor));
  return isFinite(d.getTime()) ? d.toISOString() : '';
}

/** Aplica el normalizador que indica la whitelist. */
function aplicarTipo_(valor, def) {
  switch (def.tipo) {
    case 'texto':      return normTexto_(valor, def.max);
    case 'textoLargo': return normTextoLargo_(valor, def.max);
    case 'numero':     return normNumero_(valor);
    case 'entero':     return normEntero_(valor, 999);
    case 'booleano':   return normBooleano_(valor);
    case 'slug':       return normSlug_(valor);
    case 'ruta':       return normRuta_(valor);
    case 'foco':       return normFoco_(valor);
    case 'hex':        return normHex_(valor);
    case 'moneda':     return normMoneda_(valor);
    case 'fecha':      return normFechaIso_(valor);
    default:           return normTexto_(valor, def.max);
  }
}

/* ============================================================
   LECTURA DE MATRICES
   ============================================================ */

/** "Precio Público " → "precio_publico". Tolerante a tildes y espacios. */
function normEncabezado_(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .trim()
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Convierte una matriz [[encabezados], [fila], …] en objetos, mapeando
 * POR NOMBRE de columna y no por posición.
 *
 * Mapear por posición haría que reordenar dos columnas en la hoja
 * —algo que cualquiera puede hacer sin querer al arrastrar— publicase
 * el precio en el campo del slug. Con nombres, reordenar es inocuo.
 *
 * ENCABEZADOS DUPLICADOS = TABLA INVÁLIDA. No «gana el primero» ni
 * «gana el último»: la tabla se marca como ambigua y quien la use debe
 * descartarla entera.
 *
 * El motivo es concreto. Con estas columnas:
 *
 *     activo | estado_contenido | activo | estado_contenido
 *     FALSE  | BORRADOR         | TRUE   | APROBADO
 *
 * la política de «gana el último» publicaba un modelo cuyas columnas
 * reales decían que NO debía publicarse. La comparación se hace sobre el
 * encabezado ya normalizado, así que «activo», « ACTIVO » y «Activo»
 * son el mismo y también colisionan.
 *
 * @returns {{filas, encabezados, duplicados, prohibidas, ambigua}}
 */
function matrizAObjetos_(matriz) {
  var salida = { filas: [], encabezados: [], duplicados: [], prohibidas: [], ambigua: false };
  if (!matriz || !matriz.length) return salida;

  var vistos = {};
  var cabecera = matriz[0].map(normEncabezado_);

  for (var c = 0; c < cabecera.length; c++) {
    var nombre = cabecera[c];
    if (!nombre) continue;
    if (vistos[nombre]) {
      if (salida.duplicados.indexOf(nombre) === -1) salida.duplicados.push(nombre);
      salida.ambigua = true;
    }
    vistos[nombre] = true;
    if (COLUMNAS_PROHIBIDAS.indexOf(nombre) !== -1) salida.prohibidas.push(nombre);
  }
  salida.encabezados = cabecera;

  // Con la tabla ya marcada como ambigua no se leen las filas: no hay
  // ninguna lectura correcta posible y devolver «algo» invita a usarlo.
  if (salida.ambigua) return salida;

  for (var f = 1; f < matriz.length; f++) {
    var fila = matriz[f];
    var obj = {};
    var vacia = true;
    for (var k = 0; k < cabecera.length; k++) {
      if (!cabecera[k]) continue;
      var v = fila[k];
      obj[cabecera[k]] = v;
      if (v !== '' && v !== null && v !== undefined) vacia = false;
    }
    // Las filas totalmente vacías son ruido de la hoja, no modelos.
    if (!vacia) salida.filas.push(obj);
  }
  return salida;
}

/** ¿Están todas las columnas requeridas? */
function faltanColumnas_(encabezados, requeridas) {
  var faltan = [];
  for (var i = 0; i < requeridas.length; i++) {
    if (encabezados.indexOf(requeridas[i]) === -1) faltan.push(requeridas[i]);
  }
  return faltan;
}

/**
 * ¿Esta tabla es utilizable? Devuelve '' si lo es, o el motivo por el
 * que no. Mismo criterio para las cuatro hojas del contrato.
 */
function motivoTablaInvalida_(tabla, requeridas) {
  if (tabla.ambigua) return 'encabezados duplicados: ' + tabla.duplicados.join(', ');
  var faltan = faltanColumnas_(tabla.encabezados, requeridas || []);
  if (faltan.length) return 'faltan columnas requeridas: ' + faltan.join(', ');
  return '';
}

/* ============================================================
   PUBLICABILIDAD
   ============================================================ */

/**
 * La puerta de publicación. Las DOS condiciones, siempre.
 *
 *   activo = TRUE            intención de publicar
 *   estado_contenido = APROBADO   contenido revisado
 *
 * Este endpoint NO admite ningún parámetro que se salte esta regla. No
 * existe ?preview ni ?debug del lado del servidor: la previsualización
 * de borradores es una función local del frontend, sobre el archivo
 * local, y no debe poder pedirse a una URL pública.
 */
function esPublicable_(fila) {
  return normBooleano_(fila.activo) === true &&
         normEstado_(fila.estado_contenido) === ESTADO_PUBLICABLE;
}

/**
 * Política de precio, en un solo sitio.
 *
 * El importe SOLO viaja si se cumplen las tres condiciones a la vez:
 * la bandera global, la bandera de la fila y un importe positivo real.
 * Si falta una, `precio_publico` no se incluye en el JSON y
 * `mostrar_precio` sale false.
 *
 * Se eligió omitir en vez de enviar-y-que-el-frontend-decida porque un
 * precio que no debe verse no tiene por qué llegar al navegador: basta
 * abrir la pestaña de red para leerlo. El frontend vuelve a comprobar
 * las tres condiciones por su cuenta (defensa en dos capas).
 */
function resolverPrecio_(fila, config) {
  var importe = normNumero_(fila.precio_publico);
  var visible = config.mostrar_precios === true &&
                normBooleano_(fila.mostrar_precio) === true &&
                importe !== null;
  return { visible: visible, importe: visible ? importe : null };
}

/* ============================================================
   CONSTRUCCIÓN DE ENTIDADES
   ============================================================ */

/**
 * Convierte una fila cruda en un modelo público, o devuelve null.
 * @param {Object} fila
 * @param {Object} config configuración ya normalizada
 * @param {Array} diagnostico se rellena con los motivos de descarte
 */
function construirModelo_(fila, config, diagnostico) {
  var id = normTexto_(fila.id, 40);
  var slug = normSlug_(fila.slug);
  var modelo = normTexto_(fila.modelo, 120);
  var etiqueta = modelo || id || '(fila sin identidad)';

  if (!id || !modelo) {
    diagnostico.push('fila descartada: falta id o modelo (' + etiqueta + ')');
    return null;
  }
  if (!slug) {
    diagnostico.push('"' + etiqueta + '" descartado: slug ausente o inválido');
    return null;
  }

  var categoria = normTexto_(fila.categoria, 40).toLowerCase();
  if (CATEGORIAS_VALIDAS.indexOf(categoria) === -1) {
    diagnostico.push('"' + etiqueta + '" descartado: categoría "' + categoria + '" fuera de la taxonomía');
    return null;
  }

  if (!esPublicable_(fila)) return null;

  // MÍNIMOS PUBLICABLES. Aprobar y activar expresa una intención; esto
  // comprueba que el contenido esté a la altura de esa intención.
  //
  // Antes bastaba con `activo` + `APROBADO`, así que una moto podía
  // llegar al público sin fotografía y sin una sola línea de texto: una
  // tarjeta con un marcador gris y un nombre. La documentación ya
  // consideraba obligatoria la fotografía; era el runtime el que no lo
  // cumplía.
  //
  // Deliberadamente NO entran aquí precio, colores, galería,
  // características ni descripción larga: son opcionales y un modelo se
  // publica perfectamente sin ellos.
  // Un marcador de pendiente NO cuenta como contenido: "PENDIENTE" en la
  // descripción no es una descripción, y publicarlo es peor que no
  // publicar la ficha.
  var faltanMinimos = [];
  if (!normRuta_(fila.imagen_principal)) faltanMinimos.push('imagen_principal');
  if (!textoReal_(fila.alt_text, 160)) faltanMinimos.push('alt_text');
  if (!textoReal_(fila.descripcion_corta, 220)) faltanMinimos.push('descripcion_corta');

  if (faltanMinimos.length) {
    diagnostico.push('"' + etiqueta + '" aprobado y activo pero NO se publica; falta: ' + faltanMinimos.join(', '));
    return null;
  }

  var salida = {};
  for (var columna in CAMPOS_MODELO) {
    if (!CAMPOS_MODELO.hasOwnProperty(columna)) continue;
    var def = CAMPOS_MODELO[columna];
    if (!def.destino) continue;              // INTERNO: no viaja
    if (columna === 'precio_publico' || columna === 'mostrar_precio') continue;
    salida[def.destino] = aplicarTipo_(fila[columna], def);
  }

  // TEXTO OPCIONAL PROVISIONAL: no bloquea, pero tampoco se publica.
  //
  // Los 22 modelos del libro real llevan hoy la misma nota en
  // `descripcion_larga`: «Descripción ampliada pendiente de completar…».
  // Es un campo opcional, así que su ausencia no impide publicar —eso
  // está bien y no cambia—, pero publicar el texto sí sería un problema:
  // la ficha diría al visitante que está pendiente de completar.
  //
  // Se vacía en la salida y se anota en el diagnóstico. El modelo sigue
  // siendo publicable; simplemente ese bloque no se dibuja.
  var opcionalesSaneados = [];
  ['descripcion_larga', 'caracteristica_1', 'caracteristica_2', 'caracteristica_3'].forEach(
    function (columna) {
      var destino = CAMPOS_MODELO[columna].destino;
      if (salida[destino] && esProvisional_(salida[destino])) {
        salida[destino] = '';
        opcionalesSaneados.push(columna);
      }
    }
  );
  if (opcionalesSaneados.length) {
    diagnostico.push(
      '"' + etiqueta + '": texto provisional no publicado en ' + opcionalesSaneados.join(', ')
    );
  }

  var precio = resolverPrecio_(fila, config);
  salida.mostrar_precio = precio.visible;
  if (precio.visible) salida.precio_publico = precio.importe;

  return salida;
}

/**
 * Convierte una fila de COLORES_MODELO_WEB en una variante pública.
 * Una variante sin imagen principal utilizable NO se publica: el
 * propósito del selector es cambiar la fotografía al elegir un color, y
 * una fila sin foto mostraría la de otro color como si fuera la suya.
 */
function construirColor_(fila, idsValidos, diagnostico) {
  var modeloId = normTexto_(fila.modelo_id, 40);
  var nombre = normTexto_(fila.nombre_color, 60);
  var slug = normSlug_(fila.slug_color);

  if (!modeloId || !nombre || !slug) return null;

  if (idsValidos.indexOf(modeloId) === -1) {
    diagnostico.push('color "' + nombre + '" descartado: su modelo (' + modeloId + ') no está publicado');
    return null;
  }
  if (normBooleano_(fila.activo) !== true) return null;
  if (normEstado_(fila.estado_aprobacion) !== ESTADO_PUBLICABLE) return null;

  var principal = normRuta_(fila.imagen_principal);
  if (!principal) {
    diagnostico.push('color "' + nombre + '" descartado: sin imagen_principal utilizable');
    return null;
  }

  var salida = {};
  for (var columna in CAMPOS_COLOR) {
    if (!CAMPOS_COLOR.hasOwnProperty(columna)) continue;
    var def = CAMPOS_COLOR[columna];
    if (!def.destino) continue;
    salida[def.destino] = aplicarTipo_(fila[columna], def);
  }
  salida.id = salida.id || modeloId + '-' + slug;
  return salida;
}

/**
 * Normaliza CONFIG_PUBLICA: pares clave/valor con lista blanca.
 *
 * Una clave repetida NO se resuelve eligiendo una de las dos. Con
 *
 *     mostrar_precios | FALSE
 *     mostrar_precios | TRUE
 *
 * la política de «gana la última» encendía los precios de todo el
 * catálogo a partir de una hoja que dice dos cosas contrarias. Ahora
 * una clave ambigua se ignora y se aplica su valor por defecto, que en
 * todos los casos es el restrictivo: ante la duda, no mostrar.
 *
 * @param {Array} filas
 * @param {Array} diagnostico se rellena con las claves ambiguas
 */
function construirConfig_(filas, diagnostico) {
  var bruto = {};
  var ambiguas = {};
  (filas || []).forEach(function (f) {
    var clave = normEncabezado_(f.clave !== undefined ? f.clave : f.parametro);
    if (!clave) return;
    if (bruto.hasOwnProperty(clave)) {
      ambiguas[clave] = true;
      return;
    }
    bruto[clave] = f.valor;
  });

  Object.keys(ambiguas).forEach(function (clave) {
    if (diagnostico) {
      diagnostico.push('CONFIG_PUBLICA: la clave "' + clave + '" está repetida; se aplica el valor por defecto');
    }
  });

  var salida = {};
  var interno = {};
  for (var campo in CAMPOS_CONFIG) {
    if (!CAMPOS_CONFIG.hasOwnProperty(campo)) continue;
    var def = CAMPOS_CONFIG[campo];
    var utilizable = bruto.hasOwnProperty(campo) && !ambiguas[campo];
    var valor = utilizable ? aplicarTipo_(bruto[campo], def) : def.defecto;

    // Un texto vacío o un número no entendido caen al valor por defecto.
    if (valor === '' || valor === null || valor === undefined) valor = def.defecto;
    if (def.tipo === 'booleano' && !utilizable) valor = def.defecto;

    if (def.destino) salida[def.destino] = valor;
    else interno[campo] = valor;
  }

  // La caché tiene un rango sensato: ni 0 (machacaría la hoja a
  // peticiones) ni seis horas (los cambios comerciales no aparecerían).
  var cache = interno.cache_segundos;
  if (!isFinite(cache) || cache < 30 || cache > 3600) cache = CAMPOS_CONFIG.cache_segundos.defecto;
  interno.cache_segundos = cache;

  return { publica: salida, interna: interno };
}

/**
 * Categorías públicas. Se leen de la hoja, con su estado `activo`;
 * no hay ninguna lista fija de categorías publicables en el código.
 *
 * Dos filas con el mismo slug invalidan la hoja entera. Una de ellas
 * puede decir `activo=FALSE` y la otra `activo=TRUE`, y elegir en
 * silencio cualquiera de las dos decide si cinco motos se publican o no.
 * Eso no se resuelve adivinando.
 *
 * @returns {{lista: Array, invalida: boolean, motivo: string}}
 */
function construirCategorias_(filas) {
  var lista = [];
  var vistas = {};
  var duplicadas = [];

  (filas || []).forEach(function (f) {
    var slug = normTexto_(f.slug, 40).toLowerCase();
    if (!slug || CATEGORIAS_VALIDAS.indexOf(slug) === -1) return;
    if (vistas[slug]) {
      if (duplicadas.indexOf(slug) === -1) duplicadas.push(slug);
      return;
    }
    vistas[slug] = true;
    lista.push({
      slug: slug,
      titulo: normTexto_(f.titulo !== undefined ? f.titulo : f.label, 60) || slug,
      descripcion: normTexto_(f.descripcion, 180),
      orden: normEntero_(f.orden, 999),
      activo: normBooleano_(f.activo)
    });
  });

  if (duplicadas.length) {
    return { lista: [], invalida: true, motivo: 'categorías repetidas: ' + duplicadas.join(', ') };
  }

  lista.sort(function (a, b) {
    if (a.orden !== b.orden) return a.orden - b.orden;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
  return { lista: lista, invalida: false, motivo: '' };
}

/* ============================================================
   RESPUESTA
   ============================================================ */

/**
 * Arma el contrato público completo a partir de las matrices ya leídas.
 * Función pura: se le pasan matrices, devuelve el objeto de respuesta.
 *
 * @param {Object} entrada {modelos, config, categorias, colores} — cada
 *        una una matriz [[encabezados],[fila],…]. `colores` puede ser
 *        null si la hoja no existe.
 * @param {string} generadoEn fecha ISO (la inyecta quien llama, para
 *        que esta función siga siendo determinista y comprobable)
 */
function construirRespuesta_(entrada, generadoEn) {
  var diagnostico = [];

  // --- Configuración ---
  // Si la propia hoja de configuración es ambigua no se lee ninguna
  // fila: todos los valores caen a sus valores por defecto, que son los
  // restrictivos.
  var cfgTabla = matrizAObjetos_(entrada.config);
  var motivoConfig = entrada.config ? motivoTablaInvalida_(cfgTabla, CONFIG_REQUERIDAS) : 'hoja ausente';
  if (motivoConfig) {
    // Sin una hoja de configuración utilizable no se adivina nada: todos
    // los valores caen a sus valores por defecto, que son los
    // restrictivos. En particular `mostrar_precios` queda en false.
    diagnostico.push('CONFIG_PUBLICA no utilizable (' + motivoConfig + '); se aplican los valores por defecto');
  }
  var cfg = construirConfig_(motivoConfig ? [] : cfgTabla.filas, diagnostico);

  // --- Modelos: sin contrato, no se publica nada ---
  var mdTabla = matrizAObjetos_(entrada.modelos);
  var motivoModelos = motivoTablaInvalida_(mdTabla, COLUMNAS_REQUERIDAS);
  if (motivoModelos) {
    return {
      ok: false,
      version: CONTRATO_MAYOR,
      api_version: cfg.publica.api_version,
      error: 'contrato_incompleto',
      mensaje: 'La hoja de modelos no cumple el contrato esperado.',
      generated_at: generadoEn,
      config: cfg.publica,
      categorias: [],
      modelos: [],
      colores: [],
      _cache_segundos: cfg.interna.cache_segundos,
      _diagnostico: diagnostico.concat(['MODELOS_WEB inutilizable: ' + motivoModelos])
    };
  }
  if (mdTabla.prohibidas.length) {
    diagnostico.push('columnas prohibidas presentes en la hoja (no se publican): ' + mdTabla.prohibidas.join(', '));
  }

  // --- Categorías ---
  // Si la hoja de categorías no es utilizable, la lista queda vacía. Como
  // un modelo solo se publica si su categoría está activa, el resultado
  // es que no se publica nada: falla cerrado, sin excepciones especiales.
  var catTabla = matrizAObjetos_(entrada.categorias);
  var motivoCat = motivoTablaInvalida_(catTabla, CATEGORIAS_REQUERIDAS);
  var categorias = [];
  if (motivoCat) {
    diagnostico.push('CATEGORIAS inutilizable: ' + motivoCat + '; no se publicará ningún modelo');
  } else {
    var resCat = construirCategorias_(catTabla.filas);
    if (resCat.invalida) {
      diagnostico.push('CATEGORIAS inutilizable: ' + resCat.motivo + '; no se publicará ningún modelo');
    } else {
      categorias = resCat.lista;
    }
  }
  var activas = [];
  categorias.forEach(function (c) {
    if (c.activo) activas.push(c.slug);
  });

  // --- Modelos publicables ---
  //
  // Se construyen todos primero y se descartan después los de identidad
  // ambigua. Con «gana el primero» bastaba con que alguien pegara una
  // fila más arriba para cambiar qué moto vive en una URL, sin tocar
  // ninguna de las dos filas. Si dos filas se disputan un `id` o un
  // `slug`, NO se publica ninguna de las dos: la hoja sigue siendo
  // válida, pero esa identidad concreta queda fuera hasta que alguien
  // decida cuál es la buena.
  var candidatos = [];
  mdTabla.filas.forEach(function (fila) {
    var m = construirModelo_(fila, cfg.publica, diagnostico);
    if (m) candidatos.push(m);
  });

  var cuentaId = {};
  var cuentaSlug = {};
  candidatos.forEach(function (m) {
    cuentaId[m.id] = (cuentaId[m.id] || 0) + 1;
    cuentaSlug[m.slug] = (cuentaSlug[m.slug] || 0) + 1;
  });

  var avisados = {};
  var modelos = [];
  candidatos.forEach(function (m) {
    if (cuentaId[m.id] > 1) {
      if (!avisados['id:' + m.id]) {
        diagnostico.push('id duplicado "' + m.id + '": no se publica ninguna de las filas implicadas');
        avisados['id:' + m.id] = true;
      }
      return;
    }
    if (cuentaSlug[m.slug] > 1) {
      if (!avisados['slug:' + m.slug]) {
        diagnostico.push('slug duplicado "' + m.slug + '": no se publica ninguna de las filas implicadas');
        avisados['slug:' + m.slug] = true;
      }
      return;
    }

    // Un modelo cuya categoría no está publicada NO se publica.
    // Publicarlo dejaría una moto visible que nadie puede filtrar y
    // cuya etiqueta caería al slug en crudo. Es más honesto que no
    // aparezca hasta que se decida activar su categoría.
    if (activas.indexOf(m.categoria) === -1) {
      diagnostico.push('"' + m.modelo + '" no se publica: su categoría "' + m.categoria + '" no está activa');
      return;
    }

    modelos.push(m);
  });

  modelos.sort(function (a, b) {
    if (a.orden !== b.orden) return a.orden - b.orden;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });

  // --- Colores: hoja opcional ---
  var colores = [];
  if (entrada.colores) {
    var colTabla = matrizAObjetos_(entrada.colores);
    var motivoColor = motivoTablaInvalida_(colTabla, COLUMNAS_COLOR_REQUERIDAS);
    if (motivoColor) {
      // La hoja de colores es opcional, pero una hoja AMBIGUA no es lo
      // mismo que una hoja ausente: no se adivina, se publica el
      // catálogo sin colores y queda anotado.
      diagnostico.push('COLORES_MODELO_WEB inutilizable: ' + motivoColor + '; se publica el catálogo sin colores');
    } else {
      var ids = modelos.map(function (m) { return m.id; });
      var candidatosColor = [];
      colTabla.filas.forEach(function (fila) {
        var c = construirColor_(fila, ids, diagnostico);
        if (c) candidatosColor.push(c);
      });

      // Identidad de una variante: modelo + slug de color. Si dos filas
      // se la disputan, no se publica ninguna — igual criterio que con
      // los modelos.
      var cuentaColor = {};
      candidatosColor.forEach(function (c) {
        var k = c.modelo_id + '::' + c.slug_color;
        cuentaColor[k] = (cuentaColor[k] || 0) + 1;
      });
      var avisadosColor = {};
      candidatosColor.forEach(function (c) {
        var k = c.modelo_id + '::' + c.slug_color;
        if (cuentaColor[k] > 1) {
          if (!avisadosColor[k]) {
            diagnostico.push('color duplicado "' + c.slug_color + '" en ' + c.modelo_id +
              ': no se publica ninguna de las filas implicadas');
            avisadosColor[k] = true;
          }
          return;
        }
        colores.push(c);
      });
      colores.sort(function (a, b) {
        if (a.modelo_id !== b.modelo_id) return a.modelo_id < b.modelo_id ? -1 : 1;
        if (a.orden !== b.orden) return a.orden - b.orden;
        return a.slug_color < b.slug_color ? -1 : 1;
      });
    }
  }

  // Solo se publican las categorías activas Y con algún modelo.
  var usadas = {};
  modelos.forEach(function (m) { usadas[m.categoria] = true; });
  var categoriasPublicas = [];
  categorias.forEach(function (c) {
    if (c.activo && usadas[c.slug]) {
      categoriasPublicas.push({ slug: c.slug, titulo: c.titulo, descripcion: c.descripcion, orden: c.orden });
    }
  });

  // Los nombres de estos campos NO son libres: son exactamente los que
  // ya lee assets/js/catalogo/catalogo-schema.js (extraerRegistros,
  // extraerColores, normalizarCategorias). Si el backend emitiera
  // `models` en inglés, el frontend no encontraría la lista y pintaría
  // un catálogo vacío sin dar ningún error. Reconciliar es esto.
  return {
    ok: true,
    version: CONTRATO_MAYOR,
    api_version: cfg.publica.api_version,
    generated_at: generadoEn,
    config: cfg.publica,
    categorias: categoriasPublicas,
    modelos: modelos,
    colores: colores,
    _cache_segundos: cfg.interna.cache_segundos,
    _diagnostico: diagnostico
  };
}

/**
 * Quita del objeto los campos que solo sirven al servidor.
 * Se aplica JUSTO antes de serializar: el diagnóstico puede nombrar
 * modelos y columnas, y eso no tiene por qué salir a internet.
 */
function limpiarParaCliente_(respuesta) {
  var salida = {};
  for (var k in respuesta) {
    if (!respuesta.hasOwnProperty(k)) continue;
    if (k.charAt(0) === '_') continue;
    salida[k] = respuesta[k];
  }
  return salida;
}
