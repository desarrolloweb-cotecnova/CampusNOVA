
CREATE TABLE IF NOT EXISTS fotos_espacios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id  uuid NOT NULL REFERENCES espacios_fisicos(id) ON DELETE CASCADE,
  url         text NOT NULL,
  descripcion text,
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fotos_espacios_espacio_idx ON fotos_espacios(espacio_id);

-- RLS
ALTER TABLE fotos_espacios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fotos_espacios_select" ON fotos_espacios
  FOR SELECT USING (true);

CREATE POLICY "fotos_espacios_insert" ON fotos_espacios
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "fotos_espacios_delete" ON fotos_espacios
  FOR DELETE USING (auth.role() = 'authenticated');
