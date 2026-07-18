import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Search, Plus, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const TIPOS_MOVIMIENTO = ['Traslado', 'Préstamo', 'Cambio de responsable', 'Mantenimiento', 'Retiro temporal', 'Otro'];

interface MovimientoRow {
  id: string;
  tipo_movimiento: string;
  activo_id: string;
  activo_nombre: string;
  activo_codigo: string;
  espacio_origen: string;
  espacio_destino: string;
  responsable_anterior: string | null;
  responsable_nuevo: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  motivo: string | null;
  observaciones: string | null;
  aprobado_por: string | null;
  fecha_movimiento: string;
}

interface MovimientoForm {
  activo_id: string;
  tipo_movimiento: string;
  espacio_origen_id: string;
  espacio_destino_id: string;
  responsable_anterior: string;
  responsable_nuevo: string;
  aprobado_por: string;
  fecha_movimiento: string;
  motivo: string;
  observaciones: string;
}

const EMPTY_FORM: MovimientoForm = {
  activo_id: '', tipo_movimiento: 'Traslado',
  espacio_origen_id: 'none', espacio_destino_id: 'none',
  responsable_anterior: '', responsable_nuevo: '', aprobado_por: '',
  fecha_movimiento: new Date().toISOString().slice(0, 10),
  motivo: '', observaciones: '',
};

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [activos, setActivos] = useState<{ id: string; codigo: string; nombre: string }[]>([]);
  const [espacios, setEspacios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MovimientoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [printMovimiento, setPrintMovimiento] = useState<MovimientoRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: movData }, { data: actData }, { data: espData }] = await Promise.all([
      supabase
        .from('movimientos_activos')
        .select(`
          id, tipo_movimiento, motivo, observaciones, aprobado_por, fecha_movimiento,
          activo_id,
          responsable_anterior, responsable_nuevo, estado_anterior, estado_nuevo,
          activo:activos_fijos(codigo, nombre),
          espacio_origen:espacios_fisicos!movimientos_activos_espacio_origen_id_fkey(nombre),
          espacio_destino:espacios_fisicos!movimientos_activos_espacio_destino_id_fkey(nombre)
        `)
        .order('fecha_movimiento', { ascending: false })
        .limit(200),
      supabase.from('activos_fijos').select('id, codigo, nombre').eq('dado_de_baja', false).order('nombre'),
      supabase.from('espacios_fisicos').select('id, nombre').order('nombre'),
    ]);

    const rows: MovimientoRow[] = (Array.isArray(movData) ? movData : []).map(d => ({
      id: d.id,
      tipo_movimiento: d.tipo_movimiento,
      activo_id: d.activo_id,
      activo_nombre: (d.activo as unknown as { nombre: string })?.nombre || '—',
      activo_codigo: (d.activo as unknown as { codigo: string })?.codigo || '—',
      espacio_origen: (d.espacio_origen as unknown as { nombre: string })?.nombre || '—',
      espacio_destino: (d.espacio_destino as unknown as { nombre: string })?.nombre || '—',
      responsable_anterior: d.responsable_anterior,
      responsable_nuevo: d.responsable_nuevo,
      estado_anterior: d.estado_anterior,
      estado_nuevo: d.estado_nuevo,
      motivo: d.motivo,
      observaciones: d.observaciones,
      aprobado_por: d.aprobado_por,
      fecha_movimiento: d.fecha_movimiento,
    }));
    setMovimientos(rows);
    setActivos(Array.isArray(actData) ? actData : []);
    setEspacios(Array.isArray(espData) ? espData as { id: string; nombre: string }[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = movimientos.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [m.activo_nombre, m.activo_codigo, m.tipo_movimiento, m.motivo].some(f => f?.toLowerCase().includes(s));
  });

  const handleSave = async () => {
    if (!form.activo_id) { toast.error('Selecciona un activo'); return; }
    if (!form.motivo.trim()) { toast.error('El motivo es obligatorio'); return; }
    setSaving(true);
    const payload = {
      activo_id: form.activo_id,
      tipo_movimiento: form.tipo_movimiento,
      espacio_origen_id: form.espacio_origen_id === 'none' ? null : form.espacio_origen_id,
      espacio_destino_id: form.espacio_destino_id === 'none' ? null : form.espacio_destino_id,
      responsable_anterior: form.responsable_anterior || null,
      responsable_nuevo: form.responsable_nuevo || null,
      aprobado_por: form.aprobado_por || null,
      fecha_movimiento: form.fecha_movimiento,
      motivo: form.motivo,
      observaciones: form.observaciones || null,
    };
    const { error } = await supabase.from('movimientos_activos').insert(payload);
    setSaving(false);
    if (error) { toast.error('Error al registrar movimiento: ' + error.message); return; }
    toast.success('Movimiento registrado exitosamente');
    setDialogOpen(false);
    loadData();
  };

  const handlePrint = (m: MovimientoRow) => {
    setPrintMovimiento(m);
    setTimeout(() => window.print(), 300);
  };

  return (
    <AppLayout>
      {/* Print-only acta */}
      {printMovimiento && (
        <div className="hidden print:block p-8 font-sans text-sm text-black">
          <div className="text-center mb-6">
            <p className="text-lg font-bold uppercase">CORPORACIÓN DE ESTUDIOS TECNOLÓGICOS DEL NORTE DEL VALLE</p>
            <p className="text-base font-semibold uppercase mt-1">ACTA DE MOVIMIENTO DE ACTIVO FIJO</p>
            <p className="text-xs mt-1">Fecha de movimiento: {printMovimiento.fecha_movimiento}</p>
          </div>
          <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
            <tbody>
              {[
                ['Activo', `${printMovimiento.activo_nombre} (${printMovimiento.activo_codigo})`],
                ['Tipo de movimiento', printMovimiento.tipo_movimiento],
                ['Espacio de origen', printMovimiento.espacio_origen],
                ['Espacio de destino', printMovimiento.espacio_destino],
                ['Motivo', printMovimiento.motivo || '—'],
                ['Observaciones', printMovimiento.observaciones || '—'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-gray-400 px-3 py-2 font-semibold bg-gray-100 w-40">{label}</td>
                  <td className="border border-gray-400 px-3 py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-semibold mb-4">Firmas de responsables:</p>
          <div className="grid grid-cols-3 gap-6 mt-6">
            {[
              ['Persona que entrega', printMovimiento.responsable_anterior],
              ['Persona que recibe', printMovimiento.responsable_nuevo],
              ['Persona que aprueba', printMovimiento.aprobado_por],
            ].map(([label, nombre]) => (
              <div key={label} className="text-center">
                <div className="border-b border-black mt-12 mb-1" />
                <p className="font-semibold text-xs">{nombre || '____________________'}</p>
                <p className="text-xs text-gray-600">{label}</p>
                <p className="text-xs text-gray-500 mt-1">C.C.: ____________________</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">Generado por CampusNOVA — COTECNOVA</p>
        </div>
      )}

      <div className="space-y-5 print:hidden">
        {/* Toolbar */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar movimientos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1.5" /> Registrar Movimiento
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-card min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Historial de Movimientos ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Activo</TableHead>
                    <TableHead className="whitespace-nowrap">Origen → Destino</TableHead>
                    <TableHead className="whitespace-nowrap">Entrega / Recibe</TableHead>
                    <TableHead className="whitespace-nowrap">Aprueba</TableHead>
                    <TableHead className="whitespace-nowrap">Motivo</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDateTime(m.fecha_movimiento)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">{m.tipo_movimiento}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-sm font-medium">{m.activo_nombre}</p>
                          <p className="text-xs text-muted-foreground font-mono">{m.activo_codigo}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <span className="text-muted-foreground">{m.espacio_origen}</span>
                          <span className="mx-1">→</span>
                          {m.espacio_destino}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          <p>{m.responsable_anterior || '—'}</p>
                          <p className="text-muted-foreground">{m.responsable_nuevo || '—'}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{m.aprobado_por || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground max-w-[180px] truncate">{m.motivo || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(m)}>
                            <Printer className="h-3.5 w-3.5 mr-1" /> Acta
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Register movement dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Movimiento de Activo</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Activo *</Label>
                <Select value={form.activo_id} onValueChange={v => setForm(f => ({ ...f, activo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar activo" /></SelectTrigger>
                  <SelectContent>
                    {activos.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de movimiento</Label>
                <Select value={form.tipo_movimiento} onValueChange={v => setForm(f => ({ ...f, tipo_movimiento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_MOVIMIENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha del movimiento</Label>
                <input type="date" value={form.fecha_movimiento} onChange={e => setForm(f => ({ ...f, fecha_movimiento: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <Label>Espacio de origen</Label>
                <Select value={form.espacio_origen_id} onValueChange={v => setForm(f => ({ ...f, espacio_origen_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Origen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Espacio de destino</Label>
                <Select value={form.espacio_destino_id} onValueChange={v => setForm(f => ({ ...f, espacio_destino_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Destino" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Persona que entrega</Label>
                <Input value={form.responsable_anterior} onChange={e => setForm(f => ({ ...f, responsable_anterior: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="space-y-2">
                <Label>Persona que recibe</Label>
                <Input value={form.responsable_nuevo} onChange={e => setForm(f => ({ ...f, responsable_nuevo: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Persona que aprueba</Label>
                <Input value={form.aprobado_por} onChange={e => setForm(f => ({ ...f, aprobado_por: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Motivo *</Label>
                <Textarea value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} rows={2} placeholder="Describe el motivo del movimiento..." />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} placeholder="Observaciones adicionales..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Movimiento'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
