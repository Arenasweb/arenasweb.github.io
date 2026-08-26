# Recepción del contenido real — carga en lote

Cómo pasar de «tenemos las fichas del fabricante y las fotos» a «los modelos
están publicados», sin inventar un solo dato y sin publicar nada por accidente.

**Estado: PREPARADO. No se ha cargado ningún modelo.** Las 22 motocicletas
siguen en `BORRADOR`, inactivas y sin fotografía.

---

## 1. Por qué hay un paso antes de Google Sheets

La tentación es escribir directamente en `MODELOS_WEB`. No conviene, por una
razón práctica: **corregir un error cuesta muy distinto según dónde se detecte.**

```
en la ficha de recepción   → una celda
en Google Sheets           → una celda, más rehacer el volcado y el QA
después de convertir fotos → una celda, el volcado, y 4 fotografías por modelo
```

Por eso el recorrido tiene una parada intermedia: una hoja de trabajo que se
valida **antes** de tocar nada.

```
ficha del fabricante
      ↓
FICHA DE RECEPCIÓN  ←  se valida aquí
      ↓
conversión de fotografías
      ↓
MODELOS_WEB  (Google Sheets)
      ↓
QA del catálogo
      ↓
aprobar  →  activar
```

---

## 2. La plantilla

`docs/plantilla-recepcion-modelos.csv` — 27 columnas, sin ninguna fila.

Se rellena una fila por motocicleta. **Una celda vacía es una respuesta
válida**: significa «no verificado», y el validador la respeta.

### Identidad y clasificación

| Columna | Qué es | Obligatoria |
|---|---|---|
| `accion` | `nuevo` o `actualizar`. Ver §3 bis | **si el modelo ya existe** |
| `modelo` | Nombre comercial exacto, como lo escribe el fabricante | **sí** |
| `linea` | Familia: Pulsar, Boxer, Dominar, Torito… | no |
| `categoria` | Solo: `ciudad` · `trabajo` · `deportiva` · `aventura` · `carga` | **sí** |
| `ficha_oficial` | De dónde sale la especificación: archivo, PDF o referencia | **si hay especificaciones** |

> `id` y `slug` **no** están en la plantilla: se derivan del nombre
> (`Pulsar 180 Neon` → `pulsar-180-neon` → `moto-pulsar-180-neon`). El validador
> los calcula igualmente para detectar choques antes de que existan.

### Especificaciones — todas opcionales

| Columna | Unidad | Rango admitido |
|---|---|---|
| `cilindrada_cc` | cm³ | 50 – 2000 |
| `potencia_hp` | HP | 1 – 300 |
| `torque_nm` | N·m | 1 – 300 |
| `numero_marchas` | — | 1 – 8 |
| `capacidad_tanque_l` | L | 2 – 30 |
| `peso_kg` | kg | 50 – 500 |

Los rangos **no son verdades del fabricante**: son cotas para cazar una errata
de tecleo —un `1250` donde iba `125`—. Un valor fuera de rango se señala para
que una persona lo mire; nunca se corrige solo.

| Columna | Valores admitidos |
|---|---|
| `refrigeracion` | `aire` · `aceite` · `liquida` · `aire/aceite` |
| `sistema_combustible` | `carburador` · `inyeccion` |
| `transmision` | `manual` · `automatica` · `semiautomatica` |
| `freno_delantero` · `freno_trasero` | `disco` · `tambor` |
| `abs` | `sí` · `no` · **vacío = no verificado** |

### Comercial y fotografías

| Columna | Nota |
|---|---|
| `colores` | Nombres separados por comas. Vacío = no registrado |
| `precio_publico` | Punto decimal: `12990.50`. **`12990,50` se rechaza** por ambiguo |
| `mostrar_precio` | `sí`/`no`. Pedir mostrarlo sin precio es un error |
| `destacado` · `nuevo` | `sí`/`no`. Vacío = no |
| `imagen_principal_origen` | Ruta a la foto **original**, antes de convertir |
| `imagen_mobile_origen` | Ídem para la variante de celular. **También horizontal 16:10** (1280 × 800): la caja de imagen mantiene esa proporción en todos los anchos |
| `galeria_1_origen` · `galeria_2_origen` | Opcionales |
| `observaciones` | Notas para quien carga. No se publica |

---

## 3. Un hueco no es un «no»

Es la regla que gobierna todo este proceso y la más fácil de romper sin darse
cuenta:

| Celda vacía | Significa | **NO** significa |
|---|---|---|
| `abs` | no verificado | «no tiene ABS» |
| `precio_publico` | precio oculto | precio cero |
| `colores` | no registrado | «un solo color» |
| `potencia_hp` | no verificado | «sin potencia declarada» |

Si el catálogo publicara «ABS: no» en veinte motos porque nadie comprobó el
dato, estaría **afirmando algo que nadie verificó**. Eso es inventar un dato con
forma de ausencia.

El validador lo anota en voz alta, en el bloque **AUSENCIAS REGISTRADAS**, para
que nadie convierta un hueco en un «no» al pasar a la hoja.

---

## 3 bis. Alta o actualización — hay que decirlo

**Las 22 motocicletas ya existen** en `MODELOS_WEB`. Un lote no siempre crea
filas nuevas: la mayor parte del trabajo de la Fase 4 es **completar filas que
ya están ahí** con sus especificaciones y sus fotografías.

Por eso la columna `accion` es explícita:

| Valor | Significa |
|---|---|
| `nuevo` | Es una motocicleta que **no está** en el catálogo. Se crea una fila |
| `actualizar` | Ya existe. Se **modifican** las celdas de su fila, conservando `id` y `slug` |
| *(vacío)* | Solo admisible si el modelo no existe. Si existe, el validador **se detiene** |

Dejarlo vacío sobre un modelo que ya existe **bloquea a propósito**: escribir
encima de una ficha ya cargada no puede ocurrir por omisión. Hay que declararlo.

### Qué comprueba la reconciliación

El validador compara el lote contra el catálogo actual
(`data/catalogo-publico.local.json`, o el que se indique con
`--identidades`) y bloquea si:

- se declara `nuevo` y el modelo **ya existe** — un alta no puede colisionar;
- se declara `actualizar` y **no existe** — no hay nada que actualizar;
- una actualización **cambiaría el slug** — rompería los enlaces ya compartidos;
- la acción es desconocida.

> **Se compara por `slug` y por nombre, no por `id`.** El archivo local usa
> identificadores propios (`MW-01`…) que **no son** los del libro real
> (`moto-…`); los slugs, en cambio, coinciden, y son lo que gobierna la URL.
> Comparar ids daría choques falsos.

**Una actualización conserva el `id` y el `slug` actuales.** No se recalculan
desde el nombre: si el nombre comercial cambia, la URL no cambia con él, porque
esa URL ya puede estar compartida.

---

## 4. Validar el lote

```bash
node scripts/qa-lote-catalogo.mjs lote.csv
node scripts/qa-lote-catalogo.mjs lote.csv --detalle
node scripts/qa-lote-catalogo.mjs lote.csv --assets D:\fotos-origen
node scripts/qa-lote-catalogo.mjs lote.json --json
```

Acepta **CSV o JSON**. Las rutas de foto relativas se resuelven junto al propio
archivo del lote, salvo que se indique otra base con `--assets`.

En JSON se validan las claves de **todas** las filas, no solo las de la primera:
un campo prohibido que apareciera en la fila 17 se detecta igual. Cada fila debe
ser un objeto de la ficha; una cadena, un número o un array se rechazan. Un JSON
sin filas es **uso inválido**, no un lote apto.

| Comprueba | |
|---|---|
| **Identidad** | Modelos, ids y slugs duplicados · slug con formato inválido · nombre provisional |
| **Taxonomía** | Categoría fuera de las cinco aprobadas |
| **Procedencia** | Especificaciones sin `ficha_oficial` |
| **Rangos** | Los seis campos numéricos, fuera de cota |
| **Listas cerradas** | Refrigeración, combustible, transmisión, frenos |
| **Precios** | Ambiguos (`12990,50`), cero, negativos, texto, o pedir mostrar sin dato |
| **Fotografías** | Que existan · formato · resolución mínima · proporción · tamaño |
| **Texto alternativo** | Provisional o demasiado corto, si viene la columna |
| **Publicación** | Cualquier `APROBADO` · cualquier intento de activar |
| **Reconciliación** | Alta que colisiona · actualización inexistente · cambio de slug |
| **Estructura** | Comillas sin cerrar · filas con más o menos celdas que encabezados |
| **Campos prohibidos** | Stock, chasis, costos, proveedores, datos de cliente — en la cabecera **o en cualquier fila** |

**Salida:** `0` el lote se puede cargar · `1` hay bloqueantes · `2` uso inválido.

El validador **no escribe nada**: ni en Google Sheets, ni en `assets/`, ni en
los datos del catálogo. Hay una prueba que lo verifica.

### Está probado contra lotes hostiles

```bash
node scripts/qa-lote-tests.mjs      # 80 comprobaciones
```

Comprueba que bloquea lo que debe **y que no se alarma con ausencias
legítimas**, que es el error contrario y el más caro aquí.

Cada prueba exige que el bloqueo llegue **por su propia regla**: si la fila
produce más de un bloqueante, la prueba falla salvo que se declare la
combinación y su motivo. Una auditoría independiente encontró comprobaciones que
pasaban por un fallo secundario, y eso da confianza falsa sobre la regla que se
creía probada.

---

## 5. Convertir las fotografías

Las medidas y el encuadre están en
[especificacion-imagenes-catalogo.md](especificacion-imagenes-catalogo.md), con
las mediciones del layout de las que salen. Aquí va el **cómo**.

| | Escritorio | Móvil |
|---|---|---|
| Medida | **1600 × 1000** | **1280 × 800** |
| Proporción | 16:10 | 16:10 |
| Formato | WebP | WebP |
| Peso objetivo | **< 250 KB** | < 160 KB |

### Con `cwebp` (línea de comandos)

`cwebp` viene en las *WebP utilities* de Google. No se instala en el
repositorio: es una herramienta del equipo, no una dependencia del proyecto.

```bash
# 1. Recortar a 16:10 y redimensionar (ImageMagick)
magick original.jpg -resize 1600x1000^ -gravity center -extent 1600x1000 paso1.png

# 2. Convertir a WebP con calidad 82
cwebp -q 82 paso1.png -o portada.webp

# 3. La versión de móvil, desde el mismo original
magick original.jpg -resize 1280x800^ -gravity center -extent 1280x800 paso2.png
cwebp -q 82 paso2.png -o portada-mobile.webp
```

Si `portada.webp` supera 250 KB, bajar la calidad de 82 a 78 y volver a medir.
Por debajo de 70 empiezan a verse artefactos en los degradados del depósito.

### Sin línea de comandos

Squoosh (de Google) funciona en el navegador y no sube nada a ningún servidor:
se recorta a 16:10, se elige WebP, se ajusta la calidad mirando el peso y se
descarga. Es más lento para 88 fotografías, pero no requiere instalar nada.

### El recorte es lo que más se estropea

Redimensionar a 16:10 desde una foto 4:3 **recorta arriba y abajo**; desde una
16:9, recorta a los lados. Hay que mirar cada resultado:

- **Nunca deformar.** Estirar la moto para que quepa es peor que recortar.
- **No cortar** rueda delantera, rueda trasera, manillar, espejos ni cola.
- Dejar aire alrededor: la tarjeta aplica `object-fit: cover` y puede comerse
  unos píxeles más en algunos anchos.
- Si la moto no cabe en 16:10 sin cortar algo, **volver a fotografiarla** es más
  barato que publicar una foto mal recortada.

### Comprobar el resultado

```bash
node scripts/qa-assets-catalogo.mjs --detalle
```

Mide cada archivo: dimensiones, proporción, peso y formato. Y detecta
huérfanos: fotos que no corresponden a ningún modelo.

---

## 6. Dónde va cada archivo

Las **22 carpetas ya existen** y sus nombres coinciden exactamente con los slugs
del catálogo (verificado). Solo hay que dejar los archivos dentro:

```
assets/catalogo/{slug}/portada.webp           1600 × 1000
assets/catalogo/{slug}/portada-mobile.webp    1280 ×  800
assets/catalogo/{slug}/galeria-01.webp        1600 × 1000   (opcional)
assets/catalogo/{slug}/galeria-02.webp        1600 × 1000   (opcional)
```

Cuando una motocicleta tenga **variantes de color con fotografía propia**:

```
assets/catalogo/{slug}/general/               fotos que no dependen del color
assets/catalogo/{slug}/{color}/portada.webp
assets/catalogo/{slug}/{color}/portada-mobile.webp
```

> **Las carpetas de color NO se crean por adelantado.** La regla del proyecto es
> que una carpeta vacía es ruido: se crea cuando hay una fotografía que meter
> dentro. Y la hoja `COLORES_MODELO_WEB` todavía no existe ni está autorizada
> ([colores-modelo-web.md](colores-modelo-web.md)).

**Una ruta a un archivo que no existe genera un 404.** Si todavía no hay
fotografía, la celda se deja **vacía**: la web dibuja un marcador discreto sin
pedir ningún archivo.

---

## 7. Carga de prueba, y cómo deshacerla

Antes de tocar las 22, conviene probar el recorrido entero con **una sola
motocicleta**.

### Prueba

```bash
# 1. Una fila en el lote, con su fotografía de origen
node scripts/qa-lote-catalogo.mjs lote-prueba.csv --detalle

# 2. Convertir la fotografía y dejarla en assets/catalogo/{slug}/
node scripts/qa-assets-catalogo.mjs --detalle

# 3. Escribir la fila en MODELOS_WEB, con estado BORRADOR y activo FALSE
#    (a mano, en Google Sheets)

# 4. Exportar la hoja a CSV y auditarla
node scripts/qa-verificar-migracion.mjs modelos.csv

# 5. Mirarla en el navegador, sin publicar nada
#    http://localhost:5556/catalogo.html?preview=1
#    http://localhost:5556/catalogo.html?preview=1&debug=1
```

En el paso 5 la motocicleta aparece rotulada como **sin publicar**. La
previsualización solo funciona en `localhost`: en producción el parámetro se
ignora, así que **nada de esto llega al público**.

### Deshacer

| Qué se hizo | Cómo se deshace |
|---|---|
| **Fila NUEVA** (`accion=nuevo`) | Borrar la fila. Nunca estuvo publicada: nació en `BORRADOR` e inactiva |
| **Fila ACTUALIZADA** (`accion=actualizar`) | **Restaurar los valores anteriores de esas celdas.** No se borra la fila: ya existía antes del lote y borrarla perdería el modelo |
| Fotografías copiadas a `assets/` | Borrar los archivos. La celda de imagen vuelve a vacía y la web dibuja el marcador |
| Nada más | El validador no escribe; el QA tampoco |

> **Solo una fila realmente nueva puede eliminarse al revertir.** Las 22
> motocicletas existentes se actualizan, no se recrean: si se borrase una por
> error, se perderían su `id`, su `slug` y todo lo cargado antes.
>
> Antes de un lote de actualización conviene **duplicar la pestaña
> `MODELOS_WEB`** —igual que se hizo antes de la migración de 3.3C—: es la
> forma barata de poder restaurar valores anteriores celda a celda.

**No hay nada que revertir en producción**, porque en ningún momento se publicó
nada: `activo` sigue en `FALSE` durante todo el recorrido de prueba. Publicar
exige dos decisiones humanas posteriores y separadas —aprobar, y después
activar—, y ninguna de las dos ocurre por cargar contenido.

Si algo saliera mal después de publicar, la vuelta atrás está en
[reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md): desmarcar
`activo` retira el modelo de inmediato, sin tocar código.

---

## 8. Qué NO hace este proceso

- **No amplía el contrato público.** Las especificaciones técnicas se recogen y
  se validan, pero **no se publican todavía**: `MODELOS_WEB` sigue con sus 28
  columnas. La ampliación es una decisión aparte
  ([plan-filtros-tecnicos-futuro.md](plan-filtros-tecnicos-futuro.md)).
- **No crea hojas.** Ni `ESPECIFICACIONES_MODELO_WEB` ni `COLORES_MODELO_WEB`.
- **No aprueba ni activa.** Ninguna herramienta de este repositorio puede
  publicar una motocicleta.
- **No inventa nada.** Sin ficha del fabricante, la celda se queda vacía.

---

## Referencias

- [plantilla-recepcion-modelos.csv](plantilla-recepcion-modelos.csv) — la plantilla
- [especificacion-imagenes-catalogo.md](especificacion-imagenes-catalogo.md) — medidas y encuadre
- [pipeline-fotografias.md](pipeline-fotografias.md) — el recorrido de una fotografía
- [lotes-carga-22-modelos.md](lotes-carga-22-modelos.md) — en qué orden cargar
- [guia-carga-contenido-catalogo.md](guia-carga-contenido-catalogo.md) — cómo rellenar la hoja
- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — qué hace que un modelo se vea
