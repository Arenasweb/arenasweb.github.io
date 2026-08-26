#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/convertir-fotos.mjs
   Convierte fotografías de origen al formato del catálogo.
   Sin dependencias: usa el Chrome que ya está instalado.

       node scripts/convertir-fotos.mjs --origen "D:\fotos" --destino assets/catalogo
       node scripts/convertir-fotos.mjs --origen … --slug pulsar-n250 --archivo N250_ROJO_3.png
       node scripts/convertir-fotos.mjs --origen … --seco     (no escribe, solo informa)

   POR QUÉ ASÍ
   El proyecto no admite dependencias, y en esta máquina no hay
   ImageMagick ni cwebp. Chrome sí está, y sabe redimensionar y exportar
   WebP: se carga la imagen en un lienzo, se dibuja al tamaño destino y
   se exporta. Ni se instala nada, ni se sube ninguna foto a ningún
   servicio.

   ENCAJAR, NO RECORTAR
   Las fotos de Bajaj vienen en 3:2 y el catálogo pide 16:10. Recortar
   quitaría un 6% de altura, y ahí es donde están la rueda delantera y
   los espejos. Como los PNG traen fondo TRANSPARENTE, se encaja la moto
   entera dentro del lienzo 16:10 y sobra margen — que es invisible
   sobre el fondo oscuro del sitio.

   Recortar solo tendría sentido con fondo opaco. Aquí sería perder
   moto a cambio de nada.

   NO INVENTA NADA
   No decide a qué modelo pertenece cada archivo: eso se le dice con
   `--slug`, o se lee de un mapa. Un archivo sin destino declarado se
   salta y se informa.
   ================================================================ */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname, basename } from "node:path";
import { tmpdir } from "node:os";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------- Argumentos ---------------- */

const argv = process.argv.slice(2);
const SECO = argv.includes("--seco");
function opcion(n) {
  const p = "--" + n + "=";
  const c = argv.find((a) => a.startsWith(p));
  if (c) return c.slice(p.length);
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
}

const ORIGEN = opcion("origen");
const DESTINO = opcion("destino") || join(RAIZ, "assets/catalogo");
const SLUG = opcion("slug");
const ARCHIVO = opcion("archivo");

if (!ORIGEN || !existsSync(ORIGEN)) {
  console.error("Falta --origen, o la carpeta no existe.");
  console.error('  node scripts/convertir-fotos.mjs --origen "D:\\fotos" [--slug X --archivo Y] [--seco]');
  process.exit(2);
}

/* ---------------- Formato del catálogo ---------------- */

const SALIDAS = [
  { nombre: "portada.webp", ancho: 1600, alto: 1000, maxKB: 250 },
  { nombre: "portada-mobile.webp", ancho: 1280, alto: 800, maxKB: 160 },
];

/** Se prueban de mayor a menor hasta entrar en el peso objetivo. */
const CALIDADES = [0.86, 0.82, 0.78, 0.74, 0.70];

const CHROME_RUTAS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const CHROME = CHROME_RUTAS.find((r) => existsSync(r));
if (!CHROME) { console.error("No encuentro Chrome ni Edge."); process.exit(2); }

/* ---------------- Chrome por el protocolo DevTools ---------------- */

const PERFIL = join(tmpdir(), "arenas-conv-" + process.pid);
const PUERTO = 9700 + (process.pid % 200);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run",
  "--remote-debugging-port=" + PUERTO, "--user-data-dir=" + PERFIL, "about:blank"], { stdio: "ignore" });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarChrome() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://127.0.0.1:" + PUERTO + "/json/version");
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch (e) { /* aún no */ }
    await dormir(250);
  }
  throw new Error("Chrome no abrió el puerto de depuración");
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pend = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pend.has(m.id)) {
        const { res, rej } = this.pend.get(m.id); this.pend.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      }
    });
  }
  s(metodo, params, sid) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method: metodo, params: params || {}, sessionId: sid }));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error("timeout " + metodo)); } }, 120000);
    });
  }
}

/* ---------------- Conversión ---------------- */

const informe = [];

/**
 * Encaja la imagen dentro del lienzo destino, sin deformar y sin cortar.
 * Devuelve WebP en base64, bajando calidad hasta entrar en el peso.
 */
async function convertir(cdp, ses, rutaOrigen, salida) {
  const bytes = readFileSync(rutaOrigen);
  const ext = extname(rutaOrigen).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const datos = "data:" + mime + ";base64," + bytes.toString("base64");

  const expr = `(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(datos)};
    await img.decode();

    const L = document.createElement("canvas");
    L.width = ${salida.ancho};
    L.height = ${salida.alto};
    const cx = L.getContext("2d");

    // ENCAJAR: la escala menor de las dos, para que quepa entera.
    const escala = Math.min(L.width / img.naturalWidth, L.height / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = "high";
    cx.drawImage(img, (L.width - w) / 2, (L.height - h) / 2, w, h);

    for (const q of ${JSON.stringify(CALIDADES)}) {
      const url = L.toDataURL("image/webp", q);
      const kb = Math.round((url.length - url.indexOf(",") - 1) * 3 / 4 / 1024);
      if (kb <= ${salida.maxKB} || q === ${CALIDADES[CALIDADES.length - 1]}) {
        return { url, kb, calidad: q, origenAncho: img.naturalWidth, origenAlto: img.naturalHeight,
                 ocupa: Math.round(w / L.width * 100) };
      }
    }
  })()`;

  const r = await cdp.s("Runtime.evaluate",
    { expression: expr, returnByValue: true, awaitPromise: true }, ses);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}

/* ---------------- Ejecución ---------------- */

async function principal() {
  const url = await esperarChrome();
  const ws = await new Promise((res, rej) => {
    const s = new WebSocket(url);
    s.addEventListener("open", () => res(s));
    s.addEventListener("error", () => rej(new Error("ws")));
  });
  const cdp = new CDP(ws);
  const t = await cdp.s("Target.createTarget", { url: "about:blank" });
  const ses = (await cdp.s("Target.attachToTarget", { targetId: t.targetId, flatten: true })).sessionId;
  await cdp.s("Runtime.enable", {}, ses);

  // Qué se convierte: o un par suelto (--slug + --archivo), o nada.
  // No se adivina a qué modelo pertenece cada archivo.
  if (!SLUG || !ARCHIVO) {
    console.log("Archivos de imagen en el origen:\n");
    readdirSync(ORIGEN)
      .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
      .forEach((f) => {
        const kb = Math.round(statSync(join(ORIGEN, f)).size / 1024);
        console.log("  " + String(kb).padStart(7) + " KB  " + f);
      });
    console.log("\nIndica qué archivo va a qué modelo:");
    console.log('  node scripts/convertir-fotos.mjs --origen "' + ORIGEN + '" \\');
    console.log('       --slug pulsar-n250 --archivo "N250_ROJO_3.png"');
    console.log("\nNo adivino el emparejamiento: un nombre de archivo no es una identidad.");
    return 0;
  }

  const rutaOrigen = join(ORIGEN, ARCHIVO);
  if (!existsSync(rutaOrigen)) { console.error("No existe: " + rutaOrigen); return 2; }

  const carpeta = join(DESTINO, SLUG);
  if (!existsSync(carpeta)) {
    console.error("No existe la carpeta del modelo: " + carpeta);
    console.error("El slug tiene que corresponder a un modelo del catálogo.");
    return 2;
  }

  console.log("ARENAS — CONVERSIÓN DE FOTOGRAFÍAS");
  console.log("origen : " + ARCHIVO);
  console.log("modelo : " + SLUG + (SECO ? "   [EN SECO: no se escribe nada]" : ""));
  console.log("");

  for (const salida of SALIDAS) {
    const r = await convertir(cdp, ses, rutaOrigen, salida);
    const destino = join(carpeta, salida.nombre);
    const aviso = r.kb > salida.maxKB ? "  AVISO: supera " + salida.maxKB + " KB" : "";
    console.log("  " + salida.nombre.padEnd(22) +
      salida.ancho + "x" + salida.alto + "  " +
      String(r.kb).padStart(4) + " KB  q=" + r.calidad +
      "  la moto ocupa el " + r.ocupa + "% del ancho" + aviso);

    if (!SECO) {
      const b64 = r.url.slice(r.url.indexOf(",") + 1);
      writeFileSync(destino, Buffer.from(b64, "base64"));
    }
    informe.push({ slug: SLUG, salida: salida.nombre, kb: r.kb, calidad: r.calidad, ocupa: r.ocupa });
  }

  console.log("");
  if (SECO) {
    console.log("Nada escrito. Quita --seco para generar los archivos.");
  } else {
    console.log("Escrito en " + carpeta);
    console.log("");
    console.log("Comprueba el resultado antes de darlo por bueno:");
    console.log("  node scripts/qa-assets-catalogo.mjs --detalle");
    console.log("  y MIRA las imágenes: que no falte rueda, espejo ni cola.");
  }
  return 0;
}

principal()
  .then((c) => { chrome.kill(); try { rmSync(PERFIL, { recursive: true, force: true }); } catch (e) {} process.exit(c); })
  .catch((e) => {
    console.error("Error: " + (e && e.message ? e.message : e));
    chrome.kill(); try { rmSync(PERFIL, { recursive: true, force: true }); } catch (e2) {}
    process.exit(1);
  });
