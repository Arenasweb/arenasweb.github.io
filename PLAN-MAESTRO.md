# Plan Maestro — ARENAS MOTOCICLETAS

**Última actualización:** junio 2026  
**Fase actual:** Base técnica completada — Diseño premium PENDIENTE

---

## ADN de marca

- **Nombre:** ARENAS MOTOCICLETAS
- **Ubicación:** Cusco, Perú
- **Concepto:** "La A que acelera"
- **Personalidad:** premium, oscura, tecnológica, deportiva, comercial
- **Meta principal:** Generar cotizaciones por WhatsApp, mostrar catálogo y transmitir respaldo local

---

## Estado actual del proyecto

### Completado en esta fase (base técnica)

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `index.html` | ✅ Base técnica | 14 secciones semánticas, SEO, accesibilidad, formulario real |
| `style.css` | ✅ Sistema base | 15 bloques, variables, animaciones, responsive, utilities |
| `script.js` | ✅ Núcleo JS | 14 módulos: catálogo, filtros, formulario, animaciones, nav móvil |
| `data/catalogo.json` | ✅ 4 modelos | Estructura completa lista para escalar |
| `data/configuracion.json` | ✅ Config global | WhatsApp, SEO, sedes, mensajes, meta desarrollo |
| `data/slots/` | ✅ 12 archivos | Contenido editable/aprobable: hero, empresa, whatsapp, sedes, financiamiento, beneficios, servicio técnico, promociones, testimonios, legales, seo, ui-placeholders |
| `legales/` | ✅ 6 páginas | HTML válido, aviso provisional, navegación interna |
| `docs/` | ✅ 13 documentos | Arquitectura, animaciones, catálogo, slots, gerencia, flujo de agentes IA, checklists |
| `AGENTS.md` | ✅ Creado | Reglas y arquitectura para Codex y otros agentes |
| `.github/PULL_REQUEST_TEMPLATE.md` | ✅ Creado | Checklist obligatorio para cada PR |

### PENDIENTE para sesión de diseño

| Elemento | Prioridad | Descripción |
|----------|-----------|-------------|
| Logo SVG oficial | Alta | Reemplazar placeholder "A" |
| Tipografía definitiva | Alta | Headlines y cuerpo |
| Hero visual | Alta | Imagen, video o generativo |
| Imágenes de motos | Alta | Al menos 1 por modelo |
| WhatsApp real | Urgente | Validar número antes de pruebas |
| Favicon y OG image | Urgente | Antes de cualquier compartido en redes |
| Colores definitivos | Media | Ajustar variables en :root |
| Revisión legal | Alta | Antes del lanzamiento público |

Ver `docs/pendientes-manana.md` para lista completa.

---

## Estructura del sitio web

| # | Sección | ID HTML | Estado |
|---|---------|---------|--------|
| 1 | Header + navegación | `site-header` | ✅ Completo con nav móvil |
| 2 | Hero | `#hero` | ✅ Estructura base — diseño pendiente |
| 3 | Buscador | `#buscador` | ✅ Filtros funcionales en JS |
| 4 | Catálogo destacado | `#catalogo` | ✅ Dinámico desde JSON |
| 5 | Modelo destacado | `#modelo-destacado` | ✅ Estructura lista |
| 6 | Líneas de motos | `#lineas` | ✅ 4 líneas con cards |
| 7 | Por qué ARENAS | `#porque` | ✅ 4 cards de valor |
| 8 | Tu moto incluye | `#incluye` | ✅ Lista de beneficios |
| 9 | Financiamiento | `#financiamiento` | ✅ 3 planes base |
| 10 | Servicio técnico | `#servicio` | ✅ Layout 2 columnas |
| 11 | Promociones | `#promociones` | ✅ Placeholder listo para datos |
| 12 | Testimonios | `#testimonios` | ✅ Placeholder listo |
| 13 | Comparador | `#comparador` | ⚠️ Placeholder — lógica pendiente |
| 14 | Tiendas | `#tiendas` | ✅ 1 sede desde config JSON |
| 15 | Formulario de cotización | `#cotizacion` | ✅ Validación JS + envío WA |
| 16 | Footer | `site-footer` | ✅ Con nav legal completo |

---

## Catálogo dinámico

**Estado actual:** JSON estático en `data/catalogo.json` cargado con `fetch()`.  
**4 modelos base:** Pulsar NS400, Dominar 400, Boxer 150, CT 125.

**Flujo actual:**
```
data/catalogo.json → fetch() → STATE.catalogo → renderizarCatalogo() → #catalog-grid
```

**Evolución planificada (Fase 3):**
- Google Sheets pública con columnas equivalentes
- Apps Script o exportador JSON automatizado
- Sin cambios en el frontend — mismo esquema de datos

Ver `docs/guia-catalogo-json.md` y `docs/catalogo-dinamico.md`.

---

## WhatsApp (canal principal)

El sitio prioriza WhatsApp como canal de conversión. Implementado en:

- Botón "Cotizar" en cada tarjeta de catálogo → mensaje con nombre del modelo
- Formulario de cotización → mensaje con datos del usuario
- CTA directo en sección de cotización → chat general
- CTA en sección de servicio técnico → agendamiento
- Páginas legales → reclamaciones

**Número actual:** `+51987654321` — PENDIENTE de validación con número real.

---

## SEO

| Elemento | Estado |
|----------|--------|
| `<meta description>` | ✅ |
| `<meta keywords>` | ✅ |
| Open Graph | ✅ (imagen pendiente) |
| Twitter Card | ✅ (imagen pendiente) |
| `<link rel="canonical">` | ✅ |
| Heading hierarchy H1→H3 | ✅ |
| `robots.txt` | ✅ |
| `sitemap.xml` | ✅ |
| Favicon | ⚠️ Pendiente archivo real |
| Imagen OG (1200×630) | ⚠️ Pendiente |

---

## Legales (Perú)

| Página | Estado | Ley de referencia |
|--------|--------|------------------|
| Privacidad | ✅ Provisional | Ley 29733 |
| Términos | ✅ Provisional | Código Civil Perú |
| Cookies | ✅ Provisional | — |
| Datos personales | ✅ Provisional | Ley 29733 + DS 003-2013-JUS |
| Libro de reclamaciones | ✅ Provisional | Ley 29571 |
| Condiciones de financiamiento | ✅ Provisional | — |

**Todos los textos son provisionales.** Requieren revisión por asesor legal antes del lanzamiento.

---

## Fases de desarrollo

| Fase | Nombre | Estado |
|------|--------|--------|
| 0 | Cimentación inicial | ✅ Completado |
| 1 | **Base técnica** | ✅ Completado — Junio 2026 |
| 2 | Diseño premium y contenido visual | ⏳ PRÓXIMA SESIÓN |
| 3 | Catálogo dinámico (Google Sheets) | 🔲 Pendiente |
| 4 | Analítica y conversiones | 🔲 Pendiente |
| 5 | Pruebas y lanzamiento público | 🔲 Pendiente |

---

## Decisiones de arquitectura tomadas

- **Sin frameworks:** Vanilla JS puro por velocidad de carga y sin build steps
- **Sin CDN externo:** Todo local para evitar dependencias de terceros en producción
- **JSON como fuente de datos:** Permite migración a Google Sheets sin cambiar el frontend
- **CSS variables nativas:** Flexibilidad para cambiar temas sin reescribir estilos
- **HTML semántico:** Accesibilidad y SEO sin trabajo extra
- **GitHub Pages:** Hosting gratuito con HTTPS automático para esta fase

---

## Métricas a medir

- Visitas únicas a la página principal
- Clics en botones de WhatsApp (por modelo y sección)
- Conversiones del formulario de cotización
- Tiempo en página por sección
- Visitas a secciones legales
- Interés por modelo (clic en cada tarjeta)

Conectar con Google Analytics antes del lanzamiento. Ver `script.js → trackEvent()`.

---

## Coordinación de agentes IA

El proyecto suma a Codex como auditor técnico junto a Claude Code (constructor) y ChatGPT (dirección estratégica). Reglas completas en `AGENTS.md`.

### Roles

| Agente | Rol |
|--------|-----|
| Claude Code | Constructor principal en VS Code — escribe y modifica HTML/CSS/JS/JSON |
| Codex | Auditor técnico vía GitHub — revisa errores, seguridad, performance, accesibilidad, SEO |
| ChatGPT | Dirección estratégica — prompts, prioriza hallazgos, criterio gerencial |

### Reglas clave

- Codex audita, no rediseña ni decide identidad visual.
- Ningún agente inventa datos comerciales, legales o de contacto.
- Ningún agente hace commit ni push sin autorización explícita del usuario.
- Cambios de contenido van primero a `data/slots/*.json`, no al HTML directamente.

### Flujo de trabajo

```
ChatGPT define prioridad → Claude Code construye → usuario revisa →
commit autorizado → Pull Request → Codex audita → ChatGPT prioriza hallazgos →
Claude Code corrige → usuario aprueba merge a main
```

Documentación completa: `docs/flujo-ia-claude-codex-chatgpt.md` y checklist de auditoría en `docs/checklist-codex-review.md`. Plantilla obligatoria de PR en `.github/PULL_REQUEST_TEMPLATE.md`.

---

## Cómo continuar mañana

1. Abrir `docs/pendientes-manana.md` — lista completa de decisiones a tomar
2. Completar `docs/checklist-pre-diseno.md` — antes de iniciar el diseño premium
3. Revisar `docs/requisitos-pendientes-gerencia.md` — datos que solo el dueño puede confirmar
4. Confirmar tipografías y paleta definitiva
5. Insertar logo, favicon e imagen OG
6. Actualizar número de WhatsApp real en `data/slots/whatsapp.json`
7. Definir hero visual y entrar al diseño inmersivo
8. Conectar Codex con el repositorio en GitHub para empezar a auditar Pull Requests
