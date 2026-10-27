# SPEC 09 — Auth real y protección de rutas

> **Estado:** Implementado
> **Depende de:** SPEC 03 (pantallas de auth), SPEC 08 (usuario demo en `auth.users` y `public.users`), SPEC 10 (políticas RLS de lectura del perfil; implementar antes)
> **Fecha:** 2026-10-27
> **Objetivo:** Conectar `/auth/login` a Supabase con email y contraseña, cerrar sesión desde el sidebar y proteger `/`, `/kids` y `/kids/[slug]` con proxy y guard server-side, mostrando el perfil real del usuario autenticado.

## Alcance

**In:**

- Login real en `/auth/login` con `supabase.auth.signInWithPassword` desde un Server Action en `app/auth/login/actions.ts`.
- `components/auth/LoginForm.tsx` pasa a cliente y usa `useActionState`; el formulario envía email, contraseña y `next`.
- Validación nativa con `required` y `type="email"`; el Server Action también rechaza campos vacíos.
- Error inline debajo de la contraseña: `Email o contraseña incorrectos.` para credenciales inválidas y `No pudimos iniciar sesión. Intentá de nuevo.` para el resto.
- Mientras se envía, el botón queda deshabilitado y muestra `Ingresando…`.
- Tras un error, el email se conserva y la contraseña se limpia.
- Redirección post-login a `next` si es una ruta interna válida; si no, a `/`.
- `next` se propaga desde las rutas protegidas como `/auth/login?next=/kids`.
- `next` se valida con `URL`: debe ser interno, empezar con `/`, no empezar con `//` ni `/\` y no apuntar a `/auth/*`; cualquier otro valor cae a `/`.
- Protección optimista en `lib/supabase/proxy.ts`:
  - Sin sesión en `/`, `/kids` o `/kids/[slug]` → `/auth/login?next=<ruta+query>`.
  - Con sesión en `/auth/login` o `/auth/activate` → `/`.
  - `getClaims()` se llama antes de generar cualquier respuesta.
  - Al redirigir se copian las cookies y los headers de caché de `supabaseResponse`.
- Guard server-side en `lib/auth/profile.ts` con `requireProfile()`:
  - Llama a `getClaims()`; si no hay `sub`, redirige a `/auth/login`.
  - Consulta `public.users` con `full_name`, `role` y `daycares(name)` usando el cliente server.
  - Devuelve el tipo `StaffProfile` existente para no tocar `AppShell` ni `ComposerPrompt`.
- Perfil real en sidebar y feed:
  - `name` = `public.users.full_name`.
  - `initial` = primera letra del nombre en mayúscula.
  - `role` = `staff` → `Staff`, `parent` → `Familia`, `admin` → `Admin`.
  - `room` = `daycares.name` sin el prefijo `Guardería ` para mostrar (por ejemplo `Sala Soles`); si no hay guardería, queda vacío.
  - `childCount` y `dateLabel` se mantienen mock desde `feedSummary`.
- Fallback si el usuario autenticado no tiene fila en `public.users`:
  - Nombre desde `user_metadata.full_name` o la parte local del email; si no, `Usuario`.
  - Rol `Staff`.
  - Sin guardería: se oculta la línea de sala en el sidebar y el encabezado del feed muestra solo `GUARDERÍA`.
- Logout real desde el sidebar con `components/auth/LogoutButton.tsx`:
  - Cliente Supabase del navegador, `signOut()`.
  - Si funciona, `window.location.assign("/auth/login")` para recarga completa y limpieza del estado en memoria de `FeedProvider`.
  - Si falla, la sesión se mantiene, el botón se reactiva y el error se registra en consola.
- Las páginas `/`, `/kids` y `/kids/[slug]` pasan a `async` y usan `requireProfile()`.
- Se elimina `generateStaticParams()` de `/kids/[slug]` porque la página pasa a depender de cookies.
- `lib/data.ts`: se elimina `staffProfile` y se agrega `feedSummary`.
- `Sidebar` oculta la línea de sala cuando `profile.room` está vacío.
- `ComposerPrompt` recibe la inicial real del perfil.
- Se mantiene el enlace `¿Olvidaste tu contraseña?` con `href="#"`.
- Se mantiene `/auth/activate` como pantalla visual y pública.

**Fuera de alcance (para specs futuras):**

- Activación real con código de invitación, tabla `invitations`, aceptación de invitaciones y alta automática de usuarios.
- Recuperación de contraseña.
- OAuth, magic link, MFA, passkeys, “recordarme”, rate limiting y bloqueo por intentos.
- Roles y permisos por rol; RLS de escritura; grants explícitos.
- Perfil real de niños, conteo de niños y fecha dinámica.
- Renderizar `avatar_url`; se sigue usando la inicial.
- Persistencia de posts o feed con backend.
- Cambios en `/auth/activate` más allá de la redirección de usuario autenticado.
- Cambios en `public.users` o `public.daycares`; esas políticas van en SPEC 10.
- Ruta de callback de Auth.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

No se crean tablas ni columnas. SPEC 10 aporta las políticas RLS. La app introduce estos tipos y constantes:

```ts
type LoginState = {
  error: string | null;
  email: string;
  attempt: number;
};

type StaffProfile = {
  name: string;
  role: string;
  initial: string;
  room: string;
  childCount: number;
  dateLabel: string;
};

const feedSummary = {
  childCount: 12,
  dateLabel: "martes 17 jun",
} as const;
```

- `LoginState.error` es `null` o un mensaje en español.
- `LoginState.email` conserva el email tras un fallo.
- `LoginState.attempt` incrementa en cada envío fallido y permite limpiar la contraseña sin borrarla en el primer render.
- `requireProfile()` devuelve `StaffProfile` con datos reales y `childCount`/`dateLabel` desde `feedSummary`.
- `requireProfile()` se envuelve con `cache()` de React para deduplicar la consulta dentro de la misma request.
- La consulta usa `select("full_name, role, daycares(name)")` sobre `public.users` filtrando por `id = claims.sub`.
- `room` se calcula con `daycares.name.replace(/^Guardería\s+/i, "")`.
- Si `public.users` no devuelve fila, se usa el fallback de `claims.user_metadata.full_name`, `claims.email` o `Usuario`.
- `role` se traduce con un mapa `staff → Staff`, `parent → Familia`, `admin → Admin`; un valor inesperado cae a `Staff`.
- `initial` es la primera letra del nombre en mayúscula; si el nombre queda vacío, `U`.
- No se selecciona ni renderiza `avatar_url`.
- El único acceso a datos de la app es lectura de `public.users` y `public.daycares`; no hay escrituras.

## Plan de implementación

1. `lib/data.ts`: agregar `feedSummary` y conservar `staffProfile` por ahora. Verificar `npx tsc --noEmit`.
2. Crear `lib/auth/profile.ts` con `ROLE_LABELS`, el fallback y `requireProfile()` usando `getClaims()`, `createClient()` de `lib/supabase/server.ts`, `cache()` y `feedSummary`. Todavía sin usar en páginas. Verificar `npx tsc --noEmit`.
3. Crear `app/auth/login/actions.ts` con `loginAction`; convertir `LoginForm` a cliente con `useActionState`, validación, error inline, `attempt`, botón pendiente y campo oculto `next`; en `app/auth/login/page.tsx`, leer `searchParams.next` con `PageProps<"/auth/login">` y pasarlo. Verificar login válido, inválido y vacío.
4. Modificar `lib/supabase/proxy.ts` para detectar sesión con `getClaims()`, redirigir rutas protegidas a `/auth/login?next=...`, redirigir auth a `/` y preservar cookies/headers. Verificar `/`, `/kids`, `/kids/[slug]`, `/auth/login` y `/auth/activate` con y sin sesión.
5. Actualizar `app/page.tsx`, `app/kids/page.tsx` y `app/kids/[slug]/page.tsx` para usar `await requireProfile()`, eliminar `generateStaticParams()` de `/kids/[slug]`, usar el nombre real en el saludo y ajustar el encabezado del feed y el subtítulo del sidebar cuando no haya sala. Verificar que el perfil real aparece con SPEC 10 aplicada.
6. Eliminar `staffProfile` de `lib/data.ts` y confirmar que no quedan imports. Verificar `npx tsc --noEmit` y `npm run lint`.
7. Crear `components/auth/LogoutButton.tsx` con `signOut()` y recarga completa; reemplazar el enlace `href="#"` del `Sidebar`. Verificar logout en escritorio y drawer móvil.
8. Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; verificar con Playwright login, redirecciones, `next`, logout y perfil real a 1440×900 y 390×844.

## Criterios de aceptación

- [x] `/auth/login` carga sin errores en consola.
- [x] El formulario envía por Server Action y llama a `signInWithPassword`.
- [x] Con las credenciales del usuario demo de SPEC 08, el login redirige a `/` y la sesión persiste al recargar.
- [x] Con credenciales inválidas aparece `Email o contraseña incorrectos.`, no hay redirección, el email se conserva, la contraseña se limpia y el botón se reactiva.
- [x] Con campos vacíos, la validación nativa bloquea el envío; el Server Action también rechaza vacíos con `Ingresá tu email y contraseña.`
- [x] Mientras se envía, el botón está deshabilitado y muestra `Ingresando…`.
- [x] Sin sesión, `/` redirige a `/auth/login?next=%2F`.
- [x] Sin sesión, `/kids` redirige a `/auth/login?next=%2Fkids`.
- [x] Sin sesión, `/kids/mateo-fernandez` redirige con `next` igual a esa ruta.
- [x] Después de iniciar sesión desde una redirección, el usuario llega a la ruta de `next`.
- [x] `next` externo (`//evil.com`), con backslash, absoluto o `/auth/*` cae a `/`.
- [x] Con sesión, `/auth/login` redirige a `/`.
- [x] Con sesión, `/auth/activate` redirige a `/`.
- [x] Sin sesión, `/auth/activate` sigue accesible y visual.
- [x] El sidebar muestra `Luis Arévalo`, `Staff` y `Sala Soles` para el usuario demo.
- [x] El encabezado del feed muestra `GUARDERÍA · SALA SOLES` y el saludo `Buenas, Luis`.
- [x] El composer muestra la inicial `L`.
- [x] `staff` → `Staff`, `parent` → `Familia`, `admin` → `Admin`.
- [x] Si el usuario no tiene fila en `public.users`, la app no falla: usa el fallback, rol `Staff` y oculta la sala.
- [x] No se renderiza `avatar_url`; se mantiene la inicial.
- [x] `childCount` y `dateLabel` siguen siendo `12 niños · martes 17 jun`.
- [x] El logout llama a `signOut`, limpia la sesión y recarga `/auth/login` por completo.
- [x] Después del logout, las rutas protegidas vuelven a redirigir al login.
- [x] `¿Olvidaste tu contraseña?` sigue con `href="#"`.
- [x] La app no escribe en `public.users` ni en `public.daycares`.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] `npm run build` termina correctamente con las rutas protegidas dinámicas.
- [x] Playwright verifica login, redirecciones, `next`, logout y perfil a 1440×900 y 390×844.
- [x] Las pantallas de login y activación conservan el diseño de SPEC 03 salvo los estados de error y carga.
- [x] Ningún log ni archivo versionado contiene la contraseña demo.

## Decisiones tomadas y descartadas

- **Sí:** Server Action + `useActionState` para el login. Mantiene la autenticación en el servidor y permite devolver errores inline.
- **Sí:** mensaje genérico para credenciales inválidas. Evita enumerar usuarios.
- **Sí:** `required` y `type="email"` además de la validación del Server Action. Es accesible y barato.
- **Sí:** conservar el email y limpiar la contraseña tras un fallo. Coincide con la UX elegida.
- **Sí:** `next` validado con `URL` y reglas explícitas. Evita redirecciones abiertas.
- **Sí:** proxy optimista + `requireProfile()` server-side. Defensa en profundidad sin mover rutas.
- **Sí:** `getClaims()` en proxy y guard. Es la convención del repo y de `@supabase/ssr`.
- **Sí:** `requireProfile()` devuelve `StaffProfile`. Evita refactorizar `AppShell`, `Sidebar` y `ComposerPrompt`.
- **Sí:** perfil real de nombre, rol y guardería; `childCount` y `dateLabel` mock. No existe tabla `children`.
- **Sí:** recortar el prefijo `Guardería ` solo para mostrar. No se modifica la base ni se agrega `short_name`.
- **Sí:** logout cliente con `signOut()` y `window.location.assign`. Garantiza recarga completa y limpia el feed en memoria.
- **Sí:** eliminar `generateStaticParams()` de `/kids/[slug]`. La página ahora depende de cookies y debe ser dinámica.
- **Sí:** reemplazar `staffProfile` por `feedSummary`. Evita un export mock ambiguo.
- **Sí:** `LogoutButton` como componente cliente separado. Mantiene el sidebar simple.
- **No:** activación real, invitaciones o recuperación de contraseña. Requieren tablas y flujos propios.
- **No:** OAuth, magic link, MFA, passkeys, “recordarme” o rate limiting. Fuera del alcance.
- **No:** avatar real. El diseño actual usa iniciales.
- **No:** conteo de niños o fecha real. No hay datos ni tabla para el conteo.
- **No:** route group `(app)`. Obligaría a mover rutas existentes.
- **No:** consultas a la base en `proxy.ts`. El proxy solo verifica claims.
- **No:** cambios en `public.users` o `public.daycares`. Van en SPEC 10.
- **No:** confirmación de logout. El mockup no la tiene.
- **No:** `middleware.ts`. Next 16 usa `proxy.ts`.
- **No:** registrar credenciales o errores con datos sensibles.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El redirect del proxy pierde cookies refrescadas | Copiar cookies con `cookies.set` y headers de caché desde `supabaseResponse` al `NextResponse.redirect` |
| Loop entre `/` y `/auth/login` | `/auth/login` y `/auth/activate` son públicas; `next` nunca apunta a `/auth/*` |
| Redirección abierta por `next` | Validar con `URL`, rechazar `//`, `/\` y `/auth/*`, y caer a `/` |
| `getClaims()` en cada request agrega latencia | Es una verificación optimista sin consultas a la base; el guard hace la lectura real |
| SPEC 10 no aplicada y el perfil real no aparece | Aplicar SPEC 10 antes; si no hay fila o política, `requireProfile()` usa el fallback |
| Usuario autenticado sin fila en `public.users` | Fallback desde metadata/email, rol `Staff` y sin sala |
| `cookies()` vuelve dinámicas las páginas | Eliminar `generateStaticParams()` y verificar `npm run build` |
| `signOut()` del navegador falla | No navegar, reactivar el botón y registrar el error en consola |
| La recarga completa pierde estado no guardado | Es el comportamiento esperado al cerrar sesión |
| `redirect()` dentro de un `try/catch` rompe el Server Action | Llamar a `redirect()` fuera del `try/catch` |
| El campo oculto `next` se manipula | Validarlo otra vez en el Server Action |
| La contraseña demo no está disponible para Playwright | Usar las credenciales de SPEC 08; si faltan, crear un usuario de prueba fuera del repo |
| Faltan variables de entorno | Documentar `.env`; el login muestra el error genérico y no filtra detalles |
| Sin tipos generados de la base, la consulta queda `any` | Tipar la fila localmente y verificar con `npx tsc --noEmit` |
| El sidebar muestra una sala vacía | Ocultar la línea cuando `profile.room` esté vacío |
| El logout en el drawer móvil deja el drawer abierto | La recarga completa a `/auth/login` lo cierra |

## Qué **no** entra en esta spec

- Activación real, invitaciones, alta automática o recuperación de contraseña.
- OAuth, magic link, MFA, passkeys, “recordarme” o rate limiting.
- Roles y permisos, RLS de escritura o grants.
- Perfil real de niños, conteo de niños o fecha dinámica.
- Avatar real.
- Persistencia de posts o feed con backend.
- Cambios en `/auth/activate`.
- Cambios en `public.users` o `public.daycares`.
- Callback de Auth.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
