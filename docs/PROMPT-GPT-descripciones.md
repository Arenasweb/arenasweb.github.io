# Prompt para GPT — cambiar las descripciones de los 8 modelos

Las descripciones actuales son técnicas («Naked de cuarto de litro con motor de
249.1 cc…»). Las nuevas son comerciales. El cambio tiene sentido ahora y no
antes, porque **la ficha ya muestra las cifras aparte**, en su rejilla de datos:
cilindrada, potencia y frenos siguen a la vista aunque la descripción deje de
recitarlas. No se pierde información; se reparte mejor.

Yo tengo la hoja en solo lectura. Esta parte la ejecuta GPT.

## Correspondencia de nombres

Los nombres comerciales no coinciden con los slugs. Estos son los pares
correctos, verificados contra la hoja:

| Nombre comercial | slug en la hoja |
|---|---|
| CT 125 | `ct-125` |
| Boxer X 150 | `boxer-bm150x-disc` |
| Discover 125 ST | `discover-125-st` |
| Pulsar N125 FI | `pulsar-n125-fi` |
| Pulsar NS200 | `pulsar-200-ns-ug2` |
| Pulsar N250 | `pulsar-n250` |
| Pulsar NS400 | `pulsar-400-ns` |
| Dominar 400 | `dominar-400` |

---

## PROMPT — cópialo tal cual

```
Eres el encargado de contenido de ARENAS MOTOCICLETAS. Trabajas sobre la hoja
MODELOS. Vas a cambiar DOS columnas en OCHO filas: descripcion_corta y
descripcion_larga. Nada más.

Localiza cada modelo por su `slug`, NUNCA por el nombre: hay slugs parecidos y
los nombres comerciales no coinciden con ellos. Si un slug no existe en la hoja,
PARA y avísalo; no busques el más parecido.

slug: ct-125
  descripcion_corta: Eficiencia, comodidad y resistencia para moverte todos los días sin complicaciones.
  descripcion_larga: Una motocicleta pensada para quienes buscan movilidad práctica, económica y confiable. Su manejo cómodo y sencillo la convierte en una excelente compañera para el trabajo, los estudios y los recorridos diarios por la ciudad. Una moto funcional para avanzar todos los días.

slug: boxer-bm150x-disc
  descripcion_corta: Hecha para trabajar duro: resistente, cómoda y preparada para acompañarte en cada jornada.
  descripcion_larga: Diseñada para quienes necesitan una motocicleta resistente y confiable para trabajar. Su configuración está orientada a brindar comodidad y seguridad en recorridos urbanos y caminos exigentes. Una verdadera herramienta de trabajo sobre dos ruedas.

slug: discover-125-st
  descripcion_corta: Economía y comodidad en una moto versátil, ideal para tus recorridos diarios.
  descripcion_larga: Una alternativa equilibrada para quienes buscan economía, comodidad y buen desempeño en el uso cotidiano. Su conducción amigable la hace ideal para movilizarse diariamente sin renunciar al estilo. Práctica para la ciudad y preparada para acompañarte todos los días.

slug: pulsar-n125-fi
  descripcion_corta: Diseño moderno, agilidad y tecnología para disfrutar cada recorrido por la ciudad.
  descripcion_larga: Una naked urbana moderna que combina diseño deportivo, agilidad y tecnología. Su personalidad juvenil y dinámica la convierte en una excelente opción para quienes buscan una motocicleta diferente para desplazarse diariamente. Estilo Pulsar desde el primer kilómetro.

slug: pulsar-200-ns-ug2
  descripcion_corta: Potencia deportiva, control y carácter para quienes quieren sentir cada kilómetro.
  descripcion_larga: Una de las motocicletas deportivas más representativas de la familia Pulsar. Su diseño naked, respuesta deportiva y posición de conducción transmiten una sensación de control y carácter tanto en ciudad como en carretera. Creada para quienes disfrutan realmente conducir.

slug: pulsar-n250
  descripcion_corta: Potencia equilibrada, diseño agresivo y tecnología para llevar tu conducción al siguiente nivel.
  descripcion_larga: Una motocicleta que combina potencia, diseño y tecnología en un conjunto equilibrado. Su presencia deportiva y comportamiento versátil permiten disfrutarla tanto en el uso diario como en recorridos de mayor distancia. Más potencia para quienes buscan dar el siguiente paso.

slug: pulsar-400-ns
  descripcion_corta: Máximo carácter Pulsar: potencia, tecnología y presencia para conquistar nuevas rutas.
  descripcion_larga: La evolución de la familia NS lleva el concepto Pulsar a un nivel superior. Su diseño agresivo, presencia imponente y enfoque deportivo están pensados para motociclistas que buscan mayores prestaciones sin perder versatilidad. Una máquina creada para destacar dentro y fuera de la ciudad.

slug: dominar-400
  descripcion_corta: Potencia, estabilidad y comodidad para convertir cada viaje en una verdadera experiencia.
  descripcion_larga: Diseñada para quienes quieren ir más lejos. La Dominar 400 combina potencia, estabilidad y una postura confortable para afrontar recorridos urbanos, carretera y viajes de larga distancia. Una motocicleta preparada para convertir el camino en parte de la aventura.

LO QUE NO DEBES TOCAR:
  · caracteristica_1, caracteristica_2 y caracteristica_3. Son las cifras que
    la web muestra aparte, en la rejilla de datos de la ficha. Si las borras
    creyendo que ahora sobran, la ficha se queda sin cilindrada ni potencia.
  · estado_contenido y activo. Los ocho ya están APROBADO y activo = TRUE.
  · imagen_principal, imagen_mobile y alt_text. Ya están puestos.
  · precios y colores.
  · Las otras 14 filas.

COMPROBACIONES:
  1. ¿Modificaste exactamente 8 filas y 2 columnas — 16 celdas?
  2. ¿Las descripciones cortas caben en una o dos líneas? Ninguna debe pasar de
     unos 110 caracteres: en la tarjeta del catálogo se recortan.
  3. ¿Las tres columnas caracteristica_* siguen exactamente como estaban?
  4. ¿Los ocho siguen en APROBADO y activo = TRUE?

Termina con un recuento de celdas escritas y confirma que las caracteristica_*
no se tocaron.
```

---

## Después

La caché del endpoint es de **300 segundos**. Espera cinco minutos y mira el
catálogo. Luego, para que el respaldo local no quede desfasado:

```bash
node scripts/sincronizar-respaldo.mjs --escribir
git add data/catalogo-publico.local.json
git commit -m "datos: sincronizar respaldo con las descripciones nuevas"
git push
```
