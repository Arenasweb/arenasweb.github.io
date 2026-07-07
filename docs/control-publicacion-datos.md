# Control de Publicación de Datos — ARENAS MOTOCICLETAS

**Propósito:** Definir, en un solo lugar, qué significa cada estado de aprobación, qué datos no pueden publicarse sin aprobación explícita, y cómo se relaciona la futura pestaña `99_CONTROL` del PANEL WEB ARENAS con su contrato local en `data/slots/control.json`.

**Estado: Google Sheets NO está conectado.** Todo lo descrito aquí opera hoy exclusivamente sobre JSON local. No existe ningún endpoint, ningún `doGet()`, ninguna llamada `fetch()` a una fuente remota.

Última actualización: junio 2026 (corrección de bloqueos detectados por Codex antes de avanzar al endpoint JSON)

---

## Los cuatro estados normalizados

El sitio reconoce **únicamente** estos cuatro valores de `estadoAprobacion`. Cualquier otro valor —incluyendo estados extendidos heredados de sesiones anteriores— se normaliza automáticamente a `pendiente` mediante `normalizarEstadoAprobacion()` en `script.js`.

| Estado | Significado | Efecto en el sitio |
|--------|-------------|---------------------|
| `pendiente` | El dato existe pero no ha sido revisado ni aprobado por gerencia. Es el valor por defecto y el más seguro. | El dato **no se publica como real**. Según el componente: se oculta por completo (sedes, promociones) o se muestra como "Consultar" / "Consultar disponibilidad" (precio, cuota, stock) |
| `aprobado` | Gerencia revisó el dato y autorizó explícitamente su publicación. | El dato se muestra tal como está en el JSON |
| `rechazado` | Gerencia revisó el dato y decidió que **no** debe publicarse, ni siquiera como pendiente (ej. una sede que se confirmó que no existe). | El dato se oculta, igual que `pendiente`, pero con intención explícita registrada — útil para no volver a preguntar por ese dato |
| `oculto` | El dato debe quedar fuera de la vista pública por una razón operativa (ej. promoción vencida, sede cerrada temporalmente), sin que esto sea un rechazo permanente. | El dato se oculta, igual que `pendiente`/`rechazado` |

**Regla central:** de los cuatro estados, **solo `"aprobado"` habilita la publicación.** `pendiente`, `rechazado` y `oculto` producen el mismo resultado visible (el dato no se muestra) — la diferencia entre ellos es de intención y trazabilidad para el equipo, no de comportamiento del sitio.

### Normalización de estados extendidos (legado)

Antes de esta corrección, distintos archivos usaban valores más descriptivos pero no estandarizados:

| Estado extendido (legado) | Se normaliza a |
|----------------------------|-----------------|
| `pendiente-confirmacion-gerencial` | `pendiente` |
| `pendiente-confirmar-existencia` | `pendiente` |
| `pendiente-aprobacion-gerencial` | `pendiente` |
| `confirmado` | `pendiente` *(ya no es un alias válido de "aprobado" — debe pasar a "aprobado" explícitamente)* |
| cualquier valor vacío, mal escrito o no contemplado | `pendiente` |

Estos valores legado **no se reescribieron en los archivos JSON** (no se borra información), pero `script.js` los trata como `pendiente` en cuanto a comportamiento de publicación. Si gerencia aprueba un dato, el campo `estadoAprobacion` debe actualizarse al valor exacto `"aprobado"` — no a ninguna variante extendida.

---

## Qué datos no pueden publicarse sin aprobación

| Dato | Condición para publicarse | Dónde vive la regla |
|------|---------------------------|----------------------|
| Precio de una moto | `precioConfirmado === true` | `crearTarjetaMoto()` en `script.js` |
| Cuota inicial de una moto | `cuotaConfirmada === true` | `crearTarjetaMoto()` en `script.js` |
| Stock de una moto | `stockConfirmado === true` | `crearTarjetaMoto()` en `script.js` |
| Promoción de una moto | `promocionConfirmada === true` **y** `estadoAprobacion` normalizado === `"aprobado"` (ambas condiciones, no basta una sola) | `crearTarjetaMoto()` en `script.js` |
| Una sede (dirección, teléfono, horario) | `estadoAprobacion` normalizado === `"aprobado"` | `renderizarTiendas()` en `script.js` |
| Una promoción del slot `promociones.json` | `visible === true` **y** `estadoAprobacion` normalizado === `"aprobado"` | `validarConsistenciaPromocion()` en `script.js` |
| Número de WhatsApp activo | `data/configuracion.json → whatsappConfirmado === true` | `whatsappConfirmado()` en `script.js` |
| Garantía como beneficio concreto | Ningún texto de garantía específica se publica hoy — todo el copy relacionado fue neutralizado a "consulta condiciones en tienda" / "postventa sujeto a validación del modelo" | `index.html` (texto estático, ver corrección de bloqueos) |
| Financiamiento como servicio con condiciones | Ningún monto, plazo, tasa ni promesa ("sin burocracia", "crédito accesible") se publica hoy — todo el copy fue neutralizado a "por confirmar" / "sujeto a evaluación y aprobación" | `index.html` (texto estático) |
| Horario de atención general | No hay horario fijo visible fuera de las sedes aprobadas — el texto estático del aside de cotización fue neutralizado a "por confirmar" | `index.html` (texto estático) |

---

## Relación entre `99_CONTROL` y `data/slots/control.json`

`99_CONTROL` es el nombre conceptual de la pestaña que, en el futuro PANEL WEB ARENAS (Google Sheets), centralizaría el gobierno de todas las demás pestañas: qué está aprobado, quién lo aprobó, cuándo se revisó por última vez.

`data/slots/control.json` es el **contrato operativo local equivalente**, mientras Sheets no existe:

```json
{
  "modoDatos": "local",
  "googleSheetsConectado": false,
  "appsScriptEndpoint": "",
  "fallbackLocal": true,
  "permitirDatosPendientes": false,
  "mostrarPreciosPendientes": false,
  "mostrarWhatsappPendiente": false,
  "mostrarPromocionesPendientes": false,
  "mostrarGarantiaNoConfirmada": false,
  "mostrarFinanciamientoNoConfirmado": false,
  "ultimaRevisionGerencial": "pendiente"
}
```

| Campo | Función |
|-------|---------|
| `modoDatos` | Declara explícitamente que la fuente activa es `"local"`. Cuando (si) se conecte Sheets, este valor cambiaría a `"remoto"` — no antes |
| `googleSheetsConectado` | Bandera informativa. **No conecta nada por sí sola** — `script.js` no tiene ningún código que reaccione activándose con esta bandera. Si se pone en `true` sin que exista el código de conexión real, `validarSlotsCargados()` lo detecta y registra una advertencia en consola, y el sitio sigue operando en modo local |
| `appsScriptEndpoint` | Reservado para la futura URL del Web App de Apps Script (ver `docs/contrato-datos-google-sheets.md`). Vacío hoy a propósito |
| `fallbackLocal` | Debe permanecer `true` siempre — es el principio rector de todo el contrato de datos: el JSON local nunca deja de funcionar como respaldo |
| `permitirDatosPendientes` | Interruptor maestro (no implementado en el render todavía) pensado para un futuro modo de previsualización/staging. Por defecto `false`: ningún dato pendiente se fuerza a mostrarse |
| `mostrarPreciosPendientes`, `mostrarWhatsappPendiente`, `mostrarPromocionesPendientes`, `mostrarGarantiaNoConfirmada`, `mostrarFinanciamientoNoConfirmado` | Excepciones puntuales por dominio, también reservadas para un futuro modo de previsualización. Ninguna está conectada a la lógica de render actual — existen como parte del contrato para cuando se autorice esa función | 
| `ultimaRevisionGerencial` | Texto libre con la fecha o estado de la última revisión gerencial completa. Valor inicial `"pendiente"` porque todavía no ha ocurrido ninguna |

**Importante:** las banderas `mostrar*` y `permitirDatosPendientes` están definidas en el contrato pero **no están conectadas a ninguna función de render en `script.js`** todavía. Conectarlas (es decir, construir un "modo de previsualización" real) es una decisión de producto que requiere autorización explícita — no se implementó en esta corrección para evitar abrir, sin permiso, una vía que podría usarse para mostrar datos no confirmados.

---

## Cómo se carga `control.json` hoy

`script.js → CONFIG.slotsArchivos` incluye `"control"`, por lo que `cargarSlots()` lo descarga junto con los demás 12 slots y queda disponible en `STATE.slots.control`. `validarSlotsCargados()` valida su forma con `ESQUEMA_CONTROL_SLOT` y advierte en consola si `googleSheetsConectado` está en `true` sin que exista código de conexión real.

---

## Qué significa todo esto para Google Sheets

- Google Sheets **no está conectado**. No existe ningún `doGet()`, ningún Apps Script publicado, ninguna URL configurada.
- `appsScriptEndpoint` en `control.json` está vacío a propósito.
- Cuando se autorice la conexión, el contrato completo de columnas y validación ya está documentado en `docs/contrato-datos-google-sheets.md` — esa conexión seguirá respetando exactamente las mismas reglas de esta página: nada se publica sin `estadoAprobacion === "aprobado"` y los flags de confirmación correspondientes.

---

## Referencias relacionadas

- `docs/contrato-datos-google-sheets.md` — columnas, Apps Script recomendado, reglas que no cambian
- `docs/fuente-unica-datos.md` — qué archivo manda por dominio
- `docs/correcciones-auditoria-codex.md` y `docs/pendientes-produccion.md` — historial de correcciones previas
- `docs/requisitos-pendientes-gerencia.md` — checklist de aprobaciones pendientes
