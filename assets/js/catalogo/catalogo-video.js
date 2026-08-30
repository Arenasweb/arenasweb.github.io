/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-video.js
   Los dos clips decorativos del catálogo: el fondo de la cabecera y
   la banda de transición previa al cierre.

   QUÉ HACE, EN UNA LÍNEA
   No descarga un vídeo hasta que su bloque se acerca a la pantalla,
   y lo pausa en cuanto se aleja.

   POR QUÉ NO SE PONE `src` EN EL HTML
   Un `<video src>` en el documento se descarga en cuanto el navegador
   lo encuentra, esté donde esté la página. La banda de transición vive
   por debajo de toda la rejilla: casi nadie llega, y todo el mundo la
   pagaría. La ruta viaja en `data-src` y solo se asigna cuando el
   IntersectionObserver dice que toca.

   EL POSTER ES EL SUELO, NO EL ADORNO
   Un <video> con `poster` y sin `src` muestra el poster. Eso significa
   que la página se ve terminada aunque el vídeo no llegue nunca: sin
   red, con autoplay bloqueado, con movimiento reducido o sin
   IntersectionObserver. No hay una rama de código para «si falla»:
   el estado de partida YA es el correcto.

   NADA DE ESTO LLEVA INFORMACIÓN
   Los dos clips son atmósfera. Ninguno muestra un modelo del catálogo
   —se comprobó frente a las fotografías reales y no coinciden—, así
   que van con `aria-hidden` y no se anuncian a un lector de pantalla.
   Quien no los vea no se pierde nada.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var CONFIG = {
    /** Margen de anticipación: se carga antes de entrar en pantalla. */
    margenCarga: "200px 0px",
    /** Visibilidad mínima para considerar que el bloque está a la vista. */
    umbral: 0.15,
    /**
     * Por debajo de este ancho, la banda de transición se queda en su
     * poster. Es decoración pura al final de la página: no compensa
     * gastar datos móviles en ella. La cabecera sí se reproduce —es lo
     * primero que se ve y da la cara por la página entera.
     */
    anchoMinimoTransicion: 700,
  };

  /**
   * Prepara un vídeo decorativo.
   *
   * @param {HTMLVideoElement} video
   * @param {{bucle:boolean, soloDesktop:boolean}} opciones
   */
  function conectar(video, opciones) {
    var fuente = video.getAttribute("data-src");
    if (!fuente) return;

    // Refuerzo por JS: sin `muted` en la propiedad (no solo en el
    // atributo) el navegador rechaza el autoplay.
    video.muted = true;

    var reducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    var estrecho = window.matchMedia("(max-width: " + (CONFIG.anchoMinimoTransicion - 1) + "px)");

    /** @returns {boolean} true si este vídeo no debe reproducirse aquí. */
    function bloqueado() {
      if (reducido.matches) return true;
      if (opciones.soloDesktop && estrecho.matches) return true;
      return false;
    }

    var cargado = false;
    var terminado = false;

    function cargar() {
      if (cargado) return;
      cargado = true;
      video.src = fuente;
      // Sin loop el navegador conserva el último fotograma al acabar,
      // que es exactamente lo que queremos en la cabecera: la moto
      // llega y se queda. Con loop volvería a empezar de golpe.
      if (opciones.bucle) video.loop = true;
      video.load();
    }

    function reproducir() {
      if (bloqueado()) return;
      cargar();
      if (terminado && !opciones.bucle) return;
      var p = video.play();
      // Un autoplay rechazado no es un error que haya que enseñar: el
      // poster ya está en pantalla y la página se lee igual.
      if (p && typeof p.catch === "function") p.catch(function () {});
    }

    video.addEventListener("ended", function () { terminado = true; });

    // Si el archivo no existe o no se puede decodificar, se descarta el
    // `src` para que el elemento vuelva a mostrar su poster en vez de
    // quedarse en negro.
    video.addEventListener("error", function () {
      video.removeAttribute("src");
      video.classList.add("is-fallback");
    });

    // Con movimiento reducido no se descarga nada en absoluto. Pausar
    // un vídeo ya descargado ahorra la animación pero no los megas.
    if (reducido.matches) return;

    if (!("IntersectionObserver" in window)) {
      // Navegador sin observador: se carga y punto. Es un caso raro y
      // no merece una segunda implementación que nadie va a mantener.
      reproducir();
      return;
    }

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            reproducir();
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { rootMargin: CONFIG.margenCarga, threshold: CONFIG.umbral }
    );
    observador.observe(video);

    // Si el usuario activa «reducir movimiento» con la página abierta,
    // el vídeo se detiene sin recargar nada.
    if (typeof reducido.addEventListener === "function") {
      reducido.addEventListener("change", function (e) {
        if (e.matches && !video.paused) video.pause();
      });
    }
  }

  function arrancar() {
    var cabecera = document.querySelector('[data-video-catalogo="hero"]');
    var transicion = document.querySelector('[data-video-catalogo="transicion"]');

    // La cabecera NO hace bucle: se comprobó fotograma a fotograma que
    // el primero y el último no encajan —la cámara avanza— y el corte
    // se vería en cada vuelta.
    if (cabecera) conectar(cabecera, { bucle: false, soloDesktop: false });

    // La rueda SÍ: primer y último fotograma coinciden en encuadre y el
    // desenfoque de movimiento tapa el salto de fase de la llanta.
    if (transicion) conectar(transicion, { bucle: true, soloDesktop: true });

    // La banda de experiencia de la portada. Mismo trato que la
    // transición: hace bucle —el manillar y el depósito ocupan la mitad
    // del cuadro y no se mueven, así que la vuelta no se nota— y no se
    // descarga en móvil, donde el poster cuenta lo mismo por 40 KB.
    var experiencia = document.querySelector('[data-video-catalogo="experiencia"]');
    if (experiencia) conectar(experiencia, { bucle: true, soloDesktop: true });
  }

  NS.video = { conectar: conectar, arrancar: arrancar, CONFIG: CONFIG };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})(window.ARENAS_CATALOGO);
