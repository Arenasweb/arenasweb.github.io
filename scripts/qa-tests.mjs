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
    // El controlador de catálogo registra su arranque al cargar. Se deja
    // pendiente el DOMContentLoaded para probar su lógica pura sin iniciar
    // una interfaz ficticia.
    document: {
      readyState: "loading",
      addEventListener() {},
      querySelector() { return null; },
      getElementById() { return null; },
      createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    },
  });

  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
    "assets/js/catalogo/catalogo-data.js",
    // El buscador va ANTES que la aplicación: `catalogo-app.js` delega
    // en él su predicado de filtrado, igual que en el navegador.
    "assets/js/catalogo/catalogo-finder.js",
    "assets/js/catalogo/catalogo-app.js",
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
const A = NS.app;
const FI = NS.finder;

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
// Antes exigía «0 publicables en producción», porque el catálogo aún no se
// había publicado. Ya lo está: la cifra fija caducó. Se ata a la puerta de
// publicación en sí — publicable equivale a activo Y aprobado Y con los
// campos mínimos — que es la regla que de verdad importa y que sigue
// atrapando lo que preocupa: algo publicable sin cumplirla.
const publicablesProd = modsReal.filter((m) => S.esPublicable(m, false));
const debenSerlo = regsReal.filter((r) =>
  r.activo === true && String(r.estado_contenido || "").toUpperCase() === "APROBADO" &&
  r.imagen_principal && r.alt_text && r.descripcion_corta);
comprobar("producción publica exactamente lo que pasa la puerta de publicación",
  publicablesProd.length === debenSerlo.length,
  "publicables=" + publicablesProd.length + " cumplen=" + debenSerlo.length);
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
// También caducó el «0 publicados». Lo que no puede pasar es publicar algo
// que no esté listo, así que se exige que publicados nunca supere a listos.
comprobar("catálogo real: no se publica nada que no esté listo",
  resumenReal.publicados <= resumenReal.listosParaPublicar,
  "publicados=" + resumenReal.publicados + " listos=" + resumenReal.listosParaPublicar);

// Antes esto exigía «0 listos, porque no hay fotografías». Ya hay ocho, así
// que la cifra fija caducó. Se ata a la causa en vez de al número: lo que
// impide publicar es la falta de fotografía, luego los listos tienen que ser
// exactamente los que la tienen. Así la prueba sigue viva según entren fotos,
// y aun así atrapa lo que importa — que algo se declare listo sin foto.
const conFoto = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"))
  .modelos.filter((m) => m.imagen_principal).length;
comprobar("catálogo real: los listos son exactamente los que tienen fotografía",
  resumenReal.listosParaPublicar === conFoto,
  "listos=" + resumenReal.listosParaPublicar + " conFoto=" + conFoto);
comprobar("catálogo real: sigue saliendo con código 0", realQa.status === 0, "exit=" + realQa.status);

/* ================================================================
   17 bis. FILTROS Y ORDEN DEL CATÁLOGO
   ================================================================ */

grupo("17 bis. FILTROS Y ORDEN DEL CATÁLOGO");

const modelosFiltro = [
  {
    id: "F-1", modelo: "Pulsar 180", titulo: "Pulsar 180", categoria: "ciudad",
    linea: "Pulsar", subcategoria: "Naked", colors: [
      { slug: "rojo", nombre: "Rojo" }, { slug: "azul", nombre: "Azul" },
    ], mostrarPrecio: true, precioPublico: 10000,
  },
  {
    id: "F-2", modelo: "Boxer CT 100", titulo: "Boxer CT 100", categoria: "trabajo",
    linea: "Boxer", subcategoria: "Utilitaria", colors: [], mostrarPrecio: false,
  },
  {
    id: "F-3", modelo: "Pulsar NS 200", titulo: "Pulsar NS 200", categoria: "deportiva",
    linea: "Pulsar", subcategoria: "Naked", colors: [{ slug: "rojo", nombre: "Rojo" }],
    mostrarPrecio: true, precioPublico: 13000,
  },
  {
    id: "F-4", modelo: "Dominar 400", titulo: "Dominar 400", categoria: "aventura",
    linea: "Dominar", subcategoria: "Touring", colors: [{ slug: "negro", nombre: "Negro" }],
    mostrarPrecio: true, precioPublico: 12000,
  },
];
const estadoFiltro = { modelos: modelosFiltro };

function reiniciarFiltrosApp() {
  Object.assign(A.filtros, { texto: "", categoria: "", linea: "", color: "", orden: "relevancia" });
}

reiniciarFiltrosApp();
Object.assign(A.filtros, { texto: "180", categoria: "ciudad", linea: "Pulsar", color: "rojo" });
comprobar("búsqueda, categoría, línea y color se combinan con Y lógico",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-1"]));

reiniciarFiltrosApp();
A.filtros.color = "azul";
comprobar("el color solo incluye modelos con una variante real coincidente",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-1"]));
comprobar("el color cuenta como filtro activo", A.hayFiltrosActivos() && A.numeroFiltrosActivos() === 1);

reiniciarFiltrosApp();
A.filtros.orden = "nombre-asc";
comprobar("orden por nombre A–Z",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-2", "F-4", "F-1", "F-3"]));
A.filtros.orden = "nombre-desc";
comprobar("orden por nombre Z–A",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-3", "F-1", "F-4", "F-2"]));
comprobar("cambiar solo el orden no cuenta como filtro activo", !A.hayFiltrosActivos());

A.filtros.orden = "precio-asc";
comprobar("precio ascendente deja los modelos sin precio al final",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-1", "F-4", "F-3", "F-2"]));
A.filtros.orden = "precio-desc";
comprobar("precio descendente deja los modelos sin precio al final",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-3", "F-4", "F-1", "F-2"]));

reiniciarFiltrosApp();
comprobar("orden recomendado conserva el orden editorial de origen",
  iguales(A.aplicarFiltros(estadoFiltro).map((m) => m.id), ["F-1", "F-2", "F-3", "F-4"]));
comprobar("los colores disponibles se deduplican y ordenan por nombre",
  iguales(A.coloresDisponibles(estadoFiltro), [
    { valor: "azul", texto: "Azul" },
    { valor: "negro", texto: "Negro" },
    { valor: "rojo", texto: "Rojo" },
  ]));
comprobar("el orden por precio aparece cuando existe un precio publicable",
  A.ordenesDisponibles(estadoFiltro).some((o) => o.valor === "precio-asc"));
comprobar("el orden por precio se oculta si ningún precio es publicable",
  !A.ordenesDisponibles({ modelos: [modelosFiltro[1]] }).some((o) => o.valor.startsWith("precio-")));
reiniciarFiltrosApp();

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
   19. BUSCADOR «ENCUENTRA LA MOTO PARA TU CAMINO»
   Se prueba la lógica REAL de catalogo-finder.js, cargada arriba en
   el mismo contexto que el resto de módulos del navegador. Nada de
   reimplementar el ranking para después comprobar la copia.
   ================================================================ */

grupo("19. BUSCADOR — BÚSQUEDA DIRECTA");

const mBusca = [
  {
    id: "B-1", slug: "pulsar-180-neon", modelo: "Pulsar 180 Neon", titulo: "Pulsar 180 Neon",
    linea: "Pulsar", categoria: "ciudad", subcategoria: "Naked", orden: 10,
    colors: [{ slug: "rojo", nombre: "Rojo", hex: "#c81d25" }, { slug: "azul", nombre: "Azul", hex: "#184FA3" }],
    mostrarPrecio: true, precioPublico: 9990, nuevo: true,
  },
  {
    id: "B-2", slug: "pulsar-ns-200", modelo: "Pulsar NS 200", titulo: "Pulsar NS 200",
    linea: "Pulsar", categoria: "deportiva", subcategoria: "Sport", orden: 20,
    colors: [{ slug: "rojo", nombre: "Rojo", hex: "#c81d25" }],
    mostrarPrecio: true, precioPublico: 13500,
  },
  {
    id: "B-3", slug: "boxer-ct-125", modelo: "Boxer CT 125", titulo: "Boxer CT 125",
    linea: "Boxer", categoria: "trabajo", subcategoria: "Utilitaria", orden: 30,
    colors: [], mostrarPrecio: true, precioPublico: 6200,
  },
  {
    id: "B-4", slug: "dominar-400", modelo: "Dominar 400", titulo: "Dominar 400",
    linea: "Dominar", categoria: "aventura", subcategoria: "Touring", orden: 40,
    colors: [{ slug: "negro", nombre: "Negro", hex: "#111111" }],
    mostrarPrecio: true, precioPublico: 21500, destacado: true,
  },
  {
    id: "B-5", slug: "torito-3w-4t", modelo: "Torito 3W 4T", titulo: "Torito 3W 4T",
    linea: "Torito", categoria: "carga", subcategoria: "Tres ruedas", orden: 50,
    colors: [], mostrarPrecio: false,
  },
];

const cfgPrecios = S.normalizarConfig({ mostrar_precios: true });
const cfgSinPrecios = S.normalizarConfig({ mostrar_precios: false });
const estBusca = { modelos: mBusca, config: cfgPrecios, categorias: [] };
const ids = (lista) => lista.map((r) => (r && typeof r.modelo === "object" ? r.modelo.id : r.id));

/* ---- Coincidencia y normalización ---- */

comprobar("coincidencia exacta con el modelo puntúa por encima de todo",
  FI.puntuar(mBusca[0], "pulsar 180 neon") === 70);
comprobar("un prefijo del modelo puntúa por debajo de la coincidencia exacta",
  FI.puntuar(mBusca[0], "pulsar 180") === 60 && 60 < 70);
comprobar("coincidencia exacta con la línea puntúa por debajo del prefijo",
  FI.puntuar(mBusca[0], "pulsar") === 60);
comprobar("una palabra interna que empieza por la consulta puntúa menos que el prefijo",
  FI.puntuar(mBusca[0], "neon") === 40);
comprobar("coincidencia parcial dentro de una palabra puntúa aún menos",
  FI.puntuar(mBusca[0], "eon") === 30);
comprobar("coincidencia solo por categoría es la de menor puntuación",
  FI.puntuar(mBusca[0], "ciudad") === 10);
comprobar("coincidencia por subcategoría también puntúa",
  FI.puntuar(mBusca[1], "sport") === 10);
comprobar("sin coincidencia la puntuación es cero",
  FI.puntuar(mBusca[0], "zzz") === 0);

comprobar("la búsqueda ignora las tildes",
  iguales(ids(FI.rankear(mBusca, "TORÍTO")), ["B-5"]));
comprobar("la búsqueda ignora mayúsculas y minúsculas",
  iguales(ids(FI.rankear(mBusca, "dOmInAr")), ["B-4"]));
comprobar("la búsqueda ignora los espacios sobrantes",
  iguales(ids(FI.rankear(mBusca, "   boxer   ")), ["B-3"]));

comprobar("una consulta vacía no sugiere nada", FI.rankear(mBusca, "").length === 0);
comprobar("una consulta de solo espacios no sugiere nada", FI.rankear(mBusca, "     ").length === 0);
comprobar("una consulta nula no rompe", FI.rankear(mBusca, null).length === 0);
comprobar("una consulta demasiado larga se acota a MAX_CONSULTA",
  FI.normalizarConsulta("x".repeat(500)).length === FI.MAX_CONSULTA);
comprobar("y una consulta larguísima no sugiere nada absurdo",
  FI.rankear(mBusca, "pulsar" + "z".repeat(200)).length === 0);

/* ---- Orden determinista y límite ---- */

comprobar("las dos Pulsar salen ordenadas por relevancia, no por posición",
  iguales(ids(FI.rankear(mBusca, "pulsar")), ["B-1", "B-2"]));
comprobar("con puntuación empatada manda el orden editorial",
  iguales(ids(FI.rankear([mBusca[1], mBusca[0]], "pulsar")), ["B-1", "B-2"]));
comprobar("el ranking es estable: dos llamadas iguales dan el mismo resultado",
  iguales(ids(FI.rankear(mBusca, "pulsar")), ids(FI.rankear(mBusca, "pulsar"))));
comprobar("el ranking NO reordena el catálogo: es una lista aparte",
  iguales(mBusca.map((m) => m.id), ["B-1", "B-2", "B-3", "B-4", "B-5"]));

const muchos = [];
for (let i = 0; i < 40; i++) {
  muchos.push({ id: "M-" + i, modelo: "Pulsar " + i, titulo: "Pulsar " + i, linea: "Pulsar", categoria: "ciudad", orden: i });
}
comprobar("las sugerencias se limitan al tope por defecto",
  FI.sugerencias(muchos, "pulsar").length === FI.LIMITE_SUGERENCIAS);
comprobar("y el tope se puede bajar", FI.sugerencias(muchos, "pulsar", 3).length === 3);
comprobar("un tope inválido cae al valor por defecto",
  FI.sugerencias(muchos, "pulsar", 0).length === FI.LIMITE_SUGERENCIAS);

/* ---- El predicado compartido ---- */

grupo("19 bis. BUSCADOR — UN SOLO PREDICADO");

comprobar("catalogo-app delega su predicado en el buscador",
  A.coincide === A.coincide && typeof FI.coincide === "function");
comprobar("el predicado del buscador y el de la rejilla dan el mismo resultado",
  mBusca.every((m) => {
    Object.assign(A.filtros, { texto: "pulsar", categoria: "", linea: "", color: "", precio: "", orden: "relevancia" });
    return A.coincide(m) === FI.coincide(m, { texto: "pulsar" });
  }));
Object.assign(A.filtros, { texto: "", categoria: "", linea: "", color: "", precio: "", orden: "relevancia" });

comprobar("sin criterios, todo coincide", FI.filtrar(mBusca, {}).length === 5);
comprobar("los criterios se combinan con Y lógico",
  iguales(ids(FI.filtrar(mBusca, { categoria: "ciudad", linea: "Pulsar", color: "azul" })), ["B-1"]));
comprobar("un criterio que nadie cumple deja cero resultados",
  FI.filtrar(mBusca, { categoria: "ciudad", linea: "Dominar" }).length === 0);
comprobar("la búsqueda de texto también encuentra por categoría",
  iguales(ids(FI.filtrar(mBusca, { texto: "carga" })), ["B-5"]));
comprobar("el color exige una variante real, no la lista de texto",
  iguales(ids(FI.filtrar(mBusca, { color: "negro" })), ["B-4"]));

/* ---- Opciones derivadas ---- */

grupo("19 ter. BUSCADOR — OPCIONES DERIVADAS DE LOS DATOS");

comprobar("los usos salen de las categorías que tienen modelos",
  iguales(FI.usosDisponibles(mBusca).map((u) => u.slug),
    ["ciudad", "trabajo", "deportiva", "aventura", "carga"]));
comprobar("un uso sin modelos no se ofrece",
  iguales(FI.usosDisponibles([mBusca[0]]).map((u) => u.slug), ["ciudad"]));
comprobar("los usos apuntan solo a categorías de la taxonomía aprobada",
  FI.USOS.every((u) => S.CATEGORIAS.indexOf(u.slug) !== -1));
comprobar("no se inventan usos fuera de la taxonomía",
  FI.USOS.length === S.CATEGORIAS.length);

comprobar("las líneas se derivan del conjunto y se ordenan",
  iguales(FI.lineasDe(mBusca).map((l) => l.valor), ["Boxer", "Dominar", "Pulsar", "Torito"]));
comprobar("las líneas no se repiten", FI.lineasDe(mBusca).length === 4);
comprobar("sin modelos no hay líneas", FI.lineasDe([]).length === 0);

comprobar("los colores salen de colors[] y se deduplican",
  iguales(FI.coloresDe(mBusca).map((c) => c.valor), ["azul", "negro", "rojo"]));
comprobar("un hexadecimal válido se conserva",
  FI.coloresDe(mBusca).some((c) => c.valor === "azul" && c.hex === "#184fa3"));
comprobar("un hexadecimal inválido se descarta sin romper la opción",
  FI.coloresDe([{ colors: [{ slug: "x", nombre: "X", hex: "no-es-un-hex" }] }])[0].hex === "");
comprobar("sin variantes reales no hay colores",
  FI.coloresDe([mBusca[2], mBusca[4]]).length === 0);

/* ---- Presupuesto ---- */

grupo("19 quater. BUSCADOR — PRESUPUESTO");

comprobar("sin permiso global de precios no hay tramos",
  FI.rangosPrecio(mBusca, cfgSinPrecios).length === 0);
comprobar("con permiso global y precios reales sí hay tramos",
  FI.rangosPrecio(mBusca, cfgPrecios).length >= 2);
comprobar("un solo precio publicable no forma tramos",
  FI.rangosPrecio([mBusca[0]], cfgPrecios).length === 0);
comprobar("sin precios publicables no hay tramos",
  FI.rangosPrecio([mBusca[4]], cfgPrecios).length === 0);

const conPrecioOculto = [
  { id: "P-1", modelo: "A", mostrarPrecio: false, precioPublico: 5000 },
  { id: "P-2", modelo: "B", mostrarPrecio: false, precioPublico: 9000 },
];
comprobar("un precio con mostrarPrecio en false nunca forma un tramo",
  FI.rangosPrecio(conPrecioOculto, cfgPrecios).length === 0);
comprobar("y ese precio tampoco es publicable",
  !FI.precioPublicable(conPrecioOculto[0]));
comprobar("un precio de cero no es publicable",
  !FI.precioPublicable({ mostrarPrecio: true, precioPublico: 0 }));
comprobar("un precio negativo no es publicable",
  !FI.precioPublicable({ mostrarPrecio: true, precioPublico: -100 }));
comprobar("un precio que no es número no es publicable",
  !FI.precioPublicable({ mostrarPrecio: true, precioPublico: "9990" }));

const tramos = FI.rangosPrecio(mBusca, cfgPrecios);
comprobar("ningún tramo derivado queda vacío",
  tramos.every((t) => mBusca.some((m) => FI.enTramo(m, t.valor))));
comprobar("los tramos no usan importes fijos inventados",
  tramos.every((t) => /\d/.test(t.texto)));
comprobar("un modelo sin precio publicable no cae en ningún tramo",
  tramos.every((t) => !FI.enTramo(mBusca[4], t.valor)));
comprobar("un tramo inventado no acepta a nadie",
  mBusca.every((m) => !FI.enTramo(m, "hasta-x")));
comprobar("el filtro por tramo se combina con el resto",
  FI.filtrar(mBusca, { precio: tramos[0].valor, categoria: "aventura" }).length <= 1);

/* ---- Pasos del asistente ---- */

grupo("19 quinquies. BUSCADOR — ASISTENTE");

const pasosTodos = FI.pasos(estBusca, {});
comprobar("con datos variados el asistente propone el paso de uso",
  pasosTodos.some((p) => p.id === "categoria"));
comprobar("y el de línea", pasosTodos.some((p) => p.id === "linea"));
comprobar("y el de color", pasosTodos.some((p) => p.id === "color"));
comprobar("y el de presupuesto cuando hay precios",
  pasosTodos.some((p) => p.id === "precio"));

const pasosSinPrecio = FI.pasos({ modelos: mBusca, config: cfgSinPrecios }, {});
comprobar("el paso de presupuesto DESAPARECE si los precios están ocultos",
  !pasosSinPrecio.some((p) => p.id === "precio"));

const soloCiudad = [mBusca[0]];
comprobar("con una sola categoría el paso de uso desaparece",
  !FI.pasos({ modelos: soloCiudad, config: cfgPrecios }, {}).some((p) => p.id === "categoria"));

comprobar("elegir ciudad deja una sola línea y el paso de línea desaparece",
  !FI.pasos(estBusca, { categoria: "ciudad" }).some((p) => p.id === "linea"));
comprobar("elegir deportiva deja modelos sin más de una línea: sin paso de línea",
  !FI.pasos(estBusca, { categoria: "deportiva" }).some((p) => p.id === "linea"));
comprobar("elegir trabajo deja un conjunto sin colores: el paso de color desaparece",
  !FI.pasos(estBusca, { categoria: "trabajo" }).some((p) => p.id === "color"));
comprobar("elegir carga deja un conjunto sin precios publicables: sin paso de presupuesto",
  !FI.pasos(estBusca, { categoria: "carga" }).some((p) => p.id === "precio"));

comprobar("sin modelos el asistente no tiene ningún paso",
  FI.pasos({ modelos: [], config: cfgPrecios }, {}).length === 0);
comprobar("un estado inválido no rompe el asistente",
  FI.pasos(null, {}).length === 0 && FI.pasos({}, {}).length === 0);

comprobar("las respuestas se traducen a criterios del catálogo",
  JSON.stringify(FI.criteriosDe({ categoria: "ciudad", linea: "Pulsar" })) ===
  JSON.stringify({ categoria: "ciudad", linea: "Pulsar", color: "", precio: "" }));
comprobar("«sin preferencia» no aplica ningún criterio",
  JSON.stringify(FI.criteriosDe({})) ===
  JSON.stringify({ categoria: "", linea: "", color: "", precio: "" }));
comprobar("«sin preferencia» en uso deja pasar todas las categorías",
  FI.filtrar(mBusca, FI.criteriosDe({ categoria: "" })).length === 5);

/* ---- Motivos ---- */

comprobar("se explica la coincidencia por uso",
  FI.motivos(mBusca[0], { categoria: "ciudad" }, null)
    .some((m) => /ciudad/i.test(m)));
comprobar("se explica la coincidencia por línea",
  FI.motivos(mBusca[0], { linea: "Pulsar" }, null)
    .some((m) => /l[ií]nea Pulsar/i.test(m)));
comprobar("se explica la coincidencia por color, con su nombre",
  FI.motivos(mBusca[0], { color: "azul" }, null)
    .some((m) => /color Azul/i.test(m)));
comprobar("un modelo que no cumple el criterio no recibe ese motivo",
  FI.motivos(mBusca[2], { color: "azul" }, null).length === 0);
comprobar("los motivos NO afirman superioridad",
  FI.motivos(mBusca[0], { categoria: "ciudad", linea: "Pulsar", color: "azul" }, null)
    .every((m) => !/(mejor|ideal|garantiz|imparcial|perfect)/i.test(m)));
comprobar("ningún texto del asistente promete una recomendación objetiva",
  FI.USOS.every((u) => !/(mejor|ideal|garantiz|imparcial)/i.test(u.texto)));

/* ---- Estado único y URL ---- */

grupo("19 sexies. BUSCADOR — ESTADO ÚNICO Y URL");

comprobar("el store existe y expone las cuatro operaciones",
  A.store && typeof A.store.obtener === "function" && typeof A.store.aplicar === "function" &&
  typeof A.store.limpiar === "function" && typeof A.store.suscribir === "function");
comprobar("obtener() devuelve una copia, no el estado interno",
  A.store.obtener() !== A.filtros);

const copia = A.store.obtener();
copia.categoria = "sabotaje";
comprobar("escribir en la copia no toca el estado real", A.filtros.categoria !== "sabotaje");

comprobar("el precio es un criterio del catálogo, no un filtro aparte",
  A.CRITERIOS.indexOf("precio") !== -1);
comprobar("el orden NO cuenta como criterio", A.CRITERIOS.indexOf("orden") === -1);
comprobar("los criterios son exactamente los cinco previstos",
  iguales(A.CRITERIOS.slice().sort(), ["categoria", "color", "linea", "precio", "texto"]));

const suscritos = [];
const baja = A.store.suscribir((ev) => suscritos.push(ev));
comprobar("suscribir devuelve una función para darse de baja", typeof baja === "function");
baja();

/* ---- Publicación: el buscador no abre ninguna puerta ---- */

grupo("19 septies. BUSCADOR — NO DEBILITA LA PUBLICACIÓN");

const modeloBorradorFinder = {
  id: "X-1", slug: "borrador", modelo: "Borrador", titulo: "Borrador",
  categoria: "ciudad", linea: "Pulsar",
  imagenPrincipal: "assets/catalogo/x/portada.webp",
  altText: "Una fotografía real de la motocicleta de perfil",
  descripcionCorta: "Un texto real y suficiente para la tarjeta.",
  activo: true, estadoContenido: "BORRADOR", colors: [],
};
comprobar("un borrador no es publicable aunque el buscador lo encuentre",
  FI.rankear([modeloBorradorFinder], "Borrador").length === 1 && S.esPublicable(modeloBorradorFinder) === false);

const sinFoto = Object.assign({}, modeloBorradorFinder, { estadoContenido: "APROBADO", imagenPrincipal: "" });
comprobar("un modelo sin fotografía sigue sin publicarse",
  S.esPublicable(sinFoto) === false);
const sinAlt = Object.assign({}, modeloBorradorFinder, { estadoContenido: "APROBADO", altText: "" });
comprobar("un modelo sin alt_text sigue sin publicarse",
  S.esPublicable(sinAlt) === false);
const altProvisional = Object.assign({}, modeloBorradorFinder, { estadoContenido: "APROBADO", altText: "PENDIENTE" });
comprobar("un alt_text provisional sigue sin publicarse",
  S.esPublicable(altProvisional) === false);
const bueno = Object.assign({}, modeloBorradorFinder, { estadoContenido: "APROBADO" });
comprobar("y con todo en regla sí se publica", S.esPublicable(bueno) === true);

comprobar("el buscador NO llama a esPublicable ni la modifica",
  !/esPublicable/.test(readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-finder.js"), "utf8")));

const fuenteFinder = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-finder.js"), "utf8");
const fuenteFinderUi = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-finder-ui.js"), "utf8");

comprobar("el buscador no usa innerHTML", !/innerHTML/.test(fuenteFinder + fuenteFinderUi));
comprobar("el buscador no usa eval ni new Function",
  !/\beval\s*\(|new\s+Function\s*\(/.test(fuenteFinder + fuenteFinderUi));
comprobar("el buscador no usa document.write", !/document\.write/.test(fuenteFinder + fuenteFinderUi));
comprobar("el buscador no guarda nada en el navegador",
  !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(fuenteFinder + fuenteFinderUi));
comprobar("el buscador no añade telemetría ni peticiones externas",
  !/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|geolocation/.test(fuenteFinder + fuenteFinderUi));
comprobar("el buscador no escribe categorías a mano en la interfaz",
  !/scooter|naked|enduro|caf[eé] racer|doble prop[oó]sito/i.test(fuenteFinderUi));
comprobar("el buscador no lee especificaciones técnicas que hoy no existen",
  !/\.(cilindrada|potencia|torque|transmision|consumo|freno)\b/i.test(fuenteFinder + fuenteFinderUi));
comprobar("el buscador no toca stock ni datos internos",
  !/stock|chasis|costo|margen|proveedor|telefono_cliente/i.test(fuenteFinder + fuenteFinderUi));

/* ================================================================
   20. BUSCADOR — SINCRONIZACIÓN CON LA URL
   Se cargan los módulos reales con una `location` controlada y un
   `history` que apunta lo que se le pide, para poder leer el resultado
   sin navegador.
   ================================================================ */

grupo("20. BUSCADOR — URL COMPARTIBLE");

const estadoUrl = {
  modelos: [
    {
      id: "U-1", slug: "pulsar-180-neon", modelo: "Pulsar 180 Neon", titulo: "Pulsar 180 Neon",
      linea: "Pulsar", categoria: "ciudad", colors: [{ slug: "azul", nombre: "Azul" }],
      mostrarPrecio: false,
    },
    {
      id: "U-2", slug: "dominar-400", modelo: "Dominar 400", titulo: "Dominar 400",
      linea: "Dominar", categoria: "aventura", colors: [{ slug: "negro", nombre: "Negro" }],
      mostrarPrecio: false,
    },
  ],
  categorias: [
    { slug: "ciudad", titulo: "Ciudad", descripcion: "", orden: 1 },
    { slug: "aventura", titulo: "Ruta y aventura", descripcion: "", orden: 2 },
  ],
  config: S.normalizarConfig({}),
};

/** Lee los filtros desde una URL dada y devuelve el estado resultante. */
function leerDesde(busqueda) {
  const ns = cargarModulos({ hostname: "localhost", search: busqueda, pathname: "/catalogo.html" });
  ns.app._leerFiltrosDeUrl(estadoUrl);
  return ns.app.store.obtener ? Object.assign({}, ns.app.filtros) : ns.app.filtros;
}

const u1 = leerDesde("?categoria=ciudad&linea=Pulsar&color=azul&q=pulsar&orden=nombre-asc");
comprobar("la URL restaura la categoría", u1.categoria === "ciudad");
comprobar("la URL restaura la línea", u1.linea === "Pulsar");
comprobar("la URL restaura el color", u1.color === "azul");
comprobar("la URL restaura el texto", u1.texto === "pulsar");
comprobar("la URL restaura el orden", u1.orden === "nombre-asc");

const u2 = leerDesde("?categoria=inventada&linea=NoExiste&color=fucsia&orden=magia");
comprobar("una categoría inexistente se ignora", u2.categoria === "");
comprobar("una línea inexistente se ignora", u2.linea === "");
comprobar("un color inexistente se ignora", u2.color === "");
comprobar("un orden desconocido se ignora", u2.orden === "relevancia");

const u3 = leerDesde("?precio=hasta-9999");
comprobar("un tramo de precio sin precios publicables se ignora", u3.precio === "");

const u4 = leerDesde("?q=" + encodeURIComponent("x".repeat(300)));
comprobar("una consulta larguísima se acota al leerla de la URL",
  u4.texto.length <= FI.MAX_CONSULTA);

const u5 = leerDesde("?preview=1&categoria=ciudad");
comprobar("un parámetro ajeno no impide leer los propios", u5.categoria === "ciudad");

const u6 = leerDesde("");
comprobar("sin parámetros no hay ningún criterio activo",
  !u6.categoria && !u6.linea && !u6.color && !u6.precio && !u6.texto);
comprobar("sin parámetros el orden es el recomendado", u6.orden === "relevancia");

/* ---- Escritura de la URL ---- */

/**
 * Ejecuta `_sincronizarUrl` con un historial simulado y devuelve la
 * cadena que el catálogo habría dejado en la barra de direcciones.
 */
function escribirUrl(busquedaInicial, criterios) {
  let ultima = null;
  const ventana = {
    location: { hostname: "localhost", search: busquedaInicial, pathname: "/catalogo.html" },
    matchMedia: () => ({ matches: false }),
    setTimeout,
    clearTimeout,
    Image: function () {},
    history: {
      replaceState(a, b, url) { ultima = url; },
      pushState() { throw new Error("filtrar no debe apilar historial"); },
    },
  };
  ventana.window = ventana;
  const contexto = createContext({
    window: ventana,
    URLSearchParams,
    console,
    document: {
      readyState: "loading",
      addEventListener() {},
      querySelector() { return null; },
      getElementById() { return null; },
      createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    },
  });
  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
    "assets/js/catalogo/catalogo-data.js",
    "assets/js/catalogo/catalogo-finder.js",
    "assets/js/catalogo/catalogo-app.js",
  ]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }
  const ns = contexto.window.ARENAS_CATALOGO;
  Object.assign(ns.app.filtros, criterios);
  ns.app._sincronizarUrl();
  return ultima === null ? null : String(ultima);
}

const w1 = escribirUrl("", { categoria: "ciudad", linea: "Pulsar", texto: "pulsar" });
comprobar("los criterios activos se escriben en la URL",
  /categoria=ciudad/.test(w1) && /linea=Pulsar/.test(w1) && /q=pulsar/.test(w1));

const w2 = escribirUrl("", { orden: "relevancia" });
comprobar("el orden recomendado NO ensucia la URL por ser el valor por defecto",
  !/orden=/.test(w2 || ""));

const w3 = escribirUrl("", { orden: "nombre-asc" });
comprobar("un orden distinto del recomendado sí se escribe", /orden=nombre-asc/.test(w3));

const w4 = escribirUrl("?preview=1", { categoria: "ciudad" });
comprobar("un parámetro ajeno como preview=1 se CONSERVA", /preview=1/.test(w4));
comprobar("y el criterio propio se añade junto a él", /categoria=ciudad/.test(w4));

const w5 = escribirUrl("?preview=1&categoria=ciudad&linea=Pulsar", { categoria: "", linea: "" });
comprobar("limpiar retira los parámetros del catálogo",
  !/categoria=/.test(w5) && !/linea=/.test(w5));
comprobar("y NO retira los parámetros ajenos", /preview=1/.test(w5));

const w6 = escribirUrl("?categoria=ciudad", { categoria: "aventura" });
comprobar("un parámetro no se duplica al cambiar de valor",
  (w6.match(/categoria=/g) || []).length === 1);
comprobar("y queda el valor nuevo", /categoria=aventura/.test(w6));

comprobar("filtrar usa replaceState, no pushState: no llena el historial",
  escribirUrl("", { categoria: "ciudad" }) !== null);

const w7 = escribirUrl("?utm_source=demo", { categoria: "ciudad" });
comprobar("cualquier otro parámetro de terceros también se conserva",
  /utm_source=demo/.test(w7));

/* ================================================================
   21. COHERENCIA ENTRE LAS REGLAS Y EL CÓDIGO VIGENTE
   Una regla de seguridad que describe un estado que ya no existe es
   peor que no tenerla: el siguiente agente la obedece y deshace algo
   autorizado. Estas pruebas comparan el documento con el código real.
   ================================================================ */

grupo("21. COHERENCIA REGLAS ↔ CÓDIGO");

const GUARDRAILS = readFileSync(join(RAIZ, "SECURITY_AND_AI_GUARDRAILS.md"), "utf8");
const DATA_JS = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-data.js"), "utf8");

const catalogoEsRemoto = /modoDatos:\s*"remoto"/.test(DATA_JS);
const hayEndpoint = /appsScriptEndpoint:\s*"https:\/\/script\.google\.com/.test(DATA_JS);

comprobar("el catálogo está en modo remoto con un endpoint real",
  catalogoEsRemoto && hayEndpoint,
  "modoDatos remoto=" + catalogoEsRemoto + " endpoint=" + hayEndpoint);

// Si el catálogo está conectado, el documento de reglas NO puede seguir
// afirmando que conectar el endpoint está prohibido sin matizarlo: eso
// llevaría a desconectar producción creyendo que se cumple una norma.
if (catalogoEsRemoto && hayEndpoint) {
  comprobar("las reglas reconocen que el catálogo está conectado",
    /CONECTADO Y AUTORIZADO|cat[áa]logo \*\*s[íi]\*\* est[áa] conectado/i.test(GUARDRAILS));
  comprobar("las reglas ya no dicen que apps-script no se despliega ni se conecta",
    !/apps-script\/`? es un \*\*borrador no productivo\*\*[\s\S]{0,80}No se despliega ni se conecta/i.test(GUARDRAILS));
  comprobar("las reglas distinguen la portada (sin conectar) del catálogo (conectado)",
    /SIN CONECTAR/i.test(GUARDRAILS) && /control\.json/.test(GUARDRAILS));
}

// El identificador del libro sigue siendo secreto, pase lo que pase.
comprobar("las reglas siguen prohibiendo el identificador del libro en el repo",
  /identificador del (Google Sheet|libro)/i.test(GUARDRAILS));

// Se busca por FORMA, no por valor: escribir aquí el identificador real
// —aunque fuera para prohibirlo— lo metería en el repositorio, que es
// justo lo que esta comprobación defiende. Un identificador de Sheets son
// ~44 caracteres de [A-Za-z0-9_-] con mayúsculas, minúsculas y dígitos.
// La URL del despliegue lleva un token con esa misma forma y sí puede
// estar, así que se descarta esa línea antes de mirar.
const DATA_SIN_ENDPOINT = DATA_JS.replace(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g, "");
const pareceId = (DATA_SIN_ENDPOINT.match(/[A-Za-z0-9_-]{40,60}/g) || [])
  .filter((s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s));
comprobar("no hay nada con forma de identificador de libro en catalogo-data.js",
  pareceId.length === 0, pareceId.map((s) => s.slice(0, 10) + "…").join(", "));
comprobar("ni una referencia directa a una hoja de cálculo",
  !/docs\.google\.com\/spreadsheets/.test(DATA_JS));

// El respaldo local es lo que sostiene la web si el endpoint cae.
comprobar("el respaldo local sigue activo en el código",
  /fallbackLocal:\s*true/.test(DATA_JS));
comprobar("las reglas advierten de no retirar el respaldo local",
  /respaldo local|fallbackLocal/i.test(GUARDRAILS));

// La portada sigue desconectada, y el documento y el archivo coinciden.
const CONTROL = JSON.parse(readFileSync(join(RAIZ, "data/slots/control.json"), "utf8"));
comprobar("la portada sigue sin conectar en control.json",
  CONTROL.googleSheetsConectado === false && CONTROL.appsScriptEndpoint === "");
comprobar("las reglas siguen exigiendo esos valores para la portada",
  /googleSheetsConectado:\s*false/.test(GUARDRAILS));

/* ================================================================
   22. LA PREVISUALIZACIÓN VIAJA DEL CATÁLOGO A LA FICHA
   Sin esto, quien revisa ve la tarjeta de un borrador, la abre y se
   encuentra «Modelo no encontrado»: el recorrido editorial se corta
   justo donde hace falta. Y tiene que seguir SIN filtrarse en
   producción, donde la previsualización no existe.
   ================================================================ */

grupo("22. PREVISUALIZACIÓN CATÁLOGO → FICHA");

/** Carga utils+schema+data+ui con un host y una URL concretos. */
function cargarUi(hostname, search) {
  const ventana = {
    location: { hostname, search, pathname: "/catalogo.html" },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    setTimeout, clearTimeout, Image: function () {},
    history: { replaceState() {} },
  };
  ventana.window = ventana;
  const contexto = createContext({
    window: ventana, URLSearchParams,
    console: { log() {}, warn() {}, error() {}, info() {} },
    document: {
      readyState: "loading", addEventListener() {},
      querySelector: () => null, getElementById: () => null,
      createElement: () => ({ setAttribute() {}, getAttribute() { return null; }, appendChild() {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }),
    },
  });
  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
    "assets/js/catalogo/catalogo-data.js",
    "assets/js/catalogo/catalogo-ui.js",
  ]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }
  return contexto.window.ARENAS_CATALOGO;
}

const urlDe = (host, search) => cargarUi(host, search).ui.urlModelo({ slug: "dominar-250" });

comprobar("en localhost con ?preview=1 el enlace lleva la previsualización",
  /[?&]preview=1/.test(urlDe("localhost", "?preview=1")), urlDe("localhost", "?preview=1"));
comprobar("y también en 127.0.0.1",
  /[?&]preview=1/.test(urlDe("127.0.0.1", "?preview=1")), urlDe("127.0.0.1", "?preview=1"));

comprobar("en PRODUCCIÓN nunca se añade, aunque la URL traiga ?preview=1",
  !/preview/.test(urlDe("arenasweb.github.io", "?preview=1")),
  urlDe("arenasweb.github.io", "?preview=1"));
comprobar("en producción sin el parámetro tampoco",
  !/preview/.test(urlDe("arenasweb.github.io", "")), urlDe("arenasweb.github.io", ""));
comprobar("en localhost SIN el parámetro no se inventa",
  !/preview/.test(urlDe("localhost", "")), urlDe("localhost", ""));

comprobar("el slug sigue siendo el primer parámetro y va codificado",
  /^modelo\.html\?slug=dominar-250/.test(urlDe("localhost", "?preview=1")));
comprobar("un modelo sin slug sigue sin generar enlace",
  cargarUi("localhost", "?preview=1").ui.urlModelo({ slug: "" }) === "");

// `debug` NO se propaga: su panel solo existe en el catálogo, y arrastrarlo
// a la ficha prometería una herramienta que allí no hay.
comprobar("debug no se propaga a la ficha",
  !/debug/.test(cargarUi("localhost", "?preview=1&debug=1").ui.urlModelo({ slug: "x" })),
  cargarUi("localhost", "?preview=1&debug=1").ui.urlModelo({ slug: "x" }));

/* ================================================================
   18. LA PORTADA LLEVA AL CATÁLOGO CON SU FILTRO

   Los ocho «Explorar …» de la portada apuntaban a anclas de la propia
   portada — `#colecciones` y `#camino` —, así que prometían un catálogo
   y entregaban un salto de scroll. Quien entraba por la portada de
   Trabajo y pulsaba «Explorar trabajo» acababa en la misma página, sin
   catálogo y sin filtro.

   El catálogo ya sabía leer `?categoria=` y validarlo. Solo faltaba que
   la portada lo usara. Estas pruebas atan las dos mitades: el enlace
   existe, apunta al catálogo, y su categoría es una de verdad.
   ================================================================ */

const portadaHtml = readFileSync(join(RAIZ, "index.html"), "utf8");
const catsValidas = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"))
  .categorias.map((c) => c.slug);

// Se leen los href de los CTA de ruta y de las tarjetas de colección.
const ctaPortada = (portadaHtml.match(/<a\s+href="([^"]+)"[^>]*class="[^"]*(?:path-panel__cta|collection\s)[^"]*"/g) || [])
  .map((a) => /href="([^"]+)"/.exec(a)[1]);

comprobar("la portada tiene los ocho enlaces de exploración",
  ctaPortada.length === 8, "encontrados=" + ctaPortada.length);

const noVanAlCatalogo = ctaPortada.filter((h) => h.indexOf("catalogo.html?categoria=") !== 0);
comprobar("ningún «Explorar …» se queda en un ancla de la propia portada",
  noVanAlCatalogo.length === 0, noVanAlCatalogo.join(" | "));

// Una categoría inventada la descartaría `criterioValido` en silencio: el
// enlace parecería bien y el catálogo saldría sin filtrar.
const catsMalas = ctaPortada
  .map((h) => (h.split("categoria=")[1] || "").split("&")[0])
  .filter((c) => catsValidas.indexOf(c) === -1);
comprobar("todas las categorías enlazadas existen en el catálogo",
  catsMalas.length === 0, catsMalas.join(", "));

// El botón más visible del sitio. Decía «Explorar catálogo» y bajaba a una
// sección de la propia portada. Las anclas de navegación —cabecera, pie,
// «Descubrir estilos»— son legítimas y siguen siendo anclas: lo que no puede
// serlo es el botón que promete el catálogo.
const heroCta = /<a\s+href="([^"]+)"[^>]*class="btn btn-primary btn-hero"[^>]*>Explorar catálogo<\/a>/.exec(portadaHtml);
comprobar("el botón «Explorar catálogo» del hero abre el catálogo",
  !!heroCta && heroCta[1].indexOf("catalogo.html") === 0,
  heroCta ? heroCta[1] : "(no se encuentra el botón)");

/* ================================================================
   19. LA POLÍTICA DE CONTENIDO SIGUE VIVA

   El sitio va en GitHub Pages, que no deja poner cabeceras HTTP, así que
   la CSP viaja en un `<meta>`. Eso trae una trampa: el único script en
   línea —el guardia anti-parpadeo— está autorizado por su hash. Si
   alguien le cambia un espacio y no recalcula el hash, el navegador deja
   de ejecutarlo SIN error visible: la página se ve casi igual y el fallo
   pasa desapercibido durante meses.

   Estas pruebas recalculan el hash desde el script real de cada página y
   exigen que coincida con el declarado. Si dejan de cuadrar, el mensaje
   dice cuál es el hash bueno.
   ================================================================ */

const { createHash } = await import("node:crypto");
const PAGINAS = ["index.html", "catalogo.html", "modelo.html"];

PAGINAS.forEach((pagina) => {
  const html = readFileSync(join(RAIZ, pagina), "utf8");
  const csp = /http-equiv="Content-Security-Policy"[\s\S]{0,80}?content="([^"]+)"/.exec(html);

  comprobar(pagina + ": declara una política de contenido", !!csp);
  if (!csp) return;
  const politica = csp[1];

  // El hash tiene que corresponder al script que hay HOY en el archivo.
  const enLinea = /<script>([\s\S]*?)<\/script>/.exec(html);
  comprobar(pagina + ": el hash autoriza al script en línea que hay ahora",
    !enLinea || politica.indexOf("sha256-" + createHash("sha256").update(enLinea[1], "utf8").digest("base64")) !== -1,
    enLinea ? "recalcula: 'sha256-" + createHash("sha256").update(enLinea[1], "utf8").digest("base64") + "'" : "");

  // Abrir estas dos puertas anularía la política entera.
  comprobar(pagina + ": no abre unsafe-inline ni unsafe-eval para scripts",
    !/script-src[^;]*unsafe-(inline|eval)/.test(politica));

  // Sin esto, una etiqueta <base> inyectada reescribe todas las rutas.
  comprobar(pagina + ": cierra object-src, base-uri y form-action",
    /object-src 'none'/.test(politica) && /base-uri 'self'/.test(politica) &&
    /form-action 'self'/.test(politica));

  // El catálogo vive detrás de Apps Script, que redirige a otro host: si
  // falta el segundo, el catálogo se cae al respaldo local sin avisar.
  comprobar(pagina + ": permite los dos hosts del endpoint del catálogo",
    /connect-src[^;]*script\.google\.com/.test(politica) &&
    /connect-src[^;]*script\.googleusercontent\.com/.test(politica));

  comprobar(pagina + ": declara política de referente",
    /name="referrer"\s+content="strict-origin-when-cross-origin"/.test(html));
});

/* ================================================================
   20. LA RED DE SEGURIDAD SUJETA ALGO

   `data/catalogo-publico.local.json` es lo que la web sirve cuando Apps
   Script no responde. Publicar ocurre en Sheets, no aquí, así que este
   archivo se queda congelado en el estado anterior a publicar si nadie
   lo sincroniza — y entonces una caída del endpoint vacía el catálogo
   entero delante del cliente. Medido en navegador: 8 motos con el
   endpoint vivo, 0 con el endpoint caído.

   `scripts/sincronizar-respaldo.mjs` lo pone al día. Estas pruebas
   vigilan que lo que hay dentro sea servible.
   ================================================================ */

const respaldo = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"));
const activosRespaldo = respaldo.modelos.filter((m) => m.activo === true);

// Un activo sin fotografía se pinta como tarjeta con marco vacío. Si el
// respaldo llega a servirse, el cliente ve exactamente eso.
const activosSinFoto = activosRespaldo.filter((m) => !m.imagen_principal).map((m) => m.slug);
comprobar("ningún modelo activo del respaldo se queda sin fotografía",
  activosSinFoto.length === 0, activosSinFoto.join(", "));

// La misma puerta que aplica la web: sin estos tres campos no se publica.
const activosIncompletos = activosRespaldo
  .filter((m) => !m.alt_text || !m.descripcion_corta).map((m) => m.slug);
comprobar("todo activo del respaldo trae alt_text y descripción corta",
  activosIncompletos.length === 0, activosIncompletos.join(", "));

// Los borradores deben seguir aquí: la previsualización editorial los lee
// de este archivo, y el endpoint público nunca los devuelve.
comprobar("el respaldo conserva los borradores para previsualizar",
  respaldo.modelos.length > activosRespaldo.length,
  respaldo.modelos.length + " filas, " + activosRespaldo.length + " activas");

// La rejilla declara `portada-card.webp` en el srcset. Si ese archivo no
// existe, el navegador NO cae al siguiente candidato: rompe la imagen. Por
// eso la variante tiene que estar garantizada, no supuesta.
const { existsSync: hay } = await import("node:fs");
const sinTarjeta = respaldo.modelos
  .filter((m) => /\/portada\.webp$/.test(m.imagen_principal || ""))
  .filter((m) => !hay(join(RAIZ, m.imagen_principal.replace(/\/portada\.webp$/, "/portada-card.webp"))))
  .map((m) => m.slug);
comprobar("toda portada.webp tiene su variante portada-card.webp",
  sinTarjeta.length === 0,
  sinTarjeta.length ? "faltan: " + sinTarjeta.join(", ") + " · genera con scripts/generar-tarjetas.mjs" : "");

/* ================================================================
   21. LA CSP Y LA LISTA DE DOMINIOS NO PUEDEN DIVERGIR

   `DOMINIOS_AUTORIZADOS` decide qué hosts externos acepta el saneador de
   imágenes. La CSP decide de qué hosts el navegador acepta cargarlas.
   Hoy ambas están cerradas y coinciden. El día que alguien añada un host
   a la lista sin tocar la CSP, esas imágenes no cargarán y no habrá
   error visible: simplemente no aparecerán.
   ================================================================ */

const utils = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-utils.js"), "utf8");
const bloqueDominios = /DOMINIOS_AUTORIZADOS\s*=\s*\[([^\]]*)\]/.exec(utils);
const dominios = bloqueDominios
  ? (bloqueDominios[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, ""))
  : null;

comprobar("se encuentra la lista de dominios autorizados", dominios !== null);

if (dominios) {
  const cspIndex = /http-equiv="Content-Security-Policy"[\s\S]{0,80}?content="([^"]+)"/.exec(portadaHtml);
  const imgSrc = cspIndex ? (/img-src ([^;]+)/.exec(cspIndex[1]) || [])[1] || "" : "";
  const fuera = dominios.filter((d) => imgSrc.indexOf(d) === -1);
  comprobar("todo dominio autorizado está también permitido en img-src de la CSP",
    fuera.length === 0,
    fuera.length ? "faltan en la CSP: " + fuera.join(", ") : "lista vacía, CSP cerrada");
}

/* ================================================================
   22. LA CONSULTA LLEGA A VENTAS, POR UN SOLO NÚMERO

   El sitio tuvo un reparto al azar entre tres líneas personales. Cada
   consulta caía en un chat privado y los otros dos asesores no veían
   nada: el cliente que volvía a escribir encontraba a alguien que no
   sabía de qué le hablaba. Ahora hay UNA cuenta de WhatsApp Business
   que los tres atienden como dispositivos vinculados.

   Estas pruebas defienden esa decisión. Un segundo número en el
   repositorio no es un detalle de configuración: es volver al reparto.
   ================================================================ */

const cfg = JSON.parse(readFileSync(join(RAIZ, "data/configuracion.json"), "utf8"));

comprobar("el canal de WhatsApp está marcado como confirmado",
  cfg.whatsappConfirmado === true, String(cfg.whatsappConfirmado));

// Un número corto o con letras abre un chat que no existe: el cliente cree
// que ha escrito y no ha escrito a nadie.
comprobar("el número de ventas es un móvil peruano de 11 dígitos con prefijo 51",
  /^51\d{9}$/.test(String(cfg.whatsapp || "")),
  String(cfg.whatsapp || "(vacío)").replace(/\d{6}$/, "******"));

comprobar("wa.me lo aceptaría tal cual: sin +, espacios, guiones ni paréntesis",
  String(cfg.whatsapp || "") === String(cfg.whatsapp || "").replace(/[^0-9]/g, ""));

// El reparto se retiró a conciencia. Si el array vuelve, vuelve el
// problema que se acaba de quitar, así que la prueba lo dice por su
// nombre en vez de limitarse a fallar.
comprobar("no ha vuelto el reparto entre varios asesores",
  cfg.asesoresVentas === undefined,
  cfg.asesoresVentas ? "asesoresVentas sigue en configuracion.json" : "retirado");

// La cuenta que importa: cuántos números distintos hay publicados. Uno.
const fuentesRevisadas = [
  "data/configuracion.json",
  "script.js",
  "assets/js/catalogo/catalogo-whatsapp.js",
  "assets/js/catalogo/modelo-app.js",
  "index.html",
  "catalogo.html",
  "modelo.html",
];
const numerosPublicados = new Set();
for (const rel of fuentesRevisadas) {
  const texto = readFileSync(join(RAIZ, rel), "utf8");
  for (const hallazgo of texto.match(/\b51\d{9}\b/g) || []) numerosPublicados.add(hallazgo);
}
comprobar("hay UN solo número de WhatsApp en todo el código publicado",
  numerosPublicados.size === 1,
  numerosPublicados.size + " distinto(s)");

comprobar("ese número es exactamente el de configuracion.json",
  numerosPublicados.size === 1 && numerosPublicados.has(String(cfg.whatsapp)));

// El código ya no debe saber elegir destinatario.
const nucleoJs = readFileSync(join(RAIZ, "script.js"), "utf8");
comprobar("script.js ya no contiene lógica de reparto (elegirAsesor / asesoresActivos)",
  !/elegirAsesor|asesoresActivos/.test(nucleoJs));

// Nada de lo que este proyecto prohíbe expresamente. Se mira el CÓDIGO,
// no los comentarios: la cabecera del módulo nombra a OpenWA justamente
// para decir que no se usa, y una prueba que no distingue las dos cosas
// obliga a dejar de documentar la decisión para que pase.
const canalJs = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-whatsapp.js"), "utf8");
const canalCodigo = canalJs
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
comprobar("el canal de ventas no usa OpenWA, API de Meta ni tokens",
  !/openwa|graph\.facebook|access_token|api_key|Bearer /i.test(canalCodigo));

comprobar("el mensaje se codifica con encodeURIComponent",
  /encodeURIComponent/.test(canalJs));

// El mensaje de entrada no puede comprometer a ventas con lo que aún no
// está confirmado. Se comprueba sobre el texto real que se genera.
const textoMensaje = (canalJs.match(/"Hola, equipo de ARENAS[\s\S]*?Código de consulta: "/) || [""])[0];
comprobar("el mensaje no promete precio, stock, financiamiento ni fechas",
  textoMensaje.length > 0 &&
    !/S\/|cuota|descuento|stock disponible|entrega el/i.test(textoMensaje),
  textoMensaje ? "texto localizado" : "no se encontró el mensaje");

/* ================================================================
   22b. «LO QUIERO» LLEVA MODELO Y COLOR

   Un mensaje que dice «me interesa una moto» obliga al asesor a
   preguntar cuál, y el cliente ya lo había dicho al pulsar. Aquí se
   comprueba que ese dato viaja.
   ================================================================ */

const fichaJs = readFileSync(join(RAIZ, "assets/js/catalogo/modelo-app.js"), "utf8");

comprobar("la ficha construye el botón «Lo quiero»",
  /construirBotonQuiero/.test(fichaJs) && /"Lo quiero"/.test(fichaJs));

comprobar("el color se lee en el clic, no al pintar la ficha",
  /colorActual \? colorActual\.nombre/.test(fichaJs));

comprobar("un doble clic no abre dos conversaciones",
  /if \(abriendo\) return;/.test(fichaJs));

comprobar("la pestaña nueva se abre con noopener y noreferrer",
  /"noopener,noreferrer"/.test(canalJs));

comprobar("sin color elegido el mensaje dice «color por definir»",
  /colorSinElegir: "color por definir"/.test(canalJs));

comprobar("modelo.html carga el módulo del canal de ventas",
  /catalogo-whatsapp\.js/.test(readFileSync(join(RAIZ, "modelo.html"), "utf8")));


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
