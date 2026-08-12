# assets/catalogo/ — fotografías del catálogo

Una carpeta por modelo, nombrada con el mismo `slug` que aparece en
`data/catalogo-publico.local.json`.

## Archivos esperados en cada carpeta

| Archivo               | Uso                          | Tamaño          | Relación |
|-----------------------|------------------------------|-----------------|----------|
| `portada.webp`        | Tarjeta y ficha en escritorio| 1600 × 1000 px  | 16:10    |
| `portada-mobile.webp` | Tarjeta y ficha en celular   | 1280 × 800 px   | 16:10    |
| `galeria-01.webp`     | Galería de la ficha          | 1600 × 1000 px  | 16:10    |
| `galeria-02.webp`     | Galería de la ficha          | 1600 × 1000 px  | 16:10    |

> **Todas en 16:10, también la de celular.** Una versión anterior de esta
> tabla pedía `900 × 1000 px` (9:10) para móvil. Era un error: la caja de
> imagen declara `aspect-ratio: 16 / 10` en **todos** los anchos de pantalla
> —no existe ninguna sobreescritura en `@media`— y usa `object-fit: cover`.
> Una imagen 9:10 en esa caja pierde el **44 % de su altura** recortada.
> La versión móvil existe para pesar menos y permitir un encuadre más
> cerrado, no para cambiar de proporción.
> Medidas y razonamiento completos en `docs/especificacion-imagenes-catalogo.md`.

## Reglas

1. **Nada de imágenes inventadas ni de terceros.** Solo fotografía propia o
   material entregado por la marca con autorización de uso.
2. Mientras no exista la fotografía real, el campo correspondiente del JSON
   (`imagen_principal`, `imagen_mobile`, `galeria_1`, `galeria_2`) debe quedar
   **vacío**. El frontend dibuja entonces un marcador gráfico neutro sin
   solicitar ningún archivo, de modo que no se genera ningún 404.
   Poner una ruta a un archivo inexistente sí genera 404: no hacerlo.
3. Al añadir una fotografía, rellenar en el JSON:
   - la ruta relativa completa, p. ej. `assets/catalogo/ct-125/portada.webp`;
   - `alt_text` con una descripción real de lo que se ve;
   - `foco_imagen` si el encuadre necesita otro punto focal
     (`center center` por defecto; admite `50% 30%`, `left top`, etc.).
4. Formato preferente WebP. Si se conserva un JPG de respaldo, no referenciarlo
   desde el JSON: el frontend pide un único archivo por breakpoint.
5. Peso objetivo: menos de 250 KB en escritorio y menos de 160 KB en celular.

Los archivos `.gitkeep` solo existen para que Git conserve las carpetas vacías;
pueden eliminarse en cuanto la carpeta tenga fotografías reales.
