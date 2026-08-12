#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-verificar-migracion.mjs
   Verifica una exportación de Google Sheets tras la migración del CMS.
   Sin dependencias, sin red.

       node scripts/qa-verificar-migracion.mjs modelos.csv
       node scripts/qa-verificar-migracion.mjs modelos.csv categorias.csv

   PARA QUÉ SIRVE
   La migración de `estado_contenido` a campo manual se ejecutó sobre el
   libro real el 10 de agosto de 2026 (subfase 3.3C). Esta herramienta
   comprueba, sobre una exportación de la hoja, que el resultado sigue
   siendo el esperado — y sobre todo que no se ha publicado nada sin
   querer.

   Se conserva como AUDITORÍA RECURRENTE, no como paso de la migración:
   sirve para reejecutarla en cualquier momento y confirmar que nadie ha
   reintroducido la fórmula legacy ni ha activado un modelo por error.

   CÓMO OBTENER EL CSV
   En el libro: Archivo → Descargar → Valores separados por comas (.csv).
   Descarga la pestaña ACTIVA, así que hay que situarse en MODELOS_WEB
   antes de exportar, y repetir con CATEGORIAS para comprobar también el
   estado de `carga` (activa desde el 10/08/2026).

   Al exportar a CSV, las fórmulas se convierten en su VALOR. Eso es útil
   aquí: si `estado_contenido` volviera a ser una fórmula, en el CSV
   aparecería su resultado —«LISTO PARA WEB», «REVISAR CONTENIDO»— y esta
   herramienta lo detectaría igual.

   exit 0 → la hoja migrada está como debe.
   exit 1 → algo no cuadra. NO continuar con la publicación.
   ================================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { CATEGORIAS as TAXONOMIA } from "./reglas-catalogo.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ARCHIVO_MODELOS = args[0];
const ARCHIVO_CATEGORIAS = args[1];

if (!ARCHIVO_MODELOS) {
  console.error("Uso: node scripts/qa-verificar-migracion.mjs <modelos.csv> [categorias.csv]");
  console.error("");
  console.error("Exporta desde el libro: Archivo → Descargar → CSV,");
  console.error("situándote antes en la pestaña que quieras exportar.");
  process.exit(1);
}

/* ================================================================
   Lector de CSV
   ================================================================ */

/**
 * CSV con comillas, comas y saltos de línea dentro de campo.
 * Se escribe a mano porque el formato es simple y añadir una
 * dependencia por esto no compensa.
 */
function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;

  const limpio = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++; }
        else entreComillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') { entreComillas = true; continue; }
    if (c === ",") { fila.push(campo); campo = ""; continue; }
    if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; continue; }
    campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((v) => String(v).trim() !== ""));
}

const norm = (v) =>
  String(v === null || v === undefined ? "" : v).trim();

const normCabecera = (v) =>
  norm(v).toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** Google exporta las casillas como TRUE / FALSE. */
function esVerdadero(v) {
  const t = norm(v).toLowerCase();
  return t === "true" || t === "verdadero" || t === "si" || t === "sí" || t === "x" || t === "1";
}

/* ================================================================
   Arnés
   ================================================================ */

const problemas = [];
const avisos = [];
let ok = 0;

function comprobar(desc, cond, detalle) {
  if (cond) { ok++; console.log("  ok    " + desc); }
  else {
    problemas.push(desc + (detalle ? "  → " + detalle : ""));
    console.log("  FALLA " + desc + (detalle ? "  → " + detalle : ""));
  }
}
const avisar = (m) => { avisos.push(m); };

/* ================================================================
   MODELOS_WEB
   ================================================================ */

if (!existsSync(ARCHIVO_MODELOS)) {
  console.error("No se encuentra el archivo: " + ARCHIVO_MODELOS);
  process.exit(1);
}

const COLUMNAS_CONTRATO = [
  "id", "slug", "modelo", "linea", "categoria", "subcategoria", "titulo_web",
  "descripcion_corta", "descripcion_larga", "precio_publico", "mostrar_precio",
  "imagen_principal", "imagen_mobile", "galeria_1", "galeria_2", "colores",
  "caracteristica_1", "caracteristica_2", "caracteristica_3", "destacado",
  "nuevo", "cta_label", "orden", "activo", "estado_contenido",
  "ultima_revision", "alt_text", "foco_imagen",
];

const ESTADOS_ADMITIDOS = ["BORRADOR", "APROBADO"];
const ESTADOS_DE_FORMULA = ["LISTO PARA WEB", "REVISAR CONTENIDO", "LISTO", "REVISADO", "PUBLICADO"];

console.log("");
console.log("VERIFICACIÓN DE LA MIGRACIÓN DEL CMS");
console.log("archivo: " + ARCHIVO_MODELOS);
console.log("");

const tabla = leerCsv(readFileSync(ARCHIVO_MODELOS, "utf8"));
if (!tabla.length) {
  console.error("El archivo está vacío.");
  process.exit(1);
}

const cabecera = tabla[0].map(normCabecera);
const filas = tabla.slice(1).map((f) => {
  const o = {};
  cabecera.forEach((c, i) => { if (c) o[c] = f[i]; });
  return o;
});

console.log("1. ESTRUCTURA DE LA HOJA");

const faltan = COLUMNAS_CONTRATO.filter((c) => cabecera.indexOf(c) === -1);
comprobar("están las 28 columnas del contrato", faltan.length === 0, faltan.join(", "));

const duplicadas = cabecera.filter((c, i) => c && cabecera.indexOf(c) !== i);
comprobar("no hay encabezados duplicados", duplicadas.length === 0, [...new Set(duplicadas)].join(", "));

const extra = cabecera.filter((c) => c && COLUMNAS_CONTRATO.indexOf(c) === -1);
if (extra.length) avisar("columnas fuera del contrato (se ignorarán): " + extra.join(", "));

comprobar("hay filas de modelos", filas.length > 0, String(filas.length));
console.log("        (" + filas.length + " filas de modelos)");

/* ---- La migración propiamente dicha ---- */

console.log("");
console.log("2. LA MIGRACIÓN");

const estados = filas.map((f) => norm(f.estado_contenido));
const conFormula = estados.filter((e) => ESTADOS_DE_FORMULA.indexOf(e.toUpperCase()) !== -1);
comprobar("no queda ningún valor de la fórmula antigua", conFormula.length === 0,
  [...new Set(conFormula)].join(", "));

const fueraDeLista = estados.filter((e) => ESTADOS_ADMITIDOS.indexOf(e.toUpperCase()) === -1);
comprobar("todos los estados son BORRADOR o APROBADO", fueraDeLista.length === 0,
  [...new Set(fueraDeLista)].map((e) => JSON.stringify(e)).join(", "));

const enBorrador = estados.filter((e) => e.toUpperCase() === "BORRADOR").length;
const aprobados = estados.filter((e) => e.toUpperCase() === "APROBADO").length;
comprobar("las " + filas.length + " filas quedan en BORRADOR", enBorrador === filas.length,
  enBorrador + " en BORRADOR, " + aprobados + " en APROBADO");
comprobar("ninguna fila quedó en APROBADO", aprobados === 0, String(aprobados));

const conMayusculasRaras = estados.filter((e) => e && e !== e.toUpperCase());
comprobar("los estados están en mayúsculas, sin variantes", conMayusculasRaras.length === 0,
  [...new Set(conMayusculasRaras)].map((e) => JSON.stringify(e)).join(", "));

/* ---- Nada activo ---- */

console.log("");
console.log("3. NADA PUBLICADO");

const activos = filas.filter((f) => esVerdadero(f.activo));
comprobar("ninguna moto está activa", activos.length === 0,
  activos.map((f) => norm(f.modelo)).join(", "));

const publicados = filas.filter(
  (f) => esVerdadero(f.activo) && norm(f.estado_contenido).toUpperCase() === "APROBADO"
);
comprobar("0 modelos publicados", publicados.length === 0,
  publicados.map((f) => norm(f.modelo)).join(", "));

/* ---- Que no se haya tocado nada más ---- */

console.log("");
console.log("4. NO SE TOCÓ NADA MÁS");

const sinSlug = filas.filter((f) => !norm(f.slug));
comprobar("todas las filas conservan su slug", sinSlug.length === 0,
  sinSlug.map((f) => norm(f.modelo)).join(", "));

const slugsInvalidos = filas.filter((f) => norm(f.slug) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(norm(f.slug)));
comprobar("todos los slugs siguen siendo válidos", slugsInvalidos.length === 0,
  slugsInvalidos.map((f) => norm(f.slug)).join(", "));

const slugsVistos = filas.map((f) => norm(f.slug)).filter(Boolean);
const slugsDup = slugsVistos.filter((s, i) => slugsVistos.indexOf(s) !== i);
comprobar("no hay slugs duplicados", slugsDup.length === 0, [...new Set(slugsDup)].join(", "));

const idsVistos = filas.map((f) => norm(f.id)).filter(Boolean);
const idsDup = idsVistos.filter((s, i) => idsVistos.indexOf(s) !== i);
comprobar("no hay ids duplicados", idsDup.length === 0, [...new Set(idsDup)].join(", "));
comprobar("todas las filas conservan su id", idsVistos.length === filas.length,
  idsVistos.length + " de " + filas.length);

const fueraTaxonomia = filas.filter((f) => TAXONOMIA.indexOf(norm(f.categoria).toLowerCase()) === -1);
comprobar("todas las categorías siguen en la taxonomía", fueraTaxonomia.length === 0,
  [...new Set(fueraTaxonomia.map((f) => norm(f.categoria)))].join(", "));

const conPrecio = filas.filter((f) => norm(f.precio_publico));
if (conPrecio.length) avisar(conPrecio.length + " fila(s) tienen precio escrito — comprobar que es deliberado");

const conFoto = filas.filter((f) => norm(f.imagen_principal));
console.log("        (" + conFoto.length + " fila(s) con imagen_principal escrita)");

/* ================================================================
   CATEGORIAS — opcional
   ================================================================ */

if (ARCHIVO_CATEGORIAS) {
  console.log("");
  console.log("5. CATEGORIAS");

  if (!existsSync(ARCHIVO_CATEGORIAS)) {
    console.error("No se encuentra el archivo: " + ARCHIVO_CATEGORIAS);
    process.exit(1);
  }
  const tablaCat = leerCsv(readFileSync(ARCHIVO_CATEGORIAS, "utf8"));
  const cabCat = tablaCat[0].map(normCabecera);
  const cats = tablaCat.slice(1).map((f) => {
    const o = {};
    cabCat.forEach((c, i) => { if (c) o[c] = f[i]; });
    return o;
  });

  const dupCat = cabCat.filter((c, i) => c && cabCat.indexOf(c) !== i);
  comprobar("CATEGORIAS: sin encabezados duplicados", dupCat.length === 0, [...new Set(dupCat)].join(", "));

  const slugsCat = cats.map((c) => norm(c.slug).toLowerCase()).filter(Boolean);
  const dupSlugCat = slugsCat.filter((s, i) => slugsCat.indexOf(s) !== i);
  comprobar("CATEGORIAS: sin slugs repetidos", dupSlugCat.length === 0, [...new Set(dupSlugCat)].join(", "));

  const carga = cats.filter((c) => norm(c.slug).toLowerCase() === "carga")[0];
  comprobar("CATEGORIAS: existe la fila `carga`", !!carga);
  if (carga) {
    // Activada en el paso 3.3C-4 (10/08/2026). Volver a FALSE ocultaría los
    // cinco modelos de carga y transporte sin que nadie lo hubiera pedido.
    comprobar("CATEGORIAS: `carga` está activa", esVerdadero(carga.activo),
      "se activó en 3.3C-4 y volvió a FALSE");
  }

  ["touring", "rural", "iniciacion"].forEach((slug) => {
    const c = cats.filter((x) => norm(x.slug).toLowerCase() === slug)[0];
    if (c) {
      comprobar("CATEGORIAS: `" + slug + "` sigue inactiva", !esVerdadero(c.activo),
        "está en TRUE y no debía tocarse");
    }
  });

  const activas = cats.filter((c) => esVerdadero(c.activo)).map((c) => norm(c.slug));
  console.log("        activas: " + activas.join(", "));

  // Modelos cuya categoría no está activa: no se publicarían.
  const activasSet = new Set(activas.map((s) => s.toLowerCase()));
  const huerfanos = filas.filter((f) => !activasSet.has(norm(f.categoria).toLowerCase()));
  if (huerfanos.length) {
    const porCat = {};
    huerfanos.forEach((f) => {
      const c = norm(f.categoria);
      porCat[c] = (porCat[c] || 0) + 1;
    });
    Object.keys(porCat).forEach((c) =>
      avisar(porCat[c] + " modelo(s) en la categoría `" + c + "`, que no está activa: no se publicarían")
    );
  }
}

/* ================================================================
   Resultado
   ================================================================ */

if (avisos.length) {
  console.log("");
  console.log("AVISOS (" + avisos.length + ")");
  avisos.forEach((a) => console.log("  · " + a));
}

console.log("");
console.log("=".repeat(64));
if (problemas.length) {
  console.log("RESULTADO: " + problemas.length + " comprobación(es) FALLAN.");
  console.log("");
  problemas.forEach((p) => console.log("  · " + p));
  console.log("");
  console.log("NO CONTINUAR. Revisar la hoja antes de aprobar o activar nada.");
  console.log("Vuelta atrás: desmarcar `activo` en todas las filas detiene");
  console.log("cualquier publicación de inmediato.");
  process.exit(1);
}
console.log("RESULTADO: " + ok + "/" + ok + " comprobaciones correctas.");
console.log("");
console.log("La hoja migrada está como debe: nada aprobado, nada activo,");
console.log("nada publicado, y el resto del contrato intacto.");
process.exit(0);
