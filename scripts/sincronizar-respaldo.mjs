#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/sincronizar-respaldo.mjs
   Vuelca lo que el endpoint publica hoy sobre el respaldo local.

       node scripts/sincronizar-respaldo.mjs            (solo informa)
       node scripts/sincronizar-respaldo.mjs --escribir (escribe)

   POR QUÉ EXISTE
   `data/catalogo-publico.local.json` es la red de seguridad del
   catálogo: si Apps Script no responde, la web sirve este archivo. Pero
   publicar ocurre en Sheets, no en el repositorio, así que el respaldo
   se queda congelado en el estado ANTERIOR a publicar — con todo en
   BORRADOR y activo=FALSE.

   Consecuencia medida en navegador: con el endpoint vivo el cliente ve
   las motos; con el endpoint caído ve CERO, y encima lee «Catálogo en
   preparación». Una red que no sujeta nada.

   Esto se ejecuta DESPUÉS de aprobar y publicar en Sheets, y el archivo
   resultante se commitea. A partir de ahí una caída del endpoint deja el
   catálogo en pie, con los datos del último volcado.

   LO QUE NUNCA HACE
   Sobrescribir el respaldo con una respuesta vacía o incorrecta. Ese es
   el único fallo de esta herramienta que sería peor que no tenerla: se
   perdería la red justo antes de necesitarla. Ante la duda, no escribe.

   exit 0 → sincronizado, o en seco sin diferencias
   exit 1 → hay diferencias y no se pidió escribir
   exit 2 → la respuesta no es utilizable; no se ha tocado nada
   ================================================================ */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUTA = join(RAIZ, "data/catalogo-publico.local.json");
const ESCRIBIR = process.argv.includes("--escribir");

/** El endpoint se lee de la configuración del cliente: una sola verdad. */
function endpointDelCliente() {
  const js = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-data.js"), "utf8");
  const m = /appsScriptEndpoint:\s*"([^"]+)"/.exec(js);
  return m ? m[1].trim() : "";
}

const salida = [];
const di = (s) => { salida.push(s); console.log(s); };

di("ARENAS — SINCRONIZAR EL RESPALDO DEL CATÁLOGO");
di("");

if (!existsSync(RUTA)) {
  console.error("No existe " + RUTA);
  process.exit(2);
}
const actual = JSON.parse(readFileSync(RUTA, "utf8"));

const endpoint = endpointDelCliente();
if (!/^https:\/\//.test(endpoint)) {
  console.error("No encuentro el endpoint en catalogo-data.js, o no es HTTPS.");
  process.exit(2);
}

const url = endpoint + (endpoint.indexOf("?") !== -1 ? "&" : "?") + "action=catalogo";
let remoto;
try {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) { console.error("El endpoint respondió " + r.status + "."); process.exit(2); }
  remoto = JSON.parse(await r.text());
} catch (e) {
  console.error("No se pudo leer el endpoint: " + String(e).slice(0, 140));
  console.error("No se ha tocado el respaldo.");
  process.exit(2);
}

/* ---------------- Cerrojos ----------------
   Cada uno protege contra una forma distinta de arruinar la red. */

if (remoto.ok !== true) {
  console.error("La respuesta no trae ok=true. No se toca el respaldo.");
  process.exit(2);
}
if (!Array.isArray(remoto.modelos)) {
  console.error("La respuesta no trae una lista de modelos. No se toca el respaldo.");
  process.exit(2);
}

const publicados = remoto.modelos.length;
const guardados = (actual.modelos || []).length;
const activosGuardados = (actual.modelos || []).filter((m) => m.activo === true).length;

di("  endpoint publica ahora : " + publicados + " modelo(s)");
di("  respaldo guarda        : " + guardados + " modelo(s), " + activosGuardados + " con activo=TRUE");
di("");

if (publicados === 0) {
  di("El endpoint no publica nada todavía.");
  di("NO se escribe: dejar el respaldo vacío es quedarse sin red justo");
  di("cuando hace falta. Aprueba en Sheets y vuelve a ejecutar esto.");
  process.exit(activosGuardados > 0 ? 1 : 0);
}

// Un desplome brusco casi siempre es un error humano en la hoja, no una
// decisión. Se avisa y se exige confirmación explícita.
if (activosGuardados > 0 && publicados < activosGuardados / 2) {
  di("AVISO: el endpoint publica " + publicados + " y el respaldo tenía " +
    activosGuardados + " activos.");
  di("Eso es una caída de más de la mitad. Comprueba la hoja antes de fijarlo.");
  if (!process.argv.includes("--aun-asi")) {
    di("No se escribe. Si es correcto, repite con --escribir --aun-asi");
    process.exit(1);
  }
}

/* ---------------- Fusión, no reemplazo ----------------

   Este archivo sirve para DOS cosas a la vez, y por eso no se puede
   sobrescribir sin más:

     1. Red de seguridad de producción → necesita lo PUBLICADO.
     2. Previsualización editorial local → necesita los BORRADORES, que
        el endpoint público nunca devuelve, por diseño.

   Volcar la respuesta encima dejaría el archivo con 8 modelos y se
   llevaría por delante los 14 borradores: quien revisa contenido se
   quedaría sin nada que revisar. Así que se fusiona — el endpoint manda
   sobre lo que publica, y lo demás se conserva tal cual.

   Se conservan también los campos `_nota`, `_contrato`, … : explican qué
   es este archivo y no vienen del endpoint. */

const nuevo = {};
Object.keys(actual).forEach((k) => { if (k.charAt(0) === "_") nuevo[k] = actual[k]; });

const publicadosPorSlug = {};
remoto.modelos.forEach((m) => { if (m.slug) publicadosPorSlug[m.slug] = m; });

const fusionados = [];
const vistos = {};
(actual.modelos || []).forEach((m) => {
  if (m.slug && publicadosPorSlug[m.slug]) {
    fusionados.push(publicadosPorSlug[m.slug]);   // el endpoint manda
    vistos[m.slug] = true;
  } else {
    // Borrador: no está publicado, luego no puede quedar activo aquí.
    fusionados.push(Object.assign({}, m, { activo: false }));
  }
});
// Publicado que el respaldo no conocía: modelo nuevo creado en Sheets.
const nuevosDeLaHoja = [];
remoto.modelos.forEach((m) => {
  if (m.slug && !vistos[m.slug]) { fusionados.push(m); nuevosDeLaHoja.push(m.slug); }
});

// Las categorías del endpoint solo incluyen las que tienen modelos
// publicados; las demás siguen haciendo falta para previsualizar.
const cats = (actual.categorias || []).slice();
const porSlug = {};
cats.forEach((c, i) => { porSlug[c.slug] = i; });
(remoto.categorias || []).forEach((c) => {
  if (porSlug[c.slug] !== undefined) cats[porSlug[c.slug]] = c;
  else cats.push(c);
});

nuevo.ok = true;
nuevo.version = remoto.version || actual.version;
nuevo.hoja = actual.hoja;
nuevo.source = "endpoint+borradores";
nuevo.generatedAt = remoto.generated_at || new Date().toISOString();
nuevo.config = remoto.config || actual.config;
nuevo.categorias = cats;
nuevo.modelos = fusionados;
if (remoto.colores && remoto.colores.length) nuevo.colores = remoto.colores;
Object.keys(actual).forEach((k) => {
  if (k.charAt(0) === "_" || nuevo[k] !== undefined) return;
  nuevo[k] = actual[k];
});

const antes = JSON.stringify(actual.modelos);
const despues = JSON.stringify(nuevo.modelos);
const cambia = antes !== despues;

if (!cambia) {
  di("El respaldo ya coincide con lo publicado. Nada que hacer.");
  process.exit(0);
}

const conFoto = remoto.modelos.filter((m) => m.imagen_principal).length;
const borradores = fusionados.length - publicados;
di("Diferencias:");
di("  publicados que fija el respaldo  : " + publicados);
di("  de ellos, con fotografía         : " + conFoto);
di("  borradores conservados           : " + borradores + " (siguen en activo=FALSE)");
di("  total de filas en el respaldo    : " + fusionados.length);
if (nuevosDeLaHoja.length) {
  di("  modelos nuevos vistos en la hoja : " + nuevosDeLaHoja.join(", "));
}
if (conFoto < publicados) {
  di("  AVISO: " + (publicados - conFoto) + " publicado(s) SIN fotografía.");
  di("         El cliente verá su marco vacío. Revisa la hoja.");
}
di("");

if (!ESCRIBIR) {
  di("En seco: no se ha escrito nada.");
  di("Para fijarlo:  node scripts/sincronizar-respaldo.mjs --escribir");
  process.exit(1);
}

writeFileSync(RUTA, JSON.stringify(nuevo, null, 2) + "\n", "utf8");
di("Escrito " + RUTA);
di("");
di("Falta commitearlo y subirlo. Hasta que no esté desplegado, la red");
di("de seguridad sigue siendo la anterior.");
process.exit(0);
