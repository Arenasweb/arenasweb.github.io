/* ================================================================
   ARENAS MOTOCICLETAS — catalogo-finder-ui.js
   Interfaz de «Encuentra la moto para tu camino».

   POR QUÉ ESTÁ SEPARADO DE catalogo-finder.js
   Allí vive lo que se puede probar en Node; aquí, lo que necesita un
   navegador. La separación no es estética: permite que las decisiones
   —qué coincide, qué pasos tienen sentido, en qué orden se sugiere—
   estén cubiertas por pruebas sin simular un DOM entero.

   POR QUÉ ESTÁ SEPARADO DE catalogo-app.js
   `catalogo-app.js` es el controlador de la rejilla y de los filtros.
   Este archivo es un consumidor más de ese mismo estado: pide cambios
   por `NS.app.store.aplicar()` y se entera de ellos por
   `NS.app.store.suscribir()`. No tiene estado de filtrado propio, y por
   eso no puede desincronizarse del panel lateral ni de la URL.

   LO QUE NO HACE
   No guarda nada: ni almacenamiento local, ni cookies, ni perfiles.
   No pide datos personales. No promete que una moto sea «la mejor»:
   explica por qué coincide, que es lo único que los datos sostienen.
   ================================================================ */

window.ARENAS_CATALOGO = window.ARENAS_CATALOGO || {};

(function (NS) {
  "use strict";

  var U = NS.utils;
  var F = NS.finder;

  /** Espera antes de recalcular sugerencias mientras se escribe. */
  var RETARDO_SUGERENCIAS = 180;

  /** Por debajo de este ancho el asistente se comporta como diálogo. */
  var MEDIA_ESCRITORIO = "(min-width: 861px)";

  var raiz = null;
  var estado = null;

  /** Todo lo que el asistente recuerda. Se borra al reiniciar. */
  var asistente = { abierto: false, indice: 0, respuestas: {}, origenFoco: null, modal: false };

  var refs = {};
  var sugerenciasActuales = [];
  var indiceActivo = -1;

  function esEscritorio() {
    try {
      return !!(window.matchMedia && window.matchMedia(MEDIA_ESCRITORIO).matches);
    } catch (e) {
      return false;
    }
  }

  /* ================================================================
     MONTAJE
     ================================================================ */

  function retirar() {
    var host = document.getElementById("catalogo-finder");
    if (host) {
      U.vaciar(host);
      host.hidden = true;
    }
    raiz = null;
  }

  function montar(estadoCatalogo) {
    var host = document.getElementById("catalogo-finder");
    if (!host || !estadoCatalogo || !estadoCatalogo.modelos.length) {
      retirar();
      return;
    }

    estado = estadoCatalogo;
    U.vaciar(host);
    host.hidden = false;

    raiz = U.el("div", { class: "finder" });
    raiz.appendChild(construirCabecera());

    var caminos = U.el("div", { class: "finder__caminos" });
    caminos.appendChild(construirBusquedaDirecta());

    // El asistente solo se ofrece si hay al menos una pregunta que
    // tenga sentido hacer. Con un catálogo de una sola categoría, una
    // sola línea y sin colores, «Ayúdame a elegir» no ayudaría a nada.
    if (F.pasos(estado, {}).length) {
      caminos.appendChild(construirEntradaAsistente());
    }
    raiz.appendChild(caminos);

    refs.wizard = construirWizard();
    raiz.appendChild(refs.wizard);

    refs.resumen = U.el("div", { class: "finder__resumen", hidden: true });
    raiz.appendChild(refs.resumen);

    host.appendChild(raiz);

    NS.app.store.suscribir(alCambiarEstado);
    conectarTeclado();
  }

  function construirCabecera() {
    var cab = U.el("div", { class: "finder__cabecera" });
    cab.appendChild(U.el("p", { class: "finder__eyebrow" }, "Catálogo ARENAS"));
    cab.appendChild(U.el("h2", { class: "finder__titulo", id: "finder-titulo" },
      "Encuentra la moto para tu camino"));
    cab.appendChild(U.el("p", { class: "finder__texto" },
      "Busca un modelo directamente o cuéntanos cómo piensas usarla."));
    return cab;
  }

  /* ================================================================
     CAMINO A — BÚSQUEDA DIRECTA
     Patrón combobox con lista de sugerencias. Los roles se ponen
     porque el comportamiento es realmente ese, no para rellenar un
     hueco de accesibilidad.
     ================================================================ */

  function construirBusquedaDirecta() {
    var caja = U.el("div", { class: "finder__camino finder__camino--directo" });
    caja.appendChild(U.el("h3", { class: "finder__camino-titulo", id: "finder-directo-titulo" },
      "Ya tengo una moto en mente"));

    var campo = U.el("div", { class: "finder__campo", role: "search",
      "aria-labelledby": "finder-directo-titulo" });

    campo.appendChild(U.el("label", { class: "finder__label", for: "finder-input" },
      "Buscar por modelo o línea"));

    var envoltura = U.el("div", { class: "finder__input-wrap" });

    refs.input = U.el("input", {
      type: "text",
      id: "finder-input",
      class: "form-input finder__input",
      placeholder: "Ej.: Pulsar, Dominar, Boxer",
      autocomplete: "off",
      spellcheck: "false",
      maxlength: String(F.MAX_CONSULTA),
      role: "combobox",
      "aria-expanded": "false",
      "aria-controls": "finder-sugerencias",
      "aria-autocomplete": "list",
      "aria-describedby": "finder-ayuda",
    });

    refs.lista = U.el("ul", {
      id: "finder-sugerencias",
      class: "finder__sugerencias",
      role: "listbox",
      "aria-label": "Sugerencias de modelos",
      hidden: true,
    });

    envoltura.appendChild(refs.input);
    envoltura.appendChild(refs.lista);
    campo.appendChild(envoltura);

    campo.appendChild(U.el("p", { class: "finder__ayuda", id: "finder-ayuda" },
      "Escribe y usa las flechas para elegir. Enter aplica la búsqueda."));

    // Anuncio para lectores de pantalla. Se rellena solo cuando el
    // número de sugerencias cambia: hablar en cada pulsación convertiría
    // el campo en un ruido continuo.
    refs.aviso = U.el("p", { class: "sr-only", role: "status", "aria-live": "polite" });
    campo.appendChild(refs.aviso);

    // Aparece únicamente cuando la búsqueda deja un solo modelo con
    // ficha: es la forma de llegar a la ficha sin meter un enlace
    // dentro de la lista de opciones, que rompería el patrón.
    refs.atajoFicha = U.el("p", { class: "finder__atajo", hidden: true });
    campo.appendChild(refs.atajoFicha);

    caja.appendChild(campo);
    conectarBusqueda();
    return caja;
  }

  function conectarBusqueda() {
    var recalcular = U.debounce(function () {
      pintarSugerencias(refs.input.value);
    }, RETARDO_SUGERENCIAS);

    refs.input.addEventListener("input", recalcular);

    refs.input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!sugerenciasActuales.length) return;
        e.preventDefault();
        mover(e.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (indiceActivo >= 0 && sugerenciasActuales[indiceActivo]) {
          elegirSugerencia(sugerenciasActuales[indiceActivo].modelo);
        } else {
          aplicarTexto(refs.input.value);
        }
        return;
      }
      if (e.key === "Escape") {
        if (!refs.lista.hidden) {
          e.preventDefault();
          e.stopPropagation();
          cerrarSugerencias();
        }
        return;
      }
      if (e.key === "Tab") cerrarSugerencias();
    });

    // Al salir del campo la lista sobra. Se retrasa un instante porque
    // el clic sobre una opción quita el foco antes de dispararse.
    refs.input.addEventListener("blur", function () {
      window.setTimeout(function () {
        if (raiz && !raiz.contains(document.activeElement)) cerrarSugerencias();
      }, 120);
    });
  }

  function pintarSugerencias(consulta) {
    var q = U.texto(consulta, F.MAX_CONSULTA);
    sugerenciasActuales = F.sugerencias(estado.modelos, q);
    indiceActivo = -1;

    U.vaciar(refs.lista);

    if (!sugerenciasActuales.length) {
      cerrarSugerencias();
      // Sin coincidencias no se dice nada por voz: la persona sigue
      // escribiendo y ya lo verá al terminar.
      if (refs.aviso) refs.aviso.textContent = "";
      return;
    }

    sugerenciasActuales.forEach(function (item, i) {
      refs.lista.appendChild(construirOpcion(item.modelo, i));
    });

    refs.lista.hidden = false;
    refs.input.setAttribute("aria-expanded", "true");
    refs.aviso.textContent = sugerenciasActuales.length === 1
      ? "1 modelo sugerido"
      : sugerenciasActuales.length + " modelos sugeridos";
  }

  function construirOpcion(modelo, i) {
    var op = U.el("li", {
      class: "finder__sugerencia",
      id: "finder-op-" + i,
      role: "option",
      "aria-selected": "false",
    });

    var principal = U.el("span", { class: "finder__sugerencia-nombre" },
      modelo.titulo || modelo.modelo || "");
    op.appendChild(principal);

    var detalle = [];
    if (modelo.linea) detalle.push(modelo.linea);
    var cat = NS.data.tituloCategoria(estado, modelo.categoria);
    if (cat) detalle.push(cat);
    if (detalle.length) {
      op.appendChild(U.el("span", { class: "finder__sugerencia-meta" }, detalle.join(" · ")));
    }

    if (modelo.nuevo === true) {
      op.appendChild(U.el("span", { class: "finder__sugerencia-tag" }, "Nuevo"));
    } else if (modelo.destacado === true) {
      op.appendChild(U.el("span", { class: "finder__sugerencia-tag" }, "Destacado"));
    }

    op.addEventListener("mousedown", function (e) {
      // mousedown y no click: el click llega después del blur y la lista
      // ya se habría cerrado.
      e.preventDefault();
      elegirSugerencia(modelo);
    });

    return op;
  }

  function mover(delta) {
    var n = sugerenciasActuales.length;
    if (!n) return;
    indiceActivo = indiceActivo < 0
      ? (delta > 0 ? 0 : n - 1)
      : (indiceActivo + delta + n) % n;

    Array.prototype.forEach.call(refs.lista.children, function (nodo, i) {
      var activo = i === indiceActivo;
      nodo.classList.toggle("is-activa", activo);
      nodo.setAttribute("aria-selected", activo ? "true" : "false");
    });
    refs.input.setAttribute("aria-activedescendant", "finder-op-" + indiceActivo);
    var nodo = refs.lista.children[indiceActivo];
    if (nodo && nodo.scrollIntoView) nodo.scrollIntoView({ block: "nearest" });
  }

  function cerrarSugerencias() {
    if (!refs.lista) return;
    refs.lista.hidden = true;
    U.vaciar(refs.lista);
    sugerenciasActuales = [];
    indiceActivo = -1;
    refs.input.setAttribute("aria-expanded", "false");
    refs.input.removeAttribute("aria-activedescendant");
  }

  function elegirSugerencia(modelo) {
    var nombre = modelo.titulo || modelo.modelo || "";
    refs.input.value = nombre;
    cerrarSugerencias();
    aplicarTexto(nombre);
    refs.input.focus();
  }

  /** Manda el texto al estado compartido. No navega. */
  function aplicarTexto(valor) {
    cerrarSugerencias();
    NS.app.store.aplicar({ texto: U.texto(valor, F.MAX_CONSULTA) });
  }

  /* ================================================================
     CAMINO B — ASISTENTE
     ================================================================ */

  function construirEntradaAsistente() {
    var caja = U.el("div", { class: "finder__camino finder__camino--guia" });
    caja.appendChild(U.el("h3", { class: "finder__camino-titulo" }, "Ayúdame a elegir"));
    caja.appendChild(U.el("p", { class: "finder__camino-texto" },
      "Responde unas preguntas breves y te mostraremos las opciones que encajan con lo que buscas."));

    refs.abrir = U.el("button", {
      type: "button",
      class: "btn btn-primary finder__empezar",
      "aria-expanded": "false",
      "aria-controls": "finder-wizard",
    }, "Empezar");
    refs.abrir.addEventListener("click", function () {
      if (asistente.abierto) cerrarAsistente(true);
      else abrirAsistente();
    });

    caja.appendChild(refs.abrir);
    return caja;
  }

  function construirWizard() {
    refs.velo = U.el("div", { class: "finder__velo", hidden: true });
    refs.velo.addEventListener("click", function () { cerrarAsistente(true); });

    var w = U.el("div", {
      id: "finder-wizard",
      class: "finder__wizard",
      "aria-labelledby": "finder-wizard-titulo",
      hidden: true,
    });

    var cab = U.el("div", { class: "finder__wizard-cabecera" });
    refs.wizardTitulo = U.el("p", {
      class: "finder__wizard-titulo",
      id: "finder-wizard-titulo",
    }, "Ayúdame a elegir");
    cab.appendChild(refs.wizardTitulo);

    refs.cerrar = U.el("button", {
      type: "button",
      class: "finder__wizard-cerrar",
      "aria-label": "Cerrar el asistente",
    }, "×");
    refs.cerrar.addEventListener("click", function () { cerrarAsistente(true); });
    cab.appendChild(refs.cerrar);

    w.appendChild(cab);

    refs.progreso = U.el("p", { class: "finder__progreso" });
    w.appendChild(refs.progreso);

    refs.cuerpo = U.el("div", { class: "finder__wizard-cuerpo" });
    w.appendChild(refs.cuerpo);

    refs.pie = U.el("div", { class: "finder__wizard-pie" });
    w.appendChild(refs.pie);

    var contenedor = U.el("div", { class: "finder__wizard-host" });
    contenedor.appendChild(refs.velo);
    contenedor.appendChild(w);
    return contenedor;
  }

  function abrirAsistente() {
    asistente.abierto = true;
    asistente.origenFoco = document.activeElement;
    asistente.modal = !esEscritorio();

    var w = document.getElementById("finder-wizard");
    w.hidden = false;
    refs.velo.hidden = !asistente.modal;
    refs.abrir.setAttribute("aria-expanded", "true");

    // Los roles de diálogo se ponen SOLO cuando el panel se comporta
    // como tal. En escritorio es una región integrada en la página: el
    // contenido de detrás sigue siendo accesible y decir «modal» sería
    // mentirle al lector de pantalla.
    if (asistente.modal) {
      w.setAttribute("role", "dialog");
      w.setAttribute("aria-modal", "true");
      document.body.classList.add("has-finder-abierto");
    } else {
      w.setAttribute("role", "group");
      w.removeAttribute("aria-modal");
    }

    pintarPaso();
    var primero = w.querySelector("button, [href], input, select");
    if (primero) primero.focus();
  }

  function cerrarAsistente(devolverFoco) {
    if (!asistente.abierto) return;
    asistente.abierto = false;
    var w = document.getElementById("finder-wizard");
    if (w) {
      w.hidden = true;
      w.removeAttribute("aria-modal");
      w.setAttribute("role", "group");
    }
    if (refs.velo) refs.velo.hidden = true;
    if (refs.abrir) refs.abrir.setAttribute("aria-expanded", "false");
    document.body.classList.remove("has-finder-abierto");

    // El foco NO puede quedarse dentro de un panel que acaba de
    // ocultarse: quien navega con teclado se quedaría en un elemento que
    // ya no existe visualmente. Si el origen no sirve —porque el panel
    // se abrió sin que el botón tuviera el foco, o porque ese nodo ya no
    // está en el documento— se vuelve al botón que lo abre, que siempre
    // es un destino válido.
    if (devolverFoco !== false) {
      var destino = asistente.origenFoco;
      if (!destino || !destino.focus || destino === document.body ||
          (document.contains && !document.contains(destino))) {
        destino = refs.abrir;
      }
      if (destino && destino.focus) destino.focus();
    }
    asistente.origenFoco = null;
    asistente.modal = false;
  }

  /** Pasos vigentes con las respuestas de ahora mismo. */
  function pasosVigentes() {
    return F.pasos(estado, asistente.respuestas);
  }

  function candidatos() {
    return F.filtrar(estado.modelos, F.criteriosDe(asistente.respuestas));
  }

  function pintarPaso() {
    var pasos = pasosVigentes();
    U.vaciar(refs.cuerpo);
    U.vaciar(refs.pie);

    // Responder puede hacer desaparecer pasos posteriores: si el índice
    // se sale de la lista, es que ya no quedan preguntas útiles.
    if (asistente.indice >= pasos.length) return pintarResultados(pasos);

    var paso = pasos[asistente.indice];
    refs.progreso.hidden = false;
    refs.progreso.textContent = "Paso " + (asistente.indice + 1) + " de " + pasos.length;

    refs.cuerpo.appendChild(U.el("p", { class: "finder__pregunta", id: "finder-pregunta" },
      paso.pregunta));

    var grupo = U.el("div", {
      class: "finder__opciones",
      role: "radiogroup",
      "aria-labelledby": "finder-pregunta",
    });

    var elegido = asistente.respuestas[paso.id] || "";

    paso.opciones.forEach(function (op) {
      grupo.appendChild(construirOpcionPaso(paso, op, elegido === op.valor || elegido === op.slug));
    });

    // «Sin preferencia» siempre existe: nadie debe verse obligado a
    // responder algo que no sabe para poder seguir.
    grupo.appendChild(construirOpcionPaso(paso,
      { valor: "", texto: paso.id === "categoria" ? "Todavía no lo sé" : "Sin preferencia" },
      !elegido));

    refs.cuerpo.appendChild(grupo);
    pintarPie(pasos, false);
  }

  function construirOpcionPaso(paso, op, activa) {
    var valor = op.valor !== undefined ? op.valor : op.slug;
    var btn = U.el("button", {
      type: "button",
      class: "finder__opcion" + (activa ? " is-activa" : ""),
      role: "radio",
      "aria-checked": activa ? "true" : "false",
    });

    // La muestra de color es decorativa: el nombre va siempre en texto,
    // porque el color por sí solo no es información accesible.
    if (paso.id === "color" && op.hex) {
      var punto = U.el("span", { class: "finder__muestra", "aria-hidden": "true" });
      punto.style.backgroundColor = op.hex;
      btn.appendChild(punto);
    }
    btn.appendChild(U.el("span", { class: "finder__opcion-texto" }, op.texto));

    btn.addEventListener("click", function () {
      asistente.respuestas[paso.id] = valor;
      asistente.indice += 1;
      pintarPaso();
      enfocarCuerpo();
    });

    return btn;
  }

  function pintarPie(pasos, enResultados) {
    var n = candidatos().length;

    var info = U.el("p", { class: "finder__coincidencias", role: "status", "aria-live": "polite" },
      n === 1 ? "1 modelo coincide" : n + " modelos coinciden");
    refs.pie.appendChild(info);

    var acciones = U.el("div", { class: "finder__acciones" });

    if (asistente.indice > 0) {
      var atras = U.el("button", { type: "button", class: "btn btn-secondary" }, "Atrás");
      atras.addEventListener("click", function () {
        // Volver NO borra lo respondido: se vuelve a pintar el paso con
        // su opción marcada, para poder cambiarla o confirmarla.
        asistente.indice = Math.max(0, asistente.indice - 1);
        pintarPaso();
        enfocarCuerpo();
      });
      acciones.appendChild(atras);
    }

    if (enResultados) {
      var ver = U.el("button", { type: "button", class: "btn btn-primary" },
        n === 1 ? "Ver el modelo" : "Ver los " + n + " modelos");
      ver.addEventListener("click", aplicarAsistente);
      acciones.appendChild(ver);
    }

    var reiniciar = U.el("button", { type: "button", class: "finder__reset" }, "Empezar de nuevo");
    reiniciar.addEventListener("click", function () {
      asistente.respuestas = {};
      asistente.indice = 0;
      NS.app.store.limpiar();
      pintarPaso();
      enfocarCuerpo();
    });
    acciones.appendChild(reiniciar);

    refs.pie.appendChild(acciones);
  }

  function pintarResultados(pasos) {
    refs.progreso.hidden = true;
    var lista = candidatos();
    var criterios = F.criteriosDe(asistente.respuestas);

    refs.cuerpo.appendChild(U.el("p", { class: "finder__pregunta" },
      lista.length ? "Estas opciones encajan con tus preferencias" : "No encontramos coincidencias"));

    if (!lista.length) {
      refs.cuerpo.appendChild(U.el("p", { class: "finder__camino-texto" },
        "Prueba a cambiar alguna respuesta, o mira el catálogo completo."));
    } else {
      // Se muestran unas pocas, con el motivo real de la coincidencia.
      // No se afirma que ninguna sea mejor: los datos disponibles no
      // sostienen esa afirmación.
      var muestra = U.el("ul", { class: "finder__muestras" });
      lista.slice(0, 3).forEach(function (modelo) {
        var li = U.el("li", { class: "finder__muestra-item" });
        li.appendChild(U.el("span", { class: "finder__muestra-nombre" },
          modelo.titulo || modelo.modelo || ""));
        var razones = F.motivos(modelo, criterios, estado);
        if (razones.length) {
          li.appendChild(U.el("span", { class: "finder__muestra-motivo" }, razones.join(" · ")));
        }
        muestra.appendChild(li);
      });
      refs.cuerpo.appendChild(muestra);
      if (lista.length > 3) {
        refs.cuerpo.appendChild(U.el("p", { class: "finder__camino-texto" },
          "Y " + (lista.length - 3) + " más en el catálogo."));
      }
    }

    pintarPie(pasos, true);
  }

  function enfocarCuerpo() {
    var primero = refs.cuerpo.querySelector("button");
    if (primero) primero.focus();
  }

  /** Vuelca las respuestas al estado compartido y cierra. */
  function aplicarAsistente() {
    var criterios = F.criteriosDe(asistente.respuestas);
    // El asistente no toca el orden: si alguien eligió «Precio: menor a
    // mayor», responder unas preguntas no debe deshacerlo.
    NS.app.store.aplicar(criterios);
    cerrarAsistente(false);

    var destino = document.getElementById("catalogo-toolbar") || document.getElementById("catalogo-grid");
    if (destino) {
      var contador = document.getElementById("catalogo-contador");
      if (contador) {
        contador.setAttribute("tabindex", "-1");
        contador.focus({ preventScroll: true });
      }
      destino.scrollIntoView({
        behavior: U.movimientoReducido() ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  /* ================================================================
     RESUMEN DE CRITERIOS ACTIVOS
     ================================================================ */

  function alCambiarEstado(evento) {
    pintarResumen(evento.criterios, evento.resultados);
    sincronizarInput(evento.criterios);
    pintarAtajoFicha(evento.criterios, evento.resultados);
  }

  function sincronizarInput(criterios) {
    if (refs.input && document.activeElement !== refs.input && refs.input.value !== criterios.texto) {
      refs.input.value = criterios.texto;
    }
  }

  /** Nombres legibles de lo que está filtrando ahora mismo. */
  function etiquetasDe(criterios) {
    var salida = [];
    if (criterios.texto) salida.push({ clave: "texto", texto: "“" + criterios.texto + "”" });
    if (criterios.categoria) {
      salida.push({ clave: "categoria", texto: NS.data.tituloCategoria(estado, criterios.categoria) });
    }
    if (criterios.linea) salida.push({ clave: "linea", texto: criterios.linea });
    if (criterios.color) {
      var nombre = criterios.color;
      F.coloresDe(estado.modelos).forEach(function (c) {
        if (c.valor === criterios.color) nombre = c.texto;
      });
      salida.push({ clave: "color", texto: "Color " + nombre });
    }
    if (criterios.precio) {
      var texto = criterios.precio;
      F.rangosPrecio(estado.modelos, estado.config).forEach(function (t) {
        if (t.valor === criterios.precio) texto = t.texto;
      });
      salida.push({ clave: "precio", texto: texto });
    }
    return salida;
  }

  function pintarResumen(criterios, resultados) {
    if (!refs.resumen) return;
    var etiquetas = etiquetasDe(criterios);
    U.vaciar(refs.resumen);

    if (!etiquetas.length) {
      refs.resumen.hidden = true;
      return;
    }

    refs.resumen.hidden = false;
    refs.resumen.appendChild(U.el("p", { class: "finder__resumen-titulo" },
      resultados === 0
        ? "Ningún modelo coincide con:"
        : "Mostrando modelos que coinciden con:"));

    var chips = U.el("ul", { class: "finder__resumen-lista" });
    etiquetas.forEach(function (etq) {
      var li = U.el("li", { class: "finder__resumen-item" });
      var btn = U.el("button", {
        type: "button",
        class: "finder__resumen-quitar",
        "aria-label": "Quitar el criterio " + etq.texto,
      });
      btn.appendChild(U.el("span", { class: "finder__resumen-texto" }, etq.texto));
      btn.appendChild(U.el("span", { class: "finder__resumen-x", "aria-hidden": "true" }, "×"));
      btn.addEventListener("click", function () {
        var cambio = {};
        cambio[etq.clave] = "";
        NS.app.store.aplicar(cambio);
        if (etq.clave === "texto" && refs.input) refs.input.value = "";
        // Si el asistente había puesto ese criterio, su recuerdo también
        // sobra: si no, volver a abrirlo mostraría una respuesta que ya
        // no está aplicada.
        delete asistente.respuestas[etq.clave];
      });
      li.appendChild(btn);
      chips.appendChild(li);
    });
    refs.resumen.appendChild(chips);

    if (resultados === 0) {
      var acciones = U.el("div", { class: "finder__resumen-acciones" });
      var limpiar = U.el("button", { type: "button", class: "btn btn-secondary" },
        "Ver todos los modelos");
      limpiar.addEventListener("click", function () {
        asistente.respuestas = {};
        asistente.indice = 0;
        if (refs.input) refs.input.value = "";
        NS.app.store.limpiar();
      });
      acciones.appendChild(limpiar);
      acciones.appendChild(U.el("a", { class: "btn btn-secondary", href: "index.html#contacto" },
        "Ir a contacto"));
      refs.resumen.appendChild(acciones);
    }
  }

  /**
   * Atajo a la ficha cuando la búsqueda deja un único modelo.
   * Vive fuera de la lista de sugerencias a propósito: un enlace dentro
   * de un `listbox` rompe el patrón y confunde al lector de pantalla.
   */
  function pintarAtajoFicha(criterios, resultados) {
    if (!refs.atajoFicha) return;
    U.vaciar(refs.atajoFicha);
    refs.atajoFicha.hidden = true;
    if (!criterios.texto || resultados !== 1) return;

    var unico = F.filtrar(estado.modelos, criterios)[0];
    if (!unico || !unico.slug || !U.slugValido(unico.slug)) return;

    var enlace = U.el("a", {
      class: "finder__atajo-enlace",
      href: "modelo.html?slug=" + encodeURIComponent(unico.slug),
    }, "Abrir la ficha de " + (unico.titulo || unico.modelo));
    refs.atajoFicha.appendChild(enlace);
    refs.atajoFicha.hidden = false;
  }

  /* ================================================================
     TECLADO GLOBAL
     ================================================================ */

  function conectarTeclado() {
    document.addEventListener("keydown", function (e) {
      if (!asistente.abierto) return;
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarAsistente(true);
        return;
      }
      // El foco solo se atrapa cuando el panel es realmente modal.
      if (e.key === "Tab" && asistente.modal) atraparFoco(e);
    });

    try {
      var mq = window.matchMedia(MEDIA_ESCRITORIO);
      var alCambiar = function () {
        // Al cruzar el punto de corte con el asistente abierto, se
        // reabre para que sus roles correspondan al nuevo modo.
        if (!asistente.abierto) return;
        var indice = asistente.indice;
        cerrarAsistente(false);
        asistente.indice = indice;
        abrirAsistente();
      };
      if (mq.addEventListener) mq.addEventListener("change", alCambiar);
      else if (mq.addListener) mq.addListener(alCambiar);
    } catch (e) {
      /* Sin matchMedia el asistente sigue funcionando en modo integrado. */
    }
  }

  function atraparFoco(e) {
    var w = document.getElementById("finder-wizard");
    if (!w) return;
    var focoables = w.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    var visibles = Array.prototype.filter.call(focoables, function (nodo) {
      return !nodo.hidden && nodo.offsetParent !== null && !nodo.disabled;
    });
    if (!visibles.length) return;
    var primero = visibles[0];
    var ultimo = visibles[visibles.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  /* ================================================================
     EXPORTACIÓN
     ================================================================ */

  NS.finderUi = {
    montar: montar,
    retirar: retirar,
    // Expuestos para comprobaciones locales; no se usan en el flujo normal.
    _asistente: asistente,
    _refs: function () { return refs; },
  };
})(window.ARENAS_CATALOGO);
