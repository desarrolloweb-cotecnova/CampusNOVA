-- ============================================================
-- CampusNOVA — Migrar responsables temporales -> cuentas reales (Opción A)
-- Objetivo: mover las 237 asignaciones de los placeholders a las cuentas reales
-- (creadas cuando cada responsable inicia sesión con Google), SIN perder nada.
--
-- FLUJO (ejecuta cada PASO por separado en el SQL Editor):
--   PASO 1  Ver qué espacios tiene cada placeholder (para identificar a la persona).
--   PASO 2  Ver las cuentas reales que ya iniciaron sesión con Google.
--   PASO 3  Rellenar el emparejamiento y reasignar (se puede correr por lotes).
--   PASO 4  Verificar.
--   PASO 5  (Cuando termines todos) borrar los placeholders ya migrados.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- PASO 1 — Placeholders y sus espacios asignados
-- (te dice quién es cada "responsable-pendiente-N" por los espacios que tiene)
-- ─────────────────────────────────────────────────────────────
SELECT p.email AS placeholder, count(*) AS num_espacios,
       string_agg(e.codigo || ' — ' || e.nombre, '  |  ' ORDER BY e.codigo) AS espacios
FROM public.profiles p
JOIN public.asignaciones_espacios a ON a.responsable_id = p.id
JOIN public.espacios_fisicos e ON e.id = a.espacio_id
WHERE p.email LIKE 'responsable-pendiente-%'
GROUP BY p.email
ORDER BY p.email;


-- ─────────────────────────────────────────────────────────────
-- PASO 2 — Cuentas reales que ya entraron con Google
-- (aquí encuentras el correo real de cada responsable ya registrado)
-- ─────────────────────────────────────────────────────────────
SELECT id, email, nombre, role, activo, created_at
FROM public.profiles
WHERE email NOT LIKE 'responsable-pendiente-%'
ORDER BY created_at DESC;


-- ─────────────────────────────────────────────────────────────
-- PASO 3 — Reasignar (rellena el emparejamiento y ejecuta)
-- Añade una línea por cada responsable YA migrado:
--   ('correo-placeholder', 'correo-real@cotecnova.edu.co')
-- Puedes hacerlo por lotes (los que hayan entrado). Es re-ejecutable.
-- ─────────────────────────────────────────────────────────────
WITH mapping (placeholder_email, real_email) AS (
  VALUES
    ('responsable-pendiente-1@cotecnova.edu.co', 'CORREO_REAL_1@cotecnova.edu.co')
    -- ,('responsable-pendiente-2@cotecnova.edu.co', 'CORREO_REAL_2@cotecnova.edu.co')
    -- ,('responsable-pendiente-3@cotecnova.edu.co', 'CORREO_REAL_3@cotecnova.edu.co')
),
resolved AS (
  SELECT ph.id AS old_id, rp.id AS new_id
  FROM mapping m
  JOIN public.profiles ph ON lower(ph.email) = lower(m.placeholder_email)
  JOIN public.profiles rp ON lower(rp.email) = lower(m.real_email)
)
UPDATE public.asignaciones_espacios a
SET responsable_id = r.new_id
FROM resolved r
WHERE a.responsable_id = r.old_id
  -- evita chocar con la restricción UNIQUE(espacio_id, responsable_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.asignaciones_espacios a2
    WHERE a2.espacio_id = a.espacio_id AND a2.responsable_id = r.new_id
  );


-- ─────────────────────────────────────────────────────────────
-- PASO 4 — Verificar (cuántas asignaciones quedan aún en placeholders)
-- ─────────────────────────────────────────────────────────────
SELECT count(*) AS asignaciones_aun_en_placeholders
FROM public.asignaciones_espacios a
JOIN public.profiles p ON p.id = a.responsable_id
WHERE p.email LIKE 'responsable-pendiente-%';


-- ─────────────────────────────────────────────────────────────
-- PASO 5 — Limpieza SEGURA: borra solo los placeholders que YA no tienen
-- asignaciones (es decir, los que ya migraste). Puedes correrlo cuando quieras;
-- respeta a los que todavía no has migrado.
-- (Borra el usuario auth; en cascada borra su perfil.)
-- ─────────────────────────────────────────────────────────────
-- DELETE FROM auth.users u
-- WHERE u.email LIKE 'responsable-pendiente-%@cotecnova.edu.co'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.asignaciones_espacios a WHERE a.responsable_id = u.id
--   );
