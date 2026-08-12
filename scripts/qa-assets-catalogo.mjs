#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-assets-catalogo.mjs
   Auditoría de las fotografías del catálogo. Sin dependencias.

       node scripts/qa-assets-catalogo.mjs
       node scripts/qa-assets-catalogo.mjs --detalle   (una fila por archivo)
       node scripts/qa-assets-catalogo.mjs --json
       node scripts/qa-assets-catalogo.mjs --slug a,b

   Cruza tres realidades que pueden desalinearse sin que nadie lo note:

       MODELOS de la hoja  ←→  CARPETAS de assets/catalogo  ←→  ARCHIVOS

   y contesta a: ¿falta la carpeta de algún modelo? ¿sobra alguna?
   ¿hay rutas escritas que apuntan a archivos inexistentes? ¿hay
   fotografías subidas que nadie referencia? ¿alguna imagen tiene la
   proporción equivocada o pesa de más?

   CRITERIO DE SALIDA
     exit 0 → no hay errores ESTRUCTURALES.
     exit 1 → hay alguno (ruta insegura, archivo referenciado inexistente,
              carpeta de un modelo ausente…).

   Que falten fotografías NO es un error: es el estado normal mientras el
   catálogo se llena. Eso son advertencias.

   Las dimensiones se leen de la cabecera del propio archivo, sin
   ImageMagick, sin Sharp y sin npm install.
   ================================================================ */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname } from "node:path";

import {
  EXTENSIONES_IMAGEN,
  EXTENSION_PREFERENTE,
  ARCHIVOS_ESPERADOS,
  PROPORCION,
  PROPORCION_TOLERANCIA,
} from "./reglas-catalogo.mjs";
import { inspeccionar } from "./leer-imagen.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_CATALOGO = join(RAIZ, "assets/catalogo");
const BASE_REL = "assets/catalogo";

const args = process.argv.slice(2);
const DETALLE = args.includes("--detalle");
const JSON_OUT = args.includes("--json");

// --fuente permite auditar otro archivo del mismo contrato. Sirve para
// revisar un volcado de la hoja antes de darlo por bueno y, sobre todo,
// para poder comprobar que esta herramienta detecta de verdad lo que dice
// detectar: se le apunta a un archivo roto a propósito y debe protestar.
const iFuente = args.indexOf("--fuente");
const FUENTE = iFuente !== -1 && args[iFuente + 1]
  ? resolve(args[iFuente + 1])
  : join(RAIZ, "data/catalogo-publico.local.json");

const iSlug = args.indexOf("--slug");
const SLUGS = iSlug !== -1 && args[iSlug + 1]
  ? args[iSlug + 1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  : null;

const errores = [];
const avisos = [];
const info = [];
const err = (m) => errores.push(m);
const avi = (m) => avisos.push(m);
const inf = (m) => info.push(m);

const texto = (v) => (v === null || v === undefined || typeof v === "object" ? "" : String(v).trim());

/* ================================================================
   Convención de nombres
   ================================================================ */

/**
 * Un nombre de archivo utilizable. Estas reglas no son estéticas: la
 * validación de rutas del frontend (catalogo-utils.js → rutaImagen) solo
 * admite [A-Za-z0-9._/-], así que un archivo con espacios, tildes o
 * paréntesis JAMÁS podrá referenciarse aunque exista en el disco.
 */
function revisarNombre(nombre, donde) {
  const problemas = [];
  if (/\s/.test(nombre)) problemas.push("contiene espacios");
  if (/[^A-Za-z0-9._-]/.test(nombre)) problemas.push("caracteres fuera de [A-Za-z0-9._-] (¿tildes, ñ, paréntesis?)");
  if (nombre !== nombre.toLowerCase()) problemas.push("mayúsculas");
  if (/^[.-]/.test(nombre)) problemas.push("empieza por punto o guion");
  if (/\.\./.test(nombre)) problemas.push("doble punto");
  problemas.forEach((p) => avi(`${donde}: ${p} — "${nombre}"`));
  return problemas.length === 0;
}

/* ================================================================
   Carga de los modelos
   ================================================================ */

let datos;
try {
  datos = JSON.parse(readFileSync(FUENTE, "utf8"));
} catch (e) {
  console.error("ERROR ESTRUCTURAL: no se pudo leer " + FUENTE);
  console.error("  " + e.message);
  process.exit(1);
}

const modelos = (Array.isArray(datos.modelos) ? datos.modelos : datos.items || []).map((m) => ({
  id: texto(m.id),
  slug: texto(m.slug).toLowerCase(),
  modelo: texto(m.modelo),
  rutas: {
    imagen_principal: texto(m.imagen_principal),
    imagen_mobile: texto(m.imagen_mobile),
    galeria_1: texto(m.galeria_1),
    galeria_2: texto(m.galeria_2),
  },
}));

const foco = SLUGS ? modelos.filter((m) => SLUGS.includes(m.slug)) : modelos;

/* ================================================================
   1. Carpetas: modelo ←→ directorio
   ================================================================ */

if (!existsSync(BASE_CATALOGO)) {
  console.error(`ERROR ESTRUCTURAL: no existe ${BASE_REL}/`);
  process.exit(1);
}

const carpetas = readdirSync(BASE_CATALOGO, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const slugs = new Set(modelos.map((m) => m.slug));
const carpetasSet = new Set(carpetas);

for (const m of modelos) {
  if (!carpetasSet.has(m.slug)) {
    err(`${m.modelo}: falta la carpeta ${BASE_REL}/${m.slug}/`);
  }
}
for (const c of carpetas) {
  if (!slugs.has(c)) {
    avi(`carpeta huérfana: ${BASE_REL}/${c}/ no corresponde a ningún modelo`);
  }
  revisarNombre(c, `carpeta ${BASE_REL}/${c}`);
}

// Carpetas que solo se diferencian por mayúsculas o por acentos: en Windows
// conviven mal y en un servidor Linux serían dos rutas distintas.
const porNombreNormalizado = new Map();
carpetas.forEach((c) => {
  const k = c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!porNombreNormalizado.has(k)) porNombreNormalizado.set(k, []);
  porNombreNormalizado.get(k).push(c);
});
for (const [, lista] of porNombreNormalizado) {
  if (lista.length > 1) err(`carpetas que colisionan al normalizar: ${lista.join(" / ")}`);
}

/* ================================================================
   2. Archivos: los que hay y los que se referencian
   ================================================================ */

/** Recorre una carpeta de modelo, incluidas las subcarpetas de color. */
function archivosDe(carpetaAbs, prefijoRel) {
  const salida = [];
  for (const entrada of readdirSync(carpetaAbs, { withFileTypes: true })) {
    const rel = prefijoRel + "/" + entrada.name;
    if (entrada.isDirectory()) {
      salida.push(...archivosDe(join(carpetaAbs, entrada.name), rel));
    } else if (entrada.name !== ".gitkeep") {
      salida.push({ nombre: entrada.name, rel, abs: join(carpetaAbs, entrada.name) });
    }
  }
  return salida;
}

const referenciadas = new Set();
modelos.forEach((m) =>
  Object.values(m.rutas).forEach((r) => {
    if (r) referenciadas.add(r);
  })
);

const inventario = [];
let totalArchivos = 0;

for (const m of foco) {
  const carpetaAbs = join(BASE_CATALOGO, m.slug);
  const archivos = existsSync(carpetaAbs) ? archivosDe(carpetaAbs, `${BASE_REL}/${m.slug}`) : [];
  totalArchivos += archivos.length;

  for (const a of archivos) {
    revisarNombre(a.nombre, `${m.modelo} → ${a.rel}`);

    const ext = extname(a.nombre).toLowerCase();
    if (!EXTENSIONES_IMAGEN.includes(ext)) {
      avi(`${m.modelo}: extensión no prevista "${ext}" en ${a.rel}`);
      continue;
    }
    if (ext !== EXTENSION_PREFERENTE) {
      avi(`${m.modelo}: ${a.rel} no es ${EXTENSION_PREFERENTE} (formato preferente)`);
    }

    const insp = inspeccionar(a.abs);
    const esperado = ARCHIVOS_ESPERADOS.find((e) => e.nombre === a.nombre);
    const kb = Math.round(insp.bytes / 1024);

    if (insp.formato === "desconocido" || insp.formato === "ilegible") {
      avi(`${m.modelo}: no se pudo leer la cabecera de ${a.rel} (${insp.formato})`);
    } else if (insp.ancho && insp.alto) {
      const ratio = insp.ancho / insp.alto;
      const desvio = Math.abs(ratio - PROPORCION) / PROPORCION;
      if (desvio > PROPORCION_TOLERANCIA) {
        avi(
          `${m.modelo}: ${a.rel} está en ${insp.ancho}×${insp.alto} ` +
            `(${ratio.toFixed(2)}:1); la caja es 16:10 (1.60:1) y recortará ` +
            `${Math.round(desvio * 100)} % — revisar encuadre`
        );
      }
      if (esperado && insp.ancho < esperado.ancho) {
        avi(
          `${m.modelo}: ${a.rel} mide ${insp.ancho} px de ancho; se recomiendan ` +
            `${esperado.ancho} px para que se vea nítida en pantallas de alta densidad`
        );
      }
    }

    if (esperado && kb > esperado.kbMax) {
      avi(`${m.modelo}: ${a.rel} pesa ${kb} KB (máximo recomendado ${esperado.kbMax} KB)`);
    }

    if (!referenciadas.has(a.rel)) {
      avi(`${m.modelo}: ${a.rel} existe pero ninguna columna lo referencia`);
    }

    inventario.push({
      modelo: m.modelo,
      slug: m.slug,
      archivo: a.rel,
      ancho: insp.ancho,
      alto: insp.alto,
      formato: insp.formato,
      kb,
      referenciado: referenciadas.has(a.rel),
      funcion: esperado ? esperado.nombre.replace(".webp", "").toUpperCase() : "OTRA",
    });
  }

  // Rutas escritas que no tienen archivo detrás: eso sí rompe la página.
  for (const [columna, ruta] of Object.entries(m.rutas)) {
    if (!ruta) continue;
    if (ruta.includes("..") || /^[a-z]+:/i.test(ruta) || ruta.startsWith("//")) {
      err(`${m.modelo} → ${columna}: ruta insegura "${ruta}"`);
      continue;
    }
    if (!existsSync(join(RAIZ, ruta))) {
      err(`${m.modelo} → ${columna}: la ruta apunta a un archivo que no existe — "${ruta}"`);
    }
  }
}

/* ================================================================
   3. Resumen
   ================================================================ */

const conFoto = foco.filter((m) => {
  const c = join(BASE_CATALOGO, m.slug);
  return existsSync(c) && archivosDe(c, "x").length > 0;
}).length;

const resumen = {
  modelos: foco.length,
  carpetas: carpetas.length,
  carpetasHuerfanas: carpetas.filter((c) => !slugs.has(c)).length,
  modelosSinCarpeta: modelos.filter((m) => !carpetasSet.has(m.slug)).length,
  modelosConAlgunArchivo: conFoto,
  modelosSinNingunArchivo: foco.length - conFoto,
  archivos: totalArchivos,
  rutasReferenciadas: referenciadas.size,
};

if (JSON_OUT) {
  console.log(JSON.stringify({ resumen, inventario, errores, avisos, info }, null, 2));
  process.exit(errores.length ? 1 : 0);
}

const linea = (k, v) => "  " + String(k).padEnd(30) + String(v).padStart(4);

console.log("");
console.log("ARENAS — AUDITORÍA DE FOTOGRAFÍAS DEL CATÁLOGO");
console.log("base: " + BASE_REL + "/");
console.log("");
console.log("RESUMEN");
console.log(linea("modelos revisados", resumen.modelos));
console.log(linea("carpetas existentes", resumen.carpetas));
console.log(linea("modelos sin carpeta", resumen.modelosSinCarpeta));
console.log(linea("carpetas huérfanas", resumen.carpetasHuerfanas));
console.log(linea("modelos con alguna foto", resumen.modelosConAlgunArchivo));
console.log(linea("modelos sin ninguna foto", resumen.modelosSinNingunArchivo));
console.log(linea("archivos de imagen", resumen.archivos));
console.log(linea("rutas referenciadas", resumen.rutasReferenciadas));

if (DETALLE && inventario.length) {
  console.log("");
  console.log("INVENTARIO");
  console.log(
    "  " + "archivo".padEnd(52) + "medida".padEnd(13) + "formato".padEnd(18) + "peso".padEnd(9) + "ref."
  );
  console.log("  " + "-".repeat(100));
  for (const i of inventario) {
    console.log(
      "  " +
        i.archivo.slice(-51).padEnd(52) +
        (i.ancho ? `${i.ancho}×${i.alto}` : "—").padEnd(13) +
        i.formato.padEnd(18) +
        `${i.kb} KB`.padEnd(9) +
        (i.referenciado ? "si" : "NO")
    );
  }
}

if (DETALLE && !inventario.length) {
  console.log("");
  console.log("INVENTARIO");
  console.log("  (ninguna fotografía todavía)");
}

if (!totalArchivos) {
  inf(
    `no hay ninguna fotografía en ${BASE_REL}/ — las ${carpetas.length} carpetas están preparadas y vacías`
  );
}

const bloque = (titulo, lista) => {
  if (!lista.length) return;
  console.log("");
  console.log(`${titulo} (${lista.length})`);
  lista.forEach((m) => console.log("  · " + m));
};

bloque("ERRORES ESTRUCTURALES", errores);
bloque("ADVERTENCIAS", avisos);
bloque("INFORMACIÓN", info);

console.log("");
if (errores.length) {
  console.log(`RESULTADO: ${errores.length} error(es) estructural(es).`);
  process.exit(1);
}
console.log("RESULTADO: sin errores estructurales.");
console.log("Que falten fotografías es esperado mientras el catálogo se llena.");
process.exit(0);
