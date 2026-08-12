#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-migracion-sheets.mjs
   Simulación de la migración del CMS. Sin dependencias, sin red.

       node scripts/qa-migracion-sheets.mjs

   QUÉ SIMULA
   El paso de `estado_contenido` de FÓRMULA a CAMPO MANUAL en la hoja
   MODELOS_WEB, y la activación de la categoría `carga`.

   NO SE CONECTA A GOOGLE. No lee el libro real, no escribe nada. Solo
   reproduce los 22 modelos con sus tipos reales y comprueba qué haría
   el backend antes y después del cambio.

   Sirve para responder, antes de tocar nada, a la única pregunta que
   importa en una migración de este tipo: ¿puede esto publicar algo sin
   querer? La respuesta debe ser NO en todos los escenarios salvo en el
   que se aprueba y activa un modelo completo a propósito.

   exit 0 → la migración simulada es segura.
   exit 1 → algún escenario publica algo que no debería.
   ================================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const B = createContext({ console });
for (const archivo of ["apps-script/v2/Configuracion.gs", "apps-script/v2/Nucleo.gs"]) {
  runInContext(readFileSync(join(RAIZ, archivo), "utf8"), B, { filename: archivo });
}

/* ================================================================
   Los 22 modelos, con los tipos reales del libro
   ================================================================ */

const CAB = [
  "id", "slug", "modelo", "linea", "categoria", "subcategoria", "titulo_web",
  "descripcion_corta", "descripcion_larga", "precio_publico", "mostrar_precio",
  "imagen_principal", "imagen_mobile", "galeria_1", "galeria_2", "colores",
  "caracteristica_1", "caracteristica_2", "caracteristica_3", "destacado",
  "nuevo", "cta_label", "orden", "activo", "estado_contenido",
  "ultima_revision", "alt_text", "foco_imagen",
];

const LARGA_PROVISIONAL =
  "Descripción ampliada pendiente de completar con información técnica oficial, " +
  "beneficios comprobados, colores e imágenes validadas.";

/** Los 22 slugs reales, con su categoría. */
const CATALOGO = [
  ["ct-125", "ciudad", "CT 125", "CT"],
  ["discover-125-st", "ciudad", "Discover 125 ST", "Discover"],
  ["pulsar-125-ls", "ciudad", "Pulsar 125 LS", "Pulsar"],
  ["pulsar-n125-fi", "ciudad", "Pulsar N125 FI", "Pulsar"],
  ["boxer-bm150x-disc", "trabajo", "Boxer BM150X Disc", "Boxer"],
  ["pulsar-150-neon", "deportiva", "Pulsar 150 Neon", "Pulsar"],
  ["pulsar-150r", "deportiva", "Pulsar 150R", "Pulsar"],
  ["pulsar-n160-fi", "deportiva", "Pulsar N160 FI", "Pulsar"],
  ["pulsar-160-ns-ug2", "deportiva", "Pulsar 160 NS UG2", "Pulsar"],
  ["pulsar-180-neon", "deportiva", "Pulsar 180 Neon", "Pulsar"],
  ["pulsar-200-ns-ug2", "deportiva", "Pulsar 200 NS UG2", "Pulsar"],
  ["pulsar-200-rs", "deportiva", "Pulsar 200 RS", "Pulsar"],
  ["pulsar-n250", "deportiva", "Pulsar N250", "Pulsar"],
  ["pulsar-n250-ug", "aventura", "Pulsar N250 UG", "Pulsar"],
  ["dominar-250", "aventura", "Dominar 250", "Dominar"],
  ["dominar-400", "aventura", "Dominar 400", "Dominar"],
  ["pulsar-400-ns", "aventura", "Pulsar 400 NS", "Pulsar"],
  ["mototaxi-4t-std-crom-ug-r", "carga", "Mototaxi 4T STD Crom-UG R", "Mototaxi"],
  ["torito-fibraser-clasico", "carga", "Torito Fibraser Clásico", "Torito"],
  ["torito-fibraser-x-sport", "carga", "Torito Fibraser X Sport", "Torito"],
  ["torito-fibraser-clasico-2025", "carga", "Torito Fibraser Clásico 2025", "Torito"],
  ["torito-fibratec-raptor-slujo", "carga", "Torito Fibratec Raptor Slujo", "Torito"],
];

/**
 * La fórmula legacy, reproducida tal cual está en el libro:
 *
 *   =IF(C2="";"";IF(X2=TRUE;IF(AND(H2<>"";L2<>"");"LISTO PARA WEB";
 *                             "REVISAR CONTENIDO");"BORRADOR"))
 *
 * C = modelo · X = activo · H = descripcion_corta · L = imagen_principal
 *
 * Nótese lo que NO comprueba: id, slug, categoría, seguridad de la ruta,
 * alt real, texto provisional ni categoría activa. Por eso no puede
 * usarse como aprobación.
 */
function formulaLegacy(fila) {
  if (!fila.modelo) return "";
  if (fila.activo !== true) return "BORRADOR";
  return fila.descripcion_corta && fila.imagen_principal ? "LISTO PARA WEB" : "REVISAR CONTENIDO";
}

/** Fila con los tipos reales del libro. */
function fila(slug, categoria, modelo, linea, extra) {
  const base = {
    id: "moto-" + slug,
    slug: slug,
    modelo: modelo,
    linea: linea,
    categoria: categoria,
    subcategoria: "",
    titulo_web: "",
    descripcion_corta: "Descripción comercial de " + modelo + ".",
    descripcion_larga: LARGA_PROVISIONAL,
    precio_publico: "",
    mostrar_precio: false,
    imagen_principal: "",
    imagen_mobile: "",
    galeria_1: "", galeria_2: "", colores: "",
    caracteristica_1: "", caracteristica_2: "", caracteristica_3: "",
    destacado: slug === "pulsar-180-neon" || slug === "pulsar-200-ns-ug2",
    nuevo: false,
    cta_label: "Ver detalles",
    orden: 1,
    activo: false,
    ultima_revision: "",
    alt_text: "Motocicleta " + modelo + " para el catálogo de Arenas Motocicletas",
    foco_imagen: "50% 50%",
  };
  return Object.assign(base, extra || {});
}

/**
 * Construye la matriz de los 22.
 * @param {string} modo "formula" reproduce el estado actual del libro;
 *                      "manual" reproduce el estado tras la migración.
 * @param {Object} cambios sobrescribe la fila del slug indicado
 */
function matriz(modo, cambios) {
  const filas = CATALOGO.map(([slug, cat, modelo, linea], i) => {
    const f = fila(slug, cat, modelo, linea, { orden: i + 1 });
    if (cambios && cambios.slug === slug) Object.assign(f, cambios.datos);
    f.estado_contenido = modo === "formula" ? formulaLegacy(f) : f.estado_contenido || "BORRADOR";
    return CAB.map((c) => f[c]);
  });
  return [CAB].concat(filas);
}

const CONFIG = [
  ["clave", "valor"],
  ["api_version", "1.0"],
  ["moneda_default", "PEN"],
  ["mostrar_precios", true],
  ["cache_segundos", 300],
];

function categorias(cargaActiva) {
  return [
    ["id", "slug", "titulo", "descripcion", "imagen_desktop", "imagen_mobile", "orden", "activo"],
    ["cat-ciudad", "ciudad", "Ciudad", "", "", "", 1, true],
    ["cat-trabajo", "trabajo", "Trabajo", "", "", "", 2, true],
    ["cat-deportiva", "deportiva", "Deportiva", "", "", "", 3, true],
    ["cat-aventura", "aventura", "Ruta y aventura", "", "", "", 4, true],
    ["cat-touring", "touring", "Touring", "", "", "", 5, false],
    ["cat-rural", "rural", "Rural", "", "", "", 6, false],
    ["cat-carga", "carga", "Carga y transporte", "", "", "", 7, !!cargaActiva],
    ["cat-iniciacion", "iniciacion", "Iniciación", "", "", "", 8, false],
  ];
}

const FECHA = "2026-08-10T00:00:00.000Z";

function publicados(modo, cargaActiva, cambios) {
  const r = B.construirRespuesta_(
    { modelos: matriz(modo, cambios), config: CONFIG, categorias: categorias(cargaActiva), colores: null },
    FECHA
  );
  return B.limpiarParaCliente_(r).modelos;
}

/* ================================================================
   Arnés
   ================================================================ */

let pasadas = 0;
const fallos = [];
let grupoActual = "";
const grupo = (n) => {
  grupoActual = n;
  console.log("\n" + n);
};
function comprobar(desc, cond, detalle) {
  if (cond) {
    pasadas++;
    console.log("  ok    " + desc);
  } else {
    fallos.push(grupoActual + " → " + desc + (detalle ? "  [" + detalle + "]" : ""));
    console.log("  FALLA " + desc + (detalle ? "  [" + detalle + "]" : ""));
  }
}

/* ================================================================
   ANTES — el libro tal como está hoy
   ================================================================ */

grupo("ANTES DE LA MIGRACIÓN  (estado_contenido = fórmula)");

const antes = publicados("formula", false);
comprobar("los 22 modelos: 0 públicos", antes.length === 0, String(antes.length));
comprobar("la fórmula devuelve BORRADOR con activo=FALSE",
  formulaLegacy(fila("x", "ciudad", "X", "L")) === "BORRADOR");
comprobar("la fórmula devuelve REVISAR CONTENIDO si falta contenido",
  formulaLegacy(fila("x", "ciudad", "X", "L", { activo: true })) === "REVISAR CONTENIDO");
comprobar("la fórmula devuelve LISTO PARA WEB con foto y copy",
  formulaLegacy(fila("x", "ciudad", "X", "L", {
    activo: true, imagen_principal: "assets/catalogo/x/p.webp",
  })) === "LISTO PARA WEB");
comprobar("la fórmula NUNCA devuelve APROBADO",
  [false, true].every((a) =>
    ["", "assets/catalogo/x/p.webp"].every((img) =>
      formulaLegacy(fila("x", "ciudad", "X", "L", { activo: a, imagen_principal: img })) !== "APROBADO"
    )
  ));

// El escenario que demuestra la incompatibilidad: alguien completa una
// ficha y la activa, convencido de que va a publicarse.
const completoActivo = {
  slug: "pulsar-180-neon",
  datos: { activo: true, imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp" },
};
comprobar("modelo completo + activo, con la fórmula → SIGUE sin publicarse",
  publicados("formula", false, completoActivo).length === 0,
  "esta es la incompatibilidad: la fórmula dice LISTO PARA WEB, el backend exige APROBADO");

/* ================================================================
   DESPUÉS — estado_contenido manual, todo en BORRADOR
   ================================================================ */

grupo("DESPUÉS DE LA MIGRACIÓN  (estado_contenido manual, 22 × BORRADOR)");

const despues = publicados("manual", false);
comprobar("los 22 modelos: 0 públicos", despues.length === 0, String(despues.length));
comprobar("migrar no cambia el resultado visible", despues.length === antes.length);

comprobar("APROBADO pero activo=FALSE → 0",
  publicados("manual", false, {
    slug: "pulsar-180-neon",
    datos: { estado_contenido: "APROBADO", activo: false,
             imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp" },
  }).length === 0);

comprobar("APROBADO + activo pero SIN fotografía → 0",
  publicados("manual", false, {
    slug: "pulsar-180-neon",
    datos: { estado_contenido: "APROBADO", activo: true },
  }).length === 0);

const unoPublicado = publicados("manual", false, {
  slug: "pulsar-180-neon",
  datos: { estado_contenido: "APROBADO", activo: true,
           imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp" },
});
comprobar("APROBADO + activo + completo → 1", unoPublicado.length === 1, String(unoPublicado.length));
comprobar("y es exactamente el modelo aprobado",
  unoPublicado[0] && unoPublicado[0].slug === "pulsar-180-neon");
comprobar("los otros 21 siguen sin publicarse", unoPublicado.length === 1);
comprobar("el publicado no arrastra la descripción larga provisional",
  unoPublicado[0] && unoPublicado[0].descripcion_larga === "");

/* ================================================================
   ACTIVAR LA CATEGORÍA CARGA
   ================================================================ */

grupo("ACTIVAR CATEGORÍA CARGA  (operación separada)");

comprobar("activar carga, por sí sola, NO publica nada",
  publicados("manual", true).length === 0,
  "los 5 modelos de carga siguen en BORRADOR, inactivos y sin foto");

comprobar("con carga inactiva, un Torito completo y aprobado NO se publica",
  publicados("manual", false, {
    slug: "torito-fibraser-clasico",
    datos: { estado_contenido: "APROBADO", activo: true,
             imagen_principal: "assets/catalogo/torito-fibraser-clasico/portada.webp" },
  }).length === 0);

comprobar("con carga activa, ese mismo Torito SÍ se publica",
  publicados("manual", true, {
    slug: "torito-fibraser-clasico",
    datos: { estado_contenido: "APROBADO", activo: true,
             imagen_principal: "assets/catalogo/torito-fibraser-clasico/portada.webp" },
  }).length === 1);

comprobar("activar carga no altera las demás categorías",
  publicados("manual", true, completoActivo).length === 0,
  "el Pulsar sigue sin APROBADO");

/* ================================================================
   Aprobación en lote — lo que NO debe hacerse
   ================================================================ */

grupo("APROBACIÓN EN LOTE  (escenario a evitar)");

// Si alguien pusiera APROBADO en las 22 de golpe, el contenido sigue
// mandando: sin fotografías no se publica nada. Es la última red.
const todasAprobadas = B.limpiarParaCliente_(
  B.construirRespuesta_(
    {
      modelos: [CAB].concat(
        CATALOGO.map(([slug, cat, modelo, linea], i) => {
          const f = fila(slug, cat, modelo, linea, {
            orden: i + 1, estado_contenido: "APROBADO", activo: true,
          });
          return CAB.map((c) => f[c]);
        })
      ),
      config: CONFIG, categorias: categorias(true), colores: null,
    },
    FECHA
  )
).modelos;
comprobar("22 aprobadas y activas pero sin fotografías → 0 públicos",
  todasAprobadas.length === 0, String(todasAprobadas.length));
comprobar("el contenido mínimo es la última red de seguridad", todasAprobadas.length === 0);

/* ================================================================
   Resultado
   ================================================================ */

console.log("");
console.log("=".repeat(64));
if (fallos.length) {
  console.log(`RESULTADO: ${fallos.length} escenario(s) FALLAN de ${pasadas + fallos.length}.`);
  console.log("");
  fallos.forEach((f) => console.log("  · " + f));
  process.exit(1);
}
console.log(`RESULTADO: ${pasadas}/${pasadas} escenarios simulados se comportan como deben.`);
console.log("");
console.log("La migración es segura: ningún paso publica nada por sí mismo.");
console.log("Publicar sigue requiriendo tres acciones deliberadas por modelo:");
console.log("  contenido completo  +  APROBADO  +  activo = TRUE");
console.log("");
console.log("SIMULACIÓN. No se ha tocado Google Sheets.");
process.exit(0);
