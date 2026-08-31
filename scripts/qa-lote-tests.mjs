#!/usr/bin/env node
/* ================================================================
   ARENAS MOTOCICLETAS — scripts/qa-lote-tests.mjs
   Prueba que el validador de lote DETECTA de verdad.

       node scripts/qa-lote-tests.mjs

   POR QUÉ EXISTE
   Que `qa-lote-catalogo.mjs` diga APTO sobre un lote correcto no
   demuestra nada: un validador que siempre dice APTO también lo diría.
   Lo único que demuestra que sirve es verlo BLOQUEAR ante lotes que
   deben bloquearse — y no alarmarse ante ausencias legítimas, que es
   el error contrario y el más caro aquí.

   CADA PRUEBA DEMUESTRA SU REGLA, NO OTRA
   Una auditoría independiente encontró que varias comprobaciones
   pasaban por un bloqueo SECUNDARIO: la fila tenía dos problemas y el
   validador cazaba el otro. Eso da confianza falsa sobre la regla que
   se creía probada.
   Por eso `bloquea()` exige, por defecto, que el bloqueante esperado
   sea el ÚNICO de la fila. Cuando de verdad hay que probar una
   combinación, se pide con `{ unico: false }` y se dice por qué.

   CÓMO
   Escribe lotes temporales, ejecuta el validador REAL como subproceso
   y lee su salida JSON. No reimplementa ninguna regla.
   Los archivos temporales se borran al terminar, pase lo que pase.

   exit 0 → el validador detecta todo lo que debe
   exit 1 → algo se le escaparía
   ================================================================ */

import { writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VALIDADOR = join(RAIZ, "scripts", "qa-lote-catalogo.mjs");
const BANCO = join(tmpdir(), "arenas-lote-" + process.pid);
mkdirSync(BANCO, { recursive: true });

/** Una fotografía real del repositorio: existe, pero es 1280×720. */
const FOTO_PEQUENA = "assets/hero/experiencia-rs200.webp";

/**
 * Identidades vacías, para que la reconciliación no interfiera en las
 * pruebas que no van de eso. Las que sí van de reconciliación usan un
 * archivo propio.
 */
const SIN_IDENTIDADES = join(BANCO, "identidades-vacias.json");
const CON_IDENTIDADES = join(BANCO, "identidades.json");

let ok = 0;
const fallos = [];

const CAB = "accion,modelo,linea,categoria,ficha_oficial,cilindrada_cc,potencia_hp,torque_nm," +
  "refrigeracion,sistema_combustible,transmision,numero_marchas,freno_delantero," +
  "freno_trasero,abs,capacidad_tanque_l,peso_kg,colores,precio_publico,mostrar_precio," +
  "destacado,nuevo,imagen_principal_origen,imagen_mobile_origen,galeria_1_origen," +
  "galeria_2_origen,observaciones";

function fila(campos, cabecera) {
  return (cabecera || CAB).split(",").map((c) => {
    const v = campos[c] === undefined ? "" : String(campos[c]);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(",");
}

let contador = 0;
function escribir(filas, cabecera, extension) {
  const ruta = join(BANCO, "lote-" + (++contador) + "." + (extension || "csv"));
  writeFileSync(ruta, [cabecera || CAB].concat(filas).join("\n") + "\n", "utf8");
  return ruta;
}
function escribirCrudo(contenido, extension) {
  const ruta = join(BANCO, "lote-" + (++contador) + "." + (extension || "csv"));
  writeFileSync(ruta, contenido, "utf8");
  return ruta;
}

function validar(ruta, identidades) {
  const r = spawnSync(process.execPath,
    [VALIDADOR, ruta, "--json", "--assets", RAIZ, "--identidades", identidades || SIN_IDENTIDADES],
    { encoding: "utf8", timeout: 60000 });
  let datos = null;
  try { datos = JSON.parse(r.stdout); } catch (e) { /* se informa */ }
  return { code: r.status, datos, stdout: r.stdout, stderr: r.stderr };
}

/**
 * Debe BLOQUEAR, y por la regla nombrada.
 * @param {Object} [op] { campo, unico, identidades, motivoNoUnico }
 */
function bloquea(titulo, ruta, patron, op) {
  const o = op || {};
  const r = validar(ruta, o.identidades);
  if (!r.datos) { fallos.push(titulo + " → sin JSON: " + (r.stdout || r.stderr).slice(0, 140)); return; }
  if (r.datos.resultado !== "BLOQUEADO") {
    fallos.push(titulo + " → dio APTO, se esperaba BLOQUEADO");
    return;
  }
  const bs = r.datos.bloqueantes;
  const coincide = bs.filter((b) =>
    new RegExp(patron, "i").test(b.mensaje + " " + b.detalle) &&
    (!o.campo || b.campo === o.campo));

  if (!coincide.length) {
    fallos.push(titulo + " → bloquea, pero NO por la regla esperada. Bloqueantes: " +
      bs.map((b) => b.campo + ": " + b.mensaje).join(" | ").slice(0, 170));
    return;
  }
  // Por defecto se exige que sea el ÚNICO: si hay más, la prueba podría
  // estar pasando por otro motivo aunque la regla esperada falle mañana.
  if (o.unico !== false && bs.length !== 1) {
    fallos.push(titulo + " → la regla esperada aparece, pero hay " + bs.length +
      " bloqueantes; la prueba no la aísla: " +
      bs.map((b) => b.campo + ": " + b.mensaje).join(" | ").slice(0, 170));
    return;
  }
  ok++;
  console.log("  ok    bloquea: " + titulo + (o.unico === false ? "  (combinación: " + o.motivoNoUnico + ")" : ""));
}

/** Debe pasar. Cualquier bloqueante es un falso positivo. */
function acepta(titulo, ruta, identidades) {
  const r = validar(ruta, identidades);
  if (!r.datos) { fallos.push(titulo + " → sin JSON: " + (r.stdout || r.stderr).slice(0, 140)); return; }
  if (r.datos.resultado !== "APTO" || r.code !== 0) {
    fallos.push(titulo + " → BLOQUEA sin motivo: " +
      r.datos.bloqueantes.map((b) => b.campo + ": " + b.mensaje).join(" | ").slice(0, 170));
    return;
  }
  ok++; console.log("  ok    acepta: " + titulo);
}

/** Debe terminar con un código de uso inválido. */
function usoInvalido(titulo, ruta) {
  const r = validar(ruta);
  if (r.code === 2) { ok++; console.log("  ok    exit=2: " + titulo); }
  else fallos.push(titulo + " → exit=" + r.code + ", se esperaba 2");
}

/* ================================================================ */

try {
  writeFileSync(SIN_IDENTIDADES, JSON.stringify({ ok: true, version: "2", modelos: [] }), "utf8");
  writeFileSync(CON_IDENTIDADES, JSON.stringify({
    ok: true, version: "2",
    modelos: [
      { id: "MW-01", slug: "dominar-250", modelo: "Dominar 250" },
      { id: "MW-02", slug: "boxer-ct-125", modelo: "Boxer CT 125" },
    ],
  }), "utf8");

  console.log("ARENAS — PRUEBAS DEL VALIDADOR DE LOTE");

  /* ---------------------------------------------------------------- */
  console.log("\nAUSENCIAS LEGÍTIMAS — no deben bloquear");
  acepta("ficha mínima: nombre y categoría",
    escribir([fila({ modelo: "Modelo A", categoria: "ciudad" })]));
  acepta("sin especificaciones y sin ficha oficial",
    escribir([fila({ modelo: "Modelo B", categoria: "trabajo" })]));
  acepta("abs vacío — no verificado, no «sin ABS»",
    escribir([fila({ modelo: "Modelo C", categoria: "ciudad" })]));
  acepta("precio vacío — oculto, no cero",
    escribir([fila({ modelo: "Modelo D", categoria: "ciudad" })]));
  acepta("colores vacío — no registrado",
    escribir([fila({ modelo: "Modelo E", categoria: "carga" })]));
  acepta("abs explícito en «no» SÍ es un dato, con su fuente",
    escribir([fila({ modelo: "Modelo F", categoria: "ciudad", ficha_oficial: "f.pdf", abs: "no" })]));
  acepta("las cinco categorías aprobadas",
    escribir(["ciudad", "trabajo", "deportiva", "aventura", "carga"]
      .map((c, i) => fila({ modelo: "Modelo " + i, categoria: c }))));
  acepta("precio con dos decimales y mostrar_precio activo",
    escribir([fila({ modelo: "Modelo G", categoria: "ciudad", precio_publico: "12990.50", mostrar_precio: "si" })]));
  acepta("precio con separador de millar inequívoco",
    escribir([fila({ modelo: "Modelo H", categoria: "ciudad", precio_publico: "S/ 12,990.00", mostrar_precio: "si" })]));
  acepta("estado_contenido BORRADOR es admisible",
    escribir([fila({ modelo: "Modelo I", categoria: "ciudad", estado_contenido: "BORRADOR" }, CAB + ",estado_contenido")],
      CAB + ",estado_contenido"));
  acepta("activo explícito en «no» es admisible",
    escribir([fila({ modelo: "Modelo J", categoria: "ciudad", activo: "no" }, CAB + ",activo")], CAB + ",activo"));
  acepta("decimales dentro de lo admitido por cada campo",
    escribir([fila({ modelo: "Modelo K", categoria: "ciudad", ficha_oficial: "f.pdf",
      cilindrada_cc: "124.4", potencia_hp: "10.75", peso_kg: "117.5", numero_marchas: "4" })]));

  /* ---------------------------------------------------------------- */
  console.log("\n1-4 · ENTRADA JSON");
  {
    const r = escribirCrudo(JSON.stringify([
      { modelo: "A", categoria: "ciudad" },
      { modelo: "B", categoria: "ciudad", stock_real: 9 },
    ]), "json");
    bloquea("campo prohibido en la SEGUNDA fila (unión de claves)", r, "prohibid", { campo: "stock_real" });
  }
  {
    const r = escribirCrudo(JSON.stringify([
      { modelo: "A", categoria: "ciudad" },
      { modelo: "B", categoria: "ciudad", numero_chasis: "X" },
      { modelo: "C", categoria: "ciudad" },
    ]), "json");
    bloquea("campo prohibido en la TERCERA fila", r, "prohibid", { campo: "numero_chasis" });
  }
  {
    const r = escribirCrudo(JSON.stringify([{ modelo: "A", categoria: "ciudad" }, "texto suelto"]), "json");
    bloquea("una fila que es una cadena, no un objeto", r, "no es un objeto",
      { unico: false, motivoNoUnico: "la fila inválida arrastra sus propios fallos" });
  }
  {
    const r = escribirCrudo(JSON.stringify([{ modelo: "A", categoria: "ciudad" }, null]), "json");
    bloquea("una fila null", r, "no es un objeto",
      { unico: false, motivoNoUnico: "null arrastra obligatorias vacías" });
  }
  {
    const r = escribirCrudo(JSON.stringify([{ modelo: "A", categoria: "ciudad" }, ["a", "b"]]), "json");
    bloquea("una fila que es un array", r, "no es un objeto",
      { unico: false, motivoNoUnico: "el array arrastra obligatorias vacías" });
  }
  usoInvalido("un JSON vacío no puede dar APTO", escribirCrudo("[]", "json"));
  usoInvalido("un JSON con modelos vacío tampoco", escribirCrudo('{"modelos":[]}', "json"));
  usoInvalido("un JSON no interpretable", escribirCrudo("{no es json", "json"));
  usoInvalido("un archivo que no existe", join(BANCO, "no-existe.csv"));

  /* ---------------------------------------------------------------- */
  console.log("\n5-6 · TODA ESPECIFICACIÓN EXIGE FUENTE");
  ["cilindrada_cc", "potencia_hp", "torque_nm", "numero_marchas", "capacidad_tanque_l", "peso_kg"]
    .forEach((c) => {
      const valores = { cilindrada_cc: "125", potencia_hp: "10", torque_nm: "10",
        numero_marchas: "5", capacidad_tanque_l: "12", peso_kg: "120" };
      bloquea("`" + c + "` sin ficha_oficial",
        escribir([fila({ modelo: "X", categoria: "ciudad", [c]: valores[c] })]),
        "sin indicar de dónde salen", { campo: "ficha_oficial" });
    });
  ["refrigeracion", "sistema_combustible", "transmision", "freno_delantero", "freno_trasero"]
    .forEach((c) => {
      const valores = { refrigeracion: "aire", sistema_combustible: "carburador",
        transmision: "manual", freno_delantero: "disco", freno_trasero: "tambor" };
      bloquea("`" + c + "` sin ficha_oficial",
        escribir([fila({ modelo: "X", categoria: "ciudad", [c]: valores[c] })]),
        "sin indicar de dónde salen", { campo: "ficha_oficial" });
    });
  bloquea("`abs` sin ficha_oficial",
    escribir([fila({ modelo: "X", categoria: "ciudad", abs: "no" })]),
    "sin indicar de dónde salen", { campo: "ficha_oficial" });

  /* ---------------------------------------------------------------- */
  console.log("\n7 · LA FICHA NO APRUEBA");
  bloquea("estado_contenido = APROBADO, con fotografía y todo",
    escribir([fila({ modelo: "X", categoria: "ciudad", estado_contenido: "APROBADO",
      imagen_principal_origen: FOTO_PEQUENA }, CAB + ",estado_contenido")], CAB + ",estado_contenido"),
    "no puede aprobar", { campo: "estado_contenido", unico: false,
      motivoNoUnico: "la foto de prueba es 1280×720 y además bloquea por resolución" });
  bloquea("estado_contenido = APROBADO sin nada más",
    escribir([fila({ modelo: "X", categoria: "ciudad", estado_contenido: "APROBADO" }, CAB + ",estado_contenido")],
      CAB + ",estado_contenido"),
    "no puede aprobar", { campo: "estado_contenido" });
  bloquea("estado_contenido = EN_REVISION tampoco",
    escribir([fila({ modelo: "X", categoria: "ciudad", estado_contenido: "EN_REVISION" }, CAB + ",estado_contenido")],
      CAB + ",estado_contenido"),
    "no admitido", { campo: "estado_contenido" });
  bloquea("estado_contenido desconocido",
    escribir([fila({ modelo: "X", categoria: "ciudad", estado_contenido: "LISTO PARA WEB" }, CAB + ",estado_contenido")],
      CAB + ",estado_contenido"),
    "no admitido", { campo: "estado_contenido" });

  console.log("\n8 · LA FICHA NO ACTIVA");
  bloquea("activo = sí",
    escribir([fila({ modelo: "X", categoria: "ciudad", activo: "si" }, CAB + ",activo")], CAB + ",activo"),
    "no activa modelos", { campo: "activo" });
  bloquea("activo = TRUE",
    escribir([fila({ modelo: "X", categoria: "ciudad", activo: "TRUE" }, CAB + ",activo")], CAB + ",activo"),
    "no activa modelos", { campo: "activo" });
  bloquea("activo con un valor desconocido (quizas)",
    escribir([fila({ modelo: "X", categoria: "ciudad", activo: "quizas" }, CAB + ",activo")], CAB + ",activo"),
    "no reconocido", { campo: "activo" });

  /* ---------------------------------------------------------------- */
  console.log("\n9-10 · NÚMEROS");
  bloquea("precio con tres decimales",
    escribir([fila({ modelo: "X", categoria: "ciudad", precio_publico: "12990.505" })]),
    "más de dos decimales", { campo: "precio_publico" });
  bloquea("precio ambiguo con coma decimal",
    escribir([fila({ modelo: "X", categoria: "ciudad", precio_publico: "12990,50" })]),
    "ambiguo", { campo: "precio_publico" });
  bloquea("precio en formato europeo",
    escribir([fila({ modelo: "X", categoria: "ciudad", precio_publico: "12.990,50" })]),
    "ambiguo", { campo: "precio_publico" });
  bloquea("precio cero",
    escribir([fila({ modelo: "X", categoria: "ciudad", precio_publico: "0" })]),
    "cero o negativo", { campo: "precio_publico" });
  bloquea("precio con texto",
    escribir([fila({ modelo: "X", categoria: "ciudad", precio_publico: "consultar" })]),
    "ambiguo|no interpretable", { campo: "precio_publico" });
  bloquea("se pide mostrar precio sin haberlo",
    escribir([fila({ modelo: "X", categoria: "ciudad", mostrar_precio: "si" })]),
    "no hay precio", { campo: "mostrar_precio" });
  bloquea("numero_marchas con decimales",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", numero_marchas: "5.5" })]),
    "entero", { campo: "numero_marchas" });
  bloquea("cilindrada con demasiados decimales",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", cilindrada_cc: "124.44" })]),
    "decimales", { campo: "cilindrada_cc" });
  bloquea("cilindrada fuera de rango",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", cilindrada_cc: "12500" })]),
    "rango", { campo: "cilindrada_cc" });
  bloquea("peso fuera de rango",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", peso_kg: "900" })]),
    "rango", { campo: "peso_kg" });
  bloquea("cilindrada no numérica",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", cilindrada_cc: "125cc aprox" })]),
    "no numérico|ambiguo", { campo: "cilindrada_cc" });

  /* ---------------------------------------------------------------- */
  console.log("\n11 · ESTRUCTURA DEL CSV");
  bloquea("comilla sin cerrar",
    escribirCrudo(CAB + "\n," + '"sin cerrar' + ",,ciudad\n"),
    "comilla sin cerrar", { campo: "(archivo)" });
  bloquea("más celdas que encabezados",
    escribirCrudo(CAB + "\n" + fila({ modelo: "X", categoria: "ciudad" }) + ",SOBRA\n"),
    "tantas celdas", { campo: "(fila)" });
  bloquea("menos celdas que encabezados",
    escribirCrudo(CAB + "\n,X,,ciudad\n"),
    "tantas celdas", { campo: "(fila)" });
  acepta("comas y comillas dentro de una celda",
    escribir([fila({ modelo: "Con, coma", categoria: "ciudad", colores: "Rojo, Negro" })]));
  acepta("un BOM al principio del archivo",
    escribirCrudo("﻿" + CAB + "\n" + fila({ modelo: "Con BOM", categoria: "ciudad" }) + "\n"));

  /* ---------------------------------------------------------------- */
  console.log("\n12 · FOTOGRAFÍAS");
  bloquea("fotografía que no existe",
    escribir([fila({ modelo: "X", categoria: "ciudad", imagen_principal_origen: "fotos/no-existe.webp" })]),
    "no existe", { campo: "imagen_principal_origen" });
  bloquea("archivo con extensión que no es de imagen",
    escribir([fila({ modelo: "X", categoria: "ciudad", imagen_principal_origen: "assets/catalogo/LEEME.md" })]),
    "formato", { campo: "imagen_principal_origen" });
  {
    // Extensión de imagen, contenido que no lo es: aparenta ser una foto.
    const falsa = join(BANCO, "falsa.webp");
    writeFileSync(falsa, "esto no es una imagen, solo texto plano", "utf8");
    bloquea("extensión de imagen con cabecera ilegible",
      escribir([fila({ modelo: "X", categoria: "ciudad", imagen_principal_origen: falsa })]),
      "cabecera no se puede leer", { campo: "imagen_principal_origen" });
  }
  bloquea("resolución insuficiente para convertir",
    escribir([fila({ modelo: "X", categoria: "ciudad", imagen_principal_origen: FOTO_PEQUENA })]),
    "resoluci", { campo: "imagen_principal_origen" });
  bloquea("alt_text provisional",
    escribir([fila({ modelo: "X", categoria: "ciudad", alt_text: "PENDIENTE" }, CAB + ",alt_text")], CAB + ",alt_text"),
    "provisional", { campo: "alt_text" });

  /* ---------------------------------------------------------------- */
  console.log("\n13 · RECONCILIACIÓN CON EL CATÁLOGO EXISTENTE");
  bloquea("el modelo existe y no se declara la acción",
    escribir([fila({ modelo: "Dominar 250", categoria: "aventura" })]),
    "no está declarada", { campo: "accion", identidades: CON_IDENTIDADES });
  bloquea("se declara `nuevo` pero ya existe",
    escribir([fila({ accion: "nuevo", modelo: "Dominar 250", categoria: "aventura" })]),
    "ya existe", { campo: "accion", identidades: CON_IDENTIDADES });
  bloquea("se declara `actualizar` pero no existe",
    escribir([fila({ accion: "actualizar", modelo: "Moto Inexistente", categoria: "ciudad" })]),
    "no existe", { campo: "accion", identidades: CON_IDENTIDADES });
  bloquea("una actualización que cambia el slug",
    escribir([fila({ accion: "actualizar", modelo: "Dominar 250", categoria: "aventura",
      slug: "dominar-250-v2" }, CAB + ",slug")], CAB + ",slug"),
    "no puede cambiar el slug", { campo: "slug", identidades: CON_IDENTIDADES });
  bloquea("acción desconocida",
    escribir([fila({ accion: "reemplazar", modelo: "Otra", categoria: "ciudad" })]),
    "acción desconocida", { campo: "accion", identidades: CON_IDENTIDADES });
  acepta("una actualización legítima conserva id y slug",
    escribir([fila({ accion: "actualizar", modelo: "Dominar 250", categoria: "aventura" })]),
    CON_IDENTIDADES);
  acepta("un alta que no colisiona",
    escribir([fila({ accion: "nuevo", modelo: "Modelo Que No Existe", categoria: "ciudad" })]),
    CON_IDENTIDADES);

  /* ---------------------------------------------------------------- */
  console.log("\n13 bis · RETIRAR — desactiva, nunca borra");

  acepta("una retirada legítima de un modelo que existe",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura" })]),
    CON_IDENTIDADES);

  bloquea("retirar un modelo que no existe",
    escribir([fila({ accion: "retirar", modelo: "Moto Inexistente", categoria: "ciudad" })]),
    "no se puede retirar algo que no está", { campo: "accion", identidades: CON_IDENTIDADES });

  bloquea("retirar con un slug que no corresponde",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura",
      slug: "dominar-250-otro" }, CAB + ",slug")], CAB + ",slug"),
    "no corresponde al modelo", { campo: "slug", identidades: CON_IDENTIDADES });

  // Retirar y cargar contenido a la vez es una contradicción: o sale del
  // catálogo, o se está preparando material para él.
  bloquea("retirar y a la vez poner precio",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura",
      precio_publico: "12990.00" })]),
    "se pide retirar y a la vez se carga contenido", { campo: "accion", identidades: CON_IDENTIDADES });

  bloquea("retirar y a la vez cargar una fotografía",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura",
      imagen_principal_origen: FOTO_PEQUENA })]),
    "se pide retirar y a la vez se carga contenido", { campo: "accion",
      unico: false, identidades: CON_IDENTIDADES,
      motivoNoUnico: "la foto de prueba es 1280×720 y además bloquea por resolución" });

  bloquea("retirar y a la vez registrar colores",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura",
      colores: "Rojo, Negro" })]),
    "se pide retirar y a la vez se carga contenido", { campo: "accion", identidades: CON_IDENTIDADES });

  // El único destino admisible de una retirada.
  bloquea("retirar dejando el modelo activo",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura",
      activo: "si" }, CAB + ",activo")], CAB + ",activo"),
    "no puede dejar el modelo activo|no activa modelos", { unico: false,
      identidades: CON_IDENTIDADES,
      motivoNoUnico: "activo=si dispara además la regla general de que la ficha no activa" });

  // Ninguna columna puede pedir un borrado: perderíamos id, slug y textos.
  bloquea("una columna que pide borrar la fila",
    escribir([fila({ accion: "retirar", modelo: "Dominar 250", categoria: "aventura" },
      CAB + ",borrar_fila")], CAB + ",borrar_fila"),
    "no elimina filas", { campo: "borrar_fila", identidades: CON_IDENTIDADES });

  {
    const r = validar(escribir([fila({ accion: "retirar", modelo: "Dominar 250",
      categoria: "aventura" })]), CON_IDENTIDADES);
    const dice = r.datos && r.datos.notas.some((t) =>
      /RETIRAR.*activo = FALSE/.test(t) && /NO borrar la fila/.test(t));
    if (dice) { ok++; console.log("  ok    la retirada se registra como desactivar, con aviso de no borrar"); }
    else fallos.push("la nota de retirada no dice desactivar/no borrar: " +
      JSON.stringify(r.datos && r.datos.notas).slice(0, 170));
  }

  {
    // Las tres acciones conviven en un mismo lote, que es el caso real.
    const r = validar(escribir([
      fila({ accion: "actualizar", modelo: "Dominar 250", categoria: "aventura" }),
      fila({ accion: "retirar", modelo: "Boxer CT 125", categoria: "trabajo" }),
      fila({ accion: "nuevo", modelo: "Modelo Nuevo De Agosto", categoria: "ciudad" }),
    ]), CON_IDENTIDADES);
    if (r.datos && r.datos.resultado === "APTO" && r.datos.porFila.length === 3) {
      ok++; console.log("  ok    un lote con actualizar + retirar + nuevo pasa entero");
    } else {
      fallos.push("lote mixto → " + (r.datos ? r.datos.resultado + " " +
        JSON.stringify(r.datos.bloqueantes).slice(0, 150) : "sin JSON"));
    }
  }

  {
    // Una observación que habla de borrar avisa, pero no bloquea: es una
    // nota humana, no una instrucción para la herramienta.
    const r = validar(escribir([fila({ accion: "retirar", modelo: "Dominar 250",
      categoria: "aventura", observaciones: "ya no se vende, borrar de la hoja" })]),
      CON_IDENTIDADES);
    const avisa = r.datos && r.datos.avisos.some((a) => /borrar la fila/i.test(a.mensaje));
    if (r.datos && r.datos.resultado === "APTO" && avisa) {
      ok++; console.log("  ok    una observación que dice «borrar» avisa sin bloquear");
    } else {
      fallos.push("observación con «borrar» → " + (r.datos ? r.datos.resultado +
        " avisos=" + JSON.stringify(r.datos.avisos).slice(0, 120) : "sin JSON"));
    }
  }
  {
    const r = validar(escribir([fila({ accion: "actualizar", modelo: "Dominar 250", categoria: "aventura" })]),
      CON_IDENTIDADES);
    const dice = r.datos && r.datos.notas.some((t) => /ACTUALIZACIÓN de «Dominar 250».*conserva id y slug/.test(t));
    if (dice) { ok++; console.log("  ok    la actualización se registra como tal, no como alta"); }
    else fallos.push("la nota de actualización no aparece: " + JSON.stringify(r.datos && r.datos.notas).slice(0, 150));
  }

  /* ---------------------------------------------------------------- */
  console.log("\nIDENTIDAD DENTRO DEL LOTE");
  bloquea("modelo duplicado",
    escribir([fila({ modelo: "Repetida", categoria: "ciudad" }), fila({ modelo: "Repetida", categoria: "ciudad" })]),
    "modelo duplicado", { campo: "modelo", unico: false,
      motivoNoUnico: "un nombre repetido produce también el slug repetido y el id repetido" });
  bloquea("duplicado con distinta caja y tildes",
    escribir([fila({ modelo: "Pulsár 180", categoria: "ciudad" }), fila({ modelo: "PULSAR 180", categoria: "ciudad" })]),
    "duplicad", { unico: false, motivoNoUnico: "ídem" });
  bloquea("sin nombre de modelo",
    escribir([fila({ categoria: "ciudad" })]), "obligatorio", { campo: "modelo" });
  bloquea("sin categoría",
    escribir([fila({ modelo: "Sin categoría" })]), "obligatorio", { campo: "categoria" });
  bloquea("nombre provisional",
    escribir([fila({ modelo: "PENDIENTE", categoria: "ciudad" })]),
    "marcador de pendiente", { campo: "modelo" });
  bloquea("categoría inventada",
    escribir([fila({ modelo: "X", categoria: "scooter" })]), "taxonom", { campo: "categoria" });
  bloquea("refrigeración fuera de lista",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", refrigeracion: "turbina" })]),
    "lista cerrada", { campo: "refrigeracion" });
  bloquea("abs con valor no reconocido",
    escribir([fila({ modelo: "X", categoria: "ciudad", ficha_oficial: "f.pdf", abs: "quizá" })]),
    "no reconocido", { campo: "abs" });
  bloquea("columna de inventario en la cabecera",
    escribir([fila({ modelo: "X", categoria: "ciudad" }, CAB + ",stock_real")], CAB + ",stock_real"),
    "prohibida", { campo: "stock_real" });
  bloquea("columna repetida",
    escribirCrudo(CAB + ",categoria\n" + fila({ modelo: "X", categoria: "ciudad" }) + ",ciudad\n"),
    "repetida", { campo: "categoria" });

  /* ---------------------------------------------------------------- */
  console.log("\nEL VALIDADOR NO ESCRIBE NADA");
  {
    const FUENTE = join(RAIZ, "data/catalogo-publico.local.json");
    const marca = () => (existsSync(FUENTE) ? statSync(FUENTE).mtimeMs : 0);
    const antes = marca();
    validar(escribir([fila({ modelo: "Inocuo", categoria: "ciudad" })]));
    if (antes === marca()) { ok++; console.log("  ok    no toca los datos del catálogo"); }
    else fallos.push("el validador modificó data/catalogo-publico.local.json");
  }
} finally {
  rmSync(BANCO, { recursive: true, force: true });
}

console.log("\n" + "=".repeat(62));
if (!fallos.length) {
  console.log("RESULTADO: " + ok + "/" + ok + " comprobaciones correctas.");
  console.log("");
  console.log("Cada bloqueo se demuestra por SU regla, no por un fallo");
  console.log("secundario. Las ausencias legítimas siguen sin bloquear: un");
  console.log("hueco es «no verificado», nunca un «no».");
  console.log("Banco temporal eliminado.");
  process.exit(0);
}
console.log("RESULTADO: " + fallos.length + " comprobación(es) no se sostienen.");
console.log("");
fallos.forEach((f) => console.log("  · " + f));
process.exit(1);
