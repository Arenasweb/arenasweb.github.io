# Checklist de Lanzamiento — ARENAS MOTOCICLETAS

**Para completar ANTES de hacer push final y abrir al público.**  
Última revisión: junio 2026

---

## BLOQUE 1: Datos reales validados

- [ ] Número de WhatsApp real confirmado en `data/configuracion.json → whatsapp`
- [ ] Dirección de tienda validada en `data/configuracion.json → sedes[0].direccion`
- [ ] Horarios reales confirmados en `data/configuracion.json → horarios`
- [ ] Correo electrónico activo y recibiendo mensajes
- [ ] URLs de redes sociales reales en `data/configuracion.json → redesSociales`
- [ ] Precios del catálogo validados con el equipo comercial
- [ ] Stock real de cada modelo verificado
- [ ] Razón social y RUC completos en páginas legales

---

## BLOQUE 2: Assets digitales

- [ ] `assets/favicon/favicon.ico` — 32×32 px
- [ ] `assets/favicon/apple-touch-icon.png` — 180×180 px
- [ ] `assets/og/arenas-og-cover.jpg` — 1200×630 px, máx 300 KB
- [ ] Foto principal de cada modelo en `assets/motos/<linea>/`
- [ ] Logo SVG oficial reemplazando el placeholder "A"

---

## BLOQUE 3: Contenido del sitio

- [ ] Textos del hero (H1 y descripción) definitivos
- [ ] Taglines de cada sección revisados
- [ ] Descripción de "Por qué ARENAS" con información real
- [ ] Lista "Tu moto incluye" validada con equipo comercial
- [ ] Condiciones de financiamiento actualizadas
- [ ] Servicios del taller listados correctamente
- [ ] Sin textos "PENDIENTE" visibles al usuario final

---

## BLOQUE 4: Técnico

- [ ] Sin errores en consola del navegador (Chrome DevTools → Console)
- [ ] Sin advertencias 404 (Network tab → verificar que todos los recursos cargan)
- [ ] Catálogo carga correctamente desde `data/catalogo.json`
- [ ] Filtros del buscador funcionan sin errores
- [ ] Formulario valida campos obligatorios correctamente
- [ ] Formulario envía mensaje a WhatsApp con datos correctos
- [ ] Todas las páginas legales enlazan de vuelta al inicio
- [ ] Menú móvil abre y cierra correctamente
- [ ] Animaciones de reveal funcionan en scroll
- [ ] `prefers-reduced-motion` desactiva animaciones correctamente
- [ ] Año en footer es el actual (actualización automática con JS)

---

## BLOQUE 5: SEO y metadatos

- [ ] `<meta name="description">` con texto real y atractivo
- [ ] Open Graph configurado con imagen real (`og:image`)
- [ ] Twitter Card configurado con imagen real
- [ ] `sitemap.xml` actualizado con URL definitiva
- [ ] `robots.txt` correcto (legales en noindex, resto indexable)
- [ ] `<link rel="canonical">` apunta a la URL real
- [ ] Heading hierarchy H1→H2→H3 sin saltos

---

## BLOQUE 6: Accesibilidad

- [ ] Navegación completa por teclado (Tab y Enter)
- [ ] Todos los botones con `aria-label` descriptivo
- [ ] Imágenes con `alt` descriptivo
- [ ] Formulario con mensajes de error accesibles (`aria-live`, `role="alert"`)
- [ ] Contraste de texto suficiente (mínimo 4.5:1 para body text)
- [ ] Foco visible en todos los controles interactivos

---

## BLOQUE 7: Pruebas de dispositivos

- [ ] Escritorio — Chrome, Firefox, Edge (Windows)
- [ ] Escritorio — Safari (Mac) si hay acceso
- [ ] Móvil — Chrome Android (dispositivo real)
- [ ] Móvil — Safari iOS (dispositivo real)
- [ ] Tablet — Vista en horizontal y vertical
- [ ] Pantalla 1280px, 1440px, 1920px

---

## BLOQUE 8: Legal

- [ ] Texto de privacidad revisado por asesor legal
- [ ] Texto de términos revisado por asesor legal
- [ ] Datos personales validados conforme Ley 29733
- [ ] Libro de reclamaciones funcional (al menos canal WA)
- [ ] Condiciones de financiamiento con tasas reales
- [ ] Inscripción RNPDP realizada o en proceso

---

## BLOQUE 9: Analítica

- [ ] Google Analytics 4 configurado y recibiendo datos
- [ ] Evento `cotizacion_enviada` verificado en GA4
- [ ] Evento `whatsapp_click` verificado en GA4
- [ ] Meta Pixel configurado (si hay campañas pagas)

---

## BLOQUE 10: GitHub Pages

- [ ] GitHub Pages activado en Settings → Pages → Source: `main`
- [ ] URL pública accesible: `https://arenasweb.github.io/`
- [ ] HTTPS activo (automático con GitHub Pages)
- [ ] Verificar que el deploy del último commit está publicado
- [ ] Abrir en dispositivo móvil real y revisar visualmente
- [ ] Compartir con el equipo para revisión final antes del anuncio

---

## Post-lanzamiento (primeras 48 horas)

- [ ] Monitorear Google Analytics → primeras visitas
- [ ] Verificar que el formulario de cotización genera mensajes en WhatsApp correctamente
- [ ] Comprobar que ningún enlace roto aparece en Google Search Console
- [ ] Enviar sitemap a Google Search Console (solo si se tiene acceso)
- [ ] Publicar en redes sociales con la URL del sitio
