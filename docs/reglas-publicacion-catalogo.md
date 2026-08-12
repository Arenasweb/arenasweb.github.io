# Qué hace que un modelo se vea en la web

Definición única de «publicado» para el catálogo. Si alguna vez hay dudas sobre
por qué una moto aparece o no aparece, la respuesta está aquí.

> **Ojo, hay dos vocabularios de estado en el proyecto.** Este documento habla
> del **catálogo** (`estado_contenido`: `BORRADOR` / `EN_REVISION` / `APROBADO`;
> el CMS ofrece solo los dos extremos desde la migración del 10/08/2026).
> La portada usa otro sistema distinto, con cuatro estados
> (`pendiente` / `aprobado` / `rechazado` / `oculto`) descrito en
> `docs/control-publicacion-datos.md`. **No son intercambiables** y no se
> mezclan: cada uno gobierna su subsistema.

---

## La regla

Un modelo se ve en la web pública **si y solo si**:

```
PUBLICADO = PUBLICABLE  Y  activo = TRUE  Y  estado_contenido = APROBADO
```

Son tres cosas, no dos. **`activo` + `APROBADO` no bastan**: expresan la
intención de publicar, pero si el contenido no está, no hay nada que publicar.

**PUBLICABLE** significa que el modelo tiene lo necesario:

| Bloque | Qué exige |
|---|---|
| Identidad | `id`, `modelo` y un `slug` **explícito** y válido |
| Taxonomía | `categoria` de la taxonomía cerrada, y **activa** donde la fuente lo sepa |
| Contenido | `imagen_principal` válida, `alt_text` **real**, `descripcion_corta` **real** |

«Real» quiere decir que no sea un marcador de pendiente. Ver más abajo.

Un modelo puede ser **PUBLICABLE sin estar PUBLICADO**: contenido terminado y
todavía en `BORRADOR` a la espera de aprobación. Es un estado normal y deseable.

| `activo` | `estado_contenido` | Contenido | ¿Se ve? |
|---|---|---|---|
| TRUE | APROBADO | completo | **Sí** |
| TRUE | APROBADO | falta algo | **No** |
| TRUE | EN_REVISION | completo | No |
| TRUE | BORRADOR | completo | No — publicable, no publicado |
| FALSE | APROBADO | completo | No — publicable, no publicado |
| TRUE | *(vacío)* | cualquiera | No — un estado no reconocido se trata como `BORRADOR` |

### Una política, cuatro implementaciones

No hay «un único punto» que decida. Hay **una sola política** aplicada por
cuatro piezas, cada una en su sitio, porque el dato pasa por cuatro manos:

| Pieza | Cuándo actúa | Qué hace |
|---|---|---|
| **Apps Script v2** (`Nucleo.gs`) | Al leer la hoja | Filtra antes de enviar nada; lo que no cumple no sale del servidor |
| **Esquema** (`catalogo-schema.js` → `esPublicable`) | Al recibir datos | Revalida lo que llega, venga del endpoint o del archivo local |
| **Completitud** (`catalogo-completitud.js`) | En previsualización | Deriva el estado editorial y dice qué falta |
| **`qa-catalogo.mjs`** | Sin navegador | Audita el catálogo desde la línea de comandos |

No son cuatro reglas distintas: son cuatro **controladores de la misma regla**.
Que coincidan no es opcional, y hay pruebas de equivalencia que fallan si una
se desvía. Esa redundancia es deliberada — el fallback local se usa cuando el
endpoint no responde, y ahí no hay servidor que filtre.

### Por qué hacen falta las dos

Responden a preguntas distintas y las decide gente distinta:

- **`estado_contenido`** dice *«el contenido está revisado»*. Lo decide quien
  redacta y revisa.
- **`activo`** dice *«quiero que esto esté publicado ahora»*. Lo decide quien
  gestiona el catálogo.

Un modelo puede estar impecablemente redactado y aprobado pero no tocar
publicarlo todavía (`APROBADO` + `activo=FALSE`). Y activar un modelo cuyo texto
aún no ha pasado revisión **no debe** publicarlo: por eso `activo` solo no basta.

> **Corregido en esta fase.** El código comprobaba únicamente `activo`, así que
> un modelo activado con el contenido en `BORRADOR` llegaba al público. La
> herramienta `qa-catalogo.mjs` ya trataba esa combinación como error y su
> mensaje decía «no se publica contenido sin aprobar» — era el código el que no
> cumplía lo prometido. Ahora sí.

---

## Validación técnica ≠ publicabilidad editorial

Son dos filtros distintos y conviene no confundirlos.

### Validación técnica — la aplica el código, sin preguntar

| Requisito | Si falla |
|---|---|
| `id` presente | Registro **descartado**: no existe en ninguna vista |
| `modelo` presente | Registro **descartado** |
| `categoria` dentro de la taxonomía cerrada | Registro **descartado** |
| `slug` válido (`a-z`, `0-9`, guiones) | El registro **se conserva** como borrador: se ve en previsualización, sin enlace de ficha, para poder corregirlo. **No se publica** |
| Ruta de imagen segura | La ruta se descarta y el modelo queda **sin fotografía**. Se ve con un marcador en previsualización; **no se publica** |
| `foco_imagen` con formato válido | Cae a `center center` |
| `hex_color` con formato válido | La muestra queda neutra; el color sobrevive |

La taxonomía cerrada es: `ciudad`, `trabajo`, `deportiva`, `aventura`, `carga`.
Cualquier otra categoría descarta el modelo — no hay categoría «otros».

> **Una celda llena no es una ruta válida.** `../../secreto.png`,
> `https://otro-sitio.com/foto.webp` o `javascript:…` se rechazan igual que una
> celda vacía: el modelo se queda sin fotografía y no llega al público. Solo
> valen rutas relativas dentro de `assets/`, `data/` o `legales/`.

### Publicabilidad editorial — informa en previsualización, bloquea en producción

En **previsualización** no oculta nada: muestra todo, rotulado, y dice qué
falta. Es la herramienta para trabajar.
Vive en [catalogo-completitud.js](../assets/js/catalogo/catalogo-completitud.js).

En **producción** los mismos requisitos **sí son un gate**: un modelo que no los
cumpla no lo emite el backend ni lo acepta el fallback, aunque esté aprobado y
activo. No son dos criterios: es el mismo, aplicado en dos contextos con
propósitos distintos.

| Nivel | Qué significa | Campos |
|---|---|---|
| **Obligatorio** | Sin esto **no se publica** | `id`, `modelo`, `slug`, `categoria`, `imagen_principal` **válida**, `alt_text` real, `descripcion_corta` real |
| **Recomendado** | Se publica, pero se nota que falta | `imagen_mobile`, `descripcion_larga`, `caracteristica_*`, `linea` |
| **Opcional** | Su ausencia nunca es un problema | `precio_publico`, `colores`, `galeria_*`, `foco_imagen`, `cta_label` |

`alt_text` solo se exige cuando hay fotografía — sin foto no hay nada que
describir, pero tampoco hay publicación posible.

**Precio y colores son opcionales a propósito.** Un modelo se publica
perfectamente sin ninguno de los dos. El porcentaje de avance que muestran las
herramientas ignora los opcionales: un modelo completo sin precio marca 100 %.

### Contenido mínimo para publicar

Lo mínimo para poner `APROBADO` + `activo`:

1. Identidad válida (id, slug, modelo, categoría **activa**).
2. `imagen_principal` con una **ruta válida** (relativa, dentro de `assets/`). Una celda llena con `../../secreto.png` no cuenta.
3. `alt_text` que describa esa fotografía.
4. `descripcion_corta` real (un texto provisional no cuenta).

Con eso el modelo es honesto: se ve, se entiende y es accesible. Lo demás mejora
la ficha pero no condiciona su publicación.

> **Esto lo aplica también el backend.** Si un modelo aprobado y activo no
> cumple los cuatro puntos, la API pública **no lo emite** y lo anota en su
> diagnóstico. Antes solo lo decía la documentación, y el runtime publicaba
> igualmente modelos sin fotografía.

## Tabla maestra de validación

Una sola tabla para detectar divergencias de un vistazo. **Las cuatro columnas
de la derecha deben decir lo mismo en cada fila**; si alguna se desviara, las
herramientas afirmarían «listo para publicar» sobre algo que la web no muestra.
Hay pruebas de equivalencia que fallan si ocurre.

Leyenda: **Borrador** = ¿puede existir el registro sin este campo? ·
**Publicar** = ¿hace falta para llegar al público? · **API** = Apps Script v2 ·
**Local** = fallback (`catalogo-schema.js`) · **QA** = `qa-catalogo.mjs` +
`catalogo-completitud.js` · **Preview** = ¿se ve en `?preview=1` sin él?

| Campo | Borrador | Publicar | API | Local | QA | Preview |
|---|---|---|---|---|---|---|
| `id` | **no** | **sí** | descarta | descarta | error | descarta |
| `modelo` | **no** | **sí** | descarta | descarta | error | descarta |
| `slug` | sí | **sí** | no publica | no publica | error | se ve, **sin enlace** |
| `categoria` válida | **no** | **sí** | descarta | descarta | error | descarta |
| categoría **activa** | sí | **sí** | no publica | *(no aplica)* | aviso | se ve |
| `activo` = TRUE | sí | **sí** | no publica | no publica | — | se ve |
| `estado_contenido` = APROBADO | sí | **sí** | no publica | no publica | error si activo | se ve |
| `imagen_principal` **válida y segura** | sí | **sí** | no publica | no publica | error si activo | marcador |
| `alt_text` real | sí | **sí** | no publica | no publica | error si activo | se compone uno |
| `descripcion_corta` real | sí | **sí** | no publica | no publica | error si activo | se ve sin texto |
| `imagen_mobile` | sí | no | — | — | recomendado | — |
| `descripcion_larga` | sí | no | — | — | recomendado | — |
| `caracteristica_1/2/3` | sí | no | — | — | recomendado | — |
| `linea` | sí | no | — | — | recomendado | — |
| `precio_publico` | sí | **no** | opcional | opcional | opcional | — |
| `colores` | sí | **no** | opcional | opcional | opcional | — |
| `galeria_1/2` | sí | **no** | opcional | opcional | opcional | — |
| `foco_imagen` · `cta_label` | sí | no | opcional | opcional | opcional | — |
| `titulo_web` · `subcategoria` | sí | no | — | — | — | — |
| `ultima_revision` | sí | no | **no viaja** | — | — | — |

### La única diferencia legítima entre API y fallback

**La categoría activa.** El backend lee la hoja `CATEGORIAS` y su columna
`activo`, así que puede exigir que la categoría del modelo esté publicada. El
archivo local no transporta ese estado, de modo que allí solo se comprueba que
la categoría pertenezca a la taxonomía cerrada.

No es una divergencia peligrosa: el fallback es **más** restrictivo en todo lo
demás y nunca menos. Está documentada aquí a propósito para que una auditoría
no la confunda con un descuido.

### Texto real frente a marcador de pendiente

`alt_text` y `descripcion_corta` deben contener contenido, no una nota. Se
reconocen como pendientes: `pendiente`, `por completar`, `por definir`,
`descripcion ampliada`, `texto provisional`, `lorem ipsum`, `tbd` — comparados
en minúsculas, sin tildes y por inclusión.

**Un texto corto no es provisional por serlo.** «Ágil para la ciudad.» es una
descripción legítima.

La misma lista vive en cuatro sitios (backend, esquema del navegador,
completitud y herramientas de Node) porque son cuatro entornos distintos, y hay
pruebas que fallan si alguna copia se desvía.

---

## Estados derivados: para trabajar, no para escribir

Las herramientas de QA calculan un estado de avance que **no existe en la hoja y
nunca se escribe en ella**:

| Estado derivado | Cuándo |
|---|---|
| `PENDIENTE` | Sin fotografía: no hay nada que mirar todavía |
| `EN PREPARACIÓN` | Hay foto, pero falta algo obligatorio |
| `LISTO PARA REVISIÓN` | Se puede publicar; quedan mejoras recomendadas |
| `PUBLICABLE` | No falta nada exigible |

Sirven para saber por dónde va el trabajo. Los estados que maneja el negocio
siguen siendo únicamente `BORRADOR`, `EN_REVISION` y `APROBADO` en el código —y
desde la migración del 10/08/2026, **solo `BORRADOR` y `APROBADO` en la hoja**,
que es donde se decide.

**No se inventan estados nuevos en la hoja sin autorización.**

---

## La previsualización local no publica nada

`?preview=1` en `localhost` muestra también los modelos inactivos y sin aprobar,
rotulados como borrador. Es la herramienta para revisar **antes** de aprobar.

- No modifica ningún dato.
- No escribe en la hoja ni en `localStorage`.
- No funciona fuera de `localhost` / `127.0.0.1`: en GitHub Pages el parámetro se
  ignora por completo.

---

## Cómo comprobarlo

```bash
node scripts/qa-catalogo.mjs              # coherencia general
node scripts/qa-catalogo.mjs --faltantes  # qué falta, por prioridad
node scripts/qa-assets-catalogo.mjs       # fotografías y carpetas
node scripts/qa-tests.mjs                 # el contrato se comporta como dice
```

`qa-catalogo.mjs` marca como **error** un `activo=TRUE` sin `APROBADO`, y también
un `activo=TRUE` sin `imagen_principal`.

---

## Referencias

- [catalogo-modelos-web.md](catalogo-modelos-web.md) — las 28 columnas
- [contrato-sheets-frontend.md](contrato-sheets-frontend.md) — qué consume cada columna
- [checklist-modelo-publicable.md](checklist-modelo-publicable.md) — revisión antes de activar
- [control-publicacion-datos.md](control-publicacion-datos.md) — el **otro** sistema de estados (portada)
