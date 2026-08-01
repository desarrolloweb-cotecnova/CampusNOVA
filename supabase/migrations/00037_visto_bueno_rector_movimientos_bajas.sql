-- ============================================================
-- Visto bueno del rector sobre movimientos y bajas de activos
-- ============================================================
-- El movimiento lo autoriza Infraestructura o Administración y se aplica de
-- inmediato al inventario, para que este siga reflejando dónde están
-- físicamente los activos. El rector da después su visto bueno, que es lo que
-- completa el estado del registro y cierra el acta.
--
-- Lo mismo aplica a las bajas: son los dos cambios con impacto patrimonial que
-- el rector debe conocer y refrendar.

-- ── Movimientos ───────────────────────────────────────────────────────────
ALTER TABLE public.movimientos_activos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Pendiente de visto bueno',
  ADD COLUMN IF NOT EXISTS visto_bueno_por uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS visto_bueno_fecha timestamptz;

-- `visto_bueno_rector` guarda el nombre de quien refrenda. Hasta la migración
-- anterior se rellenaba al registrar el movimiento con el rector vigente; ahora
-- solo se escribe cuando el visto bueno se da de verdad, así que los registros
-- que aún estén pendientes no deben mostrar ningún nombre.
UPDATE public.movimientos_activos
   SET visto_bueno_rector = NULL
 WHERE estado = 'Pendiente de visto bueno';

ALTER TABLE public.movimientos_activos
  DROP CONSTRAINT IF EXISTS movimientos_activos_estado_check;
ALTER TABLE public.movimientos_activos
  ADD CONSTRAINT movimientos_activos_estado_check
  CHECK (estado IN ('Pendiente de visto bueno', 'Con visto bueno'));

-- ── Bajas ─────────────────────────────────────────────────────────────────
ALTER TABLE public.bajas_activos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Pendiente de visto bueno',
  ADD COLUMN IF NOT EXISTS visto_bueno_rector text,
  ADD COLUMN IF NOT EXISTS visto_bueno_por uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS visto_bueno_fecha timestamptz;

ALTER TABLE public.bajas_activos
  DROP CONSTRAINT IF EXISTS bajas_activos_estado_check;
ALTER TABLE public.bajas_activos
  ADD CONSTRAINT bajas_activos_estado_check
  CHECK (estado IN ('Pendiente de visto bueno', 'Con visto bueno'));

-- El panel consulta cuántos registros están pendientes de visto bueno.
CREATE INDEX IF NOT EXISTS movimientos_activos_estado_idx
  ON public.movimientos_activos (estado);
CREATE INDEX IF NOT EXISTS bajas_activos_estado_idx
  ON public.bajas_activos (estado);
