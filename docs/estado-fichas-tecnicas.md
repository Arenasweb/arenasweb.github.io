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

---

# Boxer y Discover — 26 de septiembre de 2026

Llegaron las dos láminas que faltaban. **Verificadas dato por dato antes de
publicarlas**: las veinte cifras de cada una coinciden con el catálogo oficial
Bajaj de mayo.

| | Boxer BM150X Disc | Discover 125 ST |
|---|---|---|
| Motor | 144.8 cc, DTS-i, monocilíndrico | 124.6 cc, DTS-i, doble bujía |
| Potencia | 11.8 HP @ 7500 RPM | 12.82 HP @ 8500 RPM |
| Torque | 12.3 Nm @ 5000 RPM | 10.8 Nm @ 6500 RPM |
| Caja | 5 velocidades | 5 velocidades |
| Arranque | Eléctrico y patada | Eléctrico y patada |
| Suspensión | Telescópica 125 / Doble amortiguador SNS | Horquilla hidráulica / Monoshock de Nitrox |
| Frenos | Disco / Tambor 130 mm | Disco / Tambor |
| Tanque | 11 litros | 10 litros |
| Llantas | 90/90 x 17" / 100 x 90 x 17" | 2.75 x 17" / 3.00 x 17" |
| Peso | SIN DATO | SIN DATO |
| Colores | Negro · Rojo · Azul | Azul y negro · Rojo · Rojo y negro |

Estas dos eran las láminas que el 22/09 quedaron marcadas **«no publicable»**:
la del Boxer inventaba potencia, torque y tanque; la del Discover se
desmentía sola dibujando un monoamortiguador y escribiendo «doble amortiguador».
Los tres errores del Boxer y los cuatro del Discover están corregidos.

## Las fotografías

Se comprobaron una por una contra los archivos de
`assets/referencias/_para-la-ia-2/`: la fotografía grande y las tres de color
de cada lámina son **las mismas imágenes**, no dibujos parecidos. En el
Discover se ve el monoamortiguador de muelle rojo en la lámina y en el máster.

Estas dos láminas **no llevan la banda «VISTAS DEL VEHÍCULO»**. De ninguna de
las dos motos existe más que una lateral real, y recortar detalles de esa
lateral daba manchas borrosas. En su lugar, el hueco lo ocupan los tres
colores disponibles a tamaño grande.

## Alcance del botón

El botón «Explorar ficha técnica» pasa de **3 a 5** de las 8 motos publicadas:

    boxer-bm150x-disc · ct-125 · discover-125-st · dominar-400 · pulsar-400-ns

Las otras seis láminas siguen publicadas y siguen sin botón, porque sus motos
están en `BORRADOR`. En cuanto una se apruebe en la hoja, el botón aparece
solo: la lista de `data/fichas-tecnicas.json` ya las incluye.

## Dos cifras del catálogo que contradicen a la lámina

No se han tocado, porque salen de la hoja de cálculo y ahí se corrigen:

| Dónde | Dice | Debería decir |
|---|---|---|
| `MODELOS_WEB` · Boxer · `caracteristica_2` | Torque: **12.5 Nm** | **12.3 Nm** |
| `MODELOS_WEB` · Boxer · `descripcion_larga` | «12.5 Nm … y peso de **125 kg**» | 12.3 Nm, y el peso fuera: el catálogo no lo indica |

Mientras no se corrijan, la página del Boxer enseña 12.5 Nm arriba y 12.3 Nm
en la lámina.

---

# 8 de 8 — 26 de septiembre de 2026

Las tres que faltaban entraron el mismo día: **Pulsar N250, Pulsar N125 FI y
Pulsar 200 NS UG2**. Las ocho motos publicadas tienen ahora su botón
«Explorar ficha técnica».

## Pulsar N250 — completa

Diez campos de diez. El catálogo de mayo **no trae una página de N250 a
secas**: trae la N250 UG. Las cifras publicadas son las de la UG, que es la
única fuente oficial que existe y es también la que la hoja de cálculo ya
publicaba en la web (249 cc, 24.16 HP, 21.5 Nm, ABS, tanque 14 L). Queda
dicho aquí para que nadie lo descubra por sorpresa dentro de un año.

Un solo color, **Rojo**, porque es la única fotografía que existe de ella: en
`COLORES_MODELO_WEB` no tiene ni una fila. Es la regla de siempre — se enseña
lo que hay.

## N125 FI y 200 NS UG2 — con huecos, a propósito

Cuatro campos de cada una salen en **SIN DATO**:

| | N125 FI | 200 NS UG2 |
|---|---|---|
| Arranque | SIN DATO | SIN DATO |
| Suspensión | SIN DATO | SIN DATO |
| Llantas | SIN DATO | SIN DATO |
| Resto | freno posterior | las RPM de potencia y torque |

En el catálogo de mayo esas dos páginas traen **el recuadro de
especificaciones en blanco**. Lo que sí sabemos salió de la ficha oficial
peruana y está aprobado en la hoja, pero no cubre los diez campos.

Se publicaron así por decisión del propietario, sabiendo el coste: media
tabla vacía se ve peor que una tabla corta. **Se completan en diez minutos**
el día que Crosland conteste — son dos de las cuatro fichas que pide
`solicitud-material-crosland.md`. No hay que rehacer la lámina entera: basta
regenerarla con los cuatro datos puestos.

Lo que **no** se hizo fue rellenarlos de memoria. Una cifra técnica publicada
es una afirmación comercial.

## Verificación

Las treinta cifras de las tres láminas se contrastaron carácter por carácter
contra el bloque de datos que se le entregó a la IA. Las nueve fotografías
(tres grandes y siete de color) se compararon contra los archivos del propio
repositorio: son las mismas imágenes, no dibujos parecidos.
