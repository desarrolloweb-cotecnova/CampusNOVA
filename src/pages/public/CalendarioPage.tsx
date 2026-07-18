import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, ArrowLeft,
  ArrowRight, Building2, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval,
  parseISO, isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cleanDateString } from '@/lib/utils';

import { LOGO_URL } from '@/lib/assets';

interface ReservaEvento {
  id: string;
  numero_solicitud: string;
  tipo: 'Reserva' | 'Alquiler';
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  nombre_solicitante: string;
  proposito: string;
  espacio?: { nombre: string; capacidad_personas: number | null } | null;
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarioPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventos, setEventos] = useState<ReservaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    loadEventos();
  }, []);

  const loadEventos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reservas_alquileres')
      .select('id, numero_solicitud, tipo, estado, fecha_inicio, fecha_fin, nombre_solicitante, proposito, espacio:espacios_fisicos(nombre, capacidad_personas)')
      .in('estado', ['Aprobada', 'Confirmada'])
      .order('fecha_inicio', { ascending: true });
    setEventos(Array.isArray(data) ? (data as unknown as ReservaEvento[]) : []);
    setLoading(false);
  };

  // Genera las celdas del mes actual
  const buildCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getEventosForDay = (day: Date): ReservaEvento[] => {
    return eventos.filter(e => {
      try {
        const start = parseISO(cleanDateString(e.fecha_inicio));
        const end = parseISO(cleanDateString(e.fecha_fin));
        return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
      } catch { return false; }
    });
  };

  const selectedDayEventos = selectedDay ? getEventosForDay(selectedDay) : [];
  const calendarDays = buildCalendarDays();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={LOGO_URL} alt="CampusNOVA" className="h-10 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Inicio
              </Button>
              <Button size="sm" onClick={() => navigate('/solicitar-espacio')}>
                <span>Solicitar Espacio</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Título */}
        <div className="text-center">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Disponibilidad</Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-balance mb-2">Calendario de Espacios</h1>
          <p className="text-muted-foreground text-pretty max-w-xl mx-auto text-sm">
            Consulta la disponibilidad de los espacios antes de realizar tu solicitud.
            Las reservas se muestran en verde y los alquileres en naranja.
          </p>
        </div>

        {/* Leyenda */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Reserva sin costo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-secondary" />
            <span className="text-muted-foreground">Alquiler con costo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario */}
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-base capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Días de la semana */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_ES.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Celdas */}
                {loading ? (
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array(35).fill(0).map((_, i) => (
                      <div key={i} className="aspect-square rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((day, idx) => {
                      const inMonth = isSameMonth(day, currentMonth);
                      const today = isToday(day);
                      const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                      const dayEventos = getEventosForDay(day);
                      const hasReserva = dayEventos.some(e => e.tipo === 'Reserva');
                      const hasAlquiler = dayEventos.some(e => e.tipo === 'Alquiler');

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`
                            relative flex flex-col items-center justify-start p-1 min-h-[52px] rounded-lg text-xs transition-colors
                            ${!inMonth ? 'opacity-30 pointer-events-none' : 'hover:bg-muted cursor-pointer'}
                            ${today ? 'ring-2 ring-primary ring-offset-1' : ''}
                            ${isSelected ? 'bg-primary/10' : ''}
                          `}
                        >
                          <span className={`font-medium ${today ? 'text-primary' : 'text-foreground'}`}>
                            {format(day, 'd')}
                          </span>
                          {/* Indicadores de eventos */}
                          {inMonth && (hasReserva || hasAlquiler) && (
                            <div className="flex gap-0.5 mt-auto mb-0.5">
                              {hasReserva && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                              {hasAlquiler && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral: eventos del día seleccionado */}
          <div className="space-y-4">
            {selectedDay ? (
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">
                    {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDayEventos.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Espacio disponible este día</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayEventos.map(evento => (
                        <div
                          key={evento.id}
                          className={`rounded-lg p-3 border-l-4 text-sm ${
                            evento.tipo === 'Alquiler'
                              ? 'border-l-secondary bg-secondary/5'
                              : 'border-l-primary bg-primary/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={`text-xs border-0 ${evento.tipo === 'Alquiler' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                              {evento.tipo}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">{evento.numero_solicitud}</span>
                          </div>
                          {evento.espacio && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Building2 className="h-3 w-3" />
                              <span className="font-medium text-foreground">{evento.espacio.nombre}</span>
                            </div>
                          )}
                          {evento.espacio?.capacidad_personas && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Users className="h-3 w-3" />
                              <span>Capacidad: {evento.espacio.capacidad_personas} personas</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground text-pretty line-clamp-2">{evento.proposito}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-pretty">Selecciona un día en el calendario para ver las reservas</p>
                </CardContent>
              </Card>
            )}

            {/* CTA solicitar */}
            <Card className="shadow-card bg-primary text-primary-foreground">
              <CardContent className="p-5 text-center">
                <h3 className="font-semibold mb-2 text-balance">¿Quieres reservar un espacio?</h3>
                <p className="text-primary-foreground/80 text-sm mb-4 text-pretty">
                  Completa el formulario de solicitud y recibirás confirmación por correo.
                </p>
                <Button
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={() => navigate('/solicitar-espacio')}
                >
                  <span>Solicitar un Espacio</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer mínimo */}
      <footer className="mt-12 border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 Corporación de Estudios Tecnológicos del Norte del Valle — COTECNOVA
          </p>
        </div>
      </footer>
    </div>
  );
}
