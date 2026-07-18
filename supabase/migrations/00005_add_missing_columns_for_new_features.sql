-- Add columns to movimientos_activos for the new movement registration form
ALTER TABLE movimientos_activos
  ADD COLUMN IF NOT EXISTS aprobado_por text,
  ADD COLUMN IF NOT EXISTS observaciones text;

-- Add evidence image column to novedades_incidentes for closing evidence
ALTER TABLE novedades_incidentes
  ADD COLUMN IF NOT EXISTS foto_evidencia_url text;