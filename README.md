# Proyecto OpEncode - 06 Open Daycare

## Arquitectura del Sistema

### Stack Tecnológico

| Componente | Tecnología | Estado |
|------------|-----------|-------|
| Frontend Framework | Next.js 16.3.4 | ✅ Activo |
| Web App Language | React 19.2 | ✅ Activo |
| Tailwind CSS v4 | ✅ En desarrollo | ❌ Inactivo (v4 not installed) |
| TypeScript | Auto-generated | ✅ Auto-generated |

### Estructura de Proyecto

**root/06-open-daycare/**

#### Root Directory Structure

- `/app/` - Web app directory with Next.js routing and layout
  - `layout.tsx` - Main application layout (components)
    - Sidebar
    - Header
    - Footer
  - `page/layout.tsx` - Layout template for pages
  - `AppLayout.tsx` - Global component
- `/app/globals.css` - Global styles (Tailwind v4 integration)
- `/app/lib/` - Client-side data with static types

#### /lib/data.ts

Configuración de datos:

```typescript
// Auto-generated TypeScript types
export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string; // YYYY-MM-DD
  tags: string[];
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  profile?: any[];
  role?: string;
  skills?: string[];
}

export type User = "admin" | "staff" | "guest";
```

#### /app/lib/constants.ts (Automático)

Configuraciones globales del sistema que se generan automáticamente desde `/lib/data.ts`:

- **URL Routes**: Base URL y rutas protegidas
- **Styling**: Configuración de Tailwind v4 y colores
- **Type definitions**: Definiciones del frontend JavaScript
- **Mock Data**: Testeadores de datos en tiempo real

## Estructura de Carpetas

**root/app/** - Web app directory:
```
├── index.html      - HTML principal con Next.js
├── page/           - Rutas protegidas (SPA)
└── layouts/        - Layouts generados por Next.js
    ├── AppLayout.tsx
    └── PageLayout.tsx
```

**root/app/globals.css** - Estilos CSS:
- Tailwind v4 variables configuration
- Font settings (Fredoka, Nunito)
- Import aliases (@import "tailwindcss")
- Theme colors and system fonts

**root/app/lib/** - Client-side data configuraciones:
- `data.ts` - API de datos y modelos generados
- `constants.ts` - Configuraciones globales
- `models/` (auto-generated) - Definiciones types
- `hooks/` / `contexts/` (auto-generated) - Contextos y hooks

**root/references/*.dc.html** - Marcas de diseño en .DC format:
- Login screen
- Feed page (feed/page.tsx + pages/01-06.spec.md)
- Kids directory page
- Child profile page
- Admin panel views
- Staff profiles page
- Modals for add child, link parent, create post

---

## Módulos Principales

### 1. Base de datos (Simulado)

Se implementan tablas simuladas en **PostgreSQL** para el MVP:

| Tabla | Creación | Propósito |
|-------|----------|-----------|
| `posts` | Auto-generated CRUD | Posts public |
| `children` | Auto-generated CRUD | Kids in daycare |
| `users` | Auto-generated CRUD | Auth (admin, staff, guest) |

### 2. API REST (Simulado)

```bash
POST /api/posts     - Crea un post
GET /posts/      - Obtener posts
DELETE /       - Eliminar post
PUT /posts        - Actualizar post
CONNECT POST /api/auth   - Auth endpoints

POST /api/child    - Nueva child
GET /kids          - Children list
GET /children/[id] - Perfil de niño
```

### 3. Auth System (Simulado)

- **Authentication**: JWT Tokens
- **Authorization**: Role-based access control (admin/staff/guest)
- **API Endpoints**: `/users/{id}` y `@/api/auth`

---

## Funciones Clave

### Layout Generation

**Layouts creados automáticamente:**
- `AppLayout.tsx`: Layout de inicio (sidebar + navbar)
- `PageLayout.tsx`: Layout de página protegida
- `layout.tsx`: Default layout con footer

```typescript
import App from "@/app/page/layout"; // Auto-generated
```

### API Generation

**API routes y endpoints:**
- CRUD for posts and children
- Auth endpoints (login, sign out, get user)
- Public endpoint `/api` para interacción general

### Modales de Manejo

| Modale | Componente | Propósito |
|---------|-----------|-----------|
| Add Child | `AddChildForm` | Crea nueva child |
| Link Parent | `LinkParentForm` | Link a parent |
| Create Post | `CreatePostModal` | Escribe un post |

---

## Características Principales

1. ✅ Frontend estático (React Native/Next.js 16)
2. ✅ Auto-generated TypeScript types y modelos
3. ✅ Base de datos simulada (PostgreSQL + Supabase)
4. ✅ Auth system completo con roles
5. ✅ CRUD para posts, children, usuarios
6. ✅ Modales en tiempo real
7. ✅ Diseño limpio y moderno (Next.js 16 features)

---

## Build & Running

### Prerequisites
- Node.js v20+
- npm/yarn
- PostgreSQL / Supabase

### Development

```bash
npm run dev          # Local development server
# Configura Supabase aquí si es necesario

# Run database migrations
npm run db:push         # Push a new migration
npm run db:pull         # Pull from Supabase
```

### Production Build

```bash
npm run build
npm start               # Start production-ready app
```

---

## Estandards de Código

- ✅ Single Page Application (SPA) with routing
- ✅ Auto-generated TypeScript types
- ✅ Consistent naming conventions
- ✅ Clear separation of concerns
- ✅ Type-safe data models
- ✅ Modern React 19+ features

