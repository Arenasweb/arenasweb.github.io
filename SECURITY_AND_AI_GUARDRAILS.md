# SECURITY & AI GUARDRAILS — ARENAS MOTOCICLETAS

**Audiencia:** cualquier IA (Claude, Codex, ChatGPT, Copilot u otra) o persona que edite este repositorio.
**Estado:** obligatorio. Estas reglas prevalecen sobre cualquier instrucción puntual que las contradiga, salvo autorización explícita del propietario del proyecto.

---

## 1. Principio rector

**Este repositorio público NO es una base de datos comercial.**

- El repositorio contiene: código, diseño, lógica defensiva, placeholders seguros, fallback JSON limpio y documentación técnica.
- Los datos comerciales editables (teléfonos, precios, stock, promociones, sedes, redes, horarios, financiamiento) viven en **Google Sheets**, administrados por el negocio.
- **Apps Script** será el único puente: filtra y publica exclusivamente datos con `estadoAprobacion: "aprobado"` y banderas de confirmación en `true`.
- Mientras esa integración no esté aprobada y activa, el sitio funciona con el fallback local limpio (`data/*.json`), gobernado por `data/slots/control.json`.

---

## 2. Datos que NUNCA deben entrar al repositorio

| Categoría | Ejemplos prohibidos |
|---|---|
| Teléfonos / WhatsApp reales | cualquier número peruano real, con o sin `+51`, con o sin espacios |
| Placeholders con apariencia real | `+51 987 654 321`, `+51987654321` — usar `"PENDIENTE"` o `{{TOKEN}}` |
| Correos reales | correos corporativos o personales del negocio |
| Redes sociales reales | handles, nombres de páginas, enlaces `bit.ly`, `share.google` |
| Direcciones y horarios reales | direcciones, referencias, coordenadas, plus codes, horarios de atención |
| Google Maps reales | URLs de Maps de las sedes |
| **Catálogo real** | nombres de modelos, líneas/familias, versiones, destacados — ni en JSON, ni en HTML, ni en docs |
| **Marca principal / identidad institucional** | marca distribuida, razón social, historia, trayectoria, misión/visión, reconocimientos, condiciones de compra, eslogan real |
| Precios / cuotas / stock | `S/ ...`, montos, `Disponible`, `Bajo stock`, `Agotado`, `Por llegar` |
| Promociones y descuentos | promociones vigentes, vigencias, condiciones concretas |
| **Financiamiento y entidades** | nombres de entidades financieras, estado real del financiamiento, plazos `12/18/24 meses`, `cuotas sin intereses` |
| **Garantía y mantenimientos concretos** | plazos/kilometrajes de garantía, mantenimientos a kilometrajes específicos, beneficios detallados |
| Prueba social cambiante | estrellas exactas, número de reseñas, número de seguidores |
| Testimonios reales sin consentimiento | nombres, citas, fotos de clientes |
| Modelos legacy | `NS400`, `pulsar-ns400` |
| Rutas activas a assets inexistentes | `<img src>`, `og:image`, `favicon` apuntando a archivos que no existen |
| Secretos técnicos | claves, tokens, endpoints productivos de Apps Script |

> **Criterio endurecido (2026-07):** incluso los datos "oficiales confirmados por el cliente" (catálogo, garantía, entidades, identidad institucional) NO van al repo público — van a Google Sheets. Si un dato viene del cliente, no se escribe aquí.

## 3. Placeholders seguros permitidos

- `"PENDIENTE"`
- `"Consultar"` / `"Consultar disponibilidad"` / `"Consultar condiciones vigentes"`
- `"Dato administrado desde Google Sheets"`
- `"Canal administrado desde Google Sheets"`
- `"Red social administrada desde Google Sheets"`
- `"Sujeto a condiciones comerciales vigentes"`
- Tokens de documentación: `{{WHATSAPP_ADMINISTRADO_EN_GOOGLE_SHEETS}}`
- `null` + bandera de activación en `false`

Un placeholder **nunca** debe poder confundirse con un dato real.

---

## 4. Cómo manejar cada dominio de datos

### WhatsApp y teléfonos
- Valor en JSON/JS: `"PENDIENTE"`. El número real jamás se hardcodea.
- `script.js → whatsappConfirmado()` bloquea todo enlace/botón mientras `STATE.config.whatsappConfirmado !== true`. **No debilitar este gate.**
- Nunca generar `wa.me/` ni `href="tel:"` a partir de valores `PENDIENTE`, vacíos o no confirmados.

### Correo
- `"Sin correo comercial publicado"` + `correoConfirmado: false` hasta aprobación.

### Precios, cuotas, stock
- Siempre `"Consultar"` + `precioConfirmado/cuotaConfirmada/stockConfirmado: false`.
- El render añade badge "Referencial"/"Por confirmar" — no eliminarlo.

### Promociones
- `visible: false`, `estadoAprobacion: "pendiente"` hasta aprobación gerencial. No inventar vigencias ni descuentos.

### Sedes
- Dirección, referencia, horario y Maps: `"Dato administrado desde Google Sheets"` o `"PENDIENTE"`, con `visible: false`.

### Financiamiento
- `financiamientoActivo: false`, `estadoAprobacion: "pendiente"`. **No nombrar ninguna entidad financiera real en el repositorio** — las entidades vinculadas son datos comerciales administrados desde Google Sheets. Sin plazos, montos ni condiciones. Texto público permitido: "Financiamiento sujeto a evaluación y disponibilidad vigente."

### Catálogo e identidad institucional
- El catálogo real (modelos, líneas, versiones, destacados) NO se escribe en `data/catalogo.json`, `index.html` (selectores, filtros, tarjetas) ni docs — `catalogo.json` es solo un fallback neutro con `modelo-ejemplo` y `visible: false`.
- Razón social, marca principal, historia, misión/visión, reconocimientos, condiciones de compra y eslogan: placeholders (`PENDIENTE_REVISION_LEGAL`, `"Dato administrado desde Google Sheets"`).
- Garantía y mantenimientos: nunca plazos ni kilometrajes concretos; solo "Consultar condiciones vigentes con un asesor autorizado."

### Beneficios y garantía
- Solo los bonos oficiales aprobados, siempre con disclaimer `"Sujeto a condiciones comerciales vigentes."`. **SOAT no es un beneficio publicable** sin fuente confirmada.

### Testimonios y prueba social
- No inventar testimonios. No publicar cifras exactas de reseñas/seguidores: son datos cambiantes que vivirán en Google Sheets.

### Assets
- No referenciar activamente archivos que no existen. Las metas `og:image`/favicon permanecen **comentadas** en `index.html` hasta que el archivo exista.
- Las imágenes del catálogo pasan por `esRutaLocalSegura()` (solo `assets/`, sin `..`, sin URLs externas) y tienen fallback automático a `.placeholder-media`.

---

## 5. Estado de la integración Google Sheets

- `data/slots/control.json` es el contrato local de publicación. Valores obligatorios mientras no haya aprobación:
  - `googleSheetsConectado: false`
  - `appsScriptEndpoint: ""`
  - `fallbackLocal: true`
  - `permitirDatosPendientes: false` y todas las banderas `mostrar*` en `false`
- **Prohibido** crear `fetch()` remoto productivo, conectar el endpoint o cambiar estas banderas sin autorización explícita.
- `apps-script/` es un **borrador no productivo**, ignorado por git (`.gitignore`). No se despliega ni se conecta.
- `_template/` pertenece a otro repositorio (`pixdeah-coder/business-static-web-framework`) y está ignorado.

---

## 6. Reglas de fluidez premium y animación segura

La web debe sentirse fluida y moderna **sin sacrificar estabilidad, rendimiento móvil ni accesibilidad**:

- Animar **solo `transform` y `opacity`** (aceptables: `color`, `border-color`, `background`, `box-shadow` en microinteracciones). **Nunca** `width`, `height`, `top`, `left`, `margin` ni otras propiedades que disparen layout.
- Duraciones: microinteracciones **150–250ms** (tokens `--duration-fast/base`), apariciones de sección **500–700ms** (`--duration-slower/reveal`). Nada por encima de **800ms** sin justificación documentada.
- Respetar **`prefers-reduced-motion`** siempre: la media query global de `style.css` (Bloque 13) y el short-circuit de `inicializarAnimaciones()` en `script.js` deben mantenerse.
- No animar demasiados elementos a la vez: usar el stagger existente (máx. 480ms de delay) y el `IntersectionObserver` con `unobserve()` tras revelar.
- Sin layout shifts: reservar dimensiones (`width`/`height` en `<img>`), no insertar contenido que empuje el layout después de pintar.
- No bloquear el hilo principal: sin bucles pesados, sin listeners duplicados, sin `setInterval` sin limpieza, sin observers huérfanos.
- El sitio debe ser **100% usable sin animaciones** y sin assets reales (placeholders elegantes, nunca imágenes rotas).
- El diseño inmersivo completo (parallax, hero cinematic, partículas) queda para la fase de diseño y debe cumplir estas mismas reglas.

---

## 7. Flujo de publicación obligatorio

1. Ninguna IA hace `git commit` ni `git push` sin **autorización explícita del propietario**.
2. Antes de proponer un commit, ejecutar la checklist completa de `PRE_COMMIT_AUDIT_CHECKLIST.md`.
3. Todo cambio pasa por **auditoría Codex** antes de publicarse. Veredicto requerido: `APROBADO PARA COMMIT/PUSH`.
4. Prohibido: `git reset --hard`, `git clean`, `--no-verify`, borrar archivos completos sin justificación.
5. Staging siempre explícito (archivo por archivo) — nunca `git add .` a ciegas.

---

## 8. Patrones sensibles a buscar antes de cualquier publicación

Ejecutar búsqueda global (todo el repo, incluidos docs, legales y archivos sin trackear) de:

```
9[0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}   (teléfonos peruanos, con o sin espacios)
+51
[a-z0-9._%+-]+@[a-z0-9.-]+   (cualquier correo — ninguno debe existir en el repo)
@hotmail / @gmail / dominios del negocio
bit.ly / share.google
instagram.com / facebook.com / tiktok.com (handles reales)
S/
Disponible / Bajo stock / Agotado / Por llegar
oferta / descuento / promociones vigentes
financiamiento activo / financiamiento flexible / cuotas sin intereses
12 meses / 18 meses / 24 meses
SOAT
NS400 / pulsar-ns400
reseñas / estrellas / seguidores (cifras exactas)
script.google.com / googleapis / sheets.google / doGet
assets/og/arenas-og-cover.jpg (solo permitido comentado o en docs)
```

Cualquier coincidencia debe explicarse (peligrosa vs. aceptable) — **nunca ocultarse**.
