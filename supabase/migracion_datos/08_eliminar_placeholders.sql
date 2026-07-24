-- ============================================================
-- CampusNOVA — Eliminar usuarios temporales "responsable-pendiente-…"
--
-- Ejecuta este archivo en  Supabase → SQL Editor.
-- La migración a los responsables reales ya se realizó, por lo que estos
-- perfiles placeholder pueden eliminarse.
--
-- ⚠️ IMPORTANTE — CASCADA:
--   asignaciones_espacios.responsable_id → profiles(id)  es  ON DELETE CASCADE
--   y profiles.id → auth.users(id) también es ON DELETE CASCADE.
--   Por eso borrar un placeholder que TODAVÍA tenga espacios asignados
--   eliminaría también esas asignaciones. Usa el PASO 0 para verificar antes.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- PASO 0 (revisión) — ¿Algún placeholder conserva asignaciones?
-- Si devuelve filas con "asignaciones" > 0, ese placeholder NO se ha migrado:
-- termina su migración (script 05 ó 07) antes de borrarlo, o usa la OPCIÓN A.
-- ─────────────────────────────────────────────────────────────
SELECT p.email, count(a.id) AS asignaciones
FROM public.profiles p
LEFT JOIN public.asignaciones_espacios a ON a.responsable_id = p.id
WHERE p.email LIKE 'responsable-pendiente-%@cotecnova.edu.co'
GROUP BY p.email
ORDER BY p.email;


-- ─────────────────────────────────────────────────────────────
-- OPCIÓN A (RECOMENDADA) — Borrar solo los placeholders YA migrados
-- (los que ya no tienen ninguna asignación). Es seguro y re-ejecutable:
-- respeta a los que todavía tengan espacios apuntando a ellos.
-- (Borra el usuario de auth; en cascada elimina su perfil.)
-- ─────────────────────────────────────────────────────────────
DELETE FROM auth.users u
WHERE u.email LIKE 'responsable-pendiente-%@cotecnova.edu.co'
  AND NOT EXISTS (
    SELECT 1 FROM public.asignaciones_espacios a WHERE a.responsable_id = u.id
  );


-- ─────────────────────────────────────────────────────────────
-- OPCIÓN B — Borrar TODOS los placeholders (aunque tengan asignaciones)
-- ⚠️ Las asignaciones que aún apunten a un placeholder se ELIMINAN en cascada.
-- Descoméntalo SOLO si el PASO 0 no mostró asignaciones pendientes (o si de
-- verdad quieres eliminarlos todos y asumir esa pérdida).
-- ─────────────────────────────────────────────────────────────
-- DELETE FROM auth.users u
-- WHERE u.email LIKE 'responsable-pendiente-%@cotecnova.edu.co';


-- ─────────────────────────────────────────────────────────────
-- VERIFICAR — no deben quedar placeholders (debe devolver 0)
-- ─────────────────────────────────────────────────────────────
SELECT count(*) AS placeholders_restantes
FROM public.profiles
WHERE email LIKE 'responsable-pendiente-%@cotecnova.edu.co';
