# SPEC 16 — Supabase: `posts`, `post_children`, `post_photos` y Storage

> **Estado:** Implementado
> **Depende de:** SPEC 07 (tabla `daycares`), SPEC 08 (tabla `users` y enum `user_role`), SPEC 10 (RLS del perfil), SPEC 11 (tablas `rooms` y `children`), SPEC 13 (tabla `parent_children` y helpers)
> **Fecha:** 2026-11-02
> **Objetivo:** Crear las tablas `posts`, `post_children` y `post_photos`, los enums `post_type` y `post_audience`, la función atómica `create_post`, el bucket privado `post-photos` y sus políticas RLS, para que el staff publique entradas con o sin imágenes y los padres solo vean lo que les corresponde.

## Alcance

**In:**

- Crear dos enums: `public.post_type` con `meal`, `nap`, `activity`, `achievement`, `mood`, `photo` y `announcement`; y `public.post_audience` con `children` y `daycare`.
- Crear `public.posts` con diez columnas: `id`, `author_id`, `author_name`, `daycare_id`, `type`, `audience_kind`, `body`, `published_at`, `created_at` y `updated_at`.
- `posts.author_id` y `posts.daycare_id` unidos por una FK compuesta `(author_id, daycare_id)` a `users(id, daycare_id)`, con `ON DELETE RESTRICT`.
- `posts.daycare_id` con FK propia a `public.daycares(id)` y `ON DELETE RESTRICT`.
- `posts.author_name` desnormalizado: copia de `users.full_name` al publicar, para mostrar el autor sin depender de la política de lectura de `users`.
- Trigger `posts_set_author_name` `BEFORE INSERT` que sobrescribe `author_name` con `users.full_name` y rechaza un `author_id` sin fila; evita falsificar el autor con un insert directo.
- `posts.body` con `CHECK` de longitud entre 1 y 1000 caracteres después de `btrim`.
- `posts.audience_kind` con `children` (uno o varios niños) y `daycare` (todo el centro).
- `UNIQUE (id, daycare_id)` en `posts`, necesario para las FK compuestas de `post_children`.
- `UNIQUE (id, daycare_id)` en `public.users` y en `public.children`, necesarios para las FK compuestas.
- Crear `public.post_children` con `post_id`, `child_id` y `daycare_id`; PK compuesta `(post_id, child_id)`.
- FK compuesta `(post_id, daycare_id)` a `posts(id, daycare_id)` con `ON DELETE CASCADE`.
- FK compuesta `(child_id, daycare_id)` a `children(id, daycare_id)` con `ON DELETE CASCADE`.
- Índice `post_children_child_id_idx` para el filtro del feed del padre.
- Crear `public.post_photos` con `id`, `post_id`, `path`, `position`, `width`, `height` y `created_at`.
- `post_photos.path` como ruta relativa dentro del bucket, no como URL; `UNIQUE (path)`.
- `post_photos.position` como `smallint` con `CHECK` entre 0 y 3; `UNIQUE (post_id, position)`.
- `post_photos.width` y `height` nullable; esta spec no los completa.
- Índices `posts (daycare_id, published_at desc)`, `posts (author_id)`, `post_photos (post_id)`.
- RLS activo en las tres tablas, sin políticas de `UPDATE` ni `DELETE`.
- Políticas de `SELECT` e `INSERT`:
  - `posts_select_staff_same_daycare`: staff/admin de la misma guardería ven todos los posts.
  - `posts_select_parent_visible`: un padre con al menos un hijo activo ve los posts con `audience_kind = 'daycare'` de su guardería y los posts etiquetados a sus hijos.
  - `posts_insert_staff`: staff/admin insertan solo con `author_id = auth.uid()` y su propia guardería.
  - `post_children_select_staff_same_daycare` y `post_children_select_parent_linked`: lectura por rol.
  - `post_children_insert_author`: solo el autor del post puede etiquetar niños de su guardería.
  - `post_photos_select_visible_post`: se ven las fotos de un post visible según la RLS de `posts`.
  - `post_photos_insert_author`: solo el autor del post puede insertar fotos y la ruta debe empezar por su `<daycare_id>`.
- Función auxiliar `public.is_post_author(uuid, uuid)` `SECURITY DEFINER`: valida la autoría sin releer `posts` bajo RLS y evita la recursión entre las políticas de `posts` y `post_children`.
- Función `public.create_post(p_type, p_audience_kind, p_body, p_child_ids, p_photo_paths)` que valida todo y inserta el post, sus niños y sus fotos en una sola transacción.
- La función es `SECURITY INVOKER`, con `SET search_path = ''`, y respeta RLS.
- La función valida: rol `staff`/`admin` activo, cuerpo entre 1 y 1000, audiencia coherente con los niños, niños activos de la misma guardería, máximo 4 fotos, `photo_consent` de los destinatarios y prefijo de ruta de la guardería.
- `REVOKE ALL` de `PUBLIC` y `anon` sobre `create_post`; `GRANT EXECUTE` a `authenticated`.
- Crear el bucket privado `post-photos` con `public = false`, límite de 5 MB por archivo y MIME `image/webp`, `image/jpeg` e `image/png`.
- Política de Storage `post_photos_insert_staff`: staff/admin suben solo a la carpeta de su guardería (`<daycare_id>/…`).
- Política de Storage `post_photos_select_visible`: se leen solo los objetos referenciados por un `post_photos.path` visible según su RLS.
- Migraciones aplicadas con el MCP `apply_migration`, guardando en `supabase/migrations/` el SQL exacto con el prefijo de versión devuelto.
- Verificar con `list_migrations`, `list_tables`, `pg_enum`, `information_schema`, `pg_constraint`, `pg_indexes`, `pg_policies`, `set local role`, `set local request.jwt.claims` y `get_advisors`.
- Comprobar que `app/`, `components/` y `lib/` no cambian.

**Fuera de alcance (para specs futuras):**

- La conexión de la app, el Server Action, la compresión de imágenes y el modal: van en SPEC 17.
- Editar, borrar, fijar o programar publicaciones; no hay políticas de `UPDATE`/`DELETE`.
- Reacciones y comentarios; no se crean sus tablas ni contadores reales.
- `posts.title` y `posts.room_id` del schema de referencia; no se usan en esta versión.
- Un modelo de salas por usuario; “toda la sala” se representa como `audience_kind = 'daycare'` (todo el centro).
- `daily_summaries`, notificaciones, correos y realtime.
- Limpieza automática de archivos huérfanos en Storage.
- Llenado de `post_photos.width` y `height`.
- Seed de publicaciones.
- Trigger de `updated_at`.
- Cambios en `daycares`, `rooms` o en los datos existentes.
- Migración de rollback, CLI de Supabase o stack local.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

### Enums

```sql
create type public.post_type as enum (
  'meal',
  'nap',
  'activity',
  'achievement',
  'mood',
  'photo',
  'announcement'
);

create type public.post_audience as enum ('children', 'daycare');
```

- `mood` se agrega porque la UI ya ofrece “Ánimo”; el schema de referencia no lo incluía.
- Los valores se guardan en inglés; la UI traduce (`Comida`, `Siesta`, `Actividad`, `Logro`, `Ánimo`, `Foto`, `Anuncio`).
- `children` cubre uno o varios niños; la tarjeta decide “familia de X” o “sus familias” contando `post_children`.

### Restricciones previas en `users` y `children`

```sql
alter table public.users
  add constraint users_id_daycare_key unique (id, daycare_id);

alter table public.children
  add constraint children_id_daycare_key unique (id, daycare_id);
```

- `users.id` y `children.id` ya son PK; el `UNIQUE` extra existe solo para las FK compuestas.
- No se modifican datos ni otras columnas.

### `posts`

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_name text not null,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  type public.post_type not null,
  audience_kind public.post_audience not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_author_daycare_fkey
    foreign key (author_id, daycare_id)
    references public.users (id, daycare_id)
    on delete restrict,
  constraint posts_id_daycare_key unique (id, daycare_id),
  constraint posts_body_length_check
    check (char_length(btrim(body, E' \t\n\r')) between 1 and 1000)
);

create index posts_daycare_published_idx
  on public.posts (daycare_id, published_at desc);
create index posts_author_id_idx on public.posts (author_id);

alter table public.posts enable row level security;
```

- `daycare_id` desnormalizado permite RLS y el feed sin unir por `users`.
- `author_name` es una copia del nombre al publicar: el feed no necesita leer `users` de otro autor, cuya política actual solo permite la fila propia.
- `audience_kind = 'daycare'` significa todo el centro; no se guarda un `post_children` por cada niño.
- `body` se guarda con `btrim`; la función también lo aplica.
- No se crea `title` ni `room_id`; no tienen uso en esta versión.

### Trigger de autor

```sql
create or replace function public.set_post_author_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select u.full_name
  into new.author_name
  from public.users u
  where u.id = new.author_id;

  if new.author_name is null then
    raise exception 'invalid_author' using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger posts_set_author_name
before insert on public.posts
for each row
execute function public.set_post_author_name();
```

- El trigger corre como el usuario que inserta (`SECURITY INVOKER`), no como el dueño de la tabla.
- `users_select_own` permite leer la fila propia; un `author_id` ajeno no devuelve fila y el insert falla.
- `author_name` se sobrescribe siempre; un insert directo no puede falsificar el nombre.
- No se crea trigger de `updated_at`; la edición no existe.

### `post_children`

```sql
create table public.post_children (
  post_id uuid not null,
  child_id uuid not null,
  daycare_id uuid not null,
  constraint post_children_pkey primary key (post_id, child_id),
  constraint post_children_post_daycare_fkey
    foreign key (post_id, daycare_id)
    references public.posts (id, daycare_id)
    on delete cascade,
  constraint post_children_child_daycare_fkey
    foreign key (child_id, daycare_id)
    references public.children (id, daycare_id)
    on delete cascade
);

create index post_children_child_id_idx
  on public.post_children (child_id);

alter table public.post_children enable row level security;
```

- Las dos FK compuestas garantizan que el post y el niño son de la misma guardería.
- `ON DELETE CASCADE` en ambas: si se borra un post o un niño, la etiqueta desaparece.
- La PK compuesta impide etiquetar al mismo niño dos veces.

### `post_photos`

```sql
create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.posts (id) on delete cascade,
  path text not null,
  position smallint not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint post_photos_path_key unique (path),
  constraint post_photos_post_position_key unique (post_id, position),
  constraint post_photos_position_check check (position between 0 and 3)
);

create index post_photos_post_id_idx on public.post_photos (post_id);

alter table public.post_photos enable row level security;
```

- `path` es relativo al bucket (`<daycare_id>/<draft_id>/<n>.webp`); la URL firmada se genera al leer.
- `UNIQUE (path)` impide reutilizar el mismo archivo en dos posts.
- `CHECK (position between 0 and 3)` y `UNIQUE (post_id, position)` limitan a cuatro fotos por post en la base.
- `width` y `height` quedan nullable; esta spec no los llena.

### Políticas RLS de `posts`

```sql
create policy "posts_select_staff_same_daycare"
on public.posts
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = posts.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "posts_select_parent_visible"
on public.posts
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = posts.daycare_id
      and u.role = 'parent'
  )
  and (
    (
      posts.audience_kind = 'daycare'
      and exists (
        select 1
        from public.parent_children pch
        join public.children c on c.id = pch.child_id
        where pch.parent_id = (select auth.uid())
          and c.daycare_id = posts.daycare_id
          and c.status = 'active'
      )
    )
    or exists (
      select 1
      from public.post_children pc
      join public.parent_children pch on pch.child_id = pc.child_id
      where pc.post_id = posts.id
        and pch.parent_id = (select auth.uid())
    )
  )
);

create policy "posts_insert_staff"
on public.posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = posts.daycare_id
      and u.role in ('staff', 'admin')
      and u.status = 'active'
  )
);
```

- El staff ve todo su daycare; el padre de un niño activo ve los anuncios del centro y los posts de sus hijos.
- Un padre sin hijos activos no ve anuncios nuevos; los posts etiquetados a un hijo archivado siguen visibles para su familia.
- `posts_insert_staff` exige que el autor sea el usuario autenticado; no se puede publicar a nombre de otro.
- `auth.uid()` va envuelto en `(select …)` para que se evalúe una vez por consulta.
- No hay `UPDATE` ni `DELETE`: editar y borrar quedan fuera de alcance.

### Función auxiliar `is_post_author`

```sql
create or replace function public.is_post_author(
  p_post_id uuid,
  p_daycare_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.author_id = auth.uid()
      and p.daycare_id = p_daycare_id
  );
$$;

revoke execute on function public.is_post_author(uuid, uuid) from public, anon;
grant execute on function public.is_post_author(uuid, uuid)
  to authenticated, service_role;
```

- Rompe el ciclo `post_children_insert_author → posts → post_children` que Postgres detecta al evaluar la política original.
- `SECURITY DEFINER` es necesario para leer `posts` sin volver a evaluar su RLS; la función no expone filas, solo un booleano.
- `search_path = public` fijo y `EXECUTE` solo para `authenticated` y `service_role`; `anon` y `PUBLIC` quedan revocados.

### Políticas RLS de `post_children`

```sql
create policy "post_children_select_staff_same_daycare"
on public.post_children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = post_children.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "post_children_select_parent_linked"
on public.post_children
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_children pch
    where pch.child_id = post_children.child_id
      and pch.parent_id = (select auth.uid())
  )
);

create policy "post_children_insert_author"
on public.post_children
for insert
to authenticated
with check (
  public.is_post_author(post_children.post_id, post_children.daycare_id)
);
```

- El padre solo ve las etiquetas de sus hijos; no descubre los otros niños del post.
- `post_children_insert_author` delega en `public.is_post_author`, que valida `post_id` y `daycare_id` sin disparar de nuevo la RLS de `posts`. Así se evita la recursión entre el `INSERT` de `post_children` y el `SELECT` de `posts`.
- `public.is_post_author` es `SECURITY DEFINER` con `search_path = public`; solo devuelve un booleano y exige `auth.uid()`. `EXECUTE` se revoca de `PUBLIC` y `anon` y se concede a `authenticated` y `service_role`.

### Políticas RLS de `post_photos`

```sql
create policy "post_photos_select_visible_post"
on public.post_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_photos.post_id
  )
);

create policy "post_photos_insert_author"
on public.post_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts p
    join public.users u on u.id = (select auth.uid())
    where p.id = post_photos.post_id
      and p.author_id = (select auth.uid())
      and u.daycare_id = p.daycare_id
      and u.daycare_id::text = split_part(post_photos.path, '/', 1)
  )
);
```

- La política de lectura delega en la RLS de `posts`: si el post no es visible, la foto tampoco.
- La política de inserción exige que el post sea del usuario; el `post_id` se genera dentro de `create_post`.

### Función `create_post`

```sql
create or replace function public.create_post(
  p_type public.post_type,
  p_audience_kind public.post_audience,
  p_body text,
  p_child_ids uuid[] default '{}',
  p_photo_paths text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_body text;
  v_post_id uuid := gen_random_uuid();
  v_child_count integer;
  v_photo_count integer;
begin
  select u.*
  into v_user
  from public.users u
  where u.id = (select auth.uid());

  if v_user.id is null
     or v_user.role not in ('staff', 'admin')
     or v_user.status <> 'active' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  v_body := btrim(coalesce(p_body, ''), E' \t\n\r');

  if char_length(v_body) = 0 or char_length(v_body) > 1000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  p_child_ids := coalesce(p_child_ids, '{}');
  p_photo_paths := coalesce(p_photo_paths, '{}');
  v_child_count := coalesce(array_length(p_child_ids, 1), 0);
  v_photo_count := coalesce(array_length(p_photo_paths, 1), 0);

  if v_photo_count > 4 then
    raise exception 'too_many_photos' using errcode = '22023';
  end if;

  if p_audience_kind = 'daycare' then
    if v_child_count <> 0 then
      raise exception 'invalid_children' using errcode = '22023';
    end if;
  else
    if v_child_count = 0 then
      raise exception 'children_required' using errcode = '22023';
    end if;

    if (
      select count(distinct child_id)
      from unnest(p_child_ids) as child_id
    ) <> v_child_count then
      raise exception 'invalid_children' using errcode = '22023';
    end if;

    if exists (
      select 1
      from unnest(p_child_ids) as child_id
      where not exists (
        select 1
        from public.children c
        where c.id = child_id
          and c.daycare_id = v_user.daycare_id
          and c.status = 'active'
      )
    ) then
      raise exception 'invalid_children' using errcode = '22023';
    end if;
  end if;

  if v_photo_count > 0 then
    if p_audience_kind = 'daycare' then
      if exists (
        select 1
        from public.children c
        where c.daycare_id = v_user.daycare_id
          and c.status = 'active'
          and not c.photo_consent
      ) then
        raise exception 'photo_consent_missing' using errcode = '22023';
      end if;
    elsif exists (
      select 1
      from public.children c
      where c.id = any(p_child_ids)
        and not c.photo_consent
    ) then
      raise exception 'photo_consent_missing' using errcode = '22023';
    end if;

    if exists (
      select 1
      from unnest(p_photo_paths) as path
      where split_part(path, '/', 1) <> v_user.daycare_id::text
    ) then
      raise exception 'invalid_photo_path' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.post_photos pp
      where pp.path = any(p_photo_paths)
    ) then
      raise exception 'photo_path_in_use' using errcode = '23505';
    end if;
  end if;

  insert into public.posts (
    id,
    author_id,
    author_name,
    daycare_id,
    type,
    audience_kind,
    body
  )
  values (
    v_post_id,
    v_user.id,
    v_user.full_name,
    v_user.daycare_id,
    p_type,
    p_audience_kind,
    v_body
  );

  if p_audience_kind = 'children' then
    insert into public.post_children (post_id, child_id, daycare_id)
    select v_post_id, child_id, v_user.daycare_id
    from unnest(p_child_ids) as child_id;
  end if;

  if v_photo_count > 0 then
    insert into public.post_photos (post_id, path, position)
    select v_post_id, path, (ordinality - 1)::smallint
    from unnest(p_photo_paths) with ordinality as photo(path, ordinality);
  end if;

  return v_post_id;
end;
$$;

revoke all on function public.create_post(
  public.post_type,
  public.post_audience,
  text,
  uuid[],
  text[]
) from public, anon;

grant execute on function public.create_post(
  public.post_type,
  public.post_audience,
  text,
  uuid[],
  text[]
) to authenticated;
```

- `SECURITY INVOKER` mantiene las políticas RLS activas; no se necesita `service_role`.
- La función inserta en una transacción: si falla cualquier paso, no queda un post a medias.
- El autor y la guardería se derivan de `auth.uid()`; el cliente no los envía.
- `p_child_ids` debe venir vacío con `daycare` y con al menos un niño con `children`.
- Las fotos se validan contra `photo_consent`:
  - `daycare`: todos los niños activos del centro deben tener consentimiento.
  - `children`: todos los niños seleccionados deben tener consentimiento.
- La ruta debe empezar por `<daycare_id>/`; el resto lo valida la app.
- `photo_path_in_use` evita robar la foto de otro post.
- Los errores usan `message` cortos que el Server Action traduce en SPEC 17.

### Bucket y políticas de Storage

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "post_photos_insert_staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role in ('staff', 'admin')
      and u.status = 'active'
      and u.daycare_id::text = (storage.foldername(name))[1]
  )
);

create policy "post_photos_select_visible"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-photos'
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.path = storage.objects.name
      and p.daycare_id::text = (storage.foldername(name))[1]
  )
);
```

- Bucket privado: no hay URL pública; la app genera URLs firmadas de 60 minutos.
- La ruta obligatoria es `<daycare_id>/<draft_id>/<n>.webp`; la política de subida valida el primer segmento.
- La política de lectura delega en `post_photos` y exige que la carpeta del objeto coincida con el daycare del post; si el post no es visible, `createSignedUrls` falla.
- No se permiten `UPDATE` ni `DELETE` de objetos: editar y borrar quedan fuera de alcance.
- El límite de 5 MB es superior al tamaño esperado tras comprimir a WebP; actúa como tope de seguridad.

## Plan de implementación

1. Aplicar `create_post_enums` con el MCP: crear `public.post_type` con los siete valores y `public.post_audience` con dos. Verificar con `pg_enum` el orden y los valores. Guardar `supabase/migrations/<version>_create_post_enums.sql`.
2. Aplicar `create_posts` con el MCP: agregar `UNIQUE (id, daycare_id)` a `users` y `children`; crear `posts`, `post_children` y `post_photos` con sus columnas, FK compuestas, `CHECK`, `UNIQUE`, índices, RLS activo y el trigger `posts_set_author_name`. Verificar con `information_schema.columns`, `pg_constraint`, `pg_indexes` y `pg_trigger`. Guardar el SQL exacto.
3. Aplicar `add_posts_policies` con el MCP: crear las ocho políticas de las tres tablas. Verificar con `pg_policies` el `cmd`, los `roles`, el `qual` y el `with_check`. Guardar el SQL exacto.
4. Aplicar `create_post_photos_bucket` con el MCP: crear el bucket y las dos políticas de `storage.objects`. Verificar con `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'post-photos'` y `pg_policies`. Guardar el SQL exacto.
5. Aplicar `create_post_rpc` con el MCP: crear `public.create_post`, revocar y conceder `EXECUTE`. Verificar la firma con `pg_proc` y los grants con `information_schema.routine_privileges`. Guardar el SQL exacto.
6. Aplicar `fix_post_children_policy_recursion` con el MCP: crear `public.is_post_author`, revocar `EXECUTE` de `PUBLIC` y `anon`, concederlo a `authenticated` y `service_role`, y reemplazar `post_children_insert_author` para delegar en la función. Verificar con `pg_proc`, `information_schema.routine_privileges` y una inserción de `post_children` dentro de una transacción. Guardar el SQL exacto.
7. Verificar RLS de lectura y escritura dentro de transacciones:

   ```sql
   begin;
   set local role anon;
   select count(*) from public.posts;
   select count(*) from public.post_children;
   select count(*) from public.post_photos;
   commit;
   ```

   Los tres conteos deben ser `0`.

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
   select public.create_post(
     'activity',
     'children',
     'Prueba de publicación',
     array(
       select id from public.children
       where status = 'active'
       limit 1
     ),
     '{}'
   );
   select count(*) from public.posts;
   select count(*) from public.post_children;
   rollback;
   ```

   El usuario demo (staff) debe poder publicar y ver una fila; el `rollback` no deja datos.

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}';
   select public.create_post('activity', 'daycare', 'No debería poder', '{}', '{}');
   rollback;
   ```

   Un UUID sin fila en `public.users` debe fallar con `not_allowed` o por RLS.

8. Verificar el caso padre. Si la base ya tiene un usuario `parent` con un hijo vinculado (SPEC 15), usarlo. Si no, crear uno temporal dentro de una transacción:

   ```sql
   begin;
   insert into auth.users (
     instance_id, id, aud, role, email,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at
   )
   values (
     '00000000-0000-0000-0000-000000000000',
     '00000000-0000-4000-8000-0000000000aa',
     'authenticated',
     'authenticated',
     'parent-test@example.com',
     '{}',
     '{"full_name":"Padre Prueba","role":"parent","daycare_id":"<daycare_id>"}',
     now(),
     now()
   );
   insert into public.parent_children (parent_id, child_id, relationship)
   select '00000000-0000-4000-8000-0000000000aa', id, 'guardian'
   from public.children where status = 'active' limit 1;
   -- insertar un post con el staff demo antes de cambiar de rol
   -- ...
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000aa","role":"authenticated"}';
   select count(*) from public.posts;
   select count(*) from public.post_children;
   select count(*) from public.post_photos;
   rollback;
   ```

   El padre debe ver el post de su hijo y el post `daycare`, y no los de otros niños.

9. Verificar la función con fotos:
   - Un post `daycare` con fotos debe fallar con `photo_consent_missing` si algún niño activo tiene `photo_consent = false`.
   - Un post `children` con un niño sin consentimiento debe fallar igual.
   - Rutas con otro `<daycare_id>` deben fallar con `invalid_photo_path`.

10. Verificar Storage:
   - `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'post-photos'` devuelve `public = false`, 5 MB y los tres MIME.
   - `pg_policies` muestra `post_photos_insert_staff` y `post_photos_select_visible` sobre `storage.objects`.
   - La subida real de un archivo se valida en SPEC 17 con Playwright.

11. Ejecutar `get_advisors` de seguridad y performance, `list_migrations`, `npx tsc --noEmit`, `npm run lint` y `git diff --stat`. Confirmar que solo cambiaron `supabase/migrations/` y esta spec, y que `app/`, `components/` y `lib/` no cambiaron.

## Criterios de aceptación

- [x] `public.post_type` existe con `meal`, `nap`, `activity`, `achievement`, `mood`, `photo` y `announcement`, en ese orden.
- [x] `public.post_audience` existe con `children` y `daycare`, en ese orden.
- [x] `public.posts` existe con diez columnas: `id`, `author_id`, `author_name`, `daycare_id`, `type`, `audience_kind`, `body`, `published_at`, `created_at` y `updated_at`.
- [x] `posts.id` es `uuid PRIMARY KEY` con default `gen_random_uuid()`.
- [x] `posts.author_id` y `posts.daycare_id` son `uuid NOT NULL` y existe la FK compuesta `(author_id, daycare_id)` a `users(id, daycare_id)` con `ON DELETE RESTRICT`.
- [x] `posts.daycare_id` tiene FK a `public.daycares(id)` con `ON DELETE RESTRICT`.
- [x] `posts.author_name` es `text NOT NULL`.
- [x] Existe el trigger `posts_set_author_name` `BEFORE INSERT` sobre `posts`.
- [x] Un insert con `author_name` falso se guarda con el `full_name` real del autor.
- [x] Un insert con un `author_id` sin fila en `users` falla con `invalid_author`.
- [x] `posts.body` tiene `CHECK` de 1 a 1000 caracteres sobre `btrim`.
- [x] `posts.audience_kind` es `public.post_audience NOT NULL`.
- [x] Existe `UNIQUE (id, daycare_id)` en `posts`, `users` y `children`.
- [x] `public.post_children` existe con `post_id`, `child_id`, `daycare_id` y PK `(post_id, child_id)`.
- [x] `post_children` tiene FK compuesta a `posts(id, daycare_id)` y a `children(id, daycare_id)`, ambas con `ON DELETE CASCADE`.
- [x] Existe el índice `post_children_child_id_idx`.
- [x] `public.post_photos` existe con `id`, `post_id`, `path`, `position`, `width`, `height` y `created_at`.
- [x] `post_photos.path` es `text NOT NULL` con `UNIQUE`.
- [x] `post_photos.position` es `smallint NOT NULL` con `CHECK` entre 0 y 3 y `UNIQUE (post_id, position)`.
- [x] `post_photos.post_id` tiene FK a `posts(id)` con `ON DELETE CASCADE`.
- [x] Existen los índices `posts_daycare_published_idx`, `posts_author_id_idx` y `post_photos_post_id_idx`.
- [x] RLS está activo en `posts`, `post_children` y `post_photos`.
- [x] `pg_policies` muestra las ocho políticas descritas, con los roles y comandos correctos.
- [x] No hay políticas de `UPDATE` ni `DELETE` en las tres tablas.
- [x] `anon` obtiene `0` filas de las tres tablas.
- [x] El usuario staff demo puede publicar con `create_post` y ve su post, sus niños y sus fotos.
- [x] Un UUID ajeno no puede publicar y obtiene `0` filas.
- [x] Un padre con al menos un hijo activo ve los posts `daycare` y los de sus hijos, y no los de otros niños.
- [x] Un padre sin hijos activos no ve los posts `daycare`.
- [x] `create_post` rechaza un cuerpo vacío, uno de más de 1000 caracteres y una audiencia incoherente.
- [x] `create_post` rechaza niños de otra guardería, niños archivados y listas con duplicados.
- [x] `create_post` rechaza más de cuatro fotos.
- [x] `create_post` rechaza fotos cuando un destinatario no tiene `photo_consent`.
- [x] `create_post` rechaza rutas que no empiezan por el `<daycare_id>` del autor.
- [x] `create_post` rechaza rutas ya usadas por otro post.
- [x] `public.is_post_author` existe, es `SECURITY DEFINER` con `search_path = public` y `EXECUTE` solo para `authenticated` y `service_role`.
- [x] La función `create_post` es `SECURITY INVOKER`, tiene `search_path = ''` y `EXECUTE` solo para `authenticated`.
- [x] El bucket `post-photos` existe con `public = false`, `file_size_limit = 5242880` y los MIME `image/webp`, `image/jpeg` e `image/png`.
- [x] `storage.objects` tiene las políticas `post_photos_insert_staff` y `post_photos_select_visible`.
- [x] `list_migrations` muestra las seis migraciones y existe un archivo por cada una con el mismo prefijo y el SQL exacto.
- [x] `get_advisors` no reporta errores (`ERROR`) nuevos.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] `git diff --stat` no muestra cambios en `app/`, `components/` ni `lib/`; el único cambio tracked es el preexistente en `skills-lock.json`.
- [x] `app/`, `components/` y `lib/` no cambiaron.

## Decisiones tomadas y descartadas

- **Sí:** `posts.author_name` desnormalizado. Evita abrir `users` a todos los roles solo para mostrar el autor y deja el feed con una sola consulta.
- **Sí:** trigger `posts_set_author_name`. Cierra la falsificación del autor por un insert directo; el nombre siempre sale de `users.full_name`.
- **Sí:** `posts.daycare_id` desnormalizado. Hace la RLS y el filtro del feed directos, sin unir por `users`.
- **Sí:** FK compuesta `(author_id, daycare_id)`. Impide publicar en una guardería que no es la del autor.
- **Sí:** `audience_kind = 'daycare'` para “Toda la sala”. No duplica una fila por niño ni deja afuera a los niños que se inscriban después.
- **Sí:** `post_children` solo con niños específicos. Los anuncios del centro no llevan etiquetas.
- **Sí:** `post_photos.path` en vez de una URL. El bucket es privado y la URL firmada se genera al leer.
- **Sí:** máximo de cuatro fotos en la base con `CHECK` y `UNIQUE`. Es una regla del producto, no solo de la UI.
- **Sí:** `create_post` como función atómica. Evita posts a medias si falla una de las tres inserciones.
- **Sí:** `is_post_author` como helper `SECURITY DEFINER`. Rompe la recursión real entre el `INSERT` de `post_children` y el `SELECT` de `posts`; solo devuelve un booleano y su `EXECUTE` queda limitado a `authenticated` y `service_role`.
- **Sí:** `SECURITY INVOKER` en `create_post`. Mantiene RLS y no requiere `service_role`.
- **Sí:** `photo_consent` validado en la base. La UI también lo valida, pero la base es la última defensa.
- **Sí:** bucket privado con URLs firmadas de 60 minutos. Coherente con fotos de menores.
- **Sí:** una sola política de lectura de Storage que delega en `post_photos`. Evita duplicar la lógica de visibilidad.
- **No:** `posts.title` y `posts.room_id`. No se usan en esta versión; “todo el centro” no es una sala.
- **No:** tabla `post_rooms` o selector de salas. Hoy `users` no tiene sala y el alcance elegido es todo el centro.
- **No:** editar, borrar, fijar o programar. No hay `UPDATE`/`DELETE`.
- **No:** reacciones y comentarios. Quedan en 0 en la UI.
- **No:** `daily_summaries`, notificaciones, correos o realtime.
- **No:** limpieza automática de archivos huérfanos. La app borra los suyos si falla el insert; un job futuro puede barrer el resto.
- **No:** llenar `width`/`height`. La UI usa proporciones CSS.
- **No:** seed de publicaciones. El feed arranca vacío.
- **No:** trigger de `updated_at`. La edición no existe todavía.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `users` solo permite leer la fila propia y el feed muestra autores vacíos | Se guarda `author_name` en `posts` al publicar |
| Un insert directo falsifica `author_name` | El trigger `posts_set_author_name` lo sobrescribe con `users.full_name` |
| La FK compuesta exige `UNIQUE (id, daycare_id)` y se olvida | Agregarlo a `users` y `children` en la misma migración y verificar con `pg_constraint` |
| `posts_select_parent_visible` y `post_children` entran en recursión | La política de `INSERT` de `post_children` usa `public.is_post_author`, que lee `posts` sin volver a evaluar su RLS; verificado con inserciones reales en transacción |
| `post_photos` consulta `posts` y `posts` consulta `post_children` | No hay ciclo: `post_children` no vuelve a `posts` en `SELECT` |
| Un staff sube archivos huérfanos sin crear el post | La app borra los objetos si el insert falla; la limpieza periódica queda para una spec futura |
| Las URLs firmadas caducan mientras la página está abierta | TTL de 60 minutos; al recargar se firman de nuevo |
| `create_post` acepta una ruta de otra guardería | Se valida `split_part(path, '/', 1) = daycare_id` |
| Un staff reutiliza la foto de otro post | `UNIQUE (path)` y la validación `photo_path_in_use` |
| `mood` no existe en el schema de referencia | Se agrega al enum; el schema es una propuesta, no la verdad aplicada |
| El bucket se crea público por error | `public = false` explícito y verificación en `storage.buckets` |
| Las políticas de Storage no se aplican por nombres de bucket | Prefijar cada política con `bucket_id = 'post-photos'` |
| La prueba del padre requiere datos que no existen | Crear un padre temporal en una transacción y hacer `rollback` |
| Las pruebas dejan posts o archivos | Toda verificación de escritura va dentro de `begin; … rollback;` |
| `get_advisors` marca RLS sin políticas en tablas ajenas | Revisar solo las tres tablas nuevas; los avisos preexistentes se aceptan |

## Qué **no** entra en esta spec

- La conexión de la app, el Server Action, la compresión de imágenes, el modal y el feed real.
- Editar, borrar, fijar o programar publicaciones.
- Reacciones y comentarios.
- `posts.title`, `posts.room_id` y un modelo de salas por usuario.
- `daily_summaries`, notificaciones, correos y realtime.
- Limpieza automática de archivos huérfanos.
- Llenado de `post_photos.width` y `height`.
- Seed de publicaciones.
- Trigger de `updated_at`.
- Cambios en `daycares`, `rooms` o en los datos existentes.
- Migración de rollback, CLI de Supabase o stack local.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
