# Fuente Única de Datos — ARENAS MOTOCICLETAS

**Propósito:** Resolver la duplicación entre `index.html` estático, `data/configuracion.json`, `data/slots/` y `data/catalogo.json`, dejando claro qué archivo manda para cada dominio de datos.  
Última actualización: junio 2026 (corrección post-auditoría Codex)

---

## Regla general

> Si dos archivos contienen el mismo dato y entran en conflicto, **gana el archivo marcado aquí como fuente única**. El otro archivo debe tratarse como legado/fallback y no debe editarse esperando que cambie algo visible en el sitio.

---

## Tabla de fuentes por dominio

| Dominio | Fuente única | Archivos relacionados (NO autoritativos) |
|---------|-------------|--------------------------------------------|
| **Empresa** (razón social, RUC, representante legal) | `data/slots/empresa.json` | — |
| **WhatsApp** (número activo del sitio) | `data/configuracion.json → whatsapp` + `whatsappConfirmado` | `data/slots/whatsapp.json` (números segmentados por área, aún no consumidos por `script.js`), `data/catalogo.json → moto.whatsapp` (campo deprecado, no leído por el código) |
| **Sedes / tiendas** | `data/slots/sedes.json` | `data/configuracion.json → sedes` (deprecado, solo fallback si el slot falla al cargar) |
| **Catálogo de motos** (precio, stock, colores, fotos) | `data/catalogo.json` | — |
| **Confirmación de precio/cuota/stock** | `data/catalogo.json → precioConfirmado / cuotaConfirmada / stockConfirmado` | — |
| **Promociones** | `data/slots/promociones.json` (planeado) — actualmente la sección de promociones en `index.html` es un placeholder estático | `data/catalogo.json → moto.promocion` (sí se usa hoy para el badge de cada tarjeta) |
| **Financiamiento** (requisitos, condiciones referenciales) | `data/slots/financiamiento.json` | `data/configuracion.json → financiamiento` (resumen técnico simplificado, debe mantenerse coherente con el slot) |
| **SEO** (title, description, OG, Twitter) | `index.html` (las etiquetas `<meta>` reales que lee el navegador/crawler) | `data/slots/seo.json` y `data/configuracion.json → etiquetasSEO` (capa editable de referencia; **debe copiarse manualmente** a `index.html` hasta que se automatice la inyección) |
| **Legales** (estado de revisión) | `data/slots/legales.json` (estado) + `legales/*.html` (contenido real) | — |
| **Textos de UI** (botones, labels, mensajes) | `data/slots/ui-placeholders.json` | `index.html` (texto hardcodeado actual; se recomienda migrar progresivamente a lectura dinámica) |

---

## Detalle por dominio

### WhatsApp

`script.js → CONFIG.whatsapp` se inicializa con el valor de `data/configuracion.json → whatsapp`, y **todo el sitio queda deshabilitado para WhatsApp** (botones con `aria-disabled`, enlaces interceptados) mientras `whatsappConfirmado` sea `false`. Ver `aplicarEstadoWhatsApp()` y `whatsappConfirmado()` en `script.js`.

`data/slots/whatsapp.json` existe como capa de números segmentados por área (ventas, financiamiento, taller, repuestos, sedes) para cuando el negocio confirme múltiples canales — **hoy no se conecta a la UI**. Conectar esa lógica es trabajo de la fase de diseño/funcionalidad avanzada, no de esta corrección.

`data/catalogo.json → moto.whatsapp` es un campo heredado de la cimentación inicial que `script.js` **nunca lee** (verificado: `crearTarjetaMoto()` y `consultarPorWhatsApp()` usan siempre `CONFIG.whatsapp`, nunca `moto.whatsapp`). Se marcó con `_notaWhatsapp` indicando que está deprecado. No se eliminó el campo para no romper compatibilidad si algo externo lo lee, pero no se debe seguir usando.

### Sedes

`script.js → renderizarTiendas()` ahora lee de `STATE.slots.sedes.sedes` (es decir, `data/slots/sedes.json`). Si ese slot no carga por algún motivo, cae a `STATE.config.sedes` (`data/configuracion.json`) como fallback técnico.

Las sedes cuyo `estadoAprobacion` sea `"pendiente-confirmar-existencia"` **no se muestran** en el sitio — evita dar la impresión de que una sucursal existe cuando ni siquiera está confirmado que sea real. Si no queda ninguna sede visible, se muestra un mensaje de "ubicaciones pendientes de confirmación" en vez de una grilla vacía o datos falsos.

### Catálogo

`data/catalogo.json` sigue siendo la única fuente de productos. Se agregaron banderas booleanas (`precioConfirmado`, `cuotaConfirmada`, `stockConfirmado`) que **no cambian el dato mostrado**, solo activan un badge visual "Referencial" cuando el valor no ha sido validado por el negocio. Esto evita borrar datos de ejemplo útiles para maquetar, sin presentarlos como reales.

### Financiamiento

Existe cierta superposición intencional entre `data/configuracion.json → financiamiento` (resumen corto usado para integraciones simples) y `data/slots/financiamiento.json` (versión completa con requisitos, pasos y disclaimer). **El slot es la fuente única de verdad para contenido**; el campo en `configuracion.json` debe considerarse un resumen derivado y mantenerse sincronizado manualmente si cambia.

### SEO

Las etiquetas `<meta>` reales en `index.html` son las que efectivamente afectan a buscadores y redes sociales — son la fuente "viva". `data/slots/seo.json` y `data/configuracion.json → etiquetasSEO` son capas editables de referencia para que alguien sin tocar HTML pueda proponer cambios, pero **alguien con acceso al código debe trasladarlos manualmente** a `index.html`. Automatizar esta inyección (por ejemplo, con un pequeño script de build) es una mejora futura, no implementada aún para mantener el sitio 100% estático sin build step.

---

## Qué NO se resolvió en esta corrección (queda pendiente)

- No se implementó inyección automática de `seo.json` en las etiquetas `<meta>` — sigue siendo manual.
- No se conectó `data/slots/whatsapp.json` (números por área) a la UI — el sitio sigue usando un único número global desde `configuracion.json`.
- No se conectó `data/slots/promociones.json` a la sección de promociones del sitio — sigue siendo un placeholder estático. El único dato de promoción que sí se ve hoy es `catalogo.json → moto.promocion` en el badge de cada tarjeta.
- El campo `moto.whatsapp` en `catalogo.json` no se eliminó, solo se documentó como deprecado (decisión: no borrar estructura de datos sin que el usuario lo autorice explícitamente).

Ver `docs/pendientes-produccion.md` para el detalle completo de pendientes.
