# SPEC 01 — Home: feed de la guardería

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-10-18
> **Objetivo:** Implementar `feed.dc.html` como home (`/`), replicando su diseño visual con Tailwind v4 y componentes, sin backend.

## Alcance

**In:**

- Ruta `/` (`app/page.tsx`) que renderiza el feed de la guardería.
- Paleta y fuentes del mockup definidas como tokens en `app/globals.css` (`@theme`).
- Fuentes **Fredoka** y **Nunito** cargadas con `next/font/google`.
- Componentes: `components/layout/AppShell.tsx`, `components/layout/Sidebar.tsx`, `components/feed/PostCard.tsx`, `components/feed/ComposerPrompt.tsx`, `components/ui/icons.tsx`.
- Sidebar fija de 248px en escritorio; drawer off-canvas con backdrop por debajo de `lg` (1024px).
- Tres posts hardcodeados: logro, actividad (con placeholder de foto) y anuncio.

**Fuera de alcance (para specs futuras):**

- Autenticación, sesiones y roles.
- Backend, base de datos y persistencia.
- Rutas de las demás pantallas (`/ninos`, `/avisos`, `/mi-cuenta`, `/crear-publicacion`, etc.) y navegación real.
- Interactividad de like, comentar y editar (solo visual).
- Resto de pantallas del mockup (login, perfil-niño, detalle-publicacion, foto, avisos…).

## Modelo de datos

Todo es contenido estático de UI; no se persiste nada. `lib/data.ts`:

```ts
export type PostKind = "achievement" | "activity" | "announcement";

export type Post = {
  id: string;
  kind: PostKind;
  authorName: string;
  authorInitial: string;
  avatarBg: string;
  avatarColor: string;
  time: string;
  audience: string;
  body: string;
  reactions: number;
  comments: number;
  photoLabel?: string;
};

export const staffProfile = {
  name: "Caro Giménez",
  role: "Maestra · Soles",
  initial: "C",
  room: "Sala Soles",
  childCount: 12,
  dateLabel: "martes 17 jun",
};

export const posts: Post[] = [
  /* achievement, activity, announcement del mockup */
];
```

Convenciones:

- Identificadores, tipos, nombres de archivo y variables en inglés.
- Código limpio: nombres descriptivos, sin abreviaturas, sin comentarios innecesarios.
- Todo el texto visible al usuario va en español.
- Los valores de `kind` son en inglés; la etiqueta visible ("LOGRO", "ACTIVIDAD", "ANUNCIO") se mapea a español en la UI.

Tokens de color en `app/globals.css` (`@theme`):

- Superficies: `cream #F6ECDF`, `paper #FFFDF9`.
- Bordes: `border #ECE0D0`, `divider #E7DAC8` / `#F0E6D8`.
- Texto: `ink #3F362E`, `body #4A4038`, `muted #94887B` / `#A89A8B`, `navinactive #6E6359`.
- Coral: `coral #EE8164` / `#F4977E`, `coral-deep #C5503A` / `#D9583C` / `#E0654A`, `coral-soft #FBE3D8`.
- Chips por tipo: logro `#CFEBD8` / `#3E9B6C`, actividad `#C7E7F1` / `#2E89A6`, anuncio `#CCD8F4` / `#4E72C8`.
- Avatares: `#F2937A` y `#A9D9E8` / `#1F7A93`.

## Plan de implementación

1. `app/globals.css`: definir la paleta en `@theme` y las variables de fuentes; eliminar los colores del template. Verificar: `npm run dev` sin errores.
2. `app/layout.tsx`: cargar Fredoka + Nunito con `next/font/google`, `lang="es"`, aplicar variables de fuente y `bg-cream text-ink`, título `OpenDayCare`.
3. `components/ui/icons.tsx`: exportar los SVG del mockup (sol/logo, casa, niños, campana, usuario, corazón, comentario, cámara, plus, logout, megáfono) como componentes.
4. `lib/data.ts`: tipos, `staffProfile` y `posts` con los 3 posts del mockup.
5. `components/feed/PostCard.tsx`: avatar, cabecera, chip por `kind`, "Para:", cuerpo, placeholder de foto opcional y pie con reacciones/comentarios/Editar.
6. `components/feed/ComposerPrompt.tsx`: caja "Compartí un momento…".
7. `components/layout/Sidebar.tsx`: logo, botón "Nueva publicación", nav (Feed activo), pie con usuario y logout.
8. `components/layout/AppShell.tsx` (`"use client"`): estado del drawer, top bar + hamburguesa en móvil, backdrop; renderiza Sidebar + children.
9. `app/page.tsx`: componente server; saludo, ComposerPrompt, divisor "PUBLICADO HOY" y `posts.map(PostCard)` dentro de `AppShell`.
10. Verificar `npx tsc --noEmit` y `npm run lint`, y comparar contra `references/screenshots/feed.png` con Playwright.

## Criterios de aceptación

- [ ] `/` carga sin errores en consola.
- [ ] Aparecen los 3 posts en orden logro, actividad, anuncio, con sus chips y colores correctos.
- [ ] Fondo `#F6ECDF`, cards `#FFFDF9` y coral en el ítem activo del nav.
- [ ] Fredoka en títulos y nombres de niño; Nunito en el resto.
- [ ] En ≥1024px la sidebar es fija de 248px y el layout es de dos columnas.
- [ ] Por debajo de 1024px la sidebar se oculta y un botón hamburguesa abre un drawer con backdrop; cierra con X, backdrop o Escape.
- [ ] Todos los enlaces/botones usan `href="#"` y no navegan.
- [ ] Like, comentar y Editar no disparan ninguna acción.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** `components/` con subcarpetas `layout/`, `feed/`, `ui/`. Agrupa por utilidad.
- **Sí:** Tailwind con paleta en `@theme`. Nombres legibles y reutilizables.
- **Sí:** drawer off-canvas con backdrop en `lg`. Único comportamiento responsive pedido.
- **Sí:** datos estáticos en `lib/data.ts` y `PostCard` por props. Separa datos de presentación.
- **Sí:** iconos centralizados en `ui/icons.tsx`. Evita duplicar SVG.
- **Sí:** `next/font/google` en vez de `<link>`. Optimización de Next.
- **Sí:** `AppShell` cliente y `page.tsx` server; los posts se pasan como children.
- **No:** backend, base de datos y persistencia. Fuera del objetivo.
- **No:** interactividad real de like/comentar/editar. Solo visual.
- **No:** valores arbitrarios Tailwind (`bg-[#F6ECDF]`). Menos mantenible que los tokens.
- **No:** barra de íconos colapsada en móvil. El drawer cubre el caso.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Diferencias de píxeles al convertir estilos inline a Tailwind | Comparar contra `references/screenshots/feed.png` con Playwright |
| `next/font` requiere red en build | Cachea las fuentes en build; documentar que el primer build necesita conexión |
| Pasar datos no serializables a un componente cliente | `AppShell` recibe `children` ya renderizados en el server |

## Qué **no** entra en esta spec

- Autenticación o sesiones.
- Backend, base de datos o persistencia.
- Rutas y navegación reales del resto de pantallas.
- Interactividad de like, comentar o editar.
- Otras pantallas del mockup.

Cada punto, si llega, va en su propia spec.
