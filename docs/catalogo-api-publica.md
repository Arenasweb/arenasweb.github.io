# Contrato de la API pública del catálogo

Qué se pide, qué se devuelve y qué jamás sale.

> **No hay URL todavía.** El endpoint no está desplegado. Este documento define
> el contrato para que, cuando se despliegue, no haya sorpresas.
>
> Implementación: `apps-script/v2/`. Pruebas: `scripts/qa-api-catalogo.mjs`.

---

## Petición

```
GET  <URL_DEL_DESPLIEGUE>/exec?action=catalogo
GET  <URL_DEL_DESPLIEGUE>/exec?action=salud
```

Sin parámetros, se asume `action=catalogo`. Cualquier otro valor devuelve
`{"ok": false, "error": "accion_desconocida"}`.

Se llama `action` porque es lo que el cliente ya envía hoy
(`catalogo-data.js → cargarRemoto`).

**Solo lectura.** No hay `POST`. No existe ningún parámetro que muestre
contenido sin aprobar: no hay `?preview` ni `?debug` del lado del servidor.

---

## Respuesta

```json
{
  "ok": true,
  "version": "2",
  "api_version": "1.0",
  "generated_at": "2026-08-10T00:00:00.000Z",
  "config": {
    "api_version": "1.0",
    "moneda": "PEN",
    "mostrar_precios": true,
    "mensaje_sin_resultados": "No encontramos modelos con esos filtros.",
    "mensaje_catalogo_vacio": "Estamos preparando la publicación del catálogo."
  },
  "categorias": [
    { "slug": "ciudad", "titulo": "Ciudad", "descripcion": "…", "orden": 1 }
  ],
  "modelos": [ … ],
  "colores": [ … ]
}
```

### Las dos versiones no son lo mismo

| Campo | Qué versiona | De dónde sale | ¿Gobierna compatibilidad? |
|---|---|---|---|
| `version` | El **contrato de datos**: la forma de los registros | `CONTRATO_MAYOR` en el código | **Sí, y es obligatoria** |
| `api_version` | La **interfaz HTTP**: parámetros y errores | `CONFIG_PUBLICA.api_version` | No: informativa |

**Manda una sola versión.** `version` es obligatoria y se compara por su número
mayor: `"2"`, `"2.0"` y `"2.7.3"` valen; `"1"`, `"9"`, `"abc"` o su ausencia
hacen que el frontend **descarte el origen entero** y use el archivo local.

`api_version` no se comprueba. Dos controles de compatibilidad sobre el mismo
payload solo multiplican las formas de equivocarse; si algún día la interfaz
HTTP cambia de forma incompatible, lo que cambia es la URL o la versión del
contrato, no un segundo número.

> Dos correcciones aquí. La primera: empezaron desalineadas —el backend decía
> `1` y el frontend espera `2`—, y el síntoma habría sido un catálogo vacío sin
> ningún error. La segunda, encontrada en la auditoría: un sobre **sin**
> `version` pasaba el control, porque la comprobación era `if (mayor && …)` y
> con la cadena vacía nunca llegaba a ejecutarse. Cualquier respuesta con forma
> aproximada de catálogo entraba.

### Los nombres de los campos no son libres

`modelos`, `categorias` y `colores` son exactamente los que ya lee
`catalogo-schema.js`. Emitirlos en inglés (`models`, `categories`) haría que el
frontend no encontrara la lista y pintase un catálogo vacío **sin error**.

---

## Campos de un modelo

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | Une con `colores.modelo_id` |
| `slug` | texto | `a-z`, `0-9`, guiones. Inválido → fila descartada |
| `modelo` | texto | |
| `linea` · `categoria` · `subcategoria` | texto | `categoria` de la taxonomía cerrada |
| `titulo_web` | texto | Vacío → el frontend usa `modelo` |
| `descripcion_corta` · `descripcion_larga` | texto plano | Sin HTML ni Markdown |
| `imagen_principal` · `imagen_mobile` · `galeria_1` · `galeria_2` | ruta | Relativa; insegura → `""` |
| `colores` | texto | Lista separada por comas. Distinto de `colores[]` del envelope |
| `caracteristica_1..3` | texto | |
| `destacado` · `nuevo` | booleano | |
| `cta_label` | texto | |
| `orden` | entero | Ya viene ordenado |
| `alt_text` | texto | |
| `foco_imagen` | texto | Palabras clave o 0–100 % |
| `activo` · `estado_contenido` | booleano · texto | Para que el frontend **revalide** |
| `mostrar_precio` | booleano | |
| `precio_publico` | número | **Solo presente si el precio debe verse** |

**`ultima_revision` no viaja.** Es trazabilidad interna; el navegador no la
consume en ningún punto. La decisión es deliberada, no un olvido.

### La política de precio, en un sitio

El importe viaja **solo** si se cumplen las tres a la vez:

```
config.mostrar_precios  Y  modelo.mostrar_precio  Y  importe positivo
```

Si falta una, `precio_publico` **no aparece** en el JSON y `mostrar_precio`
sale `false`. Se eligió omitir en lugar de enviar-y-que-el-frontend-decida
porque un precio que no debe verse no tiene por qué llegar al navegador: basta
abrir la pestaña de red para leerlo.

El frontend vuelve a comprobar las tres condiciones por su cuenta.

**La celda debe ser numérica.** Como texto solo se aceptan formatos sin
ambigüedad, con el punto como separador decimal:

| Se acepta | Se rechaza |
|---|---|
| `12990` · `12990.50` | `12990,50` — ¿coma decimal o de millar? |
| `12,990` · `S/ 12,990.00` | `12.990,50` — formato europeo |
| celda numérica | `1,23` · `12990.505` · `consultar` |

Un valor ambiguo devuelve null y el precio no se muestra. Antes se borraban
todos los caracteres que no fueran dígito o punto, así que **`12990,50` se
publicaba como 1 299 050** — cien veces más, sin ningún aviso.

### Mínimos publicables

Aprobar y activar no basta. Para que un modelo se emita necesita además:

| Campo | Por qué |
|---|---|
| `imagen_principal` utilizable | Una tarjeta sin foto no comunica nada |
| `alt_text` | Sin él la foto es inaccesible |
| `descripcion_corta` | Una ficha sin una sola línea de texto no está terminada |

**No** entran precio, colores, galería, características ni descripción larga:
son opcionales y un modelo se publica perfectamente sin ellos.

Esta lista es la misma en el backend, en `catalogo-completitud.js` y en
`qa-catalogo.mjs`. Antes el runtime publicaba modelos sin fotografía mientras la
documentación la daba por obligatoria; las herramientas decían «listo para
publicar» sobre algo que no se habría publicado.

### Hojas y filas ambiguas

| Situación | Qué ocurre |
|---|---|
| Encabezado repetido en `MODELOS_WEB` | Hoja inutilizable → `ok:false`, 0 modelos |
| Encabezado repetido en `CATEGORIAS` | Sin categorías → 0 modelos publicados |
| Encabezado repetido en `COLORES_MODELO_WEB` | Catálogo sin colores; no tumba el catálogo |
| Clave repetida en `CONFIG_PUBLICA` | Esa clave cae a su valor por defecto (el restrictivo) |
| Dos categorías con el mismo slug | `CATEGORIAS` inutilizable → 0 modelos |
| Dos modelos con el mismo `id` o `slug` | No se publica **ninguna** de las dos filas |
| Dos variantes con la misma identidad | No se publica ninguna de las dos |

La comparación se hace sobre el encabezado ya normalizado: `activo`, `ACTIVO`
y ` Activo ` son el mismo.

---

## Campos de un color

`id`, `modelo_id`, `slug_color`, `nombre_color`, `hex_color`,
`imagen_principal`, `imagen_mobile`, `galeria_1`, `galeria_2`, `orden`,
`activo`, `estado_aprobacion`, `alt_text`, `foco_imagen`.

Una variante se publica solo si es `activo` + `APROBADO`, su modelo está
publicado y tiene `imagen_principal` utilizable. Un `hex_color` inválido **no**
invalida el color: la muestra queda neutra y el nombre sigue sirviendo.

La hoja es **opcional**: si no existe, `colores: []` y el catálogo funciona.

---

## Errores

Siempre JSON, nunca una traza.

| `error` | Cuándo |
|---|---|
| `backend_no_configurado` | Falta la propiedad con el identificador del libro, o no se puede abrir |
| `contrato_incompleto` | Faltan columnas requeridas, o hay encabezados duplicados |
| `accion_desconocida` | `action` con un valor no admitido |
| `error_interno` | Cualquier otra excepción |

**Los errores no se cachean.** Solo se guarda una respuesta `ok:true`; así, en
cuanto se corrige la hoja, la siguiente visita lo ve, en vez de esperar a que
expire el TTL.

### `action=salud`

Responde **siempre**, aunque no haya configuración: su función es decir si el
endpoint está vivo.

```json
{ "ok": true, "servicio": "arenas-catalogo", "api_version": "1.0",
  "version": "2", "configurado": true }
```

`configurado` indica si existe un identificador de libro utilizable. **No
afirma que el catálogo funcione**: no abre el libro ni lee ninguna hoja, porque
una comprobación de vida no debe costar cuatro lecturas. Para saber si el
catálogo responde de verdad, se pide `action=catalogo`.

No revela el identificador, ni el nombre de la propiedad, ni los nombres de las
hojas.

Nunca se devuelve el mensaje de la excepción: puede contener el identificador
del libro, nombres de hojas internas o rutas. El detalle se queda en el
registro del proyecto.

---

## Qué jamás aparece

Comprobado con filas trampa que llevan `stock_real`, `numero_chasis`,
`costo_compra`, `telefono_cliente` y `token_secreto`: **ni los nombres ni los
valores** aparecen en el JSON serializado.

- Stock en cualquier forma. No hay columna de stock en la whitelist: no es una
  bandera que se pueda encender, es una vía que no existe.
- Promociones (fase 5), sedes y financiamiento (fase 4).
- `CONTACTOS_INTERNOS`, en ninguna circunstancia.
- Costos, márgenes, proveedores, datos personales, credenciales.
- El identificador del libro y la URL del despliegue.

Una columna nueva en la hoja **no se publica sola**.

---

## Caché

`CONFIG_PUBLICA.cache_segundos` gobierna el TTL, acotado entre 30 s y 1 h.

Esto es lo que permite que **editar la hoja se refleje en la web sin volver a
desplegar**: pasado el TTL, la siguiente visita relee. Para verlo al instante,
`limpiarCache()` desde el editor de Apps Script.

---

## Si el endpoint falla

La web **nunca depende** de él:

```
remoto → si falla → data/catalogo-publico.local.json → si falla → estado vacío
```

Cubre endpoint caído, lento (hay `AbortController` con tiempo límite), HTTP 500,
JSON corrupto, `Content-Type` que no es JSON y contrato que no cuadra. En todos
los casos se usa el archivo local y el visitante no ve ningún error técnico.

Volver atrás del todo es `CONFIG.modoDatos = "local"`. Una línea.

### CORS — **PENDIENTE DE VERIFICACIÓN EN EL DESPLIEGUE REAL**

Lo que se espera: una Web App publicada con acceso «cualquier usuario» permite
un `fetch` desde otro origen, y Apps Script redirige a `googleusercontent.com`
—`fetch` sigue redirecciones por defecto—.

**No se ha comprobado.** Sin despliegue no hay forma de observar las cabeceras
que emite `ContentService`, y afirmar `Access-Control-Allow-Origin: *` sin
haberlo visto sería inventarse el comportamiento. Es el **paso 7 del
despliegue**: pedir la URL desde el navegador y mirar la respuesta.

Si CORS no funcionara, el fallback local entra solo y la web sigue
funcionando; sería un problema de conexión, no una caída.

**No se usa JSONP**: implicaría ejecutar como código lo que devuelve el
servidor.

---

## Mapa completo: hoja → API → navegador

| Hoja | API | Normaliza | Componente |
|---|---|---|---|
| `MODELOS_WEB.imagen_principal` | `modelos[].imagen_principal` | `rutaImagen()` | Tarjeta y ficha; sin ella, marcador |
| `MODELOS_WEB.precio_publico` | `modelos[].precio_publico` *(condicional)* | `numero()` | Bloque de precio; si no, no existe |
| `MODELOS_WEB.foco_imagen` | `modelos[].foco_imagen` | `foco()` | `object-position` |
| `MODELOS_WEB.activo` + `estado_contenido` | idem | `esPublicable()` | Decide si se pinta |
| `MODELOS_WEB.categoria` | `modelos[].categoria` | taxonomía cerrada | Chip de filtro |
| `MODELOS_WEB.ultima_revision` | **no viaja** | — | — |
| `CATEGORIAS.activo` | *(no viaja)* | filtra en el backend | Determina qué se publica |
| `CONFIG_PUBLICA.mostrar_precios` | `config.mostrar_precios` | `booleano()` | Primera de las tres condiciones |
| `CONFIG_PUBLICA.mostrar_stock` | **no viaja** | — | No gobierna nada: no hay stock |
| `COLORES_MODELO_WEB.hex_color` | `colores[].hex_color` | `hexColor()` | Muestra del selector |

Detalle completo del lado del navegador en
[contrato-sheets-frontend.md](contrato-sheets-frontend.md).

---

## Las mismas reglas en cuatro sitios

El contrato lo interpretan cuatro piezas: el backend, `catalogo-schema.js`,
`catalogo-completitud.js` y `qa-catalogo.mjs`. No pueden divergir.

Donde no se puede compartir código —Apps Script no es Node, y el navegador usa
script clásico— hay **pruebas de equivalencia** que fallan si dos copias dejan
de coincidir: taxonomía, estados, versión de contrato, rutas, punto focal,
booleanos, slugs, precios, color hexadecimal y la regla de publicación.

```bash
node scripts/qa-api-catalogo.mjs   # incluye la equivalencia backend ↔ frontend
node scripts/qa-tests.mjs          # equivalencia frontend ↔ herramientas
```
