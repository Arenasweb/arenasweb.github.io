# Sistema de Animaciones — ARENAS MOTOCICLETAS

**Estado:** Arquitectura base lista · Efectos definitivos PENDIENTES de sesión de diseño  
**Principio:** Inmersivo pero controlado. Ninguna animación debe afectar rendimiento móvil.

---

## Variables de animación (en style.css)

```css
/* Duraciones */
--duration-fast:    120ms   /* hover, micro-interactions */
--duration-base:    220ms   /* transiciones de estado */
--duration-slow:    380ms   /* cards hover */
--duration-slower:  600ms   /* entrantes de sección */
--duration-reveal:  700ms   /* reveal on scroll */
--duration-page:    1000ms  /* PENDIENTE: transiciones de página */

/* Easing */
--ease-out:         cubic-bezier(0.22, 1, 0.36, 1)       /* salida natural */
--ease-in-out:      cubic-bezier(0.45, 0, 0.55, 1)       /* entrada-salida */
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1)    /* rebote sutil */
--ease-cinematic:   cubic-bezier(0.16, 1, 0.3, 1)        /* reveal premium */
```

---

## Clases de reveal on scroll

Activadas por `inicializarAnimaciones()` en `script.js` mediante `IntersectionObserver`.

| Clase CSS | Efecto | Uso |
|-----------|--------|-----|
| `.reveal-section` | Fade + slide-up 20px | Cada `<section>` completa |
| `.reveal-fade` | Solo fade (sin movimiento) | Tarjetas de catálogo |
| `.reveal-slide-up` | Slide desde abajo 32px | Elementos internos destacados |
| `.reveal-slide-left` | Slide desde la izquierda | Contenido izquierdo en layouts 2 col |
| `.reveal-slide-right` | Slide desde la derecha | Imágenes/media en layouts 2 col |
| `.reveal-scale` | Scale de 0.97 a 1 + fade | Badges, íconos pequeños |
| `.is-visible` | Estado activo — anula offset | Añadida por JS al cruzar viewport |

### Stagger (escalonado en grids)

```css
.stagger-1 { transition-delay:  80ms; }
.stagger-2 { transition-delay: 160ms; }
.stagger-3 { transition-delay: 240ms; }
.stagger-4 { transition-delay: 320ms; }
.stagger-5 { transition-delay: 400ms; }
.stagger-6 { transition-delay: 480ms; }
```

Se aplican automáticamente en `renderizarCatalogo()` a las primeras 6 tarjetas.

---

## Glows controlados

| Clase | Efecto | Uso sugerido |
|-------|--------|-------------|
| `.glow-cyan` | `box-shadow: 0 0 20px rgba(6,176,209,0.2)` | CTA hover |
| `.glow-cyan--intense` | `box-shadow: 0 0 40px rgba(6,176,209,0.35)` | Elemento estrella, modelo destacado |

---

## Animaciones de hover (implementadas)

### Cards de catálogo (`.moto-card`)
```css
:hover {
  transform: translateY(-4px);
  box-shadow: shadow-lg + shadow-cyan;
  border-color: rgba(6, 176, 209, 0.2);
}
/* Imagen interior */
:hover img {
  transform: scale(1.04);
  transition-duration: 600ms;
}
```

### Botones (`.btn`)
```css
:hover { transform: translateY(-2px); }
.btn-primary:hover { box-shadow: 0 0 20px rgba(6,176,209,0.35); }
.btn-whatsapp:hover { box-shadow: 0 0 20px rgba(37,211,102,0.3); }
```

### Line cards, why cards
```css
:hover {
  border-color: rgba(6, 176, 209, 0.2);
  background: rgba(6, 176, 209, 0.04);
}
```

---

## Zona reservada para diseño premium

### Hero cinematic (PENDIENTE)
```css
/* Reservado en style.css → .hero-cinematic */
/* Opciones a evaluar en sesión de diseño:
   - Fondo con partículas JS (canvas)
   - Video de fondo muted/loop
   - Parallax con imagen de moto
   - Gradiente animado con CSS keyframes
   - Combinación de capas con mix-blend-mode
*/
```

### Parallax (PENDIENTE)
```css
/* .parallax-layer { will-change: transform; } */
/* Conectar con requestAnimationFrame en script.js */
/* Evaluar impacto en móvil antes de activar */
```

### Transiciones de página (PENDIENTE)
```css
/* Fade in al cargar la página */
/* PENDIENTE: decidir si se usa View Transitions API (Chrome 111+) */
```

---

## Accesibilidad: prefers-reduced-motion

**Implementado en style.css.** Cuando el usuario tiene activada la preferencia de movimiento reducido en su sistema:

```css
@media (prefers-reduced-motion: reduce) {
  /* Todas las transiciones → 0.01ms (efectivamente instantáneas) */
  /* Todos los reveals → is-visible inmediato (sin delay ni transform) */
}
```

**Implementado en script.js.** `inicializarAnimaciones()` detecta la preferencia y añade `.is-visible` a todos los elementos sin observer si `prefers-reduced-motion: reduce`.

---

## Rendimiento y buenas prácticas

- `will-change` solo en `.reveal-*` y `.parallax-layer` (no en body ni contenedores)
- `IntersectionObserver` con `unobserve()` tras el primer reveal (no queda activo)
- Las imágenes de tarjetas usan `loading="lazy"` (no bloquean LCP)
- `backdrop-filter: blur(8px)` solo en secciones `.section` (no en body)
- No se animan propiedades que fuerzan layout (width, height, top, left) — solo `transform` y `opacity`
- Nunca usar `animate` con `infinite` en contenido visible sin reducción motion

---

## Decisiones PENDIENTES para sesión de diseño

- [ ] ¿Hero con video, imagen o fondo generativo?
- [ ] ¿Parallax sutil en hero o evitarlo para rendimiento?
- [ ] ¿Transición de página con View Transitions API?
- [ ] ¿Cursor personalizado?
- [ ] ¿Countdown de oferta animado?
- [ ] ¿Slider de imágenes en tarjetas o lightbox?
- [ ] ¿Número de partículas/canvas en hero?
- [ ] ¿Nivel de glow en botones primarios?
