# SPEC 04 — Niños: modal "Agregar niño"

> **Estado:** Aprobado
> **Depende de:** SPEC 02 (página `/kids`, `PlusIcon`, tokens y `AppShell`)
> **Fecha:** 2026-10-25
> **Objetivo:** Implementar `agregar-nino.dc.html` como modal de alta abierta desde "Agregar niño" en `/kids`, con Nombre completo, Fecha de nacimiento y Sala obligatorios y validación en cliente, sin crear datos ni persistir.

## Alcance

**In:**

- Modal superpuesto sobre `/kids`, sin cambiar de ruta, abierto desde el botón "Agregar niño".
- Componentes `components/kids/AddChildModal.tsx` (botón disparador + `<dialog>`) y `components/kids/AddChildForm.tsx` (formulario y validación), ambos `"use client"`.
- Estructura fiel al mockup: cabecera con "Cancelar" / "Agregar niño" / "Guardar", tarjeta `#FBF4EC` de 520px máximo, borde `#ECE0D0`, radio 24px y sombra.
- Campos: Nombre completo (texto), Fecha de nacimiento (`type="date"`), Sala (`<select>`), Alergias (etiquetas, texto) y Notas médicas (`<textarea>`).
- Sala con placeholder "Seleccioná una sala" y opciones **Soles, Lunas y Estrellas**; arranca vacía.
- Obligatorios: Nombre completo (sin contar solo espacios), Fecha de nacimiento (no futura) y Sala.
- Validación al pulsar "Guardar" con mensajes en español por campo; el botón permanece siempre activo. Corregir un campo elimina su error.
- Cierre con "Cancelar", `Escape` y clic en el fondo; el formulario se limpia en cualquier cierre.
- Foco inicial en "Nombre completo"; foco atrapado y `Escape` nativos de `<dialog>` con `showModal()`.
- Nuevos tokens semánticos de formulario/modal en `@theme`, sin tocar los existentes.
- Responsive: ancho `calc(100% - 32px)` y scroll interno si no cabe en alto.

**Fuera de alcance (para specs futuras):**

- Crear, añadir o persistir niños; el listado y el contador siguen en 8.
- Backend, base de datos, `localStorage` o sesiones.
- Edición de niños, vinculación de padres, subida de fotos y "Resumen del día".
- Reagrupar el listado por Lunas/Estrellas o filtrar por sala.
- Generación de avatar, tag o slug para un niño nuevo; no hay niño nuevo.
- Animaciones de apertura/cierre.
- Confirmación al cerrar con datos escritos.
- Cambios en `/`, `/kids/[slug]`, `lib/data.ts` o `app/kids/page.tsx` más allá de sustituir el enlace por el componente.

## Modelo de datos

Esta spec no introduce estructuras persistidas ni modifica `lib/data.ts`. Solo añade una constante local en `AddChildForm.tsx`:

```ts
const ROOMS = ["Soles", "Lunas", "Estrellas"] as const;
```

Todo el estado (`fullName`, `birthDate`, `room`, `allergies`, `medicalNotes` y errores) es local al formulario y se descarta al cerrar. Textos visibles en español; identificadores en inglés.

## Plan de implementación

1. `app/globals.css`: añadir en `@theme` `modal-bg #FBF4EC`, `field-border #EADFD0`, `field-placeholder #B6A99B`, `field-focus #F2A78E`, `danger #C5413A` y `scrim rgba(63,54,46,0.35)`. Verificar `npm run dev` sin errores.
2. `components/kids/AddChildForm.tsx` (`"use client"`): labels asociados con `htmlFor`, campos con los placeholders del mockup, select con `ChevronDownIcon` superpuesto, mensajes de error con `aria-invalid` y `aria-describedby`, y `onCancel`/`onSaved` como props.
3. Validación en el submit (`noValidate`): nombre `trim()` no vacío, fecha con valor y `<=` hoy, sala seleccionada. Copys: "Ingresá el nombre completo", "Ingresá la fecha de nacimiento", "La fecha no puede ser futura", "Seleccioná una sala". Un cambio en un campo limpia solo su error.
4. Submit válido: limpiar campos y errores y llamar a `onSaved`, que cierra el modal.
5. `components/kids/AddChildModal.tsx` (`"use client"`): botón "Agregar niño" con el estilo actual y `PlusIcon`; `<dialog>` con `showModal()`, `aria-labelledby` al título, foco en Nombre completo al abrir, cierre por `Escape`, por "Cancelar" y por clic cuyo `target` sea el propio `<dialog>`; reset del formulario en `onClose`.
6. `app/kids/page.tsx`: sustituir el `<a href="#">` de "Agregar niño" por `<AddChildModal />`; la página sigue siendo server component.
7. Verificar `npx tsc --noEmit` y `npm run lint`; con Playwright comparar la modal a 1440×900 y 390×844 contra `references/pantallas/agregar-nino.dc.html`, y comprobar que `/kids`, `/kids/mateo-fernandez` y `/` no cambian.

## Criterios de aceptación

- [x] `/kids` carga sin errores en consola y el botón "Agregar niño" abre la modal sin navegar.
- [x] La modal muestra las acciones "Cancelar", "Agregar niño" y "Guardar", y los cinco campos del mockup con sus placeholders.
- [x] Sala ofrece "Seleccioná una sala", "Soles", "Lunas" y "Estrellas", y arranca sin selección.
- [x] "Guardar" con los tres obligatorios vacíos muestra los tres errores y no cierra la modal.
- [x] Un nombre formado solo por espacios se considera vacío.
- [x] Una fecha futura muestra "La fecha no puede ser futura"; hoy y fechas pasadas se aceptan.
- [x] Al corregir un campo, su error desaparece sin necesidad de volver a enviar.
- [x] Con datos válidos, "Guardar" cierra la modal y limpia todos los campos y errores.
- [x] Tras guardar, el listado sigue mostrando 8 niños y ningún niño nuevo aparece.
- [x] "Cancelar", `Escape` y clic en el fondo cierran la modal; reabrirla muestra el formulario vacío.
- [x] Un clic dentro de la tarjeta no cierra la modal.
- [x] Al abrir, el foco está en "Nombre completo"; los labels están asociados y la modal tiene nombre accesible.
- [x] La tarjeta usa fondo `#FBF4EC`, borde `#ECE0D0`, radio 24px, ancho máximo 520px y título en Fredoka.
- [x] A 390px de ancho no hay desbordamiento horizontal y el contenido alto hace scroll dentro de la modal.
- [x] `/`, `/kids` y `/kids/mateo-fernandez` siguen funcionando sin cambios.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] La comparación visual con `agregar-nino.dc.html` coincide en estructura, colores, tipografías y espaciados.

## Decisiones tomadas y descartadas

- **Sí:** modal visual con validación real, sin crear datos. El usuario lo eligió; mantiene el patrón "sin backend" del repo.
- **Sí:** `<dialog>` nativo con `showModal()`. Aporta foco atrapado, `Escape` y backdrop sin dependencias.
- **Sí:** tres salas inventadas (Soles, Lunas, Estrellas) y placeholder vacío. El usuario lo pidió; el mockup solo muestra Soles.
- **Sí:** `input type="date"`. Validación y accesibilidad gratis, a costa de no reproducir literalmente "dd/mm/aaaa".
- **Sí:** errores al enviar con "Guardar" siempre activo. Muestra el problema sin ocultar el CTA.
- **Sí:** limpiar el formulario en cualquier cierre. Evita reabrir con datos viejos; no hay confirmación de descarte.
- **Sí:** tokens nuevos `modal-*`/`field-*`/`danger`/`scrim` en vez de reutilizar los `auth-*`, que comparten valores pero no significado. Auth no se toca.
- **Sí:** un solo componente cliente sustituye el enlace; `app/kids/page.tsx` sigue siendo server.
- **Sí:** sin asteriscos visibles. La obligatoriedad se expresa con semántica accesible y errores, como el mockup.
- **No:** crear el niño en memoria o persistirlo. Descartado por el usuario.
- **No:** toast o mensaje de éxito. El cierre es la señal; el mockup no lo contempla.
- **No:** animaciones, focus-trap manual ni librerías externas.
- **No:** cambios en `lib/data.ts`, el contador o el listado.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| No existe `references/screenshots/agregar-nino.png` | Comparar con el `.dc.html` renderizado vía Playwright a 1440×900 y 390×844 |
| El `<dialog>` nativo y su `::backdrop` se ven distinto en Safari/Chrome | Fijar `scrim` y estilos de tarjeta en tokens; comprobar en Playwright (Chromium) y revisar el CSS del backdrop |
| `showModal()` no existe hasta hidratar; el botón podría no responder en el primer instante | El disparador vive en el mismo componente cliente; verificar que abre tras la hidratación |
| El selector de fecha nativo no reproduce "dd/mm/aaaa" y cambia según el navegador | Aceptado como decisión; mantener el label visible y verificar que el valor se lee bien |
| Validación propia y `required` nativo pueden mostrar dos mensajes | Usar `noValidate` en el `<form>` y validar solo en JS |
| Cerrar con `Escape` o backdrop podría no limpiar el estado | Centralizar el reset en el evento `close` del diálogo, no en cada botón |
| El clic en el backdrop se confunde con clics internos | Cerrar solo cuando `event.target === dialog` |
