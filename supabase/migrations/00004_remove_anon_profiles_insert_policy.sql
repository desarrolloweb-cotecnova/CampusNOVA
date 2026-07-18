-- Eliminar la política anon demasiado permisiva; con verificación de email desactivada
-- el usuario obtiene sesión inmediata y la política authenticated es suficiente
DROP POLICY IF EXISTS "Allow self registration insert" ON profiles;