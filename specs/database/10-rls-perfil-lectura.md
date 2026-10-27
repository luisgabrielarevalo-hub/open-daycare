# SPEC 10 — Supabase: RLS de lectura del perfil

> **Estado:** Implementado
> **Depende de:** SPEC 07 (tabla `public.daycares`), SPEC 08 (tabla `public.users`, usuario demo)
> **Fecha:** 2026-10-27
> **Objetivo:** Añadir políticas RLS de `SELECT` para que un usuario autenticado lea su propia fila de `public.users` y la guardería a la que pertenece, sin abrir escrituras ni acceso anónimo.

## Alcance

**In:**

- Crear una migración `add_profile_read_policies` en `supabase/migrations/` y aplicarla al proyecto remoto con el MCP `apply_migration`.
- Leer la versión asignada en `list_migrations` y guardar en el repo el SQL exacto con ese prefijo.
- Crear la política `users_select_own` en `public.users`:
  - `for select`.
  - `to authenticated`.
  - `using (auth.uid() = id)`.
- Crear la política `daycares_select_own` en `public.daycares`:
  - `for select`.
  - `to authenticated`.
  - `using` con `exists` sobre `public.users`, filtrando por `u.id = auth.uid()` y `u.daycare_id = daycares.id`.
- No crear políticas de `INSERT`, `UPDATE` ni `DELETE`.
- No modificar grants ni revokes.
- No cambiar el esquema, los índices, los triggers ni los datos.
- Verificar con `pg_policies` que las políticas existen, son `SELECT` y están limitadas a `authenticated`.
- Verificar con `set local role anon` que `public.users` y `public.daycares` devuelven cero filas.
- Verificar con `set local role authenticated` y `set local request.jwt.claims` que el usuario demo ve su fila y solo su guardería.
- Verificar con otro UUID que no ve usuarios ni guarderías.
- Comprobar que `public.users` sigue con una fila y `public.daycares` con cuatro.
- Ejecutar `get_advisors`, `list_migrations`, `npx tsc --noEmit` y `npm run lint`.
- Comprobar con `git diff --stat` que solo cambian `supabase/migrations/` y esta spec.

**Fuera de alcance (para specs futuras):**

- Políticas para `children`, `parent_children`, `invitations`, `posts`, `rooms` u otras tablas.
- Políticas de escritura, grants explícitos o un modelo de permisos por rol.
- Cambios en la UI de perfil; eso va en SPEC 09.
- Trigger `AFTER INSERT` sobre `auth.users`, alta automática o función `SECURITY DEFINER`.
- Custom Access Token Hook o claims adicionales en el JWT.
- Columna `short_name` en `daycares` o cambios en sus datos.
- Soporte de usuarios con más de una guardería.
- Migración de rollback.
- CLI de Supabase o stack local.
- Cambios en `app/`, `components/` o `lib/`.

## Modelo de datos

No se crean tablas ni columnas. Se agregan dos políticas:

```sql
create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "daycares_select_own"
on public.daycares
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = daycares.id
  )
);
```

- Solo `SELECT`: no hay políticas de escritura.
- `to authenticated` excluye a `anon`.
- `auth.uid()` devuelve `null` sin claims, por lo que `anon` no ve filas.
- La política de `daycares` depende de `users_select_own` para que la subconsulta pueda leer la fila propia.
- La subconsulta filtra por la PK de `users`; no necesita un índice nuevo.
- No se agregan funciones, triggers, grants ni revokes.
- Los nombres de las políticas están en inglés y en `snake_case`.
- La migración no modifica los datos existentes.

## Plan de implementación

1. Aplicar `add_profile_read_policies` con el MCP `apply_migration`: crear `users_select_own` y luego `daycares_select_own`. Verificar con `pg_policies` el `cmd`, los `roles` y el `qual`. Leer la versión en `list_migrations` y crear `supabase/migrations/<version>_add_profile_read_policies.sql` con el SQL exacto.
2. Verificar `anon` dentro de una transacción:

   ```sql
   begin;
   set local role anon;
   select count(*) from public.users;
   select count(*) from public.daycares;
   commit;
   ```

   Ambos conteos deben ser `0`.

3. Verificar al usuario demo:

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
   select id, full_name, role, daycare_id from public.users;
   select id, name from public.daycares order by name;
   commit;
   ```

   Debe devolver una fila de `users` y solo `Guardería Sala Soles` de `daycares`.

4. Verificar aislamiento con otro UUID:

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}';
   select count(*) from public.users;
   select count(*) from public.daycares;
   commit;
   ```

   Ambos conteos deben ser `0`.

5. Verificar que no cambiaron los datos: `public.users` tiene una fila y `public.daycares` cuatro. Ejecutar `get_advisors` de seguridad y performance, `list_migrations`, `npx tsc --noEmit`, `npm run lint` y `git diff --stat`. Confirmar que `app/`, `components/` y `lib/` no cambiaron.

## Criterios de aceptación

- [x] `list_migrations` muestra la migración `add_profile_read_policies`.
- [x] Existe un archivo en `supabase/migrations/` con el mismo prefijo de versión y el SQL exacto aplicado.
- [x] `pg_policies` muestra `users_select_own` en `public.users`, con `cmd = SELECT`, roles `{authenticated}` y `qual` equivalente a `auth.uid() = id`.
- [x] `pg_policies` muestra `daycares_select_own` en `public.daycares`, con `cmd = SELECT`, roles `{authenticated}` y una condición que limita a la guardería del usuario.
- [x] No hay políticas de `INSERT`, `UPDATE` ni `DELETE` en `public.users` ni en `public.daycares`.
- [x] La migración no contiene `GRANT` ni `REVOKE`.
- [x] `anon` obtiene `0` filas de `public.users` y `0` de `public.daycares`.
- [x] El usuario demo obtiene exactamente su propia fila de `public.users`.
- [x] El usuario demo obtiene exactamente `Guardería Sala Soles` de `public.daycares`, no las otras tres.
- [x] Un UUID distinto obtiene `0` usuarios y `0` guarderías.
- [x] `public.users` sigue con una fila y `public.daycares` con cuatro.
- [x] `get_advisors` ya no reporta “RLS enabled no policy” para `public.users` ni `public.daycares`, y no aparecen errores nuevos distintos de los WARN preexistentes.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] `git diff --stat` solo muestra la migración y esta spec.
- [x] `app/`, `components/` y `lib/` no cambiaron.

## Decisiones tomadas y descartadas

- **Sí:** solo la fila propia de `public.users`. Es la mínima exposición necesaria para el sidebar.
- **Sí:** solo la guardería propia. Permite mostrar `Sala Soles` sin exponer las otras tres.
- **Sí:** `to authenticated`. Excluye a `anon` de forma explícita.
- **Sí:** solo `SELECT`. La app no escribe en estas tablas en SPEC 09.
- **Sí:** una sola migración con las dos políticas. Son una unidad de lectura de perfil.
- **Sí:** `exists` sobre `public.users` para la política de `daycares`. Evita duplicar el `daycare_id` en el JWT.
- **Sí:** depender de `users_select_own` para la subconsulta. Las dos políticas se crean juntas.
- **Sí:** mantener los grants por defecto de Supabase. La migración no los toca.
- **Sí:** verificar con `set local role` y `request.jwt.claims`. Reproduce RLS sin navegador.
- **No:** políticas para otras tablas. No las usa SPEC 09.
- **No:** políticas de escritura. No hay flujos de edición.
- **No:** `SECURITY DEFINER` ni Custom Access Token Hook. Añaden complejidad sin necesidad.
- **No:** `GRANT`/`REVOKE`. Se conservan los defaults.
- **No:** cambios de esquema, índices o triggers.
- **No:** `short_name` en `daycares`. La UI recorta el prefijo.
- **No:** multi-guardería. El modelo actual tiene un `daycare_id` por usuario.
- **No:** acceso anónimo.
- **No:** cambios en la app.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La subconsulta de `daycares` no ve la fila de `users` por RLS | Crear `users_select_own` en la misma migración y verificar con el usuario demo |
| `authenticated` no tiene grant de `SELECT` | Verificar con `set local role authenticated`; Supabase otorga los grants por defecto y la migración no los cambia |
| `request.jwt.claims` mal formado en la verificación | Usar el UUID demo exacto, JSON válido y `begin; ... commit;` |
| `get_advisors` sigue marcando RLS sin políticas | Revisar `pg_policies.roles` y `cmd`; la política debe ser `SELECT` y `authenticated` |
| Nombres de políticas chocan con futuras políticas | Nombres descriptivos; cambiar solo con una migración nueva |
| La política de `daycares` degrada performance | La subconsulta filtra por la PK de `users`; el costo es despreciable |
| Un usuario sin fila en `public.users` no ve guarderías | SPEC 09 usa el fallback y oculta la sala |
| Se necesitan varias guarderías por usuario | Queda para una spec de modelo multi-guardería |
| `auth.uid()` es `null` y no se ve nada | Es el comportamiento esperado para `anon` |
| La migración se aplica pero el archivo no coincide | Leer `list_migrations` y copiar el SQL exacto con el prefijo |

## Qué **no** entra en esta spec

- Políticas para otras tablas.
- Políticas de escritura.
- Grants o revokes explícitos.
- Custom Access Token Hook o claims adicionales.
- Funciones `SECURITY DEFINER`.
- Cambios de esquema, índices o triggers.
- Cambios en la app o en la UI de perfil.
- Soporte multi-guardería.
- Acceso anónimo.
- Migración de rollback.

Cada punto, si llega, va en su propia spec.
