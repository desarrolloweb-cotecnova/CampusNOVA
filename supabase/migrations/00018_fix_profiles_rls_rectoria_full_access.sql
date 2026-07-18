
-- Eliminar política que solo cubre admin
DROP POLICY IF EXISTS "Admins full access profiles" ON profiles;

-- Nueva política: admin Y rectoria tienen acceso total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin rectoria full access profiles"
  ON profiles FOR ALL
  USING (
    (get_user_role(auth.uid()))::text = ANY(ARRAY['admin','rectoria'])
  )
  WITH CHECK (
    (get_user_role(auth.uid()))::text = ANY(ARRAY['admin','rectoria'])
  );

-- Asegurar que rectoria pueda eliminar perfiles (DELETE explícito por seguridad)
DROP POLICY IF EXISTS "Admin rectoria delete profiles" ON profiles;
CREATE POLICY "Admin rectoria delete profiles"
  ON profiles FOR DELETE
  USING (
    (get_user_role(auth.uid()))::text = ANY(ARRAY['admin','rectoria'])
  );
