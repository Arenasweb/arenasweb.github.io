# Corregir el Boxer BM150X Disc en el Google Sheets

**Una moto. Dos celdas. Nada más.**

El catálogo oficial Bajaj de mayo dice que el Boxer da **12.3 Nm** y **no
indica ningún peso**. Tu hoja dice 12.5 Nm y 125 kg. Por eso hoy la página del
Boxer enseña 12.5 arriba y 12.3 en la lámina de ficha técnica: se contradice
sola.

---

## Qué cambia, de un vistazo

| Celda | Dice ahora | Tiene que decir |
|---|---|---|
| Columna **R** (`caracteristica_2`) | Torque: **12.5** Nm · … | Torque: **12.3** Nm · … |
| Columna **I** (`descripcion_larga`) | … 11.8 HP y **12.5 Nm**; … tanque de 11 L **y peso de 125 kg**. | … 11.8 HP y **12.3 Nm**; … **y tanque de 11 L.** |

La fila es la del Boxer: la que tiene `boxer-bm150x-disc` en la **columna B**.

**No toques ninguna otra celda, ninguna otra fila, ninguna otra moto.**

---

## Opción 1 — que lo haga tu GPT del Sheets

Copia esto y pégaselo:

```
Corrige UNA sola fila de la hoja MODELOS_WEB. Nada más.

LA FILA: la que tiene en la columna B el valor  boxer-bm150x-disc
(es la Boxer BM150X Disc). Si no la encuentras, PARA y dímelo. No la crees.

CAMBIO 1 — columna R, caracteristica_2
  Ahora dice exactamente:
      Torque: 12.5 Nm · refrigeración por aire
  Tiene que decir exactamente:
      Torque: 12.3 Nm · refrigeración por aire

  Solo cambia el 5 por un 3. El punto del medio (·) y el resto del texto
  quedan igual. No lo reescribas: cambia ese carácter.

CAMBIO 2 — columna I, descripcion_larga
  Ahora dice exactamente:
      Motocicleta utilitaria para trabajo y rutas irregulares. La ficha
      oficial peruana de la Boxer 150 X con disco indica motor de 144.8 cc
      refrigerado por aire, 11.8 HP y 12.5 Nm; disco delantero de 240 mm,
      tanque de 11 L y peso de 125 kg.

  Tiene que decir exactamente:
      Motocicleta utilitaria para trabajo y rutas irregulares. La ficha
      oficial peruana de la Boxer 150 X con disco indica motor de 144.8 cc
      refrigerado por aire, 11.8 HP y 12.3 Nm; disco delantero de 240 mm y
      tanque de 11 L.

  Dos cambios dentro de esa frase:
    a) 12.5 Nm  →  12.3 Nm
    b) se quita  «, tanque de 11 L y peso de 125 kg.»  y se pone
                 « y tanque de 11 L.»
  El peso desaparece entero. El catálogo oficial no indica ninguno y no se
  inventa.

CAMBIO 3 — columna Z, ultima_revision  (OPCIONAL)
  Pon:  2026-09-26
  Esa celda está vacía hoy. Si la columna no existe o no la encuentras,
  SÁLTATELA y sigue. No es importante y no justifica parar.

REGLAS:
- NO cambies el estado: activo sigue en TRUE, estado_contenido sigue en
  APROBADO. La moto no se despublica por esto.
- NO toques ninguna otra fila. NO toques ninguna otra columna.
- NO redondees, NO reformatees, NO "mejores" la redacción.
- Los decimales van con PUNTO: 12.3, nunca 12,3.
- Si algo no coincide con lo que te he escrito arriba, PARA y dímelo antes
  de tocar nada.

Cuando termines, devuélveme el contenido final de las columnas I, R y Z de
esa fila, para que yo lo compruebe.
```

---

## Opción 2 — a mano, tú mismo, en 1 minuto

Por si el GPT falla o prefieres verlo con tus ojos:

1. Abre el Google Sheets y ve a la pestaña **`MODELOS_WEB`**.
2. Busca la fila del Boxer: la que en la **columna B** pone `boxer-bm150x-disc`.
3. En esa fila, ve a la **columna R**. Haz doble clic. Cambia el **12.5** por
   **12.3**. Enter.
4. En esa misma fila, ve a la **columna I**. Borra todo lo que hay y pega esto:

```
Motocicleta utilitaria para trabajo y rutas irregulares. La ficha oficial peruana de la Boxer 150 X con disco indica motor de 144.8 cc refrigerado por aire, 11.8 HP y 12.3 Nm; disco delantero de 240 mm y tanque de 11 L.
```

5. En la **columna Z**, escribe `2026-09-26`. Si esa columna no está o no la
   ves, déjalo: no pasa nada.
6. Ya está. No guardes nada: Google guarda solo.

> **Truco para no perderte con las letras.** Las columnas van A, B, C… La
> **I** es la novena. La **R** es la decimoctava. La **Z** es la número 26.
> Si tu hoja tiene la fila de títulos arriba, ahí pone el nombre de cada
> columna: busca `descripcion_larga`, `caracteristica_2` y `ultima_revision`
> y no tendrás que contar.

---

## Cómo comprobar que salió bien

Espera **cinco minutos** —la web guarda la respuesta del Sheets ese rato— y
entra a la página del Boxer en el sitio.

Tiene que decir **12.3 Nm** en los datos rápidos de arriba y **12.3 Nm** en la
lámina de ficha técnica. Los dos iguales. Si arriba sigue poniendo 12.5,
todavía no ha caducado la caché: recarga con Ctrl + F5 al cabo de un rato.

Y en el texto largo del Boxer ya no debe aparecer la palabra **kg** por
ninguna parte.

---

## Cuando lo hayas hecho, avísame

En el repositorio hay una copia de seguridad del catálogo
(`data/catalogo-publico.local.json`) que todavía dice 12.5 Nm y 125 kg. Es la
que se usa si Google se cae. **No la he tocado a propósito:** esa copia tiene
que reflejar lo que dice tu hoja, no adelantarse.

Dime que ya está y la sincronizo, para que las dos digan lo mismo.
