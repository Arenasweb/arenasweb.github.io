# Prompt para la IA — procesar el catálogo por grupos

Prompt para entregarle a una IA los dos archivos de origen y que devuelva, modelo
por modelo: **ficha técnica**, **lista de colores** e **imágenes por color** con
la calidad que pide la web.

## Los dos archivos que se le entregan

| Archivo | Qué contiene |
|---|---|
| `Catalogo Motos Mayo.pdf` | 17 páginas, 15 modelos. Ficha técnica de cada uno y un recuadro «Colores» con los círculos de color disponibles. |
| `VOLANTE-BAJAJ_Carpeta EDITABLE` | El volante editable. Dentro, `Links/` tiene las **fotos máster** en PNG con fondo transparente y resolución muy alta: `BOXER2024_3 negro_2.png`, `CT 3_AZUL.png`, `N125_green_03 copy.png`, `N250_ROJO_3.png`, `roja NS400_5.png`, `D400_16_13 copy_PNG With Shadow.png`, `3_NEGRO-AZUL.png`, `moto roja hero.png`. |

Si además existe la **lámina oficial Bajaj** de algún modelo (la que trae
«COLORES DISPONIBLES» con una foto por color y su nombre), se adjunta también:
esa lámina vale más que cualquier generación, porque las fotos ya son reales.

---

## Por qué va por grupos

Pedir los 15 modelos de una vez es lo que hace que la IA devuelva una lámina
resumen con todo mezclado. Con tres modelos por tanda se puede revisar cada
entrega antes de seguir, y si algo sale mal se repite una tanda, no el trabajo
entero.

| Grupo | Modelos |
|---|---|
| **1 — Ciudad y trabajo** | CT 125 · Boxer BM150X · Discover 125 ST |
| **2 — Pulsar clásicas** | Pulsar LS125 · Pulsar 150R · Pulsar 180 Neon |
| **3 — Pulsar N** | Pulsar N125 · Pulsar N160 · Pulsar N250 UG |
| **4 — Pulsar NS y RS** | Pulsar NS160 · Pulsar NS200 UG2 · Pulsar RS200 |
| **5 — Alta cilindrada** | Pulsar NS400 · Dominar 250 · Dominar 400 |

---

## EL PROMPT — cópialo tal cual

```
Vas a procesar un catálogo de motocicletas a partir de los archivos que te
entrego. Trabajarás POR GRUPOS y te detendrás al final de cada uno.

════════════════════════════════════════════════════════════════
REGLA NÚMERO UNO — LÉELA DOS VECES
════════════════════════════════════════════════════════════════

Los archivos que te doy son LÁMINAS DE CATÁLOGO: una página con varias
motos, varios colores, textos, logos, marcos y fondos decorativos.

Esas láminas son la FUENTE de donde sacas la información.
NO son el modelo de lo que tienes que devolver.

NO me devuelvas una lámina. NO me devuelvas un collage. NO me devuelvas
una cuadrícula de colores. NO me devuelvas una página de catálogo.

Una imagen = una moto = un color = un archivo.

Si un modelo tiene cinco colores, me entregas CINCO ARCHIVOS SEPARADOS,
no un archivo con cinco motos dentro.

Y dentro de cada imagen NO va escrito nada: ni el nombre del color, ni el
nombre del modelo, ni el logo de Bajaj, ni el de ARENAS, ni flechas, ni
etiquetas, ni marcos, ni fondo de colores. Solo la moto.
El nombre del color va en el NOMBRE DEL ARCHIVO y en la tabla. Nunca
dibujado encima de la foto.

════════════════════════════════════════════════════════════════
LOS ARCHIVOS QUE TE ENTREGO
════════════════════════════════════════════════════════════════

1. «Catalogo Motos Mayo.pdf» — 17 páginas. Cada página es un modelo con su
   ficha técnica y, abajo a la derecha, un recuadro «Colores» con círculos.
   De aquí sacas los DATOS y CUÁNTOS COLORES tiene cada modelo.

2. La carpeta del volante Bajaj. Dentro, en «Links/», están las fotos
   máster en PNG con fondo transparente y resolución muy alta.
   De aquí sacas las IMÁGENES de base.

3. Si te adjunto una lámina oficial Bajaj de un modelo (la que dice
   «COLORES DISPONIBLES» y muestra una foto por color con su nombre
   escrito debajo: AZUL, ROJO, NEGRO, GRIS, BLANCO), esa lámina MANDA
   sobre todo lo demás para ese modelo. Ver más abajo.

════════════════════════════════════════════════════════════════
ORDEN DE TRABAJO — GRUPOS
════════════════════════════════════════════════════════════════

GRUPO 1 — CIUDAD Y TRABAJO
  CT 125 · Boxer BM150X · Discover 125 ST

GRUPO 2 — PULSAR CLÁSICAS
  Pulsar LS125 · Pulsar 150R · Pulsar 180 Neon

GRUPO 3 — PULSAR N
  Pulsar N125 · Pulsar N160 · Pulsar N250 UG

GRUPO 4 — PULSAR NS Y RS
  Pulsar NS160 · Pulsar NS200 UG2 · Pulsar RS200

GRUPO 5 — ALTA CILINDRADA
  Pulsar NS400 · Dominar 250 · Dominar 400

Empiezas por el GRUPO 1. Cuando lo termines, ME LO ENTREGAS Y TE DETIENES.
No empieces el grupo 2 hasta que yo escriba «sigue».

Si te quedas sin espacio o sin tiempo a mitad de un grupo, entrega lo que
llevas y dime exactamente en qué modelo te quedaste. No lo resumas, no lo
comprimas y no saltes ninguno para «llegar al final».

════════════════════════════════════════════════════════════════
QUÉ ME ENTREGAS DE CADA MODELO — TRES COSAS
════════════════════════════════════════════════════════════════

──── A. FICHA TÉCNICA ────

Una tabla por modelo, con estos diez campos y en este orden:

  MOTOR                cilindrada exacta, tipo, bujías
  CAJA DE CAMBIOS      número de velocidades
  POTENCIA MÁXIMA      HP @ RPM
  TORQUE MÁXIMO        Nm @ RPM
  SISTEMA DE ARRANQUE  eléctrico / patada / pedal
  SUSPENSIÓN           delantera y posterior, en dos líneas
  FRENOS               delantero y posterior, con medida en mm y (ABS) si lo tiene
  TANQUE               capacidad en litros
  LLANTAS              delantera y posterior, medidas
  PESO APROX.          en kg

REGLA QUE NO SE NEGOCIA: cada cifra la COPIAS del documento. No la
calculas, no la deduces de un modelo parecido, no la completas con lo que
sepas de la marca.

Si un campo NO aparece en los archivos que te di, escribes exactamente:
  SIN DATO
No escribes «aproximadamente», no pones el de la versión anterior y no lo
dejas en blanco disimuladamente. «SIN DATO» es una respuesta correcta y
útil; una cifra inventada en una ficha técnica es un problema legal.

Aviso: en el PDF hay cuatro páginas (Pulsar N125, N160, NS160 y NS200 UG2)
cuyo recuadro de especificaciones puede verse vacío según cómo se abra el
archivo. Si en tu lectura salen vacías, dilo y márcalas SIN DATO — no las
rellenes con lo que sabes de esos modelos por otro lado.

──── B. LISTA DE COLORES ────

Del recuadro «Colores» de cada página, cuenta los círculos y descríbelos:

  | # | Nombre comercial | Slug          | Hex aprox. | Descripción      |
  |---|------------------|---------------|------------|------------------|
  | 1 | Negro            | negro         | #1A1A1A    | negro con rojo   |
  | 2 | Azul             | azul          | #184FA3    | azul con blanco  |

  · El slug va en minúsculas, sin acentos, con guiones: `azul-electrico`.
  · Si el círculo es de dos colores, dilo en la descripción y di qué
    color lleva el tanque, que es la pieza que más se ve.
  · Si el PDF no escribe el nombre comercial (solo el círculo), propón uno
    sencillo y MÁRCALO como propuesta, para que yo lo confirme.

──── C. IMÁGENES, UNA POR COLOR ────

Antes de generar nada, decide de dónde sale cada imagen, en este orden:

  1. ¿Hay una lámina oficial Bajaj con la foto de ese color?
     → RECORTAS esa foto. No generas nada. Es una foto real.
  2. ¿La máster de «Links/» ya está en ese color?
     → La usas tal cual. Ese color ya está resuelto.
  3. Solo si no hay ninguna de las dos:
     → REPINTAS la máster, siguiendo las reglas de abajo.

CUANDO TOQUE REPINTAR — qué cambia y qué no:

  CAMBIA: la pintura del tanque, cachas, carenados, guardabarros, colín
  y tapas plásticas pintadas; y los gráficos que van sobre esa pintura,
  que adoptan el color nuevo conservando su forma, tamaño y posición.

  NO CAMBIA NADA MÁS. Ni la forma de la moto, ni el ángulo, ni el
  encuadre, ni el tamaño dentro del lienzo. Motor, escape, chasis,
  horquilla, frenos, discos, cadena, llantas, neumáticos, manubrio,
  espejos y asiento se quedan con el color que ya tienen. El faro y el
  tablero conservan su cristal y su reflejo. Las luces y las sombras de
  la foto original se conservan: si el tanque tenía un brillo largo
  arriba, lo sigue teniendo, en el color nuevo. Los logotipos y las
  letras del tanque siguen legibles, en el mismo sitio y diciendo lo
  mismo: no los redibujes ni inventes otros.

  El color debe verse como pintura de fábrica sobre metal: con brillo,
  reflejo y oscurecimiento en los bordes. No es un filtro de color
  encima de la foto ni un relleno plano.

CÓMO DEBE SALIR CADA IMAGEN — esto es para una página web:

  · Vista lateral derecha, moto completa.
  · Las dos ruedas enteras, con aire alrededor: la moto no toca ningún
    borde del lienzo.
  · Fondo TRANSPARENTE (PNG con alfa). Sin piso, sin sombra proyectada,
    sin degradado, sin estudio, sin calle, sin nada detrás.
  · Proporción 16:10 (horizontal). La web recorta a esa forma: una imagen
    cuadrada o vertical pierde casi la mitad de la moto.
  · Resolución: la máxima que puedas, y nunca por debajo de 1600 × 1000 px.
  · PNG. La conversión final a WebP la hago yo después.

NOMBRE DE CADA ARCHIVO — exactamente así:

  <slug-del-modelo>__<slug-del-color>.png

  ct-125__azul.png
  ct-125__rojo.png
  pulsar-n160__gris.png

  Doble guion bajo entre el modelo y el color. Todo en minúsculas, sin
  espacios, sin acentos, sin paréntesis, sin «(1)», sin «final», sin
  «v2».

Los slugs de modelo son estos y no se cambian:

  ct-125 · boxer-bm150x-disc · discover-125-st · pulsar-125-ls ·
  pulsar-n125-fi · pulsar-150r · pulsar-180-neon · pulsar-n160-fi ·
  pulsar-160-ns-ug2 · pulsar-200-ns-ug2 · pulsar-200-rs ·
  pulsar-n250-ug · pulsar-400-ns · dominar-250 · dominar-400

════════════════════════════════════════════════════════════════
LO QUE ME ENTREGAS AL CERRAR CADA GRUPO
════════════════════════════════════════════════════════════════

  1. Las fichas técnicas de los tres modelos, en tabla.
  2. Las listas de colores de los tres, en tabla.
  3. Los archivos de imagen, sueltos, con su nombre correcto.
  4. Un recuento honesto:
       · cuántas imágenes salieron de foto real y cuántas repintaste;
       · qué campos quedaron SIN DATO y en qué modelo;
       · qué nombres de color son propuesta tuya y necesitan que yo los
         confirme;
       · qué no pudiste hacer y por qué.

  Y entonces TE DETIENES y esperas a que yo escriba «sigue».

════════════════════════════════════════════════════════════════
PROHIBIDO, EN CUALQUIER PASO
════════════════════════════════════════════════════════════════

  · Devolver un collage, una lámina, una cuadrícula o una página de
    catálogo. Ya lo dije arriba; lo repito porque es el error que más se
    repite.
  · Escribir texto, nombres de color, logos, marcos o fondos dentro de
    una imagen.
  · Inventar una cifra técnica que no esté en los archivos.
  · Cambiar un modelo por otro parecido porque «se ve igual».
  · Añadir o quitar piezas, accesorios, parrillas, maletas o stickers.
  · Adelantarte al siguiente grupo sin que yo lo pida.
  · Entregar un resumen en vez del trabajo, o decir «y los demás siguen
    el mismo patrón».
```

---

## Después, del lado del sitio

Los PNG que devuelva se convierten a lo que pide el catálogo —1600 × 1000 px y
1280 × 800 px en WebP, por debajo de 250 KB y 160 KB— y se colocan así:

```
assets/catalogo/pulsar-n160-fi/
  azul/
    portada.webp
    portada-mobile.webp
  rojo/
    portada.webp
    portada-mobile.webp
```

La conversión se puede hacer sin instalar nada, en [squoosh.app](https://squoosh.app),
o con [derivar-web.mjs](../scripts/derivar-web.mjs).

Cada color se registra después como una fila de `COLORES_MODELO_WEB` —las 15
columnas están en [colores-modelo-web.md](colores-modelo-web.md)— y entra con
`estado_aprobacion = BORRADOR` hasta que gerencia confirme que ese color se
vende. Las fichas técnicas todavía no tienen columnas en `MODELOS_WEB`: ver
[plan-filtros-tecnicos-futuro.md](plan-filtros-tecnicos-futuro.md), donde se
propone la hoja `ESPECIFICACIONES_MODELO_WEB` para alojarlas.
