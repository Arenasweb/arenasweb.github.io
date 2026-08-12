# Piloto — paquete de revisión para Google Sheets

Tabla de trabajo de los tres modelos del piloto, para que el propietario revise
**antes** de escribir nada en la hoja.

> **Google Sheets NO se ha modificado.** Este documento es solo una propuesta de
> revisión. La escritura real se hará en la subfase 2.3, con autorización.

Hoja destino: `MODELOS_WEB` · Archivo: *CATÁLOGO WEB ARENAS — PRODUCCIÓN*

> El **identificador** del libro se ha retirado de este documento. No es una
> contraseña —abrir el libro sigue exigiendo permiso— pero es el identificador
> interno de un documento privado y este repositorio es público. La regla del
> proyecto es que vive **solo** en la Script Property
> `ARENAS_CATALOGO_SPREADSHEET_ID`, y en ningún archivo.
> Ver [decision-versionado-apps-script-v2.md](decision-versionado-apps-script-v2.md).
>
> Nunca llegó a un commit: el archivo todavía no está rastreado, así que no hay
> nada que limpiar de la historia.

## Cómo leer la tabla

| Columna | Qué es |
|---|---|
| **VALOR ACTUAL** | Lo que hay hoy en el sistema |
| **VALOR PROPUESTO** | Lo que debería quedar. `PENDIENTE` = hace falta un dato que todavía no existe |
| **ESTADO** | OK / PENDIENTE / AUTORIZAR |
| **ACCIÓN** | Qué hacer, y quién |

`PENDIENTE` **nunca se escribe literalmente en la hoja**: significa «esta celda se
queda vacía hasta que alguien aporte el dato real».

---

## 1. PULSAR 180 NEON — fila `MW-10`

| # | Columna | VALOR ACTUAL | VALOR PROPUESTO | ESTADO | ACCIÓN |
|---|---|---|---|---|---|
| 1 | `id` | `MW-10` | `MW-10` | OK | No tocar nunca |
| 2 | `slug` | `pulsar-180-neon` | *(igual)* | OK | No tocar |
| 3 | `modelo` | `Pulsar 180 Neon` | *(igual)* | OK | Confirmar ortografía comercial |
| 4 | `linea` | `Pulsar` | *(igual)* | OK | Confirmar que es la línea oficial |
| 5 | `categoria` | `deportiva` | *(igual)* | OK | Confirmar clasificación |
| 6 | `subcategoria` | *(vacío)* | *(vacío)* | OK | Dejar vacío salvo necesidad |
| 7 | `titulo_web` | *(vacío)* | *(vacío)* | OK | Solo si el título debe diferir del nombre |
| 8 | `descripcion_corta` | *(vacío)* | **PENDIENTE** | PENDIENTE | Redactar 1–2 líneas · **propietario** |
| 9 | `descripcion_larga` | *(vacío)* | **PENDIENTE** | PENDIENTE | Redactar 3 párrafos · **propietario** |
| 10 | `precio_publico` | `null` | *(vacío)* | AUTORIZAR | **No rellenar** sin decisión de gerencia |
| 11 | `mostrar_precio` | `FALSE` | `FALSE` | OK | Mantener |
| 12 | `imagen_principal` | *(vacío)* | `assets/catalogo/pulsar-180-neon/portada.webp` | **PENDIENTE — P0** | Subir foto y luego escribir la ruta |
| 13 | `imagen_mobile` | *(vacío)* | `assets/catalogo/pulsar-180-neon/portada-mobile.webp` | PENDIENTE | Igual |
| 14 | `galeria_1` | *(vacío)* | *(vacío)* | OK | Opcional |
| 15 | `galeria_2` | *(vacío)* | *(vacío)* | OK | Opcional |
| 16 | `colores` | *(vacío)* | **PENDIENTE** | PENDIENTE | Nombres de colores reales · **propietario** |
| 17 | `caracteristica_1` | *(vacío)* | **PENDIENTE** | PENDIENTE | Beneficio verificado |
| 18 | `caracteristica_2` | *(vacío)* | **PENDIENTE** | PENDIENTE | Beneficio verificado |
| 19 | `caracteristica_3` | *(vacío)* | **PENDIENTE** | PENDIENTE | Beneficio verificado |
| 20 | `destacado` | `TRUE` | `TRUE` | OK | Mantener |
| 21 | `nuevo` | `FALSE` | `FALSE` | OK | Cambiar solo si aplica |
| 22 | `cta_label` | *(vacío)* | *(vacío)* | OK | Usa el texto por defecto |
| 23 | `orden` | `100` | `100` | OK | Mantener |
| 24 | `activo` | `FALSE` | **`FALSE` por ahora** | OK | `TRUE` solo tras revisión visual |
| 25 | `estado_contenido` | `BORRADOR` | **`BORRADOR` por ahora** | OK | `APROBADO` tras revisar contenido |
| 26 | `ultima_revision` | *(vacío)* | fecha de la revisión | PENDIENTE | Rellenar al revisar |
| 27 | `alt_text` | *(vacío)* | **PENDIENTE** | PENDIENTE | Describir la foto (tras tenerla) |
| 28 | `foco_imagen` | `center center` | `center center` | OK | Ajustar solo si el encuadre corta |

---

## 2. BOXER BM150X DISC — fila `MW-05`

Idéntico a la tabla anterior salvo lo siguiente:

| # | Columna | VALOR ACTUAL | VALOR PROPUESTO | ESTADO |
|---|---|---|---|---|
| 1 | `id` | `MW-05` | `MW-05` | OK |
| 2 | `slug` | `boxer-bm150x-disc` | *(igual)* | OK |
| 3 | `modelo` | `Boxer BM150X Disc` | *(igual)* | OK — confirmar si «Disc» va así comercialmente |
| 4 | `linea` | `Boxer` | *(igual)* | OK |
| 5 | `categoria` | `trabajo` | *(igual)* | OK |
| 12 | `imagen_principal` | *(vacío)* | `assets/catalogo/boxer-bm150x-disc/portada.webp` | **PENDIENTE — P0** |
| 13 | `imagen_mobile` | *(vacío)* | `assets/catalogo/boxer-bm150x-disc/portada-mobile.webp` | PENDIENTE |
| 20 | `destacado` | `FALSE` | `FALSE` | OK |
| 23 | `orden` | `50` | `50` | OK |

Columnas 8, 9, 16, 17, 18, 19, 26 y 27: **PENDIENTE**, igual que arriba.
Columnas 10 y 11 (precio): **no tocar**.

---

## 3. TORITO FIBRASER CLÁSICO — fila `MW-19`

| # | Columna | VALOR ACTUAL | VALOR PROPUESTO | ESTADO |
|---|---|---|---|---|
| 1 | `id` | `MW-19` | `MW-19` | OK |
| 2 | `slug` | `torito-fibraser-clasico` | *(igual)* | OK |
| 3 | `modelo` | `Torito Fibraser Clásico` | *(igual)* | OK — confirmar nombre comercial exacto |
| 4 | `linea` | `Torito` | *(igual)* | OK |
| 5 | `categoria` | `carga` | *(igual)* | OK |
| 12 | `imagen_principal` | *(vacío)* | `assets/catalogo/torito-fibraser-clasico/portada.webp` | **PENDIENTE — P0** |
| 13 | `imagen_mobile` | *(vacío)* | `assets/catalogo/torito-fibraser-clasico/portada-mobile.webp` | PENDIENTE |
| 20 | `destacado` | `FALSE` | `FALSE` | OK |
| 23 | `orden` | `190` | `190` | OK |
| 28 | `foco_imagen` | `center center` | **revisar tras la foto** | PENDIENTE |

Columnas 8, 9, 16, 17, 18, 19, 26 y 27: **PENDIENTE**.
Columnas 10 y 11 (precio): **no tocar**.

> Vehículo de tres ruedas: es el más ancho y el que más probablemente necesite
> ajustar `foco_imagen` para no quedar recortado en la caja 16:10.

---

## Resumen de la carga

| Campo | Pulsar 180 | Boxer BM150X | Torito Clásico |
|---|---|---|---|
| `imagen_principal` | **P0** | **P0** | **P0** |
| `imagen_mobile` | P1 | P1 | P1 |
| `alt_text` | P1 | P1 | P1 |
| `descripcion_corta` | P1 | P1 | P1 |
| `descripcion_larga` | P2 | P2 | P2 |
| `caracteristica_1/2/3` | P2 | P2 | P2 |
| `foco_imagen` | P2 | P2 | **P2 (probable)** |
| `colores` | P3 | P3 | P3 |
| `precio_publico` | P3 + autorización | P3 + autorización | P3 + autorización |

**Nada se activa** (`activo`) ni se aprueba (`estado_contenido`) en esta carga. Eso
es la subfase 2.3, después de la revisión visual con las fotos ya puestas.

## Orden de trabajo sugerido para 2.3

1. Subir las tres `portada.webp` a sus carpetas.
2. Escribir las tres rutas `imagen_principal` en la hoja.
3. Mirar `catalogo.html?preview=1` — **aquí es donde se verá si el catálogo cobra vida**.
4. Ajustar `foco_imagen` si alguna moto queda recortada.
5. Añadir `alt_text` y `descripcion_corta`.
6. Volver a mirar, ahora también las tres fichas.
7. Solo entonces: `APROBADO` y `activo = TRUE`.

Tras cada paso conviene ejecutar:

```bash
node scripts/qa-catalogo.mjs --slug pulsar-180-neon,boxer-bm150x-disc,torito-fibraser-clasico --detalle
```

---

## Referencias

- `docs/piloto-3-modelos.md` — expediente completo campo por campo
- `docs/especificacion-imagenes-catalogo.md` — cómo debe ser cada fotografía
- `docs/guia-carga-contenido-catalogo.md` — cómo rellenar la hoja paso a paso
