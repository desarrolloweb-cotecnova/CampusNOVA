import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  Building2, Users, MapPin, Zap, Droplets, Package,
  Calendar, FileText, Edit, Trash2, Camera, Plus, Search,
  UserCheck, Wrench, Link2, ExternalLink, File, Sheet, Eye, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import type {
  EspacioFisico, ActivoFijo, Intervencion, EstadoEspacio,
  TipoEspacio, SedeEspacio, BloqueEspacio, Profile, AsignacionEspacio, DocumentoEspacio, FotoEspacio,
} from '@/types/types';
import { getEstadoColor, formatDate, formatCurrency } from '@/lib/utils';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { generarActaInventarioPDF } from '@/lib/acta-inventario';
import { PhotoCarousel } from '@/components/common/PhotoCarousel';
import { toast } from 'sonner';

const TIPOS: TipoEspacio[] = ['AUL', 'LAB', 'ADM', 'BAÑ', 'BOD', 'AUD', 'SAL', 'PAR', 'CUL', 'HOT'];
const SEDES: SedeEspacio[] = ['Sede Principal', 'Sede Secundaria', 'Sede Rural'];
const BLOQUES: BloqueEspacio[] = ['Bloque A', 'Bloque B', 'Bloque C', 'Bloque D', 'N/A'];
const ESTADOS: EstadoEspacio[] = ['Bueno', 'Regular', 'Requiere intervención'];
const TIPO_LABELS: Record<string, string> = {
  AUL: 'Aula', LAB: 'Laboratorio', ADM: 'Administrativo', BAÑ: 'Baño',
  BOD: 'Bodega', AUD: 'Auditorio', SAL: 'Sala', PAR: 'Parqueadero',
  CUL: 'Cultural', HOT: 'Hotelería',
};

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80';

const DOC_TIPOS = ['PDF', 'Word', 'Excel', 'Plano', 'Imagen', 'Otro'];
const DOC_CATEGORIAS = ['Planos', 'Escrituras', 'Facturas', 'Manuales', 'Instructivos', 'Contratos', 'General'];

function getDocIcon(tipo: string) {
  if (tipo === 'PDF') return <FileText className="h-4 w-4 text-red-500" />;
  if (tipo === 'Word') return <File className="h-4 w-4 text-blue-500" />;
  if (tipo === 'Excel') return <Sheet className="h-4 w-4 text-green-600" />;
  if (tipo === 'Plano') return <FileText className="h-4 w-4 text-orange-500" />;
  return <Link2 className="h-4 w-4 text-muted-foreground" />;
}

export default function EspacioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [espacio, setEspacio] = useState<EspacioFisico | null>(null);
  const [activos, setActivos] = useState<ActivoFijo[]>([]);
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegación entre espacios
  const [allSpaceIds, setAllSpaceIds] = useState<string[]>([]);

  // Responsables asignados
  const [responsables, setResponsables] = useState<(AsignacionEspacio & { perfil: Profile })[]>([]);
  const [todosPerfiles, setTodosPerfiles] = useState<Profile[]>([]);

  // Catálogos para el dialog de nuevo activo
  const [catCategorias, setCatCategorias] = useState<string[]>([]);
  const [catEstadosActivo, setCatEstadosActivo] = useState<string[]>([]);
  const [catProveedores, setCatProveedores] = useState<{ nombre: string }[]>([]);

  // Catálogos para editar espacio (misma fuente que EspaciosFisicosPage)
  const [catSedes, setCatSedes] = useState<{ codigo: string; nombre: string }[]>([
    { codigo: 'SP', nombre: 'Sede Principal' }, { codigo: 'SS', nombre: 'Sede Secundaria' }, { codigo: 'SR', nombre: 'Sede Rural' },
  ]);
  const [catBloques, setCatBloques] = useState<{ codigo: string; nombre: string }[]>([
    { codigo: 'BA', nombre: 'Bloque A' }, { codigo: 'BB', nombre: 'Bloque B' },
    { codigo: 'BC', nombre: 'Bloque C' }, { codigo: 'BD', nombre: 'Bloque D' }, { codigo: 'NA', nombre: 'N/A' },
  ]);
  const [catTipos, setCatTipos] = useState<{ codigo: string; nombre: string }[]>([
    { codigo: 'AUL', nombre: 'Aula' }, { codigo: 'LAB', nombre: 'Laboratorio' },
    { codigo: 'ADM', nombre: 'Administrativo' }, { codigo: 'BAÑ', nombre: 'Baño' },
    { codigo: 'BOD', nombre: 'Bodega' }, { codigo: 'AUD', nombre: 'Auditorio' },
    { codigo: 'SAL', nombre: 'Sala' }, { codigo: 'PAR', nombre: 'Parqueadero' },
    { codigo: 'CUL', nombre: 'Cultural' }, { codigo: 'HOT', nombre: 'Hotelería' },
  ]);
  const [catPisos, setCatPisos] = useState<{ codigo: string; nombre: string }[]>([
    { codigo: 'P1', nombre: 'Piso 1' }, { codigo: 'P2', nombre: 'Piso 2' },
  ]);
  const [catEstados, setCatEstados] = useState<string[]>(['Bueno', 'Regular', 'Requiere intervención']);
  const [asignarDialog, setAsignarDialog] = useState(false);
  // Acta de inventario del espacio (generación en curso por responsable)
  const [actaLoadingId, setActaLoadingId] = useState<string | null>(null);
  const [perfilesSeleccionados, setPerfilesSeleccionados] = useState<string[]>([]);
  const [buscarPerfil, setBuscarPerfil] = useState('');
  const [savingAsig, setSavingAsig] = useState(false);

  // Dialog nuevo activo
  const [activoDialog, setActivoDialog] = useState(false);
  const [activoForm, setActivoForm] = useState({
    codigo: '', nombre: '', categoria: '', estado: 'En funcionamiento' as ActivoFijo['estado'],
    valor: '', responsable: '', proveedor: '', observaciones: '',
  });
  const [savingActivo, setSavingActivo] = useState(false);

  // Dialog ver activo (ficha completa)
  const [viewActivoDialog, setViewActivoDialog] = useState(false);
  const [viewingActivo, setViewingActivo] = useState<ActivoFijo | null>(null);

  // Traslado de activos entre responsables (selección múltiple)
  const [selectedActivos, setSelectedActivos] = useState<string[]>([]);
  const [trasladarResponsable, setTrasladarResponsable] = useState('');
  const [savingTraslado, setSavingTraslado] = useState(false);

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

  // Documentos
  const [documentos, setDocumentos] = useState<DocumentoEspacio[]>([]);
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({ nombre: '', descripcion: '', tipo: 'PDF', categoria: 'General', url: '' });
  const [savingDoc, setSavingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Eliminar
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fotos galería
  const [fotos, setFotos] = useState<FotoEspacio[]>([]);
  const fotosInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  // Cambiar foto (foto principal — legado)
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Editar
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [form, setForm] = useState({
    codigo: '', nombre: '', sede: 'Sede Principal' as SedeEspacio, bloque: 'Bloque A' as BloqueEspacio,
    piso: '1', tipo: 'AUL' as TipoEspacio, largo_m: '', ancho_m: '',
    capacidad_personas: '',
    instalaciones_electricas: false, instalaciones_hidraulicas: false,
    instalaciones_sanitarias: false, instalaciones_gas: false,
    instalaciones_internet_telefonia: false, instalaciones_seguridad_control: false,
    instalaciones_climatizacion: false, instalaciones_domotica: false,
    instalaciones_pci: false, estado: 'Bueno' as EstadoEspacio,
    habilitado_reserva: false, tarifa_alquiler: '',
    descripcion_espacio: '', observaciones: '', foto_principal_url: '',
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [
      { data: espData },
      { data: actData },
      { data: intData },
      { data: asigData },
      { data: perfilesData },
      { data: catData },
      { data: estadosData },
      { data: provData },
      { data: docsData },
      { data: sedesData },
      { data: bloquesData },
      { data: tiposData },
      { data: pisosData },
      { data: estadosEspData },
      { data: allIdsData },
      { data: fotosData },
    ] = await Promise.all([
      supabase.from('espacios_fisicos').select('*').eq('id', id).maybeSingle(),
      supabase.from('activos_fijos').select('*').eq('espacio_id', id).eq('dado_de_baja', false).order('nombre'),
      supabase.from('intervenciones').select('*').eq('espacio_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('asignaciones_espacios').select('*').eq('espacio_id', id).eq('activo', true),
      supabase.from('profiles').select('*').order('nombre'),
      supabase.from('categorias_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('estados_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('proveedores_activos').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('documentos_espacios').select('*').eq('espacio_id', id).order('created_at', { ascending: false }),
      supabase.from('sedes_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('bloques_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('tipos_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('pisos_espacios').select('codigo,nombre').eq('activo', true).order('nombre'),
      supabase.from('estados_espacios').select('nombre').eq('activo', true).order('nombre'),
      supabase.from('espacios_fisicos').select('id').order('codigo'),
      supabase.from('fotos_espacios').select('*').eq('espacio_id', id).order('orden').order('created_at'),
    ]);
    setEspacio(espData);
    setActivos(Array.isArray(actData) ? actData : []);
    setIntervenciones(Array.isArray(intData) ? intData : []);
    setCatCategorias(Array.isArray(catData) ? catData.map(c => c.nombre) : []);
    setCatEstadosActivo(Array.isArray(estadosData) ? estadosData.map(e => e.nombre) : []);
    setCatProveedores(Array.isArray(provData) ? provData : []);
    setDocumentos(Array.isArray(docsData) ? docsData : []);
    if (Array.isArray(sedesData) && sedesData.length) setCatSedes(sedesData as { codigo: string; nombre: string }[]);
    if (Array.isArray(bloquesData) && bloquesData.length) setCatBloques(bloquesData as { codigo: string; nombre: string }[]);
    if (Array.isArray(tiposData) && tiposData.length) {
      setCatTipos(tiposData as { codigo: string; nombre: string }[]);
      tiposData.forEach((t: { codigo: string; nombre: string }) => { TIPO_LABELS[t.codigo] = t.nombre; });
    }
    if (Array.isArray(pisosData) && pisosData.length) setCatPisos(pisosData as { codigo: string; nombre: string }[]);
    if (Array.isArray(estadosEspData) && estadosEspData.length) setCatEstados(estadosEspData.map(r => r.nombre));
    setAllSpaceIds(Array.isArray(allIdsData) ? allIdsData.map(r => r.id as string) : []);
    setFotos(Array.isArray(fotosData) ? fotosData as FotoEspacio[] : []);
    const perfs: Profile[] = Array.isArray(perfilesData) ? perfilesData : [];
    setTodosPerfiles(perfs);
    const asigs: AsignacionEspacio[] = Array.isArray(asigData) ? asigData : [];
    setResponsables(
      asigs.map(a => ({
        ...a,
        perfil: perfs.find(p => p.id === a.responsable_id) as Profile,
      })).filter(a => a.perfil)
    );
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresca la ficha cuando cambian las intervenciones del espacio.
  useRealtimeTable('intervenciones', loadData);

  const openEdit = () => {
    if (!espacio) return;
    // Mapear piso: el DB puede guardar código (P1) o nombre (Piso 1) → normalizar a nombre para el Select
    const pisoNombre = catPisos.find(p => p.codigo === espacio.piso || p.nombre === espacio.piso)?.nombre || espacio.piso || '';
    setForm({
      codigo: espacio.codigo, nombre: espacio.nombre, sede: espacio.sede, bloque: espacio.bloque,
      piso: pisoNombre, tipo: espacio.tipo,
      largo_m: espacio.largo_m ? String(espacio.largo_m) : '',
      ancho_m: espacio.ancho_m ? String(espacio.ancho_m) : '',
      capacidad_personas: espacio.capacidad_personas ? String(espacio.capacidad_personas) : '',
      instalaciones_electricas: espacio.instalaciones_electricas ?? false,
      instalaciones_hidraulicas: espacio.instalaciones_hidraulicas ?? false,
      instalaciones_sanitarias: espacio.instalaciones_sanitarias ?? false,
      instalaciones_gas: espacio.instalaciones_gas ?? false,
      instalaciones_internet_telefonia: espacio.instalaciones_internet_telefonia ?? false,
      instalaciones_seguridad_control: espacio.instalaciones_seguridad_control ?? false,
      instalaciones_climatizacion: espacio.instalaciones_climatizacion ?? false,
      instalaciones_domotica: espacio.instalaciones_domotica ?? false,
      instalaciones_pci: espacio.instalaciones_pci ?? false,
      estado: espacio.estado, habilitado_reserva: espacio.habilitado_reserva,
      tarifa_alquiler: espacio.tarifa_alquiler ? String(espacio.tarifa_alquiler) : '',
      descripcion_espacio: espacio.descripcion_espacio || '',
      observaciones: espacio.observaciones || '',
      foto_principal_url: espacio.foto_principal_url || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!espacio) return;
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
    const { error } = await supabase.from('espacios_fisicos').update(payload).eq('id', espacio.id);
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Espacio actualizado');
    setEditOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!espacio) return;
    setDeleting(true);
    const { error } = await supabase.from('espacios_fisicos').delete().eq('id', espacio.id);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    toast.success('Espacio eliminado');
    navigate('/panel/espacios');
  };

  const handleChangeFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !espacio) return;
    // Sin límite previo — compressFile reduce el tamaño automáticamente
    setUploadingFoto(true);
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
    setUploadingFoto(false);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  // ─── Subir múltiples fotos a galería ───────────────────────────────────────
  const handleAgregarFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !espacio) return;
    setUploadingFotos(true);
    let subidas = 0;
    let primeraUrl: string | null = null;
    for (const file of files) {
      try {
        const url = await uploadImageToCloudinary(file);
        await supabase.from('fotos_espacios').insert({
          espacio_id: espacio.id,
          url,
          orden: fotos.length + subidas,
        });
        if (subidas === 0) primeraUrl = url;
        subidas++;
      } catch { toast.error(`Error al subir ${file.name}`); }
    }
    // Si no hay foto principal aún, usar la primera foto subida como portada
    if (primeraUrl && !espacio.foto_principal_url) {
      await supabase
        .from('espacios_fisicos')
        .update({ foto_principal_url: primeraUrl, fecha_ultima_actualizacion: new Date().toISOString() })
        .eq('id', espacio.id);
    }
    setUploadingFotos(false);
    if (fotosInputRef.current) fotosInputRef.current.value = '';
    if (subidas > 0) { toast.success(`${subidas} foto(s) agregada(s)`); loadData(); }
  };

  // ─── Eliminar foto de galería ───────────────────────────────────────────────
  const handleEliminarFoto = async (fotoId: string) => {
    const { error } = await supabase.from('fotos_espacios').delete().eq('id', fotoId);
    if (error) { toast.error('Error al eliminar foto'); return; }
    toast.success('Foto eliminada');
    loadData();
  };

  // ─── Responsables ──────────────────────────────────────────────────────────
  const openAsignarResponsables = () => {
    setPerfilesSeleccionados([]);
    setBuscarPerfil('');
    setAsignarDialog(true);
  };

  const togglePerfil = (pid: string) =>
    setPerfilesSeleccionados(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    );

  const handleAsignarResponsables = async () => {
    if (!espacio || perfilesSeleccionados.length === 0) {
      toast.error('Selecciona al menos un responsable');
      return;
    }
    setSavingAsig(true);
    const rows = perfilesSeleccionados.map(pid => ({
      espacio_id: espacio.id,
      responsable_id: pid,
      activo: true,
      fecha_asignacion: new Date().toISOString().split('T')[0],
    }));
    const { error } = await supabase
      .from('asignaciones_espacios')
      .upsert(rows, { onConflict: 'espacio_id,responsable_id' });
    setSavingAsig(false);
    if (error) { toast.error('Error al asignar: ' + error.message); return; }
    toast.success(`${perfilesSeleccionados.length} responsable(s) asignado(s)`);
    setAsignarDialog(false);
    loadData();
  };

  const handleDesasignarResponsable = async (asigId: string, nombreResp: string | null) => {
    // Cuántos activos del espacio siguen a nombre de este responsable
    const conActivos = activos.filter(
      a => (a.responsable?.trim() || '') === (nombreResp?.trim() || '')
    ).length;
    if (conActivos > 0) {
      const ok = window.confirm(
        `Este responsable todavía tiene ${conActivos} activo(s) fijo(s) a su nombre en este espacio. ` +
        `Se recomienda trasladar esos activos a otro responsable antes de removerlo.\n\n¿Removerlo de todos modos?`
      );
      if (!ok) return;
    }
    const { error } = await supabase
      .from('asignaciones_espacios')
      .update({ activo: false })
      .eq('id', asigId);
    if (error) { toast.error('Error al desasignar'); return; }
    toast.success('Responsable desasignado');
    loadData();
  };

  // ─── Acta de Inventario del espacio (PDF por responsable) ───────────────────
  // Misma acta del módulo de Responsables, pero limitada a este espacio: así el
  // responsable que solo tiene acceso a su espacio puede descargarla desde aquí.
  const handleActaInventario = async (perfil: Profile) => {
    if (!espacio) return;
    if (activos.length === 0) {
      toast.info('Este espacio no tiene activos fijos vigentes.');
      return;
    }
    setActaLoadingId(perfil.id);
    try {
      await generarActaInventarioPDF({
        responsable: perfil,
        espacios: [espacio],
        activos,
        alcance: 'espacio',
      });
      toast.success('Acta de inventario generada');
    } catch (err) {
      toast.error('Error al generar el acta: ' + (err as Error).message);
    } finally {
      setActaLoadingId(null);
    }
  };

  // ─── Traslado de activos entre responsables del espacio ─────────────────────
  const toggleActivoSel = (id: string) => {
    setSelectedActivos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleGrupoSel = (ids: string[], todosSel: boolean) => {
    setSelectedActivos(prev => todosSel
      ? prev.filter(x => !ids.includes(x))
      : Array.from(new Set([...prev, ...ids]))
    );
  };

  const handleTrasladarActivos = async () => {
    if (selectedActivos.length === 0 || !trasladarResponsable) {
      toast.error('Selecciona activos y el responsable destino');
      return;
    }
    setSavingTraslado(true);
    const { error } = await supabase
      .from('activos_fijos')
      .update({ responsable: trasladarResponsable })
      .in('id', selectedActivos);
    setSavingTraslado(false);
    if (error) { toast.error('Error al trasladar: ' + error.message); return; }
    toast.success(`${selectedActivos.length} activo(s) trasladado(s) a ${trasladarResponsable}`);
    setSelectedActivos([]);
    setTrasladarResponsable('');
    loadData();
  };

  // ─── Nuevo Activo ──────────────────────────────────────────────────────────
  const openNuevoActivo = () => {
    setActivoForm({
      codigo: '', nombre: '', categoria: '', estado: 'En funcionamiento',
      valor: '', responsable: '', proveedor: 'Sin proveedor asignado', observaciones: '',
    });
    setActivoDialog(true);
  };

  const handleGuardarActivo = async () => {
    if (!espacio) return;
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
      valor: activoForm.valor ? parseFloat(activoForm.valor) : 0,
      responsable: activoForm.responsable || null,
      proveedor: activoForm.proveedor || null,
      observaciones: activoForm.observaciones || null,
      espacio_id: espacio.id,
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

  // ─── Documentos ────────────────────────────────────────────────────────────
  const openNuevoDoc = () => {
    setDocForm({ nombre: '', descripcion: '', tipo: 'PDF', categoria: 'General', url: '' });
    setDocDialog(true);
  };

  const handleGuardarDoc = async () => {
    if (!espacio) return;
    if (!docForm.nombre.trim() || !docForm.url.trim()) {
      toast.error('Nombre y URL son obligatorios');
      return;
    }
    setSavingDoc(true);
    const { error } = await supabase.from('documentos_espacios').insert({
      espacio_id: espacio.id,
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

  // ─── Nueva Intervención ────────────────────────────────────────────────────
  const openNuevaIntervencion = () => {
    setIntervForm({
      tipo: 'Mantenimiento preventivo',
      descripcion_problema: '', justificacion: '', area_solicitante: '',
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
    if (!espacio) return;
    if (!intervForm.descripcion_problema.trim()) {
      toast.error('La descripción del problema es obligatoria');
      return;
    }
    setSavingInterv(true);
    // Generar código secuencial
    const { count } = await supabase
      .from('intervenciones')
      .select('id', { count: 'exact', head: true })
      .eq('espacio_id', espacio.id);
    const seq = String((count || 0) + 1).padStart(3, '0');
    const codigo = `INT-${espacio.codigo}-${seq}`;
    const { error } = await supabase.from('intervenciones').insert({
      codigo,
      espacio_id: espacio.id,
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

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        </div>
      </AppLayout>
    );
  }

  if (!espacio) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Espacio no encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/panel/espacios')}>
            Volver al listado
          </Button>
        </div>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        {(() => {
          const curIdx = allSpaceIds.indexOf(id ?? '');
          const prevId = curIdx > 0 ? allSpaceIds[curIdx - 1] : null;
          const nextId = curIdx >= 0 && curIdx < allSpaceIds.length - 1 ? allSpaceIds[curIdx + 1] : null;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => navigate('/panel/espacios')} title="Volver al listado">
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
                disabled={!prevId}
                onClick={() => prevId && navigate(`/panel/espacios/${prevId}`)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Ver anterior espacio</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={!nextId}
                onClick={() => nextId && navigate(`/panel/espacios/${nextId}`)}
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
            photos={fotos}
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
              onClick={() => fotosInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              {uploadingFotos ? 'Subiendo…' : 'Agregar fotos'}
            </Button>
            <span className="text-xs text-muted-foreground">{fotos.length} foto(s) en la galería</span>
          </div>
          <input
            ref={fotosInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAgregarFotos}
          />
          {/* Input heredado para foto principal (oculto, mantiene compatibilidad) */}
          <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleChangeFoto} />
        </div>

        {/* AlertDialog — Confirmar eliminación */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar espacio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente <strong>{espacio.nombre}</strong> ({espacio.codigo}) y no se puede deshacer.
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

        {/* Dialog — Editar espacio */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Espacio</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2"><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
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
              {/* Dimensiones → Área calculada */}
              <div className="space-y-2"><Label>Largo (m)</Label><Input type="number" value={form.largo_m} onChange={e => setForm(f => ({ ...f, largo_m: e.target.value }))} placeholder="0.00" /></div>
              <div className="space-y-2"><Label>Ancho (m)</Label><Input type="number" value={form.ancho_m} onChange={e => setForm(f => ({ ...f, ancho_m: e.target.value }))} placeholder="0.00" /></div>
              <div className="space-y-2">
                <Label>Área (m²) — calculada automáticamente</Label>
                <Input readOnly value={form.largo_m && form.ancho_m ? (parseFloat(form.largo_m) * parseFloat(form.ancho_m)).toFixed(2) : ''} placeholder="Largo × Ancho" className="bg-muted/50 text-muted-foreground" />
              </div>
              <div className="space-y-2"><Label>Capacidad Personas</Label><Input type="number" value={form.capacidad_personas} onChange={e => setForm(f => ({ ...f, capacidad_personas: e.target.value }))} /></div>
              {/* Instalaciones Si/No */}
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
                <div className="space-y-2"><Label>Tarifa ($/día)</Label><Input type="number" value={form.tarifa_alquiler} onChange={e => setForm(f => ({ ...f, tarifa_alquiler: e.target.value }))} /></div>
              )}
              <div className="md:col-span-2 space-y-2"><Label>Descripción del Espacio</Label><Textarea value={form.descripcion_espacio} onChange={e => setForm(f => ({ ...f, descripcion_espacio: e.target.value }))} rows={2} /></div>
              <div className="md:col-span-2 space-y-2"><Label>Observaciones</Label><Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Actualizar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="ficha">
          <TabsList>
            <TabsTrigger value="ficha">Ficha Técnica</TabsTrigger>
            <TabsTrigger value="responsables">
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Responsables ({responsables.length})
            </TabsTrigger>
            <TabsTrigger value="activos">Activos ({activos.length})</TabsTrigger>
            <TabsTrigger value="intervenciones">Intervenciones ({intervenciones.length})</TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Documentos ({documentos.length})
            </TabsTrigger>
          </TabsList>

          {/* Ficha técnica */}
          <TabsContent value="ficha">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
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
                        <span className="font-semibold text-secondary">{formatCurrency(espacio.tarifa_alquiler)}/día</span>
                      </div>
                    )}
                    {espacio.habilitado_reserva && (
                      <Button className="w-full mt-2" onClick={() => navigate('/solicitar-espacio')}>
                        <Calendar className="h-4 w-4 mr-2" /> Solicitar este espacio
                      </Button>
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

          {/* Responsables */}
          <TabsContent value="responsables">
            <Card className="shadow-card min-w-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base">Responsables asignados</CardTitle>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openAsignarResponsables}>
                  <Plus className="h-3.5 w-3.5" /> Asignar responsable
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {responsables.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay responsables asignados a este espacio.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {responsables.map(r => {
                      const numActivos = activos.filter(
                        a => (a.responsable?.trim() || '') === (r.perfil.nombre?.trim() || '')
                      ).length;
                      return (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={r.perfil.avatar_url || ''} />
                          <AvatarFallback>
                            {(r.perfil.nombre || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.perfil.nombre || '(sin nombre)'}</p>
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
                          disabled={actaLoadingId === r.perfil.id}
                          title="Descargar el acta de inventario de los activos fijos de este espacio"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">
                            {actaLoadingId === r.perfil.id ? 'Generando…' : 'Acta de inventario'}
                          </span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={numActivos > 0 ? 'Traslada primero sus activos (pestaña Activos)' : 'Quitar responsable del espacio'}
                          onClick={() => handleDesasignarResponsable(r.id, r.perfil.nombre)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activos */}
          <TabsContent value="activos">
            <Card className="shadow-card min-w-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base">Activos fijos en este espacio</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona activos para trasladarlos a otro responsable del espacio.
                  </p>
                </div>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openNuevoActivo}>
                  <Plus className="h-3.5 w-3.5" /> Nuevo activo
                </Button>
              </CardHeader>

              {/* Barra de traslado (visible al seleccionar activos) */}
              {selectedActivos.length > 0 && (
                <div className="mx-4 mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-sm font-medium shrink-0">
                    {selectedActivos.length} activo{selectedActivos.length !== 1 ? 's' : ''} seleccionado{selectedActivos.length !== 1 ? 's' : ''}
                  </span>
                  {responsables.length === 0 ? (
                    <span className="text-xs text-amber-600">
                      Primero asigna responsables a este espacio (pestaña Responsables) para poder trasladar.
                    </span>
                  ) : (
                    <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:items-center">
                      <span className="text-sm text-muted-foreground shrink-0">Trasladar a:</span>
                      <Select value={trasladarResponsable} onValueChange={setTrasladarResponsable}>
                        <SelectTrigger className="h-9 flex-1 min-w-0"><SelectValue placeholder="Seleccionar responsable..." /></SelectTrigger>
                        <SelectContent>
                          {responsables.map(r => (
                            <SelectItem key={r.id} value={r.perfil.nombre || r.perfil.email || r.id}>
                              {r.perfil.nombre || r.perfil.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={handleTrasladarActivos} disabled={savingTraslado || !trasladarResponsable}>
                          {savingTraslado ? 'Trasladando...' : 'Trasladar'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedActivos([])}>Limpiar</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <CardContent className="p-4">
                {activos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">Sin activos en este espacio</p>
                ) : (
                  (() => {
                    const grupos: Record<string, ActivoFijo[]> = {};
                    activos.forEach(a => {
                      const key = a.responsable?.trim() || 'Sin responsable asignado';
                      if (!grupos[key]) grupos[key] = [];
                      grupos[key].push(a);
                    });
                    return Object.entries(grupos).map(([responsable, items]) => {
                      const idsGrupo = items.map(i => i.id);
                      const todosSel = idsGrupo.every(id => selectedActivos.includes(id));
                      return (
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
                                <TableHead className="w-10">
                                  <Checkbox
                                    checked={todosSel}
                                    onCheckedChange={() => toggleGrupoSel(idsGrupo, todosSel)}
                                    aria-label="Seleccionar todos"
                                  />
                                </TableHead>
                                <TableHead className="whitespace-nowrap">Código</TableHead>
                                <TableHead className="whitespace-nowrap">Nombre</TableHead>
                                <TableHead className="whitespace-nowrap">Categoría</TableHead>
                                <TableHead className="whitespace-nowrap">Estado</TableHead>
                                <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map(a => (
                                <TableRow key={a.id} data-state={selectedActivos.includes(a.id) ? 'selected' : undefined}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedActivos.includes(a.id)}
                                      onCheckedChange={() => toggleActivoSel(a.id)}
                                      aria-label={`Seleccionar ${a.codigo}`}
                                    />
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap font-mono text-xs">{a.codigo}</TableCell>
                                  <TableCell className="whitespace-nowrap font-medium">{a.nombre}</TableCell>
                                  <TableCell className="whitespace-nowrap text-sm">{a.categoria}</TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <Badge className={`${getEstadoColor(a.estado)} border-0 text-xs`}>{a.estado}</Badge>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right">
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5"
                                      onClick={() => { setViewingActivo(a); setViewActivoDialog(true); }}>
                                      <Eye className="h-3.5 w-3.5" /> Ver
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      );
                    });
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Intervenciones */}
          <TabsContent value="intervenciones">
            <Card className="shadow-card min-w-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base">Intervenciones registradas</CardTitle>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openNuevaIntervencion}>
                  <Plus className="h-3.5 w-3.5" /> Nueva intervención
                </Button>
              </CardHeader>
              <CardContent>
                {intervenciones.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin intervenciones registradas en este espacio.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {intervenciones.map(i => (
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
                        {i.evidencia_foto_url && (
                          <div className="w-full rounded overflow-hidden border max-h-40">
                            <img src={i.evidencia_foto_url} alt="Evidencia" className="w-full h-40 object-cover" />
                          </div>
                        )}
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

          {/* ── Documentos ──────────────────────────────────────────────── */}
          <TabsContent value="documentos">
            <Card className="shadow-card min-w-0">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base">Documentos vinculados</CardTitle>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openNuevoDoc}>
                  <Plus className="h-3.5 w-3.5" /> Vincular documento
                </Button>
              </CardHeader>
              <CardContent>
                {documentos.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay documentos vinculados a este espacio.</p>
                    <p className="text-xs mt-1">Vincula planos, escrituras, manuales u otros documentos.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentos.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="shrink-0">{getDocIcon(doc.tipo)}</div>
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
                            title="Eliminar vínculo"
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
              <Link2 className="h-4 w-4" /> Vincular documento — {espacio.nombre}
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
                  <SelectContent>{DOC_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={docForm.categoria} onValueChange={v => setDocForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
              <Textarea value={docForm.descripcion} onChange={e => setDocForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Breve descripción del contenido del documento..." />
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

      {/* ═══ Dialog: Asignar responsables ══════════════════════════════════════ */}
      <Dialog open={asignarDialog} onOpenChange={setAsignarDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Asignar responsables a {espacio.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 flex-1 overflow-hidden py-2">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar responsable por nombre o cargo..."
                value={buscarPerfil}
                onChange={e => setBuscarPerfil(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Badges seleccionados */}
            {perfilesSeleccionados.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Seleccionados:</span>
                {perfilesSeleccionados.map(pid => {
                  const p = todosPerfiles.find(x => x.id === pid);
                  return (
                    <Badge key={pid} variant="secondary" className="text-xs gap-1">
                      {p?.nombre || pid}
                      <button type="button" onClick={() => togglePerfil(pid)} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  );
                })}
              </div>
            )}
            {/* Lista perfiles */}
            <div className="border rounded-lg overflow-y-auto flex-1 min-h-0 max-h-64 divide-y">
              {(() => {
                const yaAsignados = responsables.map(r => r.responsable_id);
                const busq = buscarPerfil.toLowerCase();
                const lista = todosPerfiles.filter(p =>
                  !busq ||
                  (p.nombre || '').toLowerCase().includes(busq) ||
                  (p.cargo || '').toLowerCase().includes(busq) ||
                  (p.email || '').toLowerCase().includes(busq)
                );
                if (lista.length === 0)
                  return <div className="py-8 text-center text-sm text-muted-foreground">Sin resultados</div>;
                return lista.map(p => {
                  const yaAsig = yaAsignados.includes(p.id);
                  const sel = perfilesSeleccionados.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={yaAsig}
                      onClick={() => !yaAsig && togglePerfil(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                        ${yaAsig ? 'bg-muted/40 cursor-not-allowed opacity-60'
                          : sel ? 'bg-primary/8 hover:bg-primary/12'
                          : 'hover:bg-muted/50'}`}
                    >
                      <div className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors
                        ${yaAsig ? 'border-muted-foreground/30 bg-muted/30'
                          : sel ? 'border-primary bg-primary'
                          : 'border-border bg-background'}`}>
                        {(yaAsig || sel) && (
                          <svg className={`h-2.5 w-2.5 ${yaAsig ? 'text-muted-foreground' : 'text-primary-foreground'}`} viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={p.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {(p.nombre || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.nombre || '(sin nombre)'}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.cargo || p.email || '—'}</p>
                      </div>
                      {yaAsig && <Badge className="bg-green-100 text-green-800 border-0 text-xs shrink-0">Ya asignado</Badge>}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setAsignarDialog(false)}>Cancelar</Button>
            <Button onClick={handleAsignarResponsables} disabled={savingAsig || perfilesSeleccionados.length === 0}>
              {savingAsig ? 'Guardando...' : `Asignar${perfilesSeleccionados.length > 0 ? ` (${perfilesSeleccionados.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Nuevo Activo ═══════════════════════════════════════════════ */}
      <Dialog open={activoDialog} onOpenChange={setActivoDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nuevo Activo Fijo — {espacio.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Código — sin restricción de dígitos */}
            <div className="space-y-2">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ej: 00123"
                value={activoForm.codigo}
                onChange={e => setActivoForm(f => ({ ...f, codigo: e.target.value }))}
              />
            </div>
            {/* Nombre */}
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: Computador portátil HP" value={activoForm.nombre}
                onChange={e => setActivoForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            {/* Categoría desde catálogo */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={activoForm.categoria} onValueChange={v => setActivoForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  {catCategorias.length === 0
                    ? <SelectItem value="-" disabled>Sin categorías registradas</SelectItem>
                    : catCategorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            {/* Estado desde catálogo */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={activoForm.estado} onValueChange={v => setActivoForm(f => ({ ...f, estado: v as ActivoFijo['estado'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catEstadosActivo.length === 0
                    ? (['En funcionamiento', 'Daño parcial', 'En reparación', 'Dado de baja'] as const).map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))
                    : catEstadosActivo.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            {/* Responsable — solo asignados al espacio */}
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={activoForm.responsable} onValueChange={v => setActivoForm(f => ({ ...f, responsable: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar responsable..." /></SelectTrigger>
                <SelectContent>
                  {responsables.length === 0
                    ? <SelectItem value="-" disabled>Sin responsables asignados a este espacio</SelectItem>
                    : responsables.map(r => (
                        <SelectItem key={r.perfil.id} value={r.perfil.nombre || r.perfil.email || r.perfil.id}>
                          {r.perfil.nombre || r.perfil.email}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            {/* Proveedor con default "Sin proveedor asignado" */}
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={activoForm.proveedor} onValueChange={v => setActivoForm(f => ({ ...f, proveedor: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin proveedor asignado">Sin proveedor asignado</SelectItem>
                  {catProveedores.map(p => (
                    <SelectItem key={p.nombre} value={p.nombre}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Observaciones */}
            <div className="space-y-2 md:col-span-2">
              <Label>Observaciones</Label>
              <Textarea rows={2}
                placeholder="Anotar referencias, marcas, componentes entre otros datos relevantes para identificar el activo."
                value={activoForm.observaciones}
                onChange={e => setActivoForm(f => ({ ...f, observaciones: e.target.value }))} />
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
              {viewingActivo.foto_url && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={viewingActivo.foto_url} alt={viewingActivo.nombre} className="w-full h-full object-contain" />
                </div>
              )}
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
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Información Financiera</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Valor de Adquisición ($)', value: viewingActivo.valor ? formatCurrency(viewingActivo.valor) : '—' },
                    { label: 'IVA (%)', value: viewingActivo.iva != null ? `${viewingActivo.iva}%` : '—' },
                    { label: 'Fecha de Adquisición', value: formatDate(viewingActivo.fecha_adquisicion) },
                    { label: 'No. Factura', value: viewingActivo.factura || '—' },
                    { label: '¿Es Depreciable?', value: viewingActivo.depreciable ? 'Sí' : 'No' },
                    { label: 'Tiempo de Depreciación (años)', value: viewingActivo.tiempo_depreciacion ? `${viewingActivo.tiempo_depreciacion} años` : '—' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Asignación</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Espacio Asignado', value: espacio?.nombre || '—' },
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
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observaciones</h3>
                <p className="text-sm text-muted-foreground text-pretty">
                  {viewingActivo.observaciones || 'Sin observaciones registradas.'}
                </p>
              </div>
              <div className="pt-2 border-t text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>Registrado: {formatDate(viewingActivo.created_at)}</span>
                <span>Actualizado: {formatDate(viewingActivo.updated_at)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewActivoDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Nueva Intervención ═════════════════════════════════════════ */}
      <Dialog open={intervDialog} onOpenChange={setIntervDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Nueva Intervención — {espacio.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de intervención</Label>
              <Select value={intervForm.tipo} onValueChange={v => setIntervForm(f => ({ ...f, tipo: v as Intervencion['tipo'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Mantenimiento preventivo', 'Mantenimiento correctivo', 'Remodelación',
                    'Adecuación', 'Construcción nueva', 'Modificación eléctrica',
                    'Modificación hidráulica', 'Reparación de emergencia'] as const).map(t => (
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
                  {(['Alta', 'Media', 'Baja'] as const).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de solicitud</Label>
              <Input type="date" value={intervForm.fecha_solicitud}
                onChange={e => setIntervForm(f => ({ ...f, fecha_solicitud: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Área solicitante</Label>
              <Input placeholder="Ej: Rectoría, Sistemas..." value={intervForm.area_solicitante}
                onChange={e => setIntervForm(f => ({ ...f, area_solicitante: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descripción del problema <span className="text-destructive">*</span></Label>
              <Textarea rows={3} placeholder="Describe el problema o la necesidad de intervención..."
                value={intervForm.descripcion_problema}
                onChange={e => setIntervForm(f => ({ ...f, descripcion_problema: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Justificación (opcional)</Label>
              <Textarea rows={2} placeholder="Justificación técnica o administrativa..."
                value={intervForm.justificacion}
                onChange={e => setIntervForm(f => ({ ...f, justificacion: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
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
                  <input type="file" accept="image/*" id="interv-foto-detalle" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadIntervImg(f); e.target.value = ''; }} />
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => document.getElementById('interv-foto-detalle')?.click()}
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
