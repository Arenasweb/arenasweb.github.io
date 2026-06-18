# Pendientes de Producción — ARENAS MOTOCICLETAS

**Propósito:** Lista consolidada de qué NO debe publicarse como real todavía, qué debe confirmar gerencia, y qué queda técnicamente pendiente tras la corrección post-auditoría de Codex.  
Fecha: junio 2026 · Actualizado tras la auditoría Codex de **segunda vuelta** · Complementa `docs/requisitos-pendientes-gerencia.md`, `docs/pendientes-manana.md` y `docs/contrato-datos-google-sheets.md`

---

## Qué NO debe publicarse como real todavía

- **Número de WhatsApp** (`data/configuracion.json → whatsapp`) — es un placeholder técnico. El sitio ya lo trata como no confirmado (`whatsappConfirmado: false`) y deshabilita los botones relacionados.
- **Cualquier precio, cuota o stock del catálogo** — están marcados `precioConfirmado: false`, `cuotaConfirmada: false`, `stockConfirmado: false`. Desde la segunda vuelta de auditoría, el sitio **ya no muestra el valor real en absoluto** mientras no estén confirmados: precio y cuota muestran "Consultar", y stock muestra "Consultar disponibilidad".
- **Direcciones, teléfonos y horarios de sedes** — `data/slots/sedes.json` no tiene ninguna sede con `estadoAprobacion: "aprobado"` o `"confirmado"`. Desde la segunda vuelta, `renderizarTiendas()` usa un **allowlist estricto** (solo esos dos valores exactos hacen visible una sede) — todas las demás, incluida la sede principal, quedan ocultas hasta aprobación explícita.
- **Montos de financiamiento** — no hay ningún monto en soles inventado en la UI; todo dice "Por confirmar".
- **Razón social, RUC, representante legal** — en `data/slots/empresa.json`, todos en `"PENDIENTE"`.
- **Testimonios** — `data/slots/testimonios.json` no tiene ningún testimonio real, y el único registro de ejemplo tiene `visible: false`.
- **Promociones** — `data/slots/promociones.json` no tiene ninguna promoción real; el ejemplo tiene `visible: false`. Además, ahora pasa por `validarYFiltrarPromociones()` antes de poder mostrarse.
- **Textos legales definitivos** — las 6 páginas en `legales/` siguen marcadas como contenido provisional pendiente de revisión por abogado.

---

## Qué debe confirmar gerencia antes de avanzar

Ver el detalle completo en `docs/requisitos-pendientes-gerencia.md`. Resumen de lo más urgente tras esta corrección:

1. **Número(s) de WhatsApp reales** — sin esto, todo el flujo de conversión del sitio permanece deshabilitado para el usuario final.
2. **Aprobación explícita de al menos una sede** — ninguna sede se muestra hoy porque ninguna tiene `estadoAprobacion: "aprobado"` (ni siquiera la principal). Gerencia debe: (a) confirmar los datos reales de la sede, y (b) cambiar el campo a `"aprobado"` para que aparezca en el sitio.
3. **Existencia real de las sedes Huayna Cápac, Vía Expresa y Ocongate** — si no existen, lo correcto es eliminarlas del JSON; si existen, deben pasar por el mismo proceso de aprobación.
4. **Precios, cuotas y stock confirmados del catálogo** (4 modelos: Pulsar NS400, Dominar 400, Boxer 150, CT 125) — hasta que `precioConfirmado`/`cuotaConfirmada`/`stockConfirmado` sean `true`, el visitante solo verá "Consultar" / "Consultar disponibilidad".
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

## Qué se corrigió y ya no es un riesgo (primera vuelta)

Ver `docs/correcciones-auditoria-codex.md` para el detalle completo. En resumen:

- Renderizado del catálogo y de las tiendas ya no usa `innerHTML` con datos editables (riesgo de inyección de HTML/XSS neutralizado).
- Bug de atributo `data-modelo` corregido.
- Estilo inline movido a `style.css`.
- `sitemap.xml` ya no contradice las etiquetas `noindex` de las páginas legales.
- El enlace de WhatsApp en el libro de reclamaciones ya no es funcional con un número falso.

## Qué se corrigió y ya no es un riesgo (segunda vuelta)

- **Precio/cuota/stock no confirmados ya no muestran ningún valor real** — antes se mostraba el dato con un badge "Referencial" al lado; ahora, si `precioConfirmado`/`cuotaConfirmada`/`stockConfirmado` no son `true`, el campo entero se reemplaza por "Consultar" o "Consultar disponibilidad" (`crearTarjetaMoto()` y `actualizarModeloDestacado()` en `script.js`).
- **Sedes: de denylist a allowlist** — antes se ocultaba solo el estado `"pendiente-confirmar-existencia"` (cualquier otro valor, incluso un typo, se mostraba). Ahora `ESTADOS_SEDE_VISIBLES` es un allowlist: solo `"aprobado"` o `"confirmado"` hacen visible una sede.
- **Validación de URLs externas antes de renderizar** — `esURLExternaSegura()` exige HTTPS y un dominio en `DOMINIOS_PERMITIDOS` (Google Maps, WhatsApp) antes de usar `sede.googleMapsUrl`. Si no es segura, se ignora y se genera una URL de Maps propia (siempre segura).
- **Validación de teléfonos antes de generar enlaces `tel:`** — `esTelefonoSeguro()` evita que un campo editable inyecte otro esquema de URL.
- **Validación de rutas de imagen** — `esRutaLocalSegura()` rechaza cualquier `fotoPrincipal` que sea una URL externa (refuerza la regla "no imágenes externas") y usa el placeholder en su lugar.
- **Esquema/validador de datos** — nuevo módulo en `script.js` ("MÓDULO 3b") con `ESQUEMA_MOTO`, `ESQUEMA_SEDE`, `ESQUEMA_PROMOCION`, `ESQUEMA_WHATSAPP_SLOT`, `ESQUEMA_SEO_SLOT` y funciones `validarYFiltrarCatalogo()`, `validarYFiltrarSedes()`, `validarYFiltrarPromociones()`. Los registros que no cumplen el esquema se descartan con `console.warn`, nunca rompen el render.
- **Helper `createElement()` blindado** — se eliminó el parámetro `innerHTML` genérico (no se usaba en ningún sitio, pero era un riesgo latente). `clearElement()` ahora usa `replaceChildren()` en vez de `innerHTML = ""`.
- **Fuente única de SEO reforzada con verificación automática** — `verificarConsistenciaSEO()` compara `data/slots/seo.json` contra el `<title>`, meta `description` y `canonical` reales de `index.html` en cada carga, y avisa por consola si detecta desincronización. `index.html` sigue siendo la fuente que leen los crawlers.
- **JSON local confirmado como fallback permanente** — ninguna función de carga (`cargarCatalogo()`, `cargarConfiguracion()`, `cargarSlots()`) intenta una fuente remota. Ver `docs/contrato-datos-google-sheets.md` para las reglas que deberá cumplir una futura fuente remota antes de conectarse.

---

## Antes de la próxima fase (diseño premium)

1. Confirmar los datos críticos de la lista de gerencia (especialmente WhatsApp y al menos una sede aprobada).
2. Subir al menos los assets mínimos: favicon, imagen OG, una foto por modelo (rutas locales únicamente).
3. Revisar `docs/checklist-pre-diseno.md` para las decisiones visuales (tipografía, hero, paleta).
4. Una vez confirmado un dato, actualizar su flag correspondiente (`*Confirmado`, `estadoAprobacion: "aprobado"`, etc.) — el sitio reaccionará automáticamente mostrando el valor real y habilitando los botones de WhatsApp.
5. Antes de considerar Google Sheets, revisar `docs/contrato-datos-google-sheets.md` — todavía no está implementado ni autorizado.
