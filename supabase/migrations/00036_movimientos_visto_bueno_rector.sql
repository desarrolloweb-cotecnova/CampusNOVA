-- ============================================================
-- Visto bueno del rector en el acta de movimiento
-- ============================================================
-- El acta lleva cuatro firmas: quien entrega, quien recibe, quien autoriza el
-- movimiento (Infraestructura o Administración) y el visto bueno del rector.
--
-- El nombre del rector se guarda junto al movimiento, igual que `aprobado_por`,
-- en lugar de consultarse al imprimir: el acta es una constancia histórica y
-- debe seguir mostrando quién ocupaba el cargo cuando se hizo el movimiento,
-- aunque después cambie el rector.

ALTER TABLE public.movimientos_activos
  ADD COLUMN IF NOT EXISTS visto_bueno_rector text;
