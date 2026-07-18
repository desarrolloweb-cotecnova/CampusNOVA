-- 1. Limpiar todos los datos
DELETE FROM activos_fijos;
DELETE FROM intervenciones;
DELETE FROM reservas_alquileres;
DELETE FROM novedades_incidentes;
DELETE FROM espacios_fisicos;

-- 2. Agregar columnas largo_m y ancho_m
ALTER TABLE espacios_fisicos ADD COLUMN largo_m numeric(8,2) DEFAULT NULL;
ALTER TABLE espacios_fisicos ADD COLUMN ancho_m numeric(8,2) DEFAULT NULL;

-- 3. Cambiar instalaciones de text a boolean
ALTER TABLE espacios_fisicos
  ALTER COLUMN instalaciones_electricas DROP DEFAULT,
  ALTER COLUMN instalaciones_hidraulicas DROP DEFAULT,
  ALTER COLUMN instalaciones_sanitarias DROP DEFAULT;

ALTER TABLE espacios_fisicos
  ALTER COLUMN instalaciones_electricas TYPE boolean USING false,
  ALTER COLUMN instalaciones_hidraulicas TYPE boolean USING false,
  ALTER COLUMN instalaciones_sanitarias TYPE boolean USING false;

ALTER TABLE espacios_fisicos
  ALTER COLUMN instalaciones_electricas SET DEFAULT false,
  ALTER COLUMN instalaciones_hidraulicas SET DEFAULT false,
  ALTER COLUMN instalaciones_sanitarias SET DEFAULT false;

-- 4. Renombrar equipamiento_disponible -> descripcion_espacio
ALTER TABLE espacios_fisicos RENAME COLUMN equipamiento_disponible TO descripcion_espacio;