# Migración de base de datos a producción

**Fecha:** 4 de noviembre de 2026
**Origen:** `ctephacymeahjbeomqkr` (OpenDayCare, us-east-2)
**Destino:** `utlnsksjiypdtasupqhh` (Opendaycare-prod, us-east-1)

## Objetivo

Clonar la instancia de desarrollo (esquema, RLS, triggers, funciones, usuarios de Auth, datos y Storage) a una instancia de producción que estaba completamente vacía, usando el Supabase CLI.

## Resumen

| Elemento | Dev | Prod | Estado |
| --- | --- | --- | --- |
| Tablas en `public` | 9 | 9 | ✅ |
| Objetos de esquema (políticas, funciones, enums, índices, triggers) | 78 | 78 | ✅ sin diferencias |
| Políticas `public` | 17 | 17 | ✅ |
| Políticas `storage.objects` | 2 | 2 | ✅ |
| Funciones en `public` | 7 | 7 | ✅ |
| Triggers propios | 2 | 2 | ✅ |
| Usuarios en `auth.users` | 2 | 2 | ✅ hashes idénticos |
| Daycares / Rooms / Children | 4 / 3 / 2 | 4 / 3 / 2 | ✅ |
| Invitations / ParentChildren | 1 / 1 | 1 / 1 | ✅ |
| Posts / PostChildren / PostPhotos | 3 / 2 / 1 | 3 / 2 / 1 | ✅ |
| Bucket `post-photos` | 1 objeto | 1 objeto | ✅ hash idéntico |

## Procedimiento

### 1. Preparación

```bash
npx supabase init                 # crea supabase/config.toml y supabase/.gitignore
npx supabase login                # sesión del CLI
npx supabase link --project-ref utlnsksjiypdtasupqhh
```

- Se verificó que producción estaba vacía (`public` sin tablas, `auth.users` en 0).
- Se compararon las columnas de `auth.users` entre dev y prod: coinciden exactamente, lo que permite restaurar los usuarios por SQL.

### 2. Esquema mediante migraciones

```bash
npx supabase migration fetch --remote=ctephacymeahjbeomqkr   # trae las 2 migraciones que faltaban en el repo
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
```

Se aplicaron **28 migraciones** en producción: enums, tablas, índices, constraints, funciones, triggers, políticas RLS, bucket de Storage y seeds (`daycares`, `rooms`, usuario demo).

> `supabase migration fetch` reescribió los 26 archivos existentes con formato del historial remoto. Esos cambios cosméticos se revirtieron; solo se conservaron los 2 archivos nuevos:
> - `20261026212209_create_connection_test_table.sql`
> - `20261026212734_drop_connection_test_table.sql`

### 3. Usuarios de Auth

Los usuarios no se migran con `db push`. `supabase db dump` no era viable porque requiere Docker/`pg_dump` local, que no está instalado. Alternativa usada:

1. Generar los `INSERT` desde el propio Postgres con `jsonb_populate_record` y `to_jsonb`, excluyendo columnas generadas.
2. Limpiar los seeds creados por las migraciones (`truncate` + borrado de `auth.users` / `auth.identities`).
3. Restaurar con `set session_replication_role = replica;` para desactivar triggers y comprobaciones de FK durante la carga.

Se copiaron únicamente `auth.users` y `auth.identities`. **No** se copiaron `sessions`, `refresh_tokens`, MFA ni `schema_migrations`, por lo que los usuarios deben iniciar sesión de nuevo.

### 4. Datos de `public`

Dump generado desde dev con el mismo mecanismo y aplicado a prod con `supabase db query --file`. Se conservaron IDs, timestamps y valores originales.

### 5. Storage

`supabase storage cp` no soporta remoto→local en la versión 3.0.0 del CLI. Procedimiento usado:

1. Descarga del objeto con la Storage API y la service role de dev.
2. Subida a prod con `PUT /storage/v1/object/post-photos/...` y `x-upsert: true`.
3. Corrección de `owner` y `cacheControl` en `storage.objects` para igualar dev.

Verificación: SHA-256 idéntico (59 668 bytes) y URL firmada con respuesta 200.

### 6. Verificaciones

- **Paridad de esquema:** 78 objetos comparados entre dev y prod, cero diferencias.
- **Advisors:** los mismos avisos que en dev, ninguno nuevo.
- **RLS vía REST:**
  - `anon` → 0 posts.
  - Staff autenticado → 3 posts, 2 niños, 1 guardería.
- **Storage:** descarga y URL firmada correctas.
- **Auth:** login del usuario demo contra la API de producción (200) tras rotar su contraseña.

## Credenciales de producción (públicas)

```
URL:             https://utlnsksjiypdtasupqhh.supabase.co
Publishable key: sb_publishable_nmX1otXsJU0Nc_KqAJxyyw_etaff9VN
```

La **service role key** se obtiene desde el dashboard y solo debe usarse en el servidor (`SUPABASE_SERVICE_ROLE_KEY`).

## Seguridad

- El usuario demo `luisarevalo@google.com` se conservó y **se le rotó la contraseña** X82bDTtAERpcd1yHFVs3L5vl.
- La migración `20261027191305_seed_demo_user.sql` todavía contiene el hash antiguo de contraseña conocida. Si producción se reconstruye desde cero, esa contraseña volvería a estar activa.
- Se eliminaron las sesiones de prueba creadas durante la verificación (`auth.sessions` y `auth.refresh_tokens` en 0).
- Los dumps temporales con PII y hashes se generaron en `%TEMP%` y se borraron al terminar.

## Pendiente (configuración fuera de la base de datos)

1. **Auth → URL Configuration:** Site URL y redirect URLs con el dominio de producción (`/auth/login`, `/auth/activate`).
2. **Auth → SMTP / plantillas:** configurar Resend/SMTP para emails de confirmación y recuperación. Las invitaciones de la app usan `RESEND_API_KEY` desde el deploy.
3. **Leaked Password Protection:** activarla en Authentication.
4. **Variables de entorno del deploy:**
   - `NEXT_PUBLIC_SUPABASE_URL=https://utlnsksjiypdtasupqhh.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nmX1otXsJU0Nc_KqAJxyyw_etaff9VN`
   - `SUPABASE_SERVICE_ROLE_KEY` (desde el dashboard)
   - `NEXT_PUBLIC_APP_URL` (dominio de producción)
   - `RESEND_API_KEY`

## Advisors actuales en producción

Los mismos que en dev:

- Funciones `SECURITY DEFINER` ejecutables por `anon`: `handle_new_user`, `rls_auto_enable`.
- Funciones `SECURITY DEFINER` ejecutables por `authenticated`: helpers de RLS.
- `auth_leaked_password_protection` deshabilitado.
- Mejoras de performance: `auth_rls_initplan` y `multiple_permissive_policies`.

Ninguno es bloqueante; se recomienda abordarlos en una spec de hardening.

## Cambios locales generados

```
?? supabase/.gitignore
?? supabase/config.toml
?? supabase/migrations/20261026212209_create_connection_test_table.sql
?? supabase/migrations/20261026212734_drop_connection_test_table.sql
```

`config.toml` deja el proyecto listo para futuros `db push`. Las 2 migraciones nuevas reconcilian el repo con el historial real de dev.

## Replicar este proceso en otro entorno

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref <REF_DESTINO>
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
# Restaurar auth.users/auth.identities y datos de public (ver secciones 3 y 4)
# Copiar objetos de Storage (ver sección 5)
# Rotar la contraseña del usuario demo y configurar Auth del proyecto
```
