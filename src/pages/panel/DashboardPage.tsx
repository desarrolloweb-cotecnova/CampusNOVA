import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Building2, AlertTriangle, Calendar, TrendingUp,
  Users, CheckCircle, Clock, ArrowRight, Activity, CalendarClock, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useAuth } from '@/contexts/AuthContext';
import { fechaLimiteAlertas, formatDate, getAlertaRepeticion } from '@/lib/utils';
import type { Intervencion } from '@/types/types';

/** Intervención recurrente con el espacio al que pertenece (para las alertas). */
type IntervencionProgramada = Intervencion & { espacio?: { id: string; nombre: string } | null };

interface DashboardStats {
  totalActivos: number;
  activosBaja: number;
  totalEspacios: number;
  espaciosIntervencionesPendientes: number;
  novedadesPendientes: number;
  novedadesResueltas: number;
  reservasPendientes: number;
  reservasAprobadas: number;
  /** Movimientos y bajas que esperan el visto bueno del rector. */
  vistoBuenoPendiente: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalActivos: 0, activosBaja: 0,
    totalEspacios: 0, espaciosIntervencionesPendientes: 0,
    novedadesPendientes: 0, novedadesResueltas: 0,
    reservasPendientes: 0, reservasAprobadas: 0,
    vistoBuenoPendiente: 0,
  });
  const [recentNovedades, setRecentNovedades] = useState<{ id: string; numero_radicado: string; tipo_novedad: string; estado: string; created_at: string }[]>([]);
  const [recentReservas, setRecentReservas] = useState<{ id: string; numero_solicitud: string; espacio_nombre: string; estado: string; fecha_inicio: string }[]>([]);
  const [intervProgramadas, setIntervProgramadas] = useState<IntervencionProgramada[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const isResponsable = profile?.role === 'responsable';

      // Para responsable: obtener sus espacios asignados primero
      let misEspaciosIds: string[] = [];
      if (isResponsable && profile?.id) {
        const { data: asigs } = await supabase
          .from('asignaciones_espacios')
          .select('espacio_id')
          .eq('responsable_id', profile.id)
          .eq('activo', true);
        misEspaciosIds = (asigs ?? []).map(a => a.espacio_id as string);
      }

      // Queries KPI: filtradas por rol
      const activosQuery = isResponsable && misEspaciosIds.length > 0
        ? supabase.from('activos_fijos').select('*', { count: 'exact', head: true }).eq('dado_de_baja', false).in('espacio_id', misEspaciosIds)
        : supabase.from('activos_fijos').select('*', { count: 'exact', head: true }).eq('dado_de_baja', false);

      const activosBajaQuery = isResponsable && misEspaciosIds.length > 0
        ? supabase.from('activos_fijos').select('*', { count: 'exact', head: true }).eq('dado_de_baja', true).in('espacio_id', misEspaciosIds)
        : supabase.from('activos_fijos').select('*', { count: 'exact', head: true }).eq('dado_de_baja', true);

      const espaciosQuery = isResponsable && misEspaciosIds.length > 0
        ? supabase.from('espacios_fisicos').select('*', { count: 'exact', head: true }).in('id', misEspaciosIds)
        : supabase.from('espacios_fisicos').select('*', { count: 'exact', head: true });

      const intervQuery = isResponsable && misEspaciosIds.length > 0
        ? supabase.from('intervenciones').select('*', { count: 'exact', head: true }).in('estado', ['Solicitud', 'En revisión', 'En ejecución']).in('espacio_id', misEspaciosIds)
        : supabase.from('intervenciones').select('*', { count: 'exact', head: true }).in('estado', ['Solicitud', 'En revisión', 'En ejecución']);

      // Intervenciones que deben repetirse: vencidas o dentro de la ventana de
      // anticipación. El responsable solo ve las de sus espacios asignados.
      let alertasQuery = supabase
        .from('intervenciones')
        .select('*, espacio:espacios_fisicos(id,nombre)')
        .eq('requiere_repeticion', true)
        .lte('fecha_proxima_intervencion', fechaLimiteAlertas())
        .order('fecha_proxima_intervencion')
        .limit(10);
      if (isResponsable) alertasQuery = alertasQuery.in('espacio_id', misEspaciosIds);

      const [
        { count: totalActivos },
        { count: activosBaja },
        { count: totalEspacios },
        { count: intervPendientes },
        { count: novPendientes },
        { count: novResueltas },
        { count: resPendientes },
        { count: resAprobadas },
        { data: movPendientes },
        { count: bajasPendientes },
        { data: novRecientes },
        { data: resRecientes },
        { data: intervAlertas },
      ] = await Promise.all([
        activosQuery,
        activosBajaQuery,
        espaciosQuery,
        intervQuery,
        supabase.from('novedades_incidentes').select('*', { count: 'exact', head: true }).in('estado', ['Recibido', 'En revisión', 'En gestión']),
        supabase.from('novedades_incidentes').select('*', { count: 'exact', head: true }).in('estado', ['Resuelto', 'Cerrado']),
        supabase.from('reservas_alquileres').select('*', { count: 'exact', head: true }).in('estado', ['Recibida', 'En revisión']),
        supabase.from('reservas_alquileres').select('*', { count: 'exact', head: true }).in('estado', ['Aprobada', 'Confirmada']),
        // Un movimiento masivo tiene una fila por activo: se cuentan los lotes
        // distintos, que es lo que el rector refrenda de una vez.
        supabase.from('movimientos_activos').select('lote_id').eq('estado', 'Pendiente de visto bueno'),
        supabase.from('bajas_activos').select('id', { count: 'exact', head: true }).eq('estado', 'Pendiente de visto bueno'),
        supabase.from('novedades_incidentes').select('id, numero_radicado, tipo_novedad, estado, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('reservas_alquileres').select('id, numero_solicitud, espacio_id, estado, fecha_inicio').order('created_at', { ascending: false }).limit(5),
        alertasQuery,
      ]);

      setIntervProgramadas(
        Array.isArray(intervAlertas) ? (intervAlertas as unknown as IntervencionProgramada[]) : [],
      );

      setStats({
        totalActivos: totalActivos || 0,
        activosBaja: activosBaja || 0,
        totalEspacios: totalEspacios || 0,
        espaciosIntervencionesPendientes: intervPendientes || 0,
        novedadesPendientes: novPendientes || 0,
        novedadesResueltas: novResueltas || 0,
        reservasPendientes: resPendientes || 0,
        vistoBuenoPendiente:
          new Set((Array.isArray(movPendientes) ? movPendientes : []).map(m => m.lote_id)).size +
          (bajasPendientes || 0),
        reservasAprobadas: resAprobadas || 0,
      });

      setRecentNovedades(Array.isArray(novRecientes) ? novRecientes : []);
      const resData = Array.isArray(resRecientes) ? resRecientes : [];
      const espaciosIds = [...new Set(resData.map((r) => r.espacio_id))];
      let espaciosMap: Record<string, string> = {};
      if (espaciosIds.length > 0) {
        const { data: esp } = await supabase
          .from('espacios_fisicos')
          .select('id, nombre')
          .in('id', espaciosIds);
        if (esp) {
          espaciosMap = Object.fromEntries(esp.map((e) => [e.id, e.nombre]));
        }
      }
      setRecentReservas(resData.map(r => ({
        id: r.id,
        numero_solicitud: r.numero_solicitud,
        espacio_nombre: espaciosMap[r.espacio_id] || 'Espacio',
        estado: r.estado,
        fecha_inicio: r.fecha_inicio,
      })));
    } finally {
      setLoading(false);
    }
  };

  // Realtime: recalcula los KPIs y listados en cuanto otro usuario registra o
  // refrenda algo, sin que haya que refrescar la pantalla.
  useRealtimeTable(
    [
      'reservas_alquileres', 'novedades_incidentes', 'intervenciones',
      'activos_fijos', 'movimientos_activos', 'bajas_activos', 'espacios_fisicos',
    ],
    loadDashboard,
    { enabled: !!profile },
  );

  const isResponsable = profile?.role === 'responsable';
  const intervVencidas = intervProgramadas.filter(
    i => getAlertaRepeticion(i)?.nivel === 'vencida',
  ).length;
  const kpis = [
    {
      title: isResponsable ? 'Mis Activos' : 'Activos Activos',
      value: stats.totalActivos, sub: `${stats.activosBaja} dados de baja`,
      icon: Package, color: 'text-primary', bg: 'bg-primary/10',
      action: () => navigate(isResponsable ? '/panel/espacios/mis-espacios' : '/panel/activos'),
    },
    {
      title: isResponsable ? 'Mis Espacios' : 'Espacios Físicos',
      value: stats.totalEspacios, sub: `${stats.espaciosIntervencionesPendientes} intervenciones activas`,
      icon: Building2, color: 'text-primary', bg: 'bg-primary/10',
      action: () => navigate(isResponsable ? '/panel/espacios/mis-espacios' : '/panel/espacios'),
    },
    // El rector refrenda movimientos y bajas; a Infraestructura y Administración
    // les sirve saber qué registros suyos siguen esperando ese visto bueno.
    ...(['rector', 'admin', 'infraestructura'].includes(profile?.role ?? '') ? [{
      title: profile?.role === 'rector' ? 'Esperan tu visto bueno' : 'Esperan visto bueno del rector',
      value: stats.vistoBuenoPendiente,
      sub: 'Movimientos y bajas de activos',
      icon: ShieldCheck,
      color: stats.vistoBuenoPendiente > 0 ? 'text-secondary' : 'text-primary',
      bg: stats.vistoBuenoPendiente > 0 ? 'bg-secondary/10' : 'bg-primary/10',
      action: () => navigate('/panel/activos/movimientos?pendientes=1'),
    }] : []),
    {
      title: 'Novedades Pendientes', value: stats.novedadesPendientes, sub: `${stats.novedadesResueltas} resueltas`,
      icon: AlertTriangle, color: 'text-secondary', bg: 'bg-secondary/10', action: () => navigate('/panel/novedades'),
    },
    {
      title: 'Reservas Pendientes', value: stats.reservasPendientes, sub: `${stats.reservasAprobadas} aprobadas`,
      icon: Calendar, color: 'text-secondary', bg: 'bg-secondary/10', action: () => navigate('/panel/reservas'),
    },
    {
      title: 'Intervenciones por Repetir',
      value: intervProgramadas.length,
      sub: intervVencidas > 0 ? `${intervVencidas} ya vencidas` : 'Ninguna vencida',
      icon: CalendarClock,
      color: intervVencidas > 0 ? 'text-red-600' : 'text-primary',
      bg: intervVencidas > 0 ? 'bg-red-100' : 'bg-primary/10',
      action: () => navigate(isResponsable ? '/panel/espacios/mis-espacios' : '/panel/espacios/intervenciones'),
    },
  ];

  const quickLinks = [
    { label: 'Ver Mis Espacios', icon: Building2, path: '/panel/espacios/mis-espacios' },
    { label: 'Ver Novedades', icon: AlertTriangle, path: '/panel/novedades' },
    { label: 'Ver Reservas', icon: Calendar, path: '/panel/reservas' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-balance">
              Bienvenido, {profile?.nombre?.split(' ')[0] || 'Usuario'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Resumen de la gestión institucional de COTECNOVA
            </p>
          </div>
          <Badge className="self-start bg-primary/10 text-primary border-primary/20">
            <Activity className="h-3 w-3 mr-1.5" />
            Sistema Activo
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map(kpi => (
            <Card
              key={kpi.title}
              className="h-full cursor-pointer shadow-card hover:shadow-hover transition-shadow"
              onClick={kpi.action}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{loading ? '—' : kpi.value}</p>
                <p className="text-sm font-medium mt-0.5 text-balance">{kpi.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerta: intervenciones que deben repetirse */}
        {!loading && intervProgramadas.length > 0 && (
          <Card className={`shadow-card ${intervVencidas > 0 ? 'border-red-200' : 'border-yellow-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base text-balance flex items-center gap-2">
                  <CalendarClock className={`h-4 w-4 ${intervVencidas > 0 ? 'text-red-600' : 'text-yellow-700'}`} />
                  Intervenciones que deben repetirse
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(isResponsable ? '/panel/espacios/mis-espacios' : '/panel/espacios/intervenciones')}
                >
                  Ver todo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intervProgramadas.map(i => {
                  const alerta = getAlertaRepeticion(i);
                  if (!alerta) return null;
                  return (
                    <div
                      key={i.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/panel/espacios/${i.espacio_id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {i.tipo} — {i.espacio?.nombre ?? 'Espacio'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {i.codigo} · Programada para {formatDate(alerta.fecha)}
                        </p>
                      </div>
                      <Badge className={`${alerta.badgeClass} border-0 text-xs shrink-0`}>
                        {alerta.etiqueta}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Novedades */}
          <Card className="md:col-span-2 h-full shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-balance">Novedades Recientes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/panel/novedades')}>
                  Ver todo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : recentNovedades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin novedades recientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentNovedades.map(n => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/panel/novedades/${n.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.numero_radicado}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.tipo_novedad}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className={
                          n.estado === 'Resuelto' || n.estado === 'Cerrado'
                            ? 'bg-green-100 text-green-800 border-0 text-xs'
                            : n.estado === 'En gestión'
                            ? 'bg-orange-100 text-orange-800 border-0 text-xs'
                            : 'bg-blue-100 text-blue-800 border-0 text-xs'
                        }>
                          {n.estado}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden md:block">{formatDate(n.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links + Recent Reservas */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-balance">Accesos Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {quickLinks.map(ql => (
                  <Button
                    key={ql.label}
                    variant="outline"
                    size="sm"
                    className="flex-col h-16 gap-1.5"
                    onClick={() => navigate(ql.path)}
                  >
                    <ql.icon className="h-4 w-4" />
                    <span className="text-xs leading-tight text-center text-balance">{ql.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-balance">Reservas Recientes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/panel/reservas')}>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
                  </div>
                ) : recentReservas.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Sin reservas recientes</p>
                ) : (
                  <div className="space-y-2">
                    {recentReservas.slice(0, 4).map(r => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate('/panel/reservas')}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{r.numero_solicitud}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.espacio_nombre}</p>
                        </div>
                        <Badge className={
                          r.estado === 'Aprobada' || r.estado === 'Confirmada'
                            ? 'bg-green-100 text-green-800 border-0 text-xs ml-1'
                            : 'bg-gray-100 text-gray-800 border-0 text-xs ml-1'
                        }>
                          {r.estado}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
