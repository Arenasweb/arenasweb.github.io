/* ================================================================
   ARENAS MOTOCICLETAS — modelo-editorial.js
   Los bloques editoriales de la ficha: la historia del modelo, las
   razones de compra y el explorador de detalles.

   DE DÓNDE SALE CADA COSA
   · El texto, de data/fichas-editorial.json. Es redacción, y vive
     aparte del catálogo porque el catálogo lo administra gerencia
     desde Google Sheets y esto no.
   · Las fotografías, de assets/catalogo/photo-manifest.json. Solo se
     pintan las que están en `ready`: el manifiesto también registra
     las que faltan y las que no se ven en el lado fotografiado, y
     ninguna de esas dos llega nunca al DOM.
   · Los datos técnicos, de las razones — y cada razón declara en
     `fuente` de dónde viene el suyo. Aquí no se calcula ni se deduce
     ninguna cifra.

   POR QUÉ NO HAY HUECOS
   Cada bloque se pinta solo si tiene contenido real, y se retira del
   documento si no. Un modelo con cuatro razones muestra cuatro; uno
   con tres, tres. No hay tarjetas vacías ni «próximamente».

   POR QUÉ NO SE REPITE NINGUNA FOTO
   Las razones eligen primero. El explorador de detalles se queda con
   lo que sobra. Así el visitante no baja media página para
   reencontrarse con la misma fotografía del freno.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  var CONFIG = {
    rutaEditorial: "data/fichas-editorial.json",
    rutaManifiesto: "assets/catalogo/photo-manifest.json",
    timeoutMs: 8000,
    /** Nombres legibles de cada pieza, para el explorador y los alt. */
    etiquetas: {
      lateral: "Vista lateral",
      faro: "Faro",
      tanque: "Depósito",
      motor: "Motor",
      freno: "Frenos",
      "suspension-delantera": "Suspensión delantera",
      "suspension-trasera": "Suspensión trasera",
      escape: "Escape",
      asiento: "Asiento",
      transmision: "Transmisión",
      "detalle-a": "Detalle",
      "detalle-b": "Detalle",
    },
    /** Orden en que se ofrecen las piezas en el explorador. */
    orden: ["motor", "freno", "suspension-delantera", "suspension-trasera",
      "transmision", "escape", "tanque", "asiento", "faro", "detalle-a", "detalle-b"],
  };

  var cache = { editorial: null, manifiesto: null };

  /* ---------------- Carga ---------------- */

  function pedirJson(ruta) {
    var control = typeof AbortController === "function" ? new AbortController() : null;
    var reloj = control ? setTimeout(function () { control.abort(); }, CONFIG.timeoutMs) : null;
    return fetch(ruta, { signal: control ? control.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) { if (reloj) clearTimeout(reloj); return d; });
  }

  /**
   * Trae texto y fotografías. Si cualquiera de los dos falla, la ficha
   * se queda como estaba: estos bloques son un añadido, no la página.
   */
  function cargar() {
    if (cache.editorial !== null && cache.manifiesto !== null) return Promise.resolve(cache);
    return Promise.all([pedirJson(CONFIG.rutaEditorial), pedirJson(CONFIG.rutaManifiesto)])
      .then(function (r) {
        cache.editorial = r[0] || { modelos: {} };
        cache.manifiesto = r[1] || { modelos: [] };
        return cache;
      });
  }

  /**
   * Las fotografías publicables de un modelo, por clave de pieza.
   * @returns {Object<string,{web:string,mini:string,resolucion:string}>}
   */
  function fotosDe(slug) {
    var registro = (cache.manifiesto.modelos || []).filter(function (m) { return m.modelo === slug; })[0];
    if (!registro) return {};
    var salida = {};
    Object.keys(registro.assets || {}).forEach(function (clave) {
      var a = registro.assets[clave];
      // `ready` y con derivado web. Un asset sin `web` es un maestro de
      // decenas de megas: no se sirve a un navegador bajo ningún concepto.
      if (a && a.status === "ready" && a.web) {
        salida[clave] = { web: a.web, mini: a.mini || a.web, resolucion: a.webResolucion || "" };
      }
    });
    return salida;
  }

  /* ---------------- Piezas de interfaz ---------------- */

  /**
   * Figura con la fotografía. `eager` solo para la primera de la
   * página; el resto entra por lazy loading porque vive bajo el pliegue.
   */
  function figura(foto, alt, clase, eager) {
    var fig = U.el("figure", { class: "ed-figura " + (clase || "") });
    var img = U.el("img", {
      src: foto.web,
      alt: alt,
      loading: eager ? "eager" : "lazy",
      decoding: "async",
    });
    // La proporción se fija desde el manifiesto para que el navegador
    // reserve el hueco antes de descargar la imagen y la página no dé
    // un salto al terminar de cargar.
    var dim = /^(\d+)x(\d+)$/.exec(foto.resolucion || "");
    if (dim) { img.setAttribute("width", dim[1]); img.setAttribute("height", dim[2]); }
    fig.appendChild(img);
    return fig;
  }

  function bloqueTitulo(kicker, titulo, clase) {
    var cab = U.el("header", { class: "ed-cabecera " + (clase || "") });
    if (kicker) cab.appendChild(U.el("p", { class: "ed-kicker" }, kicker));
    if (titulo) cab.appendChild(U.el("h2", { class: "ed-titulo" }, titulo));
    return cab;
  }

  /* ---------------- 1. Historia ---------------- */

  function pintarHistoria(seccion, ficha, fotos, nombre) {
    if (!ficha.historia) return false;
    U.vaciar(seccion);

    var caja = U.el("div", { class: "ed-historia" });
    var texto = U.el("div", { class: "ed-historia__texto" });
    texto.appendChild(bloqueTitulo(ficha.historiaKicker, ficha.historiaTitulo));
    texto.appendChild(U.el("p", { class: "ed-prosa" }, ficha.historia));
    caja.appendChild(texto);

    var foto = fotos[ficha.historiaAsset || "lateral"];
    if (foto) {
      caja.appendChild(figura(foto, nombre + ", vista lateral completa", "ed-figura--historia", true));
      caja.classList.add("ed-historia--con-foto");
    }

    seccion.appendChild(caja);
    seccion.hidden = false;
    return true;
  }

  /* ---------------- 2. Por qué elegirla ---------------- */

  /**
   * Razones de compra. Se alterna el lado de la fotografía para dar
   * ritmo: cuatro bloques idénticos en fila se leen como una tabla, y
   * esto no es una tabla.
   *
   * @returns {Array<string>} claves de foto ya gastadas
   */
  function pintarRazones(seccion, ficha, fotos, nombre) {
    var razones = (ficha.razones || []).filter(function (r) { return r.asset && fotos[r.asset]; });
    if (!razones.length) return [];

    U.vaciar(seccion);
    var cabRazones = bloqueTitulo(ficha.razonesKicker || "Por qué elegirla",
      ficha.razonesTitulo || "Hecha para lo que necesitas", "ed-cabecera--seccion");
    // La sección declara aria-labelledby en el HTML; el título tiene que
    // llevar ese id o el lector de pantalla se queda sin nombre.
    var h2Razones = cabRazones.querySelector("h2");
    if (h2Razones) h2Razones.id = "modelo-razones-heading";
    seccion.appendChild(cabRazones);

    var lista = U.el("div", { class: "ed-razones" });
    var usadas = [];

    razones.forEach(function (razon, i) {
      var fila = U.el("article", {
        class: "ed-razon" + (i % 2 ? " ed-razon--invertida" : ""),
      });

      var texto = U.el("div", { class: "ed-razon__texto" });
      texto.appendChild(U.el("p", { class: "ed-razon__indice" }, String(i + 1).padStart(2, "0")));
      if (razon.kicker) texto.appendChild(U.el("p", { class: "ed-kicker" }, razon.kicker));
      texto.appendChild(U.el("h3", { class: "ed-razon__titulo" }, razon.titulo));
      texto.appendChild(U.el("p", { class: "ed-prosa" }, razon.texto));

      // El dato es apoyo, no protagonista: va debajo y en pequeño. La
      // ficha técnica completa está más abajo, en su sección.
      if (razon.dato) {
        var dato = U.el("p", { class: "ed-dato" });
        dato.appendChild(U.el("span", { class: "ed-dato__valor" }, razon.dato));
        if (razon.datoEtiqueta) dato.appendChild(U.el("span", { class: "ed-dato__etiqueta" }, razon.datoEtiqueta));
        texto.appendChild(dato);
      }

      fila.appendChild(texto);
      fila.appendChild(figura(fotos[razon.asset],
        razon.titulo + " — " + nombre, "ed-figura--razon"));
      usadas.push(razon.asset);
      lista.appendChild(fila);
    });

    seccion.appendChild(lista);
    seccion.hidden = false;
    return usadas;
  }

  /* ---------------- 3. Explorador de detalles ---------------- */

  /**
   * Las piezas que las razones no usaron, en un explorador con la
   * lista a un lado y la fotografía grande al otro.
   *
   * Los botones son <button> de verdad, con `aria-selected`, para que
   * se puedan recorrer con el teclado. Un div con un `click` encima
   * deja fuera a quien no usa ratón.
   */
  function pintarDetalles(seccion, fotos, usadas, nombre) {
    var claves = CONFIG.orden.filter(function (c) {
      return fotos[c] && usadas.indexOf(c) === -1 && c !== "lateral";
    });
    // Con una sola pieza sobrante no hay nada que explorar: sería un
    // conmutador de un solo botón.
    if (claves.length < 2) return false;

    U.vaciar(seccion);
    seccion.appendChild(bloqueTitulo("En detalle", "Conoce cada parte", "ed-cabecera--seccion"));
    seccion.appendChild(U.el("p", { class: "ed-prosa ed-prosa--intro" },
      "Fotografía oficial del modelo, sin retoques. Elige una pieza para verla de cerca."));

    var caja = U.el("div", { class: "ed-detalles" });
    var listaBotones = U.el("div", {
      class: "ed-detalles__lista", role: "tablist",
      "aria-label": "Piezas de " + nombre,
    });
    var escenario = U.el("div", { class: "ed-detalles__escenario" });
    var fig = figura(fotos[claves[0]], CONFIG.etiquetas[claves[0]] + " de " + nombre, "ed-figura--detalle");
    escenario.appendChild(fig);
    var pie = U.el("p", { class: "ed-detalles__pie" }, CONFIG.etiquetas[claves[0]]);
    escenario.appendChild(pie);

    var botones = [];

    function activar(indice) {
      var clave = claves[indice];
      botones.forEach(function (b, i) {
        b.setAttribute("aria-selected", i === indice ? "true" : "false");
        b.tabIndex = i === indice ? 0 : -1;
        b.classList.toggle("is-activo", i === indice);
      });
      // Se atenúa, se cambia la fuente y se vuelve. Sin desmontar el
      // nodo: reemplazar la <img> provocaría un parpadeo en blanco
      // mientras el navegador descarga la nueva.
      var img = fig.querySelector("img");
      fig.classList.add("is-cambiando");
      window.setTimeout(function () {
        img.src = fotos[clave].web;
        img.alt = CONFIG.etiquetas[clave] + " de " + nombre;
        pie.textContent = CONFIG.etiquetas[clave];
        fig.classList.remove("is-cambiando");
      }, 180);
    }

    claves.forEach(function (clave, i) {
      var b = U.el("button", {
        type: "button", class: "ed-pieza", role: "tab",
        "aria-selected": i === 0 ? "true" : "false",
      });
      b.tabIndex = i === 0 ? 0 : -1;
      if (i === 0) b.classList.add("is-activo");
      b.appendChild(U.el("span", { class: "ed-pieza__num" }, String(i + 1).padStart(2, "0")));
      b.appendChild(U.el("span", { class: "ed-pieza__nombre" }, CONFIG.etiquetas[clave] || clave));
      b.addEventListener("click", function () { activar(i); });
      b.addEventListener("keydown", function (e) {
        var salto = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
          : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!salto) return;
        e.preventDefault();
        var siguiente = (i + salto + claves.length) % claves.length;
        activar(siguiente);
        botones[siguiente].focus();
      });
      botones.push(b);
      listaBotones.appendChild(b);
    });

    caja.appendChild(listaBotones);
    caja.appendChild(escenario);
    seccion.appendChild(caja);
    seccion.hidden = false;
    return true;
  }

  /* ---------------- 4. Cierre ---------------- */

  function pintarCierre(seccion, nombre) {
    U.vaciar(seccion);
    seccion.appendChild(U.el("h2", { class: "ed-cierre__titulo" }, "¿Es la moto que estabas buscando?"));
    seccion.appendChild(U.el("p", { class: "ed-prosa ed-cierre__texto" },
      "Escríbenos y te contamos disponibilidad y condiciones para la " + nombre + "."));
    // El botón real lo clona modelo-app.js desde el CTA de la cabecera:
    // así solo existe una definición del botón «Lo quiero» y del canal
    // de WhatsApp en toda la ficha.
    seccion.appendChild(U.el("div", { class: "ed-cierre__accion", id: "modelo-cta-cierre" }));
    seccion.hidden = false;
  }

  /* ---------------- Orquestación ---------------- */

  /**
   * Pinta los bloques editoriales de un modelo.
   * @param {Object} modelo modelo normalizado del catálogo
   */
  function pintar(modelo) {
    var secciones = {
      historia: document.getElementById("modelo-historia"),
      razones: document.getElementById("modelo-razones"),
      detalles: document.getElementById("modelo-detalles"),
      cierre: document.getElementById("modelo-cierre"),
    };
    if (!secciones.historia && !secciones.razones) return Promise.resolve();

    return cargar().then(function () {
      var slug = modelo.slug;
      var ficha = (cache.editorial.modelos || {})[slug];
      var fotos = fotosDe(slug);
      var nombre = modelo.titulo || modelo.modelo || "este modelo";

      if (!ficha || !Object.keys(fotos).length) return;

      if (secciones.historia) pintarHistoria(secciones.historia, ficha, fotos, nombre);
      var usadas = secciones.razones ? pintarRazones(secciones.razones, ficha, fotos, nombre) : [];
      if (secciones.detalles) pintarDetalles(secciones.detalles, fotos, usadas, nombre);
      if (secciones.cierre) pintarCierre(secciones.cierre, nombre);
    });
  }

  NS.editorial = { pintar: pintar, CONFIG: CONFIG, cargar: cargar };
})(window.ARENAS_CATALOGO);
