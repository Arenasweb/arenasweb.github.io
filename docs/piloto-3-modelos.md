# Piloto de 3 modelos — expediente de contenido

Estado exacto de los tres modelos elegidos para el piloto, campo por campo,
**leído del sistema el 9 de agosto de 2026**. Ningún valor de este documento es
una suposición: todo se extrajo de `data/catalogo-publico.local.json` y del
inventario real de `assets/`.

**Nada se ha inventado.** Donde no hay dato, dice `VACÍO` o `PENDIENTE`.

## Modelos del piloto

| # | Modelo | id | slug | Por qué está en el piloto |
|---|---|---|---|---|
| 1 | Pulsar 180 Neon | `MW-10` | `pulsar-180-neon` | Único con `destacado=TRUE`: prueba el filo superior, la tira de portada y el selector de colores |
| 2 | Boxer BM150X Disc | `MW-05` | `boxer-bm150x-disc` | Única moto de la categoría `trabajo`: valida ese chip y aporta una silueta muy distinta |
| 3 | Torito Fibraser Clásico | `MW-19` | `torito-fibraser-clasico` | Categoría `carga`, tres ruedas: el caso más exigente de encuadre en 16:10 |

## Leyenda de estados

| Estado | Significado |
|---|---|
| **REAL** | Dato verificado, en el sistema y utilizable |
| **VACÍO** | Celda vacía a propósito. La web omite el campo; no rompe nada |
| **PENDIENTE** | Hace falta y todavía no existe. Alguien debe aportarlo |
| **DEMO** | Existe pero es material de prueba. **No publicable** |
| **NO APLICA** | No corresponde a este modelo |

---

## 1. PULSAR 180 NEON — `MW-10`

### Identidad

| Columna | Valor actual | Estado |
|---|---|---|
| `id` | `MW-10` | **REAL** |
| `slug` | `pulsar-180-neon` | **REAL** |
| `modelo` | `Pulsar 180 Neon` | **REAL** |
| `linea` | `Pulsar` | **REAL** — derivada del nombre comercial, no aportada por gerencia |
| `categoria` | `deportiva` | **REAL** |
| `subcategoria` | *(vacío)* | VACÍO |

### Copy

| Columna | Valor actual | Estado |
|---|---|---|
| `titulo_web` | *(vacío)* | VACÍO — se usa `modelo`. Correcto si no hace falta otro título |
| `descripcion_corta` | *(vacío)* | **PENDIENTE** |
| `descripcion_larga` | *(vacío)* | **PENDIENTE** |

### Imágenes

| Columna | Valor actual | Estado |
|---|---|---|
| `imagen_principal` | *(vacío)* | **PENDIENTE — P0** |
| `imagen_mobile` | *(vacío)* | **PENDIENTE** |
| `galeria_1` | *(vacío)* | VACÍO (opcional) |
| `galeria_2` | *(vacío)* | VACÍO (opcional) |
| `alt_text` | *(vacío)* | **PENDIENTE** — obligatorio en cuanto haya foto |
| `foco_imagen` | `center center` | **REAL** (valor por defecto; ajustar solo si el encuadre corta la moto) |

### Comercial

| Columna | Valor actual | Estado |
|---|---|---|
| `precio_publico` | `null` | **PENDIENTE DE AUTORIZACIÓN** — no se rellena sin decisión de gerencia |
| `mostrar_precio` | `false` | **REAL** — correcto, se mantiene |
| `destacado` | `true` | **REAL** |
| `nuevo` | `false` | **REAL** |
| `cta_label` | *(vacío)* | VACÍO — se usa el texto por defecto |

### Características

| Columna | Valor actual | Estado |
|---|---|---|
| `caracteristica_1` | *(vacío)* | **PENDIENTE** |
| `caracteristica_2` | *(vacío)* | **PENDIENTE** |
| `caracteristica_3` | *(vacío)* | **PENDIENTE** |

### Publicación

| Columna | Valor actual | Estado |
|---|---|---|
| `orden` | `100` | **REAL** |
| `activo` | `false` | **REAL** — se mantiene hasta aprobar contenido |
| `estado_contenido` | `BORRADOR` | **REAL** — se mantiene |
| `ultima_revision` | *(vacío)* | VACÍO |

### Colores

| | |
|---|---|
| `colores` (texto, MODELOS_WEB) | *(vacío)* → **PENDIENTE** |
| Variantes visuales | **5 variantes DEMO** en `data/catalogo-colores-demo.local.json` |
| ¿Son reales? | **NO.** Se llaman `DEMO Negro`, `DEMO Azul`, `DEMO Rojo`, `DEMO Hex inválido`, `DEMO Plata` y sus fotos son portadas editoriales reutilizadas |
| ¿Se publican? | **No pueden.** Doble barrera: solo se cargan en host local con `?preview=1`, y el contrato descarta todo registro con `_origen: "demo-local"` fuera de previsualización |
| Qué falta | Lista de colores comerciales reales + una fotografía por color |

---

## 2. BOXER BM150X DISC — `MW-05`

### Identidad

| Columna | Valor actual | Estado |
|---|---|---|
| `id` | `MW-05` | **REAL** |
| `slug` | `boxer-bm150x-disc` | **REAL** |
| `modelo` | `Boxer BM150X Disc` | **REAL** |
| `linea` | `Boxer` | **REAL** — derivada del nombre |
| `categoria` | `trabajo` | **REAL** |
| `subcategoria` | *(vacío)* | VACÍO |

### Copy · Imágenes · Comercial · Características

Idénticos a Pulsar 180 Neon: `titulo_web`, `descripcion_corta`, `descripcion_larga`,
las cuatro rutas de imagen, `alt_text`, `cta_label` y las tres características están
**todos vacíos**. `precio_publico` `null`, `mostrar_precio` `false`.

| Diferencia | Valor |
|---|---|
| `destacado` | `false` |
| `orden` | `50` |
| `foco_imagen` | `center center` |

### Publicación

`activo` `false` · `estado_contenido` `BORRADOR` · `ultima_revision` vacío.

### Colores

**Sin variantes, ni reales ni DEMO.** El selector no se dibuja — comportamiento
correcto. `colores` vacío → PENDIENTE.

---

## 3. TORITO FIBRASER CLÁSICO — `MW-19`

### Identidad

| Columna | Valor actual | Estado |
|---|---|---|
| `id` | `MW-19` | **REAL** |
| `slug` | `torito-fibraser-clasico` | **REAL** |
| `modelo` | `Torito Fibraser Clásico` | **REAL** |
| `linea` | `Torito` | **REAL** — derivada del nombre |
| `categoria` | `carga` | **REAL** |
| `subcategoria` | *(vacío)* | VACÍO |

### Copy · Imágenes · Comercial · Características

Todos vacíos, igual que los anteriores. `precio_publico` `null`, `mostrar_precio` `false`.

| Diferencia | Valor |
|---|---|
| `destacado` | `false` |
| `orden` | `190` |
| `foco_imagen` | `center center` |

### Publicación

`activo` `false` · `estado_contenido` `BORRADOR` · `ultima_revision` vacío.

### Colores

Sin variantes. `colores` vacío → PENDIENTE.

> **Nota de encuadre.** Es un vehículo de tres ruedas, más ancho y alto que una
> motocicleta. Es el que tiene más riesgo de recorte en la caja 16:10 y
> probablemente necesite ajustar `foco_imagen`.

---

## Inventario de imágenes del proyecto

Se recorrió `assets/` completo. **18 archivos de imagen, ninguno de producto.**

| Archivo | Dimensiones | Formato | Peso | Transparencia | Función | Verificación |
|---|---|---|---|---|---|---|
| `assets/hero/hero-arenas-poster-v2.jpg` | 1280×720 | JPG | 140 KB | No | Póster del vídeo de portada | En uso — **NO UTILIZAR** para catálogo |
| `assets/hero/hero-arenas-poster.jpg` | 1280×720 | JPG | 136 KB | No | Póster anterior | Sin uso — **NO UTILIZAR** |
| `assets/portadas/camino-ciudad-desktop.{webp,jpg}` | 1672×941 | WebP/JPG | 140 / 258 KB | No | Portada editorial «Encuentra tu camino» | En uso — **NO UTILIZAR** para catálogo |
| `assets/portadas/camino-ciudad-mobile.{webp,jpg}` | 941×1672 | WebP/JPG | 121 / 236 KB | No | Portada editorial vertical | En uso — **NO UTILIZAR** |
| `assets/portadas/camino-trabajo-*` | ídem | WebP/JPG | 144–272 KB | No | Portada editorial | En uso — **NO UTILIZAR** |
| `assets/portadas/camino-deportiva-*` | ídem | WebP/JPG | 151–293 KB | No | Portada editorial | En uso — **NO UTILIZAR** |
| `assets/portadas/camino-aventura-*` | ídem | WebP/JPG | 195–331 KB | No | Portada editorial | En uso — **NO UTILIZAR** |

**Por qué no sirven como fotografía de producto:**

1. Son **imágenes editoriales de categoría**, no retratos de un modelo concreto.
2. Su proporción es **16:9** (desktop) y **9:16** (mobile); el catálogo trabaja en **16:10**.
3. Ya se usan en la portada: reutilizarlas confundiría dos secciones distintas.
4. Ninguna corresponde de forma verificable a ninguno de los tres pilotos.

### Estado de las carpetas de destino

| Carpeta | Contenido |
|---|---|
| `assets/catalogo/pulsar-180-neon/` | solo `.gitkeep` |
| `assets/catalogo/boxer-bm150x-disc/` | solo `.gitkeep` |
| `assets/catalogo/torito-fibraser-clasico/` | solo `.gitkeep` |

> ### FOTOGRAFÍA REAL PENDIENTE para los tres modelos del piloto.
> Es el único bloqueo P0. Todo lo demás está preparado y esperando.

---

## Plantillas editoriales

No son textos para publicar: son **la forma** que debería tener el texto cuando
alguien con la información lo escriba.

### Descripción corta (2 líneas máximo)

```
[para quién o para qué es]  +  [uso principal]  +  [un diferenciador verificado]
```

Reglas: sin cifras técnicas no confirmadas · sin superlativos («la mejor», «la más
potente») · sin precio · sin disponibilidad · debe seguir siendo cierta dentro de
seis meses.

### Descripción larga (3 párrafos)

```
Párrafo 1 — Qué tipo de motocicleta es. Su carácter, su segmento.
Párrafo 2 — Para qué uso está pensada. Qué recorrido, qué necesidad.
Párrafo 3 — Diferenciadores VERIFICADOS. Solo lo que consta oficialmente.
```

Reglas: texto plano, sin HTML · una línea en blanco entre párrafos · si un párrafo
no se puede escribir con información real, se deja fuera.

### Características (hasta 3)

Cada una, una frase corta. Vale:

- un **beneficio verificado** de uso real,
- una **característica oficial** que conste en documentación de la marca,
- un **uso real** al que la moto está orientada.

No vale: potencia, par, cilindrada, consumo, velocidad máxima ni autonomía **si el
dato no está confirmado por escrito**. La web no valida veracidad: publica lo que
se escriba.

---

## Matriz de prioridad

| Prioridad | Qué significa | Campos |
|---|---|---|
| **P0** | Bloquea el piloto visual | `imagen_principal` (los 3 modelos) |
| **P1** | Necesario antes de publicar | `alt_text`, `descripcion_corta`, `imagen_mobile` |
| **P2** | Mejora clara | `descripcion_larga`, `caracteristica_1/2/3`, `foco_imagen` |
| **P3** | Opcional | `galeria_1/2`, `colores`, `precio_publico`, `titulo_web`, `cta_label`, `subcategoria` |

**Precio y colores son P3.** Un modelo se publica perfectamente sin ninguno de los dos.

---

## Referencias

- `docs/especificacion-imagenes-catalogo.md` — qué fotografía hace falta exactamente
- `docs/piloto-google-sheets.md` — tabla lista para revisar antes de tocar la hoja
- `docs/catalogo-modelos-web.md` — contrato de las 28 columnas
- `docs/checklist-modelo-publicable.md` — revisión antes de activar
