/**
 * ARENAS MOTOCICLETAS — script.js
 * Núcleo funcional base. Vanilla JS, sin frameworks ni librerías externas.
 *
 * MÓDULOS:
 *   1. CONFIG              — constantes globales y referencia a configuracion.json
 *   2. DOM helpers         — selectores reutilizables
 *   3. WhatsApp helpers    — generación de mensajes y URLs
 *   4. Catalog loader      — carga desde data/catalogo.json y data/slots/*.json (cargarSlots)
 *   5. Render catalog      — construcción de tarjetas HTML
 *   6. Search / filters    — filtrado del catálogo
 *   7. Featured model      — modelo destacado dinámico
 *   8. Stores render       — renderizar sedes desde configuracion.json
 *   9. Motion observer     — IntersectionObserver para reveals
 *  10. Form handling       — validación y envío del formulario
 *  11. Nav mobile          — menú hamburguesa en móvil
 *  12. Footer year         — año actual en footer
 *  13. Analytics           — placeholders de eventos
 *  14. Init                — orquestación de arranque
 */


/* ================================================================
   MÓDULO 1: CONFIG
   NOTA: número de WhatsApp provisional — cambiar en configuracion.json
   ================================================================ */

const CONFIG = {
  whatsapp:       "+51987654321",   // PENDIENTE: número real
  catalogPath:    "data/catalogo.json",
  configPath:     "data/configuracion.json",
  slotsPath:      "data/slots",     // carpeta de slots editables
  slotsArchivos: [
    "hero", "empresa", "whatsapp", "sedes", "financiamiento",
    "beneficios", "servicio-tecnico", "promociones", "testimonios",
    "legales", "seo", "ui-placeholders",
  ],
  revealThreshold: 0.12,           // % de visibilidad para activar reveal
  revealClass:    "is-visible",    // clase que activa la animación CSS
  maxFiltros:     3,               // máximo de filtros activos simultáneos
  modeloDestacadoId: "pulsar-ns400", // valor de arranque — cargarConfiguracion() lo sobrescribe con data/configuracion.json → modeloDestacadoId
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
 * @param {string} mensaje
 * @param {string} numero  - número con código de país, sin espacios ni guiones
 * @returns {string}
 */
function buildWhatsAppURL(mensaje, numero = CONFIG.whatsapp) {
  const clean = numero.replace(/\D/g, "");
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

/** Esquemas mínimos de tipos esperados por dominio de datos */
const ESQUEMA_MOTO = {
  id: "string", linea: "string", modelo: "string",
  visible: "boolean", destacado: "boolean", orden: "number",
  precio: "string", precioConfirmado: "boolean",
  cuotaInicial: "string", cuotaConfirmada: "boolean",
  stock: "string", stockConfirmado: "boolean",
  descripcion: "string",
};

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
function validarConsistenciaMoto(moto) {
  const errores = [];
  if (moto.precioConfirmado === true && !moto.precio) {
    errores.push(`catalogo:${moto.id}: precioConfirmado=true pero falta "precio"`);
  }
  if (moto.cuotaConfirmada === true && !moto.cuotaInicial) {
    errores.push(`catalogo:${moto.id}: cuotaConfirmada=true pero falta "cuotaInicial"`);
  }
  if (moto.stockConfirmado === true && !moto.stock) {
    errores.push(`catalogo:${moto.id}: stockConfirmado=true pero falta "stock"`);
  }
  return errores;
}

function validarConsistenciaSede(sede) {
  const errores = [];
  const estado = String(sede.estadoAprobacion || "").trim().toLowerCase();
  const aprobada = ESTADOS_SEDE_VISIBLES.includes(estado);
  const direccionPendiente = !sede.direccion || /^pendiente$/i.test(String(sede.direccion).trim());
  if (aprobada && direccionPendiente) {
    errores.push(`sede:${sede.id}: estadoAprobacion="${sede.estadoAprobacion}" pero la dirección sigue pendiente`);
  }
  return errores;
}

/** Estados que permiten mostrar una promoción (mismo criterio que sedes) */
const ESTADOS_PROMOCION_VISIBLES = ["aprobado", "confirmado"];

function validarConsistenciaPromocion(promo) {
  const errores = [];
  const estado = String(promo.estadoAprobacion || "").trim().toLowerCase();
  if (promo.visible === true && !ESTADOS_PROMOCION_VISIBLES.includes(estado)) {
    errores.push(`promocion:${promo.modelo}: visible=true pero estadoAprobacion="${promo.estadoAprobacion}" no está aprobado`);
  }
  return errores;
}

/**
 * Filtra el catálogo crudo dejando solo registros que cumplen:
 * tipos correctos (ESQUEMA_MOTO), campos obligatorios presentes, y
 * consistencia entre los flags *Confirmado y su valor real asociado.
 */
function validarYFiltrarCatalogo(catalogoRaw) {
  if (!Array.isArray(catalogoRaw)) return [];
  return catalogoRaw.filter((moto) => {
    const etiqueta = `catalogo:${moto && moto.id}`;
    const errores = [
      ...validarContraEsquema(moto, ESQUEMA_MOTO, etiqueta),
      ...validarCamposRequeridos(moto, CAMPOS_REQUERIDOS_MOTO, etiqueta),
      ...(moto && typeof moto === "object" ? validarConsistenciaMoto(moto) : []),
    ];
    if (errores.length) {
      console.warn("[ARENAS] Registro de catálogo inválido, se omite:", errores);
      return false;
    }
    return true;
  });
}

/**
 * Filtra sedes crudas dejando solo registros que cumplen: tipos
 * correctos (ESQUEMA_SEDE), campos obligatorios presentes, y consistencia
 * entre estadoAprobacion y los datos reales de la sede.
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
}


/* ================================================================
   MÓDULO 4: CATALOG LOADER
   Carga el catálogo desde data/catalogo.json (fuente local, fallback
   permanente — ver punto 7 de docs/correcciones-auditoria-codex.md).
   Preparado para evaluar Google Sheets en una fase futura, sin
   conectarlo todavía. Ver docs/contrato-datos-google-sheets.md.
   ================================================================ */

/**
 * Carga y retorna el catálogo como array de objetos.
 * @returns {Promise<Array>}
 */
async function cargarCatalogo() {
  try {
    const res = await fetch(CONFIG.catalogPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    STATE.catalogo = validarYFiltrarCatalogo(Array.isArray(data) ? data : []);
    return STATE.catalogo;
  } catch (err) {
    console.error("[ARENAS] Error cargando catálogo:", err);
    STATE.catalogo = [];
    return [];
  }
}

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
   MÓDULO 5: RENDER CATALOG
   Genera las tarjetas HTML del catálogo desde el array de datos.
   ================================================================ */

/**
 * Construye el nodo de imagen de una tarjeta. Si la ruta no carga
 * (asset aún no subido), se reemplaza por el placeholder visual en
 * lugar de dejar una imagen rota — ver docs/correcciones-auditoria-codex.md.
 * @param {Object} moto
 * @returns {HTMLElement}
 */
function crearImagenMoto(moto) {
  const wrapper = createElement("div", { class: "moto-card__image" });

  // Sin ruta, o ruta externa no permitida (regla: no imágenes externas)
  if (!moto.fotoPrincipal || !esRutaLocalSegura(moto.fotoPrincipal)) {
    if (moto.fotoPrincipal && !esRutaLocalSegura(moto.fotoPrincipal)) {
      console.warn(`[ARENAS] Imagen externa no permitida para "${moto.modelo}", se usa placeholder.`);
    }
    wrapper.appendChild(crearPlaceholderImagen(moto));
    return wrapper;
  }

  const img = createElement("img", {
    src: moto.fotoPrincipal,
    alt: `Moto ${moto.modelo}${moto.version ? " " + moto.version : ""}`,
    loading: "lazy",
    width: "400",
    height: "225",
  });

  // Si el archivo aún no existe en assets/, se sustituye por el placeholder
  // en vez de mostrar una imagen rota (evita el problema de assets faltantes).
  img.addEventListener("error", () => {
    wrapper.replaceChildren(crearPlaceholderImagen(moto));
  }, { once: true });

  wrapper.appendChild(img);
  return wrapper;
}

function crearPlaceholderImagen(moto) {
  const mensaje =
    (STATE.slots &&
      STATE.slots["ui-placeholders"] &&
      STATE.slots["ui-placeholders"].mensajesEstadoPendiente &&
      STATE.slots["ui-placeholders"].mensajesEstadoPendiente.imagenNoDisponible) ||
    "Imagen no disponible";

  return createElement("div", {
    class: "placeholder-media",
    "aria-label": `${mensaje}: ${moto.modelo}`,
  });
}

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

/**
 * Construye una tarjeta de moto completa usando DOM seguro (sin innerHTML
 * con datos provenientes de JSON editable) para evitar inyección de HTML
 * si data/catalogo.json llega a contener texto no controlado.
 * @param {Object} moto - objeto del catálogo
 * @returns {HTMLElement}
 */
function crearTarjetaMoto(moto) {
  const nombreCompleto = `${moto.linea} ${moto.modelo} ${moto.version || ""}`.trim();

  const card = createElement("article", {
    class: "moto-card reveal-fade",
    role: "listitem",
    "aria-label": nombreCompleto,
    "data-id":    moto.id || "",
    "data-linea": moto.linea || "",
  });

  card.appendChild(crearImagenMoto(moto));

  // --- Cuerpo de la tarjeta ---
  const body = createElement("div", { class: "moto-card__body" });

  const linea = createElement("span", { class: "moto-card__linea" });
  linea.textContent = moto.linea || "";
  body.appendChild(linea);

  const nombre = createElement("h3", { class: "moto-card__nombre" });
  nombre.textContent = `${moto.modelo || ""}${moto.version ? " " + moto.version : ""}`;
  body.appendChild(nombre);

  const desc = createElement("p", { class: "moto-card__desc" });
  desc.textContent = moto.descripcion || "";
  body.appendChild(desc);

  if (moto.promocion) {
    const promoBadge = createElement("span", { class: "moto-card__badge" });
    promoBadge.textContent = moto.promocion;
    body.appendChild(promoBadge);
  }

  // Precio: nunca se muestra el valor real si no está confirmado por gerencia
  const placeholdersUI = STATE.slots && STATE.slots["ui-placeholders"] && STATE.slots["ui-placeholders"].mensajesEstadoPendiente;

  const priceRow = createElement("p", { class: "moto-card__price" });
  if (moto.precioConfirmado === true && moto.precio) {
    priceRow.textContent = moto.precio;
  } else {
    priceRow.appendChild(
      crearBadgePendiente(
        (placeholdersUI && placeholdersUI.consultarPrecioTitulo) || "Precio no confirmado todavía",
        (placeholdersUI && placeholdersUI.consultarPrecio) || "Consultar"
      )
    );
  }
  body.appendChild(priceRow);

  // Cuota inicial: misma regla — solo se muestra si cuotaConfirmada === true
  const cuotaRow = createElement("p", { class: "moto-card__meta" });
  cuotaRow.appendChild(document.createTextNode("Cuota inicial: "));
  if (moto.cuotaConfirmada === true && moto.cuotaInicial) {
    cuotaRow.appendChild(document.createTextNode(moto.cuotaInicial));
  } else {
    cuotaRow.appendChild(
      crearBadgePendiente(
        (placeholdersUI && placeholdersUI.consultarCuotaTitulo) || "Cuota no confirmada todavía",
        (placeholdersUI && placeholdersUI.consultarCuota) || "Consultar"
      )
    );
  }
  body.appendChild(cuotaRow);

  // Stock: misma regla — solo se muestra si stockConfirmado === true
  const stockRow = createElement("p", { class: "moto-card__meta" });
  stockRow.appendChild(document.createTextNode("Disponibilidad: "));
  if (moto.stockConfirmado === true && moto.stock) {
    stockRow.appendChild(document.createTextNode(moto.stock));
  } else {
    stockRow.appendChild(
      crearBadgePendiente(
        (placeholdersUI && placeholdersUI.consultarDisponibilidadTitulo) || "Stock no confirmado todavía",
        (placeholdersUI && placeholdersUI.consultarDisponibilidad) || "Consultar disponibilidad"
      )
    );
  }
  body.appendChild(stockRow);

  card.appendChild(body);

  // --- Footer de la tarjeta ---
  const footer = createElement("div", { class: "moto-card__footer" });

  const btnCotizar = createElement("button", {
    class: "btn btn-primary",
    type: "button",
    "aria-label": `Consultar por ${nombreCompleto || "esta moto"} vía WhatsApp`,
    "data-modelo": `${moto.modelo || ""} ${moto.version || ""}`.trim(),
    "data-accion": "whatsapp",
  });
  btnCotizar.textContent = "Cotizar";
  if (!whatsappConfirmado()) {
    btnCotizar.setAttribute("aria-disabled", "true");
  }
  btnCotizar.addEventListener("click", () => {
    consultarPorWhatsApp(`${moto.modelo || ""} ${moto.version || ""}`.trim());
  });
  footer.appendChild(btnCotizar);

  const meta = createElement("span", { class: "moto-card__meta" });
  meta.textContent = moto.cilindrada || "";
  footer.appendChild(meta);

  card.appendChild(footer);

  return card;
}

/**
 * Renderiza el catálogo filtrado en el grid del DOM.
 * @param {Array} motos - array filtrado de motos a mostrar
 */
function renderizarCatalogo(motos = STATE.catalogo) {
  const grid = $("#catalog-grid");
  if (!grid) return;

  clearElement(grid);

  const visibles = motos.filter(m => m.visible !== false);

  if (visibles.length === 0) {
    const mensaje =
      (STATE.slots &&
        STATE.slots["ui-placeholders"] &&
        STATE.slots["ui-placeholders"].mensajesError &&
        STATE.slots["ui-placeholders"].mensajesError.catalogoSinResultados) ||
      "No se encontraron motos con los filtros seleccionados.";
    const aviso = createElement("p", { class: "catalog-loading", role: "status" });
    aviso.textContent = mensaje;
    grid.appendChild(aviso);
    return;
  }

  // Ordenar por campo "orden" si existe
  const ordenados = [...visibles].sort((a, b) => (a.orden || 99) - (b.orden || 99));

  const fragment = document.createDocumentFragment();
  ordenados.forEach((moto, i) => {
    const card = crearTarjetaMoto(moto);
    // Retraso escalonado para stagger effect
    if (i < 6) card.classList.add(`stagger-${i + 1}`);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  // Activar observers en nuevas tarjetas
  inicializarAnimaciones();
}


/* ================================================================
   MÓDULO 6: SEARCH / FILTERS
   Filtrado del catálogo por línea, uso y cilindrada.
   ================================================================ */

/**
 * Aplica los filtros activos al catálogo y re-renderiza.
 */
function filtrarCatalogo() {
  const { linea, uso, cilindrada } = STATE.filtroActivo;

  const resultado = STATE.catalogo.filter(moto => {
    if (linea && moto.linea !== linea) return false;

    // Filtro por cilindrada (rangos aproximados en cc numérico)
    if (cilindrada) {
      const cc = parseCilindrada(moto.cilindrada);
      if (!matchCilindrada(cc, cilindrada)) return false;
    }

    // Filtro por uso — campo opcional "uso" en el JSON (pendiente de añadir)
    if (uso && moto.uso && moto.uso !== uso) return false;

    return true;
  });

  renderizarCatalogo(resultado);
  trackEvent("catalogo_filtrado", STATE.filtroActivo);
}

/** Extrae los cc numéricos del string de cilindrada */
function parseCilindrada(str = "") {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Compara cc con el rango del filtro seleccionado */
function matchCilindrada(cc, rango) {
  switch (rango) {
    case "100-150": return cc >= 100 && cc <= 150;
    case "150-250": return cc > 150 && cc <= 250;
    case "250-400": return cc > 250 && cc <= 400;
    case "400+":    return cc > 400;
    default:        return true;
  }
}

/**
 * Inicializa los controles de búsqueda y sus listeners.
 */
function inicializarBuscador() {
  const selectLinea      = $("#filtro-linea");
  const selectUso        = $("#filtro-uso");
  const selectCilindrada = $("#filtro-cilindrada");
  const btnBuscar        = $("#btn-buscar");

  if (!selectLinea || !selectUso || !selectCilindrada || !btnBuscar) return;

  // Sincronizar estado al cambiar selects
  selectLinea.addEventListener("change", () => {
    STATE.filtroActivo.linea = selectLinea.value;
  });

  selectUso.addEventListener("change", () => {
    STATE.filtroActivo.uso = selectUso.value;
  });

  selectCilindrada.addEventListener("change", () => {
    STATE.filtroActivo.cilindrada = selectCilindrada.value;
  });

  btnBuscar.addEventListener("click", () => {
    filtrarCatalogo();
    // Scroll suave hacia el catálogo
    $("#catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackEvent("busqueda_ejecutada", STATE.filtroActivo);
  });

  // Ver todos los modelos
  const btnVerTodos = $("#btn-ver-todos");
  if (btnVerTodos) {
    btnVerTodos.addEventListener("click", () => {
      STATE.filtroActivo = { linea: "", uso: "", cilindrada: "" };
      selectLinea.value = "";
      selectUso.value = "";
      selectCilindrada.value = "";
      renderizarCatalogo();
      trackEvent("ver_todos_catalogo");
    });
  }
}


/* ================================================================
   MÓDULO 7: FEATURED MODEL
   Modelo destacado dinámico basado en CONFIG.modeloDestacadoId
   PENDIENTE: implementar render completo cuando diseño esté definido
   ================================================================ */

function actualizarModeloDestacado() {
  if (!STATE.catalogo.length) return;

  const moto = STATE.catalogo.find(m => m.id === CONFIG.modeloDestacadoId);
  if (!moto) return;

  // Actualizar encabezado y descripción con el modelo real configurado
  const headingEl = $("#modelo-destacado-heading");
  if (headingEl) {
    headingEl.textContent = `${moto.linea} ${moto.modelo}${moto.version ? " " + moto.version : ""}`.trim();
  }
  const descEl = $("#modelo-destacado .section-header p");
  if (descEl && moto.descripcion) {
    descEl.textContent = moto.descripcion;
  }

  // Precio del modelo destacado: misma regla que en el catálogo — nunca
  // se muestra el valor real si precioConfirmado no es exactamente true.
  const precioContainer = $(".featured-price");
  if (precioContainer) {
    clearElement(precioContainer); // seguro: solo limpiamos markup propio, no inyectamos datos externos
    if (moto.precioConfirmado === true && moto.precio) {
      precioContainer.appendChild(document.createTextNode("Desde "));
      const strong = createElement("strong");
      strong.textContent = moto.precio;
      precioContainer.appendChild(strong);
    } else {
      const placeholdersUI = STATE.slots && STATE.slots["ui-placeholders"] && STATE.slots["ui-placeholders"].mensajesEstadoPendiente;
      precioContainer.appendChild(
        crearBadgePendiente(
          (placeholdersUI && placeholdersUI.consultarPrecioTitulo) || "Precio no confirmado todavía",
          (placeholdersUI && placeholdersUI.consultarPrecio) || "Consultar"
        )
      );
    }
  }

  // Actualizar CTA WhatsApp del modelo destacado
  const ctaDestacado = $("#modelo-destacado .btn-primary");
  if (ctaDestacado) {
    ctaDestacado.setAttribute("data-accion", "whatsapp");
    ctaDestacado.addEventListener("click", (e) => {
      e.preventDefault();
      consultarPorWhatsApp(moto.modelo);
    });
  }
}


/* ================================================================
   MÓDULO 8: STORES RENDER
   Fuente única: data/slots/sedes.json (ver docs/fuente-unica-datos.md).
   data/configuracion.json → sedes queda deprecado y solo se usa como
   fallback si el slot no carga.
   ================================================================ */

/**
 * Allowlist de estados que permiten mostrar una sede. Es intencional
 * que sea una lista de permitidos (no de bloqueados): cualquier estado
 * nuevo que se invente en el futuro (typos, valores no documentados)
 * queda oculto por defecto en vez de mostrarse por error.
 */
const ESTADOS_SEDE_VISIBLES = ["aprobado", "confirmado"];

function renderizarTiendas() {
  const grid = $("#stores-grid");
  if (!grid) return;

  const sedesSlot = STATE.slots && STATE.slots.sedes && STATE.slots.sedes.sedes;
  const sedesFuente = Array.isArray(sedesSlot) && sedesSlot.length
    ? sedesSlot
    : (STATE.config.sedes || []);

  const sedesVisibles = sedesFuente.filter((sede) =>
    ESTADOS_SEDE_VISIBLES.includes(String(sede.estadoAprobacion || "").trim().toLowerCase())
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
    mostrarError(campo, "error-telefono", "Ingresa un número de teléfono válido (ej: 987654321).");
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

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("nav-open", !isOpen);
  });

  // Cerrar al hacer clic en un enlace
  $$(".nav-link", nav).forEach(link => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("nav-open");
    });
  });

  // Cerrar al hacer clic fuera del menú
  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("nav-open");
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

    // 2. Cargar catálogo
    await cargarCatalogo();

    // 3. Renderizar catálogo en el DOM
    renderizarCatalogo();

    // 4. Actualizar modelo destacado
    actualizarModeloDestacado();

    // 5. Renderizar tiendas (fuente: data/slots/sedes.json)
    renderizarTiendas();

    // 6. Inicializar buscador y filtros
    inicializarBuscador();

    // 7. Inicializar sistema de animaciones
    inicializarAnimaciones();

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
