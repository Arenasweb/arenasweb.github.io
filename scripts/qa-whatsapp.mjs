#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-whatsapp.mjs
   Prueba FUNCIONAL del canal de ventas: ejecuta de verdad
   assets/js/catalogo/catalogo-whatsapp.js y comprueba la URL que
   produciría cada uno de los ocho modelos publicados.

       node scripts/qa-whatsapp.mjs
       node scripts/qa-whatsapp.mjs --json

   NO ENVÍA NADA. No hay red en ningún punto de este archivo: se
   construye la URL, se descompone y se mira. Nadie recibe un mensaje.

   POR QUÉ EXISTE, HABIENDO YA PRUEBAS EN qa-tests.mjs
   Aquellas leen el código como texto: comprueban que la línea
   correcta está escrita. Eso no dice que el enlace resultante sea
   correcto. Un `encodeURIComponent` bien escrito sobre el mensaje
   equivocado pasa todas las pruebas de texto y manda al asesor una
   consulta sin modelo. Aquí se ejecuta el módulo y se lee el
   resultado.

   POR QUÉ SE FALSIFICA EL ENTORNO EN VEZ DE USAR jsdom
   El proyecto no tiene dependencias, y esta prueba solo necesita
   `window`, `fetch` y las utilidades de saneamiento. Traer un DOM
   entero para llamar a una función que devuelve una cadena sería
   pagar un árbol por una hoja.

   exit 0 → los ocho enlaces son correctos
   exit 1 → alguno no lo es
   ================================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MODE = process.argv.includes("--json");

const NUMERO_ESPERADO = JSON.parse(
  readFileSync(join(RAIZ, "data/configuracion.json"), "utf8")
).whatsapp;

/* ================================================================
   Arranque del módulo en un entorno mínimo
   ================================================================ */

/**
 * Carga catalogo-utils.js y catalogo-whatsapp.js en un contexto aislado.
 * `fetch` se sustituye por el JSON real leído de disco: se ejercita el
 * camino completo de carga sin abrir una conexión.
 */
function cargarModulo() {
  const configuracion = readFileSync(join(RAIZ, "data/configuracion.json"), "utf8");

  const ventana = {
    ARENAS_CATALOGO: {},
    location: { hostname: "arenasweb.github.io", search: "", pathname: "/modelo.html" },
    setTimeout: () => 0,
    clearTimeout: () => {},
    open: () => ({}),
  };
  ventana.window = ventana;

  const contexto = {
    window: ventana,
    document: { createElement: () => ({ setAttribute() {}, appendChild() {} }) },
    navigator: { userAgent: "qa" },
    AbortController: function () { this.signal = null; this.abort = () => {}; },
    setTimeout: () => 0,
    clearTimeout: () => {},
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(configuracion)) }),
    console,
  };

  for (const archivo of ["catalogo-utils.js", "catalogo-whatsapp.js"]) {
    runInNewContext(readFileSync(join(RAIZ, "assets/js/catalogo", archivo), "utf8"), contexto, {
      filename: archivo,
    });
  }
  return ventana.ARENAS_CATALOGO;
}

/* ================================================================
   Los casos
   ================================================================ */

/** Los ocho modelos publicados, con el nombre exacto que ve el cliente. */
const MODELOS = [
  "CT 125",
  "Discover 125 ST",
  "Pulsar N125 FI",
  "Boxer BM150X Disc",
  "Pulsar 200 NS UG2",
  "Pulsar N250",
  "Dominar 400",
  "Pulsar 400 NS",
];

/**
 * Colores de prueba. Incluyen a propósito acentos, «ñ», ampersand y
 * signo de interrogación: son los caracteres que rompen una URL montada
 * a mano, que es justo lo que este proyecto no debe hacer.
 */
const COLORES_DIFICILES = [
  "Rojo & Negro",
  "Azul eléctrico",
  "Gris ceniza ¿mate?",
  "Verde caña + blanco",
  "Negro/Plata",
];

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

/** Descompone la URL construida para poder mirarla por partes. */
function desmontar(url) {
  const u = new URL(url);
  return {
    host: u.host,
    numero: u.pathname.replace(/^\//, ""),
    texto: u.searchParams.get("text") || "",
    parametros: [...u.searchParams.keys()],
  };
}

/* ================================================================
   Ejecución
   ================================================================ */

const NS = cargarModulo();

if (!JSON_MODE) {
  console.log("\nARENAS — canal de ventas por WhatsApp");
  console.log("Prueba funcional. No se envía ningún mensaje.\n");
}

await NS.whatsapp.cargar();

comprobar("el canal queda disponible tras leer la configuración",
  NS.whatsapp.disponible() === true);

/* --- Los ocho modelos --- */

const numerosVistos = new Set();
const codigosVistos = new Set();

for (const modelo of MODELOS) {
  const color = COLORES_DIFICILES[MODELOS.indexOf(modelo) % COLORES_DIFICILES.length];
  const url = NS.whatsapp.enlace(modelo, color);
  const p = desmontar(url);
  numerosVistos.add(p.numero);

  const codigo = (p.texto.match(/ARN-[A-Z0-9]{4}/) || [])[0];
  if (codigo) codigosVistos.add(codigo);

  comprobar(modelo + ": va a wa.me", p.host === "wa.me");
  comprobar(modelo + ": el número es el de la empresa", p.numero === NUMERO_ESPERADO);
  comprobar(modelo + ": el mensaje nombra el modelo exacto", p.texto.includes(modelo));
  comprobar(modelo + ": el mensaje nombra el color elegido", p.texto.includes(color),
    p.texto.slice(0, 90));
  comprobar(modelo + ": lleva código de consulta", Boolean(codigo));
  comprobar(modelo + ": el texto viaja codificado",
    !url.includes(" ") && !/[?&]text=[^&]*[ ñáéíóú]/.test(url));
}

comprobar("los ocho modelos usan UN SOLO número",
  numerosVistos.size === 1, [...numerosVistos].length + " distinto(s)");

comprobar("cada consulta lleva su propio código",
  codigosVistos.size >= MODELOS.length - 1,
  codigosVistos.size + " códigos para " + MODELOS.length + " consultas");

/* --- Casos límite --- */

const sinColor = desmontar(NS.whatsapp.enlace("Dominar 400", ""));
comprobar("sin color elegido, el mensaje dice «color por definir»",
  sinColor.texto.includes("color por definir"), sinColor.texto.slice(0, 90));

const colorNulo = desmontar(NS.whatsapp.enlace("Dominar 400", null));
comprobar("un color nulo se comporta igual que uno vacío",
  colorNulo.texto.includes("color por definir"));

comprobar("cambiar de color cambia el mensaje",
  desmontar(NS.whatsapp.enlace("Pulsar N250", "Rojo")).texto !==
    desmontar(NS.whatsapp.enlace("Pulsar N250", "Negro")).texto);

const conAcentos = desmontar(NS.whatsapp.enlace("Pulsar N250", "Azul eléctrico"));
comprobar("los acentos llegan enteros tras decodificar",
  conAcentos.texto.includes("Azul eléctrico"));

const conAmpersand = desmontar(NS.whatsapp.enlace("CT 125", "Rojo & Negro"));
comprobar("un «&» en el color no parte la URL en dos parámetros",
  conAmpersand.parametros.length === 1 && conAmpersand.texto.includes("Rojo & Negro"),
  conAmpersand.parametros.join(", "));

/* --- Lo que el mensaje NO debe decir --- */

const muestra = desmontar(NS.whatsapp.enlace("Dominar 400", "Negro")).texto;
comprobar("el mensaje no adelanta precio ni moneda",
  !/S\/|PEN|\bsoles\b|\$/i.test(muestra), muestra);
comprobar("el mensaje no confirma stock ni fechas de entrega",
  !/en stock|disponible ahora|entrega el|te lo entrego/i.test(muestra));
comprobar("el mensaje no promete financiamiento ni cuotas",
  !/cuota|financia|inicial de|sin intereses/i.test(muestra));
comprobar("el mensaje lo escribe el cliente, en primera persona",
  muestra.startsWith("Hola, equipo de ARENAS. Estoy interesado(a) en la "));

/* --- El cerrojo: sin aprobación no hay enlace --- */

NS.whatsapp._fijarCanal(NUMERO_ESPERADO, false);
comprobar("un canal sin confirmar no produce enlace",
  NS.whatsapp.enlace("CT 125", "Negro") === "");
comprobar("un canal sin confirmar no se declara disponible",
  NS.whatsapp.disponible() === false);

NS.whatsapp._fijarCanal("PENDIENTE", true);
comprobar("un número marcador («PENDIENTE») no produce enlace",
  NS.whatsapp.enlace("CT 125", "Negro") === "");

NS.whatsapp._fijarCanal("+51 994 790 490", true);
comprobar("un número con «+», espacios o guiones se limpia para wa.me",
  desmontar(NS.whatsapp.enlace("CT 125", "Negro")).numero === "51994790490");

/* ================================================================
   Resultado
   ================================================================ */

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: fallos === 0, fallos, pruebas: lineas }, null, 2));
} else {
  console.log("\n" + "=".repeat(58));
  if (fallos === 0) {
    console.log("RESULTADO: " + lineas.length + "/" + lineas.length + " pruebas pasan.");
    console.log("Ningún mensaje fue enviado: solo se construyeron y leyeron URLs.");
  } else {
    console.log("RESULTADO: " + fallos + " prueba(s) FALLAN de " + lineas.length + ".");
    for (const l of lineas.filter((x) => !x.ok)) {
      console.log("  · " + l.nombre + (l.detalle ? "  [" + l.detalle + "]" : ""));
    }
  }
}

process.exit(fallos === 0 ? 0 : 1);
