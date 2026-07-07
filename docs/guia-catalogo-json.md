# Guía del Catálogo JSON — ARENAS MOTOCICLETAS

**Archivo:** `data/catalogo.json`  
**Última revisión:** junio 2026

---

## ¿Para qué sirve este archivo?

`catalogo.json` es el **fallback público neutro** del catálogo. El sitio lo carga dinámicamente con `fetch()` en `script.js` → `cargarCatalogo()`. No hay servidor backend — todo se sirve como archivo estático desde GitHub Pages.

**Importante:** el catálogo real (modelos, líneas, versiones, precios, stock) es dato comercial administrado desde Google Sheets — **no se escribe en este JSON público**. Este documento enseña la estructura técnica usando únicamente ejemplos genéricos no comerciales.

---

## Esquema completo de cada moto

```json
{
  "id":             "modelo-ejemplo",
  "visible":        false,
  "destacado":      false,
  "orden":          1,
  "linea":          "Línea administrada desde Google Sheets",
  "modelo":         "Modelo administrado desde Google Sheets",
  "version":        "",
  "cilindrada":     "Consultar",
  "uso":            "deportivo",
  "precio":         "Consultar",
  "cuotaInicial":   "Consultar",
  "financiamiento": "Dato administrado desde Google Sheets",
  "stock":          "Consultar",
  "estadoStock":    "PENDIENTE_GOOGLE_SHEETS",
  "colores":        "Consultar",
  "descripcion":    "Texto breve del modelo (máx 120 caracteres recomendado).",
  "beneficio":      "Consultar",
  "promocion":      "Consultar condiciones vigentes",
  "fotoPrincipal":  "PENDIENTE",
  "fotoSecundaria": "PENDIENTE",
  "fichaTecnica":   "PENDIENTE",
  "whatsapp":       "PENDIENTE",
  "estado":         "activo"
}
```

---

## Descripción de campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | string | ✅ | Identificador único. Kebab-case. No cambiar después de publicar. |
| `visible` | boolean | ✅ | `false` oculta la moto del catálogo sin borrarla. |
| `destacado` | boolean | ✅ | `true` aparece en sección de destacados. |
| `orden` | number | ✅ | Número de orden en la grilla. El menor aparece primero. |
| `linea` | string | ✅ | Línea/familia del modelo. Los nombres reales de líneas se administran desde Google Sheets. |
| `modelo` | string | ✅ | Nombre del modelo. Los nombres reales se administran desde Google Sheets. |
| `version` | string | No | Variante o edición. Ejemplo técnico no comercial. |
| `cilindrada` | string | ✅ | Formato: "XXX cc" (ej: "400 cc"). Lo usa el filtro numérico. |
| `uso` | string | No | Categoría de uso: "deportivo", "urbano", "trabajo", "touring". |
| `precio` | string | ✅ | Precio final. Ej: "PRECIO_PENDIENTE" o "Consultar". Dato administrado desde Google Sheets. |
| `cuotaInicial` | string | No | Cuota de entrada orientativa. Ej: "PRECIO_PENDIENTE". Dato administrado desde Google Sheets. |
| `financiamiento` | string | No | Estado del financiamiento. Ej: "Dato administrado desde Google Sheets". No usar plazos fijos en este repositorio. |
| `stock` | string | ✅ | Valor público seguro: siempre "Consultar" mientras `stockConfirmado` no sea `true`. |
| `estadoStock` | string | No | Marcador de origen del dato, no el valor real. Ej: "PENDIENTE_GOOGLE_SHEETS". El estado operativo real (disponible/agotado/etc.) se administra en Google Sheets, no en este repositorio. |
| `colores` | array | No | Lista de colores disponibles como strings. |
| `descripcion` | string | ✅ | Descripción breve para la tarjeta. Máx 150 caracteres. |
| `beneficio` | string | No | Beneficio o característica técnica principal. |
| `promocion` | string/null | No | Texto de promo vigente. `null` o ausente = sin promo. |
| `fotoPrincipal` | string | No | Ruta relativa a la imagen principal. Sin imágenes aún. |
| `fotoSecundaria` | string | No | Ruta relativa a imagen secundaria (galería, comparador). |
| `fichaTecnica` | string | No | Ruta relativa al PDF de ficha técnica. |
| `whatsapp` | string | ✅ | Número con código país para el enlace directo del modelo. |
| `estado` | string | ✅ | "activo", "descontinuado", "proximamente". |

---

## Valores permitidos por campo

### `linea`
```
Las líneas reales del catálogo se administran desde Google Sheets.
No se enumeran en este repositorio público.
```

### `uso`
```
"deportivo" | "urbano" | "trabajo" | "touring"
```

### `stock`
```
"Consultar" (valor público seguro mientras stockConfirmado !== true)
```
El estado operativo real (disponible/agotado/por llegar/etc.) se administra desde Google Sheets — no se modela como lista de valores en este repositorio público.

### `estado`
```
"activo" | "descontinuado" | "proximamente"
```

---

## Cómo agregar una moto nueva

**Bajo la arquitectura vigente, las motos NO se agregan editando este JSON público** — el catálogo real se administra desde Google Sheets y se publicará vía Apps Script filtrado. Este procedimiento aplica solo a la estructura técnica:

1. Copia un bloque existente al final del array (antes del `]`)
2. Cambia el `id` por uno único en kebab-case (ej: `"modelo-ejemplo-2"`)
3. Asigna el siguiente número de `orden`
4. Completa todos los campos requeridos (✅) con placeholders seguros
5. Mantén `visible: false` — nada se publica sin aprobación
6. Guarda el archivo (el commit requiere auditoría y autorización)

---

## Cómo ocultar una moto sin borrarla

Cambia `"visible": true` a `"visible": false`. La moto permanece en el archivo pero no aparece en el catálogo web.

---

## Cómo marcar una moto como agotada

El estado real de stock (disponible/agotado/por llegar/etc.) se administra desde Google Sheets, no editando este JSON público directamente. Mientras esa integración no esté activa, `stock` permanece en `"Consultar"` y `stockConfirmado` en `false` para todos los modelos.

---

## Ruta de imágenes

Las imágenes se guardan en `assets/motos/<linea-lowercase>/`. Ejemplo genérico (no comercial):

```
assets/motos/linea-ejemplo/modelo-ejemplo-1.jpg     ← fotoPrincipal
assets/motos/linea-ejemplo/modelo-ejemplo-2.jpg     ← fotoSecundaria
assets/motos/linea-ejemplo/modelo-ejemplo-ficha.pdf ← fichaTecnica
```

Mientras el archivo no exista físicamente en `assets/`, el campo se mantiene en `"PENDIENTE"` — nunca referenciar rutas inexistentes.

**Dimensiones recomendadas para fotos:**
- Proporción: 16:9 (ej: 800×450 px)
- Formato: JPG (calidad 85%) o WebP
- Peso máximo: 150 KB por imagen

---

## Arquitectura de datos con Google Sheets

- **Google Sheets es la fuente comercial editable.** El catálogo real (modelos, precios, stock, disponibilidad, colores, fichas) se administra ahí, nunca en este JSON público.
- **Apps Script publica un JSON filtrado hacia la web**, exponiendo únicamente los registros aprobados.
- **`data/catalogo.json` público NO se actualiza con el catálogo real** ni automáticamente desde Sheets. Queda como **fallback neutro/manual** (estructura de ejemplo, `visible:false`) para que la web no se rompa si el endpoint futuro falla.
- **No debe contener precios reales, stock real, disponibilidad real ni el catálogo completo.**

**Importante:** el esquema de campos (`ESQUEMA_MOTO`) debe mantenerse idéntico entre Google Sheets, el JSON filtrado publicado por Apps Script y este fallback, para no romper el frontend.
