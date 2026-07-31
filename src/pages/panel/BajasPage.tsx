import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
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
import type { ActivoFijo, MotivoBaja } from '@/types/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { fetchAllRows } from '@/lib/supabase-fetch';
import { toast } from 'sonner';

const MOTIVOS: MotivoBaja[] = ['Deterioro', 'Robo', 'Obsolescencia', 'Donación', 'Otro'];

export default function BajasPage() {
  const [bajas, setBajas] = useState<{
    id: string; activo_codigo: string; activo_nombre: string; activo_valor: number;
    motivo: string; descripcion: string; fecha_baja: string;
  }[]>([]);
  const [activosActivos, setActivosActivos] = useState<ActivoFijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ activo_id: '', motivo: 'Deterioro' as MotivoBaja, descripcion: '', fecha_baja: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: bajasData }, { data: activosData }] = await Promise.all([
      supabase.from('bajas_activos').select(`
        id, motivo, descripcion, fecha_baja,
        activo:activos_fijos(codigo, nombre, valor)
      `).order('fecha_baja', { ascending: false }),
      // Paginado: el selector debe ofrecer todo el inventario, no las primeras 1.000 filas.
      fetchAllRows<{ id: string; codigo: string; nombre: string; valor: number }>(() =>
        supabase.from('activos_fijos').select('id, codigo, nombre, valor').eq('dado_de_baja', false).order('nombre').order('id')
      ),
    ]);
    setBajas((Array.isArray(bajasData) ? bajasData : []).map((b) => ({
      id: b.id, motivo: b.motivo, descripcion: b.descripcion || '', fecha_baja: b.fecha_baja,
      activo_codigo: (b.activo as unknown as { codigo: string })?.codigo || '—',
      activo_nombre: (b.activo as unknown as { nombre: string })?.nombre || '—',
      activo_valor: (b.activo as unknown as { valor: number })?.valor || 0,
    })));
    setActivosActivos(Array.isArray(activosData) ? activosData as unknown as ActivoFijo[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = bajas.filter(b =>
    !search || [b.activo_nombre, b.activo_codigo, b.motivo].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async () => {
    if (!form.activo_id || form.activo_id === 'none') { toast.error('Selecciona un activo'); return; }
    setSaving(true);
    // Insert baja record
    const { error: bajaError } = await supabase.from('bajas_activos').insert({
      activo_id: form.activo_id,
      motivo: form.motivo,
      descripcion: form.descripcion || null,
      fecha_baja: form.fecha_baja,
    });
    if (bajaError) { toast.error('Error al registrar baja: ' + bajaError.message); setSaving(false); return; }
    // Mark activo as baja
    await supabase.from('activos_fijos').update({ dado_de_baja: true, estado: 'Dado de baja' }).eq('id', form.activo_id);
    setSaving(false);
    toast.success('Baja registrada exitosamente');
    setDialogOpen(false);
    setForm({ activo_id: '', motivo: 'Deterioro', descripcion: '', fecha_baja: new Date().toISOString().slice(0, 10) });
    loadData();
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar bajas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Registrar Baja
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Bajas de Activos ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Activo</TableHead>
                    <TableHead className="whitespace-nowrap">Valor</TableHead>
                    <TableHead className="whitespace-nowrap">Motivo</TableHead>
                    <TableHead className="whitespace-nowrap">Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(6).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Trash2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        Sin bajas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(b.fecha_baja)}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{b.activo_codigo}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{b.activo_nombre}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(b.activo_valor)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className="bg-red-100 text-red-800 border-0 text-xs">{b.motivo}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{b.descripcion || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Baja de Activo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Activo *</Label>
                <Select value={form.activo_id} onValueChange={v => setForm(f => ({ ...f, activo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar activo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {activosActivos.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v as MotivoBaja }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Baja</Label>
                <Input type="date" value={form.fecha_baja} onChange={e => setForm(f => ({ ...f, fecha_baja: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Detalles sobre la baja del activo..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {saving ? 'Guardando...' : 'Registrar Baja'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
