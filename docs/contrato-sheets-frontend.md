# Qué hace el frontend con cada columna de la hoja

Mapa columna por columna: de `MODELOS_WEB` al DOM. Se escribió para que la
reconciliación de Apps Script en **Fase 3** sea mecánica en vez de arqueológica.

Los consumidores están **contados sobre el código real**, no recordados.

> **Apps Script no se toca en esta fase.** Este documento solo levanta el plano.

---

## Cómo leer la tabla

| Columna | Qué es |
|---|---|
| **Columna** | Nombre exacto en la hoja `MODELOS_WEB` |
| **Propiedad** | Nombre tras normalizar, que es el que usa todo el código |
| **Validador** | Función de `catalogo-utils.js` que la sanea |
| **Consumidores** | Archivos que la leen, y cuántas veces |
| **Si falta** | Comportamiento real cuando la celda está vacía |

`ui` = `catalogo-ui.js` · `app` = `catalogo-app.js` · `modelo` = `modelo-app.js` ·
`data` = `catalogo-data.js` · `compl` = `catalogo-completitud.js`

---

## Identidad

| Columna | Propiedad | Validador | Consumidores | Si falta |
|---|---|---|---|---|
| `id` | `id` | `texto(40)` | data:1 | **Registro descartado** |
| `slug` | `slug` | `texto(80)` + `slugValido` | ui:5 app:3 modelo:5 data:11 compl:1 | **Obligatorio para publicar. NO se deriva de `modelo`.** Si falta o no es válido, el registro existe como borrador —revisable en previsualización, sin enlace de ficha— pero no se publica |
| `modelo` | `modelo` | `texto(120)` | ui:5 app:1 modelo:3 data:2 compl:2 | **Registro descartado** |
| `linea` | `linea` | `texto(60)` | ui:1 app:17 modelo:1 data:7 compl:1 | El filtro de líneas pierde esa opción |
| `categoria` | `categoria` | taxonomía cerrada | ui:1 app:8 modelo:2 data:5 compl:1 | **Registro descartado** |
| `subcategoria` | `subcategoria` | `texto(60)` | app:1 | Nada; solo alimenta el índice de búsqueda |

`id` aparece una sola vez porque su función es unir con `COLORES_MODELO_WEB`, no
pintarse. **No es un campo muerto.**

## Textos

| Columna | Propiedad | Validador | Consumidores | Si falta |
|---|---|---|---|---|
| `titulo_web` | `tituloWeb` | `texto(120)` | *(indirecto)* | Se usa `modelo` como título |
| — | `titulo` | derivado | ui:4 app:2 modelo:7 data:1 | — |
| `descripcion_corta` | `descripcionCorta` | `texto(220)` | ui:2 modelo:4 compl:5 | El párrafo no se dibuja |
| `descripcion_larga` | `descripcionLarga` | `textoLargo(2000)` | modelo:2 compl:5 | La sección no se dibuja |
| `caracteristica_1..3` | `caracteristicas[]` | `texto(120)` c/u | modelo:2 compl:2 | La lista no se dibuja |
| `cta_label` | `ctaLabel` | `texto(40)` | ui:1 modelo:1 compl:1 | Se usa el texto por defecto del botón |

`titulo_web` no se lee directamente en ningún sitio: alimenta `titulo`
(`titulo_web || modelo`), que sí tiene 14 usos. **Está en uso, indirectamente.**

## Imágenes

| Columna | Propiedad | Validador | Consumidores | Si falta |
|---|---|---|---|---|
| `imagen_principal` | `imagenPrincipal` | `rutaImagen` | ui:4 modelo:6 compl:3 | Marcador vectorial, **sin petición de red** |
| `imagen_mobile` | `imagenMobile` | `rutaImagen` | ui:5 modelo:2 compl:2 | En celular se usa la principal |
| `galeria_1`,`galeria_2` | `galeria[]` | `rutaImagen` c/u | ui:2 modelo:2 compl:1 | No hay miniaturas |
| `alt_text` | `altText` | `texto(160)` | ui:3 modelo:1 compl:1 | Se compone uno con modelo y marca |
| `foco_imagen` | `foco` | `foco()` | ui:3 modelo:1 compl:2 | `center center` |

El `<picture>` sirve la variante de celular por debajo de **767 px**
(`MEDIA_MOBILE`). El navegador descarga **una sola**.

`foco` es, junto a `hex_color`, uno de los dos únicos valores de la hoja que
tocan CSS. Por eso su formato es cerrado: palabras clave y porcentajes de 0 a
100, nada más.

## Comercial

| Columna | Propiedad | Validador | Consumidores | Si falta |
|---|---|---|---|---|
| `precio_publico` | `precioPublico` | `numero()` | ui:1 | El bloque de precio **no existe** |
| `mostrar_precio` | `mostrarPrecio` | `booleano()` | ui:1 compl:1 | Se asume FALSE |
| *(config)* | `moneda` | `PEN`/`USD` | ui:1 | `PEN` |
| `colores` | `colores[]` | `lista(8)` | modelo:2 compl:2 | No se listan nombres de color |
| *(otra hoja)* | `colors[]` | `normalizarColor` | ui:2 modelo:3 data:9 compl:2 | No hay selector visual |

El precio exige **tres** condiciones: `config.mostrar_precios` global,
`mostrar_precio` de la fila y un importe positivo. Fallando cualquiera, el
componente entero desaparece. Nunca se imprime `S/ 0`, `NaN` ni «consultar».

## Marcas y publicación

| Columna | Propiedad | Validador | Consumidores | Si falta |
|---|---|---|---|---|
| `destacado` | `destacado` | `booleano()` | ui:3 data:1 compl:2 | Sin distintivo ni filo superior |
| `nuevo` | `nuevo` | `booleano()` | ui:2 compl:2 | Sin distintivo «Nuevo» |
| `orden` | `orden` | `entero(999)` | data:4 | Va al final |
| `activo` | `activo` | `booleano()` | ui:5 app:1 modelo:1 compl:3 | No se publica |
| `estado_contenido` | `estadoContenido` | lista cerrada | schema:1 compl:3 | `BORRADOR` → no se publica |
| `ultima_revision` | `ultimaRevision` | `texto(40)` | **ninguno** | Nada |

---

## Clasificación de los 28 campos

| Clase | Qué significa | Campos |
|---|---|---|
| **USADO** | Llega al DOM o decide comportamiento | 25 de 28 |
| **USADO INDIRECTO** | Alimenta otro campo derivado | `titulo_web` |
| **RESERVADO (gestión)** | Existe para las personas, no para la web | `ultima_revision` |
| **PREPARADO** | Implementado y a la espera de datos | `subcategoria` |
| **NO USADO** | Ninguno | — |

**Ningún campo del contrato sobra.** `ultima_revision` es el único que jamás
llega al navegador, y es correcto que así sea: es trazabilidad interna. **No se
elimina** — Apps Script debería seguir emitiéndolo.

### Campos que la hoja NO debe tener

La lista blanca del esquema ignora cualquier columna fuera del contrato. Se ha
comprobado con una fila que llevaba `stock_real`, `numero_chasis`,
`numero_motor`, `ubicacion_almacen`, `costo_compra` y `telefono_cliente`:
**ninguno llega al modelo**. Aun así, no deben existir en la hoja: lo que no se
envía no puede filtrarse.

---

## Diferencias entre lo documentado y lo implementado

Revisión de `docs/catalogo-modelos-web.md` contra el código:

| Punto | Estado |
|---|---|
| 28 columnas declaradas | **Coincide** con `COLUMNAS` |
| Taxonomía de 5 categorías | **Coincide** |
| Estados `BORRADOR`/`EN_REVISION`/`APROBADO` | **Coincide** |
| Publicación = `activo` + `APROBADO` | **Corregido en esta fase**; el código solo miraba `activo` |
| `portada-mobile` en 9:10 | **Corregido**: es 16:10, medido sobre el layout |
| `foco_imagen` libre hasta 999 % | **Corregido**: acotado a 0–100 % |

---

## Lo que Apps Script tendrá que reconciliar (Fase 3)

El archivo que genera hoy Apps Script (`data/catalogo.json`) **no cumple** este
contrato. Diferencias medidas:

| Aspecto | Genera Apps Script | Espera el frontend |
|---|---|---|
| Hoja de origen | `CATALOGO_PUBLICO` | `MODELOS_WEB` |
| Columnas | 44 | 28 |
| Categorías declaradas | **4** — falta `carga` | 5 |
| Claves de `config` | `mostrarPrecios`, `monedaDefault`, `mostrarStock`, `mostrarPromociones` | `mostrar_precios`, `moneda`, `mostrar_disponibilidad` |
| Colores | Sin soporte | `COLORES_MODELO_WEB` |
| Contenedor | `items` | `modelos` (se acepta `items`) |

**El riesgo de las 4 categorías está medido, no supuesto.** Con un archivo que
publica modelos de `carga` sin declarar esa categoría:

- los 5 modelos de carga **sí se ven**;
- pero **no aparece ningún chip** para filtrarlos;
- y su etiqueta cae al slug en crudo, `carga`, en vez de «Carga y transporte».

Está comprobado en `scripts/qa-tests.mjs` (grupo 9) y `qa-catalogo.mjs` lo avisa
por su nombre.

`monedaDefault` no lo lee nadie: el esquema busca `moneda`. Hoy da igual porque
el valor cae a `PEN` de todas formas, pero al conectar Apps Script hay que
renombrarlo.

---

## Referencias

- [catalogo-modelos-web.md](catalogo-modelos-web.md) — las 28 columnas en detalle
- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — qué hace visible un modelo
- [colores-modelo-web.md](colores-modelo-web.md) — la hoja de colores, todavía inexistente
