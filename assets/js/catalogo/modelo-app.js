/* ================================================================
   ARENAS MOTOCICLETAS — modelo-app.js
   Controlador de la ficha individual: modelo.html?slug=pulsar-180-neon

   El slug se valida antes de usarse (formato cerrado a-z 0-9 y guiones)
   y solo se acepta si corresponde a un modelo realmente publicable. Un
   slug inexistente o manipulado no rompe la página: muestra un mensaje
   controlado y una salida hacia el catálogo.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  var MAX_RELACIONADOS = 3;

  function $(sel) {
    return document.querySelector(sel);
  }

  /* ---------------- Cabecera del documento ---------------- */

  /**
   * Ajusta title, description y canonical a la ficha abierta.
   * Solo se escriben valores ya saneados.
   */
  function actualizarCabecera(modelo) {
    document.title = modelo.titulo + " — ARENAS MOTOCICLETAS";

    var descripcion = modelo.descripcionCorta
      ? modelo.descripcionCorta
      : modelo.titulo + " en ARENAS MOTOCICLETAS, Cusco.";

    [
      ['meta[name="description"]', "content"],
      ['meta[property="og:description"]', "content"],
      ['meta[name="twitter:description"]', "content"],
    ].forEach(function (par) {
      var nodo = $(par[0]);
      if (nodo) nodo.setAttribute(par[1], descripcion);
    });

    [
      ['meta[property="og:title"]', "content"],
      ['meta[name="twitter:title"]', "content"],
    ].forEach(function (par) {
      var nodo = $(par[0]);
      if (nodo) nodo.setAttribute(par[1], document.title);
    });

    var url = "https://arenasweb.github.io/modelo.html?slug=" + encodeURIComponent(modelo.slug);
    var canonical = $('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);
    var ogUrl = $('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", url);
  }

  /**
   * Datos estructurados. Se publica ÚNICAMENTE la miga de pan.
   * No se emite Product: exigiría precio y disponibilidad verificados,
   * y publicar un Product incompleto es una afirmación comercial que
   * este proyecto no puede sostener todavía.
   */
  function publicarJsonLd(estado, modelo) {
    var nodo = document.getElementById("modelo-jsonld");
    if (!nodo) return;

    var base = "https://arenasweb.github.io/";
    var datos = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: base },
        { "@type": "ListItem", position: 2, name: "Catálogo", item: base + "catalogo.html" },
        {
          "@type": "ListItem",
          position: 3,
          name: modelo.titulo,
          item: base + "modelo.html?slug=" + encodeURIComponent(modelo.slug),
        },
      ],
    };
    nodo.textContent = JSON.stringify(datos);
  }

  /* ---------------- Miga de pan ---------------- */

  function pintarBreadcrumb(estado, modelo) {
    var contenedor = $("#modelo-breadcrumb-lista");
    if (!contenedor) return;
    U.vaciar(contenedor);

    var pasos = [
      { texto: "Inicio", href: "index.html" },
      { texto: "Catálogo", href: "catalogo.html" },
    ];

    var tituloCat = NS.data.tituloCategoria(estado, modelo.categoria);
    if (tituloCat) {
      pasos.push({ texto: tituloCat, href: "catalogo.html#catalogo-grid" });
    }
    pasos.push({ texto: modelo.titulo, href: "" });

    pasos.forEach(function (paso, i) {
      var li = U.el("li", { class: "breadcrumb__item" });
      if (paso.href && i < pasos.length - 1) {
        li.appendChild(U.el("a", { href: paso.href }, paso.texto));
      } else {
        li.appendChild(U.el("span", { "aria-current": "page" }, paso.texto));
      }
      contenedor.appendChild(li);
    });
  }

  /* ---------------- Galería ---------------- */

  /**
   * Galería accesible: la imagen grande se cambia con botones reales.
   * Funciona con teclado sin ningún manejo especial de teclas porque
   * cada miniatura es un <button>.
   *
   * `vista` es el modelo tal cual, o el modelo con las imágenes de la
   * variante de color elegida (NS.ui.vistaColor). La galería se
   * reconstruye por completo al cambiar de color, de modo que nunca
   * quedan mezcladas miniaturas de dos colores distintos.
   */
  function pintarGaleria(modelo, vista) {
    var contenedor = $("#modelo-galeria");
    if (!contenedor) return;
    var fuente = vista || modelo;
    U.vaciar(contenedor);

    var principal = U.el("div", { class: "modelo-galeria__principal" });
    principal.appendChild(
      NS.ui.media(fuente, { prioritaria: true, clase: "moto-card__media modelo-galeria__marco" })
    );
    contenedor.appendChild(principal);

    // Solo hay galería si existe fotografía real además de la portada.
    if (!fuente.imagenPrincipal && !fuente.imagenMobile) return;
    if (!fuente.galeria.length) return;

    var vistas = [
      {
        principal: fuente.imagenPrincipal,
        mobile: fuente.imagenMobile,
        etiqueta: "Vista principal",
      },
    ].concat(
      fuente.galeria.map(function (src, i) {
        return { principal: src, mobile: "", etiqueta: "Vista " + (i + 2) };
      })
    );

    var lista = U.el("ul", { class: "modelo-galeria__miniaturas" });

    vistas.forEach(function (v, i) {
      var li = U.el("li");
      var boton = U.el("button", {
        type: "button",
        class: "modelo-galeria__miniatura" + (i === 0 ? " is-active" : ""),
        "aria-pressed": i === 0 ? "true" : "false",
        "aria-label": v.etiqueta + " de " + modelo.titulo,
      });

      var mini = U.el("img", {
        src: v.principal || v.mobile,
        alt: "",
        width: 160,
        height: 100,
        loading: "lazy",
        decoding: "async",
      });
      mini.addEventListener("error", function () {
        li.hidden = true;
      });
      boton.appendChild(mini);

      boton.addEventListener("click", function () {
        U.vaciar(principal);
        principal.appendChild(
          NS.ui.media(
            {
              modelo: modelo.modelo,
              titulo: modelo.titulo,
              imagenPrincipal: v.principal,
              imagenMobile: v.mobile,
              altText: fuente.altText,
              foco: fuente.foco,
            },
            { prioritaria: true, clase: "moto-card__media modelo-galeria__marco" }
          )
        );
        lista.querySelectorAll(".modelo-galeria__miniatura").forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        boton.classList.add("is-active");
        boton.setAttribute("aria-pressed", "true");
      });

      li.appendChild(boton);
      lista.appendChild(li);
    });

    contenedor.appendChild(lista);
  }

  /* ---------------- Colores ---------------- */

  /**
   * Precarga la portada de una variante para que el siguiente cambio de
   * color sea inmediato. Solo la imagen principal: cargar de golpe todas
   * las galerías de todos los colores penalizaría la carga inicial sin
   * que el usuario lo haya pedido.
   */
  var precargadas = {};
  function precargar(color) {
    if (!color || !color.imagenPrincipal) return;
    if (precargadas[color.imagenPrincipal]) return;
    precargadas[color.imagenPrincipal] = true;
    var img = new Image();
    img.decoding = "async";
    img.src = color.imagenPrincipal;
  }

  /**
   * Cambio de color: sustituye la fotografía y la galería sin recargar.
   * La transición es una atenuación breve sobre opacity —nada de
   * movimiento teatral— y se omite por completo si el sistema pide
   * reducir el movimiento.
   */
  function aplicarColor(modelo, color, colores, indice) {
    var galeria = $("#modelo-galeria");
    var vista = NS.ui.vistaColor(modelo, color);

    var repintar = function () {
      pintarGaleria(modelo, vista);
      if (galeria) galeria.classList.remove("is-cambiando");
    };

    if (galeria && !U.movimientoReducido()) {
      galeria.classList.add("is-cambiando");
      window.setTimeout(repintar, 160);
    } else {
      repintar();
    }

    // Se precarga la variante siguiente, no todas.
    if (colores && colores.length > 1) {
      precargar(colores[(indice + 1) % colores.length]);
    }
  }

  function pintarColores(estado, modelo) {
    var contenedor = $("#modelo-colores");
    if (!contenedor) return null;
    U.vaciar(contenedor);

    var colores = modelo.colors || [];
    if (!colores.length) {
      contenedor.hidden = true;
      return null;
    }

    // Color inicial: el pedido por la URL si es válido; si no, el primero.
    var pedido = NS.data.colorPorSlug(modelo, U.paramUrl("color", 60).toLowerCase());
    var inicial = pedido || NS.data.colorPorDefecto(modelo);

    var selector = NS.ui.selectorColores(modelo, {
      activo: inicial,
      preview: estado.preview,
      alCambiar: function (color, indice) {
        aplicarColor(modelo, color, colores, indice);
      },
    });

    if (!selector) {
      contenedor.hidden = true;
      return null;
    }

    contenedor.appendChild(selector);
    contenedor.hidden = false;

    // Con dos o más variantes se precarga la siguiente desde el arranque.
    if (colores.length > 1) {
      var i = colores.indexOf(inicial);
      precargar(colores[(i + 1) % colores.length]);
    }
    return inicial;
  }

  /* ---------------- Ficha ---------------- */

  function pintarFicha(estado, modelo) {
    var meta = [NS.data.tituloCategoria(estado, modelo.categoria), modelo.linea]
      .filter(Boolean)
      .join(" · ");
    var nodoMeta = $("#modelo-meta");
    if (nodoMeta) {
      nodoMeta.textContent = meta;
      nodoMeta.hidden = !meta;
    }

    var titulo = $("#modelo-titulo");
    if (titulo) titulo.textContent = modelo.titulo;

    var etiquetas = $("#modelo-etiquetas");
    if (etiquetas) {
      U.vaciar(etiquetas);
      var tags = NS.ui.etiquetas(modelo, estado.preview);
      if (tags) etiquetas.appendChild(tags);
      etiquetas.hidden = !tags;
    }

    var corta = $("#modelo-desc-corta");
    if (corta) {
      corta.textContent = modelo.descripcionCorta;
      corta.hidden = !modelo.descripcionCorta;
    }

    var precio = $("#modelo-precio");
    if (precio) {
      var textoPrecio = modelo.mostrarPrecio ? U.precio(modelo.precioPublico, modelo.moneda) : "";
      precio.textContent = textoPrecio;
      precio.hidden = !textoPrecio;
    }

    // El selector se pinta antes que la galería para poder arrancar ya
    // con las imágenes del color inicial (el de la URL, si lo hubiera).
    var colorInicial = pintarColores(estado, modelo);
    pintarGaleria(modelo, colorInicial ? NS.ui.vistaColor(modelo, colorInicial) : null);

    // --- Cuerpo: descripción larga, beneficios y colores ---
    var cuerpo = $("#modelo-cuerpo");
    if (cuerpo) {
      U.vaciar(cuerpo);

      if (modelo.descripcionLarga) {
        var bloqueTexto = U.el("div", { class: "modelo-bloque" });
        bloqueTexto.appendChild(U.el("h2", { class: "modelo-bloque__titulo" }, "Sobre este modelo"));
        bloqueTexto.appendChild(NS.ui.parrafos(modelo.descripcionLarga, "modelo-prosa"));
        cuerpo.appendChild(bloqueTexto);
      }

      if (modelo.caracteristicas.length) {
        var bloqueCar = U.el("div", { class: "modelo-bloque" });
        bloqueCar.appendChild(U.el("h2", { class: "modelo-bloque__titulo" }, "Lo que destaca"));
        var ul = U.el("ul", { class: "modelo-beneficios" });
        modelo.caracteristicas.forEach(function (c) {
          ul.appendChild(U.el("li", null, c));
        });
        bloqueCar.appendChild(ul);
        cuerpo.appendChild(bloqueCar);
      }

      // La lista de colores en texto solo se muestra si NO hay variantes
      // visuales: con selector arriba, repetir los nombres abajo sería
      // decir dos veces lo mismo.
      if (modelo.colores.length && !(modelo.colors && modelo.colors.length)) {
        var bloqueCol = U.el("div", { class: "modelo-bloque" });
        bloqueCol.appendChild(U.el("h2", { class: "modelo-bloque__titulo" }, "Colores"));
        var ulc = U.el("ul", { class: "modelo-colores" });
        modelo.colores.forEach(function (c) {
          ulc.appendChild(U.el("li", { class: "modelo-color" }, c));
        });
        bloqueCol.appendChild(ulc);
        cuerpo.appendChild(bloqueCol);
      }

      cuerpo.hidden = !cuerpo.childNodes.length;
    }

    // --- Llamada a la acción ---
    var cta = $("#modelo-cta");
    if (cta) {
      U.vaciar(cta);
      var enlace = U.el(
        "a",
        { class: "btn btn-primary btn-hero", href: "index.html#contacto" },
        modelo.ctaLabel || "Consultar por este modelo"
      );
      cta.appendChild(enlace);
      cta.appendChild(
        U.el(
          "p",
          { class: "modelo-cta__nota" },
          "Te responderemos desde la página de contacto. Ningún dato se envía desde esta ficha."
        )
      );
    }

    pintarBreadcrumb(estado, modelo);
    actualizarCabecera(modelo);
    publicarJsonLd(estado, modelo);
  }

  /* ---------------- Relacionados ---------------- */

  function pintarRelacionados(estado, modelo) {
    var seccion = $("#modelo-relacionados");
    var rejilla = $("#modelo-relacionados-grid");
    if (!seccion || !rejilla) return;

    var lista = NS.data.relacionados(estado, modelo, MAX_RELACIONADOS);
    if (!lista.length) {
      seccion.hidden = true;
      return;
    }

    U.vaciar(rejilla);
    var fragmento = document.createDocumentFragment();
    lista.forEach(function (m, i) {
      fragmento.appendChild(NS.ui.tarjeta(m, { indice: i + 3, preview: estado.preview, estado: estado }));
    });
    rejilla.appendChild(fragmento);
    seccion.hidden = false;
  }

  /* ---------------- Estados de página ---------------- */

  function mostrarError(titulo, detalle) {
    var ficha = $("#modelo-ficha");
    var error = $("#modelo-error");
    var cargando = $("#modelo-cargando");
    var relacionados = $("#modelo-relacionados");

    if (cargando) cargando.hidden = true;
    if (ficha) ficha.hidden = true;
    if (relacionados) relacionados.hidden = true;

    var h1 = $("#modelo-titulo-error");
    if (h1) h1.textContent = titulo;
    var texto = $("#modelo-error-texto");
    if (texto) texto.textContent = detalle;
    if (error) error.hidden = false;

    document.title = titulo + " — ARENAS MOTOCICLETAS";
  }

  /* ---------------- Arranque ---------------- */

  function arrancar() {
    var ficha = $("#modelo-ficha");
    if (!ficha) return;

    var slug = U.paramUrl("slug", 80).toLowerCase();

    if (!U.slugValido(slug)) {
      mostrarError(
        "Modelo no encontrado",
        "La dirección no corresponde a ningún modelo del catálogo. Vuelve al catálogo para ver todos los modelos disponibles."
      );
      return;
    }

    NS.data.cargar().then(function (estado) {
      var cargando = $("#modelo-cargando");
      if (cargando) cargando.hidden = true;

      if (estado.estado === "error") {
        mostrarError(
          "No pudimos cargar la ficha",
          "Hubo un problema al obtener la información del catálogo. Vuelve a intentarlo en unos minutos."
        );
        return;
      }

      var modelo = NS.data.porSlug(estado, slug);
      if (!modelo) {
        mostrarError(
          "Modelo no encontrado",
          "Este modelo no está publicado en el catálogo. Puede que aún estemos preparando su ficha."
        );
        return;
      }

      var error = $("#modelo-error");
      if (error) error.hidden = true;

      pintarFicha(estado, modelo);
      ficha.hidden = false;
      pintarRelacionados(estado, modelo);

      var avisoPreview = $("#modelo-preview");
      if (avisoPreview) avisoPreview.hidden = !(estado.preview && !modelo.activo);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }

  NS.modelo = { MAX_RELACIONADOS: MAX_RELACIONADOS };
})(window.ARENAS_CATALOGO);
