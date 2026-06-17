# Correcciones Post-Auditoría Codex — ARENAS MOTOCICLETAS

**Contexto:** Codex realizó una auditoría técnica del repositorio. Este documento detalla qué se corrigió, por qué, y qué decisiones se tomaron para no afectar el diseño visual (aún pendiente de definir).  
Fecha de corrección: junio 2026

---

## 1. Datos no confirmados mostrados como reales

| Hallazgo | Corrección |
|----------|-----------|
| `data/configuracion.json → whatsapp` tenía un número con apariencia real sin marcador de pendiente | Se agregó `whatsappConfirmado: false` + `_notaWhatsapp` explicando que es un placeholder técnico. Mientras sea `false`, todo el sitio deshabilita visualmente los botones/enlaces de WhatsApp (`aplicarEstadoWhatsApp()` en `script.js`) |
| `data/configuracion.json → sedes[0].direccion` mostraba "Av. Sol 123, Cusco" como dirección real, contradiciendo `data/slots/sedes.json` (que la marca "PENDIENTE") | Se corrigió el valor a `"PENDIENTE"` y se documentó el campo como deprecado (`_notaSedes`). La fuente activa ahora es `data/slots/sedes.json` |
| `index.html` → tarjeta estática de tienda mostraba "Av. Sol 123, Cusco" y "+51 987 654 321" como datos reales | Se eliminó la tarjeta estática; ahora `#stores-grid` se llena dinámicamente vía `renderizarTiendas()`, que oculta sedes no confirmadas y muestra badges "pendiente" en los campos sin validar |
| `data/catalogo.json` → precios, cuotas y stock sin indicador de confirmación | Se agregaron campos `precioConfirmado`, `cuotaConfirmada`, `stockConfirmado` (todos en `false`). El render del catálogo ahora añade un badge "Referencial" junto al precio cuando no está confirmado |
| `index.html` → tarjetas de financiamiento con montos inventados (S/ 1,200, S/ 1,500, S/ 3,500) sin respaldo en ningún JSON | Se reemplazaron por un badge "Por confirmar", consistente con `data/slots/financiamiento.json → cuotaInicialMinima: "PENDIENTE"` |
| `legales/libro-reclamaciones.html` → enlace de WhatsApp funcional con número placeholder | Se desactivó el enlace (ya no es clicable) y se reemplazó por un badge "Pendiente de confirmar", priorizando el canal de correo (real) mientras tanto |

---

## 2. Sistema de placeholders

Se implementó un sistema consistente de tres niveles:

1. **Badge `.badge-pendiente`** (CSS, Bloque 14b de `style.css`) — para datos puntuales no confirmados (precio, cuota, dirección, teléfono).
2. **Estado vacío `.empty-state`** — cuando no hay ningún dato confirmado que mostrar en una sección completa (ej. cero sedes confirmadas).
3. **Gate de WhatsApp** — botones y enlaces con `aria-disabled="true"` mientras `whatsappConfirmado` sea `false`, más un toast (`.aviso-toast`) que explica la situación al usuario en vez de abrir un chat falso.

Imágenes: si `moto.fotoPrincipal` no carga (archivo aún no subido a `assets/`), el `<img>` se reemplaza automáticamente por `.placeholder-media` mediante el evento `error` — ya no se deja una imagen rota.

Fichas técnicas en PDF (`moto.fichaTecnica`): se verificó que **no se renderiza ningún enlace a este campo en la UI actual**, por lo que no hay riesgo de enlace roto hoy. Si se implementa en el futuro, debe seguir el mismo patrón: verificar antes de enlazar o mostrar "Ficha técnica pendiente".

---

## 3. Assets faltantes

Se confirmó que `assets/` solo contiene carpetas vacías (`logo/`, `iconos/`, `motos/*`, `taller/`, `tiendas/`, `clientes/`, `videos/`) — ningún archivo real existe todavía. No se descargó ni generó ninguna imagen externa o falsa.

- Favicon (`assets/favicon/favicon.ico`, `apple-touch-icon.png`) y OG image (`assets/og/arenas-og-cover.jpg`): las rutas en `index.html` se mantienen igual (es correcto que apunten ahí para cuando existan), documentado como pendiente en `docs/pendientes-produccion.md`.
- Imágenes de catálogo: protegidas con fallback automático a placeholder (ver punto 2).
- Fichas PDF: no se usan en la UI actual, sin riesgo inmediato.

---

## 4. Seguridad y renderizado

**Hallazgo principal:** `crearTarjetaMoto()` y `renderizarTiendas()` construían HTML completo con `innerHTML` insertando directamente strings de `data/catalogo.json` y `data/configuracion.json` — archivos pensados para ser editables por personal no técnico (ver `data/slots/`). Si alguien llegara a pegar texto con HTML/script embebido en un campo como `descripcion`, se ejecutaría en el navegador de cualquier visitante (XSS almacenado).

**Corrección:** Ambas funciones se reescribieron usando `createElement()` + `textContent` (nunca `innerHTML` con datos externos). Esto neutraliza cualquier intento de inyección porque el navegador trata el contenido como texto plano, no como markup.

**Bug adicional encontrado y corregido:** en la versión anterior de `crearTarjetaMoto()`, el atributo `data-modelo` se generaba así:

```js
data-modelo="${moto.modelo} ${moto.version || ""}".trim()
```

El `.trim()` quedaba **fuera** del template literal y se insertaba como texto literal dentro del HTML generado (`data-modelo="NS400 Premium".trim()`), rompiendo el atributo. Se corrigió calculando el valor antes de insertarlo en el DOM.

**Estilo inline eliminado:** el span de cilindrada en cada tarjeta usaba `style="font-size: var(--text-xs); color: var(--color-muted);"` generado desde JS. Se movió a la clase `.moto-card__meta` en `style.css`.

---

## 5. Fuente única de verdad

Ver documento dedicado: **`docs/fuente-unica-datos.md`**. Resumen de cambios de código relacionados:

- `renderizarTiendas()` ahora lee de `STATE.slots.sedes` (antes leía de `STATE.config.sedes`, que tenía datos contradictorios con los slots).
- Se documentó `moto.whatsapp` en `catalogo.json` como campo deprecado (no se elimina, pero no se usa).
- Se aclaró que `seo.json`/`etiquetasSEO` son capas de referencia editables, no la fuente que realmente lee el navegador (esa es `index.html`).

---

## 6. SEO y legales

- **`sitemap.xml`:** se eliminaron las 6 URLs de `legales/` — todas tienen `<meta name="robots" content="noindex, follow">`, por lo que no deben listarse en el sitemap (Google Search Central lo desaconseja explícitamente). El sitemap ahora solo incluye la página principal.
- Se verificó que las 6 páginas legales mantienen su aviso de "contenido provisional pendiente de revisión legal" — no se modificó ningún texto legal definitivo, solo el enlace de WhatsApp en `libro-reclamaciones.html` (ver punto 1).

---

## 7. Formulario

- **Foco en primer error:** `validarFormulario()` ahora retorna el primer campo inválido (o `null` si todo es válido) en lugar de un booleano. Al fallar la validación, ese campo recibe `.focus()` automáticamente.
- **`aria-invalid`:** `mostrarError()` y `ocultarError()` ahora alternan `aria-invalid="true"/"false"` en el campo, además de la clase `.is-invalid`. Se agregó `aria-invalid="false"` por defecto en los inputs del HTML.
- **Aviso de WhatsApp antes de enviar:** se agregó el texto "Al enviar, se abrirá WhatsApp en una pestaña nueva." (`.form-hint`) debajo del botón de envío.
- **Gate de WhatsApp en el envío:** `enviarFormularioPorWhatsApp()` ahora verifica `whatsappConfirmado()` antes de intentar abrir un chat; si no está confirmado, muestra el aviso correspondiente y no pierde los datos ya escritos por el usuario (no se llama a `form.reset()` en ese caso).
- Modelo de interés se mantiene como campo opcional (no obligatorio): es información deseable pero no bloqueante para que el usuario pueda enviar una consulta general.

---

## 8. Accesibilidad

- `aria-invalid` añadido a la validación del formulario (ver punto 7).
- Botones/enlaces de WhatsApp deshabilitados visualmente con `aria-disabled="true"` cuando el canal no está confirmado (reutiliza el estilo ya existente `.btn[aria-disabled="true"]` de `style.css`).
- Las tarjetas de sede y moto generadas dinámicamente mantienen `role="listitem"` y `aria-label` descriptivo, ahora construidos de forma segura.
- El placeholder de imagen no disponible incluye `aria-label` con el nombre del modelo, no solo un div vacío.

---

## 9. CSS generado desde JS

Se revisó `script.js` en busca de estilos inline. Se encontró y corrigió un caso (cilindrada en tarjeta de moto, ver punto 4). No se encontraron otros estilos inline generados dinámicamente tras la reescritura de `crearTarjetaMoto()` y `renderizarTiendas()`.

---

## 10. Resumen de archivos tocados en esta corrección

**Modificados:**
- `script.js` (reescritura de render de catálogo y tiendas, gate de WhatsApp, validación de formulario)
- `index.html` (sección tiendas, financiamiento, formulario, modelo destacado)
- `style.css` (Bloque 14b nuevo: badges, toast, aria-invalid, meta)
- `data/catalogo.json` (flags de confirmación, nota de deprecación en whatsapp)
- `data/configuracion.json` (whatsappConfirmado, corrección de sede)
- `data/slots/ui-placeholders.json` (mensajes de estado pendiente)
- `sitemap.xml` (eliminadas URLs noindex)
- `legales/libro-reclamaciones.html` (enlace de WhatsApp desactivado)

**Creados:**
- `docs/fuente-unica-datos.md`
- `docs/correcciones-auditoria-codex.md` (este archivo)
- `docs/pendientes-produccion.md`

No se realizó ningún commit ni push — todos los cambios están solo en el working tree, pendientes de revisión del usuario.
