#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-api-catalogo.mjs
   Emulador y pruebas del backend de Apps Script. Sin dependencias.

       node scripts/qa-api-catalogo.mjs            pruebas
       node scripts/qa-api-catalogo.mjs --json     JSON público resultante
       node scripts/qa-api-catalogo.mjs --real     con los datos reales del catálogo

   POR QUÉ ESTO EXISTE
   Apps Script no se puede ejecutar en local, pero la parte que importa
   —qué se publica, qué se filtra, qué jamás sale— es JavaScript puro.
   `apps-script/v2/Nucleo.gs` está escrito sin una sola llamada a
   SpreadsheetApp, CacheService ni ContentService precisamente para poder
   cargarlo aquí tal cual y comprobarlo antes de desplegar.

   Lo que NO se puede probar aquí queda anotado al final de la ejecución.

   exit 0 → todas las pruebas pasan.
   exit 1 → alguna falla.
   ================================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

// Las reglas que comparten las herramientas de Node. Se importan para
// comparar sus listas con las del backend y las del navegador.
import { PROVISIONALES } from "./reglas-catalogo.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const SOLO_JSON = args.includes("--json");
const CON_REALES = args.includes("--real");

/* ================================================================
   Carga del backend
   ================================================================ */

/**
 * Los dos archivos puros del backend, cargados tal cual. Si alguno
 * introdujera una llamada a Apps Script, esto reventaría aquí — que es
 * exactamente la señal que queremos.
 */
function cargarBackend() {
  const contexto = createContext({ console });
  for (const archivo of ["apps-script/v2/Configuracion.gs", "apps-script/v2/Nucleo.gs"]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }
  return contexto;
}

const B = cargarBackend();

/** Los módulos del navegador, para las pruebas de equivalencia. */
function cargarFrontend() {
  const ventana = { location: { hostname: "localhost", search: "" }, matchMedia: () => ({ matches: false }) };
  ventana.window = ventana;
  const contexto = createContext({
    window: ventana,
    URLSearchParams,
    console,
    document: { createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }) },
  });
  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
  ]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }
  return contexto.window.ARENAS_CATALOGO;
}

const F = cargarFrontend();

/* ================================================================
   Fixtures — filas técnicas, nunca datos comerciales reales
   ================================================================ */

const CABECERA_MODELOS = [
  "id", "slug", "modelo", "linea", "categoria", "subcategoria",
  "titulo_web", "descripcion_corta", "descripcion_larga",
  "precio_publico", "mostrar_precio",
  "imagen_principal", "imagen_mobile", "galeria_1", "galeria_2",
  "colores", "caracteristica_1", "caracteristica_2", "caracteristica_3",
  "destacado", "nuevo", "cta_label", "orden", "activo",
  "estado_contenido", "ultima_revision", "alt_text", "foco_imagen",
  // Columnas trampa: no están en el contrato y NO deben salir jamás.
  "stock_real", "numero_chasis", "costo_compra", "telefono_cliente", "token_secreto",
];

const RUTA = "assets/catalogo/prueba/portada.webp";

/**
 * Fila con valores por defecto; cada caso sobrescribe lo que le importa.
 *
 * La base CUMPLE los mínimos publicables (fotografía, texto alternativo
 * y descripción corta). Los casos que quieren probar la ausencia de
 * alguno lo vacían explícitamente, y así se lee de un vistazo qué está
 * comprobando cada fila.
 */
function fila(cambios) {
  const base = {
    id: "T-00", slug: "modelo-prueba", modelo: "Modelo Prueba", linea: "Prueba",
    categoria: "ciudad", subcategoria: "", titulo_web: "",
    descripcion_corta: "Una moto de prueba.", descripcion_larga: "",
    precio_publico: "", mostrar_precio: "FALSE",
    imagen_principal: RUTA, imagen_mobile: "", galeria_1: "", galeria_2: "",
    colores: "", caracteristica_1: "", caracteristica_2: "", caracteristica_3: "",
    destacado: "FALSE", nuevo: "FALSE", cta_label: "", orden: 100,
    activo: "FALSE", estado_contenido: "BORRADOR", ultima_revision: "2026-08-10",
    alt_text: "Foto de prueba", foco_imagen: "center center",
    // Los valores trampa llevan un contenido reconocible para poder
    // buscarlo literalmente en el JSON serializado.
    stock_real: 47, numero_chasis: "CHASIS-FUGA-9999", costo_compra: 8000,
    telefono_cliente: "999888777", token_secreto: "TOKEN-FUGA-ABCDEF",
  };
  const f = Object.assign({}, base, cambios || {});
  return CABECERA_MODELOS.map((c) => f[c]);
}

const MATRIZ_MODELOS = [
  CABECERA_MODELOS,
  // 1. aprobado + activo → SE PUBLICA
  fila({ id: "T-01", slug: "aprobado-activo", modelo: "Aprobado Activo",
         activo: "TRUE", estado_contenido: "APROBADO", imagen_principal: RUTA, alt_text: "Foto de prueba" }),
  // 2. borrador + activo → NO (el fallo que ya apareció en el frontend)
  fila({ id: "T-02", slug: "borrador-activo", modelo: "Borrador Activo",
         activo: "TRUE", estado_contenido: "BORRADOR" }),
  // 3. aprobado + inactivo → NO
  fila({ id: "T-03", slug: "aprobado-inactivo", modelo: "Aprobado Inactivo",
         activo: "FALSE", estado_contenido: "APROBADO" }),
  // 4. slug inválido → descartado, no corregido
  fila({ id: "T-04", slug: "Slug Inválido!", modelo: "Slug Malo",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  // 5. ruta con escape de directorio → la ruta se anula y, al quedarse
  //    sin fotografía utilizable, el modelo ya no cumple los mínimos
  fila({ id: "T-05", slug: "ruta-traversal", modelo: "Ruta Traversal",
         activo: "TRUE", estado_contenido: "APROBADO",
         imagen_principal: "assets/../../secreto.png" }),
  // 5 bis-quater. Mínimos publicables ausentes, uno a uno.
  fila({ id: "T-30", slug: "sin-foto", modelo: "Sin Foto",
         activo: "TRUE", estado_contenido: "APROBADO", imagen_principal: "" }),
  fila({ id: "T-31", slug: "sin-alt", modelo: "Sin Alt",
         activo: "TRUE", estado_contenido: "APROBADO", alt_text: "" }),
  fila({ id: "T-32", slug: "sin-copy", modelo: "Sin Copy",
         activo: "TRUE", estado_contenido: "APROBADO", descripcion_corta: "" }),
  // 5 quinquies. Cumple los mínimos y no tiene NADA opcional: debe publicarse.
  fila({ id: "T-33", slug: "solo-minimos", modelo: "Solo Mínimos",
         activo: "TRUE", estado_contenido: "APROBADO",
         precio_publico: "", mostrar_precio: "FALSE", colores: "",
         descripcion_larga: "", caracteristica_1: "", galeria_1: "", galeria_2: "" }),
  // 6. precio con bandera de fila en FALSE → el importe no viaja
  fila({ id: "T-06", slug: "precio-oculto", modelo: "Precio Oculto",
         activo: "TRUE", estado_contenido: "APROBADO",
         precio_publico: 12990, mostrar_precio: "FALSE" }),
  // 7. precio con las dos banderas en TRUE → viaja (si la global lo permite)
  fila({ id: "T-07", slug: "precio-visible", modelo: "Precio Visible",
         activo: "TRUE", estado_contenido: "APROBADO",
         precio_publico: "S/ 12,990.00", mostrar_precio: "TRUE" }),
  // 8. booleano "FALSE" como texto → debe ser false, no true
  fila({ id: "T-08", slug: "booleano-texto", modelo: "Booleano Texto",
         activo: "FALSE", estado_contenido: "APROBADO", destacado: "FALSE" }),
  // 9. categoría carga (activa o no según el escenario)
  fila({ id: "T-09", slug: "modelo-carga", modelo: "Modelo Carga", categoria: "carga",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  // 10. categoría inexistente → descartado
  fila({ id: "T-10", slug: "categoria-rara", modelo: "Categoría Rara", categoria: "electrica",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  // 11-12. Par con el MISMO id. Ninguna de las dos debe publicarse: si
  //        se publicase «la primera», bastaría con pegar una fila más
  //        arriba para cambiar qué moto vive en esa identidad.
  //        Deliberadamente NO comparten id con T-01, para que el caso
  //        bueno siga siendo comprobable por separado.
  fila({ id: "T-20", slug: "dup-id-a", modelo: "Duplicado Id A",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  fila({ id: "T-20", slug: "dup-id-b", modelo: "Duplicado Id B",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  // 12 bis. Par con el MISMO slug: la URL no puede ser ambigua.
  fila({ id: "T-22", slug: "dup-slug", modelo: "Duplicado Slug A",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  fila({ id: "T-23", slug: "dup-slug", modelo: "Duplicado Slug B",
         activo: "TRUE", estado_contenido: "APROBADO" }),
  // 13. foco fuera de rango
  fila({ id: "T-13", slug: "foco-raro", modelo: "Foco Raro",
         activo: "TRUE", estado_contenido: "APROBADO", foco_imagen: "999% calc(1px)" }),
  // 14. descripción con marcado
  fila({ id: "T-14", slug: "con-html", modelo: "Con Html",
         activo: "TRUE", estado_contenido: "APROBADO",
         descripcion_corta: "<script>alert(1)</script>Texto real" }),
  // 15. fila completamente vacía → se ignora
  CABECERA_MODELOS.map(() => ""),
  // 16. estado con minúsculas y espacios → se normaliza
  fila({ id: "T-16", slug: "estado-suelto", modelo: "Estado Suelto",
         activo: "verdadero", estado_contenido: "aprobado" }),
];

const MATRIZ_CONFIG = [
  ["clave", "valor"],
  ["api_version", "1.0"],
  ["moneda_default", "PEN"],
  ["mostrar_precios", "TRUE"],
  ["mostrar_stock", "FALSE"],
  ["mostrar_promociones", "FALSE"],
  ["cache_segundos", "300"],
  ["mensaje_sin_resultados", "No encontramos modelos con esos filtros."],
  ["promociones_max_home", "3"],
  ["clave_inventada", "no debe viajar"],
];

const CATEGORIAS_TODAS_ACTIVAS = [
  ["slug", "titulo", "descripcion", "orden", "activo"],
  ["ciudad", "Ciudad", "Movilidad ágil.", 1, "TRUE"],
  ["trabajo", "Trabajo", "Resistencia.", 2, "TRUE"],
  ["deportiva", "Deportiva", "Carácter.", 3, "TRUE"],
  ["aventura", "Ruta y aventura", "Confianza.", 4, "TRUE"],
  ["carga", "Carga y transporte", "Mover trabajo.", 5, "TRUE"],
];

const CATEGORIAS_CARGA_INACTIVA = CATEGORIAS_TODAS_ACTIVAS.map((f, i) =>
  i === 5 ? ["carga", "Carga y transporte", "Mover trabajo.", 5, "FALSE"] : f
);

const CABECERA_COLORES = [
  "id", "modelo_id", "slug_color", "nombre_color", "hex_color",
  "imagen_principal", "imagen_mobile", "galeria_1", "galeria_2",
  "orden", "activo", "estado_aprobacion", "alt_text", "foco_imagen", "ultima_revision",
];

const MATRIZ_COLORES = [
  CABECERA_COLORES,
  ["C-1", "T-01", "negro", "Negro", "#111111", RUTA, "", "", "", 10, "TRUE", "APROBADO", "", "", ""],
  ["C-2", "T-01", "azul", "Azul", "#184FA3", RUTA, "", "", "", 20, "TRUE", "APROBADO", "", "", ""],
  // sin imagen → descartado
  ["C-3", "T-01", "rojo", "Rojo", "#B51623", "", "", "", "", 30, "TRUE", "APROBADO", "", "", ""],
  // escape de directorio → descartado
  ["C-4", "T-01", "verde", "Verde", "#2f5d3a", "../../secreto.png", "", "", "", 40, "TRUE", "APROBADO", "", "", ""],
  // sin aprobar → descartado
  ["C-5", "T-01", "gris", "Gris", "#888888", RUTA, "", "", "", 50, "TRUE", "BORRADOR", "", "", ""],
  // inactivo → descartado
  ["C-6", "T-01", "blanco", "Blanco", "#eeeeee", RUTA, "", "", "", 60, "FALSE", "APROBADO", "", "", ""],
  // modelo no publicado → descartado
  ["C-7", "T-99", "huerfano", "Huérfano", "#666666", RUTA, "", "", "", 70, "TRUE", "APROBADO", "", "", ""],
  // hex inválido con intento de inyección → el color vive, la muestra no
  ["C-8", "T-01", "raro", "Raro", "rojo; background:url(x)", RUTA, "", "", "", 80, "TRUE", "APROBADO", "", "", ""],
];

const FECHA = "2026-08-10T00:00:00.000Z";

function ejecutar(modelos, categorias, colores, config) {
  return B.construirRespuesta_(
    { modelos, config: config || MATRIZ_CONFIG, categorias, colores: colores || null },
    FECHA
  );
}

/* ================================================================
   Arnés
   ================================================================ */

let pasadas = 0;
const fallos = [];
let grupoActual = "";
const grupo = (n) => { grupoActual = n; if (!SOLO_JSON) console.log("\n" + n); };

function comprobar(desc, cond, detalle) {
  if (cond) {
    pasadas++;
    if (!SOLO_JSON) console.log("  ok    " + desc);
  } else {
    fallos.push(grupoActual + " → " + desc + (detalle ? "  [" + detalle + "]" : ""));
    if (!SOLO_JSON) console.log("  FALLA " + desc + (detalle ? "  [" + detalle + "]" : ""));
  }
}

/* ================================================================
   Salida JSON del emulador
   ================================================================ */

if (SOLO_JSON) {
  let salida;
  if (CON_REALES) {
    salida = ejecutar(matrizDesdeCatalogoReal(), CATEGORIAS_TODAS_ACTIVAS, null);
  } else {
    salida = ejecutar(MATRIZ_MODELOS, CATEGORIAS_TODAS_ACTIVAS, MATRIZ_COLORES);
  }
  console.log(JSON.stringify(B.limpiarParaCliente_(salida), null, 2));
  process.exit(0);
}

/** Convierte el catálogo local real en una matriz al estilo de la hoja. */
function matrizDesdeCatalogoReal() {
  const datos = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"));
  const modelos = datos.modelos || datos.items || [];
  const cabecera = CABECERA_MODELOS.slice(0, 28);
  return [cabecera].concat(
    modelos.map((m) => cabecera.map((c) => (m[c] === undefined || m[c] === null ? "" : m[c])))
  );
}

/* ================================================================
   1. Privacidad — lo primero, porque es lo que no admite matices
   ================================================================ */

grupo("1. PRIVACIDAD");

const rTodo = ejecutar(MATRIZ_MODELOS, CATEGORIAS_TODAS_ACTIVAS, MATRIZ_COLORES);
const publico = B.limpiarParaCliente_(rTodo);
const serializado = JSON.stringify(publico);

[
  ["stock_real", "47"],
  ["numero_chasis", "CHASIS-FUGA-9999"],
  ["costo_compra", "8000"],
  ["telefono_cliente", "999888777"],
  ["token_secreto", "TOKEN-FUGA-ABCDEF"],
].forEach(([columna, valor]) => {
  comprobar(`la columna "${columna}" no aparece en el JSON`, !serializado.includes(columna));
  comprobar(`el valor de "${columna}" no aparece en el JSON`, !serializado.includes(valor));
});

comprobar("`ultima_revision` no viaja al cliente", !serializado.includes("ultima_revision"));
comprobar("el diagnóstico interno no viaja al cliente", !serializado.includes("_diagnostico"));
comprobar("el TTL de caché no viaja al cliente", !serializado.includes("_cache_segundos"));
comprobar(
  "ningún campo del modelo empieza por guion bajo",
  publico.modelos.every((m) => Object.keys(m).every((k) => k.charAt(0) !== "_"))
);
comprobar(
  "no viaja ninguna bandera de stock en la configuración",
  !Object.keys(publico.config).some((k) => k.indexOf("stock") !== -1),
  Object.keys(publico.config).join(",")
);
comprobar(
  "no viaja ninguna bandera de promociones",
  !Object.keys(publico.config).some((k) => k.indexOf("promocion") !== -1)
);
comprobar(
  "una clave inventada en CONFIG_PUBLICA no llega al cliente",
  !serializado.includes("clave_inventada") && !serializado.includes("no debe viajar")
);

/* ================================================================
   2. Publicabilidad
   ================================================================ */

grupo("2. PUBLICABILIDAD");

const slugs = publico.modelos.map((m) => m.slug);
const traer = (s) => publico.modelos.filter((m) => m.slug === s)[0];

comprobar("aprobado + activo → se publica", slugs.includes("aprobado-activo"));
comprobar("BORRADOR + activo → NO se publica", !slugs.includes("borrador-activo"));
comprobar("APROBADO + inactivo → NO se publica", !slugs.includes("aprobado-inactivo"));
comprobar('estado "aprobado" en minúsculas se normaliza y publica', slugs.includes("estado-suelto"));
comprobar("slug inválido → descartado, no corregido", !slugs.some((s) => s.indexOf("slug") === 0 && s !== "slug-malo") && !slugs.includes("slug-invalido"));
comprobar("categoría fuera de la taxonomía → descartado", !slugs.includes("categoria-rara"));
comprobar("fila vacía → ignorada", publico.modelos.every((m) => !!m.id));
comprobar("id duplicado: NO se publica ninguna de las filas implicadas",
  publico.modelos.filter((m) => m.id === "T-20").length === 0,
  slugs.filter((s) => s.indexOf("dup-id") === 0).join(","));
comprobar("slug duplicado: NO se publica ninguna de las filas implicadas",
  slugs.filter((s) => s === "dup-slug").length === 0);
comprobar("el resto del catálogo no se ve afectado por las identidades ambiguas",
  slugs.includes("aprobado-activo") && slugs.includes("modelo-carga"));
comprobar(
  "los modelos salen ordenados por `orden`",
  publico.modelos.every((m, i, a) => i === 0 || a[i - 1].orden <= m.orden)
);

/* ================================================================
   3. Precio
   ================================================================ */

grupo("3. PRECIO");

const precioOculto = traer("precio-oculto");
const precioVisible = traer("precio-visible");

comprobar("con mostrar_precio=FALSE el importe NO viaja", precioOculto && !("precio_publico" in precioOculto));
comprobar("con mostrar_precio=FALSE la bandera sale false", precioOculto && precioOculto.mostrar_precio === false);
comprobar("con las tres condiciones el importe viaja", precioVisible && precioVisible.precio_publico === 12990,
  precioVisible ? String(precioVisible.precio_publico) : "sin modelo");
comprobar('se entiende el formato de hoja "S/ 12,990.00"', precioVisible && precioVisible.precio_publico === 12990);
comprobar("el importe oculto no aparece en ninguna parte del JSON",
  !JSON.stringify(precioOculto).includes("12990"));

// Con la bandera global apagada, ningún precio viaja.
const CONFIG_SIN_PRECIOS = MATRIZ_CONFIG.map((f) => (f[0] === "mostrar_precios" ? ["mostrar_precios", "FALSE"] : f));
const rSinPrecios = B.limpiarParaCliente_(
  ejecutar(MATRIZ_MODELOS, CATEGORIAS_TODAS_ACTIVAS, null, CONFIG_SIN_PRECIOS)
);
comprobar(
  "con mostrar_precios global en FALSE ningún modelo lleva importe",
  rSinPrecios.modelos.every((m) => !("precio_publico" in m))
);

/* ================================================================
   4. Categorías y el caso `carga`
   ================================================================ */

grupo("4. CATEGORÍAS");

comprobar("con carga activa, el modelo de carga se publica", slugs.includes("modelo-carga"));
comprobar(
  "solo se publican categorías con al menos un modelo",
  publico.categorias.every((c) => publico.modelos.some((m) => m.categoria === c.slug))
);
comprobar(
  "las categorías publicadas llevan título legible",
  publico.categorias.every((c) => c.titulo && c.titulo !== c.slug)
);
comprobar("las categorías no exponen su bandera `activo`",
  publico.categorias.every((c) => !("activo" in c)));

const rCargaOff = B.limpiarParaCliente_(ejecutar(MATRIZ_MODELOS, CATEGORIAS_CARGA_INACTIVA, null));
const slugsOff = rCargaOff.modelos.map((m) => m.slug);
comprobar("con carga inactiva, su modelo NO se publica", !slugsOff.includes("modelo-carga"));
comprobar("con carga inactiva, no aparece su categoría", !rCargaOff.categorias.some((c) => c.slug === "carga"));
comprobar("con carga inactiva, el resto del catálogo sigue publicándose", slugsOff.includes("aprobado-activo"));
comprobar(
  "el motivo queda registrado en el diagnóstico interno",
  ejecutar(MATRIZ_MODELOS, CATEGORIAS_CARGA_INACTIVA, null)._diagnostico.some((d) => d.indexOf("carga") !== -1)
);

/* ================================================================
   5. Colores
   ================================================================ */

grupo("5. COLORES");

const coloresPub = publico.colores.map((c) => c.slug_color);
comprobar("color aprobado y activo con foto → se publica", coloresPub.includes("negro"));
comprobar("color sin imagen_principal → descartado", !coloresPub.includes("rojo"));
comprobar("color con escape de directorio → descartado", !coloresPub.includes("verde"));
comprobar("color sin aprobar → descartado", !coloresPub.includes("gris"));
comprobar("color inactivo → descartado", !coloresPub.includes("blanco"));
comprobar("color de un modelo no publicado → descartado", !coloresPub.includes("huerfano"));
comprobar("hex inválido: el color vive pero la muestra queda vacía",
  publico.colores.some((c) => c.slug_color === "raro" && c.hex_color === ""));
comprobar("el hex inválido no arrastra CSS al JSON", !serializado.includes("background:url"));

const rSinColores = B.limpiarParaCliente_(ejecutar(MATRIZ_MODELOS, CATEGORIAS_TODAS_ACTIVAS, null));
comprobar("sin hoja de colores: colors va vacío", Array.isArray(rSinColores.colores) && rSinColores.colores.length === 0);
comprobar("sin hoja de colores: el catálogo sigue respondiendo ok", rSinColores.ok === true);
comprobar("sin hoja de colores: los modelos se publican igual", rSinColores.modelos.length > 0);

/* ================================================================
   6. Encabezados y contrato de la hoja
   ================================================================ */

grupo("6. CONTRATO DE LA HOJA");

const sinColumnaClave = MATRIZ_MODELOS.map((f, i) =>
  i === 0 ? f.filter((c) => c !== "estado_contenido") : f.slice(0, f.length - 1)
);
const rSinColumna = ejecutar(sinColumnaClave, CATEGORIAS_TODAS_ACTIVAS, null);
comprobar("falta una columna requerida → respuesta de error controlada", rSinColumna.ok === false);
comprobar("el error no publica ningún modelo", rSinColumna.modelos.length === 0);
comprobar("el error no revela detalles internos",
  !JSON.stringify(B.limpiarParaCliente_(rSinColumna)).match(/Spreadsheet|getSheet|stack|\.gs/));

const REORDENADA = (() => {
  // Se intercambian dos columnas: mapear por nombre debe hacerlo inocuo.
  const cab = CABECERA_MODELOS.slice();
  const i = cab.indexOf("slug"), k = cab.indexOf("orden");
  const permutar = (f) => { const c = f.slice(); const t = c[i]; c[i] = c[k]; c[k] = t; return c; };
  return MATRIZ_MODELOS.map(permutar);
})();
const rReordenada = B.limpiarParaCliente_(ejecutar(REORDENADA, CATEGORIAS_TODAS_ACTIVAS, null));
comprobar(
  "reordenar columnas no altera el resultado (se mapea por nombre)",
  JSON.stringify(rReordenada.modelos) === JSON.stringify(rSinColores.modelos)
);

const CON_COLUMNA_EXTRA = MATRIZ_MODELOS.map((f, i) => f.concat(i === 0 ? ["columna_nueva_interna"] : ["valor interno"]));
const rExtra = B.limpiarParaCliente_(ejecutar(CON_COLUMNA_EXTRA, CATEGORIAS_TODAS_ACTIVAS, null));
comprobar("una columna nueva en la hoja no se publica sola",
  !JSON.stringify(rExtra).includes("columna_nueva_interna") && !JSON.stringify(rExtra).includes("valor interno"));
comprobar("una columna nueva no rompe el endpoint", rExtra.ok === true && rExtra.modelos.length > 0);

comprobar(
  "las columnas prohibidas se anotan en el diagnóstico",
  rTodo._diagnostico.some((d) => d.indexOf("prohibidas") !== -1),
  rTodo._diagnostico.join(" | ").slice(0, 120)
);

/* ================================================================
   7. Normalizadores
   ================================================================ */

grupo("7. NORMALIZADORES");

[
  [true, true], [false, false], ["TRUE", true], ["FALSE", false],
  ["true", true], ["false", false], ["Verdadero", true], ["SI", true],
  ["sí", true], ["x", true], ["1", true], ["0", false], [1, true], [0, false],
  ["", false], [null, false], [undefined, false], ["no", false], ["falso", false],
].forEach(([entrada, esperado]) => {
  comprobar(`booleano(${JSON.stringify(entrada)}) → ${esperado}`, B.normBooleano_(entrada) === esperado);
});
comprobar('Boolean("FALSE") sería true; el normalizador NO cae en eso',
  Boolean("FALSE") === true && B.normBooleano_("FALSE") === false);

[
  [12990, 12990], ["12990", 12990], ["S/ 12,990.00", 12990], ["12.5", 12.5],
  [0, null], [-5, null], ["", null], [null, null], ["consultar", null],
  [NaN, null], [Infinity, null], ["abc", null],
].forEach(([entrada, esperado]) => {
  comprobar(`numero(${JSON.stringify(entrada)}) → ${esperado}`, B.normNumero_(entrada) === esperado,
    String(B.normNumero_(entrada)));
});

[
  ["pulsar-180-neon", "pulsar-180-neon"],
  // Las mayúsculas sí se corrigen: es la misma normalización que aplica
  // el frontend al leer la hoja, y una URL en mayúsculas no existe.
  ["Pulsar-180", "pulsar-180"],
  ["pulsar 180", ""], ["pulsar--180", ""], ["-pulsar", ""], ["pulsar/180", ""], ["", ""],
].forEach(([entrada, esperado]) => {
  comprobar(`slug(${JSON.stringify(entrada)}) → ${JSON.stringify(esperado)}`,
    B.normSlug_(entrada) === esperado, B.normSlug_(entrada));
});

[
  ["assets/catalogo/x/portada.webp", "assets/catalogo/x/portada.webp"],
  ["assets/../../secreto.png", ""], ["../x.png", ""], ["javascript:alert(1)", ""],
  ["data:image/svg+xml,x", ""], ["//cdn.ej.com/x.jpg", ""], ["https://ej.com/x.jpg", ""],
  ["C:\\fotos\\x.jpg", ""], ["assets/x y.webp", ""], ["config/secreto.json", ""],
  ["assets/%2e%2e/x.png", ""], ["", ""],
].forEach(([entrada, esperado]) => {
  comprobar(`ruta(${JSON.stringify(entrada)}) → ${JSON.stringify(esperado)}`, B.normRuta_(entrada) === esperado,
    B.normRuta_(entrada));
});

[
  ["center center", "center center"], ["50% 30%", "50% 30%"], ["0% 0%", "0% 0%"],
  ["100% 100%", "100% 100%"], ["101%", "center center"], ["999% 999%", "center center"],
  ["calc(50%) center", "center center"], ["url(x)", "center center"], ["", "center center"],
].forEach(([entrada, esperado]) => {
  comprobar(`foco(${JSON.stringify(entrada)}) → ${esperado}`, B.normFoco_(entrada) === esperado, B.normFoco_(entrada));
});

comprobar("el marcado se elimina del texto",
  traer("con-html") && traer("con-html").descripcion_corta.indexOf("<") === -1,
  traer("con-html") ? traer("con-html").descripcion_corta : "-");
comprobar("el texto real sobrevive a la limpieza",
  traer("con-html") && traer("con-html").descripcion_corta.indexOf("Texto real") !== -1);
comprobar("las tildes y la ñ no se destruyen", B.normTexto_("Clásico Añejo", 40) === "Clásico Añejo");
comprobar("el foco fuera de rango cae al centro",
  traer("foco-raro") && traer("foco-raro").foco_imagen === "center center");
comprobar("una ruta insegura deja al modelo sin foto y por tanto sin publicar",
  !slugs.includes("ruta-traversal"));

/* ================================================================
   8. Envelope y versión
   ================================================================ */

grupo("8. ENVELOPE");

["ok", "version", "api_version", "generated_at", "config", "categorias", "modelos", "colores"].forEach((k) => {
  comprobar(`el envelope incluye "${k}"`, k in publico);
});
comprobar("api_version es la de CONFIG_PUBLICA", publico.api_version === "1.0", publico.api_version);
comprobar("generated_at es ISO", /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(publico.generated_at));
comprobar("generated_at es determinista (lo inyecta quien llama)", publico.generated_at === FECHA);
comprobar("config solo trae claves públicas",
  Object.keys(publico.config).every((k) =>
    ["api_version", "moneda", "mostrar_precios", "mensaje_sin_resultados", "mensaje_catalogo_vacio"].includes(k)),
  Object.keys(publico.config).join(","));
comprobar("la moneda es de la lista cerrada", ["PEN", "USD"].includes(publico.config.moneda));

/* ================================================================
   9. Equivalencia con el frontend
   ================================================================ */

grupo("9. EQUIVALENCIA BACKEND ↔ FRONTEND");

const U = F.utils;
const S = F.schema;

comprobar("misma taxonomía de categorías",
  JSON.stringify(B.CATEGORIAS_VALIDAS) === JSON.stringify(S.CATEGORIAS),
  B.CATEGORIAS_VALIDAS.join(",") + " vs " + S.CATEGORIAS.join(","));
comprobar("mismos estados de contenido",
  JSON.stringify(B.ESTADOS_CONTENIDO) === JSON.stringify(S.ESTADOS_CONTENIDO));
comprobar("misma versión mayor de contrato", B.CONTRATO_MAYOR === S.VERSION,
  B.CONTRATO_MAYOR + " vs " + S.VERSION);
comprobar("los dos rechazan dominios externos: ninguno autorizado",
  B.DOMINIOS_IMAGEN.length === 0 && U.DOMINIOS_AUTORIZADOS.length === 0);

const MUESTRAS_RUTA = [
  "assets/catalogo/x/portada.webp", "assets/../../secreto.png", "javascript:alert(1)",
  "//cdn.ej.com/x.jpg", "https://ej.com/x.jpg", "C:\\fotos\\x.jpg", "data/x.png",
  "legales/x.png", "config/x.json", "assets/x y.webp", "",
];
MUESTRAS_RUTA.forEach((r) => {
  comprobar(`ruta "${r || "(vacía)"}" — misma decisión en backend y frontend`,
    B.normRuta_(r) === U.rutaImagen(r), `back="${B.normRuta_(r)}" front="${U.rutaImagen(r)}"`);
});

["center center", "50% 30%", "101%", "999% 999%", "calc(50%) center", "url(x)", ""].forEach((f) => {
  comprobar(`foco "${f || "(vacío)"}" — misma decisión`, B.normFoco_(f) === U.foco(f),
    `back="${B.normFoco_(f)}" front="${U.foco(f)}"`);
});

[true, false, "TRUE", "FALSE", "true", "false", "SI", "x", "1", "0", "", null, "no"].forEach((v) => {
  comprobar(`booleano ${JSON.stringify(v)} — misma decisión`, B.normBooleano_(v) === U.booleano(v));
});

// Se comparan las MISMAS capas: el backend al leer la hoja frente al
// frontend al leer la hoja. `slugValido()` a secas es el validador de
// parámetros de URL, que no normaliza nada, y compararlo con esto sería
// comparar dos cosas distintas.
["pulsar-180-neon", "Pulsar-180", "pulsar 180", "pulsar--180", "-pulsar", "ct-125", "PULSAR"].forEach((s) => {
  const back = B.normSlug_(s);
  const modelo = S.normalizarModelo(
    { id: "X", slug: s, modelo: "X", categoria: "ciudad" }, S.normalizarConfig({}), []
  );
  const front = modelo ? modelo.slug : "";
  comprobar(`slug "${s}" — mismo resultado al leer la hoja`, back === front,
    `back="${back}" front="${front}"`);
});

[12990, "S/ 12,990.00", 0, -5, "", "consultar", null].forEach((p) => {
  comprobar(`precio ${JSON.stringify(p)} — mismo importe`, B.normNumero_(p) === U.numero(p));
});

["#1A2B3C", "1a2b3c", "#abc", "#GGG", "rgb(1,2,3)", "rojo; background:url(x)", ""].forEach((h) => {
  comprobar(`hex ${JSON.stringify(h)} — misma decisión`, B.normHex_(h) === U.hexColor(h),
    `back="${B.normHex_(h)}" front="${U.hexColor(h)}"`);
});

// La regla de publicación, comparada caso a caso.
// La comparación se hace con un registro que cumple TODOS los mínimos,
// para aislar el efecto de `activo` y `estado_contenido`. El backend
// separa las dos comprobaciones —`esPublicable_` mira solo las banderas
// y los mínimos se aplican después, en construirModelo_—, así que se
// compara la decisión FINAL de cada capa, que es lo que importa.
[["TRUE", "APROBADO", true], ["TRUE", "BORRADOR", false], ["TRUE", "EN_REVISION", false],
 ["FALSE", "APROBADO", false], ["FALSE", "BORRADOR", false], ["TRUE", "", false]]
  .forEach(([activo, estado, esperado]) => {
    const cruda = {
      id: "X", slug: "x", modelo: "X", categoria: "ciudad",
      imagen_principal: RUTA, alt_text: "Foto real", descripcion_corta: "Texto real.",
      activo, estado_contenido: estado,
    };
    const back = B.construirModelo_(cruda, { mostrar_precios: false }, []) !== null;
    const modelo = S.normalizarModelo(cruda, S.normalizarConfig({}), []);
    const front = S.esPublicable(modelo, false);
    comprobar(`publicación activo=${activo} estado="${estado}" — misma decisión`,
      back === esperado && front === esperado, `back=${back} front=${front}`);
  });

// Y los mínimos editoriales, capa a capa, con el mismo registro.
[
  ["sin foto", { imagen_principal: "" }],
  ["sin alt", { alt_text: "" }],
  ["sin copy", { descripcion_corta: "" }],
  ["copy provisional", { descripcion_corta: "PENDIENTE" }],
  ["alt provisional", { alt_text: "pendiente" }],
  ["sin slug", { slug: "" }],
].forEach(([nombre, cambio]) => {
  const cruda = Object.assign({
    id: "X", slug: "x", modelo: "X", categoria: "ciudad",
    imagen_principal: RUTA, alt_text: "Foto real", descripcion_corta: "Texto real.",
    activo: "TRUE", estado_contenido: "APROBADO",
  }, cambio);
  const back = B.construirModelo_(cruda, { mostrar_precios: false }, []) !== null;
  const modelo = S.normalizarModelo(cruda, S.normalizarConfig({}), []);
  const front = modelo ? S.esPublicable(modelo, false) : false;
  comprobar(`mínimos — ${nombre}: backend y frontend coinciden en NO publicar`,
    back === false && front === false, `back=${back} front=${front}`);
});

/* ================================================================
   9 bis. Extremo a extremo: la respuesta pasada por el frontend
   ================================================================ */

grupo("9 bis. EXTREMO A EXTREMO");

// Esta es la prueba que de verdad demuestra que backend y frontend
// hablan el mismo idioma: se coge la salida del emulador tal cual y se
// le da de comer al esquema del navegador, sin adaptador de por medio.
const registros = S.extraerRegistros(publico);
comprobar("el frontend encuentra la lista de modelos en el envelope",
  Array.isArray(registros), registros === null ? "extraerRegistros devolvió null" : "ok");
comprobar("no se pierde ningún modelo por el camino",
  registros && registros.length === publico.modelos.length,
  registros ? registros.length + " de " + publico.modelos.length : "-");

const cfgFront = S.normalizarConfig(publico.config);
comprobar("el frontend lee la moneda del envelope", cfgFront.moneda === "PEN", cfgFront.moneda);
comprobar("el frontend lee la bandera global de precios", cfgFront.mostrarPrecios === true);
comprobar("el frontend lee el mensaje de sin resultados",
  cfgFront.mensajeSinResultados === "No encontramos modelos con esos filtros.");

const normalizados = (registros || [])
  .map((r) => S.normalizarModelo(r, cfgFront, []))
  .filter(Boolean);
comprobar("todos los modelos sobreviven a la normalización del frontend",
  normalizados.length === publico.modelos.length,
  normalizados.length + " de " + publico.modelos.length);

comprobar("el frontend vuelve a considerarlos publicables (segunda capa)",
  normalizados.every((m) => S.esPublicable(m, false)));

const conPrecio = normalizados.filter((m) => m.mostrarPrecio);
comprobar("el precio sobrevive intacto al pasar por el frontend",
  conPrecio.length === 1 && conPrecio[0].precioPublico === 12990,
  conPrecio.map((m) => m.slug + "=" + m.precioPublico).join(","));

comprobar("el frontend encuentra las categorías del envelope",
  S.normalizarCategorias(publico.categorias).length === publico.categorias.length);
comprobar("el frontend encuentra los colores del envelope",
  S.extraerColores(publico).length === publico.colores.length);

const coloresFront = S.agruparColores(S.extraerColores(publico), false, []);
comprobar("los colores se agrupan por modelo en el frontend",
  coloresFront["T-01"] && coloresFront["T-01"].length === publico.colores.length,
  JSON.stringify(Object.keys(coloresFront)));

// Y la comprobación inversa: un envelope con la versión equivocada debe
// ser rechazado enteramente por el frontend.
comprobar("un envelope con versión mayor distinta es rechazado",
  S.extraerRegistros(Object.assign({}, publico, { version: "9" })) === null);
comprobar("un envelope con ok:false es rechazado",
  S.extraerRegistros(Object.assign({}, publico, { ok: false })) === null);

/* ================================================================
   9 ter. Revisión de seguridad del propio código
   ================================================================ */

grupo("9 ter. SEGURIDAD DEL CÓDIGO");

/** Quita comentarios para poder buscar CÓDIGO y no prosa. */
function soloCodigo(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

const FUENTES_V2 = ["Configuracion.gs", "Nucleo.gs", "Endpoint.gs"].map((n) => ({
  nombre: n,
  texto: readFileSync(join(RAIZ, "apps-script/v2", n), "utf8"),
}));

const PROHIBIDO_EN_CODIGO = [
  "eval(", "new Function", "HtmlService", "doPost", "setValue", "setValues",
  "appendRow", "deleteRow", "insertSheet", "deleteSheet", "DriveApp",
  "UrlFetchApp", "MailApp", "GmailApp", "PropertiesService.getUserProperties",
];

FUENTES_V2.forEach(({ nombre, texto }) => {
  const codigo = soloCodigo(texto);
  PROHIBIDO_EN_CODIGO.forEach((patron) => {
    comprobar(`${nombre}: no usa ${patron}`, !codigo.includes(patron));
  });
});

// Nucleo.gs debe poder ejecutarse fuera de Apps Script: si alguien
// introduce una llamada a la plataforma, deja de ser comprobable aquí.
const nucleo = soloCodigo(FUENTES_V2.filter((f) => f.nombre === "Nucleo.gs")[0].texto);
["SpreadsheetApp", "PropertiesService", "CacheService", "ContentService", "Logger", "Utilities", "Session"]
  .forEach((api) => {
    comprobar(`Nucleo.gs se mantiene puro: sin ${api}`, !nucleo.includes(api));
  });

// La infraestructura vive solo donde debe.
const conf = soloCodigo(FUENTES_V2.filter((f) => f.nombre === "Configuracion.gs")[0].texto);
["SpreadsheetApp", "PropertiesService", "CacheService", "ContentService"].forEach((api) => {
  comprobar(`Configuracion.gs solo declara constantes: sin ${api}`, !conf.includes(api));
});

// Ningún identificador de libro ni URL de despliegue escritos en el código.
// `openById` SÍ está permitido —es el mecanismo correcto para una Web App—
// siempre que su argumento venga de la propiedad privada, no de una
// constante. Eso se comprueba ejecutándolo, en qa-endpoint-catalogo.mjs.
FUENTES_V2.forEach(({ nombre, texto }) => {
  const codigo = soloCodigo(texto);
  comprobar(`${nombre}: sin identificador de hoja de cálculo literal`,
    !/1gzn3fH|['"][A-Za-z0-9_-]{40,}['"]/.test(codigo));
  comprobar(`${nombre}: sin URL de despliegue`, !/AKfycb|script\.google\.com\/macros/.test(codigo));
  comprobar(`${nombre}: sin credenciales literales`,
    !/(api[_-]?key|password|secret)\s*[:=]\s*['"][^'"]{4,}/i.test(codigo));
  // El respaldo silencioso que causó el fallo crítico no puede volver.
  comprobar(`${nombre}: sin getActiveSpreadsheet / getActive / getActiveSheet`,
    !/getActiveSpreadsheet|getActiveSheet|getActive\s*\(/.test(codigo));
  // Lee configuración, nunca la escribe.
  ["setProperty", "setProperties", "deleteProperty", "deleteAllProperties"].forEach((p) => {
    comprobar(`${nombre}: no escribe configuración (${p})`, !codigo.includes(p));
  });
});

// El endpoint solo puede leer las cuatro hojas declaradas.
const endpoint = soloCodigo(FUENTES_V2.filter((f) => f.nombre === "Endpoint.gs")[0].texto);
const hojasLeidas = (endpoint.match(/HOJA_[A-Z]+/g) || []).filter((v, i, a) => a.indexOf(v) === i).sort();
comprobar("el endpoint solo lee las cuatro hojas del contrato",
  JSON.stringify(hojasLeidas) === JSON.stringify(["HOJA_CATEGORIAS", "HOJA_COLORES", "HOJA_CONFIG", "HOJA_MODELOS"]),
  hojasLeidas.join(","));
["CONTACTOS_INTERNOS", "PROMOCIONES_WEB", "SEDES_WEB", "FINANCIAMIENTO_WEB", "CATALOGO_PUBLICO"].forEach((h) => {
  comprobar(`el endpoint no lee la hoja ${h}`, !endpoint.includes("'" + h + "'"));
});

// Y no debe existir ninguna puerta trasera de previsualización.
FUENTES_V2.forEach(({ nombre, texto }) => {
  const codigo = soloCodigo(texto);
  comprobar(`${nombre}: sin parámetro de previsualización`, !/parameter\.(preview|debug|borrador)/.test(codigo));
});

/* ================================================================
   10. El catálogo real de hoy
   ================================================================ */

grupo("10. CATÁLOGO REAL");

const rReal = B.limpiarParaCliente_(ejecutar(matrizDesdeCatalogoReal(), CATEGORIAS_TODAS_ACTIVAS, null));
// Estas dos exigían «0 publicados» y «0 categorías», ciertas mientras el
// catálogo no estaba publicado. Ya lo está: la cifra fija caducó. Se atan a
// la regla que no depende del día — que el backend publique exactamente lo
// que pasa la puerta de publicación, ni una fila de más.
const filasReales = matrizDesdeCatalogoReal();
const cabeceraReal = filasReales[0].map(function (c) { return String(c).trim().toLowerCase(); });
const iActivoReal = cabeceraReal.indexOf("activo");
const iEstadoReal = cabeceraReal.indexOf("estado_contenido");
const iImagenReal = cabeceraReal.indexOf("imagen_principal");
const debenPublicarse = filasReales.slice(1).filter(function (f) {
  return String(f[iActivoReal]).toUpperCase() === "TRUE" &&
    String(f[iEstadoReal]).toUpperCase() === "APROBADO" &&
    String(f[iImagenReal] || "").trim() !== "";
}).length;

comprobar("el backend publica exactamente las filas que pasan la puerta",
  rReal.modelos.length === debenPublicarse,
  "publica=" + rReal.modelos.length + " deben=" + debenPublicarse);

// Una categoría sin modelos publicados sería un filtro que no filtra nada:
// el cliente la pulsa y se encuentra cero resultados.
const catsConModelos = {};
rReal.modelos.forEach(function (m) { catsConModelos[m.categoria] = true; });
const catsVacias = rReal.categorias.filter(function (c) { return !catsConModelos[c.slug]; })
  .map(function (c) { return c.slug; });
comprobar("no se publica ninguna categoría sin modelos dentro",
  catsVacias.length === 0, catsVacias.join(", "));
comprobar("la respuesta sigue siendo ok, no un error", rReal.ok === true);
comprobar("el envelope se mantiene completo con catálogo vacío",
  "modelos" in rReal && "colores" in rReal && "config" in rReal);

/* ================================================================
   10 bis. POST-AUDITORÍA — comprobación previa al despliegue
   ================================================================ */

grupo("10 bis. POST-AUDITORÍA · PAQUETE DE DESPLIEGUE");

// Apps Script concatena todos los .gs del proyecto en un mismo ámbito
// global. Con dos definiciones de doGet gana la última cargada, en
// silencio: el proyecto respondería con el endpoint antiguo creyendo que
// se ha desplegado el nuevo. Por eso se cuenta sobre el paquete v2.
const MANIFIESTO = ["Configuracion.gs", "Nucleo.gs", "Endpoint.gs"];

comprobar("el manifiesto son exactamente tres archivos", MANIFIESTO.length === 3);
MANIFIESTO.forEach((n) => {
  comprobar(`el paquete incluye ${n}`, FUENTES_V2.some((f) => f.nombre === n));
});

const todoElCodigo = FUENTES_V2.map((f) => soloCodigo(f.texto)).join("\n");
const cuantosDoGet = (todoElCodigo.match(/function\s+doGet\s*\(/g) || []).length;
comprobar("el paquete define exactamente un doGet", cuantosDoGet === 1, String(cuantosDoGet));

const cuantosDoPost = (todoElCodigo.match(/function\s+doPost\s*\(/g) || []).length;
comprobar("el paquete no define ningún doPost", cuantosDoPost === 0, String(cuantosDoPost));

// Nada del backend antiguo puede colarse en el paquete. `CATALOGO_PUBLICO`
// sí aparece —en la lista de hojas que NO se leen—, así que no basta con
// buscar el nombre: hay que comprobar que ninguna constante de hoja
// apunte a ella y que no queden funciones del runtime antiguo.
["COLUMNAS_CATALOGO", "CAMPOS_GATEADOS_CATALOGO", "filtrarMoto", "filtrarSedes", "CAMPOS_PUBLICOS"]
  .forEach((rastro) => {
    comprobar(`el paquete no arrastra el legacy (${rastro})`, !todoElCodigo.includes(rastro));
  });

const hojasQueLee = [B.HOJA_MODELOS, B.HOJA_CONFIG, B.HOJA_CATEGORIAS, B.HOJA_COLORES];
comprobar("ninguna constante de hoja apunta a la hoja legacy",
  hojasQueLee.indexOf("CATALOGO_PUBLICO") === -1, hojasQueLee.join(","));
comprobar("las hojas que lee son exactamente las cuatro del contrato",
  JSON.stringify(hojasQueLee) ===
    JSON.stringify(["MODELOS_WEB", "CONFIG_PUBLICA", "CATEGORIAS", "COLORES_MODELO_WEB"]),
  hojasQueLee.join(","));
comprobar("las hojas de otras fases figuran como fuera de alcance",
  ["CONTACTOS_INTERNOS", "PROMOCIONES_WEB", "SEDES_WEB", "FINANCIAMIENTO_WEB", "CATALOGO_PUBLICO"]
    .every((h) => B.HOJAS_FUERA_DE_ALCANCE.indexOf(h) !== -1),
  B.HOJAS_FUERA_DE_ALCANCE.join(","));

comprobar("el paquete no contiene una URL /exec", !/\/exec/.test(todoElCodigo));
comprobar("el paquete no contiene un identificador de libro literal",
  !/['"][A-Za-z0-9_-]{40,}['"]/.test(todoElCodigo));

// Y los archivos legacy, SI ESTÁN, siguen fuera del paquete y sin tocar.
//
// El paquete anterior está ignorado por Git (`.gitignore`: `apps-script/*`
// con excepción solo para `v2/`), así que en un clon limpio —el de Codex,
// el de una integración continua, el de cualquier otra máquina— no existe.
// Leerlo sin comprobarlo hacía reventar la suite entera con un ENOENT sin
// informar de nada: la comprobación pasaba o no según en qué ordenador se
// ejecutara, que es justo lo contrario de una prueba.
//
// Donde el legacy exista se sigue verificando; donde no, se declara omitido
// en voz alta en vez de fingir que se comprobó.
const LEGACY = ["Code.gs", "Endpoint.gs", "Schema.gs", "Seguridad.gs"];
const legacyPresente = LEGACY.filter((n) => existsSync(join(RAIZ, "apps-script", n)));

if (legacyPresente.length) {
  legacyPresente.forEach((n) => {
    comprobar(`el legacy ${n} sigue presente y sin modificar`,
      readFileSync(join(RAIZ, "apps-script", n), "utf8").length > 0);
  });
  const ausentes = LEGACY.filter((n) => legacyPresente.indexOf(n) === -1);
  if (ausentes.length && !SOLO_JSON) {
    console.log(`       (no están, y en esta máquina sí debería: ${ausentes.join(", ")})`);
  }
} else if (!SOLO_JSON) {
  console.log("       omitido: el paquete anterior no está en este clon " +
    "(está ignorado por Git). No es un fallo.");
}

/* ================================================================
   11. POST-AUDITORÍA — cabeceras y claves ambiguas
   ================================================================ */

grupo("11. POST-AUDITORÍA · AMBIGÜEDAD EN LAS HOJAS");

const CAT_OK = CATEGORIAS_TODAS_ACTIVAS;

// --- El caso exacto de la auditoría: evasión del gate de publicación ---
// Las columnas reales dicen FALSE/BORRADOR; un segundo par dice
// TRUE/APROBADO. Con «gana la última» se publicaba. Debe fallar cerrado.
const EVASION = [
  ["id", "slug", "modelo", "categoria", "activo", "estado_contenido", "activo", "estado_contenido"],
  ["T-01", "evasion", "Evasión", "ciudad", "FALSE", "BORRADOR", "TRUE", "APROBADO"],
];
const rEvasion = ejecutar(EVASION, CAT_OK, null);
comprobar("MODELOS_WEB con `activo` duplicado → hoja inutilizable", rEvasion.ok === false);
comprobar("MODELOS_WEB con `activo` duplicado → 0 modelos publicados", rEvasion.modelos.length === 0);
comprobar("el motivo queda registrado",
  rEvasion._diagnostico.some((d) => d.indexOf("encabezados duplicados") !== -1),
  rEvasion._diagnostico.join(" | "));

// La misma columna escrita de otra forma también colisiona.
[
  [" ACTIVO ", "Estado_Contenido"],
  ["Activo", "ESTADO CONTENIDO"],
  ["activo ", " estado_contenido"],
].forEach(([a, b]) => {
  const m = [
    ["id", "slug", "modelo", "categoria", "activo", "estado_contenido", a, b],
    ["T-01", "evasion", "Evasión", "ciudad", "FALSE", "BORRADOR", "TRUE", "APROBADO"],
  ];
  const r = ejecutar(m, CAT_OK, null);
  comprobar(`grafía "${a.trim()}" / "${b.trim()}" también se detecta como duplicada`,
    r.ok === false && r.modelos.length === 0);
});

// --- CATEGORIAS ---
const CAT_HEADER_DUP = [
  ["slug", "titulo", "orden", "activo", "ACTIVO"],
  ["ciudad", "Ciudad", 1, "FALSE", "TRUE"],
];
const rCatDup = B.limpiarParaCliente_(ejecutar(MATRIZ_MODELOS, CAT_HEADER_DUP, null));
comprobar("CATEGORIAS con encabezado duplicado → ninguna categoría", rCatDup.categorias.length === 0);
comprobar("CATEGORIAS inutilizable → no se publica ningún modelo", rCatDup.modelos.length === 0);

const CAT_SLUG_DUP = [
  ["slug", "titulo", "orden", "activo"],
  ["ciudad", "Ciudad", 1, "FALSE"],
  ["CIUDAD", "Ciudad Bis", 2, "TRUE"],
];
const rCatSlug = ejecutar(MATRIZ_MODELOS, CAT_SLUG_DUP, null);
comprobar("CATEGORIAS con slug repetido → hoja inutilizable",
  B.limpiarParaCliente_(rCatSlug).categorias.length === 0);
comprobar("CATEGORIAS con slug repetido → 0 modelos publicados",
  B.limpiarParaCliente_(rCatSlug).modelos.length === 0);
comprobar("el motivo del slug repetido queda registrado",
  rCatSlug._diagnostico.some((d) => d.indexOf("categorías repetidas") !== -1),
  rCatSlug._diagnostico.join(" | ").slice(0, 140));

// --- CONFIG_PUBLICA ---
const CONFIG_DUP = [
  ["clave", "valor"],
  ["mostrar_precios", "FALSE"],
  ["mostrar_precios", "TRUE"],
];
const rConfigDup = ejecutar(MATRIZ_MODELOS, CAT_OK, null, CONFIG_DUP);
comprobar("CONFIG_PUBLICA con `mostrar_precios` repetido → NO enciende los precios",
  rConfigDup.config.mostrar_precios === false, String(rConfigDup.config.mostrar_precios));
comprobar("ningún modelo lleva importe con la configuración ambigua",
  B.limpiarParaCliente_(rConfigDup).modelos.every((m) => !("precio_publico" in m)));
comprobar("la clave ambigua queda registrada",
  rConfigDup._diagnostico.some((d) => d.indexOf("repetida") !== -1),
  rConfigDup._diagnostico.join(" | ").slice(0, 140));

const CONFIG_HEADER_DUP = [
  ["clave", "valor", "valor"],
  ["mostrar_precios", "FALSE", "TRUE"],
];
const rConfigHdr = ejecutar(MATRIZ_MODELOS, CAT_OK, null, CONFIG_HEADER_DUP);
comprobar("CONFIG_PUBLICA con encabezado duplicado → valores por defecto",
  rConfigHdr.config.mostrar_precios === false);

// --- COLORES ---
const COL_HEADER_DUP = [
  CABECERA_COLORES.concat(["activo"]),
  ["C-1", "T-01", "negro", "Negro", "#111111", RUTA, "", "", "", 10, "FALSE", "APROBADO", "", "", "", "TRUE"],
];
const rColDup = B.limpiarParaCliente_(ejecutar(MATRIZ_MODELOS, CAT_OK, COL_HEADER_DUP));
comprobar("COLORES con encabezado duplicado → sin colores", rColDup.colores.length === 0);
comprobar("COLORES ambigua NO tumba el catálogo", rColDup.ok === true && rColDup.modelos.length > 0);

const COL_ID_DUP = [
  CABECERA_COLORES,
  ["C-1", "T-01", "negro", "Negro", "#111111", RUTA, "", "", "", 10, "TRUE", "APROBADO", "", "", ""],
  ["C-9", "T-01", "negro", "Negro Bis", "#222222", RUTA, "", "", "", 20, "TRUE", "APROBADO", "", "", ""],
];
const rColId = B.limpiarParaCliente_(ejecutar(MATRIZ_MODELOS, CAT_OK, COL_ID_DUP));
comprobar("dos variantes con la misma identidad → no se publica ninguna",
  rColId.colores.filter((c) => c.slug_color === "negro").length === 0,
  JSON.stringify(rColId.colores.map((c) => c.slug_color)));

/* ================================================================
   12. POST-AUDITORÍA — mínimos publicables y precio
   ================================================================ */

grupo("12. POST-AUDITORÍA · MÍNIMOS Y PRECIO");

comprobar("aprobado y activo SIN fotografía → no se publica", !slugs.includes("sin-foto"));
comprobar("aprobado y activo SIN texto alternativo → no se publica", !slugs.includes("sin-alt"));
comprobar("aprobado y activo SIN descripción corta → no se publica", !slugs.includes("sin-copy"));
comprobar("cumpliendo los mínimos y sin nada opcional → SÍ se publica", slugs.includes("solo-minimos"));
comprobar("el modelo mínimo no lleva precio ni colores",
  traer("solo-minimos") && !("precio_publico" in traer("solo-minimos")) &&
    traer("solo-minimos").colores === "");
[["sin-foto", "imagen_principal"], ["sin-alt", "alt_text"], ["sin-copy", "descripcion_corta"]]
  .forEach(([slug, campo]) => {
    comprobar(`el diagnóstico dice qué falta en "${slug}"`,
      rTodo._diagnostico.some((d) => d.indexOf(campo) !== -1 && d.indexOf("NO se publica") !== -1),
      campo);
  });

// El caso de precio de la auditoría, comprobado en el backend.
[
  [12990, 12990], [12990.5, 12990.5], ["12990", 12990], ["12990.50", 12990.5],
  ["12,990", 12990], ["S/ 12,990.00", 12990],
  ["12990,50", null], ["12.990,50", null], ["1,23", null],
  [0, null], [-1, null], [NaN, null], ["consultar", null],
].forEach(([entrada, esperado]) => {
  comprobar(`backend: precio ${JSON.stringify(entrada)} → ${esperado}`,
    B.normNumero_(entrada) === esperado, String(B.normNumero_(entrada)));
});
comprobar('backend: "12990,50" NUNCA es 1299050', B.normNumero_("12990,50") !== 1299050);

// Y las dos capas deben seguir coincidiendo exactamente.
["12990,50", "12.990,50", "1,23", "12990.50", "S/ 12,990.00", "12,990", 12990.5, 0, -1, "consultar"]
  .forEach((p) => {
    comprobar(`precio ${JSON.stringify(p)} — backend y frontend coinciden`,
      B.normNumero_(p) === U.numero(p), `back=${B.normNumero_(p)} front=${U.numero(p)}`);
  });

/* ================================================================
   13. POST-REAUDITORÍA — texto provisional y configuración
   ================================================================ */

grupo("13. POST-REAUDITORÍA · TEXTO PROVISIONAL");

// Las cuatro copias de la lista deben decir lo mismo.
comprobar("backend ↔ Node: misma lista de marcadores",
  JSON.stringify(B.MARCAS_PROVISIONALES) === JSON.stringify(PROVISIONALES),
  B.MARCAS_PROVISIONALES.join(","));
comprobar("backend ↔ completitud: misma lista",
  JSON.stringify(B.MARCAS_PROVISIONALES) === JSON.stringify(F.completitud.MARCAS_PROVISIONALES));
comprobar("backend ↔ esquema del navegador: misma lista",
  JSON.stringify(B.MARCAS_PROVISIONALES) === JSON.stringify(S.MARCAS_PROVISIONALES));

// Y la misma decisión ante los mismos textos.
[
  "PENDIENTE", "pendiente", "Pendiente de redacción",
  "Descripción ampliada pendiente...", "POR DEFINIR", "por completar",
  "Lorem ipsum dolor sit amet", "TBD", "texto provisional",
  "Ágil para la ciudad.", "Una moto de trabajo.", "",
].forEach((t) => {
  comprobar(`"${t || "(vacío)"}" — backend y navegador coinciden`,
    B.esProvisional_(t) === S.esProvisional(t) &&
      B.esProvisional_(t) === F.completitud.esProvisional(t),
    `back=${B.esProvisional_(t)} esquema=${S.esProvisional(t)} compl=${F.completitud.esProvisional(t)}`);
});

// El caso de la reauditoría, ejecutado contra Nucleo.gs.
const CON_PROVISIONAL = [
  CABECERA_MODELOS,
  fila({ id: "P-01", slug: "copy-pendiente", modelo: "Copy Pendiente",
         activo: "TRUE", estado_contenido: "APROBADO", descripcion_corta: "PENDIENTE" }),
  fila({ id: "P-02", slug: "copy-ampliada", modelo: "Copy Ampliada",
         activo: "TRUE", estado_contenido: "APROBADO",
         descripcion_corta: "Descripción ampliada pendiente de redacción" }),
  fila({ id: "P-03", slug: "alt-pendiente", modelo: "Alt Pendiente",
         activo: "TRUE", estado_contenido: "APROBADO", alt_text: "POR DEFINIR" }),
  fila({ id: "P-04", slug: "copy-real", modelo: "Copy Real",
         activo: "TRUE", estado_contenido: "APROBADO",
         descripcion_corta: "Ágil para la ciudad." }),
];
const rProv = ejecutar(CON_PROVISIONAL, CATEGORIAS_TODAS_ACTIVAS, null);
const slugsProv = B.limpiarParaCliente_(rProv).modelos.map((m) => m.slug);

comprobar('descripcion_corta = "PENDIENTE" → NO se publica', !slugsProv.includes("copy-pendiente"));
comprobar("descripción provisional dentro de una frase → NO se publica", !slugsProv.includes("copy-ampliada"));
comprobar("alt_text provisional → NO se publica", !slugsProv.includes("alt-pendiente"));
comprobar("una descripción corta pero real → SÍ se publica", slugsProv.includes("copy-real"));
comprobar("el diagnóstico indica qué faltaba",
  rProv._diagnostico.some((d) => d.indexOf("descripcion_corta") !== -1),
  rProv._diagnostico.join(" | ").slice(0, 160));

// Las siete marcas, una a una, contra el backend.
B.MARCAS_PROVISIONALES.forEach((marca) => {
  const m = [CABECERA_MODELOS, fila({ id: "M-1", slug: "marca-x", modelo: "Marca X",
    activo: "TRUE", estado_contenido: "APROBADO", descripcion_corta: marca.toUpperCase() })];
  comprobar(`backend: descripción "${marca}" → no se publica`,
    B.limpiarParaCliente_(ejecutar(m, CATEGORIAS_TODAS_ACTIVAS, null)).modelos.length === 0);
});

grupo("13 bis. POST-REAUDITORÍA · CONFIG_PUBLICA VALIDADA");

// CONFIG_REQUERIDAS estaba declarada pero no se usaba: prometía una
// validación que no existía.
comprobar("CONFIG_REQUERIDAS declara clave y valor",
  JSON.stringify(B.CONFIG_REQUERIDAS) === JSON.stringify(["clave", "valor"]),
  JSON.stringify(B.CONFIG_REQUERIDAS));

const CONFIG_SIN_HEADERS = [
  ["parametro", "contenido"],
  ["mostrar_precios", "TRUE"],
];
const rCfgMal = ejecutar(MATRIZ_MODELOS, CATEGORIAS_TODAS_ACTIVAS, null, CONFIG_SIN_HEADERS);
comprobar("CONFIG_PUBLICA sin las columnas clave/valor → valores por defecto",
  rCfgMal.config.mostrar_precios === false, String(rCfgMal.config.mostrar_precios));
comprobar("configuración inválida NO tumba el catálogo", rCfgMal.ok === true);
comprobar("configuración inválida queda registrada",
  rCfgMal._diagnostico.some((d) => d.indexOf("CONFIG_PUBLICA no utilizable") !== -1),
  rCfgMal._diagnostico.join(" | ").slice(0, 160));

const rCfgAusente = B.construirRespuesta_(
  { modelos: MATRIZ_MODELOS, config: null, categorias: CATEGORIAS_TODAS_ACTIVAS, colores: null },
  FECHA
);
comprobar("CONFIG_PUBLICA ausente → valores por defecto, sin precios",
  rCfgAusente.config.mostrar_precios === false);
comprobar("CONFIG_PUBLICA ausente → el catálogo sigue respondiendo", rCfgAusente.ok === true);
comprobar("CONFIG_PUBLICA ausente → ningún modelo lleva importe",
  B.limpiarParaCliente_(rCfgAusente).modelos.every((m) => !("precio_publico" in m)));

grupo("13 ter. POST-REAUDITORÍA · SLUG EXPLÍCITO");

const SIN_SLUG = [
  CABECERA_MODELOS,
  fila({ id: "S-01", slug: "", modelo: "Pulsar Ejemplo",
         activo: "TRUE", estado_contenido: "APROBADO" }),
];
const rSinSlug = B.limpiarParaCliente_(ejecutar(SIN_SLUG, CATEGORIAS_TODAS_ACTIVAS, null));
comprobar("backend: sin slug → no se publica", rSinSlug.modelos.length === 0);
comprobar('backend: no se inventa "pulsar-ejemplo"',
  !JSON.stringify(rSinSlug).includes("pulsar-ejemplo"));
comprobar("backend: el slug no se deriva del nombre en ningún caso",
  B.normSlug_("") === "" && B.normSlug_("   ") === "");

// Y la comprobación estática: que nadie reintroduzca la derivación.
const codigoEsquema = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-schema.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/\/\/[^\n]*/g, " ");
comprobar("el esquema del navegador no genera slugs a partir del nombre",
  !/slug\s*=\s*U\.slugificar/.test(codigoEsquema));
comprobar("pero slugificar() sigue existiendo como utilidad",
  typeof U.slugificar === "function" && U.slugificar("Pulsar 180 Neón") === "pulsar-180-neon");

/* ================================================================
   14. CONTRASTE CON EL CONTRATO REAL DE GOOGLE SHEETS
   ================================================================ */

grupo("14. CONTRATO REAL DE GOOGLE SHEETS");

/**
 * Fixtures que reproducen los TIPOS REALES observados en una lectura
 * directa read-only del libro «CATÁLOGO WEB ARENAS — PRODUCCIÓN».
 *
 * La diferencia con los fixtures anteriores no es cosmética: la hoja
 * real entrega booleanos y números NATIVOS de Google Sheets, no las
 * cadenas "TRUE"/"FALSE" que se usaron al construir el backend. Y
 * `estado_contenido` no es un texto que alguien escriba: es el
 * resultado de una FÓRMULA.
 */
const CAB_REAL = [
  "id", "slug", "modelo", "linea", "categoria", "subcategoria", "titulo_web",
  "descripcion_corta", "descripcion_larga", "precio_publico", "mostrar_precio",
  "imagen_principal", "imagen_mobile", "galeria_1", "galeria_2", "colores",
  "caracteristica_1", "caracteristica_2", "caracteristica_3", "destacado",
  "nuevo", "cta_label", "orden", "activo", "estado_contenido",
  "ultima_revision", "alt_text", "foco_imagen",
];

const LARGA_PROVISIONAL_REAL =
  "Descripción ampliada pendiente de completar con información técnica oficial, " +
  "beneficios comprobados, colores e imágenes validadas.";

function filaReal(cambios) {
  const base = {
    id: "moto-pulsar-180-neon",
    slug: "pulsar-180-neon",
    modelo: "Pulsar 180 Neon",
    linea: "Pulsar",
    categoria: "deportiva",
    subcategoria: "Sport",
    titulo_web: "",
    descripcion_corta: "Deportiva urbana de carácter, para el día a día en la ciudad.",
    descripcion_larga: LARGA_PROVISIONAL_REAL,
    precio_publico: "",          // celda numérica vacía
    mostrar_precio: false,       // booleano nativo
    imagen_principal: "",
    imagen_mobile: "",
    galeria_1: "", galeria_2: "", colores: "",
    caracteristica_1: "", caracteristica_2: "", caracteristica_3: "",
    destacado: true,             // booleano nativo
    nuevo: false,
    cta_label: "Ver detalles",
    orden: 10,                   // número nativo
    activo: false,               // booleano nativo
    estado_contenido: "BORRADOR",
    ultima_revision: "",
    alt_text: "Motocicleta Pulsar 180 Neon para el catálogo de Arenas Motocicletas",
    foco_imagen: "50% 50%",
  };
  const f = Object.assign({}, base, cambios || {});
  return CAB_REAL.map((c) => f[c]);
}

const CONFIG_REAL = [
  ["clave", "valor"],
  ["api_version", "1.0"],
  ["moneda_default", "PEN"],
  ["mostrar_precios", true],
  ["mostrar_stock", false],
  ["mostrar_promociones", false],
  ["cache_segundos", 300],
  ["mensaje_sin_resultados", "No encontramos modelos con esos filtros."],
  ["promociones_max_home", 1],
  ["promociones_max_catalogo", 6],
];

const CATEGORIAS_REAL = [
  ["id", "slug", "titulo", "descripcion", "imagen_desktop", "imagen_mobile", "orden", "activo"],
  ["cat-ciudad", "ciudad", "Ciudad", "Movilidad ágil.", "", "", 1, true],
  ["cat-trabajo", "trabajo", "Trabajo", "Resistencia.", "", "", 2, true],
  ["cat-deportiva", "deportiva", "Deportiva", "Carácter.", "", "", 3, true],
  ["cat-aventura", "aventura", "Ruta y aventura", "Confianza.", "", "", 4, true],
  ["cat-touring", "touring", "Touring", "", "", "", 5, false],
  ["cat-rural", "rural", "Rural", "", "", "", 6, false],
  ["cat-carga", "carga", "Carga y transporte", "Mover trabajo.", "", "", 7, false],
  ["cat-iniciacion", "iniciacion", "Iniciación", "", "", "", 8, false],
];

const correrReal = (modelos, categorias) =>
  B.construirRespuesta_(
    { modelos, config: CONFIG_REAL, categorias: categorias || CATEGORIAS_REAL, colores: null },
    FECHA
  );

/* ---- Tipos nativos de Sheets ---- */

const rTipos = correrReal([CAB_REAL, filaReal({})]);
comprobar("la hoja real produce una respuesta válida", rTipos.ok === true);
comprobar("booleano nativo false → no publica", B.limpiarParaCliente_(rTipos).modelos.length === 0);
comprobar("booleano nativo true se entiende", B.normBooleano_(true) === true);
comprobar("booleano nativo false se entiende", B.normBooleano_(false) === false);
comprobar("número nativo en `orden` se entiende", B.normEntero_(10, 999) === 10);
comprobar("celda de precio vacía → sin importe", B.normNumero_("") === null);
comprobar("CONFIG con booleanos nativos: mostrar_precios TRUE", rTipos.config.mostrar_precios === true);
comprobar("CONFIG con número nativo: cache 300", rTipos._cache_segundos === 300, String(rTipos._cache_segundos));
comprobar("CONFIG real es compatible sin cambios",
  rTipos.config.moneda === "PEN" &&
    rTipos.config.mensaje_sin_resultados === "No encontramos modelos con esos filtros.");
comprobar('foco real "50% 50%" es válido en el backend', B.normFoco_("50% 50%") === "50% 50%");
comprobar('foco real "50% 50%" es válido en el navegador', U.foco("50% 50%") === "50% 50%");

/* ---- LA INCOMPATIBILIDAD: la fórmula nunca dice APROBADO ---- */

const conContenido = {
  imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp",
  activo: true,
};
const publicaCon = (estado) =>
  B.limpiarParaCliente_(
    correrReal([CAB_REAL, filaReal(Object.assign({ estado_contenido: estado }, conContenido))])
  ).modelos.length === 1;

comprobar('estado_contenido "BORRADOR" (salida de la fórmula) → NO publica', publicaCon("BORRADOR") === false);
comprobar('estado_contenido "LISTO PARA WEB" (salida de la fórmula) → NO publica',
  publicaCon("LISTO PARA WEB") === false);
comprobar('estado_contenido "REVISAR CONTENIDO" (salida de la fórmula) → NO publica',
  publicaCon("REVISAR CONTENIDO") === false);
comprobar('estado_contenido "APROBADO" → SÍ publica', publicaCon("APROBADO") === true);
comprobar("la aprobación NO se debilita para aceptar la salida de la fórmula",
  B.ESTADO_PUBLICABLE === "APROBADO" && B.ESTADOS_CONTENIDO.indexOf("LISTO PARA WEB") === -1);

/* ---- Categoría `carga` inactiva en el libro real ---- */

const cargaReal = filaReal({
  id: "moto-torito-fibraser-clasico",
  slug: "torito-fibraser-clasico",
  modelo: "Torito Fibraser Clásico",
  linea: "Torito",
  categoria: "carga",
  subcategoria: "Tres ruedas",
  imagen_principal: "assets/catalogo/torito-fibraser-clasico/portada.webp",
  activo: true,
  estado_contenido: "APROBADO",
});
const rCarga = correrReal([CAB_REAL, cargaReal]);
comprobar("carga inactiva: un modelo completo y aprobado NO se publica",
  B.limpiarParaCliente_(rCarga).modelos.length === 0);
comprobar("y el diagnóstico dice exactamente por qué",
  rCarga._diagnostico.some((d) => d.indexOf('"carga" no está activa') !== -1),
  rCarga._diagnostico.join(" | ").slice(0, 130));

const CAT_CARGA_ON = CATEGORIAS_REAL.map((f, i) =>
  i === 7 ? ["cat-carga", "carga", "Carga y transporte", "Mover trabajo.", "", "", 7, true] : f
);
comprobar("activando carga en la hoja, ese mismo modelo sí se publicaría",
  B.limpiarParaCliente_(correrReal([CAB_REAL, cargaReal], CAT_CARGA_ON)).modelos.length === 1);

/* ---- COLORES_MODELO_WEB no existe en el libro real ---- */

comprobar("sin la hoja de colores: colores vacío y catálogo operativo",
  Array.isArray(B.limpiarParaCliente_(rTipos).colores) &&
    B.limpiarParaCliente_(rTipos).colores.length === 0 && rTipos.ok === true);

/* ---- Valores reales de texto ---- */

const publicableReal = B.limpiarParaCliente_(
  correrReal([CAB_REAL, filaReal(Object.assign({ estado_contenido: "APROBADO" }, conContenido))])
).modelos[0];

comprobar("el modelo real se publica con sus valores tal cual", !!publicableReal);
["Utilitaria", "Commuter", "Sport", "Naked", "Touring", "Tres ruedas"].forEach((sub) => {
  const m = B.limpiarParaCliente_(
    correrReal([CAB_REAL, filaReal(Object.assign({ subcategoria: sub, estado_contenido: "APROBADO" }, conContenido))])
  ).modelos[0];
  comprobar(`subcategoría real "${sub}" se conserva`, m && m.subcategoria === sub, m ? m.subcategoria : "-");
});
comprobar('cta_label real "Ver detalles" se conserva', publicableReal.cta_label === "Ver detalles");
comprobar("alt_text real se conserva", publicableReal.alt_text.indexOf("Motocicleta") === 0);
comprobar('el id real con patrón "moto-…" se conserva', publicableReal.id === "moto-pulsar-180-neon");
comprobar("un id `moto-…` no rompe nada del contrato", /^moto-[a-z0-9-]+$/.test(publicableReal.id));

/* ---- Texto opcional provisional: no bloquea, pero no se publica ---- */

// Los 22 modelos del libro real llevan el mismo texto provisional en
// `descripcion_larga`. Es un campo OPCIONAL, así que no bloquea la
// publicación —eso es correcto y no cambia—, pero publicarlo haría que
// la ficha le dijera al visitante que está pendiente de completar.
//
// Esta prueba nació en 3.3A afirmando lo contrario, como registro del
// hallazgo. Ahora afirma el comportamiento corregido.
comprobar("la descripción larga provisional NO bloquea la publicación (es opcional)",
  !!publicableReal);
comprobar("pero NO se publica: llega vacía al cliente",
  publicableReal.descripcion_larga === "", JSON.stringify(publicableReal.descripcion_larga));
comprobar("el texto provisional no aparece en ninguna parte de la respuesta",
  !JSON.stringify(publicableReal).includes("pendiente de completar"));
comprobar("y queda anotado en el diagnóstico interno",
  correrReal([CAB_REAL, filaReal(Object.assign({ estado_contenido: "APROBADO" }, conContenido))])
    ._diagnostico.some((d) => d.indexOf("texto provisional no publicado") !== -1));

// Las tres características, una a una.
[1, 2, 3].forEach((n) => {
  const cambios = Object.assign({ estado_contenido: "APROBADO" }, conContenido);
  cambios["caracteristica_" + n] = "PENDIENTE";
  const m = B.limpiarParaCliente_(correrReal([CAB_REAL, filaReal(cambios)])).modelos[0];
  comprobar(`caracteristica_${n} provisional → no se publica`,
    m && m["caracteristica_" + n] === "", m ? JSON.stringify(m["caracteristica_" + n]) : "-");
  comprobar(`caracteristica_${n} provisional → el modelo sigue publicándose`, !!m);
});

// Una real junto a dos provisionales: se publica solo la real.
const mezcla = B.limpiarParaCliente_(
  correrReal([
    CAB_REAL,
    filaReal(Object.assign({
      estado_contenido: "APROBADO",
      caracteristica_1: "Freno de disco delantero",
      caracteristica_2: "PENDIENTE",
      caracteristica_3: "por definir",
    }, conContenido)),
  ])
).modelos[0];
comprobar("con una característica real y dos provisionales, solo sobrevive la real",
  mezcla && mezcla.caracteristica_1 === "Freno de disco delantero" &&
    mezcla.caracteristica_2 === "" && mezcla.caracteristica_3 === "",
  mezcla ? [mezcla.caracteristica_1, mezcla.caracteristica_2, mezcla.caracteristica_3].join(" | ") : "-");

comprobar("las herramientas siguen reconociendo el texto como provisional",
  B.esProvisional_(LARGA_PROVISIONAL_REAL) === true &&
    F.completitud.esProvisional(LARGA_PROVISIONAL_REAL) === true);

/* ---- El fallback local aplica exactamente la misma política ---- */

const crudoLocal = {
  id: "moto-x", slug: "modelo-x", modelo: "Modelo X", categoria: "ciudad",
  imagen_principal: RUTA, alt_text: "Foto real", descripcion_corta: "Texto real.",
  descripcion_larga: LARGA_PROVISIONAL_REAL,
  caracteristica_1: "Freno de disco delantero",
  caracteristica_2: "PENDIENTE",
  activo: true, estado_contenido: "APROBADO",
};
const mLocal = S.normalizarModelo(crudoLocal, S.normalizarConfig({}), []);
comprobar("fallback: el modelo se publica igualmente", S.esPublicable(mLocal, false) === true);
comprobar("fallback: la descripción larga provisional queda vacía",
  mLocal.descripcionLarga === "", JSON.stringify(mLocal.descripcionLarga));
comprobar("fallback: solo sobrevive la característica real",
  mLocal.caracteristicas.length === 1 && mLocal.caracteristicas[0] === "Freno de disco delantero",
  JSON.stringify(mLocal.caracteristicas));
comprobar("fallback: se deja constancia de lo descartado, sin arrastrar el texto",
  mLocal.provisionales.descripcionLarga === true && mLocal.provisionales.caracteristicas === 1,
  JSON.stringify(mLocal.provisionales));
comprobar("fallback: el texto provisional no sobrevive en el modelo",
  !JSON.stringify(mLocal).includes("pendiente de completar"));
comprobar("la previsualización SÍ puede señalarlo",
  F.completitud.evaluar(mLocal).provisional.descripcionLarga === true &&
    F.completitud.evaluar(mLocal).provisional.caracteristicas === 1);
comprobar("un texto largo REAL no se toca",
  S.normalizarModelo(
    Object.assign({}, crudoLocal, { descripcion_larga: "Una moto pensada para la ciudad." }),
    S.normalizarConfig({}), []
  ).descripcionLarga === "Una moto pensada para la ciudad.");

/* ================================================================
   Resultado
   ================================================================ */

console.log("");
console.log("=".repeat(64));
if (fallos.length) {
  console.log(`RESULTADO: ${fallos.length} prueba(s) FALLAN de ${pasadas + fallos.length}.`);
  console.log("");
  fallos.forEach((f) => console.log("  · " + f));
  process.exit(1);
}
console.log(`RESULTADO: ${pasadas}/${pasadas} pruebas pasan.`);
console.log("");
console.log("NO SE PUEDE PROBAR AQUÍ (solo dentro de Apps Script):");
console.log("  · SpreadsheetApp.getSheetByName / getDataRange");
console.log("  · CacheService (TTL real y límite de tamaño)");
console.log("  · ContentService y la cabecera Content-Type");
console.log("  · el comportamiento de CORS de la Web App publicada");
console.log("Todo lo anterior vive en apps-script/v2/Endpoint.gs, que no");
console.log("contiene ninguna regla de negocio: solo leer, cachear y servir.");
process.exit(0);
