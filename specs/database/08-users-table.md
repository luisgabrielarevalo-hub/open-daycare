# SPEC 08 — Supabase: tabla `users`, enums y usuario demo

> **Estado:** Aprobado
> **Depende de:** SPEC 07 (tabla `public.daycares`, convención de migraciones con MCP y RLS sin políticas)
> **Fecha:** 2026-10-26
> **Objetivo:** Crear `public.users` con los enums `user_role` y `user_status`, sus claves foráneas a `auth.users` y `daycares`, RLS sin políticas y un usuario staff demo con login funcional, sin conectar la aplicación.

## Alcance

**In:**

- Crear tres migraciones en `supabase/migrations/`: `create_user_enums`, `create_users` y `seed_demo_user`.
- Aplicarlas al proyecto remoto con el MCP `apply_migration`, leyendo de `list_migrations` la versión asignada y guardando en el repo el SQL exacto con ese prefijo.
- Crear los enums `public.user_role` (`staff`, `parent`, `admin`) y `public.user_status` (`pending`, `active`).
- Crear `public.users` con exactamente diez columnas: `id`, `daycare_id`, `role`, `status`, `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`, `created_at`, `updated_at`.
- `id` como PK `uuid` con FK a `auth.users(id) ON DELETE CASCADE`.
- `daycare_id` como `uuid NOT NULL` con FK a `public.daycares(id) ON DELETE RESTRICT`.
- `role` y `status` con los enums nuevos; `status` con default `'active'`.
- `full_name` obligatorio; `avatar_url` nullable; los dos booleanos con default `true`; `created_at` y `updated_at` con default `now()`.
- Índice `users_daycare_id_idx` sobre `daycare_id`.
- RLS activo con cero políticas y sin tocar grants de `anon`/`authenticated`.
- Sembrar un usuario demo con login funcional por email y contraseña:
  - UUID fijo `00000000-0000-4000-8000-000000000001`.
  - Email `luisarevalo@google.com`.
  - Perfil `staff`, estado `active`, `full_name` "Luis Arévalo", guardería "Guardería Sala Soles".
  - Fila en `auth.users` con email confirmado, `aud`/`role` `authenticated`, metadatos de alta y contraseña como hash bcrypt fijo.
  - Fila en `auth.identities` con provider `email`, `provider_id` igual al UUID del usuario e `identity_data` con `sub`, `email`, `email_verified` y `phone_verified`.
  - Fila en `public.users` con el mismo UUID y la guardería resuelta por nombre.
  - Seed idempotente por email, UUID y `(provider_id, provider)`.
  - La contraseña demo no se versiona en texto plano; solo el hash bcrypt.
- Verificar con `list_tables`, consultas a `pg_enum`, `information_schema`, `pg_constraint`, `pg_indexes`, `set local role`, `list_migrations` y `get_advisors`.
- Comprobar que `app/`, `components/` y `lib/` no cambian.

**Fuera de alcance (para specs futuras):**

- Trigger `AFTER INSERT` sobre `auth.users`, función `SECURITY DEFINER` y alta automática desde `raw_user_meta_data`.
- Políticas RLS, grants explícitos y modelo de permisos.
- Los otros cuatro enums del documento (`relationship_type`, `invitation_status`, `post_type`, `child_status`).
- Cualquier otra tabla (`rooms`, `children`, `parent_children`, `invitations`, `posts`, etc.).
- Conexión de la app a Supabase, cliente `@supabase/supabase-js`, variables de entorno y tipos TypeScript generados.
- Autenticación real en la UI, login, sesiones, activación o protección de rutas.
- Más usuarios demo, seed de padres o staff adicional, edición o borrado de usuarios.
- Columna `email` en `public.users`; el email vive en `auth.users`.
- Trigger automático de `updated_at`.
- Normalización de etiquetas o tablas de alergias.
- Migración de rollback, CLI de Supabase, `supabase/config.toml` o stack local.
- Cambios en `daycares`, en sus cuatro filas o en las specs existentes.

## Modelo de datos

### Enums

```sql
create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');
```

- Los valores se guardan en inglés, como exige la convención del proyecto.
- Las etiquetas visibles (`Padre`, `Madre`, `Tutor`, etc.) no se guardan en la base de datos.

### Tabla

```sql
create table public.users (
  id uuid primary key
    references auth.users (id) on delete cascade,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null,
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_daycare_id_idx on public.users (daycare_id);

alter table public.users enable row level security;
```

- La tabla tiene exactamente diez columnas; no se añaden `email`, `slug` ni campos de auditoría extra.
- `updated_at` se actualiza desde la aplicación o la futura API; esta spec no crea trigger.
- RLS activo sin políticas: toda lectura o escritura vía Data API devuelve cero filas o permiso denegado.
- No se ejecutan `GRANT` ni `REVOKE`; se conservan los defaults de Supabase.
- El índice sobre `daycare_id` cubre el filtro por guardería; no se añaden índices especulativos.
- `ON DELETE RESTRICT` en `daycares` impide borrar una guardería con usuarios.
- `ON DELETE CASCADE` en `auth.users` elimina el perfil cuando se elimina la identidad de Auth.

### Usuario demo

El seed inserta manualmente las tres filas porque el trigger de alta queda fuera de esta spec. La guardería se resuelve por nombre, nunca por un UUID fijo:

```sql
do $$
begin
  if not exists (
    select 1 from public.daycares where name = 'Guardería Sala Soles'
  ) then
    raise exception 'Falta la guardería Sala Soles; ejecutar seed_daycares';
  end if;
end
$$;

with demo as (
  select
    '00000000-0000-4000-8000-000000000001'::uuid as user_id,
    'luisarevalo@google.com'::text as email,
    'Luis Arévalo'::text as full_name,
    (
      select id
      from public.daycares
      where name = 'Guardería Sala Soles'
      order by created_at, id
      limit 1
    ) as daycare_id,
    '<hash_bcrypt>'::text as password_hash
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  d.user_id,
  'authenticated',
  'authenticated',
  d.email,
  d.password_hash,
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object(
    'full_name', d.full_name,
    'role', 'staff',
    'daycare_id', d.daycare_id
  ),
  now(),
  now()
from demo d
where d.daycare_id is not null
  and not exists (
    select 1 from auth.users u where u.email = d.email
  );
```

```sql
insert into auth.identities (
  user_id, identity_data, provider, provider_id, created_at, updated_at
)
select
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  u.id::text,
  now(),
  now()
from auth.users u
where u.email = 'luisarevalo@google.com'
on conflict (provider_id, provider) do nothing;
```

```sql
insert into public.users (id, daycare_id, role, status, full_name)
select
  u.id,
  (
    select id
    from public.daycares
    where name = 'Guardería Sala Soles'
    order by created_at, id
    limit 1
  ),
  'staff',
  'active',
  'Luis Arévalo'
from auth.users u
where u.email = 'luisarevalo@google.com'
on conflict (id) do nothing;
```

- `<hash_bcrypt>` es un hash bcrypt fijo generado fuera del repositorio; la migración no contiene la contraseña en texto plano ni llama a `crypt()` con ella.
- `auth.identities.id` usa su default `gen_random_uuid()`; no se fija.
- `auth.users.instance_id` usa el UUID de instancia estándar de Supabase (`00000000-0000-0000-0000-000000000000`).
- `confirmed_at` es una columna generada por Supabase a partir de `email_confirmed_at`; no se inserta.
- `is_sso_user` e `is_anonymous` usan sus defaults (`false`).
- Si el email ya existe con otro UUID, el seed no crea un segundo usuario: las filas de identidad y perfil usan el usuario existente.
- El seed es reejecutable: una segunda ejecución deja una sola fila en `auth.users`, `auth.identities` y `public.users`.

## Plan de implementación

1. Aplicar `create_user_enums` con el MCP `apply_migration`: crear `public.user_role` y `public.user_status`. Verificar con una consulta a `pg_enum` que los valores y su orden son los esperados. Leer la versión en `list_migrations` y crear `supabase/migrations/<version>_create_user_enums.sql` con el SQL exacto.
2. Aplicar `create_users` con el MCP: crear la tabla, las dos FKs, el índice y activar RLS. Verificar con `list_tables` las diez columnas, y con `pg_constraint`/`pg_indexes` las FK, defaults, `NOT NULL` y el índice. Guardar `supabase/migrations/<version>_create_users.sql`.
3. Aplicar `seed_demo_user` con el MCP: insertar `auth.users`, `auth.identities` y `public.users` con el UUID fijo y el hash bcrypt. Verificar que hay una fila por tabla, que el email está confirmado, que la identidad es de provider `email` y que el perfil apunta a "Guardería Sala Soles". Verificar el hash bcrypt fuera del repo con la contraseña demo. Guardar `supabase/migrations/<version>_seed_demo_user.sql`.
4. Verificar RLS con `set local role anon` y `set local role authenticated`: ambas consultas devuelven cero filas o permiso denegado. Confirmar que la tabla tiene cero políticas.
5. Ejecutar `get_advisors` de seguridad y performance, `list_migrations`, `npx tsc --noEmit` y `npm run lint`. Comprobar con `git diff --stat` que solo cambiaron `supabase/migrations/` y esta spec, y que `daycares` sigue con cuatro filas.

## Criterios de aceptación

- [ ] `public.user_role` existe con exactamente los valores `staff`, `parent` y `admin`, en ese orden.
- [ ] `public.user_status` existe con exactamente los valores `pending` y `active`, en ese orden.
- [ ] `public.users` existe con exactamente diez columnas: `id`, `daycare_id`, `role`, `status`, `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`, `created_at` y `updated_at`.
- [ ] `id` es `uuid`, `PRIMARY KEY`, con FK a `auth.users(id)` y `ON DELETE CASCADE`.
- [ ] `daycare_id` es `uuid NOT NULL`, con FK a `public.daycares(id)` y `ON DELETE RESTRICT`.
- [ ] `role` es `public.user_role NOT NULL`.
- [ ] `status` es `public.user_status NOT NULL` con default `'active'`.
- [ ] `full_name` es `text NOT NULL`.
- [ ] `avatar_url` es `text` nullable.
- [ ] `notify_on_post` y `daily_summary_enabled` son `boolean NOT NULL` con default `true`.
- [ ] `created_at` y `updated_at` son `timestamptz NOT NULL` con default `now()`.
- [ ] Existe el índice `users_daycare_id_idx` sobre `public.users(daycare_id)` y no hay otros índices añadidos por esta spec.
- [ ] RLS está activo en `public.users` y la tabla tiene cero políticas.
- [ ] Una consulta con `set local role anon` no devuelve filas de `public.users` (cero filas o permiso denegado).
- [ ] Una consulta con `set local role authenticated` tampoco devuelve filas.
- [ ] Las migraciones no contienen `GRANT` ni `REVOKE` sobre `public.users`.
- [ ] El seed crea exactamente una fila en `auth.users` con email `luisarevalo@google.com`, id `00000000-0000-4000-8000-000000000001`, `email_confirmed_at` no nulo, `aud` y `role` `authenticated`.
- [ ] El seed crea exactamente una fila en `auth.identities` para ese usuario, con provider `email`, `provider_id` igual al UUID del usuario e `identity_data` con `sub`, `email`, `email_verified` y `phone_verified`.
- [ ] El seed crea exactamente una fila en `public.users` con el mismo UUID, `role` `staff`, `status` `active`, `full_name` "Luis Arévalo" y `daycare_id` de "Guardería Sala Soles".
- [ ] `auth.users.encrypted_password` del demo es un hash bcrypt (prefijo `$2`) y valida la contraseña demo acordada fuera del repo.
- [ ] Ningún archivo versionado contiene la contraseña demo en texto plano ni una llamada a `crypt()` con ella.
- [ ] Reejecutar el SQL del seed deja exactamente una fila en `auth.users`, una en `auth.identities` y una en `public.users`.
- [ ] Esta spec no crea triggers sobre `auth.users` ni sobre `public.users`, ni funciones persistentes.
- [ ] `list_migrations` muestra las migraciones `create_user_enums`, `create_users` y `seed_demo_user`.
- [ ] Existe un archivo en `supabase/migrations/` por cada migración, con el mismo prefijo de versión y el mismo SQL aplicado.
- [ ] `public` contiene únicamente `daycares` y `users`.
- [ ] `daycares` sigue teniendo exactamente las cuatro filas de la SPEC 07, sin cambios.
- [ ] `get_advisors` no reporta errores nuevos distintos del INFO esperado por RLS sin políticas y los WARN preexistentes de `public.rls_auto_enable()`.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [ ] `git diff --stat` no muestra cambios en `app/`, `components/` ni `lib/`.

## Decisiones tomadas y descartadas

- **Sí:** solo `user_role` y `user_status`. Son los enums que usa `public.users`; los otros cuatro se crearán con sus tablas.
- **Sí:** FK de `id` a `auth.users(id)` con `ON DELETE CASCADE`. El perfil no tiene sentido sin la identidad de Auth.
- **Sí:** FK de `daycare_id` a `daycares(id)` con `ON DELETE RESTRICT`. Evita perder usuarios al borrar una guardería por accidente.
- **Sí:** RLS activo sin políticas. Es el default seguro y coherente con SPEC 07; los permisos llegan en su propia spec.
- **Sí:** dejar los grants de Supabase sin tocar. Con RLS sin políticas no hay acceso real y la spec de permisos podrá definirlos desde cero.
- **Sí:** no incluir el trigger de alta. Mantiene esta spec en DDL puro y deja la integración con Auth para una spec dedicada.
- **Sí:** sembrar un usuario demo con login completo. Permite probar Auth cuando se conecte la app.
- **Sí:** insertar manualmente `auth.users`, `auth.identities` y `public.users`. Sin trigger, es la única forma de tener el demo coherente en una sola migración.
- **Sí:** UUID fijo para el demo (`00000000-0000-4000-8000-000000000001`). Permite enlazar las tres filas y repetir el seed sin duplicar.
- **Sí:** resolver la guardería por nombre con `order by created_at, id limit 1`. SPEC 07 no fija un UUID y el nombre es el identificador acordado.
- **Sí:** guardar solo el hash bcrypt. Evita texto plano en git; la contraseña demo se comunica fuera del repo.
- **Sí:** seed idempotente con `WHERE NOT EXISTS` y `ON CONFLICT DO NOTHING`. Permite reejecutarlo sin duplicar.
- **Sí:** índice solo en `daycare_id`. La FK no se indexa sola y el filtro por guardería es el caso de uso inmediato.
- **Sí:** tres migraciones separadas: enums, tabla y seed. Repite el patrón de SPEC 07 y permite recrear el esquema sin datos.
- **Sí:** columnas, nulabilidad y defaults exactos al documento. `avatar_url` nullable y el resto obligatorio con los defaults indicados.
- **Sí:** `updated_at` con default `now()` y sin trigger. La app o la API futura lo actualizan; no se añaden funciones.
- **No:** los otros cuatro enums. No tienen tabla que los use todavía.
- **No:** políticas RLS o grants explícitos. El modelo de acceso depende de Auth y de la spec de permisos.
- **No:** trigger, función `SECURITY DEFINER` o alta automática. Requiere definir el contrato de `raw_user_meta_data` y su spec propia.
- **No:** columna `email` en `public.users`. Supabase ya la gestiona en `auth.users`.
- **No:** cliente Supabase, variables de entorno o tipos TS generados. La app sigue con `lib/data.ts`.
- **No:** más usuarios demo, seed de padres o staff adicional. El demo es único y explícito.
- **No:** trigger de `updated_at`. No hay flujo de edición todavía.
- **No:** migración de rollback, CLI de Supabase o stack local. El SQL versionado permite revertir con una migración nueva.
- **No:** cambios en la app, en `daycares` o en las specs existentes.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Insertar directamente en `auth.users`/`auth.identities` puede no reproducir el alta de GoTrue | Verificar columnas, email confirmado, identidad `email` y hash bcrypt; probar el login al conectar Auth; si falla, crear el demo con la Admin API o el Dashboard |
| El esquema interno de Supabase Auth cambia en una actualización | El seed vive en su propia migración y se limita a columnas estables; revisar `information_schema` antes de reaplicar en otro proyecto |
| El UUID fijo colisiona con un usuario futuro | UUID reservado para demo; el seed comprueba por email y no duplica; verificar que no exista el email antes de aplicar |
| El hash bcrypt no valida la contraseña demo | Generarlo fuera del repo, validarlo con `crypt()` y no confiar en un hash improvisado |
| La contraseña demo no queda documentada en el repo | Comunicarla fuera del repo y guardarla en el gestor de credenciales del equipo; la spec solo registra que existe |
| RLS sin políticas bloquea la app hasta la spec de permisos | Aceptado: la app no está conectada y el bloqueo es intencional |
| `ON DELETE RESTRICT` impide limpiar una guardería con usuarios | Reasignar o borrar los perfiles antes de borrar la guardería |
| `ON DELETE CASCADE` borra el perfil al borrar el usuario de Auth | Aceptado: el perfil de dominio depende de la identidad |
| Falta "Guardería Sala Soles" al aplicar el seed | El `DO` block lanza una excepción explícita antes de insertar |
| Un email preexistente con otro UUID rompe la correspondencia | El seed usa el usuario existente y no crea un segundo; el perfil se inserta con ese id |
| El advisor de seguridad marca "RLS sin políticas" | Es el INFO esperado; se resuelve en la spec de permisos |
| Los WARN de `public.rls_auto_enable()` siguen apareciendo | Son preexistentes y ajenos a esta spec; se abordan en una spec de hardenizado |
| Las versiones de migración no coinciden con los archivos del repo | Leer `list_migrations` antes de crear cada archivo y usar el prefijo exacto |
| El seed se reejecuta y duplica filas | `WHERE NOT EXISTS` por email y `ON CONFLICT DO NOTHING` por UUID y provider |

## Qué **no** entra en esta spec

- Trigger de alta, función `SECURITY DEFINER` o integración con `raw_user_meta_data`.
- Políticas RLS, grants explícitos o modelo de permisos.
- Los otros cuatro enums del documento.
- `rooms`, `children`, `parent_children`, `invitations`, `posts` y el resto de tablas.
- Cliente Supabase, variables de entorno o tipos TypeScript.
- Login, sesiones, activación o protección de rutas en la UI.
- Más usuarios demo, edición o borrado.
- Columna `email` en `public.users`.
- Trigger de `updated_at`.
- Normalización de alergias u otras etiquetas.
- CLI de Supabase, stack local o migración de rollback.
- Cambios en `daycares`, en sus filas o en las specs existentes.

Cada punto, si llega, va en su propia spec.
