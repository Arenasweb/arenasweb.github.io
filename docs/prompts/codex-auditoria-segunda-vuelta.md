# Prompt para Codex — Auditoría Técnica de Segunda Vuelta

```
Actúa como auditor técnico de seguridad y calidad frontend.

Repositorio: arenasweb.github.io (sitio estático HTML + CSS + JS puro,
sin frameworks, desplegado en GitHub Pages).

MODO: solo lectura.
- No modifiques ningún archivo.
- No crees ni borres archivos.
- No hagas commit.
- No hagas push.
- Entrega únicamente un informe de hallazgos.

Contexto: ya hubo una primera auditoría y una ronda de correcciones
(ver docs/correcciones-auditoria-codex.md y docs/fuente-unica-datos.md
si existen). Esta es una auditoría de SEGUNDA VUELTA: verifica si las
correcciones previas siguen vigentes y busca problemas nuevos o no
detectados antes.

Revisa estas áreas:

1. Seguridad frontend
   - innerHTML u otra inserción de HTML con datos provenientes de JSON
     editable (data/*.json, data/slots/*.json)
   - enlaces externos sin rel="noopener noreferrer"
   - datos sensibles o credenciales expuestas en el código
   - inyección vía atributos generados dinámicamente

2. Mantenibilidad
   - duplicación de datos entre archivos (HTML estático vs JSON)
   - código muerto o funciones no usadas
   - inconsistencias entre módulos de script.js
   - falta de comentarios en lógica no obvia

3. SEO
   - meta etiquetas (description, Open Graph, Twitter Card, canonical)
   - coherencia entre robots.txt, sitemap.xml y meta robots de cada página
   - jerarquía de headings (H1 único, sin saltos H2→H4, etc.)

4. Performance
   - imágenes sin loading="lazy" o sin dimensiones definidas
   - animaciones que fuercen layout en vez de usar transform/opacity
   - listeners o observers que no se limpian
   - peso/cantidad de fetch() en el arranque de la app

5. Accesibilidad
   - aria-label, aria-invalid, aria-describedby correctos y consistentes
   - foco visible y navegación por teclado
   - contraste de color suficiente
   - soporte de prefers-reduced-motion

6. Compatibilidad con GitHub Pages
   - rutas relativas que puedan romperse según la profundidad del archivo
   - dependencias de build step o de un servidor backend
   - uso de APIs no disponibles en hosting estático

7. Preparación para integración con Google Sheets
   - evalúa si la estructura actual de data/catalogo.json y data/slots/
     facilitaría sustituir el fetch() local por una fuente JSON remota
     (Google Sheets vía Apps Script u otro exportador)
   - señala qué campos o convenciones romperían esa migración

FORMATO DE SALIDA:
Agrupa los hallazgos por las 7 áreas anteriores. Para cada hallazgo,
indica:
- Archivo y línea (si aplica)
- Severidad: Crítico / Importante / Menor
- Descripción breve del problema
- Recomendación de corrección (sin aplicarla)

No incluyas hallazgos de diseño visual, tipografías ni paleta de
colores — el diseño final aún no está definido y está fuera de
alcance de esta auditoría.
```
