# Requisitos Pendientes de Gerencia — ARENAS MOTOCICLETAS

**Propósito:** Checklist de todo lo que solo el dueño/gerencia de ARENAS MOTOCICLETAS puede confirmar. Ningún agente de IA ni desarrollador debe inventar estos datos.  
Última actualización: julio 2026 (corrección post-auditoría Codex)

> **Dónde se cargan estos datos — arquitectura vigente:**
> - **Google Sheets** será la **fuente comercial editable**. Todo dato comercial real — **precios, stock, colores, disponibilidad, fichas técnicas, campañas/promociones, sedes, WhatsApp y financiamiento** — se administra ahí, **no en el repositorio**.
> - **Apps Script** será el **filtro seguro** que publique únicamente lo aprobado.
> - **`data/catalogo.json` es solo un fallback neutro** (estructura de ejemplo, `visible:false`), **NO** inventario real.
> - **`data/slots/*.json` son fallback/placeholders neutros**, no fuentes de datos comerciales reales.
> - **El repositorio público NO es una base de datos comercial.**
>
> En consecuencia, "confirmar/validar" un dato de este checklist significa **cargarlo en Google Sheets**, nunca editar el JSON público del repo.

---

## 1. Revisión de dueños

- [ ] Aprobar el concepto de marca y tono comercial actual ("La A que acelera")
- [ ] Confirmar si el posicionamiento "premium, oscuro, tecnológico" sigue vigente
- [ ] Validar la lista de líneas de motos que se comercializan realmente hoy (lista administrada desde Google Sheets — ¿alguna se descontinuó o se agregó?)
- [ ] Aprobar el modelo que aparece como "destacado" en el sitio

---

## 2. Catálogo y stock real

> Los datos comerciales del catálogo (modelos, precios, stock, disponibilidad, colores, fichas) se administran en **Google Sheets** y se publican mediante **Apps Script filtrado**. **NO se cargan en `data/catalogo.json`**, que es solo un fallback neutro (estructura de ejemplo). Estos requisitos se completan en la hoja, no editando el JSON público.

- [ ] Cargar en Google Sheets la lista completa de modelos activos
- [ ] Cargar precios reales de cada modelo en Google Sheets
- [ ] Cargar disponibilidad de stock real por modelo en Google Sheets
- [ ] Cargar colores disponibles por modelo en Google Sheets
- [ ] Indicar en Google Sheets si hay modelos por descontinuar o por llegar
- [ ] Aportar fichas técnicas reales en PDF (se enlazarán desde Google Sheets, no desde el repo)

---

## 3. WhatsApp reales

Los números reales se administran desde **Google Sheets**. `data/slots/whatsapp.json` es solo un fallback neutro con **todos los campos en "pendiente"** — no se rellena con números reales en el repo.

- [ ] WhatsApp general
- [ ] WhatsApp de ventas
- [ ] WhatsApp de financiamiento
- [ ] WhatsApp de servicio técnico
- [ ] WhatsApp de repuestos
- [ ] WhatsApp por sede adicional (nombres y existencia administrados desde Google Sheets)
- [ ] Confirmar si se usa un único número para todo o números separados por área

---

## 4. Sedes exactas

Los datos reales de sedes se administran desde **Google Sheets**. `data/slots/sedes.json` es solo un fallback neutro (todas las sedes ocultas, `visible:false`) — no se cargan direcciones ni datos reales en el repo.

- [ ] Confirmar cuántas sedes existen realmente (nombres y existencia administrados desde Google Sheets; las entradas del fallback están marcadas como "pendiente-confirmar-existencia")
- [ ] Dirección exacta de cada sede confirmada
- [ ] Horario real de cada sede (pueden diferir entre sedes)
- [ ] Teléfono fijo de cada sede (si aplica)
- [ ] Coordenadas o enlace de Google Maps de cada sede
- [ ] Foto real de cada local

---

## 5. Requisitos de financiamiento

Las condiciones y entidades reales se administran desde **Google Sheets**. `data/slots/financiamiento.json` es solo un fallback neutro — no se cargan entidades ni condiciones reales en el repo.

- [ ] Lista real de requisitos para acceder a crédito
- [ ] Documentos exactos que debe presentar el cliente
- [ ] Entidades financieras aliadas reales (bancos, financieras)
- [ ] Cuota inicial mínima real por tipo de moto
- [ ] Tasa de interés referencial (si se decide publicarla)
- [ ] Confirmar que la evaluación final sigue siendo presencial en tienda

---

## 6. Especificaciones técnicas

- [ ] Validar cilindrada, potencia y datos técnicos de cada modelo en el catálogo
- [ ] Confirmar beneficios reales incluidos en la compra (se administran desde Google Sheets; `data/slots/beneficios.json` es fallback neutro con todos los campos en "pendiente")
- [ ] Validar tiempo y alcance real de la garantía de fábrica
- [ ] Confirmar si se entrega casco, kit de herramientas o tarjeta de propiedad incluida

---

## 7. Fotos oficiales

- [ ] Fotos de cada modelo de moto (`assets/motos/<linea>/`)
- [ ] Foto o video para el hero (`data/slots/hero.json → imagenHero / videoHero`)
- [ ] Logo oficial en SVG (`assets/logo/`)
- [ ] Favicon oficial (`assets/favicon/` — pendiente desde fase anterior)
- [ ] Imagen Open Graph para redes sociales (1200×630 px)
- [ ] Fotos de las sedes/tiendas (`assets/tiendas/`)
- [ ] Foto del taller técnico (`assets/taller/`)
- [ ] Fotos de clientes para testimonios, **con consentimiento firmado o verbal documentado** (`assets/clientes/`)

---

## 8. Legales

- [ ] Razón social oficial completa
- [ ] RUC de la empresa
- [ ] Representante legal
- [ ] Domicilio legal (puede diferir de la dirección comercial de venta)
- [ ] Revisión de los 6 documentos legales por un abogado:
  - Política de privacidad
  - Términos y condiciones
  - Tratamiento de datos personales
  - Cookies
  - Libro de reclamaciones
  - Condiciones de financiamiento
- [ ] Decisión sobre inscripción en el RNPDP (Registro Nacional de Protección de Datos Personales)
- [ ] Decisión sobre implementar formulario digital de reclamaciones o mantener solo WhatsApp/correo

---

## 9. Precios

- [ ] Confirmar precio final de cada modelo (sujeto a cambios de mercado)
- [ ] Confirmar cuota inicial por modelo
- [ ] Validar si los precios incluyen IGV o se muestran aparte
- [ ] Definir política de actualización de precios (¿cada cuánto se revisan?)

---

## 10. Promociones

Las campañas y promociones reales se administran desde **Google Sheets**. `data/slots/promociones.json` es solo un fallback neutro (todo `visible:false`) — no se cargan promociones reales en el repo.

- [ ] Aprobar cada promoción antes de marcarla `visible: true`
- [ ] Confirmar vigencia exacta (fecha de inicio y fin)
- [ ] Validar que el modelo de la promoción existe en stock
- [ ] Aprobar el texto comercial de cada promoción

---

## 11. Responsables de actualización

**PENDIENTE de definir con gerencia:**

- [ ] ¿Quién es responsable de mantener actualizado el catálogo (precios y stock) **en Google Sheets**? (`data/catalogo.json` es solo fallback neutro y no se edita como fuente comercial)
- [ ] ¿Quién aprueba testimonios antes de publicarlos?
- [ ] ¿Quién valida promociones antes de activarlas?
- [ ] ¿Con qué frecuencia se revisa la información de sedes y horarios en Google Sheets?
- [ ] ¿Quién tiene acceso de edición a la hoja de Google Sheets (gerencia, marketing, desarrollador)?
- [ ] ¿Se requiere capacitación básica para que alguien no técnico edite los datos comerciales en Google Sheets?

---

## Cómo usar este checklist

Cada vez que gerencia confirme un dato:

1. Cargar el dato en la **hoja de Google Sheets** correspondiente (fuente comercial editable). **No editar `data/catalogo.json` ni `data/slots/*.json` como fuente comercial** — son fallback/placeholders neutros del repositorio público.
2. En la hoja, marcar el registro como aprobado para que **Apps Script** lo publique (el filtro solo expone lo aprobado).
3. Marcar el ítem correspondiente en este checklist
4. Si el dato es legal o financiero, notificar también al asesor legal antes de publicar

> Mientras Google Sheets no esté conectado, el sitio opera solo con el fallback neutro local (sin datos comerciales reales). Los datos reales no se hardcodean en el repo en ningún caso.

Ver también: `docs/sistema-slots-editables.md` y `docs/fuente-unica-datos.md` para entender la arquitectura de datos.
