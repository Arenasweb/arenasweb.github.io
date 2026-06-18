# Contrato de Datos — Futura Integración con Google Sheets

**Estado: NO IMPLEMENTADO.** Este documento define el contrato (esquema y reglas)
que deberá cumplir cualquier fuente de datos remota antes de conectarse al sitio.
Hoy el sitio sigue funcionando exclusivamente con JSON local en `data/` y
`data/slots/`. No se ha conectado ningún endpoint externo ni Google Sheets.

Última actualización: junio 2026 (corrección post-auditoría Codex, segunda vuelta)

---

## Por qué existe este documento ahora

`PLAN-MAESTRO.md` y `docs/catalogo-dinamico.md` mencionan una fase futura de
migración del catálogo a Google Sheets. Antes de conectar esa fuente, el código
ya incorpora un módulo de validación (`script.js` → "MÓDULO 3b: ESQUEMA Y
VALIDACIÓN DE DATOS") que filtra y valida los datos del catálogo, sedes,
WhatsApp, promociones y SEO. Este documento fija el contrato que una hoja de
Google Sheets (u otro JSON remoto) deberá respetar para pasar esas mismas
validaciones sin cambios de código.

---

## Principio rector

> **El JSON local siempre debe seguir funcionando como fallback.** Cuando se
> conecte una fuente remota, debe hacerse de forma que, si la fuente remota
> falla o no responde, el sitio siga funcionando con los archivos locales en
> `data/catalogo.json` y `data/slots/`. Nunca debe quedar el sitio sin datos
> por una caída de Google Sheets.

---

## Contrato por dominio de datos

### 1. Catálogo (motos)

Cada fila/registro exportado desde Sheets debe mapear exactamente a los
campos de `ESQUEMA_MOTO` en `script.js`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | único, kebab-case, no debe cambiar entre sincronizaciones |
| `linea` | string | uno de: Pulsar, Dominar, Boxer, CT (o las que se agreguen) |
| `modelo` | string | |
| `visible` | boolean | controla si aparece en el catálogo |
| `destacado` | boolean | |
| `orden` | number | entero, define el orden de la grilla |
| `precio` | string | formato libre (ej. "S/ 23,800") |
| `precioConfirmado` | boolean | **obligatorio**. Si la hoja no lo trae, se debe asumir `false` |
| `cuotaInicial` | string | |
| `cuotaConfirmada` | boolean | **obligatorio**, mismo criterio que `precioConfirmado` |
| `stock` | string | |
| `stockConfirmado` | boolean | **obligatorio**, mismo criterio |
| `descripcion` | string | texto plano, sin HTML (se inserta vía `textContent`) |
| `fotoPrincipal` | string | **debe ser ruta local** (`assets/...`). Una URL externa será rechazada por `esRutaLocalSegura()` y se mostrará el placeholder |

**Regla crítica:** si la celda de Sheets para `precioConfirmado` / `cuotaConfirmada`
/ `stockConfirmado` está vacía, el exportador (Apps Script u otro) debe
convertirla a `false`, nunca a `true` por defecto. El sitio ya está
programado para mostrar "Consultar" / "Consultar disponibilidad" en ese caso.

### 2. Sedes

Mapea a `ESQUEMA_SEDE`. Campo clave: `estadoAprobacion`. El sitio solo
renderiza una sede si ese campo es exactamente `"aprobado"` o `"confirmado"`
(comparación insensible a mayúsculas, ver `ESTADOS_SEDE_VISIBLES` en
`script.js`). Cualquier otro valor (incluyendo vacío, typos, o estados nuevos
no contemplados) la oculta — es una decisión de diseño defensivo: el
allowlist nunca muestra de más.

`googleMapsUrl`, si se provee, debe ser una URL HTTPS de un dominio en
`DOMINIOS_PERMITIDOS` (`maps.google.com`, `www.google.com`, `goo.gl`). Si no
cumple, el sitio la ignora y genera su propia URL de Maps a partir de la
dirección (siempre segura, dominio fijo).

`telefono`, si se provee, debe contener solo dígitos, espacios, `+`, `-` y
paréntesis (regex en `esTelefonoSeguro()`). Si no cumple el formato, se trata
como pendiente y no se renderiza como enlace `tel:`.

### 3. WhatsApp

Mapea a `ESQUEMA_WHATSAPP_SLOT`. El sitio solo activa los botones de WhatsApp
cuando `data/configuracion.json → whatsappConfirmado` es `true` — esto seguirá
siendo así aunque se conecte Sheets: la fuente remota podría alimentar el
número, pero la bandera de confirmación debe seguir siendo una decisión
explícita, idealmente mantenida fuera de la hoja editable por cualquiera, o
con un control de aprobación separado.

### 4. Promociones

Mapea a `ESQUEMA_PROMOCION`. Solo se muestran promociones con `visible: true`
**y** datos completos (modelo, título, descripción, vigencia). El validador
descarta cualquier registro que no cumpla el esquema mínimo de tipos.

### 5. SEO

**No se sincroniza automáticamente.** Ver `docs/fuente-unica-datos.md` —
`index.html` sigue siendo la fuente autoritativa para crawlers.
`verificarConsistenciaSEO()` en `script.js` compara `data/slots/seo.json`
contra las etiquetas reales de `index.html` y solo emite advertencias en
consola si detecta diferencias. Una futura fuente Sheets para SEO debería
alimentar `seo.json`, nunca el HTML directamente vía JavaScript.

---

## Requisitos técnicos para la futura conexión (cuando se autorice)

1. **Endpoint de solo lectura.** El sitio nunca debe escribir en Sheets desde
   el navegador del visitante (no hay backend de por medio en GitHub Pages).
2. **Mismo esquema, sin excepciones.** El JSON que devuelva el endpoint debe
   pasar por las mismas funciones `validarYFiltrarCatalogo()`,
   `validarYFiltrarSedes()`, `validarYFiltrarPromociones()` ya existentes.
3. **Fallback obligatorio.** Si el `fetch()` a la fuente remota falla (timeout,
   CORS, 404, JSON inválido), el código debe recurrir automáticamente al JSON
   local correspondiente — nunca dejar el catálogo/sedes vacíos por un fallo
   de red externo.
4. **Sin nuevas dependencias.** La integración debe seguir usando `fetch()`
   nativo. No se introducirán SDKs de Google ni librerías de terceros — eso
   rompería la regla de "solo HTML/CSS/JS puro".
5. **HTTPS obligatorio.** Cualquier URL de Sheets/Apps Script debe ser HTTPS.
6. **Validación de URL del propio endpoint.** Antes de hacer `fetch()` a una
   URL remota configurable, esa URL también debería pasar por una variante
   de `esURLExternaSegura()` con el dominio de Google Apps Script añadido a
   `DOMINIOS_PERMITIDOS` explícitamente (ej. `script.google.com`,
   `script.googleusercontent.com`) — no aceptar cualquier dominio.

---

## Qué NO se hace en esta fase

- No se crea ningún archivo de configuración con URLs de Sheets.
- No se modifica `cargarCatalogo()` ni `cargarSlots()` para intentar un
  `fetch()` remoto.
- No se agrega ninguna credencial, API key ni token de Google.
- No se cambia el flujo de `inicializarApp()` — sigue siendo 100% local.

Este documento es exclusivamente de planificación. La implementación real
requiere una decisión explícita del usuario y una nueva sesión de trabajo
dedicada a "conectar Google Sheets", citando este contrato como referencia.
