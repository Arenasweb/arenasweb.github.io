# Arquitectura Técnica — ARENAS MOTOCICLETAS

**Estado:** Base técnica preparada · Diseño visual PENDIENTE  
**Versión:** 0.2.0 · Fecha: junio 2026

---

## Stack tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Markup | HTML5 semántico | Sin dependencias, rápido en GitHub Pages |
| Estilos | CSS3 + variables nativas | Control total, sin build step |
| Lógica | Vanilla JavaScript (ES2020+) | Sin frameworks, carga inmediata |
| Datos | JSON estático + fetch | Permite migración a Google Sheets |
| Hosting | GitHub Pages | Gratis, HTTPS automático, CI con git push |

**No se usan:** frameworks JS, preprocesadores CSS, build tools, CDN de terceros.

---

## Estructura de archivos

```
arenasweb.github.io/
├── index.html                 # Página principal — todas las secciones
├── style.css                  # Sistema CSS base (15 bloques)
├── script.js                  # Núcleo JS modular (14 módulos)
├── robots.txt                 # SEO: control de crawlers
├── sitemap.xml                # SEO: mapa del sitio
├── PLAN-MAESTRO.md            # Visión y roadmap del proyecto
├── README.md                  # Documentación del repositorio
│
├── data/
│   ├── catalogo.json          # Inventario de motos (fuente de datos principal)
│   └── configuracion.json     # Config global: WhatsApp, sedes, SEO, mensajes
│
├── legales/
│   ├── privacidad.html        # Política de privacidad
│   ├── terminos.html          # Términos y condiciones
│   ├── cookies.html           # Política de cookies
│   ├── datos-personales.html  # Tratamiento de datos personales (Ley 29733)
│   ├── libro-reclamaciones.html # Libro de reclamaciones (Ley 29571)
│   └── condiciones-financiamiento.html # Condiciones de crédito
│
├── docs/
│   ├── arquitectura-tecnica.md    # Este archivo
│   ├── sistema-animaciones.md     # Sistema de motion design
│   ├── guia-catalogo-json.md      # Cómo gestionar el catálogo
│   ├── checklist-pre-diseno.md    # Antes de entrar a diseño premium
│   ├── checklist-lanzamiento.md   # Antes de publicar al público
│   ├── pendientes-manana.md       # Decisiones diferidas para sesión de diseño
│   ├── catalogo-dinamico.md       # Estrategia de datos del catálogo
│   ├── estructura-web.md          # Mapa de secciones
│   └── guia-marca.md             # Identidad de marca base
│
└── assets/                    # PENDIENTE: crear carpetas de recursos
    ├── favicon/               # favicon.ico, apple-touch-icon.png
    ├── og/                    # Imagen Open Graph (1200×630)
    └── motos/                 # Fotografías por línea y modelo
        ├── pulsar/
        ├── dominar/
        ├── boxer/
        └── ct/
```

---

## Arquitectura CSS (15 bloques)

| Bloque | Contenido |
|--------|-----------|
| 1. Reset | Normalize mínimo |
| 2. Variables | Colores, tipografías, espacios, radios, sombras, z-index, duración, easing |
| 3. Base | Body, headings, párrafos, selección |
| 4. Foco visible | Accesibilidad de teclado |
| 5. Layout | App-shell, contenedores, page-content |
| 6. Header | Marca, nav, toggle móvil |
| 7. Secciones | .section, .section-header, .eyebrow |
| 8. Hero | Grid, media placeholder |
| 9. Cards | Moto card, line card, why card, financing card, store card |
| 10. Botones | Primary, secondary, ghost, WhatsApp, disabled |
| 11. Formularios | Inputs, selects, textarea, checkbox, errores, success |
| 12. Footer | Grid, legal nav, copyright |
| 13. Animaciones | Reveal classes, stagger, glow, parallax reservado |
| 14. Responsive | 900px, 680px, 380px |
| 15. Utilidades | sr-only, text helpers, display, gap, margin |

---

## Arquitectura JavaScript (14 módulos)

| Módulo | Funciones principales |
|--------|----------------------|
| CONFIG | Constantes globales, paths, thresholds |
| STATE | Catálogo, configuración, filtros activos |
| DOM helpers | `$()`, `$$()`, `createElement()`, `clearElement()` |
| WhatsApp helpers | `crearMensajeWhatsApp()`, `buildWhatsAppURL()`, `consultarPorWhatsApp()` |
| Catalog loader | `cargarCatalogo()`, `cargarConfiguracion()` |
| Render catalog | `crearTarjetaMoto()`, `renderizarCatalogo()` |
| Search / filters | `filtrarCatalogo()`, `parseCilindrada()`, `matchCilindrada()` |
| Featured model | `actualizarModeloDestacado()` |
| Stores render | `renderizarTiendas()` |
| Motion observer | `inicializarAnimaciones()` — IntersectionObserver |
| Form handling | `inicializarFormulario()`, `validarFormulario()`, `enviarFormularioPorWhatsApp()` |
| Nav mobile | `inicializarNavMobile()` — hamburguesa |
| Footer year | `actualizarAnioCopyright()` |
| Analytics | `trackEvent()` — placeholders GA4 / Meta Pixel |

---

## Flujo de datos del catálogo

```
data/catalogo.json
    ↓ fetch (cargarCatalogo)
STATE.catalogo []
    ↓ filtrarCatalogo (filtros de buscador)
Array filtrado
    ↓ renderizarCatalogo
DOM: #catalog-grid → tarjetas .moto-card
    ↓ IntersectionObserver
Animación de reveal (.is-visible)
```

---

## Flujo del formulario de cotización

```
Usuario llena campos
    ↓ submit event
validarFormulario() → errores inline
    ↓ si válido
enviarFormularioPorWhatsApp()
    ↓ construye texto
buildWhatsAppURL(texto, número)
    ↓ window.open()
WhatsApp chat (nueva pestaña)
    + trackEvent("cotizacion_enviada")
    + mostrar #form-success
```

---

## SEO técnico implementado

- Meta description
- Meta keywords (base)
- Open Graph (og:title, og:description, og:url, og:image placeholder)
- Twitter Card (summary_large_image)
- `<link rel="canonical">`
- `robots.txt` + `sitemap.xml`
- Heading hierarchy: H1 en hero, H2 por sección, H3 en tarjetas
- `lang="es"` en `<html>`
- `aria-label` en todas las secciones y controles
- Imágenes con `alt` y `loading="lazy"`

---

## Accesibilidad implementada

- `role="banner"`, `role="main"`, `role="contentinfo"` en estructura principal
- `aria-label` en nav, secciones, botones y formularios
- `aria-required`, `aria-describedby`, `aria-live` en formulario
- `:focus-visible` con outline visible en controles
- `prefers-reduced-motion` respetado en animaciones
- Navegación por teclado funcional
- `sr-only` disponible para contenido de solo lectores

---

## Rendimiento

- Sin dependencias externas (0 CDN, 0 frameworks)
- CSS con `backdrop-filter` solo en secciones (no en body)
- `will-change` solo en elementos animados
- `loading="lazy"` en imágenes de tarjetas
- `IntersectionObserver` con `unobserve` tras primer reveal
- `createDocumentFragment()` para inserción de tarjetas en batch
- Fuentes del sistema (sin Google Fonts aún — PENDIENTE)

---

## PENDIENTE técnico

- [ ] Elegir e integrar tipografía premium (Google Fonts o self-hosted)
- [ ] Crear carpetas `assets/` con estructura completa
- [ ] Insertar favicon real
- [ ] Insertar imagen OG real (1200×630)
- [ ] Implementar comparador de modelos (módulo JS)
- [ ] Render dinámico de promociones desde catálogo.json
- [ ] Inscripción RNPDP (datos personales)
- [ ] Activar Google Analytics o Meta Pixel
- [ ] Validar número de WhatsApp real
- [ ] Migración a Google Sheets API (Fase 3)
