/**
 * ARENAS MOTOCICLETAS — script.js
 * Núcleo funcional base. Vanilla JS, sin frameworks ni librerías externas.
 *
 * MÓDULOS:
 *   1. CONFIG              — constantes globales y referencia a configuracion.json
 *   2. DOM helpers         — selectores reutilizables
 *   3. WhatsApp helpers    — generación de mensajes y URLs
 *   4. Config / slots      — carga de configuracion.json y data/slots/*.json
 *   5. Datos pendientes    — señalización de contenido no confirmado
 *   8. Stores render       — renderizar sedes desde configuracion.json
 *   9. Motion observer     — IntersectionObserver para reveals
 *  10. Form handling       — validación y envío del formulario
 *  11. Nav mobile          — menú hamburguesa en móvil
 *  12. Footer year         — año actual en footer
 *  13. Analytics           — placeholders de eventos
 *  14. Init                — orquestación de arranque
 *
 * EL CATÁLOGO NO VIVE AQUÍ. Su capa de datos, su esquema, sus tarjetas y
 * sus controladores están en assets/js/catalogo/, porque los comparten
 * index.html, catalogo.html y modelo.html. Este archivo solo se carga en
 * la portada. Ver docs/catalogo-modelos-web.md.
 */


/* ================================================================
   MÓDULO 1: CONFIG
   NOTA: número de WhatsApp provisional — cambiar en configuracion.json
   ================================================================ */

const CONFIG = {
  whatsapp:       "PENDIENTE",      // valor de arranque — cargarConfiguracion() lo sobrescribe con data/configuracion.json → whatsapp. whatsappConfirmado() bloquea cualquier enlace mientras no haya aprobación, independientemente de este valor.
  // El catálogo ya no se carga desde aquí: su origen y su fallback los
  // gestiona assets/js/catalogo/catalogo-data.js (CONFIG.rutaLocal),
  // compartido por index.html, catalogo.html y modelo.html.
  configPath:     "data/configuracion.json",
  slotsPath:      "data/slots",     // carpeta de slots editables
  slotsArchivos: [
    "hero", "empresa", "whatsapp", "sedes", "financiamiento",
    "beneficios", "servicio-tecnico", "promociones", "testimonios",
    "legales", "seo", "ui-placeholders", "control",
  ],
  revealThreshold: 0.12,           // % de visibilidad para activar reveal
  revealClass:    "is-visible",    // clase que activa la animación CSS
  maxFiltros:     3,               // máximo de filtros activos simultáneos
  modeloDestacadoId: "PENDIENTE",   // valor de arranque — cargarConfiguracion() lo sobrescribe con data/configuracion.json → modeloDestacadoId. El id real es dato de catálogo administrado desde Google Sheets; con PENDIENTE no hay coincidencia y la sección destacada conserva su estado neutro.
};

// Estado global de la app (mutable durante sesión)
const STATE = {
  catalogo:    [],
  config:      {},
  slots:       {},   // contenido de data/slots/*.json, una clave por archivo
  filtroActivo: { linea: "", uso: "", cilindrada: "" },
};


/* ================================================================
   MÓDULO 2: DOM HELPERS
   ================================================================ */

/** Selector único — retorna null si no existe */
const $ = (selector, context = document) => context.querySelector(selector);

/** Selector múltiple — retorna NodeList */
const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * Crea un elemento con atributos opcionales. A propósito NO acepta un
 * parámetro de HTML genérico (eliminado tras la auditoría de segunda
 * vuelta): todo el contenido textual debe asignarse con .textContent
 * en el código llamante, nunca con innerHTML de datos editables.
 */
function createElement(tag, attrs = {}) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  });
  return el;
}

/** Vacía el contenido de un elemento usando la API de nodos (sin innerHTML) */
function clearElement(el) {
  if (el) el.replaceChildren();
}


/* ================================================================
   MÓDULO 3: WHATSAPP HELPERS
   ================================================================ */

/**
 * Genera el texto del mensaje para WhatsApp según el modelo y contexto.
 * @param {string} modelo    - nombre del modelo de interés
 * @param {string} extra     - información adicional (ej: nombre del cliente)
 * @returns {string}
 */
function crearMensajeWhatsApp(modelo = "una moto", extra = "") {
  const base = `Hola ARENAS MOTOCICLETAS, estoy interesado/a en *${modelo}*. Me gustaría recibir una cotización y más información, por favor.`;
  return extra ? `${base}\n\n${extra}` : base;
}

/**
 * Construye la URL completa de WhatsApp con mensaje codificado.
 * Autodefensa: devuelve "" si el canal no está confirmado por gerencia o si
 * el número es un placeholder (PENDIENTE/vacío/sin dígitos suficientes) —
 * ningún llamador debe poder generar un wa.me con datos no aprobados,
 * aunque olvide su propio gate.
 * @param {string} mensaje
 * @param {string} numero  - número con código de país, sin espacios ni guiones
 * @returns {string} URL de wa.me, o "" si el canal no está aprobado
 */
function buildWhatsAppURL(mensaje, numero = CONFIG.whatsapp) {
  if (!whatsappConfirmado()) return "";
  const clean = typeof numero === "string" ? numero.replace(/\D/g, "") : "";
  if (clean.length < 9) return ""; // placeholder, vacío o número incompleto
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Indica si el número de WhatsApp ya fue confirmado por gerencia.
 * Mientras sea false, ningún flujo debe abrir un chat real con el
 * número placeholder — ver data/configuracion.json → whatsappConfirmado.
 * @returns {boolean}
 */
function whatsappConfirmado() {
  return Boolean(STATE.config && STATE.config.whatsappConfirmado === true);
}

/**
 * Muestra un aviso temporal (toast) cuando se intenta usar un canal
 * de WhatsApp que aún no está confirmado, en vez de abrir un chat falso.
 */
function mostrarAvisoWhatsAppPendiente() {
  const mensaje =
    (STATE.slots &&
      STATE.slots["ui-placeholders"] &&
      STATE.slots["ui-placeholders"].mensajesEstadoPendiente &&
      STATE.slots["ui-placeholders"].mensajesEstadoPendiente.whatsappNoConfirmado) ||
    "Estamos validando este canal de WhatsApp. Por favor inténtalo más tarde o usa el formulario de cotización.";

  let toast = document.getElementById("aviso-toast");
  if (!toast) {
    toast = createElement("div", {
      id: "aviso-toast",
      class: "aviso-toast",
      role: "status",
      "aria-live": "polite",
    });
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.classList.add("is-visible");
  clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove("is-visible"), 4500);

  trackEvent("whatsapp_bloqueado_pendiente", {});
}

/**
 * Marca visualmente como deshabilitados los botones/enlaces de WhatsApp
 * mientras el número no esté confirmado (no los elimina, solo los marca).
 * Debe llamarse después de cargarConfiguracion() y tras cada re-render
 * que agregue nuevos elementos de WhatsApp al DOM.
 */
function aplicarEstadoWhatsApp() {
  const confirmado = whatsappConfirmado();
  $$('a[href*="wa.me"], .btn-whatsapp, [data-accion="whatsapp"]').forEach((el) => {
    if (confirmado) {
      el.removeAttribute("aria-disabled");
    } else {
      el.setAttribute("aria-disabled", "true");
    }
  });
}

/**
 * Abre WhatsApp en nueva pestaña con mensaje predefinido para un modelo.
 * No abre nada si el número aún no está confirmado por gerencia.
 * @param {string} modelo
 */
function consultarPorWhatsApp(modelo) {
  if (!whatsappConfirmado()) {
    mostrarAvisoWhatsAppPendiente();
    return;
  }
  const mensaje = crearMensajeWhatsApp(modelo);
  const url     = buildWhatsAppURL(mensaje);
  if (!url) { mostrarAvisoWhatsAppPendiente(); return; } // número placeholder/no aprobado
  window.open(url, "_blank", "noopener,noreferrer");
  trackEvent("whatsapp_click", { modelo });
}

/**
 * Abre WhatsApp con un mensaje general (contacto directo, no atado a un
 * modelo específico). Usada por el botón "Abrir WhatsApp" del aside de
 * cotización, que a propósito NO tiene href en el HTML — el enlace real
 * solo se construye aquí, en memoria, y solo si whatsappConfirmado() es true.
 */
function abrirWhatsAppGeneral() {
  if (!whatsappConfirmado()) {
    mostrarAvisoWhatsAppPendiente();
    return;
  }
  const mensajePredefinido =
    STATE.slots &&
    STATE.slots.whatsapp &&
    STATE.slots.whatsapp.mensajesPredefinidos &&
    STATE.slots.whatsapp.mensajesPredefinidos.ventas;

  const mensaje = mensajePredefinido || crearMensajeWhatsApp();
  const url     = buildWhatsAppURL(mensaje);
  if (!url) { mostrarAvisoWhatsAppPendiente(); return; } // número placeholder/no aprobado
  window.open(url, "_blank", "noopener,noreferrer");
  trackEvent("whatsapp_click", { origen: "contacto_directo" });
}

/**
 * Conecta el botón de contacto directo del aside de cotización.
 * Es un <button> sin href (no un <a href="wa.me/...">) precisamente para
 * que nunca exista en el HTML un enlace de WhatsApp con número placeholder.
 */
function inicializarWhatsAppDirecto() {
  const btn = $("#btn-whatsapp-directo");
  if (!btn) return;
  btn.addEventListener("click", abrirWhatsAppGeneral);
}

// Intercepta cualquier enlace directo a wa.me que pudiera existir en el DOM
// (defensa en profundidad — hoy no debería haber ninguno en el HTML estático)
// mientras el número no esté confirmado. Delegación de eventos: funciona
// también con enlaces añadidos dinámicamente más adelante.
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href*="wa.me"]');
  if (link && !whatsappConfirmado()) {
    e.preventDefault();
    mostrarAvisoWhatsAppPendiente();
  }
});


/* ================================================================
   MÓDULO 3b: ESQUEMA Y VALIDACIÓN DE DATOS
   Valida forma y seguridad de los datos antes de usarlos para
   renderizar. Nunca rompe el sitio: los registros inválidos se
   descartan (con warning en consola) en vez de detener el render.

   Esto también prepara el terreno para una futura fuente remota
   (Google Sheets) — cualquier dato externo deberá pasar por estos
   mismos validadores antes de mostrarse. Ver
   docs/contrato-datos-google-sheets.md. NO se conecta Google Sheets
   todavía: el JSON local sigue siendo la única fuente de datos.
   ================================================================ */

/** Dominios externos permitidos para enlaces generados desde datos editables */
const DOMINIOS_PERMITIDOS = [
  "maps.google.com",
  "www.google.com",
  "goo.gl",
  "wa.me",
  "api.whatsapp.com",
];

/**
 * Verifica que una URL sea HTTPS y pertenezca a un dominio autorizado.
 * Se usa antes de insertar cualquier href que provenga de un JSON editable
 * (ej. sede.googleMapsUrl) — nunca se confía en la URL "tal cual".
 * @param {string} url
 * @returns {boolean}
 */
function esURLExternaSegura(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol !== "https:") return false;
    return DOMINIOS_PERMITIDOS.some(
      (dominio) => parsed.hostname === dominio || parsed.hostname.endsWith(`.${dominio}`)
    );
  } catch {
    return false;
  }
}

/**
 * Verifica que una ruta de asset (imagen, ficha técnica, foto de sede)
 * sea una ruta local segura bajo assets/ — nunca un recurso externo ni
 * una ruta absoluta o con path traversal. Usada antes de insertar
 * cualquier src/href que provenga de un JSON editable.
 *
 * Reglas:
 *  - rechaza protocolo o protocolo-relativo (http://, https://, //...)
 *  - rechaza rutas absolutas del dominio (que empiecen con "/")
 *  - rechaza cualquier ".." (path traversal)
 *  - exige que la ruta empiece exactamente con "assets/"
 *
 * @param {string} ruta
 * @returns {boolean}
 */
function esRutaLocalSegura(ruta) {
  if (typeof ruta !== "string" || !ruta.trim()) return false;
  const limpia = ruta.trim();
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(limpia)) return false; // protocolo o //externo
  if (limpia.startsWith("/")) return false;                    // ruta absoluta del dominio
  if (limpia.includes("..")) return false;                     // path traversal
  return limpia.startsWith("assets/");
}

/**
 * Verifica que un teléfono solo contenga caracteres válidos
 * (dígitos, espacios, +, guiones, paréntesis) antes de usarlo en un
 * href="tel:" — evita inyectar otros esquemas de URL vía datos editables.
 * @param {string} valor
 * @returns {boolean}
 */
function esTelefonoSeguro(valor) {
  return typeof valor === "string" && /^[+\d][\d\s().-]{5,19}$/.test(valor.trim());
}

/**
 * Estados de aprobación normalizados — únicos valores que el sitio
 * reconoce para decidir si algo se publica. Cualquier estado extendido
 * o legado (ej. "pendiente-confirmacion-gerencial",
 * "pendiente-confirmar-existencia", "pendiente-aprobacion-gerencial",
 * "confirmado") se reduce a uno de estos cuatro antes de evaluarse.
 * Ver docs/control-publicacion-datos.md.
 */
const ESTADOS_APROBACION_VALIDOS = ["pendiente", "aprobado", "rechazado", "oculto"];

/**
 * Normaliza cualquier valor de estadoAprobacion (incluyendo estados
 * extendidos/legado o desconocidos) a uno de ESTADOS_APROBACION_VALIDOS.
 * Por diseño, todo lo que no sea exactamente "aprobado", "rechazado" u
 * "oculto" se trata como "pendiente" — el valor más conservador, que
 * nunca permite publicar un dato como confirmado.
 * @param {*} valor
 * @returns {"pendiente"|"aprobado"|"rechazado"|"oculto"}
 */
function normalizarEstadoAprobacion(valor) {
  const limpio = String(valor || "").trim().toLowerCase();
  return ESTADOS_APROBACION_VALIDOS.includes(limpio) ? limpio : "pendiente";
}

const ESQUEMA_SEDE = {
  id: "string", nombre: "string", direccion: "string",
  telefono: "string", whatsapp: "string",
  googleMapsUrl: "string", horario: "string",
  estadoAprobacion: "string",
};

const ESQUEMA_PROMOCION = {
  modelo: "string", titulo: "string", descripcion: "string",
  vigencia: "string", visible: "boolean", estadoAprobacion: "string",
};

const ESQUEMA_WHATSAPP_SLOT = {
  whatsappGeneral: "string", whatsappVentas: "string",
  whatsappFinanciamiento: "string", whatsappServicioTecnico: "string",
  estadoAprobacion: "string",
};

const ESQUEMA_SEO_SLOT = {
  title: "string", description: "string", keywords: "string",
  ogTitle: "string", ogDescription: "string", ogImage: "string",
  canonicalUrl: "string",
};

/** Contrato local equivalente a la futura pestaña 99_CONTROL */
const ESQUEMA_CONTROL_SLOT = {
  modoDatos: "string",
  googleSheetsConectado: "boolean",
  appsScriptEndpoint: "string",
  fallbackLocal: "boolean",
  permitirDatosPendientes: "boolean",
  mostrarPreciosPendientes: "boolean",
  mostrarWhatsappPendiente: "boolean",
  mostrarPromocionesPendientes: "boolean",
  mostrarGarantiaNoConfirmada: "boolean",
  mostrarFinanciamientoNoConfirmado: "boolean",
  ultimaRevisionGerencial: "string",
};

/**
 * Campos obligatorios por dominio — sin estos, el registro no se puede
 * identificar ni renderizar de forma confiable. Pensado para que un
 * futuro exportador de Google Sheets (Apps Script) sepa exactamente
 * qué columnas no pueden quedar vacías. Ver docs/contrato-datos-google-sheets.md.
 */
const CAMPOS_REQUERIDOS_MOTO = ["id", "linea", "modelo", "visible"];
const CAMPOS_REQUERIDOS_SEDE = ["id", "nombre", "estadoAprobacion"];
const CAMPOS_REQUERIDOS_PROMOCION = ["modelo", "titulo", "visible", "estadoAprobacion"];
const CAMPOS_REQUERIDOS_SEO = ["title", "description", "canonicalUrl"];

/**
 * Valida un objeto contra un esquema simple de tipos esperados.
 * Solo revisa los campos presentes en el esquema; campos ausentes se
 * toleran (se consideran opcionales) y campos extra se ignoran.
 * @returns {string[]} lista de errores (vacía si el objeto es válido)
 */
function validarContraEsquema(objeto, esquema, etiqueta) {
  if (!objeto || typeof objeto !== "object") {
    return [`${etiqueta}: el registro no es un objeto válido`];
  }
  const errores = [];
  Object.entries(esquema).forEach(([campo, tipoEsperado]) => {
    if (!(campo in objeto)) return;
    const valor = objeto[campo];
    const tipoReal = Array.isArray(valor) ? "array" : typeof valor;
    if (tipoReal !== tipoEsperado) {
      errores.push(`${etiqueta}: campo "${campo}" debería ser ${tipoEsperado}, llegó ${tipoReal}`);
    }
  });
  return errores;
}

/**
 * Valida que un objeto tenga presentes (y no vacíos) los campos
 * obligatorios de su dominio. Complementa a validarContraEsquema(),
 * que solo revisa tipos de los campos que SÍ están presentes.
 * @returns {string[]} lista de errores (vacía si no falta nada)
 */
function validarCamposRequeridos(objeto, camposRequeridos, etiqueta) {
  if (!objeto || typeof objeto !== "object") return [];
  return camposRequeridos
    .filter((campo) => {
      const valor = objeto[campo];
      return valor === undefined || valor === null || valor === "";
    })
    .map((campo) => `${etiqueta}: falta campo obligatorio "${campo}"`);
}

/**
 * Reglas de consistencia que van más allá del tipo de dato: detectan
 * estados contradictorios que un esquema de tipos no puede capturar
 * (ej. un precio marcado como confirmado pero sin valor real).
 * @returns {string[]} lista de errores (vacía si es consistente)
 */
function validarConsistenciaSede(sede) {
  const errores = [];
  const aprobada = normalizarEstadoAprobacion(sede.estadoAprobacion) === "aprobado";
  const direccionPendiente = !sede.direccion || /^pendiente$/i.test(String(sede.direccion).trim());
  if (aprobada && direccionPendiente) {
    errores.push(`sede:${sede.id}: estadoAprobacion="${sede.estadoAprobacion}" pero la dirección sigue pendiente`);
  }
  return errores;
}

function validarConsistenciaPromocion(promo) {
  const errores = [];
  if (promo.visible === true && normalizarEstadoAprobacion(promo.estadoAprobacion) !== "aprobado") {
    errores.push(`promocion:${promo.modelo}: visible=true pero estadoAprobacion="${promo.estadoAprobacion}" no está aprobado`);
  }
  return errores;
}

/**
 * Filtra las sedes crudas dejando solo registros que cumplen:
 * tipos correctos (ESQUEMA_SEDE), campos obligatorios presentes, y
 * consistencia entre los flags *Confirmado y su valor real asociado.
 */
function validarYFiltrarSedes(sedesRaw) {
  if (!Array.isArray(sedesRaw)) return [];
  return sedesRaw.filter((sede) => {
    const etiqueta = `sede:${sede && sede.id}`;
    const errores = [
      ...validarContraEsquema(sede, ESQUEMA_SEDE, etiqueta),
      ...validarCamposRequeridos(sede, CAMPOS_REQUERIDOS_SEDE, etiqueta),
      ...(sede && typeof sede === "object" ? validarConsistenciaSede(sede) : []),
    ];
    if (errores.length) {
      console.warn("[ARENAS] Registro de sede inválido, se omite:", errores);
      return false;
    }
    return true;
  });
}

/**
 * Filtra promociones crudas dejando solo registros que cumplen: tipos
 * correctos (ESQUEMA_PROMOCION), campos obligatorios presentes, y
 * consistencia entre visible=true y estadoAprobacion.
 */
function validarYFiltrarPromociones(promosRaw) {
  if (!Array.isArray(promosRaw)) return [];
  return promosRaw.filter((promo) => {
    const etiqueta = `promocion:${promo && promo.modelo}`;
    const errores = [
      ...validarContraEsquema(promo, ESQUEMA_PROMOCION, etiqueta),
      ...validarCamposRequeridos(promo, CAMPOS_REQUERIDOS_PROMOCION, etiqueta),
      ...(promo && typeof promo === "object" ? validarConsistenciaPromocion(promo) : []),
    ];
    if (errores.length) {
      console.warn("[ARENAS] Promoción inválida, se omite:", errores);
      return false;
    }
    return true;
  });
}

/** Valida (sin filtrar, es un objeto único) el slot de WhatsApp */
function validarSlotWhatsapp(whatsappRaw) {
  const errores = validarContraEsquema(whatsappRaw, ESQUEMA_WHATSAPP_SLOT, "slot:whatsapp");
  if (errores.length) console.warn("[ARENAS] data/slots/whatsapp.json no cumple el esquema esperado:", errores);
  return errores.length === 0;
}

/** Valida (sin filtrar, es un objeto único) el slot de SEO */
function validarSlotSeo(seoRaw) {
  const errores = [
    ...validarContraEsquema(seoRaw, ESQUEMA_SEO_SLOT, "slot:seo"),
    ...validarCamposRequeridos(seoRaw, CAMPOS_REQUERIDOS_SEO, "slot:seo"),
  ];
  if (errores.length) console.warn("[ARENAS] data/slots/seo.json no cumple el esquema esperado:", errores);
  return errores.length === 0;
}

/**
 * FUENTE ÚNICA PARA SEO: las etiquetas <meta>, <title> y <link rel="canonical">
 * de index.html son la fuente autoritativa — son las que efectivamente leen
 * los crawlers (Google, Facebook, Twitter). data/slots/seo.json es solo una
 * capa editable de referencia para proponer cambios sin tocar HTML.
 *
 * Esta función NO sobrescribe el HTML (eso degradaría el SEO, ya que
 * algunos crawlers no ejecutan JavaScript de forma confiable). Solo
 * detecta y avisa si el slot quedó desincronizado del HTML real, para
 * que alguien con acceso al código traslade el cambio manualmente.
 * Ver docs/fuente-unica-datos.md → sección SEO.
 */
function verificarConsistenciaSEO() {
  const seoSlot = STATE.slots && STATE.slots.seo;
  if (!seoSlot) return;

  const metaDescripcion = document.querySelector('meta[name="description"]');
  const metaCanonical   = document.querySelector('link[rel="canonical"]');
  const tituloActual    = document.title;

  if (seoSlot.title && seoSlot.title !== tituloActual) {
    console.warn(
      `[ARENAS] SEO desincronizado: data/slots/seo.json → title ("${seoSlot.title}") ` +
      `no coincide con <title> real ("${tituloActual}"). index.html manda — actualizar uno de los dos.`
    );
  }
  if (seoSlot.description && metaDescripcion && seoSlot.description !== metaDescripcion.getAttribute("content")) {
    console.warn(
      `[ARENAS] SEO desincronizado: data/slots/seo.json → description no coincide con ` +
      `la <meta name="description"> real de index.html.`
    );
  }
  if (seoSlot.canonicalUrl && metaCanonical && seoSlot.canonicalUrl !== metaCanonical.getAttribute("href")) {
    console.warn(
      `[ARENAS] SEO desincronizado: data/slots/seo.json → canonicalUrl no coincide con ` +
      `el <link rel="canonical"> real de index.html.`
    );
  }
}

/** Valida (sin filtrar, es un objeto único) el slot de control (99_CONTROL) */
function validarSlotControl(controlRaw) {
  const errores = validarContraEsquema(controlRaw, ESQUEMA_CONTROL_SLOT, "slot:control");
  if (errores.length) console.warn("[ARENAS] data/slots/control.json no cumple el esquema esperado:", errores);
  return errores.length === 0;
}

/**
 * Indica si el sitio está operando en modo de datos local (el único
 * modo soportado hoy). Lee data/slots/control.json si está disponible;
 * si no, asume local por seguridad (nunca asume una fuente remota).
 * @returns {boolean}
 */
function modoDatosEsLocal() {
  const control = STATE.slots && STATE.slots.control;
  if (!control) return true;
  return control.googleSheetsConectado !== true;
}

/**
 * Ejecuta todas las validaciones de slots cargados y reemplaza en
 * STATE.slots los arrays con sus versiones filtradas (sedes y
 * promociones). Debe llamarse después de cargarSlots().
 */
function validarSlotsCargados() {
  if (STATE.slots.sedes && Array.isArray(STATE.slots.sedes.sedes)) {
    STATE.slots.sedes.sedes = validarYFiltrarSedes(STATE.slots.sedes.sedes);
  }
  if (STATE.slots.whatsapp) {
    validarSlotWhatsapp(STATE.slots.whatsapp);
  }
  if (STATE.slots.promociones && Array.isArray(STATE.slots.promociones.promocionesActivas)) {
    STATE.slots.promociones.promocionesActivas = validarYFiltrarPromociones(
      STATE.slots.promociones.promocionesActivas
    );
  }
  if (STATE.slots.seo) {
    validarSlotSeo(STATE.slots.seo);
  }
  if (STATE.slots.control) {
    validarSlotControl(STATE.slots.control);
    if (!modoDatosEsLocal()) {
      // Defensa en profundidad: aunque el slot afirme una conexión remota,
      // este build no tiene código de fetch remoto — se documenta la
      // discrepancia y se sigue operando en modo local.
      console.warn(
        "[ARENAS] data/slots/control.json declara googleSheetsConectado=true, " +
        "pero este sitio no tiene implementado ningún fetch remoto todavía. " +
        "Se continúa en modo local. Ver docs/contrato-datos-google-sheets.md."
      );
    }
  }
}


/* ================================================================
   MÓDULO 4: CARGA DE CONFIGURACIÓN Y SLOTS
   El cliente de datos del catálogo dejó de vivir aquí: ahora está en
   assets/js/catalogo/catalogo-data.js y lo comparten las tres páginas
   (index.html, catalogo.html y modelo.html). Este módulo conserva solo
   la carga de data/configuracion.json y de data/slots/*.json.
   ================================================================ */

/**
 * Carga la configuración general desde data/configuracion.json.
 * @returns {Promise<Object>}
 */
async function cargarConfiguracion() {
  try {
    const res = await fetch(CONFIG.configPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    STATE.config = await res.json();
    // Sincronizar WhatsApp desde configuracion.json si existe
    if (STATE.config.whatsapp) {
      CONFIG.whatsapp = STATE.config.whatsapp;
    }
    // Sincronizar modelo destacado desde configuracion.json — ya no debe
    // quedar hardcodeado en CONFIG (ver _notaModeloDestacado en el JSON).
    if (STATE.config.modeloDestacadoId) {
      CONFIG.modeloDestacadoId = STATE.config.modeloDestacadoId;
    }
    return STATE.config;
  } catch (err) {
    console.warn("[ARENAS] No se pudo cargar configuracion.json:", err);
    return {};
  }
}

/**
 * Carga todos los archivos JSON de data/slots/ y los deja disponibles
 * en STATE.slots, indexados por nombre de archivo (sin extensión).
 *
 * Ejemplo de uso tras la carga:
 *   STATE.slots.hero.tituloPrincipal
 *   STATE.slots.whatsapp.whatsappVentas
 *   STATE.slots["ui-placeholders"].textosBotones.verCatalogo
 *
 * Cada archivo se carga de forma independiente: si uno falla, no rompe
 * la carga de los demás (Promise.allSettled).
 *
 * @returns {Promise<Object>} STATE.slots actualizado
 */
async function cargarSlots() {
  const resultados = await Promise.allSettled(
    CONFIG.slotsArchivos.map(async (nombre) => {
      const res = await fetch(`${CONFIG.slotsPath}/${nombre}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${nombre}.json`);
      const data = await res.json();
      return { nombre, data };
    })
  );

  resultados.forEach((resultado, i) => {
    const nombre = CONFIG.slotsArchivos[i];
    if (resultado.status === "fulfilled") {
      STATE.slots[nombre] = resultado.value.data;
    } else {
      console.warn(`[ARENAS] No se pudo cargar slot "${nombre}.json":`, resultado.reason);
      STATE.slots[nombre] = null;
    }
  });

  return STATE.slots;
}


/* ================================================================
   MÓDULO 5: SEÑALIZACIÓN DE DATOS PENDIENTES
   El render del catálogo se trasladó a assets/js/catalogo/catalogo-ui.js
   y a catalogo-app.js. Aquí queda la utilidad compartida que marca un
   dato como no confirmado en el resto de la página.
   ================================================================ */

/**
 * Crea un badge de dato pendiente/no confirmado. Por defecto usa la
 * etiqueta "Referencial" (compatibilidad con usos previos como la
 * dirección de una sede), pero acepta una etiqueta personalizada
 * (ej. "Consultar", "Consultar disponibilidad").
 * @param {string} titulo - texto accesible (atributo title)
 * @param {string} [etiquetaPersonalizada] - texto visible del badge
 * @returns {HTMLElement}
 */
function crearBadgePendiente(titulo, etiquetaPersonalizada) {
  const placeholders = STATE.slots && STATE.slots["ui-placeholders"];
  const etiquetaDefault =
    (placeholders &&
      placeholders.mensajesEstadoPendiente &&
      placeholders.mensajesEstadoPendiente.precioReferencial) || "Referencial";
  const tituloDefault =
    (placeholders &&
      placeholders.mensajesEstadoPendiente &&
      placeholders.mensajesEstadoPendiente.precioReferencialTitulo) ||
    "Dato referencial sujeto a confirmación";

  const badge = createElement("span", {
    class: "badge-pendiente",
    title: titulo || tituloDefault,
  });
  badge.textContent = etiquetaPersonalizada || etiquetaDefault;
  return badge;
}

/* ================================================================
   MÓDULO 8: STORES RENDER
   Fuente única: data/slots/sedes.json (ver docs/fuente-unica-datos.md).
   data/configuracion.json → sedes queda deprecado y solo se usa como
   fallback si el slot no carga.
   ================================================================ */

function renderizarTiendas() {
  const grid = $("#stores-grid");
  if (!grid) return;

  const sedesSlot = STATE.slots && STATE.slots.sedes && STATE.slots.sedes.sedes;
  const sedesFuente = Array.isArray(sedesSlot) && sedesSlot.length
    ? sedesSlot
    : (STATE.config.sedes || []);

  // Solo se muestran sedes cuyo estado normalizado sea exactamente "aprobado"
  // (ver normalizarEstadoAprobacion() y docs/control-publicacion-datos.md).
  const sedesVisibles = sedesFuente.filter(
    (sede) => normalizarEstadoAprobacion(sede.estadoAprobacion) === "aprobado"
  );

  clearElement(grid);

  if (sedesVisibles.length === 0) {
    const mensaje =
      (STATE.slots &&
        STATE.slots["ui-placeholders"] &&
        STATE.slots["ui-placeholders"].mensajesEstadoPendiente &&
        STATE.slots["ui-placeholders"].mensajesEstadoPendiente.sedesPendientes) ||
      "Estamos confirmando nuestras ubicaciones en Cusco. Escríbenos por el formulario para más información.";
    const vacio = createElement("p", { class: "empty-state", role: "status" });
    vacio.textContent = mensaje;
    grid.appendChild(vacio);
    return;
  }

  sedesVisibles.forEach((sede) => grid.appendChild(crearTarjetaSede(sede)));
}

/**
 * Construye una tarjeta de sede con DOM seguro. Los datos sin confirmar
 * (dirección, teléfono, horario) se muestran con badge "pendiente" en
 * lugar de aparentar ser información real.
 * @param {Object} sede
 * @returns {HTMLElement}
 */
function crearTarjetaSede(sede) {
  const esPendiente = (valor) =>
    !valor || /^pendiente$/i.test(String(valor).trim());

  const card = createElement("article", {
    class: "store-card",
    role: "listitem",
    "aria-label": `${sede.nombre || "Sede"} — ARENAS MOTOCICLETAS`,
  });

  const nombre = createElement("h3", { class: "store-name" });
  nombre.textContent = sede.nombre || "Sede";
  card.appendChild(nombre);

  const address = createElement("address", { class: "store-address" });

  const direccionTexto = document.createTextNode(
    esPendiente(sede.direccion) ? "Dirección por confirmar" : sede.direccion
  );
  address.appendChild(direccionTexto);
  if (esPendiente(sede.direccion)) {
    address.appendChild(document.createTextNode(" "));
    address.appendChild(crearBadgePendiente("Dirección pendiente de confirmar", "Pendiente"));
  }
  address.appendChild(createElement("br"));

  // Teléfono: solo se renderiza como enlace tel: si pasa el validador de
  // formato (evita que un dato editable inyecte otro esquema de URL).
  if (!esPendiente(sede.telefono) && esTelefonoSeguro(sede.telefono)) {
    const telLink = createElement("a", {
      href: `tel:${sede.telefono}`,
      "aria-label": `Llamar a ${sede.nombre || "esta sede"}`,
    });
    telLink.textContent = sede.telefono;
    address.appendChild(telLink);
  } else {
    if (!esPendiente(sede.telefono)) {
      console.warn(`[ARENAS] Teléfono con formato inválido en sede "${sede.id}", se trata como pendiente.`);
    }
    const telPendiente = createElement("span", { class: "form-hint" });
    telPendiente.textContent = "Teléfono por confirmar";
    address.appendChild(telPendiente);
  }
  card.appendChild(address);

  const horario = createElement("p", { class: "store-hours" });
  horario.textContent = esPendiente(sede.horario) ? "Horario por confirmar" : sede.horario;
  card.appendChild(horario);

  // Enlace a mapa: solo se usa sede.googleMapsUrl si es HTTPS y de un
  // dominio autorizado (ver DOMINIOS_PERMITIDOS). Si no es seguro, se
  // recurre a una URL de Google Maps generada por nosotros mismos
  // (siempre segura porque el dominio y el protocolo son fijos).
  let mapsURL = null;
  if (!esPendiente(sede.googleMapsUrl)) {
    if (esURLExternaSegura(sede.googleMapsUrl)) {
      mapsURL = sede.googleMapsUrl;
    } else {
      console.warn(`[ARENAS] googleMapsUrl no autorizada en sede "${sede.id}", se ignora.`);
    }
  }
  if (!mapsURL && !esPendiente(sede.direccion)) {
    mapsURL = `https://maps.google.com/?q=${encodeURIComponent(`${sede.direccion} Cusco Peru`)}`;
  }

  if (mapsURL) {
    const mapLink = createElement("a", {
      href: mapsURL,
      target: "_blank",
      rel: "noopener noreferrer",
      class: "btn btn-ghost",
      "aria-label": `Ver ${sede.nombre || "esta sede"} en Google Maps`,
    });
    mapLink.textContent = "Ver en mapa";
    card.appendChild(mapLink);
  }

  return card;
}


/* ================================================================
   MÓDULO 9: MOTION OBSERVER
   IntersectionObserver para activar clases de reveal en scroll.
   Respeta prefers-reduced-motion.
   ================================================================ */

let motionObserver = null;

function inicializarAnimaciones() {
  // Respetar preferencias de accesibilidad del sistema
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    // Mostrar todo inmediatamente sin animación
    $$(".reveal-section, .reveal-fade, .reveal-slide-up, .reveal-slide-left, .reveal-slide-right, .reveal-scale")
      .forEach(el => el.classList.add(CONFIG.revealClass));
    return;
  }

  // Desconectar observer previo si existe (para re-uso tras re-render)
  if (motionObserver) motionObserver.disconnect();

  const selectorAnimados = [
    ".reveal-section",
    ".reveal-fade",
    ".reveal-slide-up",
    ".reveal-slide-left",
    ".reveal-slide-right",
    ".reveal-scale",
    ".moto-card",
    ".line-card",
    ".why-card",
    ".financing-card",
    ".store-card",
    ".include-item",
  ].join(", ");

  motionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(CONFIG.revealClass);
          // Una vez visible, ya no necesitamos observarlo
          motionObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: CONFIG.revealThreshold,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  $$(selectorAnimados).forEach(el => {
    // Solo observar si aún no es visible
    if (!el.classList.contains(CONFIG.revealClass)) {
      motionObserver.observe(el);
    }
  });
}


/* ================================================================
   MÓDULO 9b: HERO VIDEO + HEADER ON-SCROLL
   Interacciones aprobadas del handoff, integradas selectivamente.
   - Video del hero: reproduce una vez (sin loop), conserva el último
     fotograma, se pausa fuera del viewport y nunca se reinicia solo.
   - prefers-reduced-motion: no reproduce; el CSS muestra el poster.
   - Header: transparente al inicio, oscuro con blur tras 24px de scroll.
   Observer propio del video — no reutiliza ni duplica motionObserver.
   ================================================================ */

function inicializarHeroVideo() {
  const video = $("#hero-video");
  if (!video) return;

  const media = video.closest(".hero-media");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Refuerzo por JS de los atributos críticos de autoplay silencioso
  video.muted = true;

  // Fallback: si el video no puede cargarse, el poster ocupa el fondo
  const marcarFallo = () => {
    if (media) media.classList.add("video-failed");
  };
  video.addEventListener("error", marcarFallo);
  const source = video.querySelector("source");
  if (source) source.addEventListener("error", marcarFallo);

  // Accesibilidad: sin reproducción automática con movimiento reducido.
  // El CSS oculta el video y muestra el poster (fotograma final).
  if (prefersReduced) {
    video.removeAttribute("autoplay");
    video.pause();
    // El autoplay ya programado por el navegador puede dispararse más tarde,
    // cuando el archivo termina de bufferizar: hay que frenarlo también ahí
    // para no decodificar vídeo invisible con movimiento reducido.
    video.addEventListener("play", () => {
      video.pause();
      video.currentTime = 0;
    });
    return;
  }

  // La intro se reproduce UNA sola vez: al terminar, el navegador conserva
  // el último fotograma (sin atributo loop no hay reinicio automático).
  let introTerminada = false;
  video.addEventListener("ended", () => {
    introTerminada = true;
  });

  // Pausar fuera del viewport / reanudar al volver SOLO si la intro
  // no ha terminado. Si ya terminó, se conserva el estado final.
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (introTerminada || video.ended) return;
          if (entry.isIntersecting) {
            if (video.paused) {
              const p = video.play();
              if (p && typeof p.catch === "function") p.catch(() => {});
            }
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { threshold: 0.1 }
    );
    videoObserver.observe(video.closest(".hero-section") || video);
  }
}

function inicializarHeaderScroll() {
  const header = $(".site-header");
  if (!header) return;

  let ticking = false;
  const actualizarHeader = () => {
    header.classList.toggle("is-scrolled", (window.scrollY || 0) > 24);
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(actualizarHeader);
    },
    { passive: true }
  );

  // Estado inicial correcto si la página carga ya scrolleada (anclas)
  actualizarHeader();
}


/* ================================================================
   MÓDULO 9c: NARRATIVA EDITORIAL — FASE 5
   - Selector de caminos (Encuentra tu camino): panel activo en
     desktop, carrusel con scroll-snap en móvil, contador 01/06.
   - Selector guiado de tres pasos: asistente accesible; sin JS los
     pasos quedan expandidos (no se oculta contenido).
   - Formulario de consulta honesto: no envía ni almacena datos.
   Sin fetch, sin localStorage, sin datos comerciales.
   ================================================================ */

function inicializarCaminos() {
  const seccion = $("#camino");
  if (!seccion) return;

  const tabs = Array.from($$(".path-tab", seccion));
  const paneles = Array.from($$(".path-panel", seccion));
  const stage = $(".path-stage", seccion);
  const flechas = Array.from($$(".path-arrow", seccion));
  const contador = $(".path-count__current", seccion);
  if (!tabs.length || !paneles.length) return;

  // Modo interactivo: sin JS las cuatro portadas permanecen visibles
  seccion.classList.add("js-paths");

  const esMovil = window.matchMedia("(max-width: 900px)");
  let indice = 0;

  const pintar = (i, desplazar) => {
    indice = (i + paneles.length) % paneles.length;
    tabs.forEach((tab, t) => {
      const activo = t === indice;
      tab.setAttribute("aria-pressed", String(activo));
      // aria-current refuerza "categoría actual del conjunto" para lectores
      if (activo) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    });
    paneles.forEach((panel, p) => {
      const activo = p === indice;
      panel.classList.toggle("is-active", activo);
      panel.dataset.active = String(activo);
    });
    if (contador) contador.textContent = String(indice + 1).padStart(2, "0");
    // En móvil el escenario es un carrusel: desplazar al panel activo
    if (desplazar && esMovil.matches && stage) {
      const destino = paneles[indice];
      stage.scrollTo({
        left: destino.offsetLeft - (stage.clientWidth - destino.clientWidth) / 2,
        behavior: "smooth",
      });
    }
  };

  tabs.forEach((tab, t) => {
    tab.addEventListener("click", () => pintar(t, true));
  });
  flechas.forEach((flecha) => {
    flecha.addEventListener("click", () => {
      pintar(indice + Number(flecha.dataset.dir || 1), true);
    });
  });

  // En móvil, sincronizar el contador con el panel más centrado al deslizar
  if (stage) {
    let tick = false;
    stage.addEventListener(
      "scroll",
      () => {
        if (tick || !esMovil.matches) return;
        tick = true;
        requestAnimationFrame(() => {
          const centro = stage.scrollLeft + stage.clientWidth / 2;
          let cercano = 0;
          let menor = Infinity;
          paneles.forEach((panel, p) => {
            const d = Math.abs(panel.offsetLeft + panel.clientWidth / 2 - centro);
            if (d < menor) { menor = d; cercano = p; }
          });
          if (cercano !== indice) pintar(cercano, false);
          tick = false;
        });
      },
      { passive: true }
    );
  }

  pintar(0, false);
}

function inicializarGuia() {
  const guia = $(".guide");
  if (!guia) return;

  const pasos = Array.from($$(".guide-step", guia));
  const marcas = Array.from($$(".guide-progress__step", guia));
  const controles = $(".guide-controls", guia);
  const btnVolver = $(".guide-back", guia);
  const btnSeguir = $(".guide-next", guia);
  const resultado = $(".guide-result", guia);
  const resumen = $("[data-summary]", guia);
  if (!pasos.length || !controles || !btnVolver || !btnSeguir || !resultado) return;

  // Modo asistente: sin JS los tres pasos quedan visibles y usables
  guia.classList.add("js-guide");
  controles.hidden = false;

  // El formulario no envía nada en esta fase
  guia.addEventListener("submit", (e) => e.preventDefault());

  let actual = 0;

  const pintar = () => {
    pasos.forEach((paso, p) => paso.classList.toggle("is-current", p === actual));
    marcas.forEach((marca, m) => {
      marca.classList.toggle("is-current", m === actual);
      marca.classList.toggle("is-done", m < actual);
    });
    btnVolver.disabled = actual === 0;
    btnSeguir.textContent = actual === pasos.length - 1 ? "Ver resultado" : "Continuar";
    resultado.classList.remove("is-done");
  };

  const terminar = () => {
    // Resumen legible de la selección — solo en pantalla, nunca se envía
    if (resumen) {
      const valores = ["uso", "prioridad", "experiencia"]
        .map((nombre) => {
          const marcado = guia.querySelector(`input[name="${nombre}"]:checked`);
          return marcado ? marcado.value : null;
        })
        .filter(Boolean);
      if (valores.length) {
        resumen.textContent = "Tu camino: " + valores.join(" · ");
        resumen.hidden = false;
      } else {
        resumen.hidden = true;
      }
    }
    pasos.forEach((paso) => paso.classList.remove("is-current"));
    marcas.forEach((marca) => {
      marca.classList.add("is-done");
      marca.classList.remove("is-current");
    });
    controles.hidden = true;
    resultado.classList.add("is-done");
  };

  btnSeguir.addEventListener("click", () => {
    if (actual < pasos.length - 1) {
      actual += 1;
      pintar();
    } else {
      terminar();
    }
  });
  btnVolver.addEventListener("click", () => {
    if (resultado.classList.contains("is-done")) {
      resultado.classList.remove("is-done");
      controles.hidden = false;
      pintar();
      return;
    }
    if (actual > 0) {
      actual -= 1;
      pintar();
    }
  });

  pintar();
}

function inicializarConsulta() {
  const form = $("#form-consulta");
  const aviso = $("#consulta-aviso");
  if (!form || !aviso) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Mensaje honesto: no se envía ni se almacena nada en esta fase.
    // Los campos se conservan tal cual para no simular un envío.
    aviso.textContent =
      "Este canal será habilitado en la siguiente fase. Ningún dato fue enviado.";
  });
}


/* ================================================================
   MÓDULO 10: FORM HANDLING
   Validación del formulario de cotización y envío por WhatsApp.
   ================================================================ */

function inicializarFormulario() {
  const form      = $("#form-cotizacion");
  const btnEnviar = $("#btn-cotizar");
  const success   = $("#form-success");

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const primerError = validarFormulario(form);
    if (primerError === null) {
      enviarFormularioPorWhatsApp(form);
    } else {
      // Foco accesible en el primer campo inválido (requisito de auditoría)
      primerError.focus();
      trackEvent("formulario_con_errores", { campo: primerError.id });
    }
  });

  // Validación en tiempo real al salir de cada campo
  form.querySelectorAll(".form-input, .form-select, .form-textarea").forEach(campo => {
    campo.addEventListener("blur", () => validarCampo(campo));
    campo.addEventListener("input", () => {
      if (campo.classList.contains("is-invalid")) validarCampo(campo);
    });
  });
}

/**
 * Valida el formulario completo.
 * @param {HTMLFormElement} form
 * @returns {HTMLElement|null} El primer campo inválido, o null si todo es válido
 */
function validarFormulario(form) {
  let primerInvalido = null;
  const marcar = (campoValido, campo) => {
    if (!campoValido && !primerInvalido) primerInvalido = campo;
  };

  // Nombre
  const nombre = form.querySelector("#campo-nombre");
  marcar(validarCampoRequerido(nombre, "El nombre es obligatorio."), nombre);

  // Teléfono
  const telefono = form.querySelector("#campo-telefono");
  marcar(validarTelefono(telefono), telefono);

  // Checkbox de datos
  const checkDatos = form.querySelector("#campo-datos");
  if (checkDatos && !checkDatos.checked) {
    mostrarError(checkDatos, "error-datos", "Debes autorizar el tratamiento de datos para continuar.");
    marcar(false, checkDatos);
  } else if (checkDatos) {
    ocultarError(checkDatos, "error-datos");
  }

  return primerInvalido;
}

/**
 * Valida un campo individual según su tipo.
 * @param {HTMLElement} campo
 * @returns {boolean}
 */
function validarCampo(campo) {
  if (!campo) return true;
  const id = campo.id;

  if (id === "campo-nombre")   return validarCampoRequerido(campo, "El nombre es obligatorio.");
  if (id === "campo-telefono") return validarTelefono(campo);

  return true;
}

function validarCampoRequerido(campo, mensaje) {
  if (!campo) return false;
  const valor = campo.value.trim();
  if (!valor) {
    mostrarError(campo, campo.getAttribute("aria-describedby"), mensaje);
    return false;
  }
  ocultarError(campo, campo.getAttribute("aria-describedby"));
  return true;
}

function validarTelefono(campo) {
  if (!campo) return false;
  const valor = campo.value.trim().replace(/\s/g, "");
  // Formato peruano: 9 dígitos comenzando con 9, o número con código país
  const valido = /^(\+?51)?9\d{8}$/.test(valor) || /^\d{7,12}$/.test(valor);
  if (!campo.value.trim()) {
    mostrarError(campo, "error-telefono", "El teléfono es obligatorio.");
    return false;
  }
  if (!valido) {
    mostrarError(campo, "error-telefono", "Ingresa un número de teléfono válido.");
    return false;
  }
  ocultarError(campo, "error-telefono");
  return true;
}

function mostrarError(campo, errorId, mensaje) {
  if (campo) {
    campo.classList.add("is-invalid");
    campo.setAttribute("aria-invalid", "true");
  }
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.textContent = mensaje;
}

function ocultarError(campo, errorId) {
  if (campo) {
    campo.classList.remove("is-invalid");
    campo.setAttribute("aria-invalid", "false");
  }
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.textContent = "";
}

/**
 * Construye el mensaje de WhatsApp con los datos del formulario y abre el chat.
 * Si el número de WhatsApp aún no está confirmado, no abre ningún chat falso:
 * muestra el aviso correspondiente y conserva los datos para que el usuario
 * pueda reintentar más tarde.
 * NOTA: no envía a servidor externo — todo local.
 * @param {HTMLFormElement} form
 */
function enviarFormularioPorWhatsApp(form) {
  if (!whatsappConfirmado()) {
    mostrarAvisoWhatsAppPendiente();
    return;
  }

  const nombre   = form.querySelector("#campo-nombre")?.value.trim()   || "";
  const telefono = form.querySelector("#campo-telefono")?.value.trim() || "";
  const modelo   = form.querySelector("#campo-modelo")?.value          || "consulta general";
  const mensaje  = form.querySelector("#campo-mensaje")?.value.trim()  || "";

  const textoWA = [
    `Hola ARENAS MOTOCICLETAS, me contacto desde el sitio web.`,
    `*Nombre:* ${nombre}`,
    `*Teléfono:* ${telefono}`,
    `*Modelo de interés:* ${modelo}`,
    mensaje ? `*Mensaje:* ${mensaje}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = buildWhatsAppURL(textoWA);
  if (!url) {
    // Número placeholder/no aprobado: avisar sin perder lo escrito por el usuario
    mostrarAvisoWhatsAppPendiente();
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");

  // Mostrar mensaje de éxito y limpiar formulario
  const success = $("#form-success");
  if (success) success.removeAttribute("hidden");

  form.reset();
  trackEvent("cotizacion_enviada", { modelo });
}


/* ================================================================
   MÓDULO 11: NAV MOBILE
   Menú hamburguesa para pantallas pequeñas.
   ================================================================ */

function inicializarNavMobile() {
  const toggle = $(".nav-toggle");
  const nav    = $("#site-nav");

  if (!toggle || !nav) return;

  const cerrarMenu = ({ devolverFoco = false } = {}) => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú de navegación");
    nav.classList.remove("nav-open");
    if (devolverFoco) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Abrir menú de navegación" : "Cerrar menú de navegación"
    );
    nav.classList.toggle("nav-open", !isOpen);
  });

  // Cerrar al hacer clic en un enlace
  $$(".nav-link", nav).forEach(link => {
    link.addEventListener("click", () => cerrarMenu());
  });

  // Cerrar al hacer clic fuera del menú
  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      cerrarMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      cerrarMenu({ devolverFoco: true });
    }
  });
}


/* ================================================================
   MÓDULO 12: FOOTER YEAR
   Actualiza el año del copyright dinámicamente.
   ================================================================ */

function actualizarAnioCopyright() {
  const el = $("#footer-year");
  if (el) el.textContent = new Date().getFullYear();
}


/* ================================================================
   MÓDULO 13: ANALYTICS — PLACEHOLDERS
   Preparado para conectar con Google Analytics, Meta Pixel u otro.
   Actualmente solo registra en consola (modo desarrollo).
   PENDIENTE: conectar con proveedor real antes del lanzamiento.
   ================================================================ */

/**
 * Registra un evento de analítica.
 * @param {string} nombre   - nombre del evento
 * @param {Object} datos    - datos adicionales del evento
 */
function trackEvent(nombre, datos = {}) {
  // Modo desarrollo: log en consola
  if (typeof console !== "undefined") {
    console.info(`[ARENAS analytics] ${nombre}`, datos);
  }

  // Placeholder Google Analytics (GA4)
  // if (typeof gtag === "function") {
  //   gtag("event", nombre, datos);
  // }

  // Placeholder Meta Pixel
  // if (typeof fbq === "function") {
  //   fbq("track", nombre, datos);
  // }
}


/* ================================================================
   MÓDULO 14: INIT APP
   Orquestación principal de arranque de la aplicación.
   ================================================================ */

/**
 * Punto de entrada principal.
 * Orden: config → catálogo → render → buscador → animaciones → formulario → nav
 */
async function inicializarApp() {
  try {
    // 1. Cargar configuración global
    await cargarConfiguracion();

    // 1b. Cargar slots editables (data/slots/*.json)
    await cargarSlots();

    // 1b2. Validar esquema/seguridad de los slots cargados (sedes, whatsapp, promociones, seo)
    validarSlotsCargados();

    // 1b3. Avisar en consola si seo.json quedó desincronizado de index.html
    verificarConsistenciaSEO();

    // 1c. Deshabilitar visualmente WhatsApp si el número no está confirmado
    aplicarEstadoWhatsApp();

    // 4. Renderizar tiendas (fuente: data/slots/sedes.json)
    renderizarTiendas();

    // 7. Inicializar sistema de animaciones
    inicializarAnimaciones();

    // 7b. Video del hero (una sola reproducción, pausa fuera de viewport)
    inicializarHeroVideo();

    // 7c. Header transparente → oscuro con blur al hacer scroll
    inicializarHeaderScroll();

    // 7d. Narrativa editorial: caminos, selector guiado y consulta
    inicializarCaminos();
    inicializarGuia();
    inicializarConsulta();

    // 8. Inicializar formulario de cotización
    inicializarFormulario();

    // 8b. Inicializar botón de contacto directo por WhatsApp (sin href fijo)
    inicializarWhatsAppDirecto();

    // 9. Inicializar menú móvil
    inicializarNavMobile();

    // 10. Año del copyright
    actualizarAnioCopyright();

    // 10b. Reforzar estado de WhatsApp tras renderizar catálogo y tiendas
    aplicarEstadoWhatsApp();

    // 11. Evento de página lista
    trackEvent("app_ready", { secciones: document.querySelectorAll(".section").length });

  } catch (err) {
    console.error("[ARENAS] Error iniciando la aplicación:", err);
  }
}

// Arrancar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", inicializarApp);
