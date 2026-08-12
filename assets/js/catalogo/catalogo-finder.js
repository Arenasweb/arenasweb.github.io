/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-finder.js
   Lógica del buscador «Encuentra la moto para tu camino».

   POR QUÉ ES UN ARCHIVO APARTE, Y SIN NADA DE DOM
   Todo lo que decide QUÉ se muestra vive aquí: el predicado de
   filtrado, el ranking de sugerencias, qué pasos del asistente tienen
   sentido y qué tramos de precio existen. Nada de esto toca el
   documento, así que se carga tal cual en Node y se le hacen preguntas.
   La interfaz —el otro archivo— solo dibuja lo que este decide.

   UNA SOLA FUENTE DE VERDAD
   `coincide()` vive aquí y `catalogo-app.js` lo usa. No hay dos
   predicados que puedan separarse con el tiempo: el buscador directo,
   el asistente, el panel lateral y los chips preguntan todos a esta
   misma función.

   LÍMITE DEL CONTRATO ACTUAL
   Solo se usan campos que existen hoy: modelo, titulo, linea,
   categoria, subcategoria, colors[] y —cuando la publicación lo
   permite— precioPublico. No se inventa cilindrada, potencia,
   transmisión ni ninguna especificación técnica. Cuando el contrato
   crezca, los pasos nuevos se añaden aquí.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  /** Tope de caracteres de una consulta. Coincide con el de la URL. */
  var MAX_CONSULTA = 80;

  /** Sugerencias que se ofrecen como máximo. */
  var LIMITE_SUGERENCIAS = 6;

  /**
   * Cómo se le pregunta a alguien por el uso de su moto.
   *
   * El texto es editorial —es una pregunta, no un dato— pero el `slug`
   * apunta EXACTAMENTE a una de las cinco categorías aprobadas. No hay
   * usos que no correspondan a una categoría real, y no se inventan
   * tipos como «scooter» o «naked» que hoy no existen en el contrato.
   */
  var USOS = [
    { slug: "ciudad", texto: "Ciudad y recorridos diarios" },
    { slug: "trabajo", texto: "Trabajo y jornada" },
    { slug: "deportiva", texto: "Manejo deportivo" },
    { slug: "aventura", texto: "Ruta y aventura" },
    { slug: "carga", texto: "Carga y transporte" },
  ];

  /* ================================================================
     TEXTO
     ================================================================ */

  /**
   * Índice de búsqueda de un modelo.
   *
   * Incluye la categoría además de modelo, título, línea y
   * subcategoría: alguien que escribe «ciudad» está buscando algo real
   * y el catálogo tiene esa información. El resto del índice es el
   * mismo de siempre.
   */
  function indiceTexto(modelo) {
    if (!modelo) return "";
    return U.normalizarBusqueda(
      [modelo.modelo, modelo.titulo, modelo.linea, modelo.subcategoria, modelo.categoria]
        .filter(Boolean)
        .join(" ")
    );
  }

  /** Consulta lista para comparar: acotada, sin tildes y sin sobras. */
  function normalizarConsulta(valor) {
    return U.normalizarBusqueda(U.texto(valor, MAX_CONSULTA));
  }

  /* ================================================================
     PREDICADO DE FILTRADO — la única definición
     ================================================================ */

  /** ¿Este modelo cumple TODOS los criterios activos? */
  function coincide(modelo, criterios) {
    if (!modelo) return false;
    var c = criterios || {};

    if (c.categoria && modelo.categoria !== c.categoria) return false;
    if (c.linea && modelo.linea !== c.linea) return false;

    if (c.color) {
      var colores = modelo.colors || [];
      var tiene = false;
      for (var i = 0; i < colores.length; i++) {
        if (colores[i] && colores[i].slug === c.color) { tiene = true; break; }
      }
      if (!tiene) return false;
    }

    if (c.precio && !enTramo(modelo, c.precio)) return false;

    if (c.texto) {
      var busqueda = normalizarConsulta(c.texto);
      // Una consulta de solo espacios no filtra nada: normalizarla la
      // deja vacía y el catálogo se muestra entero, que es lo esperado.
      if (busqueda && indiceTexto(modelo).indexOf(busqueda) === -1) return false;
    }

    return true;
  }

  function filtrar(modelos, criterios) {
    if (!Array.isArray(modelos)) return [];
    return modelos.filter(function (m) { return coincide(m, criterios); });
  }

  /* ================================================================
     RANKING DE SUGERENCIAS
     ================================================================ */

  /**
   * Puntuación de una coincidencia. Mayor es mejor.
   *
   * Es determinista a propósito: la misma consulta sobre los mismos
   * datos produce siempre el mismo orden, sin puntuaciones difusas ni
   * bibliotecas externas. Y NO altera el orden del catálogo: solo
   * ordena la lista desplegable de sugerencias.
   *
   * @returns {number} 0 si no hay coincidencia
   */
  function puntuar(modelo, consulta) {
    if (!modelo || !consulta) return 0;

    var nombre = U.normalizarBusqueda(modelo.modelo || "");
    var titulo = U.normalizarBusqueda(modelo.titulo || "");
    var linea = U.normalizarBusqueda(modelo.linea || "");
    var categoria = U.normalizarBusqueda(modelo.categoria || "");
    var subcategoria = U.normalizarBusqueda(modelo.subcategoria || "");

    if (nombre === consulta || titulo === consulta) return 70;
    if (nombre.indexOf(consulta) === 0 || titulo.indexOf(consulta) === 0) return 60;
    if (linea === consulta) return 50;

    if (palabraEmpiezaPor(nombre, consulta) || palabraEmpiezaPor(titulo, consulta)) return 40;
    if (nombre.indexOf(consulta) !== -1 || titulo.indexOf(consulta) !== -1) return 30;
    if (linea.indexOf(consulta) !== -1) return 20;
    if (categoria.indexOf(consulta) !== -1 || subcategoria.indexOf(consulta) !== -1) return 10;

    return 0;
  }

  function palabraEmpiezaPor(frase, consulta) {
    var partes = frase.split(" ");
    for (var i = 0; i < partes.length; i++) {
      if (partes[i] && partes[i].indexOf(consulta) === 0) return true;
    }
    return false;
  }

  /**
   * Modelos que coinciden con la consulta, del más relevante al menos.
   * Los empates se rompen por orden editorial y después por nombre, así
   * que nunca depende del orden en que llegaron los datos.
   */
  function rankear(modelos, consulta) {
    var q = normalizarConsulta(consulta);
    if (!q || !Array.isArray(modelos)) return [];

    var salida = [];
    modelos.forEach(function (modelo, i) {
      var puntos = puntuar(modelo, q);
      if (puntos > 0) salida.push({ modelo: modelo, puntos: puntos, _i: i });
    });

    salida.sort(function (a, b) {
      if (a.puntos !== b.puntos) return b.puntos - a.puntos;
      var oa = typeof a.modelo.orden === "number" ? a.modelo.orden : 999;
      var ob = typeof b.modelo.orden === "number" ? b.modelo.orden : 999;
      if (oa !== ob) return oa - ob;
      var na = a.modelo.titulo || a.modelo.modelo || "";
      var nb = b.modelo.titulo || b.modelo.modelo || "";
      var porNombre = na.localeCompare(nb, "es", { sensitivity: "base" });
      if (porNombre !== 0) return porNombre;
      return a._i - b._i;
    });

    return salida.map(function (r) { return { modelo: r.modelo, puntos: r.puntos }; });
  }

  function sugerencias(modelos, consulta, limite) {
    var tope = typeof limite === "number" && limite > 0 ? limite : LIMITE_SUGERENCIAS;
    return rankear(modelos, consulta).slice(0, tope);
  }

  /* ================================================================
     OPCIONES DERIVADAS DE LOS DATOS
     Ninguna lista está escrita a mano. Si un dato no existe, su paso
     desaparece en vez de mostrarse vacío.
     ================================================================ */

  /** Usos que tienen al menos un modelo. */
  function usosDisponibles(modelos) {
    if (!Array.isArray(modelos)) return [];
    return USOS.filter(function (uso) {
      return modelos.some(function (m) { return m && m.categoria === uso.slug; });
    });
  }

  /** Líneas presentes en un conjunto, ordenadas y sin repetir. */
  function lineasDe(modelos) {
    if (!Array.isArray(modelos)) return [];
    var vistas = Object.create(null);
    var salida = [];
    modelos.forEach(function (m) {
      if (m && m.linea && !vistas[m.linea]) {
        vistas[m.linea] = true;
        salida.push({ valor: m.linea, texto: m.linea });
      }
    });
    return salida.sort(function (a, b) {
      return a.texto.localeCompare(b.texto, "es", { sensitivity: "base" });
    });
  }

  /**
   * Colores REALES presentes en un conjunto.
   * Salen de `modelo.colors[]`, que son variantes con fotografía
   * aprobada. Nunca de la lista de texto `colores`, que es informativa
   * y no tiene imagen que mostrar.
   */
  function coloresDe(modelos) {
    if (!Array.isArray(modelos)) return [];
    var vistos = Object.create(null);
    var salida = [];
    modelos.forEach(function (m) {
      (m && m.colors ? m.colors : []).forEach(function (color) {
        if (!color || !color.slug || vistos[color.slug]) return;
        vistos[color.slug] = true;
        salida.push({
          valor: color.slug,
          texto: color.nombre || color.slug,
          // El hexadecimal es decorativo: si no es válido se omite y la
          // opción sigue siendo utilizable por su nombre.
          hex: U.hexColor(color.hex) || "",
        });
      });
    });
    return salida.sort(function (a, b) {
      return a.texto.localeCompare(b.texto, "es", { sensitivity: "base" });
    });
  }

  /* ================================================================
     PRESUPUESTO
     ================================================================ */

  /** ¿Este modelo tiene un precio realmente publicable? */
  function precioPublicable(modelo) {
    return !!(modelo && modelo.mostrarPrecio === true &&
      typeof modelo.precioPublico === "number" &&
      isFinite(modelo.precioPublico) && modelo.precioPublico > 0);
  }

  /**
   * Tramos de precio derivados de los datos, nunca fijos.
   *
   * Devuelve [] —y el paso desaparece— si la configuración global no
   * permite precios o si no hay al menos dos importes distintos: un
   * «filtro» con un solo tramo no es una elección.
   *
   * Los cortes salen de los propios importes, no de una regla redonda,
   * para que ningún tramo quede vacío.
   */
  function rangosPrecio(modelos, config) {
    if (!config || config.mostrarPrecios !== true) return [];
    if (!Array.isArray(modelos)) return [];

    var precios = [];
    modelos.forEach(function (m) {
      if (precioPublicable(m)) precios.push(m.precioPublico);
    });
    if (precios.length < 2) return [];

    precios.sort(function (a, b) { return a - b; });
    var unicos = precios.filter(function (v, i) { return i === 0 || v !== precios[i - 1]; });
    if (unicos.length < 2) return [];

    var cortes = [];
    if (unicos.length >= 3) {
      cortes.push(unicos[Math.floor((unicos.length - 1) / 3)]);
      cortes.push(unicos[Math.floor(((unicos.length - 1) * 2) / 3)]);
    } else {
      cortes.push(unicos[0]);
    }
    // Un corte repetido produciría un tramo vacío.
    cortes = cortes.filter(function (v, i) { return cortes.indexOf(v) === i; });
    // El corte más alto no puede ser el máximo: dejaría «más de» vacío.
    cortes = cortes.filter(function (v) { return v < unicos[unicos.length - 1]; });
    if (!cortes.length) cortes = [unicos[0]];

    var tramos = [];
    var anterior = null;
    cortes.forEach(function (corte) {
      tramos.push(anterior === null
        ? { valor: "hasta-" + corte, texto: "Hasta " + U.precio(corte), max: corte }
        : { valor: anterior + "-" + corte, texto: U.precio(anterior) + " – " + U.precio(corte), min: anterior, max: corte });
      anterior = corte;
    });
    tramos.push({ valor: "desde-" + anterior, texto: "Más de " + U.precio(anterior), min: anterior });

    // Sólo se ofrecen los tramos que contienen algo.
    return tramos.filter(function (t) {
      return modelos.some(function (m) { return precioPublicable(m) && enTramo(m, t.valor); });
    });
  }

  /** ¿El precio de este modelo cae dentro del tramo indicado? */
  function enTramo(modelo, valorTramo) {
    if (!precioPublicable(modelo)) return false;
    var p = modelo.precioPublico;
    var m;
    if ((m = /^hasta-(\d+(?:\.\d+)?)$/.exec(valorTramo))) return p <= parseFloat(m[1]);
    if ((m = /^desde-(\d+(?:\.\d+)?)$/.exec(valorTramo))) return p > parseFloat(m[1]);
    if ((m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(valorTramo))) {
      return p > parseFloat(m[1]) && p <= parseFloat(m[2]);
    }
    return false;
  }

  /* ================================================================
     ASISTENTE
     ================================================================ */

  /**
   * Pasos que tienen sentido, dadas las respuestas ya dadas.
   *
   * Un paso solo aparece si de verdad ofrece una elección sobre el
   * conjunto que queda. Esto es lo que impide la pantalla de filtros
   * vacíos: si todos los candidatos son de la misma línea, preguntar
   * por la línea no aporta nada y el paso desaparece.
   *
   * @param {Object} estado estado del catálogo ya cargado
   * @param {Object} respuestas {categoria, linea, color, precio}
   */
  function pasos(estado, respuestas) {
    if (!estado || !Array.isArray(estado.modelos)) return [];
    var r = respuestas || {};
    var todos = estado.modelos;
    var lista = [];

    var usos = usosDisponibles(todos);
    if (usos.length >= 2) {
      lista.push({ id: "categoria", pregunta: "¿Dónde la usarás principalmente?", opciones: usos });
    }

    // A partir de aquí cada paso se calcula sobre lo que queda tras los
    // anteriores: preguntar por algo que ya no está disponible sería
    // llevar a alguien a cero resultados.
    var candidatos = filtrar(todos, { categoria: r.categoria });

    var lineas = lineasDe(candidatos);
    if (lineas.length >= 2) {
      lista.push({ id: "linea", pregunta: "¿Tienes alguna línea en mente?", opciones: lineas });
    }

    candidatos = filtrar(candidatos, { linea: r.linea });

    var colores = coloresDe(candidatos);
    if (colores.length >= 1) {
      lista.push({ id: "color", pregunta: "¿Hay algún color que prefieras?", opciones: colores });
    }

    candidatos = filtrar(candidatos, { color: r.color });

    var tramos = rangosPrecio(candidatos, estado.config);
    if (tramos.length >= 2) {
      lista.push({ id: "precio", pregunta: "¿Qué presupuesto tienes en mente?", opciones: tramos });
    }

    return lista;
  }

  /** Respuestas del asistente convertidas en criterios del catálogo. */
  function criteriosDe(respuestas) {
    var r = respuestas || {};
    return {
      categoria: r.categoria || "",
      linea: r.linea || "",
      color: r.color || "",
      precio: r.precio || "",
    };
  }

  /**
   * Por qué este modelo aparece entre los resultados.
   *
   * Se explica la coincidencia, no se afirma superioridad: ARENAS no
   * puede decir que una moto sea «la mejor» ni «ideal» con los datos
   * que hay. Cada motivo se corresponde con un criterio que la persona
   * eligió.
   */
  function motivos(modelo, criterios, estado) {
    var c = criterios || {};
    var salida = [];
    if (!modelo) return salida;

    if (c.categoria && modelo.categoria === c.categoria) {
      var uso = null;
      for (var i = 0; i < USOS.length; i++) {
        if (USOS[i].slug === c.categoria) { uso = USOS[i]; break; }
      }
      var titulo = estado && NS.data && NS.data.tituloCategoria
        ? NS.data.tituloCategoria(estado, c.categoria)
        : c.categoria;
      salida.push("Coincide con " + (uso ? uso.texto.toLowerCase() : titulo));
    }
    if (c.linea && modelo.linea === c.linea) {
      salida.push("Pertenece a la línea " + modelo.linea);
    }
    if (c.color) {
      var nombre = "";
      (modelo.colors || []).forEach(function (color) {
        if (color && color.slug === c.color) nombre = color.nombre || color.slug;
      });
      if (nombre) salida.push("Disponible en color " + nombre);
    }
    if (c.precio && enTramo(modelo, c.precio)) {
      salida.push("Dentro del presupuesto indicado");
    }
    return salida;
  }

  /* ================================================================
     EXPORTACIÓN
     ================================================================ */

  NS.finder = {
    MAX_CONSULTA: MAX_CONSULTA,
    LIMITE_SUGERENCIAS: LIMITE_SUGERENCIAS,
    USOS: USOS,
    indiceTexto: indiceTexto,
    normalizarConsulta: normalizarConsulta,
    coincide: coincide,
    filtrar: filtrar,
    puntuar: puntuar,
    rankear: rankear,
    sugerencias: sugerencias,
    usosDisponibles: usosDisponibles,
    lineasDe: lineasDe,
    coloresDe: coloresDe,
    precioPublicable: precioPublicable,
    rangosPrecio: rangosPrecio,
    enTramo: enTramo,
    pasos: pasos,
    criteriosDe: criteriosDe,
    motivos: motivos,
  };
})(window.ARENAS_CATALOGO);
