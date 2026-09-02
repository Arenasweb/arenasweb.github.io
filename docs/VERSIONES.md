# Versiones de la web

Cada versión es una etiqueta de git sobre un commit. Sirven para dos
cosas: saber qué había publicado en cada momento y poder volver atrás sin
depender de que alguien se acuerde.

Para leer qué trae una versión, con su explicación completa:

```
git tag -n99 v2.1
```

---

## v2.1 — recorrido pieza por pieza y catálogo con movimiento

Commit `03ab956`.

- Recorrido inmersivo en `explorar.html?slug=`, para las ocho motos
  fotografiadas. Entre 459 y 987 KB por moto, con fotografías que ya
  estaban en el repositorio.
- Los textos del recorrido salen de la ficha editorial, no son una copia.
- La ficha de modelo enlaza el recorrido sola cuando la moto tiene
  fotografía lateral y al menos tres piezas.
- Cinco animaciones en el catálogo y estado de carga con siluetas.
- Servidor estático local (`node scripts/servidor-local.mjs`).

## v2.0 — punto de retorno

Commit `a2ddac9`. Lo que estaba publicado antes de la v2.1: hero RS200,
equipo de ventas con reparto por turnos, sección «cómo llegar», catálogo
sin marcos con iconos vectoriales.

---

## Cómo volver a una versión anterior

Hay dos situaciones y no se resuelven igual.

### Si la v2.1 todavía NO se ha subido

No hay nada que deshacer de cara al público: lo publicado sigue siendo la
v2.0. Basta con no subirla. Para ver el sitio como estaba mientras se
decide:

```
git checkout v2.0        # mirar la v2.0
git checkout main        # volver al trabajo
```

### Si la v2.1 YA está publicada y hay que retirarla

Se publica encima un commit que deshace los cambios. **No se borra
historia**: borrarla dejaría a cualquiera que ya tenga el repositorio con
una copia que no coincide, y en un sitio publicado no se gana nada.

```
git revert --no-commit v2.0..v2.1
git commit -m "revert: se vuelve a la v2.0"
git push origin main
```

GitHub Pages vuelve a construir el sitio en un par de minutos. La v2.1
sigue existiendo como etiqueta, así que se puede recuperar entera más
adelante sin rehacer el trabajo.

### Volver solo una parte

Rara vez hace falta retirarlo todo. Cada cambio de la v2.1 está en su
propio commit, así que se puede quitar uno solo:

```
git log --oneline v2.0..v2.1     # ver los commits, uno por cambio
git revert <hash>                 # quitar solo ese
```

Por ejemplo, retirar las animaciones del catálogo dejando el recorrido, o
al revés.

---

## Antes de publicar una versión nueva

```
node scripts/qa-tests.mjs
node scripts/qa-fichas-editorial.mjs
node scripts/qa-whatsapp.mjs
node scripts/qa-animaciones.mjs
node scripts/servidor-local.mjs     # y mirar el sitio en el navegador
```

Y después de publicar, con el sitio ya en línea:

```
node scripts/qa-produccion.mjs
```
