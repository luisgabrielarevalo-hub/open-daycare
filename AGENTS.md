<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# open-daycare

Next.js 16.3.4 (App Router) + React 19.2 + Tailwind v4. Fresh `create-next-app` scaffold; the actual product UI is not built yet.

## What this repo is

A daycare (guardería) web app to be implemented from the design prototypes in `references/`.

- `references/pantallas/*.dc.html` — self-contained design mockups (login, feed, niños, perfil-niño, avisos, mi-cuenta, etc.). These are the UI source of truth; match them.
- `references/screenshots/` — PNG renders of those screens.
- The `.dc.html` files render through the generated `references/pantallas/support.js`; do not edit that file.
- UI copy in the mockups is Spanish — keep new user-facing text in Spanish.

## Commands

- `npm run dev` — dev server on :3000
- `npm run build` / `npm run start`
- `npm run lint` — runs `eslint` (flat config via `eslint-config-next`)
- Typecheck: `npx tsc --noEmit` (there is no dedicated script)
- No test runner or test suite is configured.

## Conventions & gotchas

- Next 16 typed routes are on: page/layout props use generated types like `LayoutProps<"/">` / `PageProps<...>` (see `app/layout.tsx`) instead of hand-written prop types.
- Tailwind v4 has no `tailwind.config`; it is wired via `@import "tailwindcss"` in `app/globals.css` and `@tailwindcss/postcss`.
- Import alias `@/*` maps to the repo root.
- `next dev` regenerates the `nextjs-agent-rules` block above; keep it and commit it to leave the tree clean.

## MCPs

- Context7: use it to pull current Next.js/framework docs instead of relying on training data.
- Playwright: screenshots and any Playwright output go in `.playwright-mcp/` (gitignored).

## Spec Driven Development

- /spec Usaremos estabilidad para crear las especificaciones. 
- /spec-impl Usaremos esta habilidad para implementar las especificaciones. 

## Reglas de código

- Usar código limpio, nombres, funciones y variables en inglés
