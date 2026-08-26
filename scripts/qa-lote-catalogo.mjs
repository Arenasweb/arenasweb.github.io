#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-lote-catalogo.mjs
   Validador del LOTE DE RECEPCIÓN, antes de que nada entre en Google
   Sheets. Sin dependencias, sin red, sin escribir nada.

       node scripts/qa-lote-catalogo.mjs lote.csv
       node scripts/qa-lote-catalogo.mjs lote.json
       node scripts/qa-lote-catalogo.mjs lote.csv --detalle
       node scripts/qa-lote-catalogo.mjs lote.csv --json
       node scripts/qa-lote-catalogo.mjs lote.csv --assets D:\fotos-origen
       node scripts/qa-lote-catalogo.mjs lote.csv --identidades otro.json

   QUÉ HUECO CUBRE
   Las herramientas que ya existen miran otro momento del proceso:

     qa-catalogo             el JSON del contrato PÚBLICO, ya normalizado
     qa-assets-catalogo      las fotos YA colocadas en assets/catalogo/
     qa-verificar-migracion  una exportación de MODELOS_WEB ya migrada

   Ninguna mira la **ficha de recepción**: la hoja de trabajo con las
   especificaciones verificadas y las rutas de las fotos ORIGEN, que es
   donde se detecta un error barato.

   LO QUE NO HACE
   No escribe en Google Sheets, no convierte imágenes, no mueve archivos,
   no aprueba ni activa nada. Lee y opina.

   LA REGLA QUE GOBIERNA TODO
   Una celda vacía es «no verificado», nunca un dato negativo:

     abs vacío            → no verificado. NO significa «sin ABS».
     precio vacío         → precio oculto.  NO significa cero.
     colores vacío        → no registrado.  NO significa «un solo color».

   Confundir ausencia con negación es inventar un dato con forma de
   hueco, y eso es exactamente lo que este proyecto no hace.

   ANTE LA DUDA, BLOQUEA
   Un validador permisivo es peor que no tenerlo: da un APTO que nadie
   vuelve a comprobar. Cuando una fila es ambigua, se detiene.

   Códigos de salida:
     0  el lote se puede cargar
     1  hay al menos un bloqueante
     2  uso inválido o archivo ilegible
   ================================================================ */

import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname, isAbsolute } from "node:path";
import { CATEGORIAS, PROVISIONALES } from "./reglas-catalogo.mjs";
import { inspeccionar } from "./leer-imagen.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ================================================================
   Argumentos
   ================================================================ */

const argv = process.argv.slice(2);
const DETALLE = argv.includes("--detalle");
const JSON_MODE = argv.includes("--json");

function opcion(nombre) {
  const pref = "--" + nombre + "=";
  const conIgual = argv.find((a) => a.startsWith(pref));
  if (conIgual) return conIgual.slice(pref.length);
  const i = argv.indexOf("--" + nombre);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return null;
}

const BASE_ASSETS = opcion("assets");
const IDENTIDADES = opcion("identidades");

/** El primer argumento suelto que no sea el valor de otra opción. */
const valoresDeOpcion = new Set([BASE_ASSETS, IDENTIDADES].filter(Boolean));
const ARCHIVO = argv.find((a) => !a.startsWith("--") && !valoresDeOpcion.has(a)) || null;

if (!ARCHIVO) {
  console.error("Uso: node scripts/qa-lote-catalogo.mjs <lote.csv|lote.json> [--detalle] [--json]");
  console.error("                                       [--assets <carpeta>] [--identidades <archivo>]");
  console.error("");
  console.error("La plantilla de recepción está en docs/plantilla-recepcion-modelos.csv");
  process.exit(2);
}
if (!existsSync(ARCHIVO)) {
  console.error("No existe el archivo: " + ARCHIVO);
  process.exit(2);
}

/* ================================================================
   Contrato de la ficha de recepción
   ================================================================ */

/** Las 27 columnas de la plantilla, en orden. */
const COLUMNAS = [
  "accion", "modelo", "linea", "categoria", "ficha_oficial",
  "cilindrada_cc", "potencia_hp", "torque_nm", "refrigeracion",
  "sistema_combustible", "transmision", "numero_marchas",
  "freno_delantero", "freno_trasero", "abs",
  "capacidad_tanque_l", "peso_kg", "colores",
  "precio_publico", "mostrar_precio", "destacado", "nuevo",
  "imagen_principal_origen", "imagen_mobile_origen",
  "galeria_1_origen", "galeria_2_origen", "observaciones",
];

const OBLIGATORIAS = ["modelo", "categoria"];

/**
 * Qué se puede pedir sobre una fila.
 *
 * `retirar` NO borra nada. Deja el modelo fuera del catálogo poniendo
 * `activo = FALSE` en su fila, que sigue existiendo con su `id`, su
 * `slug` y sus textos. Si la moto vuelve el mes siguiente se reactiva
 * en una celda, y los enlaces que alguien compartiera no se rompen.
 * Borrar es irreversible; desactivar no.
 */
const ACCIONES = ["nuevo", "actualizar", "retirar"];

/**
 * Rangos de verosimilitud. NO son verdades del fabricante: son cotas
 * para detectar una errata de tecleo (un 1250 donde iba 125). Un valor
 * fuera de rango se señala para que una persona lo mire.
 *
 * `decimales` es el máximo admitido. 0 significa que debe ser entero:
 * media marcha no existe.
 */
const RANGOS = {
  cilindrada_cc: { min: 50, max: 2000, unidad: "cm³", decimales: 1 },
  potencia_hp: { min: 1, max: 300, unidad: "HP", decimales: 2 },
  torque_nm: { min: 1, max: 300, unidad: "N·m", decimales: 2 },
  numero_marchas: { min: 1, max: 8, unidad: "marchas", decimales: 0 },
  capacidad_tanque_l: { min: 2, max: 30, unidad: "L", decimales: 1 },
  peso_kg: { min: 50, max: 500, unidad: "kg", decimales: 1 },
};

/** Listas cerradas. Vacío siempre es admisible: significa no verificado. */
const LISTAS = {
  refrigeracion: ["aire", "aceite", "liquida", "aire/aceite"],
  sistema_combustible: ["carburador", "inyeccion"],
  transmision: ["manual", "automatica", "semiautomatica"],
  freno_delantero: ["disco", "tambor"],
  freno_trasero: ["disco", "tambor"],
};

/** Ternario explícito: sí / no / no verificado. */
const TERNARIOS = ["abs"];
/** Booleanos editoriales: vacío = no. */
const BOOLEANOS = ["mostrar_precio", "destacado", "nuevo"];

/**
 * TODO campo que sea una especificación técnica. Si viene cualquiera de
 * ellos, hace falta decir de dónde salió: un dato técnico sin fuente
 * verificable no se publica.
 */
const ESPECIFICACIONES = Object.keys(RANGOS)
  .concat(Object.keys(LISTAS))
  .concat(TERNARIOS);

const PROHIBIDAS = [
  "stock", "stock_real", "stock_publico", "estado_stock", "cantidad", "unidades",
  "chasis", "numero_chasis", "vin", "numero_motor", "motor_serie",
  "costo", "costo_compra", "margen", "proveedor",
  "almacen", "ubicacion", "ubicacion_almacen", "deposito",
  "cliente", "telefono_cliente", "email_cliente", "documento_cliente", "dni", "ruc",
  "garantia", "tipo_licencia", "financiamiento", "cuota", "promocion", "descuento",
];

/**
 * Estados admitidos en una ficha de RECEPCIÓN.
 *
 * `APROBADO` no está, y no es un descuido: aprobar significa «he mirado
 * esta ficha y autorizo publicarla», y eso se decide en Google Sheets,
 * modelo a modelo, con la ficha ya montada delante. Una hoja de cálculo
 * de recepción no puede aprobar 22 motocicletas de una pasada.
 *
 * `EN_REVISION` tampoco: el CMS ya no lo ofrece desde la migración del
 * 10/08/2026, y admitirlo aquí volvería a introducir un estado que la
 * hoja rechaza.
 */
const ESTADOS_RECEPCION = ["borrador"];

const FOTO = {
  minAnchoEscritorio: 1600,
  minAnchoMovil: 1280,
  proporcion: 16 / 10,
  toleranciaProporcion: 0.03,
  maxBytesOrigen: 12 * 1024 * 1024,
  extensiones: [".webp", ".jpg", ".jpeg", ".png", ".avif", ".tif", ".tiff"],
};

const COLUMNAS_FOTO = [
  ["imagen_principal_origen", "escritorio"],
  ["imagen_mobile_origen", "movil"],
  ["galeria_1_origen", "escritorio"],
  ["galeria_2_origen", "escritorio"],
];

/* ================================================================
   Estado del informe
   ================================================================ */

const bloqueantes = [];
const avisos = [];
const notas = [];
const porFila = [];

function bloquea(fila, campo, mensaje, detalle) {
  bloqueantes.push({ fila, campo, mensaje, detalle: detalle || "" });
}
function avisa(fila, campo, mensaje, detalle) {
  avisos.push({ fila, campo, mensaje, detalle: detalle || "" });
}

function salir(codigo, motivo) {
  if (JSON_MODE) {
    console.log(JSON.stringify({
      resultado: codigo === 0 ? "APTO" : "BLOQUEADO",
      archivo: ARCHIVO, motivo: motivo || "",
      filas: porFila.length, bloqueantes, avisos, notas, porFila,
    }, null, 2));
  } else {
    console.error(motivo || "");
  }
  process.exit(codigo);
}

/* ================================================================
   Normalizadores
   ================================================================ */

const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());
const vacio = (v) => txt(v) === "";

function norm(v) {
  return txt(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
const clave = (v) => norm(v).replace(/\s/g, "_");

function slugificar(v) {
  return norm(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function esProvisional(v) {
  const t = norm(v);
  if (!t) return false;
  return PROVISIONALES.some((m) => t.indexOf(m) !== -1);
}

/**
 * Número con formato inequívoco. Devuelve `{ valor, decimales }`, o
 * `null` si es ambiguo. Ese `null` NO es cero.
 */
function numero(v) {
  if (typeof v === "number") {
    if (!isFinite(v)) return null;
    const s = String(v);
    const p = s.indexOf(".");
    return { valor: v, decimales: p === -1 ? 0 : s.length - p - 1 };
  }
  const t = txt(v);
  if (!t) return null;
  const limpio = t.replace(/^S\/\s*/i, "").replace(/\s/g, "");
  let m;
  if ((m = /^(-?\d+)(?:\.(\d+))?$/.exec(limpio))) {
    return { valor: parseFloat(limpio), decimales: m[2] ? m[2].length : 0 };
  }
  if ((m = /^(-?\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/.exec(limpio))) {
    return { valor: parseFloat(limpio.replace(/,/g, "")), decimales: m[2] ? m[2].length : 0 };
  }
  return null;
}

/** ¿Este texto podría leerse de dos maneras distintas? */
function esAmbiguo(v) {
  const t = txt(v).replace(/^S\/\s*/i, "").replace(/\s/g, "");
  if (!t) return false;
  if (/^-?\d+,\d{1,2}$/.test(t)) return true;              // 12990,50
  if (/^-?\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) return true; // 12.990,50
  return numero(t) === null;
}

function ternario(v) {
  const t = norm(v);
  if (!t) return "no verificado";
  if (["si", "sí", "true", "1", "x", "yes"].indexOf(t) !== -1) return "si";
  if (["no", "false", "0"].indexOf(t) !== -1) return "no";
  return null;
}

function booleano(v) {
  const t = norm(v);
  if (!t) return false;
  if (["si", "sí", "true", "1", "x", "yes"].indexOf(t) !== -1) return true;
  if (["no", "false", "0"].indexOf(t) !== -1) return false;
  return null;
}

/* ================================================================
   Lectura: CSV o JSON
   ================================================================ */

/**
 * Lector de CSV propio. Devuelve además el estado estructural: una
 * comilla sin cerrar deja el resto del archivo dentro de una celda, y
 * eso produciría un lote «válido» con datos corridos de columna.
 */
function leerCsv(texto) {
  const filas = [];
  let campo = "";
  let fila = [];
  let enComillas = false;
  const t = texto.replace(/^\uFEFF/, "");

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; }
        else enComillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') { enComillas = true; continue; }
    if (c === ",") { fila.push(campo); campo = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; continue; }
    campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return { filas: filas.filter((f) => f.some((x) => String(x).trim() !== "")), comillaAbierta: enComillas };
}

/** ¿Es un objeto plano utilizable como fila? */
function esObjetoPlano(v) {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}

function cargarLote(ruta) {
  const crudo = readFileSync(ruta, "utf8");

  if (extname(ruta).toLowerCase() === ".json") {
    let datos;
    try { datos = JSON.parse(crudo); }
    catch (e) { throw new Error("el JSON no es interpretable: " + e.message); }

    const lista = Array.isArray(datos) ? datos
      : (datos && Array.isArray(datos.modelos) ? datos.modelos : null);
    if (!lista) throw new Error("el JSON debe ser un array, o un objeto con la clave `modelos`");
    if (!lista.length) throw new Error("el JSON no contiene ninguna fila: no hay nada que validar");

    // Cada fila tiene que ser un objeto plano. Una cadena, un número o
    // un array no son una ficha, y tratarlos como tal produciría un
    // APTO sobre algo que nadie ha rellenado.
    lista.forEach((f, i) => {
      if (!esObjetoPlano(f)) {
        bloquea(i + 1, "(fila)", "la fila no es un objeto de la ficha",
          "recibido: " + (f === null ? "null" : Array.isArray(f) ? "array" : typeof f));
      }
    });

    // Las claves se toman de la UNIÓN de todas las filas. Mirar solo la
    // primera dejaba pasar un campo prohibido que apareciera después.
    const union = [];
    lista.forEach((f) => {
      if (!esObjetoPlano(f)) return;
      Object.keys(f).forEach((k) => { if (union.indexOf(k) === -1) union.push(k); });
    });
    return { filas: lista, cabeceras: union, origen: "json" };
  }

  const { filas: tabla, comillaAbierta } = leerCsv(crudo);
  if (comillaAbierta) {
    throw new Error("hay una comilla sin cerrar: el resto del archivo se lee como una sola celda");
  }
  if (tabla.length < 2) throw new Error("el CSV no tiene ninguna fila de datos");

  const cabeceras = tabla[0].map((c) => String(c).trim());
  const filas = [];
  tabla.slice(1).forEach((f, i) => {
    const n = i + 2;
    // Una fila con más celdas que encabezados está corrida: no se puede
    // saber a qué columna pertenece cada valor.
    if (f.length !== cabeceras.length) {
      bloquea(n, "(fila)", "la fila no tiene tantas celdas como encabezados",
        f.length + " celdas frente a " + cabeceras.length +
        " — probablemente falta o sobra una coma; los valores estarían corridos de columna");
      return;
    }
    const o = {};
    cabeceras.forEach((c, j) => { if (c) o[c] = f[j] === undefined ? "" : f[j]; });
    filas.push(o);
  });
  return { filas, cabeceras, origen: "csv" };
}

/* ================================================================
   Identidades existentes — reconciliación
   ================================================================ */

/**
 * Modelos que YA existen en el catálogo, para distinguir un alta de una
 * actualización.
 *
 * Se comparan **slug y nombre**, no `id`. El archivo local usa
 * identificadores propios (`MW-01`…) que NO son los del libro real
 * (`moto-…`); los slugs, en cambio, coinciden y son lo que gobierna la
 * URL. Comparar ids daría choques falsos.
 */
function cargarIdentidades() {
  const ruta = IDENTIDADES ? resolve(IDENTIDADES) : join(RAIZ, "data/catalogo-publico.local.json");
  if (!existsSync(ruta)) {
    return { disponible: false, ruta, porSlug: {}, porModelo: {} };
  }
  let datos;
  try { datos = JSON.parse(readFileSync(ruta, "utf8")); }
  catch (e) { return { disponible: false, ruta, porSlug: {}, porModelo: {}, error: e.message }; }

  const lista = Array.isArray(datos) ? datos : (datos.modelos || datos.items || []);
  const porSlug = Object.create(null);
  const porModelo = Object.create(null);
  lista.forEach((m) => {
    if (!m || typeof m !== "object") return;
    const s = txt(m.slug);
    const nom = norm(m.modelo || m.titulo);
    if (s) porSlug[s] = { slug: s, modelo: txt(m.modelo || m.titulo) };
    if (nom) porModelo[nom] = { slug: s, modelo: txt(m.modelo || m.titulo) };
  });
  return { disponible: true, ruta, porSlug, porModelo, total: lista.length };
}

const IDS = cargarIdentidades();

/* ================================================================
   Carga
   ================================================================ */

let lote;
try {
  lote = cargarLote(ARCHIVO);
} catch (e) {
  if (JSON_MODE) {
    console.log(JSON.stringify({
      resultado: "BLOQUEADO", archivo: ARCHIVO, motivo: e.message,
      filas: 0, bloqueantes: [{ fila: 0, campo: "(archivo)", mensaje: e.message, detalle: "" }],
      avisos: [], notas: [], porFila: [],
    }, null, 2));
  } else {
    console.error("No se pudo interpretar " + ARCHIVO + ": " + e.message);
  }
  process.exit(2);
}

const { filas, cabeceras } = lote;

/* ---- Columnas: prohibidas, repetidas, faltantes, sobrantes ---- */

const cabNorm = cabeceras.map(clave);

/** Prohibidas ya señaladas a nivel de columna, para no repetir el aviso. */
const prohibidasEnCabecera = new Set();

cabNorm.forEach((c, i) => {
  if (PROHIBIDAS.indexOf(c) !== -1) {
    prohibidasEnCabecera.add(c);
    bloquea(0, cabeceras[i], "columna prohibida en una ficha de recepción",
      "son datos de inventario o de cliente: no entran en este proceso");
  }
});

const duplicadasCab = cabNorm.filter((c, i) => c && cabNorm.indexOf(c) !== i);
[...new Set(duplicadasCab)].forEach((c) => {
  bloquea(0, c, "columna repetida",
    "con dos columnas del mismo nombre no se puede saber cuál manda");
});

const faltantes = COLUMNAS.filter((c) => cabNorm.indexOf(c) === -1);
const sobrantes = cabNorm.filter((c) => c && COLUMNAS.indexOf(c) === -1 &&
  PROHIBIDAS.indexOf(c) === -1 && ["id", "slug", "estado_contenido", "activo", "alt_text"].indexOf(c) === -1);
if (faltantes.length) notas.push("columnas de la plantilla que no vienen: " + faltantes.join(", "));
if (sobrantes.length) avisa(0, sobrantes.join(", "), "columnas fuera de la plantilla",
  "no se validan y no se cargarán a ningún sitio");

/* ================================================================
   Validación fila a fila
   ================================================================ */

const vistos = { modelo: {}, slug: {}, id: {} };

filas.forEach((bruto, indice) => {
  const n = indice + 2;
  if (!esObjetoPlano(bruto)) return; // ya se bloqueó al cargar

  const f = {};
  Object.keys(bruto).forEach((k) => { f[clave(k)] = bruto[k]; });

  // Un campo prohibido puede aparecer solo en esta fila: en JSON las
  // claves no tienen por qué ser iguales en todas. Si ya se señaló como
  // columna, no se repite: es un problema, no dos.
  Object.keys(f).forEach((k) => {
    if (PROHIBIDAS.indexOf(k) !== -1 && !prohibidasEnCabecera.has(k)) {
      bloquea(n, k, "campo prohibido en una ficha de recepción",
        "son datos de inventario o de cliente: no entran en este proceso");
    }
  });

  const resumen = { fila: n, modelo: txt(f.modelo), slug: "", accion: "", problemas: 0, avisos: 0 };

  /* ---- Identidad ---- */
  OBLIGATORIAS.forEach((c) => {
    if (vacio(f[c])) bloquea(n, c, "campo obligatorio vacío");
  });
  if (esProvisional(f.modelo)) {
    bloquea(n, "modelo", "el nombre es un marcador de pendiente", txt(f.modelo));
  }

  const slugDeclarado = txt(f.slug);
  const slug = slugDeclarado || slugificar(f.modelo);
  const id = txt(f.id) || (slug ? "moto-" + slug : "");
  resumen.slug = slug;

  if (slug && !SLUG_VALIDO.test(slug)) {
    bloquea(n, "slug", "slug con formato inválido",
      slug + " — solo minúsculas, números y guiones simples");
  }
  if (!slug && !vacio(f.modelo)) {
    bloquea(n, "slug", "no se puede derivar un slug del nombre", txt(f.modelo));
  }

  const claveModelo = norm(f.modelo);
  if (claveModelo) {
    if (vistos.modelo[claveModelo]) {
      bloquea(n, "modelo", "modelo duplicado dentro del lote",
        "ya aparece en la fila " + vistos.modelo[claveModelo]);
    } else vistos.modelo[claveModelo] = n;
  }
  if (slug) {
    if (vistos.slug[slug]) {
      bloquea(n, "slug", "slug duplicado dentro del lote",
        slug + " — ya lo usa la fila " + vistos.slug[slug] + "; dos modelos no pueden compartir URL");
    } else vistos.slug[slug] = n;
  }
  if (id) {
    if (vistos.id[id]) bloquea(n, "id", "id duplicado dentro del lote", id + " — fila " + vistos.id[id]);
    else vistos.id[id] = n;
  }

  /* ---- Reconciliación con el catálogo existente ---- */
  const accion = norm(f.accion);
  resumen.accion = accion;
  const existePorSlug = slug ? IDS.porSlug[slug] : null;
  const existePorNombre = claveModelo ? IDS.porModelo[claveModelo] : null;
  const existente = existePorSlug || existePorNombre;

  if (accion && ACCIONES.indexOf(accion) === -1) {
    bloquea(n, "accion", "acción desconocida",
      txt(f.accion) + " — solo: " + ACCIONES.join(", "));
  } else if (!IDS.disponible) {
    if (accion) notas.push("fila " + n + ": no se pudo reconciliar (" + IDS.ruta + " no está disponible)");
  } else if (!accion) {
    // Dejarlo vacío solo es admisible si el modelo NO existe. Si existe,
    // hay que decir en voz alta que se pretende actualizarlo: escribir
    // encima de una ficha ya cargada no puede ocurrir por omisión.
    if (existente) {
      bloquea(n, "accion", "el modelo ya existe y la acción no está declarada",
        "«" + (existente.modelo || slug) + "» ya está en el catálogo — poner accion=actualizar " +
        "si se quiere modificarlo, o cambiar el nombre si es otro modelo");
    } else {
      notas.push("fila " + n + ": sin `accion` y sin coincidencia previa → se tratará como ALTA");
    }
  } else if (accion === "nuevo") {
    if (existente) {
      bloquea(n, "accion", "se declara como nuevo pero ya existe",
        "«" + (existente.modelo || slug) + "» con slug `" + (existente.slug || slug) +
        "» — un alta no puede colisionar con un modelo existente");
    }
  } else if (accion === "actualizar") {
    if (!existente) {
      bloquea(n, "accion", "se declara como actualización pero no existe",
        "no hay ningún modelo con slug `" + slug + "` ni con ese nombre");
    } else if (slugDeclarado && existente.slug && slugDeclarado !== existente.slug) {
      // Cambiar el slug de un modelo ya cargado rompe los enlaces que se
      // hayan compartido. Si de verdad hace falta, es otra operación.
      bloquea(n, "slug", "una actualización no puede cambiar el slug",
        "actual `" + existente.slug + "`, declarado `" + slugDeclarado + "`");
    } else if (existePorNombre && !existePorSlug && existePorNombre.slug &&
               existePorNombre.slug !== slug) {
      bloquea(n, "slug", "la actualización cambiaría el slug del modelo existente",
        "«" + existePorNombre.modelo + "» tiene `" + existePorNombre.slug +
        "` y de este nombre saldría `" + slug + "` — conservar el slug actual");
    } else {
      notas.push("fila " + n + ": ACTUALIZACIÓN de «" + (existente.modelo || slug) +
        "» — conserva id y slug actuales");
    }
  } else if (accion === "retirar") {
    if (!existente) {
      bloquea(n, "accion", "se declara retirar pero el modelo no existe",
        "no hay ningún modelo con slug `" + slug + "` ni con ese nombre — " +
        "no se puede retirar algo que no está en el catálogo");
    } else if (slugDeclarado && existente.slug && slugDeclarado !== existente.slug) {
      bloquea(n, "slug", "el slug no corresponde al modelo que se quiere retirar",
        "actual `" + existente.slug + "`, declarado `" + slugDeclarado + "`");
    } else {
      // Retirar es DESACTIVAR, nunca eliminar. Se deja dicho en el
      // informe para que quien lo aplique en la hoja no borre la fila.
      notas.push("fila " + n + ": RETIRAR «" + (existente.modelo || slug) +
        "» → poner activo = FALSE. NO borrar la fila: conserva id, slug y textos");
    }
  }

  /* ---- Lo que una retirada NO puede hacer ---- */
  if (accion === "retirar") {
    // Pedir retirar y a la vez rellenar contenido es una contradicción:
    // o se saca del catálogo, o se está cargando material para él.
    const cargando = ["imagen_principal_origen", "imagen_mobile_origen",
      "galeria_1_origen", "galeria_2_origen", "precio_publico", "colores"]
      .filter((c) => !vacio(f[c]));
    if (cargando.length) {
      bloquea(n, "accion", "se pide retirar y a la vez se carga contenido",
        cargando.join(", ") + " — decide una cosa u otra");
    }
    // El único destino admisible de una retirada.
    if (!vacio(f.activo) && booleano(f.activo) === true) {
      bloquea(n, "activo", "una retirada no puede dejar el modelo activo",
        "retirar significa activo = FALSE");
    }
    // Ninguna columna puede pedir un borrado.
    Object.keys(f).forEach((k) => {
      if (/borrar|eliminar|delete|remove/i.test(k)) {
        bloquea(n, k, "este flujo no elimina filas",
          "retirar desactiva; borrar perdería el id, el slug y los textos");
      }
    });
    if (/\b(borrar|eliminar|delete)\b/i.test(norm(f.observaciones))) {
      avisa(n, "observaciones", "la observación habla de borrar la fila",
        "retirar es desactivar; comprobar que nadie la elimine al aplicarlo");
    }
  }

  /* ---- Taxonomía ---- */
  const cat = norm(f.categoria);
  if (cat && CATEGORIAS.indexOf(cat) === -1) {
    bloquea(n, "categoria", "categoría fuera de la taxonomía aprobada",
      txt(f.categoria) + " — solo: " + CATEGORIAS.join(", "));
  }
  if (!vacio(f.linea) && esProvisional(f.linea)) {
    avisa(n, "linea", "la línea parece un marcador de pendiente", txt(f.linea));
  }

  /* ---- Procedencia del dato ---- */
  const especsPresentes = ESPECIFICACIONES.filter((c) => !vacio(f[c]));
  if (especsPresentes.length && vacio(f.ficha_oficial)) {
    bloquea(n, "ficha_oficial", "hay especificaciones sin indicar de dónde salen",
      especsPresentes.join(", ") + " — una especificación sin fuente verificable no se publica");
  }

  /* ---- Rangos ---- */
  Object.keys(RANGOS).forEach((c) => {
    if (vacio(f[c])) return;
    const r = RANGOS[c];
    const num = numero(f[c]);
    if (num === null) {
      bloquea(n, c, "valor no numérico o ambiguo", txt(f[c]));
      return;
    }
    if (num.decimales > r.decimales) {
      bloquea(n, c, r.decimales === 0 ? "debe ser un número entero" : "demasiados decimales",
        txt(f[c]) + " — máximo " + r.decimales + " decimal(es)");
      return;
    }
    if (num.valor < r.min || num.valor > r.max) {
      bloquea(n, c, "fuera del rango verosímil",
        num.valor + " " + r.unidad + " — se espera entre " + r.min + " y " + r.max +
        "; comprobar si es una errata");
    }
  });

  /* ---- Listas cerradas ---- */
  Object.keys(LISTAS).forEach((c) => {
    if (vacio(f[c])) return;
    const v = norm(f[c]).replace(/\s/g, "");
    const admitidos = LISTAS[c].map((x) => x.replace(/\s/g, ""));
    if (admitidos.indexOf(v) === -1) {
      bloquea(n, c, "valor fuera de la lista cerrada",
        txt(f[c]) + " — admitidos: " + LISTAS[c].join(", "));
    }
  });

  /* ---- Ternarios: la regla de «vacío no es no» ---- */
  TERNARIOS.forEach((c) => {
    const v = ternario(f[c]);
    if (v === null) {
      bloquea(n, c, "valor no reconocido", txt(f[c]) + " — usar sí, no, o dejarlo vacío");
    } else if (v === "no verificado") {
      notas.push("fila " + n + ": `" + c + "` vacío → NO VERIFICADO (no se publicará como «sin " + c.toUpperCase() + "»)");
    }
  });

  BOOLEANOS.forEach((c) => {
    if (booleano(f[c]) === null) {
      bloquea(n, c, "valor no reconocido", txt(f[c]) + " — usar sí/no o dejarlo vacío");
    }
  });

  /* ---- Precio ---- */
  const mostrarPrecio = booleano(f.mostrar_precio) === true;
  if (!vacio(f.precio_publico)) {
    if (esAmbiguo(f.precio_publico)) {
      bloquea(n, "precio_publico", "precio ambiguo",
        txt(f.precio_publico) + " — usar punto decimal: 12990.50, o 12,990.50");
    } else {
      const p = numero(f.precio_publico);
      if (p === null) {
        bloquea(n, "precio_publico", "precio no interpretable", txt(f.precio_publico));
      } else if (p.decimales > 2) {
        bloquea(n, "precio_publico", "el precio tiene más de dos decimales",
          txt(f.precio_publico) + " — la moneda admite dos: 12990.50");
      } else if (p.valor <= 0) {
        bloquea(n, "precio_publico", "precio cero o negativo", String(p.valor));
      } else if (!mostrarPrecio) {
        avisa(n, "precio_publico", "hay precio pero mostrar_precio no está activo",
          "quedará oculto; comprobar que es deliberado");
      }
    }
  } else if (mostrarPrecio) {
    bloquea(n, "mostrar_precio", "se pide mostrar el precio pero no hay precio",
      "el precio vacío significa OCULTO, no cero");
  } else {
    notas.push("fila " + n + ": precio vacío → PRECIO OCULTO (no es cero)");
  }

  /* ---- Colores ---- */
  if (!vacio(f.colores)) {
    const lista = txt(f.colores).split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
    const dup = lista.map(norm).filter((x, i, a) => a.indexOf(x) !== i);
    if (dup.length) avisa(n, "colores", "colores repetidos", [...new Set(dup)].join(", "));
    lista.forEach((c) => {
      if (esProvisional(c)) avisa(n, "colores", "color con texto provisional", c);
    });
  } else {
    notas.push("fila " + n + ": colores vacío → NO REGISTRADO (no significa «un solo color»)");
  }

  /* ---- Fotografías de origen ---- */
  let hayFotoPrincipal = false;
  COLUMNAS_FOTO.forEach(([col, tipo]) => {
    if (vacio(f[col])) return;
    const ruta = txt(f[col]);
    const abs = isAbsolute(ruta) ? ruta : resolve(BASE_ASSETS || dirname(resolve(ARCHIVO)), ruta);

    if (!existsSync(abs)) { bloquea(n, col, "la fotografía no existe en esa ruta", ruta); return; }
    if (!statSync(abs).isFile()) { bloquea(n, col, "la ruta no apunta a un archivo", ruta); return; }

    const ext = extname(abs).toLowerCase();
    if (FOTO.extensiones.indexOf(ext) === -1) {
      bloquea(n, col, "formato de imagen no admitido",
        ext + " — admitidos: " + FOTO.extensiones.join(" "));
      return;
    }

    const bytes = statSync(abs).size;
    if (bytes > FOTO.maxBytesOrigen) {
      avisa(n, col, "el archivo de origen es muy grande",
        Math.round(bytes / 1024 / 1024) + " MB — comprobar que no es un RAW por error");
    }

    let info = null;
    try { info = inspeccionar(abs); } catch (e) { info = null; }
    // Extensión correcta y cabecera ilegible es peor que un formato
    // desconocido: el archivo aparenta ser una fotografía y no lo es.
    if (!info || !info.ancho || !info.alto) {
      bloquea(n, col, "el archivo tiene extensión de imagen pero su cabecera no se puede leer",
        ruta + " — puede estar corrupto, truncado, o ser otro formato renombrado");
      return;
    }

    const minAncho = tipo === "movil" ? FOTO.minAnchoMovil : FOTO.minAnchoEscritorio;
    if (info.ancho < minAncho) {
      bloquea(n, col, "resolución insuficiente para convertir",
        info.ancho + "×" + info.alto + " — hace falta al menos " + minAncho + " px de ancho");
    }
    const prop = info.ancho / info.alto;
    if (Math.abs(prop - FOTO.proporcion) > FOTO.toleranciaProporcion) {
      avisa(n, col, "la proporción no es 16:10",
        info.ancho + "×" + info.alto + " (" + prop.toFixed(2) + ") — habrá que recortar, " +
        "y recortar mal corta ruedas o espejos");
    }
    if (col === "imagen_principal_origen") hayFotoPrincipal = true;
  });

  if (!hayFotoPrincipal) {
    notas.push("fila " + n + ": sin fotografía principal → el modelo NO podrá publicarse todavía");
  }
  if (hayFotoPrincipal && vacio(f.imagen_mobile_origen)) {
    avisa(n, "imagen_mobile_origen", "hay foto de escritorio pero no de móvil",
      "las dos son horizontales 16:10; la de móvil se puede derivar recortando");
  }

  /* ---- Texto alternativo ---- */
  if (!vacio(f.alt_text)) {
    if (esProvisional(f.alt_text)) {
      bloquea(n, "alt_text", "texto alternativo provisional", txt(f.alt_text));
    } else if (norm(f.alt_text).length < 15) {
      avisa(n, "alt_text", "texto alternativo demasiado corto para describir la foto", txt(f.alt_text));
    }
  } else if (hayFotoPrincipal) {
    notas.push("fila " + n + ": falta el texto alternativo — se redacta al cargar la hoja, no aquí");
  }

  /* ---- Coherencia de publicación ---- */
  // La ficha de recepción NO aprueba y NO activa. Nunca, ni con la ficha
  // completa: son dos decisiones humanas posteriores y separadas, y se
  // toman en Google Sheets con el modelo ya montado delante.
  if (!vacio(f.estado_contenido)) {
    const estado = clave(f.estado_contenido);
    if (estado === "aprobado") {
      bloquea(n, "estado_contenido", "la ficha de recepción no puede aprobar",
        "aprobar es decir «he mirado esta ficha y autorizo publicarla», y se decide " +
        "en Google Sheets, modelo a modelo");
    } else if (ESTADOS_RECEPCION.indexOf(estado) === -1) {
      bloquea(n, "estado_contenido", "estado no admitido en una ficha de recepción",
        txt(f.estado_contenido) + " — dejar vacío o BORRADOR");
    }
  }
  if (!vacio(f.activo)) {
    const act = booleano(f.activo);
    if (act === null) {
      bloquea(n, "activo", "valor no reconocido",
        txt(f.activo) + " — la ficha de recepción no activa modelos; dejar vacío o no");
    } else if (act === true) {
      bloquea(n, "activo", "la ficha de recepción no activa modelos",
        "activar es la última decisión, y se toma en Google Sheets");
    }
  }

  /* ---- Observaciones ---- */
  if (!vacio(f.observaciones)) {
    const o = norm(f.observaciones);
    PROHIBIDAS.forEach((p) => {
      if (o.indexOf(p) !== -1) {
        avisa(n, "observaciones", "la observación menciona un dato que no entra al repositorio",
          "«" + p + "» — comprobar que no se copie a la hoja");
      }
    });
  }

  resumen.problemas = bloqueantes.filter((b) => b.fila === n).length;
  resumen.avisos = avisos.filter((a) => a.fila === n).length;
  porFila.push(resumen);
});

/* ================================================================
   Informe
   ================================================================ */

const apto = bloqueantes.length === 0;

if (JSON_MODE) {
  console.log(JSON.stringify({
    resultado: apto ? "APTO" : "BLOQUEADO",
    archivo: ARCHIVO,
    filas: filas.length,
    identidades: { disponible: IDS.disponible, ruta: IDS.ruta, total: IDS.total || 0 },
    bloqueantes, avisos, notas, porFila,
  }, null, 2));
  process.exit(apto ? 0 : 1);
}

console.log("ARENAS — VALIDACIÓN DEL LOTE DE RECEPCIÓN");
console.log("archivo: " + ARCHIVO);
console.log("filas:   " + filas.length + "   columnas: " + cabeceras.length);
console.log("identidades: " + (IDS.disponible
  ? IDS.total + " modelos existentes (" + IDS.ruta + ")"
  : "NO DISPONIBLES — no se puede distinguir un alta de una actualización"));
console.log("");

if (faltantes.length) {
  console.log("COLUMNAS DE LA PLANTILLA QUE NO VIENEN (" + faltantes.length + ")");
  console.log("  " + faltantes.join(", "));
  console.log("  No es un fallo: se validan solo las que estén.");
  console.log("");
}

if (DETALLE) {
  console.log("FILA A FILA");
  porFila.forEach((r) => {
    const marca = r.problemas ? "BLOQUEA" : (r.avisos ? "aviso  " : "ok     ");
    console.log("  " + marca + " fila " + String(r.fila).padStart(3) + "  " +
      (r.accion || "—").padEnd(11) + (r.modelo || "(sin nombre)").padEnd(28) + (r.slug || ""));
  });
  console.log("");
}

if (bloqueantes.length) {
  console.log("BLOQUEANTES (" + bloqueantes.length + ")");
  bloqueantes.forEach((b) => {
    console.log("  fila " + String(b.fila).padStart(3) + " · " + b.campo);
    console.log("        " + b.mensaje + (b.detalle ? " → " + b.detalle : ""));
  });
  console.log("");
}

if (avisos.length) {
  console.log("AVISOS (" + avisos.length + ") — no impiden cargar, conviene mirarlos");
  avisos.forEach((a) => {
    console.log("  fila " + String(a.fila).padStart(3) + " · " + a.campo + " — " + a.mensaje +
      (a.detalle ? " → " + a.detalle : ""));
  });
  console.log("");
}

if (notas.length) {
  console.log("AUSENCIAS Y DECISIONES REGISTRADAS (" + notas.length + ")");
  console.log("  Un hueco no es un dato negativo. Se anota para que nadie");
  console.log("  lo convierta en un «no» al pasar a la hoja.");
  notas.slice(0, 40).forEach((t) => console.log("  · " + t));
  if (notas.length > 40) console.log("  … y " + (notas.length - 40) + " más (usar --json para verlas todas)");
  console.log("");
}

console.log("=".repeat(62));
if (apto) {
  console.log("LOTE APTO — " + filas.length + " fila(s) sin bloqueantes.");
  console.log("");
  console.log("Esto NO aprueba ni publica nada. El siguiente paso es humano:");
  console.log("  1. convertir las fotografías (docs/recepcion-lote-fase4.md §5)");
  console.log("  2. escribir las altas y actualizar las filas existentes en MODELOS_WEB");
  console.log("  3. redactar alt_text y descripcion_corta");
  console.log("  4. node scripts/qa-catalogo.mjs sobre el volcado");
  console.log("  5. aprobar y activar, modelo a modelo");
} else {
  console.log("LOTE BLOQUEADO — " + bloqueantes.length + " problema(s) que corregir antes de cargar.");
  console.log("");
  console.log("Corregir en la ficha de recepción, no en Google Sheets:");
  console.log("aquí un error cuesta una celda; después, una recarga entera.");
}
process.exit(apto ? 0 : 1);
