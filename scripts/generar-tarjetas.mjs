#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/generar-tarjetas.mjs
   Genera la variante de las fotografias para la REJILLA del catalogo.

       node scripts/generar-tarjetas.mjs            (informa)
       node scripts/generar-tarjetas.mjs --escribir

   POR QUE EXISTE
   La rejilla mostraba `portada.webp`, que mide 1600x1000 porque esta
   pensada para la ficha. Una tarjeta ocupa unos 340 px de ancho: se
   estaban descargando cinco veces mas pixeles de los que se ven. Medido
   en produccion: 1,24 MB de fotografias para ocho miniaturas, el 93% del
   peso de la pagina.

   La variante de 760 px cubre tambien pantallas de doble densidad, donde
   una tarjeta de 340 px pide 680.

   Se parte de `portada.webp` y no del original: reducir de 1600 a 760
   esconde de sobra los artefactos de la primera compresion, y asi la
   herramienta funciona sin depender de una carpeta de origen que puede
   no estar.

   Sin dependencias: usa el Chrome que ya esta instalado.
   ================================================================ */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ESCRIBIR = process.argv.includes("--escribir");
const BASE = join(RAIZ, "assets/catalogo");

const ANCHO = 760, ALTO = 475, MAX_KB = 90;
const CALIDADES = [0.84, 0.80, 0.76, 0.72, 0.68];

const CHROME_RUTAS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const CHROME = CHROME_RUTAS.find((r) => existsSync(r));
if (!CHROME) { console.error("No encuentro Chrome ni Edge."); process.exit(2); }

const modelos = readdirSync(BASE).filter((d) => {
  try { return statSync(join(BASE, d)).isDirectory() && existsSync(join(BASE, d, "portada.webp")); }
  catch (e) { return false; }
});

if (!modelos.length) { console.log("No hay ninguna portada.webp que reducir."); process.exit(0); }

const PERFIL = join(tmpdir(), "arenas-tar-" + process.pid);
const PUERTO = 9700 + (process.pid % 180);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run",
  "--remote-debugging-port=" + PUERTO, "--user-data-dir=" + PERFIL, "about:blank"], { stdio: "ignore" });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarChrome() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch("http://127.0.0.1:" + PUERTO + "/json/version"); if (r.ok) return (await r.json()).webSocketDebuggerUrl; } catch (e) {}
    await dormir(250);
  }
  throw new Error("Chrome no abrio el puerto de depuracion");
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map();
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
      if (m.id && this.pend.has(m.id)) { const { res, rej } = this.pend.get(m.id); this.pend.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result); } }); }
  s(metodo, params, sid) { const id = ++this.id;
    return new Promise((res, rej) => { this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method: metodo, params: params || {}, sessionId: sid }));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error("timeout " + metodo)); } }, 60000); }); }
}

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

  console.log("ARENAS — VARIANTE DE TARJETA  " + ANCHO + "x" + ALTO +
    (ESCRIBIR ? "" : "   [EN SECO]"));
  console.log("");
  let antes = 0, despues = 0;

  for (const slug of modelos) {
    const origen = join(BASE, slug, "portada.webp");
    const destino = join(BASE, slug, "portada-card.webp");
    const bytes = readFileSync(origen);
    const datos = "data:image/webp;base64," + bytes.toString("base64");

    const expr = `(async () => {
      const img = new Image();
      img.src = ${JSON.stringify(datos)};
      await img.decode();
      const L = document.createElement("canvas");
      L.width = ${ANCHO}; L.height = ${ALTO};
      const cx = L.getContext("2d");
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = "high";
      // La portada ya viene encajada en 16:10; aqui solo se reduce.
      cx.drawImage(img, 0, 0, ${ANCHO}, ${ALTO});
      for (const q of ${JSON.stringify(CALIDADES)}) {
        const url = L.toDataURL("image/webp", q);
        const kb = Math.round((url.length - url.indexOf(",") - 1) * 3 / 4 / 1024);
        if (kb <= ${MAX_KB} || q === ${CALIDADES[CALIDADES.length - 1]}) return { url, kb, q };
      }
    })()`;
    const r = await cdp.s("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, ses);
    if (r.exceptionDetails) { console.error(slug + ": " + r.exceptionDetails.text); continue; }
    const v = r.result.value;

    const kbAntes = Math.round(bytes.length / 1024);
    antes += kbAntes; despues += v.kb;
    console.log("  " + slug.padEnd(22) + String(kbAntes).padStart(4) + " KB  ->  " +
      String(v.kb).padStart(3) + " KB   q=" + v.q +
      "   (-" + Math.round((1 - v.kb / kbAntes) * 100) + "%)");

    if (ESCRIBIR) {
      writeFileSync(destino, Buffer.from(v.url.slice(v.url.indexOf(",") + 1), "base64"));
    }
  }

  console.log("");
  console.log("  TOTAL  " + antes + " KB  ->  " + despues + " KB   " +
    "(-" + Math.round((1 - despues / antes) * 100) + "%, " + (antes - despues) + " KB menos por visita)");
  if (!ESCRIBIR) {
    console.log("");
    console.log("Nada escrito. Repite con --escribir.");
  }
  return 0;
}

principal()
  .then((c) => { chrome.kill(); try { rmSync(PERFIL, { recursive: true, force: true }); } catch (e) {} process.exit(c); })
  .catch((e) => { console.error("Error: " + (e && e.message ? e.message : e));
    chrome.kill(); try { rmSync(PERFIL, { recursive: true, force: true }); } catch (e2) {} process.exit(1); });
