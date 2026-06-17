# Guía del Catálogo JSON — ARENAS MOTOCICLETAS

**Archivo:** `data/catalogo.json`  
**Última revisión:** junio 2026

---

## ¿Para qué sirve este archivo?

`catalogo.json` es la fuente principal de datos del catálogo de motos. El sitio lo carga dinámicamente con `fetch()` en `script.js` → `cargarCatalogo()`. No hay servidor backend — todo se sirve como archivo estático desde GitHub Pages.

---

## Esquema completo de cada moto

```json
{
  "id":             "pulsar-ns400",
  "visible":        true,
  "destacado":      true,
  "orden":          1,
  "linea":          "Pulsar",
  "modelo":         "NS400",
  "version":        "Premium",
  "cilindrada":     "400 cc",
  "uso":            "deportivo",
  "precio":         "S/ 23,800",
  "cuotaInicial":   "S/ 3,800",
  "financiamiento": "12-24 meses",
  "stock":          "Disponible",
  "colores":        ["Negro carbón", "Gris metálico"],
  "descripcion":    "Texto breve del modelo (máx 120 caracteres recomendado).",
  "beneficio":      "Característica técnica o beneficio clave.",
  "promocion":      "Texto de promoción vigente o null si no hay.",
  "fotoPrincipal":  "assets/motos/pulsar/pulsar-ns400-1.jpg",
  "fotoSecundaria": "assets/motos/pulsar/pulsar-ns400-2.jpg",
  "fichaTecnica":   "assets/motos/pulsar/pulsar-ns400-ficha.pdf",
  "whatsapp":       "+51987654321",
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
| `linea` | string | ✅ | Debe coincidir con el filtro: "Pulsar", "Dominar", "Boxer", "CT". |
| `modelo` | string | ✅ | Nombre del modelo (ej: "NS400"). |
| `version` | string | No | Variante o edición (ej: "Ride Edition"). |
| `cilindrada` | string | ✅ | Formato: "XXX cc" (ej: "400 cc"). Lo usa el filtro numérico. |
| `uso` | string | No | Categoría de uso: "deportivo", "urbano", "trabajo", "touring". |
| `precio` | string | ✅ | Precio final en soles. Ej: "S/ 23,800". PENDIENTE validación. |
| `cuotaInicial` | string | No | Cuota de entrada orientativa. PENDIENTE validación. |
| `financiamiento` | string | No | Rango de meses disponibles. Ej: "12-24 meses". |
| `stock` | string | ✅ | Estado: "Disponible", "Bajo stock", "Agotado", "Por llegar". |
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
"Pulsar" | "Dominar" | "Boxer" | "CT"
```

### `uso`
```
"deportivo" | "urbano" | "trabajo" | "touring"
```

### `stock`
```
"Disponible" | "Bajo stock" | "Agotado" | "Por llegar"
```

### `estado`
```
"activo" | "descontinuado" | "proximamente"
```

---

## Cómo agregar una moto nueva

1. Copia un bloque existente al final del array (antes del `]`)
2. Cambia el `id` por uno único en kebab-case (ej: `"pulsar-200ns"`)
3. Asigna el siguiente número de `orden`
4. Completa todos los campos requeridos (✅)
5. Deja `visible: false` si no está lista para publicar
6. Guarda el archivo y haz commit

---

## Cómo ocultar una moto sin borrarla

Cambia `"visible": true` a `"visible": false`. La moto permanece en el archivo pero no aparece en el catálogo web.

---

## Cómo marcar una moto como agotada

Cambia `"stock": "Disponible"` a `"stock": "Agotado"`. El JS puede usar este campo para mostrar un badge visual distinto.

---

## Ruta de imágenes

Las imágenes se guardan en `assets/motos/<linea-lowercase>/`. Ejemplo:

```
assets/motos/pulsar/pulsar-ns400-1.jpg     ← fotoPrincipal
assets/motos/pulsar/pulsar-ns400-2.jpg     ← fotoSecundaria
assets/motos/pulsar/pulsar-ns400-ficha.pdf ← fichaTecnica
```

**Dimensiones recomendadas para fotos:**
- Proporción: 16:9 (ej: 800×450 px)
- Formato: JPG (calidad 85%) o WebP
- Peso máximo: 150 KB por imagen

---

## Migración futura a Google Sheets

En Fase 3, el JSON se podrá generar automáticamente desde una hoja de cálculo:

1. Hoja pública en Google Sheets con columnas equivalentes
2. Apps Script o herramienta externa exporta el JSON
3. El archivo `data/catalogo.json` se actualiza automáticamente
4. El esquema actual no cambia — compatibilidad garantizada

**Importante:** mantener exactamente los mismos nombres de campos para no romper el frontend.
