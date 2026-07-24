import { useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';

interface UseRealtimeTableOptions {
  /** Si es false, no se abre la suscripción (útil para condicionar por rol/estado). */
  enabled?: boolean;
  /** Ventana para agrupar ráfagas de eventos antes de llamar a onChange. */
  debounceMs?: number;
}

/**
 * Se suscribe a los cambios (INSERT/UPDATE/DELETE) de una o varias tablas vía
 * Supabase Realtime y llama a `onChange` (con debounce) cuando llega un evento.
 *
 * Uso típico: volver a ejecutar el `loadData()` de una página cuando OTRO usuario
 * modifica los datos, para que el estado se actualice sin refrescar la pantalla.
 *
 *   useRealtimeTable('reservas_alquileres', loadData);
 *   useRealtimeTable(['reservas_alquileres', 'novedades_incidentes'], loadData);
 *
 * Requisito: la tabla debe estar en la publicación `supabase_realtime`
 * (reservas_alquileres, novedades_incidentes e intervenciones ya lo están).
 * Coste: una sola conexión WebSocket por pestaña, multiplexada entre canales;
 * la suscripción se cierra al desmontar (sin fugas).
 */
export function useRealtimeTable(
  tables: string | string[],
  onChange: () => void,
  { enabled = true, debounceMs = 400 }: UseRealtimeTableOptions = {},
): void {
  // onChange en un ref: así el canal no se recrea en cada render aunque la
  // función cambie de identidad.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Identificador único por instancia del hook, para no colisionar topics de
  // Realtime si dos suscripciones comparten las mismas tablas.
  const channelIdRef = useRef(Math.random().toString(36).slice(2));

  // Clave estable para las dependencias del efecto (independiente del orden).
  const key = Array.isArray(tables) ? [...tables].sort().join(',') : tables;

  useEffect(() => {
    if (!enabled || !key) return;

    const tableList = key.split(',');
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), debounceMs);
    };

    const channel = supabase.channel(`rt-${key}-${channelIdRef.current}`);
    for (const table of tableList) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, trigger);
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [key, enabled, debounceMs]);
}
