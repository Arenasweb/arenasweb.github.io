#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-endpoint-real-tests.mjs
   Prueba que el banco del endpoint real DETECTA de verdad.
   Sin dependencias, sin red externa.

       node scripts/qa-endpoint-real-tests.mjs

   POR QUÉ EXISTE
   `qa-endpoint-real.mjs` se escribió para un despliegue que todavía no
   existe. Entregar una herramienta sin ejercitar es entregar una
   suposición: el día del despliegue no es momento de descubrir que el
   verificador tenía un fallo.

   CÓMO LO HACE
   Levanta un servidor HTTP en 127.0.0.1 que IMITA las respuestas de
   Apps Script —la correcta y una colección de averías— y ejecuta el
   banco REAL como SUBPROCESO contra él. No reimplementa sus
   comprobaciones.

   Lo que NO puede probar: CORS. Un servidor local puede mandar las
   cabeceras que quiera; lo que hace Google con las suyas solo se sabe
   desplegando. Por eso CORS tiene su propio banco, en el navegador.

   exit 0 → el banco detecta todo lo que debe
   exit 1 → algo se le escaparía
   ================================================================ */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BANCO = join(RAIZ, "scripts", "qa-endpoint-real.mjs");

let ok = 0;
const fallos = [];

/* ================================================================
   Respuestas de referencia
   ================================================================ */

const SALUD_OK = {
  ok: true,
  servicio: "arenas-catalogo",
  api_version: "1.0",
  version: "2",
  configurado: true,
};

/** El catálogo tal y como debe responder HOY: vacío y correcto. */
function catalogoOk() {
  return {
    ok: true,
    version: "2",
    api_version: "1.0",
    generated_at: new Date().toISOString(),
    config: {
      mostrar_precios: false,
      mostrar_promociones: false,
      titulo_catalogo: "Catálogo",
      api_version: "1.0",
    },
    categorias: [],
    modelos: [],
    colores: [],
  };
}

/* ================================================================
   Escenarios del servidor
   ================================================================ */

const ESCENARIOS = {
  /** El endpoint tal y como debe comportarse hoy. */
  sano: (accion, params) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    if (accion !== "catalogo") return [200, "application/json", { ok: false, error: "accion_desconocida" }];
    return [200, "application/json", catalogoOk()];
  },

  sinConfigurar: (accion) => {
    if (accion === "salud") return [200, "application/json", { ...SALUD_OK, configurado: false }];
    return [200, "application/json", {
      ok: false, version: "2", api_version: "1.0",
      error: "backend_no_configurado", mensaje: "El catálogo no está disponible en este momento.",
    }];
  },

  versionMala: (accion) => {
    if (accion === "salud") return [200, "application/json", { ...SALUD_OK, version: "1" }];
    return [200, "application/json", { ...catalogoOk(), version: "1" }];
  },

  clavesEnIngles: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    const c = catalogoOk();
    return [200, "application/json", {
      ok: c.ok, version: c.version, api_version: c.api_version, generated_at: c.generated_at,
      config: c.config, categories: [], models: [], colors: [],
    }];
  },

  fugaDiagnostico: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    return [200, "application/json", {
      ...catalogoOk(),
      _diagnostico: ["MW-01: falta imagen_principal"],
      _cache_segundos: 300,
    }];
  },

  fugaStock: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    const c = catalogoOk();
    c.modelos = [{ id: "moto-x", slug: "moto-x", modelo: "X", categoria: "ciudad", stock_real: 4 }];
    return [200, "application/json", c];
  },

  fugaIdLibro: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    const c = catalogoOk();
    c.config.origen = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEF";
    return [200, "application/json", c];
  },

  publicaSinDeber: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    const c = catalogoOk();
    c.modelos = [{
      id: "moto-pulsar-180-neon", slug: "pulsar-180-neon", modelo: "Pulsar 180 Neon",
      categoria: "ciudad", imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp",
      precio: 9990,
    }];
    c.categorias = [{ slug: "ciudad", titulo: "Ciudad", descripcion: "", orden: 1 }];
    return [200, "application/json", c];
  },

  /** Un parámetro cambia los datos: el fallo más grave posible. */
  obedeceParametros: (accion, params) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    const c = catalogoOk();
    if (params.get("preview") === "1" || params.get("borrador") === "1") {
      c.modelos = [{ id: "moto-borrador", slug: "borrador", modelo: "Borrador", categoria: "ciudad" }];
    }
    return [200, "application/json", c];
  },

  /** Una acción desconocida cae al catálogo en vez de rechazarse. */
  accionPermisiva: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    return [200, "application/json", catalogoOk()];
  },

  /** El error escupe la traza. */
  errorConTraza: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    if (accion === "catalogo") return [200, "application/json", catalogoOk()];
    return [200, "application/json", {
      ok: false,
      error: "Exception: no se pudo abrir el libro 1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEF\n  at doGet (Endpoint.gs:46)",
    }];
  },

  noEsJson: (accion) => {
    if (accion === "salud") return [200, "application/json", SALUD_OK];
    return [200, "text/html", "<!doctype html><h1>Se ha producido un error</h1>"];
  },

  tipoMimeMal: (accion) => {
    if (accion === "salud") return [200, "text/html", SALUD_OK];
    return [200, "text/html", catalogoOk()];
  },

  http500: () => [500, "application/json", { ok: false }],

  /** No responde: prueba el timeout. */
  colgado: null,
};

/* ================================================================
   Servidor
   ================================================================ */

let escenarioActivo = "sano";

const servidor = createServer((req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  const accion = u.searchParams.get("action") || "catalogo";
  const fn = ESCENARIOS[escenarioActivo];

  if (fn === null) return; // colgado: nunca responde

  const [status, tipo, cuerpo] = fn(accion, u.searchParams);
  res.writeHead(status, { "Content-Type": tipo });
  res.end(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo));
});

await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const PUERTO = servidor.address().port;
const URL_BANCO = "http://127.0.0.1:" + PUERTO + "/exec";

console.log("ARENAS — PRUEBAS DEL BANCO DEL ENDPOINT REAL");
console.log("emulador de Apps Script en " + URL_BANCO);
console.log("");

/* ================================================================
   Utilidades
   ================================================================ */

/**
 * Lanza el banco como subproceso SIN bloquear el bucle de eventos.
 *
 * Aquí no cabe spawnSync: el emulador vive en ESTE mismo proceso, y una
 * espera síncrona impediría al servidor atender al hijo. El resultado
 * sería un interbloqueo perfecto — el padre esperando al hijo, el hijo
 * esperando al padre.
 */
function correr(args, timeoutProceso = 60000, env) {
  return new Promise((resolve) => {
    const hijo = spawn(process.execPath, args, {
      env: env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "", err = "";
    hijo.stdout.on("data", (d) => { out += d; });
    hijo.stderr.on("data", (d) => { err += d; });
    const reloj = setTimeout(() => hijo.kill("SIGKILL"), timeoutProceso);
    hijo.on("close", (code) => {
      clearTimeout(reloj);
      let datos = null;
      try { datos = JSON.parse(out); } catch (e) { /* se informa arriba */ }
      resolve({ code, datos, stdout: out, stderr: err });
    });
  });
}

function ejecutar(extra = [], timeout = 6000) {
  return correr([BANCO, "--endpoint=" + URL_BANCO, "--timeout=" + timeout, "--json", ...extra]);
}

async function caso(titulo, escenario, esperado, pista, extra) {
  escenarioActivo = escenario;
  const r = await ejecutar(extra);
  if (!r.datos) {
    fallos.push(titulo + " → la salida no es JSON interpretable: " + (r.stdout || r.stderr).slice(0, 160));
    return;
  }
  if (r.datos.resultado !== esperado) {
    const dice = r.datos.fallos.map((f) => f.desc).join(" | ");
    fallos.push(titulo + " → dio " + r.datos.resultado + ", se esperaba " + esperado +
      (dice ? ". Fallos: " + dice.slice(0, 160) : ""));
    return;
  }
  if (pista) {
    const motivos = r.datos.fallos.map((f) => f.desc + " " + (f.detalle || "")).join(" | ");
    if (!new RegExp(pista, "i").test(motivos)) {
      fallos.push(titulo + " → falla, pero por otra cosa: " + motivos.slice(0, 180));
      return;
    }
  }
  ok++;
  console.log("  ok    " + titulo);
}

/* ================================================================
   Casos
   ================================================================ */

try {
  console.log("CONTROL");
  await caso("un endpoint sano y vacío pasa (0 modelos es lo correcto hoy)", "sano", "PASS");

  console.log("");
  console.log("AVERÍAS QUE DEBE CAZAR");
  await caso("la Script Property sin configurar", "sinConfigurar", "FAIL", "configurado|ok = true");
  await caso("versión de contrato incompatible con el frontend", "versionMala", "FAIL", "version");
  await caso("claves en inglés (models/categories/colors)", "clavesEnIngles", "FAIL", "ingl[ée]s|array");
  await caso("fuga del diagnóstico interno", "fugaDiagnostico", "FAIL", "_diagnostico|guion bajo");
  await caso("fuga de stock en un modelo", "fugaStock", "FAIL", "stock");
  await caso("fuga del identificador del libro", "fugaIdLibro", "FAIL", "identificador");
  await caso("publica modelos cuando el CMS está entero en BORRADOR", "publicaSinDeber", "FAIL", "0 modelos publicados");
  await caso("un parámetro de la URL cambia los datos", "obedeceParametros", "FAIL", "mismo contrato");
  await caso("una acción desconocida cae al catálogo en vez de rechazarse", "accionPermisiva", "FAIL", "se rechaza");
  await caso("un error que escupe la traza y el identificador", "errorConTraza", "FAIL", "traza|identificador");
  await caso("la respuesta no es JSON", "noEsJson", "FAIL", "JSON interpretable");
  await caso("el Content-Type no es JSON", "tipoMimeMal", "FAIL", "Content-Type");
  await caso("HTTP 500", "http500", "FAIL", "HTTP 200|JSON");

  console.log("");
  console.log("RED");
  {
    escenarioActivo = "colgado";
    const r = await ejecutar([], 1500);
    if (r.datos && r.datos.resultado === "FAIL" &&
        /timeout/i.test(r.datos.fallos.map((f) => f.detalle || "").join(" "))) {
      ok++;
      console.log("  ok    un endpoint que no responde da timeout, no se queda colgado");
    } else {
      fallos.push("timeout → " + (r.datos ? r.datos.resultado : "sin JSON"));
    }
  }

  console.log("");
  console.log("VALOR PROHIBIDO");
  {
    escenarioActivo = "sano";
    // `titulo_catalogo` es una CLAVE de config: comprueba que la búsqueda
    // entra en objetos anidados y mira también los nombres, no solo los
    // valores. Es donde se escondería un `spreadsheetId`.
    const r = await ejecutar(["--prohibir=titulo_catalogo"]);
    if (r.datos && r.datos.resultado === "FAIL" &&
        /valor prohibido/i.test(r.datos.fallos.map((f) => f.desc).join(" "))) {
      ok++;
      console.log("  ok    detecta un valor prohibido anidado en la respuesta");
    } else {
      fallos.push("--prohibir con valor presente → " + (r.datos ? r.datos.resultado : "sin JSON"));
    }

    // Y en la sonda de salud, que es la otra vía por la que se escaparía.
    const rs = await ejecutar(["--prohibir=arenas-catalogo"]);
    if (rs.datos && rs.datos.resultado === "FAIL" &&
        /valor prohibido/i.test(rs.datos.fallos.map((f) => f.desc).join(" "))) {
      ok++;
      console.log("  ok    detecta un valor prohibido presente solo en ?action=salud");
    } else {
      fallos.push("--prohibir sobre salud → " + (rs.datos ? rs.datos.resultado : "sin JSON"));
    }
    const r2 = await ejecutar(["--prohibir=cadena-que-no-esta-en-la-respuesta"]);
    if (r2.datos && r2.datos.resultado === "PASS") {
      ok++;
      console.log("  ok    un valor prohibido ausente no provoca falso positivo");
    } else {
      fallos.push("--prohibir con valor ausente → " + (r2.datos ? r2.datos.resultado : "sin JSON"));
    }
  }

  console.log("");
  console.log("USO INVÁLIDO");
  {
    const sinUrl = await correr([BANCO], 20000, { ...process.env, ARENAS_APPS_SCRIPT_ENDPOINT: "" });
    if (sinUrl.code === 2) { ok++; console.log("  ok    sin URL da exit=2, no PASS"); }
    else fallos.push("sin URL → exit=" + sinUrl.code + ", se esperaba 2");

    const httpRemoto = await correr([BANCO, "--endpoint=http://ejemplo.com/exec"], 20000);
    if (httpRemoto.code === 2) { ok++; console.log("  ok    http contra un host remoto se rechaza"); }
    else fallos.push("http remoto → exit=" + httpRemoto.code + ", se esperaba 2");

    const noUrl = await correr([BANCO, "--endpoint=no-es-una-url"], 20000);
    if (noUrl.code === 2) { ok++; console.log("  ok    una URL inutilizable se rechaza"); }
    else fallos.push("URL inutilizable → exit=" + noUrl.code + ", se esperaba 2");
  }
} finally {
  servidor.close();
}

/* ================================================================
   Resultado
   ================================================================ */

console.log("");
console.log("================================================================");
if (fallos.length === 0) {
  console.log("RESULTADO: " + ok + "/" + ok + " comprobaciones correctas.");
  console.log("");
  console.log("El banco del endpoint detecta las averías probadas y no se alarma");
  console.log("con un catálogo legítimamente vacío.");
  console.log("");
  console.log("CORS queda fuera de esta prueba a propósito: un servidor local puede");
  console.log("mandar las cabeceras que quiera. Se prueba en el navegador, con");
  console.log("tests/manual/endpoint-cors-test.html, contra el despliegue real.");
  process.exit(0);
}
console.log("RESULTADO: " + fallos.length + " comprobación(es) del banco no se sostienen.");
console.log("");
fallos.forEach((f) => console.log("  · " + f));
process.exit(1);
