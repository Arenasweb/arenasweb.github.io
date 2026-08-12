# Contraste con el Google Sheet real

Comparación entre lo que el libro **CATÁLOGO WEB ARENAS — PRODUCCIÓN** contiene
hoy y lo que el backend v2 espera.

> **Este documento es el análisis que motivó la migración.** El contraste se
> hizo en solo lectura; la migración que propone **ya se ejecutó** (subfase
> 3.3C, 10 de agosto de 2026). Lo descrito como «hoy» en §2 es el estado
> **anterior** a esa migración, y se conserva porque explica por qué se hizo.
>
> Registro de la ejecución: [plan-migracion-cms-sheets.md](plan-migracion-cms-sheets.md).

Fecha del contraste: **10 de agosto de 2026**.

---

## Resumen en una línea

El contrato encajaba **casi por completo**. Había **una sola incompatibilidad
bloqueante** —`estado_contenido` era una fórmula que nunca producía `APROBADO`,
y el backend exige exactamente ese valor para publicar— y está **resuelta**: la
columna es hoy un campo manual con dos valores.

---

## 1. Lo que ya encaja

Comprobado ejecutando el backend contra fixtures con los **tipos nativos**
reales de Sheets, no con cadenas.

| Aspecto | Real en el libro | Backend v2 | ¿Encaja? |
|---|---|---|---|
| Columnas de `MODELOS_WEB` | 28, en el orden del contrato | 28 | **Sí** |
| Filas | 22 modelos (2–23) | — | Sí |
| `activo` · `mostrar_precio` · `destacado` · `nuevo` | booleano nativo | `normBooleano_` | **Sí** |
| `orden` | número nativo, 1–22 | `normEntero_` | Sí |
| `precio_publico` | celda numérica **vacía**, formato `S/ #,##0.00` | `normNumero_("")` → `null` | **Sí** |
| `foco_imagen` | `"50% 50%"` en los 22 | válido en backend y navegador | **Sí** |
| `cta_label` | `"Ver detalles"` | texto ≤40 | Sí |
| `subcategoria` | Utilitaria · Commuter · Sport · Naked · Touring · Tres ruedas | texto ≤60, se conserva | **Sí** |
| `alt_text` | presente en los 22 | texto real, no provisional | Sí |
| `slug` | explícito en los 22 | obligatorio y explícito | **Sí** |
| `id` | patrón `moto-…` | texto ≤40 | Sí |
| `CONFIG_PUBLICA` | 9 claves, tipos correctos | lista blanca | **Sí, sin cambios** |
| `CATEGORIAS` | 8 filas con `activo` | se lee de la hoja | Sí |
| `COLORES_MODELO_WEB` | **no existe** | `colores: []` sin error | **Sí** |

**No hay que tocar `CONFIG_PUBLICA`, precios, slugs, ids, categorías ni
destacados.** El contraste no encontró motivo.

---

## 2. La incompatibilidad bloqueante — **CERRADA**

> Resuelta el 10 de agosto de 2026. La fórmula fue retirada y `estado_contenido`
> es hoy un campo manual con validación estricta `BORRADOR` / `APROBADO`. Lo que
> sigue describe el estado **anterior**: se conserva porque justifica la
> decisión y porque documenta qué se retiró.

### Qué había antes de la migración

`estado_contenido` **no era un campo que alguien escribiera**. Era una fórmula,
replicada en las 22 filas:

```
=IF(C2="";"";IF(X2=TRUE;IF(AND(H2<>"";L2<>"");"LISTO PARA WEB";"REVISAR CONTENIDO");"BORRADOR"))
```

Producía tres valores posibles: `BORRADOR`, `REVISAR CONTENIDO` y
`LISTO PARA WEB`. **Nunca producía `APROBADO`.**

### Qué exige el backend

```
PUBLICADO = PUBLICABLE  Y  activo = TRUE  Y  estado_contenido = "APROBADO"
```

### El resultado, comprobado

Ejecutando el backend con un modelo completo y `activo = TRUE`:

| `estado_contenido` | ¿Publica? |
|---|---|
| `BORRADOR` | No |
| `REVISAR CONTENIDO` | No |
| `LISTO PARA WEB` | **No** |
| `APROBADO` | **Sí** |

Con aquella fórmula, un modelo perfecto y activado producía `LISTO PARA WEB`.
**Nunca habría llegado a publicarse.** El catálogo público se habría quedado
vacío para siempre sin que nadie entendiera por qué.

### Por qué NO se arregló en el backend

Habría sido trivial aceptar `LISTO PARA WEB` como equivalente de `APROBADO`.
**No se hizo**, y conviene que quede escrito el motivo: si algún día alguien
propone «que el backend acepte también el estado antiguo», esta es la respuesta.

La fórmula comprobaba cuatro cosas: que hubiera nombre, que `activo` estuviera
marcado, que la descripción corta no estuviera vacía y que la imagen principal no
estuviera vacía. No comprobaba **ninguna** de estas: `id`, `slug` válido,
categoría dentro de la taxonomía, que la ruta de imagen fuera segura, que el
`alt_text` fuera real, que la descripción no fuera un marcador de pendiente, ni
que la categoría estuviera activa.

Es decir: **no era un control de calidad suficiente**, y además era automático.
Aceptarla como aprobación habría convertido la publicación en algo que ocurre
solo, en cuanto dos celdas dejan de estar vacías. Justo lo contrario de lo que el
sistema tiene que garantizar.

### El problema de fondo

Una sola columna intentaba cumplir **dos papeles distintos**:

| Papel | Qué responde | Quién decide |
|---|---|---|
| **Completitud técnica** | ¿Están los datos? | El sistema, automáticamente |
| **Aprobación comercial** | ¿Autorizo publicar esto? | Una persona |

Mezclarlos hacía que la segunda ocurriera sola. Ese era el defecto, y es lo que
la migración corrigió.

---

## 3. Contrato vigente del CMS

> **APLICADO en el libro real** el 10 de agosto de 2026.
>
> El registro operativo completo —secuencia celda a celda, copia de seguridad,
> criterios de aborto y vuelta atrás— está en
> [plan-migracion-cms-sheets.md](plan-migracion-cms-sheets.md).

### Lo que rige ahora

**`estado_contenido` es un campo humano** con dos valores y una lista
desplegable de validación estricta:

```
BORRADOR
APROBADO
```

Y **no se añadió ninguna columna nueva.** La hoja sigue teniendo 28.

### Por qué ninguna columna nueva

La primera reacción es crear `estado_qa` o `estado_completitud` para no perder
el cálculo automático. Sería un error:

- El estado automático **ya se calcula**, y mucho mejor que la fórmula: en el
  panel de `?preview=1&debug=1` y en `node scripts/qa-catalogo.mjs`, que
  comprueban los ocho mínimos reales, no cuatro celdas no vacías.
- Una columna de fórmula en la hoja **compite visualmente** con la columna
  humana y vuelve a invitar a confundirlas.
- Menos columnas en un CMS que ya tiene 28 es una mejora en sí misma.

Si más adelante se echa de menos verlo en la hoja, se añade entonces. Empezar
por quitar es más fácil que empezar por añadir.

### Cómo queda la operación diaria

| Paso | Dónde | Quién |
|---|---|---|
| 1. Escribir textos y registrar fotos | `MODELOS_WEB` | Contenido |
| 2. Revisar en `catalogo.html?preview=1` | Navegador | Contenido |
| 3. Comprobar qué falta | `?debug=1` o `qa-catalogo.mjs` | Contenido |
| 4. **Aprobar**: `estado_contenido = APROBADO` | `MODELOS_WEB` | Quien autoriza |
| 5. **Publicar**: `activo = TRUE` | `MODELOS_WEB` | Quien autoriza |

Los pasos 4 y 5 son **dos acciones conscientes y separadas**, y ese es el
punto. `activo` queda el último: es el interruptor, y hasta que se toca no hay
nada visible aunque el contenido esté aprobado.

### Lo que NO cambia

La regla de publicación se mantiene intacta:

- `APROBADO` + `activo = FALSE` → no visible
- `BORRADOR` + `activo = TRUE` → no visible
- `APROBADO` + `activo = TRUE` + contenido incompleto → **no visible**
- `APROBADO` + `activo = TRUE` + mínimos completos → visible

---

## 4. Migración segura — **EJECUTADA**

El riesgo de esta migración era **publicar algo sin querer**. La secuencia se
diseñó para que eso fuera imposible en cada paso intermedio, y así se ejecutó.

### Antes de empezar

1. **Copia de seguridad del libro completo**: hecha, `CATÁLOGO WEB ARENAS —
   BACKUP PRE MIGRACIÓN ESTADO — 2026-08-10 23-44`.
2. Estado de partida anotado: 22 filas, todas `activo = FALSE`.

### La secuencia, y su resultado

| # | Acción | Resultado |
|---|---|---|
| 1 | Verificar que **las 22 filas tienen `activo = FALSE`** | ✅ 22 × FALSE. Con `activo` desmarcado, nada puede publicarse pase lo que pase después |
| 2 | Retirar la fórmula de la columna `estado_contenido` (Y2:Y23) | ✅ retirada |
| 3 | Escribir `BORRADOR` en las 22 filas | ✅ el valor más restrictivo |
| 4 | Aplicar validación de datos: lista con `BORRADOR` y `APROBADO`, rechazando otros valores | ✅ evita erratas y texto libre |
| 5 | Verificar: 22 filas en `BORRADOR`, 22 con `activo = FALSE` | ✅ 0 en `APROBADO` |
| 6 | Confirmar el recuento público | ✅ **0 publicados** |

**Ninguna fila quedó en `APROBADO`.** La aprobación es una decisión humana
posterior, modelo por modelo, y todavía no se ha tomado para ninguno.

El paso 1 fue la red de seguridad: mientras `activo` esté en FALSE, ningún valor
de `estado_contenido` publica nada.

### Vuelta atrás — sigue disponible

| Situación | Qué hacer |
|---|---|
| Se publicó algo sin querer | Desmarcar `activo` en esa fila: efecto inmediato tras el TTL de caché, o al instante ejecutando `limpiarCache()` |
| Hay valores raros en `estado_contenido` | Escribir `BORRADOR` en `Y2:Y23` |
| Algo se rompió estructuralmente | Restaurar la copia de seguridad del 10 de agosto |
| La validación de datos molesta | Se quita sin afectar a los valores ya escritos |

La web **nunca dependió** de esta migración: mientras el endpoint no esté
conectado, el sitio sigue leyendo su archivo local.

---

## 5. Divergencias entre el archivo local y el libro real

`data/catalogo-publico.local.json` **no es un espejo** del Sheet. Es un fixture
anterior y más vacío:

| Campo | Archivo local | Libro real |
|---|---|---|
| `id` | `MW-01` … `MW-22` | `moto-ct-125`, `moto-boxer-bm150x-disc`, … |
| `orden` | 10, 20, … 220 | 1–22 |
| `subcategoria` | vacío en los 22 | Utilitaria · Commuter · Sport · Naked · Touring · Tres ruedas |
| `cta_label` | vacío | `"Ver detalles"` |
| `foco_imagen` | `center center` | `"50% 50%"` |
| `descripcion_corta` | vacío | texto en los 22 |
| `descripcion_larga` | vacío | texto provisional en los 22 |
| `alt_text` | vacío | presente en los 22 |
| `slug` | 22 explícitos | 22 explícitos — **coinciden** |

Los **slugs coinciden**, que es lo que gobierna las URL. Ninguna de las demás
divergencias rompe nada: el archivo local es un fallback, no una copia.

> **Efecto secundario a tener presente:** el fixture de colores de QA
> (`data/catalogo-colores-demo.local.json`) referencia `MW-05`, `MW-10`, `MW-11`
> y `MW-13`. Cuando el origen pase a ser el libro real, esos `modelo_id` dejarán
> de existir y la previsualización mostrará **0 colores DEMO**. No es un fallo
> —el aislamiento funciona— pero conviene saberlo para no interpretarlo como
> una regresión.

---

## 6. Hallazgo: descripción larga provisional

Los 22 modelos del libro llevan el mismo texto en `descripcion_larga`:

> «Descripción ampliada pendiente de completar con información técnica oficial,
> beneficios comprobados, colores e imágenes validadas.»

`descripcion_larga` es **opcional**, así que **no bloquea la publicación** — eso
es correcto y no debe cambiarse.

**El problema:** comprobado ejecutando el backend, ese texto **viaja al cliente**
y el frontend lo conservaría para pintarlo. Si un modelo llegara a publicarse
con esa celda sin tocar, la ficha pública mostraría un texto que dice
«pendiente de completar».

Las herramientas **sí** lo reconocen como provisional (`esProvisional` devuelve
`true` en backend, esquema y completitud), pero solo para informar en QA.

### Tratamiento — **APLICADO en 3.3B**

Se aplica a los campos de texto **opcionales** el mismo criterio que ya regía
para los obligatorios: si el contenido es un marcador de pendiente, **no se
emite**. Afecta a `descripcion_larga` y `caracteristica_1/2/3`.

El modelo **sigue siendo publicable** — son campos opcionales y eso no cambia.
Lo único que ocurre es que el bloque no se dibuja.

Se aplicó en **las dos capas**, no solo en el backend: el archivo local es el
fallback que se usa cuando el endpoint no responde, y si allí no rigiera la
misma política, un fallo del remoto haría aparecer «Descripción ampliada
pendiente de completar…» en una ficha pública. La web se comporta igual con los
dos orígenes.

La previsualización **conserva la señal sin conservar el texto**: el esquema
anota en `modelo.provisionales` qué campos se descartaron, y el panel de
depuración lo muestra. Quien edita ve que hay algo que corregir; el visitante no
ve nada.

> Esto es un cambio de **código local**, no de Google Sheets. El texto sigue
> escrito en las 22 celdas del libro y no se ha tocado.

---

## 7. Categoría `carga` — **ACTIVADA**

El propietario eligió la opción A. Estado real del libro tras la activación:

| Categoría | `activo` |
|---|---|
| ciudad · trabajo · deportiva · aventura · **carga** | **TRUE** |
| touring · rural · iniciacion | **FALSE** |

**5 modelos** usan `categoria = carga`: Mototaxi 4T STD Crom-UG R y los cuatro
Torito. Ahora pueden publicarse **cuando tengan contenido**; hoy siguen en
`BORRADOR`, inactivos y sin fotografía, así que no hay ninguno visible.

Antes de activarla se comprobó lo contrario, y también funcionaba: con `carga`
inactiva, un Torito **completo, activo y aprobado** no se publicaba, y el
diagnóstico lo decía con su nombre. Es el comportamiento diseñado —falla
cerrado—, y sigue vigente para `touring`, `rural` e `iniciacion`.

La alternativa descartada era recategorizar los 5 modelos, que habría cambiado
el significado comercial del catálogo: un mototaxi no encaja de forma natural en
ciudad, trabajo, deportiva ni aventura.

---

## 8. Nombres que conviene revisar

Registrados, **no corregidos**, sin buscar información externa:

`UG` / `UG2` · `FI` · `Disc` · `Crom-UG R` · `Slujo` · `Clásico`

Y dos pares fáciles de confundir: **Pulsar N250** frente a **Pulsar N250 UG**
(categorías distintas), y **Torito Fibraser Clásico** frente a **Torito
Fibraser Clásico 2025**.

---

## Referencias

- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — la regla de publicación
- [catalogo-modelos-web.md](catalogo-modelos-web.md) — las 28 columnas
- [catalogo-api-publica.md](catalogo-api-publica.md) — el contrato del endpoint
- `../apps-script/v2/README.md` — el backend y su despliegue futuro
