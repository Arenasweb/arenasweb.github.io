# Plantilla — sitio de catálogo

Un sitio de catálogo completo, sin datos de ningún negocio. Se genera desde
un proyecto real con `node scripts/generar-plantilla.mjs` y trae el motor
entero: catálogo, ficha por producto, recorrido pieza por pieza, canal de
ventas por WhatsApp con reparto entre asesores, y la suite de pruebas.

**Cero dependencias.** No hay `npm install`, ni build, ni framework. Son
archivos que un navegador abre. Node hace falta solo para las herramientas
de comprobación.

---

## Arrancar

    node scripts/servidor-local.mjs

Y abrir `http://127.0.0.1:4173/`. Debería verse un sitio funcionando con
cuatro productos de ejemplo y recuadros grises donde irán las fotos.

Si abres los `.html` con doble clic **no funciona**: `file://` bloquea
`fetch()` y la política de seguridad. Hay que usar el servidor.

---

## Qué cambiar, en orden

### 1. El nombre y los datos del negocio

`data/configuracion.json`. Está todo en marcadores: `NOMBRE DEL NEGOCIO`,
`PENDIENTE`, `correo@tu-negocio.com`, `5190000000X`.

Los teléfonos de `asesoresVentas` son cinco y distintos entre sí a
propósito: el sitio reparte las consultas por turnos entre ellos. Si pones
el mismo número cinco veces, el reparto deja de existir y no te enteras
hasta que un cliente escriba.

### 2. El logo y las fotos

Todo lo que se ve como un recuadro gris a rayas es un marcador SVG. Los
encontrarás en:

    assets/branding/logo.svg        el logotipo
    assets/hero/                    la imagen grande de portada
    assets/portadas/                una por categoría
    assets/catalogo/<producto>/     portada y detalles de cada producto
    assets/equipo/                  las fotos de los asesores

Sustitúyelos por tus archivos y actualiza la ruta donde se citen. Puedes
usar `.webp`, `.jpg` o `.png`: lo que **no** puedes es dejar un SVG con
nombre `.webp`, porque el navegador se cree la cabecera del servidor y la
imagen no se pinta —sin dar error, que es lo peor.

Los vídeos de `assets/videos/web/` son clips grises de un segundo. Mismo
trato.

### 3. Las categorías

Los **títulos** se cambian en `data/catalogo.json` y ya está.

Los **slugs** (`ciudad`, `trabajo`, `deportiva`, `aventura`, `carga`) son
una taxonomía cerrada: el esquema rechaza cualquier producto cuya categoría
no esté en la lista. Es a propósito —evita que una errata en la hoja de
cálculo publique un producto en una categoría fantasma— pero significa que
para cambiarlos hay que tocar tres sitios a la vez:

    assets/js/catalogo/catalogo-schema.js   -> var CATEGORIAS
    scripts/reglas-catalogo.mjs             -> export const CATEGORIAS
    index.html                              -> los enlaces ?categoria=

### 4. Los productos

Mientras no haya hoja de cálculo, el sitio lee `data/catalogo-publico.local.json`.
Hay cuatro productos de ejemplo con **todos** los campos que exige el
contrato. Cópialos y rellénalos.

Un producto se publica solo si cumple las cinco condiciones a la vez:

    activo             = true
    estado_contenido   = "APROBADO"
    imagen_principal   con una ruta que exista
    alt_text           escrito
    descripcion_corta  escrita

Si falta una, el producto no sale. `node scripts/qa-catalogo.mjs` te dice
cuál falta y en qué fila.

El campo `version` de ese archivo tiene que empezar por el mismo número
mayor que `VERSION` en `catalogo-schema.js`. Si no, el catálogo se queda
vacío sin decir por qué.

### 5. Los textos largos

`data/fichas-editorial.json` alimenta la ficha y el recorrido. Cada razón
de compra apunta a una fotografía que existe y a un dato que está en el
catálogo.

Eso lo comprueba `qa-fichas-editorial.mjs`, y comprueba más: que el texto
mida entre 20 y 60 palabras, y que no uses superlativos vacíos. No es
pedantería. Un número inventado en la web es una promesa que alguien va a
reclamar en el mostrador.

### 6. Conectar una hoja de cálculo (opcional)

La plantilla arranca en modo local. Para leer de Google Sheets:

1. Despliega el backend (no viene en la plantilla; mira
   `docs/catalogo-api-publica.md` para el contrato que debe cumplir).
2. En `assets/js/catalogo/catalogo-data.js`, pon tu URL en
   `appsScriptEndpoint` y cambia `modoDatos` a `"remoto"`.

El respaldo local sigue siendo la red de seguridad: si el endpoint no
responde, el sitio sirve el JSON local en vez de quedarse en blanco.

---

## Comprobar antes de publicar

    node scripts/qa-catalogo.mjs           estructura de los productos
    node scripts/qa-fichas-editorial.mjs   textos y fotos de cada ficha
    node scripts/qa-assets-catalogo.mjs    imágenes que faltan o sobran
    node scripts/qa-whatsapp.mjs           el canal de ventas
    node scripts/qa-animaciones.mjs        que ninguna animación se pase
    node scripts/qa-tests.mjs              la suite completa

### Ocho pruebas fallan a propósito

`qa-tests.mjs` reporta **8 fallos de 713** en la plantilla recién generada.
No están rotas: comprueban el contenido del proyecto del que salió esta
plantilla, no el motor.

    los 22 modelos reales se normalizan
    previsualización: siguen siendo 22
    el catálogo real sigue dando 22 en previsualización
    catálogo real: 22 modelos
    la búsqueda ignora las tildes
    las líneas se derivan del conjunto y se ordenan
    el catálogo está en modo remoto con un endpoint real
    el respaldo conserva los borradores para previsualizar

Las cuatro primeras cuentan productos que aquí no están. Las dos siguientes
usan nombres de productos concretos como ejemplo. La séptima falla porque
la plantilla arranca en local a propósito. La última espera borradores sin
aprobar, que un catálogo de ejemplo no tiene.

Cuando cargues tu contenido, ajústalas a tus cifras o bórralas. **No las
dejes ahí fallando para siempre**: una suite que siempre reporta ocho
fallos es una suite que nadie vuelve a mirar, y el día que falle el noveno
—uno de verdad— no lo va a ver nadie.

---

## Publicar en GitHub Pages

1. Repositorio nuevo llamado `<tu-usuario>.github.io`.
2. `git init`, `git add -A`, `git commit`, `git push`.
3. Settings → Pages → Source: `main`, carpeta raíz.

Sale en `https://<tu-usuario>.github.io` en un par de minutos.

Antes de publicar, busca `tu-usuario` en el proyecto y sustitúyelo: está en
las URL canónicas, en las etiquetas Open Graph y en el `sitemap`.

---

## Lo que NO trae la plantilla

- **El backend de Google Sheets.** Apuntaba a una hoja concreta. El
  contrato que tiene que cumplir está en `docs/catalogo-api-publica.md`.
- **Fotografías.** Ninguna. Todas son marcadores.
- **Los documentos del proyecto original.** Se conservan solo los que la
  suite de pruebas necesita abrir para funcionar.
- **Historial de git.** Empieza limpio.

---

## Sobre la seguridad, para que no la desactives sin querer

Cada página lleva una política de contenido estricta en una etiqueta
`<meta>`, porque GitHub Pages no deja poner cabeceras.

Consecuencia práctica: **no puedes usar `style="..."` en el HTML**, ni
cargar scripts de otro dominio. Si añades una librería externa, la política
la bloqueará en silencio. Es lo que hace que la política valga algo.

El único script en línea permitido está autorizado por su huella SHA-256.
Si lo cambias aunque sea un carácter, deja de ejecutarse: hay que
recalcular la huella y actualizarla en las cuatro páginas.
