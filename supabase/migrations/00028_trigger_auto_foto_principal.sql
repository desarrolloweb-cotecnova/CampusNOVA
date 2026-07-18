
-- Trigger function to automatically set foto_principal_url if it's null
CREATE OR REPLACE FUNCTION set_auto_foto_principal()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se inserta una nueva foto
  IF TG_OP = 'INSERT' THEN
    UPDATE espacios_fisicos
    SET foto_principal_url = NEW.url,
        fecha_ultima_actualizacion = NOW()
    WHERE id = NEW.espacio_id
      AND (foto_principal_url IS NULL OR foto_principal_url = '');
  END IF;

  -- Si se elimina una foto y era la foto principal, asignar otra
  IF TG_OP = 'DELETE' THEN
    UPDATE espacios_fisicos ef
    SET foto_principal_url = (
      SELECT url FROM fotos_espacios
      WHERE espacio_id = OLD.espacio_id AND id != OLD.id
      ORDER BY orden ASC, created_at ASC
      LIMIT 1
    ),
    fecha_ultima_actualizacion = NOW()
    WHERE id = OLD.espacio_id AND foto_principal_url = OLD.url;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Remove the trigger if it already exists
DROP TRIGGER IF EXISTS auto_foto_principal_trigger_insert ON fotos_espacios;
DROP TRIGGER IF EXISTS auto_foto_principal_trigger_delete ON fotos_espacios;

-- Create triggers
CREATE TRIGGER auto_foto_principal_trigger_insert
AFTER INSERT ON fotos_espacios
FOR EACH ROW
EXECUTE FUNCTION set_auto_foto_principal();

CREATE TRIGGER auto_foto_principal_trigger_delete
AFTER DELETE ON fotos_espacios
FOR EACH ROW
EXECUTE FUNCTION set_auto_foto_principal();
