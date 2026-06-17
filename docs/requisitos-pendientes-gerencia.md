# Requisitos Pendientes de Gerencia — ARENAS MOTOCICLETAS

**Propósito:** Checklist de todo lo que solo el dueño/gerencia de ARENAS MOTOCICLETAS puede confirmar. Ningún agente de IA ni desarrollador debe inventar estos datos.  
Última actualización: junio 2026

---

## 1. Revisión de dueños

- [ ] Aprobar el concepto de marca y tono comercial actual ("La A que acelera")
- [ ] Confirmar si el posicionamiento "premium, oscuro, tecnológico" sigue vigente
- [ ] Validar la lista de líneas de motos que se comercializan realmente hoy (Pulsar, Dominar, Boxer, CT — ¿alguna se descontinuó o se agregó?)
- [ ] Aprobar el modelo que aparece como "destacado" en el sitio

---

## 2. Catálogo y stock real

- [ ] Confirmar lista completa de modelos activos en `data/catalogo.json`
- [ ] Validar precios reales de cada modelo (actualmente provisionales)
- [ ] Confirmar disponibilidad de stock real por modelo
- [ ] Validar colores disponibles por modelo
- [ ] Confirmar si hay modelos por descontinuar o por llegar
- [ ] Aportar fichas técnicas reales en PDF (campo `fichaTecnica`)

---

## 3. WhatsApp reales

Archivo: `data/slots/whatsapp.json` — **todos los campos están en "pendiente"**

- [ ] WhatsApp general
- [ ] WhatsApp de ventas
- [ ] WhatsApp de financiamiento
- [ ] WhatsApp de servicio técnico
- [ ] WhatsApp de repuestos
- [ ] WhatsApp sede Huayna Cápac (si existe)
- [ ] WhatsApp sede Vía Expresa (si existe)
- [ ] WhatsApp sede Ocongate (si existe)
- [ ] Confirmar si se usa un único número para todo o números separados por área

---

## 4. Sedes exactas

Archivo: `data/slots/sedes.json`

- [ ] Confirmar cuántas sedes existen realmente (el archivo incluye 4 posibles: Principal, Huayna Cápac, Vía Expresa, Ocongate — **3 de ellas marcadas como "pendiente-confirmar-existencia"**)
- [ ] Dirección exacta de cada sede confirmada
- [ ] Horario real de cada sede (pueden diferir entre sedes)
- [ ] Teléfono fijo de cada sede (si aplica)
- [ ] Coordenadas o enlace de Google Maps de cada sede
- [ ] Foto real de cada local

---

## 5. Requisitos de financiamiento

Archivo: `data/slots/financiamiento.json`

- [ ] Lista real de requisitos para acceder a crédito
- [ ] Documentos exactos que debe presentar el cliente
- [ ] Entidades financieras aliadas reales (bancos, financieras)
- [ ] Cuota inicial mínima real por tipo de moto
- [ ] Tasa de interés referencial (si se decide publicarla)
- [ ] Confirmar que la evaluación final sigue siendo presencial en tienda

---

## 6. Especificaciones técnicas

- [ ] Validar cilindrada, potencia y datos técnicos de cada modelo en el catálogo
- [ ] Confirmar beneficios reales incluidos en la compra (`data/slots/beneficios.json` — todos los campos están en "pendiente")
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

Archivo: `data/slots/promociones.json`

- [ ] Aprobar cada promoción antes de marcarla `visible: true`
- [ ] Confirmar vigencia exacta (fecha de inicio y fin)
- [ ] Validar que el modelo de la promoción existe en stock
- [ ] Aprobar el texto comercial de cada promoción

---

## 11. Responsables de actualización

**PENDIENTE de definir con gerencia:**

- [ ] ¿Quién es responsable de mantener actualizado `data/catalogo.json` (precios y stock)?
- [ ] ¿Quién aprueba testimonios antes de publicarlos?
- [ ] ¿Quién valida promociones antes de activarlas?
- [ ] ¿Con qué frecuencia se revisa la información de sedes y horarios?
- [ ] ¿Quién tiene acceso de edición a estos archivos JSON (gerencia, marketing, desarrollador)?
- [ ] ¿Se requiere capacitación básica para que alguien no técnico edite los JSON de `data/slots/`?

---

## Cómo usar este checklist

Cada vez que gerencia confirme un dato:

1. Editar el archivo JSON correspondiente en `data/slots/` o `data/catalogo.json`
2. Cambiar el campo `estado` / `estadoAprobacion` de "pendiente" a un valor confirmado (ej: `"aprobado"`, `"confirmado"`)
3. Marcar el ítem correspondiente en este checklist
4. Si el dato es legal o financiero, notificar también al asesor legal antes de publicar

Ver también: `docs/sistema-slots-editables.md` para entender la estructura completa de los archivos editables.
