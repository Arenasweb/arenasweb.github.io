# Estado de las fichas técnicas — 24 de septiembre de 2026

Las nueve láminas se rehicieron en lote y **las noventa cifras están
verificadas** contra el catálogo oficial Bajaj de mayo: motor, potencia,
torque, caja, arranque, suspensión, frenos, tanque, llantas y peso, en las
nueve motos. Sin palabras rotas. Todos los pesos en `SIN DATO`, como
corresponde: el catálogo no indica ninguno.

Lo único incompleto son los **colores**, y por una razón sana: cuando no había
fotografía de un color, la IA dejó el hueco en lugar de inventarse una moto.

## Cuáles están completas

| Moto | Colores | Estado |
|---|---|---|
| Dominar 400 | Verde · Negro | **lista** |
| Pulsar 150R | Rojo y negro · Azul y negro · Negro y gris | **lista** |
| Pulsar N250 UG | Negro | **lista** |

## Cuáles esperan una fotografía

| Moto | Tiene | Le falta | ¿Hay foto? |
|---|---|---|---|
| CT 125 | Azul y negro · Rojo | **Rojo y negro** | **sí**, en el proyecto |
| Pulsar 400 NS | Negro · Rojo · Blanco | **Gris** | **sí**, en el proyecto |
| Dominar 250 | Negro · Rojo | Amarillo | no |
| Pulsar 125 LS | Rojo · Negro | Amarillo · Blanco | no |
| Pulsar 180 Neon | Negro y rojo | Negro y gris · Negro y naranja | no |
| Pulsar 200 RS | — | Rojo y blanco · Gris · Blanco y negro | no |

Las dos primeras solo necesitan que se rehaga la lámina: sus fotos ya existen
en `assets/referencias/_colores-para-la-ia/`.

Las otras cuatro necesitan **ocho fotografías** que no existen en ninguna
fuente: ni en las láminas antiguas, ni en el catálogo, ni en el repositorio.

## Las ocho fotografías que faltan

| Moto | Color | De dónde sale la moto para repintarla |
|---|---|---|
| Dominar 250 | Amarillo | la foto grande de su propia lámina (gris) |
| Pulsar 125 LS | Amarillo | la foto grande de su propia lámina (negra y roja) |
| Pulsar 125 LS | Blanco | ídem |
| Pulsar 180 Neon | Negro y gris | la foto grande de su propia lámina (negra y roja) |
| Pulsar 180 Neon | Negro y naranja | ídem |
| Pulsar 200 RS | Rojo y blanco | la foto grande de su propia lámina (gris) |
| Pulsar 200 RS | Gris | la propia foto grande, sin repintar |
| Pulsar 200 RS | Blanco y negro | la foto grande de su propia lámina |

Los nombres de color salen de los círculos del catálogo de mayo, que es la
misma fuente con la que se publicaron los colores del sitio web.

## Lo que sigue pendiente, aparte de esto

- **Cuatro motos sin ficha posible:** N125 FI, N160 FI, 160 NS UG2 y
  200 NS UG2. Sus páginas del catálogo traen el recuadro de especificaciones
  vacío. Van en el pedido a Crosland.
- **Los pesos de las nueve.** Ninguna página del catálogo los indica.
- **El botón «Explorar ficha técnica»** en la web. No se ha construido: hacía
  falta tener primero una ficha verificada que enseñar. Ahora ya hay cinco.

---

# Publicadas — 24 de septiembre de 2026

Las nueve láminas están en el repositorio, una por moto:

```
assets/catalogo/<slug>/ficha-tecnica.webp
```

    ct-125 · dominar-250 · dominar-400 · pulsar-125-ls · pulsar-150r ·
    pulsar-180-neon · pulsar-200-rs · pulsar-400-ns · pulsar-n250-ug

Convertidas de PNG a WebP: **2.9 MB en total** en vez de 18 MB, sin perder
legibilidad — el bloque de ficha técnica se lee a tamaño completo sin
artefactos.

De tres motos llegaron dos maquetaciones (CT 125, Pulsar 400 NS y Pulsar
200 RS). Se conservó la de formato apaisado 1672 × 941, que es el de las
demás. Las descartadas siguen en Descargas.

## Decisión sobre los colores

El propietario la fijó el 24/09/2026: **si no hay fotografía real de un
color, no se muestra.** Enseñar de menos antes que enseñar una moto que no
existe.

Por eso varias láminas salen con menos colores de los que figuran en los
círculos del catálogo. No es un error: es la regla.

## Lo que se puede añadir cuando se quiera

Dos colores que **sí** están en el catálogo y **sí** tienen fotografía en el
proyecto, pero que la lámina no llegó a incluir:

| Moto | Color | Fotografía |
|---|---|---|
| CT 125 | Rojo y negro | `assets/catalogo/ct-125/rojo-negro/portada.webp` |
| Pulsar 400 NS | Gris | `assets/catalogo/pulsar-400-ns/gris/portada.webp` |

## Lo que falta

- **Las fichas de Boxer BM150X Disc y Discover 125 ST.** Están aprobadas
  desde el 23/09, pero sus archivos no se han descargado: solo existen
  dentro de la conversación donde se generaron.
- **El botón «Explorar ficha técnica»** en la web. Las láminas ya están
  publicadas y accesibles por su dirección, pero ninguna página enlaza a
  ellas todavía.
