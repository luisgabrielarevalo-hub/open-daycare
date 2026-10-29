# SPEC 14 — Vincular padre: invitación real y correo con Resend

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (modal "Vincular padre"), SPEC 11 (tablas `rooms` y `children`), SPEC 12 (listado y perfil del niño desde Supabase), SPEC 13 (tablas `invitations` y `parent_children`; implementar antes)
> **Fecha:** 2026-10-29
> **Objetivo:** Enviar la invitación de vincular padre por correo con Resend desde el modal real, guardando la invitación en `public.invitations` y mostrando en el perfil del niño el código generado y los padres vinculados con su estado.

## Alcance

**In:**

- Agregar la dependencia `resend` al `package.json`.
- `lib/email/resend.ts`: crea el cliente de Resend con `RESEND_API_KEY` y falla de forma explícita si la variable no está.
- `lib/email/templates/invitation.ts`: `renderInvitationEmail()` devuelve `{ subject, html }` con la plantilla de la invitación.
- `lib/email/send-invitation-email.ts`: `sendInvitationEmail()` llama a `resend.emails.send()` y devuelve un resultado controlado, sin filtrar la API key en logs.
- Remitente `onboarding@resend.dev` con nombre visible `OpenDayCare`.
- El correo incluye el nombre del niño, el de la guardería, el código de 5 caracteres y un botón que abre `/auth/activate?code=<código>`.
- `NEXT_PUBLIC_APP_URL` en `.env.template` para armar la URL absoluta del enlace de activación.
- Server Action `createParentInvitation` en `app/kids/actions.ts`:
  - Valida nombre no vacío, email con formato y parentesco válido.
  - Traduce el parentesco de la UI al enum: `Mamá` → `mother`, `Papá` → `father`, `Tutor/a` → `guardian`.
  - Verifica que el niño existe y pertenece a la guardería del usuario con `role` `staff` o `admin`.
  - Genera el código con el alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sin `I`, `O`, `0` ni `1`.
  - Inserta la invitación con `status = 'pending'`, `expires_at = now() + 7 días` y `invited_by` igual al usuario autenticado.
  - Envía el correo y devuelve el código al formulario.
  - Si el envío falla, marca la invitación como `cancelled` y devuelve un error genérico.
- Server Action con `useActionState` en `LinkParentForm`; el botón muestra `Enviando…` y queda deshabilitado mientras manda.
- `LinkParentForm`: la caja del código deja de mostrar el literal `7K4P9`; tras el envío exitoso muestra el código generado, la leyenda `Vence en 7 días` y `Invitación enviada a {email}`.
- `LinkParentModal`: el modal permanece abierto tras el éxito para que el staff lea el código, con un botón `Listo` que cierra; el formulario se reinicia al cerrar.
- `lib/kids/parents.ts`: helpers puros `relationshipLabel`, `invitationStatusLabel`, `initialsFromName`, `avatarPalette` y `toLinkedParents`.
- `LinkedParentsCard`: recibe los padres reales, con etiqueta de parentesco y estado `PENDIENTE` o `ACTIVO`.
- `app/kids/[slug]/page.tsx`: consulta `invitations` y `parent_children` del niño y arma la lista de padres.
- La lista combina las invitaciones `pending` del niño con los vínculos aceptados, sin repetir a la misma persona.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y Playwright a 1440×900 y 390×844.
- Limpieza de las invitaciones creadas durante la verificación con SQL del MCP, no desde la app.

**Fuera de alcance (para specs futuras):**

- El alta del padre, la validación del código y la creación de `parent_children`; van en SPEC 15.
- Persistir el consentimiento de fotos; lo hace la activación.
- Listado de invitaciones de la guardería, reenvío del correo y cancelación manual.
- Marcar invitaciones como `expired` de forma automática.
- Chip `VINCULAR` en `/kids` y estados vacíos nuevos en el perfil.
- Editar, desvincular o quitar padres.
- Dominio propio de correo en Resend, plantillas HTML con imágenes, adjuntos y diseño responsive avanzado.
- Correos transaccionales otros que la invitación: restablecimiento de contraseña, avisos de posts o resumen diario.
- Webhooks de Resend, reintentos automáticos y métricas de entrega.
- Cambios en el esquema de SPEC 13.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

No se crean tablas ni columnas: SPEC 13 aporta el esquema. La app introduce estos tipos:

```ts
type ParentInvitationState = {
  status: "idle" | "success" | "error";
  message: string | null;
  code: string | null;
  email: string | null;
  attempt: number;
};

type InvitationRow = {
  id: string;
  child_id: string;
  full_name: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  status: "pending" | "accepted" | "expired" | "cancelled";
  code: string;
  expires_at: string;
};

type ParentLinkRow = {
  parent_id: string;
  relationship: "father" | "mother" | "guardian";
};
```

- `ParentInvitationState.code` lleva el código generado al formulario para mostrarlo; es `null` antes del envío.
- `ParentInvitationState.email` lleva el email destinatario al mensaje de éxito.
- `ParentInvitationState.attempt` permite limpiar el mensaje de error al reintentar.
- `LinkedParent` de `lib/data.ts` se mantiene: `{ name, relationship, status, statusLabel, initial, avatarBg, avatarColor }`.
- El `status` del view model es `active` para los vínculos aceptados y `pending` para las invitaciones en curso.
- `relationshipLabel` traduce el enum a la etiqueta visible: `mother` → `Mamá`, `father` → `Papá`, `guardian` → `Tutor/a`.
- `invitationStatusLabel` traduce el estado de la invitación: `pending` → `PENDIENTE`, `accepted` → `ACTIVO`.
- El avatar se elige con un hash estable del email, de modo que el mismo padre conserva el color entre pantallas.
- El email se guarda en minúsculas para compararlo con `auth.users.email` en la activación.
- `expires_at` se calcula en el servidor como `now() + interval '7 days'`; la UI muestra `Vence en 7 días`.

## Plan de implementación

1. Instalar `resend` con `npm install resend` y agregar `RESEND_API_KEY` y `NEXT_PUBLIC_APP_URL` a `.env.template`. Verificar `npm run build` y que la clave no quede en ningún archivo versionado.
2. Crear `lib/email/resend.ts`, `lib/email/templates/invitation.ts` y `lib/email/send-invitation-email.ts`:
   - `resend.ts` valida que `RESEND_API_KEY` exista y lanza un error controlado si falta.
   - `templates/invitation.ts` arma el `subject` y el `html` con el nombre del niño, el de la guardería, el código y el botón con el enlace de activación.
   - `send-invitation-email.ts` envía el correo y devuelve `{ ok: true }` o `{ ok: false }` sin incluir la API key en el error.
   Verificar con `npx tsc --noEmit`.
3. Agregar `createParentInvitation` en `app/kids/actions.ts`:
   - Leer `fullName`, `email`, `relationship` y `childId` del `FormData`.
   - Validar y devolver el estado de error con mensaje en español.
   - Consultar el niño con el cliente server y comprobar que pertenece a la guardería del usuario.
   - Generar el código y resolver colisiones con hasta diez intentos ante el error `23505`.
   - Insertar la invitación con `status = 'pending'` y `expires_at` a siete días.
   - Enviar el correo; si falla, actualizar la invitación a `cancelled` y devolver el error genérico.
   - `revalidatePath("/kids/[slug]")` y devolver `status: "success"` con el código.
   Verificar con `npx tsc --noEmit`.
4. `components/kids/LinkParentForm.tsx`: reemplazar la constante `INVITATION_CODE` por la Server Action con `useActionState`; conservar la validación por campo; agregar `Enviando…`, el botón deshabilitado, el error inline y el estado de éxito con el código, la leyenda `Vence en 7 días` y `Invitación enviada a {email}`.
5. `components/kids/LinkParentModal.tsx`: mantener abierto el modal en el estado de éxito, agregar el botón `Listo` que cierra y conservar el reinicio del formulario al cerrar. Verificar el flujo completo con Playwright: alta válida, error de red y reintento.
6. Crear `lib/kids/parents.ts` con `relationshipLabel`, `invitationStatusLabel`, `initialsFromName`, `avatarPalette` y `toLinkedParents`. Verificar `npx tsc --noEmit`.
7. `app/kids/[slug]/page.tsx`: consultar `invitations` y `parent_children` del niño, combinar ambos en la lista de padres y pasarla a `LinkedParentsCard`. Verificar con una invitación pendiente y con un vínculo aceptado.
8. `components/kids/LinkedParentsCard.tsx`: usar la lista real con etiqueta de parentesco y estado `PENDIENTE` / `ACTIVO`. Verificar la comparación visual contra `references/pantallas/perfil-nino.dc.html`.
9. Verificación final: `npx tsc --noEmit`, `npm run lint`, `npm run build`, Playwright a 1440×900 y 390×844, consulta SQL de las invitaciones creadas y limpieza con `execute_sql`.

## Criterios de aceptación

- [ ] `npm run build` pasa con la dependencia `resend` instalada y `RESEND_API_KEY` no aparece en ningún archivo versionado.
- [ ] El modal "Vincular padre" abre desde el perfil del niño sin navegar y sin cambiar el diseño de SPEC 05.
- [ ] La caja del código ya no muestra el literal `7K4P9` antes de enviar.
- [ ] Con nombre y email vacíos se muestran los errores y no se llama al Server Action.
- [ ] Un email con formato inválido muestra `Ingresá un email válido`.
- [ ] Un nombre formado solo por espacios se rechaza.
- [ ] Con parentesco `Papá` la invitación se guarda con `relationship = 'father'`; `Tutor/a` se guarda como `guardian`.
- [ ] El código generado tiene exactamente cinco caracteres en mayúsculas y no contiene `I`, `O`, `0` ni `1`.
- [ ] El código es distinto en dos invitaciones seguidas para el mismo niño.
- [ ] La invitación se guarda con `status = 'pending'`, `invited_by` igual al usuario autenticado y `expires_at` a siete días.
- [ ] El correo llega a la dirección indicada y contiene el nombre del niño, el código y el enlace a `/auth/activate?code=<código>`.
- [ ] Con `onboarding@resend.dev` el correo solo llega al email del owner de la cuenta de Resend.
- [ ] Mientras se manda, el botón queda deshabilitado y muestra `Enviando…`.
- [ ] Tras el envío exitoso el modal sigue abierto, muestra el código generado, la leyenda `Vence en 7 días` y `Invitación enviada a {email}`.
- [ ] El botón `Listo` cierra el modal y, al reabrirlo, el formulario está vacío y `Mamá` sigue preseleccionada.
- [ ] Si el envío falla, el modal muestra `No pudimos enviar la invitación. Intentá de nuevo.` y la invitación queda en `cancelled`.
- [ ] El perfil del niño muestra al padre invitado con la etiqueta `Mamá`, `Papá` o `Tutor/a` y el estado `PENDIENTE`.
- [ ] Un niño sin invitaciones ni vínculos muestra la tarjeta vacía igual que antes de esta spec.
- [ ] La tarjeta PADRES VINCULADOS no muestra `sin padres vinculados` cuando hay padres.
- [ ] El correo enviado a un email inválido del servidor no deja la invitación en `pending`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.
- [ ] Playwright verifica el flujo completo a 1440×900 y 390×844 sin desbordamiento horizontal.
- [ ] La comparación visual del modal mantiene estructura, colores, tipografías y espaciados de SPEC 05, salvo la caja del código.
- [ ] Las invitaciones creadas durante la verificación se eliminan con SQL del MCP y `public.invitations` queda como estaba antes de la prueba.

## Decisiones tomadas y descartadas

- **Sí:** dependencia `resend` en lugar de `fetch` a la API. Mantiene el tipado y centraliza el envío.
- **Sí:** `lib/email/` con tres módulos: cliente, plantilla y envío. La plantilla se puede cambiar sin tocar la acción.
- **Sí:** remitente `onboarding@resend.dev`. Es el remitente de prueba de Resend y no exige verificar un dominio.
- **Sí:** el botón de activación apunta a `/auth/activate?code=<código>` y el código también se muestra en texto plano. El padre puede tipear el código o usar el enlace.
- **Sí:** el código se genera en el servidor con un alfabeto sin caracteres ambiguos. El `CHECK` de la base exige cinco caracteres alfanuméricos en mayúsculas.
- **Sí:** hasta diez intentos de generación ante el error `23505` de código duplicado.
- **Sí:** el destinatario se guarda en minúsculas. La activación compara con `auth.users.email`.
- **Sí:** la invitación se inserta antes de enviar el correo y se cancela si el envío falla. Así no queda una invitación `pending` sin correo entregado.
- **Sí:** el modal queda abierto tras el éxito para que el staff lea el código. El cierre es explícito con el botón `Listo`.
- **Sí:** el nombre del padre sale de `invitations.full_name`. No hace falta abrir la lectura de `public.users` al staff.
- **Sí:** los padres pendientes y los aceptados se combinan en una sola lista para el perfil.
- **Sí:** el avatar del padre se elige por hash del email. Es estable sin guardar colores.
- **No:** dominio propio de correo. Se cambia el remitente en `lib/email/resend.ts` cuando exista.
- **No:** plantillas con imágenes, adjuntos o diseño responsive avanzado. El correo es funcional.
- **No:** reenvío, listado o cancelación de invitaciones desde la app.
- **No:** marcaje automático de invitaciones vencidas. El servidor valida `expires_at` al activar.
- **No:** chip `VINCULAR` en `/kids`. La tarjeta del perfil alcanza para mostrar el estado.
- **No:** persistir el consentimiento de fotos en esta spec. Lo guarda la activación.
- **No:** webhooks de Resend ni reintentos automáticos.
- **No:** logs con la API key, el contenido del correo o la dirección completa del padre.
- **No:** tests automatizados. El repo no tiene runner.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `onboarding@resend.dev` solo entrega al email del owner de la cuenta de Resend | La verificación usa ese mismo email como destinatario de la invitación; el cambio a dominio propio es una línea en `lib/email/resend.ts` |
| `RESEND_API_KEY` no está disponible en el entorno de desarrollo | `lib/email/resend.ts` falla con un error controlado; la UI muestra el mensaje genérico y la invitación se cancela |
| Resend rechaza el envío y la invitación queda `pending` | El flujo marca `cancelled` ante cualquier fallo del envío |
| Colisión del `code` con otra invitación | Diez intentos de generación y `UNIQUE` en la base |
| El código expira entre el envío y la activación | La leyenda `Vence en 7 días` se muestra en el correo y en el modal |
| El staff cierra el modal sin leer el código | El correo es el canal principal; el código queda disponible en la tarjeta del padre pendiente |
| La consulta de `invitations` no ve filas por RLS | La política `invitations_select_staff_same_daycare` de SPEC 13 cubre al staff de la guardería; verificar con el usuario demo |
| La lista de padres duplica a la misma persona si hay invitación y vínculo | La combinación deduplica por email normalizado |
| El correo se envía con el nombre del niño sin verificar que el usuario sea staff | La acción valida el niño y el rol antes de insertar |
| Las invitaciones de prueba quedan en la base remota | Se borran por `child_id` y `code` con `execute_sql` al terminar la verificación |

## Qué **no** entra en esta spec

- El alta del padre, la validación del código y la creación del vínculo.
- El consentimiento de fotos y la restricción de rutas por rol.
- Listado, reenvío y cancelación de invitaciones.
- Marcaje automático de invitaciones vencidas.
- Chip `VINCULAR` en `/kids` y estados vacíos nuevos.
- Dominio propio de correo, plantillas avanzadas y otros correos transaccionales.
- Webhooks de Resend, reintentos automáticos y métricas de entrega.
- Cambios en el esquema de SPEC 13.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
