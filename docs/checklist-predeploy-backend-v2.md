# Checklist pre-despliegue — backend v2

Una pantalla. Para imprimir o tener al lado mientras se despliega.
Procedimiento completo: [runbook-deploy-apps-script-v2.md](runbook-deploy-apps-script-v2.md).

**Estado: DESPLIEGUE Y VALIDACIÓN CERRADOS el 11/08/2026.** Esta lista se
conserva como plantilla para el siguiente despliegue; el registro real está en
[runbook-deploy-apps-script-v2.md](runbook-deploy-apps-script-v2.md).

---

## Antes de abrir Apps Script

```bash
node scripts/qa-predeploy-apps-script.mjs --prohibir="<ID del libro>"
node scripts/qa-predeploy-tests.mjs
node scripts/qa-contrato-remoto.mjs
node scripts/qa-api-catalogo.mjs
node scripts/qa-endpoint-catalogo.mjs
```

- [ ] **PREDEPLOY PASS**
- [ ] Huellas SHA-256 anotadas
- [ ] CMS: 22 en `BORRADOR` · 22 inactivas · 0 aprobadas
- [ ] `CATEGORIAS`: `carga` activa · `touring`/`rural`/`iniciacion` inactivas
- [ ] El respaldo del libro existe
- [ ] Conozco el ID del libro y **no lo he escrito en ningún archivo**

## En el editor

- [ ] Proyecto **limpio** (o el anterior vaciado por completo)
- [ ] `Configuracion.gs` pegado
- [ ] `Nucleo.gs` pegado
- [ ] `Endpoint.gs` pegado
- [ ] `README.md` **NO** pegado
- [ ] Buscar `function doGet` → **1 vez**, en `Endpoint.gs`
- [ ] Buscar `function doPost` → **0 veces**
- [ ] Ningún archivo del paquete anterior

## Script Property

- [ ] `ARENAS_CATALOGO_SPREADSHEET_ID` creada
- [ ] Valor: el ID del libro real
- [ ] Guardada
- [ ] El valor **no** está en Git, ni en una captura, ni en un chat

## Prueba interna

- [ ] `limpiarCache()` se ejecuta **sin excepciones**

## Despliegue

- [ ] Nueva implementación → Aplicación web
- [ ] Ejecutar como: la cuenta **propietaria** del libro
- [ ] Acceso: permite leer **sin iniciar sesión** ← anotar el rótulo real
- [ ] URL `/exec` copiada (no `/dev`)
- [ ] **No** escrita todavía en el repositorio

## Validación desde Node

```bash
node scripts/qa-endpoint-real.mjs --endpoint="…/exec" \
     --prohibir="<ID del libro>" --guardar=respuesta.json
node scripts/qa-contrato-remoto.mjs respuesta.json
```

- [ ] **ENDPOINT PASS**
- [ ] `salud`: `ok:true` · `configurado:true` · `version:"2"`
- [ ] `catalogo`: `ok:true` · `modelos: []` ← **vacío es lo correcto**
- [ ] `categorias: []` · `colores: []`
- [ ] Ningún dato privado en la respuesta
- [ ] Los parámetros hostiles no cambian nada
- [ ] `action` desconocida se rechaza, sin traza
- [ ] El frontend **acepta** la respuesta

## CORS, en un navegador

```bash
python -m http.server 3000
# http://localhost:3000/tests/manual/endpoint-cors-test.html
```

- [ ] Servido por **HTTP**, no `file://`
- [ ] Salud: **CORS OK**
- [ ] Catálogo: **CORS OK**
- [ ] No aparece pantalla de inicio de sesión

## Cierre

- [ ] Fecha, versión y huellas anotadas
- [ ] Rótulos reales de la UI escritos en el runbook
- [ ] `respuesta.json` borrado
- [x] Frontend conectado después, con autorización separada y QA local completo
- [x] QA en producción completado: GitHub Pages publicó `274e728` y pasó 9/9 controles

---

## Se aborta si…

☒ PREDEPLOY FAIL ☒ más de un `doGet` ☒ hay `doPost`
☒ las huellas no coinciden ☒ `configurado:false`
☒ `salud` o `catalogo` no responden JSON ☒ `version` ≠ `2`
☒ **el endpoint devuelve modelos** ☒ se filtra algo privado
☒ CORS bloquea ☒ sale una pantalla de inicio de sesión
☒ hay que tocar el Sheet para que funcione

**Abortar no cuesta nada:** el frontend aplica la cascada
`remoto → local → estado vacío controlado`; ningún fallo del endpoint abre la
puerta de publicación.
