/* ================================================================
   ARENAS MOTOCICLETAS — explorar.js
   El recorrido pieza por pieza, para cualquier modelo del catálogo.

   QUÉ HACE, EN UNA LÍNEA
   Lee `?slug=`, arma el recorrido con las fotografías y los textos que
   ya existen, y enciende la pieza cuyo texto ocupa el centro de la
   pantalla.

   DE DÓNDE SALE EL CONTENIDO — Y POR QUÉ NO SE ESCRIBE AQUÍ
   Nada de esta página es contenido nuevo:

     · el nombre y la descripción, del catálogo (`NS.data`)
     · la historia y las razones, de `data/fichas-editorial.json`
     · las fotografías, de `assets/catalogo/photo-manifest.json`

   Es la misma capa editorial que pinta la ficha del modelo. Escribir
   aquí un segundo juego de textos garantizaría que algún día la ficha y
   el recorrido dijeran cosas distintas sobre la misma moto, y que nadie
   se enterara hasta que lo viera un cliente.

   POR QUÉ UN OBSERVADOR Y NO EL SCROLL
   Escuchar `scroll` obliga a medir posiciones en cada fotograma, y medir
   provoca recálculo de diseño. IntersectionObserver hace ese trabajo
   fuera del hilo principal y solo avisa cuando algo cruza el umbral.

   SIN DEPENDENCIAS Y SIN ESTILOS EN LÍNEA
   Solo se añaden y quitan clases. La política de contenido de este sitio
   prohíbe `style=` en el HTML, y esa prohibición es justo lo que permite
   que la política sea estricta.
   ================================================================ */

(function (NS) {
  "use strict";

  var U = NS.utils;

  /* La franja del centro de la pantalla que decide qué paso manda. Un
     umbral simple (0.5) fallaría con pasos más altos que la ventana:
     nunca llegarían a estar visibles al 50%. */
  var MARGEN = "-45% 0px -45% 0px";

  /* Modelo que se abre cuando no llega `?slug=`. La portada enlaza con
     slug explícito; esto solo cubre a quien llegue con la URL pelada. */
  var POR_DEFECTO = "pulsar-200-ns-ug2";

  var dom = {};

  /* ---------------- Utilidades de la página ---------------- */

  function $(sel) { return document.querySelector(sel); }

  /**
   * Sustituye el contenido de la página por un aviso legible.
   * No se deja el esqueleto vacío: una página en blanco parece un fallo
   * del navegador, y quien llegue aquí con un enlace viejo merece saber
   * que la moto existe pero el recorrido no.
   * @param {string} titulo
   * @param {string} texto
   */
  function rendirse(titulo, texto) {
    var main = $("#main-content");
    if (!main) return;
    U.vaciar(main);
    var caja = U.el("section", { class: "ex-vacio" });
    caja.appendChild(U.el("h1", { class: "ex-vacio__titulo" }, titulo));
    caja.appendChild(U.el("p", { class: "ex-vacio__texto" }, texto));
    var acciones = U.el("div", { class: "ex-vacio__acciones" });
    acciones.appendChild(
      U.el("a", { class: "btn btn-primary btn-hero", href: "catalogo.html" }, "Ver el catálogo")
    );
    caja.appendChild(acciones);
    main.appendChild(caja);
  }

  /* ---------------- Construcción del recorrido ---------------- */

  /**
   * Las paradas del recorrido, en orden.
   *
   * La primera es siempre la moto entera: hace de plano general antes de
   * entrar en los detalles, y es la única vez que se ve completa. Las
   * demás salen de las razones de la ficha, saltando las que no tengan
   * fotografía publicable — una parada sin foto dejaría el escenario en
   * blanco justo cuando se está leyendo su texto.
   *
   * @param {Object} modelo   registro del catálogo
   * @param {Object} ficha    ficha editorial
   * @param {Object} fotos    piezas publicables por clave
   * @returns {Array<Object>}
   */
  function construirParadas(modelo, ficha, fotos) {
    var paradas = [];

    paradas.push({
      zona: "conjunto",
      foto: fotos.lateral,
      kicker: ficha.historiaKicker || "Historia",
      titulo: ficha.historiaTitulo || modelo.titulo_web || modelo.modelo,
      texto: U.textoLargo(ficha.historia, 900),
      alt: U.texto(modelo.alt_text, 300),
    });

    (ficha.razones || []).forEach(function (r) {
      if (!r || !r.asset) return;
      var foto = fotos[r.asset];
      if (!foto) return;
      paradas.push({
        zona: r.id || r.asset,
        foto: foto,
        kicker: U.texto(r.kicker, 40),
        titulo: U.texto(r.titulo, 120),
        texto: U.textoLargo(r.texto, 700),
        dato: U.texto(r.dato, 40),
        datoEtiqueta: U.texto(r.datoEtiqueta, 60),
        // El alt describe la pieza, no repite el nombre de la moto: un
        // lector de pantalla ya lo ha dicho en el título de la página.
        alt: U.texto(r.titulo, 120),
      });
    });

    return paradas;
  }

  /**
   * Pinta el escenario (las fotografías apiladas) y los pasos.
   *
   * Las imágenes se montan todas de una vez y se apagan con opacidad, no
   * se montan y desmontan: cambiar el `src` provocaría un parpadeo en
   * blanco mientras la siguiente descarga.
   */
  function pintar(modelo, paradas) {
    var nombre = modelo.titulo_web || modelo.modelo || "";

    // --- Apertura ---
    var kicker = [modelo.subcategoria, modelo.linea].filter(Boolean).join(" · ");
    if (dom.kicker) dom.kicker.textContent = kicker || "Catálogo";

    if (dom.titulo) {
      U.vaciar(dom.titulo);
      // El nombre se parte en dos líneas: la familia arriba y la
      // cilindrada abajo, que es como se nombra una moto en la calle
      // («una Pulsar 200», no «una Pulsar200»). El corte es la primera
      // palabra, que funciona para todas las del catálogo: Pulsar/200 NS,
      // Dominar/400, Discover/125 ST, Boxer/BM150X Disc.
      var corte = nombre.indexOf(" ");
      if (corte > 0) {
        dom.titulo.appendChild(document.createTextNode(nombre.slice(0, corte)));
        dom.titulo.appendChild(U.el("span", {}, nombre.slice(corte + 1)));
      } else {
        dom.titulo.textContent = nombre;
      }
    }

    if (dom.lead) dom.lead.textContent = U.texto(modelo.descripcion_corta, 300);

    if (dom.portada && paradas[0] && paradas[0].foto) {
      dom.portada.setAttribute("src", paradas[0].foto.web);
      dom.portada.setAttribute("alt", paradas[0].alt || nombre);
    }

    if (dom.fichaCta) {
      dom.fichaCta.setAttribute("href", "modelo.html?slug=" + encodeURIComponent(modelo.slug));
    }

    // --- Escenario ---
    U.vaciar(dom.caja);
    U.vaciar(dom.pasos);
    U.vaciar(dom.puntos);

    paradas.forEach(function (p, i) {
      var img = U.el("img", {
        class: "ex-vista" + (i === 0 ? " is-activa" : ""),
        "data-zona": p.zona,
        src: p.foto.web,
        alt: "",
        decoding: "async",
      });
      // La primera se descarga ya; el resto espera, y el centinela de
      // más abajo las adelanta en cuanto el recorrido se acerca.
      if (i > 0) img.setAttribute("loading", "lazy");
      dom.caja.appendChild(img);

      var paso = U.el("section", {
        class: "ex-paso" + (i === 0 ? " is-activo" : ""),
        "data-zona": p.zona,
      });
      paso.appendChild(U.el("p", { class: "ex-paso__num" }, ("0" + (i + 1)).slice(-2)));
      if (p.kicker) paso.appendChild(U.el("p", { class: "ex-paso__kicker" }, p.kicker));
      paso.appendChild(U.el("h2", { class: "ex-paso__titulo" }, p.titulo));
      paso.appendChild(U.el("p", { class: "ex-paso__texto" }, p.texto));

      if (p.dato) {
        var dato = U.el("p", { class: "ex-paso__dato" });
        dato.appendChild(U.el("span", {}, p.dato));
        if (p.datoEtiqueta) dato.appendChild(document.createTextNode(" " + p.datoEtiqueta));
        paso.appendChild(dato);
      }
      dom.pasos.appendChild(paso);

      dom.puntos.appendChild(
        U.el("li", { class: "ex-punto" + (i === 0 ? " is-activo" : "") })
      );
    });

    // --- Cierre ---
    if (dom.cierreTitulo) dom.cierreTitulo.textContent = "¿Te enseñamos la " + nombre + "?";
    if (dom.cierreCta) {
      dom.cierreCta.setAttribute("href", "modelo.html?slug=" + encodeURIComponent(modelo.slug));
    }

    document.title = "Explora la " + nombre + " — ARENAS MOTOCICLETAS";
  }

  /* ---------------- Sincronización con el scroll ---------------- */

  function conectar() {
    var pasos = Array.prototype.slice.call(dom.pasos.querySelectorAll(".ex-paso"));
    var vistas = Array.prototype.slice.call(dom.caja.querySelectorAll(".ex-vista"));
    var puntos = Array.prototype.slice.call(dom.puntos.querySelectorAll(".ex-punto"));
    if (!pasos.length || !vistas.length) return;

    var activa = "";

    function encender(zona) {
      if (!zona || zona === activa) return;
      activa = zona;
      vistas.forEach(function (v) {
        v.classList.toggle("is-activa", v.getAttribute("data-zona") === zona);
      });
      pasos.forEach(function (p, i) {
        var esta = p.getAttribute("data-zona") === zona;
        p.classList.toggle("is-activo", esta);
        if (puntos[i]) puntos[i].classList.toggle("is-activo", esta);
      });
    }

    if (!("IntersectionObserver" in window)) {
      // Sin observador se encienden todas: se pierde el recorrido, no el
      // contenido. Nadie se queda mirando un escenario en blanco.
      vistas.forEach(function (v) { v.classList.add("is-activa"); });
      pasos.forEach(function (p) { p.classList.add("is-activo"); });
      document.documentElement.classList.add("sin-recorrido");
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      // Se elige la entrada MÁS visible y no la última que avisó: al
      // desplazarse rápido llegan varias a la vez y quedarse con la
      // última hace que el escenario salte a una pieza que ya pasó.
      var mejor = null;
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (!mejor || e.intersectionRatio > mejor.intersectionRatio) mejor = e;
      });
      if (mejor) encender(mejor.target.getAttribute("data-zona"));
    }, { rootMargin: MARGEN, threshold: [0, 0.25, 0.5, 0.75, 1] });

    pasos.forEach(function (p) { observador.observe(p); });

    /* Precarga por adelantado. Las vistas van con `loading="lazy"` para
       no descargar todas de golpe al abrir; si se espera a que cada una
       entre en pantalla, el primer cambio de pieza enseña el hueco. */
    var precargadas = false;
    var centinela = new IntersectionObserver(function (entradas) {
      if (precargadas || !entradas.some(function (e) { return e.isIntersecting; })) return;
      precargadas = true;
      vistas.forEach(function (v) { v.loading = "eager"; });
      centinela.disconnect();
    }, { rootMargin: "300px 0px 0px 0px" });
    centinela.observe(pasos[0]);
  }

  /* ---------------- Arranque ---------------- */

  function iniciar() {
    dom = {
      kicker: $("#ex-kicker"),
      titulo: $("#ex-titulo"),
      lead: $("#ex-lead"),
      portada: $("#ex-portada"),
      caja: $("#ex-caja"),
      pasos: $("#ex-pasos"),
      puntos: $("#ex-puntos"),
      fichaCta: $("#ex-ficha-cta"),
      cierreTitulo: $("#ex-cierre-titulo"),
      cierreCta: $("#ex-cierre-cta"),
    };
    if (!dom.caja || !dom.pasos || !dom.puntos) return;

    // El slug se valida antes de usarse: llega de la URL, y la URL la
    // escribe cualquiera. Un slug con formato raro no busca nada.
    var slug = U.paramUrl("slug", 80).toLowerCase() || POR_DEFECTO;
    if (!U.slugValido(slug)) {
      rendirse("Recorrido no encontrado", "La dirección no corresponde a ningún modelo del catálogo.");
      return;
    }

    Promise.all([NS.data.cargar(), NS.editorial.cargar()])
      .then(function (r) {
        var estado = r[0];
        var modelo = NS.data.porSlug(estado, slug);
        if (!modelo) {
          rendirse("Modelo no encontrado", "Puede que ya no esté publicado. En el catálogo están todos los disponibles.");
          return;
        }

        var ficha = NS.editorial.fichaDe(slug);
        var fotos = NS.editorial.fotosDe(slug);
        if (!ficha || !fotos.lateral) {
          rendirse(
            "Todavía no hay recorrido de esta moto",
            "Estamos fotografiándola pieza por pieza. Mientras tanto, su ficha completa sí está lista."
          );
          return;
        }

        var paradas = construirParadas(modelo, ficha, fotos);
        if (paradas.length < 4) {
          rendirse(
            "Todavía no hay recorrido de esta moto",
            "Nos faltan fotografías de algunas piezas. Mientras tanto, su ficha completa sí está lista."
          );
          return;
        }

        pintar(modelo, paradas);
        conectar();
        document.documentElement.classList.add("ex-listo");
      })
      .catch(function () {
        rendirse(
          "No pudimos cargar el recorrido",
          "Puede ser la conexión. Vuelve a intentarlo, o entra al catálogo."
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window.ARENAS_CATALOGO);
