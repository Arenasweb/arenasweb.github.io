# COLORES_MODELO_WEB — contrato de la hoja de variantes de color

**Estado: PROPUESTA. La hoja todavía NO existe.** Este documento define el
esquema recomendado para que gerencia decida cuándo crearla. El frontend ya
sabe leerla: en cuanto la hoja exista y Apps Script la publique, las variantes
aparecen solas, sin tocar una línea de JavaScript.

Ninguna hoja del Google Sheets real fue creada ni modificada al escribir esto.

---

## 1. Por qué una hoja aparte

`MODELOS_WEB` tiene 28 columnas y es el contrato principal del modelo. Meter
ahí los colores obligaría a algo como `color_1_nombre`, `color_1_hex`,
`color_1_imagen`, `color_2_nombre`… y multiplicaría el ancho de la hoja por
cada variante, con un techo arbitrario de colores.

La regla es la de siempre en una hoja de cálculo: **si una cosa se repite, es
una fila, no una columna.**

```
MODELOS_WEB           → un modelo por fila   (qué motocicletas existen)
COLORES_MODELO_WEB    → un color por fila    (en qué colores existe cada una)
```

Las dos hojas se relacionan por `modelo_id` → `MODELOS_WEB.id`.

---

## 2. Columnas (15)

Pegar en la **fila 1**, exactamente en este orden:

```
id · modelo_id · slug_color · nombre_color · hex_color · imagen_principal ·
imagen_mobile · galeria_1 · galeria_2 · orden · activo · estado_aprobacion ·
alt_text · foco_imagen · ultima_revision
```

| Columna | Obligatoria | Valores admitidos |
|---|---|---|
| `id` | recomendada | Identificador único y estable de la fila. Si se deja vacío se genera como `modelo_id-slug_color`. |
| `modelo_id` | **sí** | Debe coincidir con un `id` de `MODELOS_WEB` (p. ej. `MW-10`). Si no existe ese modelo, la fila se descarta. |
| `slug_color` | **sí** | Minúsculas, números y guiones (`azul-electrico`). Si se deja vacío se deriva de `nombre_color`. |
| `nombre_color` | **sí** | Nombre comercial visible (`Azul`, `Negro mate`). Es lo que lee una persona. |
| `hex_color` | no | `#RRGGBB` o `#RGB`. Cualquier otro formato se ignora sin romper nada. |
| `imagen_principal` | **sí** | Ruta `assets/...` de la foto de escritorio. **Sin esta columna la fila no se publica** (ver §4). |
| `imagen_mobile` | no | Ruta de la variante vertical para celular. |
| `galeria_1`, `galeria_2` | no | Fotos adicionales **de ese color**. |
| `orden` | no | Entero. Menor aparece antes. Define también el color inicial. |
| `activo` | **sí** | `TRUE` para publicar. |
| `estado_aprobacion` | **sí** | `BORRADOR`, `EN_REVISION` o `APROBADO`. |
| `alt_text` | recomendada | Descripción real de la foto. Si se deja vacío se genera «*Modelo* en color *Nombre* — ARENAS MOTOCICLETAS». |
| `foco_imagen` | no | Punto focal del encuadre: `center center`, `50% 30%`, `left top`… |
| `ultima_revision` | no | Fecha de la última revisión editorial. |

---

## 3. Gate de publicación

Una variante llega a la web pública **solo** si se cumplen las dos condiciones:

```
activo = TRUE   Y   estado_aprobacion = APROBADO
```

En previsualización local (`?preview=1` en `localhost`) también se ven las
variantes no aprobadas, marcadas con contorno discontinuo, para poder revisarlas
antes de publicarlas. En GitHub Pages eso es imposible: el modo previsualización
exige host local, no solo el parámetro.

---

## 4. Una variante sin fotografía no es una variante

Decisión de contrato deliberada: **una fila sin `imagen_principal` utilizable se
descarta**, y el motivo se escribe en la consola.

El propósito de esta hoja es cambiar la fotografía al elegir un color. Una fila
sin foto no puede hacerlo, y aceptarla llevaría a mostrar la imagen de otro color
como si fuera la elegida — exactamente lo que no se debe hacer.

Los colores de los que todavía no hay fotografía siguen teniendo sitio: la
columna `colores` de `MODELOS_WEB` es una lista de texto y se muestra tal cual
cuando el modelo no tiene variantes visuales.

```
MODELOS_WEB.colores        → lista de nombres, informativa, sin fotos
COLORES_MODELO_WEB         → variantes visuales, cada una con su fotografía
```

Si un modelo tiene variantes visuales, la lista de texto deja de mostrarse para
no decir dos veces lo mismo.

---

## 5. Rutas de fotografía

Estructura recomendada, **a crear solo cuando existan fotos reales** (no se
crean carpetas vacías por adelantado):

```
assets/catalogo/pulsar-180-neon/
  general/          ← fotos que no dependen del color
  negro/
    portada.webp
    portada-mobile.webp
    galeria-01.webp
  azul/
    portada.webp
    portada-mobile.webp
```

Las fotos actuales **no se han movido**: los modelos sin variantes siguen usando
`imagen_principal` de `MODELOS_WEB` como hasta ahora.

Se aplican las mismas reglas de validación que en el resto del catálogo: solo
rutas relativas bajo `assets/`, `data/` o `legales/`; sin `..`; sin dominios
externos; sin `javascript:`, `data:` ni ningún otro esquema activo.

---

## 6. Qué verá el propietario

Añadir un color será exactamente esto, sin tocar código:

| modelo_id | slug_color | nombre_color | hex_color | imagen_principal | activo | estado_aprobacion |
|---|---|---|---|---|---|---|
| MW-10 | azul | Azul | `#184FA3` | `assets/catalogo/pulsar-180-neon/azul/portada.webp` | TRUE | APROBADO |

Guardar la hoja y recargar la web.

---

## 7. Contrato JSON que espera el frontend

El endpoint debe devolver los colores junto al catálogo, en un array hermano de
`modelos`:

```json
{
  "ok": true,
  "version": "2.0",
  "config": { "...": "..." },
  "categorias": [],
  "modelos": [],
  "colores": [
    {
      "id": "MW-10-azul",
      "modelo_id": "MW-10",
      "slug_color": "azul",
      "nombre_color": "Azul",
      "hex_color": "#184FA3",
      "imagen_principal": "assets/catalogo/pulsar-180-neon/azul/portada.webp",
      "imagen_mobile": "",
      "galeria_1": "",
      "galeria_2": "",
      "orden": 20,
      "activo": true,
      "estado_aprobacion": "APROBADO",
      "alt_text": "",
      "foco_imagen": "center center",
      "ultima_revision": ""
    }
  ]
}
```

El frontend lo normaliza y lo cuelga de cada modelo como `modelo.colors[]`:

```js
{
  id, slug, nombre, hex,
  imagenPrincipal, imagenMobile, galeria: [],
  altText, foco, orden,
  activo, estadoAprobacion, aprobado
}
```

Se aceptan indistintamente las claves en `snake_case` (como en la hoja) y en
`camelCase`, igual que en el contrato de modelos.

---

## 8. Qué deberá hacer Apps Script

Cuando se autorice el despliegue, el endpoint tendrá que:

1. Leer `COLORES_MODELO_WEB` con **lista blanca** de las 15 columnas: una
   columna nueva en la hoja nunca se publica sola.
2. Descartar filas cuyo `modelo_id` no exista en `MODELOS_WEB`.
3. Filtrar por `activo = TRUE` y `estado_aprobacion = APROBADO`.
4. Validar `slug_color`, `hex_color` y las cuatro rutas de imagen.
5. Ordenar por `orden`.
6. No publicar observaciones internas, costos, proveedores ni ninguna columna
   auxiliar que el negocio añada a la derecha.

> **Aviso de desalineación pendiente.** `apps-script/Code.gs` sigue implementando
> el contrato de la fase 8 (hoja `CATALOGO_PUBLICO`, 44 columnas, 4 categorías),
> mientras el frontend ya usa el de la fase 9 (`MODELOS_WEB`, 28 columnas, 5
> categorías con `carga`). Antes de añadir colores a Apps Script hay que
> reconciliar esa diferencia. Ninguno de los dos está desplegado, así que no hay
> riesgo inmediato.

---

## 9. Enlace profundo por color

`modelo.html?slug=pulsar-180-neon&color=azul` abre la ficha con ese color ya
seleccionado. Es opcional y tolerante a fallos: un color inexistente o
manipulado se ignora en silencio y se muestra el color principal.

**No genera una URL indexable distinta.** El `canonical` sigue siendo la ficha
del modelo: los colores son variantes visuales del mismo producto, no páginas
separadas, y duplicar contenido por color perjudicaría el SEO sin aportar nada.

---

## 10. Color inicial

El primero según `orden`. No se elige por nombre ni por ningún criterio del
código. Si en el futuro hiciera falta separar «color inicial» de «primer color de
la lista», se añadiría una columna `es_principal`; hoy no existe porque `orden`
ya resuelve el caso.

---

## Referencias

- `docs/fuente-unica-datos.md` — qué archivo manda por dominio de datos
- `SECURITY_AND_AI_GUARDRAILS.md` — reglas de publicación y datos prohibidos
- `assets/catalogo/LEEME.md` — formatos y pesos de fotografía
- `data/catalogo-colores-demo.local.json` — fixture de QA local (datos de
  demostración, nunca publicables)
