# Buscador del catálogo — «Encuentra la moto para tu camino»

Cómo funciona la experiencia de búsqueda de `catalogo.html`.
**Estado: PROTOTIPO LOCAL FUNCIONAL, pendiente de revisión visual.**
No se ha hecho commit ni push, y el diseño no está cerrado.

---

## Qué resuelve

El catálogo ya tenía filtros: buscador de texto, chips de categoría, selects de
línea y color, orden, panel móvil y sincronización con la URL. Funcionaban, pero
exigían que la persona ya supiera **por qué campo** quería filtrar.

Se añaden dos entradas por delante de esos filtros, sin sustituirlos:

| Camino | Para quién |
|---|---|
| **Ya tengo una moto en mente** | Escribe «Pulsar» y ve sugerencias reales al instante |
| **Ayúdame a elegir** | Responde unas preguntas y el catálogo queda filtrado |

Los filtros de siempre siguen ahí y siguen siendo la referencia. Esto es una
capa de entrada, no un reemplazo.

---

## Los archivos

| Archivo | Qué contiene | ¿Node? |
|---|---|---|
| `assets/js/catalogo/catalogo-finder.js` | **Toda la lógica**: predicado de filtrado, ranking, pasos, tramos de precio, motivos | **Sí** |
| `assets/js/catalogo/catalogo-finder-ui.js` | Solo interfaz: combobox, asistente, resumen | No |
| `assets/js/catalogo/catalogo-app.js` | Rejilla, filtros y **el estado único** | Parcial |
| `assets/css/catalogo.css` §9 | Estilos del buscador | — |
| `catalogo.html` | Un contenedor vacío, `#catalogo-finder` | — |

### Por qué la lógica está separada de la interfaz

Porque así se puede probar. `catalogo-finder.js` no toca el documento: se carga
tal cual en Node y se le hacen preguntas. Las 122 pruebas nuevas de
`scripts/qa-tests.mjs` interrogan al código real, no a una copia.

### Orden de carga

```
catalogo-utils.js → catalogo-schema.js → catalogo-data.js
   → catalogo-finder.js → catalogo-finder-ui.js
   → catalogo-completitud.js → catalogo-debug.js → catalogo-ui.js → catalogo-app.js
```

`catalogo-finder.js` va **antes** que `catalogo-app.js` porque este delega en él
su predicado de filtrado. `index.html` también lo carga —aunque la portada no
filtre— porque la dependencia es real y una que solo falta en una página es la
clase de fallo que aparece meses después.

---

## Una sola fuente de verdad

Este es el punto que gobierna todo lo demás.

```
                    ┌──────────────────────────┐
   buscador ───────▶│                          │
   asistente ──────▶│   filtros                │──▶ rejilla
   chips ──────────▶│   {texto, categoria,     │──▶ URL
   panel lateral ──▶│    linea, color,         │──▶ resumen
   URL ────────────▶│    precio, orden}        │──▶ panel lateral
                    └──────────────────────────┘
                       catalogo-app.js
```

**No hay un segundo objeto de filtros en ninguna parte.** El buscador no guarda
su propio estado: pide cambios y se entera de los ajenos.

```js
NS.app.store.obtener()            // copia de los criterios actuales
NS.app.store.aplicar({ ... })     // valida, escribe, repinta, sincroniza URL
NS.app.store.limpiar()            // vacía criterios y orden
NS.app.store.suscribir(fn)        // avisa tras cada repintado; devuelve la baja
NS.app.store.criterioValido(k, v) // el mismo validador que usa la URL
```

Reglas que esto impone:

- **`obtener()` devuelve una copia.** Escribir en ella no toca nada.
- **`aplicar()` valida contra los datos cargados.** Un criterio que no existe se
  ignora en vez de dejar el catálogo en cero resultados sin explicación.
- **Nunca se disparan eventos `change` falsos** sobre los controles nativos para
  sincronizarlos: reentrarían en los escuchadores y volverían a escribir el
  estado que acaba de cambiar. Se asigna el valor y punto.
- **`coincide()` existe una sola vez**, en `catalogo-finder.js`.
  `catalogo-app.js` lo llama; no lo reimplementa.

Comprobado en el navegador: al aplicar el asistente, **el chip de categoría se
marca solo**; al buscar desde el finder, **el campo del panel lateral se rellena
solo**.

---

## Búsqueda directa

### Ranking

Determinista, sin bibliotecas de búsqueda difusa. De más a menos relevante:

| Puntos | Criterio |
|---|---|
| 70 | Coincidencia exacta con el modelo o el título |
| 60 | El modelo o el título **empieza** por la consulta |
| 50 | Coincidencia exacta con la línea |
| 40 | Alguna **palabra** del modelo empieza por la consulta |
| 30 | Coincidencia parcial en modelo o título |
| 20 | Coincidencia en la línea |
| 10 | Coincidencia en categoría o subcategoría |

Los empates se rompen por `orden` editorial, luego por nombre, luego por
posición. La misma consulta sobre los mismos datos da siempre el mismo orden.

> **El ranking NO reordena el catálogo.** Ordena la lista desplegable de
> sugerencias. La rejilla sigue obedeciendo al selector de orden.

### Comportamiento

- Consulta acotada a **80 caracteres**, sin tildes, sin distinguir mayúsculas.
- **Máximo 6 sugerencias.**
- Retardo de 180 ms: los modelos ya están en memoria, no hay petición ninguna.
- `↓` `↑` mueven, `Enter` confirma, `Escape` cierra, `Tab` sale.
- Elegir una sugerencia **aplica su nombre como búsqueda**; no navega por
  sorpresa.
- Cuando la búsqueda deja **un solo modelo con slug**, aparece un enlace
  «Abrir la ficha de …» **fuera** de la lista: un enlace dentro de un `listbox`
  rompería el patrón.

### Qué NO muestran las sugerencias

Precio (nunca, sin la triple condición), colores no aprobados, campos vacíos, ni
un solo dato técnico. Solo nombre, línea, categoría legible y la etiqueta
«Nuevo» o «Destacado» cuando el dato lo dice.

---

## Asistente guiado

Divulgación progresiva: **una pregunta por pantalla**, nunca un formulario
entero.

| Paso | Pregunta | Aparece si… |
|---|---|---|
| 1 | ¿Dónde la usarás principalmente? | hay **≥ 2** categorías con modelos |
| 2 | ¿Tienes alguna línea en mente? | quedan **≥ 2** líneas entre los candidatos |
| 3 | ¿Hay algún color que prefieras? | hay **≥ 1** variante real en `colors[]` |
| 4 | ¿Qué presupuesto tienes en mente? | hay **≥ 2** tramos derivables |

### La regla que evita los filtros vacíos

Cada paso se calcula **sobre lo que queda tras los anteriores**. Si al elegir
«ciudad» todos los candidatos son de la misma línea, preguntar por la línea no
aporta nada y **el paso desaparece**. Es lo que impide llevar a alguien a cero
resultados y lo que hace que el asistente sea corto de verdad.

Todos los pasos incluyen **«Sin preferencia»** («Todavía no lo sé» en el
primero): nadie tiene que responder algo que no sabe para poder seguir.

### Los usos

Las cinco opciones apuntan **exactamente** a las cinco categorías aprobadas:

```
ciudad     → Ciudad y recorridos diarios
trabajo    → Trabajo y jornada
deportiva  → Manejo deportivo
aventura   → Ruta y aventura
carga      → Carga y transporte
```

No hay «scooter», «naked», «touring» ni «doble propósito»: **no existen en el
contrato**. Un uso sin modelos no se ofrece.

### Presupuesto

Solo aparece si `config.mostrar_precios` está activo **y** hay al menos dos
importes publicables distintos. Los cortes salen de los **propios importes**
(tercios de los valores reales), nunca de cifras redondas inventadas, y los
tramos que quedarían vacíos se descartan.

> **Hoy este paso no aparece nunca**: los 22 modelos tienen la celda de precio
> vacía y `mostrar_precio` en FALSE. Está implementado y probado con fixtures;
> se encenderá solo cuando haya precios aprobados.

### Resultados

Se muestra el recuento **antes** de cerrar, hasta tres ejemplos con el motivo
real de la coincidencia, y un botón «Ver los N modelos».

Los motivos explican, no valoran:

```
Coincide con ciudad y recorridos diarios
Pertenece a la línea Pulsar
Disponible en color Azul
Dentro del presupuesto indicado
```

**Nunca** «la mejor», «ideal para ti», «garantizado» ni «imparcial»: los datos
disponibles no sostienen ninguna de esas afirmaciones. Hay una prueba que falla
si alguna de esas palabras aparece.

---

## URL

Se reutilizan los parámetros que ya existían, más uno nuevo:

```
?q=  &categoria=  &linea=  &color=  &orden=  &precio=
```

`precio` es **nuevo y canónico**: no duplica nada. No se han creado
`busqueda`, `search`, `tipo` ni `finderCategory`.

| Regla | Comportamiento |
|---|---|
| Recargar | Reconstruye el mismo estado |
| Valor desconocido | Se ignora, sin dejar el catálogo en blanco |
| `preview=1`, `utm_*`, cualquier ajeno | **Se conservan** |
| Limpiar | Retira solo los parámetros del catálogo |
| Orden recomendado | **No** se escribe: es el valor por defecto |
| Escritura | `replaceState`. Filtrar no es navegar |

---

## Estados

| Estado | Qué ocurre |
|---|---|
| Cargando | Estado de carga de la rejilla; el buscador aún no se monta |
| **Catálogo público vacío** | **El buscador NO se monta y su contenedor queda oculto** |
| Con modelos | Se monta entero |
| Búsqueda sin resultados | Resumen «Ningún modelo coincide con:» + ver todos + ir a contacto |
| Un solo resultado | Aparece el atajo «Abrir la ficha de …» |
| Endpoint degradado | Aviso propio del catálogo; el buscador funciona sobre el respaldo |
| **Sin JavaScript** | El contenedor está `hidden` en el HTML: no queda ni rastro |
| Sin precios | El paso de presupuesto no existe |
| Sin colores | El paso de color no existe |
| Una sola línea | El paso de línea no existe |
| URL inválida | Se ignora y se limpia |

### Producción hoy

El endpoint responde correctamente **0 modelos publicados**: las 22 filas siguen
en `BORRADOR`, inactivas y sin fotografía. Por tanto, en la web pública:

- **el buscador no aparece en absoluto**;
- no hay un campo que no encuentre nada;
- no hay un botón «Empezar» que lleve a cero resultados;
- no se simula ningún resultado.

Para verlo funcionando hay que usar `?preview=1` **en localhost**, que muestra
los 22 borradores desde el archivo local.

---

## Accesibilidad

| Punto | Cómo |
|---|---|
| Región de búsqueda | `role="search"` con nombre accesible |
| Etiqueta | `<label for>` real; el placeholder es un ejemplo, no la etiqueta |
| Combobox | `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete` + `aria-activedescendant` |
| Sugerencias | `role="listbox"` / `role="option"` con `aria-selected` |
| Anuncio | `role="status"` **solo** cuando cambia el número de sugerencias, no en cada tecla |
| Opciones del asistente | `role="radiogroup"` / `role="radio"` con `aria-checked` |
| Estado seleccionado | Borde, marca de verificación **y** `aria-checked`; nunca solo color |
| Diálogo | `role="dialog"` + `aria-modal` **solo en móvil**, donde de verdad es modal |
| Escape | Cierra sugerencias y asistente |
| Foco | Vuelve al botón que abrió; si ese nodo no sirve, al botón «Empezar» |
| Objetivos táctiles | 44 × 44 px o más |
| Movimiento | Respeta `prefers-reduced-motion` al desplazar |

### Por qué el diálogo solo es diálogo en móvil

En escritorio el asistente es una **región integrada en la página**: el
contenido de detrás sigue siendo accesible. Declararlo `aria-modal` sería
mentirle al lector de pantalla. Los roles se ponen y se quitan al cruzar el
punto de corte.

---

## Seguridad

- Todo se crea con `U.el()` y se inserta con `textContent`. **Cero `innerHTML`.**
- Sin `eval`, sin `new Function`, sin `document.write`.
- Los slugs se validan con `U.slugValido()` antes de construir un enlace.
- Los hexadecimales pasan por `U.hexColor()`; uno inválido se descarta y la
  opción sigue siendo utilizable por su nombre.
- **No se guarda nada**: ni `localStorage`, ni cookies, ni `IndexedDB`, ni
  perfiles, ni localización.
- Sin telemetría y sin peticiones nuevas: los modelos ya están en memoria.
- El buscador **no toca la puerta de publicación**. No llama a `esPublicable`
  ni la modifica: filtra sobre lo que el esquema ya dejó pasar.

Hay pruebas que fallan si cualquiera de estos puntos se rompe.

---

## Límites actuales

**El buscador solo puede usar lo que existe hoy**: `modelo`, `titulo_web`,
`linea`, `categoria`, `subcategoria`, `colors[]` y el precio cuando es
publicable.

No hay cilindrada, potencia, transmisión, frenos, ABS, peso ni altura de
asiento — **y no se inventan**. El plan para incorporarlos, cuando existan como
datos aprobados, está en
[plan-filtros-tecnicos-futuro.md](plan-filtros-tecnicos-futuro.md).

---

## Cómo probarlo

```bash
node scripts/qa-tests.mjs        # incluye 122 pruebas del buscador
node --check assets/js/catalogo/catalogo-finder.js
node --check assets/js/catalogo/catalogo-finder-ui.js
```

En el navegador, con un servidor local:

```
catalogo.html                    → producción: sin modelos, sin buscador
catalogo.html?preview=1          → los 22 borradores y el buscador completo
catalogo.html?preview=1&debug=1  → además el panel editorial
```

---

## Referencias

- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — qué hace que un modelo se vea
- [catalogo-modelos-web.md](catalogo-modelos-web.md) — las 28 columnas
- [contrato-sheets-frontend.md](contrato-sheets-frontend.md) — qué consume el frontend
- [plan-filtros-tecnicos-futuro.md](plan-filtros-tecnicos-futuro.md) — la ampliación propuesta
