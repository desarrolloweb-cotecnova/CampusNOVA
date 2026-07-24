-- ============================================================
-- CampusNOVA — Eliminar usuarios temporales "responsable-pendiente-…"
--
-- Ejecuta este archivo en  Supabase → SQL Editor.
-- La migración a los responsables reales ya se realizó: las asignaciones
-- ACTIVAS de cada espacio ya pertenecen a los usuarios reales. Los placeholders
-- solo conservan asignaciones INACTIVAS (históricas, activo = false), que pueden
-- eliminarse sin afectar nada.
--
-- ⚠️ CASCADA:
--   asignaciones_espacios.responsable_id → profiles(id)  es  ON DELETE CASCADE
--   profiles.id → auth.users(id)                          es  ON DELETE CASCADE
--   Por eso el borrado se hace guardando contra asignaciones ACTIVAS: si un
--   placeholder tuviera alguna asignación activa (no es el caso), se omite.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- PASO 0 (revisión) — Placeholders con sus asignaciones totales y ACTIVAS.
-- Lo esperado: muchas filas con "asignaciones_activas = 0" (seguras de borrar).
-- ─────────────────────────────────────────────────────────────
SELECT p.email,
       p.nombre,
       count(a.id)                          AS asignaciones,
       count(a.id) FILTER (WHERE a.activo)  AS asignaciones_activas
FROM public.profiles p
LEFT JOIN public.asignaciones_espacios a ON a.responsable_id = p.id
WHERE p.email LIKE 'responsable-pendiente-%@cotecnova.edu.co'
GROUP BY p.email, p.nombre
ORDER BY p.email;


-- ─────────────────────────────────────────────────────────────
-- OPCIÓN A (RECOMENDADA) — Borrar los placeholders SIN asignaciones ACTIVAS.
-- Las asignaciones inactivas/históricas que apunten a ellos se eliminan en
-- cascada (no afectan a los usuarios reales, cuyas asignaciones activas son
-- filas distintas). Es seguro y re-ejecutable.
-- (Borra el usuario de auth; en cascada elimina su perfil y sus filas inactivas.)
--
-- Nota: si el borrado fallara por una llave foránea NO ACTION (algún registro
-- que apunte a un placeholder vía created_by/registrado_por/…), el error indica
-- la tabla; avísame y lo resolvemos. Es atómico: no borra a medias.
-- ─────────────────────────────────────────────────────────────
DELETE FROM auth.users u
WHERE u.email LIKE 'responsable-pendiente-%@cotecnova.edu.co'
  AND NOT EXISTS (
    SELECT 1 FROM public.asignaciones_espacios a
    WHERE a.responsable_id = u.id AND a.activo = true
  );


-- ─────────────────────────────────────────────────────────────
-- OPCIÓN B — Borrar TODOS los placeholders, incluso con asignaciones ACTIVAS.
-- ⚠️ Las asignaciones ACTIVAS que aún apunten a un placeholder se ELIMINAN en
-- cascada. Úsalo solo si el PASO 0 muestra "asignaciones_activas = 0" en todos.
-- ─────────────────────────────────────────────────────────────
-- DELETE FROM auth.users u
-- WHERE u.email LIKE 'responsable-pendiente-%@cotecnova.edu.co';


-- ─────────────────────────────────────────────────────────────
-- VERIFICAR — no deben quedar placeholders (debe devolver 0)
-- ─────────────────────────────────────────────────────────────
SELECT count(*) AS placeholders_restantes
FROM public.profiles
WHERE email LIKE 'responsable-pendiente-%@cotecnova.edu.co';
