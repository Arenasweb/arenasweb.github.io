/* ================================================================
   ARENAS MOTOCICLETAS — scripts/leer-imagen.mjs
   Ancho, alto, peso y formato de una imagen, leyendo su cabecera.

   Sin ImageMagick, sin Sharp, sin npm install: cada formato declara sus
   medidas en los primeros bytes del archivo, y eso es todo lo que hace
   falta para comprobar que una fotografía llega con la proporción y el
   tamaño correctos.

   Vive en su propio archivo para que scripts/qa-tests.mjs pueda
   probarlo contra imágenes reales de dimensiones conocidas. Una
   herramienta de verificación que nadie verifica no sirve de nada.

   Si un formato no se reconoce se devuelve `formato: "desconocido"` y
   las medidas en null. Nunca se adivina un número.
   ================================================================ */

import { statSync, openSync, readSync, closeSync } from "node:fs";

/** Lee los primeros n bytes sin cargar el archivo entero. */
function cabecera(ruta, n) {
  const fd = openSync(ruta, "r");
  try {
    const buf = Buffer.alloc(n);
    const leidos = readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, leidos);
  } finally {
    closeSync(fd);
  }
}

export function dimensionesPNG(b) {
  // Firma de 8 bytes y trozo IHDR: ancho y alto en 32 bits big-endian.
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  if (b.subarray(12, 16).toString("latin1") !== "IHDR") return null;
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20), formato: "PNG" };
}

export function dimensionesJPEG(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marca = b[i + 1];
    // Los marcadores SOF llevan las medidas. Se excluyen DHT (c4),
    // JPGA (c8) y DAC (cc), que comparten rango pero no son SOF.
    if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
      return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7), formato: "JPEG" };
    }
    // Marcadores sin carga útil.
    if (marca === 0x01 || (marca >= 0xd0 && marca <= 0xd9)) {
      i += 2;
      continue;
    }
    if (i + 4 > b.length) return null;
    const largo = b.readUInt16BE(i + 2);
    if (largo < 2) return null;
    i += 2 + largo;
  }
  return null;
}

export function dimensionesWEBP(b) {
  if (b.length < 30) return null;
  if (b.subarray(0, 4).toString("latin1") !== "RIFF") return null;
  if (b.subarray(8, 12).toString("latin1") !== "WEBP") return null;
  const tipo = b.subarray(12, 16).toString("latin1");

  if (tipo === "VP8 ") {
    // Con pérdida: tras la marca de sincronía, 14 bits por eje.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return {
      ancho: b.readUInt16LE(26) & 0x3fff,
      alto: b.readUInt16LE(28) & 0x3fff,
      formato: "WebP",
    };
  }
  if (tipo === "VP8L") {
    // Sin pérdida: (ancho-1) y (alto-1) en 14 bits empaquetados.
    if (b[20] !== 0x2f) return null;
    const bits = b.readUInt32LE(21);
    return {
      ancho: (bits & 0x3fff) + 1,
      alto: ((bits >> 14) & 0x3fff) + 1,
      formato: "WebP sin pérdida",
    };
  }
  if (tipo === "VP8X") {
    // Extendido (alfa, animación): lienzo en 24 bits little-endian.
    return {
      ancho: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1,
      alto: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1,
      formato: "WebP extendido",
    };
  }
  return null;
}

export function dimensionesAVIF(b) {
  // AVIF es ISOBMFF: el trozo "ispe" lleva las medidas, en dos enteros
  // de 32 bits tras la versión y las banderas.
  const i = b.indexOf("ispe", 0, "latin1");
  if (i === -1 || i + 16 > b.length) return null;
  return { ancho: b.readUInt32BE(i + 8), alto: b.readUInt32BE(i + 12), formato: "AVIF" };
}

/**
 * Inspecciona una imagen del disco.
 * @param {string} rutaAbs
 * @returns {{bytes:number, kb:number, ancho:number|null, alto:number|null, formato:string}}
 */
export function inspeccionar(rutaAbs) {
  const bytes = statSync(rutaAbs).size;
  const base = { bytes, kb: Math.round(bytes / 1024) };
  let b;
  try {
    b = cabecera(rutaAbs, 8192);
  } catch {
    return { ...base, ancho: null, alto: null, formato: "ilegible" };
  }
  const d = dimensionesWEBP(b) || dimensionesPNG(b) || dimensionesJPEG(b) || dimensionesAVIF(b);
  if (!d) return { ...base, ancho: null, alto: null, formato: "desconocido" };
  return { ...base, ancho: d.ancho, alto: d.alto, formato: d.formato };
}
