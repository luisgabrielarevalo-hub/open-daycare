---
description: Verifica y corrige los criterios de aceptación de un spec con Context7 y Playwright.
agent: spec-verifier
subtask: true
---

Verifica el spec `$ARGUMENTS`.

Si `$ARGUMENTS` viene vacío, lista los archivos de `specs/` y pídele al usuario
que indique el spec antes de continuar.

Sigue tu flujo completo: localizar el spec, extraer los criterios de aceptación,
verificarlos con comprobaciones estáticas, Context7 (Next.js) y Playwright
(capturas y comparación visual), aplicar las correcciones necesarias,
reverificar y marcar los checks. Cierra con el reporte en español.
