---
description: Soluciona automáticamente errores de estilo (Prettier) y linter (ESLint) en el backend.
---

// turbo-all

1. Ejecutar Prettier para corregir el formato y finales de línea:
   `npx prettier --write "apps/backend/src/**/*.ts"`
2. Ejecutar ESLint con auto-fix para corregir reglas de código:
   `npm run lint --prefix apps/backend -- --fix`
3. Informar al usuario que la limpieza ha terminado.
