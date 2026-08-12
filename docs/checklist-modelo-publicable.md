# Checklist — ¿está esta moto lista para publicarse?

Una hoja de revisión por modelo. Pensada para recorrer los 22 uno por uno.

**Regla de lectura:** si falta algo de OBLIGATORIO, no se activa. Lo RECOMENDADO
se puede dejar para después, pero se nota. Lo OPCIONAL no bloquea nunca.

Modelo revisado: `______________________`  ·  Fecha: `____________`

---

## OBLIGATORIO — sin esto no se activa

- [ ] **`modelo`** tiene el nombre comercial correcto y bien escrito.
- [ ] **`categoria`** es una de las cinco: `ciudad`, `trabajo`, `deportiva`, `aventura`, `carga`.
- [ ] **`id`** existe y no se ha cambiado desde que se creó la fila.
- [ ] **`slug`** existe, en minúsculas, sin espacios ni acentos.
- [ ] **`imagen_principal`** apunta a un archivo que **existe de verdad** en el proyecto.
- [ ] La fotografía **muestra este modelo** y no otro.
- [ ] **`alt_text`** describe lo que se ve en la foto.
- [ ] **`descripcion_corta`** escrita, breve, sin texto provisional.
- [ ] **`estado_contenido`** = `APROBADO`.
- [ ] La **categoría del modelo está activa** en la hoja `CATEGORIAS`.

> Estos ocho puntos no son una recomendación: la API pública **no publica** un
> modelo que no los cumpla, aunque esté aprobado y activo.

## RECOMENDADO — se puede publicar sin esto, pero se nota

- [ ] **`imagen_mobile`** cargada (si no, en celular se recorta la principal).
- [ ] **`descripcion_larga`** escrita y revisada.
- [ ] Al menos una **`caracteristica_`** rellenada.
- [ ] **`linea`** indicada (alimenta el filtro de líneas).
- [ ] **`orden`** asignado para que aparezca donde corresponde.

## OPCIONAL — no bloquea la publicación

- [ ] `foco_imagen` ajustado si el encuadre por defecto corta mal la moto.
- [ ] `galeria_1` / `galeria_2` con fotos adicionales.
- [ ] `colores` con los nombres disponibles.
- [ ] `precio_publico` + `mostrar_precio` **solo con autorización expresa**.
- [ ] `destacado` / `nuevo` marcados si corresponde.
- [ ] `cta_label` personalizado.

## REVISIÓN VISUAL — con `?preview=1` en tu computadora

- [ ] La foto se ve **completa**: no corta ruedas, manillar, espejos ni cola.
- [ ] Se ve bien en **pantalla de celular** (ventana estrecha).
- [ ] El nombre **no se corta** ni desborda la tarjeta.
- [ ] La descripción corta **no queda a medias** de forma extraña.
- [ ] La **ficha** del modelo se abre al pulsar la tarjeta.
- [ ] En la ficha, la foto grande **se ve nítida**.
- [ ] Si hay galería, las miniaturas **funcionan**.
- [ ] **No aparece** ningún `undefined`, `null`, `S/ 0` ni hueco vacío.

## COMPROBACIÓN AUTOMÁTICA

```bash
node scripts/qa-catalogo.mjs --detalle
```

- [ ] El script termina **sin errores estructurales**.
- [ ] Este modelo **no aparece** en la lista de errores.

## PUBLICACIÓN — el último paso

- [ ] Todo lo OBLIGATORIO está marcado.
- [ ] La revisión visual está hecha.
- [ ] El precio, si lo hay, está **autorizado por gerencia**.
- [ ] `ultima_revision` actualizada con la fecha de hoy.
- [ ] **`activo` = `TRUE`.**
- [ ] Comprobado en el catálogo **sin** `?preview=1` que la moto aparece.

---

## Señales de alto

Si te encuentras con alguna de estas, **detente y consulta** antes de activar:

- No hay fotografía y hay prisa por publicar igualmente.
- La única foto disponible es de otro modelo o de otro color.
- Hay un precio pero nadie confirma si está autorizado.
- Alguien pide añadir stock, unidades disponibles o «últimas unidades».
- Hay que escribir una especificación técnica que nadie puede confirmar.
- El texto viene de una fuente que no sabemos si podemos usar.

---

## Referencias

- `docs/guia-carga-contenido-catalogo.md` — cómo llenar cada campo, paso a paso
- `docs/catalogo-modelos-web.md` — detalle técnico de las 28 columnas
