# SPEC 05 — Niños: modal "Vincular padre"

> **Estado:** Implementado
> **Depende de:** SPEC 02 (perfil `/kids/[slug]` y `LinkedParentsCard`), SPEC 04 (tokens `modal-*` y patrón `<dialog>`)
> **Fecha:** 2026-10-25
> **Objetivo:** Implementar `vincular-padre.dc.html` como modal de invitación abierto desde "Vincular otro padre" en el perfil del niño, con nombre y email obligatorios, parentesco preseleccionado y código fijo, sin enviar ni persistir nada.

## Alcance

**In:**

- Modal superpuesto sobre `/kids/[slug]`, sin cambiar de ruta, abierto desde "Vincular otro padre" en `LinkedParentsCard`.
- Componentes `components/kids/LinkParentModal.tsx` (disparador + `<dialog>`) y `components/kids/LinkParentForm.tsx` (cabecera, formulario, parentesco, código y validación), ambos `"use client"`.
- Estructura fiel al mockup: cabecera con "Vincular padre", subtítulo "a {nombre completo}" y botón X; tarjeta `modal-bg`, borde `border`, radio 24px, ancho máximo 480px y sombra.
- Aviso informativo azul: "Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {nombre de pila}."
- Campos: Nombre del padre/madre (texto, placeholder "Ej. Diego Fernández") y Email (`type="email"`, placeholder "correo@ejemplo.com").
- Parentesco con pills **Mamá, Papá, Tutor/a**; "Mamá" preseleccionada al abrir y editable. Sin validación ni error.
- Caja "CÓDIGO DE INVITACIÓN" fija `7K4P9` con la leyenda "Vence en 7 días".
- Obligatorios: nombre (sin contar solo espacios) y email (no vacío y con formato básico `texto@texto.dominio`).
- Validación al enviar con mensajes en español por campo; el botón "Enviar invitación" permanece siempre activo. Corregir un campo elimina su error.
- Envío válido: el modal se cierra sin crear padres, sin enviar correo y sin persistir; "PADRES VINCULADOS" no cambia.
- Cierre con la X, `Escape` y clic en el fondo; el formulario se reinicia en cualquier cierre, incluido Mamá preseleccionada.
- Foco inicial en "Nombre del padre/madre"; foco atrapado y `Escape` nativos de `<dialog>` con `showModal()`.
- Nuevos iconos `InfoIcon` y `SendIcon` en `components/ui/icons.tsx`.
- Nuevos tokens semánticos de invitación en `@theme`, sin tocar los existentes.
- Responsive: ancho `calc(100% - 32px)` y scroll interno si no cabe en alto.

**Fuera de alcance (para specs futuras):**

- Crear, enviar o persistir invitaciones; el listado de padres y sus estados no cambian.
- Añadir el padre como PENDIENTE en memoria o `localStorage`.
- Backend, correo real, tokens de activación o expiración real del código.
- Generación aleatoria del código o uno distinto por niño; se usa el literal `7K4P9`.
- Validar email duplicado o ya vinculado al niño.
- Abrir el modal desde el chip VINCULAR de `/kids` o desde otras pantallas.
- Toast, pantalla o mensaje de éxito; el cierre es la señal.
- Gestión de padres: editar, desvincular o reenviar invitación.
- Animaciones de apertura/cierre y confirmación al cerrar con datos escritos.
- Cambios en `lib/data.ts`, `/`, `/kids`, el resto de acciones del perfil o la navegación.

## Modelo de datos

Esta spec no introduce estructuras persistidas ni modifica `lib/data.ts`. Solo añade constantes y estado local en `LinkParentForm.tsx`:

```ts
const RELATIONSHIPS = ["Mamá", "Papá", "Tutor/a"] as const;
type Relationship = (typeof RELATIONSHIPS)[number];
const INVITATION_CODE = "7K4P9";
```

El estado (`fullName`, `email`, `relationship` y errores) es local al formulario y se descarta al cerrar. `LinkParentModal` y `LinkParentForm` reciben `childFullName`; el nombre de pila del aviso se deriva con `split(" ")[0]`. Textos visibles en español; identificadores en inglés.

## Plan de implementación

1. `app/globals.css`: añadir en `@theme` `invite-info-bg #E3ECFB`, `invite-info-fg #3F5694`, `invite-info-icon #4E72C8`, `invite-pill-bg #CCD8F4`, `invite-pill-border #9FB8EC`, `invite-pill-fg #4E72C8`, `invite-code-bg #FBF1D6`, `invite-code-border #E6D08A`, `invite-code-label #A88526` e `invite-code-value #8A7234`. Verificar `npm run dev` sin errores.
2. `components/ui/icons.tsx`: añadir `InfoIcon` (círculo + `M12 16v-4M12 8h.01`, 20px, stroke 2) y `SendIcon` (avión de papel, 19px, stroke 2) con el patrón `Icon` existente.
3. `components/kids/LinkParentForm.tsx` (`"use client"`): cabecera con título, subtítulo "a {nombre completo}" y X (`aria-label="Cerrar"`, fondo `divider-soft`, color `muted`); aviso, campos con labels asociados e ids `parent-name`/`parent-email`, grupo de parentesco con `role="group"` y `aria-pressed`, caja de código y CTA. Validación en submit (`noValidate`): nombre `trim()` no vacío y email contra `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Copys: "Ingresá el nombre del padre/madre", "Ingresá el email", "Ingresá un email válido". Un cambio en un campo limpia solo su error.
4. Submit válido: limpiar estado y llamar a `onSent`, que cierra el modal.
5. `components/kids/LinkParentModal.tsx` (`"use client"`): botón "Vincular otro padre" con el markup actual del enlace (avatar punteado + texto), `<dialog>` con `showModal()`, `aria-labelledby` al título, foco en `parent-name` al abrir, cierre por X, por `Escape` y por clic cuyo `target` sea el propio `<dialog>`, y reset por `key` en `onClose`.
6. `components/kids/LinkedParentsCard.tsx`: recibir `childFullName` y sustituir el `<a href="#">` por `<LinkParentModal childFullName={childFullName} />`; la card sigue siendo server component.
7. `app/kids/[slug]/page.tsx`: pasar `childFullName={child.fullName}` a `LinkedParentsCard`.
8. Verificar `npx tsc --noEmit` y `npm run lint`; con Playwright comparar el modal abierto desde `/kids/mateo-fernandez` a 1440×900 y 390×844 contra `references/pantallas/vincular-padre.dc.html`, y comprobar que `/kids`, el perfil sin modal y `/` no cambian.

## Criterios de aceptación

- [x] `/kids/mateo-fernandez` carga sin errores en consola y "Vincular otro padre" abre el modal sin navegar.
- [x] El modal muestra "Vincular padre", "a Mateo Fernández", la X, el aviso, los dos campos, los tres parentescos, la caja de código y "Enviar invitación".
- [x] El aviso menciona "Solo verá el feed de Mateo" para Mateo y el nombre de pila correcto en otros perfiles.
- [x] Los campos arrancan vacíos con los placeholders del mockup; "Mamá" arranca seleccionada.
- [x] Cambiar a "Papá" o "Tutor/a" actualiza la selección y solo una pill queda activa.
- [x] "Enviar invitación" con nombre y email vacíos muestra ambos errores y no cierra el modal.
- [x] Un nombre formado solo por espacios se considera vacío.
- [x] Un email sin formato válido (ej. "diego", "diego@", "diego@correo") muestra "Ingresá un email válido".
- [x] Al corregir un campo, su error desaparece sin volver a enviar.
- [x] Con nombre y email válidos, "Enviar invitación" cierra el modal sin añadir padres ni cambiar "PADRES VINCULADOS".
- [x] La X, `Escape` y el clic en el fondo cierran el modal; reabrirlo muestra los campos vacíos y "Mamá" seleccionada.
- [x] Un clic dentro de la tarjeta no cierra el modal.
- [x] Al abrir, el foco está en "Nombre del padre/madre"; los labels están asociados, las pills exponen `aria-pressed` y el diálogo tiene nombre accesible.
- [x] La tarjeta usa fondo `#FBF4EC`, borde `#ECE0D0`, radio 24px, ancho máximo 480px y título en Fredoka.
- [x] El código visible es siempre `7K4P9` y la leyenda "Vence en 7 días".
- [x] A 390px de ancho no hay desbordamiento horizontal y el contenido alto hace scroll dentro del modal.
- [x] `/`, `/kids` y el resto de perfiles siguen funcionando sin cambios.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] La comparación visual con `vincular-padre.dc.html` coincide en estructura, colores, tipografías y espaciados.

## Decisiones tomadas y descartadas

- **Sí:** abrir solo desde el perfil del niño. El código de invitación y el aviso dependen del niño; el listado no tiene contexto de invitación.
- **Sí:** el envío válido solo cierra el modal. Coherente con SPEC 04 y con el mockup, que vuelve al perfil; no hay backend.
- **Sí:** "Mamá" preseleccionada. Es el estado del mockup y evita un error extra por un campo que no aporta validación real.
- **Sí:** código fijo `7K4P9`. El usuario lo eligió; mantiene la comparación visual determinista.
- **Sí:** nombre y email obligatorios con formato básico. Aporta validación real sin inventar reglas de negocio.
- **Sí:** `LinkParentModal` cliente dentro de `LinkedParentsCard` server. La card no necesita estado y el perfil sigue siendo server component.
- **Sí:** tokens `invite-*` propios en vez de reutilizar `announcement-*` o `consent-*`, que comparten valores pero no significado. SPEC 04 fijó ese criterio.
- **Sí:** reutilizar `divider-soft` y `muted` para la X, porque coinciden exactamente con el mockup y no introducen una semántica nueva.
- **Sí:** reset por remonte con `key` en `onClose`. Mismo mecanismo ya probado en SPEC 04 y cubre X, `Escape` y backdrop con un solo camino.
- **No:** crear el padre pendiente, persistirlo o enviar correo. Descartado por el usuario.
- **No:** validar emails duplicados. `lib/data.ts` no guarda emails de padres; sería una regla sin datos.
- **No:** código aleatorio o expiración real. Descartado por el usuario.
- **No:** toast de éxito, animaciones o focus-trap manual.
- **No:** cambios en `/kids`, `lib/data.ts` o el resto de acciones del perfil.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| No existe `references/screenshots/vincular-padre.png` | Comparar con el `.dc.html` renderizado vía Playwright a 1440×900 y 390×844 |
| El mockup muestra la tarjeta suelta sobre el fondo, sin scrim ni sidebar | Comparar solo la tarjeta y verificar el scrim contra el patrón de SPEC 04 |
| El subtítulo "a {nombre}" y el aviso desbordan con nombres largos | Usar `min-w-0`, `line-height` del mockup y comprobar con un nombre largo en Playwright |
| El regex de email acepta casos raros (ej. `a@b.c`) | Aceptado como validación básica; el objetivo es bloquear formatos claramente inválidos |
| La X, `Escape` y el backdrop podrían no reiniciar el estado | Centralizar el reset en `onClose` con remonte por `key`, como en SPEC 04 |
| Cambiar `LinkedParentsCard` a cliente rompería el perfil server | El componente cliente es solo el hijo; la card y la página siguen siendo server |
| El modal añade un segundo `<dialog>` si se reutiliza en el futuro | Hoy hay una sola instancia por perfil; ids únicos `parent-*` y `link-parent-title` |

## Qué **no** entra en esta spec

- Enviar correos, crear invitaciones o persistir padres.
- Añadir el padre como PENDIENTE en el perfil.
- Códigos aleatorios, expiración real o validación de duplicados.
- Abrir el modal desde `/kids` u otras pantallas.
- Gestión de padres: editar, desvincular o reenviar.
- Cambios en `lib/data.ts`, `/`, `/kids` o el resto de acciones del perfil.

Cada punto, si llega, va en su propia spec.
