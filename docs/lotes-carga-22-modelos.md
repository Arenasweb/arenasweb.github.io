# Cómo cargar los 22 modelos, por lotes

No se cargan los 22 de golpe. Se hacen lotes de 4 a 6, se revisa, se corrige el
patrón y se sigue. Así un error de criterio se detecta en el lote 1 y no se
repite 22 veces.

---

## Qué necesito por cada moto

*(Esta es la lista corta. Todo lo demás puede esperar.)*

1. **Foto principal** — la moto completa, con aire alrededor. *Imprescindible.*
2. **Foto para celular** *(si existe)* — la misma, encuadre algo más cerrado.
3. **Fotos de galería** *(opcional)* — máximo dos, ángulos distintos.
4. **Colores disponibles** — los nombres comerciales reales.
5. **Descripción comercial aprobada** — dos líneas.
6. **Tres características** — verificadas, sin cifras técnicas sin confirmar.
7. **Precio** — solo si se va a mostrar, y con autorización.

De los siete, **solo el primero bloquea**. Un modelo con foto y una línea de
descripción ya se publica dignamente.

Medidas y formato: [especificacion-imagenes-catalogo.md](especificacion-imagenes-catalogo.md).

---

## Los cuatro lotes

El orden **no supone ninguna importancia comercial**: está pensado para que cada
lote estrene una parte distinta del sistema y los fallos aparezcan pronto.

### Lote 1 — el que prueba el sistema entero (5 modelos)

| Modelo | Categoría | Qué estrena |
|---|---|---|
| Pulsar 180 Neon | deportiva | `destacado`, selector de colores, galería |
| Boxer BM150X Disc | trabajo | Única de su categoría: su chip depende de ella |
| Torito Fibraser Clásico | carga | Tres ruedas: el encuadre más difícil |
| CT 125 | ciudad | Silueta utilitaria |
| Dominar 400 | aventura | Carenada grande |

Cinco modelos que cubren **las cinco categorías** y las siluetas más distintas
entre sí. Si el catálogo funciona con estos cinco, funciona.

Los tres primeros son el piloto ya preparado en la subfase 2.2.

**Al terminar el lote 1 hay que parar y mirar de verdad**: ¿se parecen entre sí?
¿alguna se ve pequeña al lado de otra? ¿el Torito queda cortado? Lo que se
aprenda aquí cambia cómo se fotografían las 17 restantes.

### Lote 2 — la línea Pulsar (6 modelos)

`Pulsar 125 LS` · `Pulsar N125 FI` · `Pulsar 150 Neon` · `Pulsar 150R` ·
`Pulsar N160 FI` · `Pulsar 160 NS UG2`

Todas de la misma familia: aquí se ve si la **consistencia** entre fotos aguanta.
Modelos parecidos, uno al lado del otro, sin margen para disimular.

### Lote 3 — cilindradas altas (6 modelos)

`Pulsar 200 NS UG2` · `Pulsar 200 RS` · `Pulsar N250` · `Pulsar N250 UG` ·
`Pulsar 400 NS` · `Dominar 250`

Cuidado especial con **`Pulsar N250` y `Pulsar N250 UG`**: nombres casi idénticos
y categorías distintas (deportiva / ruta y aventura). Es el par más fácil de
confundir de todo el catálogo.

### Lote 4 — carga y transporte (5 modelos)

`Torito Fibraser X Sport` · `Torito Fibraser Clásico 2025` ·
`Torito Fibratec Raptor Slujo` · `Mototaxi 4T STD Crom-UG R` · `Discover 125 ST`

Vehículos anchos que comparten criterio de encuadre. Se dejan para el final
porque a estas alturas el criterio ya está asentado.

Ojo con **`Torito Fibraser Clásico`** (lote 1) y **`Torito Fibraser Clásico 2025`**
(lote 4): son modelos distintos.

---

## Qué hacer al cerrar cada lote

```bash
node scripts/qa-assets-catalogo.mjs --detalle
node scripts/qa-catalogo.mjs --faltantes
node scripts/qa-catalogo.mjs --matriz
```

Después, en el navegador:

1. `catalogo.html?preview=1` — ¿las nuevas conviven bien con las anteriores?
2. `catalogo.html?preview=1&debug=1` — ¿qué falta, según el sistema?
3. La ficha de cada modelo nuevo.
4. Una ventana estrecha, de celular.

Y solo entonces: `APROBADO` y `activo = TRUE`, modelo por modelo.

---

## Reparto actual

| Categoría | Modelos |
|---|---|
| deportiva | 8 |
| carga | 5 |
| ciudad | 4 |
| aventura | 4 |
| trabajo | **1** |

| Línea | Modelos |
|---|---|
| Pulsar | 12 |
| Torito | 4 |
| Dominar | 2 |
| CT · Discover · Boxer · Mototaxi | 1 cada una |

Dos observaciones, sin decisión por mi parte:

- **`trabajo` tiene un solo modelo.** El chip aparecerá para filtrar una única
  moto. No está mal, pero conviene saberlo.
- **`Pulsar` es el 55 % del catálogo.** El filtro por línea será poco útil si casi
  todo cae en la misma opción.

Ambas cosas son decisiones comerciales, no técnicas.

---

## Referencias

- [pipeline-fotografias.md](pipeline-fotografias.md) — qué pasa con cada foto
- [checklist-modelo-publicable.md](checklist-modelo-publicable.md) — revisión modelo a modelo
- [guia-carga-contenido-catalogo.md](guia-carga-contenido-catalogo.md) — cómo rellenar la hoja
