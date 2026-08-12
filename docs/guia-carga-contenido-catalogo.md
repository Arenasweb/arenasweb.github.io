# Cómo publicar una motocicleta en la web

Guía para quien administra el catálogo desde Google Sheets. **No hace falta saber
programar ni tocar el código**: todo se hace escribiendo en la hoja
`MODELOS_WEB`.

La idea de fondo es simple:

> **Tú escribes el contenido. La web se encarga de mostrarlo bien.**

Si un dato está vacío, la web sencillamente no lo muestra — no aparece un hueco
raro ni un «no disponible». Así que puedes ir llenando poco a poco.

---

## Antes de empezar: los dos interruptores

Cada fila tiene dos columnas que deciden si la moto se ve o no:

| Columna | Para qué sirve |
|---|---|
| `estado_contenido` | En qué punto está el trabajo: `BORRADOR` mientras la preparas → `APROBADO` cuando la has revisado |
| `activo` | El interruptor final: `TRUE` la publica, `FALSE` la mantiene oculta |

La celda de `estado_contenido` tiene un **desplegable con esas dos únicas
opciones**. Si escribes cualquier otra cosa, la hoja la rechaza: es a propósito.

**Una moto solo aparece en la web cuando `activo = TRUE`.** Mientras esté en
`FALSE` puedes trabajarla con tranquilidad: nadie la ve.

Para revisarla antes de publicar, abre en tu computadora:

```
catalogo.html?preview=1
```

Ahí se ven **todas** las motos, incluso las que están en borrador, marcadas con
la etiqueta «Sin publicar». Eso solo funciona en tu computadora — desde internet
no se puede activar.

---

## Los 14 pasos, en orden

El orden importa: está pensado para que en cada paso ya se note una mejora.

### 1. Nombre del modelo — `modelo`
El nombre comercial, tal como se le llama. Ejemplo: `Modelo de ejemplo 150`.

### 2. Categoría y línea — `categoria`, `linea`
`categoria` solo admite una de estas cinco palabras, escritas igual:

```
ciudad   trabajo   deportiva   aventura   carga
```

Si escribes otra cosa, **la moto no aparecerá**. `linea` es la familia comercial
y alimenta el filtro de líneas.

### 3. Descripción corta — `descripcion_corta`
Una o dos frases. Es lo que se lee bajo el nombre en la tarjeta.

**En la tarjeta se corta a dos líneas**, así que ve al grano. Describe el
carácter de la moto, no sus especificaciones.

### 4. Imagen principal — `imagen_principal` ← *el paso que más se nota*
Sube la foto al proyecto siguiendo esta ruta, usando el `slug` de la moto:

```
assets/catalogo/mi-slug/portada.webp
```

Y escribe esa misma ruta en la celda. Tamaño recomendado: **1600 × 1000 px**,
formato WebP, menos de 250 KB.

> **Si todavía no tienes la foto, deja la celda vacía.** Escribir la ruta de un
> archivo que no existe hace que la web intente cargarlo y falle.

### 5. Imagen para celular — `imagen_mobile`
La misma foto, **1280 × 800 px**, con la moto un poco más grande:

```
assets/catalogo/mi-slug/portada-mobile.webp
```

Misma proporción que la principal (16:10). **No es una foto vertical**: la caja
de imagen conserva su forma en el celular, así que una foto vertical se vería
recortada por arriba y por abajo.

Esta versión existe para que el celular descargue menos datos. Si no la pones,
se usa la principal y se ve bien igualmente.

### 6. Texto alternativo — `alt_text`
Describe **lo que se ve en la foto**, para quien no puede verla (y para Google).

- Bien: `Motocicleta roja de perfil sobre carretera de montaña`
- Mal: `moto`, `foto1`, `IMG_2831`

### 7. Punto focal — `foco_imagen`
Solo si hace falta. La foto se recorta para caber en la tarjeta, y a veces el
recorte corta una rueda o el manillar. Con esta celda mueves el encuadre:

```
center center   (por defecto)
50% 30%         sube el encuadre
left top        esquina superior izquierda
```

Prueba con `?preview=1` hasta que se vea bien.

### 8. Descripción larga — `descripcion_larga`
Solo aparece en la ficha. Puedes usar varios párrafos: **deja una línea en blanco
entre ellos**.

Escribe texto normal. No pegues HTML ni código: se elimina automáticamente.

### 9. Características — `caracteristica_1`, `_2`, `_3`
Hasta tres frases cortas sobre lo que distingue a la moto. Se muestran las que
llenes; si dejas las tres vacías, el bloque no aparece.

**No son fichas técnicas.** No escribas potencia, par, consumo ni velocidad si no
tienes el dato oficial confirmado.

### 10. Colores — `colores`
Nombres separados por comas. Es solo texto informativo.

*(Las variantes con fotografía por color son otra función, todavía no
disponible: necesita una hoja aparte que aún no se ha creado.)*

### 11. Precio — `precio_publico`, `mostrar_precio`
**Solo con autorización expresa de gerencia.**

Para que un precio se vea hacen falta **tres cosas a la vez**: que los precios
estén activados globalmente, que `mostrar_precio` sea `TRUE`, y que
`precio_publico` tenga un número válido.

Si falta cualquiera, **no se muestra nada** — ni «consultar», ni `S/ 0`. Eso es
intencional: es mejor no decir nada que decir un precio equivocado.

> **Escribe el precio como número, no como texto.** En la celda, solo los
> dígitos: `12990`. Si lleva céntimos, con **punto**: `12990.50`.
>
> **Nunca con coma decimal.** `12990,50` no se publica: el sistema no puede
> saber si son doce mil novecientos noventa con cincuenta o un millón
> doscientos noventa y nueve mil cincuenta. Ante la duda no muestra nada, que
> es mejor que mostrar un precio cien veces mayor.
>
> Para comprobarlo: selecciona la celda y mira si el número queda alineado a la
> derecha. Si aparece a la izquierda, la celda está en formato Texto —
> *Formato → Número*.

### 12. Revisar — `?preview=1`
Abre el catálogo en tu computadora y comprueba:

- ¿La foto se ve completa, sin cortar ruedas ni manillar?
- ¿Se ve bien en pantalla de celular?
- ¿El texto se lee sin cortarse de forma rara?
- ¿El nombre está bien escrito?

Y para ver qué falta todavía:

```
catalogo.html?preview=1&debug=1
```

Aparece un panel con el recuento de lo pendiente, y cada tarjeta muestra
etiquetas como `FOTO` o `COPY` señalando lo que le falta.

### 13. Aprobar — `estado_contenido = APROBADO`
Cuando el contenido esté revisado y correcto.

### 14. Publicar — `activo = TRUE`
Último paso. A partir de aquí la moto es visible para cualquiera.

---

## Qué NO hacer

| No hagas esto | Por qué |
|---|---|
| Escribir un precio sin autorización | Un precio equivocado es un problema comercial y legal |
| Inventar potencia, par, consumo o velocidad | Si el dato no está confirmado, no se publica |
| Usar la foto de otro modelo «mientras tanto» | El cliente creería que esa es la moto |
| Poner la ruta de una foto que aún no has subido | Provoca un error de carga; deja la celda vacía |
| Poner `activo = TRUE` antes de aprobar el contenido | Publica trabajo a medias |
| Cambiar el `id` de una fila ya creada | Rompe el enlace con sus fotos y colores |
| Cambiar el `slug` de una moto ya publicada | Rompe los enlaces que ya se hayan compartido |
| Escribir una categoría distinta de las cinco | La moto desaparece del catálogo |
| Añadir stock, costos, proveedores o teléfonos | No se publican, y no deben estar en esta hoja |
| Pegar texto con formato desde Word | Puede traer caracteres invisibles; pega como texto plano |

---

## Preguntas frecuentes

**Subí la foto pero no se ve.**
Revisa que la ruta esté escrita exactamente igual, con barras normales (`/`), sin
espacios, y que el nombre del archivo coincida incluyendo mayúsculas.

**Puse el precio y no aparece.**
Los precios están desactivados globalmente hasta que gerencia lo autorice.

**Escribí la descripción larga y en la tarjeta no se ve.**
Es normal: la descripción larga solo sale en la ficha. En la tarjeta va la corta.

**¿Puedo publicar sin foto?**
**No.** Un modelo sin `imagen_principal` válida no llega a la web pública,
aunque esté aprobado y activo. En previsualización sí lo verás, con un marcador
gris en lugar de la foto, para que puedas trabajar en él.

Lo mismo con `alt_text` y `descripcion_corta`: hacen falta los tres.

**¿Puedo publicar sin precio y sin colores?**
Sí, sin problema. Son opcionales.

---

## Referencias

- `docs/catalogo-modelos-web.md` — detalle técnico de cada columna
- `docs/checklist-modelo-publicable.md` — lista de revisión antes de activar
- `assets/catalogo/LEEME.md` — tamaños y pesos de fotografía
