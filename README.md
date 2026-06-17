# ARENAS MOTOCICLETAS — Web Oficial

Sitio web oficial de ARENAS MOTOCICLETAS, concesionario y servicio de motocicletas en Cusco, Perú.  
Alojado en GitHub Pages · Stack: HTML5 + CSS3 + JavaScript puro · Sin frameworks.

---

## Estado actual

**Fase:** Base técnica completada · Diseño visual premium PENDIENTE  
**Versión:** 0.2.0 · Junio 2026  
**URL de desarrollo:** https://arenasweb.github.io/

---

## Tecnología

| Capa | Tecnología |
|------|-----------|
| Markup | HTML5 semántico |
| Estilos | CSS3 con variables nativas |
| Lógica | JavaScript vanilla (ES2020+) |
| Datos | JSON estático + fetch API |
| Hosting | GitHub Pages (rama `main`) |

Sin frameworks JS, sin preprocesadores CSS, sin dependencias externas.

---

## Estructura del proyecto

```
arenasweb.github.io/
├── index.html               ← Página principal con todas las secciones
├── style.css                ← Sistema CSS base (15 bloques)
├── script.js                ← Núcleo JS modular (14 módulos)
├── robots.txt               ← Control de crawlers SEO
├── sitemap.xml              ← Mapa del sitio
│
├── data/
│   ├── catalogo.json        ← Inventario de motos (fuente principal de datos)
│   └── configuracion.json   ← Configuración global: WhatsApp, sedes, SEO
│
├── legales/                 ← 6 páginas legales (provisionales, pendiente revisión)
│   ├── privacidad.html
│   ├── terminos.html
│   ├── cookies.html
│   ├── datos-personales.html
│   ├── libro-reclamaciones.html
│   └── condiciones-financiamiento.html
│
├── docs/                    ← Documentación interna del proyecto
│   ├── arquitectura-tecnica.md
│   ├── sistema-animaciones.md
│   ├── guia-catalogo-json.md
│   ├── checklist-pre-diseno.md
│   ├── checklist-lanzamiento.md
│   ├── pendientes-manana.md
│   ├── catalogo-dinamico.md
│   ├── estructura-web.md
│   └── guia-marca.md
│
└── assets/                  ← PENDIENTE: crear con favicon, og e imágenes de motos
```

---

## Secciones del sitio

1. Hero — Presentación de marca y CTAs principales
2. Buscador — Filtros por línea, uso y cilindrada
3. Catálogo destacado — Tarjetas dinámicas desde `data/catalogo.json`
4. Modelo destacado — Presentación de la moto estrella
5. Líneas de motos — Pulsar, Dominar, Boxer, CT
6. Por qué elegir ARENAS — Propuesta de valor
7. Tu moto incluye — Beneficios de compra
8. Financiamiento — Opciones de cuotas
9. Servicio técnico — Taller en Cusco
10. Promociones — Ofertas vigentes
11. Testimonios — Entregas reales
12. Comparador — Comparación de modelos (pendiente implementación)
13. Tiendas — Sedes y horarios
14. Formulario de cotización — Con validación JS y envío por WhatsApp

---

## Abrir localmente

```bash
# Opción 1: VS Code con Live Server
# Instalar extensión "Live Server" → clic derecho en index.html → "Open with Live Server"

# Opción 2: Python (si está instalado)
python -m http.server 3000
# Abrir: http://localhost:3000

# Opción 3: Node.js (si está instalado)
npx serve .
```

**Importante:** el catálogo se carga con `fetch()`, por lo que necesitas un servidor local. No abrir `index.html` directamente como archivo (protocolo `file://`).

---

## Configurar el proyecto

### Cambiar número de WhatsApp
Editar `data/configuracion.json` → campo `"whatsapp"`.  
El script lo sincroniza automáticamente con `script.js → CONFIG.whatsapp`.

### Añadir una moto al catálogo
Ver `docs/guia-catalogo-json.md` para el esquema completo.

### Cambiar colores o tipografías
Editar variables en `style.css` → Bloque 2 (`:root`).  
**PENDIENTE:** tipografía definitiva y paleta final pendiente de sesión de diseño.

---

## Documentación interna

| Documento | Contenido |
|-----------|-----------|
| `docs/arquitectura-tecnica.md` | Stack, estructura de archivos, flujos de datos |
| `docs/sistema-animaciones.md` | Clases de reveal, variables y decisiones pendientes |
| `docs/guia-catalogo-json.md` | Esquema y guía de gestión del catálogo |
| `docs/checklist-pre-diseno.md` | Lista de decisiones antes del diseño premium |
| `docs/checklist-lanzamiento.md` | Pasos antes de publicar al público |
| `docs/pendientes-manana.md` | Resumen de todo lo pendiente para la próxima sesión |

---

## Próximos pasos

1. **Sesión de diseño premium** — Hero, tipografías, colores definitivos (ver `docs/pendientes-manana.md`)
2. **Contenido real** — Fotografías de motos, logo SVG, imagen OG
3. **Validación de datos** — WhatsApp real, precios, sedes, horarios
4. **Revisión legal** — Textos de privacidad, términos y datos personales por asesor
5. **Pruebas** — Móvil real, catálogo, formulario, navegadores
6. **Lanzamiento** — Confirmar GitHub Pages activo y URL pública

---

## Git

```bash
# Ver estado
git status

# Crear commit (solo con autorización)
git add .
git commit -m "descripción del cambio"

# Push a producción (solo con autorización explícita)
git push origin main
```

**No hacer push sin autorización del equipo.**
