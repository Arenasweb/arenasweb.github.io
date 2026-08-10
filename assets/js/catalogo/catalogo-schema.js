/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-schema.js
   Contrato de datos del catálogo público (hoja MODELOS_WEB).

   Responsabilidad única: convertir un registro CRUDO —venga del JSON
   local o, en el futuro, de Apps Script— en un objeto de modelo SEGURO
   y predecible, o descartarlo.

   Principios:
   · Lista blanca. Solo se leen las 28 columnas del contrato; cualquier
     campo extra que aparezca en el origen se ignora por completo.
   · Nada de stock. El contrato no tiene, y no debe tener, columnas de
     cantidades, chasis, motores, almacenes, costos ni clientes. Si el
     origen las enviara, este esquema no las lee y nunca llegan al DOM.
   · Valor por defecto seguro. Ante la duda: no publicar.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  /** Versión mayor del contrato que este frontend sabe leer. */
  var VERSION = "2";

  /** Taxonomía cerrada de categorías. Cualquier otra se rechaza. */
  var CATEGORIAS = ["ciudad", "trabajo", "deportiva", "aventura", "carga"];

  /** Estados editoriales del contenido. */
  var ESTADOS_CONTENIDO = ["BORRADOR", "EN_REVISION", "APROBADO"];

  /**
   * Las 28 columnas del contrato MODELOS_WEB, con su equivalente en
   * camelCase por si el endpoint remoto entrega las claves en ese estilo.
   * Cualquier columna ausente de esta lista es invisible para el frontend.
   */
  var COLUMNAS = [
    ["id", "id"],
    ["slug", "slug"],
    ["modelo", "modelo"],
    ["linea", "linea"],
    ["categoria", "categoria"],
    ["subcategoria", "subcategoria"],
    ["titulo_web", "tituloWeb"],
    ["descripcion_corta", "descripcionCorta"],
    ["descripcion_larga", "descripcionLarga"],
    ["precio_publico", "precioPublico"],
    ["mostrar_precio", "mostrarPrecio"],
    ["imagen_principal", "imagenPrincipal"],
    ["imagen_mobile", "imagenMobile"],
    ["galeria_1", "galeria1"],
    ["galeria_2", "galeria2"],
    ["colores", "colores"],
    ["caracteristica_1", "caracteristica1"],
    ["caracteristica_2", "caracteristica2"],
    ["caracteristica_3", "caracteristica3"],
    ["destacado", "destacado"],
    ["nuevo", "nuevo"],
    ["cta_label", "ctaLabel"],
    ["orden", "orden"],
    ["activo", "activo"],
    ["estado_contenido", "estadoContenido"],
    ["ultima_revision", "ultimaRevision"],
    ["alt_text", "altText"],
    ["foco_imagen", "focoImagen"],
  ];

  /**
   * Las 15 columnas del contrato COLORES_MODELO_WEB (hoja separada).
   * Vive aparte de MODELOS_WEB a propósito: una fila = un color de un
   * modelo. Así MODELOS_WEB no crece de forma inmanejable y el negocio
   * puede añadir variantes sin tocar la fila del modelo.
   * Ver docs/colores-modelo-web.md.
   */
  var COLUMNAS_COLOR = [
    ["id", "id"],
    ["modelo_id", "modeloId"],
    ["slug_color", "slugColor"],
    ["nombre_color", "nombreColor"],
    ["hex_color", "hexColor"],
    ["imagen_principal", "imagenPrincipal"],
    ["imagen_mobile", "imagenMobile"],
    ["galeria_1", "galeria1"],
    ["galeria_2", "galeria2"],
    ["orden", "orden"],
    ["activo", "activo"],
    ["estado_aprobacion", "estadoAprobacion"],
    ["alt_text", "altText"],
    ["foco_imagen", "focoImagen"],
    ["ultima_revision", "ultimaRevision"],
  ];

  /** Estados de aprobación de una variante de color. */
  var ESTADOS_APROBACION = ["BORRADOR", "EN_REVISION", "APROBADO"];

  /**
   * Lee una columna del registro crudo aceptando ambos estilos de clave.
   * @param {Object} bruto
   * @param {string} snake
   * @param {string} camel
   */
  function leer(bruto, snake, camel) {
    if (Object.prototype.hasOwnProperty.call(bruto, snake)) return bruto[snake];
    if (Object.prototype.hasOwnProperty.call(bruto, camel)) return bruto[camel];
    return undefined;
  }

  /** Devuelve solo las columnas del contrato, con las claves normalizadas. */
  function proyectar(bruto, columnas) {
    var cols = columnas || COLUMNAS;
    var fila = {};
    for (var i = 0; i < cols.length; i++) {
      fila[cols[i][0]] = leer(bruto, cols[i][0], cols[i][1]);
    }
    return fila;
  }

  /**
   * Normaliza la configuración global del catálogo aplicando siempre el
   * criterio más restrictivo: si el origen no dice explícitamente que sí,
   * es que no.
   */
  function normalizarConfig(bruto) {
    var c = bruto && typeof bruto === "object" ? bruto : {};
    return {
      moneda: c.moneda === "USD" ? "USD" : "PEN",
      mostrarPrecios: U.booleano(c.mostrar_precios !== undefined ? c.mostrar_precios : c.mostrarPrecios),
      mostrarDisponibilidad: U.booleano(
        c.mostrar_disponibilidad !== undefined ? c.mostrar_disponibilidad : c.mostrarDisponibilidad
      ),
      mensajeSinResultados:
        U.texto(c.mensaje_sin_resultados || c.mensajeSinResultados, 180) ||
        "No encontramos modelos con esos filtros.",
      mensajeCatalogoVacio:
        U.texto(c.mensaje_catalogo_vacio || c.mensajeCatalogoVacio, 240) ||
        "Estamos preparando la publicación del catálogo.",
    };
  }

  /** Normaliza la lista de categorías declarada por el origen. */
  function normalizarCategorias(bruto) {
    if (!Array.isArray(bruto)) return [];
    var vistas = {};
    var salida = [];
    bruto.forEach(function (c) {
      if (!c || typeof c !== "object") return;
      var slug = U.texto(c.slug, 40).toLowerCase();
      if (CATEGORIAS.indexOf(slug) === -1 || vistas[slug]) return;
      vistas[slug] = true;
      salida.push({
        slug: slug,
        titulo: U.texto(c.titulo, 60) || slug,
        descripcion: U.texto(c.descripcion, 180),
        orden: U.entero(c.orden, 999),
      });
    });
    salida.sort(function (a, b) {
      return a.orden - b.orden;
    });
    return salida;
  }

  /**
   * Convierte un registro crudo en un modelo publicable.
   * @param {Object} bruto registro tal como llega del origen
   * @param {Object} config configuración ya normalizada
   * @param {Array<string>} avisos se rellena con los motivos de descarte
   * @returns {Object|null} null si el registro no es utilizable
   */
  function normalizarModelo(bruto, config, avisos) {
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
    var fila = proyectar(bruto);

    // --- Identidad: sin estos tres campos el registro no existe ---
    var id = U.texto(fila.id, 40);
    var modelo = U.texto(fila.modelo, 120);
    var slug = U.texto(fila.slug, 80).toLowerCase();
    if (!slug && modelo) slug = U.slugificar(modelo);

    if (!id || !modelo || !U.slugValido(slug)) {
      if (avisos) avisos.push("Registro descartado por identidad incompleta (id / slug / modelo).");
      return null;
    }

    // --- Categoría: taxonomía cerrada ---
    var categoria = U.texto(fila.categoria, 40).toLowerCase();
    if (CATEGORIAS.indexOf(categoria) === -1) {
      if (avisos) avisos.push('Modelo "' + modelo + '" descartado: categoría "' + categoria + '" fuera de la taxonomía.');
      return null;
    }

    // --- Precio: triple condición. Ante cualquier duda, no se publica ---
    var importe = U.numero(fila.precio_publico);
    var mostrarPrecio = config.mostrarPrecios && U.booleano(fila.mostrar_precio) && importe !== null;

    // --- Contenido editorial: los campos vacíos quedan vacíos ---
    var caracteristicas = [];
    [fila.caracteristica_1, fila.caracteristica_2, fila.caracteristica_3].forEach(function (c) {
      var t = U.texto(c, 120);
      if (t) caracteristicas.push(t);
    });

    var galeria = [];
    [fila.galeria_1, fila.galeria_2].forEach(function (g) {
      var r = U.rutaImagen(g);
      if (r && galeria.indexOf(r) === -1) galeria.push(r);
    });

    var estado = U.texto(fila.estado_contenido, 20).toUpperCase().replace(/\s+/g, "_");
    if (ESTADOS_CONTENIDO.indexOf(estado) === -1) estado = "BORRADOR";

    return {
      id: id,
      slug: slug,
      modelo: modelo,
      linea: U.texto(fila.linea, 60),
      categoria: categoria,
      subcategoria: U.texto(fila.subcategoria, 60),

      titulo: U.texto(fila.titulo_web, 120) || modelo,
      tituloWeb: U.texto(fila.titulo_web, 120),
      descripcionCorta: U.texto(fila.descripcion_corta, 220),
      descripcionLarga: U.textoLargo(fila.descripcion_larga, 2000),

      mostrarPrecio: mostrarPrecio,
      precioPublico: mostrarPrecio ? importe : null,
      moneda: config.moneda,

      imagenPrincipal: U.rutaImagen(fila.imagen_principal),
      imagenMobile: U.rutaImagen(fila.imagen_mobile),
      galeria: galeria,
      altText: U.texto(fila.alt_text, 160),
      foco: U.foco(fila.foco_imagen),

      colores: U.lista(fila.colores, 8),
      caracteristicas: caracteristicas,

      destacado: U.booleano(fila.destacado),
      nuevo: U.booleano(fila.nuevo),
      ctaLabel: U.texto(fila.cta_label, 40),

      orden: U.entero(fila.orden, 999),
      activo: U.booleano(fila.activo),
      estadoContenido: estado,
      ultimaRevision: U.texto(fila.ultima_revision, 40),

      // Variantes visuales de color. La capa de datos las rellena desde
      // COLORES_MODELO_WEB; aquí se declara para que la forma del modelo
      // sea siempre la misma, haya colores o no.
      colors: [],
    };
  }

  /**
   * Convierte una fila de COLORES_MODELO_WEB en una variante de color
   * publicable, o la descarta.
   *
   * Decisión de contrato: una variante SIN imagen principal utilizable se
   * descarta. El propósito de esta hoja es cambiar la fotografía al elegir
   * un color; una fila sin foto no es una variante visual, y aceptarla
   * llevaría a mostrar la foto de otro color como si fuera la elegida.
   * Los nombres de color sin fotografía siguen su camino normal por la
   * columna `colores` de MODELOS_WEB, que es una lista de texto.
   *
   * @param {Object} bruto fila cruda
   * @param {boolean} preview si true, admite variantes no aprobadas
   * @param {Array<string>} avisos se rellena con los motivos de descarte
   * @returns {Object|null}
   */
  function normalizarColor(bruto, preview, avisos) {
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
    var fila = proyectar(bruto, COLUMNAS_COLOR);

    var modeloId = U.texto(fila.modelo_id, 40);
    var nombre = U.texto(fila.nombre_color, 60);
    var slug = U.texto(fila.slug_color, 60).toLowerCase();
    if (!slug && nombre) slug = U.slugificar(nombre);

    if (!modeloId || !nombre || !U.slugValido(slug)) {
      if (avisos) avisos.push("Color descartado por identidad incompleta (modelo_id / slug_color / nombre_color).");
      return null;
    }

    // Gate de publicación: en producción exige las dos condiciones.
    var activo = U.booleano(fila.activo);
    var estado = U.texto(fila.estado_aprobacion, 20).toUpperCase().replace(/\s+/g, "_");
    if (ESTADOS_APROBACION.indexOf(estado) === -1) estado = "BORRADOR";
    var aprobado = activo === true && estado === "APROBADO";
    if (!aprobado && preview !== true) return null;

    // Sin fotografía utilizable no hay variante visual.
    var desktop = U.rutaImagen(fila.imagen_principal);
    if (!desktop) {
      if (avisos) {
        avisos.push('Color "' + nombre + '" (' + modeloId + ') descartado: sin imagen_principal utilizable.');
      }
      return null;
    }

    var galeria = [];
    [fila.galeria_1, fila.galeria_2].forEach(function (g) {
      var r = U.rutaImagen(g);
      if (r && galeria.indexOf(r) === -1) galeria.push(r);
    });

    return {
      id: U.texto(fila.id, 40) || modeloId + "-" + slug,
      modeloId: modeloId,
      slug: slug,
      nombre: nombre,
      // Un hex inválido no invalida el color: la muestra cae a un relleno
      // neutro y el nombre sigue identificando la variante.
      hex: U.hexColor(fila.hex_color),
      imagenPrincipal: desktop,
      imagenMobile: U.rutaImagen(fila.imagen_mobile),
      galeria: galeria,
      altText: U.texto(fila.alt_text, 160),
      foco: U.foco(fila.foco_imagen),
      orden: U.entero(fila.orden, 999),
      activo: activo,
      estadoAprobacion: estado,
      aprobado: aprobado,
      ultimaRevision: U.texto(fila.ultima_revision, 40),
    };
  }

  /**
   * Normaliza una lista de colores y la agrupa por modelo.
   * @returns {Object} mapa modeloId → array de colores ordenado
   */
  function agruparColores(brutos, preview, avisos) {
    var mapa = {};
    if (!Array.isArray(brutos)) return mapa;

    var vistos = {};
    brutos.forEach(function (b) {
      var color = normalizarColor(b, preview, avisos);
      if (!color) return;
      var clave = color.modeloId + "::" + color.slug;
      if (vistos[clave]) {
        if (avisos) avisos.push('Color duplicado descartado: "' + color.slug + '" en ' + color.modeloId + ".");
        return;
      }
      vistos[clave] = true;
      if (!mapa[color.modeloId]) mapa[color.modeloId] = [];
      mapa[color.modeloId].push(color);
    });

    Object.keys(mapa).forEach(function (id) {
      mapa[id].sort(function (a, b) {
        if (a.orden !== b.orden) return a.orden - b.orden;
        return a.nombre.localeCompare(b.nombre, "es");
      });
    });
    return mapa;
  }

  /**
   * Valida el sobre de la respuesta y devuelve la lista de registros
   * crudos, o null si la respuesta no respeta el contrato.
   * Acepta `modelos` (contrato MODELOS_WEB) e `items` (nombre heredado).
   */
  function extraerRegistros(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;
    if (datos.ok === false) return null;
    var mayor = String(datos.version || "").split(".")[0];
    if (mayor && mayor !== VERSION) return null;
    if (Array.isArray(datos.modelos)) return datos.modelos;
    if (Array.isArray(datos.items)) return datos.items;
    return null;
  }

  /**
   * ¿Este modelo puede mostrarse en la superficie pública?
   * En producción exige activo=true. En previsualización local se
   * permiten los inactivos, marcados visualmente como borrador.
   */
  function esPublicable(modelo, preview) {
    if (!modelo) return false;
    return modelo.activo === true || preview === true;
  }

  /**
   * Extrae la lista cruda de colores del sobre de la respuesta.
   * Su ausencia es un caso normal, no un error: hoy ninguna fuente
   * publica colores todavía.
   */
  function extraerColores(datos) {
    if (!datos || typeof datos !== "object") return [];
    if (Array.isArray(datos.colores)) return datos.colores;
    if (Array.isArray(datos.colors)) return datos.colors;
    return [];
  }

  NS.schema = {
    VERSION: VERSION,
    CATEGORIAS: CATEGORIAS,
    ESTADOS_CONTENIDO: ESTADOS_CONTENIDO,
    ESTADOS_APROBACION: ESTADOS_APROBACION,
    COLUMNAS: COLUMNAS,
    COLUMNAS_COLOR: COLUMNAS_COLOR,
    proyectar: proyectar,
    normalizarConfig: normalizarConfig,
    normalizarCategorias: normalizarCategorias,
    normalizarModelo: normalizarModelo,
    normalizarColor: normalizarColor,
    agruparColores: agruparColores,
    extraerRegistros: extraerRegistros,
    extraerColores: extraerColores,
    esPublicable: esPublicable,
  };
})(window.ARENAS_CATALOGO);
