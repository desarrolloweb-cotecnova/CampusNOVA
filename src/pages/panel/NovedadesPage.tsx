import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, Download, AlertTriangle, Image, Upload, X } from 'lucide-react';
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
import type { NovedadIncidente, EspacioFisico, EstadoNovedad } from '@/types/types';
import { getEstadoColor, formatDateTime, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { toast } from 'sonner';

const CLOUDINARY_CLOUD = 'drqfuh66o';
const CLOUDINARY_PRESET = 'campusnova';

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Error al subir imagen');
  const data = await res.json();
  return data.secure_url as string;
}

const ESTADOS: EstadoNovedad[] = ['Recibido', 'En revisión', 'En gestión', 'Resuelto', 'Cerrado'];

export default function NovedadesPage() {
  const [novedades, setNovedades] = useState<NovedadIncidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [selectedNovedad, setSelectedNovedad] = useState<NovedadIncidente | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [seguimiento, setSeguimiento] = useState('');
  const [newEstado, setNewEstado] = useState<EstadoNovedad>('En gestión');
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [uploadingEvidencia, setUploadingEvidencia] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('novedades_incidentes')
      .select('*, espacio:espacios_fisicos(id,nombre,sede)')
      .order('created_at', { ascending: false });
    setNovedades(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresca el listado cuando otro usuario cambia una novedad.
  useRealtimeTable('novedades_incidentes', loadData);

  const tipos = [...new Set(novedades.map(n => n.tipo_novedad))];

  const filtered = novedades.filter(n => {
    const s = search.toLowerCase();
    const matchSearch = !search || [n.numero_radicado, n.nombre_reportante, n.tipo_novedad, (n.espacio as EspacioFisico)?.nombre].some(f => f?.toLowerCase().includes(s));
    const matchEst = filterEstado === 'all' || n.estado === filterEstado;
    const matchTipo = filterTipo === 'all' || n.tipo_novedad === filterTipo;
    return matchSearch && matchEst && matchTipo;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const openDetail = (n: NovedadIncidente) => {
    setSelectedNovedad(n);
    setNewEstado(n.estado);
    setSeguimiento('');
    setEvidenciaUrl((n as NovedadIncidente & { foto_evidencia_url?: string }).foto_evidencia_url || '');
    setDetailOpen(true);
  };

  const handleUploadEvidencia = async (file: File) => {
    setUploadingEvidencia(true);
    try {
      const url = await uploadToCloudinary(file);
      setEvidenciaUrl(url);
      toast.success('Imagen de evidencia cargada');
    } catch {
      toast.error('Error al subir imagen de evidencia');
    } finally {
      setUploadingEvidencia(false);
    }
  };

  const handleUpdateEstado = async () => {
    if (!selectedNovedad) return;
    if (!seguimiento.trim()) { toast.error('Describe la acción tomada en el seguimiento'); return; }
    setUpdatingEstado(true);
    const estadoAnterior = selectedNovedad.estado;

    const updatePayload: Record<string, unknown> = { estado: newEstado };
    if (newEstado === 'Cerrado' && evidenciaUrl) {
      updatePayload.foto_evidencia_url = evidenciaUrl;
    }

    const { error: updErr } = await supabase
      .from('novedades_incidentes')
      .update(updatePayload)
      .eq('id', selectedNovedad.id);

    if (!updErr) {
      await supabase.from('seguimiento_novedades').insert({
        novedad_id: selectedNovedad.id,
        estado_anterior: estadoAnterior,
        estado_nuevo: newEstado,
        descripcion: seguimiento,
      });
    }

    setUpdatingEstado(false);
    if (updErr) { toast.error('Error al actualizar estado'); return; }
    toast.success('Estado actualizado');

    if (selectedNovedad.correo_reportante) {
      supabase.functions.invoke('send-notification', {
        body: {
          tipo: 'novedad_actualizada',
          destinatario: selectedNovedad.correo_reportante,
          nombre: selectedNovedad.nombre_reportante,
          data: { numero_radicado: selectedNovedad.numero_radicado, tipo_novedad: selectedNovedad.tipo_novedad, nuevo_estado: newEstado, comentario: seguimiento },
        },
      }).catch(console.error);
    }

    setDetailOpen(false);
    loadData();
  };

  const countByEstado = (e: string) => novedades.filter(n => n.estado === e).length;

  const handleExport = () => {
    exportToExcel(filtered.map(n => ({
      Radicado: n.numero_radicado,
      Reportante: n.nombre_reportante,
      Tipo: n.tipo_novedad,
      Estado: n.estado,
      Espacio: (n.espacio as EspacioFisico)?.nombre || n.espacio_nombre || '',
      Fecha: formatDate(n.created_at),
    })), 'novedades_incidentes', 'Novedades');
    toast.success('Excel exportado');
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: novedades.length, color: 'text-foreground' },
            { label: 'Recibidas', value: countByEstado('Recibido'), color: 'text-muted-foreground' },
            { label: 'En gestión', value: countByEstado('En gestión') + countByEstado('En revisión'), color: 'text-secondary' },
            { label: 'Resueltas', value: countByEstado('Resuelto'), color: 'text-green-600' },
            { label: 'Cerradas', value: countByEstado('Cerrado'), color: 'text-muted-foreground' },
          ].map(s => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4">
                <p className={`text-xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
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
                <Input placeholder="Buscar novedades..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={filterEstado} onValueChange={v => { setFilterEstado(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={v => { setFilterTipo(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
            <CardTitle className="text-base">Novedades e Incidentes ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Radicado</TableHead>
                    <TableHead className="whitespace-nowrap">Reportante</TableHead>
                    <TableHead className="whitespace-nowrap">Teléfono</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Espacio</TableHead>
                    <TableHead className="whitespace-nowrap">Foto</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
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
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No se encontraron novedades
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{n.numero_radicado}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{n.nombre_reportante}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {(n as NovedadIncidente & { telefono_reportante?: string }).telefono_reportante || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm max-w-[160px] truncate">{n.tipo_novedad}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {(n.espacio as EspacioFisico)?.nombre || n.espacio_nombre || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {n.foto_url ? (
                            <a href={n.foto_url} target="_blank" rel="noopener noreferrer">
                              <img src={n.foto_url} alt="Novedad" className="h-9 w-9 rounded object-cover border border-border hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                              <Image className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={`${getEstadoColor(n.estado)} border-0 text-xs`}>{n.estado}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(n.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(n)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Ver
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
        {selectedNovedad && (
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novedad {selectedNovedad.numero_radicado}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Reportante</p><p className="font-medium">{selectedNovedad.nombre_reportante}</p></div>
                  <div><p className="text-muted-foreground text-xs">Correo</p><p className="font-medium">{selectedNovedad.correo_reportante}</p></div>
                  <div><p className="text-muted-foreground text-xs">Teléfono / Celular</p><p className="font-medium">{(selectedNovedad as NovedadIncidente & { telefono_reportante?: string }).telefono_reportante || <span className="text-muted-foreground">No registrado</span>}</p></div>
                  <div><p className="text-muted-foreground text-xs">Rol</p><p className="font-medium">{selectedNovedad.rol_reportante}</p></div>
                  <div><p className="text-muted-foreground text-xs">Tipo</p><p className="font-medium">{selectedNovedad.tipo_novedad}</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground text-xs">Espacio</p><p className="font-medium">{(selectedNovedad.espacio as EspacioFisico)?.nombre || selectedNovedad.espacio_nombre || '—'}</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground text-xs">Descripción</p><p className="font-medium text-pretty">{selectedNovedad.descripcion}</p></div>
                  <div><p className="text-muted-foreground text-xs">Estado actual</p><Badge className={`${getEstadoColor(selectedNovedad.estado)} border-0 mt-1`}>{selectedNovedad.estado}</Badge></div>
                  <div><p className="text-muted-foreground text-xs">Fecha</p><p className="font-medium">{formatDateTime(selectedNovedad.created_at)}</p></div>
                </div>

                {/* Foto del reporte */}
                {selectedNovedad.foto_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Foto del reportante</p>
                    <a href={selectedNovedad.foto_url} target="_blank" rel="noopener noreferrer">
                      <img src={selectedNovedad.foto_url} alt="Novedad" className="w-full max-h-52 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity cursor-pointer" />
                    </a>
                  </div>
                )}

                {/* Evidencia de cierre */}
                {(newEstado === 'Cerrado' || selectedNovedad.estado === 'Cerrado') && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Imagen de evidencia (trabajo realizado)</p>
                    {evidenciaUrl ? (
                      <div className="relative">
                        <img src={evidenciaUrl} alt="Evidencia" className="w-full max-h-40 object-cover rounded-lg border border-border" />
                        {selectedNovedad.estado !== 'Cerrado' && (
                          <button onClick={() => setEvidenciaUrl('')} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadEvidencia(f); e.target.value = ''; }} />
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{uploadingEvidencia ? 'Subiendo...' : 'Subir imagen de evidencia'}</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="font-semibold text-sm">Actualizar Estado</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nuevo Estado</Label>
                    <Select value={newEstado} onValueChange={v => setNewEstado(v as EstadoNovedad)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descripción del seguimiento *</Label>
                    <Textarea value={seguimiento} onChange={e => setSeguimiento(e.target.value)} rows={3} placeholder="Describe las acciones tomadas..." />
                  </div>
                  <Button onClick={handleUpdateEstado} disabled={updatingEstado} className="w-full">
                    {updatingEstado ? 'Actualizando...' : 'Guardar Seguimiento'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
