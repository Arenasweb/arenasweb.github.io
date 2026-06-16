# Catálogo dinámico

## Objetivo

Crear una base de catálogo que pueda actualizarse sin tocar el código principal. El primer paso es usar `data/catalogo.json` para almacenar modelos, precios y disponibilidad.

## Modelo inicial

Cada registro del catálogo incluye:

- `id`
- `visible`
- `destacado`
- `orden`
- `linea`
- `modelo`
- `version`
- `cilindrada`
- `precio`
- `cuotaInicial`
- `financiamiento`
- `stock`
- `colores`
- `descripcion`
- `beneficio`
- `promocion`
- `fotoPrincipal`
- `fotoSecundaria`
- `fichaTecnica`
- `whatsapp`
- `estado`

## Flujo de uso

1. `script.js` carga `data/catalogo.json` con fetch.
2. Se construyen tarjetas visibles según `visible` y `destacado`.
3. El sitio muestra una selección inicial de modelos destacados.

## Evolución hacia Google Sheets

En una fase posterior se puede convertir el JSON en una fuente generada desde Google Sheets:

- Crear hoja pública con columnas equivalentes.
- Usar Apps Script o un generador para exportar JSON.
- Mantener el mismo esquema de datos para no romper el front.

## Beneficios

- Control de inventario sin despliegues adicionales.
- Actualización rápida de precios y promociones.
- Escalabilidad para agregar nuevas líneas y versiones.
