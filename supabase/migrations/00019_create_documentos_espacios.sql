
CREATE TABLE IF NOT EXISTS documentos_espacios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id  uuid NOT NULL REFERENCES espacios_fisicos(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  descripcion text,
  tipo        text NOT NULL DEFAULT 'Otro',
  categoria   text NOT NULL DEFAULT 'General',
  url         text NOT NULL,
  creado_por  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_espacio ON documentos_espacios(espacio_id);

ALTER TABLE documentos_espacios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs_select" ON documentos_espacios FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_insert" ON documentos_espacios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "docs_update" ON documentos_espacios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "docs_delete" ON documentos_espacios FOR DELETE TO authenticated USING (true);
