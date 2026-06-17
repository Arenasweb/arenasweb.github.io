# Pendientes de Producción — ARENAS MOTOCICLETAS

**Propósito:** Lista consolidada de qué NO debe publicarse como real todavía, qué debe confirmar gerencia, y qué queda técnicamente pendiente tras la corrección post-auditoría de Codex.  
Fecha: junio 2026 · Complementa `docs/requisitos-pendientes-gerencia.md` y `docs/pendientes-manana.md`

---

## Qué NO debe publicarse como real todavía

- **Número de WhatsApp** (`data/configuracion.json → whatsapp`) — es un placeholder técnico. El sitio ya lo trata como no confirmado (`whatsappConfirmado: false`) y deshabilita los botones relacionados.
- **Cualquier precio, cuota o stock del catálogo** — están marcados `precioConfirmado: false`, `cuotaConfirmada: false`, `stockConfirmado: false`. Se muestran con badge "Referencial" hasta que gerencia los confirme.
- **Direcciones, teléfonos y horarios de sedes** — `data/slots/sedes.json` tiene 3 de 4 sedes marcadas `pendiente-confirmar-existencia` (Huayna Cápac, Vía Expresa, Ocongate) y la sede principal con todos los campos en `"PENDIENTE"`. Ninguna se muestra como datos confirmados; las no confirmadas en existencia ni siquiera se renderizan.
- **Montos de financiamiento** — no hay ningún monto en soles inventado en la UI; todo dice "Por confirmar".
- **Razón social, RUC, representante legal** — en `data/slots/empresa.json`, todos en `"PENDIENTE"`.
- **Testimonios** — `data/slots/testimonios.json` no tiene ningún testimonio real, y el único registro de ejemplo tiene `visible: false`.
- **Promociones** — `data/slots/promociones.json` no tiene ninguna promoción real; el ejemplo tiene `visible: false`.
- **Textos legales definitivos** — las 6 páginas en `legales/` siguen marcadas como contenido provisional pendiente de revisión por abogado.

---

## Qué debe confirmar gerencia antes de avanzar

Ver el detalle completo en `docs/requisitos-pendientes-gerencia.md`. Resumen de lo más urgente tras esta corrección:

1. **Número(s) de WhatsApp reales** — sin esto, todo el flujo de conversión del sitio permanece deshabilitado para el usuario final.
2. **Existencia real de las sedes Huayna Cápac, Vía Expresa y Ocongate** — actualmente no se muestran en el sitio por falta de confirmación.
3. **Dirección, teléfono y horario reales de la sede principal.**
4. **Precios y stock actualizados del catálogo** (4 modelos: Pulsar NS400, Dominar 400, Boxer 150, CT 125).
5. **Condiciones reales de financiamiento** (cuota inicial, entidades financieras, requisitos).
6. **Razón social y RUC** para completar los documentos legales.

---

## Qué queda técnicamente pendiente (no es responsabilidad de gerencia)

- **Assets faltantes:** `assets/` solo tiene carpetas vacías. Falta subir: favicon, imagen Open Graph, fotos de motos, fotos de sedes, foto del taller, logo SVG oficial. El sitio ya tolera su ausencia (placeholders automáticos en catálogo; favicon y OG simplemente no se verán hasta subirlos).
- **`data/slots/whatsapp.json`** (números segmentados por área) no está conectado a ninguna parte de la interfaz todavía — solo existe como dato preparado para cuando se decida implementar enrutamiento por área.
- **`data/slots/promociones.json`** no está conectado a la sección de Promociones del sitio (que sigue siendo un placeholder estático). Hoy la única promoción visible es la del campo `catalogo.json → moto.promocion`.
- **Comparador de modelos** (`#comparador`) sigue sin lógica implementada — es un placeholder estático intencional.
- **Inyección automática de SEO** desde `data/slots/seo.json` a las etiquetas `<meta>` de `index.html` — hoy es manual.
- **`data/catalogo.json → moto.whatsapp`** es un campo deprecado que ya no debería usarse; se documentó pero no se eliminó (decisión: no borrar estructura de datos sin autorización explícita del usuario).
- **Ficha técnica en PDF** (`moto.fichaTecnica`) no tiene ningún punto de la UI que la enlace todavía — si se implementa, debe validarse su existencia antes de mostrar el enlace (o usar el mensaje "Ficha técnica pendiente" ya preparado en `ui-placeholders.json → mensajesEstadoPendiente.fichaTecnicaPendiente`).

---

## Qué se corrigió y ya no es un riesgo

Ver `docs/correcciones-auditoria-codex.md` para el detalle completo. En resumen:

- Renderizado del catálogo y de las tiendas ya no usa `innerHTML` con datos editables (riesgo de inyección de HTML/XSS neutralizado).
- Bug de atributo `data-modelo` corregido.
- Estilo inline movido a `style.css`.
- `sitemap.xml` ya no contradice las etiquetas `noindex` de las páginas legales.
- El enlace de WhatsApp en el libro de reclamaciones ya no es funcional con un número falso.

---

## Antes de la próxima fase (diseño premium)

1. Confirmar los datos críticos de la lista de gerencia (especialmente WhatsApp y sedes).
2. Subir al menos los assets mínimos: favicon, imagen OG, una foto por modelo.
3. Revisar `docs/checklist-pre-diseno.md` para las decisiones visuales (tipografía, hero, paleta).
4. Una vez confirmado un dato, actualizar su flag correspondiente (`*Confirmado`, `estadoAprobacion`, etc.) — el sitio reaccionará automáticamente quitando los badges "pendiente" y habilitando los botones de WhatsApp.
