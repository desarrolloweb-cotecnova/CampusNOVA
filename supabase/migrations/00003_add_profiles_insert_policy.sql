-- Permitir que un usuario recién registrado inserte su propio perfil
CREATE POLICY "Users insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- También permitir inserción durante el proceso de signup (antes de que la sesión esté activa)
-- usando service_role o anon para el trigger de registro
CREATE POLICY "Allow self registration insert"
  ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);