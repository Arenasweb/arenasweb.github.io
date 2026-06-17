# Pendientes para Mañana — ARENAS MOTOCICLETAS

**Sesión de diseño premium — Decisiones a tomar antes de construir la interfaz definitiva.**  
Generado: junio 2026 · Referencia base: docs/checklist-pre-diseno.md

---

## CRÍTICO (bloquea el diseño visual)

- [ ] **Definir hero final** — imagen, video, generativo o combinado. Sin esta decisión no se puede construir la sección principal.
- [ ] **Elegir tipografía de headlines** — La H1 del hero define el tono visual de todo el sitio. Proponer 3 opciones y decidir.
- [ ] **Elegir tipografía de cuerpo/UI** — Puede ser la misma u otra complementaria.
- [ ] **Insertar logo oficial** — Si existe, reemplazar `.brand-mark` (la "A" de placeholder) con el SVG real.
- [ ] **Confirmar paleta de color definitiva** — Los valores hexadecimales en `style.css` → `:root` están preparados para ser cambiados. Decidir si el cian es `#06b0d1` o una variante distinta.

---

## URGENTE (necesario para publicar)

- [ ] **Validar número de WhatsApp real** — Actualmente `+51987654321` en `data/configuracion.json` y `script.js → CONFIG`. Cambiar antes de cualquier prueba de usuario real.
- [ ] **Insertar imágenes oficiales de motos** — Las tarjetas del catálogo muestran placeholder si no hay fotos en `assets/motos/`.
- [ ] **Crear carpeta `assets/`** con estructura: `favicon/`, `og/`, `motos/pulsar/`, `motos/dominar/`, `motos/boxer/`, `motos/ct/`
- [ ] **Crear favicon** — `assets/favicon/favicon.ico` (32×32) y `apple-touch-icon.png` (180×180)
- [ ] **Crear imagen OG** — `assets/og/arenas-og-cover.jpg` (1200×630 px). Sin esta imagen, los compartidos en redes muestran imagen vacía.
- [ ] **Validar dirección(es) de tienda** — Confirmar dirección exacta en `data/configuracion.json → sedes[0].direccion`
- [ ] **Validar horarios de atención** — Confirmar con el equipo los horarios reales.

---

## DISEÑO VISUAL (sesión de diseño premium)

- [ ] **Copys definitivos de hero** — Headline H1, descripción y CTAs
- [ ] **Taglines de cada sección** — Revisar todos los H2 y textos descriptivos del HTML
- [ ] **Modelo destacado** — Confirmar cuál es la moto estrella del momento
- [ ] **Describir "Por qué ARENAS"** — Las 4 razones reales con íconos o ilustraciones
- [ ] **Validar "Tu moto incluye"** — La lista actual en index.html es provisional
- [ ] **Íconos de líneas** — Decidir estilo (flat, outline, ilustración)
- [ ] **Íconos de "por qué"** — Estilo coherente con la línea de diseño elegida
- [ ] **Nivel de glassmorphism** — ¿backdrop-filter actual (8px) es suficiente o más intenso?
- [ ] **Tratamiento de secciones** — ¿Fondo uniforme o secciones con fondos diferenciados?
- [ ] **Separadores visuales** — ¿Líneas, degradados o solo espacio?

---

## ANIMACIONES (decidir nivel final)

- [ ] **¿Hero con partículas/canvas?** — Si sí, definir densidad y color
- [ ] **¿Parallax en hero?** — Impacto en móvil, decidir si se activa
- [ ] **¿Video de fondo?** — Necesita archivo MP4/WebM optimizado
- [ ] **¿Cursor personalizado?** — Decide si afecta la experiencia en móvil
- [ ] **¿Transición de entrada de página?** — Fade al cargar (CSS o View Transitions API)
- [ ] **Nivel general de animaciones** — ¿Muy inmersivo (muchos reveals) o sutil y rápido?

---

## CONTENIDO (a recopilar)

- [ ] **Fotografías reales de motos** — Al menos 1 por modelo en alta resolución
- [ ] **Foto del taller o equipo** — Para sección de servicio técnico
- [ ] **Testimonios reales** — Mínimo 2-3 antes del lanzamiento (con permiso del cliente)
- [ ] **Redes sociales activas** — URLs de Facebook, Instagram, TikTok para el footer

---

## LEGAL Y COMPLIANCE

- [ ] **Revisar textos legales** — Con asesor o abogado, especialmente privacidad y datos personales
- [ ] **Razón social oficial** — Para completar páginas legales y datos de empresa
- [ ] **RUC** — Necesario para facturas y legales
- [ ] **Inscripción RNPDP** — Banco de datos personales en la Autoridad Nacional de Protección de Datos (Perú)
- [ ] **Decisión sobre formulario de reclamaciones** — ¿Digital o solo WhatsApp + correo?

---

## TÉCNICO (antes del lanzamiento)

- [ ] **Activar Google Analytics** — O similar. Configurar en `trackEvent()` de `script.js`
- [ ] **Validar Meta Pixel** — Si aplica campañas en Facebook/Instagram
- [ ] **Actualizar sitemap.xml** — Con la URL definitiva (cuando se migre de github.io)
- [ ] **Revisar robots.txt** — Confirmar que legales están en noindex
- [ ] **Versión móvil** — Probar en dispositivos reales (no solo viewport del navegador)
- [ ] **Probar sin imágenes** — Que el sitio funcione razonablemente sin assets
- [ ] **Probar formulario** — Flujo completo: llenar, validar, enviar a WhatsApp
- [ ] **Probar catálogo** — Que carga desde catalogo.json y filtra correctamente
- [ ] **Probar en consola** — Sin errores ni warnings en producción

---

## COMMIT FINAL (al terminar la sesión de diseño)

- [ ] Revisar todos los cambios con `git diff`
- [ ] Crear commit semántico describiendo los cambios de diseño
- [ ] Push a `main` con autorización del equipo
- [ ] Verificar que GitHub Pages sirve el sitio actualizado
- [ ] Abrir la URL pública en dispositivo real (móvil y escritorio)
- [ ] Compartir URL con el equipo para revisión

---

## Referencias

- Ver `docs/checklist-pre-diseno.md` — Checklist completa de pre-diseño
- Ver `docs/checklist-lanzamiento.md` — Pasos finales antes de publicar
- Ver `docs/arquitectura-tecnica.md` — Cómo está construido el proyecto
- Ver `docs/sistema-animaciones.md` — Qué clases de animación están disponibles
- Ver `docs/guia-catalogo-json.md` — Cómo agregar o editar motos
