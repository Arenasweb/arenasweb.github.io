#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-animaciones.mjs
   Comprueba que el ritmo de las animaciones cumple la norma del
   proyecto. Sin dependencias, sin red, no escribe nada.

       node scripts/qa-animaciones.mjs
       node scripts/qa-animaciones.mjs --json

   POR QUÉ EXISTE
   `SECURITY_AND_AI_GUARDRAILS` §6 fija el ritmo de las animaciones:
   microinteracciones entre 150 y 250 ms, apariciones de sección entre
   500 y 700, nada por encima de 800, y solo se anima lo que no dispara
   layout. Estaba escrito y no comprobado — y por eso derivó:
   `--duration-fast` llevaba tiempo en 120 ms, por debajo de su propio
   mínimo, sin que nadie lo notara.

   Una regla que nadie mide es una regla que se despega del código.

   POR QUÉ ES UN ARCHIVO APARTE
   Podría vivir dentro de `qa-tests.mjs`, pero ese archivo ya lo tocan
   otras ramas en curso y añadirle bloques al final provoca conflictos
   al integrar. Aquí no choca con nada, y sigue la costumbre del
   proyecto: una herramienta por asunto.

   exit 0 → el ritmo cumple la norma
   exit 1 → algún token o alguna transición se salió
   ================================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MODE = process.argv.includes("--json");

/* ================================================================
   La norma, en un sitio
   ================================================================ */

const NORMA = {
  micro: { min: 150, max: 250, tokens: ["duration-fast", "duration-base"] },
  seccion: { min: 500, max: 700, tokens: ["duration-slower", "duration-reveal"] },
  techo: 800,
};

/** Nunca se animan: disparan recálculo de layout en cada fotograma. */
const DISPARAN_LAYOUT = [
  "width", "height", "top", "left", "right", "bottom",
  "margin", "padding", "font-size", "border-width",
];

const HOJAS = ["style.css", "assets/css/catalogo.css"];

/* ================================================================
   Arnés
   ================================================================ */

const fallos = [];
const lineas = [];
let ok = 0;

function grupo(t) { lineas.push(""); lineas.push(t); }
function comprobar(desc, cond, detalle) {
  if (cond) { ok++; lineas.push("  ok    " + desc); }
  else {
    fallos.push({ desc, detalle: detalle === undefined ? "" : String(detalle).slice(0, 160) });
    lineas.push("  FALLA " + desc + (detalle ? "  → " + detalle : ""));
  }
}

/* ================================================================
   Lectura
   ================================================================ */

const ausentes = HOJAS.filter((h) => !existsSync(join(RAIZ, h)));
if (ausentes.length) {
  console.error("No se encuentran las hojas: " + ausentes.join(", "));
  process.exit(2);
}

const CSS = {};
HOJAS.forEach((h) => { CSS[h] = readFileSync(join(RAIZ, h), "utf8"); });
const TODO = Object.values(CSS).join("\n");

/** Valor en milisegundos de un token declarado en `:root`. */
function ms(nombre) {
  const m = new RegExp("--" + nombre + ":\\s*(\\d+)ms").exec(TODO);
  return m ? Number(m[1]) : null;
}

/* ================================================================
   1. Duraciones
   ================================================================ */

grupo("1. DURACIONES");

const TOKENS = ["duration-fast", "duration-base", "duration-slow",
  "duration-slower", "duration-reveal", "duration-page"];
const valores = {};
TOKENS.forEach((t) => { valores[t] = ms(t); });

comprobar("los seis tokens de duración están declarados",
  TOKENS.every((t) => typeof valores[t] === "number"), JSON.stringify(valores));

// §6: microinteracciones 150–250 ms. Por debajo el hover se lee como un
// salto: el ojo detecta el cambio de estado pero no el recorrido.
NORMA.micro.tokens.forEach((t) => {
  comprobar("--" + t + " está dentro de " + NORMA.micro.min + "–" + NORMA.micro.max + " ms",
    valores[t] >= NORMA.micro.min && valores[t] <= NORMA.micro.max, valores[t] + "ms");
});

// §6: apariciones de sección 500–700 ms.
NORMA.seccion.tokens.forEach((t) => {
  comprobar("--" + t + " está dentro de " + NORMA.seccion.min + "–" + NORMA.seccion.max + " ms",
    valores[t] >= NORMA.seccion.min && valores[t] <= NORMA.seccion.max, valores[t] + "ms");
});

// §6: nada por encima de 800 ms sin justificación documentada.
const pasados = TOKENS.filter((t) => valores[t] > NORMA.techo);
comprobar("ningún token pasa de " + NORMA.techo + " ms",
  pasados.length === 0, pasados.map((t) => t + "=" + valores[t]).join(", "));

comprobar("las duraciones están ordenadas de menor a mayor",
  valores["duration-fast"] < valores["duration-base"] &&
  valores["duration-base"] < valores["duration-slow"] &&
  valores["duration-slow"] < valores["duration-slower"],
  [valores["duration-fast"], valores["duration-base"],
    valores["duration-slow"], valores["duration-slower"]].join(" < "));

/* ================================================================
   2. Qué se anima
   ================================================================ */

grupo("2. PROPIEDADES ANIMADAS");

const conLayout = [];
HOJAS.forEach((h) => {
  (CSS[h].match(/transition:[^;]+;/g) || []).forEach((t) => {
    DISPARAN_LAYOUT.forEach((p) => {
      if (new RegExp("(^|[\\s,:])" + p + "\\s").test(t)) {
        conLayout.push(h + ": " + t.replace(/\s+/g, " ").slice(0, 70));
      }
    });
  });
});
comprobar("ninguna transición anima algo que dispara layout",
  conLayout.length === 0, conLayout.slice(0, 2).join(" | "));

// `transition: all` anima lo que sea que cambie, incluido lo que dispara
// layout, y lo hace sin que nadie lo haya decidido.
const conAll = [];
HOJAS.forEach((h) => {
  (CSS[h].match(/transition:\s*all\b[^;]*/g) || []).forEach((t) => {
    conAll.push(h + ": " + t.replace(/\s+/g, " ").slice(0, 50));
  });
});
comprobar("nadie usa `transition: all`", conAll.length === 0, conAll.slice(0, 2).join(" | "));

/* ================================================================
   3. Movimiento reducido
   ================================================================ */

grupo("3. MOVIMIENTO REDUCIDO");

HOJAS.forEach((h) => {
  comprobar(h + " respeta prefers-reduced-motion",
    /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/.test(CSS[h]));
});

/* ================================================================
   4. Coherencia de la curva
   ================================================================ */

grupo("4. COHERENCIA DE LA CURVA");

// No sobran curvas: lo que importa es que UNA domine, para que todo el
// sitio se sienta del mismo material.
const curvas = TODO.match(/var\(--ease-[a-z-]+\)/g) || [];
const cuenta = {};
curvas.forEach((c) => { cuenta[c] = (cuenta[c] || 0) + 1; });
const orden = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
const dominante = orden[0];

comprobar("una sola curva domina el sitio",
  dominante === "var(--ease-out)" && cuenta[dominante] > curvas.length / 2,
  orden.map((c) => c.replace(/var\(--|\)/g, "") + "=" + cuenta[c]).join(" · "));

comprobar("--ease-out es cubic-bezier(0.22, 1, 0.36, 1)",
  /--ease-out:\s*cubic-bezier\(\s*0?\.22\s*,\s*1\s*,\s*0?\.36\s*,\s*1\s*\)/.test(TODO));

// Una curva declarada y sin usar es ruido: o se usa o se retira.
const declaradas = (TODO.match(/--ease-[a-z-]+(?=:)/g) || []).map((s) => s.slice(2));
const sinUsar = declaradas.filter((d) => !cuenta["var(--" + d + ")"]);
if (sinUsar.length) {
  lineas.push("       curvas declaradas y sin usar: " + sinUsar.join(", "));
}

/* ================================================================
   Informe
   ================================================================ */

const bien = fallos.length === 0;

if (JSON_MODE) {
  console.log(JSON.stringify({
    resultado: bien ? "PASS" : "FAIL",
    tokens: valores, curvas: cuenta, fallos,
  }, null, 2));
  process.exit(bien ? 0 : 1);
}

console.log("ARENAS — RITMO DE LAS ANIMACIONES");
console.log("norma: SECURITY_AND_AI_GUARDRAILS §6");
console.log(lineas.join("\n"));
console.log("");
console.log("=".repeat(58));
if (bien) {
  console.log("RESULTADO: " + ok + "/" + ok + " comprobaciones correctas.");
} else {
  console.log("RESULTADO: " + fallos.length + " de " + (ok + fallos.length) + " FALLAN.");
  console.log("");
  fallos.forEach((f) => console.log("  · " + f.desc + (f.detalle ? "  → " + f.detalle : "")));
}
process.exit(bien ? 0 : 1);
