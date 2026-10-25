# SPEC 06 — Feed: modal "Nueva publicación"

> **Estado:** Implementado
> **Depende de:** SPEC 01 (feed, `PostCard`, `ComposerPrompt`, `Sidebar`), SPEC 04 (patrón `<dialog>`, tokens `modal-*`, `field-*` y `scrim`)
> **Fecha:** 2026-10-25
> **Objetivo:** Implementar `crear-publicacion.dc.html` como modal de creación abierto desde el sidebar y el composer que, con destinatarios, tipo, descripción y hasta cuatro fotos, inserta el post al inicio del feed durante la sesión sin backend.

## Alcance

**In:**

- Modal superpuesto sin cambio de ruta, abierto desde "Nueva publicación" del sidebar (escritorio y drawer móvil) y desde la caja "Compartí un momento…".
- Componentes nuevos `components/feed/CreatePostModal.tsx` (diálogo) y `components/feed/CreatePostForm.tsx` (contenido y validación), ambos `"use client"`.
- `components/feed/FeedProvider.tsx` (`"use client"`) en el layout raíz: mantiene los posts y el estado del modal, y renderiza una única instancia del diálogo para toda la app.
- `components/feed/FeedPosts.tsx` (`"use client"`) que lee los posts del provider; `app/page.tsx` sigue siendo server y conserva el saludo y el divisor "PUBLICADO HOY".
- Estructura fiel al mockup: tarjeta `modal-bg`, borde `border`, radio 24px, ancho máximo 580px, sombra y scrim. Cabecera con "Cancelar", "Nueva publicación" y "Publicar".
- Destinatarios con selección múltiple entre **Mateo, Sofía y Benjamín**, más **Toda la sala**; Mateo seleccionado al abrir.
- "Toda la sala" es excluyente: al elegirla se deseleccionan los niños y, al elegir un niño, se deselecciona "Toda la sala". No se puede deseleccionar el último niño seleccionado.
- Con dos o más niños seleccionados, el post queda a nombre de **Niños** y se muestra como "Para: sus familias".
- Tipos con selección única entre **Comida, Siesta, Actividad, Logro, Ánimo, Foto y Anuncio**; Actividad seleccionada al abrir.
- El tipo activo se ve con su color intenso y texto blanco; los inactivos con su versión clara y texto de color.
- Descripción obligatoria, vacía al abrir, con el placeholder "Contá cómo le fue hoy…" y `maxLength` de 1000.
- Fotos opcionales, hasta 4, con selector real `accept="image/*" multiple`, miniaturas locales y botón para quitar cada una. No se suben ni persisten.
- Si se eligen más fotos de las que caben, se agregan hasta 4 y se muestra "Podés adjuntar hasta 4 fotos"; el aviso desaparece al quitar una.
- "Publicar" siempre activo; valida al enviar. El único error posible es la descripción vacía o con solo espacios: "Escribí una descripción".
- Publicación válida: el post se inserta primero en el feed, el modal se cierra y el formulario vuelve a Mateo, Actividad, descripción vacía y cero fotos.
- El post nuevo sobrevive la navegación entre rutas durante la sesión (por ejemplo `/` → `/kids` → `/`); se pierde al recargar.
- Cierre con "Cancelar", `Escape` y clic en el fondo; reset completo en cualquier cierre, incluidas las URLs de las fotos no publicadas.
- En móvil, abrir el modal desde el drawer cierra el drawer antes de mostrar el diálogo.
- Foco inicial en la descripción, foco atrapado y `Escape` nativos de `<dialog>` con `showModal()`.
- Nuevos tokens semánticos para los tipos que no existían y para sus chips en el feed.
- `PostCard` amplía sus etiquetas y colores a los siete tipos y renderiza una galería para `photos`; los posts existentes con `photoLabel` conservan su placeholder punteado.
- Responsive: ancho `calc(100% - 32px)` y scroll interno si no cabe en alto.

**Fuera de alcance (para specs futuras):**

- Backend, base de datos, `localStorage`, `sessionStorage`, sesiones o subida real de archivos.
- Persistencia de posts nuevos después de recargar.
- Editar, borrar, fijar, programar o guardar borradores de publicaciones.
- Reacciones, comentarios o detalle del post desde el feed.
- Múltiples tipos por publicación.
- Todos los niños de `lib/data.ts` como destinatarios; solo los tres del mockup y "Toda la sala".
- Validación de tipo o destinatario: los niños arrancan con Mateo seleccionado y el formulario impide quedarse sin destinatario; el tipo siempre tiene valor.
- Confirmación al cerrar con contenido escrito.
- Drag and drop, recorte, compresión, lightbox o texto alternativo individual de fotos.
- Animaciones de apertura/cierre.
- Cambios en `/kids`, `/kids/[slug]`, `/auth/*` o en los datos de niños y padres.

## Modelo de datos

`lib/data.ts` amplía el modelo existente. Los tres posts actuales se conservan y solo reciben `audienceKind`:

```ts
export type PostKind =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type PostAudienceKind = "child" | "children" | "room";

export type Post = {
  id: string;
  kind: PostKind;
  audienceKind: PostAudienceKind;
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
  photos?: string[];
};
```

- `audienceKind` decide si el avatar es el del niño, el grupo "Niños" o el megáfono de "Anuncio general". No se infiere de `kind`.
- `photos` contiene URLs `blob:` creadas con `URL.createObjectURL`; viven solo en memoria durante la sesión.
- `CreatePostForm` define:

```ts
const RECIPIENT_IDS = [
  "mateo-fernandez",
  "sofia-mendez",
  "benjamin-ruiz",
] as const;

const POST_TYPES = [
  { value: "meal", label: "Comida" },
  { value: "nap", label: "Siesta" },
  { value: "activity", label: "Actividad" },
  { value: "achievement", label: "Logro" },
  { value: "mood", label: "Ánimo" },
  { value: "photo", label: "Foto" },
  { value: "announcement", label: "Anuncio" },
] as const;
```

- Estado inicial del formulario: Mateo, Actividad, descripción vacía y `photos: []`.
- Selección de niños en un array de ids; "Toda la sala" se representa aparte y es excluyente. Si se deselecciona un niño y era el único, la selección no cambia.
- Post creado para un niño: `authorName` con el nombre de pila, `authorInitial` y colores del niño, `audience` `"familia de {nombre}"`, `audienceKind: "child"`, `time` `"HH:mm · publicado por vos"`, `reactions: 0`, `comments: 0`.
- Post creado para "Toda la sala": `authorName: "Anuncio general"`, `authorInitial: ""`, `avatarBg: "#CCD8F4"`, `avatarColor: "#4E72C8"`, `audience: "toda la sala"`, `audienceKind: "room"`.
- Post creado para dos o más niños: `authorName: "Niños"`, `authorInitial: "N"`, `avatarBg: "#CCD8F4"`, `avatarColor: "#4E72C8"`, `audience: "sus familias"`, `audienceKind: "children"`.
- `id` con `crypto.randomUUID()`.
- El texto se guarda con `body.trim()`.
- Las fotos se transfieren del formulario al post; no se revocan al publicar.

## Plan de implementación

1. `lib/data.ts`: ampliar `PostKind`, añadir `PostAudienceKind`, `audienceKind` obligatorio y `photos?: string[]`; actualizar los tres posts existentes. Verificar que `/` sigue renderizando sin cambios.
2. `app/globals.css`: añadir tokens `meal-bg/fg`, `nap-bg/fg`, `mood-bg/fg` y `kind-photo-bg/fg`. Verificar `npm run dev` sin errores.
3. `components/feed/PostCard.tsx`: mapear los siete tipos a etiquetas y colores, usar `audienceKind` para el megáfono y renderizar la galería de `photos` (una foto a ancho completo; dos o más en cuadrícula de dos columnas). Verificar el feed actual.
4. `components/feed/FeedProvider.tsx` y `app/layout.tsx`: provider con `posts`, `addPost`, `isComposerOpen`, `openComposer` y `closeComposer`; envolver `children` con `initialPosts={posts}`. Verificar que todas las rutas siguen funcionando.
5. `components/feed/FeedPosts.tsx` y `app/page.tsx`: sustituir el `posts.map` por `FeedPosts`. El feed debe verse idéntico.
6. `components/feed/CreatePostForm.tsx`: cabecera, destinatarios, tipos, descripción y fotos; defaults, selección múltiple de niños con "Toda la sala" excluyente, bloqueo del último niño, validación, previews, límite de 4 y aviso de exceso. Todavía sin publicar.
7. `components/feed/CreatePostModal.tsx`: `<dialog>` con `showModal()`, foco en la descripción, cierre por Cancelar, `Escape` y backdrop, y reset por `key` en `onClose`. Conectarlo al provider.
8. Cablear "Publicar": construir el post de un niño, de "Niños" o de "Toda la sala", llamar a `addPost`, cerrar y resetear. Verificar que aparece primero en el feed.
9. `Sidebar`, `AppShell` y `ComposerPrompt`: convertir los disparadores en botones; `AppShell` cierra el drawer y abre el modal. Verificar `/`, `/kids` y `/kids/mateo-fernandez`.
10. Verificar `npx tsc --noEmit` y `npm run lint`; comparar con Playwright a 1440×900 y 390×844 contra `references/pantallas/crear-publicacion.dc.html` y comprobar el post nuevo en el feed.

## Criterios de aceptación

- [x] `/` carga sin errores en consola.
- [x] "Nueva publicación" del sidebar y "Compartí un momento…" abren el mismo modal sin navegar.
- [x] En móvil, abrir desde el drawer cierra el drawer y deja solo el modal con su scrim.
- [x] El modal muestra "Cancelar", "Nueva publicación" y "Publicar", más las secciones PARA, TIPO, DESCRIPCIÓN y FOTOS.
- [x] Al abrir, Mateo está seleccionado, Actividad está activa, la descripción está vacía y no hay fotos.
- [x] Los cuatro destinatarios son Mateo, Sofía, Benjamín y Toda la sala; los botones exponen `aria-pressed` y permiten seleccionar varios niños.
- [x] Con dos o más niños seleccionados, el post muestra "Niños", su avatar "N" y "Para: sus familias".
- [x] "Toda la sala" deselecciona los niños; elegir un niño deselecciona "Toda la sala".
- [x] No se puede deseleccionar el último niño seleccionado.
- [x] Los siete tipos están presentes; solo uno queda activo, con relleno intenso, y los demás con su versión clara.
- [x] "Publicar" con la descripción vacía o solo con espacios muestra "Escribí una descripción" y no cierra el modal.
- [x] Escribir en la descripción elimina su error sin volver a enviar.
- [x] La descripción acepta hasta 1000 caracteres y no permite superarlos.
- [x] Se pueden adjuntar hasta 4 imágenes, ver sus miniaturas y quitar cualquiera.
- [x] Con 4 fotos, la opción "Agregar" ya no permite añadir más.
- [x] Elegir más de 4 fotos agrega hasta 4 y muestra "Podés adjuntar hasta 4 fotos"; el aviso desaparece al quitar una.
- [x] Los archivos que no son imagen se ignoran.
- [x] Las fotos son opcionales, incluso con el tipo Foto.
- [x] Con datos válidos, "Publicar" cierra el modal y el post aparece primero bajo "PUBLICADO HOY".
- [x] Un post para Mateo muestra su nombre de pila, su avatar, "familia de Mateo", la hora actual con "publicado por vos", 0 reacciones y 0 comentarios.
- [x] Un post para Toda la sala muestra "Anuncio general", el megáfono y "toda la sala".
- [x] Un post de tipo Anuncio dirigido a un niño conserva el avatar del niño, no el megáfono.
- [x] El chip del feed corresponde al tipo elegido, con su etiqueta y color.
- [x] Una foto se ve a ancho completo; dos o más se ven en cuadrícula; los posts viejos conservan su placeholder punteado.
- [x] Al reabrir después de cancelar, el formulario vuelve a Mateo, Actividad, descripción vacía y sin fotos.
- [x] Un post creado en `/kids` sigue estando al volver a `/`; recargar lo elimina.
- [x] "Cancelar", `Escape` y el clic en el fondo cierran; un clic dentro de la tarjeta no cierra.
- [x] Al abrir, el foco está en la descripción; el diálogo tiene nombre accesible, los labels están asociados y los botones de quitar foto tienen nombre accesible.
- [x] La tarjeta usa fondo `#FBF4EC`, borde `#ECE0D0`, radio 24px, ancho máximo 580px y título en Fredoka.
- [x] A 390px no hay desbordamiento horizontal y el contenido alto hace scroll dentro del modal.
- [x] `/kids` y `/kids/mateo-fernandez` siguen funcionando sin cambios.
- [x] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [x] La comparación visual con `crear-publicacion.dc.html` coincide en estructura, colores, tipografías y espaciados.

## Decisiones tomadas y descartadas

- **Sí:** un provider en el layout raíz. Permite publicar desde cualquier pantalla y conservar el post al navegar, sin backend ni `localStorage`.
- **Sí:** un solo `<dialog>` global en el provider. Evita duplicar diálogos entre sidebar de escritorio y drawer móvil.
- **Sí:** ampliar `PostKind` y añadir `audienceKind`. El tipo elegido y la audiencia son independientes; sin `audienceKind`, un anuncio a un niño mostraría el megáfono por error.
- **Sí:** destinatarios por id (`mateo-fernandez`, `sofia-mendez`, `benjamin-ruiz`). Evita depender del orden de `children`.
- **Sí:** Mateo y Actividad preseleccionados. Coincide con el mockup y elimina dos validaciones que no aportan información.
- **Sí:** selección múltiple de niños y selección única de tipo. "Toda la sala" es excluyente para no mezclar una audiencia individual con la sala.
- **Sí:** con dos o más niños, el post se muestra como "Niños" / "sus familias", sin listar nombres. Evita una línea de audiencia larga y encaja con el feed actual.
- **Sí:** tipo activo con relleno intenso y texto blanco; inactivos con su tono claro. Distingue la selección sin añadir chrome que el mockup no tiene.
- **Sí:** descripción obligatoria con `maxLength` 1000. Genera un único error real y evita posts vacíos.
- **Sí:** fotos opcionales, máximo 4, con previews locales. Replica la sección del mockup sin inventar subida de archivos.
- **Sí:** elegir más de 4 agrega las que caben y avisa. Es menos frustrante que rechazar toda la selección.
- **Sí:** galería de miniaturas en el feed. Los posts nuevos muestran imágenes reales; los viejos mantienen `photoLabel`.
- **Sí:** autor niño o "Anuncio general". Replica la lógica visual del feed existente.
- **Sí:** post nuevo al inicio del feed. Es el orden esperado para una publicación recién creada.
- **Sí:** foco inicial en la descripción. Destinatario y tipo ya están resueltos; el primer campo editable es el texto.
- **Sí:** URLs `blob:` con transferencia al publicar. Evita convertir imágenes a base64 y mantiene el estado serializable fuera del formulario.
- **Sí:** aviso de exceso de fotos que se limpia al quitar una. Evita un error pegajoso sin volver a abrir el selector.
- **No:** backend, `localStorage` o subida real. Descartado por el usuario; el post vive solo en la sesión.
- **No:** múltiples tipos por post. Requeriría cambiar el modelo del feed.
- **No:** validar tipo o destinatario. El formulario impide quedarse sin niños o sin sala y el tipo siempre tiene valor.
- **No:** confirmación al descartar, animaciones, drag and drop, recorte o lightbox.
- **No:** editar o borrar posts, reacciones o comentarios.
- **No:** cambios en `children`, `staffProfile` o en el contenido de los tres posts existentes más allá de `audienceKind`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El provider cliente en el layout raíz afecta todas las rutas | Solo el provider y el modal son cliente; las páginas siguen siendo server y el modal está cerrado donde no hay disparador |
| Las URLs `blob:` se revocan demasiado pronto o se filtran | Revocar al quitar una foto y al cerrar sin publicar; al publicar, transferir la propiedad al provider y revocar al desmontarlo |
| Dos `<dialog>` por las dos instancias del sidebar | Una sola instancia en `FeedProvider`; los disparadores solo llaman a `openComposer` |
| El drawer móvil queda detrás del modal | `AppShell` cierra el drawer en el mismo callback que abre el modal |
| `audienceKind` falta en algún post y se renderiza mal el avatar | Hacerlo obligatorio y actualizar los tres posts existentes en el primer paso |
| Los colores claros de los tipos pierden contraste | Usar el tono intenso como color de texto y reservar el blanco para el tipo activo |
| Las fotos grandes consumen memoria | Máximo 4, sin subida ni persistencia; el post se pierde al recargar |
| El post desaparece al recargar | Aceptado: la sesión es el límite de persistencia elegido |
| Cambios en `children` rompen los destinatarios | Filtrar por ids conocidos y omitir los que no existan |
| Quedarse sin destinatarios al deseleccionar | Bloquear la deselección del último niño y hacer "Toda la sala" excluyente |
| El `<dialog>` y el scrim se ven distintos en Safari/Chrome | Fijar tokens y verificar en Chromium con Playwright; revisar el CSS del backdrop |

## Qué **no** entra en esta spec

- Backend, subida real o persistencia de publicaciones.
- Múltiples tipos por post.
- Edición, borrado, programación o borradores.
- Reacciones, comentarios y detalle del post desde el feed.
- Drag and drop, recorte, compresión o lightbox de fotos.
- Confirmación al cerrar con datos escritos o animaciones.
- Cambios en la gestión de niños, padres o autenticación.

Cada punto, si llega, va en su propia spec.
