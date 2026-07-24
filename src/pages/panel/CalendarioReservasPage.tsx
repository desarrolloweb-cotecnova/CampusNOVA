import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, Building2, Users, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  isSameMonth, isSameDay, isWithinInterval, parseISO, isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cleanDateString } from '@/lib/utils';

interface ReservaEvento {
  id: string;
  numero_solicitud: string;
  tipo: 'Reserva' | 'Alquiler';
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  nombre_solicitante: string;
  proposito: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  espacio?: { id: string; nombre: string; capacidad_personas: number | null } | null;
}

type CalView = 'mensual' | 'semanal' | 'diaria';

const ESTADOS_COLOR: Record<string, string> = {
  'Recibida': 'bg-muted text-muted-foreground',
  'En revisión': 'bg-yellow-100 text-yellow-800',
  'Aprobada': 'bg-blue-100 text-blue-800',
  'Confirmada': 'bg-green-100 text-green-800',
  'Rechazada': 'bg-red-100 text-red-800',
  'Cancelada': 'bg-gray-100 text-gray-600',
};
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ESTADOS_FILTRO = ['all', 'Recibida', 'En revisión', 'Aprobada', 'Confirmada', 'Rechazada', 'Cancelada'];
const WORK_HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am–8pm

export default function CalendarioReservasPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<CalView>('mensual');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState<ReservaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [espacios, setEspacios] = useState<{ id: string; nombre: string }[]>([]);
  const [filterEspacio, setFilterEspacio] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: espaciosData }] = await Promise.all([
      supabase.from('reservas_alquileres')
        .select('id, numero_solicitud, tipo, estado, fecha_inicio, fecha_fin, nombre_solicitante, proposito, hora_inicio, hora_fin, espacio:espacios_fisicos(id, nombre, capacidad_personas)')
        .order('fecha_inicio', { ascending: true }),
      supabase.from('espacios_fisicos').select('id, nombre').order('nombre'),
    ]);
    setEventos(Array.isArray(data) ? (data as unknown as ReservaEvento[]) : []);
    setEspacios(Array.isArray(espaciosData) ? espaciosData : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresca el calendario cuando cambian las reservas.
  useRealtimeTable('reservas_alquileres', loadData);

  const filteredEventos = eventos.filter(e => {
    const matchEst = filterEstado === 'all' || e.estado === filterEstado;
    const matchTipo = filterTipo === 'all' || e.tipo === filterTipo;
    const matchEsp = filterEspacio === 'all' || (e.espacio as { id?: string })?.id === filterEspacio;
    return matchEst && matchTipo && matchEsp;
  });

  const getEventosForDay = (day: Date): ReservaEvento[] =>
    filteredEventos.filter(e => {
      try {
        const start = parseISO(cleanDateString(e.fecha_inicio));
        const end = parseISO(cleanDateString(e.fecha_fin));
        return isSameDay(day, start) || isSameDay(day, end) || isWithinInterval(day, { start, end });
      } catch { return false; }
    });

  const getEventosForHour = (day: Date, hour: number): ReservaEvento[] =>
    getEventosForDay(day).filter(e => {
      if (!e.hora_inicio) return hour === 8; // si no tiene hora, mostrar a las 8am
      const h = parseInt(e.hora_inicio.slice(0, 2));
      return h === hour;
    });

  // Navigation helpers
  const goPrev = () => {
    if (view === 'mensual') setCurrentDate(d => subMonths(d, 1));
    else if (view === 'semanal') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, -1));
  };
  const goNext = () => {
    if (view === 'mensual') setCurrentDate(d => addMonths(d, 1));
    else if (view === 'semanal') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  // Month calendar days
  const monthDays = (() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  })();

  // Week days (Sun–Sat of currentDate's week)
  const weekDays = (() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  })();

  // Stats for current month
  const mesEventos = filteredEventos.filter(e => {
    try { return isSameMonth(parseISO(cleanDateString(e.fecha_inicio)), view === 'mensual' ? currentDate : new Date()); } catch { return false; }
  });

  // Current period title
  const periodTitle = (() => {
    if (view === 'mensual') return format(currentDate, 'MMMM yyyy', { locale: es });
    if (view === 'semanal') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM yyyy', { locale: es })}`;
    }
    return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es });
  })();

  const selectedOrCurrent = selectedDay ?? currentDate;

  const EventChip = ({ evento }: { evento: ReservaEvento }) => (
    <button
      onClick={() => navigate('/panel/reservas')}
      className={`w-full text-left rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity ${evento.tipo === 'Alquiler' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}
      title={`${evento.espacio?.nombre ?? ''} · ${evento.proposito}`}
    >
      {evento.espacio?.nombre || evento.numero_solicitud}
    </button>
  );

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Este mes', value: mesEventos.length, color: 'text-foreground' },
            { label: 'Reservas', value: mesEventos.filter(e => e.tipo === 'Reserva').length, color: 'text-primary' },
            { label: 'Alquileres', value: mesEventos.filter(e => e.tipo === 'Alquiler').length, color: 'text-secondary' },
            { label: 'Confirmadas', value: mesEventos.filter(e => e.estado === 'Confirmada').length, color: 'text-green-600' },
          ].map(s => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>{ESTADOS_FILTRO.map(e => <SelectItem key={e} value={e}>{e === 'all' ? 'Todos los estados' : e}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Reserva">Reserva</SelectItem>
                  <SelectItem value="Alquiler">Alquiler</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEspacio} onValueChange={setFilterEspacio}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Espacio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los espacios</SelectItem>
                  {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="shrink-0" onClick={() => navigate('/solicitar-espacio')}>
                <Plus className="h-4 w-4 mr-1.5" /> Nueva Solicitud
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-sm md:text-base capitalize text-balance min-w-[200px] text-center">{periodTitle}</CardTitle>
                <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={goToday} className="text-xs">Hoy</Button>
              </div>
              {/* View switcher */}
              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                {(['mensual', 'semanal', 'diaria'] as CalView[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 grid grid-cols-7 gap-1">
                {Array(35).fill(0).map((_, i) => <div key={i} className="aspect-square rounded bg-muted animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* ── VISTA MENSUAL ── */}
                {view === 'mensual' && (
                  <div className="p-3">
                    <div className="grid grid-cols-7 mb-1">
                      {DAYS_ES.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {monthDays.map((day, idx) => {
                        const inMonth = isSameMonth(day, currentDate);
                        const today = isToday(day);
                        const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                        const dayEvts = getEventosForDay(day);
                        const hasReserva = dayEvts.some(e => e.tipo === 'Reserva');
                        const hasAlquiler = dayEvts.some(e => e.tipo === 'Alquiler');
                        const hasPendiente = dayEvts.some(e => ['Recibida', 'En revisión'].includes(e.estado));
                        return (
                          <button
                            key={idx}
                            onClick={() => inMonth && setSelectedDay(isSelected ? null : day)}
                            className={`relative flex flex-col items-center justify-start p-1 min-h-[56px] rounded-lg text-xs transition-colors
                              ${!inMonth ? 'opacity-20 pointer-events-none' : 'hover:bg-muted cursor-pointer'}
                              ${today ? 'ring-2 ring-primary ring-offset-1' : ''}
                              ${isSelected ? 'bg-primary/10' : ''}`}
                          >
                            <span className={`font-medium ${today ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</span>
                            {inMonth && (hasReserva || hasAlquiler || hasPendiente) && (
                              <div className="flex flex-wrap gap-0.5 mt-auto mb-0.5 justify-center">
                                {hasReserva && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                {hasAlquiler && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                                {hasPendiente && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {/* Selected day panel */}
                    {selectedDay && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-sm font-semibold mb-2 capitalize">
                          {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        {getEventosForDay(selectedDay).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">Sin reservas este día</p>
                        ) : (
                          <div className="space-y-2">
                            {getEventosForDay(selectedDay).map(ev => <EventCard key={ev.id} evento={ev} onNavigate={() => navigate('/panel/reservas')} />)}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Reserva</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Alquiler</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Pendiente</div>
                    </div>
                  </div>
                )}

                {/* ── VISTA SEMANAL ── */}
                {view === 'semanal' && (
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {/* Header row */}
                      <div className="grid grid-cols-8 border-b border-border">
                        <div className="p-2 text-xs text-muted-foreground text-center font-medium">Hora</div>
                        {weekDays.map(d => (
                          <div
                            key={d.toISOString()}
                            className={`p-2 text-center border-l border-border ${isToday(d) ? 'bg-primary/5' : ''}`}
                          >
                            <p className="text-xs font-medium text-muted-foreground">{DAYS_ES[d.getDay()]}</p>
                            <p className={`text-base font-bold ${isToday(d) ? 'text-primary' : 'text-foreground'}`}>{format(d, 'd')}</p>
                          </div>
                        ))}
                      </div>
                      {/* Hourly rows */}
                      <div className="max-h-[540px] overflow-y-auto">
                        {WORK_HOURS.map(hour => (
                          <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[52px]">
                            <div className="px-2 py-1 text-xs text-muted-foreground text-right border-r border-border pt-1">
                              {`${hour}:00`}
                            </div>
                            {weekDays.map(d => {
                              const evts = getEventosForHour(d, hour);
                              return (
                                <div key={d.toISOString()} className={`px-1 py-1 border-l border-border space-y-0.5 ${isToday(d) ? 'bg-primary/5' : ''}`}>
                                  {evts.map(ev => <EventChip key={ev.id} evento={ev} />)}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── VISTA DIARIA ── */}
                {view === 'diaria' && (
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                      <p className="text-sm font-semibold capitalize flex-1">
                        {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      {isToday(currentDate) && <Badge className="bg-primary/10 text-primary border-0 text-xs">Hoy</Badge>}
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                      {WORK_HOURS.map(hour => {
                        const evts = getEventosForHour(currentDate, hour);
                        return (
                          <div key={hour} className="flex gap-3 border-b border-border px-4 py-2 min-h-[60px]">
                            <div className="w-12 shrink-0 text-xs text-muted-foreground pt-0.5">{`${hour}:00`}</div>
                            <div className="flex-1 space-y-1.5">
                              {evts.length === 0 ? (
                                <div className="h-full min-h-[40px] rounded border border-dashed border-border/50" />
                              ) : (
                                evts.map(ev => (
                                  <EventCard key={ev.id} evento={ev} onNavigate={() => navigate('/panel/reservas')} compact />
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

// ─── Sub-component: event detail card ────────────────────────────────────────
function EventCard({ evento, onNavigate, compact }: { evento: ReservaEvento; onNavigate: () => void; compact?: boolean }) {
  return (
    <div
      onClick={onNavigate}
      className={`rounded-lg border-l-4 cursor-pointer hover:opacity-90 transition-opacity ${evento.tipo === 'Alquiler' ? 'border-l-secondary bg-secondary/5' : 'border-l-primary bg-primary/5'} ${compact ? 'p-2' : 'p-3'}`}
    >
      <div className="flex items-center justify-between mb-1 gap-2">
        <Badge className={`text-xs border-0 shrink-0 ${evento.tipo === 'Alquiler' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>{evento.tipo}</Badge>
        <Badge className={`text-xs border-0 shrink-0 ${ESTADOS_COLOR[evento.estado] || 'bg-muted text-muted-foreground'}`}>{evento.estado}</Badge>
      </div>
      <p className="font-mono text-xs text-muted-foreground">{evento.numero_solicitud}</p>
      {evento.espacio && (
        <div className="flex items-center gap-1 text-xs mt-0.5">
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{evento.espacio.nombre}</span>
        </div>
      )}
      {evento.hora_inicio && <p className="text-xs text-muted-foreground">{evento.hora_inicio} — {evento.hora_fin}</p>}
      {!compact && evento.espacio?.capacidad_personas && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" /><span>{evento.espacio.capacidad_personas} personas</span>
        </div>
      )}
      {!compact && <p className="text-xs text-muted-foreground mt-1 text-pretty line-clamp-2">{evento.proposito}</p>}
    </div>
  );
}
