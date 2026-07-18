# CampusNOVA

Sistema de gestión de infraestructura, activos, espacios físicos, novedades y
reservas para la **Corporación de Estudios Tecnológicos del Norte del Valle (COTECNOVA)**.

- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Imágenes:** Cloudinary
- **Hosting:** Vercel

## Puesta en marcha (desarrollo local)

```bash
# 1. Instalar dependencias (Node.js >= 20)
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con la URL y anon key de tu proyecto Supabase

# 3. Servidor de desarrollo
pnpm dev

# 4. Compilar para producción
pnpm build
```

## Variables de entorno

Ver `.env.example`. Requeridas:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anon de Supabase |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload preset (unsigned) de Cloudinary |

## Estructura

```
src/
├── components/     # UI, layouts, auth (MFA), comunes
├── contexts/       # AuthContext (sesión, roles, Google)
├── db/             # Cliente Supabase
├── lib/            # utils, cloudinary, mfa, assets, export
├── pages/          # Páginas públicas y del panel
└── routes.tsx      # Configuración de rutas
supabase/
├── migrations/         # Migraciones SQL (estructura)
├── functions/          # Edge Functions (create-user, invite-user, ...)
└── migracion_datos/    # Scripts de importación de datos + reconciliación
docs/
└── MIGRACION.md    # Guía de migración a Supabase propio + Vercel
```

## Migración de backend

Este proyecto se migró desde el backend gestionado por Medo.dev a una cuenta propia
de Supabase. El procedimiento completo (datos, Edge Functions, Google OAuth, 2FA y
despliegue en Vercel) está en **[docs/MIGRACION.md](docs/MIGRACION.md)**.

## Autenticación

- Login con usuario/contraseña y con **Google** (restringido a `@cotecnova.edu.co`).
- **Doble factor (TOTP)** con Google Authenticator: se activa en *Mi Perfil* y se
  verifica en el inicio de sesión.
- Roles: `admin`, `rectoria`, `infraestructura`, `responsable`.
