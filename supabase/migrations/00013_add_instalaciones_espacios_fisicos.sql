
ALTER TABLE espacios_fisicos
  ADD COLUMN IF NOT EXISTS instalaciones_gas BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalaciones_internet_telefonia BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalaciones_seguridad_control BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalaciones_climatizacion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalaciones_domotica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalaciones_pci BOOLEAN NOT NULL DEFAULT false;
