/* Servidor estático mínimo para revisar el sitio en local.
   No forma parte del sitio publicado: GitHub Pages sirve los archivos tal
   cual. Existe solo para poder abrir el catálogo sin file://, que rompería
   fetch() y la política de contenido.

   Uso:  node scripts/servidor-local.mjs   ->  http://127.0.0.1:4173/ */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 4173;

const TIPOS = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".webp":"image/webp", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",
  ".svg":"image/svg+xml", ".mp4":"video/mp4", ".woff2":"font/woff2", ".ico":"image/x-icon" };

createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  // normalize() antes de comprobar: sin esto un «..» en la ruta saldría
  // de la carpeta del sitio y serviría cualquier archivo del disco.
  const f = normalize(join(RAIZ, p));
  if (!f.startsWith(RAIZ) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": TIPOS[extname(f).toLowerCase()] || "application/octet-stream" });
  r.end(readFileSync(f));
}).listen(PUERTO, "127.0.0.1", () => console.log("Sitio local en http://127.0.0.1:" + PUERTO + "/"));
