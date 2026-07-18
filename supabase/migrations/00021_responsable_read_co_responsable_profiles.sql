
-- Permite a un responsable ver los perfiles de otros responsables
-- asignados a los mismos espacios físicos
CREATE POLICY "Responsable read co-responsable profiles"
  ON profiles FOR SELECT TO public
  USING (
    (get_user_role(auth.uid()))::text = 'responsable'
    AND EXISTS (
      SELECT 1
      FROM asignaciones_espacios a1
      JOIN asignaciones_espacios a2 ON a1.espacio_id = a2.espacio_id
      WHERE a1.responsable_id = auth.uid()
        AND a2.responsable_id = profiles.id
        AND a1.activo = true
        AND a2.activo = true
    )
  );
