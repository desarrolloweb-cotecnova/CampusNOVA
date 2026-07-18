
-- 1. Add codigo to sedes_espacios
ALTER TABLE sedes_espacios ADD COLUMN IF NOT EXISTS codigo TEXT;
UPDATE sedes_espacios SET codigo = 'SP' WHERE nombre = 'Sede Principal';
UPDATE sedes_espacios SET codigo = 'SS' WHERE nombre = 'Sede Secundaria';
UPDATE sedes_espacios SET codigo = 'SR' WHERE nombre = 'Sede Rural';
INSERT INTO sedes_espacios (nombre, codigo, activo) VALUES ('Parqueadero', 'PA', true)
  ON CONFLICT (nombre) DO NOTHING;
ALTER TABLE sedes_espacios ADD CONSTRAINT sedes_codigo_unique UNIQUE (codigo);

-- 2. Add codigo to bloques_espacios
ALTER TABLE bloques_espacios ADD COLUMN IF NOT EXISTS codigo TEXT;
UPDATE bloques_espacios SET codigo = 'BA' WHERE nombre = 'Bloque A';
UPDATE bloques_espacios SET codigo = 'BB' WHERE nombre = 'Bloque B';
UPDATE bloques_espacios SET codigo = 'BC' WHERE nombre = 'Bloque C';
UPDATE bloques_espacios SET codigo = 'BD' WHERE nombre = 'Bloque D';
UPDATE bloques_espacios SET codigo = 'NA' WHERE nombre = 'N/A';
ALTER TABLE bloques_espacios ADD CONSTRAINT bloques_codigo_unique UNIQUE (codigo);

-- 3. Create pisos_espacios
CREATE TABLE IF NOT EXISTS pisos_espacios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO pisos_espacios (codigo, nombre) VALUES ('P1', 'Piso 1'), ('P2', 'Piso 2')
  ON CONFLICT (codigo) DO NOTHING;
ALTER TABLE pisos_espacios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública pisos" ON pisos_espacios FOR SELECT USING (true);
CREATE POLICY "Escritura autenticados pisos" ON pisos_espacios FOR ALL USING (auth.role() = 'authenticated');

-- 4. Create responsables_activos
CREATE TABLE IF NOT EXISTS responsables_activos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE responsables_activos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública responsables" ON responsables_activos FOR SELECT USING (true);
CREATE POLICY "Escritura autenticados responsables" ON responsables_activos FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create proveedores_activos
CREATE TABLE IF NOT EXISTS proveedores_activos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE proveedores_activos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública proveedores" ON proveedores_activos FOR SELECT USING (true);
CREATE POLICY "Escritura autenticados proveedores" ON proveedores_activos FOR ALL USING (auth.role() = 'authenticated');
