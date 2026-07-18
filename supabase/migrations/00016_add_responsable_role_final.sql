
-- 1. Agregar valor 'responsable' al ENUM
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE 'responsable';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Infraestructura puede leer todos los perfiles
DROP POLICY IF EXISTS "Infraestructura read profiles" ON public.profiles;
CREATE POLICY "Infraestructura read profiles" ON public.profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid())::text = 'infraestructura');

-- 3. Responsable: solo lee su propio perfil
DROP POLICY IF EXISTS "Responsable read profiles" ON public.profiles;
CREATE POLICY "Responsable read profiles" ON public.profiles
  FOR SELECT
  USING (
    public.get_user_role(auth.uid())::text = 'responsable'
    AND id = auth.uid()
  );

-- 4. Responsable: acceso solo a espacios donde es responsable
DROP POLICY IF EXISTS "Responsable read assigned espacios" ON public.espacios_fisicos;
CREATE POLICY "Responsable read assigned espacios" ON public.espacios_fisicos
  FOR SELECT
  USING (
    public.get_user_role(auth.uid())::text = 'responsable'
    AND EXISTS (
      SELECT 1 FROM public.asignaciones_espacios
      WHERE responsable_id = auth.uid()
        AND espacio_id = espacios_fisicos.id
        AND activo = true
    )
  );

-- 5. Responsable: leer activos en sus espacios asignados
DROP POLICY IF EXISTS "Responsable read assigned activos" ON public.activos_fijos;
CREATE POLICY "Responsable read assigned activos" ON public.activos_fijos
  FOR SELECT
  USING (
    public.get_user_role(auth.uid())::text = 'responsable'
    AND (
      espacio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.asignaciones_espacios
        WHERE responsable_id = auth.uid()
          AND espacio_id = activos_fijos.espacio_id
          AND activo = true
      )
    )
  );

-- 6. Responsable: leer novedades de sus espacios (sin registrado_por en esta tabla)
DROP POLICY IF EXISTS "Responsable read own novedades" ON public.novedades_incidentes;
CREATE POLICY "Responsable read own novedades" ON public.novedades_incidentes
  FOR SELECT
  USING (
    public.get_user_role(auth.uid())::text = 'responsable'
    AND EXISTS (
      SELECT 1 FROM public.asignaciones_espacios
      WHERE responsable_id = auth.uid()
        AND espacio_id = novedades_incidentes.espacio_id
        AND activo = true
    )
  );

-- 7. Responsable: leer reservas de sus espacios
DROP POLICY IF EXISTS "Responsable read own reservas" ON public.reservas_alquileres;
CREATE POLICY "Responsable read own reservas" ON public.reservas_alquileres
  FOR SELECT
  USING (
    public.get_user_role(auth.uid())::text = 'responsable'
    AND EXISTS (
      SELECT 1 FROM public.asignaciones_espacios
      WHERE responsable_id = auth.uid()
        AND espacio_id = reservas_alquileres.espacio_id
        AND activo = true
    )
  );

-- 8. Admin/rectoria pueden actualizar perfiles de otros
DROP POLICY IF EXISTS "Admins update others profiles" ON public.profiles;
CREATE POLICY "Admins update others profiles" ON public.profiles
  FOR UPDATE
  USING (public.get_user_role(auth.uid())::text IN ('admin', 'rectoria'))
  WITH CHECK (public.get_user_role(auth.uid())::text IN ('admin', 'rectoria'));
