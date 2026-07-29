// Página Mis Espacios — muestra los espacios asignados al usuario autenticado
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Camera, Edit, Zap, Droplets, MapPin, Users,
  Package, Wrench, Plus, Search, UserCheck, ArrowLeft, ChevronLeft, ChevronRight,
  FileText, Link2, ExternalLink, File, Sheet, Trash2, Eye, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SpaceImage } from '@/components/ui/space-image';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useAuth } from '@/contexts/AuthContext';
import type {
  EspacioFisico, ActivoFijo, Intervencion,
  EstadoEspacio, TipoEspacio, SedeEspacio, BloqueEspacio,
  Profile, AsignacionEspacio, DocumentoEspacio, FotoEspacio,
} from '@/types/types';
import { getEstadoColor, formatDate, formatCurrency } from '@/lib/utils';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { activosDeResponsable, generarActaInventarioPDF } from '@/lib/acta-inventario';
import { PhotoCarousel } from '@/components/common/PhotoCarousel';
import { toast } from 'sonner';

// ── Constantes ──────────────────────────────────────────────────────────────
const TIPOS: TipoEspacio[] = ['AUL', 'LAB', 'ADM', 'BAÑ', 'BOD', 'AUD', 'SAL', 'PAR', 'CUL', 'HOT'];
const SEDES: SedeEspacio[] = ['Sede Principal', 'Sede Secundaria', 'Sede Rural'];
const BLOQUES: BloqueEspacio[] = ['Bloque A', 'Bloque B', 'Bloque C', 'Bloque D', 'N/A'];
const ESTADOS: EstadoEspacio[] = ['Bueno', 'Regular', 'Requiere intervención'];

const TIPO_LABELS: Record<string, string> = {
  AUL: 'Aula', LAB: 'Laboratorio', ADM: 'Administrativo', BAÑ: 'Baño',
  BOD: 'Bodega', AUD: 'Auditorio', SAL: 'Sala', PAR: 'Parqueadero',
  CUL: 'Cultural', HOT: 'Hotelería',
};

// ── Tipos internos ──────────────────────────────────────────────────────────
interface EditForm {
  codigo: string; nombre: string; sede: SedeEspacio; bloque: BloqueEspacio;
  piso: string; tipo: TipoEspacio; largo_m: string; ancho_m: string;
  capacidad_personas: string;
  instalaciones_electricas: boolean; instalaciones_hidraulicas: boolean;
  instalaciones_sanitarias: boolean; instalaciones_gas: boolean;
  instalaciones_internet_telefonia: boolean; instalaciones_seguridad_control: boolean;
  instalaciones_climatizacion: boolean; instalaciones_domotica: boolean;
  instalaciones_pci: boolean;
  estado: EstadoEspacio; habilitado_reserva: boolean; tarifa_alquiler: string;
  descripcion_espacio: string; observaciones: string; foto_principal_url: string;
}

const INITIAL_EDIT: EditForm = {
  codigo: '', nombre: '', sede: 'Sede Principal', bloque: 'Bloque A',
  piso: '1', tipo: 'AUL', largo_m: '', ancho_m: '', capacidad_personas: '',
  instalaciones_electricas: false, instalaciones_hidraulicas: false,
  instalaciones_sanitarias: false, instalaciones_gas: false,
  instalaciones_internet_telefonia: false, instalaciones_seguridad_control: false,
  instalaciones_climatizacion: false, instalaciones_domotica: false,
  instalaciones_pci: false,
  estado: 'Bueno', habilitado_reserva: false, tarifa_alquiler: '',
  descripcion_espacio: '', observaciones: '', foto_principal_url: '',
};

const DOC_TIPOS_MIS = ['PDF', 'Word', 'Excel', 'Plano', 'Imagen', 'Otro'];
const DOC_CATEGORIAS_MIS = ['Planos', 'Escrituras', 'Facturas', 'Manuales', 'Instructivos', 'Contratos', 'General'];

function getDocIconMis(tipo: string) {
  if (tipo === 'PDF') return <FileText className="h-4 w-4 text-red-500" />;
  if (tipo === 'Word') return <File className="h-4 w-4 text-blue-500" />;
  if (tipo === 'Excel') return <Sheet className="h-4 w-4 text-green-600" />;
  if (tipo === 'Plano') return <FileText className="h-4 w-4 text-orange-500" />;
  return <Link2 className="h-4 w-4 text-muted-foreground" />;
}

interface EspacioConDatos {
  espacio: EspacioFisico;
  activos: ActivoFijo[];
  intervenciones: Intervencion[];
  responsables: (AsignacionEspacio & { perfil: Profile })[];
  documentos: DocumentoEspacio[];
  fotos: FotoEspacio[];
}

// ── Componente tarjeta de resumen ───────────────────────────────────────────
function EspacioCard({
  item,
  onSelect,
  onChangeFoto,
}: {
  item: EspacioConDatos;
  onSelect: () => void;
  onChangeFoto: (espacio: EspacioFisico, file: File) => Promise<void>;
}) {
  const { espacio, activos, intervenciones, responsables } = item;
  const fotoRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('La imagen no puede superar 3 MB'); return; }
    setUploadingFoto(true);
    await onChangeFoto(espacio, file);
    setUploadingFoto(false);
    if (fotoRef.current) fotoRef.current.value = '';
  };

  return (
    <Card className="shadow-card flex flex-col overflow-hidden">
      {/* Imagen */}
      <div className="relative aspect-[16/7] bg-[#1a6637] overflow-hidden group shrink-0">
        <SpaceImage src={espacio.foto_principal_url} alt={espacio.nombre} />

        <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {/* Badge estado */}
        <div className="absolute top-2 left-2">
          <Badge className={`${getEstadoColor(espacio.estado)} border-0 text-xs`}>{espacio.estado}</Badge>
        </div>
      </div>
      {/* Info */}
      <CardContent className="flex flex-col flex-1 p-4 gap-3">
        {/* Título */}
        <div>
          <h3 className="font-semibold text-base leading-tight text-balance">{espacio.nombre}</h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{espacio.codigo}</p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{espacio.sede}</span>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{espacio.bloque}</span>
          {espacio.piso && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />Piso {espacio.piso}</span>}
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{TIPO_LABELS[espacio.tipo] || espacio.tipo}</span>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-lg font-bold">{responsables.length}</p>
            <p className="text-xs text-muted-foreground">Responsables</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-lg font-bold">{activos.length}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-lg font-bold">{intervenciones.length}</p>
            <p className="text-xs text-muted-foreground">Intervenciones</p>
          </div>
        </div>

        {/* Instalaciones highlight */}
        <div className="flex flex-wrap gap-1">
          {espacio.instalaciones_electricas && <Badge variant="outline" className="text-xs gap-1"><Zap className="h-2.5 w-2.5" />Eléctricas</Badge>}
          {espacio.instalaciones_internet_telefonia && <Badge variant="outline" className="text-xs">Internet</Badge>}
          {espacio.instalaciones_climatizacion && <Badge variant="outline" className="text-xs">Climatización</Badge>}
          {espacio.instalaciones_hidraulicas && <Badge variant="outline" className="text-xs gap-1"><Droplets className="h-2.5 w-2.5" />Hidráulicas</Badge>}
          {espacio.habilitado_reserva && <Badge className="bg-green-100 text-green-800 border-0 text-xs">Reservable</Badge>}
        </div>

        {/* Botón ver detalles */}
        <Button className="w-full mt-auto gap-2" onClick={onSelect}>
          Ver detalles <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Página principal
// ════════════════════════════════════════════════════════════════════════════
export default function MisEspaciosPage() {
  const { profile: me } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<EspacioConDatos[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EspacioConDatos | null>(null);

  // Catálogos para activos
  const [catCategorias, setCatCategorias] = useState<string[]>([]);
  const [catEstadosActivo, setCatEstadosActivo] = useState<string[]>([]);
  const [catProveedores, setCatProveedores] = useState<{ nombre: string }[]>([]);

  // Dialog editar ficha técnica
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(INITIAL_EDIT);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Acta de inventario del espacio (generación en curso por responsable)
  const [actaLoadingId, setActaLoadingId] = useState<string | null>(null);

  // Dialog nuevo activo
  const [activoDialog, setActivoDialog] = useState(false);
  const [activoForm, setActivoForm] = useState({
    codigo: '', nombre: '', categoria: '', estado: 'En funcionamiento',
    responsable: '', proveedor: 'Sin proveedor asignado', observaciones: '',
  });
  const [savingActivo, setSavingActivo] = useState(false);

  // Dialog ver activo (ficha completa)
  const [viewActivoDialog, setViewActivoDialog] = useState(false);
  const [viewingActivo, setViewingActivo] = useState<ActivoFijo | null>(null);

  // Dialog editar activo (ficha completa)
  const [editActivoDialog, setEditActivoDialog] = useState(false);
  const [editingActivo, setEditingActivo] = useState<ActivoFijo | null>(null);
  const [editActivoForm, setEditActivoForm] = useState({
    codigo: '', nombre: '', valor: '', fecha_adquisicion: '', factura: '',
    iva: '19', depreciable: true, tiempo_depreciacion: '5',
    estado: 'En funcionamiento' as ActivoFijo['estado'],
    categoria: '', responsable: '', proveedor: '', observaciones: '',
  });
  const [savingEditActivo, setSavingEditActivo] = useState(false);
  const [catResponsablesActivos, setCatResponsablesActivos] = useState<string[]>([]);

  // Dialog nueva intervención
  const [intervDialog, setIntervDialog] = useState(false);
  const [intervForm, setIntervForm] = useState({
    tipo: 'Mantenimiento preventivo' as Intervencion['tipo'],
    descripcion_problema: '', justificacion: '', area_solicitante: '',
    prioridad: 'Media' as Intervencion['prioridad'],
    fecha_solicitud: new Date().toISOString().split('T')[0],
    evidencia_foto_url: '',
  });
  const [savingInterv, setSavingInterv] = useState(false);
  const [uploadingIntervImg, setUploadingIntervImg] = useState(false);

  // Dialog vincular documento
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({ nombre: '', descripcion: '', tipo: 'PDF', categoria: 'General', url: '' });
  const [savingDoc, setSavingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Fotos galería — estado y refs para la vista de detalle
  const fotosDetailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!me?.id) return;
    setLoading(true);

    // 1. Obtener espacios asignados al usuario
    const { data: asigs } = await supabase
      .from('asignaciones_espacios')
      .select('espacio_id')
      .eq('responsable_id', me.id)
      .eq('activo', true);

    const espacioIds = (asigs ?? []).map(a => a.espacio_id as string);

    if (espacioIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // 2. Cargar todos los datos en paralelo
    const [
      { data: espaciosData },
      { data: activosData },
      { data: intervData },
      { data: asigData },
      { data: perfilesData },
      { data: catData },
      { data: estadosData },
      { data: provData },
      { data: docsData },
      { data: respActivosData },
      { data: fotosData },
    ] = await Promise.all([
      supabase.from('espacios_fisicos').select('*').in('id', espacioIds).order('codigo'),
      supabase.from('activos_fijos').select('*').in('espacio_id', espacioIds).eq('dado_de_baja', false),
      supabase.from('intervenciones').select('*').in('espacio_id', espacioIds).order('created_at', { ascending: false }),
      supabase.from('asignaciones_espacios').select('*').in('espacio_id', espacioIds).eq('activo', true),
      supabase.from('profiles').select('*').order('nombre'),
      supabase.from('categorias_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('estados_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('proveedores_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('documentos_espacios').select('*').in('espacio_id', espacioIds).order('created_at', { ascending: false }),
      supabase.from('responsables_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('fotos_espacios').select('*').in('espacio_id', espacioIds).order('orden').order('created_at'),
    ]);

    const espacios: EspacioFisico[] = Array.isArray(espaciosData) ? espaciosData : [];
    const activos: ActivoFijo[] = Array.isArray(activosData) ? activosData : [];
    const intervenciones: Intervencion[] = Array.isArray(intervData) ? intervData : [];
    const asignaciones: AsignacionEspacio[] = Array.isArray(asigData) ? asigData : [];
    const perfiles: Profile[] = Array.isArray(perfilesData) ? perfilesData : [];
    const documentos: DocumentoEspacio[] = Array.isArray(docsData) ? docsData : [];
    const fotos: FotoEspacio[] = Array.isArray(fotosData) ? fotosData as FotoEspacio[] : [];

    setCatCategorias(Array.isArray(catData) ? catData.map(c => c.nombre) : []);
    setCatEstadosActivo(Array.isArray(estadosData) ? estadosData.map(e => e.nombre) : []);
    setCatProveedores(Array.isArray(provData) ? provData : []);
    setCatResponsablesActivos(Array.isArray(respActivosData) ? respActivosData.map(r => r.nombre) : []);

    const resultado: EspacioConDatos[] = espacios.map(esp => ({
      espacio: esp,
      activos: activos.filter(a => a.espacio_id === esp.id),
      intervenciones: intervenciones.filter(i => i.espacio_id === esp.id),
      responsables: asignaciones
        .filter(a => a.espacio_id === esp.id)
        .map(a => ({ ...a, perfil: perfiles.find(p => p.id === a.responsable_id) as Profile }))
        .filter(a => a.perfil),
      documentos: documentos.filter(d => d.espacio_id === esp.id),
      fotos: fotos.filter(f => f.espacio_id === esp.id),
    }));

    setItems(resultado);

    // Actualizar selected si hay uno abierto
    setSelected(prev => {
      if (!prev) return null;
      return resultado.find(r => r.espacio.id === prev.espacio.id) ?? null;
    });

    setLoading(false);
  }, [me?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresca cuando cambian las intervenciones de los espacios.
  useRealtimeTable('intervenciones', loadData);

  // ── Acta de Inventario del espacio (PDF por responsable) ──────────────────
  // Un acta por espacio y responsable: lista solo los activos que están a su
  // nombre en el espacio abierto. Con varios espacios a cargo se descarga un
  // acta por cada uno para verificar la tenencia espacio por espacio.
  const handleActaInventario = async (perfil: Profile) => {
    if (!selected) return;
    const susActivos = activosDeResponsable(selected.activos, perfil.nombre);
    if (susActivos.length === 0) {
      toast.info('Este responsable no tiene activos fijos a su nombre en este espacio.');
      return;
    }
    setActaLoadingId(perfil.id);
    try {
      await generarActaInventarioPDF({
        responsable: perfil,
        espacios: [selected.espacio],
        activos: susActivos,
        alcance: 'espacio',
      });
      toast.success('Acta de inventario generada');
    } catch (err) {
      toast.error('Error al generar el acta: ' + (err as Error).message);
    } finally {
      setActaLoadingId(null);
    }
  };

  // ── Cambiar foto ──────────────────────────────────────────────────────────
  const handleChangeFoto = async (espacio: EspacioFisico, file: File) => {
    try {
      const url = await uploadImageToCloudinary(file);
      const { error } = await supabase
        .from('espacios_fisicos')
        .update({ foto_principal_url: url, fecha_ultima_actualizacion: new Date().toISOString() })
        .eq('id', espacio.id);
      if (error) throw error;
      toast.success('Foto actualizada');
      loadData();
    } catch { toast.error('Error al subir la foto'); }
  };

  // ── Agregar fotos a galería ────────────────────────────────────────────────
  const handleAgregarFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingFotos(true);
    const currentCount = selected.fotos.length;
    let subidas = 0;
    let primeraUrl: string | null = null;
    for (const file of files) {
      try {
        const url = await uploadImageToCloudinary(file);
        await supabase.from('fotos_espacios').insert({
          espacio_id: selected.espacio.id,
          url,
          orden: currentCount + subidas,
        });
        if (subidas === 0) primeraUrl = url;
        subidas++;
      } catch { toast.error(`Error al subir ${file.name}`); }
    }
    // Si no hay foto principal aún, usar la primera foto subida como portada
    if (primeraUrl && !selected.espacio.foto_principal_url) {
      await supabase
        .from('espacios_fisicos')
        .update({ foto_principal_url: primeraUrl, fecha_ultima_actualizacion: new Date().toISOString() })
        .eq('id', selected.espacio.id);
    }
    setUploadingFotos(false);
    if (fotosDetailInputRef.current) fotosDetailInputRef.current.value = '';
    if (subidas > 0) { toast.success(`${subidas} foto(s) agregada(s)`); loadData(); }
  };

  // ── Eliminar foto de galería ───────────────────────────────────────────────
  const handleEliminarFoto = async (fotoId: string) => {
    const { error } = await supabase.from('fotos_espacios').delete().eq('id', fotoId);
    if (error) { toast.error('Error al eliminar foto'); return; }
    toast.success('Foto eliminada');
    loadData();
  };

  // ── Editar ficha técnica ──────────────────────────────────────────────────
  const openEdit = () => {
    if (!selected) return;
    const e = selected.espacio;
    setEditForm({
      codigo: e.codigo, nombre: e.nombre, sede: e.sede, bloque: e.bloque,
      piso: e.piso || '1', tipo: e.tipo,
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
      observaciones: e.observaciones || '',
      foto_principal_url: e.foto_principal_url || '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    if (!editForm.codigo.trim() || !editForm.nombre.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    const largo = editForm.largo_m ? parseFloat(editForm.largo_m) : null;
    const ancho = editForm.ancho_m ? parseFloat(editForm.ancho_m) : null;
    const area_m2 = largo && ancho ? parseFloat((largo * ancho).toFixed(2)) : null;
    setSaving(true);
    const { error } = await supabase.from('espacios_fisicos').update({
      codigo: editForm.codigo, nombre: editForm.nombre,
      sede: editForm.sede, bloque: editForm.bloque, piso: editForm.piso || null,
      tipo: editForm.tipo, largo_m: largo, ancho_m: ancho, area_m2,
      capacidad_personas: editForm.capacidad_personas ? parseInt(editForm.capacidad_personas) : null,
      instalaciones_electricas: editForm.instalaciones_electricas,
      instalaciones_hidraulicas: editForm.instalaciones_hidraulicas,
      instalaciones_sanitarias: editForm.instalaciones_sanitarias,
      instalaciones_gas: editForm.instalaciones_gas,
      instalaciones_internet_telefonia: editForm.instalaciones_internet_telefonia,
      instalaciones_seguridad_control: editForm.instalaciones_seguridad_control,
      instalaciones_climatizacion: editForm.instalaciones_climatizacion,
      instalaciones_domotica: editForm.instalaciones_domotica,
      instalaciones_pci: editForm.instalaciones_pci,
      estado: editForm.estado, habilitado_reserva: editForm.habilitado_reserva,
      tarifa_alquiler: editForm.tarifa_alquiler ? parseFloat(editForm.tarifa_alquiler) : null,
      descripcion_espacio: editForm.descripcion_espacio || null,
      observaciones: editForm.observaciones || null,
      foto_principal_url: editForm.foto_principal_url || null,
      fecha_ultima_actualizacion: new Date().toISOString(),
    }).eq('id', selected.espacio.id);
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Espacio actualizado');
    setEditOpen(false);
    loadData();
  };

  // ── Nuevo activo ──────────────────────────────────────────────────────────
  const openNuevoActivo = () => {
    // Pre-seleccionar el primer responsable del espacio como valor por defecto
    const primerResponsable = selected?.responsables[0]?.perfil?.nombre ?? '';
    setActivoForm({
      codigo: '', nombre: '', categoria: '', estado: 'En funcionamiento',
      responsable: primerResponsable, proveedor: 'Sin proveedor asignado', observaciones: '',
    });
    setActivoDialog(true);
  };

  const handleGuardarActivo = async () => {
    if (!selected) return;
    if (!activoForm.codigo.trim() || !activoForm.nombre.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    setSavingActivo(true);
    const { error } = await supabase.from('activos_fijos').insert({
      codigo: activoForm.codigo.trim(),
      nombre: activoForm.nombre.trim(),
      categoria: activoForm.categoria || 'General',
      estado: activoForm.estado,
      valor: 0,
      responsable: activoForm.responsable || null,
      proveedor: activoForm.proveedor || null,
      observaciones: activoForm.observaciones || null,
      espacio_id: selected.espacio.id,
      dado_de_baja: false,
      depreciable: false,
      iva: 0,
    });
    setSavingActivo(false);
    if (error) { toast.error('Error al guardar activo: ' + error.message); return; }
    toast.success('Activo registrado correctamente');
    setActivoDialog(false);
    loadData();
  };

  // ── Ver activo (ficha completa) ───────────────────────────────────────────
  const openVerActivo = (a: ActivoFijo) => {
    setViewingActivo(a);
    setViewActivoDialog(true);
  };

  // ── Editar activo (ficha completa) ────────────────────────────────────────
  const openEditarActivo = (a: ActivoFijo) => {
    setEditingActivo(a);
    setEditActivoForm({
      codigo: a.codigo,
      nombre: a.nombre,
      valor: String(a.valor ?? 0),
      fecha_adquisicion: a.fecha_adquisicion?.slice(0, 10) ?? '',
      factura: a.factura ?? '',
      iva: String(a.iva ?? 19),
      depreciable: a.depreciable ?? false,
      tiempo_depreciacion: String(a.tiempo_depreciacion ?? ''),
      estado: a.estado,
      categoria: a.categoria,
      responsable: a.responsable ?? '',
      proveedor: a.proveedor ?? '',
      observaciones: a.observaciones ?? '',
    });
    setEditActivoDialog(true);
  };

  const handleGuardarEditActivo = async () => {
    if (!editingActivo) return;
    if (!editActivoForm.codigo.trim() || !editActivoForm.nombre.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    setSavingEditActivo(true);
    const { error } = await supabase.from('activos_fijos').update({
      codigo: editActivoForm.codigo.trim(),
      nombre: editActivoForm.nombre.trim(),
      valor: parseFloat(editActivoForm.valor) || 0,
      fecha_adquisicion: editActivoForm.fecha_adquisicion || null,
      factura: editActivoForm.factura || null,
      iva: parseFloat(editActivoForm.iva) || 0,
      depreciable: editActivoForm.depreciable,
      tiempo_depreciacion: editActivoForm.depreciable ? (parseInt(editActivoForm.tiempo_depreciacion) || null) : null,
      estado: editActivoForm.estado,
      categoria: editActivoForm.categoria,
      responsable: editActivoForm.responsable || null,
      proveedor: editActivoForm.proveedor || null,
      observaciones: editActivoForm.observaciones || null,
    }).eq('id', editingActivo.id);
    setSavingEditActivo(false);
    if (error) { toast.error('Error al actualizar activo: ' + error.message); return; }
    toast.success('Activo actualizado correctamente');
    setEditActivoDialog(false);
    loadData();
  };

  // ── Nueva intervención ────────────────────────────────────────────────────
  const openNuevaIntervencion = () => {
    const nombreSolicitante = me?.nombre ?? me?.email ?? '';
    setIntervForm({
      tipo: 'Mantenimiento preventivo',
      descripcion_problema: '', justificacion: '',
      area_solicitante: nombreSolicitante,
      prioridad: 'Media',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      evidencia_foto_url: '',
    });
    setIntervDialog(true);
  };

  const handleUploadIntervImg = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return; }
    setUploadingIntervImg(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setIntervForm(f => ({ ...f, evidencia_foto_url: url }));
      toast.success('Imagen adjuntada');
    } catch { toast.error('Error al subir imagen'); }
    setUploadingIntervImg(false);
  };

  const handleGuardarIntervencion = async () => {
    if (!selected) return;
    if (!intervForm.descripcion_problema.trim()) {
      toast.error('La descripción del problema es obligatoria');
      return;
    }
    setSavingInterv(true);
    const { count } = await supabase
      .from('intervenciones')
      .select('id', { count: 'exact', head: true })
      .eq('espacio_id', selected.espacio.id);
    const seq = String((count || 0) + 1).padStart(3, '0');
    const codigo = `INT-${selected.espacio.codigo}-${seq}`;
    const { error } = await supabase.from('intervenciones').insert({
      codigo,
      espacio_id: selected.espacio.id,
      tipo: intervForm.tipo,
      descripcion_problema: intervForm.descripcion_problema.trim(),
      justificacion: intervForm.justificacion || null,
      area_solicitante: intervForm.area_solicitante || null,
      prioridad: intervForm.prioridad,
      estado: 'Solicitud' as Intervencion['estado'],
      fecha_solicitud: intervForm.fecha_solicitud,
      evidencia_foto_url: intervForm.evidencia_foto_url || null,
    });
    setSavingInterv(false);
    if (error) { toast.error('Error al guardar intervención: ' + error.message); return; }
    toast.success('Intervención registrada correctamente');
    setIntervDialog(false);
    loadData();
  };

  // ── Documentos ────────────────────────────────────────────────────────────
  const openNuevoDoc = () => {
    setDocForm({ nombre: '', descripcion: '', tipo: 'PDF', categoria: 'General', url: '' });
    setDocDialog(true);
  };

  const handleGuardarDoc = async () => {
    if (!selected) return;
    if (!docForm.nombre.trim() || !docForm.url.trim()) {
      toast.error('Nombre y URL son obligatorios');
      return;
    }
    setSavingDoc(true);
    const { error } = await supabase.from('documentos_espacios').insert({
      espacio_id: selected.espacio.id,
      nombre: docForm.nombre.trim(),
      descripcion: docForm.descripcion || null,
      tipo: docForm.tipo,
      categoria: docForm.categoria,
      url: docForm.url.trim(),
    });
    setSavingDoc(false);
    if (error) { toast.error('Error al vincular documento: ' + error.message); return; }
    toast.success('Documento vinculado correctamente');
    setDocDialog(false);
    loadData();
  };

  const handleEliminarDoc = async (docId: string) => {
    setDeletingDocId(docId);
    const { error } = await supabase.from('documentos_espacios').delete().eq('id', docId);
    setDeletingDocId(null);
    if (error) { toast.error('Error al eliminar documento'); return; }
    toast.success('Documento eliminado');
    loadData();
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    const e = item.espacio;
    return (
      (e.codigo || '').toLowerCase().includes(q) ||
      (e.nombre || '').toLowerCase().includes(q) ||
      (e.sede || '').toLowerCase().includes(q) ||
      (e.bloque || '').toLowerCase().includes(q)
    );
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Vista: listado de tarjetas
  // ════════════════════════════════════════════════════════════════════════════
  if (!selected) {
    return (
      <AppLayout>
        <div className="space-y-5">
          {/* Encabezado */}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary shrink-0" />
              Mis Espacios
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Espacios físicos donde eres responsable asignado.
            </p>
          </div>

          {/* Buscador */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código, sede..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                  <div className="aspect-[16/7] bg-muted animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((__, j) => (
                        <div key={j} className="h-14 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                    <div className="h-9 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground font-medium">
                {search ? 'Sin resultados para la búsqueda' : 'No tienes espacios asignados aún'}
              </p>
              {!search && (
                <p className="text-sm text-muted-foreground mt-1">
                  Un administrador debe asignarte como responsable de un espacio.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {filtered.length} espacio{filtered.length !== 1 ? 's' : ''} asignado{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(item => (
                  <EspacioCard
                    key={item.espacio.id}
                    item={item}
                    onSelect={() => setSelected(item)}
                    onChangeFoto={handleChangeFoto}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Vista: detalle del espacio seleccionado
  // ════════════════════════════════════════════════════════════════════════════
  const espacio = selected.espacio;
  const fotoRef2 = { current: null as HTMLInputElement | null };

  const infoFields = [
    { icon: MapPin, label: 'Sede', value: espacio.sede },
    { icon: Building2, label: 'Bloque', value: espacio.bloque },
    { icon: Building2, label: 'Piso', value: espacio.piso || '—' },
    { icon: Building2, label: 'Tipo de Espacio', value: TIPO_LABELS[espacio.tipo] || espacio.tipo },
    { icon: Building2, label: 'Largo', value: espacio.largo_m ? `${espacio.largo_m} m` : '—' },
    { icon: Building2, label: 'Ancho', value: espacio.ancho_m ? `${espacio.ancho_m} m` : '—' },
    { icon: Building2, label: 'Área Total', value: espacio.area_m2 ? `${espacio.area_m2} m²` : '—' },
    { icon: Users, label: 'Capacidad de Personas', value: espacio.capacidad_personas ? String(espacio.capacidad_personas) : '—' },
    { icon: Zap, label: 'Instalaciones Eléctricas', value: espacio.instalaciones_electricas ? 'Sí' : 'No' },
    { icon: Droplets, label: 'Instalaciones Hidráulicas', value: espacio.instalaciones_hidraulicas ? 'Sí' : 'No' },
    { icon: Droplets, label: 'Instalaciones Sanitarias', value: espacio.instalaciones_sanitarias ? 'Sí' : 'No' },
    { icon: Zap, label: 'Instalaciones de Gas', value: espacio.instalaciones_gas ? 'Sí' : 'No' },
    { icon: Zap, label: 'Instalaciones Internet / Telefonía', value: espacio.instalaciones_internet_telefonia ? 'Sí' : 'No' },
    { icon: Zap, label: 'Instalaciones de Seguridad y Control', value: espacio.instalaciones_seguridad_control ? 'Sí' : 'No' },
    { icon: Zap, label: 'Instalaciones de Climatización', value: espacio.instalaciones_climatizacion ? 'Sí' : 'No' },
    { icon: Zap, label: 'Instalaciones de Domótica', value: espacio.instalaciones_domotica ? 'Sí' : 'No' },
    { icon: Zap, label: 'Protección Contra Incendios (PCI)', value: espacio.instalaciones_pci ? 'Sí' : 'No' },
    { icon: Building2, label: 'Habilitado para Reserva', value: espacio.habilitado_reserva ? 'Sí' : 'No' },
  ];

  // Ref via callback para el input de foto en detalle (ya no se usa — sustituido por fotosDetailInputRef)

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        {(() => {
          const curIdx = items.findIndex(i => i.espacio.id === espacio.id);
          const prevItem = curIdx > 0 ? items[curIdx - 1] : null;
          const nextItem = curIdx >= 0 && curIdx < items.length - 1 ? items[curIdx + 1] : null;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} title="Volver al listado">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-balance">{espacio.nombre}</h1>
                <p className="text-sm text-muted-foreground font-mono">{espacio.codigo}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={!prevItem}
                onClick={() => prevItem && setSelected(prevItem)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Ver anterior espacio</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={!nextItem}
                onClick={() => nextItem && setSelected(nextItem)}
              >
                <span className="hidden sm:inline">Ver siguiente espacio</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })()}

        {/* Carrusel de fotos */}
        <div className="space-y-2">
          <PhotoCarousel
            photos={selected.fotos}
            fallbackUrl={espacio.foto_principal_url ?? undefined}
            canDelete
            onDelete={handleEliminarFoto}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={uploadingFotos}
              onClick={() => fotosDetailInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              {uploadingFotos ? 'Subiendo…' : 'Agregar fotos'}
            </Button>
            <span className="text-xs text-muted-foreground">{selected.fotos.length} foto(s) en la galería</span>
          </div>
          <input
            ref={fotosDetailInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAgregarFotos}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ficha">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ficha">Ficha Técnica</TabsTrigger>
            <TabsTrigger value="responsables">
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Responsables ({selected.responsables.length})
            </TabsTrigger>
            <TabsTrigger value="activos">
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Activos ({selected.activos.length})
            </TabsTrigger>
            <TabsTrigger value="intervenciones">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Intervenciones ({selected.intervenciones.length})
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Documentos ({selected.documentos.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Ficha técnica ─────────────────────────────────────────────── */}
          <TabsContent value="ficha">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Información General</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    {infoFields.map(f => (
                      <div key={f.label} className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-muted shrink-0 mt-0.5">
                          <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">{f.label}</dt>
                          <dd className="text-sm font-medium">{f.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <div className="space-y-4">
                {/* Acciones del espacio */}
                <div className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-card px-4 py-3">
                  <Badge className={`${getEstadoColor(espacio.estado)} border-0`}>{espacio.estado}</Badge>
                  {espacio.habilitado_reserva && (
                    <Badge className="bg-green-100 text-green-800 border-0">Reservable</Badge>
                  )}
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={openEdit}>
                    <Edit className="h-3.5 w-3.5" /> Editar ficha
                  </Button>
                </div>
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Descripción del Espacio</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {espacio.descripcion_espacio || 'Sin descripción registrada.'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Información de Reserva</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Habilitado para reserva:</span>
                      {espacio.habilitado_reserva
                        ? <Badge className="bg-green-100 text-green-800 border-0">Sí</Badge>
                        : <Badge variant="outline" className="text-muted-foreground">No</Badge>}
                    </div>
                    {espacio.habilitado_reserva && espacio.tarifa_alquiler && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tarifa alquiler:</span>
                        <span className="font-semibold">{formatCurrency(espacio.tarifa_alquiler)}/día</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {espacio.observaciones || 'Sin observaciones registradas.'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Responsables ──────────────────────────────────────────────── */}
          <TabsContent value="responsables">
            <Card className="shadow-card mt-4">
              <CardHeader>
                <CardTitle className="text-base">Responsables asignados</CardTitle>
              </CardHeader>
              <CardContent>
                {selected.responsables.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay responsables asignados.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.responsables.map(r => {
                      const numActivos = activosDeResponsable(selected.activos, r.perfil.nombre).length;
                      return (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={r.perfil.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {(r.perfil.nombre || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.perfil.nombre || '(sin nombre)'}
                            {r.responsable_id === me?.id && (
                              <Badge className="ml-2 text-xs bg-primary/10 text-primary border-0">Tú</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{r.perfil.cargo || r.perfil.email || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            Desde: {formatDate(r.fecha_asignacion)}
                          </p>
                        </div>
                        <Badge
                          variant={numActivos > 0 ? 'secondary' : 'outline'}
                          className="text-xs shrink-0"
                          title="Activos fijos a nombre de este responsable en este espacio"
                        >
                          {numActivos} activo{numActivos !== 1 ? 's' : ''}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 shrink-0"
                          onClick={() => handleActaInventario(r.perfil)}
                          disabled={actaLoadingId === r.perfil.id || numActivos === 0}
                          title={numActivos === 0
                            ? 'Sin activos fijos a su nombre en este espacio'
                            : 'Descargar el acta de inventario de sus activos fijos en este espacio'}
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">
                            {actaLoadingId === r.perfil.id ? 'Generando…' : 'Acta de inventario'}
                          </span>
                        </Button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Activos ───────────────────────────────────────────────────── */}
          <TabsContent value="activos">
            <Card className="shadow-card min-w-0 mt-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base">Activos fijos en este espacio</CardTitle>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openNuevoActivo}>
                  <Plus className="h-3.5 w-3.5" /> Nuevo activo
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {selected.activos.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin activos registrados en este espacio.</p>
                  </div>
                ) : (
                  (() => {
                    const grupos: Record<string, ActivoFijo[]> = {};
                    selected.activos.forEach(a => {
                      const key = a.responsable?.trim() || 'Sin responsable asignado';
                      if (!grupos[key]) grupos[key] = [];
                      grupos[key].push(a);
                    });
                    return Object.entries(grupos).map(([responsable, items]) => (
                      <div key={responsable} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <h4 className="text-sm font-semibold text-foreground">{responsable}</h4>
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        </div>
                        <div className="w-full overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="whitespace-nowrap">Código</TableHead>
                                <TableHead className="whitespace-nowrap">Nombre</TableHead>
                                <TableHead className="whitespace-nowrap">Categoría</TableHead>
                                <TableHead className="whitespace-nowrap">Estado</TableHead>
                                <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map(a => (
                                <TableRow key={a.id}>
                                  <TableCell className="whitespace-nowrap font-mono text-xs">{a.codigo}</TableCell>
                                  <TableCell className="whitespace-nowrap font-medium">{a.nombre}</TableCell>
                                  <TableCell className="whitespace-nowrap text-sm">{a.categoria}</TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <Badge className={`${getEstadoColor(a.estado)} border-0 text-xs`}>{a.estado}</Badge>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right">
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5"
                                      onClick={() => openVerActivo(a)}>
                                      <Eye className="h-3.5 w-3.5" /> Ver
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Intervenciones ────────────────────────────────────────────── */}
          <TabsContent value="intervenciones">
            <Card className="shadow-card min-w-0 mt-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base">Intervenciones registradas</CardTitle>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openNuevaIntervencion}>
                  <Plus className="h-3.5 w-3.5" /> Nueva intervención
                </Button>
              </CardHeader>
              <CardContent>
                {selected.intervenciones.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin intervenciones registradas en este espacio.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selected.intervenciones.map(i => (
                      <div key={i.id} className="rounded-lg border bg-card p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{i.tipo}</p>
                            <p className="text-xs text-muted-foreground font-mono">{i.codigo}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className={`${getEstadoColor(i.prioridad)} border-0 text-xs`}>{i.prioridad}</Badge>
                            <Badge className={`${getEstadoColor(i.estado)} border-0 text-xs`}>{i.estado}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{i.descripcion_problema}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1 border-t">
                          <div>
                            <span className="text-muted-foreground">Fecha solicitud: </span>
                            <span className="font-medium">{formatDate(i.fecha_solicitud)}</span>
                          </div>
                          {i.area_solicitante && (
                            <div>
                              <span className="text-muted-foreground">Solicitante: </span>
                              <span className="font-medium">{i.area_solicitante}</span>
                            </div>
                          )}
                          {i.justificacion && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Justificación: </span>
                              <span className="font-medium">{i.justificacion}</span>
                            </div>
                          )}
                          {i.costo != null && (
                            <div>
                              <span className="text-muted-foreground">Costo: </span>
                              <span className="font-medium">{formatCurrency(i.costo)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Documentos ──────────────────────────────────────────── */}
          <TabsContent value="documentos">
            <Card className="shadow-card min-w-0 mt-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base">Documentos vinculados</CardTitle>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openNuevoDoc}>
                  <Plus className="h-3.5 w-3.5" /> Vincular documento
                </Button>
              </CardHeader>
              <CardContent>
                {selected.documentos.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay documentos vinculados a este espacio.</p>
                    <p className="text-xs mt-1">Vincula planos, escrituras, manuales u otros documentos.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.documentos.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="shrink-0">{getDocIconMis(doc.tipo)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.nombre}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                            <Badge variant="outline" className="text-xs">{doc.categoria}</Badge>
                            {doc.descripcion && (
                              <span className="text-xs text-muted-foreground truncate max-w-xs">{doc.descripcion}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Abrir documento">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingDocId === doc.id}
                            onClick={() => handleEliminarDoc(doc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ Dialog: Vincular documento ══════════════════════════════════════ */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Vincular documento — {selected?.espacio.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del documento *</Label>
              <Input value={docForm.nombre} onChange={e => setDocForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Plano arquitectónico bloque A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de archivo</Label>
                <Select value={docForm.tipo} onValueChange={v => setDocForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TIPOS_MIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={docForm.categoria} onValueChange={v => setDocForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_CATEGORIAS_MIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL del documento *</Label>
              <Input value={docForm.url} onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))} placeholder="https://drive.google.com/... o enlace compartido" />
              <p className="text-xs text-muted-foreground">Pega el enlace compartido (Google Drive, OneDrive, Dropbox, etc.)</p>
            </div>
            <div className="space-y-2">
              <Label>Descripción <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Textarea value={docForm.descripcion} onChange={e => setDocForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Breve descripción del contenido..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDocDialog(false)}>Cancelar</Button>
            <Button onClick={handleGuardarDoc} disabled={savingDoc}>
              {savingDoc ? 'Vinculando...' : 'Vincular documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Editar ficha técnica ════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ficha Técnica — {espacio.nombre}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2"><Label>Código *</Label>
              <Input value={editForm.codigo} onChange={e => setEditForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div className="space-y-2"><Label>Nombre *</Label>
              <Input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Sede</Label>
              <Select value={editForm.sede} onValueChange={v => setEditForm(f => ({ ...f, sede: v as SedeEspacio }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bloque</Label>
              <Select value={editForm.bloque} onValueChange={v => setEditForm(f => ({ ...f, bloque: v as BloqueEspacio }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOQUES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Piso</Label>
              <Input value={editForm.piso} onChange={e => setEditForm(f => ({ ...f, piso: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editForm.tipo} onValueChange={v => setEditForm(f => ({ ...f, tipo: v as TipoEspacio }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editForm.estado} onValueChange={v => setEditForm(f => ({ ...f, estado: v as EstadoEspacio }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Largo (m)</Label>
              <Input type="number" value={editForm.largo_m} onChange={e => setEditForm(f => ({ ...f, largo_m: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2"><Label>Ancho (m)</Label>
              <Input type="number" value={editForm.ancho_m} onChange={e => setEditForm(f => ({ ...f, ancho_m: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Área (m²) — calculada automáticamente</Label>
              <Input readOnly value={editForm.largo_m && editForm.ancho_m ? (parseFloat(editForm.largo_m) * parseFloat(editForm.ancho_m)).toFixed(2) : ''} placeholder="Largo × Ancho" className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className="space-y-2"><Label>Capacidad Personas</Label>
              <Input type="number" value={editForm.capacidad_personas} onChange={e => setEditForm(f => ({ ...f, capacidad_personas: e.target.value }))} />
            </div>
            {/* Instalaciones */}
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
                      checked={!!editForm[key as keyof EditForm]}
                      onCheckedChange={v => setEditForm(f => ({ ...f, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 border rounded-lg px-3 py-2">
              <Switch checked={editForm.habilitado_reserva} onCheckedChange={v => setEditForm(f => ({ ...f, habilitado_reserva: v }))} />
              <Label>Habilitado para reserva</Label>
            </div>
            {editForm.habilitado_reserva && (
              <div className="space-y-2"><Label>Tarifa ($/día)</Label>
                <Input type="number" value={editForm.tarifa_alquiler} onChange={e => setEditForm(f => ({ ...f, tarifa_alquiler: e.target.value }))} />
              </div>
            )}
            <div className="md:col-span-2 space-y-2"><Label>Descripción del Espacio</Label>
              <Textarea value={editForm.descripcion_espacio} onChange={e => setEditForm(f => ({ ...f, descripcion_espacio: e.target.value }))} rows={2} />
            </div>
            <div className="md:col-span-2 space-y-2"><Label>Observaciones</Label>
              <Textarea value={editForm.observaciones} onChange={e => setEditForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Guardando...' : 'Actualizar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Ver ficha completa del activo ═══════════════════════════ */}
      <Dialog open={viewActivoDialog} onOpenChange={setViewActivoDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Ficha del Activo
            </DialogTitle>
          </DialogHeader>
          {viewingActivo && (
            <div className="space-y-5 py-2">
              {/* Foto */}
              {viewingActivo.foto_url && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={viewingActivo.foto_url} alt={viewingActivo.nombre} className="w-full h-full object-contain" />
                </div>
              )}

              {/* Identificación */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identificación</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Código', value: viewingActivo.codigo },
                    { label: 'Nombre', value: viewingActivo.nombre },
                    { label: 'Categoría', value: viewingActivo.categoria },
                    { label: 'Estado', value: viewingActivo.estado, badge: true },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      {f.badge
                        ? <Badge className={`${getEstadoColor(f.value as string)} border-0 text-xs mt-0.5`}>{f.value}</Badge>
                        : <p className="text-sm font-medium">{f.value || '—'}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Información financiera */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Información Financiera</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Valor de Adquisición', value: viewingActivo.valor ? formatCurrency(viewingActivo.valor) : '—' },
                    { label: 'IVA (%)', value: viewingActivo.iva != null ? `${viewingActivo.iva}%` : '—' },
                    { label: 'Fecha de Adquisición', value: formatDate(viewingActivo.fecha_adquisicion) },
                    { label: 'No. Factura', value: viewingActivo.factura || '—' },
                    { label: '¿Es Depreciable?', value: viewingActivo.depreciable ? 'Sí' : 'No' },
                    { label: 'Tiempo de Depreciación', value: viewingActivo.tiempo_depreciacion ? `${viewingActivo.tiempo_depreciacion} años` : '—' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asignación */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Asignación</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Responsable', value: viewingActivo.responsable || '—' },
                    { label: 'Proveedor', value: viewingActivo.proveedor || '—' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documento PDF */}
              {viewingActivo.documento_pdf_url && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Documento</h3>
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={viewingActivo.documento_pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Ver documento adjunto
                    </a>
                  </Button>
                </div>
              )}

              {/* Observaciones */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observaciones</h3>
                <p className="text-sm text-muted-foreground text-pretty">
                  {viewingActivo.observaciones || 'Sin observaciones registradas.'}
                </p>
              </div>

              {/* Metadatos */}
              <div className="pt-2 border-t text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>Registrado: {formatDate(viewingActivo.created_at)}</span>
                <span>Actualizado: {formatDate(viewingActivo.updated_at)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewActivoDialog(false)}>Cerrar</Button>
            {viewingActivo && (
              <Button onClick={() => { setViewActivoDialog(false); openEditarActivo(viewingActivo); }}>
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar activo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Editar activo (ficha completa) ══════════════════════════ */}
      <Dialog open={editActivoDialog} onOpenChange={setEditActivoDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" /> Editar Activo — {editingActivo?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input value={editActivoForm.codigo} onChange={e => setEditActivoForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: 00123" />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={editActivoForm.nombre} onChange={e => setEditActivoForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del activo" />
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={editActivoForm.categoria} onValueChange={v => setEditActivoForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {catCategorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editActivoForm.estado} onValueChange={v => setEditActivoForm(f => ({ ...f, estado: v as ActivoFijo['estado'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catEstadosActivo.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor ($)</Label>
              <Input type="number" value={editActivoForm.valor} onChange={e => setEditActivoForm(f => ({ ...f, valor: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>IVA (%)</Label>
              <Input type="number" value={editActivoForm.iva} onChange={e => setEditActivoForm(f => ({ ...f, iva: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Adquisición</Label>
              <Input type="date" value={editActivoForm.fecha_adquisicion} onChange={e => setEditActivoForm(f => ({ ...f, fecha_adquisicion: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>No. Factura</Label>
              <Input value={editActivoForm.factura} onChange={e => setEditActivoForm(f => ({ ...f, factura: e.target.value }))} placeholder="FAC-001" />
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={editActivoForm.responsable} onValueChange={v => setEditActivoForm(f => ({ ...f, responsable: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                  {/* Responsables asignados al espacio */}
                  {selected?.responsables
                    .filter(r => !!r.perfil?.nombre)
                    .map(r => r.perfil.nombre as string)
                    .concat(catResponsablesActivos)
                    .concat(editActivoForm.responsable && editActivoForm.responsable !== 'Sin asignar' ? [editActivoForm.responsable] : [])
                    .filter((name, idx, arr) => !!name && arr.indexOf(name) === idx)
                    .map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={editActivoForm.proveedor} onValueChange={v => setEditActivoForm(f => ({ ...f, proveedor: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin proveedor asignado">Sin proveedor asignado</SelectItem>
                  {catProveedores.map(p => <SelectItem key={p.nombre} value={p.nombre}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={editActivoForm.depreciable} onCheckedChange={v => setEditActivoForm(f => ({ ...f, depreciable: v }))} />
              <Label>¿Es depreciable?</Label>
            </div>
            {editActivoForm.depreciable && (
              <div className="space-y-2">
                <Label>Tiempo de Depreciación (años)</Label>
                <Input type="number" value={editActivoForm.tiempo_depreciacion} onChange={e => setEditActivoForm(f => ({ ...f, tiempo_depreciacion: e.target.value }))} />
              </div>
            )}
            <div className="md:col-span-2 space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={editActivoForm.observaciones} onChange={e => setEditActivoForm(f => ({ ...f, observaciones: e.target.value }))} rows={3}
                placeholder="Anotar referencias, marcas, componentes u otros datos relevantes." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditActivoDialog(false)}>Cancelar</Button>
            <Button onClick={handleGuardarEditActivo} disabled={savingEditActivo}>
              {savingEditActivo ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Nuevo activo ════════════════════════════════════════════ */}
      <Dialog open={activoDialog} onOpenChange={setActivoDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Nuevo Activo — {espacio.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código * <span className="text-xs text-muted-foreground">(identificador único)</span></Label>
                <Input
                  value={activoForm.codigo}
                  onChange={e => setActivoForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="Ej: 00001"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={activoForm.nombre} onChange={e => setActivoForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del activo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={activoForm.categoria} onValueChange={v => setActivoForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {catCategorias.length === 0
                      ? <SelectItem value="General">General</SelectItem>
                      : catCategorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={activoForm.estado} onValueChange={v => setActivoForm(f => ({ ...f, estado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(catEstadosActivo.length > 0 ? catEstadosActivo : ['En funcionamiento', 'En mantenimiento', 'Dado de baja']).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={activoForm.responsable} onValueChange={v => setActivoForm(f => ({ ...f, responsable: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar responsable..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                    {(selected?.responsables ?? []).map(r => (
                      <SelectItem key={r.perfil.id} value={r.perfil.nombre ?? r.perfil.email ?? r.perfil.id}>
                        {r.perfil.nombre ?? r.perfil.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={activoForm.proveedor} onValueChange={v => setActivoForm(f => ({ ...f, proveedor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin proveedor asignado">Sin proveedor asignado</SelectItem>
                    {catProveedores.map(p => <SelectItem key={p.nombre} value={p.nombre}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={activoForm.observaciones} onChange={e => setActivoForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} placeholder="Notas adicionales sobre el activo..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActivoDialog(false)}>Cancelar</Button>
            <Button onClick={handleGuardarActivo} disabled={savingActivo}>
              {savingActivo ? 'Guardando...' : 'Registrar activo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Nueva intervención ══════════════════════════════════════ */}
      <Dialog open={intervDialog} onOpenChange={setIntervDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Nueva Intervención — {espacio.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de intervención</Label>
                <Select value={intervForm.tipo} onValueChange={v => setIntervForm(f => ({ ...f, tipo: v as Intervencion['tipo'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Mantenimiento preventivo', 'Mantenimiento correctivo', 'Remodelación', 'Adecuación', 'Construcción nueva', 'Modificación eléctrica', 'Modificación hidráulica', 'Reparación de emergencia'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={intervForm.prioridad} onValueChange={v => setIntervForm(f => ({ ...f, prioridad: v as Intervencion['prioridad'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Baja', 'Media', 'Alta', 'Urgente'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de solicitud</Label>
              <Input type="date" value={intervForm.fecha_solicitud} onChange={e => setIntervForm(f => ({ ...f, fecha_solicitud: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Solicitante</Label>
              <Input
                value={intervForm.area_solicitante}
                onChange={e => setIntervForm(f => ({ ...f, area_solicitante: e.target.value }))}
                placeholder="Nombre de quien solicita la intervención"
              />
              <p className="text-xs text-muted-foreground">Se completa automáticamente con tu nombre registrado.</p>
            </div>
            <div className="space-y-2">
              <Label>Descripción del problema *</Label>
              <Textarea value={intervForm.descripcion_problema} onChange={e => setIntervForm(f => ({ ...f, descripcion_problema: e.target.value }))} rows={3} placeholder="Describe el problema o la necesidad de intervención..." />
            </div>
            <div className="space-y-2">
              <Label>Justificación</Label>
              <Textarea value={intervForm.justificacion} onChange={e => setIntervForm(f => ({ ...f, justificacion: e.target.value }))} rows={2} placeholder="Justificación técnica o institucional..." />
            </div>
            <div className="space-y-2">
              <Label>Imagen de evidencia (opcional)</Label>
              {intervForm.evidencia_foto_url ? (
                <div className="space-y-2">
                  <div className="w-full rounded-lg overflow-hidden border max-h-40">
                    <img src={intervForm.evidencia_foto_url} alt="Evidencia" className="w-full h-40 object-cover" />
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => setIntervForm(f => ({ ...f, evidencia_foto_url: '' }))}>
                    <Trash2 className="h-3.5 w-3.5" /> Quitar imagen
                  </Button>
                </div>
              ) : (
                <div>
                  <input type="file" accept="image/*" id="interv-foto-misespacios" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadIntervImg(f); e.target.value = ''; }} />
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => document.getElementById('interv-foto-misespacios')?.click()}
                    disabled={uploadingIntervImg}>
                    <Camera className="h-3.5 w-3.5" />
                    {uploadingIntervImg ? 'Subiendo...' : 'Adjuntar imagen'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Máx. 5 MB. JPG, PNG o WEBP.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIntervDialog(false)}>Cancelar</Button>
            <Button onClick={handleGuardarIntervencion} disabled={savingInterv}>
              {savingInterv ? 'Guardando...' : 'Registrar intervención'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
