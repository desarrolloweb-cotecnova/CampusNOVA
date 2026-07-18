
-- Convertir tipo de espacios_fisicos de ENUM a TEXT para soportar tipos dinámicos del catálogo
ALTER TABLE espacios_fisicos
  ALTER COLUMN tipo TYPE TEXT USING tipo::TEXT;
