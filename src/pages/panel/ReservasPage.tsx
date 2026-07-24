import { useEffect, useState, useCallback } from 'react';
import {
  Search, Calendar, CheckCircle, XCircle, Eye, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import type { ReservaAlquiler, EspacioFisico, EstadoReserva } from '@/types/types';
import { getEstadoColor, formatDate, formatCurrency, cleanDateString, reservasSeCruzan, formatFranjaHoraria, ESTADOS_OCUPAN_ESPACIO } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { toast } from 'sonner';

const ESTADOS: EstadoReserva[] = ['Recibida', 'En revisión', 'Aprobada', 'Confirmada', 'Rechazada', 'Cancelada'];

export default function ReservasPage() {
  const [reservas, setReservas] = useState<(ReservaAlquiler & { espacio?: EspacioFisico })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<ReservaAlquiler | null>(null);
  const [newEstado, setNewEstado] = useState<EstadoReserva>('Aprobada');
  const [comentario, setComentario] = useState('');
  const [valorAcordado, setValorAcordado] = useState('');
  const [updating, setUpdating] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reservas_alquileres')
      .select('*, espacio:espacios_fisicos(id,nombre,sede,bloque,capacidad_personas)')
      .order('created_at', { ascending: false });
    setReservas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresca el listado cuando otro usuario cambia una reserva.
  useRealtimeTable('reservas_alquileres', loadData);

  const filtered = reservas.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = !search || [r.numero_solicitud, r.nombre_solicitante, r.correo_solicitante, (r.espacio as EspacioFisico)?.nombre].some(f => f?.toLowerCase().includes(s));
    const matchEst = filterEstado === 'all' || r.estado === filterEstado;
    const matchTipo = filterTipo === 'all' || r.tipo === filterTipo;
    return matchSearch && matchEst && matchTipo;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const openDetail = (r: ReservaAlquiler) => {
    setSelectedReserva(r);
    setNewEstado(r.estado);
    setComentario('');
    setValorAcordado(r.valor_acordado ? String(r.valor_acordado) : '');
    setDetailOpen(true);
  };

  const handleUpdateEstado = async () => {
    if (!selectedReserva) return;

    // Al aprobar/confirmar, evitar que dos reservas del mismo espacio ocupen la
    // misma franja horaria. Se permiten varias reservas el mismo día si no se cruzan.
    if ((ESTADOS_OCUPAN_ESPACIO as readonly string[]).includes(newEstado)) {
      const { data: otras } = await supabase
        .from('reservas_alquileres')
        .select('id, numero_solicitud, fecha_inicio, fecha_fin, hora_inicio, hora_fin')
        .eq('espacio_id', selectedReserva.espacio_id)
        .in('estado', [...ESTADOS_OCUPAN_ESPACIO])
        .neq('id', selectedReserva.id);
      const conflicto = (otras ?? []).find(o => reservasSeCruzan(selectedReserva, o));
      if (conflicto) {
        toast.error(
          `No se puede ${newEstado === 'Confirmada' ? 'confirmar' : 'aprobar'}: el espacio ya está reservado por ` +
          `${conflicto.numero_solicitud} el ${formatDate(conflicto.fecha_inicio)} (${formatFranjaHoraria(conflicto.hora_inicio, conflicto.hora_fin)}).`
        );
        return;
      }
    }

    setUpdating(true);
    const { error } = await supabase.from('reservas_alquileres').update({
      estado: newEstado,
      motivo_rechazo: comentario || null,
      valor_acordado: valorAcordado ? parseFloat(valorAcordado) : null,
      gestionado_por: (await supabase.auth.getUser()).data.user?.id ?? null,
    }).eq('id', selectedReserva.id);
    setUpdating(false);
    if (error) { toast.error('Error al actualizar'); return; }
    toast.success('Estado actualizado');

    // Notificar al solicitante si tiene correo
    if (selectedReserva.correo_solicitante) {
      supabase.functions.invoke('send-notification', {
        body: {
          tipo: 'reserva_actualizada',
          destinatario: selectedReserva.correo_solicitante,
          nombre: selectedReserva.nombre_solicitante,
          data: {
            numero_solicitud: selectedReserva.numero_solicitud,
            espacio_nombre: (selectedReserva.espacio as { nombre?: string })?.nombre || '—',
            fecha_inicio: selectedReserva.fecha_inicio,
            fecha_fin: selectedReserva.fecha_fin,
            nuevo_estado: newEstado,
            observaciones: comentario || '',
          },
        },
      }).catch(console.error);
    }

    setDetailOpen(false);
    loadData();
  };

  const countPendientes = reservas.filter(r => ['Recibida', 'En revisión'].includes(r.estado)).length;
  const countAprobadas = reservas.filter(r => ['Aprobada', 'Confirmada'].includes(r.estado)).length;

  const handleExport = () => {
    exportToExcel(filtered.map(r => ({
      Solicitud: r.numero_solicitud,
      Solicitante: r.nombre_solicitante,
      Espacio: (r.espacio as EspacioFisico)?.nombre || '',
      Tipo: r.tipo,
      Estado: r.estado,
      'Fecha Inicio': formatDate(r.fecha_inicio),
      'Fecha Fin': formatDate(r.fecha_fin),
      Valor: r.valor_acordado ? formatCurrency(r.valor_acordado) : '',
    })), 'reservas_alquileres', 'Reservas');
    toast.success('Excel exportado');
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total solicitudes', value: reservas.length, color: 'text-foreground' },
            { label: 'Pendientes de revisión', value: countPendientes, color: 'text-secondary' },
            { label: 'Aprobadas/Confirmadas', value: countAprobadas, color: 'text-green-600' },
            { label: 'Reservas activas (hoy)', value: reservas.filter(r => r.estado === 'Confirmada' && new Date(cleanDateString(r.fecha_inicio)) <= new Date() && new Date(cleanDateString(r.fecha_fin)) >= new Date()).length, color: 'text-primary' },
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
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar reservas..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={filterEstado} onValueChange={v => { setFilterEstado(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={v => { setFilterTipo(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Reserva">Reserva</SelectItem>
                  <SelectItem value="Alquiler">Alquiler</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport} className="shrink-0">
                <Download className="h-4 w-4 mr-1.5" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-card min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Solicitudes de Reservas/Alquileres ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Solicitud</TableHead>
                    <TableHead className="whitespace-nowrap">Solicitante</TableHead>
                    <TableHead className="whitespace-nowrap">Espacio</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Fechas</TableHead>
                    <TableHead className="whitespace-nowrap">Valor</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                    ))
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No hay reservas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{r.numero_solicitud}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium">{r.nombre_solicitante}</p>
                            <p className="text-xs text-muted-foreground">{r.tipo_solicitante}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{(r.espacio as EspacioFisico)?.nombre || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`${r.tipo === 'Alquiler' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'} border-0 text-xs`}>{r.tipo}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`${getEstadoColor(r.estado)} border-0 text-xs`}>{r.estado}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(r.fecha_inicio)} → {formatDate(r.fecha_fin)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{r.valor_acordado ? formatCurrency(r.valor_acordado) : '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Gestionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        {selectedReserva && (
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Solicitud {selectedReserva.numero_solicitud}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Solicitante</p><p className="font-medium">{selectedReserva.nombre_solicitante}</p></div>
                  <div><p className="text-xs text-muted-foreground">Correo</p><p className="font-medium">{selectedReserva.correo_solicitante}</p></div>
                  <div><p className="text-xs text-muted-foreground">Teléfono</p><p className="font-medium">{selectedReserva.telefono_solicitante || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo solicitante</p><p className="font-medium">{selectedReserva.tipo_solicitante}</p></div>
                  {selectedReserva.institucion && (
                    <div className="col-span-2"><p className="text-xs text-muted-foreground">Institución</p><p className="font-medium">{selectedReserva.institucion}</p></div>
                  )}
                  <div><p className="text-xs text-muted-foreground">Espacio</p><p className="font-medium">{(selectedReserva.espacio as EspacioFisico)?.nombre || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo solicitud</p>
                    <Badge className={`${selectedReserva.tipo === 'Alquiler' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'} border-0 mt-1`}>{selectedReserva.tipo}</Badge>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Fecha inicio</p><p className="font-medium">{formatDate(selectedReserva.fecha_inicio)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Fecha fin</p><p className="font-medium">{formatDate(selectedReserva.fecha_fin)}</p></div>
                  {selectedReserva.hora_inicio && (
                    <div><p className="text-xs text-muted-foreground">Horario</p><p className="font-medium">{selectedReserva.hora_inicio} — {selectedReserva.hora_fin}</p></div>
                  )}
                  {selectedReserva.num_asistentes && (
                    <div><p className="text-xs text-muted-foreground">Asistentes</p><p className="font-medium">{selectedReserva.num_asistentes}</p></div>
                  )}
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Propósito</p><p className="font-medium text-pretty">{selectedReserva.proposito}</p></div>
                  {selectedReserva.requerimientos_especiales && (
                    <div className="col-span-2"><p className="text-xs text-muted-foreground">Requerimientos</p><p className="font-medium text-pretty">{selectedReserva.requerimientos_especiales}</p></div>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="font-semibold text-sm">Gestión de la Solicitud</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nuevo Estado</Label>
                      <Select value={newEstado} onValueChange={v => setNewEstado(v as EstadoReserva)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {selectedReserva.tipo === 'Alquiler' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Valor Acordado ($)</Label>
                        <Input type="number" value={valorAcordado} onChange={e => setValorAcordado(e.target.value)} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observaciones / Motivo</Label>
                    <Textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={2} placeholder="Ej. Motivo de rechazo, condiciones de aprobación..." />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateEstado} disabled={updating} className="flex-1">
                      {updating ? 'Actualizando...' : 'Guardar cambios'}
                    </Button>
                    <Button variant="outline" onClick={() => setDetailOpen(false)}>Cancelar</Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
