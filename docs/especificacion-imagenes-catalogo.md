# Qué fotografía necesita el catálogo

Guía para quien vaya a fotografiar o preparar las imágenes de las motocicletas.

**Todas las medidas de este documento están derivadas del código real**, no
elegidas al azar: la caja de imagen del catálogo está fijada en `aspect-ratio:
16 / 10` ([style.css](../style.css)) y el `<img>` se genera con `width="1600"
height="1000"` ([catalogo-ui.js](../assets/js/catalogo/catalogo-ui.js)).

---

## Lo esencial en una tabla

| Archivo | Medida | Proporción | Peso máximo | Obligatorio |
|---|---|---|---|---|
| `portada.webp` | **1600 × 1000 px** | 16:10 | 250 KB | **Sí** |
| `portada-mobile.webp` | **1280 × 800 px** | 16:10 | 160 KB | Recomendado |
| `galeria-01.webp` | 1600 × 1000 px | 16:10 | 250 KB | No |
| `galeria-02.webp` | 1600 × 1000 px | 16:10 | 250 KB | No |

Formato **WebP**. Si la cámara entrega JPG, se convierte antes de subirlo.

---

## De dónde salen estas medidas

No están elegidas por intuición. Se midió el layout ya renderizado en Chrome,
cargando las páginas reales dentro de marcos del ancho exacto, y anotando cuánto
ocupa de verdad cada caja de imagen.

### Anchura real de la caja, en píxeles CSS

| Ancho de pantalla | Columnas | Tarjeta del catálogo | Imagen de la ficha |
|---|---|---|---|
| 320 px | 1 | 263 | 265 |
| 390 px | 1 | 333 | 335 |
| 430 px | 1 | 373 | 375 |
| 680 px | 1 | 623 | 625 |
| **712 px** | 1 | **647** ← máximo | 649 |
| 768 px | 2 | 342 | 705 |
| **900 px** | 2 | 407 | **837** ← máximo |
| 901 px | 2 | 408 | 437 |
| 1024 px | 2 | 468 | 500 |
| 1366 px | 3 | 416 | 679 |
| 1440 px | 4 | 324 | 719 |
| 1920 px | 4 | 330 | 723 |

Dos detalles que no son evidentes y que gobiernan todo lo demás:

- **La tarjeta es más grande en tablet que en escritorio.** Con `auto-fit` y una
  pista mínima de 320 px, justo antes de que entre una columna nueva la tarjeta
  se estira. El pico son **647 px** alrededor de los 712 px de pantalla; en un
  monitor de 1920 px la tarjeta solo mide 330 px.
- **La ficha es más grande a 900 px que a 1920 px.** Por debajo de 901 px la
  cabecera pasa a una sola columna y la fotografía ocupa todo el ancho: **837 px**.
  Al ensancharse la pantalla vuelve a dos columnas y la imagen se encoge a 437 px,
  creciendo después hasta un tope de 723 px porque el contenedor está limitado
  a 1400 px.

### De píxeles CSS a píxeles de archivo

Una pantalla de alta densidad pinta 2 o 3 píxeles físicos por cada píxel CSS:

| Caso | Ancho CSS | Densidad | Píxeles necesarios |
|---|---|---|---|
| Ficha a 900 px de pantalla | 837 | ×2 | 1674 |
| Tarjeta en su pico | 647 | ×2 | 1294 |
| Celular de 430 px | 375 | ×3 | 1125 |

**1600 px de ancho cubre todos los casos** salvo un margen del 4 % en una franja
muy estrecha (exactamente 900 px de pantalla con densidad ×2), que no se percibe.
Subir a 1920 px encarecería cada archivo para ganar ese 4 %.

### Por qué la foto de celular también es 16:10

La caja declara `aspect-ratio: 16 / 10` y **no hay ninguna sobreescritura en
ninguna consulta de medios**: son las cuatro únicas declaraciones de
`aspect-ratio` de todo el CSS y ninguna está dentro de un `@media`. Con
`object-fit: cover`, una foto vertical de 900 × 1000 px perdería el **44 % de su
altura**. Se vería una franja central de la moto.

La versión «mobile» existe para **pesar menos** y permitir un **encuadre más
cerrado** (la moto un poco más grande, porque la pantalla es pequeña), no para
cambiar de forma.

### Por qué 1280 y no 1200

El navegador usa el archivo móvil cuando la pantalla mide **767 px o menos**
(`MEDIA_MOBILE` en `catalogo-ui.js`). En el extremo alto de esa franja —una
tablet pequeña de 767 px con densidad ×2— la ficha pide 1438 px. En el extremo
bajo —un celular de 430 px con densidad ×3— pide 1125 px.

`1280 × 800` cubre el caso del celular con holgura y llega al 89 % del caso de
la tablet. Es el punto de equilibrio entre nitidez y peso.

> **Alternativas razonables, por si se prefiere otro equilibrio:**
> `1200 × 750` es aceptable como mínimo (cubre el celular, se queda al 83 % en
> tablet). `1440 × 900` cubre absolutamente todo, a cambio de ~25 % más de peso
> en la variante que precisamente existe para ahorrar datos.
>
> Esta discrepancia estaba registrada como decisión pendiente. **Queda resuelta
> aquí**: era un error de documentación, no una elección comercial, y
> `assets/catalogo/LEEME.md` ya está corregido.

---

## Cómo debe ser la fotografía

### Portada (la principal)

**Sí:**

- La motocicleta **completa**, sin que ninguna parte salga del encuadre.
- **Las dos ruedas enteras**, incluida la sombra de contacto con el suelo.
- **Manillar y espejos visibles** cuando la toma sea de tres cuartos.
- **Aire alrededor**: un margen holgado por los cuatro lados. La moto no debe
  tocar los bordes.
- Iluminación pareja, que deje ver el color real.
- Enfoque nítido en toda la moto.
- Si la foto trae reflejos o sombras propias, se conservan: aportan realismo.

**No:**

- Textos, precios, promociones ni logotipos superpuestos.
- Marcas de agua de terceros.
- Capturas de pantalla o fotos con interfaz encima.
- Estirar o comprimir la imagen para que encaje: **deforma la moto**.
- Filtros que alteren el color real del producto.
- Fondos con tanto detalle que compitan con la moto.
- Personas identificables sin autorización.

### Encuadre recomendado

Tres cuartos delantero (la moto ligeramente girada, mostrando frente y lateral a
la vez) suele funcionar mejor que el perfil puro: da volumen y deja ver el frente,
que es lo que identifica al modelo.

### Foto de celular

Misma moto, mismas reglas, **encuadre algo más cerrado**: en una pantalla pequeña
la moto debe ganar tamaño. Sin llegar a cortar ruedas ni manillar.

### Galería (opcional)

Máximo recomendado: **dos fotos** además de la portada. Más no aporta y ralentiza.

1. Un ángulo distinto al de la portada — si la portada es tres cuartos, un lateral.
2. Un detalle real y relevante: tablero, escape, asiento… solo si dice algo.

---

## Si la moto queda mal encuadrada

La caja recorta lo que sobra desde el centro. Si al verla en la web queda cortada
una rueda o el manillar, **no hay que rehacer la foto**: se ajusta la celda
`foco_imagen` de esa fila en la hoja.

| Valor | Qué hace |
|---|---|
| `center center` | Por defecto: recorta desde el centro |
| `50% 30%` | Sube el encuadre (útil si corta la rueda de abajo) |
| `50% 70%` | Baja el encuadre |
| `left center` | Alinea a la izquierda |
| `right center` | Alinea a la derecha |

Se prueba abriendo `catalogo.html?preview=1` hasta que se vea bien.

---

## Dónde va cada archivo

Una carpeta por modelo, nombrada con su `slug` exacto. Para el piloto:

```
assets/catalogo/pulsar-180-neon/
    portada.webp
    portada-mobile.webp
    galeria-01.webp        (opcional)
    galeria-02.webp        (opcional)

assets/catalogo/boxer-bm150x-disc/
    portada.webp
    portada-mobile.webp

assets/catalogo/torito-fibraser-clasico/
    portada.webp
    portada-mobile.webp
```

Las tres carpetas **ya existen** y están vacías, esperando.

Después, en la hoja `MODELOS_WEB`, se escribe la ruta completa:

| Columna | Valor |
|---|---|
| `imagen_principal` | `assets/catalogo/pulsar-180-neon/portada.webp` |
| `imagen_mobile` | `assets/catalogo/pulsar-180-neon/portada-mobile.webp` |

> **Importante:** escribir la ruta de un archivo que todavía no se ha subido hace
> que la web intente cargarlo y falle. Si la foto no está, **la celda se deja
> vacía**: entonces se dibuja un marcador discreto y no se pide ningún archivo.

---

## Variantes de color

Cuando existan colores comerciales reales con su propia fotografía, cada uno lleva
su subcarpeta:

```
assets/catalogo/pulsar-180-neon/
    general/            fotos que no dependen del color
    negro/portada.webp
    azul/portada.webp
```

Esa función necesita una hoja `COLORES_MODELO_WEB` que **todavía no existe**. Las
variantes que hoy se ven en previsualización son de demostración y no se publican.
Ver `docs/colores-modelo-web.md`.

---

## Antes de dar una foto por buena

- [ ] Proporción 16:10 exacta (1600×1000 o equivalente).
- [ ] Menos de 250 KB (160 KB la de celular).
- [ ] Formato WebP.
- [ ] La moto completa, con aire alrededor.
- [ ] Sin textos, precios ni marcas de agua.
- [ ] Es **este** modelo, no uno parecido.
- [ ] Vista en `catalogo.html?preview=1` y en la ficha.
- [ ] Vista en ventana estrecha (celular).

---

## Referencias

- `assets/catalogo/LEEME.md` — nota original (revisar la medida de celular)
- `docs/guia-carga-contenido-catalogo.md` — cómo rellenar la hoja
- `docs/piloto-3-modelos.md` — qué falta exactamente en cada piloto
