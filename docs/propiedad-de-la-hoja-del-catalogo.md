# De quién es la hoja del catálogo, y por qué se queda así

Comprobado el **3 de setiembre de 2026** con los permisos del archivo.

    CATÁLOGO WEB ARENAS — PRODUCCIÓN
    id     : 1gzn3fHMXma_4Jt_ZBqFAAJMfKZuOL-PDRidel2BeK9Y
    dueño  : luisalvador1977@gmail.com   (único «owner»)

La hoja que alimenta todo el catálogo **no pertenece a ninguna cuenta de
ARENAS**. Se comparte con `aarenasjesi533@gmail.com`, que es la cuenta
donde viven los SOP de ventas, pero la propiedad es de un tercero.

## Es una decisión, no un descuido

Se planteó pedir la transferencia de propiedad y **se decidió dejarlo
como está**. Queda escrito aquí para que dentro de un año nadie lo
descubra y crea que se olvidó.

Lo importante es entender qué se acepta al aceptarlo.

## Qué pasaría si se pierde ese acceso

- No se podría **editar** el catálogo: ni precios, ni fotos, ni publicar
  un modelo nuevo.
- Probablemente caería también el **endpoint**, porque el Apps Script que
  publica el JSON va pegado a esa hoja y por tanto es del mismo dueño.
- La web **no se caería**. Serviría el respaldo local y seguiría
  mostrando los modelos tal como estaban en la última sincronización.
  Quedaría congelada, no en blanco.

Esa última línea es la que convierte el riesgo en algo asumible. Y
depende por completo de que el respaldo local esté fresco.

## Lo que hay que hacer, entonces

```
node scripts/sincronizar-respaldo.mjs
```

Cada vez que se cambie algo importante en la hoja. Cuanto más reciente
sea el respaldo, menos se pierde el día que falle el acceso.

El script no sobrescribe a lo tonto: se niega a escribir si la respuesta
llega vacía o si el catálogo cae más de la mitad, para que un fallo
pasajero del endpoint no borre el respaldo bueno. Para forzarlo hace
falta `--aun-asi`, y hay que tener una razón.

**Última sincronización comprobada:** 3 de setiembre de 2026 — 8 modelos
publicables, idénticos a los que servía el endpoint, más 14 borradores
conservados para previsualización.

## Si algún día se decide lo contrario

La transferencia la hace **solo el dueño**, desde la propia hoja:

    Compartir → junto al correo de destino → «Transferir propiedad»

Es gratis e inmediato, y quien transfiere puede conservar acceso de
edición. Nadie más puede hacerlo: ni un administrador, ni una cuenta con
permiso de edición, ni ninguna herramienta. Es una regla de Google.

Después habría que comprobar de quién es el Apps Script. Si está pegado a
la hoja, la transferencia se lo lleva con ella. Si es un proyecto
independiente, hay que transferirlo aparte.
