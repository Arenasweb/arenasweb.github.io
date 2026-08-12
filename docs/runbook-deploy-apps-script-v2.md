# Runbook — despliegue del backend Apps Script v2

Procedimiento para poner en marcha la API del catálogo.
**Estado: EJECUTADO Y VALIDADO el 11/08/2026.** Se conserva como procedimiento
repetible para futuras versiones. La publicación del frontend y el QA en
producción siguen pendientes.

Está escrito para que lo siga una persona de principio a fin sin tener que
investigar nada por el camino. Si algo obliga a improvisar, ese punto es un
defecto de este documento.

---

## Antes de empezar: lo que este despliegue NO hace

- **No publica ninguna moto.** Las 22 siguen en `BORRADOR` e inactivas. La
  respuesta correcta del endpoint el primer día es un **catálogo vacío**.
- **No conectó la web en la misma subfase.** La conexión se ejecutó después, con
  autorización separada y solo tras validar endpoint y CORS. El sitio publicado
  no cambiará hasta que se autorice el push.
- **No toca Google Sheets.** El libro quedó como quedó en 3.3C.

---

## 1. Precondiciones

Ninguna es opcional. Si una falla, no se empieza.

| | Comprobación |
|---|---|
| ☐ | El CMS está migrado: `estado_contenido` es manual, con validación `BORRADOR`/`APROBADO` |
| ☐ | Las 22 filas en `BORRADOR` · las 22 en `activo = FALSE` · **0 aprobadas** |
| ☐ | `CATEGORIAS`: `carga` activa; `touring`, `rural` e `iniciacion` inactivas |
| ☐ | Existe el respaldo `CATÁLOGO WEB ARENAS — BACKUP PRE MIGRACIÓN ESTADO — 2026-08-10 23-44` |
| ☐ | `node scripts/qa-predeploy-apps-script.mjs` → **PREDEPLOY PASS** |
| ☐ | `node scripts/qa-predeploy-tests.mjs` → todas correctas |
| ☐ | `node scripts/qa-api-catalogo.mjs` y `node scripts/qa-endpoint-catalogo.mjs` → verdes |
| ☐ | `node scripts/qa-contrato-remoto.mjs` → verde |
| ☐ | Quien despliega **conoce** el identificador del libro y **no lo escribe** en ningún archivo del repositorio |

---

## 2. El paquete

Se copian **tres archivos**, en este orden:

```
1.  apps-script/v2/Configuracion.gs     constantes y listas
2.  apps-script/v2/Nucleo.gs            lógica pura
3.  apps-script/v2/Endpoint.gs          doGet, caché, lectura del libro
```

**`README.md` NO se copia.** Es documentación. Pegarlo como archivo `.gs`
rompería el proyecto: no es JavaScript.

### El orden no importa técnicamente, pero conviene respetarlo

Apps Script concatena todos los `.gs` en un **único ámbito global** antes de
ejecutar nada, así que una `function` declarada en el tercer archivo es visible
desde el primero. Lo que sí importa —y mucho— es que **no sobre ninguno**:

> Si queda un `doGet` del paquete anterior, **habrá dos**, y **gana el último que
> se cargue**. En silencio. Sin aviso, sin error, sin nada en el registro. El
> endpoint respondería con el backend viejo creyendo tú que despliegas el nuevo.

Es el motivo de que el paso 3 sea *sustituir*, no *añadir*.

### Y no se copia nada del paquete anterior

| Copiar | No copiar |
|---|---|
| `v2/Configuracion.gs` | `Code.gs` |
| `v2/Nucleo.gs` | `Endpoint.gs` (el de la raíz, legacy) |
| `v2/Endpoint.gs` | `Schema.gs` · `Seguridad.gs` |

---

## 3. Procedimiento

### 3.1 — Comprobar el paquete

```bash
node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID real del libro>"
```

Anota las **huellas SHA-256** que imprime. Sirven para confirmar después que lo
que está en el editor es exactamente lo auditado.

**Si no dice PREDEPLOY PASS, se detiene aquí.**

### 3.2 — Elegir el proyecto de Apps Script

Dos caminos. El primero es el recomendado.

**a) Proyecto nuevo (recomendado).** Un proyecto *standalone* limpio. No hay nada
que borrar, así que no puede quedar un `doGet` colgando. Empezar de cero elimina
de un plumazo el riesgo más difícil de detectar de todo este procedimiento.

**b) Proyecto existente.** Solo si hay una razón para conservarlo —una URL ya
repartida, por ejemplo—. Entonces, **antes de pegar nada**:

1. Copiar el contenido actual de **todos** los archivos a un lugar seguro fuera
   del proyecto, y anotar la URL del despliegue vigente si la hay.
2. **Borrar del proyecto todos los archivos anteriores.**
3. Solo entonces, crear los tres nuevos.

### 3.3 — Pegar los tres archivos

Crear `Configuracion`, `Nucleo` y `Endpoint`, y pegar el contenido de cada uno.

Después, en el editor, buscar `function doGet` en todo el proyecto:

```
debe aparecer UNA sola vez, en Endpoint.gs
```

Y buscar `function doPost`: **cero apariciones**. La API es de solo lectura.

### 3.4 — Configurar el libro

*Configuración del proyecto → Propiedades del script → Añadir propiedad*

| | |
|---|---|
| **Propiedad** | `ARENAS_CATALOGO_SPREADSHEET_ID` |
| **Valor** | el identificador del Sheet real |

Guardar.

**Dónde se saca el identificador:** abriendo el libro en el navegador, es el
tramo de la barra de direcciones entre `/d/` y `/edit`:

```
https://docs.google.com/spreadsheets/d/<ESTO ES EL IDENTIFICADOR>/edit
```

No hace falta buscarlo en ningún archivo del proyecto, y no debe estar en
ninguno: se copia de ahí y se pega en la propiedad.

> **El valor no se escribe en el repositorio, ni en este documento, ni en una
> captura de pantalla que vaya a compartirse.** El nombre de la propiedad sí
> puede aparecer en cualquier sitio: es una clave, no un secreto.

Sin esta propiedad, el catálogo responde `backend_no_configurado` — que es el
comportamiento correcto, no una avería.

### 3.5 — Prueba interna, antes de desplegar

En el editor, ejecutar la función `limpiarCache()` y revisar el registro.

Debe terminar **sin excepciones**. Si lanza algo, el problema es de
configuración o de permisos, y se resuelve aquí — no después.

### 3.6 — Desplegar

*Implementar → Nueva implementación → Aplicación web*

| Ajuste | Valor | Estado |
|---|---|---|
| **Ejecutar como** | `Yo (…)` | **VERIFICADO EN UI** el 11/08/2026; la identidad tiene acceso al libro |
| **Quién tiene acceso** | `Cualquier usuario` | **VERIFICADO EN UI**; lectura pública sin inicio de sesión |

> ### Rótulos observados en la UI
>
> En el despliegue real del 11/08/2026 el cuadro mostró **«Ejecutar como: Yo
> (…)»** y **«Quién tiene acceso: Cualquier usuario»**. Se eligieron esas
> opciones y la prueba desde un navegador sin sesión confirmó acceso anónimo.
> Google puede cambiar el texto de la UI; debe volver a leerse en cada despliegue.

**Ejecutar como la cuenta propietaria** no es un detalle: es lo que permite que
el script lea el libro sin pedirle permisos a cada visitante. La alternativa
—ejecutar como quien accede— haría que la web pidiera iniciar sesión con Google
para ver un catálogo público.

### 3.7 — Obtener la URL

Termina en `/exec`.

> **`/exec` y `/dev` no son lo mismo.** `/dev` sirve la última versión guardada,
> solo al editor, y **exige haber iniciado sesión**. Probar contra `/dev`
> funcionaría en tu navegador y fallaría para todo el mundo. Se prueba `/exec`.

**No la escribas todavía en ningún archivo del repositorio.** Primero se valida.

### 3.8 — Validar desde Node

```bash
node scripts/qa-endpoint-real.mjs \
  --endpoint="https://script.google.com/macros/s/…/exec" \
  --prohibir="<ID real del libro>" \
  --guardar=respuesta.json
```

Debe decir **ENDPOINT PASS**. Con el CMS como está hoy, eso significa:

```
ok: true · version: "2" · modelos: [] · categorias: [] · colores: []
```

> **Si la respuesta es una página de inicio de sesión de Google en vez de JSON,
> el acceso del despliegue está mal elegido.** Volver al paso 3.6.

### 3.9 — Validar el contrato contra el frontend

```bash
node scripts/qa-contrato-remoto.mjs respuesta.json
```

Confirma que el frontend **acepta** esa respuesta. Es la comprobación que
distingue un catálogo vacío legítimo de una respuesta que el sitio descartaría.

### 3.10 — Validar CORS en un navegador

Lo único que Node no puede juzgar.

```bash
python -m http.server 3000
```

Abrir `http://localhost:3000/tests/manual/endpoint-cors-test.html`, pegar la URL
y pulsar **Probar las dos**.

Criterio en [banco-pruebas-endpoint-real.md](banco-pruebas-endpoint-real.md).

### 3.11 — Guardar la URL, por fin

Un único sitio:

```js
// assets/js/catalogo/catalogo-data.js
appsScriptEndpoint: "https://script.google.com/macros/s/…/exec",
modoDatos: "remoto",
```

**No se duplica en ningún otro archivo.** Un día habrá que cambiarla, y una URL
repetida en tres sitios se cambia en dos.

> **Este paso ya no es del despliegue: es la conexión del frontend, y es una
> subfase aparte.** Se hace cuando 3.8, 3.9 y 3.10 hayan salido bien, y con su
> propia autorización.

### 3.12 — Borrar el archivo de trabajo

`respuesta.json` es temporal. No entra en el repositorio.

---

## 4. Qué debe responder el endpoint el primer día

| Sonda | Respuesta correcta |
|---|---|
| `?action=salud` | `ok:true` · `servicio:"arenas-catalogo"` · `api_version:"1.0"` · `version:"2"` · `configurado:true` |
| `?action=catalogo` | `ok:true` · `version:"2"` · `modelos:[]` · `categorias:[]` · `colores:[]` |
| `?action=foo` | `ok:false` · `error:"accion_desconocida"` |

### Un catálogo vacío es la respuesta correcta

Merece decirse tres veces porque es contraintuitivo y va a asustar a alguien:

**El endpoint devolverá 0 modelos, y eso significa que funciona.** Las 22 filas
están en `BORRADOR` e inactivas: publicar cualquiera de ellas sería el fallo.

Y `categorias: []` también es correcto: el backend publica una categoría **solo
si está activa Y tiene algún modelo publicado**. Con 0 modelos, ninguna aparece
—`carga` incluida—. No es que la activación de 3.3C no haya servido: es que aún
no hay nada que clasificar.

> **No «arreglar» el vacío.** Ni aprobando una moto, ni activándola, ni tocando
> el backend. Se llenará solo cuando haya contenido aprobado.

### `configurado: true` no significa que el catálogo funcione

Solo dice que **hay** un identificador de libro. No abre el libro ni lee ninguna
hoja: una comprobación de vida no debe costar cuatro lecturas. Para saber si el
catálogo responde de verdad se pide `?action=catalogo`.

---

## 5. No hace falta publicar una moto para probar el endpoint

Es la tentación previsible: «pruebo con una para ver si sale».

**No.** El contrato queda demostrado con 0 modelos: se comprueba el sobre, la
versión, la forma de las listas, la privacidad del payload y el comportamiento
ante parámetros hostiles. Nada de eso necesita contenido.

Publicar una moto para probar significaría aprobar contenido que nadie ha
revisado, y hacerlo por un motivo técnico. El piloto de contenido llega después,
en la fase de carga, con foto real, `alt_text` verificado, texto revisado y visto
bueno comercial. Hoy no hay ninguna moto en condiciones: **las 22 están sin
fotografía**.

---

## 6. Modelo de amenazas

Qué puede hacer alguien que encuentre la URL —y la encontrará: estará en el
JavaScript de una web pública—.

| Puede | Control |
|---|---|
| Llamar al endpoint cuantas veces quiera | Es una API pública de solo lectura. La caché absorbe el grueso |
| Añadir cualquier parámetro | Solo se lee `action`. Todo lo demás se ignora |
| Leer el payload entero | Solo contiene lo que ya es público |

| **NO** puede | Por qué |
|---|---|
| Elegir otro libro | El identificador viene de la Script Property. `openById` no toca la petición |
| Leer otra hoja | Los nombres de hoja son constantes del código. No hay parámetro de hoja |
| Pedir un rango arbitrario | No existe parámetro de rango. Se lee `getDataRange()` de hojas fijas |
| Ver borradores | La previsualización es del **navegador** y exige host local. El servidor no la conoce |
| Ver `CONTACTOS_INTERNOS` | Está en `HOJAS_FUERA_DE_ALCANCE` y nunca se lee |
| Ver stock, costos o datos de cliente | Lista blanca de columnas: lo que no está en el contrato no se emite |
| Escribir en el libro | No hay una sola operación de escritura en el paquete. Verificado por la guarda |
| Obtener el identificador del libro | No viaja en ninguna respuesta. Los errores son genéricos |
| Provocar una traza reveladora | Los errores devuelven `error_interno` con un mensaje fijo |

### Abuso por volumen

**No se implementa límite de peticiones propio.** Apps Script tiene sus propias
cuotas, y un limitador casero sobre `CacheService` sería fácil de esquivar y
añadiría una superficie de fallo que hoy no existe.

Queda **registrado como riesgo aceptado**: un exceso de peticiones agotaría la
cuota diaria y el endpoint dejaría de responder. El efecto sería que la web cae
al archivo local — es decir, el catálogo sigue viéndose. Es la razón de que el
respaldo local no se retire nunca.

### La caché no es un control de seguridad

`CacheService` existe para latencia y cuotas. No protege nada, no filtra nada y
no debe usarse como si lo hiciera.

---

## 7. Criterios de aborto

Se detiene el despliegue, sin discusión, si:

- `qa-predeploy-apps-script.mjs` no da PASS.
- Las huellas SHA-256 del editor no coinciden con las auditadas.
- Aparece **más de un** `doGet`, o cualquier `doPost`.
- La Script Property no se deja configurar, o `configurado` sigue en `false`.
- `?action=salud` no responde, o no responde JSON.
- `?action=catalogo` no responde `ok:true`.
- La versión de contrato no es `2`.
- La respuesta expone datos privados, campos internos o el identificador del libro.
- **El endpoint devuelve modelos** mientras el CMS siga con las 22 en `BORRADOR`.
- El navegador no puede leer la respuesta por CORS.
- El endpoint devuelve una pantalla de inicio de sesión.
- Hay que modificar el Sheet para que el despliegue funcione.

Abortar sigue siendo barato: la cascada `remoto → local → vacío controlado`
impide que una caída del endpoint publique borradores o deje la interfaz cargando.

---

## 8. Vuelta atrás, por niveles

| Nivel | Acción | Cuándo |
|---|---|---|
| **0** | No hacer nada | El fallback automático usa el origen local restrictivo si falla el remoto |
| **1** | Archivar el despliegue en Apps Script | El endpoint existe pero no sirve |
| **2** | `modoDatos = "local"` en `catalogo-data.js` y publicar | Solo si el frontend ya estaba conectado |
| **3** | Volver a desplegar la versión anterior auditada | Hay una versión buena a la que regresar |
| **4** | Restaurar el respaldo del libro | El problema es de datos, no de código |

El **nivel 0 es la primera respuesta vigente**. Producción sigue mostrando cero
modelos porque tanto el remoto real como el fallback aplican la misma puerta de
publicación.

`limpiarCache()` desde el editor fuerza a releer el libro sin esperar al TTL.
Se usa **después de un cambio estructural o de una vuelta atrás**, no de rutina:
para una edición normal, el TTL ya se encarga.

---

## 9. Después del despliegue

| | |
|---|---|
| ☑ | Fecha, versión y huellas SHA-256 anotadas |
| ☑ | URL `/exec` guardada únicamente en `CONFIG.appsScriptEndpoint` después de validar |
| ☐ | Repetir `qa-endpoint-real.mjs` pasadas unas horas: confirma que la caché expira bien |
| ☑ | Rótulos reales de la UI anotados en este documento |
| ☑ | CORS 2/2 desde un origen HTTP local contra el despliegue real |
| ☑ | Frontend conectado después, con autorización separada y QA local completo |

---

## Referencias

- [checklist-predeploy-backend-v2.md](checklist-predeploy-backend-v2.md) — la lista corta
- [banco-pruebas-endpoint-real.md](banco-pruebas-endpoint-real.md) — las herramientas y sus criterios
- [decision-versionado-apps-script-v2.md](decision-versionado-apps-script-v2.md) — por qué v2 está en Git
- [catalogo-api-publica.md](catalogo-api-publica.md) — el contrato campo por campo
- `../apps-script/v2/README.md` — la arquitectura del backend
