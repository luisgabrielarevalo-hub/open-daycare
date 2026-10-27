<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# open-daycare

Next.js 16.3.4 (App Router) + React 19.2 + Tailwind v4 + Supabase (`@supabase/supabase-js`, `@supabase/ssr`). A daycare (guardería) web app built screen by screen from the design mockups, driven by specs. There are six UI specs (`specs/01`–`06`): the feed, kids directory/profile, auth, and the add-child, link-parent and create-post modals; plus database specs under `specs/database/` (`07`–`08`). Most are `Implementado`; check each spec's `**Estado:**` before assuming.

## What this repo is

A daycare (guardería) web app to be implemented from the design prototypes in `references/`.

- `references/pantallas/*.dc.html` — self-contained design mockups (login, feed, niños, perfil-niño, avisos, mi-cuenta, etc.). These are the UI source of truth; match them.
- `references/screenshots/` — PNG renders of those screens; compare them with Playwright before closing a spec.
- The `.dc.html` files render through the generated `references/pantallas/support.js`; do not edit that file.
- UI copy in the mockups is Spanish — keep new user-facing text in Spanish.

## Structure

- `app/` — routes: `/` (feed), `/kids`, `/kids/[slug]` (child profile), `/auth/login`, `/auth/activate`. Color and font tokens live in `app/globals.css` (`@theme`).
- `components/` — grouped by purpose: `layout/` (AppShell, Sidebar), `feed/` (PostCard, ComposerPrompt, FeedProvider, CreatePostModal/Form), `kids/` (ChildCard, KidsDirectory, child profile pieces, AddChildModal/Form, LinkParentModal/Form), `auth/` (Login/Activate forms and hero), `ui/` (icons).
- `lib/data.ts` — static types (`Post`, `Child`, `StaffProfile`, …) and mock data. Screens still read mock data; Supabase is wired for future persistence.
- `lib/supabase/` — Supabase clients: `client.ts` (browser/client components), `server.ts` (server components, actions, route handlers) and `proxy.ts` (session refresh).
- `proxy.ts` — Next.js 16 Proxy entry point; delegates to `lib/supabase/proxy.ts` and matches app routes.
- `supabase/migrations/` — SQL migrations for the Supabase project (daycares, users, seeds).
- `specs/` — one spec per screen/feature, named `NN-slug.md`; `.spec-config.yml` holds the workflow settings.
- `specs/database/` — database-related specs (`07-daycares-table.md`, `08-users-table.md`) with the same format as UI specs.
- `references/` — the `.dc.html` mockups and their PNG renders; the DB schema reference lives outside the repo (see MCPs).

## Commands

- `npm run dev` — dev server on :3000
- `npm run build` / `npm run start`
- `npm run lint` — runs `eslint` (flat config via `eslint-config-next`)
- Typecheck: `npx tsc --noEmit` (there is no dedicated script)
- No test runner or test suite is configured.

## Conventions & gotchas

- Next 16 typed routes are on: page/layout props use generated types like `LayoutProps<"/">` / `PageProps<...>` (see `app/layout.tsx`) instead of hand-written prop types.
- Tailwind v4 has no `tailwind.config`; it is wired via `@import "tailwindcss"` in `app/globals.css` and `@tailwindcss/postcss`. Design tokens (colors, fonts) live in the `@theme` block.
- Import alias `@/*` maps to the repo root.
- Server components by default; add `"use client"` only for interactive state (modals, forms, feed state). Feed posts are shared through `FeedProvider` in the root layout.
- Modals follow the native `<dialog>` + `showModal()` pattern (focus trap, `Escape`, backdrop close) and reset their form on close.
- UI copy is Spanish and identifiers/code are English. Typography uses Fredoka (`font-display`) and Nunito (`--font-nunito`).
- Next 16 renamed Middleware to Proxy: session refresh lives in the root `proxy.ts` and `lib/supabase/proxy.ts`. Do not add `middleware.ts`.
- Supabase clients: use `createClient` from `lib/supabase/server.ts` in server components/actions/route handlers (`await createClient()`) and from `lib/supabase/client.ts` only in client components. Never use the service-role/secret key in client code.
- On the server, verify identity with `supabase.auth.getClaims()`, not `getSession()`. Cookies and cache headers are handled by the helpers; don't skip the returned response in the proxy.
- Route protection/auth redirects are not implemented: spec 03 explicitly leaves them out. Add them only through a new approved spec.
- `next dev` regenerates the `nextjs-agent-rules` block above; keep it and commit it to leave the tree clean.

## MCPs

- Context7: use it to pull current Next.js/framework docs instead of relying on training data.
- Playwright: screenshots and any Playwright output go in `.playwright-mcp/` (gitignored). Use it to compare screens against `references/pantallas/*.dc.html` and `references/screenshots/`.
- Supabase: MCP tools are available. Load the `supabase` and `supabase-postgres-best-practices` skills (installed under `.agents/skills/`, locked in `skills-lock.json`) before any Supabase or schema work.
- `docs` reference: `../07-DB-Schema/opendaycare-database-schema.md` is the proposed Postgres schema — design only, not applied to a database.

## Spec Driven Development

Work one screen/feature per spec. Specs live in `specs/NN-slug.md`, written in Spanish, with an `**Estado:**` field and a "Criterios de aceptación" checklist (checkboxes are the source of truth for progress).

**Database specs:** any spec related to the database (schema, tables, migrations, RLS, seed data, etc.) goes in `specs/database/` using the same naming and format conventions (`NN-slug.md`, Spanish, `**Estado:**`, acceptance checklist). Applied SQL migrations live in `supabase/migrations/`.

- `/spec` — design the spec section by section.
- `/spec-impl` — implement an approved spec (`Estado: Aprobado`), create/switch to the `spec-NN-slug` branch (`AutoCreateBranch` in `specs/.spec-config.yml`), step by step with diff reviews.
- `/verificar-spec <spec>` — runs the `spec-verifier` subagent (`.opencode/agent/spec-verifier.md`): verifies each criterion with static checks, Context7 (Next.js) and Playwright, applies minimal fixes, and edits only the checkboxes.

## Environment

- `.env` is gitignored; copy `.env.template` and fill it locally.
- Required variables: `SUPABASE_DB_PASSWORD` (migrations/CLI), `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase clients). Never commit or log secrets; the publishable key is the only key allowed in `NEXT_PUBLIC_*`.

## Reglas de código

- Usar código limpio, nombres, funciones y variables en inglés.
- Lo persistido en base de datos va en inglés (enums, tags, códigos); las etiquetas visibles se traducen en la UI al español.
