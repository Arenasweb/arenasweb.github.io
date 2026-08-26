/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-app.js
   Controlador de las dos superficies de rejilla:

   · catalogo.html   → #catalogo-grid  (catálogo completo con filtros)
   · index.html      → #destacados-grid (tira de modelos destacados)

   Un mismo archivo porque comparten datos, tarjeta y estados; cada
   superficie se activa solo si su contenedor existe en la página.

   FILTRADO. Cuatro criterios que se combinan con Y lógico: búsqueda de
   texto, categoría, línea y variante de color. Todas las opciones se
   generan a partir de los datos —nunca están escritas en el código—, así
   que una categoría o una línea nueva aprobada en la hoja aparece sola. Un filtro que se
   quedaría sin opciones utilizables no se muestra.

   Los criterios viven en un único objeto `filtros`, y toda la interfaz
   (chips, buscador, selects, panel móvil, URL) se sincroniza desde él.
   El orden se mantiene separado de los criterios: recomendado, nombre y,
   solo cuando hay importes realmente publicables, precio.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  /** Máximo de destacados en la portada. */
  var MAX_DESTACADOS = 4;

  /** Espera antes de filtrar mientras se escribe. */
  var RETARDO_BUSQUEDA = 200;

  /**
   * Tope del retardo escalonado de aparición. Con 22 tarjetas, escalonar
   * todas dejaría la última entrando casi un segundo después; a partir de
   * este índice todas comparten el mismo retardo.
   */
  var MAX_STAGGER = 8;

  /** La aparición escalonada solo ocurre en el primer pintado. */
  var primerPintado = true;

  /** Ancho a partir del cual los filtros se muestran desplegados. */
  var MEDIA_ESCRITORIO = "(min-width: 861px)";

  var ORDEN_RECOMENDADO = "relevancia";
  var ORDENES_BASE = [
    { valor: ORDEN_RECOMENDADO, texto: "Orden recomendado" },
    { valor: "nombre-asc", texto: "Nombre: A a Z" },
    { valor: "nombre-desc", texto: "Nombre: Z a A" },
  ];

  /**
   * EL ÚNICO ESTADO DE FILTRADO DEL CATÁLOGO.
   *
   * Lo leen y lo escriben el buscador directo, el asistente guiado, el
   * panel lateral, los chips de categoría y la URL. No hay una segunda
   * copia en ningún sitio: se accede a él por `NS.app.store`, y quien
   * necesite enterarse de un cambio se suscribe en vez de espiar el DOM
   * o de disparar eventos falsos sobre controles.
   */
  var filtros = { texto: "", categoria: "", linea: "", color: "", precio: "", orden: ORDEN_RECOMENDADO };

  /** Avisados en cada repintado. Ver `suscribir`. */
  var suscriptores = [];

  /** Estado del catálogo, una vez cargado. Lo necesita el store. */
  var estadoActual = null;

  /** Referencias de la interfaz de filtros, resueltas una sola vez. */
  var dom = {};

  function $(sel, raiz) {
    return (raiz || document).querySelector(sel);
  }

  /* ================================================================
     ESTADO DE LOS FILTROS
     ================================================================ */

  /** Claves de `filtros` que son criterios; `orden` no lo es. */
  var CRITERIOS = ["texto", "categoria", "linea", "color", "precio"];

  function hayFiltrosActivos() {
    return numeroFiltrosActivos() > 0;
  }

  function numeroFiltrosActivos() {
    return CRITERIOS.filter(function (k) { return !!filtros[k]; }).length;
  }

  /**
   * ¿Este modelo cumple TODOS los criterios activos?
   *
   * La regla vive en `catalogo-finder.js` y aquí solo se le pasa el
   * estado actual. Tener dos predicados —uno para la rejilla y otro
   * para el asistente— es exactamente la duplicación que se separa con
   * el tiempo y acaba mostrando cosas distintas en cada sitio.
   */
  function coincide(modelo) {
    return NS.finder.coincide(modelo, filtros);
  }

  function compararNombre(a, b) {
    return (a.titulo || a.modelo || "").localeCompare(b.titulo || b.modelo || "", "es", {
      sensitivity: "base",
    });
  }

  function ordenarModelos(lista) {
    var salida = lista.slice();
    if (filtros.orden === "nombre-asc") return salida.sort(compararNombre);
    if (filtros.orden === "nombre-desc") return salida.sort(function (a, b) { return compararNombre(b, a); });
    if (filtros.orden === "precio-asc" || filtros.orden === "precio-desc") {
      var sentido = filtros.orden === "precio-asc" ? 1 : -1;
      return salida.sort(function (a, b) {
        var precioA = a.mostrarPrecio && typeof a.precioPublico === "number" ? a.precioPublico : null;
        var precioB = b.mostrarPrecio && typeof b.precioPublico === "number" ? b.precioPublico : null;
        if (precioA === null && precioB === null) return compararNombre(a, b);
        if (precioA === null) return 1;
        if (precioB === null) return -1;
        return (precioA - precioB) * sentido || compararNombre(a, b);
      });
    }
    return salida;
  }

  function aplicarFiltros(estado) {
    return ordenarModelos(estado.modelos.filter(coincide));
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
    ["color", "color"],
    ["precio", "precio"],
    ["q", "texto"],
    ["orden", "orden"],
  ];

  function sincronizarUrl() {
    if (!window.history || !window.history.replaceState) return;
    try {
      // Se PARTE de lo que ya hay en la URL y solo se tocan las claves
      // propias de los filtros y el orden. Cualquier otro parámetro
      // —`preview=1`, campañas, o lo que se añada en el futuro— se
      // conserva intacto: el filtro no es dueño de la cadena de
      // consulta, solo de su parte.
      var params = new URLSearchParams(window.location.search);
      PARAMS_FILTRO.forEach(function (par) {
        var valor = filtros[par[1]];
        if (par[1] === "orden" && valor === ORDEN_RECOMENDADO) valor = "";
        if (valor) params.set(par[0], valor);
        else params.delete(par[0]);
      });
      var cadena = params.toString();
      window.history.replaceState(null, "", cadena ? "?" + cadena : window.location.pathname);
    } catch (e) {
      /* La URL es una comodidad: si falla, el filtrado sigue funcionando. */
    }
  }

  /**
   * ¿Es este valor admisible para este criterio, con los datos de hoy?
   *
   * Un mismo validador para la URL y para el store: así un valor que la
   * URL rechazaría tampoco puede entrar por el asistente, y al revés.
   */
  function criterioValido(clave, valor, estado) {
    if (!valor) return true; // vaciar siempre es válido
    if (clave === "texto") return true;
    if (clave === "categoria") {
      return NS.data.categoriasConModelos(estado).some(function (c) { return c.slug === valor; });
    }
    if (clave === "linea") return NS.data.lineas(estado).indexOf(valor) !== -1;
    if (clave === "color") {
      return coloresDisponibles(estado).some(function (c) { return c.valor === valor; });
    }
    if (clave === "precio") {
      return NS.finder.rangosPrecio(estado.modelos, estado.config)
        .some(function (t) { return t.valor === valor; });
    }
    if (clave === "orden") {
      return ordenesDisponibles(estado).some(function (o) { return o.valor === valor; });
    }
    return false;
  }

  /** Lee los filtros iniciales de la URL, validándolos contra los datos. */
  function leerFiltrosDeUrl(estado) {
    var leidos = {
      categoria: U.paramUrl("categoria", 40).toLowerCase(),
      linea: U.paramUrl("linea", 60),
      color: U.paramUrl("color", 60).toLowerCase(),
      precio: U.paramUrl("precio", 40).toLowerCase(),
      texto: U.paramUrl("q", NS.finder.MAX_CONSULTA),
      orden: U.paramUrl("orden", 30).toLowerCase(),
    };
    // Un valor desconocido no rompe nada ni deja el catálogo en blanco:
    // simplemente se ignora y ese criterio queda sin aplicar.
    Object.keys(leidos).forEach(function (clave) {
      if (leidos[clave] && criterioValido(clave, leidos[clave], estado)) {
        filtros[clave] = leidos[clave];
      }
    });
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
        var card = NS.ui.tarjeta(modelo, { indice: i, preview: estado.preview, estado: estado });
        // La aparición escalonada es SOLO del primer pintado. Al filtrar
        // la rejilla debe cambiar al instante: reanimarla en cada
        // pulsación se sentiría lento, justo lo contrario de lo buscado.
        if (primerPintado) {
          card.classList.add("is-entrando");
          card.style.setProperty("--i", Math.min(i, MAX_STAGGER));
        }
        fragmento.appendChild(card);
      });
      contenedor.appendChild(fragmento);
      primerPintado = false;
    }

    if (dom.contador) {
      dom.contador.textContent = lista.length
        ? textoContador(lista.length, estado.modelos.length)
        : "Sin resultados";
    }
    if (dom.limpiar) dom.limpiar.hidden = !hayFiltrosActivos();
    if (dom.badge) {
      var activos = numeroFiltrosActivos();
      dom.badge.hidden = activos === 0;
      dom.badge.textContent = activos || "";
    }
    actualizarChips();
    sincronizarUrl();
    notificar(estado, lista.length);
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

  function poblarSelect(select, opciones, etiquetaTodas, minimoUtil) {
    if (!select) return false;
    U.vaciar(select);
    select.appendChild(U.el("option", { value: "" }, etiquetaTodas));
    opciones.forEach(function (o) {
      select.appendChild(U.el("option", { value: o.valor }, o.texto));
    });
    var campo = select.closest(".catalog-filter");
    // Un filtro con una sola opción real no aporta nada: se oculta.
    var util = opciones.length >= (typeof minimoUtil === "number" ? minimoUtil : 2);
    if (campo) campo.hidden = !util;
    return util;
  }

  function coloresDisponibles(estado) {
    var vistos = Object.create(null);
    var salida = [];
    estado.modelos.forEach(function (modelo) {
      (modelo.colors || []).forEach(function (color) {
        if (!color.slug || vistos[color.slug]) return;
        vistos[color.slug] = true;
        salida.push({ valor: color.slug, texto: color.nombre || color.slug });
      });
    });
    return salida.sort(function (a, b) {
      return a.texto.localeCompare(b.texto, "es", { sensitivity: "base" });
    });
  }

  function ordenesDisponibles(estado) {
    var salida = ORDENES_BASE.slice();
    var hayPrecios = estado.modelos.some(function (modelo) {
      return modelo.mostrarPrecio && typeof modelo.precioPublico === "number";
    });
    if (hayPrecios) {
      salida.push({ valor: "precio-asc", texto: "Precio: menor a mayor" });
      salida.push({ valor: "precio-desc", texto: "Precio: mayor a menor" });
    }
    return salida;
  }

  function poblarOrden(estado) {
    if (!dom.orden) return;
    U.vaciar(dom.orden);
    ordenesDisponibles(estado).forEach(function (opcion) {
      dom.orden.appendChild(U.el("option", { value: opcion.valor }, opcion.texto));
    });
  }

  /**
   * Vuelca el estado a los controles nativos.
   *
   * Es la contrapartida de tener un solo estado: cuando el asistente
   * escribe una categoría, el `select` de línea y el buscador tienen que
   * enterarse. Se asigna el valor directamente — nada de disparar
   * eventos `change` falsos, que reentrarían en los escuchadores y
   * volverían a escribir el estado que acaba de cambiar.
   */
  function reflejarEnControles() {
    if (dom.busqueda && dom.busqueda.value !== filtros.texto) dom.busqueda.value = filtros.texto;
    if (dom.linea) dom.linea.value = filtros.linea;
    if (dom.color) dom.color.value = filtros.color;
    if (dom.orden) dom.orden.value = filtros.orden;
  }

  function limpiarFiltros(estado, devolverFoco) {
    CRITERIOS.forEach(function (k) { filtros[k] = ""; });
    filtros.orden = ORDEN_RECOMENDADO;
    reflejarEnControles();
    pintarRejilla(estado);
    if (devolverFoco && dom.busqueda) dom.busqueda.focus();
  }

  /* ================================================================
     STORE — la puerta por la que se toca el estado
     ================================================================ */

  /** Copia del estado. Se devuelve copia para que nadie escriba por detrás. */
  function obtenerCriterios() {
    var salida = {};
    CRITERIOS.concat(["orden"]).forEach(function (k) { salida[k] = filtros[k]; });
    return salida;
  }

  /**
   * Escribe uno o varios criterios y repinta.
   *
   * Cada valor se valida contra los datos cargados: un criterio que no
   * existe se ignora en vez de dejar el catálogo en cero resultados sin
   * explicación. Devuelve las claves que sí se aplicaron.
   */
  function aplicarCriterios(parciales) {
    if (!parciales || !estadoActual) return [];
    var aplicadas = [];
    Object.keys(parciales).forEach(function (clave) {
      if (CRITERIOS.indexOf(clave) === -1 && clave !== "orden") return;
      var valor = parciales[clave];
      valor = valor === null || valor === undefined ? "" : String(valor);
      if (clave === "texto") valor = U.texto(valor, NS.finder.MAX_CONSULTA);
      if (!criterioValido(clave, valor, estadoActual)) return;
      if (clave === "orden" && !valor) valor = ORDEN_RECOMENDADO;
      if (filtros[clave] === valor) return;
      filtros[clave] = valor;
      aplicadas.push(clave);
    });
    if (aplicadas.length) {
      reflejarEnControles();
      pintarRejilla(estadoActual);
    }
    return aplicadas;
  }

  function limpiarCriterios() {
    if (estadoActual) limpiarFiltros(estadoActual, false);
  }

  /**
   * Avisa tras cada repintado, con el estado y el número de resultados.
   * Devuelve la función para darse de baja.
   */
  function suscribir(fn) {
    if (typeof fn !== "function") return function () {};
    suscriptores.push(fn);
    return function () {
      var i = suscriptores.indexOf(fn);
      if (i !== -1) suscriptores.splice(i, 1);
    };
  }

  function notificar(estado, visibles) {
    suscriptores.forEach(function (fn) {
      try {
        fn({ criterios: obtenerCriterios(), resultados: visibles, estado: estado });
      } catch (e) {
        /* Un suscriptor roto no puede tumbar el catálogo. */
      }
    });
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
      toolbar: $("#catalogo-toolbar"),
      filtros: $("#catalogo-filtros"),
      chips: $("#catalogo-chips"),
      busqueda: $("#filtro-busqueda"),
      linea: $("#filtro-linea"),
      color: $("#filtro-color"),
      orden: $("#filtro-orden"),
      limpiar: $("#filtro-limpiar"),
      aviso: $("#catalogo-aviso"),
      avisoPreview: $("#catalogo-preview"),
      panel: $("#catalogo-panel"),
      velo: $("#catalogo-panel-velo"),
      abrir: $("#catalogo-abrir-filtros"),
      badge: $("#catalogo-filtros-activos"),
      cerrar: $("#catalogo-cerrar-filtros"),
      aplicar: $("#catalogo-aplicar-filtros"),
    };

    contenedor.appendChild(NS.ui.estadoCargando());

    NS.data.cargar().then(function (estado) {
      U.vaciar(contenedor);
      estadoActual = estado;

      if (dom.avisoPreview) dom.avisoPreview.hidden = !estado.preview;

      if (dom.aviso) {
        dom.aviso.hidden = !estado.degradado;
        if (estado.degradado) {
          dom.aviso.textContent =
            "No pudimos actualizar el catálogo en este momento. Mostramos la información disponible.";
        }
      }

      // Sin modelos que ofrecer, el buscador tampoco tiene nada que
      // buscar: se retira entero en vez de dejar un campo que no
      // encuentra nada y un botón que lleva a cero resultados.
      if (estado.estado === "error") {
        contenedor.appendChild(NS.ui.estadoError());
        if (dom.filtros) dom.filtros.hidden = true;
        if (dom.contador) dom.contador.textContent = "";
        if (dom.toolbar) dom.toolbar.hidden = true;
        if (NS.finderUi) NS.finderUi.retirar();
        return;
      }

      // Sin modelos Y en degradado no es «catálogo en preparación»: es una
      // caída del origen remoto. Decirle a un cliente que el catálogo
      // todavía no existe, cuando existe y está publicado, es mentirle: se
      // marcha convencido de que aquí no se venden motos. El estado de
      // error dice la verdad y además le ofrece una salida —escribirnos—,
      // que es lo único útil mientras el origen no responde.
      if (!estado.modelos.length && estado.degradado) {
        if (dom.aviso) dom.aviso.hidden = true; // el estado de error ya lo explica
        contenedor.appendChild(NS.ui.estadoError());
        if (dom.filtros) dom.filtros.hidden = true;
        if (dom.contador) dom.contador.textContent = "";
        if (dom.toolbar) dom.toolbar.hidden = true;
        if (NS.finderUi) NS.finderUi.retirar();
        return;
      }

      if (!estado.modelos.length) {
        contenedor.appendChild(NS.ui.estadoVacio(estado.config.mensajeCatalogoVacio));
        if (dom.filtros) dom.filtros.hidden = true;
        if (dom.contador) dom.contador.textContent = "";
        if (dom.toolbar) dom.toolbar.hidden = true;
        if (NS.finderUi) NS.finderUi.retirar();
        return;
      }

      if (dom.filtros) dom.filtros.hidden = false;
      if (dom.toolbar) dom.toolbar.hidden = false;

      // Panel editorial local. Fuera del modo depuración devuelve null.
      if (NS.debug) {
        var panelQa = NS.debug.panel(estado);
        if (panelQa && contenedor.parentNode) {
          contenedor.parentNode.insertBefore(panelQa, contenedor);
        }
      }

      construirChips(estado);
      poblarSelect(
        dom.linea,
        NS.data.lineas(estado).map(function (l) {
          return { valor: l, texto: l };
        }),
        "Todas las líneas"
      );
      poblarSelect(dom.color, coloresDisponibles(estado), "Todos los colores", 1);
      poblarOrden(estado);

      leerFiltrosDeUrl(estado);
      reflejarEnControles();

      // El buscador se monta ANTES del primer pintado para que reciba
      // ese primer aviso y pueda mostrar el resumen desde el principio.
      if (NS.finderUi) NS.finderUi.montar(estado);

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

      if (dom.color) {
        dom.color.addEventListener("change", function () {
          filtros.color = dom.color.value || "";
          pintarRejilla(estado);
        });
      }

      if (dom.orden) {
        dom.orden.addEventListener("change", function () {
          filtros.orden = dom.orden.value || ORDEN_RECOMENDADO;
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
    /**
     * La puerta de entrada al estado. Cualquier módulo que quiera
     * cambiar un criterio pasa por aquí, y quien quiera enterarse se
     * suscribe. No hay otra forma admitida.
     */
    store: {
      obtener: obtenerCriterios,
      aplicar: aplicarCriterios,
      limpiar: limpiarCriterios,
      suscribir: suscribir,
      criterioValido: function (clave, valor) {
        return estadoActual ? criterioValido(clave, valor, estadoActual) : false;
      },
    },
    aplicarFiltros: aplicarFiltros,
    coincide: coincide,
    filtros: filtros,
    CRITERIOS: CRITERIOS,
    hayFiltrosActivos: hayFiltrosActivos,
    numeroFiltrosActivos: numeroFiltrosActivos,
    ordenarModelos: ordenarModelos,
    coloresDisponibles: coloresDisponibles,
    ordenesDisponibles: ordenesDisponibles,
    MAX_DESTACADOS: MAX_DESTACADOS,
    // Expuestos para comprobaciones locales; no se usan en el flujo normal.
    _sincronizarUrl: sincronizarUrl,
    _leerFiltrosDeUrl: leerFiltrosDeUrl,
    _fijarEstadoPanel: fijarEstadoPanel,
    _estadoPanel: panel,
    _dom: function (nuevo) {
      if (nuevo) dom = nuevo;
      return dom;
    },
  };
})(window.ARENAS_CATALOGO);
