import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useAuth } from '@/contexts/AuthContext';
import { fechaLimiteAlertas, formatDate, getAlertaRepeticion, labelFrecuencia } from '@/lib/utils';
import type { Intervencion } from '@/types/types';

type IntervencionAlerta = Intervencion & { espacio?: { id: string; nombre: string } | null };

/**
 * Campana del encabezado: avisa de las intervenciones que deben repetirse
 * (vencidas o dentro de la ventana de anticipación) y da acceso al listado
 * completo. Los responsables solo ven las de los espacios que tienen asignados.
 */
export function AlertasMantenimiento() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [alertas, setAlertas] = useState<IntervencionAlerta[]>([]);

  const cargarAlertas = useCallback(async () => {
    if (!profile) return;

    let espaciosPermitidos: string[] | null = null;
    if (profile.role === 'responsable') {
      const { data: asigs } = await supabase
        .from('asignaciones_espacios')
        .select('espacio_id')
        .eq('responsable_id', profile.id)
        .eq('activo', true);
      espaciosPermitidos = (asigs ?? []).map(a => a.espacio_id as string);
      if (espaciosPermitidos.length === 0) { setAlertas([]); return; }
    }

    let query = supabase
      .from('intervenciones')
      .select('*, espacio:espacios_fisicos(id,nombre)')
      .eq('requiere_repeticion', true)
      .lte('fecha_proxima_intervencion', fechaLimiteAlertas())
      .order('fecha_proxima_intervencion')
      .limit(20);

    if (espaciosPermitidos) query = query.in('espacio_id', espaciosPermitidos);

    const { data } = await query;
    setAlertas(Array.isArray(data) ? (data as unknown as IntervencionAlerta[]) : []);
  }, [profile]);

  useEffect(() => { cargarAlertas(); }, [cargarAlertas]);

  // Realtime: el contador se actualiza cuando alguien registra o reprograma
  // una intervención desde otra pantalla.
  useRealtimeTable('intervenciones', cargarAlertas, { enabled: !!profile });

  const vencidas = alertas.filter(i => getAlertaRepeticion(i)?.nivel === 'vencida').length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {alertas.length > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                vencidas > 0 ? 'bg-red-600' : 'bg-secondary'
              }`}
            >
              {alertas.length > 9 ? '9+' : alertas.length}
            </span>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Intervenciones por repetir
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alertas.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No hay intervenciones pendientes de repetirse.
          </p>
        ) : (
          alertas.map(intervencion => {
            const alerta = getAlertaRepeticion(intervencion);
            if (!alerta) return null;
            return (
              <DropdownMenuItem
                key={intervencion.id}
                className="flex flex-col items-start gap-1 py-2.5"
                onClick={() => navigate(`/panel/espacios/${intervencion.espacio_id}`)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{intervencion.tipo}</span>
                  <Badge className={`${alerta.badgeClass} border-0 text-xs shrink-0`}>
                    {alerta.etiqueta}
                  </Badge>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {intervencion.espacio?.nombre ?? 'Espacio'} · {formatDate(alerta.fecha)} ·{' '}
                  {labelFrecuencia(alerta.frecuencia)}
                </span>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        {profile?.role === 'responsable' ? (
          <DropdownMenuItem onClick={() => navigate('/panel/espacios/mis-espacios')}>
            <CalendarClock className="mr-2 h-4 w-4" /> Ver mis espacios
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => navigate('/panel/espacios/intervenciones')}>
            <CalendarClock className="mr-2 h-4 w-4" /> Ver todas las intervenciones
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/panel/novedades')}>
          <AlertTriangle className="mr-2 h-4 w-4" /> Ver novedades reportadas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
