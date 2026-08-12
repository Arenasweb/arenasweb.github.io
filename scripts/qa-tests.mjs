#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-tests.mjs
   Pruebas del contrato de datos. Sin dependencias.

       node scripts/qa-tests.mjs

   QUÉ HACE DISTINTO ESTE ARCHIVO
   No reimplementa la lógica para después comprobarla: carga los módulos
   REALES del navegador (catalogo-utils.js, catalogo-schema.js,
   catalogo-completitud.js, catalogo-data.js) dentro de un contexto de
   Node con un `window` mínimo, y los interroga. Si una prueba pasa aquí,
   ha pasado sobre el mismo código que se ejecuta en el sitio.

   Cubre:
     · equivalencia entre las reglas de Node y las del navegador;
     · clasificación de completitud en los casos límite;
     · validación de rutas, punto focal y color;
     · la triple condición del precio;
     · el aislamiento del material de demostración;
     · la coherencia de la taxonomía de categorías.

   exit 0 → todas las pruebas pasan.
   exit 1 → alguna falla.
   ================================================================ */

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import {
  CATEGORIAS,
  ESTADOS,
  PREFIJOS_LOCALES,
  PROVISIONALES,
  PRIORIDADES,
  EQUIVALENCIA_CLAVES,
} from "./reglas-catalogo.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ================================================================
   Carga de los módulos del navegador
   ================================================================ */

/**
 * Contexto mínimo. Solo se declara lo que los módulos tocan de verdad;
 * nada de simular un navegador entero. `location` se deja configurable
 * porque varias pruebas dependen de en qué host creemos estar.
 */
function cargarModulos(location) {
  const ventana = {
    location: location || { hostname: "localhost", search: "" },
    matchMedia: () => ({ matches: false }),
    setTimeout,
    clearTimeout,
    Image: function () {},
  };
  ventana.window = ventana;

  const contexto = createContext({
    window: ventana,
    URLSearchParams,
    console,
    // document solo se necesita dentro de funciones que estas pruebas no
    // invocan; se deja un mínimo por si alguna ruta lo roza.
    document: { createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }) },
  });

  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
    "assets/js/catalogo/catalogo-data.js",
  ]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }
  return contexto.window.ARENAS_CATALOGO;
}

const NS = cargarModulos();
const U = NS.utils;
const S = NS.schema;
const C = NS.completitud;
const D = NS.data;

/* ================================================================
   Arnés de pruebas
   ================================================================ */

let pasadas = 0;
const fallos = [];
let grupoActual = "";

const grupo = (nombre) => {
  grupoActual = nombre;
  console.log("\n" + nombre);
};

function comprobar(descripcion, condicion, detalle) {
  if (condicion) {
    pasadas++;
    console.log("  ok    " + descripcion);
  } else {
    fallos.push(grupoActual + " → " + descripcion + (detalle ? "  [" + detalle + "]" : ""));
    console.log("  FALLA " + descripcion + (detalle ? "  [" + detalle + "]" : ""));
  }
}

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Modelo crudo mínimo, para no repetir 28 columnas en cada caso. */
function crudo(extra) {
  return Object.assign(
    {
      id: "TEST-1",
      slug: "modelo-de-prueba",
      modelo: "Modelo de prueba",
      categoria: "ciudad",
    },
    extra || {}
  );
}

const CONFIG_PRECIOS_ON = S.normalizarConfig({ mostrar_precios: true });
const CONFIG_PRECIOS_OFF = S.normalizarConfig({ mostrar_precios: false });

/* ================================================================
   1. Equivalencia entre las reglas de Node y las del navegador
   ================================================================ */

grupo("1. EQUIVALENCIA DE REGLAS  (Node ↔ navegador)");

comprobar(
  "CATEGORIAS coincide con catalogo-schema.js",
  iguales(CATEGORIAS, S.CATEGORIAS),
  S.CATEGORIAS.join(",")
);

comprobar(
  "ESTADOS coincide con ESTADOS_CONTENIDO",
  iguales(ESTADOS, S.ESTADOS_CONTENIDO),
  S.ESTADOS_CONTENIDO.join(",")
);

comprobar(
  "PROVISIONALES coincide con MARCAS_PROVISIONALES",
  iguales(PROVISIONALES, C.MARCAS_PROVISIONALES),
  "navegador: " + C.MARCAS_PROVISIONALES.join(" | ")
);

// PREFIJOS_LOCALES es privado en catalogo-utils.js: se comprueba por
// comportamiento, que es lo que importa, en vez de por lectura del texto.
comprobar(
  "PREFIJOS_LOCALES: cada prefijo declarado es aceptado por rutaImagen()",
  PREFIJOS_LOCALES.every((p) => U.rutaImagen(p + "x/y.webp") === p + "x/y.webp"),
  PREFIJOS_LOCALES.join(",")
);
comprobar(
  "PREFIJOS_LOCALES: un prefijo no declarado es rechazado",
  U.rutaImagen("otros/x.webp") === ""
);

// Prioridades: cada columna con prioridad en Node debe existir como
// requisito en el navegador y declarar la misma.
const porClave = {};
C.REQUISITOS.forEach((r) => {
  porClave[r.clave] = r;
});
Object.entries(PRIORIDADES).forEach(([columna, prioridad]) => {
  const clave = EQUIVALENCIA_CLAVES[columna];
  const req = porClave[clave];
  comprobar(
    `prioridad de "${columna}" (${prioridad}) coincide con el requisito "${clave}"`,
    !!req && req.prioridad === prioridad,
    req ? "navegador: " + req.prioridad : "requisito inexistente"
  );
});

comprobar(
  "todo requisito del navegador declara una prioridad P0–P3",
  C.REQUISITOS.every((r) => ["P0", "P1", "P2", "P3"].includes(r.prioridad)),
  C.REQUISITOS.filter((r) => !r.prioridad).map((r) => r.clave).join(",")
);

/* ================================================================
   2. Completitud en los casos límite
   ================================================================ */

grupo("2. COMPLETITUD");

const RUTA_OK = "assets/catalogo/modelo-de-prueba/portada.webp";

const casoVacio = S.normalizarModelo(crudo(), CONFIG_PRECIOS_OFF, []);
comprobar("modelo vacío: no es publicable", C.evaluar(casoVacio).publicable === false);
comprobar(
  "modelo vacío: la fotografía figura como obligatoria que falta",
  C.evaluar(casoVacio).faltan.obligatorio.some((f) => f.clave === "imagen")
);
comprobar("modelo vacío: no está aprobado ni publicado", !C.evaluar(casoVacio).publicado);

// Los mínimos publicables son tres: fotografía, texto alternativo y
// descripción corta. Los mismos que exige el backend público antes de
// emitir un modelo.
const casoMinimo = S.normalizarModelo(
  crudo({
    imagen_principal: RUTA_OK,
    alt_text: "Motocicleta de prueba de perfil",
    descripcion_corta: "Una moto para la ciudad.",
  }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar(
  "mínimo (foto + alt + copy): ya es publicable",
  C.evaluar(casoMinimo).publicable === true,
  JSON.stringify(C.evaluar(casoMinimo).faltan.obligatorio)
);

const casoSinCopy = S.normalizarModelo(
  crudo({ imagen_principal: RUTA_OK, alt_text: "x" }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar(
  "foto y alt pero sin descripción corta: NO es publicable",
  C.evaluar(casoSinCopy).publicable === false,
  JSON.stringify(C.evaluar(casoSinCopy).faltan.obligatorio)
);
comprobar(
  "mínimo: sigue sin estar publicado (activo/estado mandan)",
  C.evaluar(casoMinimo).publicado === false
);

const casoFotoSinAlt = S.normalizarModelo(crudo({ imagen_principal: RUTA_OK }), CONFIG_PRECIOS_OFF, []);
comprobar(
  "foto sin alt_text: NO es publicable",
  C.evaluar(casoFotoSinAlt).publicable === false
);
comprobar(
  "sin foto: el alt_text no se reclama",
  !C.evaluar(casoVacio).faltan.obligatorio.some((f) => f.clave === "alt")
);

const casoCompleto = S.normalizarModelo(
  crudo({
    imagen_principal: RUTA_OK,
    imagen_mobile: "assets/catalogo/modelo-de-prueba/portada-mobile.webp",
    alt_text: "Motocicleta de prueba de perfil",
    descripcion_corta: "Una moto para la ciudad.",
    descripcion_larga: "Primer párrafo.\n\nSegundo párrafo.",
    caracteristica_1: "Consumo contenido",
    linea: "Prueba",
    activo: true,
    estado_contenido: "APROBADO",
  }),
  CONFIG_PRECIOS_OFF,
  []
);
const infCompleto = C.evaluar(casoCompleto);
comprobar("completo: publicable", infCompleto.publicable === true);
comprobar("completo + activo + APROBADO: publicado", infCompleto.publicado === true);
comprobar(
  "completo sin precio ni colores: no queda ningún recomendado pendiente",
  infCompleto.faltan.recomendado.length === 0,
  JSON.stringify(infCompleto.faltan.recomendado)
);

const casoAprobadoInactivo = S.normalizarModelo(
  crudo({ imagen_principal: RUTA_OK, alt_text: "x", estado_contenido: "APROBADO", activo: false }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar(
  "APROBADO pero inactivo: aprobado sí, publicado no",
  C.evaluar(casoAprobadoInactivo).aprobado === true &&
    C.evaluar(casoAprobadoInactivo).publicado === false
);

const casoActivoBorrador = S.normalizarModelo(
  crudo({ imagen_principal: RUTA_OK, alt_text: "x", estado_contenido: "BORRADOR", activo: true }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar(
  "activo pero BORRADOR: no publicado",
  C.evaluar(casoActivoBorrador).publicado === false
);

// Precio y colores son OPCIONALES: su ausencia no puede afectar a publicable.
comprobar(
  "sin precio: sigue siendo publicable",
  C.evaluar(casoMinimo).publicable === true &&
    C.evaluar(casoMinimo).faltan.opcional.some((f) => f.clave === "precio")
);
comprobar(
  "sin colores: sigue siendo publicable",
  C.evaluar(casoMinimo).faltan.opcional.some((f) => f.clave === "colores")
);

const casoConColores = S.normalizarModelo(
  crudo({ imagen_principal: RUTA_OK, alt_text: "x", colores: "Negro, Azul, Rojo" }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar(
  "con colores de texto: 3 nombres leídos y el requisito cumplido",
  casoConColores.colores.length === 3 &&
    !C.evaluar(casoConColores).faltan.opcional.some((f) => f.clave === "colores")
);

// Texto provisional: cuenta como ausente, no como contenido.
const casoProvisional = S.normalizarModelo(
  crudo({
    imagen_principal: RUTA_OK,
    alt_text: "x",
    descripcion_corta: "Descripción ampliada pendiente de redacción",
  }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar(
  "descripción provisional: se detecta y cuenta como pendiente OBLIGATORIA",
  C.evaluar(casoProvisional).provisional.descripcionCorta === true &&
    C.evaluar(casoProvisional).faltan.obligatorio.some((f) => f.clave === "descripcionCorta")
);
comprobar(
  "un texto provisional impide publicar, no solo avisa",
  C.evaluar(casoProvisional).publicable === false
);
comprobar(
  "un texto corto normal NO se marca como provisional",
  C.esProvisional("Una moto ágil para la ciudad.") === false
);

// El porcentaje mide solo lo exigible: un modelo sin precio ni colores
// puede y debe llegar al 100 %.
comprobar(
  "porcentaje: el modelo completo sin precio ni colores llega al 100 %",
  infCompleto.porcentaje === 100,
  infCompleto.porcentaje + "% (" + infCompleto.exigiblesCumplidos + "/" + infCompleto.exigiblesTotal + ")"
);
comprobar(
  "porcentaje: los opcionales se informan aparte, no restan",
  infCompleto.opcionalesTotal === 5 && infCompleto.opcionalesCumplidos < infCompleto.opcionalesTotal,
  infCompleto.opcionalesCumplidos + "/" + infCompleto.opcionalesTotal
);
comprobar("porcentaje: el modelo vacío no llega al 100 %", C.evaluar(casoVacio).porcentaje < 100);

// Estado editorial derivado
comprobar("estado editorial: sin foto → PENDIENTE", C.evaluar(casoVacio).estadoEditorial === "PENDIENTE");
comprobar(
  "estado editorial: foto sin alt → EN PREPARACIÓN",
  C.evaluar(casoFotoSinAlt).estadoEditorial === "EN PREPARACIÓN",
  C.evaluar(casoFotoSinAlt).estadoEditorial
);
comprobar(
  "estado editorial: mínimo publicable → LISTO PARA REVISIÓN",
  C.evaluar(casoMinimo).estadoEditorial === "LISTO PARA REVISIÓN",
  C.evaluar(casoMinimo).estadoEditorial
);
comprobar(
  "estado editorial: completo → PUBLICABLE",
  infCompleto.estadoEditorial === "PUBLICABLE",
  infCompleto.estadoEditorial
);

// Resumen agregado: todo se cuenta, nada se escribe a mano.
const resumenPrueba = C.resumir([casoVacio, casoMinimo, casoCompleto, casoFotoSinAlt]);
comprobar("resumen: total correcto", resumenPrueba.total === 4);
comprobar("resumen: 1 publicado", resumenPrueba.publicados === 1, String(resumenPrueba.publicados));
comprobar("resumen: 1 activo", resumenPrueba.activos === 1, String(resumenPrueba.activos));
comprobar("resumen: 1 pendiente sin fotografía", resumenPrueba.pendientes === 1);
comprobar("resumen: cuenta destacados y nuevos", resumenPrueba.destacados === 0 && resumenPrueba.nuevos === 0);
comprobar(
  "resumen: los cuatro estados editoriales son excluyentes y suman el total",
  resumenPrueba.pendientes + resumenPrueba.enPreparacion + resumenPrueba.listosParaRevision +
    resumenPrueba.completos ===
    resumenPrueba.total,
  `${resumenPrueba.pendientes}+${resumenPrueba.enPreparacion}+${resumenPrueba.listosParaRevision}+${resumenPrueba.completos}`
);
comprobar(
  "resumen: publicables engloba a listos-para-revisión y completos",
  resumenPrueba.publicables === resumenPrueba.listosParaRevision + resumenPrueba.completos,
  `${resumenPrueba.publicables} vs ${resumenPrueba.listosParaRevision}+${resumenPrueba.completos}`
);

/* ================================================================
   3. Seguridad de rutas de imagen
   ================================================================ */

grupo("3. RUTAS DE IMAGEN");

const RUTAS_RECHAZADAS = [
  ["escape de directorio", "assets/../../secreto.png"],
  ["escape simple", "../secreto.png"],
  ["javascript:", "javascript:alert(1)"],
  ["data:", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
  ["vbscript:", "vbscript:msgbox(1)"],
  ["file:", "file:///C:/Windows/win.ini"],
  ["blob:", "blob:http://x/y"],
  ["about:", "about:blank"],
  ["protocolo-relativa", "//cdn.ejemplo.com/x.jpg"],
  ["http externo", "http://ejemplo.com/x.jpg"],
  ["https no autorizado", "https://ejemplo.com/x.jpg"],
  ["ruta de Windows", "C:\\fotos\\moto.jpg"],
  ["barra invertida", "assets\\catalogo\\x.webp"],
  ["comilla", "assets/catalogo/x'.webp"],
  ["comilla doble", 'assets/catalogo/x".webp'],
  ["etiqueta", "assets/catalogo/<img>.webp"],
  ["traversal codificado", "assets/%2e%2e/%2e%2e/secreto.png"],
  ["traversal doble codificado", "assets/%252e%252e/secreto.png"],
  ["prefijo no permitido", "config/secreto.json"],
  ["raíz absoluta", "/etc/passwd"],
  ["espacio", "assets/catalogo/mi foto.webp"],
  ["cadena vacía", ""],
  ["nulo", null],
  ["objeto", { toString: () => "assets/x.webp" }],
];

RUTAS_RECHAZADAS.forEach(([nombre, valor]) => {
  comprobar(`rechaza ${nombre}`, U.rutaImagen(valor) === "", "devolvió: " + U.rutaImagen(valor));
});

const RUTAS_ACEPTADAS = [
  "assets/catalogo/pulsar-180-neon/portada.webp",
  "assets/catalogo/pulsar-180-neon/azul/portada-mobile.webp",
  "assets/hero/hero-arenas-poster.jpg",
  "data/algo.png",
  "legales/algo.png",
];
RUTAS_ACEPTADAS.forEach((r) => {
  comprobar(`acepta "${r}"`, U.rutaImagen(r) === r, "devolvió: " + U.rutaImagen(r));
});

// Un carácter de control incrustado no debe colarse.
comprobar(
  "neutraliza caracteres de control",
  U.rutaImagen("assets/cat\u0000alogo/x.webp") === "" ||
    !U.rutaImagen("assets/cat\u0000alogo/x.webp").includes("\u0000")
);

/* ================================================================
   4. Punto focal — el otro dato que toca CSS
   ================================================================ */

grupo("4. PUNTO FOCAL (object-position)");

[
  ["center center", "center center"],
  ["50% 30%", "50% 30%"],
  ["left top", "left top"],
  ["right", "right"],
  ["0% 0%", "0% 0%"],
  ["100% 100%", "100% 100%"],
  ["", "center center"],
  ["url(javascript:alert(1))", "center center"],
  ["50% 30%; background: url(x)", "center center"],
  ["expression(alert(1))", "center center"],
  ["red; position:fixed", "center center"],
  // Por encima de 100 % la fotografía saldría de la caja y la tarjeta
  // parecería vacía sin explicación: se ignora y se encuadra al centro.
  ["101%", "center center"],
  ["999% 999%", "center center"],
  ["calc(50% + 10px) center", "center center"],
].forEach(([entrada, esperado]) => {
  comprobar(
    `foco(${JSON.stringify(entrada)}) → ${esperado}`,
    U.foco(entrada) === esperado,
    "devolvió: " + U.foco(entrada)
  );
});

/* ================================================================
   5. Color hexadecimal
   ================================================================ */

grupo("5. COLOR HEXADECIMAL");

[
  ["#1A2B3C", "#1a2b3c"],
  ["1a2b3c", "#1a2b3c"],
  ["#abc", "#abc"],
  ["#GGG", ""],
  ["rgb(1,2,3)", ""],
  ["var(--x)", ""],
  ["red", ""],
  ["#12345", ""],
  ["", ""],
].forEach(([entrada, esperado]) => {
  comprobar(
    `hexColor(${JSON.stringify(entrada)}) → ${JSON.stringify(esperado)}`,
    U.hexColor(entrada) === esperado,
    "devolvió: " + U.hexColor(entrada)
  );
});

/* ================================================================
   6. Precio — la triple condición
   ================================================================ */

grupo("6. PRECIO");

const casosPrecio = [
  ["global ON · modelo ON · precio válido → se muestra", CONFIG_PRECIOS_ON, true, 12990, true, 12990],
  ["global OFF · modelo ON · precio válido → oculto", CONFIG_PRECIOS_OFF, true, 12990, false, null],
  ["global ON · modelo OFF · precio válido → oculto", CONFIG_PRECIOS_ON, false, 12990, false, null],
  ["global ON · modelo ON · sin precio → oculto", CONFIG_PRECIOS_ON, true, null, false, null],
  ["global ON · modelo ON · precio 0 → oculto", CONFIG_PRECIOS_ON, true, 0, false, null],
  ["global ON · modelo ON · precio negativo → oculto", CONFIG_PRECIOS_ON, true, -100, false, null],
  ["global ON · modelo ON · precio texto → oculto", CONFIG_PRECIOS_ON, true, "consultar", false, null],
  ["global ON · modelo ON · precio NaN → oculto", CONFIG_PRECIOS_ON, true, NaN, false, null],
  ['global ON · modelo ON · "S/ 12,990.00" → se muestra', CONFIG_PRECIOS_ON, true, "S/ 12,990.00", true, 12990],
];

casosPrecio.forEach(([nombre, cfg, mostrar, valor, esperadoMostrar, esperadoImporte]) => {
  const m = S.normalizarModelo(
    crudo({ mostrar_precio: mostrar, precio_publico: valor }),
    cfg,
    []
  );
  comprobar(
    nombre,
    m.mostrarPrecio === esperadoMostrar && m.precioPublico === esperadoImporte,
    `mostrarPrecio=${m.mostrarPrecio} precioPublico=${m.precioPublico}`
  );
});

comprobar("precio() nunca imprime 0", U.precio(0) === "");
comprobar("precio() nunca imprime NaN", U.precio(NaN) === "");
comprobar("precio() nunca imprime null", U.precio(null) === "");
comprobar("precio() nunca imprime undefined", U.precio(undefined) === "");
comprobar("precio() nunca imprime negativos", U.precio(-5) === "");
comprobar("precio() en PEN usa el símbolo S/", U.precio(12990) === "S/ 12,990", JSON.stringify(U.precio(12990)));
comprobar("precio() en USD usa $", U.precio(1200, "USD") === "$ 1,200", JSON.stringify(U.precio(1200, "USD")));
comprobar("precio() no muestra decimales", !U.precio(12990.75).includes("."), U.precio(12990.75));
comprobar(
  "precio() separa símbolo e importe con espacio duro",
  U.precio(12990).charCodeAt(2) === 0xa0,
  "código " + U.precio(12990).charCodeAt(2)
);

/* ---- Topes de longitud: el DOM nunca recibe un texto sin acotar ---- */

const LARGO = "x".repeat(5000);
const mLargo = S.normalizarModelo(
  crudo({
    modelo: LARGO,
    linea: LARGO,
    descripcion_corta: LARGO,
    descripcion_larga: LARGO,
    caracteristica_1: LARGO,
    alt_text: LARGO,
    cta_label: LARGO,
    subcategoria: LARGO,
    titulo_web: LARGO,
  }),
  CONFIG_PRECIOS_OFF,
  []
);
[
  ["modelo", 120],
  ["linea", 60],
  ["descripcionCorta", 220],
  ["descripcionLarga", 2000],
  ["altText", 160],
  ["ctaLabel", 40],
  ["subcategoria", 60],
  ["titulo", 120],
].forEach(([campo, tope]) => {
  comprobar(
    `"${campo}" se acota a ${tope} caracteres`,
    mLargo[campo].length === tope,
    "longitud " + mLargo[campo].length
  );
});
comprobar("las características también se acotan", mLargo.caracteristicas[0].length === 120);
comprobar("la lista de colores se acota a 8", S.normalizarModelo(
  crudo({ colores: "a,b,c,d,e,f,g,h,i,j,k,l" }), CONFIG_PRECIOS_OFF, []).colores.length === 8);

/* ================================================================
   7. Aislamiento del material de demostración
   ================================================================ */

grupo("7. MATERIAL DE DEMOSTRACIÓN");

const colorDemo = {
  id: "C-1",
  modelo_id: "MW-10",
  slug_color: "negro",
  nombre_color: "DEMO Negro",
  hex_color: "#111111",
  imagen_principal: "assets/portadas/camino-ciudad-desktop.webp",
  activo: true,
  estado_aprobacion: "APROBADO",
  _origen: "demo-local",
};

comprobar("esRegistroDemo reconoce el marcador", S.esRegistroDemo(colorDemo) === true);
comprobar("esRegistroDemo no marca un registro normal", S.esRegistroDemo({ modelo_id: "MW-10" }) === false);
comprobar(
  "color DEMO en previsualización: se acepta",
  S.normalizarColor(colorDemo, true, []) !== null
);
comprobar(
  "color DEMO fuera de previsualización: se descarta AUNQUE esté activo y APROBADO",
  S.normalizarColor(colorDemo, false, []) === null
);

const colorReal = Object.assign({}, colorDemo);
delete colorReal._origen;
comprobar(
  "color real aprobado y activo: se acepta en producción",
  S.normalizarColor(colorReal, false, []) !== null
);
comprobar(
  "color real sin aprobar: se descarta en producción",
  S.normalizarColor(Object.assign({}, colorReal, { estado_aprobacion: "BORRADOR" }), false, []) === null
);
comprobar(
  "color sin imagen_principal: se descarta (no es una variante visual)",
  S.normalizarColor(Object.assign({}, colorReal, { imagen_principal: "" }), false, []) === null
);
comprobar(
  "color con ruta insegura: se descarta",
  S.normalizarColor(Object.assign({}, colorReal, { imagen_principal: "../x.webp" }), false, []) === null
);
comprobar(
  "hex inválido no invalida el color, solo la muestra",
  (() => {
    const c = S.normalizarColor(Object.assign({}, colorReal, { hex_color: "no-es-hex" }), false, []);
    return c !== null && c.hex === "";
  })()
);

// Duplicados
const dup = S.agruparColores([colorReal, Object.assign({}, colorReal)], false, []);
comprobar("colores duplicados: solo queda uno", dup["MW-10"] && dup["MW-10"].length === 1);

/* ================================================================
   8. Previsualización: gate de entorno
   ================================================================ */

grupo("8. PREVISUALIZACIÓN Y ENTORNO");

const casosEntorno = [
  ["localhost + preview=1", { hostname: "localhost", search: "?preview=1" }, true],
  ["127.0.0.1 + preview=1", { hostname: "127.0.0.1", search: "?preview=1" }, true],
  ["localhost sin preview", { hostname: "localhost", search: "" }, false],
  ["GitHub Pages + preview=1", { hostname: "arenasweb.github.io", search: "?preview=1" }, false],
  ["host trampa + preview=1", { hostname: "evil-localhost.com", search: "?preview=1" }, false],
  ["subdominio trampa", { hostname: "localhost.evil.com", search: "?preview=1" }, false],
  ["dominio propio", { hostname: "arenasmotocicletas.com", search: "?preview=1" }, false],
];

casosEntorno.forEach(([nombre, location, esperado]) => {
  const ns = cargarModulos(location);
  comprobar(`previsualización — ${nombre} → ${esperado}`, ns.data.previewActivo() === esperado);
});

/* ================================================================
   9. Coherencia de la taxonomía de categorías
   ================================================================ */

grupo("9. TAXONOMÍA DE CATEGORÍAS");

comprobar(
  "una categoría fuera de la taxonomía descarta el modelo",
  S.normalizarModelo(crudo({ categoria: "electrica" }), CONFIG_PRECIOS_OFF, []) === null
);
comprobar(
  "las cinco categorías de la taxonomía son aceptadas",
  CATEGORIAS.every((c) => S.normalizarModelo(crudo({ categoria: c }), CONFIG_PRECIOS_OFF, []) !== null)
);
comprobar(
  "normalizarCategorias descarta una categoría no declarada en la taxonomía",
  S.normalizarCategorias([{ slug: "electrica", titulo: "Eléctrica" }]).length === 0
);

// El escenario del punto 47, demostrado en vez de supuesto: un archivo que
// publica modelos de "carga" pero no declara esa categoría.
const estadoSimulado = {
  categorias: S.normalizarCategorias([
    { slug: "ciudad", titulo: "Ciudad", orden: 1 },
    { slug: "trabajo", titulo: "Trabajo", orden: 2 },
    { slug: "deportiva", titulo: "Deportiva", orden: 3 },
    { slug: "aventura", titulo: "Ruta y aventura", orden: 4 },
  ]),
  modelos: [
    S.normalizarModelo(crudo({ id: "A", slug: "a", categoria: "ciudad" }), CONFIG_PRECIOS_OFF, []),
    S.normalizarModelo(crudo({ id: "B", slug: "b", categoria: "carga" }), CONFIG_PRECIOS_OFF, []),
  ],
};

comprobar(
  "el modelo de carga SÍ se normaliza (la taxonomía lo admite)",
  estadoSimulado.modelos[1] !== null && estadoSimulado.modelos[1].categoria === "carga"
);
comprobar(
  "pero NO aparece ningún chip de carga si el archivo no la declara",
  !D.categoriasConModelos(estadoSimulado).some((c) => c.slug === "carga"),
  "chips: " + D.categoriasConModelos(estadoSimulado).map((c) => c.slug).join(",")
);
comprobar(
  "y su etiqueta cae al slug en crudo",
  D.tituloCategoria(estadoSimulado, "carga") === "carga",
  D.tituloCategoria(estadoSimulado, "carga")
);
comprobar(
  "declarando carga, el chip aparece y la etiqueta es legible",
  (() => {
    const conCarga = {
      categorias: S.normalizarCategorias([
        { slug: "ciudad", titulo: "Ciudad", orden: 1 },
        { slug: "carga", titulo: "Carga y transporte", orden: 5 },
      ]),
      modelos: estadoSimulado.modelos,
    };
    return (
      D.categoriasConModelos(conCarga).some((c) => c.slug === "carga") &&
      D.tituloCategoria(conCarga, "carga") === "Carga y transporte"
    );
  })()
);

/* ================================================================
   9 bis. La puerta de publicación
   ================================================================ */

grupo("9 bis. PUERTA DE PUBLICACIÓN");

/** Modelo que cumple TODOS los mínimos salvo lo que se le cambie. */
function modeloCompleto(extra) {
  return S.normalizarModelo(
    crudo(
      Object.assign(
        {
          imagen_principal: RUTA_OK,
          alt_text: "Motocicleta de prueba de perfil",
          descripcion_corta: "Una moto para la ciudad.",
          activo: true,
          estado_contenido: "APROBADO",
        },
        extra || {}
      )
    ),
    CONFIG_PRECIOS_OFF,
    []
  );
}

const pub = (activo, estado) =>
  S.esPublicable(modeloCompleto({ activo: activo, estado_contenido: estado }), false);

comprobar("activo + APROBADO → se publica", pub(true, "APROBADO") === true);
comprobar("activo + BORRADOR → NO se publica", pub(true, "BORRADOR") === false);
comprobar("activo + EN_REVISION → NO se publica", pub(true, "EN_REVISION") === false);
comprobar("activo sin estado → NO se publica (cae a BORRADOR)", pub(true, "") === false);
comprobar("inactivo + APROBADO → NO se publica", pub(false, "APROBADO") === false);
comprobar("inactivo + BORRADOR → NO se publica", pub(false, "BORRADOR") === false);
comprobar(
  "en previsualización se ve todo, aprobado o no",
  S.esPublicable(
    S.normalizarModelo(crudo({ activo: false, estado_contenido: "BORRADOR" }), CONFIG_PRECIOS_OFF, []),
    true
  ) === true
);
comprobar("un modelo inexistente nunca es publicable", S.esPublicable(null, true) === false);

/* ================================================================
   10. Identidad y slugs
   ================================================================ */

grupo("10. IDENTIDAD Y SLUGS");

comprobar("sin id: descartado", S.normalizarModelo(crudo({ id: "" }), CONFIG_PRECIOS_OFF, []) === null);
comprobar("sin modelo: descartado", S.normalizarModelo(crudo({ modelo: "" }), CONFIG_PRECIOS_OFF, []) === null);
// El slug NO se deriva del nombre. Un slug inventado crea una URL que
// nadie escribió y que cambiaría sola al retocar el nombre comercial.
const sinSlug = S.normalizarModelo(
  crudo({ slug: "", modelo: "Pulsar 180 Neón" }),
  CONFIG_PRECIOS_OFF,
  []
);
comprobar("sin slug: el registro existe (se puede previsualizar)", sinSlug !== null);
comprobar("sin slug: NO se deriva del nombre", sinSlug.slug === "", JSON.stringify(sinSlug.slug));
comprobar('sin slug: en concreto no se inventa "pulsar-180-neon"', sinSlug.slug !== "pulsar-180-neon");
comprobar("con slug inválido: tampoco se corrige, queda vacío",
  S.normalizarModelo(crudo({ slug: "Slug Inválido!" }), CONFIG_PRECIOS_OFF, []).slug === "");

[
  ["Mayúsculas", "Pulsar-180", false],
  ["espacio", "pulsar 180", false],
  ["tilde", "pulsar-180-neón", false],
  ["guion inicial", "-pulsar", false],
  ["guion final", "pulsar-", false],
  ["doble guion", "pulsar--180", false],
  ["barra", "pulsar/180", false],
  ["punto", "pulsar.180", false],
  ["válido", "pulsar-180-neon", true],
  ["válido con números", "ct-125", true],
].forEach(([nombre, slug, esperado]) => {
  comprobar(`slugValido(${nombre}) → ${esperado}`, U.slugValido(slug) === esperado);
});

/* ================================================================
   11. Lista blanca de columnas
   ================================================================ */

grupo("11. LISTA BLANCA DE COLUMNAS");

const conBasura = S.normalizarModelo(
  crudo({
    stock_real: 47,
    numero_chasis: "ABC123",
    numero_motor: "M-999",
    ubicacion_almacen: "Depósito 2",
    costo_compra: 8000,
    telefono_cliente: "999888777",
    __proto__: { contaminado: true },
  }),
  CONFIG_PRECIOS_OFF,
  []
);
["stock_real", "numero_chasis", "numero_motor", "ubicacion_almacen", "costo_compra", "telefono_cliente"].forEach(
  (campo) => {
    comprobar(`la columna "${campo}" no llega al modelo`, !(campo in conBasura));
  }
);
comprobar(
  "el modelo solo expone claves conocidas",
  Object.keys(conBasura).length > 0 && !Object.keys(conBasura).some((k) => k.startsWith("_")),
  Object.keys(conBasura).join(",")
);
comprobar("contaminación de prototipo: no se propaga", conBasura.contaminado === undefined);

/* ================================================================
   12. POST-AUDITORÍA — la versión del contrato es obligatoria
   ================================================================ */

grupo("12. POST-AUDITORÍA · VERSIÓN DEL CONTRATO");

const SOBRE = {
  ok: true,
  version: "2",
  config: {},
  modelos: [{ id: "X", slug: "x", modelo: "X", categoria: "ciudad" }],
};
const conVersion = (v) => {
  const s = Object.assign({}, SOBRE);
  if (v === undefined) delete s.version;
  else s.version = v;
  return S.extraerRegistros(s);
};

// ESTA es la prueba que antes NO existía y que habría fallado: la
// comprobación era `if (mayor && ...)`, así que un sobre sin versión
// nunca la ejecutaba y entraba cualquier respuesta.
comprobar("sin `version` → se rechaza el origen", conVersion(undefined) === null);
comprobar("`version` vacía → se rechaza", conVersion("") === null);
comprobar("`version` null → se rechaza", conVersion(null) === null);
comprobar('`version` "2" → se acepta', Array.isArray(conVersion("2")));
comprobar('`version` "2.0" → se acepta (manda la mayor)', Array.isArray(conVersion("2.0")));
comprobar('`version` "2.7.3" → se acepta (manda la mayor)', Array.isArray(conVersion("2.7.3")));
comprobar('`version` "1" → se rechaza', conVersion("1") === null);
comprobar('`version` "9" → se rechaza', conVersion("9") === null);
comprobar('`version` "abc" → se rechaza', conVersion("abc") === null);
comprobar("`version` numérica 2 → se acepta", Array.isArray(conVersion(2)));
comprobar("ok:false → se rechaza aunque la versión sea correcta",
  S.extraerRegistros(Object.assign({}, SOBRE, { ok: false })) === null);

// api_version es INFORMATIVA: describe la interfaz HTTP, no el payload.
// No debe existir un segundo gate de compatibilidad.
comprobar("`api_version` incompatible NO rechaza por sí sola",
  Array.isArray(S.extraerRegistros(Object.assign({}, SOBRE, { api_version: "999" }))));
comprobar("`api_version` ausente no afecta",
  Array.isArray(S.extraerRegistros(SOBRE)));

// El archivo local real debe cumplir el contrato que acabamos de exigir.
const localReal = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"));
comprobar("el archivo local declara una versión compatible",
  Array.isArray(S.extraerRegistros(localReal)),
  "version=" + JSON.stringify(localReal.version));

/* ================================================================
   13. POST-AUDITORÍA — precio sin ambigüedad
   ================================================================ */

grupo("13. POST-AUDITORÍA · PRECIO");

[
  // Numérico: el camino correcto. La celda debería ser un número.
  [12990, 12990, "número entero"],
  [12990.5, 12990.5, "número con decimales"],
  [0, null, "cero"],
  [-1, null, "negativo"],
  [NaN, null, "NaN"],
  [Infinity, null, "Infinity"],
  // Texto sin ambigüedad
  ["12990", 12990, "texto simple"],
  ["12990.50", 12990.5, "punto decimal"],
  ["12,990", 12990, "coma de millar"],
  ["S/ 12,990.00", 12990, "formato de hoja"],
  // ESTE es el caso de la auditoría: antes devolvía 1299050.
  ["12990,50", null, "coma decimal — AMBIGUO"],
  ["12.990,50", null, "formato europeo — AMBIGUO"],
  ["1,23", null, "coma fuera de posición de millar"],
  ["12990.505", null, "tres decimales"],
  ["consultar", null, "texto"],
  ["", null, "vacío"],
  ["1.2.3", null, "puntos múltiples"],
].forEach(([entrada, esperado, nota]) => {
  comprobar(`precio ${JSON.stringify(entrada)} → ${esperado} (${nota})`,
    U.numero(entrada) === esperado || (Number.isNaN(esperado) && U.numero(entrada) === null),
    String(U.numero(entrada)));
});

comprobar('"12990,50" NUNCA puede convertirse en 1299050',
  U.numero("12990,50") !== 1299050, String(U.numero("12990,50")));

/* ================================================================
   14. POST-REAUDITORÍA — coherencia de publicabilidad
   ================================================================ */

grupo("14. POST-REAUDITORÍA · PUBLICABILIDAD COHERENTE");

/**
 * Cada caso se mira por las tres capas del navegador a la vez:
 * el esquema (¿se publica?), la completitud (¿está completo?) y el
 * estado editorial derivado. Si una dijera algo distinto de las otras,
 * la herramienta de QA estaría mintiendo sobre lo que hace la web.
 */
function porTresCapas(nombre, extra, esperado, opciones) {
  const o = opciones || {};
  const m = modeloCompleto(extra);
  const inf = C.evaluar(m);

  // `esPublicable` responde «¿se muestra al público?».
  comprobar(`${nombre} → esquema: se publica = ${esperado}`,
    S.esPublicable(m, false) === esperado, String(S.esPublicable(m, false)));

  // `completitud.publicable` responde algo distinto: «¿tiene el
  // contenido necesario?». Un modelo completo pero todavía inactivo es
  // publicable y no está publicado, y eso es exactamente lo que
  // significa «listo para publicar». Por eso los casos que solo cambian
  // `activo` o `estado_contenido` no alteran esta respuesta.
  const contenidoEsperado = o.contenidoCompleto !== undefined ? o.contenidoCompleto : esperado;
  comprobar(`${nombre} → completitud: contenido completo = ${contenidoEsperado}`,
    inf.publicable === contenidoEsperado, JSON.stringify(inf.faltan.obligatorio.map((f) => f.clave)));

  comprobar(`${nombre} → completitud: publicado = ${esperado}`,
    inf.publicado === esperado, String(inf.publicado));

  // Y en previsualización SIEMPRE se ve, para poder corregirlo.
  comprobar(`${nombre} → en previsualización sigue visible`, S.esPublicable(m, true) === true);
  return m;
}

porTresCapas("mínimo completo", {}, true);
porTresCapas("sin fotografía", { imagen_principal: "" }, false);

// Caso H de la matriz: la celda está llena, pero con una ruta que el
// contrato rechaza. Cada capa debe tratarla como «sin fotografía», y
// ninguna debe conservar el valor inseguro.
[
  "../../secreto.png",
  "../secreto.webp",
  "assets/../secreto.webp",
  "https://evil.example/moto.webp",
  "//evil.example/moto.webp",
  "javascript:alert(1)",
  "data:image/png;base64,iVBORw0KGgo=",
].forEach((ruta) => {
  const m = porTresCapas(`ruta insegura ${JSON.stringify(ruta.slice(0, 22))}`, { imagen_principal: ruta }, false);
  comprobar(`ruta insegura ${JSON.stringify(ruta.slice(0, 22))}: el valor no sobrevive al modelo`,
    m.imagenPrincipal === "", JSON.stringify(m.imagenPrincipal));
  comprobar(`ruta insegura ${JSON.stringify(ruta.slice(0, 22))}: completitud la cuenta como foto ausente`,
    C.evaluar(m).faltan.obligatorio.some((f) => f.clave === "imagen"));
});
porTresCapas("sin texto alternativo", { alt_text: "" }, false);
porTresCapas("sin descripción corta", { descripcion_corta: "" }, false);
porTresCapas("sin slug", { slug: "" }, false);
// Estos dos tienen el contenido completo; lo que falta es la decisión de
// publicar. Es la distinción entre «listo» y «publicado».
porTresCapas("inactivo", { activo: false }, false, { contenidoCompleto: true });
porTresCapas("en borrador", { estado_contenido: "BORRADOR" }, false, { contenidoCompleto: true });

// El caso concreto de la reauditoría: texto provisional en las dos
// columnas que ahora son obligatorias.
S.MARCAS_PROVISIONALES.forEach((marca) => {
  const m = modeloCompleto({ descripcion_corta: marca.toUpperCase() });
  comprobar(`descripción "${marca}" → no publicable`, S.esPublicable(m, false) === false);
});
porTresCapas("descripción provisional", { descripcion_corta: "PENDIENTE" }, false);
porTresCapas("descripción provisional dentro de una frase",
  { descripcion_corta: "Descripción ampliada pendiente de redacción" }, false);
porTresCapas("alt provisional", { alt_text: "POR DEFINIR" }, false);
porTresCapas("alt provisional en minúsculas", { alt_text: "pendiente" }, false);

// Y lo contrario: un texto corto legítimo NO es provisional.
porTresCapas("descripción corta pero real", { descripcion_corta: "Ágil para la ciudad." }, true);
comprobar("un texto real no se confunde con un marcador",
  S.esProvisional("Ágil para la ciudad.") === false);

// Los opcionales no pueden bloquear.
porTresCapas("sin precio, colores, galería ni características", {
  precio_publico: "", mostrar_precio: false, colores: "",
  galeria_1: "", galeria_2: "", caracteristica_1: "", descripcion_larga: "", imagen_mobile: "",
}, true);

// La relación entre estados derivados.
const completo = modeloCompleto({});
comprobar("PUBLICADO implica PUBLICABLE",
  !C.evaluar(completo).publicado || C.evaluar(completo).publicable);
const listo = modeloCompleto({ activo: false });
comprobar("estar listo para revisión NO implica estar activo",
  C.evaluar(listo).publicable === true && C.evaluar(listo).activo === false);
comprobar("un modelo incompleto y activo NUNCA figura como publicado",
  C.evaluar(modeloCompleto({ imagen_principal: "", activo: true, estado_contenido: "APROBADO" }))
    .publicado === false);

/* ================================================================
   15. POST-REAUDITORÍA — el fallback local aplica la misma regla
   ================================================================ */

grupo("15. POST-REAUDITORÍA · FALLBACK LOCAL");

/** Sobre local mínimo, construido en memoria: no se toca ningún dato real. */
function sobreLocal(modelos) {
  return { ok: true, version: "2.0", config: { mostrar_precios: false }, modelos: modelos };
}

function publicadosDesde(modelos, preview) {
  const registros = S.extraerRegistros(sobreLocal(modelos));
  const cfg = S.normalizarConfig({});
  return registros
    .map((r) => S.normalizarModelo(r, cfg, []))
    .filter(Boolean)
    .filter((m) => S.esPublicable(m, preview));
}

const BASE_LOCAL = {
  id: "L-1", slug: "local-ok", modelo: "Local Ok", categoria: "ciudad",
  imagen_principal: RUTA_OK, alt_text: "Foto real", descripcion_corta: "Texto real.",
  activo: true, estado_contenido: "APROBADO",
};

comprobar("fallback: un modelo completo se publica",
  publicadosDesde([BASE_LOCAL], false).length === 1);

[
  ["sin fotografía", { imagen_principal: "" }],
  ["sin alt", { alt_text: "" }],
  ["sin descripción", { descripcion_corta: "" }],
  ["descripción provisional", { descripcion_corta: "PENDIENTE" }],
  ["sin slug", { slug: "" }],
  ["en borrador", { estado_contenido: "BORRADOR" }],
  ["inactivo", { activo: false }],
].forEach(([nombre, cambio]) => {
  const fila = Object.assign({}, BASE_LOCAL, cambio);
  comprobar(`fallback: ${nombre} → NO se publica`, publicadosDesde([fila], false).length === 0);
  comprobar(`fallback: ${nombre} → SÍ se ve en previsualización`,
    publicadosDesde([fila], true).length === 1);
});

// El catálogo real de hoy: 22 borradores. Preview debe seguir viéndolos.
const realLocal = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"));
const regsReal = S.extraerRegistros(realLocal);
const cfgReal = S.normalizarConfig(realLocal.config);
const modsReal = regsReal.map((r) => S.normalizarModelo(r, cfgReal, [])).filter(Boolean);
comprobar("los 22 modelos reales se normalizan", modsReal.length === 22, String(modsReal.length));
comprobar("previsualización: siguen siendo 22",
  modsReal.filter((m) => S.esPublicable(m, true)).length === 22);
comprobar("producción: siguen siendo 0",
  modsReal.filter((m) => S.esPublicable(m, false)).length === 0);
comprobar("los 22 tienen slug explícito en el archivo local",
  modsReal.every((m) => !!m.slug), modsReal.filter((m) => !m.slug).map((m) => m.modelo).join(","));

/* ================================================================
   16. POST-REAUDITORÍA — la previsualización no pierde borradores
   ================================================================ */

grupo("16. POST-REAUDITORÍA · DEDUPLICACIÓN EN PREVISUALIZACIÓN");

/**
 * Ejecuta la ruta REAL de carga (`NS.data.cargar`) con un doble de
 * fetch, en vez de replicar su lógica aquí. Reproducir el algoritmo en
 * la prueba fue justamente lo que dejó pasar este fallo: la copia y el
 * original pueden divergir.
 */
async function cargarConDoble(modelos, preview) {
  const ventana = {
    location: { hostname: "localhost", search: preview ? "?preview=1" : "" },
    matchMedia: () => ({ matches: false }),
    setTimeout,
    clearTimeout,
  };
  ventana.window = ventana;

  const sobre = {
    ok: true,
    version: "2.0",
    config: { mostrar_precios: false },
    categories: [{ slug: "ciudad", titulo: "Ciudad", orden: 1 }],
    modelos: modelos,
  };

  const contexto = createContext({
    window: ventana,
    URLSearchParams,
    console: { warn() {}, log() {}, error() {} },
    document: { createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }) },
    setTimeout,
    clearTimeout,
    Promise,
    AbortController,
    fetch: (url) => {
      // Solo responde al archivo local; el fixture de colores no existe.
      if (String(url).indexOf("catalogo-publico.local.json") === -1) {
        return Promise.reject(new Error("no encontrado"));
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(sobre),
      });
    },
  });

  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
    "assets/js/catalogo/catalogo-data.js",
  ]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }

  const estado = await contexto.window.ARENAS_CATALOGO.data.cargar(true);
  return estado;
}

const borrador = (n) => ({
  id: "DRAFT-" + n, slug: "", modelo: "Borrador " + n, categoria: "ciudad",
});

// ESTA es la prueba que antes fallaba: dos borradores sin slug se
// fundían en uno porque "" se usaba como clave de identidad compartida.
const dos = await cargarConDoble([borrador("A"), borrador("B")], true);
comprobar("previsualización: dos borradores sin slug siguen siendo dos",
  dos.modelos.length === 2, dos.modelos.map((m) => m.id).join(","));

const tres = await cargarConDoble([borrador("A"), borrador("B"), borrador("C")], true);
comprobar("previsualización: tres borradores sin slug siguen siendo tres",
  tres.modelos.length === 3, tres.modelos.map((m) => m.id).join(","));

comprobar("conservan su identidad propia, sin mezclarse",
  JSON.stringify(tres.modelos.map((m) => m.id).sort()) === '["DRAFT-A","DRAFT-B","DRAFT-C"]',
  tres.modelos.map((m) => m.id).join(","));
comprobar("ninguno recibe un slug inventado", tres.modelos.every((m) => m.slug === ""));

// Producción: ninguno de ellos se publica.
const dosProd = await cargarConDoble([borrador("A"), borrador("B")], false);
comprobar("producción: los borradores sin slug NO se publican",
  dosProd.modelos.length === 0, String(dosProd.modelos.length));

// Un id duplicado SÍ sigue siendo ambigüedad, también sin slug.
const mismoId = await cargarConDoble(
  [
    { id: "DUP", slug: "", modelo: "Uno", categoria: "ciudad" },
    { id: "DUP", slug: "", modelo: "Dos", categoria: "ciudad" },
  ],
  true
);
comprobar("mismo id y sin slug: se descarta el duplicado (sigue siendo ambiguo)",
  mismoId.modelos.length === 1, String(mismoId.modelos.length));
comprobar("y queda constancia en los avisos",
  mismoId.avisos.some((a) => a.indexOf("duplicado") !== -1), mismoId.avisos.join(" | "));

// Sin id y sin slug: no se pierden, pero QA los señala.
const sinNada = await cargarConDoble(
  [
    { id: "", slug: "", modelo: "Anónimo A", categoria: "ciudad" },
    { id: "", slug: "", modelo: "Anónimo B", categoria: "ciudad" },
  ],
  true
);
comprobar("sin id ni slug: el esquema los descarta por identidad incompleta",
  sinNada.modelos.length === 0, String(sinNada.modelos.length));

// Y el control: los slugs válidos siguen deduplicándose como antes.
const conSlugRepetido = await cargarConDoble(
  [
    { id: "A", slug: "repetido", modelo: "Uno", categoria: "ciudad" },
    { id: "B", slug: "repetido", modelo: "Dos", categoria: "ciudad" },
  ],
  true
);
comprobar("dos slugs iguales siguen fundiéndose en uno",
  conSlugRepetido.modelos.length === 1, String(conSlugRepetido.modelos.length));

// El catálogo real no cambia.
const real = await cargarConDoble(
  JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8")).modelos,
  true
);
comprobar("el catálogo real sigue dando 22 en previsualización",
  real.modelos.length === 22, String(real.modelos.length));

/* ================================================================
   17. POST-REAUDITORÍA — qa-catalogo.mjs, ejecutado de verdad
   ================================================================ */

grupo("17. POST-REAUDITORÍA · EL EJECUTABLE DE QA");

/**
 * Ejecuta el script real como subproceso con un archivo de prueba.
 *
 * No se importa una función auxiliar: se lanza el mismo binario que
 * falló en la auditoría. Comprobar una función interna es justamente lo
 * que dejó pasar el defecto — el resumen que se imprime se calculaba en
 * otro sitio.
 */
function correrQaCatalogo(modelos) {
  const archivo = join(tmpdir(), "arenas-qa-" + Date.now() + "-" + Math.random().toString(36).slice(2) + ".json");
  writeFileSync(
    archivo,
    JSON.stringify({
      ok: true,
      version: "2.0",
      config: { moneda: "PEN", mostrar_precios: false },
      categories: [{ slug: "ciudad", titulo: "Ciudad", orden: 1 }],
      modelos: modelos,
    })
  );
  try {
    const r = spawnSync(process.execPath, [join(RAIZ, "scripts/qa-catalogo.mjs"), "--fuente", archivo, "--json"], {
      encoding: "utf8",
    });
    return { salida: JSON.parse(r.stdout), codigo: r.status };
  } finally {
    try {
      rmSync(archivo);
    } catch {
      /* el archivo temporal ya no está: nada que limpiar */
    }
  }
}

/** Modelo que cumple todos los mínimos, salvo lo que se le cambie. */
function filaQa(cambios) {
  return Object.assign(
    {
      id: "Q-1",
      slug: "modelo-qa",
      modelo: "Modelo QA",
      categoria: "ciudad",
      imagen_principal: "assets/catalogo/pulsar-180-neon/.gitkeep",
      alt_text: "Motocicleta de prueba vista de perfil",
      descripcion_corta: "Una moto real de prueba.",
      activo: true,
      estado_contenido: "APROBADO",
      orden: 10,
    },
    cambios || {}
  );
}

// EL CASO DE LA AUDITORÍA. Antes daba publicados=1, listos=1, exit 0.
const altProv = correrQaCatalogo([filaQa({ alt_text: "PENDIENTE" })]);
comprobar("alt provisional → publicados = 0", altProv.salida.resumen.publicados === 0,
  String(altProv.salida.resumen.publicados));
comprobar("alt provisional → listos para publicar = 0",
  altProv.salida.resumen.listosParaPublicar === 0, String(altProv.salida.resumen.listosParaPublicar));
comprobar("alt provisional → se cuenta como «sin alt»", altProv.salida.resumen.sinAlt === 1);
comprobar("alt provisional → se señala explícitamente",
  altProv.salida.errores.some((e) => e.indexOf("alt_text") !== -1), altProv.salida.errores.join(" | "));

[
  ["copy provisional", { descripcion_corta: "PENDIENTE" }],
  ["slug vacío", { slug: "" }],
  ["sin fotografía", { imagen_principal: "" }],
  ["sin id", { id: "" }],
].forEach(([nombre, cambio]) => {
  const r = correrQaCatalogo([filaQa(cambio)]);
  comprobar(`${nombre} → publicados = 0`, r.salida.resumen.publicados === 0,
    String(r.salida.resumen.publicados));
  comprobar(`${nombre} → listos = 0`, r.salida.resumen.listosParaPublicar === 0,
    String(r.salida.resumen.listosParaPublicar));
});

/* ---- Rutas de imagen hostiles, contra el CLI real ---- */

// El CLI ya levantaba el error de ruta, pero seguía contando el modelo
// como publicable porque la publicabilidad miraba «celda no vacía» en
// vez de la decisión del validador. Estas pruebas fallaban antes.
const RUTAS_HOSTILES = [
  ["escape de directorio", "../../secreto.png"],
  ["escape simple", "../secreto.webp"],
  ["escape interno", "assets/../secreto.webp"],
  ["https externo", "https://evil.example/moto.webp"],
  ["http externo", "http://evil.example/moto.webp"],
  ["protocolo-relativa", "//evil.example/moto.webp"],
  ["javascript:", "javascript:alert(1)"],
  ["data:", "data:image/png;base64,iVBORw0KGgo="],
  ["prefijo no permitido", "config/secreto.webp"],
  ["ruta de Windows", "C:\\fotos\\moto.webp"],
];

RUTAS_HOSTILES.forEach(([nombre, ruta]) => {
  const r = correrQaCatalogo([filaQa({ imagen_principal: ruta })]);
  const m = r.salida.modelos[0];
  comprobar(`ruta ${nombre} → no se considera fotografía`, m.conImagen === false, String(m.conImagen));
  comprobar(`ruta ${nombre} → publicable = false`, m.publicable === false, String(m.publicable));
  comprobar(`ruta ${nombre} → publicados = 0`, r.salida.resumen.publicados === 0,
    String(r.salida.resumen.publicados));
  comprobar(`ruta ${nombre} → listos = 0`, r.salida.resumen.listosParaPublicar === 0,
    String(r.salida.resumen.listosParaPublicar));
  comprobar(`ruta ${nombre} → se cuenta como «sin imagen»`, r.salida.resumen.sinImagen === 1);
  comprobar(`ruta ${nombre} → hay error estructural y exit 1`,
    r.salida.errores.length > 0 && r.codigo === 1, "exit=" + r.codigo);
});

// CONTROL POSITIVO. Una ruta que cumple el contrato cuenta como
// fotografía aunque el archivo todavía no esté subido: la validez
// CONTRACTUAL de la ruta y la EXISTENCIA FÍSICA del archivo son dos
// preguntas distintas, y de la segunda se ocupa qa-assets-catalogo.mjs.
const rutaBuena = correrQaCatalogo([
  filaQa({ imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp" }),
]);
comprobar("ruta válida con archivo aún inexistente → sí cuenta como fotografía",
  rutaBuena.salida.modelos[0].conImagen === true, String(rutaBuena.salida.modelos[0].conImagen));
comprobar("ruta válida → publicable", rutaBuena.salida.modelos[0].publicable === true);
comprobar("ruta válida → publicados = 1", rutaBuena.salida.resumen.publicados === 1);
comprobar("archivo inexistente es ADVERTENCIA, no error",
  rutaBuena.salida.errores.length === 0 &&
    rutaBuena.salida.avisos.some((a) => a.indexOf("no existe todavía") !== -1),
  rutaBuena.salida.avisos.join(" | ").slice(0, 120));
comprobar("ruta válida sin archivo → el CLI sale con 0", rutaBuena.codigo === 0, "exit=" + rutaBuena.codigo);

// Mínimo completo, sin ningún opcional.
const sinOpcionales = {
  imagen_mobile: "", galeria_1: "", galeria_2: "", colores: "",
  caracteristica_1: "", caracteristica_2: "", caracteristica_3: "",
  descripcion_larga: "", precio_publico: "", mostrar_precio: false, linea: "",
};

const listoInactivo = correrQaCatalogo([filaQa(Object.assign({ activo: false, estado_contenido: "BORRADOR" }, sinOpcionales))]);
comprobar("mínimo completo pero inactivo → listo = 1",
  listoInactivo.salida.resumen.listosParaPublicar === 1, String(listoInactivo.salida.resumen.listosParaPublicar));
comprobar("mínimo completo pero inactivo → publicado = 0",
  listoInactivo.salida.resumen.publicados === 0);

const listoActivo = correrQaCatalogo([filaQa(sinOpcionales)]);
comprobar("mínimo completo, activo y aprobado → listo = 1",
  listoActivo.salida.resumen.listosParaPublicar === 1);
comprobar("mínimo completo, activo y aprobado → publicado = 1",
  listoActivo.salida.resumen.publicados === 1, String(listoActivo.salida.resumen.publicados));
comprobar("los opcionales ausentes no impiden publicar", listoActivo.codigo === 0,
  "exit=" + listoActivo.codigo);

// El catálogo real: 22 borradores, sigue saliendo limpio.
const realQa = spawnSync(process.execPath, [join(RAIZ, "scripts/qa-catalogo.mjs"), "--json"], { encoding: "utf8" });
const resumenReal = JSON.parse(realQa.stdout).resumen;
comprobar("catálogo real: 22 modelos", resumenReal.modelos === 22, String(resumenReal.modelos));
comprobar("catálogo real: 0 publicados", resumenReal.publicados === 0);
comprobar("catálogo real: 0 listos (no hay fotografías)", resumenReal.listosParaPublicar === 0,
  String(resumenReal.listosParaPublicar));
comprobar("catálogo real: sigue saliendo con código 0", realQa.status === 0, "exit=" + realQa.status);

/* ================================================================
   18. POST-REAUDITORÍA — la documentación no contradice al código
   ================================================================ */

grupo("18. POST-REAUDITORÍA · DOCUMENTACIÓN");

/**
 * Comprobación deliberadamente simple: busca frases concretas que ya
 * fueron corregidas y que no deben reaparecer. No analiza la
 * documentación ni pretende validarla entera — solo evita que una
 * afirmación prohibida vuelva a colarse en una edición futura.
 */
// Se buscan expresiones regulares y no cadenas sueltas: «no se deriva de
// nombre_color» contiene literalmente «se deriva de nombre_color», y una
// búsqueda ingenua marcaría como prohibida justo la frase que corrige el
// problema. Cada patrón exige que NO vaya precedido de una negación.
// La negación puede aparecer en cualquier caja —«no», «No», «NO»—, así
// que el lookbehind la contempla en las tres formas. Escribirlo como
// `(?<!no )` a secas dejaba pasar «NO se deriva de `modelo`», que es
// justamente la frase que corrige el problema.
const NEG = "(?<![Nn][Oo] )";

const PROHIBIDO_EN_DOCS = [
  [/si se deja vac[íi]o se deriva/i, "un slug derivado cuando falta"],
  [new RegExp(NEG + "se deriva de `nombre_color`", "i"), "slug_color derivado del nombre"],
  [new RegExp(NEG + "se genera desde `modelo`", "i"), "slug derivado del modelo"],
  // El caso concreto que quedaba en contrato-sheets-frontend.md.
  [new RegExp(NEG + "se deriva de `modelo`", "i"), "que el slug se deriva de modelo"],
  [new RegExp(NEG + "el slug se deriva", "i"), "que el slug se deriva"],
  [/T[ée]cnicamente s[íi]/i, "que se puede publicar sin fotografía"],
  [/el modelo sobrevive sin foto/i, "un modelo publicado sin fotografía"],
  // La arquitectura tiene cuatro controladores de la misma política.
  [/[Ss]e implementa en un [úu]nico punto/, "que una sola función decide la publicación"],
  [/las herramientas, no bloquea nada/i, "que la publicabilidad no bloquea producción"],
];

const DOCS_CATALOGO = [
  "docs/reglas-publicacion-catalogo.md",
  "docs/guia-carga-contenido-catalogo.md",
  "docs/colores-modelo-web.md",
  "docs/catalogo-modelos-web.md",
  "docs/catalogo-api-publica.md",
  "docs/checklist-modelo-publicable.md",
  "docs/contrato-sheets-frontend.md",
];

DOCS_CATALOGO.forEach((doc) => {
  const texto = readFileSync(join(RAIZ, doc), "utf8");
  PROHIBIDO_EN_DOCS.forEach(([patron, motivo]) => {
    comprobar(`${doc.split("/").pop()}: no afirma ${motivo}`, !patron.test(texto), String(patron));
  });
});

// Y lo contrario: las afirmaciones que SÍ deben estar.
const reglas = readFileSync(join(RAIZ, "docs/reglas-publicacion-catalogo.md"), "utf8");
comprobar("reglas-publicacion: define PUBLICADO con las tres condiciones",
  reglas.includes("PUBLICABLE") && reglas.includes("activo = TRUE") && reglas.includes("APROBADO"));
comprobar("reglas-publicacion: descripcion_corta figura como obligatoria",
  /Obligatorio.*descripcion_corta/s.test(reglas.split("| **Recomendado**")[0]));

const colores = readFileSync(join(RAIZ, "docs/colores-modelo-web.md"), "utf8");
comprobar("colores-modelo-web: exige slug_color explícito",
  colores.includes("explícitamente"), "");

// Las afirmaciones que la corrección de 3.2H tenía que dejar escritas.
comprobar("reglas-publicacion: describe las cuatro capas de la política",
  reglas.includes("cuatro implementaciones") && reglas.includes("Nucleo.gs") &&
    reglas.includes("qa-catalogo.mjs"));
comprobar("reglas-publicacion: la publicabilidad bloquea en producción",
  /bloquea en producci[óo]n/i.test(reglas));
comprobar("reglas-publicacion: una celda llena no es una ruta válida",
  /celda llena no es una ruta v[áa]lida/i.test(reglas));
comprobar("reglas-publicacion: el slug ausente conserva el borrador en previsualización",
  /se conserva.*borrador/is.test(reglas.split("## Tabla maestra")[0]));

const contrato = readFileSync(join(RAIZ, "docs/contrato-sheets-frontend.md"), "utf8");
comprobar("contrato-sheets-frontend: dice que el slug NO se deriva",
  /NO se deriva de `modelo`/.test(contrato));

/* ---- El comprobador, comprobado ---- */

// Una comprobación documental que no distingue una afirmación de su
// negación es peor que no tenerla: da confianza falsa. Estas parejas
// verifican que cada patrón marque la frase prohibida y deje pasar la
// que la corrige.
[
  ["se deriva de `modelo`", "NO se deriva de `modelo`"],
  ["se deriva de `modelo`", "no se deriva de `modelo`"],
  ["se deriva de `nombre_color`", "NO se deriva de `nombre_color`"],
  ["Se implementa en un único punto: esPublicable()", "No hay «un único punto» que decida"],
].forEach(([mala, buena]) => {
  const marcaMala = PROHIBIDO_EN_DOCS.some(([p]) => p.test(mala));
  const marcaBuena = PROHIBIDO_EN_DOCS.some(([p]) => p.test(buena));
  comprobar(`el comprobador marca "${mala.slice(0, 34)}…"`, marcaMala);
  comprobar(`y NO marca su corrección "${buena.slice(0, 34)}…"`, !marcaBuena);
});

/* ================================================================
   Resultado
   ================================================================ */

console.log("");
console.log("=".repeat(60));
if (fallos.length) {
  console.log(`RESULTADO: ${fallos.length} prueba(s) FALLAN de ${pasadas + fallos.length}.`);
  console.log("");
  fallos.forEach((f) => console.log("  · " + f));
  process.exit(1);
}
console.log(`RESULTADO: ${pasadas}/${pasadas} pruebas pasan.`);
process.exit(0);
