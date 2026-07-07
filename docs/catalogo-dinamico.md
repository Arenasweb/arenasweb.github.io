# Catálogo dinámico

> **Arquitectura vigente:** **Google Sheets será la fuente comercial editable** y **Apps Script será el filtro seguro** que publique solo datos aprobados. **`data/catalogo.json` es solo un fallback neutro** (estructura de ejemplo, `visible:false`), **NO** almacena modelos, precios ni disponibilidad reales. **El repositorio público no es una base de datos comercial** y **el catálogo real no vive en el repo.**

## Objetivo

Definir la estructura técnica del catálogo para que el frontend la consuma sin tocar el código. `data/catalogo.json` documenta ese esquema como fallback neutro; los datos comerciales reales (modelos, precios, disponibilidad) se administran desde Google Sheets y se publican mediante Apps Script filtrado, nunca escribiéndolos en este JSON público.

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

1. `script.js` carga `data/catalogo.json` (fallback neutro) con fetch.
2. Se construyen tarjetas visibles según `visible` y `destacado`.
3. Mientras el fallback solo contenga el registro de ejemplo (`visible:false`), no se muestra ningún modelo real; el catálogo real llegará desde Google Sheets vía Apps Script.

## Evolución hacia Google Sheets

En una fase posterior se puede convertir el JSON en una fuente generada desde Google Sheets:

- Crear hoja pública con columnas equivalentes.
- Usar Apps Script o un generador para exportar JSON.
- Mantener el mismo esquema de datos para no romper el front.

## Beneficios

- Control del catálogo (administrado desde Google Sheets) sin despliegues adicionales.
- Actualización rápida de precios y promociones.
- Escalabilidad para agregar nuevas líneas y versiones.
