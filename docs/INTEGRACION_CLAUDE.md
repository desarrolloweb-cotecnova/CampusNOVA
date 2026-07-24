# Integración de Claude con Supabase y Vercel (control total)

Esta guía deja a Claude Code (sesiones remotas) con control operativo de
**Supabase** (ejecutar SQL, aplicar migraciones, desplegar Edge Functions, ver
logs) y **Vercel** (verificar/gestionar despliegues), para que no tengas que
copiar SQL al SQL Editor ni revisar despliegues manualmente.

> **Resumen:** creas 2 tokens (una sola vez), los guardas como variables de
> entorno del entorno de Claude, permites 2 dominios en la política de red y
> añades el archivo `.mcp.json` al repositorio. Nada de esto expone secretos en
> el código.

---

## 1. Token de Supabase (una vez)

1. Abre https://supabase.com/dashboard/account/tokens
2. **Generate new token** → nombre: `claude-code` → copia el token
   (empieza por `sbp_…`). No lo pegues en el repositorio ni en `.env`.

Este token da acceso de administración al proyecto vía la Management API
(HTTPS), que es lo que usa el servidor MCP oficial de Supabase.

## 2. Token de Vercel (una vez)

1. Abre https://vercel.com/account/settings/tokens
2. **Create Token** → nombre: `claude-code`, scope: la cuenta/equipo donde vive
   el proyecto CampusNOVA → copia el token.

Con él, Claude puede usar la CLI (`npx vercel`) para listar despliegues, ver
logs, gestionar variables de entorno y forzar redeploys. (El despliegue normal
seguirá siendo automático: Vercel construye cada push/merge desde GitHub.)

## 3. Configurar el entorno de Claude Code (una vez)

En **Claude Code web → Settings → Environments → (tu entorno de CampusNOVA)**:

1. **Environment variables** (como secretos):
   | Variable | Valor |
   |---|---|
   | `SUPABASE_ACCESS_TOKEN` | el token `sbp_…` del paso 1 |
   | `VERCEL_TOKEN` | el token del paso 2 |
2. **Network policy**: permite los dominios
   `api.supabase.com` y `api.vercel.com`
   (o selecciona acceso de red completo si lo prefieres).

Documentación del entorno remoto:
https://code.claude.com/docs/en/claude-code-on-the-web

## 4. Archivo `.mcp.json` (raíz del repositorio)

Este archivo registra el servidor MCP oficial de Supabase para el proyecto.
El token **no** va aquí: se lee de la variable de entorno del paso 3.

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=jxecnqqzmofenisygeph"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

## 5. Sesión nueva y prueba

Las variables de entorno y `.mcp.json` se cargan al **arrancar** la sesión:
inicia una sesión nueva de Claude Code y pide, por ejemplo:

- *"Lista las tablas de la base de datos"* (MCP Supabase → debería responder
  sin pedirte nada).
- *"Verifica el estado del último despliegue de Vercel"* (CLI con
  `VERCEL_TOKEN`).

---

## Qué gana Claude con esto

| Antes | Después |
|---|---|
| Te pasaba SQL para pegar en el SQL Editor | Aplica migraciones directamente (y las deja versionadas en `supabase/migrations/`) |
| Edge Functions se desplegaban a mano con la CLI local | `supabase functions deploy` desde la sesión |
| No podía ver logs/errores de la BD | Consulta logs y advisors de Supabase |
| No podía verificar despliegues | Revisa builds/logs de Vercel y hace redeploy si falla |

Lo único que seguirá necesitándote:
- Acciones exclusivas de dashboard (p. ej. configurar Google OAuth).
- Aprobar cambios sensibles cuando Claude pregunte.
- Fusionar PRs… salvo que le pidas a Claude fusionarlos (ya puede vía GitHub).

## Seguridad

- Los tokens otorgan control amplio: guárdalos **solo** como variables de
  entorno del entorno de Claude. Nunca en el repositorio, `.env`, ni en chats.
- Puedes **revocarlos** en cualquier momento desde los mismos dashboards
  (Supabase → Account → Tokens; Vercel → Settings → Tokens) y la integración
  deja de funcionar al instante.
- Los cambios de base de datos seguirán el flujo actual: migraciones
  versionadas en `supabase/migrations/`, ahora aplicadas por Claude.
