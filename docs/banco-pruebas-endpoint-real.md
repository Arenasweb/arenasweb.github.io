# Banco de pruebas del endpoint real

Las herramientas que interrogan el endpoint una vez desplegado, qué responde
cada una y cómo se lee el resultado.

**Las cuatro se ejecutaron contra el despliegue real el 11/08/2026.** Endpoint,
contrato del frontend y CORS pasaron; los emuladores locales se conservan para
regresión y para probar fallos sin tocar el servicio.

---

## Las cuatro herramientas y qué cubre cada una

| Herramienta | Dónde corre | Qué demuestra | ¿Necesita endpoint? |
|---|---|---|---|
| `qa-predeploy-apps-script.mjs` | Node | Que el paquete es apto **antes** de subirlo | No |
| `qa-endpoint-real.mjs` | Node | Que el endpoint cumple el contrato público | **Sí** |
| `qa-contrato-remoto.mjs` | Node | Que el **frontend** acepta esa respuesta | No (opcionalmente un JSON) |
| `tests/manual/endpoint-cors-test.html` | Navegador | Que un navegador puede **leer** la respuesta | **Sí** |

La cuarta no es prescindible. Las tres primeras pueden dar verde con un endpoint
que ningún navegador puede consumir.

---

## Por qué CORS necesita un banco aparte

Node **no aplica la política del mismo origen**. `fetch` desde Node lee cualquier
respuesta que llegue, tenga las cabeceras que tenga. Un navegador no: si faltan
las cabeceras, recibe la respuesta y **se niega a entregársela al JavaScript**.

Ese es el escenario que hay que descartar:

```
qa-endpoint-real.mjs   →  ENDPOINT PASS      (Node lo lee todo)
el sitio en producción →  catálogo vacío     (el navegador no puede leerlo)
```

Y hay un segundo motivo, más incómodo:

> La documentación oficial de Google para aplicaciones web de Apps Script
> (`developers.google.com/apps-script/guides/web`, consultada el **11 de agosto
> de 2026**) **no documenta el comportamiento CORS** de los endpoints
> desplegados.

Sin fuente normativa, la única respuesta honesta es **medirlo**. Por eso el
criterio de este proyecto es: *CORS no se declara resuelto hasta haberlo visto
funcionar en un navegador contra el despliegue real.*

---

## `qa-predeploy-apps-script.mjs`

```bash
node scripts/qa-predeploy-apps-script.mjs
node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID del libro>"
node scripts/qa-predeploy-apps-script.mjs --json
```

Lee los archivos del disco. Diez bloques:

| Bloque | Qué mira |
|---|---|
| Archivos | Los tres `.gs`; ningún `.gs` extra; ningún archivo del paquete anterior |
| Texto plano | Sin bytes de control crudos — uno solo vuelve el archivo binario para Git |
| Puntos de entrada | Exactamente **1** `doGet`, **0** `doPost` |
| APIs prohibidas | Libro activo, escrituras, borrados, `DriveApp`, `UrlFetchApp`, `eval`, `HtmlService`… |
| Origen del libro | `openById` + Script Property, y que `openById` **no** reciba nada de la petición |
| Secretos | Identificadores con forma de ID, URLs `/exec`, claves, tokens, contraseñas |
| Paquete anterior | Ninguna dependencia de símbolos del backend viejo |
| Versiones | Contrato = el del frontend; `api_version` distinta del contrato |
| README | Que diga sustituir-no-añadir, un solo `doGet`, la Script Property, y que el vacío es correcto |
| Huellas | SHA-256 de los tres archivos |

**Comentarios y cadenas se retiran antes de buscar.** Este proyecto documenta en
el propio código justo aquello que no debe hacer: sin esa limpieza, un
recordatorio como *«aquí nunca se usa `setValue`»* haría fallar la guarda.

### Está probada contra paquetes hostiles

```bash
node scripts/qa-predeploy-tests.mjs
```

Copia el paquete a una carpeta temporal, le mete **un** defecto y ejecuta la
guarda real **como subproceso**. Cubre 28 casos: segundo `doGet`, `doPost`,
`getActiveSpreadsheet`, `setValue`, `appendRow`, `setProperty`, `UrlFetchApp`,
`new Function`, `HtmlService`, ID pegado, URL pegada, token, `openById`
alimentado por la petición, archivo legacy, `.gs` extra, archivo que falta,
símbolo legacy, versión descuadrada, byte NUL, dos degradaciones del README —y
tres casos que **no** deben disparar la alarma, para que no se convierta en un
detector de menciones.

> Al escribirlas, estas pruebas encontraron **cuatro defectos reales en la
> guarda**: el buscador de identificadores excluía el punto que precede a toda
> llamada a método —así que ni un solo `setValue` se detectaba— y el informe
> leía variables antes de su inicialización cuando el paquete estaba incompleto,
> justo en los casos más graves. Una guarda que solo se prueba con material
> correcto no está probada.

---

## `qa-endpoint-real.mjs`

```bash
node scripts/qa-endpoint-real.mjs --endpoint="https://…/exec"
node scripts/qa-endpoint-real.mjs --endpoint="…" --prohibir="<ID>" --guardar=respuesta.json
ARENAS_APPS_SCRIPT_ENDPOINT="…" node scripts/qa-endpoint-real.mjs
```

| Opción | Para qué |
|---|---|
| `--endpoint=<url>` | La URL `/exec`. También por `ARENAS_APPS_SCRIPT_ENDPOINT` |
| `--prohibir=<txt>` | Cadena que no puede aparecer en la respuesta. Repetible |
| `--timeout=<ms>` | 15000 por defecto |
| `--guardar=<ruta>` | Escribe el JSON del catálogo para pasárselo a `qa-contrato-remoto.mjs` |
| `--json` | Salida interpretable |

**La URL no se guarda en ningún sitio.** Entra por argumento o entorno y muere
con el proceso. En los informes aparece con el identificador enmascarado
(`…/macros/s/…/exec`), para que la salida se pueda compartir.

Solo hace peticiones `GET`. **No es destructivo:** no cambia la Script Property,
no fuerza errores en producción y no toca el libro.

### Qué comprueba

1. **Salud** — responde, HTTP 200, JSON, `ok:true`, `version:"2"`,
   `configurado:true`, y que no se le escape nada con forma de identificador.
2. **Catálogo** — el sobre completo: `version`, `api_version`, `generated_at`
   interpretable, `config` objeto, las tres listas como arrays, y que **no**
   emita `models`/`categories`/`colors` en inglés.
3. **Estado esperado hoy** — **0 modelos**, **0 colores**, **0 categorías**.
4. **Privacidad** — 30 términos buscados **en profundidad**, en claves y en
   valores, más los `--prohibir` (en el catálogo **y** en la salud).
5. **Querystrings hostiles** — `spreadsheetId`, `sheet`, `range`, `preview`,
   `debug`, `borrador`, `incluir_borradores`, `id`: la respuesta debe ser
   **idéntica** a la normal.
6. **Acción desconocida** — `foo`, `../../`, una etiqueta `script`, y `catalogo`
   con espacios: se rechazan, sin traza y sin identificadores.
7. **Caché** — dos llamadas seguidas, y se **observa** el `generated_at`. No se
   exige identidad: el contrato no la promete.

### Está probada contra un emulador

```bash
node scripts/qa-endpoint-real-tests.mjs
```

Levanta un servidor en `127.0.0.1` que imita a Apps Script —el caso sano y trece
averías— y ejecuta el banco real contra él. 21 comprobaciones: Script Property
sin configurar, versión incompatible, claves en inglés, fuga del diagnóstico,
fuga de stock, fuga del ID, publicar cuando no debe, un parámetro que cambia los
datos, acción permisiva, traza en el error, respuesta no JSON, MIME incorrecto,
HTTP 500, timeout, y tres formas de uso inválido.

> Para que ese emulador funcione hubo que lanzar el subproceso de forma
> **asíncrona**: el servidor vive en el mismo proceso que lanza el banco, y una
> espera síncrona lo dejaba sin atender — el padre esperando al hijo y el hijo
> esperando al padre.

---

## `qa-contrato-remoto.mjs`

```bash
node scripts/qa-contrato-remoto.mjs                 # escenarios sintéticos
node scripts/qa-contrato-remoto.mjs respuesta.json  # y además un JSON real
```

Carga los módulos **reales** del navegador en un contexto de Node y les pregunta.
No reimplementa el esquema: llama a `extraerRegistros`, `normalizarModelo`,
`normalizarConfig` y `esPublicable`, que son las mismas funciones que corren en
el sitio.

**No toca la configuración del frontend.** La herramienta solo valida una
respuesta; hoy `modoDatos` ya está en `"remoto"`, pero ese cambio se hizo en una
subfase separada después de aprobar endpoint y CORS.

### La pregunta que responde

```
remoto VÁLIDO con modelos: []   →  se USA          ← lo de hoy
remoto caído / roto / ok:false  →  se cae al LOCAL
```

Son casos opuestos y se parecen mucho. Confundirlos sería un error silencioso: la
web mostraría el archivo local creyendo que el remoto falló, cuando el remoto
estaba respondiendo correctamente que todavía no hay nada publicado.

| Respuesta remota | El frontend |
|---|---|
| `ok:true`, `version:"2"`, `modelos:[]` | **ACEPTA** |
| `ok:true`, `version:"2.5"` | ACEPTA — solo manda el número mayor |
| `ok:false` | rechaza → local |
| sin `version` | rechaza → local |
| `version:"1"` | rechaza → local |
| sin `modelos`, o `modelos` que no es array | rechaza → local |
| claves en inglés | rechaza → local |
| no es un objeto | rechaza → local |

Rechazar **no muestra ningún error al visitante**: se usa
`data/catalogo-publico.local.json` y la web sigue funcionando.

También comprueba la matriz de publicación sobre el esquema real —incluida la
categoría `carga`, activada en 3.3C—, el saneamiento de textos provisionales
opcionales, las tres condiciones del precio, y que campos prohibidos que
vinieran del origen **no atraviesen** el esquema.

---

## `tests/manual/endpoint-cors-test.html`

Herramienta de desarrollo. **No está enlazada desde ninguna página, lleva
`noindex` y no forma parte de la navegación.**

```bash
python -m http.server 3000
# http://localhost:3000/tests/manual/endpoint-cors-test.html
```

> **Servir por HTTP, no abrir con doble clic.** Con `file://` el origen es
> `null` y el navegador aplica reglas distintas de las que tendrá el sitio real.
> El resultado no sería representativo. La página avisa si detecta `file:`.

Si el puerto 3000 está ocupado, cualquier otro sirve. Lo que importa es que sea
`http://` sobre `localhost` o `127.0.0.1`.

### No guarda nada

Ni `localStorage`, ni `sessionStorage`, ni cookies, ni `IndexedDB`, ni la barra
de direcciones. La URL se escribe, se usa y desaparece al recargar. No hay URL
por defecto, y no trae nada de fuera: sin fuentes, sin CDN, sin analítica.

### Los cuatro veredictos

| Veredicto | Qué significa | Qué hacer |
|---|---|---|
| **CORS OK** | El navegador **puede leer** la respuesta desde este origen | Es lo que hace falta |
| **BLOQUEADO POR CORS** | La petición llega; el navegador no deja leerla | Revisar el acceso del despliegue |
| **NO SE ALCANZA** | La petición no llegó | URL, red o despliegue inexistente. **No es CORS** |
| **RESPONDE PERO NO ES JSON** | Se lee, pero no es el contrato | Suele ser una pantalla de inicio de sesión |

### Cómo distingue CORS de un fallo de red

Cuando CORS bloquea, `fetch` rechaza **sin decir por qué**: el navegador oculta
el motivo a propósito, porque revelarlo ya sería una fuga.

La página repite entonces la petición con `mode: "no-cors"`. Esa segunda no
permite leer nada —recibe una respuesta opaca—, pero su sola existencia demuestra
que **el servidor está ahí**:

```
fetch normal falla + opaca funciona  →  BLOQUEADO POR CORS
fetch normal falla + opaca falla     →  NO SE ALCANZA
```

Es la única forma de separar los dos casos desde JavaScript.

---

## Códigos de salida

| | |
|---|---|
| `0` | PASS |
| `1` | FAIL — hay al menos un bloqueante |
| `2` | Uso inválido: falta la URL, el paquete no existe, la URL no es utilizable |

`2` importa: significa que **no se ha comprobado nada**. No debe confundirse con
un PASS ni tratarse como un fallo del endpoint.

---

## Orden el día del despliegue

```bash
# 1. antes de subir nada
node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID>"

# 2. con el endpoint ya desplegado
node scripts/qa-endpoint-real.mjs --endpoint="…/exec" --prohibir="<ID>" --guardar=respuesta.json

# 3. contra el frontend real
node scripts/qa-contrato-remoto.mjs respuesta.json

# 4. en un navegador
python -m http.server 3000
#    → http://localhost:3000/tests/manual/endpoint-cors-test.html

# 5. borrar el archivo de trabajo
```

`respuesta.json` es temporal. **No entra en el repositorio.**

---

## Referencias

- [runbook-deploy-apps-script-v2.md](runbook-deploy-apps-script-v2.md) — el procedimiento completo
- [checklist-predeploy-backend-v2.md](checklist-predeploy-backend-v2.md) — la lista corta
- [catalogo-api-publica.md](catalogo-api-publica.md) — el contrato campo por campo
- [decision-versionado-apps-script-v2.md](decision-versionado-apps-script-v2.md) — por qué v2 está en Git
