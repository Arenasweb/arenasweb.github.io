# Prompt para la IA — variantes de color de las 8 motocicletas

Objetivo: que al pulsar un círculo de color en la ficha, la fotografía cambie a
esa variante. El frontend **ya sabe hacerlo** (contrato `COLORES_MODELO_WEB`,
ver [colores-modelo-web.md](colores-modelo-web.md)). Lo único que falta son las
imágenes, una por color y por modelo.

## Antes de nada: esto es un REPINTADO, no una generación

A una IA a la que se le pide «una Pulsar N250 azul» desde cero devuelve *otra*
moto: le cambia el faro, la línea del tanque, el escape. Serviría para un
póster; no para un catálogo donde el cliente compara lo que ve en pantalla con
lo que hay en la tienda.

Por eso el trabajo se hace **con la fotografía real como entrada** (edición de
imagen, no generación desde cero), y el prompt está escrito para eso. Las ocho
máster ya están en el repositorio, con fondo transparente y resolución alta.

---

## Las 8 motos

Son las ocho que hoy están publicadas con fotografía. Las otras 14 filas del
catálogo siguen sin foto, así que todavía no entran aquí.

| # | `slug` | Modelo | `modelo_id` | Color de la máster | Máster que se le entrega a la IA | Resolución |
|---|---|---|---|---|---|---|
| 1 | `ct-125` | CT 125 | `moto-ct-125` | negro con gráficos azules | `assets/catalogo/ct-125/photos/02-lateral.png` | 5750 × 3900 |
| 2 | `discover-125-st` | Discover 125 ST | `moto-discover-125-st` | negro con gráficos azules y blancos | `assets/catalogo/discover-125-st/photos/02-lateral.png` | 4980 × 3400 |
| 3 | `pulsar-n125-fi` | Pulsar N125 FI | `moto-pulsar-n125-fi` | verde limón y gris | `assets/catalogo/pulsar-n125-fi/photos/02-lateral.png` | 6300 × 4300 |
| 4 | `boxer-bm150x-disc` | Boxer BM150X Disc | `moto-boxer-bm150x-disc` | negro con gráficos rojos | `assets/catalogo/boxer-bm150x-disc/photos/02-lateral.png` | 3240 × 2180 |
| 5 | `pulsar-200-ns-ug2` | Pulsar 200 NS UG2 | `moto-pulsar-200-ns-ug2` | negro con detalles rojos y grises | `assets/catalogo/pulsar-200-ns-ug2/photos/02-lateral.png` | 7125 × 4707 |
| 6 | `pulsar-n250` | Pulsar N250 | `moto-pulsar-n250` | rojo y negro | `assets/catalogo/pulsar-n250/photos/02-lateral.png` | 8400 × 5800 |
| 7 | `pulsar-400-ns` | Pulsar NS 400 | `moto-pulsar-400-ns` | rojo y negro | `assets/catalogo/pulsar-400-ns/photos/02-lateral.png` | 5131 × 3456 |
| 8 | `dominar-400` | Dominar 400 | `moto-dominar-400` | verde y negro | `assets/catalogo/dominar-400/photos/02-lateral.png` | 7000 × 4700 |

Las ocho máster tienen **fondo transparente** y la moto entera sin tocar ningún
borde. Eso es justo lo que hace que un repintado salga limpio.

> El color de la máster **también es una variante**: no hay que regenerarlo. Se
> reutiliza la foto que ya existe y se registra como un color más de la lista.

---

## El color de cada moto sale de `assets/referencias/`

Ahí van las capturas de colores. Una por modelo, nombrada con su `slug`, para
que no haya duda de a cuál pertenece:

```
assets/referencias/
  ct-125.jpg
  pulsar-n250.jpg
  dominar-400.jpg
  ...
```

De cada referencia salen tres datos por color: el **nombre comercial**
(«Azul eléctrico»), el **hex** aproximado (`#184FA3`) y el **slug**
(`azul-electrico`). Con eso se rellenan las tres últimas líneas del prompt y las
filas de la hoja.

---

## EL PROMPT — cópialo tal cual

Se lanza **una vez por color y por moto**. Se adjuntan dos imágenes: la máster
de la tabla de arriba y la muestra del color.

```
Vas a REPINTAR la motocicleta que te entrego como imagen. No vas a dibujar una
motocicleta nueva.

ENTRADA
  · Imagen 1: la motocicleta, fondo transparente, vista lateral derecha
    completa. Es la fotografía de un modelo real. Manda sobre todo lo demás:
    es la verdad de la forma.
  · Imagen 2: la muestra de color. De ahí sale UNICAMENTE el color.

SALIDA
  La MISMA fotografía, la MISMA moto, en el color de la muestra.

LO UNICO QUE CAMBIA
  · La pintura de las piezas de carrocería: tanque, cachas y carenados
    laterales, guardabarros, colin, cubre-faro y tapas plasticas pintadas.
  · Los graficos y calcomanias que van sobre esa pintura, que adoptan el color
    nuevo conservando exactamente la misma forma, el mismo tamaño y la misma
    posicion.

LO QUE NO CAMBIA — NADA DE ESTO SE TOCA
  · La forma de la moto. Ni una pieza se mueve, se agranda, se estiliza ni
    desaparece. Mismo angulo, mismo encuadre, mismas proporciones, mismo
    tamaño dentro del lienzo, mismo recorte.
  · Motor, escape, chasis, horquilla, amortiguadores, frenos, discos, cadena,
    llantas, neumaticos, manubrio, espejos, asiento, estriberas, cables y
    tornillos: se quedan con el color y el acabado que ya tienen.
  · Faro, intermitentes y tablero: mismo cristal, mismo reflejo.
  · Las luces, las sombras y los reflejos de la fotografia original. Si el
    tanque tiene un brillo largo en la parte alta, el tanque repintado tiene
    ese mismo brillo largo en la parte alta, en el color nuevo.
  · El fondo transparente. No añadas piso, sombra proyectada, degradado,
    estudio, calle ni ningun elemento detras o debajo de la moto.
  · Los logotipos y las letras (marca, modelo, cilindrada). Se conservan
    legibles, en el mismo sitio y con el mismo texto. No los redibujes, no los
    traduzcas y no inventes otros.

COMO SE PINTA
  El color tiene que verse como pintura de fabrica sobre metal y plastico: con
  su brillo, su reflejo y su oscurecimiento hacia los bordes. No es un filtro
  de color por encima de la foto, ni un relleno plano. Las zonas que en el
  original estan en sombra siguen en sombra, en la version oscura del color
  nuevo.

PROHIBIDO, SIN EXCEPCION
  · Añadir o quitar piezas, accesorios, maletas, parrillas, stickers o textos.
  · Sustituir el modelo por otro parecido.
  · Añadir marcas de agua, firmas, bordes o marcos.
  · Devolver un collage, varias vistas o varios colores en una misma imagen.
    Una generacion = un color = una imagen.

FORMATO DE SALIDA
  PNG con transparencia, a la misma resolucion que la imagen de entrada.

COLOR DE ESTA GENERACION
  Modelo:  <NOMBRE DEL MODELO>
  Color:   <NOMBRE COMERCIAL> (<#HEX>)
  Detalle: <si el color es bitono, que pieza lleva cada color>
```

Las tres últimas líneas son las únicas que cambian entre una generación y la
siguiente.

---

## Cómo deben volver los archivos

Un archivo por color, nombrado con el slug del modelo y el del color separados
por doble guion bajo:

```
ct-125__azul-electrico.png
ct-125__rojo.png
pulsar-n250__negro-mate.png
```

Se dejan en `assets/referencias/salida/`. De ahí se recogen y se convierten a lo
que pide el catálogo —1600 × 1000 px y 1280 × 800 px en WebP, por debajo de
250 KB y 160 KB— con los scripts que ya existen
([recortar-catalogo.mjs](../scripts/recortar-catalogo.mjs) y
[derivar-web.mjs](../scripts/derivar-web.mjs)), y quedan así:

```
assets/catalogo/pulsar-n250/
  general/            ← fotos que no dependen del color
  rojo/
    portada.webp
    portada-mobile.webp
  negro-mate/
    portada.webp
    portada-mobile.webp
```

## Revisión antes de dar por buena una imagen

Cinco cosas, en este orden. Si falla una, se repite la generación:

1. ¿Es la misma moto? Faro, escape y línea del tanque, uno por uno.
2. ¿El fondo sigue transparente, sin sombra ni piso añadidos?
3. ¿Las letras del tanque dicen lo mismo y se leen?
4. ¿El motor y las llantas siguen del color que tenían?
5. ¿La moto ocupa el mismo sitio en el lienzo que en la máster? Si se movió, al
   cambiar de color en la web se nota el salto.

---

## Lo que hay que saber antes de publicar esto

`assets/catalogo/LEEME.md` dice, en su primera regla, que no se publican
imágenes inventadas. Un repintado de la fotografía propia no es inventarse una
moto, pero sí puede inventarse un **color que la tienda no vende**, y eso es
peor: el cliente lo pide y no existe.

Por eso estas variantes entran con `estado_aprobacion = BORRADOR`, se ven solo
en `localhost` con `?preview=1`, y pasan a `APROBADO` cuando gerencia confirme
que ese color se vende de verdad. El contrato de la hoja ya distingue las dos
situaciones.

Fila que le toca a cada color en `COLORES_MODELO_WEB` (15 columnas):

| columna | valor |
|---|---|
| `id` | `moto-pulsar-n250-negro-mate` |
| `modelo_id` | `moto-pulsar-n250` |
| `slug_color` | `negro-mate` |
| `nombre_color` | `Negro mate` |
| `hex_color` | `#1A1A1A` |
| `imagen_principal` | `assets/catalogo/pulsar-n250/negro-mate/portada.webp` |
| `imagen_mobile` | `assets/catalogo/pulsar-n250/negro-mate/portada-mobile.webp` |
| `galeria_1`, `galeria_2` | vacías |
| `orden` | `10`, `20`, `30`… (el menor es el color inicial) |
| `activo` | `TRUE` |
| `estado_aprobacion` | `BORRADOR` hasta que gerencia confirme el color |
| `alt_text` | descripción real de lo que se ve |
| `foco_imagen` | `center center` |
| `ultima_revision` | fecha |
