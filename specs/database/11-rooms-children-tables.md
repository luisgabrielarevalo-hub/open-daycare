# SPEC 11 — Supabase: tablas `rooms` y `children`

> **Estado:** Aprobado
> **Depende de:** SPEC 07 (tabla `public.daycares`), SPEC 08 (tabla `public.users` y usuario demo), SPEC 10 (políticas RLS del perfil)
> **Fecha:** 2026-10-28
> **Objetivo:** Crear `public.rooms`, `public.children` y el enum `child_status` con RLS de lectura y alta, y sembrar las salas Soles, Lunas y Estrellas, sin conectar la aplicación.

## Alcance

**In:**

- Crear cinco migraciones en `supabase/migrations/`: `create_child_status_enum`, `create_rooms`, `create_children`, `add_rooms_children_policies` y `seed_rooms`.
- Aplicarlas al proyecto remoto con el MCP `apply_migration`, leyendo de `list_migrations` la versión asignada y guardando en el repo el SQL exacto con ese prefijo.
- Crear el enum `public.child_status` con los valores `active` y `archived`, en ese orden.
- Crear `public.rooms` con `id`, `daycare_id`, `name` y `created_at`.
- `rooms.id` como PK `uuid` con default `gen_random_uuid()`.
- `rooms.daycare_id` como `uuid NOT NULL` con FK a `public.daycares(id) ON DELETE RESTRICT`.
- `rooms.name` como `text NOT NULL`, con `UNIQUE (daycare_id, name)`.
- `UNIQUE (id, daycare_id)` en `rooms`, necesario para la FK compuesta de `children`.
- Índice `rooms_daycare_id_idx` sobre `rooms(daycare_id)`.
- Crear `public.children` con trece columnas: `id`, `room_id`, `daycare_id`, `slug`, `full_name`, `birth_date`, `enrolled_at`, `medical_notes`, `allergy_tags`, `photo_consent`, `status`, `created_at` y `updated_at`.
- `children.room_id` y `children.daycare_id` como `uuid NOT NULL`, unidos por una FK compuesta `(room_id, daycare_id)` a `rooms(id, daycare_id)` con `ON DELETE RESTRICT`.
- `children.daycare_id` con FK propia a `public.daycares(id) ON DELETE RESTRICT`.
- `children.slug` como `text NOT NULL`, con `UNIQUE (daycare_id, slug)` y un `CHECK` de formato kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- `children.full_name` y `children.birth_date` obligatorios.
- `enrolled_at` con default `current_date`; `medical_notes` nullable; `allergy_tags` con default `'{}'`; `photo_consent` con default `true`; `status` con default `'active'`.
- `created_at` y `updated_at` con default `now()`.
- Índices `children_daycare_id_idx` y `children_room_id_idx`.
- RLS activo en `rooms` y `children`, con tres políticas y sin tocar grants:
  - `rooms_select_same_daycare`: `SELECT` para `authenticated` cuando la guardería de la sala coincide con la del usuario.
  - `children_select_same_daycare`: `SELECT` para `authenticated` cuando `children.daycare_id` coincide con la guardería del usuario.
  - `children_insert_staff`: `INSERT` para `authenticated` cuando la guardería coincide y el usuario tiene `role` `staff` o `admin`.
- Sin políticas de `UPDATE` ni `DELETE`.
- Sembrar exactamente tres salas para "Guardería Sala Soles": Soles, Lunas y Estrellas.
- Seed idempotente y resuelto por nombre de guardería, sin UUID fijo.
- No sembrar niños.
- Verificar con `pg_enum`, `list_tables`, `information_schema`, `pg_constraint`, `pg_indexes`, `pg_policies`, `set local role`, `set local request.jwt.claims`, `list_migrations` y `get_advisors`.
- Comprobar que `app/`, `components/` y `lib/` no cambian.

**Fuera de alcance (para specs futuras):**

- Conectar la app: Server Action de alta, listado real de `/kids`, perfil real de `/kids/[slug]`.
- Eliminar los niños mock de `lib/data.ts`; va en SPEC 12.
- Políticas de `UPDATE` y `DELETE`; edición y archivado van en otra spec.
- Seed de niños, padres o `parent_children`.
- Tabla `parent_children`, `invitations`, `posts` y el resto del esquema.
- Los enums `relationship_type`, `invitation_status` y `post_type`.
- Trigger `AFTER INSERT` sobre `auth.users` o alta automática de usuarios.
- Trigger de `updated_at`.
- Normalización de alergias en tablas propias.
- `photo_consent` editable desde la UI.
- Cambios en `daycares`, `users` o sus datos.
- Grants o revokes explícitos.
- Migración de rollback, CLI de Supabase o stack local.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

### Enum

```sql
create type public.child_status as enum ('active', 'archived');
```

- Los valores se guardan en inglés, como exige la convención del proyecto.
- La etiqueta visible (`activo` / `archivado`) se traduce en la UI.

### `rooms`

```sql
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  constraint rooms_daycare_name_key unique (daycare_id, name),
  constraint rooms_id_daycare_key unique (id, daycare_id)
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

alter table public.rooms enable row level security;
```

- `UNIQUE (daycare_id, name)` evita dos salas con el mismo nombre en una guardería.
- `UNIQUE (id, daycare_id)` existe solo para que `children` pueda usar una FK compuesta.
- `ON DELETE RESTRICT` impide borrar una guardería o una sala con niños.

### `children`

```sql
create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  slug text not null,
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_room_daycare_fkey
    foreign key (room_id, daycare_id)
    references public.rooms (id, daycare_id)
    on delete restrict,
  constraint children_daycare_slug_key unique (daycare_id, slug),
  constraint children_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index children_daycare_id_idx on public.children (daycare_id);
create index children_room_id_idx on public.children (room_id);

alter table public.children enable row level security;
```

- `daycare_id` se guarda en `children` aunque se pueda derivar de `rooms`.
- Ese campo permite `UNIQUE (daycare_id, slug)` y políticas RLS sin subconsultas por sala.
- La FK compuesta `(room_id, daycare_id)` garantiza que la sala pertenece a la guardería indicada.
- `slug` es único dentro de la guardería, no global; dos guarderías pueden repetir el mismo slug.
- `allergy_tags` usa valores en inglés (`peanut`, `lactose`, `gluten`, `egg`, `nuts`) y la UI los traduce.
- `medical_notes` es nullable porque el formulario lo deja opcional.
- `enrolled_at` usa `current_date`; la app no lo pide en el alta.
- `updated_at` se actualiza desde la aplicación; esta spec no crea trigger.
- No se añaden columnas de avatar, edad ni etiquetas derivadas.

### Políticas RLS

```sql
create policy "rooms_select_same_daycare"
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = rooms.daycare_id
  )
);

create policy "children_select_same_daycare"
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = children.daycare_id
  )
);

create policy "children_insert_staff"
on public.children
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = children.daycare_id
      and u.role in ('staff', 'admin')
  )
);
```

- Solo hay `SELECT` en `rooms` y `SELECT` + `INSERT` en `children`.
- `to authenticated` excluye a `anon`.
- `auth.uid()` devuelve `null` sin claims, por lo que `anon` no ve filas.
- La política de `children` no verifica la sala porque la FK compuesta ya lo hace.
- La subconsulta de `children` filtra por `u.id`, la PK de `users`; no necesita índice nuevo.
- La política de `rooms` replica el patrón de `daycares_select_own` de SPEC 10.
- No se crean políticas de escritura para `rooms`; las salas se gestionan por migración.

### Seed de salas

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

insert into public.rooms (daycare_id, name)
select d.id, v.name
from public.daycares d
cross join (values ('Soles'), ('Lunas'), ('Estrellas')) as v(name)
where d.name = 'Guardería Sala Soles'
  and not exists (
    select 1
    from public.rooms r
    where r.daycare_id = d.id
      and r.name = v.name
  );
```

- La guardería se resuelve por nombre, igual que en SPEC 08.
- El seed es reejecutable: una segunda ejecución deja tres salas.
- Las demás guarderías quedan sin salas.
- No se insertan niños.

## Plan de implementación

1. Aplicar `create_child_status_enum` con el MCP `apply_migration`: crear `public.child_status`. Verificar con `pg_enum` los dos valores y su orden. Leer la versión en `list_migrations` y crear `supabase/migrations/<version>_create_child_status_enum.sql` con el SQL exacto.
2. Aplicar `create_rooms` con el MCP: crear la tabla, la FK, los dos `UNIQUE`, el índice y activar RLS. Verificar con `list_tables`, `pg_constraint` e `pg_indexes`. Guardar `supabase/migrations/<version>_create_rooms.sql`.
3. Aplicar `create_children` con el MCP: crear la tabla, la FK simple a `daycares`, la FK compuesta a `rooms`, el `UNIQUE (daycare_id, slug)`, el `CHECK` de slug, los defaults, los índices y activar RLS. Verificar con `list_tables` las trece columnas y con `pg_constraint` las tres restricciones. Guardar `supabase/migrations/<version>_create_children.sql`.
4. Aplicar `add_rooms_children_policies` con el MCP: crear las tres políticas. Verificar con `pg_policies` el `cmd`, los `roles` y el `qual`/`with_check`. Guardar `supabase/migrations/<version>_add_rooms_children_policies.sql`.
5. Aplicar `seed_rooms` con el MCP: sembrar Soles, Lunas y Estrellas. Verificar que la guardería Sala Soles tiene exactamente tres salas, que `children` sigue vacía y que reejecutar el `INSERT` no duplica. Guardar `supabase/migrations/<version>_seed_rooms.sql`.
6. Verificar RLS dentro de transacciones:

   ```sql
   begin;
   set local role anon;
   select count(*) from public.rooms;
   select count(*) from public.children;
   commit;
   ```

   Ambos conteos deben ser `0`.

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
   select name from public.rooms order by name;
   select count(*) from public.children;
   insert into public.children (room_id, daycare_id, slug, full_name, birth_date)
   select r.id, r.daycare_id, 'nino-de-prueba', 'Niño de prueba', '2022-01-01'
   from public.rooms r
   where r.name = 'Soles';
   select count(*) from public.children;
   rollback;
   ```

   El demo debe ver tres salas, `0` niños antes del insert y `1` después; el `rollback` no deja datos.

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}';
   select count(*) from public.rooms;
   select count(*) from public.children;
   insert into public.children (room_id, daycare_id, slug, full_name, birth_date)
   select r.id, r.daycare_id, 'otro-nino', 'Otro niño', '2022-01-01'
   from public.rooms r
   where r.name = 'Soles';
   commit;
   ```

   Un UUID ajeno debe ver `0` filas y el `INSERT` debe fallar por RLS o por no ver la sala.

7. Ejecutar `get_advisors` de seguridad y performance, `list_migrations`, `npx tsc --noEmit`, `npm run lint` y `git diff --stat`. Confirmar que solo cambiaron `supabase/migrations/` y esta spec, que `public.users` sigue con una fila y `public.daycares` con cuatro.

## Criterios de aceptación

- [ ] `public.child_status` existe con exactamente los valores `active` y `archived`, en ese orden.
- [ ] `public.rooms` existe con exactamente cuatro columnas: `id`, `daycare_id`, `name` y `created_at`.
- [ ] `rooms.id` es `uuid PRIMARY KEY` con default `gen_random_uuid()`.
- [ ] `rooms.daycare_id` es `uuid NOT NULL` con FK a `public.daycares(id)` y `ON DELETE RESTRICT`.
- [ ] `rooms.name` es `text NOT NULL` y existe `UNIQUE (daycare_id, name)`.
- [ ] Existe `UNIQUE (id, daycare_id)` en `public.rooms`.
- [ ] Existe el índice `rooms_daycare_id_idx` sobre `public.rooms(daycare_id)`.
- [ ] `public.children` existe con exactamente trece columnas: `id`, `room_id`, `daycare_id`, `slug`, `full_name`, `birth_date`, `enrolled_at`, `medical_notes`, `allergy_tags`, `photo_consent`, `status`, `created_at` y `updated_at`.
- [ ] `children.id` es `uuid PRIMARY KEY` con default `gen_random_uuid()`.
- [ ] `children.room_id` y `children.daycare_id` son `uuid NOT NULL`.
- [ ] Existe la FK compuesta `(room_id, daycare_id)` a `rooms(id, daycare_id)` con `ON DELETE RESTRICT`.
- [ ] `children.daycare_id` tiene FK a `public.daycares(id)` con `ON DELETE RESTRICT`.
- [ ] `children.slug` es `text NOT NULL`, con `UNIQUE (daycare_id, slug)` y `CHECK` de formato kebab-case.
- [ ] `children.full_name` es `text NOT NULL` y `birth_date` es `date NOT NULL`.
- [ ] `enrolled_at` es `date NOT NULL` con default `current_date`.
- [ ] `medical_notes` es `text` nullable.
- [ ] `allergy_tags` es `text[] NOT NULL` con default `'{}'`.
- [ ] `photo_consent` es `boolean NOT NULL` con default `true`.
- [ ] `status` es `public.child_status NOT NULL` con default `'active'`.
- [ ] `created_at` y `updated_at` son `timestamptz NOT NULL` con default `now()`.
- [ ] Existen los índices `children_daycare_id_idx` y `children_room_id_idx`.
- [ ] RLS está activo en `public.rooms` y en `public.children`.
- [ ] `pg_policies` muestra exactamente `rooms_select_same_daycare` (`SELECT`), `children_select_same_daycare` (`SELECT`) y `children_insert_staff` (`INSERT`), todas para `authenticated`.
- [ ] No hay políticas de `UPDATE` ni `DELETE` en ninguna de las dos tablas.
- [ ] Las migraciones no contienen `GRANT` ni `REVOKE`.
- [ ] `anon` obtiene `0` filas de `public.rooms` y `0` de `public.children`.
- [ ] El usuario demo ve las tres salas de Sala Soles y ningún niño.
- [ ] El usuario demo puede insertar un niño en una sala de su guardería y el `rollback` no deja filas.
- [ ] Un UUID distinto obtiene `0` salas, `0` niños y no puede insertar.
- [ ] La guardería Sala Soles tiene exactamente tres salas: Soles, Lunas y Estrellas.
- [ ] Reejecutar el seed de salas deja exactamente tres filas.
- [ ] `public.children` queda con cero filas.
- [ ] `public.users` sigue con una fila y `public.daycares` con cuatro.
- [ ] `list_migrations` muestra las cinco migraciones y existe un archivo por cada una con el mismo prefijo y el SQL exacto.
- [ ] `get_advisors` no reporta errores (`ERROR`) nuevos; los avisos informativos y los WARN de `public.rls_auto_enable()` se aceptan.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [ ] `git diff --stat` solo muestra `supabase/migrations/` y esta spec.
- [ ] `app/`, `components/` y `lib/` no cambiaron.

## Decisiones tomadas y descartadas

- **Sí:** solo el enum `child_status`. Es el único que usan estas tablas; los otros tres llegan con sus tablas.
- **Sí:** `daycare_id` denormalizado en `children`. Habilita `UNIQUE (daycare_id, slug)` y RLS directa sin unir por `rooms`.
- **Sí:** FK compuesta `(room_id, daycare_id)`. Impide asociar un niño a una sala de otra guardería.
- **Sí:** `UNIQUE (daycare_id, name)` en `rooms`. Evita salas duplicadas dentro de una guardería.
- **Sí:** `UNIQUE (id, daycare_id)` en `rooms`. Es el destino de la FK compuesta.
- **Sí:** `slug` único por guardería, no global. Dos guarderías pueden tener un `mateo-fernandez`.
- **Sí:** `CHECK` de kebab-case en `slug`. Evita valores con espacios, mayúsculas o acentos que rompan la URL.
- **Sí:** `enrolled_at` con default `current_date`. El modal no pide fecha de ingreso.
- **Sí:** `medical_notes` nullable. El formulario lo deja opcional.
- **Sí:** `status` con default `active` y sin archivado todavía. El listado futuro filtrará por estado.
- **Sí:** RLS `SELECT` + `INSERT` para `children`, solo `SELECT` para `rooms`. Coincide con el alta y no abre edición ni borrado.
- **Sí:** `INSERT` limitado a `staff` y `admin`. Un padre no crea niños.
- **Sí:** tres salas fijas para Sala Soles. Es la guardería del usuario demo y de la app.
- **Sí:** seed idempotente por nombre. Repite el patrón de SPEC 07 y SPEC 08.
- **Sí:** cinco migraciones separadas. Permiten recrear el esquema sin datos y repetir el patrón del repo.
- **Sí:** índices solo en las dos FKs. Los filtros reales son por guardería y por sala.
- **No:** seed de niños. El usuario lo descartó; `/kids` arranca vacía y SPEC 12 define el estado vacío.
- **No:** `parent_children`, `invitations` ni posts. Van en specs propias.
- **No:** políticas de escritura para `rooms`. Las salas se gestionan por migración.
- **No:** `UPDATE`/`DELETE`. La edición y el archivado no tienen UI.
- **No:** trigger de `updated_at`. La app lo actualizará cuando exista edición.
- **No:** columnas derivadas (`avatar_bg`, `avatar_color`, `age_label`). Se calculan en el servidor.
- **No:** grants o revokes explícitos. Se conservan los defaults de Supabase.
- **No:** cambios en la app. SPEC 12 conecta la UI.
- **No:** migración de rollback, CLI o stack local. Una migración nueva revierte.
- **No:** tests automatizados. El repo no tiene runner; la verificación es SQL y Playwright en SPEC 12.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La FK compuesta exige el `UNIQUE (id, daycare_id)` y se olvida | Crearlo en la misma migración `create_rooms` y verificar con `pg_constraint` |
| `children.daycare_id` se desincroniza de la sala | La FK compuesta lo impide: la pareja `(room_id, daycare_id)` debe existir en `rooms` |
| `UNIQUE (daycare_id, slug)` bloquea un alta concurrente con el mismo nombre | SPEC 12 reintenta con sufijo ante el error `23505` |
| El `CHECK` de slug rechaza nombres con solo símbolos | SPEC 12 genera un slug de respaldo si la normalización queda vacía |
| La política de `children` no puede leer `users` por RLS | SPEC 10 crea `users_select_own`; verificar con el usuario demo |
| `anon` obtiene filas por un grant implícito | `to authenticated` y `auth.uid() = null`; verificar con `set local role` |
| El seed se reejecuta y duplica salas | `WHERE NOT EXISTS` por `(daycare_id, name)` |
| Falta "Guardería Sala Soles" al aplicar el seed | El `DO` block lanza una excepción explícita antes de insertar |
| Se siembran salas en otras guarderías | El `WHERE` filtra por nombre de guardería |
| Las versiones de migración no coinciden con los archivos del repo | Leer `list_migrations` antes de crear cada archivo y copiar el SQL exacto |
| `get_advisors` marca RLS sin políticas en otra tabla | Revisar `pg_policies` de `rooms` y `children`; los avisos ajenos son preexistentes |
| El demo no puede insertar por su `role` | El usuario demo es `staff`; verificar con `select role from public.users` |
| Las pruebas dejan filas | Toda verificación de `INSERT` va dentro de `begin; ... rollback;` |
| La tabla queda vacía y SPEC 12 no puede verificar altas | SPEC 12 crea niños desde la UI y limpia con SQL del MCP |

## Qué **no** entra en esta spec

- La conexión de la app, el Server Action y el listado real.
- El estado vacío de `/kids` y la eliminación de los mocks.
- Edición, archivado y borrado de niños.
- Seed de niños, padres o `parent_children`.
- `parent_children`, `invitations`, `posts` y el resto de tablas.
- Los otros tres enums.
- Triggers de alta o de `updated_at`.
- Tablas de alergias normalizadas.
- Grants o revokes explícitos.
- Cambios en `daycares`, `users` o sus datos.
- Migración de rollback, CLI o stack local.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
