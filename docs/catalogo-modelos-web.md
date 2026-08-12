# MODELOS_WEB — contrato de la hoja del catálogo

Contrato **real y vigente** que lee el frontend. Documenta las 28 columnas de la
hoja `MODELOS_WEB` del archivo *CATÁLOGO WEB ARENAS — PRODUCCIÓN*.

La implementación que manda es `assets/js/catalogo/catalogo-schema.js`. Si algún
día este documento y ese archivo discrepan, **gana el código** y hay que corregir
este texto.

Los ejemplos de abajo son **genéricos y no comerciales**: no representan modelos,
precios ni textos reales de ARENAS.

---

## 1. Cómo se lee la hoja

```
MODELOS_WEB (Google Sheets)
      ↓  una fila = un modelo
Apps Script  (lista blanca de estas 28 columnas)
      ↓  JSON sanitizado
catalogo-schema.js  (normaliza, valida y descarta)
      ↓
catalogo.html · modelo.html · index.html (destacados)
```

Dos reglas transversales:

- **Lista blanca.** Solo se leen las 28 columnas de esta tabla. Cualquier columna
  extra que añadas a la derecha —costos, proveedor, notas internas— es invisible
  para la web y nunca se publica.
- **Un campo vacío no se pinta.** No hay huecos, ni guiones, ni «no disponible».
  Si no hay dato, el componente entero desaparece.

## 2. Las 28 columnas

Orden exacto en la fila 1:

```
id · slug · modelo · linea · categoria · subcategoria · titulo_web ·
descripcion_corta · descripcion_larga · precio_publico · mostrar_precio ·
imagen_principal · imagen_mobile · galeria_1 · galeria_2 · colores ·
caracteristica_1 · caracteristica_2 · caracteristica_3 · destacado · nuevo ·
cta_label · orden · activo · estado_contenido · ultima_revision · alt_text ·
foco_imagen
```

### Identidad

| Columna | Nivel | Tipo | Ejemplo | Validación y comportamiento |
|---|---|---|---|---|
| `id` | **OBLIGATORIO** | texto ≤40 | `MW-01` | Único y **estable**: no cambiarlo nunca, es la clave con la que se enlazan los colores. Sin `id` la fila se descarta. |
| `slug` | **OBLIGATORIO** | texto ≤80 | `modelo-de-ejemplo` | Solo `a-z`, `0-9` y guiones. Forma la URL de la ficha (`modelo.html?slug=…`). **Debe escribirse explícitamente**: la API pública descarta la fila si falta o no es válido, y no lo genera a partir del nombre. Un slug derivado en silencio cambiaría solo el día que alguien retoque el nombre comercial, rompiendo enlaces ya en circulación. Cambiarlo a mano tiene el mismo efecto. |
| `modelo` | **OBLIGATORIO** | texto ≤120 | `Modelo de ejemplo 150` | Nombre comercial. Sin él la fila se descarta. Es el título por defecto. |

### Clasificación

| Columna | Nivel | Tipo | Ejemplo | Validación y comportamiento |
|---|---|---|---|---|
| `categoria` | **OBLIGATORIO** | lista cerrada | `ciudad` | Solo: `ciudad`, `trabajo`, `deportiva`, `aventura`, `carga`. **Cualquier otro valor descarta la fila.** Alimenta los chips del catálogo. |
| `linea` | RECOMENDADO | texto ≤60 | `Línea de ejemplo` | Familia comercial. Alimenta el filtro «Línea», que se genera solo desde los valores presentes. |
| `subcategoria` | OPCIONAL | texto ≤60 | `` | Hoy solo se usa para la búsqueda por texto. No se muestra. |
| `orden` | RECOMENDADO | entero | `10` | Menor aparece antes. Vacío = 999. Conviene dejar huecos (10, 20, 30…) para poder intercalar sin renumerar. |

### Textos

| Columna | Nivel | Tipo | Ejemplo | Validación y comportamiento |
|---|---|---|---|---|
| `titulo_web` | OPCIONAL | texto ≤120 | `` | Título editorial si debe diferir del nombre comercial. Vacío = se usa `modelo`. |
| `descripcion_corta` | **OBLIGATORIO PARA PUBLICAR** | texto ≤220 | `Una frase que sitúa al modelo.` | Aparece en la tarjeta y bajo el título de la ficha. **Se recorta a 2 líneas** en la tarjeta: escribe frases breves. Un marcador de pendiente (`PENDIENTE`, `por definir`, `TBD`…) **no cuenta como contenido**: el modelo no se publica. Un borrador sí puede existir sin ella. |
| `descripcion_larga` | RECOMENDADO | texto ≤2000 | `Primer párrafo.\n\nSegundo párrafo.` | Solo en la ficha. Los saltos dobles crean párrafos. **El HTML se elimina**: escribe texto plano. |
| `caracteristica_1/2/3` | RECOMENDADO | texto ≤120 | `Rasgo editorial del modelo` | Se muestran las que no estén vacías; con las tres vacías, el bloque desaparece. **No son especificaciones técnicas**: no escribas cifras de potencia, par o consumo que no estén confirmadas. |
| `cta_label` | OPCIONAL | texto ≤40 | `` | Texto del botón. Vacío = «Consultar por este modelo» en la ficha y «Ver modelo» en la tarjeta. |
| `alt_text` | **OBLIGATORIO PARA PUBLICAR** | texto ≤160 | `Motocicleta de ejemplo vista de perfil` | Describe **lo que se ve**, para quien no puede ver la imagen. Sin él —o con un marcador de pendiente— el modelo no se publica. En previsualización se compone uno genérico para poder trabajar. |

### Imágenes

| Columna | Nivel | Tipo | Ejemplo | Validación y comportamiento |
|---|---|---|---|---|
| `imagen_principal` | **OBLIGATORIO para publicar** | ruta | `assets/catalogo/mi-slug/portada.webp` | Sin ella el modelo no debería activarse. Ver §3. |
| `imagen_mobile` | RECOMENDADO | ruta | `assets/catalogo/mi-slug/portada-mobile.webp` | Se usa por debajo de 768px. Si falta, se usa la principal. |
| `galeria_1`, `galeria_2` | OPCIONAL | ruta | `assets/catalogo/mi-slug/galeria-01.webp` | Solo en la ficha. Con las dos vacías no se dibuja tira de miniaturas. |
| `foco_imagen` | OPCIONAL | palabras/% | `center center`, `50% 30%`, `left top` | Punto focal del recorte. Úsalo si el encuadre por defecto corta una rueda o el manillar. Valor inválido = `center center`. |

### Comercial

| Columna | Nivel | Tipo | Ejemplo | Validación y comportamiento |
|---|---|---|---|---|
| `precio_publico` | OPCIONAL | **número** | `` o `9990` | **La celda debe ser numérica** (formato Número, no Texto). Vacío, cero, negativo o texto = no se publica precio. Como texto solo se aceptan formatos sin ambigüedad con punto decimal: `12990.50`, `12,990`, `S/ 12,990.00`. **`12990,50` se rechaza**: no se puede saber si la coma es decimal o de millar. |
| `mostrar_precio` | OPCIONAL | TRUE/FALSE | `FALSE` | El precio necesita **tres condiciones a la vez**: `config.mostrar_precios` global, este `TRUE`, y `precio_publico` válido. Si falta una, el componente entero se oculta — nunca sale `S/ 0` ni «consultar». |
| `colores` | OPCIONAL | lista | `` | Nombres separados por comas. Es solo texto informativo. Las variantes visuales con fotografía viven en `COLORES_MODELO_WEB` (ver `docs/colores-modelo-web.md`); si existen, esta lista deja de mostrarse. |
| `destacado` | OPCIONAL | TRUE/FALSE | `FALSE` | Etiqueta «Destacado», filo superior en la tarjeta y candidatura a la tira de la portada (máx. 4). |
| `nuevo` | OPCIONAL | TRUE/FALSE | `FALSE` | Etiqueta «Nuevo». Puede convivir con `destacado`. |

### Publicación

| Columna | Nivel | Tipo | Ejemplo | Validación y comportamiento |
|---|---|---|---|---|
| `activo` | **OBLIGATORIO** | TRUE/FALSE | `FALSE` | **El interruptor.** `FALSE` = invisible en la web pública; solo se ve en `localhost` con `?preview=1`. |
| `estado_contenido` | **OBLIGATORIO** | lista cerrada | `BORRADOR` | En el libro: `BORRADOR` o `APROBADO`, con validación estricta. El backend acepta además `EN_REVISION` por compatibilidad, y lo trata como no publicable. Valor no reconocido = `BORRADOR`. **Es una decisión humana.** Ver la nota de abajo. |

> ### `estado_contenido` es un campo manual — migrado el 10/08/2026
>
> Hasta esa fecha, esta columna **no la escribía una persona**: era una fórmula
> replicada en las 22 filas que devolvía `BORRADOR`, `REVISAR CONTENIDO` o
> `LISTO PARA WEB`, y **nunca `APROBADO`**, que es el único valor que autoriza la
> publicación. Un modelo completo y activado no habría llegado a publicarse nunca.
>
> No se resolvió aceptando `LISTO PARA WEB` como aprobación: la fórmula solo
> comprobaba cuatro celdas y era automática, así que habría convertido la
> publicación en algo que ocurre solo. **Se retiró la fórmula** y la columna pasó
> a ser manual, con dos valores y lista desplegable que rechaza cualquier otro.
>
> Las 22 filas quedaron en `BORRADOR`. **Aprobar es ahora un acto explícito.**
> Registro completo en
> [plan-migracion-cms-sheets.md](plan-migracion-cms-sheets.md); el análisis que
> lo motivó, en [contraste-sheets-real.md](contraste-sheets-real.md).
| `ultima_revision` | OPCIONAL | texto ≤40 | `2026-08-09` | Trazabilidad editorial. No se muestra en la web. |

> `activo` y `estado_contenido` son independientes en el código, pero **no deben
> serlo en la práctica**: activar contenido sin aprobar es un error que el script
> de auditoría marca como estructural.

## 3. Reglas de las rutas de imagen

Se aceptan **solo rutas relativas del repositorio** que empiecen por `assets/`,
`data/` o `legales/`. Se rechaza todo lo demás:

| Rechazado | Motivo |
|---|---|
| `https://otrositio.com/foto.jpg` | Dominio externo no autorizado |
| `../secreto.png` | Escape de directorio |
| `javascript:` `data:` `file:` `blob:` `about:` | Esquema activo |
| `//cdn.ejemplo.com/x.jpg` | Protocolo-relativa |
| `C:\fotos\moto.jpg` | Ruta de Windows |

Convención de carpetas:

```
assets/catalogo/{slug}/portada.webp          1600 × 1000  (16:10)
assets/catalogo/{slug}/portada-mobile.webp   1280 ×  800  (16:10)
assets/catalogo/{slug}/galeria-01.webp       1600 × 1000  (16:10)
assets/catalogo/{slug}/galeria-02.webp       1600 × 1000  (16:10)
```

Las cuatro en 16:10, también la de celular: la caja de imagen mantiene esa
proporción en todos los anchos de pantalla. Ver
`docs/especificacion-imagenes-catalogo.md` para las medidas del layout real.

Formato WebP. Menos de 250 KB en escritorio y 160 KB en celular.

**Una ruta a un archivo que no existe genera un 404.** Si todavía no hay
fotografía, deja la celda **vacía**: la web dibuja un marcador discreto sin pedir
ningún archivo.

## 4. Qué NO debe entrar en esta hoja

Estas columnas no existen y no deben crearse: la web nunca las leería, y su sola
presencia en una hoja compartida es un riesgo.

- Stock, cantidades, unidades disponibles, chasis, motor, almacén.
- Costos, márgenes, proveedores.
- Teléfonos, correos, nombres de personal, contactos internos.
- Datos de clientes.
- Notas internas que no deban ser públicas.

## 5. Herramientas de comprobación

```bash
node scripts/qa-catalogo.mjs            # resumen y errores
node scripts/qa-catalogo.mjs --detalle  # modelo a modelo
```

Y en el navegador, solo en local:

```
catalogo.html?preview=1            ver también los no publicados
catalogo.html?preview=1&debug=1    panel editorial con lo que falta
```

## Referencias

- `docs/guia-carga-contenido-catalogo.md` — cómo preparar un modelo, paso a paso
- `docs/checklist-modelo-publicable.md` — revisión antes de activar
- `docs/colores-modelo-web.md` — variantes de color (hoja aún no creada)
- `assets/catalogo/LEEME.md` — formatos y pesos de fotografía
