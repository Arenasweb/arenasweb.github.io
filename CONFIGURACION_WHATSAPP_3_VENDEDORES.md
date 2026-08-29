# Tres vendedores, un solo número

Guía de configuración de WhatsApp Business para ARENAS MOTOCICLETAS.

**Nada de lo que hay en este documento se hace desde el código.** La web ya
está lista: todos los botones «Lo quiero» abren un chat con el número
comercial. Lo que falta es que ese número lo puedan atender tres personas,
y eso se contrata y se configura dentro de la aplicación WhatsApp Business,
a mano, desde el teléfono. Ningún cambio en el repositorio lo consigue.

---

## Qué hace la web y qué no

| La web | WhatsApp Business |
|---|---|
| Abre `wa.me` con el modelo y el color escritos | Recibe el mensaje |
| Usa **un** número, el mismo siempre | Reparte la atención entre los agentes |
| No guarda datos del cliente | Guarda el historial de la conversación |
| No decide quién atiende | Iris, Néstor o Taty se asignan el chat |

El cliente pulsa «Lo quiero», WhatsApp se abre con el mensaje ya redactado,
y **él** pulsa «Enviar» desde su propia cuenta. La web nunca envía nada ni
pide su teléfono: ya lo trae consigo al escribir.

---

## El número

La cuenta comercial es **la línea de Iris**, registrada en
`data/configuracion.json` → `whatsapp`. Es el único número del proyecto y
debe seguir siéndolo.

Néstor y Taty **no** aportan un segundo número: se conectan como
dispositivos vinculados a esa misma cuenta.

> **Por qué un solo número.** El sitio llegó a repartir las consultas al
> azar entre las tres líneas. Cada cliente caía en un chat privado, y los
> otros dos asesores no veían nada de esa conversación. Quien volvía a
> escribir a los dos días encontraba a alguien que no sabía de qué le
> hablaba, y una ausencia dejaba a su cliente sin nadie que pudiera
> continuar. Con una sola cuenta multiagente el cliente escribe siempre al
> mismo sitio y los tres ven lo mismo.

---

## Pasos

### 1. Contratar el plan

Dentro de WhatsApp Business, en el teléfono que tiene la línea de Iris:

**Ajustes → Herramientas para la empresa → Suscripciones**

Elegir un plan que incluya **función multiagente** (Meta Verified o Meta
One, según lo que ofrezca Perú en ese momento). El pago es una suscripción
mensual y se hace ahí, con tarjeta o con la tienda de aplicaciones.

Sin plan de pago, WhatsApp Business admite dispositivos vinculados pero
**no** el reparto de conversaciones entre agentes.

### 2. Mantener el mismo número

Al contratar, **no** cambiar de número ni registrar uno nuevo. Si el número
comercial cambiara alguna vez, hay que actualizarlo en
`data/configuracion.json` → `whatsapp` **y en ningún otro sitio**: es la
única fuente del proyecto. Todo lo demás lo lee de ahí.

### 3. Vincular los tres dispositivos

**Ajustes → Dispositivos vinculados → Vincular un dispositivo**

Se genera un código QR en el teléfono de Iris y lo escanea el teléfono de
Néstor. Se repite para Taty.

El QR **no se guarda en el repositorio ni se comparte por escrito**: caduca
en segundos y quien lo capture entra en la cuenta.

### 4. Nombrar cada dispositivo

En la misma pantalla, poner nombre a cada uno: *Iris*, *Néstor*, *Taty*. Un
listado de «Android · Chrome · hace 2 h» no dice quién es quién cuando hay
que retirar el acceso de alguien con prisa.

### 5. Asignar conversaciones

Con el plan activo, cada chat nuevo se puede **asignar a un agente**. La
regla de trabajo, más importante que la función: **quien contesta primero,
se asigna**. Un chat sin dueño es un chat que todos creen que está
atendiendo otro.

### 6. Comprobar que los tres ven lo mismo

Antes de darlo por bueno, una prueba de verdad: escribir desde un teléfono
que no sea de los tres y confirmar que la consulta aparece en los tres
dispositivos, y que la respuesta de uno la ven los otros dos.

Si solo la ve uno, el multiagente no está activo: revisar el paso 1.

### 7. Cubrir una ausencia

Si el asignado no está, otro **reasigna el chat a su nombre** y continúa en
la misma conversación, con todo el historial delante. No se abre un chat
nuevo ni se pide al cliente que repita lo que ya contó.

### 8. Retirar un acceso

**Ajustes → Dispositivos vinculados → [el dispositivo] → Cerrar sesión**

Es inmediato. Se hace el mismo día en que alguien deja el equipo, y el
historial se queda en la cuenta de la empresa, que es donde tiene que
estar.

---

## Etiquetas

Las mismas seis para los tres. Una etiqueta que cada uno interpreta a su
manera no ordena nada.

**Ajustes → Herramientas para la empresa → Etiquetas**

| Etiqueta | Cuándo se pone |
|---|---|
| `NUEVO` | Entra la consulta y nadie la ha tocado |
| `EN ATENCIÓN` | Alguien se la asignó y está respondiendo |
| `COTIZACIÓN` | Se le pasó precio o condiciones |
| `SEGUIMIENTO` | Quedó en pensárselo; hay que volver |
| `VENTA CERRADA` | Compró |
| `NO INTERESADO` | Dijo que no, o dejó de responder |

Un chat lleva **una** etiqueta a la vez: es el estado en que está, no una
lista de lo que le ha pasado.

---

## El código de consulta

Cada mensaje llega con un código corto — `ARN-K3F9`, por ejemplo. No
identifica a nadie: sirve para que el cliente y el asesor se refieran a la
misma consulta por teléfono sin buscar por nombre.

---

## Lo que este proyecto NO usa

Si alguien propone alguna de estas cosas, no hace falta y añade riesgo:

- **API de WhatsApp Cloud / Business Platform** — para tres vendedores en
  una tienda, es montar un servidor para abrir una puerta.
- **OpenWA o cualquier librería no oficial** — usa la cuenta por vías que
  Meta no autoriza y expone el número a un bloqueo.
- **Un backend propio** — el sitio es estático, en GitHub Pages, y así se
  queda.
- **Un CRM a medida** — las etiquetas de WhatsApp Business ya hacen este
  trabajo.
- **Tres números o reparto automático** — es exactamente el problema del
  que se viene.

## Lo que nadie debe pedir por escrito

No se guardan en el repositorio, ni se mandan por chat o correo, ni se
piden en una llamada:

- la contraseña o el PIN de verificación en dos pasos de la cuenta
- el código de verificación por SMS
- una captura del código QR de vinculación
- tokens de Meta o claves de API
- datos de la tarjeta con la que se paga la suscripción
- credenciales de Facebook

La web pública solo necesita el número comercial, que ya es público por
definición: es el que se anuncia.

---

## Comprobar que la web sigue bien

```
node scripts/qa-whatsapp.mjs     # construye y revisa los enlaces de los 8 modelos
node scripts/qa-tests.mjs        # incluye las pruebas del canal de ventas
```

Ninguno de los dos envía mensajes: construyen la URL, la descomponen y la
miran.
