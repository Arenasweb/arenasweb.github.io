# Filtros técnicos — ampliación futura del contrato

Qué haría falta para que el buscador pudiera filtrar por cilindrada, frenos,
transmisión o peso.

> ## PROPUESTA. NADA DE ESTO ESTÁ IMPLEMENTADO.
>
> No se ha creado ninguna hoja, no se ha añadido ninguna columna, no se ha
> tocado Apps Script ni el backend, y el buscador **no lee ninguno** de estos
> campos. Este documento existe para que la decisión se tome con el trabajo
> real delante, no para anunciar algo que ya funcione.
>
> Lo que sí está implementado: [buscador-catalogo.md](buscador-catalogo.md).

---

## 1. El problema de fondo

El buscador de hoy trabaja con lo que hay: modelo, línea, categoría,
subcategoría, colores reales y precio publicable. Con eso se responde «¿para qué
la quiero?», pero no «¿de cuántos centímetros cúbicos?» ni «¿tiene ABS?».

Añadir esas preguntas exige que **los datos existan**, aprobados, para un número
suficiente de modelos. Y ahí está el riesgo principal:

> **Un filtro cuyas opciones están casi todas vacías empeora la experiencia.**
> Alguien filtra por «ABS: sí», obtiene dos motos de veintidós, y se lleva la
> impresión de que ARENAS no vende casi nada — cuando lo que falta es el dato,
> no la moto.

Por eso la regla de activación va al final de este documento y no es negociable.

---

## 2. Dónde vivirían los datos

### Opción A — ampliar `MODELOS_WEB`

| A favor | En contra |
|---|---|
| Una sola hoja que mantener | Pasaría de 28 a ~44 columnas |
| Sin `modelo_id` que cuadrar | La hoja se vuelve incómoda de editar a mano |
| Sin cambios en la lectura del backend | Mezcla contenido editorial con ficha técnica |
| Una sola lectura por petición | Quien escribe textos y quien verifica especificaciones **no son la misma persona** |

### Opción B — hoja aparte, `ESPECIFICACIONES_MODELO_WEB`

| A favor | En contra |
|---|---|
| Separa dos responsabilidades distintas | Una lectura más por petición |
| `MODELOS_WEB` se mantiene manejable | Hay que validar `modelo_id` contra `MODELOS_WEB` |
| Se puede empezar por unos pocos modelos | Dos hojas que pueden desincronizarse |
| Permisos distintos por hoja | Más superficie que auditar |

### Recomendación técnica: **B**

Por el mismo motivo que llevó a `COLORES_MODELO_WEB` a ser una hoja aparte: **si
una cosa se repite o pertenece a otro dominio, es su propia tabla**. Las
especificaciones las verifica quien tiene la ficha del fabricante delante; los
textos comerciales los escribe otra persona. Meterlas en la misma fila obliga a
las dos a editar el mismo sitio.

Y hay un argumento operativo: con la opción B se puede **empezar por tres
modelos** y crecer. Con la A, las 16 columnas nuevas aparecen vacías en las 22
filas desde el primer día.

> **La decisión es del propietario.** Aquí solo se argumenta.

---

## 3. Campos propuestos

Todos **opcionales**. Ninguno bloquea la publicación: un modelo sin ficha
técnica se publica igual, simplemente no aparece en esos filtros.

| Campo | Tipo | Unidad | Vacío | Validación | Si falta |
|---|---|---|---|---|---|
| `modelo_id` | texto | — | **no** | debe existir en `MODELOS_WEB.id` (patrón `moto-…`) | la fila se descarta |
| `tipo_moto` | lista cerrada | — | sí | por definir con gerencia | no entra en ese filtro |
| `cilindrada_cc` | número | cm³ | sí | entero 50–2000 | no entra en el filtro |
| `potencia_hp` | número | HP | sí | 1–300, un decimal | no se muestra |
| `torque_nm` | número | N·m | sí | 1–300, un decimal | no se muestra |
| `transmision` | lista cerrada | — | sí | `Manual` · `Automática` · `Semiautomática` | no entra en el filtro |
| `numero_marchas` | número | — | sí | entero 1–8 | no se muestra |
| `sistema_combustible` | lista cerrada | — | sí | `Carburador` · `Inyección` | no entra en el filtro |
| `tipo_freno_delantero` | lista cerrada | — | sí | `Disco` · `Tambor` | no entra en el filtro |
| `tipo_freno_trasero` | lista cerrada | — | sí | `Disco` · `Tambor` | no entra en el filtro |
| `abs` | TRUE/FALSE | — | sí | booleano nativo | **se trata como desconocido, no como «no»** |
| `peso_kg` | número | kg | sí | 50–500 | no se muestra |
| `altura_asiento_mm` | número | mm | sí | 600–950 | no se muestra |
| `capacidad_tanque_l` | número | L | sí | 2–30, un decimal | no se muestra |
| `uso_principal` | lista cerrada | — | sí | las 5 categorías vigentes | redundante con `categoria`: **probablemente no hace falta** |

### Dos campos que NO deben crearse todavía

| Campo | Por qué no |
|---|---|
| `tipo_licencia` | Requiere fundamento legal peruano revisado por un asesor. Publicar «necesitas licencia A-I» sin base es un riesgo legal, no un detalle de producto. **PENDIENTE_PROPIETARIO: revisión legal.** |
| `garantia` | Es un compromiso comercial. Solo con texto aprobado por gerencia y por escrito. **PENDIENTE_PROPIETARIO.** |

### `abs` merece una nota aparte

Un booleano tiene dos estados; la realidad tiene tres: **sí**, **no**, y **no lo
hemos verificado**. Una celda vacía debe significar el tercero.

Si se tratara el vacío como «no», el catálogo estaría afirmando que 20 motos no
tienen ABS sin que nadie lo haya comprobado. Eso es inventar un dato con forma
de ausencia. El filtro «ABS: sí» debe devolver solo lo verificado, y no debe
existir un filtro «ABS: no» hasta que la columna esté completa.

---

## 4. Qué habría que tocar, y en qué orden

Un campo nuevo no es una columna: son **catorce sitios**.

| # | Dónde | Qué |
|---|---|---|
| 1 | Google Sheets | Crear la hoja y sus encabezados |
| 2 | Validación de celdas | Listas cerradas y rangos numéricos |
| 3 | `Configuracion.gs` | Añadir la hoja y su **lista blanca** de columnas |
| 4 | `Nucleo.gs` | Normalizar, validar rangos, descartar `modelo_id` inexistente |
| 5 | Versión de API | `api_version` sube; `CONTRATO_MAYOR` **solo si rompe** |
| 6 | `catalogo-schema.js` | Normalizar el bloque técnico del modelo |
| 7 | `catalogo-data.js` | Unir especificaciones con modelos, como ya se hace con colores |
| 8 | `catalogo-finder.js` | Pasos nuevos y opciones derivadas |
| 9 | `catalogo-ui.js` | Mostrar la ficha técnica en `modelo.html` |
| 10 | Documentación | Contrato, guía de carga, este documento |
| 11 | `qa-tests.mjs` | Normalización, filtros, casos vacíos |
| 12 | `qa-api-catalogo.mjs` | Lista blanca y validación en el backend |
| 13 | `qa-endpoint-real.mjs` | El endpoint real emite lo previsto y nada más |
| 14 | Despliegue | Runbook, guarda pre-despliegue, verificación |

### Compatibilidad hacia atrás

**El contrato mayor NO debe subir.** Añadir un array hermano
(`especificaciones: []`) es aditivo: un frontend antiguo lo ignora y sigue
funcionando. Subir `CONTRATO_MAYOR` obligaría a desplegar backend y frontend a
la vez, y durante ese hueco la web caería al archivo local.

Regla: **`api_version` sube siempre; `CONTRATO_MAYOR` solo si se elimina o se
cambia el significado de algo existente.**

### Migración de las 22 filas

No hay migración: la hoja nace vacía y se rellena modelo a modelo. Un modelo sin
fila de especificaciones se comporta **exactamente igual que hoy**. Ese es el
sentido de que todos los campos sean opcionales.

---

## 5. Cómo se probaría

Además de lo evidente, tres casos que suelen olvidarse:

| Caso | Qué debe pasar |
|---|---|
| `modelo_id` que no existe | La fila se descarta; se registra en diagnóstico; el catálogo no se cae |
| Dos filas para el mismo `modelo_id` | **Ninguna se publica** — es una identidad ambigua, igual que en `MODELOS_WEB` |
| `cilindrada_cc = 99999` | Fuera de rango: se descarta el campo, no la fila |
| `abs` vacío | No aparece ni como sí ni como no |
| Columna nueva no declarada | **No se publica**, aunque alguien la añada a la hoja |
| Un solo modelo con cilindrada | El filtro **no aparece** (ver §6) |

---

## 6. Cuándo activar cada filtro — la regla

Un filtro técnico **solo se enciende** cuando se cumplen las tres:

1. **Cobertura ≥ 70 %** de los modelos publicados tienen el dato.
2. **Al menos dos valores distintos** entre ellos: un filtro con una sola opción
   no es una elección.
3. **Cada opción ofrecida tiene al menos un modelo.**

Es la misma regla que ya gobierna los pasos del asistente hoy, y por la que el
paso de presupuesto no existe: con 0 precios publicables, no hay nada que
preguntar.

Esto se implementa **en el código**, derivándolo de los datos en cada carga. No
se escribe una lista de filtros activos a mano en ningún sitio.

---

## 7. Qué NO se hará

- No se rellenarán especificaciones **desde fichas de internet**. Cada dato lo
  aprueba una persona con la documentación oficial delante.
- No se publicará un dato «aproximado», «según el fabricante» ni «referencial».
- No se añadirán campos de stock, costo, margen, proveedor ni cliente. Nunca.
- No se convertirá el catálogo en una tabla comparativa: sigue siendo una web
  comercial, no una base de datos.

---

## 8. Qué decisiones faltan

| Decisión | Quién |
|---|---|
| Opción A o B (columnas o hoja aparte) | Propietario |
| Valores exactos de `tipo_moto` | Gerencia comercial |
| Si `tipo_licencia` puede existir | **Asesor legal** |
| Si `garantia` tiene texto aprobado | Gerencia comercial |
| Quién verifica y firma cada especificación | Propietario |
| Por qué modelos empezar | Propietario |

Hasta que estas se resuelvan, este documento no pasa de propuesta. Y el buscador
actual **funciona sin ninguna de ellas**.

---

## Referencias

- [buscador-catalogo.md](buscador-catalogo.md) — lo que sí está implementado
- [catalogo-modelos-web.md](catalogo-modelos-web.md) — las 28 columnas de hoy
- [colores-modelo-web.md](colores-modelo-web.md) — el precedente de una hoja hermana
- [catalogo-api-publica.md](catalogo-api-publica.md) — el contrato del endpoint
