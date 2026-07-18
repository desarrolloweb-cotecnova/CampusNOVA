
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
  AND (ef.foto_principal_url IS NULL OR ef.foto_principal_url = '');
