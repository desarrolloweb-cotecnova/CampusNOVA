-- ============================================================
-- Movimientos masivos de activos fijos
-- ============================================================
-- Un movimiento puede abarcar varios activos que comparten los mismos datos
-- (tipo, espacios, personas, motivo). Se sigue guardando un registro por
-- activo —para conservar la trazabilidad individual— y `lote_id` los agrupa:
-- es lo que permite mostrar el movimiento como una sola entrada en el
-- historial y emitir una única acta con todos los activos trasladados.

ALTER TABLE public.movimientos_activos
  ADD COLUMN IF NOT EXISTS lote_id uuid;

-- Por defecto cada registro forma su propio lote, así un insert que no
-- especifique `lote_id` sigue siendo válido y queda como movimiento individual.
ALTER TABLE public.movimientos_activos
  ALTER COLUMN lote_id SET DEFAULT gen_random_uuid();

-- Los movimientos anteriores a esta migración pasan a ser lotes de un activo.
UPDATE public.movimientos_activos SET lote_id = id WHERE lote_id IS NULL;

ALTER TABLE public.movimientos_activos
  ALTER COLUMN lote_id SET NOT NULL;

-- El historial se lee agrupado por lote y ordenado por fecha de registro.
CREATE INDEX IF NOT EXISTS movimientos_activos_lote_id_idx
  ON public.movimientos_activos (lote_id);
