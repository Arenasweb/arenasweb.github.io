# Verificación del lote de `assets/referencias/`

Revisión de los 96 archivos entregados el **20 de septiembre de 2026**, antes de
colocarlos en `assets/catalogo/`. **No se movió ni se borró nada**: este
documento es el dictamen previo.

## Resumen

| Grupo | Nº | Sirve |
|---|---|---|
| Pósters, folletos y collages | 25 | **no** |
| Recortes sin nombre identificable | 19 | a medias |
| Variantes candidatas, con nombre | 19 | **sí, con reservas** |
| Copias de las máster (por triplicado) | 30 | son duplicados |
| Hojas de contacto | 3 | como índice |

---

## Los cinco fallos

### 1. Hay 25 pósters y collages

Archivos de 1222×1287 y 1312×1199 con nombres como
`a_clean_commercial_motorcycle_brochure_poster_layout`,
`a_clean_grid_like_collage_poster_product_catalog` o
`a_clean_promotional_product_sheet_graphic_collage`.

Son láminas de catálogo: varias motos, textos, marcos y fondo. Es exactamente
lo que el prompt prohibía en su primera regla. No hay nada que rescatar de
ellos: una lámina no se puede convertir en la foto de un color.

### 2. Siete archivos mienten en el nombre

Estos se llaman «transparent background» o «cutout» y **no tienen canal alfa**:

```
a_clean_product_style_png_transparent_background_i.png
a_clean_product_style_studio_cutout_image_of_a_mod.png
a_clean_product_style_studio_isolated_cutout_image.png
a_clean_studio_like_product_photograph_cutout_im.png
a_clean_studio_style_isolated_product_image_a_det.png
a_clean_studio_style_isolated_product_photo_a_hig.png
studio_like_isolated_product_image_a_clean_cutout.png
```

Llevan el fondo pegado. Si se publican, la moto aparece sobre un rectángulo de
color dentro de la tarjeta.

### 3. Ocho variantes tienen la proporción equivocada

Hay dos tandas hechas con ajustes distintos:

| Medida | Proporción | Archivos | Veredicto |
|---|---|---|---|
| 1586 × 992 | 1.60 → **16:10** | 11 | correcta |
| 1448 × 1086 | 1.33 → **4:3** | 8 | **incorrecta** |

Las de 4:3 son recuperables: se les añade transparencia a los lados hasta
1738 × 1086. **No se recortan** — recortar 4:3 a 16:10 se lleva una cuarta parte
de la altura, y con ella las ruedas.

Afecta a: Dominar 400 negra, Pulsar 200 NS azul, Pulsar 400 NS blanco/gris,
Pulsar 400 NS negra, Pulsar NS200 blanco/rojo, Boxer BM150X roja, Pulsar NS 400
plateada, y `imagegen.png`.

### 4. Los nombres no corresponden al modelo

El fallo más caro, porque no se ve en el nombre del archivo.

**`motocicleta_ct_125_roja_en_perfil.png` no es una CT 125. Es una Discover.**
Comparado contra la máster `3_NEGRO-AZUL.png`: mismo cubrecárter blanco, mismo
muelle rojo, mismo escape plateado, mismo texto «4 valve» en el mismo sitio, y
«Discover» legible en el tanque.

La imagen en sí está **bien hecha** —es un repintado fiel de la Discover— pero
está etiquetada como otro modelo. Lo mismo pasa con
`motocicleta_bajaj_ct_125_negra_deportiva.png` y con varias de las que se
llaman genéricamente `motocicleta_roja_125_…`.

### 5. La CT 125 se quedó sin ninguna variante

Consecuencia del punto anterior: **su máster `CT 3_AZUL.png` no se repintó
nunca.** Todo lo que dice «ct_125» en el nombre es una Discover.

La CT 125 tiene 4 colores en el catálogo de mayo y sigue con cero variantes.

---

## Lo que sí salió bien

`motocicleta_bajaj_boxer_bm150x_negra.png` es un **repintado correcto**:
comparado con `BOXER2024_3 negro_2.png` conserva el chasis, la parrilla
trasera, el muelle naranja, el guardabarros, el escape, las llantas y el
rótulo «BM150 X» en su sitio. Solo cambió la pintura.

Las variantes de Boxer, Pulsar N125, Dominar 400 y Pulsar NS parecen fieles a
sus máster. Son las que hay que conservar.

---

## Dos avisos más

**La resolución quedó justo por debajo del mínimo.** Las variantes miden 1586 px
de ancho y la especificación pide 1600. La diferencia es del 0,9 % y no se
percibe, pero conviene saberlo: no dan margen para recortar nada.

**Las máster se degradaron.** Las copias de esta carpeta miden 2048 px de ancho;
las originales de `Links/` van de 3760 a 9568 px. Para el catálogo 2048 sobra,
pero si hay que volver a generar, hay que partir de las originales, no de
estas.

**No hay ninguna ficha técnica en la carpeta.** Los 96 archivos son imágenes
(91 PNG y 5 JPG). Si las fichas están en otro sitio, hay que traerlas.

---

## Plan propuesto

1. **Apartar** los 25 pósters y los 7 sin alfa a una carpeta de descarte. No
   borrarlos todavía: que el dueño los vea antes.
2. **Quedarse con una copia** de cada máster y eliminar los duplicados `(1)` y
   `(3)`.
3. **Identificar visualmente** las 19 variantes candidatas y los 12 recortes sin
   nombre, una por una, y renombrarlas con el patrón
   `<slug-modelo>__<slug-color>.png`.
4. **Corregir la proporción** de las 8 que están en 4:3, rellenando con
   transparencia, nunca recortando.
5. **Volver a generar** las 4 variantes de la CT 125, esta vez partiendo de
   `CT 3_AZUL.png` y diciéndole a la IA que la CT 125 **no es** una Discover.
6. Recién entonces, mover a `assets/catalogo/<slug>/<color>/`.

---

# Resultado — 20 de septiembre de 2026

Ejecutado. **No se borró ningún archivo**: todo lo descartado sigue en disco.

## Cómo quedó la carpeta

```
assets/referencias/
  _listas/             20 variantes listas, en WebP y a medida
  _masters/             8 máster, una copia de cada
  _variantes/          17 generadas, con su nombre original
  _por-identificar/     7 recortes sin nombre reconocible
  _sin-identificar/     1 variante que no se pudo asignar
  _hojas-de-contacto/   3 índices
  _descarte/           40 pósters, collages, opacos y duplicados exactos
```

Los 96 archivos resultaron ser **75 contenidos únicos**: 21 eran copias
exactas, detectadas por hash, no por el nombre.

## Las 20 variantes montadas

Cada una con `portada.webp` (1600 × 1000) y `portada-mobile.webp` (1280 × 800),
en WebP con transparencia y por debajo de los topes de peso. Las que venían en
4:3 se rellenaron con transparencia a los lados; ninguna se recortó.

| Modelo | Colores | Estado |
|---|---|---|
| `boxer-bm150x-disc` | azul · negro · rojo | **completo (3/3)** |
| `pulsar-n125-fi` | verde · rojo · morado | **completo (3/3)** |
| `dominar-400` | verde · negro | **completo (2/2)** |
| `pulsar-200-ns-ug2` | negro · azul · blanco | **completo (3/3)** |
| `pulsar-400-ns` | rojo · negro · gris · blanco | **completo (4/4)** |
| `discover-125-st` | azul-negro · rojo · rojo-negro | falta 1 de 4 |
| `ct-125` | azul | falta 3 de 4 |
| `pulsar-n250` | rojo | sin datos de color |

## Lo que se descartó y por qué

- **25 pósters y collages.** Láminas de catálogo con varias motos, textos y
  marcos. No hay foto de un color que rescatar de ahí.
- **7 archivos opacos** que se llamaban «transparent background» o «cutout» y
  no tenían canal alfa.
- **21 copias exactas** de archivos ya presentes.
- **1 variante azul** que no corresponde a ningún máster: tanque, faro y
  ausencia de cubrecárter no coinciden con la Discover. Queda en
  `_sin-identificar/` por si se reconoce después.

## Lo que falta

1. **La CT 125 necesita 3 variantes.** No se generó ninguna: todo lo que decía
   «ct_125» resultó ser una Discover repintada. Hay que volver a lanzarlo
   partiendo de `CT 3_AZUL.png`, diciendo explícitamente que la CT 125 tiene
   asiento corrido, dos amortiguadores y escape cromado, y que **no es** una
   Discover.
2. **La Discover necesita 1 variante más**, y sobran candidatas: quedan 7
   recortes sin nombre en `_por-identificar/` que parecen ser todos Discover.
   Identificar cuál es el cuarto color y usarlo.
3. **La Pulsar N250 no tiene lista de colores.** No aparece en el catálogo de
   mayo (el PDF trae la N250 **UG**, que es otra moto). Pendiente de Crosland.
4. **Los nombres de color son descriptivos, no comerciales.** `azul`, `rojo`,
   `morado` salen de lo que se ve, no de cómo los llama la tienda. Antes de
   publicarlos hay que confirmarlos.
