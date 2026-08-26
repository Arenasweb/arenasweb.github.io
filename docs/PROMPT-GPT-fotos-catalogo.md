# Prompt para GPT — cargar las fotografías en Sheets

Las 8 fotografías ya están convertidas y colocadas en el repositorio. Lo que
falta es que la hoja las **apunte**: mientras `imagen_principal` esté vacío, el
sitio no las muestra aunque los archivos existan.

Yo tengo acceso de **solo lectura** a la hoja. No puedo escribir en ella: esta
parte la ejecutas tú o GPT.

---

## ORDEN OBLIGATORIO — no lo cambies

**1.º** Se publican las fotos en producción (rama `feat/animaciones-suaves`
integrada y subida).
**2.º** Recién entonces se rellenan estas celdas en la hoja.

Si se hace al revés y alguien pone `activo = TRUE`, la web pedirá imágenes que
todavía no existen y saldrán rotas ante el cliente. El orden no es una
preferencia: es lo que separa un catálogo con fotos de uno con huecos.

---

## PROMPT — cópialo tal cual a GPT

```
Eres el encargado de contenido de ARENAS MOTOCICLETAS. Trabajas sobre la hoja
MODELOS del catálogo. Vas a rellenar TRES columnas en OCHO filas. Nada más.

REGLA QUE MANDA SOBRE TODAS: no rellenes ninguna celda que no esté en la tabla
de abajo. Si una columna no aparece aquí, se queda como está — vacía si estaba
vacía. Un hueco significa "sin verificar", y es una respuesta honesta. Un dato
inventado no lo es.

Para cada fila, localiza el modelo por su `slug` (NO por el nombre: hay slugs
parecidos). Si un slug de la tabla no existe en la hoja, PARA y avísalo; no
busques el "más parecido".

Escribe exactamente estos valores, copiados carácter por carácter:

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

LO QUE NO DEBES TOCAR, EN NINGUNA FILA:
  · estado_contenido — sigue en BORRADOR. Aprobar es decisión del dueño.
  · activo           — sigue en FALSE. Publicar es decisión del dueño.
  · precio_publico, precio_promocional, mostrar_precios — el catálogo no
    lleva precios; se cotiza por WhatsApp.
  · colores, y cualquier columna de ficha técnica (cilindrada, potencia,
    marchas, peso, tanque…). Están vacías y así se quedan.
  · Las otras 14 filas del catálogo. No tienen fotografía todavía. Dejarlas
    con `imagen_principal` vacío es correcto: así el sitio les pone su marco
    de "fotografía pendiente" en vez de una imagen rota.

COMPROBACIONES ANTES DE DAR POR HECHO EL TRABAJO:
  1. ¿Has modificado exactamente 8 filas y 3 columnas — 24 celdas?
  2. ¿Todas las rutas empiezan por `assets/catalogo/` y terminan en `.webp`?
     Sin barra inicial, sin dominio, sin `https://`. Son rutas relativas.
  3. ¿La carpeta de cada ruta coincide letra por letra con el slug de su fila?
  4. ¿`estado_contenido` y `activo` siguen igual que antes en las 22 filas?

Termina con un recuento: cuántas celdas escribiste y cuáles fueron.
```

---

## Después: los dos pasos que son tuyos, no de GPT

**Aprobar.** Mira las 8 fichas en la web y, si te convencen, cambia
`estado_contenido` a `APROBADO` en esas 8 filas.

**Publicar.** Pon `activo = TRUE` solo en las que quieras que vea el cliente
hoy. Son dos decisiones distintas a propósito: una dice "el contenido está
bien", la otra dice "quiero venderla ahora".

---

## Lo que sigue faltando (para que no se te pase)

- **14 modelos sin fotografía.** Sin foto no hay ficha que valga. Si tienes las
  imágenes de origen, se convierten igual que estas ocho.
- **La reconciliación de agosto** (`PROMPT-GPT-motos-agosto.md`) sigue abierta,
  y dos de sus decisiones son tuyas: si «Pulsar N250» es `pulsar-n250` o
  `pulsar-n250-ug`, y si de verdad se retiran los 5 modelos de carga — porque
  si se retiran los cinco, la categoría «carga y transporte» desaparece entera
  del filtro.
