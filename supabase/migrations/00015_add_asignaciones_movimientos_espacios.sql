
-- 1. Agregar piso_nombre a espacios_fisicos (referencia por nombre)
ALTER TABLE espacios_fisicos ADD COLUMN IF NOT EXISTS piso_nombre text;
UPDATE espacios_fisicos SET piso_nombre = piso WHERE piso IS NOT NULL AND piso_nombre IS NULL;

-- 2. Tabla asignaciones_espacios
CREATE TABLE IF NOT EXISTS asignaciones_espacios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id uuid NOT NULL REFERENCES espacios_fisicos(id) ON DELETE CASCADE,
  responsable_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  fecha_asignacion date NOT NULL DEFAULT CURRENT_DATE,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(espacio_id, responsable_id)
);
ALTER TABLE asignaciones_espacios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lectura publica asignaciones" ON asignaciones_espacios;
DROP POLICY IF EXISTS "escritura autenticada asignaciones" ON asignaciones_espacios;
CREATE POLICY "lectura publica asignaciones" ON asignaciones_espacios FOR SELECT USING (true);
CREATE POLICY "escritura autenticada asignaciones" ON asignaciones_espacios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Tabla movimientos_espacios
CREATE TABLE IF NOT EXISTS movimientos_espacios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id uuid NOT NULL REFERENCES espacios_fisicos(id) ON DELETE CASCADE,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento IN ('recibo', 'entrega')),
  persona_recibe_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  persona_recibe_nombre text,
  persona_entrega_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  persona_entrega_nombre text NOT NULL DEFAULT 'COTECNOVA',
  fecha_movimiento date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_acordada date,
  motivo_codigo text NOT NULL,
  motivo_descripcion text,
  observaciones text,
  registrado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE movimientos_espacios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lectura publica movimientos_esp" ON movimientos_espacios;
DROP POLICY IF EXISTS "escritura autenticada movimientos_esp" ON movimientos_espacios;
CREATE POLICY "lectura publica movimientos_esp" ON movimientos_espacios FOR SELECT USING (true);
CREATE POLICY "escritura autenticada movimientos_esp" ON movimientos_espacios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tabla catálogo motivos
CREATE TABLE IF NOT EXISTS motivos_movimiento_espacio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('recibo', 'entrega')),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE motivos_movimiento_espacio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lectura publica motivos_mov" ON motivos_movimiento_espacio;
DROP POLICY IF EXISTS "escritura autenticada motivos_mov" ON motivos_movimiento_espacio;
CREATE POLICY "lectura publica motivos_mov" ON motivos_movimiento_espacio FOR SELECT USING (true);
CREATE POLICY "escritura autenticada motivos_mov" ON motivos_movimiento_espacio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed motivos de RECIBO
INSERT INTO motivos_movimiento_espacio (tipo, codigo, nombre) VALUES
  ('recibo', 'REC-001', 'Aceptación del cargo o funciones'),
  ('recibo', 'REC-002', 'Cambio de puesto de trabajo'),
  ('recibo', 'REC-003', 'Reemplazo del cargo o funciones'),
  ('recibo', 'REC-004', 'Retorno de vacaciones'),
  ('recibo', 'REC-005', 'Retorno de licencia o incapacidad'),
  ('recibo', 'REC-006', 'Traslado interno')
ON CONFLICT (codigo) DO NOTHING;

-- Seed motivos de ENTREGA
INSERT INTO motivos_movimiento_espacio (tipo, codigo, nombre) VALUES
  ('entrega', 'ENT-001', 'Terminación del contrato'),
  ('entrega', 'ENT-002', 'Salida a vacaciones'),
  ('entrega', 'ENT-003', 'Salida por permiso temporal'),
  ('entrega', 'ENT-004', 'Salida por licencia o incapacidad'),
  ('entrega', 'ENT-005', 'Cambio de cargo o funciones'),
  ('entrega', 'ENT-006', 'Traslado a otra sede')
ON CONFLICT (codigo) DO NOTHING;
