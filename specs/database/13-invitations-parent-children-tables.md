# SPEC 13 — Supabase: tablas `invitations` y `parent_children`

> **Estado:** Implementado
> **Depende de:** SPEC 07 (tabla `public.daycares`), SPEC 08 (tabla `public.users` y enums `user_role`/`user_status`), SPEC 10 (políticas RLS del perfil), SPEC 11 (tablas `rooms` y `children`; implementar antes)
> **Fecha:** 2026-10-29
> **Objetivo:** Crear `public.invitations`, `public.parent_children` y los enums `relationship_type` e `invitation_status` con RLS por rol y el trigger de alta de `public.users`, para que el staff invite a un padre y el vínculo quede persistido.

## Alcance

**In:**

- Crear el enum `public.relationship_type` con los valores `father`, `mother` y `guardian`, en ese orden.
- Crear el enum `public.invitation_status` con los valores `pending`, `accepted`, `expired` y `cancelled`, en ese orden.
- Crear `public.invitations` con catorce columnas: `id`, `child_id`, `daycare_id`, `invited_by`, `full_name`, `email`, `relationship`, `code`, `status`, `expires_at`, `accepted_at`, `created_at` y `updated_at`.
- Crear `public.parent_children` con cinco columnas: `id`, `parent_id`, `child_id`, `relationship` y `created_at`.
- `invitations.daycare_id` desnormalizado, igual que `children.daycare_id`, para escribir políticas RLS sin subconsultas.
- `invitations.code` con `UNIQUE` global y `CHECK` de formato `^[A-Z0-9]{5}$`.
- `invitations.status` con default `'pending'`; `invitations.accepted_at` nullable; `invitations.expires_at` obligatorio.
- `parent_children` con `UNIQUE (parent_id, child_id)`.
- Índices en `invitations (child_id)`, `invitations (daycare_id)` y `invitations (email)`; en `parent_children (parent_id)` y `parent_children (child_id)`.
- RLS activo en las dos tablas, con cuatro políticas:
  - `invitations_select_staff_same_daycare`: `SELECT` para `authenticated` con rol `staff` o `admin` de la misma guardería.
  - `invitations_insert_staff`: `INSERT` para `authenticated` con rol `staff` o `admin` de la misma guardería.
  - `parent_children_select_own_or_staff`: `SELECT` para el padre cuando `parent_id = auth.uid()` y para el staff de la misma guardería.
  - `children_select_parent_linked`: `SELECT` de `public.children` para el padre, solo de los niños con vínculo en `parent_children`.
- Dividir `children_select_same_daycare` en dos políticas por rol:
  - `children_select_staff_same_daycare`: `staff` o `admin` de la misma guardería.
  - `children_select_parent_linked`: `parent` con vínculo en `parent_children`.
- `children_insert_staff` se mantiene sin cambios.
- Funciones auxiliares `public.is_parent_of_child(uuid)` y `public.child_daycare_id(uuid)` (`SECURITY DEFINER`, `search_path = public`) para romper la dependencia circular entre las políticas de `children` y `parent_children`.
- `REVOKE EXECUTE ... FROM PUBLIC` y `FROM anon`, y `GRANT EXECUTE` a `authenticated` y `service_role` sobre esas dos funciones.
- Trigger `on_auth_user_created` `AFTER INSERT ON auth.users` con función `public.handle_new_user()` `SECURITY DEFINER` que inserta la fila en `public.users` con `daycare_id`, `role` y `full_name` leídos de `raw_user_meta_data`.
- El trigger no inserta fila si `raw_user_meta_data.daycare_id` falta o no corresponde a una guardería: la signup falla de forma explícita en lugar de dejar un perfil huérfano.
- Semilla de datos: ninguna. `public.invitations` y `public.parent_children` arrancan vacías.
- Migraciones aplicadas con el MCP `apply_migration`, guardando en `supabase/migrations/` el SQL exacto con el prefijo de versión devuelto.
- Verificar con `list_migrations`, `list_tables`, `pg_enum`, `information_schema`, `pg_constraint`, `pg_indexes`, `pg_policies`, `set local role`, `set local request.jwt.claims` y `get_advisors`.

**Fuera de alcance (para specs futuras):**

- Conectar la app: Server Action que crea la invitación, envío del correo, alta del padre y tarjeta de padres.
- Roles y permisos finos por rol; el control real de acceso del padre se define en SPEC 15.
- `invitations` con `UPDATE` o `DELETE`; el estado solo cambia a `accepted` o `cancelled` desde el servidor con service role.
- Política de `INSERT` en `parent_children`; los vínculos se crean desde el servidor con service role.
- Listado de invitaciones de la guardería, reenvío de correo y cancelación manual.
- Marcar `expired` de forma automática (job o función); el estado `expired` queda para una spec propia.
- Seed de invitaciones, padres de prueba o vínculos.
- Trigger de `updated_at`.
- `photo_consent` como columna del padre; sigue siendo del niño.
- Tablas `posts`, `post_children`, `daily_summaries` y el resto del esquema de referencia.
- Cambios en `public.daycares`, `public.users`, `public.rooms` o `public.children` más allá de las políticas de lectura.
- Grants o revokes explícitos sobre tablas; solo se revoca y concede `EXECUTE` sobre las dos funciones auxiliares.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

### Enums

```sql
create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');
```

- Los valores se guardan en inglés, como exige la convención del proyecto.
- La etiqueta visible se traduce en la UI: `Mamá`, `Papá`, `Tutor/a`.

### `invitations`

```sql
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null
    references public.children (id) on delete cascade,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  invited_by uuid not null
    references public.users (id) on delete restrict,
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code text not null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_code_key unique (code),
  constraint invitations_code_format_check check (code ~ '^[A-Z0-9]{5}$')
);

create index invitations_child_id_idx on public.invitations(child_id);
create index invitations_daycare_id_idx on public.invitations(daycare_id);
create index invitations_email_idx on public.invitations(email);

alter table public.invitations enable row level security;
```

- `daycare_id` se guarda aunque se pueda derivar de `children.daycare_id`: permite políticas RLS directas y saber a qué guardería pertenece la invitación aunque el niño se archive.
- `ON DELETE CASCADE` en `child_id`: si se borra el niño, sus invitaciones desaparecen.
- `ON DELETE RESTRICT` en `invited_by`: no se puede borrar un usuario que tiene invitaciones emitidas.
- `email` se guarda en minúsculas para poder comparar con `auth.users.email`.
- `code` es único global: el código identifica la invitación sin necesidad de adivinar a qué niño pertenece.

### `parent_children`

```sql
create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null
    references public.users (id) on delete cascade,
  child_id uuid not null
    references public.children (id) on delete cascade,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  constraint parent_children_parent_child_key unique (parent_id, child_id)
);

create index parent_children_parent_id_idx on public.parent_children(parent_id);
create index parent_children_child_id_idx on public.parent_children(child_id);

alter table public.parent_children enable row level security;
```

- `ON DELETE CASCADE` en ambos lados: si se borra el padre o el niño, el vínculo desaparece.
- La tabla no guarda `daycare_id`: la guardería se deduce del niño, y el vínculo no puede cruzar guarderías porque `children.id` ya la fija.

### Políticas RLS

```sql
create policy "invitations_select_staff_same_daycare"
on public.invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = invitations.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "invitations_insert_staff"
on public.invitations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = invitations.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "parent_children_select_own_or_staff"
on public.parent_children
for select
to authenticated
using (
  parent_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('staff', 'admin')
      and u.daycare_id = public.child_daycare_id(parent_children.child_id)
  )
);

create policy "children_select_staff_same_daycare"
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = children.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "children_select_parent_linked"
on public.children
for select
to authenticated
using (public.is_parent_of_child(children.id));
```

### Funciones auxiliares

```sql
create or replace function public.is_parent_of_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_children pc
    where pc.child_id = p_child_id
      and pc.parent_id = auth.uid()
  );
$$;

create or replace function public.child_daycare_id(p_child_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.daycare_id
  from public.children c
  where c.id = p_child_id;
$$;

revoke execute on function public.is_parent_of_child(uuid) from public;
revoke execute on function public.child_daycare_id(uuid) from public;
revoke execute on function public.is_parent_of_child(uuid) from anon;
revoke execute on function public.child_daycare_id(uuid) from anon;
grant execute on function public.is_parent_of_child(uuid) to authenticated, service_role;
grant execute on function public.child_daycare_id(uuid) to authenticated, service_role;
```

- Las dos políticas de lectura se referencian mutuamente: `children_select_parent_linked` consulta `parent_children` y `parent_children_select_own_or_staff` consulta `children`. Postgres detecta ese ciclo al ejecutar la consulta y responde `42P17: infinite recursion detected in policy`, por lo que ninguna de las dos tablas es legible.
- Las funciones auxiliares rompen el ciclo: al ejecutarse como `SECURITY DEFINER` consultan la tabla destino sin disparar sus políticas, así que la evaluación no vuelve a entrar en el ciclo.
- `is_parent_of_child` usa `auth.uid()` internamente: solo responde por los vínculos del usuario que consulta, no por los de terceros.
- `REVOKE EXECUTE ... FROM PUBLIC` y `FROM anon` evita que un visitante sin sesión las invoque: Supabase concede `EXECUTE` a `anon` por default privileges, así que revocar solo de `PUBLIC` no basta. `GRANT EXECUTE` a `authenticated` y `service_role` cubre los dos usos previstos.

- `invitations` no es legible por los padres: el email y el nombre de otros tutores no se exponen.
- No hay política de `INSERT` en `parent_children`: el vínculo se crea desde el servidor con service role, para que un padre no se auto-vincule a un niño cualquiera.
- No hay política de `UPDATE` ni `DELETE` en `invitations` ni en `parent_children`.
- `children_insert_staff` de SPEC 11 no cambia.
- La política `children_select_parent_linked` y la `parent_children_select_own_or_staff` se referencian entre sí. Resolverlo con subconsultas directas provoca `42P17: infinite recursion detected in policy`; por eso ambas consultan las funciones auxiliares `public.is_parent_of_child` y `public.child_daycare_id`.

### Trigger de alta de `public.users`

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_daycare uuid;
  v_full_name text;
begin
  v_role := case new.raw_user_meta_data ->> 'role'
    when 'staff' then 'staff'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'parent'::public.user_role
  end;

  v_daycare := (new.raw_user_meta_data ->> 'daycare_id')::uuid;
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  if v_daycare is null
     or not exists (select 1 from public.daycares d where d.id = v_daycare) then
    raise exception 'daycare_id inválido en raw_user_meta_data';
  end if;

  insert into public.users (id, daycare_id, role, status, full_name)
  values (new.id, v_daycare, v_role, 'active', v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

- `SECURITY DEFINER` permite escribir en `public.users` sin depender de las políticas de RLS de esa tabla.
- El rol por defecto es `parent`: es el único alta previsto desde la app.
- `status` se crea siempre `active`: el estado previo a la signup no se modela en `users`; la invitación pendiente se modela en `invitations`.
- `on conflict (id) do nothing` evita duplicar la fila si el usuario ya existía.
- El trigger solo aplica a altas posteriores: el usuario demo sembrado en SPEC 08 conserva su fila explícita.

## Plan de implementación

1. Crear `specs/database/13-invitations-parent-children-tables.md` (este documento) y aplicar `create_relationship_invitation_enums` con el MCP `apply_migration`: crear `public.relationship_type` y `public.invitation_status`. Verificar con `pg_enum` los valores y su orden. Leer la versión en `list_migrations` y guardar `supabase/migrations/<version>_create_relationship_invitation_enums.sql` con el SQL exacto.
2. Aplicar `create_invitations`: tabla, FKs, `UNIQUE (code)`, `CHECK` del código, defaults, tres índices y RLS. Verificar con `list_tables`, `pg_constraint` e `pg_indexes`. Guardar `supabase/migrations/<version>_create_invitations.sql`.
3. Aplicar `create_parent_children`: tabla, FKs, `UNIQUE (parent_id, child_id)`, dos índices y RLS. Verificar con `list_tables`, `pg_constraint` e `pg_indexes`. Guardar `supabase/migrations/<version>_create_parent_children.sql`.
4. Aplicar `add_invitations_parent_children_policies`: tres políticas (`invitations_select_staff_same_daycare`, `invitations_insert_staff`, `parent_children_select_own_or_staff`). Verificar con `pg_policies` el `cmd`, los `roles`, el `qual` y el `with_check`. Guardar `supabase/migrations/<version>_add_invitations_parent_children_policies.sql`.
5. Aplicar `split_children_select_policies`: eliminar `children_select_same_daycare` y crear `children_select_staff_same_daycare` y `children_select_parent_linked`. Verificar con `pg_policies` que no queda la política anterior. Guardar `supabase/migrations/<version>_split_children_select_policies.sql`.
6. Aplicar `create_users_trigger`: función `public.handle_new_user()` y trigger `on_auth_user_created`. Verificar con `pg_trigger` y con un alta de prueba dentro de una transacción con `rollback`. Guardar `supabase/migrations/<version>_create_users_trigger.sql`.
7. Aplicar `fix_children_parent_children_policy_recursion`: crear `public.is_parent_of_child(uuid)` y `public.child_daycare_id(uuid)` (`SECURITY DEFINER`, `search_path = public`), revocar `EXECUTE` a `PUBLIC` y reescribir `children_select_parent_linked` y `parent_children_select_own_or_staff` para usar las funciones. Verificar que `select` sobre `children` y `parent_children` ya no falla con `42P17`. Guardar `supabase/migrations/<version>_fix_children_parent_children_policy_recursion.sql`.
8. Aplicar `revoke_anon_execute_helper_functions`: revocar `EXECUTE` a `anon` sobre las dos funciones (Supabase lo concede por default privileges) y concederlo a `authenticated` y `service_role`. Verificar el ACL en `pg_proc`. Guardar `supabase/migrations/<version>_revoke_anon_execute_helper_functions.sql`.
9. Verificar RLS dentro de transacciones:
   - El usuario demo (staff) ve tres salas, sus invitaciones y los niños de la guardería.
   - Un padre con un vínculo ve solo ese niño y su propio vínculo; no ve invitaciones ni los niños de otros.
   - Un padre sin vínculos ve cero niños.
   - `anon` obtiene cero filas en las tres tablas.
   - Un padre no puede insertar en `parent_children` ni en `invitations`.
10. Verificar que un alta en `auth.users` con `raw_user_meta_data = {daycare_id, role: 'parent', full_name}` crea la fila en `public.users` con esos valores, dentro de una transacción con `rollback`.
11. Ejecutar `get_advisors` de seguridad y performance, `list_migrations`, `npx tsc --noEmit`, `npm run lint` y `git diff --stat`. Confirmar que solo cambiaron `supabase/migrations/` y esta spec.

## Criterios de aceptación

- [x] `public.relationship_type` existe con exactamente los valores `father`, `mother` y `guardian`, en ese orden.
- [x] `public.invitation_status` existe con exactamente los valores `pending`, `accepted`, `expired` y `cancelled`, en ese orden.
- [x] `public.invitations` existe con exactamente trece columnas: `id`, `child_id`, `daycare_id`, `invited_by`, `full_name`, `email`, `relationship`, `code`, `status`, `expires_at`, `accepted_at`, `created_at` y `updated_at`.
- [x] `invitations.id` es `uuid PRIMARY KEY` con default `gen_random_uuid()`.
- [x] `invitations.child_id` tiene FK a `public.children(id)` con `ON DELETE CASCADE`.
- [x] `invitations.daycare_id` tiene FK a `public.daycares(id)` con `ON DELETE RESTRICT`.
- [x] `invitations.invited_by` tiene FK a `public.users(id)` con `ON DELETE RESTRICT`.
- [x] `invitations.full_name`, `invitations.email` y `invitations.relationship` son `NOT NULL`.
- [x] `invitations.code` es `text NOT NULL` con `UNIQUE` y `CHECK` de formato `^[A-Z0-9]{5}$`.
- [x] `invitations.status` es `public.invitation_status NOT NULL` con default `'pending'`.
- [x] `invitations.expires_at` es `timestamptz NOT NULL` y `invitations.accepted_at` es nullable.
- [x] Existen los índices `invitations_child_id_idx`, `invitations_daycare_id_idx` y `invitations_email_idx`.
- [x] `public.parent_children` existe con exactamente cinco columnas: `id`, `parent_id`, `child_id`, `relationship` y `created_at`.
- [x] `parent_children.parent_id` y `parent_children.child_id` son `uuid NOT NULL` con FK y `ON DELETE CASCADE`.
- [x] Existe `UNIQUE (parent_id, child_id)` en `public.parent_children`.
- [x] Existen los índices `parent_children_parent_id_idx` y `parent_children_child_id_idx`.
- [x] RLS está activo en `public.invitations` y en `public.parent_children`.
- [x] `pg_policies` muestra `invitations_select_staff_same_daycare` (`SELECT`), `invitations_insert_staff` (`INSERT`), `parent_children_select_own_or_staff` (`SELECT`), `children_select_staff_same_daycare` (`SELECT`) y `children_select_parent_linked` (`SELECT`), todas para `authenticated`.
- [x] `children_select_same_daycare` ya no existe en `pg_policies`.
- [x] No hay políticas de `UPDATE` ni de `DELETE` en `invitations` ni en `parent_children`.
- [x] No hay política de `INSERT` en `parent_children`.
- [x] `anon` obtiene cero filas en `public.invitations`, `public.parent_children` y `public.children`.
- [x] El usuario demo ve las tres salas y todos los niños de su guardería.
- [x] Un padre con un vínculo ve exactamente un niño y un vínculo; no ve invitaciones.
- [x] Un padre sin vínculos ve cero niños.
- [x] Un padre no puede insertar en `parent_children` ni en `invitations`.
- [x] Un alta en `auth.users` con `raw_user_meta_data` con `daycare_id`, `role: 'parent'` y `full_name` crea una fila en `public.users` con `role = 'parent'`, `status = 'active'` y ese `full_name`.
- [x] Un alta en `auth.users` sin `daycare_id` válido falla con excepción y no deja fila en `public.users`.
- [x] La transacción de prueba del trigger se revierte y `public.users` sigue con una fila.
- [x] `public.invitations` y `public.parent_children` quedan con cero filas.
- [x] `public.children` sigue con las filas que hubiera antes de esta spec.
- [x] Existen las funciones `public.is_parent_of_child(uuid)` y `public.child_daycare_id(uuid)` con `SECURITY DEFINER` y `search_path = public`.
- [x] `EXECUTE` sobre esas dos funciones está revocado para `PUBLIC` y para `anon`, y concedido a `authenticated` y `service_role`.
- [x] `select` sobre `public.children` y `public.parent_children` no falla con `42P17: infinite recursion detected in policy`.
- [x] `list_migrations` muestra las ocho migraciones y existe un archivo por cada una con el mismo prefijo y el SQL exacto.
- [x] `get_advisors` no reporta errores (`ERROR`) nuevos.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] `git diff --stat` solo muestra `supabase/migrations/` y esta spec.
- [x] `app/`, `components/` y `lib/` no cambiaron.

## Decisiones tomadas y descartadas

- **Sí:** dos enums nuevos, `relationship_type` e `invitation_status`. Son los que necesita el flujo de invitación.
- **Sí:** `daycare_id` desnormalizado en `invitations`. Habilita políticas RLS directas y conserva la guardería de la invitación aunque el niño se archive.
- **Sí:** `ON DELETE CASCADE` en `invitations.child_id`. Una invitación sin niño no tiene sentido.
- **Sí:** `ON DELETE RESTRICT` en `invitations.invited_by`. No se borra un staff que tiene invitaciones emitidas.
- **Sí:** `code` con `UNIQUE` global y `CHECK` de cinco caracteres alfanuméricos en mayúsculas. El código identifica la invitación sin contexto adicional.
- **Sí:** `email` sin `UNIQUE`. La misma persona puede tener invitaciones para distintos niños o guarderías.
- **Sí:** sin política de `INSERT` en `parent_children`. Un padre no se auto-vincula a un niño: el vínculo se crea desde el servidor con service role.
- **Sí:** sin políticas de `UPDATE` ni `DELETE` en las tablas nuevas. Los cambios de estado los hace el servidor.
- **Sí:** dividir `children_select_same_daycare` por rol. Sin esto, un padre lee por API todos los niños de la guardería aunque la app le bloquee la ruta.
- **Sí:** las invitaciones no son legibles por los padres. Exponen email y nombre de otros tutores.
- **Sí:** trigger `AFTER INSERT` en `auth.users` para crear la fila de `public.users`. Es lo que propone el esquema de referencia y cubre cualquier alta de usuario.
- **Sí:** `SECURITY DEFINER` con `search_path = public` en la función del trigger. Necesario para escribir en `public.users` y para no depender del `search_path` del ejecutor.
- **Sí:** rol por defecto `parent` y `status` `active` en el trigger. El alta desde la app es siempre de un padre.
- **Sí:** excepción explícita si falta `daycare_id`. Falla ruidosamente en lugar de dejar un perfil sin guardería.
- **Sí:** el trigger usa `on conflict (id) do nothing`. Evita duplicar la fila si el usuario ya existía.
- **No:** seed de invitaciones o de padres de prueba. `public.invitations` y `public.parent_children` arrancan vacías.
- **No:** marcaje automático de `expired`. Requiere un job; el servidor valida `expires_at` al activar.
- **No:** `updated_at` con trigger. No hay edición de invitaciones.
- **No:** política de lectura de `public.users` ampliada al staff. La tarjeta de padres lee el nombre desde `invitations`.
- **Sí:** funciones auxiliares `is_parent_of_child` y `child_daycare_id` (`SECURITY DEFINER`) para romper el ciclo entre las políticas de `children` y `parent_children`. Sin ellas, Postgres responde `42P17` y ninguna de las dos tablas es legible.
- **Sí:** `REVOKE EXECUTE ... FROM PUBLIC` y `FROM anon`, y `GRANT EXECUTE` a `authenticated` y `service_role` sobre esas dos funciones. Supabase concede `EXECUTE` a `anon` por default privileges, así que revocar solo de `PUBLIC` no lo excluye.
- **No:** grants o revokes explícitos sobre tablas. Se conservan los defaults de Supabase.
- **No:** cambios en `daycares`, `rooms` o la estructura de `children`. Solo se ajustan sus políticas de lectura.
- **No:** rollback de migraciones, CLI de Supabase o stack local.
- **No:** tests automatizados. El repo no tiene runner.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La política `children_select_parent_linked` referencia `parent_children` y genera dependencia circular | Confirmado en la base: Postgres responde `42P17: infinite recursion detected in policy` al consultar `children` o `parent_children`. Resuelto con las funciones auxiliares `is_parent_of_child` y `child_daycare_id`; verificar con `set local role` antes de cerrar la spec |
| Un padre queda sin fila en `public.users` si el trigger falla | La excepción del trigger hace fallar la signup completa; no hay usuarios a medias |
| Reejecutar el seed de demo con el trigger activo duplica la fila de `public.users` | El trigger usa `on conflict (id) do nothing`; documentar que `seed_demo_user` es de una sola ejecución |
| `invited_by` con `ON DELETE RESTRICT` bloquea el borrado de un staff | Es intencional: no se borra un usuario con invitaciones emitidas; se documenta para la futura spec de baja |
| `code` con `UNIQUE` global choca con una invitación de otra guardería | Es el comportamiento deseado: el código identifica una invitación en todo el sistema |
| La fecha `expires_at` se interpreta en otra zona horaria | Guardarla como `timestamptz` calculada en el servidor con `now() + interval` |
| Un padre usa la API con su token y lee `invitations` de su guardería | No hay política de `SELECT` para el rol `parent`; verificar con `set local role authenticated` y claims de padre |
| `get_advisors` marca RLS sin políticas en tablas nuevas | Cada tabla queda con al menos una política; revisar `pg_policies` si aparece un aviso nuevo |

## Qué **no** entra en esta spec

- El Server Action que crea la invitación y el envío del correo.
- El alta del padre, la validación del código y la creación del vínculo.
- La tarjeta de padres del perfil del niño.
- La restricción de rutas por rol y el sidebar del padre.
- Listado, reenvío y cancelación de invitaciones.
- Marcaje automático de invitaciones vencidas.
- Tablas de posts, resúmenes y el resto del esquema de referencia.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
