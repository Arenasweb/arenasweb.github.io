# Checklist Pre-Diseño — ARENAS MOTOCICLETAS

**Para completar ANTES de entrar a la sesión de diseño premium.**  
Última revisión: junio 2026

---

## BLOQUE A: Identidad visual

- [ ] **Logo oficial** — ¿Existe un archivo SVG o AI del logo definitivo?
- [ ] **Símbolo/Marca** — ¿Solo texto, solo ícono, o combinado?
- [ ] **Tipografía principal** — ¿Cuál es la fuente para headlines? (opciones: Rajdhani, Barlow Condensed, Bebas Neue, Montserrat, Orbitron, otra)
- [ ] **Tipografía secundaria** — ¿Cuál es la fuente para body y UI?
- [ ] **Paleta de color final** — Confirmar: ¿exactamente qué tonos de negro, azul y cian?
- [ ] **Tratamiento de contraste** — ¿Hay un azul eléctrico o solo cian como acento?
- [ ] **Color de fondo alternativo** — ¿Hay secciones en gris oscuro o solo negro puro?

---

## BLOQUE B: Hero y experiencia inmersiva

- [ ] **Concepto del hero** — ¿Imagen estática, video de fondo, o fondo generativo?
- [ ] **Si hay imagen:** ¿Cuál foto de moto va en el hero? (confirmar con equipo)
- [ ] **Si hay video:** ¿Formato MP4 + WebM? ¿Duración? ¿Con o sin audio?
- [ ] **Headline del hero** — ¿Cuál es el copy definitivo de la H1?
- [ ] **Tagline debajo del headline** — ¿"La A que acelera" o nuevo texto?
- [ ] **Nivel de parallax** — ¿Sutil, dramático o ninguno?
- [ ] **Partículas o efectos generativos** — ¿Sí o no? ¿De qué tipo?
- [ ] **Cursor personalizado** — ¿Sí o no?

---

## BLOQUE C: Catálogo y tarjetas

- [ ] **Fotografías oficiales** — ¿Hay fotos de los modelos actuales en alta calidad?
- [ ] **Formato de foto de moto** — ¿Fondo blanco, fondo oscuro, sin recorte?
- [ ] **Número de tarjetas en la grilla** — ¿3 por fila, 4 por fila, o adaptativo?
- [ ] **¿Hay un modelo "estrella" para destacar más?** — Confirmar cuál es el modelo destacado definitivo
- [ ] **Información en tarjeta** — ¿Qué campos mostrar: precio, cuota, cilindrada, colores?
- [ ] **Interacción de tarjeta** — ¿Expand on hover, modal, o link a página de modelo?
- [ ] **¿Habrá páginas de modelo individual?** — (requiere arquitectura adicional)

---

## BLOQUE D: Copywriting

- [ ] **Textos de hero** — Headline y descripción definitivos
- [ ] **Taglines de sección** — Revisar cada H2 y descripción de sección
- [ ] **Propuesta de valor** — 4 razones definitivas para elegir ARENAS
- [ ] **Beneficios incluidos** — Lista validada de lo que incluye cada compra
- [ ] **Texto de financiamiento** — Condiciones reales o al menos orientativas
- [ ] **Texto de servicio técnico** — Servicios disponibles reales
- [ ] **Líneas de motos** — Descripciones breves validadas por línea
- [ ] **Call to actions** — ¿"Cotizar", "Consultar", "Me interesa", "Ver más"?

---

## BLOQUE E: Datos reales para validar

- [ ] **Número de WhatsApp oficial** — Confirmar y reemplazar en `data/configuracion.json`
- [ ] **Dirección(es) de tienda** — Validar dirección exacta y referencias
- [ ] **Horarios reales** — Días y horas de apertura/cierre
- [ ] **Correo electrónico oficial** — Confirmar si contacto@arenasmotos.pe está activo
- [ ] **Redes sociales** — URLs definitivas de Facebook, Instagram, TikTok
- [ ] **Precios reales** — Revisar y confirmar los precios del catálogo JSON
- [ ] **Stock real** — Confirmar disponibilidad actual de modelos
- [ ] **Líneas de motos activas** — ¿Cuáles se comercializan realmente ahora?

---

## BLOQUE F: Activos digitales

- [ ] **Favicon** — Archivo `assets/favicon/favicon.ico` (32×32) y `apple-touch-icon.png` (180×180)
- [ ] **Imagen Open Graph** — `assets/og/arenas-og-cover.jpg` (1200×630 px, máx 300 KB)
- [ ] **Fotos de motos** — Mínimo foto principal de cada modelo en catálogo
- [ ] **Íconos de línea** — SVG o PNG para Pulsar, Dominar, Boxer, CT
- [ ] **Íconos de "por qué ARENAS"** — 4 íconos para la sección de propuesta de valor
- [ ] **Foto del taller** — Para sección de servicio técnico

---

## BLOQUE G: Legal y compliance

- [ ] **Razón social oficial** — Para completar páginas legales
- [ ] **RUC** — Registro tributario para facturas y legales
- [ ] **Revisión legal de privacidad y términos** — Por abogado o asesor legal
- [ ] **Inscripción RNPDP** — Banco de datos personales en ANDPD (Perú)
- [ ] **Formulario digital de reclamaciones** — Decisión sobre implementación antes del lanzamiento

---

## BLOQUE H: Decisiones de diseño visual final

- [ ] **Modo del diseño** — ¿Solo oscuro, o también habrá modo claro?
- [ ] **Secciones alternadas** — ¿Fondo uniforme o secciones con fondos distintos?
- [ ] **Separadores entre secciones** — ¿Líneas, ondas SVG, o solo espacio?
- [ ] **Nivel de "glassmorphism"** — ¿backdrop-filter intenso o sutil?
- [ ] **Tarjetas con o sin borde** — ¿Solo sombra o también borde visible?
- [ ] **Botón primario** — ¿Sólido cian, gradiente, o outline?
- [ ] **Footer** — ¿Con logo grande, mínimo, o con columnas de navegación completas?

---

## Estado de esta checklist

**Completados para la sesión de diseño:**
- [x] Arquitectura HTML con todas las secciones
- [x] Sistema CSS con variables editables
- [x] JavaScript funcional (catálogo, filtros, formulario, animaciones)
- [x] Catálogo JSON con 4 modelos base
- [x] Configuración centralizada en JSON
- [x] Páginas legales con estructura válida

**Pendientes antes del diseño definitivo:**
- Ver `docs/pendientes-manana.md` para lista completa
