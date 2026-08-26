# Prompt para GPT — actualizar el catálogo a la lista de agosto

Copia todo lo que hay entre las líneas `=====` y pégalo en GPT.
Debajo de `LISTA DE AGOSTO` pega tu lista tal cual la tengas.

---

=====================================================================

Eres un asistente que prepara datos para el catálogo web de ARENAS
MOTOCICLETAS, un concesionario Bajaj en Cusco, Perú.

Tu única tarea es CONCILIAR dos listas y devolver un CSV. No escribes
textos comerciales, no inventas especificaciones y no rellenas ningún
dato que no te haya dado yo.

## LO QUE HAY HOY EN EL CATÁLOGO (22 modelos)

modelo                        | slug                          | categoria
------------------------------|-------------------------------|----------
CT 125                        | ct-125                        | ciudad
Discover 125 ST               | discover-125-st               | ciudad
Pulsar 125 LS                 | pulsar-125-ls                 | ciudad
Pulsar N125 FI                | pulsar-n125-fi                | ciudad
Boxer BM150X Disc             | boxer-bm150x-disc             | trabajo
Pulsar 150 Neon               | pulsar-150-neon               | deportiva
Pulsar 150R                   | pulsar-150r                   | deportiva
Pulsar N160 FI                | pulsar-n160-fi                | deportiva
Pulsar 160 NS UG2             | pulsar-160-ns-ug2             | deportiva
Pulsar 180 Neon               | pulsar-180-neon               | deportiva
Pulsar 200 NS UG2             | pulsar-200-ns-ug2             | deportiva
Pulsar 200 RS                 | pulsar-200-rs                 | deportiva
Pulsar N250                   | pulsar-n250                   | deportiva
Pulsar N250 UG                | pulsar-n250-ug                | aventura
Dominar 250                   | dominar-250                   | aventura
Dominar 400                   | dominar-400                   | aventura
Pulsar 400 NS                 | pulsar-400-ns                 | aventura
Mototaxi 4T STD Crom-UG R     | mototaxi-4t-std-crom-ug-r     | carga
Torito Fibraser Clásico       | torito-fibraser-clasico       | carga
Torito Fibraser X Sport       | torito-fibraser-x-sport       | carga
Torito Fibraser Clásico 2025  | torito-fibraser-clasico-2025  | carga
Torito Fibratec Raptor Slujo  | torito-fibratec-raptor-slujo  | carga

## LISTA DE AGOSTO

<<< PEGA AQUÍ TU LISTA DE AGOSTO, TAL CUAL LA TENGAS >>>

## LO QUE TIENES QUE DEVOLVER

Un CSV con estas 27 columnas EXACTAS, en este orden, con la cabecera
incluida:

accion,modelo,linea,categoria,ficha_oficial,cilindrada_cc,potencia_hp,torque_nm,refrigeracion,sistema_combustible,transmision,numero_marchas,freno_delantero,freno_trasero,abs,capacidad_tanque_l,peso_kg,colores,precio_publico,mostrar_precio,destacado,nuevo,imagen_principal_origen,imagen_mobile_origen,galeria_1_origen,galeria_2_origen,observaciones

### La columna `accion` — es lo más importante

Una fila por modelo, y `accion` toma UNO de estos tres valores:

| valor        | cuándo |
|--------------|--------|
| `actualizar` | está en las DOS listas — se conserva |
| `nuevo`      | está en la lista de agosto y NO en el catálogo |
| `retirar`    | está en el catálogo y NO en la lista de agosto |

Devuelve las filas de los tres tipos. Las de `retirar` también, porque
hay que darlas de baja.

### Cómo emparejar

Los nombres pueden estar escritos distinto en cada lista. Empareja por
el modelo real, no por la cadena literal:

- `PULSAR NS 200 UG2` = `Pulsar 200 NS UG2`
- `BOXER BM 150 X DISC` = `Boxer BM150X Disc`
- `N250` = `Pulsar N250`

Si tienes DUDA de si dos nombres son la misma moto, NO decidas: pon
`accion` vacía y escribe la duda en `observaciones`. Es preferible que
la resuelva una persona a mano.

### Reglas que NO puedes romper

1. **`categoria` solo puede ser uno de estos cinco valores:**
   `ciudad` · `trabajo` · `deportiva` · `aventura` · `carga`
   Nada de `scooter`, `naked`, `touring`, `enduro`.
   Para un modelo nuevo, elige la que mejor encaje. Si dudas, déjala
   vacía y anótalo en `observaciones`.

2. **`modelo`**: para `actualizar` y `retirar`, copia el nombre EXACTO
   de la tabla del catálogo, sin cambiar ni una letra. Para `nuevo`,
   usa el nombre comercial tal como aparece en la lista de agosto.

3. **DEJA VACÍAS todas estas columnas, siempre:**
   `ficha_oficial`, `cilindrada_cc`, `potencia_hp`, `torque_nm`,
   `refrigeracion`, `sistema_combustible`, `transmision`,
   `numero_marchas`, `freno_delantero`, `freno_trasero`, `abs`,
   `capacidad_tanque_l`, `peso_kg`, `colores`, `precio_publico`,
   `mostrar_precio`, `destacado`, `nuevo`, y las cuatro de imagen.

   No inventes cilindradas, potencias, precios ni colores. Ni siquiera
   si los sabes: esos datos salen de la ficha oficial del fabricante y
   los carga una persona. Una celda vacía significa «no verificado», y
   es una respuesta correcta.

4. **`linea`**: rellénala solo si es evidente del nombre
   (Pulsar, Boxer, Dominar, Discover, Torito, CT, Mototaxi).
   Si no, déjala vacía.

5. **`observaciones`**: úsala para dudas, nombres ambiguos, o cualquier
   cosa que haya que revisar. Es la única columna donde puedes escribir
   libremente.

### Formato

- CSV separado por comas, con cabecera
- Si un valor lleva coma, ponlo entre comillas dobles
- Sin filas vacías al final
- Sin explicaciones antes ni después: **solo el CSV**

### Antes de responder, comprueba

- [ ] ¿Hay una fila por cada modelo de la lista de agosto?
- [ ] ¿Hay una fila `retirar` por cada modelo del catálogo que no esté
      en agosto?
- [ ] ¿Todas las categorías son uno de los cinco valores permitidos?
- [ ] ¿Están vacías TODAS las columnas de especificaciones, precio,
      colores e imágenes?
- [ ] ¿Los nombres de `actualizar` y `retirar` coinciden letra por
      letra con la tabla del catálogo?

=====================================================================

---

## Qué pasa después, con el CSV en la mano

```bash
node scripts/qa-lote-catalogo.mjs agosto.csv --detalle
```

El validador comprueba, entre otras cosas:

- que no haya modelos ni slugs duplicados
- que las categorías estén dentro de las cinco aprobadas
- que un `nuevo` no colisione con uno que ya existe
- que un `actualizar` exista de verdad
- que un `retirar` exista de verdad
- que no se haya colado ninguna especificación inventada

Y devuelve:

1. Qué filas hay que **añadir** a `MODELOS_WEB`
2. Qué filas hay que **dar de baja** — y cómo, que no es borrarlas
3. Un bloque listo para pegar, en el orden real de las columnas

> **Pendiente de implementar:** el validador admite hoy `nuevo` y
> `actualizar`. `retirar` es un valor nuevo de este flujo y hay que
> añadirlo, con sus pruebas, antes de usar este prompt en serio.

---

## Sobre «retirar»: no se borran filas

Una moto que sale del catálogo de agosto **no se elimina de la hoja**.
Se pone `activo = FALSE` y se deja constancia en `observaciones`.

Motivos:

- si vuelve en septiembre, su `id`, su `slug` y sus textos siguen ahí;
- si alguien compartió el enlace de esa ficha, no queda roto sin más;
- borrar es irreversible; desactivar no.

Como las 22 ya están en `BORRADOR` e inactivas, hoy «retirar» no cambia
nada visible. Importará cuando haya modelos publicados.

---

## Referencias

- [plantilla-recepcion-modelos.csv](plantilla-recepcion-modelos.csv) — las 27 columnas
- [recepcion-lote-fase4.md](recepcion-lote-fase4.md) — el proceso completo
- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — qué hace que un modelo se vea
