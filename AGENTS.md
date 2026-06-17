# ARENAS MOTOCICLETAS — AGENTS.md

Guía principal para Codex y cualquier otro agente de código que trabaje en este repositorio.  
**Última actualización:** junio 2026

---

## Rol de los agentes

- **Claude Code** — Constructor principal en VS Code. Construye, refactoriza y mantiene la base técnica del sitio.
- **Codex** — Auditor técnico. Code review, detección de errores, seguridad, rendimiento y revisión de arquitectura. No es el diseñador principal.
- **ChatGPT** — Dirección estratégica, redacción de prompts, revisión gerencial y control de calidad general del proyecto.

---

## Reglas inviolables

- No cerrar diseño visual sin aprobación.
- No inventar datos comerciales, legales, precios, sedes ni teléfonos.
- No usar imágenes externas.
- No agregar frameworks.
- No usar React, Next, Astro, Tailwind ni Bootstrap.
- Mantener HTML, CSS y JavaScript puro.
- Mantener compatibilidad con GitHub Pages.
- No hacer cambios destructivos.
- No tocar varios archivos grandes sin explicar el motivo.
- No hacer commit ni push sin autorización del usuario.

---

## Arquitectura técnica

- **`index.html`** — Página única con las 14 secciones semánticas del sitio (hero, buscador, catálogo, financiamiento, servicio técnico, cotización, etc.). Sin lógica de negocio embebida.
- **`style.css`** — Sistema CSS en 15 bloques (reset, variables, layout, componentes, animaciones, responsive, utilidades). Las variables en `:root` son el único lugar donde deberían cambiar colores/espacios/tipografías.
- **`script.js`** — Núcleo JS modular vanilla (14 módulos: config, helpers, WhatsApp, catálogo, render, filtros, formulario, animaciones, analytics, init). Sin dependencias externas.
- **`data/`** — Fuente de datos en JSON. `catalogo.json` (inventario de motos) y `configuracion.json` (config técnica global), ambos consumidos activamente por `script.js`.
- **`data/slots/`** — Capa de contenido editable y "aprobable" (hero, empresa, whatsapp, sedes, financiamiento, beneficios, servicio técnico, promociones, testimonios, legales, seo, ui-placeholders). Cargada por `cargarSlots()` en `script.js`. Ver `docs/sistema-slots-editables.md`.
- **`assets/`** — Recursos estáticos (logo, iconos, motos, taller, tiendas, clientes, videos). Sin imágenes externas ni CDN.
- **`docs/`** — Documentación técnica interna del proyecto (arquitectura, animaciones, catálogo, checklists, pendientes).
- **`legales/`** — 6 páginas HTML de contenido legal, todas marcadas como provisionales hasta revisión por asesor legal.

---

## Prioridades del proyecto

1. Web premium, inmersiva y comercial.
2. Catálogo administrable.
3. Cotización por WhatsApp.
4. Rendimiento móvil.
5. SEO local Cusco.
6. Accesibilidad básica.
7. Legal y datos personales.
8. Organización para mantenimiento mensual.

---

## Reglas para Codex

Codex debe actuar como **auditor**, no como diseñador principal.

**Debe revisar:**
- Errores de código
- Rutas rotas
- Compatibilidad con GitHub Pages
- Seguridad básica
- Performance
- Accesibilidad
- SEO
- Duplicación innecesaria
- Problemas de mantenimiento

**Debe evitar:**
- Rediseñar toda la web
- Cambiar identidad visual
- Insertar datos no aprobados
- Reemplazar arquitectura sin justificación
- Mezclar cambios visuales con cambios técnicos en el mismo PR

Ver checklist detallado en `docs/checklist-codex-review.md`.

---

## Flujo recomendado

1. Claude Code construye o modifica.
2. Usuario revisa.
3. Commit en GitHub.
4. Codex revisa mediante Pull Request o revisión técnica.
5. ChatGPT interpreta hallazgos y decide prioridad.
6. Claude Code aplica correcciones aprobadas.

Ver flujo completo en `docs/flujo-ia-claude-codex-chatgpt.md`.
