---
description: Audita accesibilidad WCAG 2.2 AA en los archivos o rutas indicados y corrige lo mínimo necesario.
agent: accessibility-checker
subagent: true
---

Audita la accesibilidad de `$ARGUMENTS`.

Si `$ARGUMENTS` viene vacío, lista `app/`, `components/` y `lib/` y pide al
usuario que indique el archivo, el directorio o la ruta antes de continuar.

Sigue tu flujo completo: mapear el alcance a sus rutas, auditar el código contra
WCAG 2.2 AA, verificarlo en el navegador con Playwright (árbol de accesibilidad,
contraste medido, teclado, foco y overlays), aplicar los arreglos mínimos,
reverificar con `npx tsc --noEmit` y `npm run lint`, y cerrar con el reporte en
español con severidades, `archivo:línea`, evidencia y capturas en
`.playwright-mcp/`.
