# Migración del CMS — EJECUTADA el 10 de agosto de 2026

Migración de `estado_contenido` de fórmula a campo manual y activación de la
categoría `carga` en el libro **CATÁLOGO WEB ARENAS — PRODUCCIÓN**.

> ## ✅ EJECUTADA — subfase 3.3C
>
> La migración **se realizó sobre el libro real** el 10 de agosto de 2026, desde
> una sesión con permiso de escritura en Google Sheets.
>
> | Qué | Resultado |
> |---|---|
> | Copia de seguridad | `CATÁLOGO WEB ARENAS — BACKUP PRE MIGRACIÓN ESTADO — 2026-08-10 23-44` |
> | `X2:X23` antes de migrar | 22 × FALSE — verificado antes de tocar nada |
> | Fórmula legacy en `Y2:Y23` | **retirada** |
> | `Y2:Y23` | 22 × `BORRADOR` |
> | Validación de datos en `Y2:Y23` | lista estricta `BORRADOR` · `APROBADO` |
> | `CATEGORIAS`, `carga` | FALSE → **TRUE** (operación separada) |
> | Modelos aprobados | **0** |
> | Modelos activados | **0** |
>
> No hubo despliegue de Apps Script, ni conexión del frontend remoto, ni commit,
> ni push.
>
> **Este documento pasa a ser el registro de lo hecho y la referencia de vuelta
> atrás.** La fórmula anterior se conserva en §6 como **legacy**, únicamente para
> poder restaurarla; no debe volver a usarse como aprobación.

Análisis que lo justifica: [contraste-sheets-real.md](contraste-sheets-real.md).

---

## 1. El contrato del CMS, formalizado

Dos columnas, dos preguntas distintas:

| Columna | Responde | Quién decide | Valores |
|---|---|---|---|
| `estado_contenido` | ¿El contenido está aprobado? | Quien revisa | `BORRADOR` · `APROBADO` |
| `activo` | ¿Quiero esto visible ahora? | Quien gestiona el catálogo | casilla |

### La tabla de verdad

| `estado_contenido` | `activo` | Contenido | ¿Se ve? |
|---|---|---|---|
| BORRADOR | FALSE | cualquiera | **No** |
| BORRADOR | TRUE | completo | **No** |
| APROBADO | FALSE | completo | **No** |
| APROBADO | TRUE | **incompleto** | **No** |
| APROBADO | TRUE | completo | **Sí** |

Tres condiciones. Ninguna es prescindible.

---

## 2. Orden de trabajo del equipo

1. Crear o completar el modelo — `activo` **desmarcado**, estado `BORRADOR`.
2. Cargar la fotografía y escribir su ruta.
3. Completar `alt_text` y `descripcion_corta`.
4. Revisar en `catalogo.html?preview=1`.
5. Ver qué falta en `?preview=1&debug=1` o con `node scripts/qa-catalogo.mjs`.
6. Resolver lo que QA señale.
7. **Aprobar**: `estado_contenido = APROBADO`.
8. **Publicar**: marcar `activo`. ← última acción, deliberada.

Los pasos 7 y 8 son dos decisiones separadas a propósito. Ninguna fórmula debe
poder darlas por hecho.

---

## 3. Migración de `estado_contenido` — secuencia seguida

Rango afectado: **`MODELOS_WEB!Y2:Y23`** (22 filas). **Ejecutada.** La tabla se
conserva como registro de lo hecho y como guion si algún día hay que repetirla
sobre otro libro.

| Paso | Acción | Verificación antes de continuar |
|---|---|---|
| **0** | Crear copia de seguridad (§5) | La copia existe y abre correctamente |
| **1** | Leer `X2:X23` (`activo`) | **22 × FALSE.** Si hay un solo TRUE → **ABORTAR** |
| **2** | Guardar la fórmula actual en este documento (§6) | Está escrita literalmente |
| **3** | Borrar el contenido de `Y2:Y23` | El rango queda vacío |
| **4** | Escribir `BORRADOR` en `Y2:Y23` | Las 22 celdas dicen `BORRADOR` |
| **5** | Aplicar validación de datos a `Y2:Y23` (§4) | El desplegable ofrece dos opciones |
| **6** | Releer `Y2:Y23` | 22 × `BORRADOR`, ninguna `APROBADO` |
| **7** | Releer `X2:X23` | 22 × FALSE |
| **8** | Comprobar los 28 encabezados de la fila 1 | Coinciden con el contrato |
| **9** | Volcar y ejecutar `node scripts/qa-catalogo.mjs` | Sin errores estructurales |
| **10** | Confirmar el recuento público | **0 modelos publicados** |

El paso 1 es la red de seguridad de toda la operación: con `activo` desmarcado
en las 22, **ningún valor de `estado_contenido` puede publicar nada**. Todos los
pasos intermedios son seguros por construcción.

**Ninguna fila puede quedar en `APROBADO`.** La aprobación es posterior, humana
y modelo por modelo.

---

## 4. Validación de datos — **aplicada**

Rango: `MODELOS_WEB!Y2:Y23`. Conviene **extenderla hacia abajo** al añadir
modelos: la validación cubre hoy exactamente las 22 filas existentes.

```
Criterios      : Lista de elementos
Elementos      : BORRADOR,APROBADO
Mostrar lista desplegable en la celda : sí
Si los datos no son válidos           : Rechazar la entrada
Texto de ayuda : "BORRADOR mientras se trabaja. APROBADO solo tras revisar
                  el contenido. Publicar requiere además marcar `activo`."
```

**Solo dos opciones.** No se añadieron `LISTO`, `LISTO PARA WEB`,
`LISTO PARA REVISIÓN`, `REVISADO` ni `PUBLICADO`: el estado automático ya lo
calculan las herramientas de QA, con los ocho mínimos reales en vez de cuatro
celdas no vacías. Un desplegable con cinco opciones vuelve a mezclar «los datos
están» con «autorizo publicar», que es el defecto que esta migración corrigió.

> **`EN_REVISION` tampoco está en el desplegable.** El backend lo sigue
> aceptando como valor válido —y lo trata como no publicable, igual que
> `BORRADOR`—, pero el CMS ya no lo ofrece y la validación estricta lo rechaza si
> se escribe a mano. Dos estados bastan: en trabajo, o autorizado.

El backend normaliza mayúsculas y espacios por seguridad, pero el CMS debe
ofrecer opciones limpias: la defensa del código no es excusa para un desplegable
confuso.

---

## 5. Copia de seguridad — **hecha**

Se optó por la copia del libro completo (*Archivo → Hacer una copia*), que
preserva fórmulas, formatos, validaciones y el resto de pestañas:

```
CATÁLOGO WEB ARENAS — BACKUP PRE MIGRACIÓN ESTADO — 2026-08-10 23-44
```

Es el punto de retorno del **nivel 3** de la tabla de vuelta atrás (§8). Mientras
exista, la migración es reversible por completo.

**No borrar esta copia** sin decisión expresa del propietario, y no antes de que
haya modelos publicados y estables.

---

## 6. La fórmula legacy — **RETIRADA del libro**

Ya **no está en el libro**. Se conserva aquí literalmente, y solo por dos
motivos: dejar constancia histórica de qué se retiró, y hacer posible una
restauración de emergencia si alguna vez se necesitara.

```
=IF(C2="";"";IF(X2=TRUE;IF(AND(H2<>"";L2<>"");"LISTO PARA WEB";"REVISAR CONTENIDO");"BORRADOR"))
```

Estaba replicada en `Y2:Y23` ajustando el número de fila.

Columnas que consultaba: `C` = modelo · `X` = activo · `H` = descripcion_corta ·
`L` = imagen_principal.

> **No volver a ponerla.** Comprueba cuatro celdas no vacías e ignora `id`,
> `slug` válido, taxonomía, seguridad de la ruta, `alt_text` real, texto
> provisional y categoría activa. Y era automática: convertía la publicación en
> algo que ocurría solo. Restaurarla deshace exactamente lo que esta migración
> vino a corregir.

---

## 7. Criterios de aborto — ninguno se disparó

Estas eran las condiciones para detener la operación **inmediatamente**. Se
registran porque siguen valiendo para cualquier intervención futura sobre el
libro:

- Alguna fila tiene `activo = TRUE` antes de empezar.
- Los encabezados no coinciden con las 28 columnas del contrato.
- Hay más o menos de 22 filas de modelos sin que nadie lo haya anunciado.
- La columna `Y` resulta no ser `estado_contenido`.
- Aparece un `APROBADO` que nadie ha escrito.
- Hay `id` o `slug` duplicados.
- Alguien está editando `MODELOS_WEB` durante la operación.
- La copia de seguridad falla o no se puede abrir.
- La validación de datos no se deja configurar con exactamente dos opciones.
- Tras migrar, QA reporta algún modelo público.

Abortar **no es** un fracaso: es el comportamiento correcto. Con la copia hecha
y `activo` en FALSE, volver atrás es trivial en cualquier punto.

En la ejecución del 10 de agosto de 2026 **no se cumplió ninguna**: las 22 filas
estaban en `activo = FALSE` antes de empezar, y siguen estándolo.

---

## 8. Vuelta atrás, por niveles

De más rápido a más profundo:

| Nivel | Acción | Efecto | Cuándo |
|---|---|---|---|
| **1** | Desmarcar `activo` en `X2:X23` | Detiene la publicación **aunque `Y` diga `APROBADO`** | Emergencia: algo se publicó sin querer |
| **2** | Escribir `BORRADOR` en `Y2:Y23` | Deshace la aprobación | La migración terminó pero hay valores raros |
| **3** | Restaurar la copia de seguridad | Deja el libro como estaba | Algo se rompió estructuralmente |
| **4** | `CONFIG.modoDatos = "local"` en `catalogo-data.js` | La web deja de leer el endpoint | Problema del lado de la API |

Los niveles 1–3 son del **CMS**. El nivel 4 es del **frontend** y requiere editar
y publicar el sitio: **no es un interruptor remoto**. Si hace falta cortar al
instante sin publicar, lo más rápido es que el endpoint deje de responder — el
fallback local se activa solo.

Hay además una vuelta atrás de la **API**: `limpiarCache()` desde el editor de
Apps Script fuerza a releer la hoja sin esperar al TTL.

> Estado posterior al despliegue: el árbol de trabajo ya está conectado al
> endpoint con fallback local. La web publicada no cambia hasta el push y, en
> cualquier origen, solo aparecen modelos completos, `APROBADO` y activos.

---

## 9. Categoría `carga` — **ACTIVADA**

Celda: `CATEGORIAS`, fila con `slug = carga`, columna `activo`: FALSE → **TRUE**.
Hecho el 10 de agosto de 2026, en una operación **separada** de la migración de
estado, después de verificar 0 publicados.

Estado de la taxonomía tras el cambio:

| Categoría | `activo` |
|---|---|
| ciudad · trabajo · deportiva · aventura · **carga** | **TRUE** |
| touring · rural · iniciacion | FALSE |

### Por qué activarla y no recategorizar

Cinco modelos usan `carga`: el Mototaxi 4T STD Crom-UG R y los cuatro Torito.
Son vehículos de carga y transporte. Meterlos en `ciudad`, `trabajo`,
`deportiva` o `aventura` forzaría la taxonomía y confundiría al visitante que
filtre. El frontend ya soporta `carga` por completo — chip, filtro y etiqueta.

Activar la categoría es **el cambio mínimo**: una celda.

### Por qué después y no a la vez

Para poder aislar la causa si algo iba mal. Primero se migró el estado y se
verificó 0 públicos; después se activó `carga` y se volvió a verificar. Si
hubiera aparecido algo inesperado, se sabría cuál de los dos cambios lo provocó.

### Fue de bajo riesgo, comprobado

Los cinco modelos de carga siguen en `BORRADOR`, inactivos y sin fotografía.
La simulación lo anticipó y la verificación posterior lo confirmó: **activar
`carga` por sí sola publica 0 modelos**.

Activar la categoría **habilita el filtro, no publica nada**. El chip «Carga y
transporte» seguirá sin aparecer mientras ninguno de los cinco modelos tenga
fotografía, aprobación y `activo`.

**No se tocaron** `touring`, `rural` ni `iniciacion`: siguen en FALSE.

---

## 10. Aprobación en lote — no

La migración de `estado_contenido` **sí es global**: es un cambio de contrato y
las 22 filas deben quedar en `BORRADOR`.

La **aprobación posterior es modelo por modelo**. Nunca en lote. Aprobar es
decir «he mirado esta ficha y la autorizo», y eso no se hace arrastrando una
celda hacia abajo.

Aun así, hay una última red: la simulación confirma que **poner las 22 en
`APROBADO` y activas publicaría 0 modelos**, porque ninguna tiene fotografía.
El contenido mínimo protege incluso frente a un error humano de ese tamaño.

---

## 11. La hoja crecerá

La migración trabaja sobre `Y2:Y23` porque son las 22 filas contrastadas hoy.
**El código no asume ese número en ningún sitio**: el backend lee las filas que
haya. Al añadir modelos, basta con extender la validación de datos hacia abajo.

---

## 12. Subfase 3.3C — ejecutada

| Paso | Qué | Resultado |
|---|---|---|
| **3.3C-1** | Copia de seguridad | ✅ `— BACKUP PRE MIGRACIÓN ESTADO — 2026-08-10 23-44` |
| **3.3C-2** | Migrar `estado_contenido` (§3) | ✅ 22 × `BORRADOR` · 22 × `activo` FALSE · validación estricta aplicada |
| **3.3C-3** | Verificar | ✅ 0 aprobados · 0 activos · 0 públicos |
| **3.3C-4** | Activar `carga` | ✅ una celda: FALSE → TRUE |
| **3.3C-5** | Verificar | ✅ 0 públicos · chip de carga ausente, por no haber modelos publicados |

La parada deliberada entre 3.3C-3 y 3.3C-4 se respetó: fueron dos operaciones
separadas, cada una con su verificación.

**3.3C está cerrada. No se repite.**

---

## 13. Autorización — concedida y ejecutada

El propietario autorizó la subfase 3.3C sobre el libro real. Registro de lo
autorizado y de lo efectivamente hecho:

```
AUTORIZADO Y EJECUTADO — 10 de agosto de 2026

[x] Crear copia de seguridad del spreadsheet completo
[x] Retirar la fórmula de estado_contenido en Y2:Y23
[x] Escribir BORRADOR en las 22 filas
[x] Configurar validación de datos con BORRADOR y APROBADO
[x] Activar la categoría `carga` (FALSE → TRUE)

CONFIRMADO QUE NO SE HIZO:

[x] Aprobar ningún modelo          → 0 aprobados
[x] Activar ningún modelo          → 0 activos
[x] Tocar precios, slugs, ids, categorías distintas de `carga`
[x] Desplegar Apps Script
[x] Conectar el frontend al endpoint remoto
```

La escritura la realizó una sesión con permiso de escritura en Google Sheets. El
repositorio local no participó en la operación: aquí solo se registra.

---

## 14. Lo que NO se tocó — y sigue sin tocarse

`CONFIG_PUBLICA` (compatible) · precios · slugs · ids · `destacado` ·
`touring`/`rural`/`iniciacion` · fórmulas de otras pestañas · nombres
comerciales · `COLORES_MODELO_WEB` (sigue sin existir).

Nombres pendientes de verificación comercial, **sin tocar**: `UG` · `UG2` ·
`FI` · `Disc` · `Crom-UG R` · `Slujo` · `Clásico`.

---

## 15. La simulación previa

```bash
node scripts/qa-migracion-sheets.mjs
```

Simula los 22 modelos con sus tipos reales y compara el antes y el después sin
conectarse a Google. Respondía a la única pregunta que importaba: **¿puede esta
migración publicar algo sin querer?** La respuesta fue no, y la ejecución real lo
confirmó.

Se conserva: sigue siendo la red antes de cualquier cambio de estado futuro.

---

## 16. Cómo verificar el estado del libro

Sirve para auditar el libro **en cualquier momento**, no solo tras la migración:
confirma que sigue habiendo 0 publicados y que nadie ha reintroducido la fórmula.

### Exportar

En el libro, **situarse en la pestaña `MODELOS_WEB`** y:

```
Archivo → Descargar → Valores separados por comas (.csv)
```

Repetir con la pestaña `CATEGORIAS`. Google exporta **solo la pestaña activa**,
de ahí que haya que situarse antes.

### Verificar

```bash
node scripts/qa-verificar-migracion.mjs modelos.csv
node scripts/qa-verificar-migracion.mjs modelos.csv categorias.csv
```

Comprueba, sobre la hoja ya migrada:

| Bloque | Qué mira |
|---|---|
| **Estructura** | Las 28 columnas, sin encabezados duplicados |
| **La migración** | Que no quede ningún `LISTO PARA WEB` ni `REVISAR CONTENIDO`; que todo sea `BORRADOR` o `APROBADO`; que **ninguna** fila esté en `APROBADO` |
| **Nada publicado** | Ninguna moto activa · 0 publicados |
| **Nada más tocado** | Slugs presentes, válidos y sin duplicar · ids sin duplicar · categorías dentro de la taxonomía |
| **`CATEGORIAS`** | Estado de `carga` · que `touring`, `rural` e `iniciacion` sigan inactivas |

`exit 0` significa que la hoja quedó como debe. `exit 1` dice qué falló y nombra
las filas implicadas.

> Al exportar a CSV **las fórmulas se convierten en su valor**. Eso juega a
> favor: si `estado_contenido` siguiera siendo una fórmula, en el CSV aparecería
> `LISTO PARA WEB` y la herramienta lo detectaría igual.

El CSV exportado es un archivo temporal de trabajo: **no se guarda en el
repositorio**.

---

## Referencias

- [contraste-sheets-real.md](contraste-sheets-real.md) — el análisis
- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — la regla de publicación
- [catalogo-modelos-web.md](catalogo-modelos-web.md) — las 28 columnas
- `../apps-script/v2/README.md` — el backend
