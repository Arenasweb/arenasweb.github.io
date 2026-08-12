#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-endpoint-real.mjs
   Interroga un endpoint Apps Script YA DESPLEGADO y comprueba que
   cumple el contrato público. Sin dependencias.

       node scripts/qa-endpoint-real.mjs --endpoint=https://…/exec
       ARENAS_APPS_SCRIPT_ENDPOINT=https://…/exec node scripts/qa-endpoint-real.mjs

   Opciones:
       --endpoint=<url>   la URL /exec del despliegue
       --prohibir=<txt>   cadena que NO puede aparecer en la respuesta
                          (el ID del libro, por ejemplo). Repetible.
       --timeout=<ms>     por defecto 15000
       --json             salida interpretable por otra herramienta
       --guardar=<ruta>   escribe el JSON de ?action=catalogo en un archivo
                          para pasárselo después a qa-contrato-remoto.mjs

   LA URL NO SE GUARDA EN NINGÚN SITIO.
   Ni en este archivo, ni en disco, ni en el repositorio. Entra por
   argumento o por variable de entorno y muere con el proceso. La URL
   pública de un Web App no es un secreto —la web tendrá que pedirla
   desde el navegador de cualquier visitante— pero escribirla en el
   repositorio antes de haberla validado sí es un error: quedaría
   publicada una dirección que quizá haya que rehacer.

   NO ES DESTRUCTIVO. Solo hace peticiones GET. No cambia la Script
   Property, no fuerza errores en producción y no toca el libro.

   Códigos de salida:
     0  el endpoint cumple el contrato
     1  hay al menos un fallo
     2  uso inválido (falta la URL, o no es utilizable)
   ================================================================ */

import { writeFileSync } from "node:fs";

/* ================================================================
   Argumentos
   ================================================================ */

const argv = process.argv.slice(2);
const JSON_MODE = argv.includes("--json");

function opcion(nombre) {
  const pref = "--" + nombre + "=";
  const conIgual = argv.find((a) => a.startsWith(pref));
  if (conIgual) return conIgual.slice(pref.length);
  const i = argv.indexOf("--" + nombre);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return null;
}

function opciones(nombre) {
  const pref = "--" + nombre + "=";
  return argv.filter((a) => a.startsWith(pref)).map((a) => a.slice(pref.length)).filter(Boolean);
}

const ENDPOINT = (opcion("endpoint") || process.env.ARENAS_APPS_SCRIPT_ENDPOINT || "").trim();
const TIMEOUT = Number(opcion("timeout") || 15000);
const GUARDAR = opcion("guardar");

const PROHIBIDOS = opciones("prohibir");
if (process.env.ARENAS_VALOR_PROHIBIDO) PROHIBIDOS.push(process.env.ARENAS_VALOR_PROHIBIDO.trim());

function uso(motivo) {
  console.error(motivo);
  console.error("");
  console.error("Uso:");
  console.error("  node scripts/qa-endpoint-real.mjs --endpoint=https://script.google.com/macros/s/…/exec");
  console.error("  ARENAS_APPS_SCRIPT_ENDPOINT=… node scripts/qa-endpoint-real.mjs");
  console.error("");
  console.error("La URL no se guarda. Se usa y se descarta.");
  process.exit(2);
}

if (!ENDPOINT) uso("Falta la URL del endpoint.");

let url;
try {
  url = new URL(ENDPOINT);
} catch (e) {
  uso("La URL no es utilizable: " + ENDPOINT.slice(0, 60));
}
/* https obligatorio, con UNA excepción: un banco de pruebas en la propia
   máquina. Es la única forma de ejercitar esta herramienta antes de que
   exista el despliegue real — y un servidor local no atraviesa la red. */
const ES_LOCAL = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
if (url.protocol !== "https:" && !(url.protocol === "http:" && ES_LOCAL)) {
  uso("Solo se admite https (o http contra 127.0.0.1 para el banco local). Recibido: " + url.protocol);
}
if (!Number.isFinite(TIMEOUT) || TIMEOUT < 1000) uso("--timeout debe ser un número de milisegundos ≥ 1000");

/** Enmascara la parte identificadora para que un informe pueda compartirse. */
function urlSegura(u) {
  const x = new URL(u);
  const p = x.pathname.replace(/\/s\/[^/]+/, "/s/…");
  return x.origin + p;
}

const avisosInicio = [];
if (ES_LOCAL) {
  avisosInicio.push("BANCO LOCAL: se está interrogando a 127.0.0.1, no al despliegue real. " +
    "Sirve para probar esta herramienta, no para dar por buena la API.");
} else {
  if (!/script\.google\.com$/.test(url.hostname)) {
    avisosInicio.push("el host no es script.google.com (" + url.hostname + "): comprueba que es el endpoint correcto");
  }
  if (!url.pathname.endsWith("/exec")) {
    avisosInicio.push("la ruta no termina en /exec: /dev sirve solo al editor y no representa el despliegue publicado");
  }
}

/* ================================================================
   Contrato esperado
   ================================================================ */

const CONTRATO_MAYOR_ESPERADO = "2";

/** Nada de esto puede aparecer en la respuesta, ni como clave ni como texto. */
const DENYLIST = [
  "stock_real", "stock_publico", "stock_almacen", "estado_stock", "mostrar_stock",
  "numero_chasis", "chasis", "numero_motor", "motor_serie", "vin",
  "ubicacion_almacen", "almacen", "deposito",
  "costo", "costo_compra", "margen", "margen_porcentaje", "proveedor",
  "telefono_cliente", "email_cliente", "documento_cliente", "cliente",
  "CONTACTOS_INTERNOS", "contactos_internos",
  "token", "secret", "password", "credential", "credencial",
  "spreadsheetId", "spreadsheet_id", "ARENAS_CATALOGO_SPREADSHEET_ID",
  "_diagnostico", "_cache_segundos", "diagnostico",
  "deployment", "deploymentId",
];

/* ================================================================
   Estado
   ================================================================ */

const lineas = [];
const fallos = [];
const avisos = [...avisosInicio];
const datos = { endpoint: urlSegura(ENDPOINT), pruebas: [] };

function bloque(t) {
  lineas.push("");
  lineas.push(t);
}
function comprobar(desc, ok, detalle) {
  lineas.push("  " + (ok ? "ok   " : "FALLA") + " " + desc + (!ok && detalle ? "  → " + detalle : ""));
  datos.pruebas.push({ desc, ok, detalle: detalle || null });
  if (!ok) fallos.push({ desc, detalle: detalle || null });
  return ok;
}
function avisar(m) { avisos.push(m); }
function nota(m) { lineas.push("       " + m); }

/* ================================================================
   Petición
   ================================================================ */

async function pedir(accion, extra) {
  const u = new URL(ENDPOINT);
  if (accion) u.searchParams.set("action", accion);
  if (extra) for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);

  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), TIMEOUT);
  const t0 = Date.now();
  try {
    const res = await fetch(u, { signal: ctrl.signal, redirect: "follow" });
    const texto = await res.text();
    return {
      ok: true,
      status: res.status,
      tipo: res.headers.get("content-type") || "",
      urlFinal: res.url,
      redirigido: res.redirected,
      ms: Date.now() - t0,
      texto,
    };
  } catch (e) {
    return {
      ok: false,
      error: e.name === "AbortError" ? "timeout tras " + TIMEOUT + " ms" : String(e.message || e),
      ms: Date.now() - t0,
    };
  } finally {
    clearTimeout(reloj);
  }
}

/** Recorre todo el JSON buscando una cadena, en claves y en valores. */
function buscarProfundo(nodo, aguja, ruta = "$", hallazgos = []) {
  const agujaMin = aguja.toLowerCase();
  if (nodo === null || nodo === undefined) return hallazgos;
  if (typeof nodo === "string") {
    if (nodo.toLowerCase().includes(agujaMin)) hallazgos.push(ruta + " (valor)");
    return hallazgos;
  }
  if (typeof nodo !== "object") return hallazgos;
  if (Array.isArray(nodo)) {
    nodo.forEach((v, i) => buscarProfundo(v, aguja, ruta + "[" + i + "]", hallazgos));
    return hallazgos;
  }
  for (const [k, v] of Object.entries(nodo)) {
    if (k.toLowerCase().includes(agujaMin)) hallazgos.push(ruta + "." + k + " (clave)");
    buscarProfundo(v, aguja, ruta + "." + k, hallazgos);
  }
  return hallazgos;
}

/* ================================================================
   1. SALUD
   ================================================================ */

let salud = null;

async function probarSalud() {
  bloque("1. SALUD  (?action=salud)");
  const r = await pedir("salud");

  if (!comprobar("el endpoint responde", r.ok, r.error)) return;

  nota("HTTP " + r.status + " · " + r.ms + " ms · " + (r.tipo || "sin Content-Type"));
  if (r.redirigido) {
    const h = (() => { try { return new URL(r.urlFinal).hostname; } catch (e) { return "?"; } })();
    nota("hubo redirección; host final: " + h + " (normal en Apps Script, no es un fallo)");
  }

  comprobar("HTTP 200", r.status === 200, "HTTP " + r.status);
  comprobar("el Content-Type es JSON", /json/i.test(r.tipo), r.tipo || "(vacío)");

  let j = null;
  try { j = JSON.parse(r.texto); } catch (e) { /* se informa abajo */ }
  if (!comprobar("la respuesta es JSON interpretable", j !== null,
    "primeros 120 caracteres: " + String(r.texto).slice(0, 120))) return;

  salud = j;
  comprobar("ok = true", j.ok === true, JSON.stringify(j.ok));
  comprobar("declara servicio", typeof j.servicio === "string" && j.servicio.length > 0);
  comprobar("declara api_version", typeof j.api_version === "string" && j.api_version.length > 0);
  comprobar("declara version de contrato", typeof j.version === "string" && j.version.length > 0);
  comprobar("la version de contrato es la que espera el frontend",
    String(j.version) === CONTRATO_MAYOR_ESPERADO,
    "recibido " + JSON.stringify(j.version) + ", esperado " + CONTRATO_MAYOR_ESPERADO);
  comprobar("configurado = true", j.configurado === true,
    "sin la Script Property el catálogo responderá backend_no_configurado");

  nota("servicio=" + j.servicio + " · api_version=" + j.api_version + " · version=" + j.version);
  nota("configurado:true dice que HAY un identificador de libro, NO que la hoja sea correcta");

  comprobar("la salud no expone el identificador del libro",
    !/[A-Za-z0-9_-]{35,}/.test(JSON.stringify(j)));
}

/* ================================================================
   2. CATÁLOGO
   ================================================================ */

let catalogo = null;
let catalogoTexto = null;

async function probarCatalogo() {
  bloque("2. CATÁLOGO  (?action=catalogo)");
  const r = await pedir("catalogo");

  if (!comprobar("el endpoint responde", r.ok, r.error)) return;
  nota("HTTP " + r.status + " · " + r.ms + " ms · " + (r.tipo || "sin Content-Type") +
    " · " + (r.texto ? r.texto.length : 0) + " bytes");

  comprobar("HTTP 200", r.status === 200, "HTTP " + r.status);
  comprobar("el Content-Type es JSON", /json/i.test(r.tipo), r.tipo || "(vacío)");

  let j = null;
  try { j = JSON.parse(r.texto); } catch (e) { /* se informa abajo */ }
  if (!comprobar("la respuesta es JSON interpretable", j !== null,
    "primeros 120 caracteres: " + String(r.texto).slice(0, 120))) return;

  catalogo = j;
  catalogoTexto = r.texto;

  comprobar("ok = true", j.ok === true,
    j.error ? "error=" + j.error : JSON.stringify(j.ok));

  if (j.ok !== true && j.error === "backend_no_configurado") {
    avisar("el backend responde pero NO tiene la Script Property configurada: es el paso 3 del runbook");
  }

  comprobar("version = " + CONTRATO_MAYOR_ESPERADO, String(j.version) === CONTRATO_MAYOR_ESPERADO,
    "recibido " + JSON.stringify(j.version) + " — el frontend descartaría toda la respuesta");
  comprobar("declara api_version", typeof j.api_version === "string" && j.api_version.length > 0);
  comprobar("declara generated_at", typeof j.generated_at === "string" && j.generated_at.length > 0);
  comprobar("generated_at es una fecha interpretable",
    typeof j.generated_at === "string" && !Number.isNaN(Date.parse(j.generated_at)),
    String(j.generated_at));

  comprobar("config es un objeto", j.config !== null && typeof j.config === "object" && !Array.isArray(j.config));
  comprobar("categorias es un array", Array.isArray(j.categorias));
  comprobar("modelos es un array", Array.isArray(j.modelos));
  comprobar("colores es un array", Array.isArray(j.colores));

  // Los nombres van en español a propósito: es lo que lee catalogo-schema.js.
  comprobar("no emite las claves en inglés (models/categories/colors)",
    j.models === undefined && j.categories === undefined && j.colors === undefined,
    "el frontend busca modelos/categorias/colores y pintaría un catálogo vacío sin dar error");

  const nModelos = Array.isArray(j.modelos) ? j.modelos.length : -1;
  const nCat = Array.isArray(j.categorias) ? j.categorias.length : -1;
  const nCol = Array.isArray(j.colores) ? j.colores.length : -1;
  nota("modelos=" + nModelos + " · categorias=" + nCat + " · colores=" + nCol);

  datos.recuento = { modelos: nModelos, categorias: nCat, colores: nCol };

  /* --- Estado esperado del primer despliegue --- */
  bloque("3. ESTADO ESPERADO HOY  (las 22 motos en BORRADOR)");
  nota("con el CMS como quedó el 10/08/2026, la respuesta correcta es un catálogo VACÍO");

  comprobar("0 modelos publicados", nModelos === 0,
    nModelos + " modelo(s) publicados con las 22 filas en BORRADOR e inactivas — " +
    "revisar el CMS antes de seguir: algo se aprobó o se activó");
  comprobar("0 colores (la hoja COLORES_MODELO_WEB todavía no existe)", nCol === 0,
    nCol + " color(es): ¿se creó la hoja?");
  comprobar("0 categorías públicas", nCat === 0,
    nCat + " categoría(s): el backend solo publica las activas CON algún modelo publicado");

  if (nModelos === 0) {
    nota("un catálogo vacío NO es un fallo: es lo que debe pasar hasta aprobar y activar la primera moto");
  }

  /* --- Precio --- */
  if (nModelos > 0) {
    const conPrecio = j.modelos.filter((m) => m && typeof m.precio === "number" && m.precio > 0);
    comprobar("ningún modelo publica precio", conPrecio.length === 0,
      conPrecio.length + " modelo(s) con precio; hoy los 22 tienen la celda vacía y mostrar_precio en FALSE");
  }

  /* --- Config pública --- */
  if (j.config && typeof j.config === "object") {
    nota("config: " + Object.keys(j.config).join(", "));
    if (j.config.mostrar_precios === true) {
      avisar("config.mostrar_precios viene en true: comprobar que es deliberado antes de que haya precios");
    }
  }
}

/* ================================================================
   4. PRIVACIDAD
   ================================================================ */

function probarPrivacidad() {
  bloque("4. PRIVACIDAD DEL PAYLOAD");
  if (!catalogo) {
    comprobar("hay una respuesta que auditar", false, "no se pudo obtener el catálogo");
    return;
  }

  for (const termino of DENYLIST) {
    const h = buscarProfundo(catalogo, termino);
    comprobar("sin «" + termino + "»", h.length === 0, h.slice(0, 4).join(", "));
  }

  comprobar("no viaja el campo interno _diagnostico", catalogo._diagnostico === undefined);
  comprobar("no viaja el campo interno _cache_segundos", catalogo._cache_segundos === undefined);

  const clavesRaras = Object.keys(catalogo).filter((k) => k.startsWith("_"));
  comprobar("ninguna clave de primer nivel empieza por guion bajo", clavesRaras.length === 0,
    clavesRaras.join(", "));

  // Cualquier cadena larga con pinta de identificador.
  const sospechosas = (catalogoTexto.match(/[A-Za-z0-9_-]{35,60}/g) || [])
    .filter((s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s));
  comprobar("no aparece nada con forma de identificador de Sheets", sospechosas.length === 0,
    sospechosas.slice(0, 3).map((s) => s.slice(0, 12) + "…").join(", "));

  if (PROHIBIDOS.length) {
    for (const p of PROHIBIDOS) {
      // Se busca en las DOS respuestas: el identificador del libro podría
      // escaparse tanto por el catálogo como por la sonda de salud.
      const h = buscarProfundo(catalogo, p, "$catalogo")
        .concat(salud ? buscarProfundo(salud, p, "$salud") : []);
      comprobar("no aparece el valor prohibido indicado por quien opera", h.length === 0,
        h.slice(0, 3).join(", "));
    }
    nota(PROHIBIDOS.length + " valor(es) prohibido(s) comprobados en catálogo y salud; no se imprimen");
  } else {
    avisar("no se comprobó el ID real del libro en la respuesta: pásalo con --prohibir=<valor>");
  }
}

/* ================================================================
   5. QUERYSTRINGS HOSTILES
   ================================================================ */

async function probarHostiles() {
  bloque("5. QUERYSTRINGS HOSTILES");
  nota("ninguno debe cambiar la fuente de datos ni sacar borradores");

  if (!catalogo || catalogo.ok !== true) {
    avisar("no se probaron los querystrings hostiles: el catálogo base no respondió ok:true");
    return;
  }

  const base = JSON.stringify({
    modelos: catalogo.modelos, categorias: catalogo.categorias, colores: catalogo.colores,
  });

  const casos = [
    { nombre: "otro libro por parámetro", extra: { spreadsheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEF" } },
    { nombre: "otra hoja por parámetro", extra: { sheet: "CONTACTOS_INTERNOS" } },
    { nombre: "un rango por parámetro", extra: { range: "A1:Z999" } },
    { nombre: "preview=1", extra: { preview: "1" } },
    { nombre: "debug=1", extra: { debug: "1" } },
    { nombre: "borrador=1", extra: { borrador: "1" } },
    { nombre: "incluir_borradores=true", extra: { incluir_borradores: "true" } },
    { nombre: "id de un modelo concreto", extra: { id: "moto-pulsar-180-neon" } },
  ];

  for (const c of casos) {
    const r = await pedir("catalogo", c.extra);
    if (!r.ok) { comprobar("con " + c.nombre + ": responde", false, r.error); continue; }
    let j = null;
    try { j = JSON.parse(r.texto); } catch (e) { /* abajo */ }
    if (!j) { comprobar("con " + c.nombre + ": JSON interpretable", false); continue; }
    const ahora = JSON.stringify({ modelos: j.modelos, categorias: j.categorias, colores: j.colores });
    comprobar("con " + c.nombre + ": mismo contrato público", ahora === base,
      "la respuesta CAMBIA — el parámetro está influyendo en los datos");
  }

  bloque("6. ACCIÓN DESCONOCIDA");
  const raros = [
    { nombre: "action=foo", v: "foo" },
    { nombre: "action=../../", v: "../../" },
    { nombre: "action con etiqueta script", v: "<script>alert(1)</script>" },
    { nombre: "action=catalogo con espacios", v: " catalogo " },
  ];
  for (const c of raros) {
    const r = await pedir(c.v);
    if (!r.ok) { comprobar(c.nombre + ": responde", false, r.error); continue; }
    let j = null;
    try { j = JSON.parse(r.texto); } catch (e) { /* abajo */ }
    if (!comprobar(c.nombre + ": responde JSON, no una página de error", j !== null,
      String(r.texto).slice(0, 80))) continue;
    comprobar(c.nombre + ": se rechaza en vez de caer al catálogo",
      j.ok === false && j.modelos === undefined,
      "devolvió " + JSON.stringify(j).slice(0, 90));
    const t = JSON.stringify(j);
    comprobar(c.nombre + ": el error no incluye traza ni rutas",
      !/at\s+\w+\s*\(|\.gs:|Exception|stack/i.test(t), t.slice(0, 90));
    comprobar(c.nombre + ": el error no incluye nada con forma de identificador",
      !/[A-Za-z0-9_-]{35,}/.test(t));
  }
}

/* ================================================================
   7. CACHÉ
   ================================================================ */

async function probarCache() {
  bloque("7. CACHÉ  (observación, no exigencia)");
  if (!catalogo || catalogo.ok !== true) {
    avisar("no se observó la caché: el catálogo base no respondió ok:true");
    return;
  }
  const a = await pedir("catalogo");
  const b = await pedir("catalogo");
  if (!a.ok || !b.ok) { avisar("no se pudo observar la caché: alguna llamada falló"); return; }

  let ja = null, jb = null;
  try { ja = JSON.parse(a.texto); jb = JSON.parse(b.texto); } catch (e) { /* abajo */ }
  if (!ja || !jb) { avisar("no se pudo observar la caché: respuesta no interpretable"); return; }

  nota("llamada 1: " + a.ms + " ms · generated_at=" + ja.generated_at);
  nota("llamada 2: " + b.ms + " ms · generated_at=" + jb.generated_at);
  nota(ja.generated_at === jb.generated_at
    ? "mismo generated_at → la segunda salió de la caché"
    : "generated_at distinto → la caché no intervino (TTL corto, o se vació)");
  nota("esto se OBSERVA, no se exige: el contrato no promete identidad entre llamadas");

  comprobar("las dos llamadas siguen cumpliendo el contrato",
    ja.ok === true && jb.ok === true && String(ja.version) === CONTRATO_MAYOR_ESPERADO &&
    String(jb.version) === CONTRATO_MAYOR_ESPERADO);
}

/* ================================================================
   Informe
   ================================================================ */

async function principal() {
  await probarSalud();
  await probarCatalogo();
  probarPrivacidad();
  await probarHostiles();
  await probarCache();

  if (GUARDAR && catalogoTexto) {
    writeFileSync(GUARDAR, catalogoTexto, "utf8");
    nota("respuesta de catálogo guardada en " + GUARDAR + " (archivo de trabajo, no del repositorio)");
  }

  const ok = fallos.length === 0;

  if (JSON_MODE) {
    console.log(JSON.stringify({ resultado: ok ? "PASS" : "FAIL", ...datos, fallos, avisos }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  console.log("ARENAS — BANCO DEL ENDPOINT REAL");
  console.log("endpoint: " + urlSegura(ENDPOINT) + "   (identificador enmascarado)");
  console.log("timeout:  " + TIMEOUT + " ms");
  console.log(lineas.join("\n"));

  if (avisos.length) {
    console.log("");
    console.log("AVISOS (" + avisos.length + ")");
    avisos.forEach((a) => console.log("  · " + a));
  }

  console.log("");
  console.log("================================================================");
  if (ok) {
    console.log("ENDPOINT PASS — cumple el contrato público.");
    console.log("");
    console.log("Falta lo único que Node no puede juzgar: si un NAVEGADOR puede");
    console.log("leer esta respuesta desde otro origen. Eso es CORS, y se prueba");
    console.log("con tests/manual/endpoint-cors-test.html.");
  } else {
    console.log("ENDPOINT FAIL — " + fallos.length + " fallo(s)");
    console.log("");
    fallos.forEach((f) => console.log("  · " + f.desc + (f.detalle ? "  → " + f.detalle : "")));
    console.log("");
    console.log("NO conectar el frontend. Ver docs/runbook-deploy-apps-script-v2.md §criterios de aborto.");
  }
  process.exit(ok ? 0 : 1);
}

principal().catch((e) => {
  console.error("Error inesperado: " + (e && e.message ? e.message : e));
  process.exit(1);
});
