-- ============================================================
-- Módulo Almacén — creación y edición de bodegas desde el aplicativo
-- ============================================================
-- Hasta ahora las bodegas solo se podían leer; se creaban por SQL. Esta
-- migración permite al administrador y al rector crearlas, renombrarlas,
-- desactivarlas o eliminarlas (solo si no tienen movimientos: la llave
-- foránea de almacen_movimientos lo impide) desde la pestaña Bodegas.
--
-- Incluye también las políticas de la 00042 (acceso del rector a productos y
-- movimientos), para que una sola ejecución deje todo al día aunque la 00042
-- no se hubiera aplicado. Es idempotente (re-ejecutable).
-- Ejecutar en Supabase → SQL Editor.

-- ── Bodegas: lectura y escritura para admin y rector ──────────────────────
DROP POLICY IF EXISTS "Admin lee bodegas" ON public.almacen_bodegas;
DROP POLICY IF EXISTS "Admin gestiona bodegas" ON public.almacen_bodegas;
CREATE POLICY "Admin gestiona bodegas" ON public.almacen_bodegas
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria']));

-- ── Productos y movimientos (mismo contenido que la 00042) ────────────────
DROP POLICY IF EXISTS "Admin gestiona productos" ON public.almacen_productos;
CREATE POLICY "Admin gestiona productos" ON public.almacen_productos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria']));

DROP POLICY IF EXISTS "Admin lee movimientos almacen" ON public.almacen_movimientos;
CREATE POLICY "Admin lee movimientos almacen" ON public.almacen_movimientos
  FOR SELECT TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria']));

DROP POLICY IF EXISTS "Admin registra movimientos almacen" ON public.almacen_movimientos;
CREATE POLICY "Admin registra movimientos almacen" ON public.almacen_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria'])
    AND registrado_por = auth.uid()
  );

-- ── Realtime: la lista de bodegas se refresca sola en otras pestañas ──────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'almacen_bodegas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.almacen_bodegas;
  END IF;
END $$;
