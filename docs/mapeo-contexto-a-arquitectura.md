# Mapeo: Contexto del Cliente → Arquitectura de Datos

**Propósito:** Explicar cómo la información comercial recogida en `docs/contexto-cliente-arenas.md` se conecta — conceptualmente, todavía no en código — con el futuro panel de Google Sheets ("PANEL WEB ARENAS"), con los archivos `data/slots/` ya existentes, y con el frontend estático actual.

**Estado: solo documentación.** Este mapeo no modifica `index.html`, `style.css`, `script.js` ni ningún `data/*.json` o `data/slots/*.json`. No se conecta Google Sheets. No se crea ningún endpoint. Es el plano de qué-va-dónde para cuando se autorice el siguiente paso.

Última actualización: junio 2026

---

## Vista general de la cadena de datos

```
Cliente (contexto comercial real)
        ↓
docs/contexto-cliente-arenas.md   (registro humano, este momento)
        ↓
PANEL WEB ARENAS — Google Sheets   (futuro: captura editable por el negocio)
        ↓
Apps Script (doGet → JSON)         (futuro endpoint — ver docs/contrato-datos-google-sheets.md)
        ↓
fetch() desde script.js            (futuro — NO implementado)
        ↓
Validadores de script.js           (ya existen: validarYFiltrarCatalogo, validarYFiltrarSedes, etc.)
        ↓
Frontend estático (index.html)     (renderiza solo si los validadores aprueban Y el dato está confirmado)

      ⬑ FALLBACK PERMANENTE en cada paso: data/*.json y data/slots/*.json locales
```

El frontend estático **nunca cambia su forma de funcionar** por este mapeo: hoy lee JSON local, y cuando (si) se conecte Sheets, seguirá leyendo JSON — simplemente ese JSON podría, en el futuro, venir de un Apps Script en lugar de un archivo local. El contrato de datos (`docs/contrato-datos-google-sheets.md`) ya exige que el JSON local siga siendo el fallback permanente.

---

## Mapeo por pestaña del PANEL WEB ARENAS

### 07_HERO

| | |
|---|---|
| **Contenido esperado** | Headline, subtítulo, CTA principal del hero |
| **Origen en el contexto del cliente** | Mensaje de marca ("confianza, calidad y garantía"), CTAs sugeridos (Cotiza por WhatsApp, Ver modelos, Solicita tu crédito) |
| **Archivo local equivalente hoy** | `data/slots/hero.json` |
| **Estado de los datos** | El mensaje de marca es información real del cliente; los textos exactos del hero (headline definitivo) siguen sin decidirse — eso es trabajo de la fase de diseño, no de este mapeo |

### 08_BENEFICIOS

| | |
|---|---|
| **Contenido esperado** | Razones para elegir Arenas, propuesta de valor |
| **Origen en el contexto del cliente** | Propuesta de valor (variedad, calidad, atención), sello de marca autorizada y trayectoria — datos administrados desde Google Sheets |
| **Archivo local equivalente hoy** | `data/slots/beneficios.json` |
| **Estado de los datos** | La propuesta de valor y el sello de marca autorizada son datos confirmados por el cliente; sin embargo, `beneficios.json` actual está orientado a "qué incluye la compra de una moto" (placa, casco, garantía, etc.), que es un concepto distinto — ver nota de reconciliación abajo |

### 05_SEDES

| | |
|---|---|
| **Contenido esperado** | Dirección, coordenadas, horario, teléfono de cada sede |
| **Origen en el contexto del cliente** | Dirección, plus code, coordenadas y horarios reportados por el cliente — datos administrados desde Google Sheets, no se conservan en este repositorio público |
| **Archivo local equivalente hoy** | `data/slots/sedes.json` |
| **Estado de los datos** | Dirección y coordenadas son datos reales aportados por el cliente — **pero el horario del sábado sigue marcado como pendiente por el propio cliente**, y el campo `estadoAprobacion` de la sede principal en `sedes.json` sigue sin pasar a `"aprobado"`. Este mapeo no cambia ese estado |

### 04_WHATSAPP

| | |
|---|---|
| **Contenido esperado** | Número(s) de WhatsApp activos, mensajes predefinidos por área |
| **Origen en el contexto del cliente** | WhatsApp/Tel 1 y Tel 2 (ver registro interno de gerencia) |
| **Archivo local equivalente hoy** | `data/slots/whatsapp.json` (números segmentados por área, hoy todos en `"pendiente"`) y `data/configuracion.json → whatsapp` + `whatsappConfirmado` (fuente activa que realmente lee `script.js`) |
| **Estado de los datos** | El cliente entregó dos números reales. Esto **no implica que `whatsappConfirmado` deba cambiar a `true`** — ese cambio requiere una decisión explícita de aprobación, no solo la existencia del dato. Ver `docs/fuente-unica-datos.md` para qué archivo manda |

### 10_SEO

| | |
|---|---|
| **Contenido esperado** | Title, description, keywords, Open Graph, canonical |
| **Origen en el contexto del cliente** | Nombre comercial, nombres usados en redes (red social administrada desde Google Sheets), rubro, ubicación (ciudad) — insumos para keywords locales |
| **Archivo local equivalente hoy** | `data/slots/seo.json` |
| **Estado de los datos** | `index.html` sigue siendo la fuente autoritativa para crawlers (ver `docs/fuente-unica-datos.md` → sección SEO). Esta pestaña, cuando exista, alimentaría `seo.json` como capa de referencia — nunca el HTML directamente |

### 99_CONTROL

| | |
|---|---|
| **Contenido esperado** | Estado de aprobación de cada pestaña/dato, responsable de cada cambio, fecha de última actualización |
| **Origen en el contexto del cliente** | La sección "Datos pendientes de aprobación gerencial" de `docs/contexto-cliente-arenas.md` es, en esencia, el contenido inicial que poblaría esta pestaña |
| **Archivo local equivalente hoy** | `data/slots/control.json` — **existe** y actúa como contrato operativo local de esta futura pestaña. Mantiene banderas conservadoras: `googleSheetsConectado: false`, `appsScriptEndpoint: ""`, `fallbackLocal: true`, `permitirDatosPendientes: false` y todas las banderas `mostrar*` en `false`. Ver `docs/control-publicacion-datos.md` |
| **Estado de los datos** | Google Sheets sigue desconectado. El fallback local es neutro (sin datos comerciales reales). Los datos comerciales reales deben vivir en Google Sheets; `control.json` solo gobierna qué se permite mostrar, y sus valores no se cambian sin decisión explícita de gerencia |

### Pestañas no cubiertas en este mapeo

El contexto entregado no menciona explícitamente las pestañas numeradas 01, 02, 03, 06 ni 09 del PANEL WEB ARENAS. No se inventan nombres ni contenidos para ellas — quedan fuera de alcance de este documento hasta que se reciba esa información.

---

## Mapeo con el futuro endpoint JSON

Cuando exista (no existe hoy):

1. El endpoint (Apps Script, según `docs/contrato-datos-google-sheets.md`) leería las pestañas del PANEL WEB ARENAS y devolvería un JSON por dominio, con la misma forma que los archivos locales actuales (`ESQUEMA_MOTO`, `ESQUEMA_SEDE`, `ESQUEMA_WHATSAPP_SLOT`, `ESQUEMA_SEO_SLOT`, etc., definidos en `script.js`).
2. Las pestañas 07_HERO, 08_BENEFICIOS, 05_SEDES, 04_WHATSAPP y 10_SEO mapean directamente a los slots ya nombrados igual (`hero.json`, `beneficios.json`, `sedes.json`, `whatsapp.json`, `seo.json`), lo cual minimiza el trabajo de adaptación del lado del frontend cuando se autorice la conexión.
3. 99_CONTROL ya cuenta con un contrato local (`data/slots/control.json`, banderas conservadoras) pero no tiene aún un consumidor de render en `script.js` — su rol es de gobierno/gestión, no de presentación.

---

## Mapeo con el frontend estático

El frontend (`index.html` + `script.js`) **no cambia de comportamiento** por este documento. Hoy:

- Lee `data/catalogo.json` y `data/configuracion.json` directamente.
- Lee los 12 archivos de `data/slots/` vía `cargarSlots()`.
- Aplica las reglas ya existentes de "no mostrar dato no confirmado como real" (`precioConfirmado`, `cuotaConfirmada`, `stockConfirmado`, `estadoAprobacion === "aprobado"`, `whatsappConfirmado`).

Nada de lo documentado aquí activa, cambia o adelanta esas reglas. Son las mismas que ya auditó Codex.

---

## Mapeo con el fallback local

Independientemente de si en el futuro se conecta el PANEL WEB ARENAS vía Apps Script, el principio ya establecido en `docs/contrato-datos-google-sheets.md` se mantiene intacto:

> El JSON local en `data/` y `data/slots/` es el fallback permanente. Si la fuente remota falla, el sitio sigue funcionando con los archivos locales.

Este mapeo no requiere ni sugiere ningún cambio a ese principio.

---

## Reconciliaciones pendientes (detectadas al mapear, no resueltas aquí)

1. **Líneas de producto:** existe una discrepancia entre las líneas reportadas por el cliente y las registradas previamente (los nombres reales se administran desde Google Sheets, no en este repo). Requiere confirmación del cliente antes de definir el catálogo en la hoja.
2. **"Beneficios" como concepto:** el contexto del cliente usa "beneficios" para propuesta de valor de marca; `data/slots/beneficios.json` ya existente lo usa para "qué incluye la compra de una moto" (placa, casco, etc.). Ambos conceptos son válidos pero distintos — al diseñar 08_BENEFICIOS habrá que decidir si son una sola pestaña o dos.
3. **Prueba social cambiante:** las cifras de seguidores/reseñas no son números fijos — son datos administrados desde Google Sheets, no se conservan cifras exactas en el repositorio público.

Ninguna de estas reconciliaciones se resuelve en este documento — quedan registradas para la siguiente sesión de trabajo sobre datos.

---

## Próximos pasos recomendados

1. Gerencia revisa `docs/contexto-cliente-arenas.md` y confirma/corrige los datos pendientes listados.
2. Se resuelven las reconciliaciones de catálogo y de concepto "beneficios" antes de definir las columnas finales de 07_HERO/08_BENEFICIOS.
3. Solo entonces se diseña el PANEL WEB ARENAS real en Google Sheets, usando como base las columnas ya definidas en `docs/contrato-datos-google-sheets.md`.
4. La conexión real (Apps Script + `fetch()` + validadores) se implementa en una sesión dedicada y autorizada explícitamente — no antes.

---

## Modelo legacy retirado del catálogo público (junio 2026)

Un modelo histórico que no aparece en la lista oficial de categorías/modelos del cliente (Urban, Street, Raiser, Adventure, Trabajo/Carga) fue retirado por completo del array público de `data/catalogo.json` — no basta con `visible: false`, porque ese archivo es público en GitHub Pages (cualquiera puede leer el JSON crudo, no solo lo que se renderiza).

El registro completo (specs, rutas de assets) no se conserva en este documento público — ver registro interno de gerencia. Si en el futuro se confirma que el modelo sigue vigente bajo otro nombre o debe reincorporarse al catálogo oficial, debe recrearse con datos reales confirmados (precio, stock, etc. en `"Consultar"` hasta aprobación), no con valores legado.

---

## Referencias relacionadas

- `docs/contexto-cliente-arenas.md`
- `docs/contrato-datos-google-sheets.md`
- `docs/fuente-unica-datos.md`
- `docs/requisitos-pendientes-gerencia.md`
- `docs/sistema-slots-editables.md`
