# OpenDayCare

Web app de guardería (feed diario, directorio y perfil de niños, invitaciones, avisos) construida con Next.js 16 (App Router), React 19, Tailwind CSS v4 y Supabase.

La UI se implementa pantalla por pantalla a partir de los mockups de `references/pantallas/*.dc.html` y de los specs de `specs/`. La copia visible está en español; el código y lo persistido en base de datos, en inglés.

## Stack

| Componente | Tecnología |
|---|---|
| Framework | Next.js 16.3.4 (App Router, typed routes, Proxy en lugar de Middleware) |
| UI | React 19.2 + Tailwind CSS v4 (tokens en `app/globals.css`) |
| Lenguaje | TypeScript 5 |
| Backend / Auth | Supabase (`@supabase/supabase-js` 2.118, `@supabase/ssr` 0.12.7) |
| Emails | Resend |
| Tipografías | Fredoka (`font-display`) y Nunito (`--font-nunito`) |

## Requisitos

- **Node.js >= 20.9** (el proyecto se desarrolla con Node 26; validá con `node -v`).
- **npm** (hay `package-lock.json`).
- Una cuenta de **Supabase** con acceso a la organización del proyecto (te la tiene que dar quien administra la org).
- Opcional: **Supabase CLI** (`npx supabase`) solo si vas a aplicar migraciones desde la terminal.

## Levantar el proyecto

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el archivo de entorno

El repo trae `.env.template`. Copialo y completá los valores:

```powershell
# PowerShell (Windows)
Copy-Item .env.template .env
```

```bash
# bash / zsh
cp .env.template .env
```

`.env` está en `.gitignore`: **no se commitea y no se comparte por chat**.

| Variable | Para qué sirve | Dónde se obtiene |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (`sb_publishable_…`), usada por el navegador y el servidor | Dashboard → Project Settings → API Keys |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base para migraciones / CLI | Dashboard → Project Settings → Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta (`sb_secret_…`) **solo servidor** (`lib/supabase/admin.ts`) | Dashboard → Project Settings → API Keys → Secret keys |
| `RESEND_API_KEY` | Envío de invitaciones por email | Resend → API Keys |
| `NEXT_PUBLIC_APP_URL` | Origen de la app para links de invitación (`http://localhost:3000` en local) | — |

Reglas:

- Solo la clave publishable puede ir en una variable `NEXT_PUBLIC_*`.
- La service role / secret key nunca se usa en componentes cliente ni se expone en el navegador.

### 3. Arrancar el servidor de desarrollo

```bash
npm run dev
```

Abrí <http://localhost:3000>. Rutas principales:

- `/` — feed
- `/kids` — directorio de niños
- `/kids/[slug]` — perfil del niño
- `/auth/login` — login con email y contraseña
- `/auth/activate` — activación de cuenta invitada

### 4. Iniciar sesión

El login usa `supabase.auth.signInWithPassword`, así que necesitás un usuario creado en el proyecto de Supabase:

- El seed `supabase/migrations/20261027191305_seed_demo_user.sql` crea el usuario staff `luisarevalo@google.com`.
- Si no tenés la contraseña, reseteala desde el Dashboard (Authentication → Users) o creá un usuario nuevo.
- La activación de cuentas invitadas se hace desde el link del email que envía Resend (`/auth/activate`).

## Scripts

```bash
npm run dev      # desarrollo en http://localhost:3000
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint (flat config de Next)
npx tsc --noEmit # typecheck (no hay script dedicado)
```

No hay test runner configurado. La verificación de pantallas se hace con Playwright contra `references/screenshots/`.

## Base de datos

- Las migraciones SQL viven en `supabase/migrations/` y se aplican en orden.
- Tablas actuales: `daycares`, `users`, `rooms`, `children`, `invitations`, `parent_children` (+ enums), con RLS y triggers de sincronización con `auth.users`.
- Para aplicarlas:

  **Con el MCP de Supabase (recomendado en este repo):** pedirle al agente que aplique la migración con la herramienta `apply_migration`, o pegarla en el SQL Editor del Dashboard.

  **Con la CLI:**

  ```bash
  npx supabase login
  npx supabase link --project-ref ctephacymeahjbeomqkr
  npx supabase db push
  ```

## Supabase MCP (OpenCode)

El repo trae el servidor MCP remoto configurado en `opencode.json`:

```json
{
  "mcp": {
    "servers": {
      "supabase": {
        "type": "remote",
        "url": "https://mcp.supabase.com/mcp?project_ref=ctephacymeahjbeomqkr&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cfeedback"
      }
    }
  }
}
```

### ID del proyecto (project ref)

| Dato | Valor |
|---|---|
| Project ref | `ctephacymeahjbeomqkr` |
| API URL | `https://ctephacymeahjbeomqkr.supabase.co` |
| Dashboard | `https://supabase.com/dashboard/project/ctephacymeahjbeomqkr` |

Ese es el ID que hay que pasarle al equipo: va en el parámetro `project_ref` de la URL del MCP y **limita el servidor a ese proyecto** (desactiva las herramientas de cuenta, así nadie toca otros proyectos de la organización).

### Cómo se autentica

El MCP de Supabase **no usa un token compartido**: usa **OAuth con la cuenta de Supabase de cada persona** (dynamic client registration), y los permisos son los que esa persona tenga en la organización.

Pasos para cada integrante del equipo:

1. Tener una cuenta de Supabase y estar **invitado a la organización** que contiene el proyecto `ctephacymeahjbeomqkr` (Dashboard → Organization → Team). Sin acceso a la org, el OAuth autoriza pero el servidor no ve el proyecto.
2. Abrir OpenCode en la raíz del repo (`opencode`).
3. Ejecutar `/mcps`, elegir el servidor **supabase** y seleccionar la opción de iniciar sesión / autenticar.
4. Se abre el navegador: iniciar sesión en Supabase, **elegir la organización correcta** y autorizar el acceso al cliente MCP.
5. Verificar la conexión: `/mcps` debe mostrar el servidor conectado, o pedirle al agente algo como *"¿qué tablas hay en la base? usá el MCP"*.

Notas:

- Las credenciales OAuth las guarda OpenCode fuera de la configuración del repo; **no se commitean ni se comparten**.
- Si una persona no tiene acceso, o hay que cambiar de cuenta, se repite el flujo desde `/mcps` (revincular / volver a iniciar sesión).
- No hace falta crear un Personal Access Token (PAT) para el uso normal desde OpenCode.

### Alternativa con PAT (solo CI o automatizaciones)

Si el cliente no puede abrir el navegador (por ejemplo CI), se usa un PAT con scope al proyecto en el header `Authorization`:

```jsonc
// ejemplo genérico de configuración MCP
{
  "url": "https://mcp.supabase.com/mcp?project_ref=ctephacymeahjbeomqkr&read_only=true",
  "headers": {
    "Authorization": "Bearer {env:SUPABASE_ACCESS_TOKEN}"
  }
}
```

El token (`sbp_…`) se guarda como variable de entorno o secreto del CI, **nunca** en `opencode.json` ni en el repo.

### Buenas prácticas de seguridad

- El MCP opera con **los permisos del desarrollador**, no con los del usuario final: es una herramienta interna, no se expone a clientes.
- Para datos de producción, sumar `read_only=true` y limitar `features`.
- Revisar cada operación de escritura (`execute_sql`, `apply_migration`) antes de aprobarla; las migraciones se versionan igual en `supabase/migrations/`.
- No pegar secretos ni datos personales en prompts.

## Estructura del proyecto

```
app/                    Rutas (App Router): feed, kids, auth
components/
  layout/               AppShell, Sidebar
  feed/                 PostCard, FeedProvider, CreatePostModal/Form
  kids/                 ChildCard, KidsDirectory, perfil, AddChild*, LinkParent*
  auth/                 Login/Activate, LogoutButton
  ui/                   Íconos
lib/
  data.ts               Tipos y datos mock
  auth/                 Helpers de perfil
  kids/                 Acceso a children/parents
  email/                Resend + templates de invitación
  supabase/             client.ts (browser), server.ts (RSC/actions), admin.ts, proxy.ts
proxy.ts                Entrada de Next 16 (sesión), delega en lib/supabase/proxy.ts
supabase/migrations/    SQL versionado
specs/                  Un spec por pantalla/feature + specs/database/
references/             Mockups .dc.html y screenshots
.agents/skills/         Skills de Supabase instaladas (MCP)
```

Convenciones clave:

- Server Components por defecto; `"use client"` solo para estado interactivo.
- Modales con `<dialog>` nativo + `showModal()`.
- En el servidor, verificar identidad con `supabase.auth.getClaims()` (no `getSession()`).
- Next 16 renombró Middleware a Proxy: la sesión se refresca en `proxy.ts`.

## Spec Driven Development

El trabajo se organiza en specs (`specs/NN-slug.md`, en español, con `**Estado:**` y checklist de criterios de aceptación). Los temas de base de datos van en `specs/database/`.

- `/spec` — diseñar el spec.
- `/spec-impl` — implementar un spec aprobado (`Estado: Aprobado`) en su rama `spec-NN-slug`.
- `/verificar-spec <spec>` — verificar criterios con el subagente `spec-verifier` (checks estáticos, Context7 y Playwright).

Más contexto para agentes: `AGENTS.md`.
