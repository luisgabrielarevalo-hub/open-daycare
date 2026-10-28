# SPEC 12 — Niños: alta persistida, listado y perfil desde Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 02 (páginas `/kids` y `/kids/[slug]`), SPEC 04 (modal "Agregar niño"), SPEC 09 (auth, `requireProfile` y protección de rutas), SPEC 11 (tablas `rooms` y `children` con RLS; implementar antes)
> **Fecha:** 2026-10-28
> **Objetivo:** Guardar el niño del modal en `public.children`, leer `/kids` y `/kids/[slug]` desde Supabase con salas reales, agrupación por sala, estado vacío y conteo real en el feed, eliminando los niños mock.

## Alcance

**In:**

- Server Action `createChild` en `app/kids/actions.ts` con `"use server"`, que inserta en `public.children` con el cliente server de Supabase.
- Revalidación server-side de los mismos campos obligatorios que el cliente: nombre no vacío, fecha de nacimiento válida y no futura, y sala existente en la guardería del usuario.
- Generación de `slug` a partir de `full_name`: minúsculas, sin tildes, separadores no alfanuméricos a `-`, sin guiones al inicio ni al final.
- Slug único dentro de la guardería: si ya existe, se prueba `-2`, `-3`… hasta `-20`.
- Slug de respaldo `child-<8 caracteres hex>` cuando la normalización del nombre queda vacía.
- Reintento del `INSERT` hasta cinco veces ante el error `23505` de slug duplicado.
- Traducción de alergias de texto libre a `allergy_tags` en inglés:
  - `maní`, `mani`, `cacahuete` → `peanut`.
  - `lactosa`, `lácteos`, `lacteos` → `lactose`.
  - `gluten`, `trigo` → `gluten`.
  - `huevo`, `huevos` → `egg`.
  - `frutos secos`, `nuez`, `nueces` → `nuts`.
- Los términos no reconocidos se anexan a `medical_notes` con el prefijo `Alergias: `, separados por coma; no se guardan como tag.
- Defaults al crear: `enrolled_at = current_date`, `status = 'active'`, `photo_consent = true`.
- `lib/kids/children.ts` con las funciones puras de mapeo: `slugify`, `parseAllergies`, `ageLabel`, `formatDateLabel`, `formatMonthLabel`, `avatarPalette` y `toChildView`.
- Edad calculada en el servidor: años cumplidos si es mayor o igual a 1; meses si es menor a 1 (`8 meses`, `1 mes`).
- Etiquetas de fecha en español con `Intl.DateTimeFormat("es-AR")`: `12 mar 2022` para nacimiento y `feb 2025` para ingreso, sin punto final en la abreviatura.
- Color de avatar determinístico: hash del `id` elige una de las ocho parejas de colores que ya usa `lib/data.ts`.
- Chip `MANÍ`, `LACTOSA`, `GLUTEN`, `HUEVO` o `FRUTOS SECOS` si hay `allergy_tags`; sin chip si no hay alergias.
- Sin chip `VINCULAR` automático; un niño sin alergias muestra el chevron.
- `parents` vacío en el listado y en el perfil hasta que exista `parent_children`; la tarjeta muestra `sin padres vinculados`.
- `AddChildForm` recibe `rooms: RoomOption[]` desde el servidor y reemplaza la constante `ROOMS`.
- `AddChildForm` usa `useActionState`; mantiene la validación cliente por campo y llama al Server Action solo si es válida.
- Mientras guarda: botón `Guardar` deshabilitado y texto `Guardando…`.
- Error del servidor: mensaje inline `No pudimos guardar el niño. Intentá de nuevo.`; la modal no se cierra.
- Éxito: la modal se cierra, el formulario se resetea y el listado muestra el niño sin recargar manualmente.
- `AddChildModal` recibe y propaga `rooms`.
- `app/kids/page.tsx` consulta salas y niños activos, y los pasa a `KidsDirectory`; `AddChildModal` recibe las salas.
- `KidsDirectory` recibe `rooms` y `children` como props, mantiene el buscador en cliente y agrupa por sala.
- Encabezado por grupo con nombre de sala y contador (`SALA SOLES`, `3 niños`); el orden de grupos es Soles, Lunas, Estrellas y después las salas desconocidas por nombre.
- Solo se muestran grupos con al menos un niño.
- Estado vacío con `Todavía no hay niños` y una tarjeta con el CTA que abre el mismo modal.
- `/kids/[slug]` consulta el niño por `slug` con su sala, aplica `notFound()` si no existe y muestra fecha de nacimiento, sala, ingreso, alergias y notas desde la DB.
- `lib/data.ts`: se elimina el arreglo `children`; se conservan los tipos `Child`, `ChildTag`, `LinkedParent` y el resto del feed.
- `lib/data.ts`: `feedSummary` se reemplaza por `feedDateLabel = "martes 17 jun"`.
- `requireProfile()` cuenta los niños activos de la guardería con `count: 'exact', head: true` y devuelve ese número en `childCount`.
- El feed muestra el conteo real en `N niños · <fecha>`; `dateLabel` sigue mock.
- `revalidatePath("/kids")` y `revalidatePath("/")` tras un alta exitosa.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y Playwright a 1440×900 y 390×844.
- Limpieza de los niños creados durante la verificación con SQL del MCP, no desde la app.

**Fuera de alcance (para specs futuras):**

- Edición de niños, archivado, borrado y subida de fotos.
- `parent_children`, vinculación real de padres y chips `VINCULAR`.
- `photo_consent` como campo del formulario.
- Reordenar niños dentro de una sala o arrastrar entre salas.
- Paginación, búsqueda server-side o filtro por sala.
- "Resumen del día", feed real de niños y posts desde Supabase.
- `avatar_url` e imágenes reales; se mantienen iniciales y colores.
- Cambios en `public.rooms`, `public.children`, sus políticas o sus migraciones.
- Edición de salas o alta de salas desde la UI.
- Toasts, confirmaciones o animaciones de éxito.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

No se crean tablas ni columnas. SPEC 11 aporta el esquema. La app introduce estos tipos y helpers:

```ts
type RoomOption = {
  id: string;
  name: string;
};

type ChildRow = {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  status: "active" | "archived";
  rooms: { name: string } | null;
};

type CreateChildState = {
  status: "idle" | "success" | "error";
  message: string | null;
  attempt: number;
};

type ParsedAllergies = {
  tags: string[];
  notes: string | null;
};
```

- `Child` de `lib/data.ts` sigue siendo el view model que consumen `ChildCard`, `KidsDirectory` y el perfil.
- `id` del view model es el `slug` de la DB; las URLs siguen siendo `/kids/mateo-fernandez`.
- `toChildView(row)` calcula `ageLabel`, `birthDateLabel`, `joinedLabel`, `avatarBg`, `avatarColor`, `tag`, `allergiesNotes` y `parents: []`.
- `room` es el nombre corto (`Soles`) y `roomFullName` es `Sala <nombre>`.
- `status` filtra `active`; `archived` queda para una spec de archivado.
- El mapa de alergias es fijo y vive en `lib/kids/children.ts`; no se consulta la DB.
- La paleta de avatares es la de los ocho niños mock actuales, elegida por hash estable del `id`.
- `created_at` y `updated_at` no se renderizan.
- La consulta del listado usa `select("id, slug, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, status, rooms(name)")`, filtra `status = 'active'` y ordena por `full_name`.
- RLS acota las filas a la guardería del usuario; la app no filtra por `daycare_id` en el cliente.
- `requireProfile()` agrega una consulta `count` a `public.children` con el mismo filtro de estado.

## Plan de implementación

1. Crear `lib/kids/children.ts` con `slugify`, `parseAllergies`, `ageLabel`, `formatDateLabel`, `formatMonthLabel`, `avatarPalette` y `toChildView`. Verificar `npx tsc --noEmit`.
2. Crear `app/kids/actions.ts` con `createChild`:
   - Leer `fullName`, `birthDate`, `roomId`, `allergies` y `medicalNotes` del `FormData`.
   - Validar y devolver un estado de error con mensaje en español.
   - Buscar la sala por `id` con el cliente server; si no aparece, error.
   - Generar el slug con los helpers y resolver colisiones dentro de la guardería.
   - Insertar con los defaults de SPEC 11 y reintentar ante `23505`.
   - `revalidatePath("/kids")`, `revalidatePath("/")` y devolver `status: "success"`.
   Verificar con `npx tsc --noEmit`.
3. `components/kids/AddChildForm.tsx`: recibir `rooms`, eliminar `ROOMS`, mantener la validación por campo y enviar al Server Action con `useActionState`; agregar `Guardando…`, el error inline y el cierre por éxito. Verificar la validación vacía y de fecha futura.
4. `components/kids/AddChildModal.tsx`: recibir `rooms` y pasarlas a `AddChildForm`. Verificar que el modal sigue abriendo y cerrando como en SPEC 04.
5. `app/kids/page.tsx`: consultar salas (`id`, `name`) y niños activos con `rooms(name)`; pasar ambos a `KidsDirectory` y las salas a `AddChildModal`. Verificar con un listado vacío.
6. `components/kids/KidsDirectory.tsx`: recibir `rooms` y `children`, agrupar por sala, mostrar contador por grupo, mantener el buscador, agregar el estado vacío con CTA y renderizar `AddChildModal` con las salas. Verificar agrupación y búsqueda.
7. `app/kids/[slug]/page.tsx`: consultar el niño por `slug` con `rooms(name)`, mapearlo con `toChildView`, `notFound()` si no existe y usar los campos reales en detalles, alergias y padres vacíos. Verificar un slug inexistente.
8. `lib/data.ts` y `lib/auth/profile.ts`: eliminar el arreglo `children`, reemplazar `feedSummary` por `feedDateLabel`, contar niños activos en `requireProfile()` y ajustar los imports de `KidsDirectory`, `ChildCard` y `/kids/[slug]`. Verificar `npx tsc --noEmit` y `npm run lint`.
9. Verificación final: `npm run build`, Playwright a 1440×900 y 390×844 (estado vacío, alta en Soles, alta en Lunas, grupos y contadores, búsqueda, perfil, slug inválido, error de servidor), consulta SQL de las filas creadas y limpieza con `execute_sql`.

## Criterios de aceptación

- [x] `/kids` carga sin errores en consola y sin niños muestra el estado vacío `Todavía no hay niños` con el CTA de alta.
- [x] Con cero niños no aparece ningún encabezado de sala ni contador.
- [x] El CTA del estado vacío abre la misma modal de "Agregar niño".
- [x] La modal muestra una opción por cada sala de la guardería del usuario (Soles, Lunas, Estrellas) y arranca sin selección.
- [x] Con los tres obligatorios vacíos se muestran los errores y no se llama al Server Action.
- [x] Una fecha futura sigue mostrando `La fecha no puede ser futura`.
- [x] Un nombre solo con espacios se rechaza en cliente y en servidor.
- [x] Con datos válidos, el botón muestra `Guardando…`, se deshabilita y la modal se cierra al terminar.
- [x] Tras el alta, el niño aparece en `/kids` sin recargar la página.
- [x] El niño creado en Soles aparece bajo `SALA SOLES` y el contador del grupo suma uno.
- [x] Un niño creado en Lunas aparece bajo `SALA LUNAS`, no bajo Soles.
- [x] Los grupos se ordenan Soles, Lunas, Estrellas y solo se muestran si tienen niños.
- [x] El buscador filtra por nombre dentro de todos los grupos.
- [x] Recargar `/kids` conserva los niños creados.
- [x] El nombre con tildes genera un slug sin tildes y en minúsculas (ej. `Sofía Méndez` → `sofia-mendez`).
- [x] Un segundo niño con el mismo nombre genera `sofia-mendez-2` dentro de la misma guardería.
- [x] Un nombre sin caracteres alfanuméricos genera un slug `child-<hex>`.
- [x] El perfil `/kids/<slug>` abre con el nombre, la edad, la sala y el ingreso del niño real.
- [x] La fecha de nacimiento se muestra como `12 mar 2022` y el ingreso como `feb 2025`.
- [x] Un niño menor a un año muestra la edad en meses (ej. `8 meses`).
- [x] Un niño con `peanut` muestra el chip `MANÍ`; uno sin alergias muestra el chevron.
- [x] `Maní, Lactosa` se guarda como `{peanut,lactose}` y se muestran dos chips.
- [x] Un término no reconocido (ej. `polen`) no aparece como chip y se conserva en `medical_notes` con el prefijo `Alergias: `.
- [x] Las notas médicas escritas en el formulario se guardan en `medical_notes` y se muestran en el perfil.
- [x] Un niño recién creado tiene `enrolled_at` igual a la fecha de hoy, `status = 'active'` y `photo_consent = true`.
- [x] Un `INSERT` con una sala de otra guardería se rechaza y la modal muestra `No pudimos guardar el niño. Intentá de nuevo.`.
- [x] Un slug inexistente en `/kids/<slug>` devuelve 404.
- [x] Las tarjetas muestran `sin padres vinculados` mientras `parent_children` no exista.
- [x] El feed muestra el conteo real de niños activos en lugar de `12 niños`; `dateLabel` sigue siendo `martes 17 jun`.
- [x] `lib/data.ts` ya no exporta el arreglo `children` y ningún archivo lo importa.
- [x] No queda ninguna referencia a la constante `ROOMS` en `AddChildForm`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.
- [x] Playwright verifica el flujo completo a 1440×900 y 390×844 sin desbordamiento horizontal.
- [x] La verificación visual de `/kids` y `/kids/<slug>` mantiene estructura, colores, tipografías y espaciados de SPEC 02, salvo la agrupación por sala y el estado vacío.
- [x] Las filas creadas durante la verificación se eliminan con SQL del MCP y `public.children` queda como estaba antes de la prueba.

## Decisiones tomadas y descartadas

- **Sí:** Server Action con el cliente server y RLS. Mantiene la escritura en el servidor y no usa service role.
- **Sí:** validación duplicada en cliente y servidor. La del cliente da feedback; la del servidor es la que vale.
- **Sí:** `useActionState`. Es el patrón de `LoginForm` y permite pending y error inline.
- **Sí:** conservar la validación por campo del cliente. Evita enviar formularios inválidos y mantiene la UX de SPEC 04.
- **Sí:** slug derivado del nombre y único por guardería. Conserva las URLs de SPEC 02 y evita colisiones entre guarderías.
- **Sí:** sufijo numérico `-2`, `-3`… ante colisión. Es predecible y legible.
- **Sí:** reintento ante `23505`. Cubre una colisión entre la consulta y el `INSERT`.
- **Sí:** slug de respaldo `child-<hex>` si el nombre no produce caracteres válidos.
- **Sí:** mapa fijo de alergias a inglés. Cumple la convención de persistencia y no requiere tabla nueva.
- **Sí:** términos no reconocidos a `medical_notes`. No se pierden datos y `allergy_tags` queda limpio.
- **Sí:** calcular edad, fechas y colores en el servidor. Evita columnas derivadas que se desincronizan.
- **Sí:** edad en meses para menores de un año. Es más útil que `0 años`.
- **Sí:** paleta determinística por `id`. Mantiene el look del mockup sin guardar colores.
- **Sí:** agrupar por sala. El alta permite elegir Lunas o Estrellas y el encabezado único de Sala Soles quedaría incorrecto.
- **Sí:** solo grupos con niños. Evita encabezados vacíos.
- **Sí:** estado vacío con CTA. `/kids` arranca vacía porque no se siembran niños.
- **Sí:** eliminar los 8 niños mock. Mezclar mocks y datos reales vuelve ambiguo qué se guardó.
- **Sí:** `/kids/[slug]` sigue usando el nombre del parámetro `slug`. El valor es el slug de la DB.
- **Sí:** conteo real en el feed. La tabla ya existe y `12 niños` sería falso.
- **Sí:** limpiar los datos de prueba con SQL del MCP. La app no tiene `DELETE` ni debe tenerlo.
- **No:** `parent_children` o chips `VINCULAR`. No hay tabla todavía.
- **No:** chip automático de "sin padres". Se muestra el chevron como en el mockup.
- **No:** `avatar_url` o fotos. Fuera de alcance.
- **No:** paginación o búsqueda server-side. El volumen del directorio es pequeño.
- **No:** edición, archivado o borrado desde la UI. Requieren políticas y flujos propios.
- **No:** campo de fecha de ingreso o consentimiento de fotos. Se usan defaults.
- **No:** toast de éxito. El cierre de la modal y la aparición en el listado son la señal.
- **No:** `service_role` en el cliente. Sería una fuga de credenciales.
- **No:** tests automatizados. El repo no tiene runner.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| SPEC 11 no está aplicada y el `INSERT` falla por tabla o política ausente | Aplicarla y verificar con el usuario demo antes de empezar esta spec |
| RLS oculta las filas recién insertadas | `revalidatePath` y `SELECT` después; el `INSERT` con `with check` coincide con la política de lectura |
| Una sala de otra guardería se envía a mano en el `FormData` | `SELECT` de la sala con RLS y `with check` en la política; ambos la rechazan |
| Colisión de slug entre dos altas simultáneas | Reintento hasta cinco veces ante `23505`, recalculando el sufijo |
| `slugify` deja un slug vacío con nombres solo simbólicos | Respaldo `child-<8 hex>` |
| Fechas `date` se interpretan como UTC y muestran un día menos | Parsear `yyyy-mm-dd` a un `Date` local con año, mes y día, sin `new Date("yyyy-mm-dd")` |
| `Intl` devuelve `mar.` con punto | Quitar el punto final de la abreviatura del mes |
| El mapa de alergias no cubre un término del usuario | Se conserva en `medical_notes`; el mapa se amplía con una spec futura |
| `toChildView` recibe `rooms` como `null` por una fila huérfana | La FK compuesta lo impide; si ocurre, usar `Sala` vacía y no romper |
| El join de Supabase se tipa como `any` | Tipar `ChildRow` localmente y validar con `npx tsc --noEmit` |
| Eliminar `children` de `lib/data.ts` rompe imports | Buscar con `grep` antes de borrar y corregir `KidsDirectory`, `ChildCard` y `/kids/[slug]` |
| `requireProfile()` ahora hace una consulta extra en todas las páginas | Usar `cache()` y `count` con `head: true`; el costo es una consulta indexada por guardería y estado |
| El estado vacío duplica una instancia del modal | Solo se renderiza una: la del encabezado o la del estado vacío, nunca ambas con niños |
| Los datos de Playwright quedan en la base remota | Borrar por slug conocido con `execute_sql` al terminar y verificar el conteo |
| La agrupación rompe la comparación con el mockup | Documentar la desviación y comparar estructura, no el listado exacto |
| `npm run build` falla por páginas dinámicas | Las páginas ya usan cookies por `requireProfile()`; verificar el build tras el cambio |

## Qué **no** entra en esta spec

- Edición, archivado, borrado o fotos de niños.
- `parent_children`, vinculación real y chips `VINCULAR`.
- `photo_consent` editable.
- Reordenar niños o moverlos de sala.
- Paginación, búsqueda server-side o filtro por sala.
- "Resumen del día" y feed desde Supabase.
- `avatar_url` o imágenes reales.
- Cambios en `rooms`, `children`, sus políticas o migraciones.
- Gestión de salas desde la UI.
- Toasts, confirmaciones o animaciones.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
