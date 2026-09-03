/* Escribe INVENTARIO.md en el USB: qué hay, cuánto pesa y la huella de lo
   que no se puede volver a fabricar.

   POR QUÉ LAS HUELLAS
   Un respaldo sin forma de comprobarlo es una promesa. Un USB puede
   escribir mal un sector y no avisar; el archivo sigue ahí, con su tamaño
   correcto, y solo se descubre el día que hace falta. Con la huella
   SHA-256 se sabe en un minuto, y se sabe ANTES de formatear.

   Se firma lo irreemplazable —el paquete de git y el material de origen—,
   no los 850 archivos: recorrer 590 MB desde un USB tarda, y el proyecto
   ya está firmado dentro del propio paquete de git. */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

/* La carpeta del respaldo. Se pasa como argumento para que el script no
   dependa de que el USB caiga siempre en la misma letra: en otro
   ordenador sera otra.

       node scripts/inventario-respaldo.mjs E:/ARENAS-RESPALDO-20260903 */
const USB = (process.argv[2] || "E:/ARENAS-RESPALDO-20260903").split(String.fromCharCode(92)).join("/");
if (!existsSync(USB)) {
  console.error("No existe la carpeta del respaldo: " + USB);
  process.exit(1);
}

function archivos(dir) {
  const salida = [];
  if (!existsSync(dir)) return salida;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) salida.push(...archivos(p));
    else salida.push({ ruta: p, bytes: st.size });
  }
  return salida;
}

function mb(bytes) { return (bytes / 1048576).toFixed(1); }

function huella(ruta) {
  const h = createHash("sha256");
  h.update(readFileSync(ruta));
  return h.digest("hex");
}

const bloques = [
  ["proyecto/arenasweb.github.io", "El proyecto completo, con su historial de git dentro"],
  ["plantilla-limpia", "El mismo sitio sin un solo dato del negocio"],
  ["claude-code-config", "Memoria, ajustes y transcritos de Claude Code"],
];

const L = [
  "# Inventario del respaldo",
  "",
  "ARENAS MOTOCICLETAS — " + new Date().toISOString().slice(0, 10),
  "",
  "Para qué sirve cada cosa y cómo comprobar que llegó entera.",
  "Las instrucciones de restauración están en `EMPEZAR-AQUI.md`.",
  "",
  "---",
  "",
  "## Qué hay",
  "",
  "| Carpeta | Archivos | Peso | Qué es |",
  "|---|---:|---:|---|",
];

let totalBytes = 0, totalArchivos = 0;
for (const [rel, que] of bloques) {
  const fs_ = archivos(join(USB, rel));
  const bytes = fs_.reduce((a, f) => a + f.bytes, 0);
  totalBytes += bytes; totalArchivos += fs_.length;
  L.push("| `" + rel + "/` | " + fs_.length + " | " + mb(bytes) + " MB | " + que + " |");
}

const sueltos = readdirSync(USB).filter(n => statSync(join(USB, n)).isFile());
for (const n of sueltos) {
  const b = statSync(join(USB, n)).size;
  totalBytes += b; totalArchivos++;
}
L.push("| _(archivos sueltos)_ | " + sueltos.length + " | " +
  mb(sueltos.reduce((a, n) => a + statSync(join(USB, n)).size, 0)) + " MB | Guías, script de restauración y el paquete de git |");
L.push("");
L.push("**Total: " + totalArchivos.toLocaleString("es") + " archivos, " + (totalBytes / 1073741824).toFixed(2) + " GB.**");

L.push("", "---", "", "## Lo que NO se puede recuperar de GitHub", "");
L.push("Si esto se pierde, se pierde. No hay otra copia.", "");
L.push("| Qué | Peso | Por qué no está en GitHub |");
L.push("|---|---:|---|");

const mat = archivos(join(USB, "proyecto/arenasweb.github.io/material-origen"));
const fotos = archivos(join(USB, "proyecto/arenasweb.github.io/assets/catalogo"))
  .filter(f => f.ruta.includes("photos") && f.ruta.endsWith(".png"));
L.push("| `material-origen/` | " + mb(mat.reduce((a, f) => a + f.bytes, 0)) +
  " MB | Buzón de material sin procesar. Fuera de Git a propósito: el repositorio es público y GitHub Pages sirve todo lo que hay dentro. |");
L.push("| Másters fotográficos | " + mb(fotos.reduce((a, f) => a + f.bytes, 0)) +
  " MB | Recortes de hasta 50 MB. La web usa los derivados WebP; meter los másters dejaría el repositorio en 300 MB para siempre. |");
L.push("| Commits sin subir | — | Trabajo que nunca llegó a GitHub, incluida la versión v2.1 entera. |");
L.push("| Memoria de Claude Code | " + mb(archivos(join(USB, "claude-code-config")).reduce((a, f) => a + f.bytes, 0)) +
  " MB | Vive en el perfil del usuario, no en el proyecto. El formateo se la lleva. |");

L.push("", "---", "", "## Huellas de comprobación", "");
L.push("SHA-256 de lo irreemplazable. Para verificar en el ordenador nuevo:", "");
L.push("```powershell");
L.push("Get-FileHash -Algorithm SHA256 <archivo>");
L.push("```", "");
L.push("| Archivo | Peso | SHA-256 |");
L.push("|---|---:|---|");

const firmar = [
  "arenas-historial-nuevo.bundle",
  "arenas-historial-completo.bundle",
  "EMPEZAR-AQUI.md",
  "restaurar.ps1",
];
for (const n of firmar) {
  const p = join(USB, n);
  if (!existsSync(p)) continue;
  L.push("| `" + n + "` | " + mb(statSync(p).size) + " MB | `" + huella(p) + "` |");
}

L.push("", "### Material de origen, archivo a archivo", "");
L.push("Son los originales que solo existen aquí.", "");
L.push("| Archivo | KB | SHA-256 (primeros 16) |");
L.push("|---|---:|---|");
const base = join(USB, "proyecto/arenasweb.github.io/material-origen");
for (const f of mat.sort((a, b) => a.ruta.localeCompare(b.ruta))) {
  L.push("| `" + relative(base, f.ruta).replace(/\\/g, "/") + "` | " +
    Math.round(f.bytes / 1024) + " | `" + huella(f.ruta).slice(0, 16) + "` |");
}

L.push("", "---", "");
L.push("Generado por `scripts/inventario-respaldo.mjs` del proyecto. Para rehacerlo:");
L.push("", "    node scripts/inventario-respaldo.mjs " + USB);

writeFileSync(join(USB, "INVENTARIO.md"), L.join("\n") + "\n", "utf8");
console.log("INVENTARIO.md escrito");
console.log("  " + totalArchivos + " archivos, " + (totalBytes / 1073741824).toFixed(2) + " GB");
console.log("  " + mat.length + " archivos de material-origen firmados uno a uno");
