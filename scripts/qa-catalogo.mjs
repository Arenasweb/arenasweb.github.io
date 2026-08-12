#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-catalogo.mjs
   Auditoría local del contenido del catálogo. Sin dependencias.

       node scripts/qa-catalogo.mjs
       node scripts/qa-catalogo.mjs --detalle     (lista modelo a modelo)
       node scripts/qa-catalogo.mjs --matriz      (tablero de todos los modelos)
       node scripts/qa-catalogo.mjs --faltantes   (qué pedir, ordenado por prioridad)
       node scripts/qa-catalogo.mjs --json        (salida para otra herramienta)
       node scripts/qa-catalogo.mjs --slug a,b    (limita el informe a esos slugs)
       node scripts/qa-catalogo.mjs --fuente X    (audita otro archivo del mismo contrato)

   CRITERIO DE SALIDA:
     exit 0 → no hay errores ESTRUCTURALES. El catálogo se puede servir.
     exit 1 → hay al menos un error estructural (JSON roto, id o slug
              duplicado, categoría fuera de taxonomía, ruta insegura…).

   El contenido incompleto NUNCA es un error: es una ADVERTENCIA. Un
   catálogo a medio llenar es un estado de trabajo legítimo; una ruta con
   `..` o dos modelos con el mismo slug, no.
   ================================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  CATEGORIAS,
  ESTADOS,
  PREFIJOS_LOCALES,
  PROVISIONALES,
  PRIORIDADES,
} from "./reglas-catalogo.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FUENTE = join(RAIZ, "data/catalogo-publico.local.json");
const FIXTURE_COLORES = join(RAIZ, "data/catalogo-colores-demo.local.json");

const args = process.argv.slice(2);
const DETALLE = args.includes("--detalle");
const JSON_OUT = args.includes("--json");
const FALTANTES = args.includes("--faltantes");
const MATRIZ = args.includes("--matriz");

// --fuente permite auditar otro archivo con el mismo contrato: sirve para
// revisar un volcado de la hoja ANTES de darlo por bueno, y para probar
// que esta herramienta detecta de verdad lo que dice detectar.
const iFuente = args.indexOf("--fuente");
const FUENTE_ACTIVA = iFuente !== -1 && args[iFuente + 1] ? resolve(args[iFuente + 1]) : FUENTE;

// --slug limita el informe a uno o varios modelos, separados por comas.
// La revisión estructural se sigue haciendo sobre TODO el catálogo (los
// duplicados solo se ven mirando el conjunto); lo que se filtra es el
// resumen y el detalle.
const iSlug = args.indexOf("--slug");
const SLUGS = iSlug !== -1 && args[iSlug + 1]
  ? args[iSlug + 1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  : null;

const errores = [];
const avisos = [];
const info = [];
const err = (m) => errores.push(m);
const avi = (m) => avisos.push(m);
const inf = (m) => info.push(m);

/* ---------------- Utilidades ---------------- */

const texto = (v) => (v === null || v === undefined || typeof v === "object" ? "" : String(v).trim());
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function esProvisional(v) {
  const t = texto(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !!t && PROVISIONALES.some((p) => t.includes(p));
}

/** Misma política que catalogo-utils.js → rutaImagen(). */
function revisarRuta(ruta, donde) {
  const r = texto(ruta);
  if (!r) return null;
  if (/^\s*(javascript|data|vbscript|file|blob|about):/i.test(r)) {
    err(`${donde}: esquema activo prohibido en "${r}"`);
    return "insegura";
  }
  if (r.includes("..")) { err(`${donde}: escape de directorio en "${r}"`); return "insegura"; }
  if (r.startsWith("//")) { err(`${donde}: URL protocolo-relativa "${r}"`); return "insegura"; }
  if (/^https?:/i.test(r)) { err(`${donde}: URL externa no autorizada "${r}"`); return "insegura"; }
  if (/[<>"'\\]/.test(r)) { err(`${donde}: carácter no permitido en "${r}" (¿ruta de Windows?)`); return "insegura"; }
  if (!PREFIJOS_LOCALES.some((p) => r.startsWith(p))) {
    err(`${donde}: la ruta debe empezar por ${PREFIJOS_LOCALES.join(", ")} — "${r}"`);
    return "insegura";
  }
  if (!existsSync(join(RAIZ, r))) { avi(`${donde}: el archivo no existe todavía — "${r}"`); return "faltante"; }
  return "ok";
}

/* ---------------- Carga ---------------- */

let datos;
try {
  datos = JSON.parse(readFileSync(FUENTE_ACTIVA, "utf8"));
} catch (e) {
  console.error("ERROR ESTRUCTURAL: no se pudo leer o interpretar " + FUENTE_ACTIVA);
  console.error("  " + e.message);
  process.exit(1);
}

const modelos = Array.isArray(datos.modelos) ? datos.modelos : Array.isArray(datos.items) ? datos.items : null;
if (!modelos) {
  console.error("ERROR ESTRUCTURAL: el archivo no contiene un array `modelos`.");
  process.exit(1);
}

const cfg = datos.config || {};
const mostrarPreciosGlobal = cfg.mostrar_precios === true || cfg.mostrarPrecios === true;

/* ---------------- Revisión modelo a modelo ---------------- */

const vistosId = new Map();
const vistosSlug = new Map();
const informes = [];

for (const m of modelos) {
  const id = texto(m.id);
  const slug = texto(m.slug).toLowerCase();
  const nombre = texto(m.modelo);
  const etiqueta = nombre || slug || id || "(registro sin identidad)";

  // --- Estructura ---
  if (!id) err(`${etiqueta}: falta "id"`);
  if (!nombre) err(`${etiqueta}: falta "modelo"`);
  if (!slug) err(`${etiqueta}: falta "slug"`);
  else if (!SLUG_RE.test(slug)) err(`${etiqueta}: slug inválido "${slug}" (solo a-z, 0-9 y guiones)`);

  if (id) {
    if (vistosId.has(id)) err(`id duplicado "${id}": ${vistosId.get(id)} y ${etiqueta}`);
    else vistosId.set(id, etiqueta);
  }
  if (slug) {
    if (vistosSlug.has(slug)) err(`slug duplicado "${slug}": ${vistosSlug.get(slug)} y ${etiqueta}`);
    else vistosSlug.set(slug, etiqueta);
  }

  const categoria = texto(m.categoria).toLowerCase();
  if (!categoria) err(`${etiqueta}: falta "categoria"`);
  else if (!CATEGORIAS.includes(categoria)) err(`${etiqueta}: categoría "${categoria}" fuera de la taxonomía (${CATEGORIAS.join(", ")})`);

  const estado = texto(m.estado_contenido).toUpperCase().replace(/\s+/g, "_");
  if (estado && !ESTADOS.includes(estado)) avi(`${etiqueta}: estado_contenido "${estado}" no reconocido, se tratará como BORRADOR`);

  const orden = m.orden;
  if (orden !== undefined && orden !== null && orden !== "" && !Number.isFinite(Number(orden))) {
    avi(`${etiqueta}: "orden" no es un número ("${orden}")`);
  }

  // --- Rutas ---
  const rutas = {
    imagen_principal: revisarRuta(m.imagen_principal, `${etiqueta} → imagen_principal`),
    imagen_mobile: revisarRuta(m.imagen_mobile, `${etiqueta} → imagen_mobile`),
    galeria_1: revisarRuta(m.galeria_1, `${etiqueta} → galeria_1`),
    galeria_2: revisarRuta(m.galeria_2, `${etiqueta} → galeria_2`),
  };

  // FOTOGRAFÍA UTILIZABLE, no «celda no vacía».
  //
  // Se reutiliza la decisión que `revisarRuta()` acaba de tomar, en lugar
  // de volver a mirar el campo con otro criterio. Ese era exactamente el
  // problema: la ruta se validaba dos veces, una para levantar el error
  // —que funcionaba— y otra, con un simple `!!texto()`, para decidir si
  // el modelo era publicable. Así, `../../secreto.png` producía a la vez
  // un error de escape de directorio y un modelo rotulado PUBLICADO.
  //
  // `"faltante"` SÍ cuenta como utilizable: la ruta cumple el contrato y
  // el archivo aún no está subido. De los archivos físicos se ocupa
  // scripts/qa-assets-catalogo.mjs; aquí se juzga la validez contractual
  // de la ruta.
  const rutaUtilizable = (r) => r === "ok" || r === "faltante";
  const conImagenValida = rutaUtilizable(rutas.imagen_principal);

  // --- Precio: coherencia entre bandera y valor ---
  const mostrarPrecio = m.mostrar_precio === true || m.mostrar_precio === "TRUE";
  const precio = Number(m.precio_publico);
  const precioValido = Number.isFinite(precio) && precio > 0;
  if (mostrarPrecio && !precioValido) {
    err(`${etiqueta}: mostrar_precio=TRUE pero precio_publico no es un número positivo ("${m.precio_publico}")`);
  }
  if (mostrarPrecio && !mostrarPreciosGlobal) {
    avi(`${etiqueta}: mostrar_precio=TRUE pero config.mostrar_precios está desactivado; el precio no se verá`);
  }

  // --- Publicación ---
  const activo = m.activo === true || m.activo === "TRUE";
  if (activo && estado !== "APROBADO") {
    err(`${etiqueta}: activo=TRUE con estado_contenido="${estado || "(vacío)"}" — no se publica contenido sin aprobar`);
  }
  // Mínimos publicables. Son los mismos que aplica el backend público
  // antes de emitir un modelo; si divergieran, esta herramienta diría
  // «listo» sobre algo que nunca llegaría a verse.
  if (activo && estado === "APROBADO") {
    const minimos = [];
    if (!id) minimos.push("id");
    if (!slug || !SLUG_RE.test(slug)) minimos.push("slug");
    if (!CATEGORIAS.includes(categoria)) minimos.push("categoria");
    if (!conImagenValida) minimos.push("imagen_principal");
    // Un marcador de pendiente no es contenido, ni en el alt ni en el copy.
    if (!texto(m.alt_text) || esProvisional(m.alt_text)) minimos.push("alt_text");
    if (!texto(m.descripcion_corta) || esProvisional(m.descripcion_corta)) minimos.push("descripcion_corta");
    if (minimos.length) {
      err(`${etiqueta}: aprobado y activo pero no se publicaría; falta ${minimos.join(", ")}`);
    }
  }

  // --- Contenido (advertencias, nunca errores) ---
  const caracteristicas = [m.caracteristica_1, m.caracteristica_2, m.caracteristica_3].map(texto).filter(Boolean);
  const faltan = [];
  if (!conImagenValida) faltan.push("imagen_principal");
  if (!rutaUtilizable(rutas.imagen_mobile)) faltan.push("imagen_mobile");
  if (conImagenValida && (!texto(m.alt_text) || esProvisional(m.alt_text))) faltan.push("alt_text");
  if (!texto(m.descripcion_corta) || esProvisional(m.descripcion_corta)) faltan.push("descripcion_corta");
  if (!texto(m.descripcion_larga) || esProvisional(m.descripcion_larga)) faltan.push("descripcion_larga");
  if (!caracteristicas.length) faltan.push("caracteristicas");
  if (!texto(m.linea)) faltan.push("linea");

  if (esProvisional(m.descripcion_corta)) avi(`${etiqueta}: descripcion_corta parece texto provisional`);
  if (esProvisional(m.descripcion_larga)) avi(`${etiqueta}: descripcion_larga parece texto provisional`);

  const colores = Array.isArray(m.colores) ? m.colores.filter(Boolean) : texto(m.colores) ? texto(m.colores).split(/[,;|]/).filter(Boolean) : [];

  // PUBLICABLE: identidad + taxonomía + contenido mínimo. NO incluye
  // `activo` ni `estado_contenido`, que son la decisión de publicar.
  // Es la misma definición que aplican el backend y el navegador.
  const publicable =
    !!id &&
    !!nombre &&
    !!slug &&
    SLUG_RE.test(slug) &&
    CATEGORIAS.includes(categoria) &&
    conImagenValida &&
    !!texto(m.alt_text) &&
    !esProvisional(m.alt_text) &&
    !!texto(m.descripcion_corta) &&
    !esProvisional(m.descripcion_corta);

  informes.push({
    publicable,
    id, slug, modelo: nombre, categoria,
    linea: texto(m.linea),
    estado: estado || "BORRADOR",
    activo,
    destacado: m.destacado === true || m.destacado === "TRUE",
    nuevo: m.nuevo === true || m.nuevo === "TRUE",
    // Fotografía UTILIZABLE, con la decisión del validador de rutas.
    // Una celda llena con `../../secreto.png` o `javascript:` no cuenta.
    conImagen: conImagenValida,
    conImagenMobile: rutaUtilizable(rutas.imagen_mobile),
    // ALT REAL, no simplemente ALT NO VACÍO. Un "PENDIENTE" no describe
    // ninguna fotografía, y tratarlo como válido hacía que esta
    // herramienta rotulase como PUBLICADO un modelo que el backend, el
    // esquema del navegador y el módulo de completitud rechazan.
    conAlt: !!texto(m.alt_text) && !esProvisional(m.alt_text),
    conDescCorta: !!texto(m.descripcion_corta) && !esProvisional(m.descripcion_corta),
    conDescLarga: !!texto(m.descripcion_larga) && !esProvisional(m.descripcion_larga),
    caracteristicas: caracteristicas.length,
    colores: colores.length,
    precioPublicado: mostrarPrecio && precioValido && mostrarPreciosGlobal,
    faltan,
  });
}

/* ---------------- Coherencia de la taxonomía ---------------- */

// El frontend arma los chips de categoría cruzando las categorías DECLARADAS
// en el archivo con las que realmente usan los modelos visibles
// (catalogo-data.js → categoriasConModelos). Si un modelo vive en una
// categoría que el archivo no declara, ese modelo se sigue viendo pero queda
// sin chip: nadie puede filtrarlo, y su etiqueta cae al slug en crudo.
// Por eso esto es un aviso con nombre y apellidos, no una nota al pie.
const declaradas = Array.isArray(datos.categorias)
  ? datos.categorias
  : Array.isArray(datos.categories)
    ? datos.categories
    : [];
const slugsDeclarados = new Set(declaradas.map((c) => texto(c && c.slug).toLowerCase()).filter(Boolean));

if (slugsDeclarados.size) {
  const usadas = new Map();
  informes.forEach((i) => usadas.set(i.categoria, (usadas.get(i.categoria) || 0) + 1));

  for (const [cat, cuantos] of usadas) {
    if (!cat || slugsDeclarados.has(cat)) continue;
    avi(
      `categoría "${cat}": ${cuantos} modelo(s) la usan pero el archivo no la declara en "categories" ` +
        `— se verían sin chip de filtro y con la etiqueta en crudo`
    );
  }
  for (const cat of slugsDeclarados) {
    if (!usadas.has(cat)) inf(`categoría "${cat}": declarada pero sin ningún modelo`);
  }
  for (const cat of slugsDeclarados) {
    if (!CATEGORIAS.includes(cat)) err(`categoría declarada "${cat}" fuera de la taxonomía cerrada`);
  }
}

/* ---------------- Fixture de colores ---------------- */

if (existsSync(FIXTURE_COLORES)) {
  try {
    const fx = JSON.parse(readFileSync(FIXTURE_COLORES, "utf8"));
    const filas = Array.isArray(fx.colores) ? fx.colores : [];
    const sinMarca = filas.filter((c) => texto(c._origen).toLowerCase() !== "demo-local");
    if (sinMarca.length) {
      err(`fixture de colores: ${sinMarca.length} fila(s) sin el marcador _origen="demo-local" (defensa M-4)`);
    }
    const idsModelo = new Set(informes.map((i) => i.id));
    const huerfanos = filas.filter((c) => texto(c.modelo_id) && !idsModelo.has(texto(c.modelo_id)));
    if (huerfanos.length) {
      inf(`fixture de colores: ${huerfanos.length} fila(s) apuntan a un modelo inexistente (caso de prueba previsto)`);
    }
    inf(`fixture de colores: ${filas.length} variantes DEMO, solo cargables en local con ?preview=1`);
  } catch (e) {
    err("fixture de colores: JSON inválido — " + e.message);
  }
}

/* ---------------- Resumen ---------------- */

// El resumen se calcula sobre el subconjunto pedido; los errores
// estructurales, sobre el catálogo entero.
const foco = SLUGS ? informes.filter((i) => SLUGS.includes(i.slug)) : informes;

if (SLUGS) {
  const noEncontrados = SLUGS.filter((s) => !informes.some((i) => i.slug === s));
  noEncontrados.forEach((s) => avi(`--slug "${s}": no existe ningún modelo con ese slug`));
}

const n = (f) => foco.filter(f).length;
const resumen = {
  modelos: foco.length,
  // PUBLICADO = PUBLICABLE + activo + APROBADO. Antes bastaban las dos
  // banderas, así que un modelo sin identidad, sin foto o con el alt en
  // "PENDIENTE" contaba como publicado aunque no llegara a verse.
  publicados: n((i) => i.publicable && i.activo && i.estado === "APROBADO"),
  aprobados: n((i) => i.estado === "APROBADO"),
  borradores: n((i) => i.estado !== "APROBADO"),
  // «Listo» = PUBLICABLE, con independencia de que ya se haya activado.
  // Un modelo con el contenido completo pero todavía en BORRADOR está
  // listo y no está publicado: es exactamente lo que hay que poder ver.
  listosParaPublicar: n((i) => i.publicable),
  sinImagen: n((i) => !i.conImagen),
  sinImagenMobile: n((i) => !i.conImagenMobile),
  sinAlt: n((i) => i.conImagen && !i.conAlt),
  sinDescripcionCorta: n((i) => !i.conDescCorta),
  sinDescripcionLarga: n((i) => !i.conDescLarga),
  sinCaracteristicas: n((i) => i.caracteristicas === 0),
  sinColores: n((i) => i.colores === 0),
  sinPrecio: n((i) => !i.precioPublicado),
  destacados: n((i) => i.destacado),
  nuevos: n((i) => i.nuevo),
};

/** Agrupa lo que falta de un modelo por prioridad, de P0 a P3. */
function porPrioridad(informe) {
  const grupos = { P0: [], P1: [], P2: [], P3: [] };
  informe.faltan.forEach((campo) => {
    grupos[PRIORIDADES[campo] || "P3"].push(campo);
  });
  return grupos;
}

if (JSON_OUT) {
  const salida = foco.map((i) => ({ ...i, prioridades: porPrioridad(i) }));
  console.log(JSON.stringify({ resumen, errores, avisos, info, modelos: salida }, null, 2));
  process.exit(errores.length ? 1 : 0);
}

const linea = (k, v, total) => {
  const barra = total ? " " + "#".repeat(Math.round((v / total) * 16)).padEnd(16, ".") : "";
  return "  " + String(k).padEnd(26) + String(v).padStart(4) + barra;
};

console.log("");
console.log("ARENAS — AUDITORÍA DE CONTENIDO DEL CATÁLOGO");
console.log("fuente: " + FUENTE_ACTIVA.replace(RAIZ + "\\\\", "").replace(RAIZ + "/", ""));
console.log("");
console.log("RESUMEN");
console.log(linea("modelos", resumen.modelos));
console.log(linea("publicados", resumen.publicados, resumen.modelos));
console.log(linea("aprobados", resumen.aprobados, resumen.modelos));
console.log(linea("borradores", resumen.borradores, resumen.modelos));
console.log(linea("listos para publicar", resumen.listosParaPublicar, resumen.modelos));
console.log("");
console.log("CONTENIDO PENDIENTE");
console.log(linea("sin imagen", resumen.sinImagen, resumen.modelos));
console.log(linea("sin imagen mobile", resumen.sinImagenMobile, resumen.modelos));
console.log(linea("sin alt_text", resumen.sinAlt, resumen.modelos));
console.log(linea("sin descripcion corta", resumen.sinDescripcionCorta, resumen.modelos));
console.log(linea("sin descripcion larga", resumen.sinDescripcionLarga, resumen.modelos));
console.log(linea("sin caracteristicas", resumen.sinCaracteristicas, resumen.modelos));
console.log(linea("sin colores (opcional)", resumen.sinColores, resumen.modelos));
console.log(linea("sin precio (opcional)", resumen.sinPrecio, resumen.modelos));
console.log("");
console.log("MARCAS EDITORIALES");
console.log(linea("destacados", resumen.destacados, resumen.modelos));
console.log(linea("nuevos", resumen.nuevos, resumen.modelos));

if (DETALLE) {
  console.log("");
  console.log("DETALLE POR MODELO");
  for (const i of foco) {
    const estado = i.publicable && i.activo && i.estado === "APROBADO" ? "PUBLICADO" : i.estado;
    console.log(`  ${i.modelo.padEnd(28)} ${estado.padEnd(11)} ${i.faltan.length ? "falta: " + i.faltan.join(", ") : "completo"}`);
  }
}

/* ---------------- --faltantes: qué pedir y en qué orden ---------------- */

if (FALTANTES) {
  console.log("");
  console.log("QUÉ FALTA, POR MODELO Y PRIORIDAD");
  console.log("  P0 bloquea · P1 antes de publicar · P2 mejora · P3 opcional");
  for (const i of foco) {
    const g = porPrioridad(i);
    const total = i.faltan.length;
    console.log("");
    console.log(`  ${i.modelo}  (${i.slug})`);
    if (!total) {
      console.log("    nada pendiente");
      continue;
    }
    ["P0", "P1", "P2", "P3"].forEach((p) => {
      g[p].forEach((campo) => console.log(`    [${p}] ${campo}`));
    });
  }

  // Recuento agregado: cuántos modelos esperan cada campo.
  const cuenta = new Map();
  foco.forEach((i) => i.faltan.forEach((c) => cuenta.set(c, (cuenta.get(c) || 0) + 1)));
  const ordenado = [...cuenta.entries()].sort((a, b) => {
    const pa = PRIORIDADES[a[0]] || "P3";
    const pb = PRIORIDADES[b[0]] || "P3";
    return pa === pb ? b[1] - a[1] : pa.localeCompare(pb);
  });
  if (ordenado.length) {
    console.log("");
    console.log("  TOTAL POR CAMPO");
    ordenado.forEach(([campo, n]) =>
      console.log(`    [${PRIORIDADES[campo] || "P3"}] ${campo.padEnd(20)} ${String(n).padStart(3)} modelo(s)`)
    );
  }
}

/* ---------------- --matriz: tablero de todos los modelos ---------------- */

if (MATRIZ) {
  // Una matriz calculada en el momento. Deliberadamente NO se escribe a un
  // documento: una tabla de 22 filas copiada a mano queda obsoleta en cuanto
  // alguien toca la hoja, y entonces engaña.
  const si = (v) => (v ? "si" : "· ");
  console.log("");
  console.log("MATRIZ DE CONTENIDO");
  console.log(
    "  " +
      "modelo".padEnd(26) +
      "categoria".padEnd(11) +
      "linea".padEnd(11) +
      "FOTO MOV ALT CORT LARG CARA COLR PREC  DEST NUE  ESTADO      %"
  );
  console.log("  " + "-".repeat(112));
  for (const i of foco) {
    const totalReq = 9; // los mismos campos que se muestran en la fila
    const cumplidos = [
      i.conImagen, i.conImagenMobile, i.conAlt, i.conDescCorta, i.conDescLarga,
      i.caracteristicas > 0, i.colores > 0, i.precioPublicado, !!i.linea,
    ].filter(Boolean).length;
    const pct = Math.round((cumplidos / totalReq) * 100);
    console.log(
      "  " +
        i.modelo.slice(0, 25).padEnd(26) +
        i.categoria.padEnd(11) +
        (i.linea || "—").slice(0, 10).padEnd(11) +
        si(i.conImagen).padEnd(5) +
        si(i.conImagenMobile).padEnd(4) +
        si(i.conAlt).padEnd(4) +
        si(i.conDescCorta).padEnd(5) +
        si(i.conDescLarga).padEnd(5) +
        si(i.caracteristicas > 0).padEnd(5) +
        si(i.colores > 0).padEnd(5) +
        si(i.precioPublicado).padEnd(6) +
        si(i.destacado).padEnd(5) +
        si(i.nuevo).padEnd(5) +
        (i.publicable && i.activo && i.estado === "APROBADO" ? "PUBLICADO" : i.estado).padEnd(12) +
        String(pct).padStart(3) + "%"
    );
  }
  console.log("");
  console.log("  FOTO=imagen_principal MOV=imagen_mobile ALT=alt_text CORT/LARG=descripciones");
  console.log("  CARA=caracteristicas COLR=colores PREC=precio publicado DEST=destacado NUE=nuevo");
}

const bloque = (titulo, lista) => {
  if (!lista.length) return;
  console.log("");
  console.log(`${titulo} (${lista.length})`);
  lista.forEach((m) => console.log("  · " + m));
};

bloque("ERRORES ESTRUCTURALES", errores);
bloque("ADVERTENCIAS", avisos);
bloque("INFORMACIÓN", info);

console.log("");
if (errores.length) {
  console.log(`RESULTADO: ${errores.length} error(es) estructural(es). El catálogo NO está listo.`);
  process.exit(1);
}
console.log("RESULTADO: sin errores estructurales.");
console.log("El contenido incompleto es esperado mientras el catálogo se llena.");
process.exit(0);
