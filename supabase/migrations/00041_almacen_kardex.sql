-- ============================================================
-- Módulo Almacén — Kardex de insumos (aseo, papelería, etc.)
-- ============================================================
-- Exclusivo del rol 'admin'. El administrador registra a mano las entradas
-- (compras, donaciones, devoluciones) y las salidas (entregas / consumo) de
-- cada bodega, y el kardex se construye a partir de esos movimientos.
--
-- Decisiones de diseño, pensadas para la auditoría de saldos:
--
-- * El saldo NO se guarda: se calcula sumando los movimientos. Así nunca hay
--   un "saldo" que no cuadre con el detalle del kardex.
-- * Los movimientos son inmutables (no hay políticas de UPDATE ni DELETE). Un
--   error se corrige con un movimiento de ajuste, que queda a la vista en el
--   kardex, como en un kardex en papel.
-- * El kardex es cronológico: no se admite un movimiento con fecha anterior al
--   último registrado para ese producto en esa bodega, ni con fecha futura.
-- * Una salida no puede dejar el saldo en negativo.
-- Ejecutar en Supabase → SQL Editor. Es idempotente (re-ejecutable).

-- ── Bodegas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.almacen_bodegas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.almacen_bodegas (codigo, nombre) VALUES
  ('BOD-REC', 'Bodega Rectoría'),
  ('BOD-ME', 'Bodega Medios Educativos')
ON CONFLICT (codigo) DO NOTHING;

-- ── Catálogo de productos ─────────────────────────────────────────────────
-- Un mismo producto puede existir en las dos bodegas; cada una lleva su propio
-- kardex (los movimientos son por producto y bodega).
CREATE TABLE IF NOT EXISTS public.almacen_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'Aseo',
  unidad_medida text NOT NULL DEFAULT 'Unidad',
  stock_minimo numeric(14,2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Movimientos (líneas del kardex) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.almacen_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bodega_id uuid NOT NULL REFERENCES public.almacen_bodegas(id) ON DELETE RESTRICT,
  producto_id uuid NOT NULL REFERENCES public.almacen_productos(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha date NOT NULL DEFAULT current_date,
  cantidad numeric(14,2) NOT NULL CHECK (cantidad > 0),
  -- Costo unitario de la entrada. Las salidas se valoran en el kardex al costo
  -- promedio ponderado vigente, por eso aquí pueden quedar en NULL.
  costo_unitario numeric(14,2) CHECK (costo_unitario IS NULL OR costo_unitario >= 0),
  concepto text NOT NULL,
  -- Factura, remisión, número de solicitud, etc.
  documento text,
  -- Proveedor (entrada) o dependencia / persona que recibe (salida).
  tercero text,
  observaciones text,
  -- Agrupa las líneas registradas juntas (p. ej. una factura con varios ítems).
  lote_id uuid NOT NULL DEFAULT gen_random_uuid(),
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Nombre congelado: el kardex debe seguir mostrando quién registró aunque
  -- después cambie o se elimine el usuario.
  registrado_por_nombre text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS almacen_movimientos_kardex_idx
  ON public.almacen_movimientos (bodega_id, producto_id, fecha, created_at);
CREATE INDEX IF NOT EXISTS almacen_movimientos_lote_idx
  ON public.almacen_movimientos (lote_id);

-- ── Validación de cada movimiento ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.almacen_validar_movimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo numeric;
  v_ultima date;
  v_producto text;
BEGIN
  -- Serializa los movimientos del mismo producto en la misma bodega para que
  -- dos salidas simultáneas no lean el mismo saldo.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.bodega_id::text || ':' || NEW.producto_id::text));

  IF NEW.fecha > current_date THEN
    RAISE EXCEPTION 'La fecha del movimiento no puede ser futura.';
  END IF;

  SELECT max(fecha),
         COALESCE(sum(CASE WHEN tipo = 'entrada' THEN cantidad ELSE -cantidad END), 0)
    INTO v_ultima, v_saldo
    FROM almacen_movimientos
   WHERE bodega_id = NEW.bodega_id AND producto_id = NEW.producto_id;

  SELECT nombre INTO v_producto FROM almacen_productos WHERE id = NEW.producto_id;

  IF v_ultima IS NOT NULL AND NEW.fecha < v_ultima THEN
    RAISE EXCEPTION 'El kardex de "%" ya tiene movimientos al %; la fecha no puede ser anterior.',
      v_producto, to_char(v_ultima, 'DD/MM/YYYY');
  END IF;

  IF NEW.tipo = 'salida' AND NEW.cantidad > v_saldo THEN
    RAISE EXCEPTION 'Saldo insuficiente de "%": disponible %, solicitado %.',
      v_producto, v_saldo, NEW.cantidad;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS almacen_validar_movimiento_trg ON public.almacen_movimientos;
CREATE TRIGGER almacen_validar_movimiento_trg
  BEFORE INSERT ON public.almacen_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.almacen_validar_movimiento();

-- Mantiene updated_at del catálogo de productos.
CREATE OR REPLACE FUNCTION public.almacen_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS almacen_productos_updated_at_trg ON public.almacen_productos;
CREATE TRIGGER almacen_productos_updated_at_trg
  BEFORE UPDATE ON public.almacen_productos
  FOR EACH ROW EXECUTE FUNCTION public.almacen_touch_updated_at();

-- ── RLS: solo administradores ─────────────────────────────────────────────
ALTER TABLE public.almacen_bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lee bodegas" ON public.almacen_bodegas;
CREATE POLICY "Admin lee bodegas" ON public.almacen_bodegas
  FOR SELECT TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = 'admin');

DROP POLICY IF EXISTS "Admin gestiona productos" ON public.almacen_productos;
CREATE POLICY "Admin gestiona productos" ON public.almacen_productos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = 'admin')
  WITH CHECK ((public.get_user_role(auth.uid()))::text = 'admin');

-- Movimientos: se leen y se insertan; no se editan ni se borran.
DROP POLICY IF EXISTS "Admin lee movimientos almacen" ON public.almacen_movimientos;
CREATE POLICY "Admin lee movimientos almacen" ON public.almacen_movimientos
  FOR SELECT TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = 'admin');

DROP POLICY IF EXISTS "Admin registra movimientos almacen" ON public.almacen_movimientos;
CREATE POLICY "Admin registra movimientos almacen" ON public.almacen_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.get_user_role(auth.uid()))::text = 'admin'
    AND registrado_por = auth.uid()
  );

-- ── Realtime ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['almacen_productos', 'almacen_movimientos'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
