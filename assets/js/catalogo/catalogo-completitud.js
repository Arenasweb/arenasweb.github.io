/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-completitud.js
   Evaluación editorial de un modelo: qué le falta para poder publicarse
   y qué le falta para lucir bien.

   ESTE MÓDULO NO DECIDE NADA SOBRE LA WEB PÚBLICA. No oculta modelos, no
   bloquea publicaciones y no cambia el render. Su única función es
   informar: la usan el panel local de QA (?debug=1) y el script
   scripts/qa-catalogo.mjs para ayudar a llenar el catálogo.

   Quien decide qué se publica sigue siendo la hoja, mediante `activo` y
   `estado_contenido`.

   Tres niveles, deliberadamente distintos:

     OBLIGATORIO  sin esto el modelo no debería publicarse: o rompe la
                  ficha, o deja al visitante sin lo mínimo.
     RECOMENDADO  se puede publicar sin ello, pero se nota que falta.
     OPCIONAL     depende del modelo y de decisiones comerciales. Su
                  ausencia NUNCA es un problema.

   Precio y colores son OPCIONALES a propósito: un modelo puede
   publicarse legítimamente sin precio aprobado y sin variantes de color.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  /**
   * Textos provisionales conocidos. No se borran ni se sustituyen: solo
   * se reconocen para poder marcarlos como pendientes en las
   * herramientas de QA. Se comparan en minúsculas y sin tildes.
   */
  var MARCAS_PROVISIONALES = [
    "pendiente",
    "por completar",
    "por definir",
    "descripcion ampliada",
    "texto provisional",
    "lorem ipsum",
    "tbd",
  ];

  /** ¿Este texto parece un marcador de trabajo en vez de contenido real? */
  function esProvisional(texto) {
    var t = U.normalizarBusqueda(texto || "");
    if (!t) return false;
    for (var i = 0; i < MARCAS_PROVISIONALES.length; i++) {
      if (t.indexOf(MARCAS_PROVISIONALES[i]) !== -1) return true;
    }
    return false;
  }

  /**
   * Definición de los requisitos. Cada entrada dice cómo se llama, en qué
   * nivel está, con qué urgencia hay que conseguirlo y cómo se comprueba.
   * Añadir un requisito nuevo es añadir una fila aquí; nada más hay que tocar.
   *
   * `nivel` y `prioridad` responden a preguntas distintas y por eso no
   * coinciden fila a fila:
   *   nivel      → ¿se puede publicar sin esto?
   *   prioridad  → ¿en qué orden conviene conseguirlo?
   *
   * Por eso la fotografía principal es P0 (sin ella la tarjeta no comunica
   * nada) mientras que el nombre del modelo, siendo igual de obligatorio, es
   * P1: nunca falta en la práctica, porque sin él el registro ni se carga.
   */
  var REQUISITOS = [
    // --- OBLIGATORIO ---
    { clave: "imagen", nivel: "obligatorio", prioridad: "P0", etiqueta: "Fotografía principal",
      cumple: function (m) { return !!m.imagenPrincipal; } },
    { clave: "modelo", nivel: "obligatorio", prioridad: "P1", etiqueta: "Nombre del modelo",
      cumple: function (m) { return !!m.modelo; } },
    // Sin slug no hay URL de ficha, y no se le inventa una: el modelo
    // existe como borrador pero no puede publicarse ni enlazarse.
    { clave: "slug", nivel: "obligatorio", prioridad: "P1", etiqueta: "Dirección (slug)",
      cumple: function (m) { return !!m.slug; } },
    { clave: "categoria", nivel: "obligatorio", prioridad: "P1", etiqueta: "Categoría válida",
      cumple: function (m) { return !!m.categoria; } },
    { clave: "alt", nivel: "obligatorio", prioridad: "P1", etiqueta: "Texto alternativo",
      // Solo se exige si hay fotografía: sin foto no hay nada que
      // describir. Un "PENDIENTE" no describe nada, así que tampoco vale.
      cumple: function (m) { return !m.imagenPrincipal || (!!m.altText && !esProvisional(m.altText)); } },
    // Obligatoria desde la revisión del contrato: una tarjeta sin una
    // sola línea de texto no es una ficha de producto terminada. El
    // backend público tampoco emite un modelo que no la tenga, así que
    // marcarla como «recomendada» aquí dejaba a las herramientas
    // diciendo «listo para publicar» sobre algo que no se publicaría.
    { clave: "descripcionCorta", nivel: "obligatorio", prioridad: "P1", etiqueta: "Descripción corta",
      cumple: function (m) { return !!m.descripcionCorta && !esProvisional(m.descripcionCorta); } },

    // --- RECOMENDADO ---
    { clave: "imagenMobile", nivel: "recomendado", prioridad: "P1", etiqueta: "Fotografía para celular",
      cumple: function (m) { return !!m.imagenMobile; } },
    { clave: "descripcionLarga", nivel: "recomendado", prioridad: "P2", etiqueta: "Descripción larga",
      cumple: function (m) { return !!m.descripcionLarga && !esProvisional(m.descripcionLarga); } },
    { clave: "caracteristicas", nivel: "recomendado", prioridad: "P2", etiqueta: "Características",
      cumple: function (m) { return m.caracteristicas.length > 0; } },
    { clave: "linea", nivel: "recomendado", prioridad: "P2", etiqueta: "Línea",
      cumple: function (m) { return !!m.linea; } },

    // --- OPCIONAL ---
    { clave: "foco", nivel: "opcional", prioridad: "P3", etiqueta: "Punto focal ajustado",
      cumple: function (m) { return !!m.foco && m.foco !== "center center"; } },
    { clave: "galeria", nivel: "opcional", prioridad: "P3", etiqueta: "Galería",
      cumple: function (m) { return m.galeria.length > 0; } },
    { clave: "colores", nivel: "opcional", prioridad: "P3", etiqueta: "Colores",
      cumple: function (m) { return m.colores.length > 0 || (m.colors && m.colors.length > 0); } },
    { clave: "precio", nivel: "opcional", prioridad: "P3", etiqueta: "Precio publicado",
      cumple: function (m) { return m.mostrarPrecio === true; } },
    { clave: "ctaLabel", nivel: "opcional", prioridad: "P3", etiqueta: "Texto del botón",
      cumple: function (m) { return !!m.ctaLabel; } },
  ];

  /** Requisitos que cuentan para el porcentaje. Los opcionales no. */
  var REQUISITOS_EXIGIBLES = REQUISITOS.filter(function (r) {
    return r.nivel !== "opcional";
  });

  /**
   * Estado editorial de un modelo. Es una lectura DERIVADA para trabajar,
   * no un campo de la hoja: nunca se escribe en el CMS. Los estados que
   * el negocio maneja siguen siendo BORRADOR / EN_REVISION / APROBADO.
   *
   *   PENDIENTE            sin fotografía: no hay nada que mirar todavía
   *   EN PREPARACIÓN       hay foto, pero falta algo obligatorio
   *   LISTO PARA REVISIÓN  se puede publicar; quedan mejoras recomendadas
   *   PUBLICABLE           no falta nada exigible
   */
  function estadoEditorial(faltan, tieneImagen) {
    if (!tieneImagen) return "PENDIENTE";
    if (faltan.obligatorio.length) return "EN PREPARACIÓN";
    if (faltan.recomendado.length) return "LISTO PARA REVISIÓN";
    return "PUBLICABLE";
  }

  /**
   * Evalúa un modelo ya normalizado.
   * @param {Object} modelo
   * @returns {Object} informe de completitud
   */
  function evaluar(modelo) {
    var faltan = { obligatorio: [], recomendado: [], opcional: [] };
    var cumplidos = 0;
    var exigiblesCumplidos = 0;

    REQUISITOS.forEach(function (req) {
      if (req.cumple(modelo)) {
        cumplidos++;
        if (req.nivel !== "opcional") exigiblesCumplidos++;
      } else {
        faltan[req.nivel].push({ clave: req.clave, etiqueta: req.etiqueta, prioridad: req.prioridad });
      }
    });

    // «Publicable» significa: tiene lo obligatorio. NO significa que esté
    // publicado — eso lo decide `activo` en la hoja.
    var publicable = faltan.obligatorio.length === 0;

    // «Publicado» exige las tres cosas. Antes se calculaba solo con
    // `activo` y `APROBADO`, así que el panel podía rotular como
    // PUBLICADO un modelo incompleto que la web pública no muestra: la
    // herramienta afirmaba lo contrario de lo que ocurría.
    var publicado = publicable && modelo.activo === true && modelo.estadoContenido === "APROBADO";

    return {
      slug: modelo.slug,
      modelo: modelo.modelo,
      publicable: publicable,
      activo: modelo.activo === true,
      estadoContenido: modelo.estadoContenido,
      aprobado: modelo.estadoContenido === "APROBADO",
      // Publicado de verdad = completo, aprobado y activo.
      publicado: publicado,
      destacado: modelo.destacado === true,
      nuevo: modelo.nuevo === true,
      faltan: faltan,
      cumplidos: cumplidos,
      total: REQUISITOS.length,

      // El porcentaje mide SOLO lo exigible. Si contase también precio,
      // colores, galería y punto focal, un modelo impecable pero sin precio
      // aprobado —una situación perfectamente normal— se quedaría en torno
      // al 64 % y parecería a medio hacer. Lo opcional se informa aparte.
      porcentaje: Math.round((exigiblesCumplidos / REQUISITOS_EXIGIBLES.length) * 100),
      exigiblesCumplidos: exigiblesCumplidos,
      exigiblesTotal: REQUISITOS_EXIGIBLES.length,
      opcionalesCumplidos: cumplidos - exigiblesCumplidos,
      opcionalesTotal: REQUISITOS.length - REQUISITOS_EXIGIBLES.length,

      estadoEditorial: estadoEditorial(faltan, !!modelo.imagenPrincipal),
      // La descripción corta es obligatoria: si es un marcador, llega
      // entera y se detecta aquí. La larga es opcional y el esquema ya la
      // ha vaciado para que no se pinte, así que el dato provisional no
      // llega — pero sí la bandera que dice que existía. Sin ella, la
      // previsualización perdería la única pista de que hay algo que
      // corregir en esa celda.
      provisional: {
        descripcionCorta: esProvisional(modelo.descripcionCorta),
        descripcionLarga:
          esProvisional(modelo.descripcionLarga) ||
          !!(modelo.provisionales && modelo.provisionales.descripcionLarga),
        caracteristicas: (modelo.provisionales && modelo.provisionales.caracteristicas) || 0,
      },
    };
  }

  /**
   * Resumen agregado de una lista de modelos. Todos los números se
   * calculan; ninguno está escrito en el código.
   */
  function resumir(modelos) {
    var r = {
      total: modelos.length,
      publicables: 0,
      publicados: 0,
      aprobados: 0,
      borradores: 0,
      activos: 0,
      destacados: 0,
      nuevos: 0,
      // Reparto por estado editorial derivado. Estas cuatro son excluyentes
      // entre sí y suman `total`; no confundir `completos` con `publicables`,
      // que es más laxo (solo exige lo obligatorio) y por tanto engloba
      // también a los que están LISTO PARA REVISIÓN.
      pendientes: 0,
      enPreparacion: 0,
      listosParaRevision: 0,
      completos: 0,
      sinImagen: 0,
      sinImagenMobile: 0,
      sinAlt: 0,
      sinDescripcionCorta: 0,
      sinDescripcionLarga: 0,
      sinCaracteristicas: 0,
      sinColores: 0,
      sinPrecio: 0,
      conTextoProvisional: 0,
      informes: [],
    };

    modelos.forEach(function (m) {
      var i = evaluar(m);
      r.informes.push(i);
      if (i.publicable) r.publicables++;
      if (i.publicado) r.publicados++;
      if (i.aprobado) r.aprobados++;
      else r.borradores++;
      if (i.activo) r.activos++;
      if (i.destacado) r.destacados++;
      if (i.nuevo) r.nuevos++;
      if (i.estadoEditorial === "PENDIENTE") r.pendientes++;
      else if (i.estadoEditorial === "EN PREPARACIÓN") r.enPreparacion++;
      else if (i.estadoEditorial === "LISTO PARA REVISIÓN") r.listosParaRevision++;
      else r.completos++;

      var falta = {};
      ["obligatorio", "recomendado", "opcional"].forEach(function (n) {
        i.faltan[n].forEach(function (f) { falta[f.clave] = true; });
      });

      if (falta.imagen) r.sinImagen++;
      if (falta.imagenMobile) r.sinImagenMobile++;
      if (falta.alt) r.sinAlt++;
      if (falta.descripcionCorta) r.sinDescripcionCorta++;
      if (falta.descripcionLarga) r.sinDescripcionLarga++;
      if (falta.caracteristicas) r.sinCaracteristicas++;
      if (falta.colores) r.sinColores++;
      if (falta.precio) r.sinPrecio++;
      if (i.provisional.descripcionCorta || i.provisional.descripcionLarga || i.provisional.caracteristicas) {
        r.conTextoProvisional++;
      }
    });

    return r;
  }

  NS.completitud = {
    REQUISITOS: REQUISITOS,
    REQUISITOS_EXIGIBLES: REQUISITOS_EXIGIBLES,
    MARCAS_PROVISIONALES: MARCAS_PROVISIONALES,
    esProvisional: esProvisional,
    estadoEditorial: estadoEditorial,
    evaluar: evaluar,
    resumir: resumir,
  };
})(window.ARENAS_CATALOGO);
