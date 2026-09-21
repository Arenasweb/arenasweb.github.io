# Tutorial — cómo se cambia el catálogo

Todo lo de este documento se hace **desde el navegador**. No hace falta la
terminal, ni instalar nada, ni pedirle permiso a nadie.

---

## 0. El mapa — solo hay dos lugares

Cuesta un minuto entenderlo y ahorra todas las confusiones que vienen después.

```
   GOOGLE SHEETS                        GITHUB
   ─────────────                        ──────
   LOS DATOS                            LOS ARCHIVOS

   Qué motos hay                        Las fotografías
   Cómo se llaman                       Los videos
   Qué dice cada una                    El logo
   Qué color tiene cada una             El código
   Cuáles se publican

   Se edita como una hoja de cálculo    Se sube arrastrando archivos
```

**El Sheets guarda la dirección de la foto, no la foto.** Esa es la frase que
explica el 90 % de los problemas. En la celda va escrito
`assets/catalogo/ct-125/portada.webp`, que es una *dirección*. El archivo tiene
que estar en GitHub, en esa dirección exacta, o la página lo busca y no lo
encuentra.

**Dirección del libro:** Google Sheets → *CATÁLOGO WEB ARENAS — PRODUCCIÓN*
**Dirección del repositorio:** <https://github.com/Arenasweb/arenasweb.github.io>

---

## 1. Las dos reglas que gobiernan todo

### Regla 1 — Los dos interruptores

Una moto aparece en la web pública **solo** si en su fila se cumplen las dos
cosas a la vez:

```
activo = TRUE        Y        estado_contenido = APROBADO
```

Si falta una, la moto existe en la hoja pero no se ve. Eso es a propósito:
puedes escribir una moto a medias durante semanas sin que ningún cliente la vea.

### Regla 2 — Primero el archivo, después la dirección

**Nunca** escribas la ruta de una foto antes de haberla subido. Una celda vacía
no hace nada: la web dibuja un marcador gris y no pide ningún archivo. Una
dirección que apunta a un archivo inexistente **sí** da error.

---

## 2. Las cuatro hojas que lee la web

El programa que conecta el Sheets con la web lee **exactamente estas cuatro** y
ninguna más:

| Hoja | Una fila es… | Estado |
|---|---|---|
| `MODELOS_WEB` | una moto | existe, 22 filas |
| `CATEGORIAS` | una categoría | existe |
| `CONFIG_PUBLICA` | un ajuste general | existe |
| `COLORES_MODELO_WEB` | **un color** | falta crearla |

> Todo lo que escribas **a la derecha de la columna 28** de `MODELOS_WEB` es
> invisible para internet. Costos, proveedor, teléfonos, notas internas: ahí
> están seguros. La web no los lee nunca.

---

## TUTORIAL A — Cambiar el texto de una moto

El más sencillo. Empieza por aquí.

1. Abre el libro *CATÁLOGO WEB ARENAS — PRODUCCIÓN*.
2. Pestaña **`MODELOS_WEB`**, abajo.
3. Busca la fila por su **`slug`** (columna B), no por el nombre. Hay slugs muy
   parecidos: `pulsar-n250` y `pulsar-n250-ug` son **motos distintas**.
4. Cambia lo que quieras en estas columnas:
   - `descripcion_corta` — una o dos frases. Se corta a 2 líneas en la tarjeta.
   - `descripcion_larga` — texto plano. Dos saltos de línea = párrafo nuevo.
   - `caracteristica_1`, `2`, `3` — rasgos cortos. Las vacías desaparecen solas.
   - `titulo_web` — solo si el título debe diferir del nombre comercial.
5. Pon la fecha de hoy en `ultima_revision`.
6. **Espera 5 minutos** y recarga la web.

Eso es todo. No hay que guardar, ni publicar, ni avisar a nadie.

---

## TUTORIAL B — Subir una fotografía

Esta es la parte que se hace en GitHub. Son seis clics.

### B.1 — Preparar la imagen

La web necesita dos archivos por foto:

| Archivo | Medida | Peso máximo |
|---|---|---|
| `portada.webp` | 1600 × 1000 px | 250 KB |
| `portada-mobile.webp` | 1280 × 800 px | 160 KB |

Las dos en **16:10 horizontal**. También la de celular — no es un error: la caja
de la imagen tiene esa forma en todas las pantallas, y una foto vertical pierde
el 44 % de su altura recortada.

Para convertir, sin instalar nada: <https://squoosh.app>

1. Arrastra tu foto a la página.
2. Panel derecho: formato **WebP**.
3. Marca **Resize** y pon 1600 de ancho.
4. Mueve la calidad hasta que el peso baje de 250 KB.
5. Botón de descarga, abajo a la derecha.
6. Repite con 1280 de ancho para la versión móvil.

Renombra los dos archivos exactamente `portada.webp` y `portada-mobile.webp`.

### B.2 — Subirla a GitHub

1. Entra a <https://github.com/Arenasweb/arenasweb.github.io>
2. Clic en la carpeta **`assets`**, luego en **`catalogo`**.
3. Clic en la carpeta con el **slug** de tu moto (por ejemplo `pulsar-150r`).
   Si no existe, la creas en el paso siguiente escribiendo el nombre.
4. Botón **`Add file`** (arriba a la derecha) → **`Upload files`**.
5. **Arrastra** los dos archivos a la zona punteada.
6. Abajo, en la cajita, escribe qué hiciste. Por ejemplo:
   `fotos de la Pulsar 150R`
7. Botón verde **`Commit changes`**.

Listo. El archivo ya existe. Su dirección es:

```
assets/catalogo/<slug>/portada.webp
```

### B.3 — Escribir la dirección en el Sheets

Ahora, y **solo ahora**, vuelves a `MODELOS_WEB`:

| Columna | Qué escribes |
|---|---|
| `imagen_principal` | `assets/catalogo/pulsar-150r/portada.webp` |
| `imagen_mobile` | `assets/catalogo/pulsar-150r/portada-mobile.webp` |
| `alt_text` | lo que se ve: «Motocicleta Pulsar 150R azul, vista lateral derecha completa» |

Sin barra al principio. Sin `https://`. Sin el nombre del dominio. Es una
dirección relativa y se escribe tal cual.

---

## TUTORIAL C — Publicar una moto que estaba apagada

Antes de encender los interruptores, comprueba que su fila tenga las cinco
cosas obligatorias:

- [ ] `modelo` — el nombre comercial bien escrito
- [ ] `categoria` — una de estas cinco, en minúscula:
      `ciudad` · `trabajo` · `deportiva` · `aventura` · `carga`
- [ ] `imagen_principal` — apuntando a un archivo que **ya subiste**
- [ ] `alt_text` — describiendo la foto
- [ ] `descripcion_corta` — escrita, sin «PENDIENTE» ni «por definir»

Si las cinco están:

1. `estado_contenido` → **`APROBADO`**
2. `activo` → **`TRUE`**
3. `ultima_revision` → la fecha de hoy
4. Espera 5 minutos y mira la web **sin** `?preview=1`.

> Si escribes cualquier otra cosa en `categoria` —«urbana», «Ciudad» con
> mayúscula, «city»— la moto **no aparece y no avisa**. Es el error más común.

---

## TUTORIAL D — Los colores

Esta es la hoja que todavía no existe. Se crea una sola vez.

### D.1 — Crear la hoja

1. Abajo del todo, junto a las pestañas, clic en el **`+`**.
2. Clic derecho en la pestaña nueva → **Cambiar nombre**.
3. Escribe exactamente, en mayúsculas y con guiones bajos:
   ```
   COLORES_MODELO_WEB
   ```
4. En la **fila 1**, una columna por celda, en este orden exacto:

```
id · modelo_id · slug_color · nombre_color · hex_color · imagen_principal ·
imagen_mobile · galeria_1 · galeria_2 · orden · activo · estado_aprobacion ·
alt_text · foco_imagen · ultima_revision
```

El orden no se puede cambiar. Son 15 columnas, de la A a la O.

### D.2 — Entender la diferencia

En `MODELOS_WEB`, **una fila = una moto**.
En `COLORES_MODELO_WEB`, **una fila = un color**.

Si la CT 125 tiene cuatro colores, son **cuatro filas**, todas con el mismo
`modelo_id`.

### D.3 — Las fotos de cada color

Van en una subcarpeta por color, dentro de la carpeta de la moto:

```
assets/catalogo/ct-125/
   azul/
      portada.webp
      portada-mobile.webp
   rojo/
      portada.webp
      portada-mobile.webp
```

Se suben igual que en el Tutorial B.

### D.4 — Añadir un color

Una fila nueva, con esto:

| Columna | Ejemplo | Nota |
|---|---|---|
| `id` | `moto-ct-125-azul` | único, no se cambia |
| `modelo_id` | `moto-ct-125` | **el `id` de la fila en `MODELOS_WEB`**, no el slug |
| `slug_color` | `azul` | minúsculas, sin acentos, con guiones |
| `nombre_color` | `Azul` | lo que lee el cliente |
| `hex_color` | `#184FA3` | opcional, pinta el circulito |
| `imagen_principal` | `assets/catalogo/ct-125/azul/portada.webp` | obligatoria |
| `imagen_mobile` | `assets/catalogo/ct-125/azul/portada-mobile.webp` | |
| `orden` | `10`, `20`, `30`… | el menor es el color que sale primero |
| `activo` | `TRUE` | |
| `estado_aprobacion` | `BORRADOR` → `APROBADO` | |
| `alt_text` | «CT 125 azul, vista lateral derecha» | |

> **Un color sin fotografía no es un color.** Una fila sin `imagen_principal`
> se descarta sola. Es deliberado: el propósito de esta hoja es cambiar la foto
> al elegir un color, y una fila sin foto acabaría enseñando la de otro color
> como si fuera la elegida.

Cuando un modelo tiene colores con foto, la lista de texto de la columna
`colores` de `MODELOS_WEB` **deja de mostrarse**, para no decir dos veces lo
mismo.

---

## TUTORIAL E — Añadir una moto nueva

1. En `MODELOS_WEB`, ve **al final** de la hoja y escribe una fila nueva. No la
   insertes en medio: el sitio donde aparece en la web lo decide la columna
   `orden`, no la posición de la fila.
2. Lo mínimo para que la fila exista (si falta uno, se descarta entera):

   | Columna | Ejemplo |
   |---|---|
   | `id` | `moto-pulsar-n160-fi` |
   | `slug` | `pulsar-n160-fi` |
   | `modelo` | `PULSAR N160 FI` |
   | `categoria` | `deportiva` |

3. Rellena `linea`, `orden` y los textos.
4. Deja `activo` = `FALSE` y `estado_contenido` = `BORRADOR` mientras trabajas.
5. Sube la foto (Tutorial B) y escribe su ruta.
6. Publica (Tutorial C).

**El `id` y el `slug` no se tocan nunca más.** El `slug` es la dirección de la
ficha: si lo cambias, los enlaces que ya mandaste por WhatsApp dejan de
funcionar.

---

## 3. Revisar antes de publicar

### En la web, sin tocar nada

Guarda, espera 5 minutos y abre la página. Mira la tarjeta y la ficha: que la
foto no corte ruedas ni espejos, que el nombre no desborde, que no aparezca
ningún hueco raro.

Si la foto queda mal encuadrada, no la vuelvas a recortar: usa la columna
`foco_imagen`. Admite `center center` (por defecto), `50% 30%`, `left top`…

### En tu computadora, antes de que lo vea nadie

Esto sí es terminal, y es opcional. Tres comandos, dentro de la carpeta del
proyecto. Ninguno modifica nada: solo miran y avisan.

```
node scripts/servidor-local.mjs
```
Levanta el sitio en tu PC, en <http://127.0.0.1:4173/>. Añadiendo `?preview=1`
a la dirección verás también las motos apagadas, marcadas con contorno
discontinuo. Eso solo funciona en tu computadora: en internet es imposible.

```
node scripts/qa-catalogo.mjs --detalle
```
Revisa que no falten datos obligatorios y te lista qué modelo tiene qué
problema.

```
node scripts/qa-assets-catalogo.mjs
```
Comprueba que **todas** las fotos que menciona la hoja existen de verdad. Una
ruta que apunta a la nada la trata como error, no como aviso.

---

## 4. Los errores que más se repiten

| Síntoma | Causa real |
|---|---|
| Guardé y la web no cambia | Los 5 minutos de caché. Espera. |
| La moto no aparece aunque esté `TRUE` | `estado_contenido` no dice `APROBADO`. |
| La moto no aparece y todo parece bien | `categoria` mal escrita. Solo esas cinco, en minúscula. |
| Sale un marco roto donde iba la foto | Escribiste la ruta antes de subir el archivo. |
| La foto se ve cortada | No es 16:10, o hace falta `foco_imagen`. |
| El color no aparece | Le falta `imagen_principal`, o `modelo_id` no coincide con ningún `id`. |
| Cambié el nombre y se rompieron los enlaces | Cambiaste el `slug`. No se cambia nunca. |

---

## 5. Lo que no se toca

- **No borres filas.** Retirar una moto se hace con `activo` = `FALSE`,
  conservando su `id`, su `slug` y sus textos. Borrar la fila pierde el
  historial y rompe los enlaces que ya circulan.
- **No cambies `id` ni `slug`** de una fila que ya existe.
- **No reordenes las columnas** de la fila 1, en ninguna de las hojas.
- **No pongas precios** sin autorización expresa. Este catálogo cotiza por
  WhatsApp: el precio necesita tres condiciones a la vez para mostrarse, y si
  falta una el componente entero desaparece.
