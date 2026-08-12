# Backend v2 del catálogo — DESPLEGADO Y VALIDADO

Endpoint de solo lectura que publica, ya filtrado, el contenido aprobado de
`MODELOS_WEB`.

> **Estado del 11/08/2026.** Los tres `.gs` auditados están desplegados como Web
> App de solo lectura. La Script Property está configurada, el endpoint real y
> CORS pasaron sus pruebas, y el frontend del árbol de trabajo quedó en remoto
> con fallback local. Falta publicar el commit y repetir el QA en producción.
> La URL `/exec` no se repite aquí: su único origen versionado es
> `CONFIG.appsScriptEndpoint` en `catalogo-data.js`.

> ### Este paquete SÍ se versiona (desde el 11/08/2026)
>
> Los tres `.gs` y este README están **dentro de Git**. El paquete anterior
> —`Code.gs`, `Schema.gs`, `Seguridad.gs` y el `Endpoint.gs` de la raíz— sigue
> ignorado: no se despliega, no se mantiene y no debe copiarse.
>
> El motivo: desplegar código cuyo fuente no está versionado deja un sistema en
> producción sin origen recuperable. No hay secretos que lo impidan — el
> identificador del libro vive en una Script Property, nunca en el código.
>
> Análisis completo en `docs/decision-versionado-apps-script-v2.md`.
>
> **Consecuencia práctica:** un `.gs` **nuevo** en esta carpeta nace *ignorado*
> hasta que se añada a mano al `.gitignore`. Es una lista blanca a propósito, y
> la guarda pre-despliegue avisa si aparece un archivo que no esté en el
> contrato.

> ### Antes de cualquier despliegue, pasar la guarda
>
> ```bash
> node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID del libro>"
> ```
>
> Comprueba físicamente este paquete: los tres archivos y ninguno más, **un solo
> `doGet`**, cero `doPost`, cero APIs de escritura, cero secretos, cero rastros
> del backend anterior, versiones coherentes con el frontend, y las huellas
> SHA-256 para confirmar después que lo pegado en el editor es esto.
>
> La guarda está probada contra 28 paquetes hostiles:
> `node scripts/qa-predeploy-tests.mjs`.
>
> El procedimiento completo, con criterios de aborto y vuelta atrás, está en
> `docs/runbook-deploy-apps-script-v2.md`.

---

## Por qué existe una v2

El archivo `apps-script/Code.gs` lee **`CATALOGO_PUBLICO`**, una hoja de 44
columnas con especificaciones técnicas, stock y promociones. El frontend
actual lee **`MODELOS_WEB`**, de 28 columnas, sin nada de eso. Son dos
contratos distintos: no es que falten campos, es que hablan de cosas
diferentes.

Reconciliar significó reescribir el backend contra el contrato que el
frontend realmente consume.

### ⚠️ Solo puede haber una generación a la vez

Apps Script concatena **todos** los `.gs` del proyecto en un mismo ámbito
global. Si `Code.gs` y `v2/Endpoint.gs` conviven, habrá **dos definiciones de
`doGet`** y ganará la última cargada, en silencio y sin ningún aviso.

Al desplegar hay que **sustituir**, no añadir.

---

## Los tres archivos

| Archivo | Qué hace | ¿Se puede probar en Node? |
|---|---|---|
| `Configuracion.gs` | Constantes: hojas, whitelists, taxonomía | Sí |
| `Nucleo.gs` | Toda la lógica: normalizar, filtrar, decidir | **Sí** |
| `Endpoint.gs` | Leer hojas, caché, servir JSON | No |

Esta separación es deliberada. `Nucleo.gs` **no contiene ni una llamada** a
`SpreadsheetApp`, `CacheService`, `ContentService`, `Logger` ni `Utilities`,
así que se carga tal cual en Node y se le hacen preguntas antes de desplegar
nada. Toda la parte que decide qué llega al público es comprobable en local.

`Endpoint.gs` es deliberadamente tonto: lee, cachea, sirve. No toma ninguna
decisión de negocio.

---

## De dónde sale el libro

`PropertiesService.getScriptProperties().getProperty('ARENAS_CATALOGO_SPREADSHEET_ID')`
y después `SpreadsheetApp.openById(...)`.

**El valor no está en el repositorio.** Se configura a mano, una vez, en el
proyecto de Apps Script:

```
Configuración del proyecto → Propiedades del script → Añadir propiedad

  Propiedad:  ARENAS_CATALOGO_SPREADSHEET_ID
  Valor:      [el identificador del Google Sheet real]
```

Si la propiedad falta, está vacía o `openById` falla, la API responde
`ok:false` con `error: "backend_no_configurado"` y **no publica nada**. No hay
respaldo silencioso.

> **Esto es la corrección del hallazgo crítico de la auditoría.** Antes se usaba
> `SpreadsheetApp.getActiveSpreadsheet()`, que devuelve el libro contenedor
> cuando el script se ejecuta desde el editor pero **`null` en una Web App
> independiente**. El resultado habría sido un endpoint que funciona al
> probarlo y falla en cuanto se despliega. Reproducido y corregido; hay pruebas
> que ejecutan `doGet` con dobles y fallan si alguien reintroduce
> `getActiveSpreadsheet` como respaldo.

---

## Cómo se prueba

```bash
node scripts/qa-api-catalogo.mjs        # 376 pruebas: contrato y lógica
node scripts/qa-endpoint-catalogo.mjs   #  59 pruebas: infraestructura del endpoint
node scripts/qa-api-catalogo.mjs --json         # el JSON público que saldría
node scripts/qa-api-catalogo.mjs --json --real  # con los 22 modelos reales
```

Son dos scripts porque son dos cosas distintas, y confundirlas costó un fallo
crítico: `qa-api-catalogo.mjs` comprueba `Nucleo.gs`, que es lógica pura;
`qa-endpoint-catalogo.mjs` **ejecuta `Endpoint.gs`** con dobles de
`SpreadsheetApp`, `PropertiesService`, `CacheService`, `ContentService` y
`Logger`, y llama a `doGet(e)` como lo haría Google. Probar el núcleo no
equivale a probar el endpoint.

También se auditan a sí mismos: fallan si alguien introduce `eval`, `doPost`,
`setValue`, `UrlFetchApp`, escritura de propiedades, un identificador literal,
una URL de despliegue, un parámetro de previsualización o un segundo `doGet`.

**Lo que sigue sin poder probarse en Node**: el comportamiento real de
`SpreadsheetApp` contra un libro de verdad, el TTL efectivo de `CacheService`,
la cabecera que emite `ContentService` y CORS. Por eso `Endpoint.gs` no
contiene ninguna regla de negocio.

---

## Reglas que implementa

**Publicación.** `activo = TRUE` **Y** `estado_contenido = APROBADO`. Las dos.
No existe ningún parámetro que se salte esto: no hay `?preview` ni `?debug` del
lado del servidor.

**Mínimos publicables.** Además de aprobar y activar, el modelo debe tener
`imagen_principal` utilizable, `alt_text` y `descripcion_corta`. Sin los tres no
se emite. Aprobar expresa una intención; esto comprueba que el contenido esté a
la altura. **No** entran aquí precio, colores, galería, características ni
descripción larga: son opcionales.

**Hojas ambiguas.** Un encabezado repetido invalida la hoja entera. No «gana el
primero» ni «gana el último»: con
`activo | estado_contenido | activo | estado_contenido` una fila podía publicar
justo lo contrario de lo que decían sus columnas reales. Lo mismo con una clave
repetida en `CONFIG_PUBLICA`, que llegó a encender los precios de todo el
catálogo. Ahora cae al valor por defecto, que siempre es el restrictivo.

**Identidades ambiguas.** Dos filas que se disputan un `id` o un `slug`: no se
publica ninguna de las dos. Con «gana la primera» bastaba pegar una fila más
arriba para cambiar qué moto vive en una URL.

**Lista blanca.** Solo salen las columnas declaradas en `CAMPOS_MODELO`. Una
columna nueva en la hoja no se publica sola, aunque alguien la añada mañana.

**Precio.** Debe ser una **celda numérica**. Como texto se aceptan solo formatos
sin ambigüedad con punto decimal (`12990.50`, `S/ 12,990.00`). `12990,50` se
rechaza: no se puede saber si son doce mil novecientos noventa con cincuenta o
un millón doscientos noventa y nueve mil cincuenta, y antes se publicaba como lo
segundo.

**Precio.** El importe viaja solo si se cumplen las tres condiciones:
`mostrar_precios` global, `mostrar_precio` de la fila e importe positivo. Si
falta una, el campo **no se incluye** — un precio que no debe verse no tiene
por qué llegar al navegador.

**Stock.** No hay ninguna columna de stock en la whitelist. No es una bandera
que se pueda encender: sencillamente no existe la vía.

**Categorías.** Se leen de la hoja `CATEGORIAS` con su columna `activo`. No hay
ninguna lista fija de categorías publicables en el código. Un modelo cuya
categoría no esté activa **no se publica**: dejarlo visible sin chip para
filtrarlo y con la etiqueta en crudo es peor que no mostrarlo.

**Colores.** `COLORES_MODELO_WEB` es opcional. Si la hoja no existe, el
catálogo se publica con `colores: []`. Una variante sin `imagen_principal`
utilizable se descarta.

**Mapeo por nombre.** Las columnas se identifican por su encabezado, no por su
posición: reordenar dos columnas en la hoja es inocuo.

---

## Despliegue — procedimiento y estado actual

0. **Comprobar el paquete antes de nada:**
   ```bash
   node scripts/qa-api-catalogo.mjs && node scripts/qa-endpoint-catalogo.mjs
   ```
   Entre otras cosas verifica que el paquete define **exactamente un `doGet`**,
   ningún `doPost` y ningún rastro del backend antiguo.
1. **Copia de seguridad.** En el editor de Apps Script, guardar el contenido
   actual de `Code.gs`, `Endpoint.gs`, `Schema.gs` y `Seguridad.gs` fuera del
   proyecto. Anotar la URL del despliegue vigente si existe.
2. **Sustituir, no añadir.** Borrar del proyecto los archivos de la generación
   anterior y pegar **solo estos tres**:

   | Copiar | No copiar |
   |---|---|
   | `v2/Configuracion.gs` | `Code.gs` |
   | `v2/Nucleo.gs` | `Endpoint.gs` (legacy) |
   | `v2/Endpoint.gs` | `Schema.gs` · `Seguridad.gs` |

   Después, en el editor: buscar `function doGet` y comprobar que aparece
   **una sola vez**.
3. **Configurar el libro.** *Configuración del proyecto → Propiedades del
   script*, añadir `ARENAS_CATALOGO_SPREADSHEET_ID` con el identificador del
   Sheet real. Sin esto la API responde `backend_no_configurado`.
4. **Prueba interna.** Ejecutar `limpiarCache()` desde el editor y revisar el
   registro. Sin excepciones.
5. **Despliegue.** *Implementar → Nueva implementación → Aplicación web*.
   Ejecutar como: **yo**. Con acceso: **cualquier usuario**.
6. **Obtener la URL** `/exec`.
7. **Probar el JSON** en el navegador: `…/exec?action=catalogo`. Con los datos
   de hoy debe responder `ok: true`, `modelos: []` y `categorias: []` — los 22
   modelos están en BORRADOR. **Un catálogo vacío es la respuesta correcta.**
8. **Validar desde Node**, antes de escribir la URL en ningún sitio:
   ```bash
   node scripts/qa-endpoint-real.mjs --endpoint="…/exec" \
        --prohibir="<ID del libro>" --guardar=respuesta.json
   node scripts/qa-contrato-remoto.mjs respuesta.json
   ```
9. **Validar CORS en un navegador.** Es lo único que Node no puede juzgar:
   `tests/manual/endpoint-cors-test.html`, servido por HTTP. Ver §CORS.
10. **Configurar el frontend** — **solo si 8 y 9 salieron bien**, y como subfase
    aparte. En `assets/js/catalogo/catalogo-data.js`,
    `CONFIG.appsScriptEndpoint` con la URL y `CONFIG.modoDatos = "remoto"`.
    Es el **único** sitio donde se escribe la URL.
11. **QA local** con el endpoint ya conectado.
12. **QA en producción**, vigilando que el fallback local siga funcionando.

Los pasos **0–11 se ejecutaron y validaron** el 11/08/2026. El paso 12, QA en
producción, queda pendiente hasta que el repositorio se publique.
Procedimiento detallado: `docs/runbook-deploy-apps-script-v2.md`.

### CORS: verificado en navegador

La documentación oficial de Apps Script para aplicaciones web
(`developers.google.com/apps-script/guides/web`, consultada el 11/08/2026)
**no documenta el comportamiento CORS** de los endpoints desplegados.

El 11/08/2026 se midió desde un origen HTTP local contra el despliegue real:
**salud y catálogo dieron CORS OK (2/2)**, sin inicio de sesión. Node no basta
para esta comprobación porque no aplica la política del mismo origen; por eso la
prueba de navegador se repite después de cada despliegue.

Los rótulos observados en la UI fueron **«Ejecutar como: Yo (…)»** y
**«Quién tiene acceso: Cualquier usuario»**. El runbook conserva el registro.

---

## Vuelta atrás

La web **nunca depende** del endpoint. `catalogo-data.js` resuelve en cascada:

```
remoto → si falla → local → si falla → estado vacío controlado
```

Un endpoint caído, lento, con un JSON corrupto, sin versión de contrato o con
una versión incompatible hace que se use el archivo local, y el visitante no ve
ningún error. **Esta es la vuelta atrás automática y es inmediata**: no hay que
tocar nada.

Para desconectar del todo: `CONFIG.modoDatos = "local"` en
`assets/js/catalogo/catalogo-data.js`. Es una línea, pero **no es un
interruptor remoto**: hay que editar el archivo y publicar el sitio, con el
retraso que eso lleve. Si hace falta cortar de inmediato sin publicar, lo más
rápido es que el endpoint deje de responder (quitar la propiedad del script o
retirar el despliegue): el fallback local se activa solo.

Si lo que falla es el contenido de la hoja, `limpiarCache()` desde el editor
fuerza una relectura inmediata. Los errores **no se cachean**, así que una
corrección en la hoja se ve en la siguiente petición.

---

## Qué NO hace este endpoint

- No escribe. No hay `doPost`, `setValue`, `appendRow` ni `insertSheet`.
- No lee `CONTACTOS_INTERNOS`, `PROMOCIONES_WEB`, `SEDES_WEB` ni
  `FINANCIAMIENTO_WEB`. Solo las cuatro hojas del contrato.
- No devuelve HTML. No usa `HtmlService`. No hay JSONP ni `callback`.
- No autentica. Solo publica datos que ya son públicos; meter una clave en el
  frontend sería regalarla.
- No registra visitantes ni añade analítica.
- No revela el identificador del libro, rutas ni trazas de error.

---

## Qué hacer con los archivos antiguos

Conviven tres generaciones. **No se ha borrado ninguna.**

| Archivo | Generación | Qué es | Destino |
|---|---|---|---|
| `v2/Configuracion.gs` · `v2/Nucleo.gs` · `v2/Endpoint.gs` | 3 | Lee `MODELOS_WEB` (28 col.), 5 categorías, colores opcionales | **MANTENER** |
| `Code.gs` | 2 | Lee `CATALOGO_PUBLICO` (44 col.), 4 categorías, publica stock y especificaciones | **REEMPLAZAR** por v2 |
| `Endpoint.gs` | 1 | Borrador de 6 pestañas, se declara a sí mismo no desplegable | **RETIRAR DESPUÉS** |
| `Schema.gs` | 1 | Columnas en camelCase de la arquitectura de 6 pestañas | **RETIRAR DESPUÉS** |
| `Seguridad.gs` | 1 | Filtros de sedes, WhatsApp, promociones, financiamiento | **RETIRAR DESPUÉS** — pero revisar antes: las fases 4 y 5 podrían reaprovechar sus ideas |
| `EjemploRespuesta.json` | 1 | Ejemplo del contrato de 6 pestañas | RETIRAR DESPUÉS |
| `ejemplo-respuesta-publica.json` | 2 | Ejemplo del contrato de 44 columnas | RETIRAR DESPUÉS |
| `plantilla-catalogo.csv` | 2 | Plantilla de `CATALOGO_PUBLICO` | RETIRAR DESPUÉS |
| `SETUP.md` · `README.md` · `CHECKLIST-AUDITORIA.md` | 1–2 | Documentación de las generaciones anteriores | **ACTUALIZAR** al desplegar v2 |

Ninguno se borra hasta que v2 esté desplegado y probado en producción.

### Lo que trae el legacy y v2 deja fuera, a propósito

`Code.gs` incluye en su **lista blanca** —es decir, publica— campos que este
proyecto no debe publicar:

- **`estado_stock`, `mostrar_stock`, `stock_publico`, `mostrar_stock_exacto`.**
  `stock_real` estaba prohibido, pero `stock_publico` estaba **permitido**. El
  stock es responsabilidad de logística y no se publica en ninguna forma.
- **`cilindrada_cc`, `potencia`, `torque`, `transmision`, `refrigeracion`,
  `combustible`, `freno_delantero`, `freno_trasero`, `peso_kg`,
  `altura_asiento_mm`, `capacidad_tanque_l`.** Especificaciones técnicas que no
  existen en `MODELOS_WEB` y que no deben publicarse sin documentación oficial.
- **`promocion_activa`, `texto_promocion`.** Promociones: fase 5, otra hoja.
- **`marca`.** No está en el contrato actual.

Además, `Code.gs`:

- comprueba **solo `activo`**, sin `estado_contenido`: el mismo fallo que se
  corrigió en el frontend, que publicaría un borrador activado;
- fija **cuatro** categorías y omite `carga`, que es la de 5 modelos;
- admite `arenasweb.github.io` y `raw.githubusercontent.com` como dominios de
  imagen, mientras que el frontend no admite **ninguno**: cualquier URL
  absoluta que emitiera se rechazaría al llegar y la foto desaparecería sin
  ningún aviso.

**Detalle menor pero real:** `Code.gs` contiene **bytes de control crudos**
dentro de una clase de caracteres. En la línea 453, los extremos del rango se
escribieron con los bytes literales en lugar de con `\u0000` y `\u001F`.
Funciona en JavaScript, pero el NUL hace que Git y las herramientas de texto
traten el archivo **entero** como binario —sin diff legible, sin `grep`— y es
frágil al copiar y pegar.

En v2 el rango va escapado, y por eso los tres `.gs` son texto plano:

```js
.replace(/[\u0000-\u001F\u007F]/g, " ")
```

> **Este README arrastraba el mismo defecto** hasta el 11/08/2026: reproducía
> los bytes crudos al describirlos, y se volvía binario él mismo. Corregido al
> preparar el versionado — un archivo de documentación que Git no puede
> diferenciar no sirve para revisar cambios.

---

## Referencias

- `docs/catalogo-api-publica.md` — el contrato campo por campo
- `docs/catalogo-modelos-web.md` — las 28 columnas de la hoja
- `docs/reglas-publicacion-catalogo.md` — qué hace visible un modelo
- `docs/colores-modelo-web.md` — la hoja de colores, todavía inexistente
