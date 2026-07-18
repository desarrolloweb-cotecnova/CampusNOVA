# Guía de migración CampusNOVA → Supabase propio + Vercel

Esta guía documenta la migración del backend de **Medo.dev** a tu propia cuenta de
**Supabase** (proyecto `jxecnqqzmofenisygeph`) y la publicación en **Vercel**.

Proyecto Supabase nuevo:
- URL: `https://jxecnqqzmofenisygeph.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/jxecnqqzmofenisygeph

> ⚠️ Los pasos de Supabase y Vercel **debes ejecutarlos tú** desde tu navegador:
> el entorno donde se preparó este código no tiene permiso de red hacia Supabase
> ni Vercel. Todo está listo para copiar/pegar y hacer clic.

---

## 0. Resumen de lo que ya se hizo en el código

- ✅ El cliente Supabase apunta a variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- ✅ Se eliminó el acoplamiento de build a Medo.dev (`vite.config.dev.ts`, `miaodaDevPlugin`).
  `vite.config.ts` es ahora una configuración estándar de Vite para Vercel.
- ✅ Bug corregido: el alta de usuarios por Google escribía columnas inexistentes
  en `profiles` (ahora usa `email`, `nombre`, `avatar_url`).
- ✅ Login con Google (restringido a `@cotecnova.edu.co`) + **doble factor TOTP**
  (Google Authenticator): activación en *Mi Perfil* y verificación en el login.
- ✅ URLs de logos/fondos de Medo centralizadas en `src/lib/assets.ts` (fáciles de reemplazar).
- ✅ Edge Functions sin referencias fijas a Medo (usan secrets `SITE_URL`, `LOGO_URL`, `FROM_EMAIL`).
- ✅ `.env` fuera del repositorio; se añadió `.env.example` y `vercel.json`.

---

## 1. Base de datos: estructura

Medo ya migró la **estructura** (tablas, RLS, funciones, triggers, buckets) a tu
proyecto. Si necesitas recrearla en otro proyecto desde cero, ejecuta en orden los
archivos de `supabase/migrations/` (`00001` → `00029`) en el **SQL Editor**.

---

## 2. Base de datos: importar los datos

El export de Medo (`supabase/migracion_datos/00_export_original_medo.sql`) **no incluyó
los usuarios/perfiles**, y la tabla `asignaciones_espacios` depende de ellos por llave
foránea. Por eso se separó en dos partes.

### Paso 2.1 — Tablas base (obligatorio)
En **Supabase → SQL Editor**, pega y ejecuta:
```
supabase/migracion_datos/01_datos_core.sql
```
Importa 83 espacios, 182 fotos, 6 reservas y catálogos. No depende de usuarios.

### Paso 2.2 — Responsables + asignaciones (opcional pero recomendado)
El export tenía **237 asignaciones** de **30 responsables** cuyos usuarios no se
exportaron. Este script crea 30 perfiles **temporales** (inactivos) con los UUID
originales para **no perder las asignaciones**, y luego las importa:
```
supabase/migracion_datos/02_responsables_y_asignaciones.sql
```
Después, en **Panel → Usuarios**, edita cada "Responsable pendiente N" con su nombre y
correo real. Para saber quién es cada uno, usa:
```
supabase/migracion_datos/RECONCILIACION_RESPONSABLES.md
```
(mapea cada responsable con los espacios que tiene asignados).

> Si prefieres empezar limpio, **omite el paso 2.2**, crea los responsables reales en
> *Panel → Usuarios* y reasigna los espacios manualmente.

---

## 3. Storage (buckets de imágenes)

El esquema ya crea los buckets `avatars` y demás. Verifica en **Storage** que existan.
Si falta `avatars`, ejecuta el bloque de `supabase/migrations/00008_add_avatar_url_to_profiles_and_bucket.sql`.
Las fotos de espacios se guardan en **Cloudinary** (`drqfuh66o`), no en Supabase.

---

## 4. Edge Functions

Hay 4 funciones en `supabase/functions/`: `create-user`, `invite-user`,
`send-notification`, `supabase-monitor`.

### Desplegar (requiere Supabase CLI en tu equipo)
```bash
# 1. Instala la CLI y autentícate
npm i -g supabase
supabase login

# 2. Enlaza el proyecto (te pedirá la Database Password)
supabase link --project-ref jxecnqqzmofenisygeph

# 3. Despliega las funciones
supabase functions deploy create-user
supabase functions deploy invite-user
supabase functions deploy send-notification
supabase functions deploy supabase-monitor
```

### Secrets de las funciones
En **Supabase → Project Settings → Edge Functions → Secrets** (o por CLI):
```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set SITE_URL=https://TU-DOMINIO.vercel.app
supabase secrets set FROM_EMAIL="CampusNOVA COTECNOVA <notificaciones@cotecnova.edu.co>"
# Opcional: LOGO_URL de tu Cloudinary
```
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.

---

## 5. Autenticación

### 5.1 Confirmaciones de correo
En **Authentication → Providers → Email**, desactiva "Confirm email"
(coincide con `supabase/config.toml`, `enable_confirmations = false`).

### 5.2 Login con Google (restringido a @cotecnova.edu.co)
1. En **Google Cloud Console** (https://console.cloud.google.com):
   - Crea/usa un proyecto → **APIs y servicios → Pantalla de consentimiento OAuth**
     (tipo *Interno* si usas Google Workspace de COTECNOVA).
   - **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**.
   - **Orígenes autorizados de JavaScript**: `https://TU-DOMINIO.vercel.app`
   - **URI de redireccionamiento autorizados**:
     `https://jxecnqqzmofenisygeph.supabase.co/auth/v1/callback`
   - Copia el **Client ID** y **Client Secret**.
2. En **Supabase → Authentication → Providers → Google**: pégalos y activa.
3. En **Authentication → URL Configuration**:
   - **Site URL**: `https://TU-DOMINIO.vercel.app`
   - **Redirect URLs**: añade `https://TU-DOMINIO.vercel.app/panel` y
     `https://TU-DOMINIO.vercel.app/**`

> El código ya envía `hd=cotecnova.edu.co` y rechaza correos fuera de ese dominio.

### 5.3 Doble factor (Google Authenticator / TOTP)
Supabase trae MFA-TOTP habilitado. La app ya incluye:
- **Activación**: *Panel → Mi Perfil → Doble factor de autenticación* (muestra QR).
- **Verificación en login**: si el usuario tiene 2FA, se le pide el código de 6 dígitos.

Recomendado: en **Authentication → Policies/MFA**, revisa que TOTP esté habilitado.
Si quieres **forzar** 2FA a todos, puedes endurecer las políticas RLS con
`auth.jwt()->>'aal' = 'aal2'` (opcional, avanzado).

---

## 6. Recomendación de seguridad (importante)

El trigger `handle_new_user` crea cada usuario nuevo con rol **`infraestructura`**
(acceso amplio) y `activo = true`. Esto significa que **cualquier** cuenta
`@cotecnova.edu.co` que entre por Google obtiene acceso automáticamente.

Recomendado: que los usuarios nuevos entren **inactivos** y con rol mínimo hasta que
un administrador los apruebe. Ejecuta en el SQL Editor:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, activo)
  VALUES (NEW.id, NEW.email, 'responsable'::public.user_role, false);
  RETURN NEW;
END;
$$;
```
Así, un admin/rectoría debe activar (`activo = true`) y ajustar el rol en *Panel → Usuarios*.

---

## 7. Publicar en Vercel

1. Crea cuenta en https://vercel.com con tu **GitHub** (COTECNOVA).
2. **Add New → Project → Import** el repo `desarrolloweb-cotecnova/CampusNOVA`.
3. Framework: **Vite** (se detecta solo). Build: `vite build`. Output: `dist`
   (ya definido en `vercel.json`).
4. **Environment Variables** (Production y Preview):
   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://jxecnqqzmofenisygeph.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | *(anon key del proyecto)* |
   | `VITE_CLOUDINARY_CLOUD_NAME` | `drqfuh66o` |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | `campusnova` |
5. **Deploy**. Cuando tengas el dominio (`https://xxxx.vercel.app`):
   - Actualiza **Supabase → Auth → URL Configuration** (Site URL + Redirect URLs).
   - Actualiza **Google OAuth** (orígenes y redirect).
   - Actualiza el secret `SITE_URL` de las Edge Functions.

---

## 8. Checklist final

- [ ] `01_datos_core.sql` ejecutado (espacios, fotos, reservas, catálogos).
- [ ] `02_responsables_y_asignaciones.sql` ejecutado (o responsables recreados a mano).
- [ ] 4 Edge Functions desplegadas + secrets configurados.
- [ ] Google OAuth configurado (Google Cloud + Supabase).
- [ ] Site URL y Redirect URLs con el dominio de Vercel.
- [ ] Variables de entorno en Vercel.
- [ ] Primer login OK (crea al menos un usuario `admin`/`rectoria`).
- [ ] 2FA probado (activar en Mi Perfil y reingresar).
- [ ] (Recomendado) Trigger `handle_new_user` endurecido.
- [ ] (Recomendado) Reemplazar logos de Medo por archivos propios (`src/lib/assets.ts`).

### Crear tu primer usuario administrador
En **Authentication → Users → Add user** crea tu usuario con `rector@cotecnova.edu.co`,
luego en el SQL Editor:
```sql
UPDATE public.profiles SET role = 'rectoria', activo = true
WHERE email = 'rector@cotecnova.edu.co';
```
