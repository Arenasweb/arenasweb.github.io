#!/usr/bin/env node
/* ================================================================
   migrar-dominio.mjs
   Cambia el dominio del sitio en todos los archivos donde aparece.

       node scripts/migrar-dominio.mjs <dominio-nuevo> [--seco]
       node scripts/migrar-dominio.mjs arenasmotocicletas.com

   POR QUÉ NO SE HACE A MANO
   La URL vive en treinta y nueve sitios repartidos por veintidós
   archivos, y no todos se ven igual de importantes: cuatro son
   `<link rel="canonical">`, cuatro son entradas del `sitemap.xml`, tres
   son `og:url` y el resto son documentación, pruebas y datos.

   Olvidar uno no rompe la página. Es peor: la deja funcionando mientras
   le dice a Google que la versión buena está en una dirección que ya no
   existe. Eso no se nota mirando el sitio, se nota semanas después
   cuando el buscador deja de mandar gente.

   QUÉ NO TOCA
   El generador de plantilla, que sustituye el nombre de la cuenta a
   propósito para limpiarlo. Cambiarlo ahí dejaría la plantilla enseñando
   una cuenta nueva en vez de un marcador.
   ================================================================ */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");

const VIEJO = "arenasweb.github.io";
const NUEVO = (process.argv[2] || "").trim().toLowerCase();
const SECO = process.argv.includes("--seco");

if (!NUEVO || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(NUEVO)) {
  console.error("Uso: node scripts/migrar-dominio.mjs <dominio-nuevo> [--seco]");
  console.error("Ejemplo: node scripts/migrar-dominio.mjs arenasmotocicletas.com");
  process.exit(1);
}
if (NUEVO === VIEJO) {
  console.error("El dominio nuevo es el mismo que el viejo. No hay nada que hacer.");
  process.exit(1);
}

/* El generador de plantilla convierte el nombre de la cuenta en un
   marcador. Si se le cambia aquí, la plantilla pasaría a enseñar una
   cuenta real en vez de «tu-usuario», que es justo lo contrario de lo
   que hace ese script. */
const INTOCABLES = new Set(["scripts/generar-plantilla.mjs"]);

const versionados = execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" })
  .split("\n").map(s => s.trim()).filter(Boolean);

const TEXTUALES = /\.(html|css|js|mjs|json|md|txt|xml|yml|toml|gs)$/i;

/* Cómo de grave es cada sitio donde aparece. Sirve para el informe: no es
   lo mismo una mención en un documento interno que la etiqueta que le
   dice a Google cuál es la dirección buena. */
function gravedad(linea) {
  if (/rel=["']canonical/.test(linea)) return "canonical  (le dice a Google la dirección buena)";
  if (/og:url|twitter:url/.test(linea)) return "og:url     (lo que se ve al compartir el enlace)";
  if (/<loc>/.test(linea)) return "sitemap    (lo que Google rastrea)";
  if (/Sitemap:/i.test(linea)) return "robots     (dónde está el sitemap)";
  if (/"item"|@id|schema/i.test(linea)) return "datos estructurados";
  if (/href=/.test(linea)) return "enlace";
  return "mención";
}

let archivos = 0, cambios = 0;
const informe = [];

for (const rel of versionados) {
  if (INTOCABLES.has(rel) || !TEXTUALES.test(rel)) continue;
  const ruta = join(RAIZ, rel);
  let texto;
  try { texto = readFileSync(ruta, "utf8"); } catch { continue; }
  if (!texto.includes(VIEJO)) continue;

  // Se anotan las líneas antes de tocarlas, para poder decir qué cambió.
  texto.split(/\r?\n/).forEach((l, i) => {
    if (l.includes(VIEJO)) informe.push({ rel, linea: i + 1, tipo: gravedad(l) });
  });

  const nuevo = texto.split(VIEJO).join(NUEVO);
  cambios += texto.split(VIEJO).length - 1;
  archivos++;
  if (!SECO) writeFileSync(ruta, nuevo, "utf8");
}

console.log((SECO ? "SIMULACRO — no se ha escrito nada\n" : "") +
  VIEJO + "  ->  " + NUEVO);
console.log(cambios + " sustituciones en " + archivos + " archivos\n");

const porTipo = {};
for (const r of informe) (porTipo[r.tipo] = porTipo[r.tipo] || []).push(r.rel + ":" + r.linea);
for (const [tipo, sitios] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
  console.log("  " + String(sitios.length).padStart(2) + "  " + tipo);
  for (const s of sitios.slice(0, 4)) console.log("        " + s);
  if (sitios.length > 4) console.log("        ... y " + (sitios.length - 4) + " más");
}

if (!SECO) {
  const quedan = versionados.filter(rel => {
    if (INTOCABLES.has(rel) || !TEXTUALES.test(rel)) return false;
    try { return readFileSync(join(RAIZ, rel), "utf8").includes(VIEJO); } catch { return false; }
  });
  console.log("");
  if (quedan.length) {
    console.log("QUEDAN MENCIONES SIN CAMBIAR:");
    quedan.forEach(f => console.log("  " + f));
    process.exit(1);
  }
  console.log("no queda ninguna mención del dominio viejo");
}
