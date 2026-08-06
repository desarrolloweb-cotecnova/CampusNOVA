-- ============================================================
-- Bajas de activos: registro masivo por lote y datos del acta
-- ============================================================
-- La baja pasa a registrarse igual que un movimiento: se eligen varios activos
-- de un mismo espacio, se guarda una fila por activo —para conservar la
-- trazabilidad individual— y `lote_id` los agrupa como una sola baja con una
-- única acta.
--
-- El acta de baja lleva tres firmas: el responsable de los activos, quien
-- realiza la baja y el visto bueno del rector. Los dos primeros nombres se
-- congelan en la fila (igual que `aprobado_por` en los movimientos) porque el
-- acta es una constancia histórica: debe seguir mostrando quién tenía los
-- activos a cargo y quién los dio de baja, aunque después cambien el
-- responsable del activo o el cargo del usuario.

-- ── Agrupación por lote ───────────────────────────────────────────────────
ALTER TABLE public.bajas_activos
  ADD COLUMN IF NOT EXISTS lote_id uuid;

-- Por defecto cada registro forma su propio lote, así un insert que no
-- especifique `lote_id` sigue siendo válido y queda como baja individual.
ALTER TABLE public.bajas_activos
  ALTER COLUMN lote_id SET DEFAULT gen_random_uuid();

-- Las bajas anteriores a esta migración pasan a ser lotes de un activo.
UPDATE public.bajas_activos SET lote_id = id WHERE lote_id IS NULL;

ALTER TABLE public.bajas_activos
  ALTER COLUMN lote_id SET NOT NULL;

-- El historial se lee agrupado por lote y ordenado por fecha de registro.
CREATE INDEX IF NOT EXISTS bajas_activos_lote_id_idx
  ON public.bajas_activos (lote_id);

-- ── Datos que firman el acta ──────────────────────────────────────────────
-- Espacio donde estaban los activos al darlos de baja. Se guarda aparte del
-- activo porque este conserva su `espacio_id` y el acta debe decir de dónde
-- salieron los bienes en ese momento.
ALTER TABLE public.bajas_activos
  ADD COLUMN IF NOT EXISTS espacio_id uuid REFERENCES public.espacios_fisicos(id);

-- Nombre del responsable que tenía los activos a cargo.
ALTER TABLE public.bajas_activos
  ADD COLUMN IF NOT EXISTS responsable_activo text;

-- Nombre del usuario que registra la baja (Administración o Infraestructura).
ALTER TABLE public.bajas_activos
  ADD COLUMN IF NOT EXISTS realizada_por text;

-- Las bajas ya registradas no tienen estos datos; el acta dejará esas líneas de
-- firma en blanco, que es lo correcto: nadie los diligenció.
