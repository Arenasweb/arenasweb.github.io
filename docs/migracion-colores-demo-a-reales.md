# De los colores de prueba a los colores reales

Hoy el selector de color funciona con un fixture de **demostración**. Este
documento explica cómo se sustituye por datos comerciales sin romper nada y sin
que el material de prueba pueda escaparse jamás a producción.

**Nada de esto se ejecuta todavía.** La hoja `COLORES_MODELO_WEB` no existe.

---

## Qué hay hoy

`data/catalogo-colores-demo.local.json` — **14 variantes**, todas marcadas
`_origen: "demo-local"` y con el nombre empezando por `DEMO`.

| Modelo | Variantes | Para qué sirven |
|---|---|---|
| `MW-10` Pulsar 180 Neon | 5 | Caso normal: varios colores, muestras, cambio de foto, enlace directo |
| `MW-11` Pulsar 200 NS UG2 | 2 | El mínimo para que aparezca un selector |
| `MW-05` Boxer BM150X Disc | 1 | Un solo color: se rotula, no se dibujan muestras |
| `MW-13` | 5 | Casos límite: inactivo, borrador, sin imagen, ruta insegura, escape de directorio |
| `MW-NO-EXISTE` | 1 | Huérfano: apunta a un modelo que no existe |

Las cinco de `MW-10` cubren además el **hex inválido**: una de ellas trae
`rojo brillante; background:url(x)` en la columna del color — un intento de
inyección de CSS. El validador lo rechaza, la muestra cae a un relleno neutro con
una marca diagonal, y **el color sigue siendo utilizable por su nombre**.

Las fotografías son portadas editoriales reutilizadas. **No son fotos de producto
y no representan colores comerciales reales.**

---

## Las dos barreras que lo contienen

**1. Nunca se pide el archivo.** `catalogo-data.js` solo solicita el fixture si
`previewActivo()` es cierto, y eso exige `?preview=1` **y** estar en `localhost`.
En GitHub Pages no se pide nunca: no hay petición, no hay datos.

**2. El dato se rechaza a sí mismo.** Aunque esas filas llegaran por otra vía,
`normalizarColor()` descarta cualquier registro con `_origen: "demo-local"`
fuera de previsualización — **aunque venga con `activo=TRUE` y `APROBADO`**.

La segunda barrera existe precisamente porque la primera depende de por dónde
entró el dato; la marca, en cambio, viaja **dentro** del dato.

Comprobado en `scripts/qa-tests.mjs` (grupo 7).

---

## La migración, paso a paso

### 1. Crear la hoja

`COLORES_MODELO_WEB`, 15 columnas. Contrato completo en
[colores-modelo-web.md](colores-modelo-web.md). Una fila = un color de un modelo.
Se une a `MODELOS_WEB` por `modelo_id` → `id`.

### 2. Las fotografías, primero

Cada variante necesita **su propia fotografía**. Una variante sin
`imagen_principal` **se descarta**: el propósito del selector es cambiar la foto
al elegir un color, y aceptar una fila sin foto llevaría a mostrar la de otro
color como si fuera la elegida.

Convención de carpetas:

```
assets/catalogo/pulsar-180-neon/
    general/            fotos que no dependen del color
    negro/portada.webp
    azul/portada.webp
```

Mismas medidas que la portada: 1600 × 1000 (16:10).

### 3. Rellenar la hoja

Con `activo = FALSE` y `estado_aprobacion = BORRADOR` al principio. Se aprueban
después de verlas.

### 4. Conectar el origen

En `catalogo-data.js`, la carga de colores pasa a leer del origen real en lugar
del fixture. **`rutaColoresDemo` y su gate se conservan**: siguen sirviendo para
QA local.

### 5. Comprobar y aprobar

```bash
node scripts/qa-catalogo.mjs
node scripts/qa-assets-catalogo.mjs --detalle
node scripts/qa-tests.mjs
```

Y en el navegador, `?preview=1`: que el selector cambie la foto, que el enlace
directo `?color=...` abra en el color correcto, que las muestras se distingan
entre sí.

### 6. Retirar el fixture — al final del todo

Solo cuando haya colores reales publicados y verificados.

---

## Qué NO hay que hacer

- **No borrar el fixture todavía.** Es el único material que ejercita los casos
  límite. Sin él no hay forma de probar un hex inválido o una ruta insegura sin
  ensuciar datos reales.
- **No quitar el gate de `previewActivo()`.** Es la primera barrera.
- **No quitar la comprobación de `_origen`.** Es la segunda.
- **No renombrar los colores DEMO** para que parezcan reales. El prefijo `DEMO`
  es deliberado: cualquiera que los vea sabe al instante que no son comerciales.
- **No reutilizar las portadas editoriales** como fotos de color. Son imágenes de
  categoría, en 16:9, y ya se usan en la portada del sitio.
- **No inventar códigos de color.** El `hex_color` debe corresponder al color real
  de la moto; si no se conoce, se deja vacío y la muestra queda neutra. Un color
  equivocado en la muestra es peor que ninguna muestra.

---

## Qué código sobrevive sin cambios

Todo el de presentación. El selector, el cambio de foto, el enlace directo, la
precarga acotada, la cancelación de cambios rápidos y las muestras funcionan
igual con datos reales que con el fixture: **leen el mismo contrato**.

Lo único que cambia es de dónde vienen las filas.

---

## Referencias

- [colores-modelo-web.md](colores-modelo-web.md) — las 15 columnas
- [contrato-sheets-frontend.md](contrato-sheets-frontend.md) — qué consume el frontend
- [especificacion-imagenes-catalogo.md](especificacion-imagenes-catalogo.md) — medidas
