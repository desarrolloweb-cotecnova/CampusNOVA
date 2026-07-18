
-- Sincronizar la foto principal con la primera de la galería para TODOS los espacios
-- Esto corrige los casos donde la foto principal apuntaba a una URL vieja/eliminada
-- (como en Oficina Rectoría) en lugar de la primera foto actual de la galería.
UPDATE espacios_fisicos ef
SET
  foto_principal_url = fe_first.url,
  fecha_ultima_actualizacion = NOW()
FROM (
  SELECT DISTINCT ON (espacio_id)
    espacio_id,
    url
  FROM fotos_espacios
  ORDER BY espacio_id, orden ASC, created_at ASC
) fe_first
WHERE ef.id = fe_first.espacio_id
  AND (ef.foto_principal_url IS DISTINCT FROM fe_first.url);
