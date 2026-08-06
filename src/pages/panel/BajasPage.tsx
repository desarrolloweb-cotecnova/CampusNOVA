import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2, ShieldCheck, Clock, FileText, Lock, ChevronDown, ChevronRight, X, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useAuth } from '@/contexts/AuthContext';
import type { MotivoBaja } from '@/types/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { fetchAllRows } from '@/lib/supabase-fetch';
import { generarActaBajaPDF, type ActivoActaBaja } from '@/lib/acta-baja';
import { uploadImageToCloudinary, getCloudinaryFull, getCloudinaryThumbnail } from '@/lib/cloudinary';
import { toast } from 'sonner';

const MOTIVOS: MotivoBaja[] = ['Deterioro', 'Robo', 'Obsolescencia', 'Donación', 'Otro'];

/** Roles habilitados para registrar una baja de activos. */
const ROLES_REGISTRAN = ['admin', 'infraestructura', 'rector', 'rectoria'];

/** Estados de la baja. El visto bueno del rector es lo que la completa. */
const ESTADO_PENDIENTE = 'Pendiente de visto bueno';
const ESTADO_CON_VISTO_BUENO = 'Con visto bueno';

/** Opción del selector para los activos que no tienen espacio asignado. */
const ESPACIO_SIN_ASIGNAR = 'sin-espacio';

/** Filas del selector que se pintan a la vez; el resto se acota con la búsqueda. */
const MAX_ACTIVOS_VISIBLES = 100;

/** Etiquetas de activos seleccionados que se listan antes de resumir el resto. */
const MAX_CHIPS_SELECCION = 30;

/** Tamaño de bloque para insertar y actualizar en lotes grandes. */
const BLOQUE_ESCRITURA = 500;

/** Tope del archivo de evidencia antes de comprimir, en bytes. */
const MAX_FOTO_BYTES = 10 * 1024 * 1024;

interface ActivoOpcion {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  valor: number | null;
  espacio_id: string | null;
  responsable: string | null;
}

interface EspacioOpcion {
  id: string;
  codigo: string | null;
  nombre: string;
}

interface PerfilOpcion {
  id: string;
  nombre: string | null;
  cargo: string | null;
  role: string;
}

/**
 * Baja tal como se muestra en el historial: un lote agrupa todos los activos
 * que se dieron de baja juntos compartiendo los mismos datos.
 */
interface LoteBaja {
  lote_id: string;
  motivo: string;
  fecha_baja: string;
  created_at: string;
  descripcion: string | null;
  espacio: string;
  responsable_activo: string | null;
  realizada_por: string | null;
  estado: string;
  visto_bueno_rector: string | null;
  visto_bueno_fecha: string | null;
  foto_evidencia_url: string | null;
  activos: ActivoActaBaja[];
}

interface BajaForm {
  activo_ids: string[];
  espacio_id: string;
  motivo: MotivoBaja;
  responsable_activo: string;
  fecha_baja: string;
  descripcion: string;
  foto_evidencia_url: string;
}

const EMPTY_FORM: BajaForm = {
  activo_ids: [], espacio_id: '', motivo: 'Deterioro', responsable_activo: '',
  fecha_baja: new Date().toISOString().slice(0, 10), descripcion: '',
  foto_evidencia_url: '',
};

/** Divide una lista en bloques para no enviar una petición desmedida. */
function enBloques<T>(items: T[], tam: number): T[][] {
  const bloques: T[][] = [];
  for (let i = 0; i < items.length; i += tam) bloques.push(items.slice(i, i + tam));
  return bloques;
}

/** Etiqueta de un espacio: "CÓDIGO — Nombre". */
function etiquetaEspacio(e: { codigo?: string | null; nombre?: string | null } | null | undefined): string {
  if (!e) return '—';
  return [e.codigo, e.nombre].filter(Boolean).join(' — ') || '—';
}

export default function BajasPage() {
  const { profile } = useAuth();
  const [lotes, setLotes] = useState<LoteBaja[]>([]);
  const [activos, setActivos] = useState<ActivoOpcion[]>([]);
  const [espacios, setEspacios] = useState<EspacioOpcion[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilOpcion[]>([]);
  const [asignaciones, setAsignaciones] = useState<{ espacio_id: string; responsable_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BajaForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busquedaActivo, setBusquedaActivo] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [vistoBuenoEnCurso, setVistoBuenoEnCurso] = useState<string | null>(null);
  // Se puede llegar con ?pendientes=1 para ver solo lo que espera el visto
  // bueno del rector.
  const [searchParams, setSearchParams] = useSearchParams();
  const soloPendientes = searchParams.get('pendientes') === '1';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: bajasData }, { data: actData }, { data: espData }, { data: perfData }, { data: asigData }] = await Promise.all([
      // Paginado: una baja masiva genera una fila por activo, así que el
      // historial crece mucho más rápido que el tope por respuesta.
      fetchAllRows(() =>
        supabase
          .from('bajas_activos')
          .select(`
            id, lote_id, motivo, descripcion, fecha_baja, created_at,
            estado, visto_bueno_rector, visto_bueno_fecha,
            responsable_activo, realizada_por, foto_evidencia_url,
            activo:activos_fijos(codigo, nombre, categoria, valor),
            espacio:espacios_fisicos(codigo, nombre)
          `)
          .order('created_at', { ascending: false })
          .order('id')
      ),
      // El selector debe ofrecer todo el inventario, no las primeras 1.000 filas.
      fetchAllRows(() =>
        supabase.from('activos_fijos')
          .select('id, codigo, nombre, categoria, valor, espacio_id, responsable')
          .eq('dado_de_baja', false)
          .order('codigo')
          .order('id')
      ),
      supabase.from('espacios_fisicos').select('id, codigo, nombre').order('codigo'),
      supabase.from('profiles').select('id, nombre, cargo, role').eq('activo', true).order('nombre'),
      supabase.from('asignaciones_espacios').select('espacio_id, responsable_id').eq('activo', true),
    ]);

    // Agrupa las filas por lote conservando el orden (ya vienen por fecha desc).
    const porLote = new Map<string, LoteBaja>();
    for (const d of Array.isArray(bajasData) ? bajasData : []) {
      const fila = d as Record<string, unknown>;
      const loteId = (fila.lote_id as string) ?? (fila.id as string);
      let lote = porLote.get(loteId);
      if (!lote) {
        lote = {
          lote_id: loteId,
          motivo: fila.motivo as string,
          fecha_baja: fila.fecha_baja as string,
          created_at: fila.created_at as string,
          descripcion: (fila.descripcion as string) || null,
          espacio: etiquetaEspacio(fila.espacio as EspacioOpcion | null),
          responsable_activo: (fila.responsable_activo as string) || null,
          realizada_por: (fila.realizada_por as string) || null,
          estado: (fila.estado as string) || ESTADO_PENDIENTE,
          visto_bueno_rector: (fila.visto_bueno_rector as string) || null,
          visto_bueno_fecha: (fila.visto_bueno_fecha as string) || null,
          foto_evidencia_url: (fila.foto_evidencia_url as string) || null,
          activos: [],
        };
        porLote.set(loteId, lote);
      }
      const activo = fila.activo as ActivoActaBaja | null;
      if (activo) lote.activos.push(activo);
    }

    setLotes([...porLote.values()]);
    setActivos(Array.isArray(actData) ? (actData as unknown as ActivoOpcion[]) : []);
    setEspacios(Array.isArray(espData) ? (espData as EspacioOpcion[]) : []);
    setPerfiles(Array.isArray(perfData) ? (perfData as PerfilOpcion[]) : []);
    setAsignaciones(Array.isArray(asigData) ? (asigData as { espacio_id: string; responsable_id: string }[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresca cuando otro usuario cambia los datos, sin recargar la pantalla.
  useRealtimeTable(['bajas_activos', 'activos_fijos'], loadData);

  /** Nombres de los responsables asignados a cada espacio. */
  const responsablesPorEspacio = useMemo(() => {
    const porId = new Map(perfiles.map(p => [p.id, p]));
    const mapa = new Map<string, string[]>();
    for (const a of asignaciones) {
      const nombre = porId.get(a.responsable_id)?.nombre?.trim();
      if (!nombre) continue;
      const actuales = mapa.get(a.espacio_id) ?? [];
      if (!actuales.includes(nombre)) actuales.push(nombre);
      mapa.set(a.espacio_id, actuales);
    }
    return mapa;
  }, [asignaciones, perfiles]);

  /**
   * Quien realiza la baja es el usuario autenticado, no una elección: el acta
   * debe reflejar quién la registró.
   */
  const puedeRegistrar = ROLES_REGISTRAN.includes(profile?.role ?? '');
  /** Solo el rector refrenda: es su visto bueno lo que completa la baja. */
  const puedeDarVistoBueno = profile?.role === 'rector';
  const nombreRegistra = profile?.nombre?.trim() || '';

  /** Rector vigente, para informar de quién se espera el visto bueno. */
  const rector = useMemo(
    () => perfiles.find(p => p.role === 'rector' && p.nombre?.trim())?.nombre?.trim() || '',
    [perfiles],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = soloPendientes ? lotes.filter(l => l.estado === ESTADO_PENDIENTE) : lotes;
    if (!q) return base;
    return base.filter(l =>
      [l.motivo, l.descripcion, l.espacio, l.responsable_activo, l.realizada_por]
        .some(f => f?.toLowerCase().includes(q)) ||
      l.activos.some(a => a.codigo?.toLowerCase().includes(q) || a.nombre?.toLowerCase().includes(q))
    );
  }, [lotes, search, soloPendientes]);

  const pendientes = useMemo(() => lotes.filter(l => l.estado === ESTADO_PENDIENTE).length, [lotes]);

  // ─── Selector de activos ─────────────────────────────────────────────────
  /** Activos del espacio elegido, sin aplicar la búsqueda por texto. */
  const activosDelEspacio = useMemo(() => {
    if (!form.espacio_id) return [];
    if (form.espacio_id === ESPACIO_SIN_ASIGNAR) return activos.filter(a => !a.espacio_id);
    return activos.filter(a => a.espacio_id === form.espacio_id);
  }, [activos, form.espacio_id]);

  const activosFiltrados = useMemo(() => {
    const q = busquedaActivo.trim().toLowerCase();
    if (!q) return activosDelEspacio;
    return activosDelEspacio.filter(a =>
      a.codigo?.toLowerCase().includes(q) || a.nombre?.toLowerCase().includes(q)
    );
  }, [activosDelEspacio, busquedaActivo]);

  const seleccionados = useMemo(() => new Set(form.activo_ids), [form.activo_ids]);
  const activosPorId = useMemo(() => new Map(activos.map(a => [a.id, a])), [activos]);

  /**
   * Candidatos a responsable del espacio elegido: los responsables asignados al
   * espacio y los nombres que los propios activos tienen registrados. Todos los
   * activos están asociados a un responsable, así que en la práctica el acta se
   * diligencia sola; el campo queda editable solo por si el dato falta.
   */
  const responsablesCandidatos = useMemo(() => {
    const nombres = [...(responsablesPorEspacio.get(form.espacio_id) ?? [])];
    for (const a of activosDelEspacio) {
      const n = a.responsable?.trim();
      if (n && !nombres.includes(n)) nombres.push(n);
    }
    return nombres;
  }, [responsablesPorEspacio, form.espacio_id, activosDelEspacio]);

  /** Responsables distintos entre los activos seleccionados. */
  const responsablesSeleccion = useMemo(() => {
    const nombres = new Set<string>();
    for (const id of form.activo_ids) {
      const n = activosPorId.get(id)?.responsable?.trim();
      if (n) nombres.add(n);
    }
    return [...nombres];
  }, [form.activo_ids, activosPorId]);

  const valorSeleccion = useMemo(
    () => form.activo_ids.reduce((s, id) => s + (activosPorId.get(id)?.valor ?? 0), 0),
    [form.activo_ids, activosPorId],
  );

  /** Responsable común de una selección de activos, si todos comparten el mismo. */
  const responsableDe = (ids: string[]): string => {
    const nombres = new Set(ids.map(id => activosPorId.get(id)?.responsable?.trim()).filter(Boolean) as string[]);
    return nombres.size === 1 ? [...nombres][0] : '';
  };

  const toggleActivo = (id: string) => {
    setForm(f => {
      const activo_ids = f.activo_ids.includes(id) ? f.activo_ids.filter(x => x !== id) : [...f.activo_ids, id];
      return { ...f, activo_ids, responsable_activo: f.responsable_activo || responsableDe(activo_ids) };
    });
  };

  const seleccionarFiltrados = () => {
    setForm(f => {
      const activo_ids = [...new Set([...f.activo_ids, ...activosFiltrados.map(a => a.id)])];
      return { ...f, activo_ids, responsable_activo: f.responsable_activo || responsableDe(activo_ids) };
    });
  };

  /**
   * Al elegir el espacio se precarga su responsable asignado y se descartan los
   * activos ya seleccionados que no pertenezcan al nuevo espacio, para que no se
   * cuele en la baja un activo elegido bajo el espacio anterior.
   */
  const cambiarEspacio = (valor: string) => {
    const nombres = responsablesPorEspacio.get(valor) ?? [];
    const conservados = form.activo_ids.filter(id => {
      const espacio = activosPorId.get(id)?.espacio_id ?? null;
      return valor === ESPACIO_SIN_ASIGNAR ? espacio === null : espacio === valor;
    });
    const descartados = form.activo_ids.length - conservados.length;
    setForm(f => ({
      ...f,
      espacio_id: valor,
      activo_ids: conservados,
      responsable_activo: nombres.length === 1 ? nombres[0] : responsableDe(conservados),
    }));
    setBusquedaActivo('');
    if (descartados > 0) {
      toast.info(
        `Se quitaron ${descartados} activo${descartados !== 1 ? 's' : ''} de la selección por no estar en el espacio elegido`,
      );
    }
  };

  const abrirDialogo = () => {
    setForm(EMPTY_FORM);
    setBusquedaActivo('');
    setDialogOpen(true);
  };

  /**
   * Evidencia de la baja. Va al mismo repositorio de imágenes que las fotos de
   * los espacios, los activos y las novedades: `uploadImageToCloudinary`
   * comprime en el cliente antes de subir, así que una foto tomada con el móvil
   * no satura la conexión.
   */
  const subirEvidencia = async (file: File) => {
    if (file.size > MAX_FOTO_BYTES) { toast.error('La imagen no puede superar 10 MB'); return; }
    setSubiendoFoto(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setForm(f => ({ ...f, foto_evidencia_url: url }));
      toast.success('Evidencia cargada');
    } catch (err) {
      toast.error('Error al subir la evidencia: ' + (err as Error).message);
    }
    setSubiendoFoto(false);
  };

  const toggleExpandido = (loteId: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(loteId) ? next.delete(loteId) : next.add(loteId);
      return next;
    });
  };

  /**
   * El rector refrenda la baja. Se marcan todas las filas del lote: el visto
   * bueno es sobre la baja completa, no sobre un activo suelto.
   */
  const darVistoBueno = async (lote: LoteBaja) => {
    const nombre = profile?.nombre?.trim();
    if (!puedeDarVistoBueno || !nombre) return;
    setVistoBuenoEnCurso(lote.lote_id);
    const { error } = await supabase
      .from('bajas_activos')
      .update({
        estado: ESTADO_CON_VISTO_BUENO,
        visto_bueno_rector: nombre,
        visto_bueno_por: profile?.id ?? null,
        visto_bueno_fecha: new Date().toISOString(),
      })
      .eq('lote_id', lote.lote_id);
    setVistoBuenoEnCurso(null);
    if (error) { toast.error('No se pudo registrar el visto bueno: ' + error.message); return; }
    toast.success(`Visto bueno registrado sobre ${lote.activos.length} activo${lote.activos.length !== 1 ? 's' : ''}`);
    loadData();
  };

  const handleActa = async (lote: LoteBaja) => {
    // El acta solo existe una vez refrendada. El botón ya está deshabilitado
    // mientras está pendiente; esto cubre el caso de que el estado cambie entre
    // el render y el clic.
    if (lote.estado !== ESTADO_CON_VISTO_BUENO) {
      toast.info('El acta estará disponible cuando el rector dé el visto bueno a la baja.');
      return;
    }
    try {
      await generarActaBajaPDF({
        loteId: lote.lote_id,
        motivo: lote.motivo,
        fechaBaja: lote.fecha_baja,
        espacio: lote.espacio,
        responsableActivo: lote.responsable_activo || '',
        realizaBaja: lote.realizada_por || '',
        vistoBuenoRector: lote.visto_bueno_rector || '',
        descripcion: lote.descripcion || '',
        activos: lote.activos,
      });
    } catch (err) {
      toast.error('Error al generar el acta: ' + (err as Error).message);
    }
  };

  const handleSave = async () => {
    if (!puedeRegistrar) { toast.error('Tu rol no permite registrar bajas de activos'); return; }
    if (!form.espacio_id) { toast.error('Selecciona el espacio de los activos'); return; }
    if (form.activo_ids.length === 0) { toast.error('Selecciona al menos un activo'); return; }
    // Red de seguridad: la interfaz ya solo ofrece activos del espacio elegido,
    // pero si el inventario cambió mientras el diálogo estaba abierto la
    // selección podría haber quedado desfasada.
    const fueraDelEspacio = form.activo_ids.filter(id => {
      const espacio = activosPorId.get(id)?.espacio_id ?? null;
      return form.espacio_id === ESPACIO_SIN_ASIGNAR ? espacio !== null : espacio !== form.espacio_id;
    });
    if (fueraDelEspacio.length > 0) {
      toast.error('Hay activos seleccionados que ya no están en el espacio elegido. Vuelve a elegirlos.');
      return;
    }
    if (!form.responsable_activo.trim()) { toast.error('Indica quién es el responsable de los activos'); return; }
    // La foto es la evidencia de la baja: sin ella el acta queda sin respaldo.
    if (!form.foto_evidencia_url) { toast.error('Adjunta la foto de evidencia de la baja'); return; }
    if (subiendoFoto) { toast.error('Espera a que termine de subir la evidencia'); return; }

    setSaving(true);
    const loteId = crypto.randomUUID();
    const base = {
      lote_id: loteId,
      motivo: form.motivo,
      descripcion: form.descripcion || null,
      fecha_baja: form.fecha_baja,
      espacio_id: form.espacio_id === ESPACIO_SIN_ASIGNAR ? null : form.espacio_id,
      responsable_activo: form.responsable_activo.trim(),
      realizada_por: nombreRegistra || null,
      foto_evidencia_url: form.foto_evidencia_url,
      estado: ESTADO_PENDIENTE,
      registrado_por: profile?.id ?? null,
    };

    // Un registro por activo: conserva la trazabilidad individual y `lote_id`
    // los mantiene unidos como una sola baja.
    for (const bloque of enBloques(form.activo_ids, BLOQUE_ESCRITURA)) {
      const { error } = await supabase
        .from('bajas_activos')
        .insert(bloque.map(activo_id => ({ ...base, activo_id })));
      if (error) {
        setSaving(false);
        toast.error('Error al registrar la baja: ' + error.message);
        return;
      }
    }

    // La baja se aplica de inmediato al inventario, igual que un movimiento:
    // este debe seguir reflejando qué bienes están realmente en servicio. El
    // acta es lo que queda pendiente del visto bueno del rector.
    for (const bloque of enBloques(form.activo_ids, BLOQUE_ESCRITURA)) {
      const { error } = await supabase
        .from('activos_fijos')
        .update({ dado_de_baja: true, estado: 'Dado de baja' })
        .in('id', bloque);
      if (error) {
        setSaving(false);
        toast.error('La baja quedó registrada, pero no se pudo actualizar el inventario: ' + error.message);
        return;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success(
      `Baja registrada: ${form.activo_ids.length} activo${form.activo_ids.length !== 1 ? 's' : ''}. ` +
      'El acta quedará disponible cuando el rector dé el visto bueno.',
    );
    loadData();
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Toolbar */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por activo, código, espacio, responsable o motivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={abrirDialogo} disabled={!puedeRegistrar}
                title={puedeRegistrar ? undefined : 'Tu rol no permite registrar bajas de activos'}>
                <Plus className="h-4 w-4 mr-1.5" /> Registrar Baja
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historial agrupado por lote */}
        <Card className="shadow-card min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap space-y-0">
            <CardTitle className="text-base">
              {soloPendientes ? 'Bajas pendientes de visto bueno' : 'Bajas de Activos'} ({filtered.length})
            </CardTitle>
            {(pendientes > 0 || soloPendientes) && (
              <Button
                variant={soloPendientes ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchParams(soloPendientes ? {} : { pendientes: '1' })}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                {soloPendientes ? 'Ver todas' : `Pendientes de visto bueno (${pendientes})`}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Motivo</TableHead>
                    <TableHead className="whitespace-nowrap">Activos</TableHead>
                    <TableHead className="whitespace-nowrap">Espacio</TableHead>
                    <TableHead className="whitespace-nowrap">Responsable</TableHead>
                    <TableHead className="whitespace-nowrap">Realiza la baja</TableHead>
                    <TableHead className="whitespace-nowrap">Visto bueno</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(9).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Trash2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        Sin bajas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(l => {
                      const abierto = expandidos.has(l.lote_id);
                      const valorTotal = l.activos.reduce((s, a) => s + (a.valor ?? 0), 0);
                      return [
                        <TableRow key={l.lote_id}>
                          <TableCell className="p-0 pl-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleExpandido(l.lote_id)}
                              aria-label={abierto ? 'Ocultar activos' : 'Ver activos'}>
                              {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(l.fecha_baja)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className="bg-red-100 text-red-800 border-0 text-xs">{l.motivo}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <button type="button" onClick={() => toggleExpandido(l.lote_id)} className="text-sm font-medium hover:underline">
                              {l.activos.length} activo{l.activos.length !== 1 ? 's' : ''}
                            </button>
                            <p className="text-xs text-muted-foreground">{formatCurrency(valorTotal)}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{l.espacio}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{l.responsable_activo || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{l.realizada_por || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {l.estado === ESTADO_CON_VISTO_BUENO ? (
                              <div className="text-xs">
                                <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                  <ShieldCheck className="h-3 w-3 mr-1" /> Visto bueno
                                </Badge>
                                <p className="text-muted-foreground mt-0.5">{l.visto_bueno_rector}</p>
                              </div>
                            ) : puedeDarVistoBueno ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                disabled={vistoBuenoEnCurso === l.lote_id}
                                onClick={() => darVistoBueno(l)}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                {vistoBuenoEnCurso === l.lote_id ? 'Registrando...' : 'Dar visto bueno'}
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-xs font-normal">
                                <Clock className="h-3 w-3 mr-1" /> Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {/* El acta se habilita solo con el visto bueno del
                                rector: así no se imprime un documento que aún no
                                está refrendado. */}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={l.estado !== ESTADO_CON_VISTO_BUENO}
                              onClick={() => handleActa(l)}
                              title={l.estado === ESTADO_CON_VISTO_BUENO
                                ? 'Descargar el acta de la baja'
                                : 'Disponible cuando el rector dé el visto bueno'}
                            >
                              {l.estado === ESTADO_CON_VISTO_BUENO
                                ? <FileText className="h-3.5 w-3.5 mr-1" />
                                : <Lock className="h-3.5 w-3.5 mr-1" />}
                              Acta
                            </Button>
                          </TableCell>
                        </TableRow>,
                        abierto && (
                          <TableRow key={`${l.lote_id}-detalle`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="py-3">
                              {l.descripcion && <p className="text-xs mb-2"><span className="font-medium">Descripción:</span> {l.descripcion}</p>}
                              {/* La evidencia solo sirve si se puede consultar:
                                  miniatura que abre la foto completa. */}
                              {l.foto_evidencia_url && (
                                <div className="mb-3">
                                  <p className="text-xs font-medium mb-1">Evidencia:</p>
                                  <a href={getCloudinaryFull(l.foto_evidencia_url)} target="_blank" rel="noreferrer">
                                    <img
                                      src={getCloudinaryThumbnail(l.foto_evidencia_url)}
                                      alt="Evidencia de la baja"
                                      className="h-24 w-24 object-cover rounded-lg border border-border hover:opacity-90"
                                    />
                                  </a>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                                {l.activos.map((a, i) => (
                                  <p key={`${a.codigo}-${i}`} className="text-xs">
                                    <span className="font-mono text-muted-foreground">{a.codigo}</span> — {a.nombre}
                                    <span className="text-muted-foreground"> ({formatCurrency(a.valor ?? 0)})</span>
                                  </p>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ),
                      ];
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Registrar baja */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Baja de Activos</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v as MotivoBaja }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de la baja</Label>
                <input type="date" value={form.fecha_baja} onChange={e => setForm(f => ({ ...f, fecha_baja: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Espacio de los activos *</Label>
                <Select value={form.espacio_id} onValueChange={cambiarEspacio}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
                  <SelectContent>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{etiquetaEspacio(e)}</SelectItem>)}
                    <SelectItem value={ESPACIO_SIN_ASIGNAR}>Activos sin espacio asignado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector múltiple de activos con búsqueda por código */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label>Activos * <span className="text-muted-foreground font-normal">({form.activo_ids.length} seleccionados)</span></Label>
                  {form.activo_ids.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm(f => ({ ...f, activo_ids: [] }))}>
                      Limpiar selección
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por código o nombre..."
                    value={busquedaActivo}
                    onChange={e => setBusquedaActivo(e.target.value)}
                    disabled={!form.espacio_id}
                  />
                </div>
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {!form.espacio_id ? (
                    <p className="text-sm text-muted-foreground text-center py-6 px-4">
                      Selecciona primero el espacio: la baja se registra sobre los activos de un mismo espacio y su responsable.
                    </p>
                  ) : activosDelEspacio.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 px-4">
                      El espacio no tiene activos activos en el inventario.
                    </p>
                  ) : activosFiltrados.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Ningún activo coincide con la búsqueda</p>
                  ) : (
                    activosFiltrados.slice(0, MAX_ACTIVOS_VISIBLES).map(a => (
                      // La fila completa alterna la selección. La casilla es
                      // decorativa (pointer-events-none) para que el clic no se
                      // procese dos veces.
                      <div
                        key={a.id}
                        role="checkbox"
                        aria-checked={seleccionados.has(a.id)}
                        tabIndex={0}
                        onClick={() => toggleActivo(a.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleActivo(a.id); }
                        }}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                      >
                        <Checkbox checked={seleccionados.has(a.id)} tabIndex={-1} className="pointer-events-none" />
                        <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{a.codigo}</span>
                        <span className="text-sm truncate flex-1">{a.nombre}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(a.valor ?? 0)}</span>
                      </div>
                    ))
                  )}
                </div>
                {form.espacio_id && activosDelEspacio.length > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="text-muted-foreground">
                      {activosFiltrados.length > MAX_ACTIVOS_VISIBLES
                        ? `Mostrando ${MAX_ACTIVOS_VISIBLES} de ${activosFiltrados.length} — afina la búsqueda para ver el resto`
                        : busquedaActivo.trim()
                          ? `${activosFiltrados.length} de ${activosDelEspacio.length} activos del espacio`
                          : `${activosDelEspacio.length} activo${activosDelEspacio.length !== 1 ? 's' : ''} en el espacio`}
                    </span>
                    {activosFiltrados.length > 0 && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={seleccionarFiltrados}>
                        Seleccionar los {activosFiltrados.length}
                      </Button>
                    )}
                  </div>
                )}
                {form.activo_ids.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {/* Una baja masiva puede abarcar decenas de activos: se
                          muestran los primeros y el resto se resume. */}
                      {form.activo_ids.slice(0, MAX_CHIPS_SELECCION).map(id => {
                        const a = activosPorId.get(id);
                        if (!a) return null;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 font-normal">
                            <span className="font-mono text-[11px]">{a.codigo}</span>
                            <button type="button" onClick={() => toggleActivo(id)} aria-label={`Quitar ${a.codigo}`}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                      {form.activo_ids.length > MAX_CHIPS_SELECCION && (
                        <Badge variant="outline" className="font-normal">
                          +{form.activo_ids.length - MAX_CHIPS_SELECCION} más
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valor total que se dará de baja: <span className="font-medium text-foreground">{formatCurrency(valorSeleccion)}</span>.
                      Los activos quedarán marcados como dados de baja en el inventario.
                    </p>
                  </>
                )}
              </div>

              {/* Responsable: sale del activo o del espacio; queda editable por
                  si el dato no está registrado. */}
              <div className="space-y-2">
                <Label>Responsable de los activos *</Label>
                {responsablesCandidatos.length > 0 ? (
                  <Select value={form.responsable_activo || undefined} onValueChange={v => setForm(f => ({ ...f, responsable_activo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                    <SelectContent>
                      {responsablesCandidatos.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.responsable_activo}
                    onChange={e => setForm(f => ({ ...f, responsable_activo: e.target.value }))}
                    placeholder={form.espacio_id ? 'El espacio no tiene responsable asignado' : 'Selecciona un espacio'}
                  />
                )}
                {responsablesSeleccion.length > 1 && (
                  <p className="text-xs text-secondary-foreground">
                    Los activos seleccionados están a cargo de {responsablesSeleccion.length} responsables distintos
                    ({responsablesSeleccion.join(', ')}). El acta firma con el que elijas; si necesitas separarlos,
                    registra una baja por responsable.
                  </p>
                )}
              </div>

              {/* Quien realiza la baja no se pregunta: es el usuario de la
                  sesión. Se muestra solo para que quede claro qué nombre llevará
                  el acta. */}
              <div className="space-y-2">
                <Label>Realiza la baja</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {nombreRegistra || 'Tu usuario no tiene nombre configurado'}
                  {profile?.cargo && <span className="text-muted-foreground"> — {profile.cargo}</span>}
                </div>
              </div>

              {/* Evidencia gráfica: obligatoria, porque es lo que respalda el
                  acta ante un tercero. Se guarda en el mismo repositorio de
                  imágenes que las fotos de los espacios. */}
              <div className="md:col-span-2 space-y-2">
                <Label>Foto de evidencia *</Label>
                <div className="flex items-center gap-3">
                  {form.foto_evidencia_url ? (
                    <div className="relative">
                      <img
                        src={getCloudinaryThumbnail(form.foto_evidencia_url)}
                        alt="Evidencia de la baja"
                        className="h-20 w-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        aria-label="Quitar la evidencia"
                        onClick={() => setForm(f => ({ ...f, foto_evidencia_url: '' }))}
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
                        onChange={e => { const f = e.target.files?.[0]; if (f) subirEvidencia(f); e.target.value = ''; }}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={subiendoFoto} asChild>
                        <span>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {subiendoFoto ? 'Subiendo...' : form.foto_evidencia_url ? 'Cambiar foto' : 'Subir foto'}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estado en que quedan los activos. JPG, PNG o WEBP · máx 10 MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Detalles sobre la baja de los activos..." />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">
                  La baja queda registrada a tu nombre por ser el usuario autenticado.
                  {rector
                    ? ` Quedará pendiente del visto bueno del rector (${rector}); el acta se habilita cuando lo dé.`
                    : ' Quedará pendiente del visto bueno del rector; el acta se habilita cuando lo dé.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {saving ? 'Guardando...' : `Registrar baja${form.activo_ids.length > 0 ? ` (${form.activo_ids.length})` : ''}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
