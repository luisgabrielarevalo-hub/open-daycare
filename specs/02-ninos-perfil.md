# SPEC 02 — Niños: listado y perfil del niño

> **Estado:** Implementado
> **Depende de:** SPEC 01 (AppShell, Sidebar, tokens en `globals.css`)
> **Fecha:** 2026-10-19
> **Objetivo:** Implementar `ninos.dc.html` en `/kids` y `perfil-nino.dc.html` en `/kids/[slug]`, replicando su diseño con Tailwind v4 y componentes, sin backend.

## Alcance

**In:**

- Ruta `/kids` (`app/kids/page.tsx`) que renderiza el listado de niños.
- Ruta dinámica `/kids/[slug]` (`app/kids/[slug]/page.tsx`) que renderiza el perfil del niño.
- Datos de los **8 niños** del mockup en `lib/data.ts`, cada uno con ficha completa y coherente (fecha de nacimiento, sala, ingreso, alergias/notas y padres vinculados).
- Slug por nombre y apellido en kebab-case (ej. `mateo-fernandez`).
- Componentes: `components/kids/ChildCard.tsx`, `components/kids/KidsDirectory.tsx` ("use client", búsqueda), `components/kids/LinkedParentsCard.tsx`, `components/kids/AllergyNote.tsx`.
- Refactor de `components/layout/Sidebar.tsx` y `AppShell.tsx` para recibir el ítem de nav activo (`activeNav`), y de `app/page.tsx` para pasar `activeNav="feed"`.
- Nuevos iconos en `components/ui/icons.tsx`: `SearchIcon`, `ChevronRightIcon`, `ChevronLeftIcon`, `AlertTriangleIcon`.
- Nuevos tokens de color en `app/globals.css` (`@theme`) para avatares de niños, chips de tags, estados de padres y caja de alergias.
- Búsqueda funcional en cliente: filtra las tarjetas por nombre.
- Enlaces reales entre pantallas existentes: Feed→`/`, Niños→`/kids`, tarjeta de niño→`/kids/[slug]`, "Volver a Niños"→`/kids`.
- `notFound()` si el slug no corresponde a ningún niño.

**Fuera de alcance (para specs futuras):**

- Backend, base de datos y persistencia.
- Altas/ediciones: "Agregar niño", "Editar", "Vincular otro padre", "Resumen del día" quedan visuales con `href="#"`.
- Autenticación, sesiones y roles.
- Rutas de las demás pantallas (`/avisos`, `/mi-cuenta`, `/crear-publicacion`, etc.).
- Responsive propio de estas pantallas más allá del drawer ya existente en `AppShell`.

## Modelo de datos

Todo es contenido estático de UI; no se persiste nada. Se extiende `lib/data.ts`:

```ts
export type ChildTagTone = "allergy" | "link";

export type ChildTag = {
  label: string;
  tone: ChildTagTone;
};

export type ParentLinkStatus = "active" | "pending";

export type LinkedParent = {
  name: string;
  relationship: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  status: ParentLinkStatus;
  statusLabel: string;
};

export type Child = {
  id: string;
  fullName: string;
  ageLabel: string;
  room: string;
  roomFullName: string;
  birthDateLabel: string;
  joinedLabel: string;
  avatarBg: string;
  avatarColor: string;
  tag?: ChildTag;
  allergiesNotes?: string;
  parents: LinkedParent[];
};

export const children: Child[] = [/* los 8 del mockup */];
```

Convenciones:

- Identificadores, tipos, nombres de archivo y variables en inglés.
- Todo el texto visible al usuario en español.
- El slug del niño es su `id` (ej. `mateo-fernandez`).
- El número de padres vinculados y su etiqueta ("sin padres vinculados", "1 padre vinculado", "2 padres vinculados") se derivan de `parents.length`.
- El chip de la tarjeta se muestra si el niño tiene `tag`; si no, se muestra el chevron. Tonos: `allergy` (MANÍ, LACTOSA) y `link` (VINCULAR).

Los 8 niños (nombre, edad, padres, tag, avatar):

1. Mateo Fernández — 3 años, 2 padres, tag `MANÍ` (allergy) — avatar sky.
2. Sofía Méndez — 2 años, 1 padre, sin tag — avatar pink.
3. Benjamín Ruiz — 3 años, 2 padres, sin tag — avatar green.
4. Valentina Soto — 2 años, sin padres, tag `VINCULAR` (link) — avatar yellow.
5. Tomás Díaz — 3 años, 1 padre, tag `LACTOSA` (allergy) — avatar purple.
6. Emma Castro — 2 años, 1 padre, sin tag — avatar pink.
7. Lucas Romero — 3 años, 1 padre, sin tag — avatar sky.
8. Olivia Vega — 2 años, 1 padre, sin tag — avatar green.

Ficha de Mateo (fiel al mockup): nacimiento "12 mar 2022", sala "Soles", ingreso "feb 2025", notas "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila." Padres: Lucía Fernández (Mamá · activa, `active`) y Diego Fernández (Papá · invitación enviada, `pending`). Para el resto se inventan fechas coherentes con la edad (3 años→2022, 2 años→2023), ingreso, y padres/alergias que respeten el conteo y tags del mockup.

Tokens nuevos en `app/globals.css` (`@theme`):

- Avatares: `avatar-pink #F4B8CC` / `#C44A7A`, `avatar-green #B9DEC4` / `#3E8B62`, `avatar-yellow #F4DC8E` / `#9A7B1E`, `avatar-purple #C9B6E8` / `#7B5FC0`, `avatar-blue #A9C7E8`.
- Chips de tag: `tag-allergy-bg #FBD8CC` / `tag-allergy-fg #D9684A`, `tag-link-bg #F9D2DE` / `tag-link-fg #C56486`.
- Estado de padres: `status-active-bg #CFEBD8` / `status-active-fg #3E9B6C`, `status-pending-bg #F7E7A6` / `status-pending-fg #9A7B1E`.
- Caja de alergias: `alert-bg #FBDAD6`, `alert-icon-bg #F4A8A0`, `alert-title #C5413A`, `alert-text #B25249`.

## Plan de implementación

1. `app/globals.css`: añadir los tokens nuevos en `@theme`. Verificar `npm run dev` sin errores.
2. `lib/data.ts`: añadir tipos `ChildTag`, `LinkedParent`, `Child` y el arreglo `children` con los 8 niños.
3. `components/ui/icons.tsx`: añadir `SearchIcon`, `ChevronRightIcon`, `ChevronLeftIcon`, `AlertTriangleIcon` (mismo patrón `Icon`).
4. `components/layout/Sidebar.tsx`: aceptar prop `activeNav` (`"feed" | "kids" | "announcements" | "account"`), resaltar el ítem activo y usar enlaces reales Feed→`/`, Niños→`/kids`; el logo→`/`.
5. `components/layout/AppShell.tsx`: añadir prop `activeNav` y pasarla a `Sidebar`.
6. `app/page.tsx`: pasar `activeNav="feed"`.
7. `components/kids/ChildCard.tsx`: tarjeta con avatar, nombre, "edad · padres vinculados" y chip de tag o chevron; enlaza a `/kids/[id]`.
8. `components/kids/KidsDirectory.tsx` (`"use client"`): input "Buscar niño…" que filtra por nombre + grid de 2 columnas con `ChildCard`.
9. `app/kids/page.tsx`: componente server; cabecera "GESTIÓN / Niños", botón "Agregar niño" (`href="#"`), label "SALA SOLES", contador "8 niños" y `<KidsDirectory />` dentro de `AppShell activeNav="kids"`.
10. `components/kids/AllergyNote.tsx` y `components/kids/LinkedParentsCard.tsx`: caja de alergias y card "PADRES VINCULADOS" con estados y enlace "Vincular otro padre" (`href="#"`).
11. `app/kids/[slug]/page.tsx`: server async con `params: Promise<{ slug: string }>`, `generateStaticParams` para los 8 ids, `notFound()` si no existe; header con avatar, nombre, "edad · Sala Soles", botón "Editar" (`href="#"`), "Volver a Niños"→`/kids`, botón "Resumen del día" (`href="#"`) y `LinkedParentsCard`, todo dentro de `AppShell activeNav="kids"`.
12. Verificar `npx tsc --noEmit` y `npm run lint`; comparar `/kids` contra `references/screenshots/ninos.png` y `/kids/[slug]` contra `references/pantallas/perfil-nino.dc.html` con Playwright.

## Criterios de aceptación

- [x] `/kids` y `/kids/mateo-fernandez` cargan sin errores en consola.
- [x] El sidebar resalta "Niños" en ambas rutas; "Feed" sigue resaltando en `/`.
- [x] `/kids` muestra cabecera "GESTIÓN / Niños", botón "Agregar niño", buscador y "SALA SOLES · 8 niños".
- [x] Se listan los 8 niños en grid de 2 columnas con sus nombres, edades y conteo de padres correctos.
- [x] Las tarjetas muestran chip en Mateo (MANÍ), Valentina (VINCULAR) y Tomás (LACTOSA), y chevron en el resto.
- [x] El buscador filtra las tarjetas por nombre en tiempo real.
- [x] Cada tarjeta navega a `/kids/[slug]` correcto.
- [x] El perfil muestra avatar, nombre, "3 años · Sala Soles", botón "Editar" y enlace "Volver a Niños".
- [x] La caja de alergias y la tabla (fecha de nacimiento, sala, ingreso) coinciden con el mockup.
- [x] "PADRES VINCULADOS" lista padres con sus estados (ACTIVA / PENDIENTE) y el enlace "Vincular otro padre".
- [x] `/kids/mateo-fernandez` muestra nacimiento "12 mar 2022", sala "Soles" e ingreso "feb 2025".
- [x] Un slug inexistente (ej. `/kids/no-existe`) devuelve 404 con `notFound()`.
- [x] "Agregar niño", "Editar", "Vincular otro padre" y "Resumen del día" usan `href="#"` y no navegan.
- [x] Fondo `#F6ECDF`, cards `#FFFDF9`, Fredoka en títulos/nombres y Nunito en el resto.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** los 8 niños tienen ficha completa. Coherencia entre listado y detalle.
- **Sí:** slug `nombre-apellido`. Estable y desambiguable.
- **Sí:** `tag` opcional en el niño; chip si existe, chevron si no. Refleja el mockup sin lógica implícita.
- **Sí:** búsqueda funcional en cliente. Coste bajo y mejora real.
- **Sí:** `activeNav` como prop desde la página; `Sidebar` y `AppShell` siguen sin estado de routing.
- **Sí:** `AppShell` por página (no `app/kids/layout.tsx`). Mismo patrón que la spec 01.
- **Sí:** `notFound()` para slug inválido. Evita páginas rotas.
- **Sí:** conteo de padres derivado de `parents.length`. Evita datos duplicados.
- **Sí:** datos de los 7 niños restantes inventados de forma plausible. El mockup solo detalla a Mateo.
- **No:** backend o persistencia. Fuera del objetivo.
- **No:** altas/ediciones reales de niños o padres. Solo visual.
- **No:** `generateStaticParams` obligatorio — se incluye por sencillez, no por requisito.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| No existe `references/screenshots/perfil-nino.png` | Comparar la ficha con `references/pantallas/perfil-nino.dc.html` renderizado con Playwright |
| Diferencias de píxeles al convertir estilos inline a Tailwind | Comparar contra `ninos.png` y el mockup de perfil con Playwright |
| El refactor de `Sidebar`/`AppShell` afecta la pantalla ya implementada (`/`) | Verificar `/` contra `feed.png` tras el cambio |
| Datos inventados para 7 niños pueden quedar incoherentes | Revisar edad ↔ fecha de nacimiento y conteo ↔ lista de padres |
