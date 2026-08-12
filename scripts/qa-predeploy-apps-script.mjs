#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-predeploy-apps-script.mjs
   Guarda de seguridad ANTES de desplegar el backend Apps Script v2.
   Sin dependencias, sin red.

       node scripts/qa-predeploy-apps-script.mjs
       node scripts/qa-predeploy-apps-script.mjs --json
       node scripts/qa-predeploy-apps-script.mjs --paquete otra/ruta

   PARA QUÉ SIRVE
   Un despliegue equivocado de Apps Script es difícil de detectar desde
   fuera: el editor concatena todos los .gs en un único ámbito global, y
   si queda un `doGet` del paquete antiguo GANA EL ÚLTIMO, en silencio.
   Esta herramienta inspecciona físicamente el paquete que se va a pegar
   en el editor y se niega a dar el visto bueno si algo no cuadra.

   QUÉ NO HACE
   No despliega, no se conecta a Google, no lee el Sheet, no toca Git.
   Es un lector de archivos. Todo lo que necesita está en el disco.

   Códigos de salida:
     0  PREDEPLOY PASS — apto para desplegar en lo que se puede juzgar local
     1  PREDEPLOY FAIL — hay al menos un bloqueante
     2  uso inválido o paquete inaccesible
   ================================================================ */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const PAQUETE = resolve(RAIZ, opcion("paquete") || "apps-script/v2");

/* Valor a prohibir explícitamente (el ID real del libro), pasado sin
   almacenarlo nunca en el repositorio:
       --prohibir=<valor>            o        ARENAS_VALOR_PROHIBIDO=<valor> */
const PROHIBIDO_EXTRA = (opcion("prohibir") || process.env.ARENAS_VALOR_PROHIBIDO || "").trim();

if (!existsSync(PAQUETE) || !statSync(PAQUETE).isDirectory()) {
  console.error("No existe el paquete: " + PAQUETE);
  console.error("Uso: node scripts/qa-predeploy-apps-script.mjs [--paquete <dir>] [--json]");
  process.exit(2);
}

/* ================================================================
   Contrato del paquete de despliegue
   ================================================================ */

/** Los ÚNICOS .gs que se pegan en el editor de Apps Script. */
const ARCHIVOS_DEPLOY = ["Configuracion.gs", "Nucleo.gs", "Endpoint.gs"];

/** Documentación: puede estar en la carpeta, NO se copia como .gs. */
const ARCHIVOS_DOC = ["README.md"];

/** Nombres del paquete anterior. Ninguno debe aparecer en el de despliegue. */
const ARCHIVOS_LEGACY = ["Code.gs", "Schema.gs", "Seguridad.gs"];

/**
 * Símbolos del backend anterior. Si el paquete v2 los invocara, estaría
 * dependiendo de archivos que NO se van a copiar: en el editor serían
 * `undefined` y reventaría en producción, no aquí.
 */
const SIMBOLOS_LEGACY = [
  "CATALOGO_PUBLICO",
  "construirCatalogoPublico",
  "validarFilaCatalogo",
  "sanitizarTexto_legacy",
  "COLUMNAS_CATALOGO_PUBLICO",
  "obtenerHojaCatalogo",
];

/**
 * APIs prohibidas en el runtime público, por familias.
 * Se buscan SOLO sobre código ejecutable: comentarios y cadenas se
 * eliminan antes, porque este proyecto documenta en el propio archivo
 * justo aquello que no debe hacer.
 */
const PROHIBIDAS = [
  { grupo: "libro activo", nombres: ["getActiveSpreadsheet", "getActiveSheet", "getActive", "getSelection", "getActiveRange"] },
  { grupo: "escritura en celdas", nombres: ["setValue", "setValues", "appendRow", "deleteRow", "deleteRows", "insertRow", "insertRows", "insertRowAfter", "insertRowBefore", "setFormula", "setFormulas"] },
  { grupo: "borrado", nombres: ["clearContent", "clearContents", "clearFormat", "clearDataValidations", "clearNote"] },
  { grupo: "estructura del libro", nombres: ["insertSheet", "deleteSheet", "duplicateActiveSheet", "setName", "renameActiveSheet"] },
  { grupo: "escritura de propiedades", nombres: ["setProperty", "setProperties", "deleteProperty", "deleteAllProperties"] },
  { grupo: "servicios fuera de alcance", nombres: ["DriveApp", "UrlFetchApp", "MailApp", "GmailApp", "FormApp", "CalendarApp", "DocumentApp", "SlidesApp", "BigQuery", "JdbcService"] },
  { grupo: "ejecución dinámica", nombres: ["eval", "setTimeout", "setInterval"] },
  { grupo: "salida no JSON", nombres: ["HtmlService", "XmlService", "createHtmlOutput", "setCallback"] },
];

/** `clear(` a secas y `new Function(` necesitan comprobación aparte. */
const PROHIBIDAS_PATRON = [
  { grupo: "borrado", etiqueta: "clear(", re: /(^|[^\w$])clear\s*\(/ },
  { grupo: "ejecución dinámica", etiqueta: "new Function(", re: /\bnew\s+Function\s*\(/ },
];

/** Nombre de la Script Property. Es un NOMBRE, no un valor: puede aparecer. */
const PROP_ESPERADA = "ARENAS_CATALOGO_SPREADSHEET_ID";

/** Frases que el README debe dejar claras a quien despliega. */
const README_EXIGE = [
  { clave: "sustituir, no añadir", re: /sustituir,?\s*no\s+a[ñn]adir|reemplaza(r)?\s+.*no\s+a[ñn]ad/i },
  { clave: "un único doGet", re: /una\s+sola\s+vez|[úu]nico\s*`?doGet|exactamente\s+un\s+`?doGet/i },
  { clave: "Script Property del libro", re: new RegExp(PROP_ESPERADA) },
  { clave: "estado de despliegue registrado", re: /DESPLEGADO\s+Y\s+VALIDADO|Estado\s+del\s+11\/08\/2026/i },
  { clave: "QA en producción registrado como aprobado", re: /QA\s+en\s+producci[oó]n\s+(pas[oó]|aprobado|completado)|pasos\s+\*\*0[–-]12[^.\n]*(ejecutaron|validaron)/i },
  { clave: "catálogo vacío es correcto", re: /cat[áa]logo\s+vac[íi]o\s+es\s+la\s+respuesta\s+correcta|modelos:\s*\[\]/i },
];

/* ================================================================
   Detectores de secreto
   Distinguen NOMBRE (permitido) de VALOR (prohibido).
   ================================================================ */

const SECRETOS = [
  {
    etiqueta: "identificador de Google Sheets con aspecto real",
    // Los ID de Sheets son ~44 caracteres de [A-Za-z0-9_-]. Exigimos
    // longitud y mezcla de mayúsculas, minúsculas y dígitos para no
    // disparar con una palabra larga o un hash hexadecimal.
    re: /\b[A-Za-z0-9_-]{35,60}\b/g,
    filtro: (m) => /[a-z]/.test(m) && /[A-Z]/.test(m) && /[0-9]/.test(m) && m !== PROP_ESPERADA,
  },
  { etiqueta: "URL de despliegue de Apps Script", re: /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+/g },
  { etiqueta: "URL de contenido de usuario de Apps Script", re: /script\.googleusercontent\.com\/[^\s"'`)]+/g },
  { etiqueta: "clave de acceso AWS", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { etiqueta: "clave privada PEM", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { etiqueta: "cabecera Bearer con valor", re: /Bearer\s+[A-Za-z0-9._~+/-]{12,}/g },
  { etiqueta: "client_secret con valor", re: /client_secret\s*[:=]\s*["'][^"']{6,}["']/gi },
  { etiqueta: "client_id con valor", re: /client_id\s*[:=]\s*["'][^"']{10,}["']/gi },
  { etiqueta: "contraseña con valor", re: /\bpass(word|wd)\s*[:=]\s*["'][^"']{3,}["']/gi },
  { etiqueta: "token con valor", re: /\b(api[_-]?key|token|secret|credential)\s*[:=]\s*["'][^"']{8,}["']/gi },
  { etiqueta: "cookie o cabecera de autorización con valor", re: /\b(cookie|authorization)\s*[:=]\s*["'][^"']{8,}["']/gi },
];

/* ================================================================
   Estado del informe
   ================================================================ */

const bloqueantes = [];
const avisos = [];
const lineas = [];
const bloques = [];

/* Estado del informe. Se declara AQUÍ, antes de la primera comprobación,
   porque el bloque 1 puede llamar a informar() de inmediato: sin los tres
   archivos no hay nada que analizar. Si estas variables se declararan más
   abajo, leerlas desde informar() lanzaría ReferenceError y la salida
   dejaría de ser JSON interpretable justo en los casos más graves. */
let totalDoGet = 0;
let totalDoPost = 0;
let contratoMayor = null;
let apiVersion = null;
let versionFrontend = null;
let huellas = {};

let bloqueActual = null;
function bloque(titulo) {
  bloqueActual = { titulo, comprobaciones: [] };
  bloques.push(bloqueActual);
  lineas.push("");
  lineas.push(titulo);
}

function comprobar(desc, ok, detalle) {
  const estado = ok ? "ok" : "FALLA";
  lineas.push("  " + (ok ? "ok   " : "FALLA") + " " + desc + (!ok && detalle ? "  → " + detalle : ""));
  if (bloqueActual) bloqueActual.comprobaciones.push({ desc, ok, detalle: detalle || null });
  if (!ok) bloqueantes.push({ desc, detalle: detalle || null });
  return ok;
}

function avisar(m) {
  avisos.push(m);
}

function nota(m) {
  lineas.push("       " + m);
}

/* ================================================================
   Limpieza de código: quitar comentarios y cadenas
   ================================================================ */

/**
 * Devuelve el archivo con los comentarios y el CONTENIDO de las cadenas
 * sustituidos por espacios, conservando las posiciones para poder dar
 * el número de línea correcto.
 *
 * Es un recorredor de estados, no una expresión regular: una expresión
 * regular no puede saber si una comilla está dentro de un comentario.
 * Las expresiones regulares literales de JavaScript se detectan por el
 * token anterior, que es la única forma de distinguir `/x/` de una
 * división.
 */
function soloCodigo(txt) {
  const n = txt.length;
  const out = new Array(n);
  let i = 0;
  let anterior = ""; // último carácter significativo de código

  const blanco = (c) => (c === "\n" ? "\n" : " ");

  while (i < n) {
    const c = txt[i];
    const d = txt[i + 1];

    // --- comentario de línea ---
    if (c === "/" && d === "/") {
      while (i < n && txt[i] !== "\n") out[i] = " ", i++;
      continue;
    }
    // --- comentario de bloque ---
    if (c === "/" && d === "*") {
      out[i] = " "; out[i + 1] = " "; i += 2;
      while (i < n && !(txt[i] === "*" && txt[i + 1] === "/")) out[i] = blanco(txt[i]), i++;
      if (i < n) { out[i] = " "; out[i + 1] = " "; i += 2; }
      continue;
    }
    // --- cadena ---
    if (c === '"' || c === "'" || c === "`") {
      const cierre = c;
      out[i] = c; i++;
      while (i < n) {
        if (txt[i] === "\\") { out[i] = " "; out[i + 1] = " "; i += 2; continue; }
        if (txt[i] === cierre) break;
        out[i] = blanco(txt[i]); i++;
      }
      if (i < n) { out[i] = cierre; i++; }
      anterior = cierre;
      continue;
    }
    // --- expresión regular literal ---
    // Solo puede empezar donde no cabe una división: tras un operador,
    // una apertura, una coma o un punto y coma.
    if (c === "/" && (anterior === "" || "(,=:[!&|?{};+-*%~^<>".includes(anterior))) {
      out[i] = "/"; i++;
      let clase = false;
      while (i < n && txt[i] !== "\n") {
        if (txt[i] === "\\") { out[i] = " "; out[i + 1] = " "; i += 2; continue; }
        if (txt[i] === "[") clase = true;
        else if (txt[i] === "]") clase = false;
        else if (txt[i] === "/" && !clase) break;
        out[i] = blanco(txt[i]); i++;
      }
      if (i < n && txt[i] === "/") { out[i] = "/"; i++; }
      anterior = "/";
      continue;
    }

    out[i] = c;
    if (!/\s/.test(c)) anterior = c;
    i++;
  }
  return out.join("");
}

/** Número de línea (1-indexado) de una posición del texto. */
function lineaDe(txt, pos) {
  let n = 1;
  for (let i = 0; i < pos && i < txt.length; i++) if (txt[i] === "\n") n++;
  return n;
}

/**
 * Todas las apariciones de un identificador en código ejecutable.
 *
 * El carácter anterior puede ser un punto: casi todo lo que buscamos son
 * MÉTODOS —`SpreadsheetApp.getActiveSpreadsheet()`, `hoja.appendRow()`,
 * `...getScriptProperties().setProperty()`— y excluir el punto los dejaba
 * pasar todos. Lo que sí se exige es que detrás venga `(` o `.`, para que
 * `setValue` no dispare con `setValues` ni `getActive` con
 * `getActiveSpreadsheet`: cada uno se busca por separado.
 */
function aparicionesIdent(codigo, nombre) {
  const re = new RegExp("(^|[^\\w$])" + nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[.(]", "g");
  const res = [];
  let m;
  while ((m = re.exec(codigo)) !== null) res.push(lineaDe(codigo, m.index));
  return res;
}

/* ================================================================
   Carga del paquete
   ================================================================ */

const enCarpeta = readdirSync(PAQUETE).filter((f) => statSync(join(PAQUETE, f)).isFile());
const fuentes = {};

for (const f of ARCHIVOS_DEPLOY) {
  const p = join(PAQUETE, f);
  if (existsSync(p)) {
    const crudo = readFileSync(p, "utf8");
    fuentes[f] = { crudo, codigo: soloCodigo(crudo), ruta: p, bytes: readFileSync(p).length };
  }
}

const readmePath = join(PAQUETE, "README.md");
const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : null;

/* ================================================================
   1. Archivos del paquete
   ================================================================ */

bloque("1. ARCHIVOS DEL PAQUETE");

for (const f of ARCHIVOS_DEPLOY) {
  comprobar("existe " + f, !!fuentes[f], "falta en " + PAQUETE);
}

const gsEnCarpeta = enCarpeta.filter((f) => f.toLowerCase().endsWith(".gs"));
const gsInesperados = gsEnCarpeta.filter((f) => !ARCHIVOS_DEPLOY.includes(f));
comprobar("no hay ningún .gs inesperado en el paquete", gsInesperados.length === 0,
  gsInesperados.join(", ") + " — o entra al contrato de despliegue, o no vive aquí");

const legacyEnCarpeta = enCarpeta.filter((f) => ARCHIVOS_LEGACY.includes(f));
comprobar("no hay archivos del paquete anterior en el paquete de despliegue",
  legacyEnCarpeta.length === 0, legacyEnCarpeta.join(", "));

const otros = enCarpeta.filter((f) => !ARCHIVOS_DEPLOY.includes(f) && !ARCHIVOS_DOC.includes(f));
if (otros.length) avisar("archivos que NO se copian al editor y conviene revisar: " + otros.join(", "));

nota("se copian al editor: " + ARCHIVOS_DEPLOY.join(" · "));
nota("NO se copia: README.md (es documentación, no un archivo .gs)");

if (bloqueantes.length) {
  // Sin los tres archivos no tiene sentido seguir analizando.
  informar();
}

/* ================================================================
   2. Texto plano
   ================================================================ */

bloque("2. LOS ARCHIVOS SON TEXTO PLANO");

for (const f of [...ARCHIVOS_DEPLOY, ...(readme !== null ? ARCHIVOS_DOC : [])]) {
  const buf = readFileSync(join(PAQUETE, f));
  const malos = [];
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    if ((x < 0x20 && x !== 9 && x !== 10 && x !== 13) || x === 0x7f) malos.push(i);
  }
  comprobar(f + " sin bytes de control crudos", malos.length === 0,
    malos.length + " byte(s), el primero en la posición " + malos[0] +
    " — Git trataría el archivo como binario");
}

/* ================================================================
   3. Un único doGet, ningún doPost
   ================================================================ */

bloque("3. PUNTOS DE ENTRADA WEB");

const dondeDoGet = [];

for (const f of ARCHIVOS_DEPLOY) {
  const cod = fuentes[f].codigo;
  const g = [...cod.matchAll(/function\s+doGet\s*\(/g)];
  const p = [...cod.matchAll(/function\s+doPost\s*\(/g)];
  totalDoGet += g.length;
  totalDoPost += p.length;
  g.forEach((m) => dondeDoGet.push(f + ":" + lineaDe(cod, m.index)));
}

comprobar("exactamente 1 función doGet en todo el paquete", totalDoGet === 1,
  totalDoGet === 0 ? "no hay ninguna" : totalDoGet + " definiciones: " + dondeDoGet.join(", ") +
  " — Apps Script concatena todo en un ámbito global y gana la última, en silencio");
comprobar("ninguna función doPost", totalDoPost === 0, totalDoPost + " definición(es): la API es de solo lectura");

if (totalDoGet === 1) nota("doGet vive en " + dondeDoGet[0]);

/* ================================================================
   4. APIs prohibidas en runtime
   ================================================================ */

bloque("4. APIs PROHIBIDAS EN CÓDIGO EJECUTABLE");
nota("se analiza el código con los comentarios y las cadenas ya retirados");

for (const grupo of PROHIBIDAS) {
  const hallazgos = [];
  for (const nombre of grupo.nombres) {
    for (const f of ARCHIVOS_DEPLOY) {
      for (const ln of aparicionesIdent(fuentes[f].codigo, nombre)) {
        hallazgos.push(nombre + " (" + f + ":" + ln + ")");
      }
    }
  }
  comprobar("sin " + grupo.grupo, hallazgos.length === 0, hallazgos.join(", "));
}

for (const pat of PROHIBIDAS_PATRON) {
  const hallazgos = [];
  for (const f of ARCHIVOS_DEPLOY) {
    const re = new RegExp(pat.re.source, "g");
    let m;
    while ((m = re.exec(fuentes[f].codigo)) !== null) hallazgos.push(f + ":" + lineaDe(fuentes[f].codigo, m.index));
  }
  comprobar("sin " + pat.etiqueta + " (" + pat.grupo + ")", hallazgos.length === 0, hallazgos.join(", "));
}

/* ================================================================
   5. Origen del libro
   ================================================================ */

bloque("5. ORIGEN DEL LIBRO");

const todoCodigo = ARCHIVOS_DEPLOY.map((f) => fuentes[f].codigo).join("\n");
const todoCrudo = ARCHIVOS_DEPLOY.map((f) => fuentes[f].crudo).join("\n");

comprobar("se usa SpreadsheetApp.openById", /SpreadsheetApp\s*\.\s*openById\s*\(/.test(todoCodigo),
  "sin openById no hay forma admitida de abrir el libro");
comprobar("se lee la propiedad del script",
  /PropertiesService\s*\.\s*getScriptProperties\s*\(\s*\)/.test(todoCodigo),
  "el identificador del libro debe venir de una Script Property");
comprobar("el nombre de la propiedad es " + PROP_ESPERADA, todoCrudo.includes(PROP_ESPERADA),
  "el runbook y el código deben referirse a la misma propiedad");

// openById no puede alimentarse de la URL.
const openByIdArgs = [...todoCodigo.matchAll(/openById\s*\(\s*([^)]*)\)/g)].map((m) => m[1].trim());
const openByIdSospechoso = openByIdArgs.filter((a) => /parameter|parametro|e\s*\.|query|request/i.test(a));
comprobar("openById no recibe nada que venga de la petición", openByIdSospechoso.length === 0,
  openByIdSospechoso.join(" | ") + " — permitiría elegir el libro desde fuera");
nota("openById recibe: " + (openByIdArgs.join(" | ") || "(ninguna llamada)"));

/* ================================================================
   6. Secretos
   ================================================================ */

bloque("6. SECRETOS");

const objetivos = [...ARCHIVOS_DEPLOY, ...(readme !== null ? ARCHIVOS_DOC : [])];

for (const det of SECRETOS) {
  const hallazgos = [];
  for (const f of objetivos) {
    const txt = f === "README.md" ? readme : fuentes[f].crudo;
    const re = new RegExp(det.re.source, det.re.flags.includes("g") ? det.re.flags : det.re.flags + "g");
    let m;
    while ((m = re.exec(txt)) !== null) {
      const encontrado = m[0];
      if (det.filtro && !det.filtro(encontrado)) continue;
      hallazgos.push(f + ":" + lineaDe(txt, m.index) + " «" + encontrado.slice(0, 24) + "…»");
    }
  }
  comprobar("sin " + det.etiqueta, hallazgos.length === 0, hallazgos.join(", "));
}

if (PROHIBIDO_EXTRA) {
  const hallazgos = [];
  for (const f of objetivos) {
    const txt = f === "README.md" ? readme : fuentes[f].crudo;
    if (txt.includes(PROHIBIDO_EXTRA)) hallazgos.push(f);
  }
  comprobar("sin el valor prohibido indicado por quien opera", hallazgos.length === 0,
    "aparece en " + hallazgos.join(", "));
  nota("valor prohibido recibido por parámetro; no se imprime ni se guarda");
} else {
  avisar("no se comprobó el ID real del libro: pásalo con --prohibir=<valor> o " +
    "ARENAS_VALOR_PROHIBIDO para verificar que no está escrito en el paquete");
}

nota("el NOMBRE " + PROP_ESPERADA + " puede aparecer: es una clave, no un valor");

/* ================================================================
   7. Rastros del paquete anterior
   ================================================================ */

bloque("7. RASTROS DEL PAQUETE ANTERIOR");

for (const s of SIMBOLOS_LEGACY) {
  const hallazgos = [];
  for (const f of ARCHIVOS_DEPLOY) {
    const re = new RegExp("(^|[^\\w$.])" + s + "\\b", "g");
    let m;
    while ((m = re.exec(fuentes[f].codigo)) !== null) hallazgos.push(f + ":" + lineaDe(fuentes[f].codigo, m.index));
  }
  comprobar("sin dependencia de " + s, hallazgos.length === 0, hallazgos.join(", "));
}

/* ================================================================
   8. Versiones
   ================================================================ */

bloque("8. VERSIONES");

const mMayor = todoCrudo.match(/var\s+CONTRATO_MAYOR\s*=\s*['"]([^'"]+)['"]/);
const mApi = todoCrudo.match(/var\s+API_VERSION\s*=\s*['"]([^'"]+)['"]/);
contratoMayor = mMayor ? mMayor[1] : null;
apiVersion = mApi ? mApi[1] : null;

comprobar("CONTRATO_MAYOR está declarado", !!contratoMayor);
comprobar("API_VERSION está declarada", !!apiVersion);

// El frontend exige que el mayor coincida. Se lee del código real.
const schemaPath = join(RAIZ, "assets/js/catalogo/catalogo-schema.js");
if (existsSync(schemaPath)) {
  const sch = readFileSync(schemaPath, "utf8");
  const mv = sch.match(/VERSION\s*[:=]\s*['"]([^'"]+)['"]/);
  if (mv) versionFrontend = mv[1];
}
comprobar("la versión de contrato del backend coincide con la del frontend",
  !!contratoMayor && !!versionFrontend && contratoMayor === versionFrontend,
  "backend=" + contratoMayor + " frontend=" + versionFrontend +
  " — una discrepancia hace que el frontend descarte TODA respuesta y caiga al archivo local");

comprobar("CONTRATO_MAYOR y API_VERSION son cosas distintas", contratoMayor !== apiVersion,
  "ambas valen " + contratoMayor + ": el contrato de datos y la interfaz del endpoint versionan por separado");

nota("contrato de datos: " + contratoMayor + "   ·   interfaz del endpoint: " + apiVersion);

/* ================================================================
   9. README
   ================================================================ */

bloque("9. README DEL PAQUETE");

if (readme === null) {
  comprobar("existe README.md junto al paquete", false, "quien despliega necesita las instrucciones");
} else {
  for (const ex of README_EXIGE) {
    comprobar("el README deja claro: " + ex.clave, ex.re.test(readme));
  }
}

/* ================================================================
   10. Huellas
   ================================================================ */

bloque("10. HUELLAS DEL PAQUETE");
nota("sirven para confirmar mañana que lo pegado en el editor es exactamente esto");

for (const f of ARCHIVOS_DEPLOY) {
  const h = createHash("sha256").update(readFileSync(join(PAQUETE, f))).digest("hex");
  huellas[f] = h;
  lineas.push("       " + f.padEnd(18) + h.slice(0, 32) + "…  " + String(fuentes[f].bytes).padStart(6) + " bytes");
}

/* ================================================================
   Informe
   ================================================================ */

function informar() {
  const ok = bloqueantes.length === 0;

  if (JSON_MODE) {
    console.log(JSON.stringify({
      resultado: ok ? "PASS" : "FAIL",
      paquete: PAQUETE,
      archivos: ARCHIVOS_DEPLOY.filter((f) => !!fuentes[f]),
      doGet: totalDoGet,
      doPost: totalDoPost,
      contrato_mayor: contratoMayor,
      api_version: apiVersion,
      version_frontend: versionFrontend,
      huellas,
      bloqueantes,
      avisos,
    }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  console.log("ARENAS — GUARDA PRE-DESPLIEGUE DEL BACKEND APPS SCRIPT v2");
  console.log("paquete: " + PAQUETE);
  console.log(lineas.join("\n"));

  if (avisos.length) {
    console.log("");
    console.log("AVISOS (" + avisos.length + ")");
    avisos.forEach((a) => console.log("  · " + a));
  }

  console.log("");
  console.log("================================================================");
  if (ok) {
    console.log("PREDEPLOY PASS");
    console.log("");
    console.log("El paquete es apto en todo lo que se puede juzgar sin desplegar.");
    console.log("Queda pendiente de comprobar EN EL DESPLIEGUE REAL: CORS, los");
    console.log("permisos del Web App y el JSON servido. Ver");
    console.log("docs/runbook-deploy-apps-script-v2.md.");
  } else {
    console.log("PREDEPLOY FAIL — " + bloqueantes.length + " bloqueante(s)");
    console.log("");
    bloqueantes.forEach((b) => console.log("  · " + b.desc + (b.detalle ? "  → " + b.detalle : "")));
    console.log("");
    console.log("NO DESPLEGAR hasta resolverlos.");
  }
  process.exit(ok ? 0 : 1);
}

informar();
