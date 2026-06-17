# Checklist de Code Review para Codex — ARENAS MOTOCICLETAS

**Propósito:** Checklist técnico que Codex debe usar al auditar cualquier Pull Request de este repositorio.  
Ver reglas generales en `AGENTS.md`.

---

## HTML semántico

- [ ] Uso correcto de `<header>`, `<main>`, `<footer>`, `<section>`, `<article>`, `<nav>`
- [ ] Jerarquía de headings sin saltos (H1 único por página, luego H2 → H3)
- [ ] Atributos `id` únicos (no duplicados en el documento)
- [ ] `lang="es"` presente en `<html>`
- [ ] Sin etiquetas obsoletas o mal cerradas

## CSS ordenado

- [ ] Nuevos estilos respetan los 15 bloques existentes en `style.css` (no agregar reglas sueltas al final sin clasificar)
- [ ] Uso de variables CSS existentes (`:root`) en lugar de valores hardcodeados nuevos
- [ ] Sin `!important` salvo casos ya justificados en el código existente
- [ ] Sin duplicación de reglas que ya existen
- [ ] Nuevas clases siguen la convención de nombres existente (kebab-case, BEM ligero en componentes como `.moto-card__body`)

## JS sin errores

- [ ] Sin errores de sintaxis (`node --check script.js` o equivalente)
- [ ] Sin variables no declaradas o uso de `var` (el proyecto usa `const`/`let`)
- [ ] Funciones nuevas siguen el patrón modular existente (comentario de módulo, JSDoc básico)
- [ ] Sin lógica duplicada que ya exista en otro módulo (revisar `$()`, `$$()`, `createElement()` antes de reinventar)
- [ ] `try/catch` en cualquier `fetch()` nuevo, siguiendo el patrón de `cargarCatalogo()` / `cargarSlots()`

## Rutas correctas

- [ ] Todas las rutas relativas (`data/`, `assets/`, `legales/`) resuelven correctamente desde la ubicación del archivo que las usa
- [ ] Ningún enlace roto a páginas internas o anclas (`#id`)
- [ ] Las páginas en `legales/` usan `../style.css` y `../index.html` correctamente (un nivel de profundidad)

## JSON válido

- [ ] Todo archivo `.json` nuevo o modificado es JSON válido (sin comas finales, comillas correctas)
- [ ] Los archivos en `data/slots/` mantienen el campo `_nota` y la estructura documentada en `docs/sistema-slots-editables.md`
- [ ] No se eliminaron campos que `script.js` consume activamente (`STATE.config`, `STATE.catalogo`, `STATE.slots`)

## No imágenes externas

- [ ] Ninguna referencia a `http://` o `https://` en `src` de imágenes, videos o fuentes
- [ ] Todo asset apunta a rutas locales dentro de `assets/`

## No frameworks

- [ ] No se agregó ningún `<script src="https://cdn...">` de terceros
- [ ] No hay imports de React, Vue, Next, Astro ni similares
- [ ] No se agregó Tailwind, Bootstrap ni ningún preprocesador CSS
- [ ] No hay `package.json` con dependencias de build (a menos que el usuario lo haya pedido explícitamente)

## Responsive

- [ ] Los breakpoints existentes (900px, 680px, 380px) se respetan; no agregar breakpoints nuevos sin justificación
- [ ] Sin overflow horizontal introducido por elementos nuevos
- [ ] Imágenes y media usan `max-width: 100%` (ya es la regla base en `style.css`)

## Accesibilidad

- [ ] Elementos interactivos nuevos tienen `aria-label`, `role` o texto visible adecuado
- [ ] Formularios mantienen `aria-required`, `aria-describedby`, `aria-live` donde corresponde
- [ ] Contraste de texto no se degrada con cambios de color
- [ ] `prefers-reduced-motion` sigue respetándose si se agregan animaciones nuevas

## SEO

- [ ] Meta etiquetas (`description`, `og:*`, `twitter:*`) no se rompieron ni quedaron vacías
- [ ] `sitemap.xml` y `robots.txt` siguen siendo coherentes si se agregaron/quitaron páginas
- [ ] URLs canónicas correctas

## Performance

- [ ] Imágenes nuevas usan `loading="lazy"` si están fuera del viewport inicial
- [ ] No se introdujeron animaciones que fuercen layout (`width`, `height`, `top`, `left`) en lugar de `transform`/`opacity`
- [ ] `IntersectionObserver` u otros listeners nuevos se desconectan correctamente (sin memory leaks evidentes)
- [ ] No se agregaron dependencias que aumenten el peso de carga inicial

## GitHub Pages

- [ ] El sitio sigue siendo 100% estático, sin build step ni servidor backend
- [ ] No se rompió la compatibilidad con rutas relativas que usa GitHub Pages
- [ ] `index.html` en la raíz sigue siendo el punto de entrada

## WhatsApp

- [ ] Los enlaces de WhatsApp siguen usando `buildWhatsAppURL()` / `crearMensajeWhatsApp()` en lugar de URLs hardcodeadas nuevas
- [ ] El número usado proviene de `CONFIG.whatsapp`, `STATE.config` o `STATE.slots.whatsapp` — no un número distinto pegado directo en el HTML

## Formularios

- [ ] Validación en `script.js` (`validarFormulario`, `validarCampo`) sigue cubriendo los campos requeridos si se agregan nuevos
- [ ] Mensajes de error y éxito coherentes con `data/slots/ui-placeholders.json`
- [ ] El checkbox de tratamiento de datos sigue siendo obligatorio para enviar

## Legales provisionales claramente marcados

- [ ] Cualquier página en `legales/` sigue mostrando el aviso de "contenido provisional pendiente de revisión legal"
- [ ] No se eliminó el aviso de provisionalidad sin que un asesor legal haya aprobado el texto definitivo
- [ ] `data/slots/legales.json` refleja el estado real de revisión de cada documento

---

## Formato de entrega de hallazgos

Codex debe categorizar cada hallazgo como:

- **Crítico** — rompe el sitio, expone datos sensibles, o viola una regla inviolable de `AGENTS.md`
- **Importante** — afecta SEO, accesibilidad, performance o mantenimiento a mediano plazo
- **Menor** — mejora de estilo de código, naming, o limpieza sin urgencia

No se espera que Codex apruebe o mergee el PR — solo que entregue el listado de hallazgos para que el usuario y ChatGPT decidan.
