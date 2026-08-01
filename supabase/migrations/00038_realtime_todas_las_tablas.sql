-- ============================================================
-- Realtime en toda la aplicación
-- ============================================================
-- Hasta ahora solo intervenciones, novedades_incidentes y reservas_alquileres
-- publicaban sus cambios, así que el resto de las pantallas obligaban a
-- refrescar el navegador para ver lo que otro usuario acababa de registrar.
--
-- Se agregan a la publicación las tablas que respaldan pantallas compartidas.
-- Queda fuera public_profiles: es una vista, y las vistas no se publican.
--
-- Nota sobre volumen: un traslado masivo actualiza una fila por activo, y cada
-- una emite un evento a cada cliente suscrito. El hook `useRealtimeTable`
-- agrupa esa ráfaga con un debounce y recarga una sola vez, pero el conteo de
-- mensajes de Realtime sí crece con el tamaño del lote.

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    -- Activos
    'activos_fijos', 'movimientos_activos', 'bajas_activos',
    -- Espacios
    'espacios_fisicos', 'asignaciones_espacios', 'movimientos_espacios',
    'documentos_espacios', 'fotos_espacios',
    -- Seguimiento
    'seguimiento_novedades', 'bitacoras_intervencion', 'no_conformidades',
    'actas_recibo_obra',
    -- Usuarios
    'profiles', 'usuarios_precarga',
    -- Catálogos
    'categorias_activos', 'estados_activos', 'responsables_activos',
    'proveedores_activos', 'proveedores', 'sedes_espacios', 'bloques_espacios',
    'pisos_espacios', 'tipos_espacios', 'estados_espacios',
    'motivos_movimiento_espacio'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Idempotente: si la tabla ya está publicada, se omite sin fallar.
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
