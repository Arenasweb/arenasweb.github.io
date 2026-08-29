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
  /** Trazado del logotipo de WhatsApp (24×24). Marca de Meta Platforms,
   *  usada solo para señalar a dónde lleva el botón. */
  var ICONO_WHATSAPP_PATH =
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.8 11.8 0 0 0 20.464 3.488";

  var cambioPendiente = null;

  /**
   * Color que el cliente tiene delante AHORA MISMO.
   *
   * El botón «Lo quiero» lo lee en el momento del clic, no cuando se
   * pintó la ficha: si alguien cambia de color después de que la página
   * cargue, el mensaje debe nombrar el color que está viendo. Guardarlo
   * al pintar era exactamente la forma de mandar el color equivocado.
   */
  var colorActual = null;

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
    colorActual = color || null;
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
    colorActual = null;
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
    colorActual = inicial || null;

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

  /* ---------------- «Lo quiero» ---------------- */

  /**
   * Icono de WhatsApp, en línea y sin dependencias.
   *
   * Va como SVG inline y no como <img>: una petición menos, hereda el
   * color del botón y no parpadea en blanco mientras carga. `aria-hidden`
   * porque el botón ya dice en palabras a dónde lleva.
   */
  function iconoWhatsApp() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "btn-quiero__icono");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", ICONO_WHATSAPP_PATH);
    svg.appendChild(path);
    return svg;
  }

  /**
   * Botón «Lo quiero»: abre WhatsApp con el modelo y el color a la vista.
   *
   * Decisiones que no se ven en el código:
   *
   * · El color se lee de `colorActual` DENTRO del manejador. Leerlo aquí
   *   fuera congelaría el color del primer render y mandaría al asesor un
   *   color que el cliente ya había cambiado.
   *
   * · `abriendo` bloquea el segundo clic durante un instante. Sin esto,
   *   un doble clic —o un dedo nervioso en móvil— abre dos pestañas de
   *   WhatsApp y genera dos consultas del mismo cliente.
   *
   * · Si el canal no está aprobado, el botón queda deshabilitado con su
   *   motivo escrito. No se oculta: un botón que desaparece parece un
   *   fallo de la página.
   *
   * @param {Object} modelo
   * @returns {HTMLElement}
   */
  function construirBotonQuiero(modelo) {
    var boton = U.el("button", {
      type: "button",
      class: "btn btn-primary btn-hero btn-quiero",
      "data-accion": "whatsapp",
    });
    boton.appendChild(iconoWhatsApp());
    boton.appendChild(U.el("span", { class: "btn-quiero__texto" }, "Lo quiero"));
    boton.appendChild(
      U.el("span", { class: "btn-quiero__sub" }, "Hablar con ventas por WhatsApp")
    );

    var aviso = U.el("p", {
      class: "modelo-cta__aviso",
      role: "status",
      "aria-live": "polite",
    });
    aviso.hidden = true;

    var abriendo = false;

    boton.addEventListener("click", function () {
      if (abriendo) return;

      if (!NS.whatsapp.disponible()) {
        aviso.textContent =
          "Estamos validando nuestro canal de WhatsApp. Escríbenos desde la página de contacto.";
        aviso.hidden = false;
        return;
      }

      var nombreColor = colorActual ? colorActual.nombre : "";
      var url = NS.whatsapp.enlace(modelo.titulo || modelo.modelo, nombreColor);

      if (!NS.whatsapp.abrir(url)) {
        aviso.textContent =
          "No pudimos abrir WhatsApp. Escríbenos desde la página de contacto.";
        aviso.hidden = false;
        return;
      }

      // Si el navegador bloquea la ventana emergente, abrir() ya navega en
      // esta misma pestaña; este texto solo se llega a leer cuando la
      // pestaña nueva se abrió de verdad.
      aviso.textContent = "Abriendo WhatsApp… revisa el mensaje antes de enviarlo.";
      aviso.hidden = false;

      abriendo = true;
      window.setTimeout(function () { abriendo = false; }, 1200);
    });

    var envoltorio = U.el("div", { class: "modelo-cta__principal" });
    envoltorio.appendChild(boton);
    envoltorio.appendChild(aviso);
    return envoltorio;
  }

  /* ---------------- Ficha: llamada a la acción ---------------- */

  /* ---------------- Datos rápidos ---------------- */

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
      var d = U.partirDato(c);
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
      // NO se usa `cta_label`: esa etiqueta es la de la tarjeta del
      // catálogo, y su trabajo es traer aquí («Ver detalles»). Repetirla
      // en esta página invita a hacer lo que ya se ha hecho.
      //
      // Es un <button>, no un <a href="wa.me/…">: así el número no
      // aparece en el HTML servido, y el color se lee en el instante del
      // clic y no cuando se pintó la ficha.
      cta.appendChild(construirBotonQuiero(modelo));

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
          "Se abrirá WhatsApp con tu consulta ya escrita. Tú decides si la envías: nada sale de esta página hasta que pulses «Enviar»."
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

    // El canal de ventas se pide en paralelo con el catálogo, no después:
    // encadenarlos retrasaría la ficha entera por un JSON de configuración.
    // Si tarda o falla, el botón «Lo quiero» avisa en vez de abrir nada.
    NS.whatsapp.cargar();

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
