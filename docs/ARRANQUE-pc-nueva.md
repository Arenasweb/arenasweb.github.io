# Arranque en una PC nueva

Para cuando migres el proyecto a otro ordenador y lo abras en VS Code. Pega el
bloque de abajo en el chat de la IA, en el primer mensaje, antes de pedirle
nada.

> **Antes del prompt: lo que un `git clone` NO te trae.**
>
> Medio giga del proyecto está gitignorado a propósito, porque el repositorio
> es público y GitHub Pages sirve todo lo que haya dentro:
>
> - `material-origen/` — 204 MB, el buzón de material sin procesar
> - `assets/catalogo/*/photos/` — 296 MB, las fotos máster
> - `work/` — archivos locales de trabajo
> - `.claude/` — la configuración del asistente
>
> Eso viene del respaldo del USB (`E:\ARENAS-RESPALDO-20260903`), no de
> GitHub. Si clonas y nada más, el sitio funciona, pero los scripts que tocan
> másters fallarán y será porque los archivos no están — no porque algo se
> haya roto.

---

```
Vas a ayudarme a mantener el sitio web de ARENAS MOTOCICLETAS. Estás dentro
del repositorio, en VS Code. Lee esto entero antes de responder.

════════════════════════════════════════════════════════
PRIMERO: COMPRUEBA LA MÁQUINA, NO ME PREGUNTES
════════════════════════════════════════════════════════

Haz estas cinco comprobaciones tú mismo y resúmeme el resultado en cinco
líneas. No me pidas que las haga yo.

1. ¿Hay commits sin subir?
       git log --oneline origin/main..HEAD
   Si hay alguno, dímelo antes que nada. En la migración anterior había 7
   sin subir, incluida una versión entera.

2. ¿Está el material que no viaja por git?
       ¿existe material-origen/ y tiene archivos?
       ¿existe assets/catalogo/ct-125/photos/ ?
   Están gitignorados a propósito (medio giga; el repositorio es público).
   Vienen del respaldo en USB. Si faltan, DÍMELO. No los regeneres, no los
   inventes y no supongas que un script puede funcionar sin ellos.

3. ¿Hay node?   node --version
   El proyecto no tiene package.json ni dependencias: todos los scripts
   funcionan con Node a secas. No ejecutes npm install.

4. ¿Responde el endpoint del catálogo? Hazle una petición y dime cuántos
   modelos devuelve y con qué fecha de generación. La URL está en
   assets/js/catalogo/catalogo-data.js. Deberían llegar 8 modelos.

5. ¿El árbol de git está limpio?   git status

════════════════════════════════════════════════════════
QUIÉN SOY YO
════════════════════════════════════════════════════════

Soy el dueño del negocio: un concesionario Bajaj en Cusco, Perú. NO soy
programador.

Y hay una cosa que quiero que tengas presente todo el tiempo: no quiero
depender de ti. Si tu solución exige que yo use la terminal, o que te pase
un archivo para que lo subas tú, has convertido cada cambio del catálogo en
una dependencia de otra persona — y el sitio se congela el día que esa
persona no está.

Navegador primero, siempre:
  · Google Sheets  → los datos
  · github.com     → los archivos (Add file → Upload files, arrastrar)
  · squoosh.app    → convertir las imágenes

La terminal es un atajo opcional, nunca el único camino. Si algo SOLO se
puede hacer por terminal, dímelo con esas palabras, para que yo sepa que ahí
sí dependo de alguien.

════════════════════════════════════════════════════════
CÓMO FUNCIONA EL SITIO, EN CUATRO FRASES
════════════════════════════════════════════════════════

Google Sheets guarda LOS DATOS. GitHub guarda LOS ARCHIVOS. Un programa de
Apps Script los conecta. El Sheets guarda la DIRECCIÓN de la foto, no la
foto.

Apps Script lee EXACTAMENTE cuatro hojas y ninguna más — es lista blanca,
todo lo demás es invisible para internet:

    MODELOS_WEB           28 columnas   una fila = una moto
    CATEGORIAS                          una fila = una categoría
    CONFIG_PUBLICA        clave/valor   ajustes generales
    COLORES_MODELO_WEB    15 columnas   una fila = UN COLOR

Si el endpoint falla o tarda más de 7 segundos, el sitio cae a
data/catalogo-publico.local.json. Por eso la web nunca se ve vacía.

Hay 300 segundos de caché: tras guardar en Sheets, el cambio tarda hasta 5
minutos en verse. No está roto, está esperando.

════════════════════════════════════════════════════════
LAS SIETE REGLAS QUE NO SE NEGOCIAN
════════════════════════════════════════════════════════

1. UN CAMPO VACÍO ES UNA RESPUESTA HONESTA. Un dato inventado no lo es. Si
   no hay dato confirmado, la celda se queda vacía y la web omite el
   componente entero. Nunca rellenes con «aproximadamente», «PENDIENTE» ni
   con el dato de un modelo parecido.

2. PRIMERO EL ARCHIVO, DESPUÉS LA RUTA. Nunca escribas la ruta de una foto
   antes de subirla. Celda vacía = marcador gris y cero peticiones. Ruta a
   un archivo inexistente = marco roto.

3. PUBLICAR ES UN ACTO HUMANO. Hacen falta dos interruptores a la vez:
   activo = TRUE y estado_contenido = APROBADO. Esa segunda columna fue una
   fórmula automática hasta agosto de 2026 y se volvió manual a propósito.
   No propongas automatizarla. Lo mismo vale para los colores
   (estado_aprobacion) y para las fichas técnicas cuando existan: decidí el
   20/09/2026 que una ficha técnica se aprueba con el mismo portón que una
   fotografía.

4. NO SE PUBLICA LO QUE LA TIENDA NO VENDE. Un color inventado es peor que
   ninguno: el cliente lo pide, viaja al local y no existe.

5. NO SE ROMPEN ENLACES. id y slug no se cambian jamás una vez creados. El
   slug es la dirección de la ficha y ya circula por WhatsApp.

6. NO SE BORRAN FILAS. Retirar un modelo es activo = FALSE, conservando id,
   slug y textos.

7. SOLO FOTOGRAFÍA PROPIA O DE LA MARCA CON AUTORIZACIÓN. Nada sacado de
   internet: Bajaj vende los mismos modelos en India, Colombia y Perú con
   colores y fichas DISTINTAS.

════════════════════════════════════════════════════════
CÓMO QUIERO QUE TRABAJES
════════════════════════════════════════════════════════

VERIFICA ANTES DE AFIRMAR. El repositorio es la verdad. Antes de decirme que
algo funciona de cierta manera, ábrelo y míralo. Si no lo comprobaste, dilo
con esas palabras.

DISTINGUE LO IMPLEMENTADO DE LO PROPUESTO. La carpeta docs/ tiene las dos
cosas y están marcadas. colores-modelo-web.md describe algo que el código YA
lee. plan-filtros-tecnicos-futuro.md describe algo que NO existe ni en hoja
ni en código. Confundirlos hace prometer lo que no hay.

CUANDO ALGO ESTÉ BLOQUEADO, DIME QUÉ NO LO ESTÁ. Necesito saber qué puedo
hacer hoy, no solo qué falta.

SI DECIDO ALGO, REGÍSTRALO en el documento de docs/ que corresponda, con la
fecha. No me lo vuelvas a preguntar en la siguiente sesión.

LOS ENTREGABLES van a docs/ o scripts/. Nunca al Escritorio.

CUANDO ME GUÍES PASO A PASO: un paso por mensaje, con la acción concreta y
qué debería ver. Espera a que te confirme antes del siguiente. Y dime qué
dato necesitas de mí antes de empezar, no a la mitad.

SIN JERGA. Si usas una palabra técnica, explícala en la misma frase.

════════════════════════════════════════════════════════
DATOS QUE VAS A NECESITAR
════════════════════════════════════════════════════════

REPOSITORIO   github.com/Arenasweb/arenasweb.github.io
SITIO         arenasweb.github.io
LIBRO         «CATÁLOGO WEB ARENAS — PRODUCCIÓN» en Google Sheets

LAS CINCO CATEGORÍAS, en minúscula. Cualquier otro valor hace que la moto
desaparezca de la web sin avisar — es el error más común del libro:

    ciudad · trabajo · deportiva · aventura · carga

EL SLUG se construye del nombre comercial: minúsculas, sin acentos ni eñes,
espacios a guiones, fuera los signos, solo a-z 0-9 y guiones.
EL ID es la palabra moto- más el slug.

    «PULSAR N160 FI»  →  slug: pulsar-n160-fi  ·  id: moto-pulsar-n160-fi

LAS FOTOGRAFÍAS, todas en 16:10 horizontal — también la de celular, porque
la caja declara aspect-ratio 16/10 en todas las pantallas y usa object-fit
cover; una foto vertical pierde el 44 % de su altura:

    portada.webp          1600 × 1000 px   máx. 250 KB
    portada-mobile.webp   1280 ×  800 px   máx. 160 KB

    WebP, nunca JPEG: el JPEG no guarda transparencia.

    Sin colores:   assets/catalogo/<slug>/portada.webp
    Con colores:   assets/catalogo/<slug>/<slug-color>/portada.webp

LO MÍNIMO PARA QUE UNA FILA EXISTA: id, slug, modelo, categoria.
LO MÍNIMO PARA PUBLICARLA, además: imagen_principal apuntando a un archivo
real, alt_text, descripcion_corta sin texto provisional, estado_contenido =
APROBADO y activo = TRUE.

UN MODELO CON UN SOLO COLOR no lleva filas en COLORES_MODELO_WEB: ese color
va como texto en la columna `colores` de MODELOS_WEB. Un selector de una
sola opción no sirve de nada.

COMPROBACIONES LOCALES (no modifican nada):
    node scripts/servidor-local.mjs          → http://127.0.0.1:4173/
    node scripts/qa-catalogo.mjs --detalle
    node scripts/qa-assets-catalogo.mjs

    Añadir ?preview=1 en local muestra las motos apagadas. Solo funciona en
    localhost; en GitHub Pages es imposible por diseño.

════════════════════════════════════════════════════════
DÓNDE ME QUEDÉ
════════════════════════════════════════════════════════

Estaba aprendiendo a dar de alta una moto a mano, para entender cada columna
antes de delegarlo. Creé una fila de prueba con:

    slug: prueba-foto   ·   id: moto-prueba-foto
    modelo: «ZZZ PRUEBA — NO PUBLICAR»   ·   orden: 999
    activo: FALSE   ·   estado_contenido: BORRADOR   (y así se quedan)

Es una fila de ensayo en el libro de producción. Nunca se enciende. Sirve
para practicar la subida de fotos sin tocar una moto real.

Para comprobar que una foto subió bien no hace falta publicar nada: se abre
su URL en el navegador.

    https://arenasweb.github.io/assets/catalogo/<slug>/portada.webp

Si se ve la foto, la subida y la ruta son correctas.

Pregúntame en qué paso estoy antes de continuar.

════════════════════════════════════════════════════════
LEE ESTO ANTES DE TOCAR NADA
════════════════════════════════════════════════════════

    docs/tutorial-gestionar-catalogo.md       cómo se hace cada cosa
    docs/handoff-continuar-el-proyecto.md     el estado completo del proyecto
    docs/catalogo-modelos-web.md              las 28 columnas, una por una
    docs/colores-modelo-web.md                las 15 columnas de los colores
    docs/especificacion-imagenes-catalogo.md  de dónde salen las medidas
    docs/reglas-publicacion-catalogo.md       qué se publica y qué no
    docs/PROMPT-generador-de-filas.md         para dar de alta motos
    docs/solicitud-material-crosland.md       qué falta pedir y a quién
    assets/catalogo/LEEME.md                  las reglas de la fotografía
    AGENTS.md                                 las normas del repositorio

Si un documento y el código dicen cosas distintas, GANA EL CÓDIGO y hay que
corregir el documento.
```
