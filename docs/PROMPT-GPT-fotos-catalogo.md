# Prompt para GPT — cargar, aprobar y publicar las 8 fotografías

Las 8 fotografías **ya están publicadas** en producción (commit `5961fc1`,
desplegado). Las rutas de abajo responden 200 ahora mismo, así que este prompt
se puede ejecutar sin riesgo de imágenes rotas.

Yo tengo acceso de **solo lectura** a la hoja. Esta parte la ejecuta GPT.

## Qué hace este prompt

1. Rellena `imagen_principal`, `imagen_mobile` y `alt_text` en 8 filas.
2. Pone `estado_contenido = APROBADO` en esas mismas 8.
3. Pone `activo = TRUE` en esas mismas 8.

Las otras 14 no se tocan: sin fotografía, publicarlas solo enseñaría al cliente
un marco vacío.

## Antes de lanzarlo, dos cosas

- **La caché del endpoint es de 300 segundos.** Tras guardar en Sheets, el
  catálogo tarda hasta 5 minutos en reflejarlo. No está roto.
- **La reconciliación de agosto sigue abierta.** Si alguno de estos 8 iba a
  retirarse, quedará publicado. Ver `PROMPT-GPT-motos-agosto.md`.

---

## PROMPT — cópialo tal cual

```
Eres el encargado de contenido de ARENAS MOTOCICLETAS. Trabajas sobre la hoja
MODELOS del catálogo. Vas a tocar OCHO filas y CINCO columnas. Nada más.

REGLA QUE MANDA SOBRE TODAS: no escribas en ninguna celda que no esté descrita
aquí. Si una columna no aparece, se queda como está — vacía si estaba vacía. Un
hueco significa "sin verificar", y es una respuesta honesta. Un dato inventado
no lo es.

Localiza cada modelo por su `slug`, NUNCA por el nombre: hay slugs parecidos
(por ejemplo `pulsar-n250` y `pulsar-n250-ug` son modelos DISTINTOS). Si un slug
de esta lista no existe en la hoja, PARA y avísalo. No busques "el más
parecido".

PASO 1 — RUTAS Y TEXTO ALTERNATIVO
Copia estos valores carácter por carácter:

slug: ct-125
  imagen_principal: assets/catalogo/ct-125/portada.webp
  imagen_mobile:    assets/catalogo/ct-125/portada-mobile.webp
  alt_text: Motocicleta CT 125 negra con gráficos azules, vista lateral derecha completa, con asiento corrido y escape cromado

slug: discover-125-st
  imagen_principal: assets/catalogo/discover-125-st/portada.webp
  imagen_mobile:    assets/catalogo/discover-125-st/portada-mobile.webp
  alt_text: Motocicleta Discover 125 ST negra con gráficos azules y blancos, vista lateral derecha completa

slug: boxer-bm150x-disc
  imagen_principal: assets/catalogo/boxer-bm150x-disc/portada.webp
  imagen_mobile:    assets/catalogo/boxer-bm150x-disc/portada-mobile.webp
  alt_text: Motocicleta Boxer X 150 negra con gráficos rojos, vista lateral derecha completa, con parrilla trasera, cubrepuños y freno de disco delantero

slug: pulsar-n125-fi
  imagen_principal: assets/catalogo/pulsar-n125-fi/portada.webp
  imagen_mobile:    assets/catalogo/pulsar-n125-fi/portada-mobile.webp
  alt_text: Motocicleta Pulsar N125 FI verde limón y gris, vista lateral derecha completa, de postura recta y rueda delantera con freno de disco

slug: pulsar-200-ns-ug2
  imagen_principal: assets/catalogo/pulsar-200-ns-ug2/portada.webp
  imagen_mobile:    assets/catalogo/pulsar-200-ns-ug2/portada-mobile.webp
  alt_text: Motocicleta Pulsar 200 NS negra con detalles rojos y grises, vista lateral derecha completa, tipo naked deportiva con ABS

slug: pulsar-n250
  imagen_principal: assets/catalogo/pulsar-n250/portada.webp
  imagen_mobile:    assets/catalogo/pulsar-n250/portada-mobile.webp
  alt_text: Motocicleta Pulsar N250 roja y negra, vista lateral derecha completa, con horquilla invertida dorada y frenos de disco

slug: pulsar-400-ns
  imagen_principal: assets/catalogo/pulsar-400-ns/portada.webp
  imagen_mobile:    assets/catalogo/pulsar-400-ns/portada-mobile.webp
  alt_text: Motocicleta Pulsar NS 400 roja y negra, vista lateral derecha completa, con horquilla invertida dorada y llantas con filo rojo

slug: dominar-400
  imagen_principal: assets/catalogo/dominar-400/portada.webp
  imagen_mobile:    assets/catalogo/dominar-400/portada-mobile.webp
  alt_text: Motocicleta Dominar 400 verde y negra, vista lateral derecha completa, con cúpula, parrilla trasera y horquilla invertida

PASO 2 — APROBAR
En esas MISMAS ocho filas, y solo en ellas:
  estado_contenido: APROBADO

Antes de escribir APROBADO en una fila, comprueba que esa fila tiene relleno:
`imagen_principal`, `alt_text` y `descripcion_corta`. Si a alguna le falta una
de las tres, NO la apruebes: déjala en BORRADOR y dilo en el informe final. La
web exige las tres para publicar, y aprobar sin ellas crea una fila que dice
estar lista y no lo está.

PASO 3 — PUBLICAR
En esas MISMAS ocho filas, y solo en ellas:
  activo: TRUE

LO QUE NO DEBES TOCAR, EN NINGÚN CASO:
  · Las otras 14 filas. Se quedan en BORRADOR y activo = FALSE. No tienen
    fotografía, y publicarlas solo enseñaría un marco vacío al cliente.
  · precio_publico, precio_promocional, mostrar_precios. Este catálogo no
    lleva precios: se cotiza por WhatsApp.
  · colores, y toda la ficha técnica (cilindrada, potencia, torque, marchas,
    frenos, peso, tanque). Ya está rellenada o vacía a propósito.
  · id, slug, modelo, linea, categoria, orden. Son la identidad de la fila.
  · No borres ninguna fila. Nunca. Retirar un modelo se hace con
    activo = FALSE, conservando id, slug y textos.

COMPROBACIONES ANTES DE DAR EL TRABAJO POR HECHO:
  1. ¿Tocaste exactamente 8 filas? Ni 7 ni 9.
  2. ¿Las rutas empiezan por `assets/catalogo/` y acaban en `.webp`, sin barra
     inicial, sin dominio y sin `https://`? Son rutas relativas.
  3. ¿La carpeta de cada ruta coincide letra por letra con el slug de su fila?
  4. ¿Las 14 filas restantes siguen en BORRADOR y activo = FALSE?
  5. ¿Sigue habiendo 22 filas en total?

INFORME FINAL, obligatorio:
  · Cuántas celdas escribiste y en qué columnas.
  · La lista de los 8 slugs que quedaron APROBADO + activo = TRUE.
  · Cualquier fila que decidieras NO aprobar, y por qué.
  · Confirmación de que las 14 restantes siguen intactas.
```

---

## Después de lanzarlo

Espera **5 minutos** (la caché del endpoint) y abre
<https://arenasweb.github.io/catalogo.html>. Deberían aparecer 8 motos con
fotografía. Si sigue vacío pasados 10 minutos, avísame y lo miro.
