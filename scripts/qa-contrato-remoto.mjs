#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-contrato-remoto.mjs
   Pasa una respuesta del endpoint por el FRONTEND REAL, sin conectar
   el sitio a nada. Sin dependencias, sin red.

       node scripts/qa-contrato-remoto.mjs                 # escenarios sintéticos
       node scripts/qa-contrato-remoto.mjs respuesta.json  # y además un JSON real

   El archivo se obtiene así, el día del despliegue:

       node scripts/qa-endpoint-real.mjs --endpoint=… --guardar=respuesta.json
       node scripts/qa-contrato-remoto.mjs respuesta.json

   QUÉ RESPONDE
   La pregunta que no puede quedar sin respuesta antes de conectar:
   ¿el frontend distingue un CATÁLOGO REMOTO VACÍO Y VÁLIDO de un
   REMOTO CAÍDO?

   Son cosas opuestas y se parecen mucho:

     · remoto válido con modelos: []  → hay que USARLO. Es exactamente
       lo que devolverá el endpoint hasta que se apruebe la primera
       moto. Caer al archivo local aquí sería un error silencioso: la
       web mostraría datos de otro origen creyendo que el remoto falló.

     · remoto caído, roto, con versión incompatible o con ok:false
       → hay que CAER al archivo local.

   Cómo lo comprueba: cargando los módulos REALES del navegador en un
   contexto de Node, igual que qa-tests.mjs. No reimplementa el esquema.

   exit 0 → el contrato se comporta como debe
   exit 1 → alguna comprobación falla
   exit 2 → uso inválido
   ================================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const JSON_MODE = argv.includes("--json");
const ARCHIVO = argv.find((a) => !a.startsWith("--")) || null;

/* ================================================================
   Módulos reales del navegador
   ================================================================ */

function cargarModulos() {
  const ventana = {
    location: { hostname: "arenasweb.github.io", search: "" },
    matchMedia: () => ({ matches: false }),
    setTimeout,
    clearTimeout,
    Image: function () {},
  };
  ventana.window = ventana;

  const contexto = createContext({
    window: ventana,
    URLSearchParams,
    console: { log() {}, warn() {}, error() {}, info() {} },
    document: { createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }) },
  });

  for (const archivo of [
    "assets/js/catalogo/catalogo-utils.js",
    "assets/js/catalogo/catalogo-schema.js",
    "assets/js/catalogo/catalogo-completitud.js",
    "assets/js/catalogo/catalogo-data.js",
  ]) {
    runInContext(readFileSync(join(RAIZ, archivo), "utf8"), contexto, { filename: archivo });
  }
  return ventana.ARENAS_CATALOGO || ventana.window.ARENAS_CATALOGO;
}

const NS = cargarModulos();
if (!NS || !NS.schema) {
  console.error("No se pudieron cargar los módulos del catálogo.");
  process.exit(2);
}
const S = NS.schema;

/* ================================================================
   Estado
   ================================================================ */

const lineas = [];
const fallos = [];
let total = 0;

function bloque(t) { lineas.push(""); lineas.push(t); }
function comprobar(desc, ok, detalle) {
  total++;
  lineas.push("  " + (ok ? "ok   " : "FALLA") + " " + desc + (!ok && detalle ? "  → " + detalle : ""));
  if (!ok) fallos.push({ desc, detalle: detalle || null });
  return ok;
}
function nota(m) { lineas.push("       " + m); }

/**
 * Reproduce la decisión de catalogo-data.js: `construirEstado` devuelve
 * null cuando `extraerRegistros` rechaza la respuesta, y esa es la
 * señal que hace saltar el respaldo local.
 *
 * No es una reimplementación: llama a la MISMA función del esquema real
 * que usa el navegador. Lo único que se reproduce aquí es la pregunta,
 * no la respuesta.
 */
function aceptaElFrontend(datos) {
  return S.extraerRegistros(datos) !== null;
}

/* ================================================================
   Respuestas de ejemplo
   ================================================================ */

/** El endpoint tal y como responderá el primer día. */
function remotoVacioValido() {
  return {
    ok: true,
    version: "2",
    api_version: "1.0",
    generated_at: new Date().toISOString(),
    config: { mostrar_precios: false, titulo_catalogo: "Catálogo" },
    categorias: [],
    modelos: [],
    colores: [],
  };
}

function conModelos(modelos, extra) {
  return Object.assign(remotoVacioValido(), { modelos }, extra || {});
}

/** Un modelo completo, publicable y aprobado. */
function modeloPublicable(over) {
  return Object.assign({
    id: "moto-pulsar-180-neon",
    slug: "pulsar-180-neon",
    modelo: "Pulsar 180 Neon",
    categoria: "ciudad",
    imagen_principal: "assets/catalogo/pulsar-180-neon/portada.webp",
    alt_text: "Motocicleta Pulsar 180 Neon de perfil sobre fondo claro",
    descripcion_corta: "Naked urbana de 180 cc para el día a día en la ciudad.",
    activo: true,
    estado_contenido: "APROBADO",
  }, over || {});
}

/* ================================================================
   1. Vacío válido frente a caído
   ================================================================ */

bloque("1. REMOTO VACÍO VÁLIDO  ≠  REMOTO CAÍDO");
nota("es la distinción crítica: hoy el endpoint devolverá 0 modelos, y eso es correcto");

comprobar("un remoto válido con modelos: [] SE ACEPTA (no cae al local)",
  aceptaElFrontend(remotoVacioValido()),
  "el frontend lo rechazaría y usaría el archivo local sin que nadie se entere");

{
  const r = S.extraerRegistros(remotoVacioValido());
  comprobar("y devuelve una lista vacía, no null", Array.isArray(r) && r.length === 0,
    JSON.stringify(r));
}

comprobar("un remoto con ok:false se RECHAZA (cae al local)",
  !aceptaElFrontend(Object.assign(remotoVacioValido(), { ok: false, error: "backend_no_configurado" })));

comprobar("un remoto sin version se RECHAZA",
  !aceptaElFrontend({ ok: true, modelos: [], categorias: [], colores: [] }));

comprobar("un remoto con version incompatible se RECHAZA",
  !aceptaElFrontend(Object.assign(remotoVacioValido(), { version: "1" })));

comprobar("un remoto con version 2.5 se ACEPTA (solo manda el número mayor)",
  aceptaElFrontend(Object.assign(remotoVacioValido(), { version: "2.5" })));

comprobar("un remoto sin la lista de modelos se RECHAZA",
  !aceptaElFrontend({ ok: true, version: "2", categorias: [], colores: [] }));

comprobar("un remoto con modelos que no es un array se RECHAZA",
  !aceptaElFrontend(Object.assign(remotoVacioValido(), { modelos: {} })));

comprobar("un remoto con las claves en inglés se RECHAZA",
  !aceptaElFrontend({ ok: true, version: "2", models: [], categories: [], colors: [] }));

comprobar("una respuesta que no es un objeto se RECHAZA",
  !aceptaElFrontend([]) && !aceptaElFrontend(null) && !aceptaElFrontend("texto"));

nota("RECHAZADO significa: se usa data/catalogo-publico.local.json. La web no muestra ningún error.");

/* ================================================================
   2. La regla de publicación, sobre el esquema real
   ================================================================ */

bloque("2. QUÉ SE PUBLICA  (esquema real del navegador)");

function normalizar(bruto) {
  const cfg = S.normalizarConfig({});
  return S.normalizarModelo(bruto, cfg, []);
}

/**
 * «Publicado» es exactamente lo que decide `S.esPublicable` sin modo
 * previsualización: incluye ya las tres condiciones —identidad,
 * taxonomía y contenido mínimo, más `activo` y `APROBADO`—.
 * Se llama a la función real; aquí no se repite ninguna regla.
 */
function esPublicado(bruto) {
  const m = normalizar(bruto);
  return !!m && S.esPublicable(m) === true;
}

comprobar("APROBADO + activo + contenido completo → SE PUBLICA",
  esPublicado(modeloPublicable()));

comprobar("BORRADOR + activo + contenido completo → NO se publica",
  !esPublicado(modeloPublicable({ estado_contenido: "BORRADOR" })));

comprobar("APROBADO + inactivo + contenido completo → NO se publica",
  !esPublicado(modeloPublicable({ activo: false })));

comprobar("APROBADO + activo + sin imagen → NO se publica",
  !esPublicado(modeloPublicable({ imagen_principal: "" })));

comprobar("APROBADO + activo + alt_text provisional → NO se publica",
  !esPublicado(modeloPublicable({ alt_text: "PENDIENTE" })));

comprobar("APROBADO + activo + descripcion_corta provisional → NO se publica",
  !esPublicado(modeloPublicable({ descripcion_corta: "Por completar" })));

comprobar("APROBADO + activo + sin slug → NO se publica",
  !esPublicado(modeloPublicable({ slug: "" })));

comprobar("APROBADO + activo + categoría fuera de la taxonomía → NO se publica",
  !esPublicado(modeloPublicable({ categoria: "chopper" })));

comprobar("APROBADO + activo + ruta de imagen insegura → NO se publica",
  !esPublicado(modeloPublicable({ imagen_principal: "../../secreto.png" })));

comprobar("APROBADO + activo + imagen en un dominio externo → NO se publica",
  !esPublicado(modeloPublicable({ imagen_principal: "https://otrositio.com/foto.jpg" })));

/* --- La categoría `carga`, activada en 3.3C --- */
bloque("3. LA CATEGORÍA `carga`, ACTIVADA EN 3.3C");

comprobar("un modelo de carga completo y aprobado SÍ puede publicarse",
  esPublicado(modeloPublicable({
    id: "moto-torito-3w-4t", slug: "torito-3w-4t", modelo: "Torito 3W 4T",
    categoria: "carga",
    imagen_principal: "assets/catalogo/torito-3w-4t/portada.webp",
    alt_text: "Mototaxi Torito 3W 4T de tres ruedas, vista de tres cuartos",
    descripcion_corta: "Vehículo de carga y transporte de tres ruedas.",
  })),
  "activar `carga` en CATEGORIAS no sirvió de nada si el esquema no la admite");

comprobar("`carga` está en la taxonomía cerrada del frontend",
  S.CATEGORIAS.indexOf("carga") !== -1, S.CATEGORIAS.join(", "));
nota("taxonomía: " + S.CATEGORIAS.join(" · "));

/* ================================================================
   4. Texto provisional opcional
   ================================================================ */

bloque("4. TEXTO PROVISIONAL EN CAMPOS OPCIONALES");
nota("no bloquea la publicación, pero tampoco llega al visitante");

{
  const m = normalizar(modeloPublicable({
    descripcion_larga: "Descripción ampliada pendiente de completar con información técnica oficial.",
    caracteristica_1: "Por definir",
  }));
  comprobar("el modelo sigue siendo publicable", !!m && S.esPublicable(m) === true);
  comprobar("la descripción larga provisional NO se emite", !!m && !m.descripcionLarga,
    m ? JSON.stringify(m.descripcionLarga) : "sin modelo");
  comprobar("la característica provisional NO se emite",
    !!m && (!m.caracteristicas || m.caracteristicas.indexOf("Por definir") === -1),
    m ? JSON.stringify(m.caracteristicas) : "sin modelo");
  comprobar("pero queda anotado para quien edita: descripcionLarga",
    !!m && !!m.provisionales && m.provisionales.descripcionLarga === true,
    m ? JSON.stringify(m.provisionales) : "sin modelo");
  comprobar("pero queda anotado para quien edita: caracteristicas",
    !!m && !!m.provisionales && m.provisionales.caracteristicas > 0,
    m ? JSON.stringify(m.provisionales) : "sin modelo");
}

/* ================================================================
   5. Privacidad al atravesar el esquema
   ================================================================ */

bloque("5. CAMPOS PROHIBIDOS QUE VINIERAN DEL ORIGEN");
nota("aunque el backend fallara y los emitiera, el esquema no debe dejarlos pasar");

{
  const hostil = modeloPublicable({
    stock_real: 7,
    numero_chasis: "ABC123",
    costo_compra: 5000,
    telefono_cliente: "999999999",
    token: "sk-secreto",
    CONTACTOS_INTERNOS: "interno",
    spreadsheet_id: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdEF",
  });
  const m = normalizar(hostil);
  comprobar("el modelo se normaliza igualmente", !!m);
  if (m) {
    const serializado = JSON.stringify(m);
    for (const campo of ["stock_real", "numero_chasis", "costo_compra", "telefono_cliente",
      "token", "CONTACTOS_INTERNOS", "spreadsheet_id", "1AbCdEfGhIjKlMnOpQrStUvWxYz"]) {
      comprobar("no atraviesa el esquema: " + campo, serializado.indexOf(campo) === -1);
    }
  }
}

/* ================================================================
   6. Precio
   ================================================================ */

bloque("6. PRECIO — TRES CONDICIONES");

function conPrecio(cfgGlobal, mostrar, precio) {
  const cfg = S.normalizarConfig({ mostrar_precios: cfgGlobal });
  const m = S.normalizarModelo(modeloPublicable({ mostrar_precio: mostrar, precio_publico: precio }), cfg, []);
  return !!(m && m.mostrarPrecio === true && m.precioPublico > 0);
}

comprobar("global true + modelo true + precio válido → se muestra", conPrecio(true, true, 9990));
comprobar("global false → no se muestra", !conPrecio(false, true, 9990));
comprobar("modelo false → no se muestra", !conPrecio(true, false, 9990));
comprobar("sin precio → no se muestra", !conPrecio(true, true, ""));
comprobar("precio cero → no se muestra", !conPrecio(true, true, 0));
nota("estado de hoy: los 22 modelos tienen la celda vacía y mostrar_precio en FALSE");

/* ================================================================
   7. Archivo real, si se pasó
   ================================================================ */

if (ARCHIVO) {
  bloque("7. RESPUESTA REAL DEL ENDPOINT  (" + ARCHIVO + ")");
  if (!existsSync(ARCHIVO)) {
    comprobar("el archivo existe", false, ARCHIVO);
  } else {
    let datos = null;
    try { datos = JSON.parse(readFileSync(ARCHIVO, "utf8")); } catch (e) { /* abajo */ }
    if (!comprobar("el archivo contiene JSON interpretable", datos !== null)) {
      /* nada más que hacer */
    } else {
      comprobar("el frontend ACEPTA esta respuesta", aceptaElFrontend(datos),
        "el sitio caería al archivo local — revisar version, ok y la lista de modelos");

      const registros = S.extraerRegistros(datos);
      if (Array.isArray(registros)) {
        const cfg = S.normalizarConfig(datos.config);
        const avisos = [];
        const normalizados = registros.map((b) => S.normalizarModelo(b, cfg, avisos)).filter(Boolean);
        const publicados = normalizados.filter((m) => S.esPublicable(m) === true);

        nota("registros: " + registros.length + " · normalizados: " + normalizados.length +
          " · publicados: " + publicados.length);
        if (avisos.length) nota("avisos del esquema: " + avisos.length);

        comprobar("ningún modelo publicado sin fotografía",
          publicados.every((m) => !!m.imagenPrincipal),
          publicados.filter((m) => !m.imagenPrincipal).map((m) => m.modelo).join(", "));

        const serial = JSON.stringify(normalizados);
        for (const campo of ["stock", "chasis", "costo", "margen", "telefono", "token", "secret"]) {
          comprobar("la respuesta real no arrastra «" + campo + "»", serial.toLowerCase().indexOf(campo) === -1);
        }

        if (publicados.length === 0) {
          nota("0 publicados: es lo esperado mientras las 22 filas sigan en BORRADOR");
        }
      }
    }
  }
} else {
  bloque("7. RESPUESTA REAL DEL ENDPOINT");
  nota("no se pasó ningún archivo. El día del despliegue:");
  nota("  node scripts/qa-endpoint-real.mjs --endpoint=… --guardar=respuesta.json");
  nota("  node scripts/qa-contrato-remoto.mjs respuesta.json");
}

/* ================================================================
   Informe
   ================================================================ */

const ok = fallos.length === 0;

if (JSON_MODE) {
  console.log(JSON.stringify({ resultado: ok ? "PASS" : "FAIL", total, fallos }, null, 2));
  process.exit(ok ? 0 : 1);
}

console.log("ARENAS — CONTRATO REMOTO CONTRA EL FRONTEND REAL");
console.log("sin conectar el sitio: modoDatos y appsScriptEndpoint no se tocan");
console.log(lineas.join("\n"));
console.log("");
console.log("================================================================");
if (ok) {
  console.log("RESULTADO: " + total + "/" + total + " comprobaciones correctas.");
  console.log("");
  console.log("Un catálogo remoto VACÍO Y VÁLIDO se acepta; uno caído, roto o de");
  console.log("otra versión cae al archivo local. Son casos distintos y el");
  console.log("frontend los distingue.");
} else {
  console.log("RESULTADO: " + fallos.length + " de " + total + " comprobaciones FALLAN.");
  console.log("");
  fallos.forEach((f) => console.log("  · " + f.desc + (f.detalle ? "  → " + f.detalle : "")));
}
process.exit(ok ? 0 : 1);
