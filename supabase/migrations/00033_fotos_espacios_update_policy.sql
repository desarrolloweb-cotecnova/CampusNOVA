-- ============================================================
-- CampusNOVA — Política de UPDATE faltante en fotos_espacios
--
-- La migración 00024 creó fotos_espacios con políticas de SELECT, INSERT y
-- DELETE, pero NINGUNA de UPDATE. Con RLS habilitado eso significa que ningún
-- rol (ni admin ni rector) puede actualizar filas de esa tabla: cualquier
-- UPDATE se bloquea en silencio (0 filas afectadas, sin error).
--
-- Hoy no se manifiesta porque la aplicación solo inserta y borra fotos, pero
-- es una brecha latente: en cuanto se edite el orden o la descripción de una
-- foto, fallaría sin explicación. Se cierra con el mismo patrón de roles de
-- la migración 00032.
--
-- Idempotente: re-ejecutable sin efectos secundarios.
-- ============================================================

DROP POLICY IF EXISTS "fotos_espacios_update" ON public.fotos_espacios;
CREATE POLICY "fotos_espacios_update" ON public.fotos_espacios
  FOR UPDATE TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ============================================================
-- VERIFICAR — fotos_espacios debe listar ahora las 4 operaciones
-- ============================================================
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'fotos_espacios'
ORDER BY cmd;
