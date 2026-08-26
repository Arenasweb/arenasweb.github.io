/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-data.js
   Capa de datos del catálogo, independiente de la interfaz.

   Orden de resolución:
     1. modoDatos === "remoto" y endpoint válido  → Apps Script
     2. fallbackLocal                             → data/catalogo-publico.local.json
     3. Estado vacío accesible                    → nunca "cargando" indefinido

   La interfaz nunca llama a fetch: pide datos aquí y recibe siempre un
   estado renderizable. Esta capa no lanza excepciones hacia arriba.

   CONFIGURACIÓN VIGENTE: el Web App v2 validado es el origen remoto y el
   archivo local permanece como fallback restrictivo. La previsualización
   editorial de localhost usa directamente el origen local porque el endpoint
   público, por diseño, nunca devuelve borradores.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;
  var S = NS.schema;

  var CONFIG = {
    modoDatos: "remoto",
    appsScriptEndpoint: "https://script.google.com/macros/s/AKfycbxLr18pKS9kiMBc3GxHlAzJDouRc7z4phlSKvO8dDsg2b52oe6p3qZ9s7JQvzynolA_/exec",
    fallbackLocal: true,
    rutaLocal: "data/catalogo-publico.local.json",
    timeoutMs: 7000,

    /**
     * Fixture de colores EXCLUSIVO de QA local. Solo se solicita cuando
     * previewActivo() es cierto, es decir: ?preview=1 Y host local a la
     * vez. En GitHub Pages jamás se pide, así que no puede llegar a
     * producción. Contiene variantes rotuladas como DEMO y no procede
     * de la hoja real. Ver docs/colores-modelo-web.md.
     */
    rutaColoresDemo: "data/catalogo-colores-demo.local.json",
    rutaImagenesDemo: "data/catalogo-imagenes-demo.local.json",
  };

  /** Estado resuelto una sola vez por carga de página (caché en memoria). */
  var cache = null;
  var promesaEnCurso = null;

  /**
   * ¿Se está pidiendo la previsualización de contenido inactivo?
   * Requiere las dos condiciones a la vez: el parámetro y un host local.
   * En GitHub Pages o cualquier dominio público devuelve false siempre.
   */
  function previewActivo() {
    return U.paramUrl("preview", 4) === "1" && U.entornoLocal();
  }

  /** Solo se acepta la forma oficial de una URL de despliegue de Apps Script. */
  function endpointValido(url) {
    return (
      typeof url === "string" &&
      /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url.trim())
    );
  }

  /**
   * fetch con límite de tiempo. Si el origen tarda o falla, aborta y
   * rechaza, de modo que el llamador pueda pasar al siguiente origen.
   */
  function pedirJson(url, timeoutMs) {
    var control = new AbortController();
    var temporizador = window.setTimeout(function () {
      control.abort();
    }, timeoutMs);

    return fetch(url, { signal: control.signal, cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var tipo = res.headers.get("content-type") || "";
        // Un 404 servido como página HTML no es un catálogo.
        if (tipo && tipo.indexOf("json") === -1 && tipo.indexOf("text/plain") === -1) {
          throw new Error("Tipo de respuesta inesperado: " + tipo);
        }
        return res.json();
      })
      .finally(function () {
        window.clearTimeout(temporizador);
      });
  }

  /**
   * Asocia las variantes de color a sus modelos por `modelo_id`.
   * Un color cuyo modelo no existe se descarta: no se crea un modelo
   * fantasma a partir de una fila de color.
   */
  function unirColores(modelos, brutosColor, preview, avisos) {
    if (!brutosColor || !brutosColor.length) return;

    var porId = {};
    modelos.forEach(function (m) {
      porId[m.id] = m;
    });

    var mapa = S.agruparColores(brutosColor, preview, avisos);
    Object.keys(mapa).forEach(function (modeloId) {
      var modelo = porId[modeloId];
      if (!modelo) {
        avisos.push('Colores descartados: el modelo "' + modeloId + '" no existe en el catálogo.');
        return;
      }
      modelo.colors = mapa[modeloId];
    });
  }

  /**
   * Añade imágenes conceptuales por categoría únicamente a borradores de la
   * previsualización local. No sustituye fotografías reales y marca cada
   * modelo para que la interfaz declare de forma visible que no es producto.
   */
  function unirImagenesDemo(modelos, imagenesPorCategoria, preview) {
    if (preview !== true || !imagenesPorCategoria) return;
    modelos.forEach(function (modelo) {
      if (modelo.imagenPrincipal || modelo.imagenMobile) return;
      var demo = imagenesPorCategoria[modelo.categoria];
      if (!demo) return;
      var principal = U.rutaImagen(demo.imagen_principal);
      var mobile = U.rutaImagen(demo.imagen_mobile);
      if (!principal) return;
      modelo.imagenPrincipal = principal;
      modelo.imagenMobile = mobile;
      modelo.altText = U.texto(demo.alt_text, 160) || "Imagen conceptual referencial";
      modelo.foco = U.foco(demo.foco_imagen);
      modelo.imagenReferencial = true;
    });
  }

  /** Convierte una respuesta cruda en el estado interno del catálogo. */
  function construirEstado(datos, origen, preview, coloresExtra, imagenesDemo) {
    var registros = S.extraerRegistros(datos);
    if (registros === null) return null;

    var config = S.normalizarConfig(datos.config);
    var avisos = [];
    var vistos = {};
    var todos = [];

    /**
     * Clave de identidad para descartar duplicados.
     *
     * Antes se usaba siempre el slug, y un slug vacío se comportaba como
     * una identidad compartida: dos borradores distintos sin slug
     * colisionaban y solo sobrevivía el primero. Justo los registros que
     * hay que ver para poder arreglarlos desaparecían de la
     * previsualización.
     *
     * Ahora se usa, en este orden:
     *   1. el slug, cuando existe — es la identidad pública y la que
     *      no puede repetirse porque define la URL;
     *   2. el id, cuando no hay slug — sigue siendo una identidad real,
     *      así que dos filas con el mismo id siguen siendo ambiguas y
     *      una se descarta;
     *   3. la posición en el origen, cuando no hay ni slug ni id — solo
     *      para no perder registros al procesarlos.
     *
     * Esta tercera clave es interna y efímera: no se guarda en el
     * modelo, no genera ninguna URL y no convierte al registro en
     * publicable. Un registro sin slug sigue siendo NO PUBLICABLE.
     */
    function claveIdentidad(modelo, indice) {
      if (modelo.slug) return "slug:" + modelo.slug;
      if (modelo.id) return "id:" + modelo.id;
      return "pos:" + indice;
    }

    registros.forEach(function (bruto, indice) {
      var modelo = S.normalizarModelo(bruto, config, avisos);
      if (!modelo) return;
      var clave = claveIdentidad(modelo, indice);
      if (vistos[clave]) {
        avisos.push('Modelo duplicado descartado: identidad "' + clave + '".');
        return;
      }
      vistos[clave] = true;
      todos.push(modelo);
    });

    todos.sort(function (a, b) {
      if (a.orden !== b.orden) return a.orden - b.orden;
      return a.modelo.localeCompare(b.modelo, "es");
    });

    // Colores del propio origen y, solo en previsualización local, los
    // del fixture de QA. Se unen sobre el conjunto completo para que un
    // color de un modelo inactivo también sea visible en preview.
    var brutosColor = S.extraerColores(datos).concat(coloresExtra || []);
    unirColores(todos, brutosColor, preview, avisos);
    unirImagenesDemo(todos, imagenesDemo, preview);

    // Filtro de publicación: en producción solo activo=true.
    var visibles = todos.filter(function (m) {
      return S.esPublicable(m, preview);
    });

    var categorias = S.normalizarCategorias(datos.categorias || datos.categories);
    if (!categorias.length) {
      categorias = S.CATEGORIAS.map(function (slug, i) {
        return { slug: slug, titulo: slug, descripcion: "", orden: i + 1 };
      });
    }

    return {
      estado: visibles.length ? "ok" : "vacio",
      origen: origen,
      preview: preview,
      config: config,
      categorias: categorias,
      modelos: visibles,
      totalRegistros: todos.length,
      avisos: avisos,
    };
  }

  /** Estado neutro utilizable cuando ningún origen respondió. */
  function estadoVacio(origen, preview, motivo) {
    return {
      estado: motivo === "error" ? "error" : "vacio",
      origen: origen,
      preview: preview,
      config: S.normalizarConfig(null),
      categorias: [],
      modelos: [],
      totalRegistros: 0,
      avisos: [],
    };
  }

  /**
   * Colores de demostración para QA. Devuelve [] salvo en preview local,
   * y también si el archivo no existe: es un recurso opcional y su
   * ausencia nunca degrada el catálogo.
   */
  function cargarColoresDemo(preview) {
    if (preview !== true) return Promise.resolve([]);
    return pedirJson(CONFIG.rutaColoresDemo, CONFIG.timeoutMs)
      .then(function (datos) {
        var lista = S.extraerColores(datos);
        if (lista.length) {
          console.warn(
            "[ARENAS] Previsualización local: se han cargado " +
              lista.length +
              " colores de DEMOSTRACIÓN desde " +
              CONFIG.rutaColoresDemo +
              ". No son datos reales y nunca se publican."
          );
        }
        return lista;
      })
      .catch(function () {
        return [];
      });
  }

  /** Imágenes conceptuales: mismo doble cerrojo local que los colores DEMO. */
  function cargarImagenesDemo(preview) {
    if (preview !== true) return Promise.resolve({});
    return pedirJson(CONFIG.rutaImagenesDemo, CONFIG.timeoutMs)
      .then(function (datos) {
        var mapa = datos && datos.imagenes_por_categoria;
        if (!mapa || typeof mapa !== "object" || Array.isArray(mapa)) return {};
        console.warn(
          "[ARENAS] Previsualización local: imágenes conceptuales de DEMOSTRACIÓN activas. " +
            "No representan modelos reales y nunca se cargan en producción."
        );
        return mapa;
      })
      .catch(function () {
        return {};
      });
  }

  function cargarLocal(preview, coloresExtra, imagenesDemo) {
    return pedirJson(CONFIG.rutaLocal, CONFIG.timeoutMs).then(function (datos) {
      var estado = construirEstado(datos, "local", preview, coloresExtra, imagenesDemo);
      if (!estado) throw new Error("El JSON local no respeta el contrato.");
      return estado;
    });
  }

  function cargarRemoto(preview, coloresExtra) {
    var base = CONFIG.appsScriptEndpoint.trim();
    var url = base + (base.indexOf("?") !== -1 ? "&" : "?") + "action=catalogo";
    return pedirJson(url, CONFIG.timeoutMs).then(function (datos) {
      var estado = construirEstado(datos, "remoto", preview, coloresExtra, null);
      if (!estado) throw new Error("La respuesta remota no respeta el contrato.");
      return estado;
    });
  }

  /**
   * Carga el catálogo. Resuelve siempre; nunca rechaza.
   * @param {boolean} [forzar] ignora la caché en memoria
   * @returns {Promise<Object>} estado del catálogo
   */
  function cargar(forzar) {
    if (cache && !forzar) return Promise.resolve(cache);
    if (promesaEnCurso && !forzar) return promesaEnCurso;

    var preview = previewActivo();
    var degradado = false;

    promesaEnCurso = Promise.all([cargarColoresDemo(preview), cargarImagenesDemo(preview)])
      .then(function (recursosDemo) {
        var coloresExtra = recursosDemo[0];
        var imagenesDemo = recursosDemo[1];
        // La previsualizacion editorial necesita los borradores locales.
        // El endpoint publico nunca los devuelve, por diseno.
        if (preview) {
          return cargarLocal(true, coloresExtra, imagenesDemo).catch(function (err) {
            console.warn("[ARENAS] Origen local no disponible:", err && err.message);
            return estadoVacio("local", true, "error");
          });
        }

        var cadena = Promise.resolve(null);

        if (CONFIG.modoDatos === "remoto" && endpointValido(CONFIG.appsScriptEndpoint)) {
          cadena = cargarRemoto(preview, coloresExtra).catch(function (err) {
            console.warn("[ARENAS] Catálogo remoto no disponible:", err && err.message);
            degradado = true;
            return null;
          });
        } else if (CONFIG.modoDatos === "remoto") {
          console.warn("[ARENAS] modoDatos = 'remoto' pero el endpoint no es válido; se usa el origen local.");
          degradado = true;
        }

        return cadena.then(function (estado) {
          if (estado) return estado;
          if (!CONFIG.fallbackLocal) return estadoVacio("", preview, "error");
          return cargarLocal(preview, coloresExtra, null).catch(function (err) {
            console.warn("[ARENAS] Origen local no disponible:", err && err.message);
            return estadoVacio("", preview, "error");
          });
        });
      })
      .then(function (estado) {
        estado.degradado = degradado;
        if (estado.avisos && estado.avisos.length) {
          console.warn("[ARENAS] Registros descartados por el contrato:\n · " + estado.avisos.join("\n · "));
        }
        cache = estado;
        promesaEnCurso = null;
        return estado;
      });

    return promesaEnCurso;
  }

  /* ---------------- Consultas sobre el estado cargado ---------------- */

  /** Modelo por slug, o null. El slug se valida antes de comparar. */
  function porSlug(estado, slug) {
    if (!estado || !U.slugValido(slug)) return null;
    for (var i = 0; i < estado.modelos.length; i++) {
      if (estado.modelos[i].slug === slug) return estado.modelos[i];
    }
    return null;
  }

  /** Destacados publicables, respetando `orden` y con un tope. */
  function destacados(estado, maximo) {
    if (!estado) return [];
    return estado.modelos
      .filter(function (m) {
        return m.destacado === true;
      })
      .slice(0, typeof maximo === "number" ? maximo : 6);
  }

  /**
   * Modelos relacionados: misma categoría primero, después misma línea.
   * Nunca incluye el modelo actual.
   */
  function relacionados(estado, modelo, maximo) {
    if (!estado || !modelo) return [];
    var tope = typeof maximo === "number" ? maximo : 3;
    // Los relacionados existen para llevar a otra ficha. Un modelo sin
    // slug no tiene ficha a la que llevar, así que no entra aquí ni
    // siquiera en previsualización: sería una tarjeta que no lleva a
    // ninguna parte en el único sitio donde su única función es llevar.
    var candidatos = estado.modelos.filter(function (m) {
      return m.slug && m.slug !== modelo.slug;
    });
    var mismaCategoria = candidatos.filter(function (m) {
      return m.categoria === modelo.categoria;
    });
    var mismaLinea = candidatos.filter(function (m) {
      return m.categoria !== modelo.categoria && m.linea && m.linea === modelo.linea;
    });
    return mismaCategoria.concat(mismaLinea).slice(0, tope);
  }

  /** Líneas presentes de verdad en los modelos visibles, ordenadas. */
  function lineas(estado) {
    if (!estado) return [];
    var vistas = {};
    var salida = [];
    estado.modelos.forEach(function (m) {
      if (m.linea && !vistas[m.linea]) {
        vistas[m.linea] = true;
        salida.push(m.linea);
      }
    });
    return salida.sort(function (a, b) {
      return a.localeCompare(b, "es");
    });
  }

  /**
   * Color inicial de un modelo: el primero según `orden`, tal como lo
   * dejó la hoja. No se elige por nombre ni por ningún criterio propio.
   */
  function colorPorDefecto(modelo) {
    if (!modelo || !modelo.colors || !modelo.colors.length) return null;
    return modelo.colors[0];
  }

  /**
   * Resuelve el color pedido por la URL (?color=azul).
   * Un valor inválido o inexistente no es un error: se ignora en
   * silencio y se cae al color por defecto.
   */
  function colorPorSlug(modelo, slug) {
    if (!modelo || !modelo.colors || !modelo.colors.length) return null;
    if (!U.slugValido(slug)) return null;
    for (var i = 0; i < modelo.colors.length; i++) {
      if (modelo.colors[i].slug === slug) return modelo.colors[i];
    }
    return null;
  }

  /** Categorías que tienen al menos un modelo visible. */
  function categoriasConModelos(estado) {
    if (!estado) return [];
    return estado.categorias.filter(function (c) {
      return estado.modelos.some(function (m) {
        return m.categoria === c.slug;
      });
    });
  }

  /** Título legible de una categoría (o el propio slug si no está declarada). */
  function tituloCategoria(estado, slug) {
    if (!estado) return slug || "";
    for (var i = 0; i < estado.categorias.length; i++) {
      if (estado.categorias[i].slug === slug) return estado.categorias[i].titulo;
    }
    return slug || "";
  }

  NS.data = {
    CONFIG: CONFIG,
    previewActivo: previewActivo,
    endpointValido: endpointValido,
    cargar: cargar,
    porSlug: porSlug,
    destacados: destacados,
    relacionados: relacionados,
    colorPorDefecto: colorPorDefecto,
    colorPorSlug: colorPorSlug,
    lineas: lineas,
    categoriasConModelos: categoriasConModelos,
    tituloCategoria: tituloCategoria,
    // Expuestos para pruebas locales; no se usan en el flujo normal.
    _construirEstado: construirEstado,
    _limpiarCache: function () {
      cache = null;
      promesaEnCurso = null;
    },
  };
})(window.ARENAS_CATALOGO);
