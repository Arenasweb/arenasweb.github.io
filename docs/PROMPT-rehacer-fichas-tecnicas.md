# Prompt — rehacer las fichas técnicas con las cifras correctas

El diseño de las fichas está bien y se conserva. Lo que se rehace son **los
números**: seis de las siete revisadas traían datos que no coinciden con el
catálogo oficial Bajaj de mayo. El detalle, en
[verificacion-fichas-tecnicas.md](verificacion-fichas-tecnicas.md).

## Archivos de referencia

Están en `assets/referencias/_fichas-tecnicas/`, nombrados por moto y con su
estado:

| Archivo | Para qué sirve |
|---|---|
| `ct-125--VERIFICADA-ok.png` | **El modelo de diseño a imitar.** Es la única cuyas cifras coinciden con el catálogo. |
| `*--datos-erroneos.png` | Diseño bueno, cifras malas. Se rehacen. |
| `*--sin-verificar.png` | Motos no publicadas todavía; su diseño sirve de referencia. |
| `ct-125--DESCARTAR-*.png` | No usar: una se contradice con la otra CT, y la otra es una maqueta con un «Contenido del ZIP» dibujado dentro. |
| `_montaje-*.png` | Láminas con varias motos juntas. No son fichas. |

---

## EL PROMPT — cópialo tal cual

```
Vas a rehacer una ficha técnica de motocicleta para ARENAS MOTOCICLETAS,
concesionario Bajaj en Cusco, Perú.

════════════════════════════════════════════════════════
LO PRIMERO, Y LO MÁS IMPORTANTE
════════════════════════════════════════════════════════

El diseño de la lámina que te adjunto está APROBADO y se conserva tal cual.
Lo que se rehace son las CIFRAS.

Las cifras te las doy yo, abajo, copiadas del catálogo oficial. Tu trabajo es
ESCRIBIRLAS, no calcularlas, no redondearlas, no completarlas con lo que
sepas de la marca y no «mejorarlas».

En la tanda anterior aparecieron estos errores, y no pueden repetirse:

  · Una ficha decía 12.0 HP donde el catálogo dice 11.8 HP.
  · Otra decía 8 litros de tanque donde el catálogo dice 10.
  · Otra decía motor SOHC donde el catálogo dice DOHC.
  · Otra escribió «21.5 Nm @ 6,500 PPM». Las revoluciones son RPM.
  · Otra escribió «TU PRÓXIMO DESTIKHD» en vez de «DESTINO».
  · Otra escribió «4 tiempes» en vez de «4 tiempos».

Una cifra equivocada en una ficha técnica no es un detalle de diseño: es una
afirmación comercial sobre un producto que alguien va a comprar.

Si un campo NO aparece en los datos que te doy, escribe exactamente
«SIN DATO» o deja el campo fuera de la lámina. No lo rellenes.

════════════════════════════════════════════════════════
EL DISEÑO QUE SE CONSERVA
════════════════════════════════════════════════════════

Toma como modelo la lámina adjunta `ct-125--VERIFICADA-ok.png`. Su estructura
es esta y se respeta entera:

  · Cabecera: logotipo ARENAS MOTOCICLETAS a la izquierda, franja azul con
    «CONFIANZA / SERVICIO / TU PRÓXIMO DESTINO», y el logo BAJAJ con «AMADA
    EN 70 PAÍSES» a la derecha.
  · Columna izquierda: nombre del modelo en grande, una frase corta debajo,
    y la fotografía principal de la moto en tres cuartos.
  · Cuatro iconos de atributos bajo la foto, con dos palabras cada uno.
  · Bloque «FICHA TÉCNICA» en dos columnas, con el nombre del modelo a la
    derecha del título. Cada dato con su icono: motor, potencia máxima,
    torque máximo, caja de cambios, sistema de arranque | suspensión,
    frenos, tanque, llantas, peso aproximado.
  · Columna derecha arriba: «COLORES DISPONIBLES», con una foto por color y
    el nombre del color en una etiqueta debajo.
  · Columna derecha abajo: «DETALLES», rejilla de fotos de piezas con su
    rótulo.
  · Banda inferior: «VISTAS DEL VEHÍCULO» (lateral, frontal, posterior) y
    una fotografía de carretera con una frase.
  · Pie azul: REPUESTOS ORIGINALES · SERVICIO ESPECIALIZADO · GARANTÍA Y
    RESPALDO.

Paleta: azul Bajaj, blanco y gris. Tipografía de palo seco, condensada en
los titulares.

REVISA LA ORTOGRAFÍA de cada palabra antes de darla por buena. Ninguna
palabra inventada, ninguna letra cambiada, ninguna unidad inexistente.

════════════════════════════════════════════════════════
LAS CIFRAS — cópialas exactas
════════════════════════════════════════════════════════

<<AQUÍ PEGAS EL BLOQUE DE LA MOTO QUE TOCA, DE LA LISTA DE ABAJO>>

════════════════════════════════════════════════════════
LAS FOTOGRAFÍAS
════════════════════════════════════════════════════════

Usa las fotografías reales de la moto que te adjunto. No generes motos
nuevas ni cambies su forma: la lámina es para un catálogo, y el cliente va a
comparar lo que ve con lo que hay en la tienda.

Los colores que muestres tienen que ser los de la lista de arriba, con el
nombre escrito tal cual. Ni uno más.

════════════════════════════════════════════════════════
AL TERMINAR, DIME
════════════════════════════════════════════════════════

  1. Cada dato que escribiste, en una lista, para poder contrastarlo.
  2. Cualquier campo que dejaste como SIN DATO.
  3. Si algo del diseño no lo pudiste reproducir, y por qué.

Una lámina por mensaje. No juntes varias motos en una sola imagen.
```

---

## Las cifras oficiales, moto por moto

Copiadas del catálogo *Catálogo Motos Mayo* de ARENAS. Pega el bloque de la
moto que toque en el hueco del prompt.

> Donde dice **SIN DATO**, el catálogo no lo trae. No se inventa: se pide a
> Crosland o se deja fuera de la lámina.

### CT 125
```
MOTOR: 115.45 cc, DTS-i, doble bujía
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 8.48 HP @ 7000 RPM
TORQUE MÁXIMO: 9.81 Nm @ 5000 RPM
SISTEMA DE ARRANQUE: Eléctrico y patada
SUSPENSIÓN: Delantera Telescópica 125 / Posterior Doble amortiguador SNS
FRENOS: Delantero Disco 200 mm / Posterior Tambor 110 mm
TANQUE: 10.5 litros
LLANTAS: Delantera 2.75 x 17.41" con cámara / Posterior 3.00 x 17.50" con cámara
PESO APROX.: SIN DATO
```

### Boxer BM150X Disc
```
MOTOR: 144.8 cc, DTS-i, monocilíndrico
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 11.8 HP @ 7500 RPM
TORQUE MÁXIMO: 12.3 Nm @ 5000 RPM
SISTEMA DE ARRANQUE: Eléctrico y patada
SUSPENSIÓN: Delantera Telescópica 125 / Posterior Doble amortiguador SNS
FRENOS: el catálogo describe la versión de tambor (Tambor 130 mm delante y
        detrás). Nuestra versión es la DISC, con disco delantero, pero la
        MEDIDA de ese disco no está confirmada → escribe
        «Delantero: Disco / Posterior: Tambor 130 mm», sin milímetros delante.
TANQUE: 11 litros
LLANTAS: Delantera 90/90 x 17" / Posterior 100 x 90 x 17"
PESO APROX.: SIN DATO
```

### Discover 125 ST
```
MOTOR: 124.6 cc, DTS-i, doble bujía
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 12.82 HP @ 8500 RPM
TORQUE MÁXIMO: 10.8 Nm @ 6500 RPM
SISTEMA DE ARRANQUE: Eléctrico y patada
SUSPENSIÓN: Delantera Horquilla hidráulica / Posterior Monoshock de Nitrox
FRENOS: Delantero Disco / Posterior Tambor  (el catálogo no da medidas)
TANQUE: 10 litros
LLANTAS: Delantera 2.75 x 17" / Posterior 3.00 x 17"
PESO APROX.: SIN DATO
```

### Pulsar 125 LS
```
MOTOR: 124.4 cc, DTS-i, doble bujía
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 11.8 HP @ 8500 RPM
TORQUE MÁXIMO: 10.75 Nm @ 6500 RPM
SISTEMA DE ARRANQUE: Eléctrico y pedal
SUSPENSIÓN: Delantera Telescópica / Posterior Doble amortiguador Nitrox
FRENOS: CBS. Delantero Disco 240 mm / Posterior Tambor 130 mm
TANQUE: 10.5 litros
LLANTAS: Delantera 2.75 x 17" / Posterior 100 x 90 x 17"
PESO APROX.: SIN DATO
```

### Pulsar 150R
```
MOTOR: 149.5 cc, DTS-i, doble bujía
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 13.8 HP @ 8000 RPM
TORQUE MÁXIMO: 13.4 Nm @ 6000 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Telescópica / Posterior Doble amortiguador Nitrox
FRENOS: Delantero Disco 260 mm / Posterior Disco 230 mm
TANQUE: 15 litros
LLANTAS: Delantera 90 x 90 x 17" / Posterior 120 x 80 x 17"
PESO APROX.: SIN DATO
```

### Pulsar 180 Neon
```
MOTOR: 178.61 cc, DTS-i, doble bujía
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 16.78 HP @ 8500 RPM
TORQUE MÁXIMO: 14.52 Nm @ 6500 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Telescópica / Posterior Doble amortiguación Nitrox
FRENOS: Delantero Disco 260 mm / Posterior Disco 230 mm
TANQUE: 15 litros
LLANTAS: Delantera 90 x 90 x 17" / Posterior 120 x 80 x 17"
PESO APROX.: SIN DATO
```

### Pulsar 200 RS
```
MOTOR: 199.5 cc, DTS-i, triple bujía
CAJA DE CAMBIOS: 6 velocidades
POTENCIA MÁXIMA: 24.14 HP @ 9750 RPM
TORQUE MÁXIMO: 18.2 Nm @ 8000 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Telescópica / Posterior Mono amortiguador Nitrox
FRENOS: Delantero Disco 300 mm (ABS) / Posterior Disco 230 mm (ABS)
TANQUE: 13 litros
LLANTAS: Delantera 100 x 80 x 17" / Posterior 130 x 70 x 17"
PESO APROX.: SIN DATO
```

### Pulsar N250 UG
```
ATENCIÓN: estos datos son de la N250 **UG**. El catálogo de mayo no trae la
N250 a secas. Si la moto es la N250 sin UG, PARA y pide la ficha oficial.

MOTOR: 249.07 cc, DTS-i, doble bujía
CAJA DE CAMBIOS: 5 velocidades
POTENCIA MÁXIMA: 24.16 HP @ 8750 RPM
TORQUE MÁXIMO: 21.5 Nm @ 6500 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Telescópica / Posterior Mono amortiguador Nitrox
FRENOS: Delantero Disco 300 mm (ABS) / Posterior Disco 230 mm (ABS)
TANQUE: 14 litros
LLANTAS: Delantera 100 x 80 x 17" / Posterior 130 x 70 x 17"
PESO APROX.: SIN DATO
```

### Pulsar 400 NS
```
MOTOR: 373.27 cc, DOHC, triple bujía
CAJA DE CAMBIOS: 6 velocidades
POTENCIA MÁXIMA: 40 HP @ 8650 RPM
TORQUE MÁXIMO: 35 Nm @ 6500 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Horquillas telescópicas invertidas de 43 mm /
            Posterior Mono amortiguador Nitrox
FRENOS: Delantero Disco 320 mm (ABS) / Posterior Disco 230 mm (ABS)
TANQUE: 3.17 galones
LLANTAS: Delantera 110 x 70 x 17" / Posterior 140 x 70 x 17"
PESO APROX.: SIN DATO
```

### Dominar 250
```
MOTOR: 248.77 cc, DOHC, doble bujía
CAJA DE CAMBIOS: 6 velocidades
POTENCIA MÁXIMA: 26.63 HP @ 8500 RPM
TORQUE MÁXIMO: 23.5 Nm @ 6500 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Barra telescópica invertida / Posterior Mono amortiguador Nitrox
FRENOS: Delantero Disco 300 mm (ABS) / Posterior Disco 230 mm (ABS)
TANQUE: 13 litros
LLANTAS: Delantera 100 x 80 x 17" / Posterior 130 x 70 x 17"
PESO APROX.: SIN DATO
```

### Dominar 400
```
MOTOR: 373.27 cc, DOHC, triple bujía
CAJA DE CAMBIOS: 6 velocidades
POTENCIA MÁXIMA: 39.5 HP @ 8650 RPM
TORQUE MÁXIMO: 35 Nm @ 7000 RPM
SISTEMA DE ARRANQUE: Eléctrico
SUSPENSIÓN: Delantera Barra telescópica invertida / Posterior Mono amortiguador Nitrox
FRENOS: Delantero Disco 320 mm (ABS) / Posterior Disco 230 mm (ABS)
TANQUE: 13 litros
LLANTAS: Delantera 110 x 70 x 17" / Posterior 150 x 60 x 17"
PESO APROX.: SIN DATO
```

### Pulsar N125 FI · Pulsar N160 FI · Pulsar 160 NS UG2 · Pulsar 200 NS UG2

**No se pueden rehacer todavía.** En el catálogo de mayo, la página de estas
cuatro motos trae el recuadro de especificaciones **vacío**: no hay ni una
cifra contra la que contrastar.

Para estas cuatro hay que pedir la ficha oficial a Crosland antes de generar
nada. Ver [solicitud-material-crosland.md](solicitud-material-crosland.md).

---

## Los pesos

Ninguna página del catálogo de mayo indica el peso. Las fichas anteriores
traían pesos (114 kg la CT, 125 kg el Boxer, 193 kg la Dominar 400…) que no
salen de ninguna fuente comprobable.

O se piden a Crosland, o el campo «PESO APROX.» se deja fuera de la lámina.

---

# Las fotografías — qué usar en cada moto

Esto es tan importante como las cifras. En la tanda anterior la IA **confundió
modelos**: entregó una Discover diciendo que era una CT 125, y una CT diciendo
que era una Discover. Por eso aquí no se deja a criterio de nadie.

## La regla que evita el problema de raíz

**Parte de la lámina adjunta y cambia ÚNICAMENTE los números.** Las
fotografías que ya tiene son correctas: la moto es la que toca, el encuadre
está bien y el diseño está aprobado. Si solo se reescribe el bloque de cifras,
es imposible equivocarse de modelo.

Añade esta instrucción al prompt:

```
No generes fotografías nuevas ni sustituyas las que trae la lámina. Conserva
la foto principal, las fotos de colores, las de detalles y las tres vistas
tal y como están. Lo único que reescribes es el bloque FICHA TÉCNICA y, si
hace falta, los nombres de los colores.

Si crees que una fotografía es de otro modelo, PARA y dímelo en vez de
reemplazarla por tu cuenta.
```

## Si hace falta sustituir alguna foto

Estas son las que existen en el proyecto, ya verificadas una a una. Rutas
desde la raíz del repositorio.

**Foto principal (lateral derecha, fondo transparente, alta resolución):**
`assets/catalogo/<slug>/photos/02-lateral.png`

**Fotos de detalle** (para la rejilla DETALLES), en
`assets/catalogo/<slug>/details/`:

| Moto | Detalles disponibles |
|---|---|
| `ct-125` | faro · tablero(detalle-a) · tanque · motor · freno · asiento · escape · suspension-delantera · suspension-trasera · lateral · detalle-b |
| `boxer-bm150x-disc` | tanque · motor · freno · asiento · escape · suspension-delantera · suspension-trasera · lateral · detalle-a · detalle-b |
| `discover-125-st` | faro · tanque · motor · freno · asiento · escape · transmision · suspension-delantera · suspension-trasera · lateral · detalle-a · detalle-b |
| `pulsar-n125-fi` | faro · tanque · motor · freno · asiento · escape · transmision · suspension-delantera · suspension-trasera · lateral · detalle-a · detalle-b |
| `pulsar-200-ns-ug2` | faro · tanque · motor · freno · asiento · escape · transmision · suspension-delantera · suspension-trasera · lateral · detalle-a · detalle-b |
| `pulsar-400-ns` | faro · tanque · motor · freno · asiento · escape · transmision · suspension-delantera · suspension-trasera · lateral · detalle-a · detalle-b |
| `dominar-400` | tanque · motor · freno · asiento · escape · transmision · suspension-delantera · suspension-trasera · lateral · detalle-a · detalle-b |
| `pulsar-n250` | faro · tanque · motor · freno · asiento · escape · transmision · suspension-delantera · lateral · detalle-a · detalle-b |

**Fotos por color** (para la fila COLORES DISPONIBLES), en
`assets/catalogo/<slug>/<color>/portada.webp`:

| Moto | Colores con fotografía |
|---|---|
| `ct-125` | azul-negro · rojo · rojo-negro |
| `boxer-bm150x-disc` | negro · rojo · azul |
| `discover-125-st` | azul-negro · rojo · rojo-negro |
| `pulsar-n125-fi` | verde · rojo · morado |
| `pulsar-200-ns-ug2` | negro · azul · blanco |
| `pulsar-400-ns` | rojo · negro · gris · blanco |
| `dominar-400` | verde · negro |

Las demás motos del catálogo —Pulsar 125 LS, 150R, 180 Neon, 200 RS, N160 FI,
160 NS UG2, Dominar 250 y N250— **no tienen ninguna fotografía en el
proyecto**. Para esas, la única vía es conservar las de su lámina original.

## Qué colores puede mostrar cada ficha

Los nombres salen del catálogo de mayo, que es la misma fuente con la que se
publicaron los colores de la web:

```
CT 125             Azul y negro · Rojo · Rojo y negro
Boxer BM150X Disc  Negro · Rojo · Azul
Discover 125 ST    Azul y negro · Rojo · Rojo y negro
Pulsar N125 FI     Verde · Rojo · Morado
Pulsar 200 NS UG2  Negro · Azul · Blanco
Pulsar 400 NS      Rojo · Negro · Gris · Blanco
Dominar 400        Verde · Negro
```

> **Aviso.** Las láminas anteriores muestran colores que **no** están en esta
> lista: la Dominar 400 aparece con cuatro (añade rojo y gris mate) cuando el
> catálogo le da dos; la Pulsar 400 NS cambia el gris por un azul. Las dos
> fuentes no coinciden, y **cuál manda es una decisión del propietario**.
>
> Mientras no se resuelva, la instrucción es: si la lámina muestra un color
> que no está en la lista de arriba, **quita ese recuadro y dilo en el
> informe**. No se inventa un color, pero tampoco se borra uno real sin
> avisar.
