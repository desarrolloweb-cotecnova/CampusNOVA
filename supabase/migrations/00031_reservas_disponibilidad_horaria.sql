-- ─────────────────────────────────────────────────────────────────────────────
-- Disponibilidad horaria de espacios (múltiples reservas por día)
-- ─────────────────────────────────────────────────────────────────────────────
-- Permite gestionar varias reservas de un mismo espacio en el mismo día, siempre
-- que sus franjas horarias no se crucen. Actúa como salvaguarda en la base de
-- datos: aunque el formulario y el panel ya validan la disponibilidad, este
-- trigger impide que una reserva pase a un estado que "ocupa" el espacio
-- (Aprobada / Confirmada) si se solapa con otra reserva ya ocupante.
--
-- Reglas de cruce:
--   * Solo bloquean las reservas en estado 'Aprobada' o 'Confirmada'.
--   * Las fechas se comparan de forma inclusiva (una reserva de un solo día
--     tiene fecha_inicio = fecha_fin).
--   * Las horas se comparan de forma semiabierta: 08:00–12:00 y 12:00–16:00
--     NO se consideran en conflicto (son contiguas, no solapadas).
--   * Si una reserva no define horas, se asume que ocupa el día completo.

CREATE OR REPLACE FUNCTION public.check_reserva_sin_solapamiento()
RETURNS TRIGGER AS $$
DECLARE
  conflicto RECORD;
BEGIN
  -- Solo validamos cuando la reserva queda en un estado que ocupa el espacio.
  IF NEW.estado NOT IN ('Aprobada', 'Confirmada') THEN
    RETURN NEW;
  END IF;

  SELECT r.numero_solicitud, r.fecha_inicio, r.hora_inicio, r.hora_fin
    INTO conflicto
  FROM public.reservas_alquileres r
  WHERE r.espacio_id = NEW.espacio_id
    AND r.id <> NEW.id
    AND r.estado IN ('Aprobada', 'Confirmada')
    -- Solapamiento de fechas (inclusivo)
    AND r.fecha_inicio <= NEW.fecha_fin
    AND NEW.fecha_inicio <= r.fecha_fin
    -- Solapamiento de franja horaria (semiabierto). Sin horas = día completo.
    AND COALESCE(NEW.hora_inicio, TIME '00:00') < COALESCE(r.hora_fin, TIME '24:00')
    AND COALESCE(r.hora_inicio, TIME '00:00') < COALESCE(NEW.hora_fin, TIME '24:00')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El espacio ya está reservado en esa franja horaria (solicitud %, % de % a %). Selecciona otro horario disponible.',
      conflicto.numero_solicitud,
      to_char(conflicto.fecha_inicio, 'DD/MM/YYYY'),
      COALESCE(to_char(conflicto.hora_inicio, 'HH24:MI'), '00:00'),
      COALESCE(to_char(conflicto.hora_fin, 'HH24:MI'), '23:59');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservas_sin_solapamiento ON public.reservas_alquileres;

CREATE TRIGGER trg_reservas_sin_solapamiento
  BEFORE INSERT OR UPDATE ON public.reservas_alquileres
  FOR EACH ROW
  EXECUTE FUNCTION public.check_reserva_sin_solapamiento();
