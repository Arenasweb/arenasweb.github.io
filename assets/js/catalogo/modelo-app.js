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
   *
   * El registro de rutas ya pedidas se acota: solo evita repetir la
   * petición de las últimas variantes vistas. No es una caché —de eso ya
   * se encarga el navegador—, únicamente un anti-duplicado inmediato.
   */
  var MAX_PRECARGADAS = 12;
  var precargadas = [];
  function precargar(color) {
    if (!color || !color.imagenPrincipal) return;
    if (precargadas.indexOf(color.imagenPrincipal) !== -1) return;
    precargadas.push(color.imagenPrincipal);
    if (precargadas.length > MAX_PRECARGADAS) precargadas.shift();
    var img = new Image();
    img.decoding = "async";
    img.src = color.imagenPrincipal;
  }

  /**
   * Temporizador de la transición de color. Se guarda para poder
   * cancelarlo: si alguien pulsa Rojo → Negro → Azul en menos de lo que
   * dura la atenuación, solo debe aplicarse Azul. Sin esta cancelación
   * los repintados pendientes se encadenaban y la fotografía llegaba a
   * mostrar un color distinto del que marcaba la muestra activa (M-3).
   */
  var cambioPendiente = null;

  function cancelarCambioPendiente() {
    if (cambioPendiente !== null) {
      window.clearTimeout(cambioPendiente);
      cambioPendiente = null;
    }
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

    // Cualquier cambio en vuelo queda anulado: manda siempre el último.
    cancelarCambioPendiente();

    var repintar = function () {
      cambioPendiente = null;
      pintarGaleria(modelo, vista);
      if (galeria) galeria.classList.remove("is-cambiando");
    };

    if (galeria && !U.movimientoReducido()) {
      galeria.classList.add("is-cambiando");
      cambioPendiente = window.setTimeout(repintar, 160);
    } else {
      repintar();
    }

    // Se precarga la variante siguiente, no todas.
    if (colores && colores.length > 1) {
      precargar(colores[(indice + 1) % colores.length]);
    }
  }

  /**
   * Refleja el color elegido en la URL para que la ficha se pueda
   * compartir o recargar en esa variante.
   *
   * · replaceState, no pushState: elegir un color no es navegar, y
   *   llenar el historial obligaría a pulsar «atrás» una vez por color.
   * · Se parte de los parámetros existentes: `preview`, y cualquier otro
   *   que llegue, se conservan intactos.
   * · El color por defecto RETIRA el parámetro en lugar de escribirlo.
   *   Así la URL canónica de la ficha es la corta, y solo aparece
   *   `?color=` cuando el usuario ha elegido algo distinto de lo que
   *   vería por defecto.
   *
   * El `canonical` del documento NO cambia: sigue apuntando a la ficha
   * del modelo. Un color es una variante visual, no una página nueva.
   */
  function sincronizarUrlColor(modelo, color) {
    if (!window.history || !window.history.replaceState) return;
    try {
      var params = new URLSearchParams(window.location.search);
      var porDefecto = NS.data.colorPorDefecto(modelo);
      if (color && porDefecto && color.slug !== porDefecto.slug) {
        params.set("color", color.slug);
      } else {
        params.delete("color");
      }
      var cadena = params.toString();
      window.history.replaceState(null, "", cadena ? "?" + cadena : window.location.pathname);
    } catch (e) {
      /* La URL es una comodidad: si falla, la ficha sigue funcionando. */
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
        sincronizarUrlColor(modelo, color);
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

  /* ---------------- Datos rápidos ---------------- */

  /**
   * Convierte «Motor FI: 249.1 cc · 24.2 HP» en etiqueta y valor.
   *
   * Las características llegan de la hoja como una sola cadena. Mostrarlas
   * en crudo, una debajo de otra, es lo que hacía que la ficha se leyera
   * como una lista de la compra. Partidas en dos, se pueden maquetar como
   * dato: rótulo pequeño arriba, cifra grande abajo.
   *
   * Sin dos puntos NO se inventa un rótulo: se muestra el texto entero
   * como valor suelto. Poner «Dato:» delante sería relleno.
   */
  function partirDato(texto) {
    var t = String(texto == null ? "" : texto).trim();
    var i = t.indexOf(":");
    if (i === -1) return { etiqueta: "", valor: t };
    return { etiqueta: t.slice(0, i).trim(), valor: t.slice(i + 1).trim() };
  }

  /**
   * Rejilla de datos, junto al título y no al final de la página.
   * Quien mira una moto quiere cilindrada y potencia antes que prosa.
   */
  function pintarDatos(modelo) {
    var caja = $("#modelo-datos");
    if (!caja) return;
    U.vaciar(caja);

    var lista = modelo.caracteristicas || [];
    if (!lista.length) { caja.hidden = true; return; }

    var rejilla = U.el("ul", { class: "modelo-datos__rejilla" });
    lista.forEach(function (c) {
      var d = partirDato(c);
      if (!d.valor) return;
      var li = U.el("li", { class: "modelo-dato" + (d.etiqueta ? "" : " modelo-dato--suelto") });
      if (d.etiqueta) li.appendChild(U.el("span", { class: "modelo-dato__etiqueta" }, d.etiqueta));
      li.appendChild(U.el("span", { class: "modelo-dato__valor" }, d.valor));
      rejilla.appendChild(li);
    });

    if (!rejilla.childNodes.length) { caja.hidden = true; return; }
    caja.appendChild(rejilla);
    caja.hidden = false;
  }

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

    pintarDatos(modelo);

    var precio = $("#modelo-precio");
    if (precio) {
      // Misma decisión que en la tarjeta: una sola función manda.
      var texto = NS.ui.textoPrecio(modelo);
      precio.textContent = texto;
      precio.hidden = !texto;
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
        var bloqueTexto = U.el("div", { class: "modelo-bloque modelo-bloque--editorial" });

        // Encabezado y texto en columnas separadas. Con el titular encima
        // y el párrafo debajo, la mitad derecha de la página se quedaba en
        // blanco y la ficha se leía a medio terminar.
        var enc = U.el("div", { class: "modelo-bloque__encabezado" });
        enc.appendChild(U.el("p", { class: "modelo-bloque__kicker" }, "En detalle"));
        enc.appendChild(U.el("h2", { class: "modelo-bloque__titulo" }, "Sobre este modelo"));
        bloqueTexto.appendChild(enc);

        var cont = U.el("div", { class: "modelo-bloque__contenido" });
        cont.appendChild(NS.ui.parrafos(modelo.descripcionLarga, "modelo-prosa"));
        bloqueTexto.appendChild(cont);
        cuerpo.appendChild(bloqueTexto);
      }

      // Las características viven ahora en la rejilla de datos, junto al
      // título. Repetirlas aquí como lista era decir dos veces lo mismo y
      // empujaba la descripción hacia abajo.

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
        // NO se usa `cta_label`: esa etiqueta es la de la tarjeta del
        // catálogo, y su trabajo es traer aquí («Ver detalles»). Repetirla
        // en esta página invita a hacer lo que ya se ha hecho.
        "Consultar por este modelo"
      );
      cta.appendChild(enlace);

      // Acción secundaria, discreta: quien duda entre modelos quiere
      // comparar, no volver al catálogo entero y filtrar otra vez. El
      // catálogo ya sabe leer ?categoria=, así que se aprovecha.
      if (modelo.categoria) {
        var comparar = U.el(
          "a",
          { class: "modelo-cta__secundario",
            href: "catalogo.html?categoria=" + encodeURIComponent(modelo.categoria) },
          "Ver otras de su categoría"
        );
        cta.appendChild(comparar);
      }
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

    // Una ficha que no existe no debe entrar en el índice de Google.
    // `modelo.html` es una plantilla paramétrica: sin `?slug=` válido —o
    // con un modelo aún sin publicar— lo único que hay es este mensaje de
    // error, y una página de error indexada perjudica al sitio. El
    // documento nace con `index, follow` para las fichas correctas; aquí,
    // y solo aquí, se cambia.
    var robots = $('meta[name="robots"]');
    if (robots) robots.setAttribute("content", "noindex, follow");
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
