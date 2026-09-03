#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-produccion.mjs
   Comprueba el sitio PUBLICADO. Sin dependencias, sin navegador.

       node scripts/qa-produccion.mjs
       node scripts/qa-produccion.mjs --json

   POR QUÉ EXISTE
   Todo lo demás mide el repositorio. Esto mide lo que un cliente
   encuentra al entrar. Son cosas distintas: el repositorio puede estar
   impecable mientras el catálogo lleva dos días caído, porque los datos
   viven en Sheets y el endpoint es un servicio ajeno con sus propias
   cuotas.

   Sin esto, la forma de enterarse de que el catálogo se ha vaciado sería
   que un cliente lo diga. O que no lo diga.

   QUÉ CONSIDERA FALLO
   Que una página no responda, que pierda la política de contenido, que
   el endpoint deje de responder, que publique un modelo sin fotografía
   —el cliente vería un marco vacío— o que una fotografía referenciada
   no exista.

   Que el catálogo esté vacío NO es fallo por sí solo: puede ser un
   estado legítimo antes de publicar. Se avisa, y punto.

   exit 0 → producción sana
   exit 1 → algo que un cliente notaría
   ================================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MODE = process.argv.includes("--json");
const BASE = "https://arenasweb.github.io";

const fallos = [];
const avisos = [];
const lineas = [];
let ok = 0;

function grupo(t) { lineas.push(""); lineas.push(t); }
function bien(d) { ok++; lineas.push("  ok    " + d); }
function mal(d, x) { fallos.push(d + (x ? " → " + x : "")); lineas.push("  FALLA " + d + (x ? " → " + x : "")); }
function avisa(d) { avisos.push(d); lineas.push("  aviso " + d); }

/** Una petición puede fallar por la red, no por el sitio. Se reintenta. */
async function pedir(url, opciones) {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await fetch(url, Object.assign({ redirect: "follow" }, opciones || {}));
      return r;
    } catch (e) {
      if (intento === 1) throw e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
}

function endpointDelCliente() {
  const js = readFileSync(join(RAIZ, "assets/js/catalogo/catalogo-data.js"), "utf8");
  const m = /appsScriptEndpoint:\s*"([^"]+)"/.exec(js);
  return m ? m[1].trim() : "";
}

/* ================================================================
   1. Las páginas
   ================================================================ */

grupo("1. PÁGINAS PUBLICADAS");

for (const p of ["/", "/catalogo.html", "/modelo.html"]) {
  let r;
  try { r = await pedir(BASE + p); } catch (e) { mal(p + " no responde", String(e).slice(0, 80)); continue; }
  if (r.status !== 200) { mal(p + " responde " + r.status); continue; }
  const html = await r.text();

  // La CSP viaja en el HTML: si un despliegue la pierde, se pierde en
  // silencio y nadie lo nota hasta que hace falta.
  if (!/http-equiv="Content-Security-Policy"/.test(html)) { mal(p + " ha perdido la política de contenido"); continue; }
  if (/script-src[^;"]*unsafe-inline/.test(html)) { mal(p + " abre unsafe-inline"); continue; }
  bien(p.padEnd(16) + "200 · con política de contenido");
}

/* ================================================================
   2. El endpoint del catálogo
   ================================================================ */

grupo("2. ORIGEN DE DATOS");

const endpoint = endpointDelCliente();
let datos = null;
if (!/^https:\/\//.test(endpoint)) {
  mal("no se encuentra el endpoint en catalogo-data.js");
} else {
  try {
    const r = await pedir(endpoint + (endpoint.indexOf("?") !== -1 ? "&" : "?") + "action=catalogo");
    const t = await r.text();
    if (r.status !== 200) mal("el endpoint responde " + r.status);
    else {
      try { datos = JSON.parse(t); } catch (e) { mal("el endpoint no devuelve JSON", t.slice(0, 70)); }
      if (datos && datos.ok !== true) { mal("el endpoint no devuelve ok=true"); datos = null; }
      else if (datos) bien("el endpoint responde 200 con ok=true");
    }
  } catch (e) { mal("el endpoint no responde", String(e).slice(0, 80)); }
}

/* ================================================================
   3. Lo que se está publicando
   ================================================================ */

grupo("3. CATÁLOGO PUBLICADO");

if (datos) {
  const modelos = datos.modelos || [];
  if (!modelos.length) {
    avisa("el catálogo no publica ningún modelo — legítimo antes de publicar, grave después");
  } else {
    bien(modelos.length + " modelo(s) publicado(s)");

    const sinFoto = modelos.filter((m) => !m.imagen_principal).map((m) => m.slug);
    if (sinFoto.length) mal("publicados sin fotografía: el cliente ve un marco vacío", sinFoto.join(", "));
    else bien("todos los publicados llevan fotografía");

    const sinTexto = modelos.filter((m) => !m.alt_text || !m.descripcion_corta).map((m) => m.slug);
    if (sinTexto.length) mal("publicados sin alt_text o sin descripción", sinTexto.join(", "));
    else bien("todos los publicados llevan alt_text y descripción");

    // Una ruta que apunta a un archivo inexistente es una imagen rota en
    // la cara del cliente. Se comprueban todas, no una muestra.
    const rutas = [];
    modelos.forEach((m) => {
      if (m.imagen_principal) rutas.push(m.imagen_principal);
      if (m.imagen_mobile) rutas.push(m.imagen_mobile);
    });
    const rotas = [];
    for (const ruta of rutas) {
      const url = /^https?:/.test(ruta) ? ruta : BASE + "/" + String(ruta).replace(/^\//, "");
      try {
        const r = await pedir(url, { method: "HEAD" });
        if (r.status !== 200) rotas.push(ruta + " (" + r.status + ")");
      } catch (e) { rotas.push(ruta + " (sin respuesta)"); }
    }
    if (rotas.length) mal(rotas.length + " fotografía(s) referenciada(s) que no existen", rotas.slice(0, 3).join(" | "));
    else bien("las " + rutas.length + " rutas de imagen referenciadas responden 200");
  }
}

/* ================================================================
   4. La red de seguridad
   ================================================================ */

grupo("4. RED DE SEGURIDAD");

const RUTA_RESPALDO = join(RAIZ, "data/catalogo-publico.local.json");
if (!existsSync(RUTA_RESPALDO)) {
  mal("no existe el respaldo local");
} else if (datos) {
  const respaldo = JSON.parse(readFileSync(RUTA_RESPALDO, "utf8"));
  const activosRespaldo = (respaldo.modelos || []).filter((m) => m.activo === true).length;
  const publicados = (datos.modelos || []).length;

  // Si el endpoint cae, esto es lo único que queda. Que esté desfasado no
  // rompe nada hoy; rompe el día de la caída, que es justo cuando ya no
  // se puede arreglar a tiempo.
  if (publicados > 0 && activosRespaldo === 0) {
    mal("el respaldo no sostiene nada: si el endpoint cae, el catálogo se vacía",
      "publica " + publicados + ", el respaldo guarda 0 activos · corrige con scripts/sincronizar-respaldo.mjs");
  } else if (publicados !== activosRespaldo) {
    avisa("el respaldo va desfasado: publica " + publicados + " y guarda " + activosRespaldo +
      " · pon al día con scripts/sincronizar-respaldo.mjs");
  } else {
    bien("el respaldo está al día: " + activosRespaldo + " modelo(s)");
  }
}

/* ================================================================
   Informe
   ================================================================ */

const sano = fallos.length === 0;

if (JSON_MODE) {
  console.log(JSON.stringify({ resultado: sano ? "PASS" : "FAIL", ok, fallos, avisos }, null, 2));
  process.exit(sano ? 0 : 1);
}

console.log("ARENAS — SALUD DE PRODUCCIÓN");
console.log(BASE);
console.log(lineas.join("\n"));
console.log("");
console.log("=".repeat(62));
if (sano) {
  console.log("RESULTADO: " + ok + " comprobación(es) correctas" +
    (avisos.length ? ", " + avisos.length + " aviso(s)." : "."));
} else {
  console.log("RESULTADO: " + fallos.length + " fallo(s) que un cliente notaría.");
  fallos.forEach((f) => console.log("  · " + f));
}
avisos.forEach((a) => console.log("  aviso · " + a));
process.exit(sano ? 0 : 1);
