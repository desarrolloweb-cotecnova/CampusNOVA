-- Agregar columna avatar_url a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;

-- Bucket para fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  1048576,
  ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif'];

-- RLS: cualquier usuario autenticado puede leer (bucket público)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- RLS: cada usuario solo puede subir/actualizar/eliminar su propia carpeta
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Actualizar RLS de profiles: usuario puede actualizar su propio perfil
CREATE POLICY "profiles_self_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);