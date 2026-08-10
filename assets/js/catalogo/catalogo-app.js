/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-app.js
   Controlador de las dos superficies de rejilla:

   · catalogo.html   → #catalogo-grid  (catálogo completo con filtros)
   · index.html      → #destacados-grid (tira de modelos destacados)

   Un mismo archivo porque comparten datos, tarjeta y estados; cada
   superficie se activa solo si su contenedor existe en la página.

   FILTRADO. Tres criterios que se combinan con Y lógico: búsqueda de
   texto, categoría y línea. Todas las opciones se generan a partir de
   los datos —nunca están escritas en el código—, así que una categoría
   o una línea nueva aprobada en la hoja aparece sola. Un filtro que se
   quedaría sin opciones utilizables no se muestra.

   Los criterios viven en un único objeto `filtros`, y toda la interfaz
   (chips, buscador, selects, panel móvil, URL) se sincroniza desde él.
   Añadir un criterio futuro —precio, cilindrada— consiste en sumar una
   clave a ese objeto y una condición en coincide(), sin tocar el resto.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  /** Máximo de destacados en la portada. */
  var MAX_DESTACADOS = 4;

  /** Espera antes de filtrar mientras se escribe. */
  var RETARDO_BUSQUEDA = 200;

  /** Ancho a partir del cual los filtros se muestran desplegados. */
  var MEDIA_ESCRITORIO = "(min-width: 861px)";

  var filtros = { texto: "", categoria: "", linea: "" };

  /** Referencias de la interfaz de filtros, resueltas una sola vez. */
  var dom = {};

  function $(sel, raiz) {
    return (raiz || document).querySelector(sel);
  }

  /* ================================================================
     ESTADO DE LOS FILTROS
     ================================================================ */

  function hayFiltrosActivos() {
    return !!(filtros.texto || filtros.categoria || filtros.linea);
  }

  /** ¿Este modelo cumple TODOS los criterios activos? */
  function coincide(modelo) {
    if (filtros.categoria && modelo.categoria !== filtros.categoria) return false;
    if (filtros.linea && modelo.linea !== filtros.linea) return false;
    if (filtros.texto) {
      var busqueda = U.normalizarBusqueda(filtros.texto);
      var indice = U.normalizarBusqueda(
        [modelo.modelo, modelo.titulo, modelo.linea, modelo.subcategoria].filter(Boolean).join(" ")
      );
      if (indice.indexOf(busqueda) === -1) return false;
    }
    return true;
  }

  function aplicarFiltros(estado) {
    return estado.modelos.filter(coincide);
  }

  /**
   * Refleja los filtros en la URL para que un listado se pueda compartir
   * o recargar. Se usa replaceState: filtrar no es navegar, y llenar el
   * historial obligaría a pulsar «atrás» muchas veces para salir.
   */
  /** Parámetros de la URL que administra el sistema de filtros. */
  var PARAMS_FILTRO = [
    ["categoria", "categoria"],
    ["linea", "linea"],
    ["q", "texto"],
  ];

  function sincronizarUrl() {
    if (!window.history || !window.history.replaceState) return;
    try {
      // Se PARTE de lo que ya hay en la URL y solo se tocan las tres
      // claves propias del filtro. Cualquier otro parámetro
      // —`preview=1`, campañas, o lo que se añada en el futuro— se
      // conserva intacto: el filtro no es dueño de la cadena de
      // consulta, solo de su parte.
      var params = new URLSearchParams(window.location.search);
      PARAMS_FILTRO.forEach(function (par) {
        var valor = filtros[par[1]];
        if (valor) params.set(par[0], valor);
        else params.delete(par[0]);
      });
      var cadena = params.toString();
      window.history.replaceState(null, "", cadena ? "?" + cadena : window.location.pathname);
    } catch (e) {
      /* La URL es una comodidad: si falla, el filtrado sigue funcionando. */
    }
  }

  /** Lee los filtros iniciales de la URL, validándolos contra los datos. */
  function leerFiltrosDeUrl(estado) {
    var categoria = U.paramUrl("categoria", 40).toLowerCase();
    var linea = U.paramUrl("linea", 60);
    var texto = U.paramUrl("q", 80);

    var categoriasValidas = NS.data.categoriasConModelos(estado).map(function (c) {
      return c.slug;
    });
    if (categoriasValidas.indexOf(categoria) !== -1) filtros.categoria = categoria;
    if (NS.data.lineas(estado).indexOf(linea) !== -1) filtros.linea = linea;
    if (texto) filtros.texto = texto;
  }

  /* ================================================================
     RENDER DE LA REJILLA
     ================================================================ */

  function textoContador(n, total) {
    if (n === total) return n === 1 ? "1 modelo" : n + " modelos";
    return n === 1 ? "1 modelo de " + total : n + " modelos de " + total;
  }

  function pintarRejilla(estado) {
    var contenedor = dom.grid;
    var lista = aplicarFiltros(estado);
    U.vaciar(contenedor);

    if (!lista.length) {
      var vacio = NS.ui.estadoSinResultados(estado.config.mensajeSinResultados);
      // Salida directa desde el propio estado vacío: quien no encuentra
      // nada no debería tener que buscar dónde se limpian los filtros.
      var salida = U.el("button", { type: "button", class: "btn btn-secondary catalog-state__accion" },
        "Limpiar filtros");
      salida.addEventListener("click", function () {
        limpiarFiltros(estado, true);
      });
      vacio.appendChild(salida);
      contenedor.appendChild(vacio);
    } else {
      var fragmento = document.createDocumentFragment();
      lista.forEach(function (modelo, i) {
        fragmento.appendChild(
          NS.ui.tarjeta(modelo, { indice: i, preview: estado.preview, estado: estado })
        );
      });
      contenedor.appendChild(fragmento);
    }

    if (dom.contador) {
      dom.contador.textContent = lista.length
        ? textoContador(lista.length, estado.modelos.length)
        : "Sin resultados";
    }
    if (dom.limpiar) dom.limpiar.hidden = !hayFiltrosActivos();
    actualizarChips();
    sincronizarUrl();
  }

  /* ================================================================
     CONTROLES
     ================================================================ */

  function actualizarChips() {
    if (!dom.chips) return;
    var lista = dom.chips.querySelectorAll(".catalog-chip");
    Array.prototype.forEach.call(lista, function (chip) {
      var activo = (chip.getAttribute("data-categoria") || "") === filtros.categoria;
      chip.classList.toggle("is-active", activo);
      chip.setAttribute("aria-pressed", activo ? "true" : "false");
    });
  }

  /**
   * Chips de categoría: el filtro rápido, y el único visible siempre en
   * móvil. Solo se dibujan las categorías que tienen modelos.
   */
  function construirChips(estado) {
    if (!dom.chips) return;
    var categorias = NS.data.categoriasConModelos(estado);
    // Con una sola categoría no hay nada que elegir.
    if (categorias.length < 2) {
      dom.chips.hidden = true;
      return;
    }

    U.vaciar(dom.chips);
    var opciones = [{ slug: "", titulo: "Todas" }].concat(categorias);

    opciones.forEach(function (op) {
      var chip = U.el("button", {
        type: "button",
        class: "catalog-chip",
        "data-categoria": op.slug,
        "aria-pressed": "false",
      }, op.titulo);
      chip.addEventListener("click", function () {
        filtros.categoria = op.slug;
        pintarRejilla(estado);
      });
      dom.chips.appendChild(chip);
    });

    dom.chips.hidden = false;
    actualizarChips();
  }

  function poblarSelect(select, opciones, etiquetaTodas) {
    if (!select) return false;
    U.vaciar(select);
    select.appendChild(U.el("option", { value: "" }, etiquetaTodas));
    opciones.forEach(function (o) {
      select.appendChild(U.el("option", { value: o.valor }, o.texto));
    });
    var campo = select.closest(".catalog-filter");
    // Un filtro con una sola opción real no aporta nada: se oculta.
    var util = opciones.length > 1;
    if (campo) campo.hidden = !util;
    return util;
  }

  function limpiarFiltros(estado, devolverFoco) {
    filtros.texto = "";
    filtros.categoria = "";
    filtros.linea = "";
    if (dom.busqueda) dom.busqueda.value = "";
    if (dom.linea) dom.linea.value = "";
    pintarRejilla(estado);
    if (devolverFoco && dom.busqueda) dom.busqueda.focus();
  }

  /* ================================================================
     PANEL DE FILTROS EN MÓVIL
     El panel solo existe como tal por debajo del punto de corte; en
     escritorio los mismos controles están siempre desplegados y este
     código no interviene.
     ================================================================ */

  var panel = { abierto: false, origenFoco: null };

  function esEscritorio() {
    try {
      return window.matchMedia && window.matchMedia(MEDIA_ESCRITORIO).matches;
    } catch (e) {
      return false;
    }
  }

  /**
   * ÚNICO punto donde se escribe el estado del cajón. Panel, velo,
   * aria-expanded, bloqueo de desplazamiento y clase del body se mueven
   * siempre juntos: así ninguno puede quedar desincronizado con otro,
   * que es exactamente el fallo que tenía la versión anterior.
   *
   * El panel usa una clase y no `hidden` porque en escritorio es
   * contenido visible; el velo sí usa `hidden`, porque solo existe
   * mientras el cajón está abierto.
   */
  function fijarEstadoPanel(abierto) {
    panel.abierto = abierto;
    if (dom.panel) dom.panel.classList.toggle("is-abierto", abierto);
    if (dom.velo) dom.velo.hidden = !abierto;
    if (dom.abrir) dom.abrir.setAttribute("aria-expanded", abierto ? "true" : "false");
    document.body.classList.toggle("has-panel-abierto", abierto);
  }

  function abrirPanel() {
    if (!dom.panel || panel.abierto || esEscritorio()) return;
    panel.origenFoco = document.activeElement;
    fijarEstadoPanel(true);
    // El foco entra en el panel para que el teclado no siga navegando
    // por detrás del contenido cubierto.
    if (dom.busqueda) dom.busqueda.focus();
  }

  function cerrarPanel(devolverFoco) {
    if (!dom.panel || !panel.abierto) return;
    fijarEstadoPanel(false);
    if (devolverFoco !== false && panel.origenFoco && panel.origenFoco.focus) {
      panel.origenFoco.focus();
    }
    panel.origenFoco = null;
  }

  /** Mantiene el tabulador dentro del panel mientras está abierto. */
  function atraparFoco(e) {
    if (!panel.abierto || e.key !== "Tab" || !dom.panel) return;
    var focoables = dom.panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    var visibles = Array.prototype.filter.call(focoables, function (el) {
      return !el.hidden && el.offsetParent !== null && !el.disabled;
    });
    if (!visibles.length) return;
    var primero = visibles[0];
    var ultimo = visibles[visibles.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  function conectarPanel(estado) {
    if (!dom.panel) return;

    if (dom.abrir) dom.abrir.addEventListener("click", abrirPanel);
    if (dom.cerrar) dom.cerrar.addEventListener("click", function () { cerrarPanel(true); });
    if (dom.aplicar) {
      dom.aplicar.addEventListener("click", function () {
        // El filtrado ya es inmediato: «Aplicar» solo cierra el panel.
        cerrarPanel(true);
      });
    }
    if (dom.velo) dom.velo.addEventListener("click", function () { cerrarPanel(true); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.abierto) {
        e.preventDefault();
        cerrarPanel(true);
      } else {
        atraparFoco(e);
      }
    });

    // Al pasar a escritorio el panel deja de tener sentido: se cierra
    // sin robar el foco, porque los controles siguen visibles.
    try {
      var mq = window.matchMedia(MEDIA_ESCRITORIO);
      var alCambiar = function (ev) {
        if (ev.matches) cerrarPanel(false);
      };
      if (mq.addEventListener) mq.addEventListener("change", alCambiar);
      else if (mq.addListener) mq.addListener(alCambiar);
    } catch (e) {
      /* Sin matchMedia el panel sigue funcionando por botón y Escape. */
    }
  }

  /* ================================================================
     CATÁLOGO COMPLETO — catalogo.html
     ================================================================ */

  function iniciarCatalogo(contenedor) {
    dom = {
      grid: contenedor,
      contador: $("#catalogo-contador"),
      filtros: $("#catalogo-filtros"),
      chips: $("#catalogo-chips"),
      busqueda: $("#filtro-busqueda"),
      linea: $("#filtro-linea"),
      limpiar: $("#filtro-limpiar"),
      aviso: $("#catalogo-aviso"),
      avisoPreview: $("#catalogo-preview"),
      panel: $("#catalogo-panel"),
      velo: $("#catalogo-panel-velo"),
      abrir: $("#catalogo-abrir-filtros"),
      cerrar: $("#catalogo-cerrar-filtros"),
      aplicar: $("#catalogo-aplicar-filtros"),
    };

    contenedor.appendChild(NS.ui.estadoCargando());

    NS.data.cargar().then(function (estado) {
      U.vaciar(contenedor);

      if (dom.avisoPreview) dom.avisoPreview.hidden = !estado.preview;

      if (dom.aviso) {
        dom.aviso.hidden = !estado.degradado;
        if (estado.degradado) {
          dom.aviso.textContent =
            "No pudimos actualizar el catálogo en este momento. Mostramos la información disponible.";
        }
      }

      if (estado.estado === "error") {
        contenedor.appendChild(NS.ui.estadoError());
        if (dom.filtros) dom.filtros.hidden = true;
        if (dom.contador) dom.contador.textContent = "";
        return;
      }

      if (!estado.modelos.length) {
        contenedor.appendChild(NS.ui.estadoVacio(estado.config.mensajeCatalogoVacio));
        if (dom.filtros) dom.filtros.hidden = true;
        if (dom.contador) dom.contador.textContent = "";
        return;
      }

      if (dom.filtros) dom.filtros.hidden = false;

      construirChips(estado);
      poblarSelect(
        dom.linea,
        NS.data.lineas(estado).map(function (l) {
          return { valor: l, texto: l };
        }),
        "Todas las líneas"
      );

      leerFiltrosDeUrl(estado);
      if (dom.busqueda) dom.busqueda.value = filtros.texto;
      if (dom.linea) dom.linea.value = filtros.linea;

      pintarRejilla(estado);

      // --- Escucha de controles: un listener por control ---
      if (dom.busqueda) {
        dom.busqueda.addEventListener(
          "input",
          U.debounce(function () {
            filtros.texto = dom.busqueda.value || "";
            pintarRejilla(estado);
          }, RETARDO_BUSQUEDA)
        );
        // Enter no debe recargar: el filtrado ya es inmediato.
        dom.busqueda.addEventListener("keydown", function (e) {
          if (e.key === "Enter") e.preventDefault();
        });
      }

      if (dom.linea) {
        dom.linea.addEventListener("change", function () {
          filtros.linea = dom.linea.value || "";
          pintarRejilla(estado);
        });
      }

      if (dom.limpiar) {
        dom.limpiar.addEventListener("click", function () {
          limpiarFiltros(estado, true);
        });
      }

      conectarPanel(estado);
    });
  }

  /* ================================================================
     DESTACADOS — index.html
     La portada NO es un catálogo: muestra como mucho MAX_DESTACADOS
     modelos activos y destacados, y deriva el resto a catalogo.html.
     ================================================================ */

  function iniciarDestacados(contenedor) {
    var seccion = contenedor.closest("section");

    NS.data.cargar().then(function (estado) {
      var lista = NS.data.destacados(estado, MAX_DESTACADOS).filter(function (m) {
        // En portada solo se publica lo aprobado, aunque haya preview.
        return m.activo === true;
      });

      // Sin destacados publicables, la sección entera desaparece:
      // preferimos que no exista a que quede un hueco vacío.
      if (!lista.length) {
        if (seccion) seccion.hidden = true;
        return;
      }

      if (seccion) seccion.hidden = false;
      U.vaciar(contenedor);

      var fragmento = document.createDocumentFragment();
      lista.forEach(function (modelo, i) {
        fragmento.appendChild(
          NS.ui.tarjeta(modelo, { indice: i, preview: false, estado: estado })
        );
      });
      contenedor.appendChild(fragmento);
    });
  }

  /* ================================================================
     ARRANQUE
     ================================================================ */

  function arrancar() {
    var rejillaCatalogo = document.getElementById("catalogo-grid");
    var rejillaDestacados = document.getElementById("destacados-grid");

    if (rejillaCatalogo) iniciarCatalogo(rejillaCatalogo);
    if (rejillaDestacados) iniciarDestacados(rejillaDestacados);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }

  NS.app = {
    aplicarFiltros: aplicarFiltros,
    coincide: coincide,
    filtros: filtros,
    hayFiltrosActivos: hayFiltrosActivos,
    MAX_DESTACADOS: MAX_DESTACADOS,
    // Expuestos para comprobaciones locales; no se usan en el flujo normal.
    _sincronizarUrl: sincronizarUrl,
    _fijarEstadoPanel: fijarEstadoPanel,
    _estadoPanel: panel,
    _dom: function (nuevo) {
      if (nuevo) dom = nuevo;
      return dom;
    },
  };
})(window.ARENAS_CATALOGO);
