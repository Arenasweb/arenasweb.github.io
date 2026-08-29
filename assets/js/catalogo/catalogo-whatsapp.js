/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-whatsapp.js
   Canal de ventas del subsistema de catálogo: un botón «Lo quiero»
   que abre WhatsApp con el modelo y el color que el cliente tiene
   delante.

   POR QUÉ EXISTE ESTE ARCHIVO. modelo.html no carga script.js, así
   que la lógica de WhatsApp de la portada no llega hasta la ficha.
   En vez de copiar el número aquí —que sería el segundo número del
   sitio, y el primer paso hacia ocho— este módulo lee el MISMO
   data/configuracion.json. La fuente de verdad sigue siendo una.

   UN SOLO NÚMERO, TRES VENDEDORES. No hay reparto, ni rotación, ni
   un número por modelo. Todas las consultas entran por la cuenta de
   WhatsApp Business de la empresa y los tres asesores la atienden
   desde sus dispositivos vinculados, viendo el mismo historial. Esa
   parte se configura dentro de WhatsApp Business, no aquí — ver
   CONFIGURACION_WHATSAPP_3_VENDEDORES.md.

   Sin backend, sin API de Meta, sin tokens, sin OpenWA: el enlace
   wa.me es público y el cliente pulsa «Enviar» desde su propia
   cuenta. Este módulo no recoge ni guarda ningún dato personal.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;

  var CONFIG = {
    rutaConfig: "data/configuracion.json",
    timeoutMs: 8000,
    /** Lo que se escribe cuando el modelo no tiene color elegido. */
    colorSinElegir: "color por definir",
    /** Mínimo de dígitos para que un número parezca un móvil con prefijo. */
    minDigitos: 9,
  };

  /**
   * Canal cargado desde configuracion.json. `numero` se queda vacío
   * mientras no haya un número aprobado: ese es el estado seguro, y
   * enlace() devuelve "" en cuanto lo ve.
   */
  var canal = { numero: "", confirmado: false, cargado: false };

  /* ---------------- Carga del canal ---------------- */

  /**
   * Lee el canal de ventas desde la configuración global.
   *
   * Un fallo de red no rompe la ficha: el canal se queda sin
   * confirmar y el botón se comporta como cuando gerencia aún no ha
   * aprobado el número. Es preferible un botón que avisa a un botón
   * que abre un chat inexistente.
   *
   * @returns {Promise<{numero:string,confirmado:boolean}>}
   */
  function cargar() {
    if (canal.cargado) return Promise.resolve(canal);

    var control = typeof AbortController === "function" ? new AbortController() : null;
    var reloj = control ? setTimeout(function () { control.abort(); }, CONFIG.timeoutMs) : null;

    return fetch(CONFIG.rutaConfig, {
      signal: control ? control.signal : undefined,
      cache: "no-store",
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (datos) {
        if (reloj) clearTimeout(reloj);
        canal.cargado = true;
        if (!datos) return canal;
        canal.confirmado = datos.whatsappConfirmado === true;
        canal.numero = soloDigitos(datos.whatsapp);
        return canal;
      });
  }

  /* ---------------- Construcción del enlace ---------------- */

  /**
   * Deja solo dígitos. wa.me no admite «+», espacios, guiones ni
   * paréntesis, y un número con formato humano da un enlace muerto.
   * @param {*} valor
   * @returns {string}
   */
  function soloDigitos(valor) {
    return typeof valor === "string" ? valor.replace(/\D/g, "") : "";
  }

  /**
   * Código corto de consulta. No identifica a nadie: sirve para que
   * cliente y asesor nombren la misma conversación en voz alta.
   * @returns {string} p. ej. "ARN-K3F9"
   */
  function generarId() {
    var azar = Math.floor(Math.random() * Math.pow(36, 4)).toString(36).toUpperCase();
    return "ARN-" + (azar.length < 4 ? new Array(5 - azar.length).join("0") + azar : azar);
  }

  /**
   * Texto de la consulta, en primera persona: lo envía el cliente
   * desde su cuenta, no la empresa.
   *
   * No menciona precio, stock, financiamiento ni fechas. Nada de eso
   * está confirmado en el catálogo, y adelantarlo en el mensaje de
   * entrada es comprometer a ventas antes de que hayan contestado.
   *
   * @param {string} modelo
   * @param {string} color  - vacío ⇒ "color por definir"
   * @param {string} leadId
   * @returns {string} texto plano, sin codificar
   */
  function mensaje(modelo, color, leadId) {
    var nombreModelo = U.texto(modelo, 80) || "una de sus motocicletas";
    var nombreColor = U.texto(color, 60) || CONFIG.colorSinElegir;
    return (
      "Hola, equipo de ARENAS. Estoy interesado(a) en la " + nombreModelo +
      ", color " + nombreColor + ". La vi en su catálogo web y quisiera " +
      "recibir información sobre precio, disponibilidad y opciones de compra. " +
      "Código de consulta: " + leadId + "."
    );
  }

  /**
   * URL de wa.me lista para abrir.
   *
   * Devuelve "" —y no un enlace a medias— si el canal no está
   * aprobado o el número no parece un móvil. Un llamador que olvide
   * comprobarlo no puede abrir un chat falso: solo obtiene "".
   *
   * @param {string} modelo
   * @param {string} [color]
   * @param {string} [leadId] - se genera si no se pasa
   * @returns {string} URL completa, o "" si el canal no está listo
   */
  function enlace(modelo, color, leadId) {
    if (!canal.confirmado) return "";
    if (canal.numero.length < CONFIG.minDigitos) return "";
    var texto = mensaje(modelo, color, leadId || generarId());
    return "https://wa.me/" + canal.numero + "?text=" + encodeURIComponent(texto);
  }

  /**
   * Abre WhatsApp en una pestaña nueva.
   *
   * `noopener,noreferrer` corta el acceso de la pestaña abierta a la
   * ficha. Si el navegador bloquea la ventana emergente, se navega en
   * la misma pestaña: es preferible salir de la ficha a dejar al
   * cliente pulsando un botón que no responde.
   *
   * @param {string} url
   * @returns {boolean} false si no había enlace que abrir
   */
  function abrir(url) {
    if (!url) return false;
    var ventana = window.open(url, "_blank", "noopener,noreferrer");
    if (!ventana) window.location.href = url;
    return true;
  }

  /** @returns {boolean} true si hay un número aprobado y utilizable. */
  function disponible() {
    return canal.confirmado && canal.numero.length >= CONFIG.minDigitos;
  }

  NS.whatsapp = {
    CONFIG: CONFIG,
    cargar: cargar,
    enlace: enlace,
    abrir: abrir,
    mensaje: mensaje,
    generarId: generarId,
    disponible: disponible,
    soloDigitos: soloDigitos,
    /** Solo para pruebas: inyecta el canal sin pasar por la red. */
    _fijarCanal: function (numero, confirmado) {
      canal = { numero: soloDigitos(numero), confirmado: confirmado === true, cargado: true };
    },
  };
})(window.ARENAS_CATALOGO);
