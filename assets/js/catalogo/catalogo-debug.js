/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-debug.js
   Panel editorial LOCAL para ayudar a completar el catálogo.

   GATE DE ACTIVACIÓN — idéntico en severidad al de la previsualización:

       ?debug=1   Y   host local   Y   previsualización activa

   Las tres condiciones a la vez. En arenasweb.github.io no se activa
   aunque alguien escriba ?debug=1, porque `entornoLocal()` compara el
   hostname contra una lista blanca cerrada. Este archivo puede publicarse
   sin riesgo: en producción no dibuja absolutamente nada.

   QUÉ MUESTRA: solo contenido editorial del propio modelo (si tiene foto,
   alt, descripción, características…). NUNCA teléfonos, correos, stock,
   contactos internos, credenciales ni identificadores de despliegue —
   ninguno de esos datos existe siquiera en el contrato del catálogo.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  /** Las tres condiciones. Si falta una, el modo no existe. */
  function activo() {
    return (
      U.paramUrl("debug", 4) === "1" &&
      U.entornoLocal() &&
      NS.data.previewActivo()
    );
  }

  /** Fila «etiqueta: valor» del resumen. */
  function fila(etiqueta, valor, alerta) {
    var li = U.el("li", { class: "qa-panel__fila" + (alerta ? " is-alerta" : "") });
    li.appendChild(U.el("span", { class: "qa-panel__etiqueta" }, etiqueta));
    li.appendChild(U.el("span", { class: "qa-panel__valor" }, String(valor)));
    return li;
  }

  /**
   * Panel de resumen del catálogo. Se inserta al principio de la rejilla
   * y se puede plegar para no estorbar.
   */
  function panel(estado) {
    if (!activo()) return null;

    var r = NS.completitud.resumir(estado.modelos);

    var caja = U.el("aside", {
      class: "qa-panel",
      "aria-label": "Panel local de control editorial",
    });

    var cabecera = U.el("div", { class: "qa-panel__cabecera" });
    cabecera.appendChild(U.el("p", { class: "qa-panel__titulo" }, "QA editorial · solo local"));
    var plegar = U.el("button", {
      type: "button",
      class: "qa-panel__plegar",
      "aria-expanded": "true",
    }, "Ocultar");
    cabecera.appendChild(plegar);
    caja.appendChild(cabecera);

    var cuerpo = U.el("div", { class: "qa-panel__cuerpo" });

    /**
     * Bloque con su propio encabezado. Antes los subtítulos ocupaban la
     * fila entera de la rejilla, así que las tres listas quedaban apiladas
     * y el panel medía casi 900 px: tapaba el catálogo, que es justo lo
     * que se venía a mirar. Agrupadas, se reparten en columnas.
     */
    function bloque(titulo, lista) {
      var caja = U.el("div", { class: "qa-panel__bloque" });
      if (titulo) caja.appendChild(U.el("p", { class: "qa-panel__sub" }, titulo));
      caja.appendChild(lista);
      return caja;
    }

    var lista = U.el("ul", { class: "qa-panel__lista" });
    lista.appendChild(fila("Modelos en el catálogo", r.total));
    // «Publicado» son TRES cosas: contenido completo, activo y aprobado.
    // La etiqueta anterior decía «activo + aprobado» y se quedó corta
    // cuando el contenido mínimo pasó a formar parte de la regla.
    lista.appendChild(fila("Publicados (completo + activo + aprobado)", r.publicados, r.publicados === 0));
    lista.appendChild(fila("Listos por contenido", r.publicables, r.publicables === 0));
    lista.appendChild(fila("Aprobados", r.aprobados));
    lista.appendChild(fila("Activos", r.activos));
    lista.appendChild(fila("En borrador", r.borradores, r.borradores > 0));
    lista.appendChild(fila("Destacados", r.destacados));
    lista.appendChild(fila("Nuevos", r.nuevos));
    cuerpo.appendChild(bloque("Publicación", lista));

    // Reparto por estado editorial: dónde está atascado el trabajo.
    var etapas = U.el("ul", { class: "qa-panel__lista" });
    etapas.appendChild(fila("Pendientes (sin fotografía)", r.pendientes, r.pendientes > 0));
    etapas.appendChild(fila("En preparación", r.enPreparacion));
    etapas.appendChild(fila("Listos para revisión", r.listosParaRevision));
    etapas.appendChild(fila("Sin nada pendiente", r.completos));
    cuerpo.appendChild(bloque("Estado del trabajo", etapas));

    var pend = U.el("ul", { class: "qa-panel__lista" });
    pend.appendChild(fila("Sin fotografía", r.sinImagen, r.sinImagen > 0));
    pend.appendChild(fila("Sin foto de celular", r.sinImagenMobile, r.sinImagenMobile > 0));
    pend.appendChild(fila("Sin texto alternativo", r.sinAlt, r.sinAlt > 0));
    pend.appendChild(fila("Sin descripción corta", r.sinDescripcionCorta, r.sinDescripcionCorta > 0));
    pend.appendChild(fila("Sin descripción larga", r.sinDescripcionLarga, r.sinDescripcionLarga > 0));
    pend.appendChild(fila("Sin características", r.sinCaracteristicas, r.sinCaracteristicas > 0));
    pend.appendChild(fila("Sin colores", r.sinColores));
    pend.appendChild(fila("Sin precio publicado", r.sinPrecio));
    if (r.conTextoProvisional) {
      pend.appendChild(fila("Con texto provisional", r.conTextoProvisional, true));
    }
    cuerpo.appendChild(bloque("Qué falta", pend));

    cuerpo.appendChild(
      U.el("p", { class: "qa-panel__nota" },
        "Colores y precio son opcionales: un modelo puede publicarse sin ellos.")
    );

    caja.appendChild(cuerpo);

    function plegado(cerrar) {
      plegar.setAttribute("aria-expanded", cerrar ? "false" : "true");
      plegar.textContent = cerrar ? "Mostrar" : "Ocultar";
      cuerpo.hidden = cerrar;
    }

    plegar.addEventListener("click", function () {
      plegado(plegar.getAttribute("aria-expanded") === "true");
    });

    // En pantalla estrecha el panel arranca plegado. Desplegado ocupaba la
    // pantalla entera y había que hacer scroll a ciegas para llegar a las
    // tarjetas, que es lo que se quería revisar.
    try {
      if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) plegado(true);
    } catch (e) {
      /* sin matchMedia, se queda desplegado */
    }

    return caja;
  }

  /**
   * Distintivos por tarjeta: de un vistazo, qué le falta a esta moto.
   * Solo se dibujan en modo depuración; en previsualización normal la
   * tarjeta se ve exactamente como en producción.
   */
  function marcasTarjeta(modelo) {
    if (!activo()) return null;

    var informe = NS.completitud.evaluar(modelo);
    var pendientes = informe.faltan.obligatorio.concat(informe.faltan.recomendado);

    var caja = U.el("div", {
      class: "qa-marcas",
      "aria-label": "Estado editorial de este modelo (solo QA local)",
    });

    // Cabecera de la tarjeta: en qué punto del proceso está y cuánto lleva.
    // El porcentaje mide solo lo exigible, así que un 100 % sin precio ni
    // colores es un 100 % legítimo.
    caja.appendChild(
      U.el("span", {
        class: "qa-marca qa-marca--estado",
        title:
          informe.exigiblesCumplidos + " de " + informe.exigiblesTotal + " requisitos exigibles · " +
          informe.opcionalesCumplidos + " de " + informe.opcionalesTotal + " opcionales",
      }, informe.estadoEditorial + " · " + informe.porcentaje + "%")
    );

    if (!pendientes.length) return caja;

    var corto = {
      imagen: "FOTO",
      imagenMobile: "FOTO MÓVIL",
      alt: "ALT",
      descripcionCorta: "COPY",
      descripcionLarga: "TEXTO",
      caracteristicas: "CARACT.",
      linea: "LÍNEA",
      modelo: "NOMBRE",
      categoria: "CATEGORÍA",
    };

    pendientes.forEach(function (p) {
      var esObligatorio = informe.faltan.obligatorio.some(function (o) {
        return o.clave === p.clave;
      });
      caja.appendChild(
        U.el("span", {
          class: "qa-marca" + (esObligatorio ? " qa-marca--critica" : ""),
          title: p.etiqueta + (esObligatorio ? " (obligatorio)" : " (recomendado)"),
        }, corto[p.clave] || p.clave)
      );
    });
    return caja;
  }

  NS.debug = {
    activo: activo,
    panel: panel,
    marcasTarjeta: marcasTarjeta,
  };
})(window.ARENAS_CATALOGO);
