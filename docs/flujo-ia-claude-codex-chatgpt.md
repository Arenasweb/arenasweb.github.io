# Flujo de trabajo: Claude Code, Codex y ChatGPT — ARENAS MOTOCICLETAS

**Propósito:** Evitar que los tres agentes se pisen, dupliquen trabajo o tomen decisiones fuera de su rol.  
Ver también: `AGENTS.md` (reglas inviolables y arquitectura técnica).

---

## Qué hace cada agente

### Claude Code (constructor principal — VS Code)
- Construye y modifica HTML, CSS, JS y JSON dentro del repositorio.
- Ejecuta tareas de auditoría inicial, organización de arquitectura y documentación.
- Aplica correcciones que el usuario o Codex aprueben.
- Trabaja directamente en el entorno local del usuario, con acceso a todos los archivos.

### Codex (auditor técnico — GitHub)
- Revisa código ya escrito, no lo escribe desde cero salvo que se le pida explícitamente una corrección puntual.
- Detecta errores, rutas rotas, problemas de seguridad, accesibilidad, SEO y rendimiento.
- Opera principalmente sobre Pull Requests en GitHub, no sobre el entorno local.
- No tiene autoridad para decidir diseño visual ni inventar datos comerciales.

### ChatGPT (dirección estratégica)
- Ayuda a redactar prompts claros para Claude Code y Codex.
- Interpreta los hallazgos de Codex y decide qué se prioriza.
- Aporta criterio de negocio y gerencial (no técnico de bajo nivel).
- No edita código directamente en este flujo — coordina a los otros dos.

---

## Cuándo usar cada uno

| Situación | Agente recomendado |
|-----------|---------------------|
| Construir una sección nueva o modificar HTML/CSS/JS | Claude Code |
| Auditoría completa de un PR antes de mergear a `main` | Codex |
| Decidir si un hallazgo de Codex se corrige ahora o se documenta como pendiente | ChatGPT |
| Redactar un prompt complejo para una nueva fase del proyecto | ChatGPT |
| Revisar seguridad, performance o accesibilidad de código ya escrito | Codex |
| Generar documentación técnica nueva (`docs/`) | Claude Code |
| Resolver una duda de arquitectura general antes de programar | ChatGPT → luego Claude Code ejecuta |

---

## Cómo evitar conflictos entre agentes

1. **Un agente, una tarea activa.** No pedir a Codex que reescriba algo que Claude Code está modificando en la misma sesión.
2. **Cambios grandes en rama separada.** Si Claude Code va a tocar varios archivos a la vez, considerar trabajar en una rama (`feature/...`) y mergear a `main` solo tras revisión.
3. **No mezclar diseño y técnica en el mismo cambio.** Si una corrección de Codex implica tocar diseño visual, separarla en otro PR o consultar primero.
4. **Slots editables primero.** Si el cambio es solo de contenido (textos, números, sedes), debería ir en `data/slots/*.json`, no en el HTML — así Codex no confunde un cambio de copy con un cambio de arquitectura.
5. **Documentar antes de re-decidir.** Si Codex sugiere algo que contradice una decisión ya tomada (ver `docs/checklist-pre-diseno.md` o `AGENTS.md`), no aplicar el cambio sin que ChatGPT o el usuario lo resuelvan primero.

---

## Cómo pedir code review a Codex

1. Asegurarse de que el cambio está commiteado (con autorización del usuario) y subido a una rama o PR en GitHub.
2. Indicarle a Codex el alcance exacto: "Revisa este PR como auditor técnico según `AGENTS.md` y `docs/checklist-codex-review.md`. No rediseñes, no cambies arquitectura sin justificar."
3. Pedir que entregue hallazgos categorizados por severidad (crítico / importante / menor).
4. No pedirle a Codex que apruebe y mergee automáticamente — esa decisión es del usuario.

---

## Cómo trabajar por ramas

```bash
# Crear rama para un cambio aislado
git checkout -b feature/nombre-del-cambio

# Trabajar y confirmar cambios (con autorización del usuario)
git add <archivos específicos>
git commit -m "descripción clara del cambio"

# Subir la rama (solo con autorización explícita)
git push origin feature/nombre-del-cambio

# Crear Pull Request en GitHub para que Codex revise
```

**Reglas:**
- `main` debe mantenerse siempre publicable en GitHub Pages.
- Cambios grandes o experimentales van en rama, no directo a `main`.
- Ningún agente hace `push` sin autorización explícita del usuario en esta sesión.

---

## Qué revisar antes de publicar (antes de mergear a `main`)

- [ ] El PR cumple `.github/PULL_REQUEST_TEMPLATE.md` completo
- [ ] Codex no reportó hallazgos críticos sin resolver
- [ ] No se inventaron datos comerciales, legales o de contacto
- [ ] No se cerraron decisiones de diseño visual sin aprobación
- [ ] El sitio sigue funcionando como estático puro (sin frameworks añadidos)
- [ ] Se probó al menos en una vista de escritorio y una de móvil
- [ ] Se actualizó la documentación relevante en `docs/` si el cambio lo amerita

---

## Resumen visual del flujo

```
ChatGPT (estrategia)
   ↓ define prioridad y prompt
Claude Code (construye)
   ↓ usuario revisa localmente
Commit (con autorización)
   ↓
Pull Request en GitHub
   ↓
Codex (audita) → hallazgos categorizados
   ↓
ChatGPT (interpreta y prioriza)
   ↓
Claude Code (aplica correcciones aprobadas)
   ↓
Usuario aprueba → merge a main (con autorización)
```
