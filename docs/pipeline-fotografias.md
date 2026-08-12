# Qué pasa cuando llega una fotografía

Recorrido completo desde que alguien envía una foto hasta que se ve publicada.
Escrito para que el día que lleguen las 22 no haya que improvisar nada.

**Ninguno de estos pasos borra ni sobrescribe nada automáticamente.**

---

## El recorrido

```
1  RECIBIR          → se guarda el original fuera del repositorio
2  IDENTIFICAR      → ¿de qué modelo es exactamente?
3  VERIFICAR MODELO → ¿es ese modelo y no uno parecido?
4  VERIFICAR MEDIDA → 1600×1000 (16:10)
5  VERIFICAR ENCUADRE → moto completa, ruedas enteras, aire alrededor
6  VERIFICAR LIMPIEZA → sin textos, precios ni marcas de agua
7  OPTIMIZAR        → WebP, por debajo de 250 KB
8  NOMBRAR          → portada.webp / portada-mobile.webp / galeria-0N.webp
9  UBICAR           → assets/catalogo/{slug}/
10 ESCRIBIR RUTA    → imagen_principal en MODELOS_WEB
11 QA               → node scripts/qa-assets-catalogo.mjs
12 PREVISUALIZAR    → catalogo.html?preview=1 y la ficha
13 AJUSTAR ENCUADRE → foco_imagen si algo queda cortado
14 APROBAR          → estado_contenido = APROBADO
15 PUBLICAR         → activo = TRUE
```

Los pasos 1 a 9 son de material. Del 10 al 15, de la hoja.

### Regla de oro del paso 10

**No se escribe la ruta antes de subir el archivo.** Una ruta que apunta a un
archivo inexistente hace que el navegador lo pida y falle. Con la celda vacía se
dibuja un marcador discreto y **no se pide nada**.

`qa-assets-catalogo.mjs` trata esa situación como **error**, no como aviso.

---

## Paso 3: verificar que es el modelo correcto

El riesgo real no es una foto fea: es una foto **de otra moto**. Hay pares que se
parecen mucho:

| | |
|---|---|
| `Pulsar N250` *(deportiva)* | `Pulsar N250 UG` *(ruta y aventura)* |
| `Torito Fibraser Clásico` | `Torito Fibraser Clásico 2025` |
| `Pulsar 160 NS UG2` | `Pulsar 200 NS UG2` |
| `Pulsar N125 FI` | `Pulsar N160 FI` |

Ante la duda, se pregunta. **Publicar la foto equivocada es peor que no publicar
ninguna**: el visitante compara una moto que no es la que va a comprar.

---

## Pasos 4 a 6: la revisión técnica, automatizada

```bash
node scripts/qa-assets-catalogo.mjs --detalle
```

Lee la cabecera de cada archivo y avisa de:

- proporción distinta de 16:10, con el porcentaje que se recortaría;
- ancho por debajo del recomendado;
- peso por encima del máximo;
- formato que no es WebP;
- nombres con espacios, tildes o mayúsculas — **que impiden referenciar el
  archivo aunque exista**, porque el validador de rutas solo admite
  `[A-Za-z0-9._/-]`;
- archivos subidos que ninguna columna referencia;
- carpetas sin modelo y modelos sin carpeta.

Lo que la herramienta **no** puede juzgar es el paso 5 y el 6: si la moto está
completa, si el encuadre respira y si hay marcas de agua. Eso lo mira una persona.

---

## Consistencia entre fotografías

Que 22 fotos correctas queden bien **juntas** no es automático. El catálogo es una
rejilla: las diferencias entre tarjetas vecinas se ven mucho más que en una foto
aislada.

| Aspecto | Criterio |
|---|---|
| **Escala aparente** | La moto ocupa una proporción parecida del encuadre en todas. Una que llene el marco junto a otra pequeña hace que la segunda parezca de juguete |
| **Aire superior** | Margen parecido por encima del manillar |
| **Orientación** | Elegir un lado y mantenerlo. Mezclar motos mirando a izquierda y derecha genera un zigzag incómodo |
| **Ángulo** | Tres cuartos delantero como norma; el perfil puro, solo si se usa en todas |
| **Altura de cámara** | Aproximadamente a la altura del depósito, constante |
| **Fondo** | Liso o discreto. Fondos con detalle compiten con la moto |
| **Sombra** | Que todas la tengan o ninguna. Media docena flotando entre otras apoyadas se nota |
| **Luz** | Temperatura parecida. Una foto cálida entre frías parece de otro catálogo |

> **Sobre el Torito y el Mototaxi:** son de tres ruedas, mucho más anchos. En una
> caja 16:10 tienden a verse pequeños si se aplica el mismo margen que a una
> moto. Conviene encuadrarlos algo más cerrados para que su **escala aparente**
> se parezca a la del resto.

**No se generan imágenes.** Toda fotografía es propia o entregada por la marca
con autorización.

---

## Texto alternativo

El `alt_text` describe **lo que se ve**, para quien no puede verlo.

**Estructura:** `[modelo] + [vista] + [color si se distingue]`

| | |
|---|---|
| ✅ | `Pulsar 180 Neon de tres cuartos delantero, color negro` |
| ✅ | `Torito Fibraser Clásico de perfil, con la cabina de carga visible` |
| ❌ | `moto`, `foto1`, `IMG_2831` |
| ❌ | `Imagen de la Pulsar 180 Neon` — el lector ya anuncia que es una imagen |
| ❌ | `moto barata Cusco oferta financiamiento` — relleno de palabras clave |
| ❌ | Precios, promociones o disponibilidad: caducan y el `alt` no se revisa |

Sin `alt_text`, la web compone uno con el modelo y la marca. Funciona, pero no
describe la fotografía: solo la nombra.

**No se escribe el `alt` de una foto que todavía no existe.**

---

## Errores de red

Si una ruta apunta a un archivo que no está, la imagen dispara `error` y se
sustituye por el marcador neutro: no queda un icono roto ni un hueco, y **no se
reintenta** — un fallo por imagen, sin bucles. En producción no aparece ningún
mensaje técnico.

Es una red de seguridad, no una excusa para escribir rutas antes de tiempo.

---

## Referencias

- [especificacion-imagenes-catalogo.md](especificacion-imagenes-catalogo.md) — medidas y por qué
- [lotes-carga-22-modelos.md](lotes-carga-22-modelos.md) — en qué orden cargarlas
- [reglas-publicacion-catalogo.md](reglas-publicacion-catalogo.md) — qué hace visible un modelo
- `assets/catalogo/LEEME.md` — recordatorio junto a las carpetas
