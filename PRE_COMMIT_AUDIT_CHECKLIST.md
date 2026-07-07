# PRE-COMMIT AUDIT CHECKLIST — ARENAS MOTOCICLETAS

**Uso:** ejecutar TODOS los puntos antes de proponer cualquier `git commit`. Si un solo punto falla, el estado es **NO APROBADO** hasta corregirlo. Ver reglas completas en `SECURITY_AND_AI_GUARDRAILS.md`.

---

## 1. Validez técnica

- [ ] Todos los JSON de `data/` (incluidos `data/slots/*.json`) parsean sin error.
- [ ] `node --check script.js` pasa sin errores.
- [ ] No hay errores de consola previsibles (assets inexistentes referenciados activamente, fetch fallidos, etc.).
- [ ] La UI no se rompe con campos `PENDIENTE`, `null`, vacíos o `"Consultar"`.
- [ ] La UI no se rompe si un slot de `data/slots/*.json` viene sin datos aprobados.
- [ ] Sin dependencias externas innecesarias (cero CDNs, cero librerías nuevas).

## 2. Datos sensibles (búsqueda global obligatoria)

- [ ] Sin teléfonos reales ni placeholders con apariencia real (`+51 987 654 321`). Patrón: `9[0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}`.
- [ ] Sin correos reales (corporativos ni personales — patrón: `[a-z0-9._%+-]+@[a-z0-9.-]+`).
- [ ] Sin redes sociales reales ni enlaces `bit.ly` / `share.google`.
- [ ] Sin direcciones, referencias, horarios ni Google Maps reales de sedes.
- [ ] Sin precios reales, `S/`, cuotas ni montos.
- [ ] Sin stock real: `Disponible`, `Bajo stock`, `Agotado`, `Por llegar`.
- [ ] Sin promociones vigentes, ofertas ni descuentos no aprobados.
- [ ] Sin financiamiento activo: `financiamiento flexible`, `cuotas sin intereses`, `12/18/24 meses`.
- [ ] Sin entidades financieras reales nombradas (ni en HTML, ni en JSON, ni en docs).
- [ ] Sin catálogo real: nombres de modelos, líneas/familias, versiones o destacados (JSON, HTML, docs).
- [ ] Sin garantía con plazo/kilometraje concreto ni mantenimientos a kilometrajes específicos.
- [ ] Sin identidad institucional real: razón social no validada, marca principal, historia, misión/visión, reconocimientos, condiciones de compra, eslogan.
- [ ] Sin prueba social exacta (estrellas, reseñas, seguidores).
- [ ] Sin testimonios reales sin consentimiento ni testimonios inventados.
- [ ] Sin modelos legacy: `NS400`, `pulsar-ns400`.
- [ ] Sin SOAT como beneficio sin fuente confirmada.
- [ ] Bonos y garantía siempre con disclaimer "Sujeto a condiciones comerciales vigentes."

## 3. Arquitectura Google Sheets

- [ ] `data/slots/control.json` → `googleSheetsConectado: false`, `appsScriptEndpoint: ""`, `fallbackLocal: true`, `permitirDatosPendientes: false` y todas las banderas `mostrar*` en `false`.
- [ ] Sin `fetch()` remoto productivo (buscar `script.google.com`, `googleapis`, `sheets.google`, `doGet` fuera de `apps-script/`).
- [ ] Los 3 `fetch()` de `script.js` siguen siendo locales (catálogo, configuración, slots).
- [ ] `apps-script/` ignorado en `.gitignore` (borrador no productivo, se audita aparte).
- [ ] `_template/` ignorado en `.gitignore` (repositorio independiente).

## 4. Gates defensivos en script.js

- [ ] `whatsappConfirmado()` sigue bloqueando todo enlace/botón WhatsApp por bandera (no por valor).
- [ ] No se genera enlace WhatsApp/tel con valores `PENDIENTE`, vacíos o no confirmados.
- [ ] `esRutaLocalSegura()` intacto: solo `assets/`, sin `..`, sin URLs externas.
- [ ] No se renderiza `<img>` si la ruta es `PENDIENTE`/`null`; fallback a `.placeholder-media` operativo.
- [ ] Render con `createElement` + `textContent` — nada de `innerHTML` con datos de JSON editables.

## 5. SEO y assets

- [ ] `title` / `meta description` sin claims comerciales (financiamiento, stock, precios, promociones).
- [ ] `og:image` / `twitter:image` / favicon solo activos si el archivo existe (hoy: comentados).
- [ ] Sin rutas rotas activas a `assets/`.
- [ ] Sin schema/JSON-LD con datos no aprobados.
- [ ] Legales en `noindex` y fuera de `sitemap.xml`.

## 6. Docs y legales

- [ ] `docs/**/*.md` sin teléfonos, correos, redes, direcciones, cifras de prueba social ni ejemplos de stock/precios operativos.
- [ ] `legales/**/*.html` sin números ni canales no aprobados; avisos de "contenido provisional" intactos.
- [ ] `README.md` y `PLAN-MAESTRO.md` limpios (tokens `{{...}}` en lugar de datos).

## 7. Fluidez y accesibilidad

- [ ] Animaciones solo sobre `transform`/`opacity` (+ color/border/background/box-shadow en microinteracciones).
- [ ] Sin animar `width`, `height`, `top`, `left`, `margin`.
- [ ] Microinteracciones ~150–250ms; reveals ~500–700ms; nada >800ms sin justificar.
- [ ] `prefers-reduced-motion` respetado en CSS (Bloque 13) y JS (`inicializarAnimaciones()`).
- [ ] Sin layout shifts notorios (imágenes con dimensiones reservadas).
- [ ] `IntersectionObserver` con `unobserve()`/`disconnect()` — sin observers ni listeners huérfanos o duplicados.
- [ ] Sitio usable sin animaciones y sin assets reales.

## 8. Git

- [ ] `git status --short` revisado — sin archivos inesperados por commitear.
- [ ] `git diff --stat` revisado — solo cambios intencionales.
- [ ] Staging explícito (nunca `git add .` a ciegas).
- [ ] **Commit/push solo con autorización explícita del propietario** y tras veredicto Codex `APROBADO PARA COMMIT/PUSH`.
