# SPEC 07 — Supabase: tabla `daycares`

> **Estado:** Implementado
> **Depende de:** Ninguna (primera spec de base de datos)
> **Fecha:** 2026-10-26
> **Objetivo:** Crear `public.daycares` en Supabase con RLS activo y sembrar las cuatro guarderías iniciales, sin conectar la aplicación.

## Alcance

**In:**

- Crear la carpeta `supabase/migrations/` y dos migraciones: `create_daycares` y `seed_daycares`.
- Aplicar ambas al proyecto remoto con el MCP `apply_migration`, dejando registro en el historial de migraciones de Supabase.
- Crear `public.daycares` con exactamente tres columnas: `id`, `name` y `created_at`.
- Activar Row Level Security en la tabla y no crear políticas.
- Sembrar cuatro filas con `INSERT ... WHERE NOT EXISTS` para que el seed sea idempotente:
  - `Guardería Sala Soles`
  - `Guardería Rayito de Sol`
  - `Guardería Los Girasoles`
  - `Guardería Pequeños Pasos`
- Dejar en el repo el SQL exacto aplicado, con el prefijo de versión que devuelve `list_migrations`, para que el historial remoto y los archivos coincidan.
- Verificar con MCP `list_tables`, `execute_sql` y `get_advisors`.
- Comprobar que ningún archivo de `app/`, `components/` o `lib/` cambia.

**Fuera de alcance (para specs futuras):**

- Los seis enums del documento de esquema (`user_role`, `user_status`, `relationship_type`, `invitation_status`, `post_type`, `child_status`).
- Cualquier otra tabla: `users`, `rooms`, `children`, `parent_children`, `invitations`, `posts`, etc.
- Claves foráneas, trigger sobre `auth.users` o cualquier integración con Supabase Auth.
- Políticas RLS, grants explícitos a `anon` o `authenticated`, o cualquier modelo de permisos.
- Cliente `@supabase/supabase-js`, variables de entorno nuevas o generación de tipos TypeScript.
- Columna `updated_at`, `UNIQUE` en `name`, `slug`, zona horaria, logo, dirección u otros datos de la guardería.
- Un UUID fijo para `Guardería Sala Soles`; el id lo genera Postgres.
- Más filas que las cuatro indicadas, edición o borrado de las mismas.
- Instalar el CLI de Supabase, crear `supabase/config.toml` o levantar un stack local.
- Migración de rollback.
- Cambios en la app, en `lib/data.ts` o en las specs existentes.

## Modelo de datos

```sql
create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;
```

Convenciones:

- Esquema `public` explícito en todas las sentencias.
- Sin columnas adicionales ni restricciones adicionales; el `PRIMARY KEY` crea el único índice.
- RLS activo con cero políticas: toda lectura y escritura vía Data API devuelve cero filas o permiso denegado.
- Los ids son UUID generados por Postgres. Las specs futuras resuelven la guardería por `name`, no por un id fijo.
- El seed usa `VALUES` con los cuatro nombres y `WHERE NOT EXISTS` comparando por `name`.

## Plan de implementación

1. Aplicar la migración `create_daycares` con el MCP `apply_migration`: `CREATE TABLE public.daycares` y `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Verificar con `list_tables` que existen las tres columnas y que RLS está activo.
2. Leer la versión asignada en `list_migrations` y crear `supabase/migrations/<version>_create_daycares.sql` con el SQL exacto aplicado.
3. Aplicar la migración `seed_daycares` con el MCP `apply_migration`: insertar los cuatro nombres con `WHERE NOT EXISTS`. Verificar con `execute_sql` que hay exactamente cuatro filas.
4. Crear `supabase/migrations/<version>_seed_daycares.sql` con el SQL exacto del seed.
5. Ejecutar `get_advisors` de seguridad y performance. Confirmar que el único aviso es el informativo esperado por RLS sin políticas, y comprobar con `git diff` que solo se añadieron `supabase/migrations/` y esta spec.

## Criterios de aceptación

- [x] `public.daycares` existe y tiene exactamente las columnas `id`, `name` y `created_at`, sin otras.
- [x] `id` es `uuid`, `PRIMARY KEY`, con default `gen_random_uuid()`.
- [x] `name` es `text NOT NULL` y no tiene restricción `UNIQUE`.
- [x] `created_at` es `timestamptz NOT NULL` con default `now()`.
- [x] RLS está activo en `public.daycares`.
- [x] La tabla tiene cero políticas RLS.
- [x] Una consulta con `set local role anon` no devuelve filas de `daycares` (cero filas o permiso denegado).
- [x] Una consulta con `set local role authenticated` tampoco devuelve filas.
- [x] El seed deja exactamente cuatro filas: `Guardería Sala Soles`, `Guardería Rayito de Sol`, `Guardería Los Girasoles` y `Guardería Pequeños Pasos`.
- [x] El SQL del seed usa `WHERE NOT EXISTS` por `name` y no contiene UUIDs fijos.
- [x] `list_migrations` muestra las migraciones `create_daycares` y `seed_daycares`.
- [x] Existe un archivo en `supabase/migrations/` por cada migración, con el mismo prefijo de versión y el mismo SQL aplicado.
- [x] `public` no contiene otras tablas además de `daycares`.
- [ ] `get_advisors` no reporta errores de seguridad distintos del aviso informativo esperado por RLS sin políticas. **Pendiente:** además del INFO `rls_enabled_no_policy` esperado, `get_advisors` reporta dos WARN preexistentes por `public.rls_auto_enable()` (`SECURITY DEFINER` ejecutable por `anon` y `authenticated`, ligada al event trigger `ensure_rls`). Es ajena a esta spec y queda fuera de alcance; se abordará en una spec propia de hardenizado de funciones y grants.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] `git diff --stat` no muestra cambios en `app/`, `components/` ni `lib/`.

## Decisiones tomadas y descartadas

- **Sí:** aplicar con el MCP y guardar el SQL en `supabase/migrations/`. El CLI no está instalado, el MCP deja historial y el repo conserva la fuente de verdad.
- **Sí:** nombre de archivo con la versión que asigna Supabase. Evita drift si más adelante se adopta el CLI.
- **Sí:** RLS activo sin políticas. Es el default seguro mientras no exista el modelo de `users` y permisos.
- **Sí:** exactamente las tres columnas del documento de esquema. `updated_at` no aporta nada mientras no exista un flujo de edición.
- **Sí:** sin `UNIQUE` en `name`. El documento no lo exige y el modelo multi-guardería no impide homónimos; la unicidad, si llega, va en su propia spec.
- **Sí:** seed idempotente con `WHERE NOT EXISTS`. Compensa la ausencia de `UNIQUE` en `name` dentro del alcance actual.
- **Sí:** seed en migración separada. Permite recrear el esquema sin datos y mantiene el seed identificable.
- **Sí:** ids generados por Postgres. Evita hardcodear identificadores en migraciones de datos.
- **Sí:** esquema `public` explícito. Deja las sentencias sin ambigüedad ante cambios futuros de `search_path`.
- **No:** crear los enums ahora. Ninguna tabla de esta spec los usa.
- **No:** `users`, claves foráneas o trigger de `auth.users`. Requieren su propia spec de identidad.
- **No:** políticas RLS o grants a `anon`/`authenticated`. El modelo de acceso depende de `users`, que no existe.
- **No:** cliente Supabase, variables de entorno o tipos TS. La app sigue con `lib/data.ts`.
- **No:** CLI de Supabase o stack local. Añade ceremonia sin beneficio para una tabla.
- **No:** migración de rollback. El SQL en repo permite revertir con una migración nueva si hace falta.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El advisor de seguridad marca "RLS sin políticas" | Es el aviso informativo esperado; se resuelve en la spec que defina permisos sobre `users` |
| El seed duplica filas si se ejecuta fuera de la migración | `WHERE NOT EXISTS` por `name`; la unicidad real se decide en otra spec |
| La versión que asigna MCP no coincide con el nombre del archivo en repo | Leer `list_migrations` antes de crear el archivo y usar ese prefijo exacto |
| Aplicar al remoto no tiene rollback automático | El SQL queda versionado; una reversión sería una migración nueva con `DROP TABLE` |
| Adoptar el CLI más adelante detecta drift | Nombres de archivo alineados con el historial remoto y verificación con `list_migrations` |
| Alguien espera leer `daycares` desde la app y recibe cero filas | Intencional: la app no está conectada y no hay políticas hasta la spec de permisos |

## Qué **no** entra en esta spec

- Enums y tablas distintas de `daycares`.
- `users`, `rooms`, `children` o cualquier clave foránea.
- Supabase Auth, trigger de alta de usuario o políticas RLS.
- Cliente Supabase, variables de entorno o tipos TypeScript.
- `updated_at`, `UNIQUE` en `name`, slug u otros datos de la guardería.
- UUID fijo para la guardería principal.
- Más filas de seed, edición o borrado.
- CLI de Supabase, stack local o migración de rollback.
- Cambios en la app o en specs existentes.

Cada punto, si llega, va en su propia spec.
