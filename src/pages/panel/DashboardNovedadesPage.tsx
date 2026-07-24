import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { toast } from 'sonner';

export default function DashboardNovedadesPage() {
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    enGestion: 0,
    resueltos: 0,
    cerrados: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('novedades_incidentes')
        .select('estado');

      if (error) throw error;

      const total = data.length;
      const pendientes = data.filter(n => n.estado === 'Recibido' || n.estado === 'En revisión').length;
      const enGestion = data.filter(n => n.estado === 'En gestión').length;
      const resueltos = data.filter(n => n.estado === 'Resuelto').length;
      const cerrados = data.filter(n => n.estado === 'Cerrado').length;

      setStats({ total, pendientes, enGestion, resueltos, cerrados });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar las estadísticas de novedades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Realtime: recalcula las estadísticas cuando cambian las novedades.
  useRealtimeTable('novedades_incidentes', loadStats);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel de Novedades</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estadísticas y resumen del estado de los incidentes reportados.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-32 bg-muted border-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Reportes</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Novedades registradas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-destructive">Pendientes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.pendientes}</div>
                <p className="text-xs text-muted-foreground mt-1">Recibidos o en revisión</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-orange-500">En Gestión</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.enGestion}</div>
                <p className="text-xs text-muted-foreground mt-1">Actualmente en proceso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-emerald-500">Completados</CardTitle>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{stats.resueltos + stats.cerrados}</div>
                <p className="text-xs text-muted-foreground mt-1">Resueltos y cerrados</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}