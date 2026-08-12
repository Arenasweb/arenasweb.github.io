#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-endpoint-catalogo.mjs
   Pruebas de INFRAESTRUCTURA del endpoint. Sin dependencias.

       node scripts/qa-endpoint-catalogo.mjs

   POR QUÉ EXISTE, APARTE DE qa-api-catalogo.mjs
   Aquel comprueba `Nucleo.gs`, que es lógica pura. Esto ejecuta
   `Endpoint.gs` de verdad, con dobles de SpreadsheetApp,
   PropertiesService, CacheService, ContentService y Logger, y llama a
   doGet(e) como lo haría Google.

   La distinción no es académica: la auditoría independiente encontró un
   fallo crítico en `Endpoint.gs` que las pruebas de `Nucleo.gs` no
   podían ver, sencillamente porque nunca ejecutaban el endpoint.
   Probar el núcleo no equivale a probar el endpoint.

   Aquí no se adapta la salida: se lee lo que doGet devolvió.

   exit 0 → todas las pruebas pasan.
   exit 1 → alguna falla.
   ================================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const V2 = join(RAIZ, "apps-script/v2");

/** Identificador trampa: si aparece en una respuesta pública, hay fuga. */
const ID_TRAMPA = "SPREADSHEET-ID-SUPER-SECRETO-12345";

/* ================================================================
   Dobles de la plataforma Apps Script
   ================================================================ */

/**
 * Construye un entorno de ejecución equivalente al de una Web App y
 * carga los tres archivos del paquete v2 tal cual.
 *
 * @param {Object} opciones
 *   propiedades   mapa que devuelve PropertiesService, o null
 *   libros        mapa idSpreadsheet → {hojas: {nombre: matriz}}
 *   activo        lo que devuelve getActiveSpreadsheet() (null por defecto,
 *                 que es lo que ocurre en una Web App independiente)
 *   fallaOpenById si true, openById lanza excepción
 *   cache         objeto de caché compartido entre llamadas
 */
function entorno(opciones) {
  const o = opciones || {};
  const registro = [];
  const cacheInterna = o.cache || {};
  const llamadas = { openById: [], getProperty: [], cachePut: [] };

  function hojaDoble(matriz) {
    return {
      getDataRange: () => (matriz ? { getValues: () => matriz } : null),
    };
  }

  function libroDoble(hojas) {
    return {
      getSheetByName: (n) => (hojas && hojas[n] ? hojaDoble(hojas[n]) : null),
    };
  }

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => (o.activo ? libroDoble(o.activo) : null),
    getActive: () => (o.activo ? libroDoble(o.activo) : null),
    openById: (id) => {
      llamadas.openById.push(id);
      if (o.fallaOpenById) throw new Error("No se ha encontrado el documento con el ID " + id);
      const libro = o.libros && o.libros[id];
      if (!libro) throw new Error("No se ha encontrado el documento con el ID " + id);
      return libroDoble(libro);
    },
  };

  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (clave) => {
        llamadas.getProperty.push(clave);
        if (!o.propiedades) return null;
        return Object.prototype.hasOwnProperty.call(o.propiedades, clave) ? o.propiedades[clave] : null;
      },
    }),
  };

  const CacheService = {
    getScriptCache: () => ({
      get: (k) => (Object.prototype.hasOwnProperty.call(cacheInterna, k) ? cacheInterna[k] : null),
      put: (k, v, ttl) => {
        llamadas.cachePut.push({ clave: k, ttl, valor: v });
        cacheInterna[k] = v;
      },
      remove: (k) => {
        delete cacheInterna[k];
      },
    }),
  };

  const ContentService = {
    MimeType: { JSON: "application/json" },
    createTextOutput: (texto) => ({
      _texto: texto,
      _mime: null,
      setMimeType(m) {
        this._mime = m;
        return this;
      },
      getContent() {
        return this._texto;
      },
      getMimeType() {
        return this._mime;
      },
    }),
  };

  const Logger = { log: (m) => registro.push(String(m)) };

  const contexto = createContext({
    SpreadsheetApp,
    PropertiesService,
    CacheService,
    ContentService,
    Logger,
    console,
    Date,
    JSON,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    isFinite,
    parseInt,
    parseFloat,
    isNaN,
  });

  for (const archivo of ["Configuracion.gs", "Nucleo.gs", "Endpoint.gs"]) {
    runInContext(readFileSync(join(V2, archivo), "utf8"), contexto, { filename: "v2/" + archivo });
  }

  return { contexto, registro, cache: cacheInterna, llamadas };
}

/** Llama a doGet y devuelve el objeto ya parseado, sin adaptar nada. */
function pedir(env, parametros) {
  const salida = env.contexto.doGet({ parameter: parametros || {} });
  return {
    mime: salida.getMimeType(),
    texto: salida.getContent(),
    cuerpo: JSON.parse(salida.getContent()),
  };
}

/* ================================================================
   Datos de prueba
   ================================================================ */

const CAB_MODELOS = [
  "id", "slug", "modelo", "linea", "categoria", "subcategoria", "titulo_web",
  "descripcion_corta", "descripcion_larga", "precio_publico", "mostrar_precio",
  "imagen_principal", "imagen_mobile", "galeria_1", "galeria_2", "colores",
  "caracteristica_1", "caracteristica_2", "caracteristica_3", "destacado",
  "nuevo", "cta_label", "orden", "activo", "estado_contenido",
  "ultima_revision", "alt_text", "foco_imagen",
];

const RUTA = "assets/catalogo/prueba/portada.webp";

function filaModelo(cambios) {
  const base = {
    id: "T-01", slug: "modelo-ok", modelo: "Modelo Ok", linea: "Prueba",
    categoria: "ciudad", subcategoria: "", titulo_web: "",
    descripcion_corta: "Una moto de prueba.", descripcion_larga: "",
    precio_publico: "", mostrar_precio: "FALSE",
    imagen_principal: RUTA, imagen_mobile: "", galeria_1: "", galeria_2: "",
    colores: "", caracteristica_1: "", caracteristica_2: "", caracteristica_3: "",
    destacado: "FALSE", nuevo: "FALSE", cta_label: "", orden: 100,
    activo: "TRUE", estado_contenido: "APROBADO", ultima_revision: "",
    alt_text: "Foto de prueba", foco_imagen: "center center",
  };
  const f = Object.assign({}, base, cambios || {});
  return CAB_MODELOS.map((c) => f[c]);
}

const HOJAS_OK = {
  MODELOS_WEB: [CAB_MODELOS, filaModelo()],
  CONFIG_PUBLICA: [
    ["clave", "valor"],
    ["api_version", "1.0"],
    ["mostrar_precios", "TRUE"],
    ["cache_segundos", "300"],
  ],
  CATEGORIAS: [
    ["slug", "titulo", "descripcion", "orden", "activo"],
    ["ciudad", "Ciudad", "Movilidad ágil.", 1, "TRUE"],
  ],
};

const LIBROS_OK = { [ID_TRAMPA]: HOJAS_OK };
const PROPS_OK = { ARENAS_CATALOGO_SPREADSHEET_ID: ID_TRAMPA };

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
   1. C-1 — obtención del Spreadsheet
   ================================================================ */

grupo("1. ACCESO AL SPREADSHEET  (hallazgo crítico C-1)");

// A. Propiedad ausente → debe fallar cerrado, no reventar.
const sinProp = pedir(entorno({ propiedades: {}, libros: LIBROS_OK }), { action: "catalogo" });
comprobar("propiedad ausente → ok:false", sinProp.cuerpo.ok === false, JSON.stringify(sinProp.cuerpo).slice(0, 90));
comprobar("propiedad ausente → error de configuración, no genérico",
  sinProp.cuerpo.error === "backend_no_configurado", sinProp.cuerpo.error);
comprobar("propiedad ausente → no publica ningún modelo",
  !sinProp.cuerpo.modelos || sinProp.cuerpo.modelos.length === 0);

// B. Propiedad vacía o con espacios → igual.
["", "   ", null].forEach((valor) => {
  const r = pedir(entorno({ propiedades: { ARENAS_CATALOGO_SPREADSHEET_ID: valor }, libros: LIBROS_OK }),
    { action: "catalogo" });
  comprobar(`propiedad ${JSON.stringify(valor)} → falla cerrado`,
    r.cuerpo.ok === false && r.cuerpo.error === "backend_no_configurado", r.cuerpo.error);
});

// C. openById lanza → falla cerrado sin filtrar el mensaje.
const rompe = entorno({ propiedades: PROPS_OK, fallaOpenById: true });
const rRompe = pedir(rompe, { action: "catalogo" });
comprobar("openById lanza → ok:false", rRompe.cuerpo.ok === false);
comprobar("openById lanza → no se filtra el mensaje de la excepción",
  !rRompe.texto.includes("No se ha encontrado el documento"), rRompe.texto.slice(0, 90));
comprobar("openById lanza → el identificador no aparece en la respuesta",
  !rRompe.texto.includes(ID_TRAMPA));

// D. Libro válido → el catálogo se construye.
const bien = entorno({ propiedades: PROPS_OK, libros: LIBROS_OK });
const rBien = pedir(bien, { action: "catalogo" });
comprobar("libro válido → ok:true", rBien.cuerpo.ok === true, JSON.stringify(rBien.cuerpo).slice(0, 120));
comprobar("libro válido → publica el modelo aprobado y activo",
  rBien.cuerpo.modelos && rBien.cuerpo.modelos.length === 1,
  rBien.cuerpo.modelos ? String(rBien.cuerpo.modelos.length) : "sin lista");

// E. El identificador viene SOLO de la propiedad privada.
comprobar("openById recibe exactamente el valor de la propiedad",
  bien.llamadas.openById.length === 1 && bien.llamadas.openById[0] === ID_TRAMPA,
  JSON.stringify(bien.llamadas.openById));
comprobar("se consulta la propiedad con el nombre acordado",
  bien.llamadas.getProperty.includes("ARENAS_CATALOGO_SPREADSHEET_ID"),
  JSON.stringify(bien.llamadas.getProperty));

// F. Nunca se recurre al libro activo como respaldo silencioso.
const conActivo = entorno({ propiedades: {}, activo: HOJAS_OK, libros: LIBROS_OK });
const rConActivo = pedir(conActivo, { action: "catalogo" });
comprobar("con libro activo disponible pero sin propiedad → sigue fallando cerrado",
  rConActivo.cuerpo.ok === false,
  "si esto pasa a ok:true, alguien reintrodujo getActiveSpreadsheet como respaldo");

/* ================================================================
   2. El identificador nunca sale
   ================================================================ */

grupo("2. EL IDENTIFICADOR NO SE FILTRA");

[
  ["respuesta válida", rBien.texto],
  ["error de apertura", rRompe.texto],
  ["error de configuración", sinProp.texto],
].forEach(([caso, texto]) => {
  comprobar(`${caso}: sin el identificador`, !texto.includes(ID_TRAMPA));
  comprobar(`${caso}: sin el nombre de la propiedad`, !texto.includes("ARENAS_CATALOGO_SPREADSHEET_ID"));
  comprobar(`${caso}: sin nombres de hoja internos`, !/MODELOS_WEB|CONFIG_PUBLICA|CATEGORIAS/.test(texto));
});

comprobar("el registro interno sí puede nombrar el problema (no es público)",
  rompe.registro.length > 0, JSON.stringify(rompe.registro).slice(0, 80));
comprobar("pero tampoco el registro escribe el identificador",
  !rompe.registro.join(" ").includes(ID_TRAMPA), rompe.registro.join(" | ").slice(0, 100));

/* ================================================================
   3. action=salud
   ================================================================ */

grupo("3. SALUD");

const saludSin = pedir(entorno({ propiedades: {} }), { action: "salud" });
comprobar("salud responde aunque no haya configuración", saludSin.cuerpo.ok === true);
comprobar("salud declara que el backend NO está configurado",
  saludSin.cuerpo.configurado === false, JSON.stringify(saludSin.cuerpo));
comprobar("salud no afirma que el catálogo funciona",
  !("modelos" in saludSin.cuerpo));
comprobar("salud no revela el identificador", !saludSin.texto.includes(ID_TRAMPA));
comprobar("salud no revela nombres de hoja", !/MODELOS_WEB|CONFIG_PUBLICA/.test(saludSin.texto));

const saludCon = pedir(entorno({ propiedades: PROPS_OK, libros: LIBROS_OK }), { action: "salud" });
comprobar("con configuración, salud lo indica", saludCon.cuerpo.configurado === true);
comprobar("salud no lee ninguna hoja", saludCon.cuerpo.modelos === undefined);

/* ================================================================
   4. Parámetros hostiles
   ================================================================ */

grupo("4. PARÁMETROS HOSTILES");

const HOSTILES = [
  { action: "catalogo", spreadsheetId: "OTRO-LIBRO-CUALQUIERA" },
  { action: "catalogo", sheet: "CONTACTOS_INTERNOS" },
  { action: "catalogo", range: "A1:Z999" },
  { action: "catalogo", preview: "1" },
  { action: "catalogo", debug: "1" },
  { action: "catalogo", borrador: "1" },
  { action: "catalogo", id: ID_TRAMPA },
];

/** Compara respuestas ignorando la marca de tiempo, que cambia siempre. */
function sinFecha(cuerpo) {
  const copia = Object.assign({}, cuerpo);
  delete copia.generated_at;
  return JSON.stringify(copia);
}

HOSTILES.forEach((params) => {
  const env = entorno({ propiedades: PROPS_OK, libros: LIBROS_OK });
  const r = pedir(env, params);
  const extra = Object.keys(params).filter((k) => k !== "action").join(",");
  comprobar(`?${extra} → se ignora, misma respuesta`,
    sinFecha(r.cuerpo) === sinFecha(rBien.cuerpo), extra);
  comprobar(`?${extra} → el origen no cambia`,
    env.llamadas.openById.length === 1 && env.llamadas.openById[0] === ID_TRAMPA,
    JSON.stringify(env.llamadas.openById));
});

const accionRara = pedir(entorno({ propiedades: PROPS_OK, libros: LIBROS_OK }), { action: "otra_cosa" });
comprobar("una acción desconocida no cae al catálogo",
  accionRara.cuerpo.ok === false && !accionRara.cuerpo.modelos);

/* ================================================================
   5. Caché
   ================================================================ */

grupo("5. CACHÉ");

const compartida = {};
const env1 = entorno({ propiedades: PROPS_OK, libros: LIBROS_OK, cache: compartida });
pedir(env1, { action: "catalogo" });
comprobar("una respuesta válida se cachea", env1.llamadas.cachePut.length === 1);
comprobar("el TTL sale de la configuración",
  env1.llamadas.cachePut[0] && env1.llamadas.cachePut[0].ttl === 300,
  env1.llamadas.cachePut[0] ? String(env1.llamadas.cachePut[0].ttl) : "-");
comprobar("lo cacheado no contiene el identificador",
  !JSON.stringify(compartida).includes(ID_TRAMPA));

// Una respuesta de error NO debe quedar cacheada: si se corrige la hoja,
// el arreglo debe verse enseguida y no dentro de cinco minutos.
const cacheErr = {};
const envErr = entorno({ propiedades: {}, cache: cacheErr });
pedir(envErr, { action: "catalogo" });
comprobar("un error de configuración NO se cachea",
  envErr.llamadas.cachePut.length === 0 && Object.keys(cacheErr).length === 0,
  JSON.stringify(Object.keys(cacheErr)));

const cacheContrato = {};
const envContrato = entorno({
  propiedades: PROPS_OK,
  libros: { [ID_TRAMPA]: Object.assign({}, HOJAS_OK, { MODELOS_WEB: [["id", "slug"], ["X", "x"]] }) },
  cache: cacheContrato,
});
const rContrato = pedir(envContrato, { action: "catalogo" });
comprobar("un contrato incompleto responde ok:false", rContrato.cuerpo.ok === false);
comprobar("un contrato incompleto NO se cachea",
  envContrato.llamadas.cachePut.length === 0, JSON.stringify(Object.keys(cacheContrato)));

// La clave de caché debe cambiar si cambia la versión del contrato.
comprobar("la clave de caché lleva las dos versiones",
  Object.keys(compartida)[0] &&
    Object.keys(compartida)[0].includes(envContrato.contexto.API_VERSION) &&
    Object.keys(compartida)[0].includes(envContrato.contexto.CONTRATO_MAYOR),
  Object.keys(compartida)[0]);

/* ================================================================
   6. Forma de la respuesta
   ================================================================ */

grupo("6. FORMA DE LA RESPUESTA");

comprobar("el tipo MIME es JSON", rBien.mime === "application/json", String(rBien.mime));
comprobar("el cuerpo es JSON válido y no HTML", typeof rBien.cuerpo === "object" && !rBien.texto.includes("<"));
comprobar("no viaja el diagnóstico interno", !rBien.texto.includes("_diagnostico"));
comprobar("no viaja el TTL de caché", !rBien.texto.includes("_cache_segundos"));
comprobar("ningún campo del envelope empieza por guion bajo",
  Object.keys(rBien.cuerpo).every((k) => k.charAt(0) !== "_"), Object.keys(rBien.cuerpo).join(","));

/* ================================================================
   Resultado
   ================================================================ */

console.log("");
console.log("=".repeat(64));
if (fallos.length) {
  console.log(`RESULTADO: ${fallos.length} prueba(s) FALLAN de ${pasadas + fallos.length}.`);
  console.log("");
  fallos.forEach((f) => console.log("  · " + f));
  process.exit(1);
}
console.log(`RESULTADO: ${pasadas}/${pasadas} pruebas pasan.`);
process.exit(0);
