import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Download, Edit, Trash2, Upload,
  Package, TrendingDown, AlertCircle, ChevronDown, ChevronRight, Image, FileUp,
  LayoutGrid, List, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import type { ActivoFijo, EspacioFisico, EstadoActivo } from '@/types/types';
import { formatCurrency, formatDate, getEstadoColor } from '@/lib/utils';
import { fetchAllRows } from '@/lib/supabase-fetch';
import { exportToExcel, exportToPDF } from '@/lib/export';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const CLOUDINARY_CLOUD = 'drqfuh66o';
const CLOUDINARY_PRESET = 'campusnova';

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Error al subir imagen');
  const data = await res.json();
  return data.secure_url as string;
}

// Fallback estático mientras carga DB
const ESTADOS_FALLBACK: string[] = ['En funcionamiento', 'Daño parcial', 'Dado de baja', 'En reparación'];

interface ActivoFormData {
  codigo: string;
  nombre: string;
  valor: string;
  fecha_adquisicion: string;
  factura: string;
  iva: string;
  depreciable: boolean;
  tiempo_depreciacion: string;
  estado: EstadoActivo;
  espacio_id: string;
  categoria: string;
  responsable: string;
  proveedor: string;
  observaciones: string;
  foto_url: string;
}

const INITIAL_FORM: ActivoFormData = {
  codigo: '', nombre: '', valor: '', fecha_adquisicion: '', factura: '', iva: '19',
  depreciable: true, tiempo_depreciacion: '5', estado: 'En funcionamiento',
  espacio_id: 'none', categoria: '', responsable: '', proveedor: '', observaciones: '', foto_url: '',
};

export default function ActivosFijosPage() {
  const [activos, setActivos] = useState<ActivoFijo[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>(ESTADOS_FALLBACK);
  const [responsables, setResponsables] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterEspacio, setFilterEspacio] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivo, setEditingActivo] = useState<ActivoFijo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivoFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);
  const PER_PAGE = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: activosData }, { data: espaciosData }, { data: catsData }, { data: estadosData }, { data: respData }, { data: provData }] = await Promise.all([
      // Paginado: el inventario supera las 1.000 filas que devuelve PostgREST por respuesta.
      fetchAllRows<ActivoFijo>(() =>
        supabase.from('activos_fijos')
          .select('*, espacio:espacios_fisicos(id,nombre,sede,bloque)')
          .eq('dado_de_baja', false)
          .order('created_at', { ascending: false })
          .order('id')
      ),
      fetchAllRows(() =>
        supabase.from('espacios_fisicos').select('id,nombre,sede,bloque').order('nombre').order('id')
      ),
      supabase.from('categorias_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('estados_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('responsables_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('proveedores_activos').select('nombre').eq('activo', true).order('nombre'),
    ]);
    setActivos(Array.isArray(activosData) ? activosData : []);
    setEspacios(Array.isArray(espaciosData) ? espaciosData as unknown as EspacioFisico[] : []);
    setCategorias(Array.isArray(catsData) ? catsData.map(c => c.nombre) : []);
    setEstados(Array.isArray(estadosData) && estadosData.length > 0 ? estadosData.map(e => e.nombre) : ESTADOS_FALLBACK);
    setResponsables(Array.isArray(respData) ? respData.map(r => r.nombre) : []);
    setProveedores(Array.isArray(provData) ? provData.map(p => p.nombre) : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresca cuando otro usuario cambia los datos, sin recargar la pantalla.
  useRealtimeTable(['activos_fijos', 'espacios_fisicos', 'categorias_activos', 'estados_activos', 'responsables_activos', 'proveedores_activos'], loadData);

  const filtered = activos.filter(a => {
    const matchSearch = !searchTerm || [a.codigo, a.nombre, a.categoria, a.responsable].some(
      f => f?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchEstado = filterEstado === 'all' || a.estado === filterEstado;
    const matchCat = filterCategoria === 'all' || a.categoria === filterCategoria;
    const matchEsp = filterEspacio === 'all' || a.espacio_id === filterEspacio;
    return matchSearch && matchEstado && matchCat && matchEsp;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Grouped by space
  const groupedBySpace = espacios.map(esp => ({
    espacio: esp,
    activos: filtered.filter(a => a.espacio_id === esp.id),
  })).filter(g => g.activos.length > 0);
  const sinEspacio = filtered.filter(a => !a.espacio_id);

  const toggleSpace = (id: string) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditingActivo(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (activo: ActivoFijo) => {
    setEditingActivo(activo);
    setForm({
      codigo: activo.codigo, nombre: activo.nombre, valor: String(activo.valor),
      fecha_adquisicion: activo.fecha_adquisicion?.slice(0, 10) || '',
      factura: activo.factura || '', iva: String(activo.iva),
      depreciable: activo.depreciable, tiempo_depreciacion: String(activo.tiempo_depreciacion || ''),
      estado: activo.estado, espacio_id: activo.espacio_id || 'none',
      categoria: activo.categoria, responsable: activo.responsable || '',
      proveedor: activo.proveedor || '', observaciones: activo.observaciones || '',
      foto_url: (activo as ActivoFijo & { foto_url?: string }).foto_url || '',
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, foto_url: url }));
      toast.success('Imagen cargada');
    } catch {
      toast.error('Error al cargar la imagen');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (!rows.length) { toast.error('El archivo Excel está vacío'); return; }

      const records = rows.map(r => ({
        codigo: String(r['Código'] || r['codigo'] || '').trim(),
        nombre: String(r['Nombre'] || r['nombre'] || '').trim(),
        categoria: String(r['Categoría'] || r['Categoria'] || r['categoria'] || '').trim(),
        estado: (r['Estado'] || r['estado'] || 'En funcionamiento') as EstadoActivo,
        valor: parseFloat(String(r['Valor'] || r['valor'] || '0')) || 0,
        fecha_adquisicion: r['Fecha Adquisición'] || r['fecha_adquisicion'] || null,
        factura: r['Factura'] || r['factura'] || null,
        responsable: r['Responsable'] || r['responsable'] || null,
        proveedor: r['Proveedor'] || r['proveedor'] || null,
        observaciones: r['Observaciones'] || r['observaciones'] || null,
        depreciable: String(r['Depreciable'] || '').toLowerCase() === 'si',
        iva: parseFloat(String(r['IVA'] || r['iva'] || '19')) || 19,
        dado_de_baja: false,
      })).filter(r => r.codigo && r.nombre && r.categoria);

      if (!records.length) {
        toast.error('No se encontraron filas válidas. Verifica que el Excel tenga columnas: Código, Nombre, Categoría');
        return;
      }

      const { error } = await supabase.from('activos_fijos').insert(records);
      if (error) {
        toast.error('Error al importar: ' + (error.message.includes('duplicate') ? 'Hay códigos duplicados en el archivo' : error.message));
        return;
      }
      toast.success(`${records.length} activo(s) importados exitosamente`);
      loadData();
    } catch {
      toast.error('Error al leer el archivo Excel');
    }
  };

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.categoria.trim()) {
      toast.error('Código, nombre y categoría son obligatorios');
      return;
    }
    setSaving(true);
    const payload = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      valor: parseFloat(form.valor) || 0,
      fecha_adquisicion: form.fecha_adquisicion || null,
      factura: form.factura || null,
      iva: parseFloat(form.iva) || 0,
      depreciable: form.depreciable,
      tiempo_depreciacion: form.depreciable ? (parseInt(form.tiempo_depreciacion) || null) : null,
      estado: form.estado,
      espacio_id: form.espacio_id === 'none' ? null : form.espacio_id,
      categoria: form.categoria,
      responsable: form.responsable || null,
      proveedor: form.proveedor || null,
      observaciones: form.observaciones || null,
      foto_url: form.foto_url || null,
    };
    let error;
    if (editingActivo) {
      ({ error } = await supabase.from('activos_fijos').update(payload).eq('id', editingActivo.id));
    } else {
      ({ error } = await supabase.from('activos_fijos').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error('Error al guardar el activo: ' + error.message); return; }
    toast.success(editingActivo ? 'Activo actualizado' : 'Activo registrado exitosamente');
    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('activos_fijos').update({ dado_de_baja: true }).eq('id', deleteId);
    if (error) { toast.error('Error al dar de baja el activo'); return; }
    toast.success('Activo dado de baja');
    setDeleteId(null);
    loadData();
  };

  const handleExportExcel = () => {
    const rows = filtered.map(a => ({
      Código: a.codigo, Nombre: a.nombre, Categoría: a.categoria,
      Estado: a.estado, Valor: a.valor,
      'Fecha Adquisición': formatDate(a.fecha_adquisicion),
      Espacio: (a.espacio as EspacioFisico)?.nombre || '',
      Responsable: a.responsable || '',
    }));
    exportToExcel(rows, 'activos_fijos', 'Activos Fijos');
    toast.success('Excel exportado');
  };

  const handleExportPDF = () => {
    exportToPDF(
      'Inventario de Activos Fijos',
      ['Código', 'Nombre', 'Categoría', 'Estado', 'Valor', 'Espacio'],
      filtered.map(a => [
        a.codigo, a.nombre, a.categoria, a.estado,
        formatCurrency(a.valor),
        (a.espacio as EspacioFisico)?.nombre || '',
      ] as (string | number)[]),
      'activos_fijos'
    );
    toast.success('PDF exportado');
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Activos', value: activos.length, icon: Package, color: 'text-primary' },
            { label: 'En Funcionamiento', value: activos.filter(a => a.estado === 'En funcionamiento').length, icon: Package, color: 'text-green-600' },
            { label: 'En Reparación', value: activos.filter(a => a.estado === 'En reparación').length, icon: AlertCircle, color: 'text-yellow-600' },
            { label: 'Con Depreciación', value: activos.filter(a => a.depreciable).length, icon: TrendingDown, color: 'text-secondary' },
          ].map(s => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4">
                <div className={`p-2 rounded-lg bg-muted w-fit mb-2`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters — Fila 1: buscar + filtros */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            {/* Fila 1 */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar activo fijo..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={filterEspacio} onValueChange={v => { setFilterEspacio(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Todos los espacios" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los espacios</SelectItem>
                  {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEstado} onValueChange={v => { setFilterEstado(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategoria} onValueChange={v => { setFilterCategoria(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Fila 2 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              {/* Toggle vista */}
              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40 shrink-0 w-fit">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm" className="h-8 px-2.5 gap-1.5"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="text-xs">Tarjetas</span>
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm" className="h-8 px-2.5 gap-1.5"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="text-xs">Tabla</span>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                <Button variant="outline" size="sm" className="h-9 flex-1 md:flex-none" onClick={() => importRef.current?.click()}>
                  <FileUp className="h-3.5 w-3.5 mr-1.5" /> Importar
                </Button>
                <Button variant="outline" size="sm" className="h-9 flex-1 md:flex-none" onClick={handleExportExcel}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar Excel
                </Button>
                <Button variant="outline" size="sm" className="h-9 flex-1 md:flex-none" onClick={handleExportPDF}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Exportar PDF
                </Button>
                <Button className="h-9 flex-1 md:flex-none" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1.5" /> Registrar Activo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARDS VIEW */}
        {viewMode === 'cards' ? (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i} className="shadow-card">
                  <div className="aspect-[4/3] bg-muted animate-pulse" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No se encontraron activos
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map(activo => (
                <Card key={activo.id} className="h-full flex flex-col overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    {(activo as ActivoFijo & { foto_url?: string }).foto_url ? (
                      <img src={(activo as ActivoFijo & { foto_url?: string }).foto_url} alt={activo.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <CardContent className="flex-1 flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm text-balance flex-1">{activo.nombre}</h3>
                      <Badge className={`${getEstadoColor(activo.estado)} border-0 text-xs shrink-0`}>{activo.estado}</Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mb-1">{activo.codigo}</p>
                    <p className="text-xs text-muted-foreground mb-3">{activo.categoria}</p>
                    {(activo.espacio as EspacioFisico)?.nombre && (
                      <p className="text-xs text-muted-foreground mb-2">{(activo.espacio as EspacioFisico).nombre}</p>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(activo)}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(activo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
        /* TABLE VIEW */
        <Card className="shadow-card min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-balance">Inventario ({filtered.length} activos)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <ActivosTable activos={paginated} onEdit={openEdit} onDelete={setDeleteId} loading={loading} colSpan={8} />
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
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingActivo ? 'Editar Activo' : 'Registrar Nuevo Activo'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={form.codigo}
                  maxLength={5}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setForm(f => ({ ...f, codigo: v }));
                  }}
                  placeholder="Ej: 00123"
                />
                <p className="text-xs text-muted-foreground">Solo números, máximo 5 dígitos</p>
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del activo" />
              </div>
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as EstadoActivo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor ($)</Label>
                <Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>IVA (%)</Label>
                <Input type="number" value={form.iva} onChange={e => setForm(f => ({ ...f, iva: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Adquisición</Label>
                <Input type="date" value={form.fecha_adquisicion} onChange={e => setForm(f => ({ ...f, fecha_adquisicion: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>No. Factura</Label>
                <Input value={form.factura} onChange={e => setForm(f => ({ ...f, factura: e.target.value }))} placeholder="FAC-001" />
              </div>
              <div className="space-y-2">
                <Label>Espacio Asignado</Label>
                <Select value={form.espacio_id} onValueChange={v => setForm(f => ({ ...f, espacio_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} — {e.sede}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={form.responsable} onValueChange={v => setForm(f => ({ ...f, responsable: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                  <SelectContent>
                    {responsables.length === 0
                      ? <SelectItem value="-" disabled>Sin responsables registrados</SelectItem>
                      : responsables.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={form.proveedor} onValueChange={v => setForm(f => ({ ...f, proveedor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {proveedores.length === 0
                      ? <SelectItem value="-" disabled>Sin proveedores registrados</SelectItem>
                      : proveedores.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={form.depreciable}
                  onCheckedChange={v => setForm(f => ({ ...f, depreciable: v }))}
                />
                <Label>¿Es depreciable?</Label>
              </div>
              {form.depreciable && (
                <div className="space-y-2">
                  <Label>Tiempo de Depreciación (años)</Label>
                  <Input type="number" value={form.tiempo_depreciacion} onChange={e => setForm(f => ({ ...f, tiempo_depreciacion: e.target.value }))} />
                </div>
              )}
              {/* Imagen del activo */}
              <div className="md:col-span-2 space-y-2">
                <Label>Imagen del activo</Label>
                <div className="flex items-center gap-3">
                  {form.foto_url ? (
                    <div className="relative">
                      <img src={form.foto_url} alt="Activo" className="h-20 w-20 object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, foto_url: '' }))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center"
                      >×</button>
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={uploadingImg} asChild>
                        <span>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · máx 10 MB</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={3}
                  placeholder="Anotar referencias, marcas, componentes entre otros datos relevantes para identificar el activo." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingActivo ? 'Actualizar' : 'Registrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Dar de baja este activo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción marcará el activo como "dado de baja". El registro se conserva para auditoría.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Dar de baja
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

// ─── Shared sub-component ────────────────────────────────────────────────────
function ActivosTable({
  activos,
  onEdit,
  onDelete,
  loading = false,
  colSpan = 6,
}: {
  activos: ActivoFijo[];
  onEdit: (a: ActivoFijo) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  colSpan?: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Foto</TableHead>
          <TableHead className="whitespace-nowrap">Código</TableHead>
          <TableHead className="whitespace-nowrap">Nombre</TableHead>
          <TableHead className="whitespace-nowrap">Categoría</TableHead>
          <TableHead className="whitespace-nowrap">Estado</TableHead>
          <TableHead className="whitespace-nowrap">Espacio</TableHead>
          <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <TableRow key={i}>
              {Array(colSpan).fill(0).map((_, j) => (
                <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
              ))}
            </TableRow>
          ))
        ) : activos.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No se encontraron activos
            </TableCell>
          </TableRow>
        ) : (
          activos.map(activo => (
            <TableRow key={activo.id}>
              <TableCell className="whitespace-nowrap">
                {(activo as ActivoFijo & { foto_url?: string }).foto_url ? (
                  <img
                    src={(activo as ActivoFijo & { foto_url?: string }).foto_url}
                    alt={activo.nombre}
                    className="h-9 w-9 rounded object-cover border border-border"
                  />
                ) : (
                  <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{activo.codigo}</TableCell>
              <TableCell className="whitespace-nowrap font-medium">{activo.nombre}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{activo.categoria}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge className={`${getEstadoColor(activo.estado)} border-0 text-xs`}>{activo.estado}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {(activo.espacio as EspacioFisico)?.nombre || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(activo)} className="h-8 w-8">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(activo.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
