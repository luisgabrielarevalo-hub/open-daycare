# SPEC 17 — Feed: publicación persistida de staff

> **Estado:** Implementado
> **Depende de:** SPEC 06 (modal “Nueva publicación”), SPEC 09 (auth y `requireProfile`), SPEC 12 (niños reales), SPEC 15 (sidebar del padre), SPEC 16 (tablas, RLS, `create_post` y bucket `post-photos`; implementar antes)
> **Fecha:** 2026-11-02
> **Objetivo:** Reemplazar el feed mock y la publicación de sesión por publicaciones reales de staff en Supabase, con o sin fotos, compresión en el navegador, URLs firmadas y respeto del consentimiento de imagen.

## Alcance

**In:**

- `app/layout.tsx` obtiene `getComposerData()` y lo pasa a `FeedProvider`; el layout sigue siendo server y no redirige en rutas públicas.
- `lib/feed/composer.ts` con `getComposerData()` cacheado por request:
  - Devuelve `null` sin sesión, con rol `parent` o con un usuario no activo.
  - Devuelve `daycareId`, los niños activos como `recipients` (`id`, `full_name`, `photo_consent`) y `allChildrenPhotoConsent` sobre los niños activos.
  - Usa el cliente server de Supabase y la RLS existente.
- `FeedProvider` deja de guardar posts: solo conserva los datos del composer y el estado del modal.
- `FeedProvider` expone `canCompose`; `ComposerPrompt` no se renderiza para padres y `openComposer` no hace nada si no hay datos.
- `app/layout.tsx` deja de importar `posts` de `lib/data.ts`.
- `app/page.tsx` consulta las publicaciones de hoy desde Supabase y las pasa a `FeedPosts`.
- `lib/feed/dates.ts` con `startOfTodayIso()`, `formatTimeLabel()` y `formatDateLabel()`.
- `lib/feed/posts.ts` con los tipos y helpers del feed:
  - `getTodayPosts(currentUserId)` consulta `posts` con `post_children(children(full_name))` y `post_photos(path, position)`, ordena por `published_at desc` y firma las fotos.
  - `toFeedPost(row, currentUserId, signedUrls)` arma el modelo de la tarjeta.
  - `audienceFor()` decide `child`, `children` o `room` y la etiqueta visible.
- `getTodayPosts` usa `createSignedUrls(paths, 3600)` cuando hay rutas; las fotos sin URL firmada se omiten.
- `PostCard` muestra al staff autor real: nombre, inicial y paleta determinística por `author_id`.
- “Publicado por vos” solo aparece cuando `author_id` es el usuario actual; para el resto, solo la hora.
- La línea de audiencia muestra `familia de {nombre}`, `sus familias` o `toda la sala`; en este último caso con el ícono de megáfono en línea.
- `PostCard` oculta el enlace “Editar” y mantiene reacciones y comentarios en `0`.
- `PostCard` renderiza las fotos con `next/image` y `unoptimized` a partir de las URLs firmadas.
- `next.config.ts` declara `images.remotePatterns` para el host de Supabase y `/storage/v1/object/sign/**`.
- `FeedPosts` pasa a server component y recibe `posts: FeedPost[]`.
- Estado vacío cuando no hay publicaciones de hoy: “Todavía no hay publicaciones hoy” y “Cuando se comparta un momento, va a aparecer acá.”
- `CreatePostForm` recibe `recipients`, `allChildrenPhotoConsent`, `isSubmitting` y `onPublish`; deja de importar `postRecipients`.
- El modal abre sin destinatario seleccionado y valida al publicar: “Elegí al menos un destinatario”.
- Se mantienen los siete tipos y el tipo inicial `activity`.
- La descripción sigue siendo obligatoria, con `maxLength` 1000 y el placeholder actual.
- “Toda la sala” es excluyente con los niños, como hoy.
- Se pueden elegir varios niños; no se bloquea deseleccionar el último.
- Fotos opcionales, máximo 4, con selector `accept="image/*" multiple`.
- Cada imagen se comprime en el navegador a WebP de hasta 1600 px de lado mayor y calidad 0.82 antes de subir.
- Se rechazan archivos de más de 10 MB y los que no se pueden decodificar.
- Las miniaturas usan `URL.createObjectURL` del blob comprimido y se revocan al quitar la foto o cerrar el modal.
- El aviso “Podés adjuntar hasta 4 fotos” se mantiene y se limpia al quitar una.
- Regla de consentimiento:
  - Con “Toda la sala”, si `allChildrenPhotoConsent` es `false`, el selector de fotos queda deshabilitado con “No se pueden adjuntar fotos: hay niños del centro sin consentimiento de imagen.”
  - Con niños seleccionados, si alguno no tiene `photo_consent`, el selector queda deshabilitado con “{Nombre} no tiene consentimiento para fotos.”
  - Si ya hay fotos y se intenta elegir un destinatario que bloquea fotos, la selección se rechaza y se muestra “Quitá las fotos para elegir ese destinatario.”
- Al enviar: valida, sube las fotos comprimidas al bucket `post-photos` y llama al Server Action `createPost`.
- La ruta de cada archivo es `<daycareId>/<draftId>/<índice>.webp`, con `draftId = crypto.randomUUID()`.
- Si la subida o el insert fallan, se borran los objetos ya subidos y el modal queda abierto con el texto y las fotos.
- El Server Action `createPost` en `app/feed/actions.ts`:
  - Exige sesión y valida tipo, audiencia, cuerpo, niños y cantidad de fotos.
  - Llama a `supabase.rpc("create_post", …)`; no hace inserts directos.
  - Traduce los errores de la función a mensajes en español.
  - Ejecuta `revalidatePath("/")` y devuelve `{ ok: true, postId }` o `{ ok: false, error }`.
- Mientras publica: botón “Publicando…”, campos deshabilitados, “Cancelar”, `Escape` y el clic en el fondo no cierran el modal.
- Al publicar con éxito: el modal se cierra, el formulario se resetea y `router.refresh()` actualiza el feed.
- `lib/data.ts`: se eliminan `posts`, `postRecipients`, el tipo `Post` y `feedDateLabel`; se conservan `PostKind`, `StaffProfile`, `Child` y el resto.
- `StaffProfile` suma `id`; `requireProfile` lo completa y calcula `dateLabel` con la fecha real (`lunes 2 nov`), no con el mock.
- `app/page.tsx` muestra `profile.dateLabel` real en el subtítulo.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y Playwright a 1440×900 y 390×844.
- Limpieza de los posts y archivos creados durante la verificación con SQL y Storage del MCP, no desde la app.

**Fuera de alcance (para specs futuras):**

- La UI del feed del padre; la RLS queda lista, pero no se rediseña su experiencia.
- Editar, borrar, fijar o programar publicaciones.
- Reacciones y comentarios reales; los contadores siguen en `0` y sin interacción.
- Lightbox, recorte, drag and drop, reordenar fotos o texto alternativo individual.
- Subida en segundo plano, reintentos automáticos o cola offline.
- Limpieza automática de archivos huérfanos en Storage.
- Realtime, notificaciones, correos o resumen diario.
- Agrupar el feed por días anteriores; solo se muestran las publicaciones de hoy.
- Búsqueda o paginación de destinatarios; se listan todos los niños activos.
- Cambios en `/kids`, `/kids/[slug]` o en el alta de niños.
- Cambios en las tablas, políticas o funciones de SPEC 16.
- Tests automatizados; el repo no tiene runner.

## Modelo de datos

### Tipos de la app

```ts
export type PostKind =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type FeedPost = {
  id: string;
  kind: PostKind;
  audienceKind: "child" | "children" | "room";
  authorId: string;
  authorName: string;
  authorInitial: string;
  avatarBg: string;
  avatarColor: string;
  timeLabel: string;
  audienceLabel: string;
  body: string;
  photos: { path: string; url: string }[];
  reactions: number;
  comments: number;
};

export type RecipientOption = {
  id: string;
  fullName: string;
  firstName: string;
  avatarBg: string;
  avatarColor: string;
  photoConsent: boolean;
};

export type ComposerData = {
  daycareId: string;
  recipients: RecipientOption[];
  allChildrenPhotoConsent: boolean;
};

export type CompressedPhoto = {
  id: string;
  previewUrl: string;
  blob: Blob;
};

export type PostDraft = {
  recipientIds: (string | "room")[];
  kind: PostKind;
  body: string;
  photos: CompressedPhoto[];
};
```

### Consulta del feed

```ts
type PostRow = {
  id: string;
  type: PostKind;
  audience_kind: "children" | "daycare";
  body: string;
  published_at: string;
  author_id: string;
  author_name: string;
  post_children: { children: { full_name: string } | null }[];
  post_photos: { path: string; position: number }[];
};
```

- `post_children` se ordena por nombre antes de calcular la etiqueta.
- `audienceKind` se deriva: `daycare` → `room`; un niño → `child`; dos o más → `children`.
- `photos` se ordena por `position` y se filtra a las rutas con URL firmada.
- `reactions` y `comments` quedan en `0` hasta que existan sus tablas.
- El tipo `Post` de `lib/data.ts` desaparece; `PostCard` usa `FeedPost`.
- Si PostgREST no infiere la relación por la FK compuesta, el embed usa `post_children(children!post_children_child_daycare_fkey(full_name))`.

### Fecha y hora

`lib/feed/dates.ts`:

- Zona horaria de la guardería: `America/Argentina/Buenos_Aires`.
- `startOfTodayIso()` arma `YYYY-MM-DD` con `Intl.DateTimeFormat("en-CA")` y devuelve el ISO correspondiente a las 00:00 de Argentina (`-03:00`).
- `formatTimeLabel()` usa `hour: "2-digit"`, `minute: "2-digit"` y `hourCycle: "h23"`.
- `formatDateLabel()` usa `weekday: "long"`, `day: "numeric"` y `month: "short"`, quita comas, la preposición `de` y el punto final de la abreviatura (`lunes 2 nov`).
- Si el autor es el usuario actual, `timeLabel` agrega ` · publicado por vos`.

### Composer

- `getComposerData()` usa `supabase.auth.getClaims()`; sin `sub` devuelve `null`.
- Lee la fila propia de `users` (`daycare_id`, `role`, `status`); solo `staff`/`admin` activos reciben datos.
- `getComposerData()` lee `children` con `status = 'active'`, ordenado por `full_name`; los niños activos forman `recipients` y `allChildrenPhotoConsent` se calcula sobre ellos, igual que la función `create_post`.
- `firstName` es la primera palabra de `full_name`.
- `avatarBg` y `avatarColor` salen de `avatarPalette(id)` de `lib/kids/children.ts`.
- `allChildrenPhotoConsent` es `children.every((child) => child.photo_consent)`, sobre los niños activos.
- Si no hay niños activos, `recipients` queda vacío y el modal muestra “No hay niños activos para etiquetar.”; “Toda la sala” sigue disponible.

## Plan de implementación

1. Aplicar SPEC 16 y verificar con SQL que las tablas, políticas y bucket existen. No avanzar si falta `create_post` o el bucket `post-photos`.
2. `lib/data.ts` y `lib/auth/profile.ts`: eliminar `posts`, `postRecipients`, `Post` y `feedDateLabel`; agregar `id` a `StaffProfile`; calcular `dateLabel` con `formatDateLabel()` de `lib/feed/dates.ts`. Verificar que `npx tsc --noEmit` solo marque los usos que se corrigen en los pasos siguientes.
3. `lib/feed/dates.ts` y `lib/feed/posts.ts`: crear las fechas y los helpers (`getTodayPosts`, `toFeedPost`, `audienceFor`). Verificar `startOfTodayIso()` con una fecha fija y comprobar que el corte cae a las 00:00 de Argentina.
4. `app/page.tsx`, `FeedPosts` y `PostCard`: leer de Supabase, pasar `posts` al componente server, mostrar autor real, audiencia, fotos firmadas, “Publicado por vos” y ocultar “Editar”. Verificar el feed vacío y con datos de prueba insertados por SQL.
5. `lib/feed/composer.ts`, `app/layout.tsx` y `FeedProvider`: cargar los datos del composer, quitar los posts del provider, exponer `canCompose` y ocultar `ComposerPrompt` para padres. Verificar `/`, `/kids` y `/kids/[slug]` sin errores.
6. `CreatePostForm`: reemplazar los niños mock por `recipients`, quitar la preselección, agregar la validación de destinatario y la regla de consentimiento. Verificar los chips, la selección múltiple y “Toda la sala”.
7. `lib/feed/image.ts` y `lib/feed/upload.ts`: compresión a WebP y subida/limpieza en Storage. Verificar con una imagen grande que el blob final es WebP y pesa menos que el original.
8. `app/feed/actions.ts`: Server Action `createPost` con validación, RPC, traducción de errores y `revalidatePath`. Verificar los casos de error con parámetros inválidos.
9. `CreatePostModal`: orquestar subida, acción, estado “Publicando…”, bloqueo de cierre, limpieza de objetos ante error y `router.refresh()` al éxito. Verificar publicación con y sin fotos y persistencia al recargar.
10. `next.config.ts`: agregar `remotePatterns` para Supabase. Verificar que `next/image` no lanza error con las URLs firmadas.
11. Verificar `npx tsc --noEmit`, `npm run lint` y `npm run build`; comparar con Playwright a 1440×900 y 390×844 el feed, el modal, el estado vacío y una publicación con foto. Limpiar posts y objetos creados.

## Criterios de aceptación

- [x] `/` muestra solo publicaciones de hoy leídas de Supabase, ordenadas de más reciente a más antigua.
- [x] Sin publicaciones de hoy, el feed muestra “Todavía no hay publicaciones hoy” y el texto de apoyo.
- [x] `profile.dateLabel` muestra la fecha real en español (`lunes 2 nov`), no `martes 17 jun`.
- [x] El saludo y el conteo de niños siguen funcionando.
- [x] La tarjeta muestra el nombre del staff autor y su inicial con una paleta determinística.
- [x] Un post propio muestra “HH:mm · publicado por vos”; uno de otro staff muestra solo “HH:mm”.
- [x] Un post a un niño muestra “familia de {nombre}”.
- [x] Un post a dos o más niños muestra “sus familias”.
- [x] Un post a “Toda la sala” muestra “toda la sala” con el ícono de megáfono en la línea de audiencia.
- [x] El enlace “Editar” no se renderiza.
- [x] Las fotos se ven con la proporción actual (una a ancho completo, varias en cuadrícula) y cargan desde URLs firmadas.
- [x] “Nueva publicación” y “Compartí un momento…” abren el mismo modal en `/` y `/kids`.
- [x] Un usuario `parent` no ve “Nueva publicación” ni “Compartí un momento…”, y `openComposer` no abre el modal.
- [x] El modal abre sin destinatario seleccionado.
- [x] Publicar sin destinatario muestra “Elegí al menos un destinatario” y no cierra.
- [x] El tipo inicial sigue siendo Actividad.
- [x] Los destinatarios son los niños activos reales del daycare, no Mateo/Sofía/Benjamín fijos.
- [x] Se pueden seleccionar varios niños y “Toda la sala” sigue siendo excluyente.
- [x] Se puede deseleccionar el último niño; la validación aparece al publicar.
- [x] La descripción vacía muestra “Escribí una descripción” y el máximo sigue siendo 1000.
- [x] Se pueden adjuntar hasta 4 imágenes; cada una se convierte a WebP de hasta 1600 px.
- [x] Una imagen de más de 10 MB se rechaza con un mensaje claro.
- [x] Un archivo que no se puede decodificar se rechaza sin romper el modal.
- [x] Las miniaturas se ven y se pueden quitar; el aviso de exceso desaparece al quitar una.
- [x] Con “Toda la sala” y un niño sin consentimiento, el selector de fotos está deshabilitado y explica el motivo.
- [x] Con un niño sin consentimiento seleccionado, el selector de fotos está deshabilitado y nombra al niño.
- [x] Si hay fotos y se intenta elegir un destinatario sin consentimiento, la selección se rechaza con “Quitá las fotos para elegir ese destinatario.”
- [x] “Publicar” sube las fotos a `<daycareId>/<draftId>/<n>.webp` y llama a `create_post`.
- [x] Mientras publica, el botón dice “Publicando…”, los campos están deshabilitados y el modal no se puede cerrar.
- [x] Al publicar con éxito, el modal se cierra, el formulario se resetea y el post aparece primero sin recargar.
- [x] El post persiste al recargar y al navegar a `/kids` y volver.
- [x] Si el insert falla, el modal queda abierto con el texto y las fotos, muestra un error y borra los objetos subidos.
- [x] Si la subida de una foto falla, se borran las anteriores y se muestra un error.
- [x] Publicar sin fotos funciona igual.
- [x] El Server Action traduce `children_required`, `invalid_children`, `photo_consent_missing`, `too_many_photos` e `invalid_photo_path`.
- [x] `createPost` rechaza un cuerpo vacío, más de 1000 caracteres, tipos inválidos y más de 4 rutas.
- [x] El bucket sigue siendo privado: una URL pública directa no devuelve la imagen.
- [x] Un padre ve en SQL los posts de sus hijos y los de “Toda la sala”, y no los de otros niños.
- [x] Un padre no puede publicar ni subir archivos.
- [x] `next.config.ts` permite el host de Supabase y `/storage/v1/object/sign/**`.
- [x] A 390×844 no hay desbordamiento horizontal y el modal alto hace scroll interno.
- [x] El modal conserva foco inicial en la descripción, `aria-pressed`, labels asociados y nombres accesibles en las fotos.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.
- [x] La limpieza deja la base y el bucket sin los datos de prueba.

## Decisiones tomadas y descartadas

- **Sí:** el feed lee de `posts` y desaparecen los tres mock. Evita mezclar datos reales con ejemplos fijos.
- **Sí:** solo publicaciones de hoy. Coincide con “PUBLICADO HOY” y evita diseñar historial en esta spec.
- **Sí:** autor staff real con `author_name` guardado en el post. No depende de abrir `users` a otros roles.
- **Sí:** el avatar sigue siendo la inicial del staff, no el niño. La audiencia va en “Para:”.
- **Sí:** megáfono en línea para “toda la sala”. Conserva la señal visual sin reemplazar el avatar del autor.
- **Sí:** sin preselección de destinatario. Evita publicar a la familia equivocada.
- **Sí:** el modal espera al servidor y no cierra hasta confirmar. Evita posts fantasma y facilita limpiar Storage.
- **Sí:** subida directa del navegador con la sesión del staff. Evita el límite de tamaño de los Server Actions y no requiere `service_role`.
- **Sí:** compresión a WebP ≤1600 px antes de subir. Reduce costo, peso y tiempo de carga.
- **Sí:** máximo 4 fotos y 10 MB de entrada. La base también impone las 4.
- **Sí:** `photo_consent` bloquea fotos, no solo advierte. Es una regla de privacidad de menores.
- **Sí:** “Toda la sala” con fotos exige consentimiento de todos los niños activos. Es la única forma de garantizar que la foto no exponga a un niño sin consentimiento.
- **Sí:** `router.refresh()` tras publicar. El post ya está en la base; el feed se vuelve a renderizar desde el servidor.
- **Sí:** limpieza de objetos subidos mediante un Server Action acotado que valida sesión, guardería y que la ruta no esté referenciada por `post_photos`. SPEC 16 no define una política `DELETE` de Storage, así que el borrado corre en el servidor con el cliente admin y nunca toca fotos ya publicadas.
- **Sí:** URLs firmadas de 60 minutos. El bucket es privado y las fotos de menores no quedan públicas.
- **Sí:** `getComposerData()` en el layout. El modal es global y no necesita un viaje extra al abrirlo.
- **Sí:** ocultar el composer a padres. SPEC 15 ya oculta el botón del sidebar; esta spec también oculta el prompt del feed.
- **No:** editar, borrar, fijar o programar. Queda para otra spec.
- **No:** reacciones y comentarios reales. Siguen en `0`.
- **No:** historial agrupado por día, paginación o búsqueda de destinatarios.
- **No:** lightbox, recorte, drag and drop o reordenar fotos.
- **No:** cola offline, reintentos automáticos o subida en segundo plano.
- **No:** limpieza automática de huérfanos. La app borra lo suyo; un job futuro barre el resto.
- **No:** UI del feed del padre. Solo se verifica la RLS con SQL.
- **No:** cambios en las tablas o políticas de SPEC 16.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El layout raíz consulta Supabase y rompe `/auth/*` | `getComposerData()` usa `getClaims()` y devuelve `null` sin sesión; no redirige |
| Un padre abre el modal y la RLS lo rechaza | `getComposerData()` devuelve `null` para `parent`; el prompt y el botón no se muestran |
| Las URLs firmadas caducan con la pestaña abierta | TTL de 60 minutos; recargar vuelve a firmar |
| `next/image` rechaza el host de Supabase | `remotePatterns` con el host y `/storage/v1/object/sign/**` |
| El post se inserta pero `router.refresh()` falla | El post ya está en la base; al recargar aparece |
| El insert falla después de subir fotos | El cliente borra las rutas subidas y muestra el error |
| Quedan archivos huérfanos si falla la limpieza | Riesgo aceptado; job de limpieza en otra spec |
| El navegador no codifica WebP | Se muestra “No pudimos procesar esa imagen” y no se sube |
| HEIC de iPhone no se decodifica en algunos navegadores | Se rechaza con un mensaje que sugiere JPG, PNG o WebP |
| `photo_consent` cambia entre abrir el modal y publicar | La función `create_post` rechaza; el modal queda abierto y muestra el error |
| La selección de niños es larga y desborda el modal | Los chips hacen wrap y el diálogo tiene scroll interno |
| Un archivo supera el límite del bucket | Se valida 10 MB en el cliente y 5 MB en el bucket; el error se muestra inline |
| La etiqueta de audiencia del padre muestra solo uno de sus hijos | La UI del padre queda fuera de alcance; la RLS ya limita `post_children` |
| La zona horaria del servidor no es Argentina | Se fuerza `America/Argentina/Buenos_Aires` en todas las fechas |
| El feed de hoy se ve vacío por el corte de medianoche | `startOfTodayIso()` se calcula en cada request, no al construir |
| `revalidatePath("/")` no refresca la ruta actual | Se combina con `router.refresh()` al cerrar el modal |
| El formulario pierde las fotos al fallar | Se mantienen los blobs y previews hasta el cierre exitoso |
| La limpieza deja posts de prueba | Borrar por `id` y por prefijo `<daycareId>/<draftId>/` en Storage |

## Qué **no** entra en esta spec

- La UI del feed del padre.
- Editar, borrar, fijar o programar publicaciones.
- Reacciones y comentarios reales.
- Historial agrupado por día, paginación o búsqueda de destinatarios.
- Lightbox, recorte, drag and drop o reordenar fotos.
- Cola offline, reintentos automáticos o subida en segundo plano.
- Limpieza automática de archivos huérfanos.
- Realtime, notificaciones, correos o resumen diario.
- Cambios en `/kids`, `/kids/[slug]`, el alta de niños o la autenticación.
- Cambios en las tablas, políticas o funciones de SPEC 16.
- Tests automatizados.

Cada punto, si llega, va en su propia spec.
