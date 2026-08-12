#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-predeploy-tests.mjs
   Prueba que la guarda pre-despliegue DETECTA de verdad.
   Sin dependencias, sin red.

       node scripts/qa-predeploy-tests.mjs

   POR QUÉ EXISTE
   Que `qa-predeploy-apps-script.mjs` diga PASS sobre el paquete bueno
   no demuestra nada: un script que siempre responde PASS también lo
   diría. Lo único que demuestra que la guarda sirve es verla FALLAR
   ante paquetes que deben fallar.

   CÓMO LO HACE
   Copia el paquete real a una carpeta temporal, le introduce UN defecto
   concreto, y ejecuta la guarda REAL como SUBPROCESO. No reimplementa
   su lógica: si lo hiciera, la prueba solo comprobaría que dos copias
   del mismo error coinciden.

   Las carpetas temporales se borran al terminar, pasen o fallen las
   pruebas.

   exit 0 → la guarda detecta todo lo que debe
   exit 1 → hay un defecto que se le escaparía
   ================================================================ */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GUARDA = join(RAIZ, "scripts", "qa-predeploy-apps-script.mjs");
const ORIGEN = join(RAIZ, "apps-script", "v2");
const BANCO = join(tmpdir(), "arenas-predeploy-" + process.pid);

const ARCHIVOS = ["Configuracion.gs", "Nucleo.gs", "Endpoint.gs", "README.md"];

let ok = 0;
const fallos = [];

/* ================================================================
   Utilidades
   ================================================================ */

function copiarPaquete(nombre) {
  const destino = join(BANCO, nombre);
  mkdirSync(destino, { recursive: true });
  for (const f of ARCHIVOS) copyFileSync(join(ORIGEN, f), join(destino, f));
  return destino;
}

/** Ejecuta la guarda REAL como subproceso y devuelve su veredicto. */
function ejecutarGuarda(dir) {
  const r = spawnSync(process.execPath, [GUARDA, "--paquete", dir, "--json"], {
    encoding: "utf8",
    timeout: 30000,
  });
  let datos = null;
  try {
    datos = JSON.parse(r.stdout);
  } catch (e) {
    /* si no parsea, lo tratamos como salida no interpretable */
  }
  return { code: r.status, datos, stdout: r.stdout, stderr: r.stderr };
}

function editar(dir, archivo, fn) {
  const p = join(dir, archivo);
  writeFileSync(p, fn(readFileSync(p, "utf8")), "utf8");
}

/**
 * Un caso hostil: se espera FAIL, y además que el motivo mencione algo
 * concreto. Comprobar solo el código de salida dejaría pasar una guarda
 * que fallara por la razón equivocada.
 */
function casoHostil(titulo, preparar, pistaEsperada) {
  const dir = copiarPaquete("caso-" + (ok + fallos.length + 1));
  try {
    preparar(dir);
  } catch (e) {
    fallos.push(titulo + " → no se pudo preparar el caso: " + e.message);
    return;
  }
  const r = ejecutarGuarda(dir);

  if (r.code !== 1) {
    fallos.push(titulo + " → la guarda respondió exit=" + r.code + ", se esperaba 1 (FAIL)");
    return;
  }
  if (!r.datos || r.datos.resultado !== "FAIL") {
    fallos.push(titulo + " → la salida JSON no dice FAIL");
    return;
  }
  const motivos = r.datos.bloqueantes.map((b) => b.desc + " " + (b.detalle || "")).join(" | ");
  if (pistaEsperada && !new RegExp(pistaEsperada, "i").test(motivos)) {
    fallos.push(titulo + " → falla, pero por otra cosa. Motivos: " + motivos.slice(0, 180));
    return;
  }
  ok++;
  console.log("  ok    detecta: " + titulo);
}

/** Un caso que NO debe disparar la guarda (protección contra falsos positivos). */
function casoLimpio(titulo, preparar) {
  const dir = copiarPaquete("limpio-" + (ok + fallos.length + 1));
  if (preparar) preparar(dir);
  const r = ejecutarGuarda(dir);
  if (r.code !== 0) {
    const motivos = r.datos ? r.datos.bloqueantes.map((b) => b.desc).join(" | ") : r.stdout.slice(0, 200);
    fallos.push(titulo + " → FALSO POSITIVO, la guarda falla sin motivo: " + motivos);
    return;
  }
  ok++;
  console.log("  ok    no se alarma: " + titulo);
}

/* ================================================================
   Ejecución
   ================================================================ */

if (!existsSync(ORIGEN)) {
  console.error("No se encuentra el paquete real en " + ORIGEN);
  process.exit(2);
}

mkdirSync(BANCO, { recursive: true });
console.log("ARENAS — PRUEBAS DE LA GUARDA PRE-DESPLIEGUE");
console.log("banco temporal: " + BANCO);
console.log("");

try {
  /* --- control: el paquete real, copiado sin tocar --- */
  console.log("CONTROL");
  casoLimpio("el paquete real sin modificar pasa");

  /* --- falsos positivos --- */
  console.log("");
  console.log("FALSOS POSITIVOS (lo prohibido, pero solo mencionado)");

  casoLimpio("un comentario que nombra las APIs prohibidas", (dir) => {
    editar(dir, "Nucleo.gs", (t) =>
      "/* Recordatorio: aquí NUNCA se usa getActiveSpreadsheet(), ni setValue(),\n" +
      "   ni appendRow(), ni DriveApp, ni UrlFetchApp, ni eval(). */\n" +
      "// Tampoco insertSheet() ni deleteSheet() ni setProperty().\n" + t);
  });

  casoLimpio("una cadena que contiene texto prohibido", (dir) => {
    editar(dir, "Nucleo.gs", (t) =>
      "var AVISOS_QA_ = ['no usar setValue(', 'no usar getActiveSpreadsheet(', 'DriveApp prohibido'];\n" + t);
  });

  casoLimpio("el nombre de la Script Property, que es una clave y no un valor", (dir) => {
    editar(dir, "Nucleo.gs", (t) =>
      "// La propiedad se llama ARENAS_CATALOGO_SPREADSHEET_ID y su valor no vive aquí.\n" + t);
  });

  /* --- casos hostiles --- */
  console.log("");
  console.log("PAQUETES HOSTILES");

  casoHostil("un segundo doGet (el fallo que gana en silencio)", (dir) => {
    editar(dir, "Configuracion.gs", (t) => t + "\n\nfunction doGet(e) {\n  return null;\n}\n");
  }, "doGet");

  casoHostil("un doPost, cuando la API es de solo lectura", (dir) => {
    editar(dir, "Configuracion.gs", (t) => t + "\n\nfunction doPost(e) {\n  return null;\n}\n");
  }, "doPost");

  casoHostil("getActiveSpreadsheet como respaldo (el defecto C-1)", (dir) => {
    editar(dir, "Endpoint.gs", (t) =>
      t.replace("var libro;", "var libro = SpreadsheetApp.getActiveSpreadsheet();"));
  }, "libro activo|getActive");

  casoHostil("una escritura en celdas", (dir) => {
    editar(dir, "Nucleo.gs", (t) => t + "\nfunction marcar_(hoja) {\n  hoja.getRange('A1').setValue('x');\n}\n");
  }, "escritura en celdas");

  casoHostil("appendRow escondido al final", (dir) => {
    editar(dir, "Nucleo.gs", (t) => t + "\nfunction registrar2_(hoja, fila) {\n  hoja.appendRow(fila);\n}\n");
  }, "escritura en celdas");

  casoHostil("escritura de una propiedad del script", (dir) => {
    editar(dir, "Endpoint.gs", (t) => t +
      "\nfunction configurar_(v) {\n  PropertiesService.getScriptProperties().setProperty(PROP_ID_LIBRO, v);\n}\n");
  }, "escritura de propiedades");

  casoHostil("una llamada de red saliente", (dir) => {
    editar(dir, "Endpoint.gs", (t) => t +
      "\nfunction avisar_(u) {\n  UrlFetchApp.fetch(u);\n}\n");
  }, "servicios fuera de alcance");

  casoHostil("new Function como ejecución dinámica", (dir) => {
    editar(dir, "Nucleo.gs", (t) => t + "\nfunction compilar_(s) {\n  return new Function('x', s);\n}\n");
  }, "ejecución dinámica|new Function");

  casoHostil("salida HTML en vez de JSON", (dir) => {
    editar(dir, "Endpoint.gs", (t) => t +
      "\nfunction pagina_() {\n  return HtmlService.createHtmlOutput('<p>hola</p>');\n}\n");
  }, "salida no JSON");

  casoHostil("el identificador del libro escrito en el código", (dir) => {
    editar(dir, "Configuracion.gs", (t) =>
      t + "\nvar ID_DE_RESPALDO = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEF';\n");
  }, "identificador de Google Sheets");

  casoHostil("una URL de despliegue pegada en el código", (dir) => {
    editar(dir, "Configuracion.gs", (t) =>
      t + "\nvar ENDPOINT = 'https://script.google.com/macros/s/AKfycbxDEMO123456789/exec';\n");
  }, "URL de despliegue|identificador de Google Sheets");

  casoHostil("un token con valor", (dir) => {
    editar(dir, "Configuracion.gs", (t) => t + "\nvar api_key = 'sk-demo-0123456789abcdef';\n");
  }, "token con valor|identificador");

  casoHostil("openById alimentado desde la petición", (dir) => {
    editar(dir, "Endpoint.gs", (t) =>
      t.replace("SpreadsheetApp.openById(id)", "SpreadsheetApp.openById(e.parameter.spreadsheetId)"));
  }, "openById no recibe");

  casoHostil("un archivo del paquete anterior dentro del de despliegue", (dir) => {
    writeFileSync(join(dir, "Code.gs"), "// paquete anterior\nfunction doGet(e) { return null; }\n", "utf8");
  }, "paquete anterior|doGet");

  casoHostil("un .gs extra que nadie declaró", (dir) => {
    writeFileSync(join(dir, "Extra.gs"), "function util_() { return 1; }\n", "utf8");
  }, "inesperado");

  casoHostil("falta uno de los tres archivos", (dir) => {
    rmSync(join(dir, "Nucleo.gs"));
  }, "existe Nucleo.gs");

  casoHostil("una dependencia del backend anterior", (dir) => {
    editar(dir, "Nucleo.gs", (t) => t + "\nfunction puente_() {\n  return construirCatalogoPublico();\n}\n");
  }, "construirCatalogoPublico");

  casoHostil("la versión de contrato deja de coincidir con el frontend", (dir) => {
    editar(dir, "Configuracion.gs", (t) => t.replace(/var CONTRATO_MAYOR = '2'/, "var CONTRATO_MAYOR = '3'"));
  }, "versión de contrato");

  casoHostil("un byte de control crudo que vuelve binario el archivo", (dir) => {
    const p = join(dir, "Nucleo.gs");
    const b = readFileSync(p);
    writeFileSync(p, Buffer.concat([b, Buffer.from([0x00]), Buffer.from("\n")]));
  }, "control crudos");

  casoHostil("el README deja de advertir que hay un único doGet", (dir) => {
    editar(dir, "README.md", (t) =>
      t.replace(/una\s+sola\s+vez/gi, "las veces que haga falta")
       .replace(/[úu]nico\s*`?doGet/gi, "algún doGet")
       .replace(/exactamente\s+un\s+`?doGet/gi, "algún doGet"));
  }, "único doGet");

  casoHostil("el README pierde la instrucción de sustituir en vez de añadir", (dir) => {
    editar(dir, "README.md", (t) => t.replace(/Sustituir,?\s*no\s+a[ñn]adir/gi, "Añadir al proyecto"));
  }, "sustituir");

  casoHostil("el README pierde el estado del despliegue real", (dir) => {
    editar(dir, "README.md", (t) =>
      t.replace(/DESPLEGADO\s+Y\s+VALIDADO/gi, "ESTADO DESCONOCIDO")
       .replace(/Estado\s+del\s+11\/08\/2026/gi, "Estado sin registrar"));
  }, "estado de despliegue");

  casoHostil("el README deja de señalar el QA en producción pendiente", (dir) => {
    editar(dir, "README.md", (t) =>
      t.replace(/QA\s+en\s+producci[oó]n/gi, "prueba posterior")
       .replace(/paso\s+12[^.\n]*pendiente/gi, "paso final sin estado"));
  }, "QA en producción pendiente");

  /* --- valor prohibido pasado por parámetro --- */
  console.log("");
  console.log("VALOR PROHIBIDO POR PARÁMETRO");

  {
    const dir = copiarPaquete("prohibido");
    // Con puntos a propósito: así NO parece un identificador de Sheets y la
    // prueba aísla el mecanismo de --prohibir en vez de mezclarlo con la
    // heurística de identificadores, que ya se prueba por separado.
    const centinela = "centinela.valor.que.no.debe.estar";
    editar(dir, "Configuracion.gs", (t) => t + "\n// " + centinela + "\n");
    const r = spawnSync(process.execPath, [GUARDA, "--paquete", dir, "--prohibir=" + centinela, "--json"],
      { encoding: "utf8", timeout: 30000 });
    let datos = null;
    try { datos = JSON.parse(r.stdout); } catch (e) { /* no interpretable */ }
    const motivos = datos ? datos.bloqueantes.map((b) => b.desc).join(" | ") : "";
    if (r.status === 1 && /valor prohibido/i.test(motivos)) {
      ok++;
      console.log("  ok    detecta: un valor prohibido pasado con --prohibir");
    } else {
      fallos.push("--prohibir → exit=" + r.status + " motivos: " + motivos.slice(0, 160));
    }
    // Y sin pasar --prohibir, ese mismo paquete debe pasar: la guarda no
    // puede conocer el valor por su cuenta.
    const r2 = ejecutarGuarda(dir);
    if (r2.code === 0) {
      ok++;
      console.log("  ok    sin --prohibir, ese mismo paquete pasa (la guarda no adivina el valor)");
    } else {
      fallos.push("sin --prohibir el paquete debería pasar, y dio exit=" + r2.code);
    }
  }

  /* --- la guarda se niega ante un paquete inexistente --- */
  {
    const r = spawnSync(process.execPath, [GUARDA, "--paquete", join(BANCO, "no-existe"), "--json"],
      { encoding: "utf8", timeout: 30000 });
    if (r.status === 2) {
      ok++;
      console.log("  ok    un paquete inexistente da exit=2 (uso inválido), no PASS");
    } else {
      fallos.push("paquete inexistente → exit=" + r.status + ", se esperaba 2");
    }
  }
} finally {
  rmSync(BANCO, { recursive: true, force: true });
}

/* ================================================================
   Resultado
   ================================================================ */

console.log("");
console.log("================================================================");
if (fallos.length === 0) {
  console.log("RESULTADO: " + ok + "/" + ok + " comprobaciones correctas.");
  console.log("");
  console.log("La guarda detecta todos los defectos hostiles probados y no se");
  console.log("alarma con menciones en comentarios ni en cadenas.");
  console.log("Banco temporal eliminado.");
  process.exit(0);
}
console.log("RESULTADO: " + fallos.length + " defecto(s) se le escaparían a la guarda.");
console.log("");
fallos.forEach((f) => console.log("  · " + f));
console.log("");
console.log("Corregir scripts/qa-predeploy-apps-script.mjs antes de confiar en su PASS.");
process.exit(1);
