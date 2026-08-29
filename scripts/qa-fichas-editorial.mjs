#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-fichas-editorial.mjs
   Vigila la capa editorial de la ficha: historia, razones de compra
   y el banco fotográfico que las sostiene.

       node scripts/qa-fichas-editorial.mjs
       node scripts/qa-fichas-editorial.mjs --json

   POR QUÉ EXISTE
   La regla de este proyecto es que nada se afirma sin fuente. Esa
   regla vive hoy en la cabeza de quien escribió los textos, y una
   regla que solo vive ahí se rompe el día que alguien añade una moto
   con prisa. Aquí se comprueba, archivo contra archivo:

   · que cada razón apunte a una fotografía que existe y está `ready`;
   · que ninguna publique una foto que el manifiesto marca como
     ausente o como no visible en el lado fotografiado;
   · que ninguna repita fotografía dentro del mismo modelo;
   · que el copy no se dispare de largo ni se llene de superlativos;
   · que toda razón declare de dónde sale su dato;
   · que ninguna ficha sirva un maestro de decenas de megas.

   exit 0 → la capa editorial es defendible
   exit 1 → algo se publicaría sin respaldo
   ================================================================ */

import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MODE = process.argv.includes("--json");

const editorial = JSON.parse(readFileSync(join(RAIZ, "data/fichas-editorial.json"), "utf8"));
const manifiesto = JSON.parse(readFileSync(join(RAIZ, "assets/catalogo/photo-manifest.json"), "utf8"));
const catalogo = JSON.parse(readFileSync(join(RAIZ, "data/catalogo-publico.local.json"), "utf8"));

const activos = catalogo.modelos.filter((m) => m.activo === true).map((m) => m.slug);

let fallos = 0;
const lineas = [];

function comprobar(nombre, condicion, detalle) {
  if (condicion) {
    lineas.push({ ok: true, nombre });
    if (!JSON_MODE) console.log("  ok    " + nombre);
  } else {
    fallos += 1;
    lineas.push({ ok: false, nombre, detalle: detalle || "" });
    if (!JSON_MODE) console.log("  FALLA " + nombre + (detalle ? "  [" + detalle + "]" : ""));
  }
}

/** Registro del manifiesto para un slug. */
function assetsDe(slug) {
  const r = (manifiesto.modelos || []).find((m) => m.modelo === slug);
  return r ? r.assets || {} : {};
}

if (!JSON_MODE) {
  console.log("\nARENAS — capa editorial de las fichas");
  console.log("Se comprueba texto contra manifiesto. No se toca nada.\n");
}

/* ================================================================
   1. Cobertura
   ================================================================ */

const conEditorial = Object.keys(editorial.modelos || {});
const sinEditorial = activos.filter((s) => conEditorial.indexOf(s) === -1);
comprobar("todos los modelos publicados tienen ficha editorial",
  sinEditorial.length === 0, sinEditorial.join(", "));

const sinBanco = activos.filter((s) => Object.keys(assetsDe(s)).length === 0);
comprobar("todos los modelos publicados tienen banco fotográfico",
  sinBanco.length === 0, sinBanco.join(", "));

/* ================================================================
   2. Cada razón se apoya en una fotografía real
   ================================================================ */

// Superlativos que el pliego del proyecto prohíbe expresamente. No es
// una lista de estilo: es la diferencia entre argumentar y prometer.
const HUMO = /\b(la mejor|el mejor|perfecta|perfecto|indestructible|infinit[ao]|inigualable|insuperable|revolucionari[ao]|única en el mundo)\b/i;

for (const slug of conEditorial) {
  const ficha = editorial.modelos[slug];
  const assets = assetsDe(slug);
  const razones = ficha.razones || [];
  const vistas = [];

  comprobar(slug + ": tiene entre 3 y 5 razones",
    razones.length >= 3 && razones.length <= 5, String(razones.length));

  for (const razon of razones) {
    const a = assets[razon.asset];
    const etiqueta = slug + " · " + razon.id;

    comprobar(etiqueta + ": la foto existe en el manifiesto", Boolean(a),
      razon.asset + " no está declarado");
    if (!a) continue;

    // El punto entero del manifiesto: `missing_reference` y
    // `not_visible` existen para que NADIE los publique.
    comprobar(etiqueta + ": la foto está aprobada (ready)", a.status === "ready", a.status);

    comprobar(etiqueta + ": la foto tiene derivado web", Boolean(a.web),
      "sin versión optimizada; se serviría el maestro");

    if (a.web) {
      const ruta = join(RAIZ, a.web);
      comprobar(etiqueta + ": el archivo web existe en disco", existsSync(ruta), a.web);
      if (existsSync(ruta)) {
        const kb = statSync(ruta).size / 1024;
        comprobar(etiqueta + ": pesa menos de 400 KB", kb < 400, Math.round(kb) + " KB");
      }
    }

    comprobar(etiqueta + ": no repite fotografía dentro del modelo",
      vistas.indexOf(razon.asset) === -1, razon.asset);
    vistas.push(razon.asset);

    comprobar(etiqueta + ": declara la fuente del dato", Boolean(razon.fuente));

    const palabras = String(razon.texto || "").trim().split(/\s+/).length;
    comprobar(etiqueta + ": el texto mide entre 20 y 60 palabras",
      palabras >= 20 && palabras <= 60, palabras + " palabras");

    const palabrasTitulo = String(razon.titulo || "").trim().split(/\s+/).length;
    comprobar(etiqueta + ": el título mide entre 3 y 8 palabras",
      palabrasTitulo >= 3 && palabrasTitulo <= 8, palabrasTitulo + " palabras");

    comprobar(etiqueta + ": el copy no usa superlativos vacíos",
      !HUMO.test(razon.texto + " " + razon.titulo),
      (HUMO.exec(razon.texto + " " + razon.titulo) || [])[0]);

    // Un dato sin etiqueta es una cifra suelta; una etiqueta sin dato
    // es una fila vacía. O los dos, o ninguno.
    comprobar(etiqueta + ": dato y etiqueta van juntos o no van",
      Boolean(razon.dato) === Boolean(razon.datoEtiqueta));
  }

  /* La historia no puede ser la misma pieza de texto que una razón. */
  const historia = String(ficha.historia || "");
  comprobar(slug + ": la historia existe y no repite a una razón",
    historia.length > 60 && !razones.some((r) => r.texto === historia));
}

/* ================================================================
   3. Los datos citados existen de verdad en el catálogo
   ================================================================ */

// Una razón puede llevar una cifra. Esa cifra tiene que aparecer en
// las características del modelo en el catálogo: es la única fuente
// que este proyecto acepta. Si alguien inventa «300 mm» para una moto
// que trae 240, aquí salta.
for (const slug of conEditorial) {
  const modelo = catalogo.modelos.find((m) => m.slug === slug);
  if (!modelo) continue;
  const respaldo = [modelo.caracteristica_1, modelo.caracteristica_2,
    modelo.caracteristica_3, modelo.descripcion_larga]
    .filter(Boolean).join(" ").toLowerCase();

  for (const razon of editorial.modelos[slug].razones || []) {
    if (!razon.dato) continue;
    // Solo se verifican los datos numéricos y las siglas: los que
    // afirman una especificación. Un dato como «2 canales» se contrasta
    // por su número y por la palabra ABS de su etiqueta.
    const numero = (String(razon.dato).match(/[\d.]+/) || [])[0];
    const sigla = (String(razon.dato + " " + razon.datoEtiqueta).match(/\b(ABS|CBS|LED|FI)\b/i) || [])[0];
    const respaldado = (numero && respaldo.indexOf(numero) !== -1) ||
      (sigla && respaldo.indexOf(sigla.toLowerCase()) !== -1);
    comprobar(slug + " · " + razon.id + ": el dato «" + razon.dato + "» está en el catálogo",
      Boolean(respaldado), "no aparece en caracteristica_1..3 ni en la descripción larga");
  }
}

/* ================================================================
   4. Nada oculto se cuela
   ================================================================ */

let publicadosProhibidos = [];
for (const registro of manifiesto.modelos || []) {
  const ficha = (editorial.modelos || {})[registro.modelo];
  if (!ficha) continue;
  const usados = (ficha.razones || []).map((r) => r.asset).concat([ficha.historiaAsset]);
  for (const clave of usados) {
    const a = registro.assets[clave];
    if (a && a.status !== "ready") publicadosProhibidos.push(registro.modelo + "/" + clave + " (" + a.status + ")");
  }
}
comprobar("ninguna ficha publica un asset marcado como ausente o no visible",
  publicadosProhibidos.length === 0, publicadosProhibidos.join(", "));

/* ================================================================
   Resultado
   ================================================================ */

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: fallos === 0, fallos, pruebas: lineas }, null, 2));
} else {
  console.log("\n" + "=".repeat(58));
  if (fallos === 0) {
    console.log("RESULTADO: " + lineas.length + "/" + lineas.length + " pruebas pasan.");
    console.log("Cada razón de compra apunta a una foto aprobada y a un dato del catálogo.");
  } else {
    console.log("RESULTADO: " + fallos + " prueba(s) FALLAN de " + lineas.length + ".");
    for (const l of lineas.filter((x) => !x.ok)) {
      console.log("  · " + l.nombre + (l.detalle ? "  [" + l.detalle + "]" : ""));
    }
  }
}

process.exit(fallos === 0 ? 0 : 1);
