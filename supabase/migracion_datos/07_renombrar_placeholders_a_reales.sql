-- ============================================================
-- CampusNOVA — Renombrar responsables temporales a cuentas reales
-- (para que, al iniciar sesión con Google, se enlacen automáticamente y
--  hereden sus espacios ya asignados — sin remapear nada).
--
-- CÓMO FUNCIONA:
--   Cada placeholder ya tiene sus asignaciones de espacios apuntando a su id.
--   Aquí le cambiamos el correo/nombre por los REALES y marcamos el correo como
--   confirmado. Cuando la persona entra por primera vez con Google usando ese
--   mismo correo, Supabase enlaza la identidad de Google a esta cuenta (mismo id)
--   y hereda todos sus espacios.
--
-- ⚠️ REQUISITOS / ADVERTENCIAS:
--   1. La persona NO debe haber iniciado sesión con Google todavía (si ya existe
--      una cuenta con ese correo real, habría conflicto de correo duplicado).
--   2. PRUEBA PRIMERO CON UNA sola persona: renómbrala, pídele que entre con
--      Google + 2FA y confirma que ve sus espacios. Si funciona, haz el resto.
--   3. Requiere que el correo real sea de Google Workspace @cotecnova.edu.co.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PASO ÚNICO — Rellena el mapeo (placeholder, correo real, nombre real) y ejecuta.
-- Descomenta/añade una línea por cada responsable que quieras migrar.
-- (Guíate por EMPAREJAMIENTO_RESPONSABLES.csv)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  m record;
  uid uuid;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      -- (placeholder_email,                              correo_real,                       nombre_real)
      ('responsable-pendiente-1@cotecnova.edu.co',  'CORREO_REAL@cotecnova.edu.co',  'Heynar Ramirez Becerra')
      -- ,('responsable-pendiente-2@cotecnova.edu.co', 'correo2@cotecnova.edu.co',      'Adel Guerrero Quintero')
      -- ,('responsable-pendiente-7@cotecnova.edu.co', 'correo7@cotecnova.edu.co',      'Consejo Directivo')
    ) AS t(placeholder_email, real_email, real_name)
  LOOP
    SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(m.placeholder_email);
    IF uid IS NULL THEN
      RAISE NOTICE 'Placeholder no encontrado (¿ya migrado?): %', m.placeholder_email;
      CONTINUE;
    END IF;

    -- Evitar chocar si ya existe una cuenta real con ese correo
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(m.real_email) AND id <> uid) THEN
      RAISE NOTICE 'Ya existe una cuenta con el correo real % — omitido (revisar manualmente)', m.real_email;
      CONTINUE;
    END IF;

    UPDATE auth.users
      SET email = m.real_email,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = uid;

    UPDATE public.profiles
      SET email = m.real_email,
          nombre = m.real_name,
          role = 'responsable',
          activo = true
      WHERE id = uid;

    RAISE NOTICE 'Migrado: % -> % (%)', m.placeholder_email, m.real_email, m.real_name;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- VERIFICAR — cómo quedaron los perfiles migrados
-- ─────────────────────────────────────────────────────────────
SELECT email, nombre, role, activo
FROM public.profiles
WHERE email NOT LIKE 'responsable-pendiente-%'
ORDER BY nombre;

-- Placeholders que aún faltan por migrar:
SELECT email, nombre
FROM public.profiles
WHERE email LIKE 'responsable-pendiente-%'
ORDER BY email;
