-- ============================================================
-- Foto de evidencia de la baja de activos
-- ============================================================
-- La baja retira bienes del patrimonio, así que el acta debe poder respaldarse
-- con una evidencia gráfica del estado en que quedaron los activos.
--
-- Se guarda la URL de Cloudinary, el mismo repositorio donde ya viven las fotos
-- de los espacios, los activos y las novedades (preset `campusnova`): no hay un
-- almacén distinto por módulo.
--
-- La evidencia es del lote, no de cada activo: todas las filas de una misma baja
-- comparten la URL, igual que comparten motivo, fecha y responsable.

ALTER TABLE public.bajas_activos
  ADD COLUMN IF NOT EXISTS foto_evidencia_url text;

-- Las bajas anteriores a esta migración no tienen evidencia y se quedan sin
-- ella: la foto se exige al registrar, no de forma retroactiva.
