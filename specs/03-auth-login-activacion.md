# SPEC 03 — Auth: login y activación de cuenta

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (tokens en `app/globals.css`, fuentes e iconos)
> **Fecha:** 2026-10-25
> **Objetivo:** Implementar `login.dc.html` en `/auth/login` y `activar-cuenta.dc.html` en `/auth/activate` como pantallas visuales, replicando su diseño con Tailwind v4, sin autenticación ni backend.

## Alcance

**In:**

- Ruta `/auth/login` (`app/auth/login/page.tsx`) con el layout dividido del mockup: panel coral a la izquierda y formulario a la derecha.
- Ruta `/auth/activate` (`app/auth/activate/page.tsx`) con el formulario centrado de activación.
- Eliminar por completo la sección **"INGRESO COMO"** del login: label y botones Personal/Familia no se renderizan.
- Componentes: `components/auth/LoginHero.tsx`, `components/auth/LoginForm.tsx`, `components/auth/ActivateAccountForm.tsx`, `components/auth/AuthField.tsx`.
- Nuevo icono `CheckIcon` en `components/ui/icons.tsx` para el checkbox de autorización.
- Campos vacíos con placeholders:
  - Login: email `tu@email.com`, contraseña `••••••••`.
  - Activación: código `Código de 5 caracteres`, email `tu@email.com`, contraseña `Creá una contraseña`.
- Checkbox de autorización desmarcado por defecto, nativo e interactivo; no bloquea el CTA.
- Enlaces internos reales: login → `/auth/activate` y activación → `/auth/login`.
- CTA "Iniciar sesión", CTA "Activar mi cuenta" y "¿Olvidaste tu contraseña?" con `href="#"`.
- Responsive del login: panel coral visible desde `lg` (1024px); por debajo se oculta y aparece un logo compacto de OpenDayCare sobre el formulario.
- Nuevos tokens de color para las pantallas de auth, sin alterar los tokens existentes.
- Metadata por página: `Iniciar sesión · OpenDayCare` y `Activar cuenta · OpenDayCare`.

**Fuera de alcance (para specs futuras):**

- Autenticación real, sesiones, roles, validación y envío de formularios.
- Backend, base de datos y persistencia.
- Feed de familia (`/familia-feed`).
- Pantalla de recuperación de contraseña.
- Protección de rutas o redirecciones por sesión.
- Cambiar el logout del sidebar para que apunte a `/auth/login`.
- Modificar `app/layout.tsx`, `Sidebar`, `AppShell`, `/` o `/kids`.

## Modelo de datos

Esta spec no introduce estructuras de datos nuevas. Todo el contenido es estático en JSX y reutiliza los tokens y fuentes de SPEC 01. No se persiste nada.

## Plan de implementación

1. `app/globals.css`: añadir los tokens `auth-bg`, `auth-border`, `auth-placeholder`, `auth-focus`, `auth-gradient-start`, `auth-gradient-middle`, `auth-gradient-end`, `consent-bg`, `consent-text` y `consent-check` en `@theme`. Verificar `npm run dev` sin errores.
2. `components/ui/icons.tsx`: añadir `CheckIcon` con el mismo patrón `Icon` (`polyline` del check, tamaño 15 y stroke 3).
3. Crear `app/auth/login/page.tsx` y `app/auth/activate/page.tsx` como server components mínimos con su metadata y wrapper `min-h-screen bg-auth-bg`. Ambas rutas deben cargar para habilitar los tipos de rutas de Next.
4. `components/auth/AuthField.tsx`: label asociado con `htmlFor` e input con los estilos compartidos: borde `auth-border`, fondo blanco, placeholder `auth-placeholder`, foco `auth-focus`, `autoComplete` configurable y `inputClassName` opcional.
5. `components/auth/LoginHero.tsx`: panel coral con gradiente `155deg`, círculos decorativos, logo con `SunIcon`, titular, párrafo y "🌿 Guardería Sala Soles". Debe ser `hidden lg:flex`.
6. `components/auth/LoginForm.tsx`: logo compacto visible solo por debajo de `lg`, título, subtítulo, campos vacíos, "¿Olvidaste tu contraseña?", CTA y enlace a `/auth/activate`. Integrarlo en `app/auth/login/page.tsx` con el grid `lg:grid-cols-[1.05fr_1fr]`.
7. `components/auth/ActivateAccountForm.tsx`: icono de sol, título, subtítulo, tarjeta "Mateo · Sala Soles", campos vacíos, checkbox de autorización, CTA y enlace a `/auth/login`. Integrarlo en `app/auth/activate/page.tsx` con ancho máximo de 440px.
8. Verificar `npx tsc --noEmit` y `npm run lint`; comparar con Playwright `/auth/login` y `/auth/activate` a 1440×900 y 390×844 contra `references/pantallas/login.dc.html` y `references/pantallas/activar-cuenta.dc.html`.

## Criterios de aceptación

- [ ] `/auth/login` carga sin errores en consola.
- [ ] `/auth/activate` carga sin errores en consola.
- [ ] En ≥1024px el login muestra el panel coral con logo, titular, párrafo y "🌿 Guardería Sala Soles".
- [ ] El login no muestra el label "INGRESO COMO" ni los botones Personal/Familia.
- [ ] Los campos del login están vacíos y muestran los placeholders `tu@email.com` y `••••••••`.
- [ ] Por debajo de 1024px el panel coral desaparece y se muestra el logo compacto sobre el formulario.
- [ ] "Iniciar sesión", "Activar mi cuenta" y "¿Olvidaste tu contraseña?" usan `href="#"` y no ejecutan autenticación ni navegan a otra ruta.
- [ ] "Activá tu cuenta" navega a `/auth/activate`.
- [ ] La activación muestra el icono, el título "Bienvenida a OpenDayCare", el subtítulo y la tarjeta "Mateo · Sala Soles".
- [ ] Los campos de activación están vacíos y muestran los placeholders definidos.
- [ ] El checkbox de autorización empieza destildado, se puede tildar y destildar, y su texto es el del mockup.
- [ ] "Activar mi cuenta" usa `href="#"` y no ejecuta ninguna acción.
- [ ] "Iniciar sesión" en activación navega a `/auth/login`.
- [ ] Ninguna pantalla de auth usa `AppShell` ni muestra el sidebar.
- [ ] El fondo de ambas pantallas es `#FBF4EC` y los títulos usan Fredoka; el resto usa Nunito.
- [ ] Los campos tienen label asociado y `autoComplete` adecuado (`email`, `current-password`, `new-password`, `one-time-code`).
- [ ] `/` y `/kids` siguen funcionando sin cambios.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores.
- [ ] La comparación visual con ambos mockups vía Playwright coincide en estructura, colores, tipografías y espaciados.

## Decisiones tomadas y descartadas

- **Sí:** rutas `/auth/login` y `/auth/activate`. Agrupan las dos pantallas bajo un prefijo común y usan nombres en inglés.
- **Sí:** implementación solo visual. No hay backend ni sesión todavía.
- **Sí:** eliminar todo el bloque "INGRESO COMO". No queda selector de rol ni lógica asociada.
- **Sí:** CTAs principales con `href="#"`. Evita inventar una autenticación que no existe.
- **Sí:** campos vacíos con placeholders genéricos en español. Refleja un formulario real sin inventar datos de usuario.
- **Sí:** checkbox desmarcado e interactivo. Coherente con un formulario vacío y accesible de forma nativa.
- **Sí:** ocultar el panel coral bajo `lg` y mostrar un logo compacto. Conserva la marca sin una página excesivamente larga.
- **Sí:** no conectar el logout ni proteger rutas. Mantiene el alcance en las dos pantallas nuevas.
- **Sí:** tokens específicos para auth. El mockup usa `#FBF4EC`, distinto del `cream` global.
- **Sí:** todos los componentes de auth son server components. No hace falta estado en cliente.
- **No:** selector Personal/Familia. El usuario lo excluyó explícitamente.
- **No:** feed de familia. No existe y no se crea una ruta provisional.
- **No:** pantalla de recuperación de contraseña. Se deja como enlace sin destino.
- **No:** valores arbitrarios de Tailwind para los colores nuevos. Se centralizan en `@theme`.
- **No:** `app/auth/layout.tsx`. Cada página resuelve su layout completo, como en las specs anteriores.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| No hay screenshots de login ni activación en `references/screenshots/` | Comparar con los `.dc.html` renderizados vía Playwright a 1440×900 y 390×844 |
| El fondo `#FBF4EC` difiere del `cream #F6ECDF` del resto de la app | Usar `auth-bg` solo en las páginas de auth y no tocar `body` |
| El estado destildado del checkbox no está diseñado en el mockup | Definir caja blanca con borde `auth-border` y check verde al tildar |
| El logo compacto móvil no existe en el mockup | Reutilizar el patrón visual del logo del sidebar en tamaño pequeño |
| Los CTAs con `href="#"` pueden parecer funcionales | Documentar que la pantalla es visual y verificar que no ejecutan auth |

## Qué **no** entra en esta spec

- Autenticación real, sesiones o roles.
- Validación y envío de formularios.
- Backend, base de datos o persistencia.
- Feed de familia.
- Recuperación de contraseña.
- Protección de rutas o redirecciones.
- Cambios en el sidebar, `AppShell`, `/` o `/kids`.

Cada punto, si llega, va en su propia spec.
