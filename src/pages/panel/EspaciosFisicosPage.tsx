import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Eye, Edit, Trash2,
  Building2, Users, CheckCircle, AlertTriangle,
  LayoutGrid, List, FileUp, Download, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SpaceImage } from '@/components/ui/space-image';
import { supabase } from '@/db/supabase';
import type { EspacioFisico, EstadoEspacio, TipoEspacio, SedeEspacio, BloqueEspacio } from '@/types/types';
import { getEstadoColor, formatCurrency } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const TIPO_LABELS: Record<string, string> = {
  AUL: 'Aula', LAB: 'Laboratorio', ADM: 'Administrativo', BAÑ: 'Baño',
  BOD: 'Bodega', AUD: 'Auditorio', SAL: 'Sala', PAR: 'Parqueadero',
  CUL: 'Cultural', HOT: 'Hotelería',
};

// Fallbacks estáticos mientras carga DB
const TIPOS_FB = ['AUL', 'LAB', 'ADM', 'BAÑ', 'BOD', 'AUD', 'SAL', 'PAR', 'CUL', 'HOT'];
const SEDES_FB = [{ codigo: 'SP', nombre: 'Sede Principal' }, { codigo: 'SS', nombre: 'Sede Secundaria' }, { codigo: 'SR', nombre: 'Sede Rural' }];
const BLOQUES_FB = [{ codigo: 'BA', nombre: 'Bloque A' }, { codigo: 'BB', nombre: 'Bloque B' }, { codigo: 'BC', nombre: 'Bloque C' }, { codigo: 'BD', nombre: 'Bloque D' }, { codigo: 'NA', nombre: 'N/A' }];
const PISOS_FB = [{ codigo: 'P1', nombre: 'Piso 1' }, { codigo: 'P2', nombre: 'Piso 2' }];
const ESTADOS_FB = ['Bueno', 'Regular', 'Requiere intervención'];

interface EspacioForm {
  codigo: string; nombre: string; sede: SedeEspacio; bloque: BloqueEspacio;
  piso: string; tipo: TipoEspacio; largo_m: string; ancho_m: string;
  capacidad_personas: string;
  instalaciones_electricas: boolean; instalaciones_hidraulicas: boolean;
  instalaciones_sanitarias: boolean; instalaciones_gas: boolean;
  instalaciones_internet_telefonia: boolean; instalaciones_seguridad_control: boolean;
  instalaciones_climatizacion: boolean; instalaciones_domotica: boolean;
  instalaciones_pci: boolean; estado: EstadoEspacio;
  habilitado_reserva: boolean; tarifa_alquiler: string;
  descripcion_espacio: string; observaciones: string;
  foto_principal_url: string;
}

const INITIAL_FORM: EspacioForm = {
  codigo: '', nombre: '', sede: '' as SedeEspacio, bloque: '' as BloqueEspacio,
  piso: '', tipo: '' as TipoEspacio, largo_m: '', ancho_m: '',
  capacidad_personas: '',
  instalaciones_electricas: false, instalaciones_hidraulicas: false,
  instalaciones_sanitarias: false, instalaciones_gas: false,
  instalaciones_internet_telefonia: false, instalaciones_seguridad_control: false,
  instalaciones_climatizacion: false, instalaciones_domotica: false,
  instalaciones_pci: false, estado: '' as EstadoEspacio, habilitado_reserva: false,
  tarifa_alquiler: '', descripcion_espacio: '', observaciones: '', foto_principal_url: '',
};

export default function EspaciosFisicosPage() {
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  // Map: espacio_id → nombres de responsables asignados
  const [responsablesMap, setResponsablesMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSede, setFilterSede] = useState('all');
  const [filterBloque, setFilterBloque] = useState('all');
  const [filterPiso, setFilterPiso] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEspacio, setEditingEspacio] = useState<EspacioFisico | null>(null);
  const [form, setForm] = useState<EspacioForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteTarget, setDeleteTarget] = useState<EspacioFisico | null>(null);
  const [deleting, setDeleting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Catálogos dinámicos desde DB
  const [catSedes, setCatSedes] = useState<{ codigo: string; nombre: string }[]>(SEDES_FB);
  const [catBloques, setCatBloques] = useState<{ codigo: string; nombre: string }[]>(BLOQUES_FB);
  const [catTipos, setCatTipos] = useState<{ codigo: string; nombre: string }[]>(
    TIPOS_FB.map(c => ({ codigo: c, nombre: TIPO_LABELS[c] || c }))
  );
  const [catPisos, setCatPisos] = useState<{ codigo: string; nombre: string }[]>(PISOS_FB);
  const [catEstados, setCatEstados] = useState<string[]>(ESTADOS_FB);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: espaciosData },
      { data: sedesData },
      { data: bloquesData },
      { data: tiposData },
      { data: estadosData },
      { data: pisosData },
      { data: asigData },
    ] = await Promise.all([
      supabase.from('espacios_fisicos').select('*').order('nombre'),
      supabase.from('sedes_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('bloques_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('tipos_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('estados_espacios').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('pisos_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('asignaciones_espacios')
        .select('espacio_id, responsable:responsable_id(nombre)')
        .eq('activo', true),
    ]);
    setEspacios(Array.isArray(espaciosData) ? espaciosData : []);
    // Construir mapa espacio_id → [nombres]
    if (Array.isArray(asigData)) {
      const map: Record<string, string[]> = {};
      asigData.forEach((a: { espacio_id: string; responsable: { nombre: string }[] | { nombre: string } | null }) => {
        if (!map[a.espacio_id]) map[a.espacio_id] = [];
        const resp = a.responsable;
        if (Array.isArray(resp)) {
          resp.forEach(r => { if (r?.nombre) map[a.espacio_id].push(r.nombre); });
        } else if (resp?.nombre) {
          map[a.espacio_id].push(resp.nombre);
        }
      });
      setResponsablesMap(map);
    }
    if (Array.isArray(sedesData) && sedesData.length) setCatSedes(sedesData as { codigo: string; nombre: string }[]);
    if (Array.isArray(bloquesData) && bloquesData.length) setCatBloques(bloquesData as { codigo: string; nombre: string }[]);
    if (Array.isArray(tiposData) && tiposData.length) {
      setCatTipos(tiposData);
      tiposData.forEach(t => { TIPO_LABELS[t.codigo] = t.nombre; });
    }
    if (Array.isArray(estadosData) && estadosData.length) setCatEstados(estadosData.map(r => r.nombre));
    if (Array.isArray(pisosData) && pisosData.length) setCatPisos(pisosData as { codigo: string; nombre: string }[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Código sugerido: SedeCode-BloqueCode-PisoCode-### ---
  const codigoPrefijo = useMemo(() => {
    const sede = catSedes.find(s => s.nombre === form.sede);
    const bloque = catBloques.find(b => b.nombre === form.bloque);
    const piso = catPisos.find(p => p.nombre === form.piso || p.codigo === form.piso);
    if (!sede || !bloque || !piso) return '';
    return `${sede.codigo}-${bloque.codigo}-${piso.codigo}`;
  }, [form.sede, form.bloque, form.piso, catSedes, catBloques, catPisos]);

  // Auto-rellenar código al abrir o al cambiar sede/bloque/piso (solo en nuevo espacio)
  useEffect(() => {
    if (editingEspacio || !dialogOpen || !codigoPrefijo) return;
    const count = espacios.filter(e => e.codigo?.startsWith(codigoPrefijo + '-')).length;
    const seq = String(count + 1).padStart(3, '0');
    setForm(f => ({ ...f, codigo: `${codigoPrefijo}-${seq}` }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoPrefijo, editingEspacio, dialogOpen]);

  const filtered = espacios.filter(e => {
    const matchSearch = !search || [e.codigo, e.nombre, e.uso_actual].some(
      f => f?.toLowerCase().includes(search.toLowerCase())
    );
    const matchSede = filterSede === 'all' || e.sede === filterSede;
    const matchBloque = filterBloque === 'all' || e.bloque === filterBloque;
    const matchPiso = filterPiso === 'all' || (e.piso_nombre || e.piso) === filterPiso;
    const matchTipo = filterTipo === 'all' || e.tipo === filterTipo;
    const matchEst = filterEstado === 'all' || e.estado === filterEstado;
    return matchSearch && matchSede && matchBloque && matchPiso && matchTipo && matchEst;
  }).sort((a, b) => {
    const ca = (a.codigo || '').toLowerCase();
    const cb = (b.codigo || '').toLowerCase();
    return sortDir === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
  });
  const openCreate = () => {
    setEditingEspacio(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (e: EspacioFisico) => {
    setEditingEspacio(e);
    // Normalizar piso: puede estar guardado como código (P1) o nombre (Piso 1) → usar nombre para el Select
    const pisoNombre = catPisos.find(p => p.codigo === e.piso || p.nombre === e.piso)?.nombre || e.piso || '';
    setForm({
      codigo: e.codigo, nombre: e.nombre, sede: e.sede, bloque: e.bloque,
      piso: pisoNombre, tipo: e.tipo,
      largo_m: e.largo_m ? String(e.largo_m) : '',
      ancho_m: e.ancho_m ? String(e.ancho_m) : '',
      capacidad_personas: e.capacidad_personas ? String(e.capacidad_personas) : '',
      instalaciones_electricas: e.instalaciones_electricas ?? false,
      instalaciones_hidraulicas: e.instalaciones_hidraulicas ?? false,
      instalaciones_sanitarias: e.instalaciones_sanitarias ?? false,
      instalaciones_gas: e.instalaciones_gas ?? false,
      instalaciones_internet_telefonia: e.instalaciones_internet_telefonia ?? false,
      instalaciones_seguridad_control: e.instalaciones_seguridad_control ?? false,
      instalaciones_climatizacion: e.instalaciones_climatizacion ?? false,
      instalaciones_domotica: e.instalaciones_domotica ?? false,
      instalaciones_pci: e.instalaciones_pci ?? false,
      estado: e.estado, habilitado_reserva: e.habilitado_reserva,
      tarifa_alquiler: e.tarifa_alquiler ? String(e.tarifa_alquiler) : '',
      descripcion_espacio: e.descripcion_espacio || '',
      observaciones: e.observaciones || '', foto_principal_url: e.foto_principal_url || '',
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) { toast.error('La imagen no puede superar 3MB'); return; }
    setUploadingImg(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setForm(f => ({ ...f, foto_principal_url: url }));
      toast.success('Imagen cargada');
    } catch { toast.error('Error al subir imagen'); }
    setUploadingImg(false);
  };

  const handleExportExcel = () => {
    const rows = filtered.map(e => ({
      Código: e.codigo,
      Nombre: e.nombre,
      Sede: e.sede,
      Bloque: e.bloque,
      Piso: e.piso_nombre || e.piso || '',
      Tipo: TIPO_LABELS[e.tipo] || e.tipo,
      Responsable: (responsablesMap[e.id] || []).join(', ') || '—',
      Estado: e.estado,
      'Capacidad (personas)': e.capacidad_personas ?? '',
      'Área (m²)': e.area_m2 ?? '',
      'Habilitado Reserva': e.habilitado_reserva ? 'Sí' : 'No',
    }));
    exportToExcel(rows, 'espacios_fisicos', 'Espacios Físicos');
    toast.success('Excel exportado');
  };

  const handleExportPDF = () => {
    exportToPDF(
      'Listado de Espacios Físicos',
      ['Código', 'Nombre', 'Sede', 'Bloque', 'Piso', 'Tipo', 'Responsable', 'Estado', 'Cap.', 'Área (m²)', 'Reserva'],
      filtered.map(e => [
        e.codigo,
        e.nombre,
        e.sede,
        e.bloque,
        e.piso_nombre || e.piso || '—',
        TIPO_LABELS[e.tipo] || e.tipo,
        (responsablesMap[e.id] || []).join(', ') || '—',
        e.estado,
        e.capacidad_personas ? `${e.capacidad_personas} p.` : '—',
        e.area_m2 ? `${e.area_m2} m²` : '—',
        e.habilitado_reserva ? 'Sí' : 'No',
      ] as (string | number)[]),
      'espacios_fisicos',
      // Nombre (col 1) y Responsable (col 6) con ancho amplio para wrap en 2 líneas
      { 1: { cellWidth: 40 }, 6: { cellWidth: 38 } }
    );
    toast.success('PDF exportado');
  };

  const handleImportExcel = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    evt.target.value = '';
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (!rows.length) { toast.error('El archivo Excel está vacío'); return; }
      const records = rows.map(r => ({
        codigo: String(r['Código'] || r['codigo'] || '').trim(),
        nombre: String(r['Nombre'] || r['nombre'] || '').trim(),
        sede: (r['Sede'] || r['sede'] || 'Sede Principal') as string,
        bloque: (r['Bloque'] || r['bloque'] || 'Bloque A') as string,
        piso: r['Piso'] || r['piso'] || null,
        tipo: (r['Tipo'] || r['tipo'] || 'AUL') as string,
        uso_actual: r['Uso Actual'] || r['uso_actual'] || null,
        largo_m: r['Largo (m)'] ? parseFloat(r['Largo (m)']) : null,
        ancho_m: r['Ancho (m)'] ? parseFloat(r['Ancho (m)']) : null,
        area_m2: r['Área (m²)'] ? parseFloat(r['Área (m²)']) : null,
        capacidad_personas: r['Cap. Personas'] ? parseInt(r['Cap. Personas']) : null,
        estado: (r['Estado'] || r['estado'] || 'Bueno') as string,
        habilitado_reserva: String(r['Habilitado Reserva'] || '').toLowerCase() === 'sí',
        descripcion_espacio: r['Descripción del Espacio'] || null,
        observaciones: r['Observaciones'] || null,
        fecha_ultima_actualizacion: new Date().toISOString(),
      })).filter(r => r.codigo && r.nombre);
      if (!records.length) { toast.error('No se encontraron filas válidas. Verifica columnas: Código, Nombre'); return; }
      const { error } = await supabase.from('espacios_fisicos').insert(records);
      if (error) {
        toast.error('Error al importar: ' + (error.message.includes('duplicate') ? 'Hay códigos duplicados' : error.message));
        return;
      }
      toast.success(`${records.length} espacio(s) importados exitosamente`);
      loadData();
    } catch { toast.error('Error al leer el archivo Excel'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('espacios_fisicos').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    toast.success('Espacio eliminado');
    setDeleteTarget(null);
    loadData();
  };

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) { toast.error('Código y nombre son obligatorios'); return; }
    const largo = form.largo_m ? parseFloat(form.largo_m) : null;
    const ancho = form.ancho_m ? parseFloat(form.ancho_m) : null;
    const area_m2 = largo && ancho ? parseFloat((largo * ancho).toFixed(2)) : null;
    setSaving(true);
    const payload = {
      codigo: form.codigo, nombre: form.nombre, sede: form.sede, bloque: form.bloque,
      piso: form.piso || null, tipo: form.tipo,
      largo_m: largo, ancho_m: ancho, area_m2,
      capacidad_personas: form.capacidad_personas ? parseInt(form.capacidad_personas) : null,
      instalaciones_electricas: form.instalaciones_electricas,
      instalaciones_hidraulicas: form.instalaciones_hidraulicas,
      instalaciones_sanitarias: form.instalaciones_sanitarias,
      instalaciones_gas: form.instalaciones_gas,
      instalaciones_internet_telefonia: form.instalaciones_internet_telefonia,
      instalaciones_seguridad_control: form.instalaciones_seguridad_control,
      instalaciones_climatizacion: form.instalaciones_climatizacion,
      instalaciones_domotica: form.instalaciones_domotica,
      instalaciones_pci: form.instalaciones_pci,
      estado: form.estado, habilitado_reserva: form.habilitado_reserva,
      tarifa_alquiler: form.tarifa_alquiler ? parseFloat(form.tarifa_alquiler) : null,
      descripcion_espacio: form.descripcion_espacio || null,
      observaciones: form.observaciones || null,
      foto_principal_url: form.foto_principal_url || null,
      fecha_ultima_actualizacion: new Date().toISOString(),
    };
    let error;
    if (editingEspacio) {
      ({ error } = await supabase.from('espacios_fisicos').update(payload).eq('id', editingEspacio.id));
    } else {
      ({ error } = await supabase.from('espacios_fisicos').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success(editingEspacio ? 'Espacio actualizado' : 'Espacio creado');
    setDialogOpen(false);
    loadData();
  };

  const stats = [
    { label: 'Total Espacios', value: espacios.length, color: 'text-primary', icon: Building2 },
    { label: 'En buen estado', value: espacios.filter(e => e.estado === 'Bueno').length, color: 'text-green-600', icon: CheckCircle },
    { label: 'Requieren intervención', value: espacios.filter(e => e.estado === 'Requiere intervención').length, color: 'text-destructive', icon: AlertTriangle },
    { label: 'Habilitados para reserva', value: espacios.filter(e => e.habilitado_reserva).length, color: 'text-secondary', icon: Users },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4">
                <div className="p-2 rounded-lg bg-muted w-fit mb-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Búsqueda */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar espacio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                {/* Sede */}
                <Select value={filterSede} onValueChange={setFilterSede}>
                  <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Sede" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sedes</SelectItem>
                    {catSedes.map(s => <SelectItem key={s.codigo} value={s.nombre}>{s.codigo} — {s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Bloque */}
                <Select value={filterBloque} onValueChange={setFilterBloque}>
                  <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Bloque" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los bloques</SelectItem>
                    {catBloques.map(b => <SelectItem key={b.codigo} value={b.nombre}>{b.codigo} — {b.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Piso */}
                <Select value={filterPiso} onValueChange={setFilterPiso}>
                  <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Piso" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los pisos</SelectItem>
                    {catPisos.map(p => <SelectItem key={p.codigo} value={p.nombre}>{p.codigo} — {p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Tipo */}
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {catTipos.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Estado */}
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {catEstados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                {/* Toggle de vista */}
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40 shrink-0 w-fit">
                  <Button
                    variant={view === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2.5 gap-1.5"
                    onClick={() => setView('grid')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="text-xs">Tarjetas</span>
                  </Button>
                  <Button
                    variant={view === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2.5 gap-1.5"
                    onClick={() => setView('table')}
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
                  <Button className="h-9 flex-1 md:flex-none shrink-0" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1.5" /> Agregar Espacio
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista Tarjetas */}
        {view === 'grid' && (
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
              <CardContent className="text-center py-16 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No se encontraron espacios</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(espacio => (
                <Card key={espacio.id} className="h-full flex flex-col overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#1a6637]">
                    <SpaceImage
                      src={espacio.foto_principal_url}
                      alt={espacio.nombre}
                    />
                  </div>
                  <CardContent className="flex-1 flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm text-balance flex-1">{espacio.nombre}</h3>
                      <Badge className={`${getEstadoColor(espacio.estado)} border-0 text-xs shrink-0`}>
                        {espacio.estado}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {espacio.sede} · {espacio.bloque} · {TIPO_LABELS[espacio.tipo]}
                    </p>
                    {responsablesMap[espacio.id]?.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Users className="h-3 w-3 shrink-0" />
                        <span className="truncate">{responsablesMap[espacio.id].join(', ')}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {espacio.capacidad_personas && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {espacio.capacidad_personas} pers.
                        </span>
                      )}
                      {espacio.area_m2 && <span>{espacio.area_m2} m²</span>}
                      {espacio.habilitado_reserva && (
                        <Badge className="bg-green-100 text-green-800 border-0 text-xs">Reservable</Badge>
                      )}
                    </div>
                    {espacio.tarifa_alquiler && (
                      <p className="text-xs text-secondary font-medium mb-2">
                        Tarifa: {formatCurrency(espacio.tarifa_alquiler)}/día
                      </p>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/panel/espacios/${espacio.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver ficha
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(espacio)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(espacio)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Vista Tabla */}
        {view === 'table' && (
          <Card className="shadow-card min-w-0">
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">
                        <button
                          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                          className="flex items-center gap-1 font-semibold hover:text-foreground transition-colors"
                          title="Ordenar por código"
                        >
                          Código
                          {sortDir === 'asc'
                            ? <span className="text-primary text-xs">↑</span>
                            : <span className="text-primary text-xs">↓</span>}
                        </button>
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Nombre</TableHead>
                      <TableHead className="whitespace-nowrap">Sede</TableHead>
                      <TableHead className="whitespace-nowrap">Bloque</TableHead>
                      <TableHead className="whitespace-nowrap">Piso</TableHead>
                      <TableHead className="whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap">Responsable</TableHead>
                      <TableHead className="whitespace-nowrap">Estado</TableHead>
                      <TableHead className="whitespace-nowrap">Cap.</TableHead>
                      <TableHead className="whitespace-nowrap">Área</TableHead>
                      <TableHead className="whitespace-nowrap">Reserva</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          {Array(10).fill(0).map((__, j) => (
                            <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-16" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No se encontraron espacios</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map(espacio => (
                        <TableRow key={espacio.id}>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{espacio.codigo}</TableCell>
                          <TableCell className="whitespace-nowrap font-medium">{espacio.nombre}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{espacio.sede}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{espacio.bloque}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{espacio.piso_nombre || espacio.piso || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{TIPO_LABELS[espacio.tipo]}</TableCell>
                          <TableCell className="text-sm max-w-[160px] truncate">
                            {responsablesMap[espacio.id]?.join(', ') || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={`${getEstadoColor(espacio.estado)} border-0 text-xs`}>{espacio.estado}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {espacio.capacidad_personas ? `${espacio.capacidad_personas} p.` : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {espacio.area_m2 ? `${espacio.area_m2} m²` : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {espacio.habilitado_reserva
                              ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">Sí</Badge>
                              : <span className="text-xs text-muted-foreground">No</span>
                            }
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => navigate(`/panel/espacios/${espacio.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(espacio)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(espacio)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AlertDialog — Confirmar eliminación */}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar espacio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente <strong>{deleteTarget?.nombre}</strong> ({deleteTarget?.codigo}) y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog — Crear / Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEspacio ? 'Editar Espacio' : 'Registrar Nuevo Espacio'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder={codigoPrefijo ? `${codigoPrefijo}-001` : 'ESP-001'}
                />
                {!editingEspacio && codigoPrefijo && (
                  <p className="text-xs text-muted-foreground">
                    Sugerido: <span className="font-mono font-medium text-foreground">{codigoPrefijo}-###</span> — puedes modificarlo libremente.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sede</Label>
                <Select value={form.sede} onValueChange={v => setForm(f => ({ ...f, sede: v as SedeEspacio }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sede" /></SelectTrigger>
                  <SelectContent>{catSedes.map(s => <SelectItem key={s.codigo} value={s.nombre}>{s.codigo} — {s.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bloque</Label>
                <Select value={form.bloque} onValueChange={v => setForm(f => ({ ...f, bloque: v as BloqueEspacio }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar bloque" /></SelectTrigger>
                  <SelectContent>{catBloques.map(b => <SelectItem key={b.codigo} value={b.nombre}>{b.codigo} — {b.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Piso</Label>
                <Select value={form.piso} onValueChange={v => setForm(f => ({ ...f, piso: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar piso" /></SelectTrigger>
                  <SelectContent>{catPisos.map(p => <SelectItem key={p.codigo} value={p.nombre}>{p.codigo} — {p.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as TipoEspacio }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>{catTipos.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as EstadoEspacio }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                  <SelectContent>{catEstados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {/* Dimensiones → Área auto-calculada */}
              <div className="space-y-2">
                <Label>Largo (m)</Label>
                <Input type="number" value={form.largo_m} onChange={e => setForm(f => ({ ...f, largo_m: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Ancho (m)</Label>
                <Input type="number" value={form.ancho_m} onChange={e => setForm(f => ({ ...f, ancho_m: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Área (m²) — calculada automáticamente</Label>
                <Input
                  readOnly
                  value={form.largo_m && form.ancho_m
                    ? (parseFloat(form.largo_m) * parseFloat(form.ancho_m)).toFixed(2)
                    : ''}
                  placeholder="Se calcula de Largo × Ancho"
                  className="bg-muted/50 text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidad Personas</Label>
                <Input type="number" value={form.capacidad_personas} onChange={e => setForm(f => ({ ...f, capacidad_personas: e.target.value }))} />
              </div>
              {/* Instalaciones Si/No */}
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Instalaciones disponibles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { label: 'Instalaciones Eléctricas', key: 'instalaciones_electricas' },
                    { label: 'Instalaciones Hidráulicas', key: 'instalaciones_hidraulicas' },
                    { label: 'Instalaciones Sanitarias', key: 'instalaciones_sanitarias' },
                    { label: 'Instalaciones de Gas', key: 'instalaciones_gas' },
                    { label: 'Internet y Telefonía', key: 'instalaciones_internet_telefonia' },
                    { label: 'Seguridad y Control', key: 'instalaciones_seguridad_control' },
                    { label: 'Climatización (HVAC)', key: 'instalaciones_climatizacion' },
                    { label: 'Automatización Domótica', key: 'instalaciones_domotica' },
                    { label: 'Protección Contra Incendios (PCI)', key: 'instalaciones_pci' },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between border rounded-lg px-3 py-2">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={!!form[key as keyof typeof form]}
                        onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2">
                <Switch checked={form.habilitado_reserva} onCheckedChange={v => setForm(f => ({ ...f, habilitado_reserva: v }))} />
                <Label>Habilitado para reserva</Label>
              </div>
              {form.habilitado_reserva && (
                <div className="space-y-2">
                  <Label>Tarifa de Alquiler ($/día)</Label>
                  <Input type="number" value={form.tarifa_alquiler} onChange={e => setForm(f => ({ ...f, tarifa_alquiler: e.target.value }))} />
                </div>
              )}
              <div className="md:col-span-2 space-y-2">
                <Label>Descripción del Espacio</Label>
                <Textarea value={form.descripcion_espacio} onChange={e => setForm(f => ({ ...f, descripcion_espacio: e.target.value }))} rows={2} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Foto Principal</Label>
                <div className="flex gap-3 items-center">
                  {form.foto_principal_url && (
                    <img src={form.foto_principal_url} alt="Vista previa" className="h-16 w-24 object-cover rounded" />
                  )}
                  <div>
                    <input
                      type="file" accept="image/*" id="foto-upload"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('foto-upload')?.click()} disabled={uploadingImg}>
                      {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editingEspacio ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
