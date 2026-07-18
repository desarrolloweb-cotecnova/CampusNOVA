
-- Permite a responsables actualizar activos en sus espacios asignados
CREATE POLICY "Responsable update activos assigned spaces"
  ON activos_fijos FOR UPDATE TO authenticated
  USING (
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
  )
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
