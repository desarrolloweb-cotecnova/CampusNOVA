-- ============================================================
-- Módulo Almacén — acceso también para el rol 'rector'
-- ============================================================
-- La migración 00041 dejó el almacén solo para 'admin'. El rector necesita el
-- mismo acceso: consultar saldos y kardex, imprimir reportes, administrar el
-- catálogo de productos y registrar entradas y salidas.
--
-- Se recrean las políticas incluyendo 'rector' y también 'rectoria', por si
-- alguna base aún no aplicó el renombrado del rol (igual que en la 00032).
-- Los movimientos siguen siendo inmutables: no se agregan políticas de UPDATE
-- ni DELETE.
-- Ejecutar en Supabase → SQL Editor. Es idempotente (re-ejecutable).

DROP POLICY IF EXISTS "Admin lee bodegas" ON public.almacen_bodegas;
CREATE POLICY "Admin lee bodegas" ON public.almacen_bodegas
  FOR SELECT TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector', 'rectoria']));

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
