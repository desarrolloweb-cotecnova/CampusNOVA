import { useEffect, useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
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
import type { Intervencion, EspacioFisico, EstadoIntervencion, TipoIntervencion, Prioridad } from '@/types/types';
import { getEstadoColor, formatDate, formatCurrency, generateCodigoIntervencion } from '@/lib/utils';
import { toast } from 'sonner';

const TIPOS: TipoIntervencion[] = [
  'Mantenimiento preventivo', 'Mantenimiento correctivo', 'Remodelación',
  'Adecuación', 'Construcción nueva', 'Modificación eléctrica',
  'Modificación hidráulica', 'Reparación de emergencia',
];
const ESTADOS: EstadoIntervencion[] = ['Solicitud', 'En revisión', 'Aprobada', 'En ejecución', 'Finalizado', 'Rechazada'];
const PRIORIDADES: Prioridad[] = ['Alta', 'Media', 'Baja'];

interface IntForm {
  espacio_id: string; tipo: TipoIntervencion; descripcion_problema: string;
  justificacion: string; area_solicitante: string; prioridad: Prioridad;
  estado: EstadoIntervencion; fecha_inicio: string; fecha_fin: string;
  contratista_responsable: string; descripcion_trabajos: string;
  materiales_utilizados: string; costo: string; observaciones: string;
}

const INIT: IntForm = {
  espacio_id: 'none', tipo: 'Mantenimiento correctivo', descripcion_problema: '',
  justificacion: '', area_solicitante: '', prioridad: 'Media',
  estado: 'Solicitud', fecha_inicio: '', fecha_fin: '',
  contratista_responsable: '', descripcion_trabajos: '',
  materiales_utilizados: '', costo: '', observaciones: '',
};

export default function IntervencionesPage() {
  const [intervenciones, setIntervenciones] = useState<(Intervencion & { espacio?: EspacioFisico })[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterPrioridad, setFilterPrioridad] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Intervencion | null>(null);
  const [form, setForm] = useState<IntForm>(INIT);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: intData }, { data: espData }] = await Promise.all([
      supabase.from('intervenciones').select('*, espacio:espacios_fisicos(id,nombre,sede)').order('created_at', { ascending: false }).limit(200),
      supabase.from('espacios_fisicos').select('id,nombre,sede').order('nombre'),
    ]);
    setIntervenciones(Array.isArray(intData) ? intData : []);
    setEspacios(Array.isArray(espData) ? espData as unknown as EspacioFisico[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = intervenciones.filter(i => {
    const s = search.toLowerCase();
    const matchSearch = !search || [i.codigo, i.tipo, i.descripcion_problema, (i.espacio as EspacioFisico)?.nombre].some(f => f?.toLowerCase().includes(s));
    const matchEst = filterEstado === 'all' || i.estado === filterEstado;
    const matchPri = filterPrioridad === 'all' || i.prioridad === filterPrioridad;
    return matchSearch && matchEst && matchPri;
  });

  const openCreate = () => { setEditingItem(null); setForm(INIT); setDialogOpen(true); };
  const openEdit = (item: Intervencion) => {
    setEditingItem(item);
    setForm({
      espacio_id: item.espacio_id, tipo: item.tipo, descripcion_problema: item.descripcion_problema,
      justificacion: item.justificacion || '', area_solicitante: item.area_solicitante || '',
      prioridad: item.prioridad, estado: item.estado,
      fecha_inicio: item.fecha_inicio?.slice(0, 10) || '', fecha_fin: item.fecha_fin?.slice(0, 10) || '',
      contratista_responsable: item.contratista_responsable || '',
      descripcion_trabajos: item.descripcion_trabajos || '',
      materiales_utilizados: item.materiales_utilizados || '',
      costo: item.costo ? String(item.costo) : '', observaciones: item.observaciones || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.descripcion_problema.trim()) { toast.error('La descripción del problema es obligatoria'); return; }
    if (!form.espacio_id || form.espacio_id === 'none') { toast.error('Selecciona un espacio'); return; }
    setSaving(true);
    const payload = {
      espacio_id: form.espacio_id, tipo: form.tipo,
      descripcion_problema: form.descripcion_problema,
      justificacion: form.justificacion || null,
      area_solicitante: form.area_solicitante || null,
      prioridad: form.prioridad, estado: form.estado,
      fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null,
      contratista_responsable: form.contratista_responsable || null,
      descripcion_trabajos: form.descripcion_trabajos || null,
      materiales_utilizados: form.materiales_utilizados || null,
      costo: form.costo ? parseFloat(form.costo) : null,
      observaciones: form.observaciones || null,
    };
    let error;
    if (editingItem) {
      ({ error } = await supabase.from('intervenciones').update(payload).eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from('intervenciones').insert({ ...payload, codigo: generateCodigoIntervencion() }));
    }
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success(editingItem ? 'Intervención actualizada' : 'Intervención registrada');
    setDialogOpen(false);
    loadData();
  };

  const countByEstado = (est: string) => intervenciones.filter(i => i.estado === est).length;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Mini KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: intervenciones.length, color: 'text-primary' },
            { label: 'En ejecución', value: countByEstado('En ejecución'), color: 'text-blue-600' },
            { label: 'Pendientes', value: countByEstado('Solicitud') + countByEstado('En revisión'), color: 'text-yellow-600' },
            { label: 'Finalizadas', value: countByEstado('Finalizado'), color: 'text-green-600' },
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
                <Input placeholder="Buscar intervenciones..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
                <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openCreate} className="shrink-0">
                <Plus className="h-4 w-4 mr-1.5" /> Nueva Intervención
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-card min-w-0">
          <CardHeader><CardTitle className="text-base">Intervenciones ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Espacio</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Prioridad</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Costo</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(8).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No hay intervenciones registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{(item.espacio as EspacioFisico)?.nombre || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm max-w-[160px] truncate">{item.tipo}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`${getEstadoColor(item.prioridad)} border-0 text-xs`}>{item.prioridad}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`${getEstadoColor(item.estado)} border-0 text-xs`}>{item.estado}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{item.costo ? formatCurrency(item.costo) : '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(item.fecha_solicitud)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Intervención' : 'Nueva Intervención'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Espacio *</Label>
                <Select value={form.espacio_id} onValueChange={v => setForm(f => ({ ...f, espacio_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} — {e.sede}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Intervención</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as TipoIntervencion }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={v => setForm(f => ({ ...f, prioridad: v as Prioridad }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Descripción del Problema *</Label>
                <Textarea value={form.descripcion_problema} onChange={e => setForm(f => ({ ...f, descripcion_problema: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as EstadoIntervencion }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Área Solicitante</Label>
                <Input value={form.area_solicitante} onChange={e => setForm(f => ({ ...f, area_solicitante: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contratista Responsable</Label>
                <Input value={form.contratista_responsable} onChange={e => setForm(f => ({ ...f, contratista_responsable: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Costo ($)</Label>
                <Input type="number" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Descripción de Trabajos Realizados</Label>
                <Textarea value={form.descripcion_trabajos} onChange={e => setForm(f => ({ ...f, descripcion_trabajos: e.target.value }))} rows={2} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
