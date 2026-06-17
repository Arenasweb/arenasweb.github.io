/**
 * ARENAS MOTOCICLETAS — script.js
 * Núcleo funcional base. Vanilla JS, sin frameworks ni librerías externas.
 *
 * MÓDULOS:
 *   1. CONFIG              — constantes globales y referencia a configuracion.json
 *   2. DOM helpers         — selectores reutilizables
 *   3. WhatsApp helpers    — generación de mensajes y URLs
 *   4. Catalog loader      — carga desde data/catalogo.json
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
  revealThreshold: 0.12,           // % de visibilidad para activar reveal
  revealClass:    "is-visible",    // clase que activa la animación CSS
  maxFiltros:     3,               // máximo de filtros activos simultáneos
  modeloDestacadoId: "pulsar-ns400", // PENDIENTE: mover a configuracion.json
};

// Estado global de la app (mutable durante sesión)
const STATE = {
  catalogo:    [],
  config:      {},
  filtroActivo: { linea: "", uso: "", cilindrada: "" },
};


/* ================================================================
   MÓDULO 2: DOM HELPERS
   ================================================================ */

/** Selector único — retorna null si no existe */
const $ = (selector, context = document) => context.querySelector(selector);

/** Selector múltiple — retorna NodeList */
const $$ = (selector, context = document) => context.querySelectorAll(selector);

/** Crea un elemento con atributos opcionales */
function createElement(tag, attrs = {}, innerHTML = "") {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  });
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

/** Vacía el contenido de un elemento */
function clearElement(el) {
  if (el) el.innerHTML = "";
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
 * Abre WhatsApp en nueva pestaña con mensaje predefinido para un modelo.
 * @param {string} modelo
 */
function consultarPorWhatsApp(modelo) {
  const mensaje = crearMensajeWhatsApp(modelo);
  const url     = buildWhatsAppURL(mensaje);
  window.open(url, "_blank", "noopener,noreferrer");
  trackEvent("whatsapp_click", { modelo });
}


/* ================================================================
   MÓDULO 4: CATALOG LOADER
   Carga el catálogo desde data/catalogo.json.
   Preparado para migrar a Google Sheets API en fase posterior.
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
    STATE.catalogo = Array.isArray(data) ? data : [];
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
    return STATE.config;
  } catch (err) {
    console.warn("[ARENAS] No se pudo cargar configuracion.json:", err);
    return {};
  }
}


/* ================================================================
   MÓDULO 5: RENDER CATALOG
   Genera las tarjetas HTML del catálogo desde el array de datos.
   ================================================================ */

/**
 * Construye el HTML de una tarjeta de moto.
 * @param {Object} moto - objeto del catálogo
 * @returns {HTMLElement}
 */
function crearTarjetaMoto(moto) {
  const card = createElement("article", {
    class: "moto-card reveal-fade",
    role: "listitem",
    "aria-label": `${moto.linea} ${moto.modelo} ${moto.version || ""}`.trim(),
    "data-id":    moto.id,
    "data-linea": moto.linea,
  });

  // Imagen
  const imgHTML = moto.fotoPrincipal
    ? `<img
         src="${moto.fotoPrincipal}"
         alt="Moto ${moto.modelo} ${moto.version || ""}"
         loading="lazy"
         width="400"
         height="225"
       />`
    : `<div class="placeholder-media" aria-label="Imagen de ${moto.modelo} no disponible"></div>`;

  card.innerHTML = `
    <div class="moto-card__image">${imgHTML}</div>
    <div class="moto-card__body">
      <span class="moto-card__linea">${moto.linea}</span>
      <h3 class="moto-card__nombre">${moto.modelo}${moto.version ? " " + moto.version : ""}</h3>
      <p class="moto-card__desc">${moto.descripcion || ""}</p>
      ${moto.promocion ? `<span class="moto-card__badge">${moto.promocion}</span>` : ""}
      <p class="moto-card__price">${moto.precio || "Consultar precio"}</p>
    </div>
    <div class="moto-card__footer">
      <button
        class="btn btn-primary"
        type="button"
        aria-label="Consultar por ${moto.modelo} vía WhatsApp"
        data-modelo="${moto.modelo} ${moto.version || ""}".trim()
      >Cotizar</button>
      <span style="font-size: var(--text-xs); color: var(--color-muted);">${moto.cilindrada || ""}</span>
    </div>
  `.trim();

  // Evento WhatsApp en el botón de la tarjeta
  const btnCotizar = $(".btn", card);
  if (btnCotizar) {
    btnCotizar.addEventListener("click", () => {
      consultarPorWhatsApp(`${moto.modelo} ${moto.version || ""}`.trim());
    });
  }

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
    grid.innerHTML = `
      <p class="catalog-loading" role="status">
        No se encontraron motos con los filtros seleccionados.
      </p>`;
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

  // Actualizar precio en la sección destacada
  const precioEl = $(".featured-price strong");
  if (precioEl && moto.precio) {
    precioEl.textContent = moto.precio;
  }

  // Actualizar CTA WhatsApp del modelo destacado
  const ctaDestacado = $("#modelo-destacado .btn-primary");
  if (ctaDestacado) {
    ctaDestacado.addEventListener("click", (e) => {
      e.preventDefault();
      consultarPorWhatsApp(moto.modelo);
    });
  }
}


/* ================================================================
   MÓDULO 8: STORES RENDER
   Renderiza sedes desde configuracion.json si hay más de una.
   ================================================================ */

function renderizarTiendas() {
  const sedes = STATE.config.sedes;
  if (!sedes || sedes.length <= 1) return; // Con 1 sede, el HTML estático ya es suficiente

  const grid = $("#stores-grid");
  if (!grid) return;

  clearElement(grid);

  sedes.forEach(sede => {
    const card = createElement("article", {
      class: "store-card",
      role: "listitem",
      "aria-label": `${sede.nombre} — ARENAS MOTOCICLETAS`,
    });

    const telefono = STATE.config.whatsapp || "";
    const telLink  = telefono
      ? `<a href="tel:${telefono}" aria-label="Llamar a ${sede.nombre}">${telefono}</a>`
      : "";

    const mapsURL = sede.coordenadas
      ? `https://maps.google.com/?q=${sede.coordenadas}`
      : `https://maps.google.com/?q=${encodeURIComponent(sede.direccion + " Cusco Peru")}`;

    card.innerHTML = `
      <h3 class="store-name">${sede.nombre}</h3>
      <address class="store-address">
        ${sede.direccion || "Dirección pendiente"}<br />
        ${telLink}
      </address>
      <p class="store-hours">${sede.horario || "Horario pendiente"}</p>
      <a
        href="${mapsURL}"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-ghost"
        aria-label="Ver ${sede.nombre} en Google Maps"
      >Ver en mapa</a>
    `.trim();

    grid.appendChild(card);
  });
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
    if (validarFormulario(form)) {
      enviarFormularioPorWhatsApp(form);
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
 * Valida el formulario completo. Retorna true si es válido.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validarFormulario(form) {
  let valido = true;

  // Nombre
  const nombre = form.querySelector("#campo-nombre");
  if (!validarCampoRequerido(nombre, "El nombre es obligatorio.")) valido = false;

  // Teléfono
  const telefono = form.querySelector("#campo-telefono");
  if (!validarTelefono(telefono)) valido = false;

  // Checkbox de datos
  const checkDatos = form.querySelector("#campo-datos");
  if (checkDatos && !checkDatos.checked) {
    mostrarError(checkDatos, "error-datos", "Debes autorizar el tratamiento de datos para continuar.");
    valido = false;
  } else if (checkDatos) {
    ocultarError(checkDatos, "error-datos");
  }

  return valido;
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
  if (campo) campo.classList.add("is-invalid");
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.textContent = mensaje;
}

function ocultarError(campo, errorId) {
  if (campo) campo.classList.remove("is-invalid");
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.textContent = "";
}

/**
 * Construye el mensaje de WhatsApp con los datos del formulario y abre el chat.
 * NOTA: no envía a servidor externo — todo local.
 * @param {HTMLFormElement} form
 */
function enviarFormularioPorWhatsApp(form) {
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

    // 2. Cargar catálogo
    await cargarCatalogo();

    // 3. Renderizar catálogo en el DOM
    renderizarCatalogo();

    // 4. Actualizar modelo destacado
    actualizarModeloDestacado();

    // 5. Renderizar tiendas desde configuracion.json (si hay múltiples)
    renderizarTiendas();

    // 6. Inicializar buscador y filtros
    inicializarBuscador();

    // 7. Inicializar sistema de animaciones
    inicializarAnimaciones();

    // 8. Inicializar formulario de cotización
    inicializarFormulario();

    // 9. Inicializar menú móvil
    inicializarNavMobile();

    // 10. Año del copyright
    actualizarAnioCopyright();

    // 11. Evento de página lista
    trackEvent("app_ready", { secciones: document.querySelectorAll(".section").length });

  } catch (err) {
    console.error("[ARENAS] Error iniciando la aplicación:", err);
  }
}

// Arrancar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", inicializarApp);
