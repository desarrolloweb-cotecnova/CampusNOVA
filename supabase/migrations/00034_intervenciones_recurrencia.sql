-- ─────────────────────────────────────────────────────────────────────────────
-- Recurrencia de intervenciones (mantenimiento programado) + alerta en el tiempo
-- ─────────────────────────────────────────────────────────────────────────────
-- Al registrar una intervención de un espacio físico se puede indicar que debe
-- repetirse cada mes, cada seis meses o cada año. La fecha de la próxima
-- ejecución queda guardada en `fecha_proxima_intervencion` y el panel la usa
-- para avisar con 30 días de anticipación (y en rojo cuando ya está vencida),
-- de modo que la intervención no se olvide.
--
-- Ciclo de vida:
--   1. Se crea la intervención con requiere_repeticion = true, la frecuencia y
--      la fecha de la próxima ejecución.
--   2. La alerta se muestra desde 30 días antes y NO desaparece al vencerse:
--      permanece visible hasta que alguien registre que ya se hizo.
--   3. Al marcarla como realizada (RPC `registrar_repeticion_intervencion`) se
--      guarda la fecha en `fecha_ultima_repeticion` y se reprograma
--      automáticamente la siguiente sumando la frecuencia elegida.

-- ── Frecuencias disponibles ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'frecuencia_intervencion'
  ) THEN
    CREATE TYPE public.frecuencia_intervencion AS ENUM ('Mensual', 'Semestral', 'Anual');
  END IF;
END
$$;

-- ── Columnas de recurrencia ───────────────────────────────────────────────────
ALTER TABLE public.intervenciones
  ADD COLUMN IF NOT EXISTS requiere_repeticion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frecuencia_repeticion public.frecuencia_intervencion,
  ADD COLUMN IF NOT EXISTS fecha_proxima_intervencion date,
  ADD COLUMN IF NOT EXISTS fecha_ultima_repeticion date;

COMMENT ON COLUMN public.intervenciones.requiere_repeticion IS
  'La intervención debe repetirse periódicamente (mantenimiento programado).';
COMMENT ON COLUMN public.intervenciones.frecuencia_repeticion IS
  'Cada cuánto se repite: Mensual (1 mes), Semestral (6 meses) o Anual (12 meses).';
COMMENT ON COLUMN public.intervenciones.fecha_proxima_intervencion IS
  'Fecha en la que debe volver a realizarse. Alimenta las alertas del panel.';
COMMENT ON COLUMN public.intervenciones.fecha_ultima_repeticion IS
  'Última vez que se registró la ejecución de la repetición.';

-- Coherencia: si se marca como recurrente, exige frecuencia y próxima fecha.
ALTER TABLE public.intervenciones
  DROP CONSTRAINT IF EXISTS intervenciones_repeticion_coherente;
ALTER TABLE public.intervenciones
  ADD CONSTRAINT intervenciones_repeticion_coherente CHECK (
    NOT requiere_repeticion
    OR (frecuencia_repeticion IS NOT NULL AND fecha_proxima_intervencion IS NOT NULL)
  );

-- Índice parcial: las consultas de alertas solo miran las recurrentes.
CREATE INDEX IF NOT EXISTS idx_intervenciones_proxima_repeticion
  ON public.intervenciones (fecha_proxima_intervencion)
  WHERE requiere_repeticion;

-- ── Meses que representa cada frecuencia ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meses_frecuencia_intervencion(
  p_frecuencia public.frecuencia_intervencion
) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_frecuencia
    WHEN 'Mensual'   THEN 1
    WHEN 'Semestral' THEN 6
    WHEN 'Anual'     THEN 12
  END;
$$;

-- ── Registrar que la repetición ya se realizó ─────────────────────────────────
-- Guarda la fecha de ejecución y reprograma la siguiente sumando la frecuencia
-- a esa fecha (nunca deja una próxima fecha en el pasado, aunque la anterior
-- llevara meses vencida). SECURITY INVOKER: aplica las políticas RLS de
-- `intervenciones`, así que solo puede ejecutarla quien puede actualizarlas.
CREATE OR REPLACE FUNCTION public.registrar_repeticion_intervencion(
  p_intervencion_id uuid,
  p_fecha_realizada date DEFAULT CURRENT_DATE
) RETURNS date
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE
  v_intervencion public.intervenciones;
  v_proxima date;
BEGIN
  SELECT * INTO v_intervencion
  FROM public.intervenciones
  WHERE id = p_intervencion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La intervención indicada no existe.';
  END IF;

  IF NOT v_intervencion.requiere_repeticion OR v_intervencion.frecuencia_repeticion IS NULL THEN
    RAISE EXCEPTION 'La intervención % no tiene una repetición programada.', v_intervencion.codigo;
  END IF;

  v_proxima := (
    p_fecha_realizada
    + (public.meses_frecuencia_intervencion(v_intervencion.frecuencia_repeticion) * INTERVAL '1 month')
  )::date;

  UPDATE public.intervenciones
     SET fecha_ultima_repeticion    = p_fecha_realizada,
         fecha_proxima_intervencion = v_proxima,
         updated_at                 = now()
   WHERE id = p_intervencion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permisos para actualizar la intervención %.', v_intervencion.codigo;
  END IF;

  RETURN v_proxima;
END;
$$;

GRANT EXECUTE ON FUNCTION public.meses_frecuencia_intervencion(public.frecuencia_intervencion) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_repeticion_intervencion(uuid, date) TO authenticated;
