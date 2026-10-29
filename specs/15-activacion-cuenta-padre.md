# SPEC 15 — Activación de la cuenta del padre y vínculo con el niño

> **Estado:** Aprobado
> **Depende de:** SPEC 03 (pantalla de activación), SPEC 09 (auth, `requireProfile` y protección de rutas), SPEC 13 (tablas `invitations`, `parent_children` y trigger de alta; implementar antes), SPEC 14 (invitación y código por correo; implementar antes)
> **Fecha:** 2026-10-29
> **Objetivo:** Activar la invitación desde `/auth/activate` creando la cuenta del padre en Supabase Auth y su vínculo con el niño, y limitar al rol `parent` a la ruta `/` de la app.

## Alcance

**In:**

- `lib/supabase/admin.ts`: cliente de Supabase con `SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false` y `autoRefreshToken: false`, solo para servidor.
- `SUPABASE_SERVICE_ROLE_KEY` agregada a `.env.template` y documentada como variable de servidor.
- Server Action `activateAccount` en `app/auth/activate/actions.ts`:
  - Normaliza el código a mayúsculas y quita los espacios.
  - Valida que el código tenga cinco caracteres alfanuméricos.
  - Busca la invitación con el cliente admin, porque el rol `parent` no tiene permiso de lectura sobre `invitations`.
  - Rechaza con mensajes en español el código inexistente, vencido y ya utilizado.
  - Crea la cuenta con `admin.auth.admin.createUser` y `email_confirm: true`, con `user_metadata` de `daycare_id`, `role: "parent"` y `full_name`.
  - El trigger de SPEC 13 crea la fila en `public.users`.
  - Inserta el vínculo en `parent_children` con el parentesco de la invitación.
  - Marca la invitación como `accepted` con `accepted_at`.
  - Guarda el consentimiento de fotos en `children.photo_consent`.
  - Redirige a `/auth/login?activated=1`.
- La actualización de la invitación se hace condicionando `status = 'pending'`: si ya no afecta una fila, la invitación se usó en paralelo y la activación falla.
- `app/auth/activate/page.tsx`: lee el parámetro `code` de la URL con `PageProps<"/auth/activate">` y lo precarga en el formulario.
- `components/auth/ActivateAccountForm.tsx`: pasa a cliente con `useActionState`; muestra el error inline; el botón queda deshabilitado con `Activando…`; el checkbox de consentimiento es obligatorio para continuar.
- La contraseña mínima es de ocho caracteres; el formulario no pide confirmación, igual que el mockup.
- `app/auth/login/page.tsx` y `components/auth/LoginForm.tsx`: con `?activated=1` se muestra el aviso `Cuenta activada. Iniciá sesión.`.
- `lib/auth/profile.ts` y `lib/data.ts`: `StaffProfile` suma `roleKey` con el rol crudo (`staff`, `parent` o `admin`).
- `lib/supabase/proxy.ts`: si el token lleva `user_metadata.role = "parent"` y la ruta es `/kids` o `/kids/...`, redirige a `/`.
- `app/kids/page.tsx` y `app/kids/[slug]/page.tsx`: si `profile.roleKey` es `parent`, `redirect("/")`.
- `components/layout/Sidebar.tsx`: con `roleKey` `parent` no se renderiza el ítem `Niños` ni el botón `Nueva publicación`.
- El padre sigue viendo `/` con el feed actual en mock.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y Playwright a 1440×900 y 390×844.
- Limpieza de los datos creados durante la verificación con SQL del MCP, no desde la app.

**Fuera de alcance (para specs futuras):**

- El feed real del padre: los posts siguen siendo mock.
- Persistencia de posts, fotos, resumen diario y reacciones.
- Que el padre pueda vincularse a más niños por su cuenta.
- Recuperación de contraseña y cambio de contraseña.
- Confirmación por correo de Supabase; la cuenta queda confirmada al crearse.
- Aprobación del staff antes de activar la cuenta.
- Permisos finos del rol `parent` dentro de la app; hoy solo se define a qué rutas accede.
- Cambio del `role` de un usuario existente.
- OAuth, magic link, MFA y passkeys.
- Listado de las invitaciones del padre y gestión de sus vínculos.
- Cambios en el esquema de SPEC 13 o en la plantilla de SPEC 14.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

No se crean tablas ni columnas: SPEC 13 aporta el esquema. La app introduce estos tipos:

```ts
type ActivateState = {
  status: "idle" | "success" | "error";
  message: string | null;
  attempt: number;
};

type StaffProfile = {
  name: string;
  role: string;
  roleKey: "staff" | "parent" | "admin";
  initial: string;
  room: string;
  childCount: number;
  dateLabel: string;
};

type InvitationLookup = {
  id: string;
  child_id: string;
  daycare_id: string;
  full_name: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
};
```

- `ActivateState.message` es `null` o un mensaje en español; `attempt` permite limpiar el error al reintentar.
- `StaffProfile.role` sigue siendo la etiqueta visible (`Staff`, `Familia`, `Admin`); `roleKey` es el valor crudo del enum para las decisiones de navegación.
- `roleKey` cae a `staff` si el rol es inesperado, igual que hoy hace `ROLE_LABELS`.
- `InvitationLookup` es el tipo local de la fila leída con el cliente admin.
- El vínculo creado usa `relationship` de la invitación, no el del formulario: el parentesco lo define el staff que invita.
- La contraseña nunca se registra ni se devuelve en el estado.

## Plan de implementación

1. Crear `lib/supabase/admin.ts` con el cliente de service role y agregar `SUPABASE_SERVICE_ROLE_KEY` a `.env.template`. Verificar `npx tsc --noEmit` y que la clave no quede versionada.
2. Crear `app/auth/activate/actions.ts` con `activateAccount`:
   - Leer `code`, `email`, `password` y `consent` del `FormData`.
   - Validar y devolver el estado de error con mensaje en español.
   - Buscar la invitación por código con el cliente admin.
   - Comprobar estado y `expires_at` antes de crear nada.
   - Crear el usuario con `admin.auth.admin.createUser` y `email_confirm: true`.
   - Insertar el vínculo, marcar la invitación como `accepted` y guardar `photo_consent`.
   - `redirect("/auth/login?activated=1")` fuera del `try/catch`.
   Verificar con `npx tsc --noEmit`.
3. `app/auth/activate/page.tsx`: leer `searchParams.code` y pasarlo al formulario. Verificar que un enlace con `?code=XXXXX` precarga el campo.
4. `components/auth/ActivateAccountForm.tsx`: convertir a cliente con `useActionState`, agregar error inline, botón `Activando…` deshabilitado y checkbox de consentimiento obligatorio. Verificar los cuatro errores de la activación.
5. `app/auth/login/page.tsx` y `components/auth/LoginForm.tsx`: mostrar `Cuenta activada. Iniciá sesión.` cuando llega `?activated=1`.
6. `lib/auth/profile.ts` y `lib/data.ts`: agregar `roleKey` a `StaffProfile` y devolverlo desde `requireProfile()`. Verificar `npx tsc --noEmit` y `npm run lint`.
7. `lib/supabase/proxy.ts`: leer `user_metadata.role` de los claims y redirigir a `/` a los padres que piden `/kids` o `/kids/...`. Verificar con y sin sesión.
8. `app/kids/page.tsx` y `app/kids/[slug]/page.tsx`: bloquear con `redirect("/")` cuando `roleKey` sea `parent`.
9. `components/layout/Sidebar.tsx`: ocultar el ítem `Niños` y el botón `Nueva publicación` para el rol `parent`. Verificar la navegación del padre.
10. Verificación final: `npx tsc --noEmit`, `npm run lint`, `npm run build`, Playwright a 1440×900 y 390×844 (activación completa con el correo real, código inválido, vencido, usado, email duplicado, bloqueo de `/kids`, sidebar del padre) y limpieza de los datos de prueba con `execute_sql`.

## Criterios de aceptación

- [ ] `/auth/activate` carga sin errores en consola y precarga el código de `?code=`.
- [ ] Un código de menos de cinco caracteres muestra un error y no crea ninguna cuenta.
- [ ] Un código inexistente muestra `El código de invitación no es válido.` y no crea ninguna cuenta.
- [ ] Una invitación vencida muestra `La invitación venció. Pedí una nueva invitación a la guardería.`
- [ ] Una invitación ya utilizada muestra `Esta invitación ya fue utilizada.`
- [ ] Con el consentimiento sin marcar, el formulario muestra el error y no se envía.
- [ ] Con la contraseña de menos de ocho caracteres, el formulario muestra el error y no se envía.
- [ ] Con datos válidos, el botón muestra `Activando…`, queda deshabilitado y la cuenta queda creada.
- [ ] La cuenta creada tiene `email_confirm` activo y su fila en `public.users` tiene `role = 'parent'`, `status = 'active'`, el `daycare_id` de la guardería del niño y el nombre del padre.
- [ ] La activación crea el vínculo en `public.parent_children` con el parentesco de la invitación.
- [ ] La invitación queda en `status = 'accepted'` con `accepted_at` informado.
- [ ] `children.photo_consent` refleja el valor del checkbox del formulario.
- [ ] Con un email que ya tiene cuenta, la activación muestra `Ya existe una cuenta con este email. Iniciá sesión.` y no crea un vínculo.
- [ ] Tras activar, el navegador llega a `/auth/login?activated=1` y se muestra `Cuenta activada. Iniciá sesión.`
- [ ] Con el código y la contraseña creados, el padre puede iniciar sesión en `/auth/login`.
- [ ] El padre que entra a `/kids` es redirigido a `/`.
- [ ] El padre que entra a `/kids/<slug>` es redirigido a `/`.
- [ ] El sidebar del padre no muestra el ítem `Niños` ni el botón `Nueva publicación`.
- [ ] El padre ve el feed de `/` con el mock actual y el rol `Familia`.
- [ ] El conteo de niños del feed del padre corresponde a sus propios hijos.
- [ ] El feed, el perfil del niño y la modal de vincular padre siguen funcionando igual para el staff.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún archivo versionado ni en variables `NEXT_PUBLIC_*`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.
- [ ] Playwright verifica el flujo completo a 1440×900 y 390×844 sin desbordamiento horizontal.
- [ ] Las pantallas de activación y login conservan el diseño de SPEC 03, salvo los estados de error, carga y el aviso de cuenta activada.
- [ ] Los usuarios, vínculos e invitaciones creados durante la verificación se eliminan con SQL del MCP y las tablas quedan como estaban antes de la prueba.

## Decisiones tomadas y descartadas

- **Sí:** `admin.createUser` con service role y `email_confirm: true`. El padre queda habilitado al instante y no recibe un segundo correo de confirmación.
- **Sí:** cliente admin separado en `lib/supabase/admin.ts`, con `persistSession: false`. Ninguna llave de service role llega al cliente.
- **Sí:** el trigger de SPEC 13 crea la fila de `public.users`. Evita un `INSERT` duplicado y cubre cualquier alta de usuario.
- **Sí:** la búsqueda de la invitación usa el cliente admin. El rol `parent` no tiene política de lectura sobre `invitations`.
- **Sí:** el código basta para activar y el email del formulario es el de la cuenta nueva. No se compara con `invitations.email`.
- **Sí:** el parentesco del vínculo sale de la invitación, no del formulario. Define el staff que invita.
- **Sí:** el consentimiento se guarda en `children.photo_consent`. Es la única columna de consentimiento del esquema.
- **Sí:** la actualización de la invitación se condiciona a `status = 'pending'`. Evita el doble uso del mismo código.
- **Sí:** la activación termina en `/auth/login?activated=1` con aviso. El login ya existe y no se duplica el paso de autenticación.
- **Sí:** el padre solo accede a `/`. `/kids` y `/kids/[slug]` se le redirigen.
- **Sí:** el bloqueo se aplica en el proxy y en las páginas. Defensa en profundidad, igual que en SPEC 09.
- **Sí:** `roleKey` en `StaffProfile`. Permite decidir navegación sin parsear la etiqueta visible.
- **Sí:** la contraseña mínima es de ocho caracteres y no se pide confirmación, igual que el mockup.
- **No:** correo de confirmación de Supabase. Duplicaría la verificación y el padre ya recibió el código por correo.
- **No:** feed real del padre. Los posts siguen siendo mock y las tablas de posts no existen.
- **No:** que el padre vincule más niños por su cuenta. Solo el staff invita.
- **No:** recuperación ni cambio de contraseña.
- **No:** aprobación del staff antes de activar.
- **No:** permisos finos por rol más allá de qué rutas ve el padre.
- **No:** cambiar el `role` de un usuario existente.
- **No:** OAuth, magic link, MFA o passkeys.
- **No:** logs con la contraseña, la service role key o el código completo.
- **No:** tests automatizados. El repo no tiene runner.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La service role key se expone al navegador | Vive solo en `lib/supabase/admin.ts`, en el servidor, y nunca en variables `NEXT_PUBLIC_*` |
| El trigger de SPEC 13 falla si `daycare_id` no es válido | La activación manda el `daycare_id` de la invitación, que existe; si el trigger falla, la activación falla completa y no deja cuentas a medias |
| Dos activaciones simultáneas del mismo código | La actualización se condiciona a `status = 'pending'` y se verifica que se haya afectado una fila |
| El email ya existe en `auth.users` | `createUser` devuelve error de duplicado y la activación muestra el mensaje correspondiente sin crear el vínculo |
| El enlace del correo apunta a un host incorrecto | `NEXT_PUBLIC_APP_URL` en `.env.template` y documentada; sin esa variable el enlace cae al host configurado |
| El padre ve el feed mock del staff | Fuera de alcance por decisión; el feed del padre es una spec propia |
| El conteo de niños del feed cambia para el padre | Con la política de SPEC 13 el padre cuenta solo sus propios niños; queda documentado en el criterio de aceptación |
| El sidebar del padre conserva la línea de la guardería | La guardería del padre es correcta y se mantiene; el nombre del niño no se muestra todavía |
| El bloqueo por rol rompe el flujo del staff | El proxy solo redirige cuando el claim `user_metadata.role` es `parent`; el staff no lo tiene |
| La activación escribe en `public.children` desde el servidor | Se hace con el cliente admin; el rol `parent` no necesita permiso de escritura en `children` |
| Quedan datos de prueba en la base remota | Se limpian con `execute_sql` y se verifica el conteo final de `auth.users`, `public.users`, `public.parent_children` e `public.invitations` |

## Qué **no** entra en esta spec

- El feed real del padre y la persistencia de posts.
- Que el padre vincule más niños por su cuenta.
- Recuperación y cambio de contraseña.
- Aprobación del staff antes de activar.
- Permisos finos por rol más allá de las rutas.
- Listado de invitaciones y gestión de vínculos del padre.
- Cambios en el esquema de SPEC 13 o en la plantilla de SPEC 14.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
