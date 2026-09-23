# Prompt — colores web en COLORES_MODELO_WEB

Para el chat que administra el Google Sheets. Da de alta 21 colores de 7 motos.

**Estado antes de lanzarlo (21/09/2026):**

- Las 42 fotografías ya están publicadas en internet. Comprobado una por una:
  42 de 42 responden.
- Las 21 filas de abajo se pasaron por el validador real de la web, en modo
  producción: **21 de 21 aceptadas**, sin avisos.
- Se generaron desde los mismos datos que construyeron las fotos, así que cada
  ruta coincide letra por letra con un archivo que existe.

Tras guardar, la web tarda hasta **5 minutos** en mostrarlo (caché).

---

## EL PROMPT — cópialo tal cual

```
Encargo nuevo sobre el libro CATÁLOGO WEB ARENAS — PRODUCCIÓN: dar de alta
los colores web de siete motos en la hoja COLORES_MODELO_WEB.

Siguen valiendo todas las reglas de siempre: no borras filas, no cambias
ningún id ni slug que exista, no reordenas columnas y no abres
CONTACTOS_INTERNOS. En este encargo NO tocas MODELOS_WEB: solo la lees.

════════════════════════════════════════════════════════
ANTES DE ESCRIBIR — DOS COMPROBACIONES
════════════════════════════════════════════════════════

1. La hoja COLORES_MODELO_WEB existe, tiene los 15 encabezados de la A a la
   O en su orden, y está VACÍA de datos. Si ya tiene alguna fila escrita,
   PARA y dime cuáles: no escribas encima.

2. En MODELOS_WEB existen estos siete id, y los siete tienen activo = TRUE
   y estado_contenido = APROBADO:

      moto-boxer-bm150x-disc
      moto-ct-125
      moto-discover-125-st
      moto-dominar-400
      moto-pulsar-200-ns-ug2
      moto-pulsar-400-ns
      moto-pulsar-n125-fi

   Si alguno no existe o no está publicado, PARA y dímelo. Un color cuyo
   modelo_id no coincide con una moto publicada se descarta sin avisar.

════════════════════════════════════════════════════════
LO QUE ESCRIBES
════════════════════════════════════════════════════════

Las 21 filas de abajo, desde la fila 2, en este mismo orden. Cada línea es
una fila; los valores van separados por « | » y cada uno cae en la columna
de su encabezado. Cópialos carácter por carácter.

galeria_1 y galeria_2 van VACÍAS en las 21 filas: entre esas dos barras no
hay nada, y no hay que poner nada.

id | modelo_id | slug_color | nombre_color | hex_color | imagen_principal | imagen_mobile | galeria_1 | galeria_2 | orden | activo | estado_aprobacion | alt_text | foco_imagen | ultima_revision
moto-boxer-bm150x-disc-negro | moto-boxer-bm150x-disc | negro | Negro | #1C1C1C | assets/catalogo/boxer-bm150x-disc/negro/portada.webp | assets/catalogo/boxer-bm150x-disc/negro/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta Boxer BM150X Disc en color negro, vista lateral derecha completa | center center | 2026-09-21
moto-boxer-bm150x-disc-rojo | moto-boxer-bm150x-disc | rojo | Rojo | #C8161D | assets/catalogo/boxer-bm150x-disc/rojo/portada.webp | assets/catalogo/boxer-bm150x-disc/rojo/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta Boxer BM150X Disc en color rojo, vista lateral derecha completa | center center | 2026-09-21
moto-boxer-bm150x-disc-azul | moto-boxer-bm150x-disc | azul | Azul | #1F4E9C | assets/catalogo/boxer-bm150x-disc/azul/portada.webp | assets/catalogo/boxer-bm150x-disc/azul/portada-mobile.webp |  |  | 30 | TRUE | APROBADO | Motocicleta Boxer BM150X Disc en color azul, vista lateral derecha completa | center center | 2026-09-21
moto-ct-125-azul-negro | moto-ct-125 | azul-negro | Azul y negro | #1F4FA3 | assets/catalogo/ct-125/azul-negro/portada.webp | assets/catalogo/ct-125/azul-negro/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta CT 125 en color azul y negro, vista lateral derecha completa | center center | 2026-09-21
moto-ct-125-rojo | moto-ct-125 | rojo | Rojo | #C8161D | assets/catalogo/ct-125/rojo/portada.webp | assets/catalogo/ct-125/rojo/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta CT 125 en color rojo, vista lateral derecha completa | center center | 2026-09-21
moto-ct-125-rojo-negro | moto-ct-125 | rojo-negro | Rojo y negro | #B3121B | assets/catalogo/ct-125/rojo-negro/portada.webp | assets/catalogo/ct-125/rojo-negro/portada-mobile.webp |  |  | 30 | TRUE | APROBADO | Motocicleta CT 125 en color rojo y negro, vista lateral derecha completa | center center | 2026-09-21
moto-discover-125-st-azul-negro | moto-discover-125-st | azul-negro | Azul y negro | #1F4FA3 | assets/catalogo/discover-125-st/azul-negro/portada.webp | assets/catalogo/discover-125-st/azul-negro/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta Discover 125 ST en color azul y negro, vista lateral derecha completa | center center | 2026-09-21
moto-discover-125-st-rojo | moto-discover-125-st | rojo | Rojo | #D0201F | assets/catalogo/discover-125-st/rojo/portada.webp | assets/catalogo/discover-125-st/rojo/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta Discover 125 ST en color rojo, vista lateral derecha completa | center center | 2026-09-21
moto-discover-125-st-rojo-negro | moto-discover-125-st | rojo-negro | Rojo y negro | #B3121B | assets/catalogo/discover-125-st/rojo-negro/portada.webp | assets/catalogo/discover-125-st/rojo-negro/portada-mobile.webp |  |  | 30 | TRUE | APROBADO | Motocicleta Discover 125 ST en color rojo y negro, vista lateral derecha completa | center center | 2026-09-21
moto-dominar-400-verde | moto-dominar-400 | verde | Verde | #0E7A3A | assets/catalogo/dominar-400/verde/portada.webp | assets/catalogo/dominar-400/verde/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta Dominar 400 en color verde, vista lateral derecha completa | center center | 2026-09-21
moto-dominar-400-negro | moto-dominar-400 | negro | Negro | #1A1A1A | assets/catalogo/dominar-400/negro/portada.webp | assets/catalogo/dominar-400/negro/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta Dominar 400 en color negro, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-200-ns-ug2-negro | moto-pulsar-200-ns-ug2 | negro | Negro | #1A1A1A | assets/catalogo/pulsar-200-ns-ug2/negro/portada.webp | assets/catalogo/pulsar-200-ns-ug2/negro/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta Pulsar 200 NS UG2 en color negro, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-200-ns-ug2-azul | moto-pulsar-200-ns-ug2 | azul | Azul | #1B6FBF | assets/catalogo/pulsar-200-ns-ug2/azul/portada.webp | assets/catalogo/pulsar-200-ns-ug2/azul/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta Pulsar 200 NS UG2 en color azul, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-200-ns-ug2-blanco | moto-pulsar-200-ns-ug2 | blanco | Blanco | #F2F2F2 | assets/catalogo/pulsar-200-ns-ug2/blanco/portada.webp | assets/catalogo/pulsar-200-ns-ug2/blanco/portada-mobile.webp |  |  | 30 | TRUE | APROBADO | Motocicleta Pulsar 200 NS UG2 en color blanco, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-400-ns-rojo | moto-pulsar-400-ns | rojo | Rojo | #BE1E2D | assets/catalogo/pulsar-400-ns/rojo/portada.webp | assets/catalogo/pulsar-400-ns/rojo/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta Pulsar 400 NS en color rojo, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-400-ns-negro | moto-pulsar-400-ns | negro | Negro | #111111 | assets/catalogo/pulsar-400-ns/negro/portada.webp | assets/catalogo/pulsar-400-ns/negro/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta Pulsar 400 NS en color negro, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-400-ns-gris | moto-pulsar-400-ns | gris | Gris | #9EA4A8 | assets/catalogo/pulsar-400-ns/gris/portada.webp | assets/catalogo/pulsar-400-ns/gris/portada-mobile.webp |  |  | 30 | TRUE | APROBADO | Motocicleta Pulsar 400 NS en color gris, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-400-ns-blanco | moto-pulsar-400-ns | blanco | Blanco | #F2F2F2 | assets/catalogo/pulsar-400-ns/blanco/portada.webp | assets/catalogo/pulsar-400-ns/blanco/portada-mobile.webp |  |  | 40 | TRUE | APROBADO | Motocicleta Pulsar 400 NS en color blanco, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-n125-fi-verde | moto-pulsar-n125-fi | verde | Verde | #A4D233 | assets/catalogo/pulsar-n125-fi/verde/portada.webp | assets/catalogo/pulsar-n125-fi/verde/portada-mobile.webp |  |  | 10 | TRUE | APROBADO | Motocicleta Pulsar N125 FI en color verde, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-n125-fi-rojo | moto-pulsar-n125-fi | rojo | Rojo | #C8161D | assets/catalogo/pulsar-n125-fi/rojo/portada.webp | assets/catalogo/pulsar-n125-fi/rojo/portada-mobile.webp |  |  | 20 | TRUE | APROBADO | Motocicleta Pulsar N125 FI en color rojo, vista lateral derecha completa | center center | 2026-09-21
moto-pulsar-n125-fi-morado | moto-pulsar-n125-fi | morado | Morado | #7B2FD1 | assets/catalogo/pulsar-n125-fi/morado/portada.webp | assets/catalogo/pulsar-n125-fi/morado/portada-mobile.webp |  |  | 30 | TRUE | APROBADO | Motocicleta Pulsar N125 FI en color morado, vista lateral derecha completa | center center | 2026-09-21

════════════════════════════════════════════════════════
CUIDADOS AL ESCRIBIR
════════════════════════════════════════════════════════

· Las rutas (imagen_principal, imagen_mobile) se escriben exactas: sin
  barra al principio, sin https://, sin dominio. Las 42 fotografías ya
  están publicadas y comprobadas; si una ruta cambia en una sola letra, esa
  foto deja de encontrarse.
· hex_color lleva el signo #. Si la hoja lo transforma en otra cosa, déjalo
  como texto: «#1C1C1C».
· activo = TRUE y estado_aprobacion = APROBADO en las 21. Es una decisión
  del dueño, tomada el 21/09/2026: quiere los colores publicados ya.
· slug_color NO se cambia nunca: forma parte del enlace (?color=azul) y ya
  puede estar circulando. nombre_color, en cambio, sí se puede renombrar más
  adelante sin romper nada — es solo el texto que lee el cliente.
· orden: el 10 de cada moto es su color por defecto, el de la fotografía
  que ya estaba publicada. Así la web no cambia para quien no toque nada.

NO añadas ningún color que no esté en esta lista. En concreto, faltan a
propósito:
  · el amarillo/verde de la CT 125 y el azul sólido de la Discover: no hay
    fotografía fiable de esos dos;
  · la Pulsar N250 entera: tiene un solo color y no necesita selector.

════════════════════════════════════════════════════════
INFORME FINAL
════════════════════════════════════════════════════════

  1. Cuántas filas escribiste en COLORES_MODELO_WEB (deben ser 21) y en qué
     rango.
  2. Confirmación de que los siete modelo_id existen y están publicados en
     MODELOS_WEB.
  3. Cualquier valor que la hoja haya transformado al pegarlo (fechas, el #
     de los hex, TRUE convertido en casilla…), diciendo en qué celdas.
  4. Confirmación de que no tocaste MODELOS_WEB ni ninguna otra hoja.
```
