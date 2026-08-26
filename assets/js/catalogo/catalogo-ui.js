/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-ui.js
   Componentes visuales del catálogo. No sabe de dónde vienen los datos:
   recibe modelos ya normalizados por catalogo-schema.js.

   Reglas de construcción:
   · Todo el DOM se crea con createElement/textContent. Cero innerHTML.
   · Un campo vacío no se pinta: no hay huecos, ni ceros, ni "undefined".
   · Toda imagen reserva su espacio (aspect-ratio + width/height) para
     que la carga no desplace el contenido (CLS).
   · Cuando falta la fotografía se dibuja un marcador vectorial en línea:
     no se solicita ningún archivo, así que no se genera ningún 404.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  var SVG_NS = "http://www.w3.org/2000/svg";

  /** Punto de corte entre la fotografía de celular y la de escritorio. */
  var MEDIA_MOBILE = "(max-width: 767px)";

  /* ---------------- Imagen ---------------- */

  /**
   * Marcador neutro para cuando no hay fotografía aprobada todavía.
   * Es un SVG en línea, sin peticiones de red y sin icono roto.
   */
  function marcadorPendiente(modelo) {
    var caja = U.el("div", {
      class: "moto-card__fallback",
      role: "img",
      "aria-label": "Fotografía pendiente" + (modelo && modelo.modelo ? " de " + modelo.modelo : ""),
    });

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "moto-card__fallback-art");
    svg.setAttribute("viewBox", "0 0 160 100");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Horizonte y trazo de ruta: lenguaje gráfico de la marca, sin imitar una moto.
    var horizonte = document.createElementNS(SVG_NS, "path");
    horizonte.setAttribute("d", "M0 66 H160");
    horizonte.setAttribute("stroke", "rgba(151,205,255,0.18)");
    horizonte.setAttribute("stroke-width", "1");
    svg.appendChild(horizonte);

    var ruta = document.createElementNS(SVG_NS, "path");
    ruta.setAttribute("d", "M8 78 C 52 70, 108 70, 152 78");
    ruta.setAttribute("stroke", "rgba(47,140,255,0.45)");
    ruta.setAttribute("stroke-width", "1.4");
    ruta.setAttribute("fill", "none");
    svg.appendChild(ruta);

    caja.appendChild(svg);

    var marca = U.el("span", { class: "moto-card__fallback-mark" }, "ARENAS");
    caja.appendChild(marca);

    var nota = U.el("span", { class: "moto-card__fallback-nota" }, "Fotografía pendiente");
    caja.appendChild(nota);

    return caja;
  }

  /**
   * Texto alternativo. Usa alt_text si existe; si no, describe de forma
   * neutra y verificable qué se está mostrando, sin afirmar nada del
   * producto que no conste en los datos.
   */
  function altSeguro(modelo) {
    if (modelo.altText) return modelo.altText;
    return modelo.modelo + " — ARENAS MOTOCICLETAS";
  }

  /**
   * Vista de un modelo con las imágenes de una variante de color.
   * Devuelve un objeto con la forma mínima que consume media(): así el
   * cambio de color reutiliza el mismo componente de imagen, sin
   * duplicar lógica de <picture>, CLS ni marcador de foto pendiente.
   *
   * La galería del color solo sustituye a la general si ese color tiene
   * fotos propias; nunca se presentan fotos de otro color como si
   * pertenecieran al elegido.
   */
  function vistaColor(modelo, color) {
    if (!color) return modelo;
    return {
      modelo: modelo.modelo,
      titulo: modelo.titulo,
      imagenPrincipal: color.imagenPrincipal,
      imagenMobile: color.imagenMobile,
      galeria: color.galeria.length ? color.galeria : [],
      altText: color.altText || modelo.modelo + " en color " + color.nombre + " — ARENAS MOTOCICLETAS",
      foco: color.foco || modelo.foco,
    };
  }

  /**
   * Bloque de imagen responsive.
   * @param {Object} modelo
   * @param {Object} [opciones] { prioritaria, ancho, alto, clase }
   */
  function media(modelo, opciones) {
    var o = opciones || {};
    var contenedor = U.el("div", { class: o.clase || "moto-card__media" });

    if (!modelo.imagenPrincipal && !modelo.imagenMobile) {
      contenedor.appendChild(marcadorPendiente(modelo));
      return contenedor;
    }

    var principal = modelo.imagenPrincipal || modelo.imagenMobile;
    var picture = U.el("picture");

    // Con <source media> el navegador descarga UNA sola variante.
    if (modelo.imagenMobile && modelo.imagenPrincipal) {
      picture.appendChild(U.el("source", { media: MEDIA_MOBILE, srcset: modelo.imagenMobile }));
    }

    var img = U.el("img", {
      class: "moto-card__img",
      src: principal,
      alt: altSeguro(modelo),
      width: o.ancho || 1600,
      height: o.alto || 1000,
      decoding: "async",
      loading: o.prioritaria ? "eager" : "lazy",
      fetchpriority: o.prioritaria ? "high" : null,
    });
    img.style.objectPosition = modelo.foco;

    // Si el archivo no existe o falla, se sustituye por el marcador
    // neutro: nunca queda un icono roto ni un hueco.
    img.addEventListener("error", function () {
      U.vaciar(contenedor);
      contenedor.appendChild(marcadorPendiente(modelo));
    });

    picture.appendChild(img);
    contenedor.appendChild(picture);
    return contenedor;
  }

  /* ---------------- Etiquetas ---------------- */

  function etiquetas(modelo, preview) {
    if (!modelo.destacado && !modelo.nuevo && !(preview && !modelo.activo) && !(preview && modelo.imagenReferencial)) return null;
    var caja = U.el("div", { class: "moto-card__tags" });
    if (modelo.nuevo) caja.appendChild(U.el("span", { class: "moto-tag moto-tag--nuevo" }, "Nuevo"));
    if (modelo.destacado) caja.appendChild(U.el("span", { class: "moto-tag moto-tag--destacado" }, "Destacado"));
    if (preview && !modelo.activo) {
      caja.appendChild(
        U.el(
          "span",
          { class: "moto-tag moto-tag--borrador", title: "Solo visible en previsualización local" },
          "Sin publicar"
        )
      );
    }
    if (preview && modelo.imagenReferencial) {
      caja.appendChild(
        U.el(
          "span",
          { class: "moto-tag moto-tag--referencial", title: "Imagen conceptual generada para evaluar el diseño" },
          "Imagen referencial"
        )
      );
    }
    return caja;
  }

  /* ---------------- Precio ---------------- */

  /**
   * ÚNICA decisión sobre publicar un precio, compartida por la tarjeta,
   * la ficha y los relacionados. Devuelve el texto ya formateado o
   * cadena vacía; quien la llama solo tiene que preguntar «¿hay algo que
   * pintar?», sin repetir condiciones.
   *
   * El esquema ya exigió las tres condiciones al normalizar
   * (config.mostrarPrecios && mostrar_precio && importe > 0), así que
   * `mostrarPrecio` las resume. Aquí se vuelve a pasar por el formateador
   * porque es el que garantiza que nunca salga 0, NaN ni undefined.
   */
  function textoPrecio(modelo) {
    if (!modelo || !modelo.mostrarPrecio) return "";
    return U.precio(modelo.precioPublico, modelo.moneda);
  }

  /* ---------------- Colores ---------------- */

  /**
   * Punto de color. El hex es el ÚNICO dato de la hoja que toca estilo,
   * y llega ya validado contra #RGB/#RRGGBB por U.hexColor(): si no lo
   * era, viene vacío y la muestra cae a un relleno neutro en CSS.
   */
  function puntoColor(color, clase) {
    var punto = U.el("span", { class: clase || "color-dot", "aria-hidden": "true" });
    if (color.hex) punto.style.backgroundColor = color.hex;
    else punto.classList.add("color-dot--sin-hex");
    return punto;
  }

  /**
   * Indicador discreto para la tarjeta del catálogo: hasta tres puntos y
   * un contador. No es un selector — la elección real vive en la ficha,
   * y así el catálogo no se convierte en un panel de opciones.
   * @returns {HTMLElement|null} null si no hay variantes que anunciar
   */
  function indicadorColores(modelo) {
    var colores = modelo.colors || [];
    if (colores.length < 2) return null;

    var caja = U.el("div", { class: "moto-card__colores" });
    var puntos = U.el("span", { class: "moto-card__colores-puntos", "aria-hidden": "true" });
    colores.slice(0, 3).forEach(function (c) {
      puntos.appendChild(puntoColor(c, "color-dot color-dot--mini"));
    });
    caja.appendChild(puntos);

    // El texto es la información real; los puntos son decoración.
    // Así el dato no depende solo del color, que es justo lo que exige
    // no apoyar información únicamente en la percepción cromática.
    caja.appendChild(
      U.el("span", { class: "moto-card__colores-texto" }, colores.length + " colores disponibles")
    );
    return caja;
  }

  /**
   * Selector de color de la ficha.
   * Cada variante es un <button> real con su nombre accesible y su
   * estado aria-pressed, de modo que funciona con teclado sin ningún
   * manejo especial de teclas.
   *
   * @param {Object} modelo
   * @param {Object} opciones { activo, alCambiar }
   * @returns {HTMLElement|null} null si no hay nada que elegir
   */
  function selectorColores(modelo, opciones) {
    var o = opciones || {};
    var colores = modelo.colors || [];
    // Sin colores no se dibuja nada: ni caja vacía, ni guion, ni
    // "no disponible". Con uno solo tampoco hay elección que ofrecer.
    if (!colores.length) return null;

    var caja = U.el("div", { class: "modelo-colores-sel" });

    if (colores.length === 1) {
      caja.appendChild(U.el("p", { class: "modelo-colores-sel__unico-label" }, "Color disponible"));
      var unico = U.el("p", { class: "modelo-colores-sel__unico" });
      unico.appendChild(puntoColor(colores[0], "color-dot"));
      unico.appendChild(U.el("span", null, colores[0].nombre));
      caja.appendChild(unico);
      return caja;
    }

    var grupo = U.el("div", {
      class: "modelo-colores-sel__grupo",
      role: "group",
      "aria-label": "Color de " + modelo.titulo,
    });

    var titulo = U.el("p", { class: "modelo-colores-sel__label" }, "Color");
    caja.appendChild(titulo);

    // Nombre del color elegido, en texto: la información nunca depende
    // solo del color de la muestra.
    // role="status" ya implica aria-live="polite" y aria-atomic="true";
    // declararlo otra vez era redundante. Se conserva el rol, que es el
    // que da la semántica, y se retira la duplicación.
    var nombreActivo = U.el("p", {
      class: "modelo-colores-sel__nombre",
      "data-rol": "nombre-color",
      role: "status",
    });

    var botones = [];
    colores.forEach(function (color, i) {
      var seleccionado = o.activo ? color.slug === o.activo.slug : i === 0;
      var boton = U.el("button", {
        type: "button",
        class: "color-swatch" + (seleccionado ? " is-active" : ""),
        "aria-pressed": seleccionado ? "true" : "false",
        "data-color": color.slug,
        title: color.nombre,
        "aria-label": "Ver " + modelo.titulo + " en color " + color.nombre,
      });
      boton.appendChild(puntoColor(color, "color-dot color-dot--swatch"));

      // Variante sin aprobar: solo puede existir en previsualización.
      if (o.preview && !color.aprobado) {
        boton.classList.add("color-swatch--borrador");
        boton.setAttribute("title", color.nombre + " (sin publicar)");
      }

      boton.addEventListener("click", function () {
        if (boton.getAttribute("aria-pressed") === "true") return;
        botones.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        boton.classList.add("is-active");
        boton.setAttribute("aria-pressed", "true");
        nombreActivo.textContent = color.nombre;
        if (typeof o.alCambiar === "function") o.alCambiar(color, i);
      });

      botones.push(boton);
      grupo.appendChild(boton);
    });

    caja.appendChild(grupo);
    nombreActivo.textContent = (o.activo || colores[0]).nombre;
    caja.appendChild(nombreActivo);
    return caja;
  }

  /* ---------------- Tarjeta ---------------- */

  /**
   * URL de la ficha, o cadena vacía si el modelo no tiene slug.
   *
   * Sin slug no hay ficha y no se le inventa una: en previsualización
   * puede haber registros sin slug —para poder verlos y corregirlos— y
   * enlazarlos daría un `?slug=` vacío que lleva a una página de error.
   * Con cadena vacía, el ayudante `el()` no escribe el atributo `href`.
   */
  function urlModelo(modelo) {
    if (!modelo.slug) return "";
    var url = "modelo.html?slug=" + encodeURIComponent(modelo.slug);

    // La previsualización es un estado de la SESIÓN editorial, no de una
    // página suelta. Sin propagarla, quien revisa ve la tarjeta de un
    // borrador en el catálogo, la abre, y se encuentra un «Modelo no
    // encontrado»: el recorrido de revisión se corta justo donde hace
    // falta, que es mirar la ficha antes de aprobarla.
    //
    // Es seguro en producción: `previewActivo()` exige host local además
    // del parámetro, así que fuera de localhost esto no añade nada y las
    // URL públicas siguen limpias. No se propaga `debug`, cuyo panel solo
    // existe en el catálogo.
    if (NS.data && typeof NS.data.previewActivo === "function" && NS.data.previewActivo()) {
      url += "&preview=1";
    }
    return url;
  }

  /**
   * Tarjeta de modelo. Un único punto de tabulación por tarjeta: el
   * enlace del título, que se estira sobre toda la superficie con CSS.
   * @param {Object} modelo
   * @param {Object} [opciones] { indice, preview, tituloEtiqueta }
   */
  function tarjeta(modelo, opciones) {
    var o = opciones || {};
    // La distinción de destacado sale del dato, no de una lista de
    // modelos en el código: si mañana la hoja destaca otro modelo, la
    // tarjeta cambia sola.
    var card = U.el("article", {
      class: "moto-card" + (modelo.destacado ? " moto-card--destacado" : ""),
      "data-slug": modelo.slug,
    });

    card.appendChild(media(modelo, { prioritaria: o.indice < 3 }));

    var cuerpo = U.el("div", { class: "moto-card__body" });

    var meta = [NS.data.tituloCategoria(o.estado, modelo.categoria), modelo.linea]
      .filter(Boolean)
      .join(" · ");
    if (meta) cuerpo.appendChild(U.el("p", { class: "moto-card__meta" }, meta));

    // Sin slug la tarjeta se dibuja igual pero sin navegación: se ve el
    // modelo, se lee lo que le falta y no hay ningún enlace roto.
    var titulo = U.el("h3", { class: "moto-card__title" });
    var destino = urlModelo(modelo);
    if (destino) {
      titulo.appendChild(U.el("a", { class: "moto-card__link", href: destino }, modelo.titulo));
    } else {
      titulo.appendChild(U.el("span", { class: "moto-card__title-texto" }, modelo.titulo));
    }
    cuerpo.appendChild(titulo);

    var tags = etiquetas(modelo, o.preview);
    if (tags) cuerpo.appendChild(tags);

    if (modelo.descripcionCorta) {
      cuerpo.appendChild(U.el("p", { class: "moto-card__desc" }, modelo.descripcionCorta));
    }

    // Un solo dato, el que decide la compra: cilindrada y potencia. La
    // tarjeta no es la ficha — meter aqui las tres caracteristicas la
    // convertiria otra vez en una lista, que es de lo que se venia.
    if (modelo.caracteristicas && modelo.caracteristicas.length) {
      var clave = U.partirDato(modelo.caracteristicas[0]);
      if (clave.valor) {
        cuerpo.appendChild(U.el("p", { class: "moto-card__specs" }, clave.valor));
      }
    }

    var colores = indicadorColores(modelo);
    if (colores) cuerpo.appendChild(colores);

    // Distintivos de QA. NS.debug solo devuelve algo en modo depuración
    // local; en previsualización normal y en producción es null.
    if (NS.debug) {
      var marcas = NS.debug.marcasTarjeta(modelo);
      if (marcas) cuerpo.appendChild(marcas);
    }

    var pie = U.el("div", { class: "moto-card__footer" });
    var precio = textoPrecio(modelo);
    if (precio) {
      pie.appendChild(U.el("p", { class: "moto-card__price" }, precio));
    }
    pie.appendChild(
      U.el("span", { class: "moto-card__cta", "aria-hidden": "true" }, modelo.ctaLabel || "Ver modelo")
    );
    cuerpo.appendChild(pie);

    card.appendChild(cuerpo);
    return card;
  }

  /* ---------------- Estados de la rejilla ---------------- */

  function estado(clase, titulo, detalle) {
    var caja = U.el("div", { class: "catalog-state " + clase });
    caja.appendChild(U.el("p", { class: "catalog-state__title" }, titulo));
    if (detalle) caja.appendChild(U.el("p", { class: "catalog-state__text" }, detalle));
    return caja;
  }

  function estadoCargando() {
    var caja = estado("catalog-state--loading", "Cargando modelos…", "");
    caja.setAttribute("aria-hidden", "true");
    return caja;
  }

  function estadoError() {
    return estado(
      "catalog-state--error",
      "No pudimos cargar el catálogo",
      "Vuelve a intentarlo en unos minutos o escríbenos desde la página de contacto."
    );
  }

  function estadoVacio(mensaje) {
    return estado("catalog-state--empty", "Catálogo en preparación", mensaje);
  }

  function estadoSinResultados(mensaje) {
    return estado("catalog-state--none", "Sin resultados", mensaje);
  }

  /* ---------------- Texto largo ---------------- */

  /** Convierte los saltos dobles en párrafos reales, sin marcado externo. */
  function parrafos(textoLargo, clase) {
    var caja = U.el("div", { class: clase || "modelo-prosa" });
    String(textoLargo)
      .split(/\n{2,}/)
      .forEach(function (p) {
        var t = U.texto(p, 1200);
        if (t) caja.appendChild(U.el("p", null, t));
      });
    return caja;
  }

  NS.ui = {
    MEDIA_MOBILE: MEDIA_MOBILE,
    marcadorPendiente: marcadorPendiente,
    altSeguro: altSeguro,
    textoPrecio: textoPrecio,
    vistaColor: vistaColor,
    puntoColor: puntoColor,
    indicadorColores: indicadorColores,
    selectorColores: selectorColores,
    media: media,
    etiquetas: etiquetas,
    urlModelo: urlModelo,
    tarjeta: tarjeta,
    estadoCargando: estadoCargando,
    estadoError: estadoError,
    estadoVacio: estadoVacio,
    estadoSinResultados: estadoSinResultados,
    parrafos: parrafos,
  };
})(window.ARENAS_CATALOGO);
