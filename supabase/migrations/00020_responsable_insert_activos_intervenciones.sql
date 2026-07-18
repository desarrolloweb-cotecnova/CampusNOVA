
-- Permite a responsables insertar activos en sus espacios asignados
CREATE POLICY "Responsable insert activos assigned spaces"
  ON activos_fijos FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'infraestructura'::user_role, 'responsable'::user_role])
    AND (
      espacio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM asignaciones_espacios
        WHERE asignaciones_espacios.responsable_id = auth.uid()
          AND asignaciones_espacios.espacio_id = activos_fijos.espacio_id
          AND asignaciones_espacios.activo = true
      )
      OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'infraestructura'::user_role])
    )
  );

-- Permite a responsables insertar intervenciones en sus espacios asignados
CREATE POLICY "Responsable insert intervenciones assigned spaces"
  ON intervenciones FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'infraestructura'::user_role, 'responsable'::user_role])
    AND (
      espacio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM asignaciones_espacios
        WHERE asignaciones_espacios.responsable_id = auth.uid()
          AND asignaciones_espacios.espacio_id = intervenciones.espacio_id
          AND asignaciones_espacios.activo = true
      )
      OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'infraestructura'::user_role])
    )
  );
