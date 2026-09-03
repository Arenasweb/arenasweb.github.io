#!/usr/bin/env node
/* ================================================================
   generar-plantilla.mjs
   Saca de este repositorio una plantilla reutilizable, sin un solo
   dato del negocio.

       node scripts/generar-plantilla.mjs [destino]

   POR QUÉ EXISTE
   El motor de este sitio —catálogo desde una hoja de cálculo, ficha por
   modelo, recorrido pieza por pieza, canal de ventas con reparto, suite
   de pruebas— sirve para cualquier negocio que enseñe productos. Lo que
   no sirve es el contenido: nombres, teléfonos, fotografías, la hoja de
   cálculo y el dominio.

   QUÉ NO HACE, Y ES DELIBERADO
   No reemplaza cadenas a ciegas por todo el árbol. Un `replace` global
   de «arenas» rompería `ARENAS_CATALOGO` (el espacio de nombres que usan
   cuarenta archivos) y las rutas de dos imágenes. Aquí cada cosa se trata
   por lo que es:

     · el texto visible se sustituye por marcadores evidentes
     · los datos se reemplazan enteros por un demo inventado
     · las fotografías del negocio no se copian: se generan marcadores
     · el espacio de nombres se renombra en todos sus usos a la vez

   CÓMO SE COMPRUEBA
   Al final rastrea el resultado buscando lo que no debería quedar. Si
   encuentra algo, lo dice y sale con error: una plantilla «limpia» que
   conserva el teléfono de un vendedor es peor que no tener plantilla.
   ================================================================ */

import { execFileSync } from "node:child_process";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, statSync, readdirSync,
} from "node:fs";
import { dirname, join, resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ORIGEN = resolve(AQUI, "..");
const DESTINO = resolve(process.argv[2] || join(ORIGEN, "..", "plantilla-catalogo-web"));

/* ---------------- Qué se copia y qué no ----------------

   Se parte de `git ls-files`: lo versionado y nada más. Así el buzón de
   material, los másters fotográficos y cualquier archivo local quedan
   fuera sin tener que enumerarlos.

   De ahí se descuenta todo lo que ES el negocio. */

/* Los documentos que la suite de pruebas lee. Se sacan del propio código
   —no de una lista a mano— para que añadir una prueba que consulte un
   documento nuevo no rompa la plantilla en silencio. */
const DOCS_QUE_SE_QUEDAN = new Set(
  execFileSync("git", ["ls-files", "scripts"], { cwd: ORIGEN, encoding: "utf8" })
    .split("\n").map(s => s.trim()).filter(Boolean)
    .flatMap(f => {
      try { return readFileSync(join(ORIGEN, f), "utf8").match(/docs\/[a-z0-9._-]+\.md/g) || []; }
      catch { return []; }
    })
);

const FUERA = [
  // Fotografía y vídeo del negocio. Todo.
  /^assets\/catalogo\//,
  /^assets\/portadas\//,
  /^assets\/videos\//,
  /^assets\/equipo\//,
  /^assets\/branding\//,
  /^assets\/hero\//,
  /^assets\/fondos\//,
  /^assets\/explorar\//,

  // Datos. Los `.local` son volcados de trabajo y el catálogo y las fichas
  // editoriales se escriben de nuevo más abajo: sanearlos dejaría veintidós
  // motocicletas reales con el nombre cambiado, que no es un demo, es lo
  // mismo disfrazado.
  //
  // `configuracion.json` y `slots/` NO se excluyen: se sanean valor a valor.
  // De ellos importa la forma, y esa tiene que seguir encajando con el código
  // que los lee. Reescribirlos a mano es la manera de que se desincronicen.
  /^data\/.*\.local\.json$/,
  /^data\/catalogo-publico/,
  /^data\/fichas-editorial\.json$/,

  // Backend: apunta a una hoja de cálculo concreta.
  /^apps-script\//,

  // Documentación: 48 archivos que cuentan la historia de ESTE proyecto y
  // no le sirven a nadie más. Se van todos MENOS los que la suite de
  // pruebas abre para comprobar que el código y lo documentado coinciden;
  // sin ellos `qa-tests.mjs` no arranca siquiera, y una plantilla cuyas
  // pruebas no corren no es una plantilla, es un montón de archivos.
  (rel) => rel.startsWith("docs/") && !DOCS_QUE_SE_QUEDAN.has(rel),

  // Documentos de gobierno de este repositorio.
  /^PLAN-MAESTRO\.md$/,
  /^PRE_COMMIT_AUDIT_CHECKLIST\.md$/,
  /^README\.md$/,
  /^AGENTS\.md$/,
  /^\.github\//,
  /^\.codex\//,
  /^tests\//,

  // Mapa del sitio y robots: llevan el dominio dentro.
  /^sitemap\.xml$/,
];

/* ---------------- Sustituciones de texto ----------------

   Orden importante: lo más largo primero, o «ARENAS» se comería
   «ARENAS MOTOCICLETAS» y dejaría un « MOTOCICLETAS» suelto. */

const TEXTO = [
  // Identidad
  [/ARENAS MOTOCICLETAS/g, "NOMBRE DEL NEGOCIO"],
  [/Arenas Motocicletas/g, "Nombre del Negocio"],
  [/ARENAS_CATALOGO/g, "CATALOGO_WEB"],
  [/arenasweb\.github\.io/g, "tu-usuario.github.io"],
  [/arenasweb/g, "tu-usuario"],
  [/Arenasweb/g, "tu-usuario"],
  [/ARENAS/g, "EL NEGOCIO"],
  [/\bArenas\b/g, "El Negocio"],
  [/arenas-logo-oficial\.png/g, "logo.svg"],
  [/trama-arenas\.webp/g, "trama.svg"],
  [/\barenas\b/g, "negocio"],

  // Marca y productos ajenos
  [/BAJAJ/g, "LA MARCA"],
  [/Bajaj/g, "La Marca"],

  // Plaza
  [/Cusco, Per[úu]/g, "Tu Ciudad"],
  [/Cusco/g, "Tu Ciudad"],
  [/Av\. La Cultura/g, "Tu dirección"],
  [/La Cultura/g, "Tu dirección"],

  /* Canal de ventas. Se conserva la FORMA del número, no solo las cifras:
     hay una prueba que comprueba que «+51 994 790 490» con espacios acaba
     convertido en `51994790490` para wa.me. Si se sustituye la versión
     compacta y no la separada, el par deja de casar y la prueba falla por
     culpa del saneado, no del código. */
  [/(\+?51)([ -]?)9\d{2}([ -]?)\d{3}([ -]?)\d{3}/g,
   (_m, p, a, b, c) => p + a + "900" + b + "000" + c + "000"],

  // Backend
  [/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g,
   "https://script.google.com/macros/s/PON-AQUI-TU-ID-DE-DESPLIEGUE/exec"],

  // La plantilla arranca contra SUS PROPIOS datos, no contra un endpoint
  // que no existe. En modo remoto la primera carga falla, el navegador
  // escupe un error de CORS y quien la abre cree que está rota antes de
  // haber cambiado nada. El día que haya hoja de cálculo se pone el ID de
  // despliegue y se vuelve a "remoto".
  [/modoDatos: "remoto"/g, 'modoDatos: "local"'],

  /* Fixtures de slug INVÁLIDO. Van antes que las familias de producto a
     propósito: si se dejan pasar, «Pulsar-180» acaba siendo «producto-uno»
     —un slug perfectamente válido— y tres pruebas que comprobaban que un
     slug malo se rechaza pasan a comprobar lo contrario sin que nadie lo
     note. Es el peor daño que puede hacer un saneado: no romper, sino
     invertir el significado de una prueba. */
  [/"Pulsar-180"/g, '"Articulo-180"'],
  [/"pulsar-"/g, '"articulo-"'],
  [/"pulsar--180"/g, '"articulo--180"'],

  // Personas
  [/\bN[ée]stor\b/g, "Asesor 1"],
  [/\bTaty\b/g, "Asesor 2"],
  [/\bIris\b/g, "Asesor 3"],
  [/\bDaniel\b/g, "Asesor 4"],
  [/\bRa[úu]l\b/g, "Asesor 5"],
];

/* Palabras del español que CONTIENEN el nombre de un modelo y no tienen
   nada que ver con él. «impulsar» lleva «pulsar» dentro, y sustituirla a
   ciegas deja frases rotas por toda la documentación.

   Se apartan antes de tocar nada y se devuelven al final. El centinela
   usa un carácter que no puede aparecer en un archivo de texto normal. */
const CENTINELA = String.fromCharCode(0xE000);  // zona de uso privado: imposible en un archivo real
const PROTEGIDAS = ["impulsar", "impulsa", "pulsador", "pulsar el", "compulsar"];

/* Modelos del catálogo citados en comentarios, ejemplos y pruebas.

   Se atrapa la familia entera y los caracteres de slug que la rodean, sin
   distinguir mayúsculas: en el repositorio conviven `pulsar-200-ns-ug2`,
   `PULSAR 200 NS UG2`, `Pulsar200` y `BOXER2024_3`. Enumerar cada variante
   a mano es exactamente como se escapa una. */
const FAMILIAS = [
  [/(?:[a-z0-9]*)pulsar(?:[a-z0-9_-]*)/gi, "producto-uno"],
  [/(?:[a-z0-9]*)dominar(?:[a-z0-9_-]*)/gi, "producto-dos"],
  [/(?:[a-z0-9]*)discover(?:[a-z0-9_-]*)/gi, "producto-tres"],
  [/(?:[a-z0-9]*)boxer(?:[a-z0-9_-]*)/gi, "producto-cuatro"],
  [/(?:[a-z0-9]*)mototaxi(?:[a-z0-9_-]*)/gi, "producto-cinco"],
  [/(?:[a-z0-9]*)torito(?:[a-z0-9_-]*)/gi, "producto-seis"],
  [/(?:[a-z0-9]*)fibraser(?:[a-z0-9_-]*)/gi, "producto-seis"],
  [/(?:[a-z0-9]*)fibratec(?:[a-z0-9_-]*)/gi, "producto-seis"],
  [/\bct-125\b/gi, "producto-siete"],
  // Los nombres compuestos que llevan la cilindrada detrás.
  [/PRODUCTO-UNO[ ][0-9A-Z ]+/g, "PRODUCTO"],
];

const PRODUCTOS = FAMILIAS;

const TEXTUALES = new Set([
  ".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".xml", ".yml", ".gs",
]);

/* ---------------- Utilidades ---------------- */

function asegurar(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

function versionados() {
  return execFileSync("git", ["ls-files"], { cwd: ORIGEN, encoding: "utf8" })
    .split("\n").map(s => s.trim()).filter(Boolean);
}

function sanear(texto) {
  let s = texto;

  // Fuera las palabras del español que llevan un modelo dentro.
  PROTEGIDAS.forEach((p, i) => {
    s = s.replace(new RegExp(p, "gi"), CENTINELA + i + CENTINELA);
  });

  for (const [de, a] of TEXTO) s = s.replace(de, a);
  for (const [de, a] of PRODUCTOS) s = s.replace(de, a);

  // Claves y palabras compuestas: `razonesArenas`, `ubicacionesArenas`.
  s = s.replace(/([a-z])Arenas\b/g, "$1Negocio").replace(/arenas/gi, "negocio");

  PROTEGIDAS.forEach((p, i) => {
    s = s.split(CENTINELA + i + CENTINELA).join(p);
  });
  return s;
}

/* ---------------- Copia ---------------- */

if (existsSync(DESTINO)) rmSync(DESTINO, { recursive: true, force: true });
asegurar(DESTINO);

let copiados = 0, saneados = 0, omitidos = 0;

for (const rel of versionados()) {
  // La lista admite expresiones y también funciones, para las reglas que
  // no se pueden escribir como un patrón (los docs que sí se quedan).
  if (FUERA.some(r => typeof r === "function" ? r(rel) : r.test(rel))) { omitidos++; continue; }

  const origen = join(ORIGEN, rel);
  if (!existsSync(origen)) continue;

  const destino = join(DESTINO, rel);
  asegurar(dirname(destino));

  if (TEXTUALES.has(extname(rel).toLowerCase())) {
    const antes = readFileSync(origen, "utf8");
    const despues = sanear(antes);
    writeFileSync(destino, despues, "utf8");
    if (antes !== despues) saneados++;
  } else {
    copyFileSync(origen, destino);
  }
  copiados++;
}

console.log("archivos copiados : " + copiados);
console.log("con texto saneado : " + saneados);
console.log("omitidos          : " + omitidos + " (fotografia, datos, docs y backend del negocio)");

/* ---------------- Marcadores en lugar de fotografías ----------------

   La plantilla tiene que ABRIR y verse, no dar cuadros rotos. Un SVG
   pesa nada, no necesita generarse con herramientas y deja claro a
   simple vista que ahí falta una foto. */

function svgMarcador(ancho, alto, etiqueta) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${etiqueta}">
  <rect width="100%" height="100%" fill="#e9edf3"/>
  <rect x="1" y="1" width="${ancho - 2}" height="${alto - 2}" fill="none" stroke="#c3ccd9" stroke-width="2" stroke-dasharray="10 8"/>
  <text x="50%" y="50%" fill="#7d8896" font-family="system-ui, sans-serif" font-size="${Math.max(14, Math.round(ancho / 22))}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${etiqueta}</text>
</svg>`;
}

function marcador(ruta, ancho, alto, etiqueta) {
  asegurar(dirname(join(DESTINO, ruta)));
  writeFileSync(join(DESTINO, ruta), svgMarcador(ancho, alto, etiqueta), "utf8");
}

marcador("assets/branding/logo.svg", 900, 144, "TU LOGO");
marcador("assets/fondos/trama.svg", 400, 400, "");
marcador("assets/hero/portada.svg", 1920, 1080, "IMAGEN DE PORTADA");

for (let i = 1; i <= 8; i++) {
  const slug = ["uno","dos","tres","cuatro","cinco","seis","siete","ocho"][i - 1];
  marcador(`assets/catalogo/producto-${slug}/portada.svg`, 1200, 800, `PRODUCTO ${i}`);
  marcador(`assets/catalogo/producto-${slug}/portada-card.svg`, 760, 475, `PRODUCTO ${i}`);
}
for (const pieza of ["lateral", "detalle-a", "detalle-b", "detalle-c"]) {
  marcador(`assets/catalogo/producto-uno/details/${pieza}.svg`, 1400, 1000, pieza.toUpperCase());
}
for (let i = 1; i <= 5; i++) marcador(`assets/equipo/asesor-${i}.svg`, 400, 400, "ASESOR " + i);

console.log("marcadores creados: logo, portada, 8 productos, 4 detalles, 5 asesores");

/* ---------------- Datos: forma real, contenido inventado ----------------

   `configuracion.json` y `slots/` ya vinieron saneados por el paso de
   texto, pero eso solo cambia lo que reconocen las expresiones. Aquí se
   vacían además los campos que son datos por naturaleza —un correo, una
   coordenada, un horario— aunque su valor no case con ningún patrón. */

const CAMPOS_DATO = /^(correo|correoSoporte|telefono|telefonoFijo|direccion|coordenadas|horario|horarios|urlTemporal|urlOficial|instagram|facebook|tiktok|youtube|whatsapp|maps|mapsUrl|ruc)$/i;

function vaciarDatos(valor, clave) {
  if (Array.isArray(valor)) return valor.map(v => vaciarDatos(v, clave));
  if (valor && typeof valor === "object") {
    const salida = {};
    for (const [k, v] of Object.entries(valor)) salida[k] = vaciarDatos(v, k);
    return salida;
  }
  if (typeof valor !== "string" || !valor) return valor;
  if (!CAMPOS_DATO.test(clave || "")) return valor;
  if (/^correo/i.test(clave)) return "correo@tu-negocio.com";
  if (/telefono|whatsapp/i.test(clave)) return "51900000000";
  return "PENDIENTE";
}

const ficherosSlots = execFileSync("git", ["ls-files", "data/slots"], { cwd: ORIGEN, encoding: "utf8" })
  .split("\n").map(s => s.trim()).filter(Boolean);

for (const rel of ["data/configuracion.json", ...ficherosSlots]) {
  const f = join(DESTINO, rel);
  if (!existsSync(f)) continue;
  const j = JSON.parse(readFileSync(f, "utf8"));
  writeFileSync(f, JSON.stringify(vaciarDatos(j), null, 2) + "\n", "utf8");
}

/* Los asesores de ventas.

   El saneado por patrón les deja a los cinco el mismo teléfono y las fotos
   apuntando a archivos que ya no existen. Hay dos pruebas que lo detectan
   —«ningún teléfono repetido» y «todo asesor activo tiene su fotografía en
   disco»— y tienen razón: con el mismo número, el reparto por turnos manda
   siempre al mismo sitio y no se notaría hasta que un cliente escribiera.
   Se reescriben enteros. */
const cfgFile = join(DESTINO, "data/configuracion.json");
if (existsSync(cfgFile)) {
  const cfg = JSON.parse(readFileSync(cfgFile, "utf8"));
  if (Array.isArray(cfg.asesoresVentas)) {
    cfg.asesoresVentas = cfg.asesoresVentas.map((a, i) => ({
      ...a,
      id: "asesor-" + (i + 1),
      nombre: "Asesor " + (i + 1),
      // Números distintos entre sí y evidentemente falsos.
      telefono: "5190000000" + (i + 1),
      foto: "assets/equipo/asesor-" + (i + 1) + ".svg",
      activo: true,
    }));
  }
  writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/* Categorías: las de este catálogo son de motocicleta. */
const catFile = join(DESTINO, "data/catalogo.json");
if (existsSync(catFile)) {
  writeFileSync(catFile, JSON.stringify({
    _nota: "Categorías del catálogo: las pestañas que verá el cliente. Los SLUG (ciudad, trabajo, deportiva, aventura, carga) son una taxonomía cerrada que valida el esquema; para cambiarlos hay que tocar tres sitios a la vez: CATEGORIAS en assets/js/catalogo/catalogo-schema.js, CATEGORIAS en scripts/reglas-catalogo.mjs y los enlaces ?categoria= de index.html. Los TÍTULOS se cambian aquí y ya.",
    categorias: [
      { id: "ciudad", slug: "ciudad", titulo: "Categoría A", descripcion: "Describe aquí para quién es.", orden: 1 },
      { id: "trabajo", slug: "trabajo", titulo: "Categoría B", descripcion: "Describe aquí para quién es.", orden: 2 },
      { id: "deportiva", slug: "deportiva", titulo: "Categoría C", descripcion: "Describe aquí para quién es.", orden: 3 },
      { id: "aventura", slug: "aventura", titulo: "Categoría D", descripcion: "Describe aquí para quién es.", orden: 4 },
    ],
  }, null, 2) + "\n", "utf8");
}

/* Catálogo de respaldo: tres productos inventados, con TODOS los campos
   que el contrato exige. Sirven de ejemplo rellenable y de prueba de que
   la página monta antes de conectar ninguna hoja de cálculo. */

function producto(n, slug, categoria) {
  return {
    id: "prod-" + slug,
    slug: slug,
    modelo: "PRODUCTO " + n,
    linea: "Línea ejemplo",
    categoria: categoria,
    subcategoria: "Subcategoría",
    titulo_web: "Producto " + n,
    descripcion_corta: "Una frase que diga para quién es este producto.",
    descripcion_larga: "Dos o tres frases con lo que de verdad importa. Cifras que se puedan comprobar, no adjetivos.",
    imagen_principal: "assets/catalogo/" + slug + "/portada.svg",
    imagen_mobile: "assets/catalogo/" + slug + "/portada.svg",
    galeria_1: "", galeria_2: "", colores: "",
    caracteristica_1: "Característica: Valor " + n,
    caracteristica_2: "Característica: valor",
    caracteristica_3: "Característica: valor",
    destacado: n === 1,
    nuevo: n === 3,
    cta_label: "Ver detalles",
    orden: n,
    alt_text: "Producto " + n + " de ejemplo, fotografía de catálogo sobre fondo claro",
    foco_imagen: "50% 50%",
    activo: true,
    estado_contenido: "APROBADO",
    mostrar_precio: false,
  };
}

writeFileSync(join(DESTINO, "data/catalogo-publico.local.json"), JSON.stringify({
  _nota: "Respaldo local del catálogo. La web lo usa cuando el endpoint remoto no responde, para no quedarse en blanco. Sustitúyelo por tus productos o regenéralo con scripts/sincronizar-respaldo.mjs.",
  ok: true,
  // La version MAYOR tiene que coincidir con VERSION en catalogo-schema.js
  // o extraerRegistros() devuelve null y el catalogo se queda vacio sin
  // decir por que. Es el contrato, no un numero decorativo.
  version: "2.0-demo",
  generatedAt: new Date().toISOString().slice(0, 10),
  categorias: [
    { id: "ciudad", slug: "ciudad", titulo: "Categoría A", orden: 1 },
    { id: "trabajo", slug: "trabajo", titulo: "Categoría B", orden: 2 },
    { id: "deportiva", slug: "deportiva", titulo: "Categoría C", orden: 3 },
    { id: "aventura", slug: "aventura", titulo: "Categoría D", orden: 4 },
  ],
  modelos: [
    producto(1, "producto-uno", "ciudad"),
    producto(2, "producto-dos", "trabajo"),
    producto(3, "producto-tres", "deportiva"),
    producto(4, "producto-cuatro", "aventura"),
  ],
}, null, 2) + "\n", "utf8");

/* Capa editorial de ejemplo, para los tres productos.

   Los textos no son relleno arbitrario: la suite comprueba que cada razón
   mida entre 20 y 60 palabras y que su `dato` aparezca de verdad en el
   catálogo. Un demo que no pasa sus propias pruebas le enseña a quien
   empieza justo lo contrario de lo que este proyecto defiende. */

function razones(n) {
  return [
    {
      id: "razon-a",
      kicker: "Tema",
      titulo: "Titular corto y concreto",
      texto: "Escribe aquí lo que se nota al usarlo, no lo que dice el folleto. Entre veinte y sesenta palabras: menos no cuenta nada y más nadie lo lee de pie en una tienda. Habla del martes cualquiera, no del día de catálogo.",
      asset: "detalle-a",
      dato: "Valor " + n,
      datoEtiqueta: "Etiqueta del dato",
      fuente: "caracteristica_1 · ficha del fabricante",
    },
    {
      id: "razon-b",
      kicker: "Tema",
      titulo: "Segundo motivo, distinto del primero",
      texto: "Si los tres motivos dicen lo mismo con otras palabras, el cliente lo nota y deja de creerse los tres. Que cada uno hable de algo que el anterior no tocaba: uno del uso diario, otro del mantenimiento, otro de lo que pasa cuando algo sale mal.",
      asset: "detalle-b",
      fuente: "visible en la fotografía",
    },
    {
      id: "razon-c",
      kicker: "Tema",
      titulo: "Tercer motivo, con una cifra detrás",
      texto: "Cuando pongas una cifra, que salga de la ficha del fabricante y esté también en el catálogo. La prueba lo comprueba. Un número inventado en la web es una promesa que alguien va a reclamar en el mostrador, y ahí ya no lo arregla nadie.",
      asset: "detalle-c",
      dato: "Valor " + n,
      datoEtiqueta: "Etiqueta del dato",
      fuente: "caracteristica_1 · ficha del fabricante",
    },
  ];
}

const editorialDemo = { modelos: {} };
[["producto-uno", 1], ["producto-dos", 2], ["producto-tres", 3], ["producto-cuatro", 4]].forEach(([slug, n]) => {
  editorialDemo.modelos[slug] = {
    historiaKicker: "Historia",
    historiaTitulo: "Para qué está hecho",
    historia: "Un párrafo que cuente el uso real del producto y no sus adjetivos. Quién lo compra, para qué, y qué problema le resuelve un martes cualquiera. Si al leerlo en voz alta suena a anuncio, está mal escrito: tiene que sonar a alguien que lo conoce explicándotelo.",
    historiaAsset: "lateral",
    razonesKicker: "Por qué elegirlo",
    razonesTitulo: "Tres motivos que se pueden comprobar",
    razones: razones(n),
  };
});

writeFileSync(join(DESTINO, "data/fichas-editorial.json"), JSON.stringify({
  _nota: "Textos largos de cada ficha: la historia y las razones de compra. Es lo que también alimenta el recorrido de explorar.html.",
  _reglaDeOro: "Cada razón apunta a una fotografía que existe y a un dato que está en el catálogo. Si no hay dato, se escribe «visible en la fotografía» y no se inventa una cifra.",
  modelos: editorialDemo.modelos,
}, null, 2) + "\n", "utf8");

/* Manifiesto de fotografías: una entrada por producto, con las cuatro
   piezas que citan las razones. Sin esto, la comprobación de que «todo
   modelo publicado tiene banco fotográfico» falla. */
writeFileSync(join(DESTINO, "assets/catalogo/photo-manifest.json"), JSON.stringify({
  _nota: "Disponibilidad del banco fotográfico. En el proyecto real lo genera scripts/recortar-catalogo.mjs; aquí va un ejemplo con marcadores.",
  generado: new Date().toISOString().slice(0, 10),
  modelos: ["producto-uno", "producto-dos", "producto-tres", "producto-cuatro"].map((slug, i) => ({
    modelo: slug,
    titulo: "Producto " + (i + 1),
    assets: Object.fromEntries(["lateral", "detalle-a", "detalle-b", "detalle-c"].map(k => [k, {
      status: "ready",
      web: "assets/catalogo/" + slug + "/details/" + k + ".svg",
      mini: "assets/catalogo/" + slug + "/details/" + k + ".svg",
    }])),
  })),
}, null, 2) + "\n", "utf8");

/* Los marcadores de las piezas, para los tres productos. */
for (const slug of ["producto-uno", "producto-dos", "producto-tres", "producto-cuatro"]) {
  for (const pieza of ["lateral", "detalle-a", "detalle-b", "detalle-c"]) {
    marcador("assets/catalogo/" + slug + "/details/" + pieza + ".svg", 1400, 1000, pieza.toUpperCase());
  }
}

console.log("datos demo escritos: 3 productos, 1 ficha editorial, configuracion vaciada");


/* ---------------- Marcadores para lo que falte ----------------

   Una lista escrita a mano de «archivos que hay que sustituir» se queda
   corta el día que alguien añade una imagen al HTML. Así que en vez de
   enumerar, se lee el resultado, se sacan las rutas locales que pide y se
   crea un marcador para cada una que no exista.

   Es la diferencia entre una plantilla que abre hoy y una que abre
   siempre. */

const REFERENCIA = /(?:src|href|poster|data-src|srcset|imagesrcset)\s*=\s*["']([^"':#][^"']*)["']|url\(\s*["']?([^"')]+)["']?\s*\)/g;

function rutasPedidas() {
  const pedidas = new Set();
  for (const f of listarArchivos(DESTINO)) {
    const ext = extname(f).toLowerCase();
    if (ext !== ".html" && ext !== ".css" && ext !== ".json") continue;
    const texto = readFileSync(f, "utf8");
    let m;
    REFERENCIA.lastIndex = 0;
    while ((m = REFERENCIA.exec(texto)) !== null) {
      // Un `srcset` trae varias rutas con su descriptor detrás:
      // «portada.webp 1x, portada@2x.webp 2x». Si no se parte por comas se
      // pierden justo las imágenes grandes de <picture>, que son las que
      // más se notan cuando faltan.
      const bruto = (m[1] || m[2] || "").trim();
      for (const trozo of bruto.split(",")) {
        const ruta = trozo.trim().split(/\s+/)[0];
        if (!ruta || /^(https?:|data:|mailto:|tel:|\/\/|#)/.test(ruta)) continue;
        if (!/\.(webp|png|jpg|jpeg|svg|mp4|webm|avif|gif)$/i.test(ruta)) continue;
        pedidas.add(ruta.replace(/^\.\//, "").split("?")[0]);
      }
    }
  }
  return [...pedidas];
}

/* Un MP4 de un segundo, gris y mudo. Se genera con ffmpeg si está; si no
   está, se avisa y se sigue: un vídeo que falta deja un hueco, no rompe
   la página. Nunca se falla por esto. */
let ffmpegOk = null;
function videoMarcador(destino) {
  if (ffmpegOk === false) return false;
  try {
    execFileSync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=0xe9edf3:s=1280x720:d=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", "1", "-an",
      "-loglevel", "error", destino,
    ], { stdio: "ignore" });
    ffmpegOk = true;
    return true;
  } catch {
    ffmpegOk = false;
    return false;
  }
}

let creados = 0, sinVideo = 0;
const renombrados = [];
for (const rel of rutasPedidas()) {
  const destino = join(DESTINO, rel);
  if (existsSync(destino)) continue;
  asegurar(dirname(destino));

  const etiqueta = basename(rel).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]/g, " ").toUpperCase();

  if (/\.(mp4|webm)$/i.test(rel)) {
    if (videoMarcador(destino)) creados++;
    else sinVideo++;
    continue;
  }

  /* Los marcadores son SVG, y se escriben CON extensión .svg, no con la
     que pedía el HTML.

     La tentación es dejar el nombre original —`portada.webp` con un SVG
     dentro— para no tocar el HTML. No funciona: el navegador se cree la
     cabecera `Content-Type` que manda el servidor, y un servidor mira la
     extensión. El resultado es una imagen que descarga bien, no da 404 y
     aun así no se pinta: `naturalWidth` a cero. Un fallo silencioso, que
     es el peor de todos.

     Así que se renombra el archivo y se corrige la referencia en todos
     los sitios donde aparecía. */
  const ancho = /card|mini|icono|asesor|equipo/i.test(rel) ? 760 : 1600;
  const alto = /card|mini|icono|asesor|equipo/i.test(rel) ? 475 : 1000;
  const relSvg = rel.replace(/\.[a-z0-9]+$/i, ".svg");
  asegurar(dirname(join(DESTINO, relSvg)));
  writeFileSync(join(DESTINO, relSvg), svgMarcador(ancho, alto, etiqueta), "utf8");
  if (relSvg !== rel) renombrados.push([rel, relSvg]);
  creados++;
}

/* La reescritura va en una pasada aparte y no archivo a archivo: una
   misma imagen se cita desde el HTML, desde el CSS y desde un JSON, y
   corregir solo donde se detectó dejaría las otras dos rotas. */
if (renombrados.length) {
  for (const f of listarArchivos(DESTINO)) {
    const ext = extname(f).toLowerCase();
    if (!TEXTUALES.has(ext)) continue;
    let texto = readFileSync(f, "utf8");
    let tocado = false;
    for (const [viejo, nuevo] of renombrados) {
      if (texto.includes(viejo)) { texto = texto.split(viejo).join(nuevo); tocado = true; }
    }
    if (tocado) writeFileSync(f, texto, "utf8");
  }
}

console.log("marcadores para rutas que faltaban: " + creados +
  (sinVideo ? " (" + sinVideo + " video(s) sin crear: no hay ffmpeg)" : ""));

/* ---------------- SEO: que la plantilla no se queje de sí misma ----------------

   El sitio comprueba al arrancar que `data/slots/seo.json` y las etiquetas
   reales de index.html digan lo mismo, y avisa por consola si no. Es una
   buena guardia, pero tras el saneado las dos mitades quedan escritas de
   forma distinta y la plantilla saludaría con dos advertencias antes de
   que nadie haya tocado nada. Se copian los valores reales del HTML. */

const seoFile = join(DESTINO, "data/slots/seo.json");
const indexFile = join(DESTINO, "index.html");
if (existsSync(seoFile) && existsSync(indexFile)) {
  const html = readFileSync(indexFile, "utf8");
  const titulo = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1];
  const seo = JSON.parse(readFileSync(seoFile, "utf8"));
  const aplicar = (obj) => {
    for (const k of Object.keys(obj)) {
      if (obj[k] && typeof obj[k] === "object") aplicar(obj[k]);
      else if (k === "title" && titulo) obj[k] = titulo;
      else if (k === "description" && desc) obj[k] = desc;
    }
  };
  aplicar(seo);
  writeFileSync(seoFile, JSON.stringify(seo, null, 2) + "\n", "utf8");
  console.log("seo.json sincronizado con las etiquetas reales de index.html");
}

/* ---------------- Comprobación final ----------------

   Lo importante del script. Una plantilla que se dice limpia y conserva
   un teléfono es peor que no tener plantilla: se publicaría creyendo que
   está revisada. */

/* El rastreo tiene que distinguir un rastro real de un parecido:

   · `impulsar` lleva «pulsar» dentro y es una palabra normal, asi que los
     modelos se buscan con un limite por la izquierda que excluya letras.
   · `51900000000` es el marcador que pone este mismo script; buscarlo
     como telefono real haria fallar siempre la comprobacion. */
const PROHIBIDO = [
  [/ARENAS/i, "el nombre del negocio"],
  [/bajaj/i, "la marca de las motos"],
  [/(?<![a-záéíóúñ])(pulsar|dominar|boxer|discover|mototaxi|torito|fibraser|fibratec)/i,
   "modelos del catalogo real"],
  [/cusco/i, "la ciudad"],
  // `5190000000X` son los marcadores que pone este mismo script: uno por
  // asesor, distintos entre sí para que el reparto por turnos se pueda
  // probar. No son teléfonos de nadie.
  [/51 ?9(?!0000000\d\b)[0-9]{8}/, "un telefono real"],
  [/AKfycb[A-Za-z0-9_-]+/, "el identificador del endpoint"],
  [/N[ée]stor|\bTaty\b|\bIris\b|\bDaniel\b|Ra[úu]l/, "nombres de los asesores"],
];

function listarArchivos(dir, acc) {
  acc = acc || [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listarArchivos(p, acc);
    else acc.push(p);
  }
  return acc;
}

const restos = [];
for (const f of listarArchivos(DESTINO)) {
  const ext = extname(f).toLowerCase();
  if (!TEXTUALES.has(ext) && ext !== ".svg") continue;
  const texto = readFileSync(f, "utf8");
  for (const [re, que] of PROHIBIDO) {
    const m = texto.match(re);
    if (m) restos.push({ archivo: f.slice(DESTINO.length + 1), que, ejemplo: m[0] });
  }
}

if (restos.length) {
  console.log("\nRASTROS DEL NEGOCIO QUE SIGUEN EN LA PLANTILLA:");
  const porArchivo = {};
  for (const r of restos) (porArchivo[r.archivo] = porArchivo[r.archivo] || []).push(r.que + " (" + r.ejemplo + ")");
  const nombres = Object.keys(porArchivo);
  for (const a of nombres.slice(0, 30)) console.log("  " + a + "  ->  " + porArchivo[a].join(", "));
  if (nombres.length > 30) console.log("  ... y " + (nombres.length - 30) + " archivos mas");
  console.log("\n" + restos.length + " coincidencias en " + nombres.length + " archivos. La plantilla NO esta limpia.");
  process.exit(1);
}

/* La guía de la plantilla, escrita para quien la recibe y no para quien la
   generó. Vive en docs/ del proyecto de origen para poder editarla como
   cualquier otro documento, y aquí se copia como README. */
const guia = join(ORIGEN, "docs/plantilla-LEEME.md");
if (existsSync(guia)) {
  writeFileSync(join(DESTINO, "README.md"), sanear(readFileSync(guia, "utf8")), "utf8");
  console.log("guia copiada como README.md");
}

console.log("\nsin rastros del negocio: la plantilla esta limpia");
console.log("destino: " + DESTINO);
