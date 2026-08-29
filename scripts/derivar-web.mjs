#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/derivar-web.mjs
   Convierte el banco fotográfico (PNG de alta resolución) en los
   archivos que sí va a descargar un navegador.

       node scripts/derivar-web.mjs
       node scripts/derivar-web.mjs --modelo boxer-bm150x-disc
       node scripts/derivar-web.mjs --seco

   POR QUÉ EXISTE
   Los recortes de `photos/` llegan a pesar 50 MB y a medir 8400 px.
   Eso es un archivo maestro, no un asset de web: mandar eso a un
   teléfono en Cusco es gastarle los datos del mes en una fotografía
   que va a ver a 400 px. Aquí se produce la versión que se publica y
   se deja el maestro donde está.

   QUÉ CONSERVA
   · El canal alfa. WebP lo admite, y sin él la moto llegaría con un
     rectángulo negro alrededor sobre un fondo que no es negro puro.
   · La proporción. Solo se limita el lado mayor; nunca se fuerzan
     ancho y alto a la vez.
   · Los píxeles del producto. No hay enfoque, ni corrección de
     color, ni «mejora» de ningún tipo.

   QUÉ NO HACE
   No amplía. Si un recorte mide menos que el objetivo, se queda como
   está: inventar píxeles para llegar a una cifra es exactamente lo
   que este proyecto decidió no hacer.

   TAMAÑOS
   Salen de para qué se usa cada foto, no de una tabla genérica:
   la lateral encabeza la ficha y puede ocupar toda la columna; un
   detalle vive a media columna; la miniatura es un botón.
   ================================================================ */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SECO = process.argv.includes("--seco");
const SOLO = process.argv.includes("--modelo") ? process.argv[process.argv.indexOf("--modelo") + 1] : null;

const FFMPEG_RUTAS = [
  "C:/Users/Pc/ffmpeg/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe",
  "ffmpeg",
];
const FFMPEG = FFMPEG_RUTAS.find((r) => r === "ffmpeg" || existsSync(r));

function ffmpeg(args) {
  try { execFileSync(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { if (e.status) throw e; }
}

function medir(ruta) {
  let salida = "";
  try { execFileSync(FFMPEG, ["-hide_banner", "-i", ruta], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { salida = e.stderr || ""; }
  const m = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(salida);
  return m ? { ancho: +m[1], alto: +m[2] } : null;
}

/**
 * Qué tamaño le toca a cada foto, por el papel que cumple en la ficha.
 * `lado` es el límite del lado MAYOR, en píxeles.
 */
const PERFILES = {
  // La lateral abre la ficha y es la única que puede ocupar el ancho
  // completo en un monitor grande.
  "02-lateral":  { lado: 1800, calidad: 82, mini: 700 },
  // El resto son detalles: viven a media columna como mucho.
  _detalle:      { lado: 1200, calidad: 80, mini: 560 },
};

function perfil(nombre) {
  return PERFILES[nombre] || PERFILES._detalle;
}

/* ================================================================
   Conversión
   ================================================================ */

function convertir(origen, destino, lado, calidad) {
  const dim = medir(origen);
  if (!dim) return null;

  // No se amplía nunca. `min(iw, lado)` deja la imagen intacta cuando
  // ya es más pequeña que el objetivo.
  const mayor = Math.max(dim.ancho, dim.alto);
  const escala = mayor > lado
    ? (dim.ancho >= dim.alto ? `${lado}:-2` : `-2:${lado}`)
    : null;

  const filtros = escala ? ["-vf", `scale=${escala}:flags=lanczos`] : [];
  ffmpeg(["-y", "-hide_banner", "-loglevel", "error", "-i", origen,
    ...filtros, "-c:v", "libwebp", "-quality", String(calidad),
    "-compression_level", "6", "-preset", "photo", destino]);

  const salida = medir(destino);
  return { origen: dim, destino: salida, ampliado: false };
}

/* ================================================================
   Recorrido
   ================================================================ */

const rutaCatalogo = join(RAIZ, "assets/catalogo");
const modelos = readdirSync(rutaCatalogo, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(rutaCatalogo, d.name, "photos")))
  .map((d) => d.name)
  .filter((n) => !SOLO || n === SOLO);

let pesoAntes = 0;
let pesoDespues = 0;
let total = 0;
const registro = {};

for (const slug of modelos) {
  const origenDir = join(rutaCatalogo, slug, "photos");
  const destinoDir = join(rutaCatalogo, slug, "details");
  const miniDir = join(destinoDir, "mini");
  if (!SECO) { mkdirSync(destinoDir, { recursive: true }); mkdirSync(miniDir, { recursive: true }); }

  const archivos = readdirSync(origenDir).filter((f) => f.endsWith(".png")).sort();
  console.log("\n" + slug);
  registro[slug] = {};

  for (const archivo of archivos) {
    const nombre = basename(archivo, ".png");
    const clave = nombre.replace(/^\d+-/, "");
    const p = perfil(nombre);
    const origen = join(origenDir, archivo);
    const destino = join(destinoDir, clave + ".webp");
    const mini = join(miniDir, clave + ".webp");

    const bytesAntes = statSync(origen).size;
    pesoAntes += bytesAntes;

    if (SECO) {
      console.log("  (seco) " + clave.padEnd(24) + Math.round(bytesAntes / 1024) + " KB → " + p.lado + " px");
      continue;
    }

    const r = convertir(origen, destino, p.lado, p.calidad);
    convertir(origen, mini, p.mini, 74);

    const bytesDespues = statSync(destino).size;
    const bytesMini = statSync(mini).size;
    pesoDespues += bytesDespues + bytesMini;
    total++;

    registro[slug][clave] = {
      web: "assets/catalogo/" + slug + "/details/" + clave + ".webp",
      mini: "assets/catalogo/" + slug + "/details/mini/" + clave + ".webp",
      resolucion: r.destino.ancho + "x" + r.destino.alto,
      pesoKB: Math.round(bytesDespues / 1024),
      origen: "assets/catalogo/" + slug + "/photos/" + archivo,
      origenResolucion: r.origen.ancho + "x" + r.origen.alto,
    };

    console.log("  ok  " + clave.padEnd(24) +
      (r.origen.ancho + "x" + r.origen.alto).padEnd(11) + "→ " +
      (r.destino.ancho + "x" + r.destino.alto).padEnd(11) +
      String(Math.round(bytesAntes / 1024) + " KB").padStart(8) + " → " +
      String(Math.round(bytesDespues / 1024) + " KB").padStart(7));
  }
}

if (!SECO) {
  // El manifiesto gana la ruta publicable de cada asset. La capa de
  // datos lee de aquí y nunca de `photos/`, para que un maestro de
  // 50 MB no pueda colarse en la página por descuido.
  const rutaManifiesto = join(RAIZ, "assets/catalogo/photo-manifest.json");
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, "utf8"));
  for (const modelo of manifiesto.modelos) {
    const derivados = registro[modelo.modelo];
    if (!derivados) continue;
    for (const [clave, valor] of Object.entries(modelo.assets)) {
      if (valor.status === "ready" && derivados[clave]) {
        valor.web = derivados[clave].web;
        valor.mini = derivados[clave].mini;
        valor.webResolucion = derivados[clave].resolucion;
        valor.webPesoKB = derivados[clave].pesoKB;
      }
    }
  }
  writeFileSync(rutaManifiesto, JSON.stringify(manifiesto, null, 2) + "\n");

  console.log("\n" + "=".repeat(58));
  console.log(total + " asset(s) derivados (web + miniatura).");
  console.log("maestros:  " + (pesoAntes / 1048576).toFixed(1) + " MB");
  console.log("publicado: " + (pesoDespues / 1048576).toFixed(1) + " MB  (" +
    Math.round((1 - pesoDespues / pesoAntes) * 100) + " % menos)");
  console.log("manifiesto actualizado con las rutas web.");
}
