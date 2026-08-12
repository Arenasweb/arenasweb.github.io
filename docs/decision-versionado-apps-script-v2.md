# Versionado del backend Apps Script v2

Por qué el paquete v2 entra en Git y el anterior no.
**Decisión tomada el 11 de agosto de 2026, en la subfase 3.4A.**

---

## El problema

El backend v2 —`Configuracion.gs`, `Nucleo.gs`, `Endpoint.gs`— estaba **fuera
de Git**. Todo `apps-script/` lo ignoraba una sola línea del `.gitignore`:

```
apps-script/
```

Eso venía de cuando el backend era «otra fase, auditada aparte». Ha dejado de
serlo: v2 es el backend de esta misma web, ya está reconciliado y va a
desplegarse.

Y ahí está el riesgo concreto:

> **Desplegar código cuyo fuente no está versionado en ninguna parte crea un
> sistema en producción sin origen recuperable.** Si esta máquina se pierde, se
> pierde el backend: quedaría solo la copia pegada en el editor de Apps Script,
> sin historia, sin diffs y sin forma de saber qué cambió ni cuándo.

Se registró como riesgo diferido en 3.1. Al llegar al despliegue deja de poder
diferirse: es su precondición.

---

## Las dos opciones

| | **A. Versionar v2 en este repositorio** | **B. Custodia separada** |
|---|---|---|
| Dónde vive | `apps-script/v2/`, con el resto del proyecto | Otro repositorio, o un archivo fuera de Git |
| Recuperable | Sí, con toda la historia | Depende de un procedimiento manual |
| Reproducible | El despliegue se reconstruye desde un commit | Hay que ir a buscarlo |
| Revisable | `git diff` sobre cada cambio | Solo si la custodia lo permite |
| Auditable por Codex | Sí | No sin darle acceso aparte |
| Coste | Ninguno | Un procedimiento más que mantener |
| Riesgo | Publica el código del backend | Se pierde si falla la custodia |

**Decisión: A.** Con una condición previa que no era negociable: **demostrar que
no hay secretos**.

---

## La auditoría que habilitó la decisión

Hecha **antes** de tocar el `.gitignore`, sobre los cuatro archivos de
`apps-script/v2/`.

| Se buscó | Resultado |
|---|---|
| El identificador real del libro (`1gzn3fHMXma…`) | **No aparece** |
| URLs de despliegue (`script.google.com/macros/s/…`, `/exec`) | **No aparecen** — solo instrucciones genéricas en el README |
| `client_secret`, `client_id`, `private_key`, `Bearer`, `AKIA` | **No aparecen** |
| Contraseñas, tokens, cookies, cabeceras de autorización con valor | **No aparecen** |
| `CONTACTOS_INTERNOS`, `stock_real`, `chasis`, `costo`, `margen`, datos de cliente | Aparecen **solo como listas de exclusión** |

Ese último punto merece detenerse. En `Configuracion.gs`:

```js
var HOJAS_FUERA_DE_ALCANCE = [
  'CONTACTOS_INTERNOS',  // privada, jamás pública
  …
];
```

Es una **lista de lo que nunca se publica**. Que esos nombres estén escritos no
filtra nada: es justo el mecanismo que impide que se filtren.

### La distinción que gobierna todo esto

```
NOMBRE de la propiedad   ARENAS_CATALOGO_SPREADSHEET_ID   → puede estar en Git
VALOR de la propiedad    (el identificador del libro)     → NUNCA en Git
```

El valor vive en las **Propiedades del script** de Apps Script, que no forman
parte del código y no se exportan con él. Fue la corrección C-1 y es también lo
que hace posible esta decisión.

---

## Un defecto que apareció al auditar

`apps-script/v2/README.md` contenía **bytes de control crudos** —un NUL entre
ellos— porque documentaba el mismo defecto del `Code.gs` antiguo reproduciendo
los bytes literales en vez de nombrarlos.

Un solo byte NUL basta para que **Git trate el archivo como binario**: sin diff
legible, sin `grep`, sin revisión por líneas. Un documento así no sirve para
revisar cambios, que es exactamente para lo que se estaba versionando.

Corregido: ahora el README escribe las secuencias de escape, y la guarda
pre-despliegue comprueba que ningún archivo del paquete vuelva a tener bytes de
control crudos.

---

## Lo que se publica y lo que no

```gitignore
apps-script/*
!apps-script/v2/
apps-script/v2/*
!apps-script/v2/Configuracion.gs
!apps-script/v2/Nucleo.gs
!apps-script/v2/Endpoint.gs
!apps-script/v2/README.md
```

Cuatro líneas de negación, ni una más. Comprobado con `git check-ignore`:

| Archivo | Estado |
|---|---|
| `apps-script/v2/Configuracion.gs` · `Nucleo.gs` · `Endpoint.gs` · `README.md` | **versionables** |
| `apps-script/Code.gs` · `Endpoint.gs` · `Schema.gs` · `Seguridad.gs` | ignorados |
| `apps-script/README.md` · `SETUP.md` · `CHECKLIST-AUDITORIA.md` | ignorados |
| `apps-script/EjemploRespuesta.json` · `ejemplo-respuesta-publica.json` · `plantilla-catalogo.csv` | ignorados |

### Por qué `apps-script/*` y no `apps-script/`

Git **no entra** en un directorio excluido. Con `apps-script/` a secas, ninguna
negación posterior puede rescatar un archivo de dentro: el directorio entero
queda podado antes de mirar su contenido. Hay que excluir el *contenido*
(`apps-script/*`), volver a admitir el subdirectorio (`!apps-script/v2/`), y
repetir la operación un nivel más abajo.

### Es una lista blanca, y eso es deliberado

Un `.gs` **nuevo** dentro de `apps-script/v2/` nace **ignorado** hasta que
alguien lo añada aquí a mano. Comprobado.

Tiene dos caras y las dos son intencionadas:

- **A favor:** nada entra en el repositorio por descuido. Un volcado, una prueba
  o un archivo con datos reales no aparecen solos en `git status`.
- **En contra:** hay que acordarse. Por eso la guarda pre-despliegue **falla** si
  encuentra un `.gs` que no esté en el contrato: quien añada un archivo se entera
  antes de desplegar, no después.

---

## Lo que NUNCA se guarda aquí

| | Dónde vive |
|---|---|
| El identificador del libro | Propiedades del script, en Apps Script |
| La URL del despliegue (`/exec`) | Una sola vez, en `assets/js/catalogo/catalogo-data.js`, y **solo después de validarla** |
| Tokens, credenciales, cookies | En ningún sitio de este proyecto |
| Volcados del Sheet, exportaciones CSV | Archivos de trabajo temporales, fuera del repositorio |

La URL del despliegue **no es un secreto** —el navegador de cualquier visitante
tendrá que pedirla— pero escribirla antes de haberla validado sí es un error:
quedaría publicada una dirección que quizá haya que rehacer.

---

## Cómo se sostiene la decisión

```bash
node scripts/qa-predeploy-apps-script.mjs
node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID real del libro>"
```

La guarda vuelve a hacer esta auditoría **cada vez**, sobre los archivos del
disco. La decisión de versionar no descansa en una revisión que se hizo un día:
descansa en una comprobación que se repite.

Y la guarda, a su vez, está probada contra paquetes hostiles:

```bash
node scripts/qa-predeploy-tests.mjs
```

---

## Vuelta atrás

Deshacer esto es editar el `.gitignore` y volver a `apps-script/`. Los archivos
siguen en el disco: nada se mueve, nada se duplica. **Una sola fuente canónica**,
`apps-script/v2/`, y ninguna copia en otra carpeta.

---

## Lo que esta decisión NO implica

- **No se ha desplegado nada.** El paquete sigue sin subir a Apps Script.
- **No se ha hecho commit.** Los archivos pasan a ser *versionables*; ponerlos en
  un commit es una decisión posterior y del propietario.
- **No cambia el paquete anterior.** `Code.gs` y compañía siguen ignorados,
  siguen sin desplegarse y siguen sin mantenerse.

---

## Referencias

- `../apps-script/v2/README.md` — el backend: arquitectura, pruebas y despliegue
- [runbook-deploy-apps-script-v2.md](runbook-deploy-apps-script-v2.md) — el procedimiento
- [checklist-predeploy-backend-v2.md](checklist-predeploy-backend-v2.md) — la lista de una pantalla
- [catalogo-api-publica.md](catalogo-api-publica.md) — el contrato del endpoint
