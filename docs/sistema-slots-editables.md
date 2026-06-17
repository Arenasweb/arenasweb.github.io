# Sistema de Slots Editables — ARENAS MOTOCICLETAS

**Estado:** Implementado · Junio 2026  
**Ubicación:** `data/slots/`

---

## ¿Qué es un slot?

Un **slot** es un archivo JSON independiente que contiene **solo contenido editable** (textos, números de contacto, estados de aprobación) separado por completo del diseño visual y del código.

La idea central: **alguien sin conocimientos técnicos debería poder abrir un archivo JSON, cambiar un texto o un número, y ver el cambio reflejado en el sitio** — sin tocar HTML, CSS ni JavaScript.

Cada slot tiene una estructura predecible y, en la mayoría de los casos, un campo `estadoAprobacion` o `estado` que indica si ese contenido ya fue validado por el negocio o sigue pendiente.

---

## Diferencia con `data/configuracion.json` y `data/catalogo.json`

| Archivo | Propósito |
|---------|-----------|
| `data/catalogo.json` | Inventario de motos — ya consumido activamente por `script.js` |
| `data/configuracion.json` | Configuración técnica global ya integrada (WhatsApp activo, sedes, SEO base) |
| `data/slots/*.json` | **Capa de contenido editable y "aprobable"**, más granular, pensada para que gerencia/marketing la complete progresivamente sin esperar a un desarrollador |

`cargarSlots()` en `script.js` carga estos 12 archivos y los deja disponibles en `STATE.slots`, pero **no reemplaza** `configuracion.json` — ambos coexisten. La migración completa de campos (decidir cuál es la fuente única de verdad) es una tarea PENDIENTE para cuando los datos reales estén confirmados.

---

## Archivos disponibles en `data/slots/`

| Archivo | Contenido | Nivel de riesgo si se edita mal |
|---------|-----------|----------------------------------|
| `hero.json` | Textos del hero, CTAs, referencias de imagen/video | Bajo — solo visual/copy |
| `empresa.json` | Razón social, RUC, representante legal, datos comerciales | **Alto** — datos legales |
| `whatsapp.json` | Números de WhatsApp por área (ventas, financiamiento, taller, repuestos, sedes) | **Alto** — contacto real con clientes |
| `sedes.json` | Direcciones, horarios, mapas de cada sede | **Alto** — ubicación física real |
| `financiamiento.json` | Requisitos, pasos, condiciones referenciales de crédito | **Alto** — información financiera |
| `beneficios.json` | Qué incluye la compra de una moto | Medio — expectativa del cliente |
| `servicio-tecnico.json` | Datos del taller y servicios ofrecidos | Medio |
| `promociones.json` | Ofertas activas, vigencia, modelo | **Alto** — compromiso comercial con fecha |
| `testimonios.json` | Comentarios y datos de clientes reales | **Alto** — requiere consentimiento |
| `legales.json` | Estado de revisión de cada documento legal | Medio — rastreo, no contenido legal en sí |
| `seo.json` | Metadatos de SEO y redes sociales | Bajo |
| `ui-placeholders.json` | Textos de botones, labels, mensajes de error/éxito | Bajo — solo copy de interfaz |

---

## Qué datos son seguros de editar sin aprobación

Se pueden editar libremente, sin necesidad de validación previa, porque **no representan compromisos comerciales ni legales**:

- `ui-placeholders.json` → textos de botones, labels, mensajes de formulario
- `seo.json` → título, descripción, keywords (siempre que no inventen datos)
- `hero.json` → textos de copy (eyebrow, título, subtítulo) — **no** las imágenes/video hasta tener el recurso real
- Textos descriptivos generales que no mencionen precios, fechas ni cantidades

---

## Qué datos requieren aprobación gerencial

Antes de marcar `estadoAprobacion` o `estado` como aprobado, estos campos deben ser confirmados por el dueño o gerente del negocio:

- `empresa.json` → razón social, RUC, representante legal
- `whatsapp.json` → **todos los números** (actualmente "pendiente" en todos los campos)
- `sedes.json` → existencia real de cada sede (Huayna Cápac, Vía Expresa y Ocongate están marcadas como `pendiente-confirmar-existencia` — **no asumir que existen**)
- `financiamiento.json` → requisitos, entidades financieras, condiciones referenciales
- `beneficios.json` → cualquier beneficio marcado como incluido
- `promociones.json` → toda promoción nueva, antes de publicarla (`visible: true`)
- `testimonios.json` → cada testimonio individual, **y el consentimiento del cliente**

---

## Qué datos requieren revisión legal

Estos campos no deben publicarse como definitivos sin que un abogado o asesor legal los revise:

- `legales.json` → el estado general de revisión (`estadoRevisionLegal`)
- Los 6 archivos HTML en `legales/` (el JSON solo rastrea su estado, el contenido legal vive en el HTML)
- `empresa.json` → RUC y razón social, en su uso dentro de textos legales
- `financiamiento.json` → `disclaimer` y `condicionesReferenciales` (cumplimiento de transparencia financiera)
- `testimonios.json` → uso de imagen, nombre y comentarios de terceros (derecho a la imagen)

---

## Cómo se cargan los slots en el sitio

`script.js` incluye la función `cargarSlots()` (Módulo 4 — Catalog loader):

```js
async function cargarSlots() {
  // Carga en paralelo los 12 archivos de data/slots/
  // Cada archivo se indexa en STATE.slots por su nombre (sin extensión)
}
```

Se ejecuta automáticamente al iniciar la app, dentro de `inicializarApp()`, justo después de `cargarConfiguracion()`.

**Uso típico una vez cargado:**

```js
STATE.slots.hero.tituloPrincipal
STATE.slots.whatsapp.whatsappVentas
STATE.slots.sedes.sedes[0].direccion
STATE.slots["ui-placeholders"].textosBotones.verCatalogo
```

Si un archivo no existe o falla la carga, `cargarSlots()` no rompe el resto — usa `Promise.allSettled` y deja ese slot en `null` con un warning en consola.

**Importante:** Por ahora `cargarSlots()` solo **carga y deja disponibles** los datos en `STATE.slots`. **No hay renderizado automático todavía** — conectar cada slot a su sección del HTML es trabajo de la siguiente fase, cuando se construya el diseño definitivo.

---

## Cómo usar estos JSON mañana para construir el diseño final

1. **Antes de maquetar una sección,** revisar si ya existe un slot relacionado (ej: antes de hardcodear el hero, mirar `hero.json`).
2. **Reemplazar texto fijo en el HTML** por referencias dinámicas usando `STATE.slots`, igual que ya se hace con `STATE.catalogo` en `renderizarCatalogo()`.
3. **No publicar contenido con `estado: "pendiente"`** en producción real — son placeholders intencionales.
4. **Cuando gerencia confirme un dato,** actualizar el campo correspondiente en el JSON y cambiar su `estado`/`estadoAprobacion` a algo como `"aprobado"` o `"confirmado"`.
5. **Si se agrega una sede o promoción nueva,** seguir la misma estructura de objeto que ya existe en el array (no inventar campos nuevos sin documentarlos aquí).
6. **Mantener sincronizados** `seo.json` con las etiquetas `<meta>` de `index.html` hasta que se automatice la inyección.

---

## Reglas de edición

- No borrar el campo `_nota` de cada archivo — explica el propósito y las advertencias del slot.
- No reemplazar `"pendiente"` por un dato inventado. Si no se tiene el dato real, dejarlo como está.
- No cambiar la estructura de claves sin actualizar también este documento y `script.js` si aplica.
- Los testimonios y fotos de clientes requieren consentimiento explícito antes de cualquier `visible: true`.
