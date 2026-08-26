/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-utils.js
   Utilidades puras del subsistema de catálogo: saneamiento de valores,
   validación de rutas, helpers de DOM y formato.

   Este archivo no toca datos ni interfaz: solo transforma valores.
   Se carga como script clásico (sin módulos ES) para mantener la
   compatibilidad con el resto del sitio y con GitHub Pages.

   Regla transversal: TODO texto que provenga de la fuente de datos
   pasa por texto() antes de llegar al DOM, y siempre se inserta con
   textContent. En este subsistema no se usa innerHTML en ningún punto.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  /**
   * Dominios externos autorizados para imágenes o enlaces.
   * Deliberadamente vacío: hoy solo se aceptan rutas relativas del
   * propio repositorio. Añadir un host aquí es una decisión explícita.
   */
  var DOMINIOS_AUTORIZADOS = [];

  /** Prefijos de ruta relativa permitidos dentro del repositorio. */
  var PREFIJOS_LOCALES = ["assets/", "data/", "legales/"];

  /** Hostnames considerados entorno de desarrollo local. */
  var HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1", "[::1]", ""];

  /** Valores textuales que representan verdadero en una hoja de cálculo. */
  var VERDADEROS = ["true", "verdadero", "si", "sí", "yes", "x", "1"];

  /* ---------------- Saneamiento de valores ---------------- */

  /**
   * Texto plano seguro: sin etiquetas, sin saltos de línea y acotado.
   * @param {*} valor
   * @param {number} [maximo=240]
   * @returns {string} cadena vacía si el valor no es utilizable
   */
  function texto(valor, maximo) {
    if (valor === null || valor === undefined || typeof valor === "object") return "";
    if (typeof valor === "number" && !isFinite(valor)) return "";
    return String(valor)
      .replace(/<[^>]*>/g, " ")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, typeof maximo === "number" ? maximo : 240);
  }

  /**
   * Texto largo: conserva los saltos de párrafo pero elimina marcado.
   * @param {*} valor
   * @param {number} [maximo=2000]
   * @returns {string}
   */
  function textoLargo(valor, maximo) {
    if (valor === null || valor === undefined || typeof valor === "object") return "";
    return String(valor)
      .replace(/<[^>]*>/g, " ")
      .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, typeof maximo === "number" ? maximo : 2000);
  }

  /**
   * Importe positivo o null. Nunca devuelve NaN, 0, negativo ni Infinity.
   *
   * Solo se aceptan formatos SIN AMBIGÜEDAD, con el punto como separador
   * decimal:
   *
   *     12990          ✓        12990,50       ✗  ¿12 990,50 o 1 299 050?
   *     12990.50       ✓        12.990,50      ✗  formato europeo
   *     S/ 12,990.00   ✓        1,23           ✗  coma fuera de millar
   *
   * Antes se borraba todo lo que no fuera dígito o punto, de modo que
   * "12990,50" se leía como 1 299 050 —cien veces más— y se publicaba
   * sin ningún aviso. Un formato ambiguo devuelve null y el precio no se
   * muestra: es preferible no enseñar precio a enseñar uno equivocado.
   *
   * Esta regla es idéntica a normNumero_() del backend, y hay una
   * prueba de equivalencia que compara ambas.
   */
  var PRECIO_TEXTO = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;

  function numero(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (typeof valor === "number") return isFinite(valor) && valor > 0 ? valor : null;
    if (typeof valor !== "string") return null;

    var limpio = valor.replace(/^\s*(?:S\/\.?|PEN|USD|\$)\s*/i, "").trim();
    if (!PRECIO_TEXTO.test(limpio)) return null;

    var n = parseFloat(limpio.replace(/,/g, ""));
    return isFinite(n) && n > 0 ? n : null;
  }

  /** Entero con valor por defecto; útil para el campo `orden`. */
  function entero(valor, porDefecto) {
    var n = typeof valor === "number" ? valor : parseInt(String(valor), 10);
    return isFinite(n) ? Math.trunc(n) : porDefecto;
  }

  /**
   * Booleano tolerante con lo que escribe una persona en una hoja.
   * Cualquier cosa que no sea explícitamente verdadera es falsa: el
   * valor por defecto seguro es "no publicar".
   */
  function booleano(valor) {
    if (valor === true) return true;
    if (typeof valor === "number") return valor === 1;
    if (typeof valor !== "string") return false;
    return VERDADEROS.indexOf(valor.trim().toLowerCase()) !== -1;
  }

  /**
   * Lista de cadenas cortas a partir de un array o de un texto separado
   * por comas / punto y coma / barras verticales.
   */
  function lista(valor, maximo) {
    var tope = typeof maximo === "number" ? maximo : 10;
    var bruto;
    if (Array.isArray(valor)) bruto = valor;
    else if (typeof valor === "string") bruto = valor.split(/[,;|]/);
    else return [];

    var salida = [];
    for (var i = 0; i < bruto.length && salida.length < tope; i++) {
      var t = texto(bruto[i], 60);
      if (t && salida.indexOf(t) === -1) salida.push(t);
    }
    return salida;
  }

  /** Convierte un nombre comercial en un slug estable para la URL. */
  function slugificar(valor) {
    return texto(valor, 120)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  /** Un slug recibido desde la URL debe cumplir exactamente este formato. */
  function slugValido(valor) {
    return typeof valor === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor) && valor.length <= 80;
  }

  /* ---------------- Validación de rutas ---------------- */

  function esquemaPeligroso(url) {
    return /^\s*(javascript|data|vbscript|file|blob|about):/i.test(url);
  }

  function hostAutorizado(url) {
    for (var i = 0; i < DOMINIOS_AUTORIZADOS.length; i++) {
      var d = DOMINIOS_AUTORIZADOS[i];
      if (url.indexOf("https://" + d + "/") === 0) return true;
    }
    return false;
  }

  /**
   * Ruta de imagen utilizable.
   * Solo admite rutas relativas dentro de los prefijos del repositorio o
   * HTTPS de un dominio explícitamente autorizado. Devuelve "" en
   * cualquier otro caso — incluidas rutas de Windows y protocolos activos.
   * @returns {string} ruta segura o cadena vacía
   */
  function rutaImagen(valor) {
    var url = texto(valor, 300);
    if (!url) return "";
    if (esquemaPeligroso(url)) return "";
    if (/[<>"'\\]/.test(url)) return "";
    if (url.indexOf("//") === 0) return "";
    if (url.indexOf("..") !== -1) return "";

    for (var i = 0; i < PREFIJOS_LOCALES.length; i++) {
      if (url.indexOf(PREFIJOS_LOCALES[i]) === 0 && /^[A-Za-z0-9._/-]+$/.test(url)) return url;
    }
    if (hostAutorizado(url)) return url;
    return "";
  }

  /**
   * Enlace utilizable: ancla interna, página del propio sitio (con
   * cadena de consulta simple) o HTTPS autorizado.
   */
  function enlace(valor) {
    var url = texto(valor, 300);
    if (!url) return "";
    if (esquemaPeligroso(url)) return "";
    if (/[<>"'\\]/.test(url)) return "";
    if (url.indexOf("//") === 0) return "";
    if (url.indexOf("..") !== -1) return "";

    if (/^#[A-Za-z0-9_-]+$/.test(url)) return url;
    if (/^[A-Za-z0-9._/-]+\.html(\?[A-Za-z0-9=&_-]*)?(#[A-Za-z0-9_-]+)?$/.test(url)) return url;
    if (hostAutorizado(url)) return url;
    return "";
  }

  /**
   * Punto focal para object-position. Solo se aceptan palabras clave y
   * porcentajes de 0 a 100; cualquier otra cosa cae al centro.
   *
   * El tope de 100 % no es cosmético. La expresión anterior admitía hasta
   * tres dígitos, así que un "999%" tecleado en la hoja pasaba el filtro:
   * no es inyección —solo hay dígitos y el signo—, pero desplaza la
   * fotografía fuera de la caja y deja la tarjeta aparentemente vacía,
   * sin ningún mensaje que explique por qué. Es preferible ignorar el
   * valor y encuadrar al centro.
   */
  var PORCENTAJE = "(?:100|[0-9]{1,2})%";
  // En la sintaxis de dos valores de object-position el primero es el eje
  // horizontal y el segundo el vertical. Con una sola lista de palabras
  // pasaban combinaciones que CSS no admite —"top bottom", "left right"—
  // y que el navegador descarta en silencio, dejando un encuadre
  // distinto del que se creía haber puesto.
  var FOCO_X = "left|center|right";
  var FOCO_Y = "top|center|bottom";
  var FOCO_UNO = new RegExp("^(?:" + FOCO_X + "|" + FOCO_Y + "|" + PORCENTAJE + ")$");
  var FOCO_DOS = new RegExp(
    "^(?:" + FOCO_X + "|" + PORCENTAJE + ")\\s+(?:" + FOCO_Y + "|" + PORCENTAJE + ")$"
  );

  function foco(valor) {
    var v = texto(valor, 40).toLowerCase();
    if (!v) return "center center";
    if (v.indexOf(" ") === -1) return FOCO_UNO.test(v) ? v : "center center";
    return FOCO_DOS.test(v) ? v : "center center";
  }

  /**
   * Color hexadecimal seguro para una muestra de color.
   * Solo se admite la notación #RGB o #RRGGBB. Se rechaza cualquier otra
   * cosa —nombres CSS, rgb(), var(), expresiones— porque este valor
   * termina en una propiedad de estilo: es el único punto del subsistema
   * donde un dato de la hoja toca CSS, y por eso el formato es cerrado.
   * @returns {string} hex normalizado en minúsculas, o cadena vacía
   */
  function hexColor(valor) {
    var v = texto(valor, 12);
    if (!v) return "";
    if (v.charAt(0) !== "#") v = "#" + v;
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return "";
    return v.toLowerCase();
  }

  /** ¿El sistema pide reducir el movimiento? */
  function movimientoReducido() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }

  /* ---------------- Formato ---------------- */

  /**
   * Precio público. Devuelve "" si no hay un importe positivo real, de
   * modo que la interfaz nunca imprima 0, NaN, null ni "undefined".
   *
   * El separador de miles lo pone toLocaleString, que ya es Intl por
   * dentro. El símbolo se antepone a mano y no por
   * `Intl.NumberFormat({style:"currency"})` a propósito: con la moneda
   * USD y el idioma es-PE, esa API devuelve «USD 1,200» en vez de
   * «$ 1,200», que es lo que espera quien lee esta web. Con PEN ambas
   * coinciden, así que la única diferencia real habría sido a peor.
   *
   * El espacio SÍ es duro ( ): impide que el símbolo se quede solo
   * al final de una línea, separado de su importe.
   */
  function precio(valor, moneda) {
    var n = numero(valor);
    if (n === null) return "";
    var simbolo = moneda === "USD" ? "$" : "S/";
    return simbolo + " " + n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
  }

  /* ---------------- Entorno y URL ---------------- */

  /**
   * ¿Estamos en un entorno de desarrollo local?
   * Se usa para decidir si `?preview=1` puede mostrar contenido inactivo.
   * En GitHub Pages o cualquier dominio público devuelve false.
   */
  function entornoLocal() {
    var h = (window.location && window.location.hostname) || "";
    if (HOSTS_LOCALES.indexOf(h) !== -1) return true;
    return /\.localhost$/.test(h);
  }

  /**
   * Lee un parámetro de la URL ya saneado. Nunca devuelve el valor bruto:
   * el llamador recibe texto plano acotado, listo para comparar.
   */
  function paramUrl(nombre, maximo) {
    try {
      var params = new URLSearchParams(window.location.search);
      return texto(params.get(nombre), typeof maximo === "number" ? maximo : 80);
    } catch (e) {
      return "";
    }
  }

  /* ---------------- DOM ---------------- */

  /** Atributos que jamás se asignan desde un helper genérico. */
  function atributoProhibido(nombre) {
    return /^on/i.test(nombre) || nombre === "srcdoc" || nombre === "style";
  }

  /**
   * Atributos que apuntan a un recurso. Con valor vacío no deben
   * escribirse: un src="" provoca una petición a la propia página.
   */
  var ATRIBUTOS_URL = ["src", "href", "srcset", "action", "poster"];

  /**
   * createElement con atributos y texto. `src`, `href` y `srcset` deben
   * llegar ya validados por rutaImagen()/enlace(): si llegan vacíos, el
   * atributo simplemente no se escribe.
   *
   * La cadena vacía SÍ se escribe en el resto de atributos, porque en
   * varios es significativa: value="" identifica la opción «todas» de un
   * <select> y alt="" marca una imagen decorativa.
   */
  function el(etiqueta, atributos, contenido) {
    var nodo = document.createElement(etiqueta);
    if (atributos) {
      Object.keys(atributos).forEach(function (clave) {
        var valor = atributos[clave];
        if (valor === null || valor === undefined || valor === false) return;
        if (valor === "" && ATRIBUTOS_URL.indexOf(clave) !== -1) return;
        if (atributoProhibido(clave)) return;
        nodo.setAttribute(clave, valor === true ? "" : String(valor));
      });
    }
    if (contenido !== null && contenido !== undefined && contenido !== "") {
      nodo.textContent = String(contenido);
    }
    return nodo;
  }

  /** Vacía un nodo sin usar innerHTML. */
  function vaciar(nodo) {
    if (!nodo) return;
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  }

  /** Retrasa la ejecución hasta que el usuario deja de escribir. */
  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments;
      var ctx = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  /** Normaliza texto para búsqueda: minúsculas y sin tildes. */
  function normalizarBusqueda(valor) {
    return texto(valor, 200)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * Parte «Motor FI: 249.1 cc · 24.2 HP» en rótulo y valor.
   *
   * Las características llegan de la hoja como una sola cadena. En crudo
   * se leen como lista de la compra; partidas, se pueden maquetar como
   * dato. Vive aquí porque la usan la ficha y la tarjeta: dos copias se
   * separan a la primera.
   *
   * Sin dos puntos NO se inventa un rótulo. Poner «Dato:» delante sería
   * relleno, y un hueco declarado se lee mejor que un relleno.
   */
  function partirDato(valor) {
    var t = texto(valor, 200);
    var i = t.indexOf(":");
    if (i === -1) return { etiqueta: "", valor: t };
    return { etiqueta: t.slice(0, i).trim(), valor: t.slice(i + 1).trim() };
  }

  NS.utils = {
    DOMINIOS_AUTORIZADOS: DOMINIOS_AUTORIZADOS,
    texto: texto,
    textoLargo: textoLargo,
    numero: numero,
    entero: entero,
    booleano: booleano,
    lista: lista,
    slugificar: slugificar,
    slugValido: slugValido,
    rutaImagen: rutaImagen,
    enlace: enlace,
    foco: foco,
    hexColor: hexColor,
    movimientoReducido: movimientoReducido,
    precio: precio,
    entornoLocal: entornoLocal,
    paramUrl: paramUrl,
    el: el,
    vaciar: vaciar,
    debounce: debounce,
    normalizarBusqueda: normalizarBusqueda,
    partirDato: partirDato,
  };
})(window.ARENAS_CATALOGO);
