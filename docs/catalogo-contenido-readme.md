# Contenido del catálogo — por dónde empezar

Índice de la documentación del catálogo. **Es un mapa: no repite contenido.**

---

## Dónde estamos

| Subfase | Estado |
|---|---|
| **3.3C** — migración del CMS | **EJECUTADA** el 10/08/2026 sobre el libro real |
| **3.3D** — sincronización documental | **CERRADA** |
| **3.4A–B** — preparación y auditoría pre-despliegue | **CERRADAS** |
| **3.4C** — despliegue controlado del backend v2 | **EJECUTADA** el 11/08/2026 |
| **3.4D** — validación del endpoint real | **CERRADA** · endpoint, contrato y CORS aprobados |
| Conexión, publicación y QA en producción | **CERRADA** el 11/08/2026 · 9/9 controles públicos aprobados |

El backend v2 está desplegado y el frontend del árbol de trabajo usa
`modoDatos: "remoto"`. El endpoint devuelve correctamente **0 modelos
publicados**: las 22 filas siguen en `BORRADOR`, inactivas y sin fotografía.
El fallback local conserva el mismo cierre en producción y la previsualización
editorial de localhost conserva los 22 borradores.

Pendiente de una persona: las 22 fotografías y la aprobación modelo por modelo.
La integración técnica de la Fase 3 está cerrada. El siguiente trabajo del
catálogo depende de contenido real aprobado; no se publica ningún modelo para
forzar una demostración.

---

## Si vas a rellenar la hoja

| Documento | Para qué |
|---|---|
| [guia-carga-contenido-catalogo.md](guia-carga-contenido-catalogo.md) | Cómo rellenar cada celda, paso a paso, sin tecnicismos |
| [checklist-modelo-publicable.md](checklist-modelo-publicable.md) | Repaso antes de activar un modelo |
| [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) | Qué hace exactamente que un modelo se vea |

## Si vas a preparar fotografías

| Documento | Para qué |
|---|---|
| [especificacion-imagenes-catalogo.md](especificacion-imagenes-catalogo.md) | Medidas, peso, encuadre — y de dónde salen esos números |
| [pipeline-fotografias.md](pipeline-fotografias.md) | Qué ocurre desde que llega una foto hasta que se publica |
| [lotes-carga-22-modelos.md](lotes-carga-22-modelos.md) | En qué orden cargar los 22 modelos |
| `../assets/catalogo/LEEME.md` | Recordatorio breve, junto a las carpetas |

## Si vas a tocar los datos o el código

| Documento | Para qué |
|---|---|
| [catalogo-modelos-web.md](catalogo-modelos-web.md) | El contrato: las 28 columnas de `MODELOS_WEB` |
| [contrato-sheets-frontend.md](contrato-sheets-frontend.md) | Qué consume el frontend de cada columna |
| [catalogo-api-publica.md](catalogo-api-publica.md) | El contrato del endpoint: petición, respuesta, errores, caché |
| [contraste-sheets-real.md](contraste-sheets-real.md) | Qué contiene el libro real frente a lo que el backend espera, y por qué hubo que migrarlo |
| [plan-migracion-cms-sheets.md](plan-migracion-cms-sheets.md) | Registro de la migración de `estado_contenido` — **ejecutada el 10/08/2026** — con la fórmula legacy y la vuelta atrás |
| `../apps-script/v2/README.md` | El backend reconciliado: arquitectura, pruebas, despliegue y vuelta atrás |

## Backend desplegado

**Estado: DESPLEGADO Y VALIDADO.** La URL pública se conserva en un único lugar:
`CONFIG.appsScriptEndpoint` de `assets/js/catalogo/catalogo-data.js`.

| Documento | Para qué |
|---|---|
| [runbook-deploy-apps-script-v2.md](runbook-deploy-apps-script-v2.md) | El procedimiento completo, paso a paso, con criterios de aborto y modelo de amenazas |
| [checklist-predeploy-backend-v2.md](checklist-predeploy-backend-v2.md) | La lista corta, para tener al lado mientras se despliega |
| [banco-pruebas-endpoint-real.md](banco-pruebas-endpoint-real.md) | Las cuatro herramientas de verificación y cómo se leen |
| [decision-versionado-apps-script-v2.md](decision-versionado-apps-script-v2.md) | Por qué el paquete v2 entra en Git y el anterior no |
| [colores-modelo-web.md](colores-modelo-web.md) | El contrato de `COLORES_MODELO_WEB` (hoja aún inexistente) |
| [migracion-colores-demo-a-reales.md](migracion-colores-demo-a-reales.md) | Cómo pasar del fixture de prueba a colores comerciales |

## Estado del piloto

| Documento | Para qué |
|---|---|
| [piloto-3-modelos.md](piloto-3-modelos.md) | Expediente campo por campo de los tres primeros modelos |
| [piloto-google-sheets.md](piloto-google-sheets.md) | Tabla de revisión antes de escribir en la hoja |

---

## Las herramientas

Ninguna necesita instalar nada. Node y ya.

```bash
# Contenido: coherencia, qué falta, tablero
node scripts/qa-catalogo.mjs
node scripts/qa-catalogo.mjs --detalle       # modelo a modelo
node scripts/qa-catalogo.mjs --matriz        # tablero de los 22
node scripts/qa-catalogo.mjs --faltantes     # qué pedir, por prioridad
node scripts/qa-catalogo.mjs --slug a,b      # solo esos modelos
node scripts/qa-catalogo.mjs --json          # para otra herramienta
node scripts/qa-catalogo.mjs --fuente X      # auditar otro archivo

# Fotografías: carpetas, medidas, peso, huérfanos
node scripts/qa-assets-catalogo.mjs
node scripts/qa-assets-catalogo.mjs --detalle

# El contrato se comporta como dice
node scripts/qa-tests.mjs

# El backend de Apps Script, sin desplegarlo
node scripts/qa-api-catalogo.mjs
node scripts/qa-api-catalogo.mjs --json          # el JSON que saldría
node scripts/qa-api-catalogo.mjs --json --real   # con los 22 modelos reales

# La infraestructura del endpoint, con dobles de Apps Script
node scripts/qa-endpoint-catalogo.mjs

# La migración del CMS, simulada sin tocar Google
node scripts/qa-migracion-sheets.mjs

# Auditar una exportación CSV del libro: 0 publicados, sin fórmula legacy
node scripts/qa-verificar-migracion.mjs modelos.csv [categorias.csv]

# El paquete de Apps Script es apto para desplegarse
node scripts/qa-predeploy-apps-script.mjs
node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID del libro>"
node scripts/qa-predeploy-tests.mjs          # y la guarda detecta de verdad

# El contrato remoto contra el frontend real, sin conectar nada
node scripts/qa-contrato-remoto.mjs
node scripts/qa-contrato-remoto.mjs respuesta.json

# Validar el endpoint desplegado
node scripts/qa-endpoint-real.mjs --endpoint="https://…/exec"
node scripts/qa-endpoint-real-tests.mjs      # y el banco detecta de verdad
```

**Criterio de salida:** `0` = sin errores estructurales. `1` = hay alguno.
Que falte contenido **nunca** es un error: es el estado normal mientras el
catálogo se llena.

### Y en el navegador

| URL | Qué muestra |
|---|---|
| `catalogo.html` | Lo que ve el público |
| `catalogo.html?preview=1` | También los modelos sin publicar, rotulados |
| `catalogo.html?preview=1&debug=1` | Panel editorial: qué falta y dónde está atascado |
| `modelo.html?slug=X&preview=1` | Una ficha |
| `modelo.html?slug=X&preview=1&color=Y` | Una ficha en un color concreto |
| `tests/manual/endpoint-cors-test.html` | Banco de CORS. **Herramienta de desarrollo**, no enlazada desde el sitio |

`preview` y `debug` **solo funcionan en `localhost`**. En GitHub Pages se ignoran.
El banco de CORS hay que servirlo por HTTP: con `file://` el origen es `null` y
el resultado no sería representativo.

---

## Las reglas que no se negocian

1. **No se inventan datos.** Ni precios, ni especificaciones, ni colores, ni
   fotos, ni disponibilidad. Si no hay dato, la celda se queda vacía.
2. **La hoja manda sobre el contenido; el código, sobre la presentación.** El
   repositorio no es una base de datos comercial.
3. **Ante la duda, no se publica.** Todos los valores por defecto van hacia no
   mostrar.
4. **Sin stock.** El contrato no tiene columnas de cantidades, chasis, motores ni
   ubicaciones, y no debe tenerlas.
5. **Una ruta a un archivo inexistente es un error**, no un aviso. La celda vacía
   es la forma correcta de decir «todavía no».

---

## Otros documentos del proyecto

- [control-publicacion-datos.md](control-publicacion-datos.md) — el **otro** sistema de estados, el de la portada. No se mezcla con el del catálogo.
- [arquitectura-tecnica.md](arquitectura-tecnica.md) — visión general del sitio
- [fuente-unica-datos.md](fuente-unica-datos.md) — por qué Google Sheets es la fuente
