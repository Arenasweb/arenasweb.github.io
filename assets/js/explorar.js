/* ================================================================
   ARENAS MOTOCICLETAS — explorar.js
   Sincroniza el escenario fijo con el paso que se está leyendo.

   QUÉ HACE, EN UNA LÍNEA
   Enciende la fotografía de la pieza cuyo texto ocupa el centro de la
   pantalla.

   POR QUÉ UN OBSERVADOR Y NO EL SCROLL
   Escuchar `scroll` obliga a medir posiciones en cada fotograma, y medir
   provoca recálculo de diseño: el navegador tiene que resolver dónde
   está todo para responder. IntersectionObserver hace ese trabajo fuera
   del hilo principal y solo avisa cuando algo cruza el umbral. Con siete
   pasos la diferencia no se nota; con la página entera desplazándose,
   sí.

   SIN DEPENDENCIAS Y SIN ESTILOS EN LÍNEA
   Solo se añaden y quitan clases. La política de contenido de este sitio
   prohíbe `style=` en el HTML, y esa prohibición es justo lo que permite
   que la política sea estricta.
   ================================================================ */

(function () {
  "use strict";

  /* La franja del centro de la pantalla que decide qué paso manda. Un
     umbral simple (0.5) fallaría con pasos más altos que la ventana:
     nunca llegarían a estar visibles al 50%. */
  var MARGEN = "-45% 0px -45% 0px";

  function iniciar() {
    var pasos = Array.prototype.slice.call(document.querySelectorAll(".ex-paso"));
    var vistas = Array.prototype.slice.call(document.querySelectorAll(".ex-vista"));
    var listaPuntos = document.getElementById("ex-puntos");
    if (!pasos.length || !vistas.length) return;

    /* ---------------- Puntos de recorrido ----------------
       Se construyen desde los pasos y no se escriben en el HTML: así el
       número de puntos no puede quedar desfasado del número de piezas. */
    var puntos = [];
    if (listaPuntos) {
      pasos.forEach(function (paso, i) {
        var li = document.createElement("li");
        li.className = "ex-punto" + (i === 0 ? " is-activo" : "");
        listaPuntos.appendChild(li);
        puntos.push(li);
      });
    }

    var activa = "";

    function encender(zona) {
      if (!zona || zona === activa) return;
      activa = zona;

      vistas.forEach(function (v) {
        v.classList.toggle("is-activa", v.getAttribute("data-zona") === zona);
      });
      pasos.forEach(function (p, i) {
        var esta = p.getAttribute("data-zona") === zona;
        p.classList.toggle("is-activo", esta);
        if (puntos[i]) puntos[i].classList.toggle("is-activo", esta);
      });
    }

    // Estado de partida: el primer paso, encendido desde el principio.
    encender(pasos[0].getAttribute("data-zona"));

    if (!("IntersectionObserver" in window)) {
      // Sin observador se encienden todas: se pierde el recorrido, no el
      // contenido. Nadie se queda mirando un escenario en blanco.
      vistas.forEach(function (v) { v.classList.add("is-activa"); });
      pasos.forEach(function (p) { p.classList.add("is-activo"); });
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      // Se elige la entrada MÁS visible y no la última que avisó: al
      // desplazarse rápido llegan varias a la vez y quedarse con la
      // última hace que el escenario salte a una pieza que ya pasó.
      var mejor = null;
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (!mejor || e.intersectionRatio > mejor.intersectionRatio) mejor = e;
      });
      if (mejor) encender(mejor.target.getAttribute("data-zona"));
    }, { rootMargin: MARGEN, threshold: [0, 0.25, 0.5, 0.75, 1] });

    pasos.forEach(function (p) { observador.observe(p); });

    /* ---------------- Precarga por adelantado ----------------
       Las vistas van con `loading="lazy"` para no descargar siete
       fotografías de golpe al abrir. Pero si se espera a que cada una
       entre en pantalla, la primera vez que se cambia de pieza se ve el
       hueco. Al llegar al recorrido se pide la siguiente y ya está.

       Se hace una sola vez: a partir de ahí el navegador las tiene. */
    var precargadas = false;
    var centinela = new IntersectionObserver(function (entradas) {
      if (precargadas || !entradas.some(function (e) { return e.isIntersecting; })) return;
      precargadas = true;
      vistas.forEach(function (v) { v.loading = "eager"; });
      centinela.disconnect();
    }, { rootMargin: "300px 0px 0px 0px" });
    centinela.observe(pasos[0]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
