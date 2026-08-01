import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Search, Plus, FileText, ChevronDown, ChevronRight, X, ShieldCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { fetchAllRows } from '@/lib/supabase-fetch';
import { generarActaMovimientoPDF, type ActivoActa } from '@/lib/acta-movimiento';
import { toast } from 'sonner';

const TIPOS_MOVIMIENTO = ['Traslado', 'Préstamo', 'Cambio de responsable', 'Mantenimiento', 'Retiro temporal', 'Otro'];

/** Roles habilitados para aprobar un movimiento de activos. */
const ROLES_APRUEBAN = ['infraestructura', 'admin'];

/** Filas del selector que se pintan a la vez; el resto se acota con la búsqueda. */
const MAX_ACTIVOS_VISIBLES = 100;

/** Etiquetas de activos seleccionados que se listan antes de resumir el resto. */
const MAX_CHIPS_SELECCION = 30;

/** Tamaño de bloque para insertar y actualizar en lotes grandes. */
const BLOQUE_ESCRITURA = 500;

const SIN_ESPACIO = 'none';

/** Estados del movimiento. El visto bueno del rector es lo que lo completa. */
const ESTADO_PENDIENTE = 'Pendiente de visto bueno';
const ESTADO_CON_VISTO_BUENO = 'Con visto bueno';

interface ActivoOpcion {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  estado: string | null;
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
 * Movimiento tal como se muestra en el historial: un lote agrupa todos los
 * activos que se movieron juntos compartiendo los mismos datos.
 */
interface LoteMovimiento {
  lote_id: string;
  tipo_movimiento: string;
  fecha_movimiento: string;
  created_at: string;
  espacio_origen: string;
  espacio_destino: string;
  responsable_anterior: string | null;
  responsable_nuevo: string | null;
  aprobado_por: string | null;
  estado: string;
  visto_bueno_rector: string | null;
  visto_bueno_fecha: string | null;
  motivo: string | null;
  observaciones: string | null;
  activos: ActivoActa[];
}

interface MovimientoForm {
  activo_ids: string[];
  tipo_movimiento: string;
  espacio_origen_id: string;
  espacio_destino_id: string;
  responsable_anterior: string;
  responsable_nuevo: string;
  fecha_movimiento: string;
  motivo: string;
  observaciones: string;
}

const EMPTY_FORM: MovimientoForm = {
  activo_ids: [], tipo_movimiento: 'Traslado',
  espacio_origen_id: SIN_ESPACIO, espacio_destino_id: SIN_ESPACIO,
  responsable_anterior: '', responsable_nuevo: '',
  fecha_movimiento: new Date().toISOString().slice(0, 10),
  motivo: '', observaciones: '',
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

/**
 * Persona que entrega o recibe. Se toma de los responsables asignados al
 * espacio; si el espacio no tiene ninguno (o no se eligió espacio), se deja
 * escribir el nombre a mano para no bloquear el registro.
 *
 * Va fuera del componente de página a propósito: definirlo dentro lo
 * recrearía en cada render y el campo de texto perdería el foco al escribir.
 */
function CampoPersona({ etiqueta, espacioId, responsables, valor, onChange }: {
  etiqueta: string;
  espacioId: string;
  responsables: string[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{etiqueta}</Label>
      {responsables.length > 0 ? (
        <Select value={valor || undefined} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
          <SelectContent>
            {responsables.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={espacioId === SIN_ESPACIO ? 'Selecciona un espacio' : 'El espacio no tiene responsable asignado'}
        />
      )}
    </div>
  );
}

export default function MovimientosPage() {
  const { profile } = useAuth();
  const [lotes, setLotes] = useState<LoteMovimiento[]>([]);
  const [activos, setActivos] = useState<ActivoOpcion[]>([]);
  const [espacios, setEspacios] = useState<EspacioOpcion[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilOpcion[]>([]);
  const [asignaciones, setAsignaciones] = useState<{ espacio_id: string; responsable_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MovimientoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busquedaActivo, setBusquedaActivo] = useState('');
  const [vistoBuenoEnCurso, setVistoBuenoEnCurso] = useState<string | null>(null);
  // El panel general enlaza aquí con ?pendientes=1 para mostrar solo lo que
  // espera el visto bueno del rector.
  const [searchParams, setSearchParams] = useSearchParams();
  const soloPendientes = searchParams.get('pendientes') === '1';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: movData }, { data: actData }, { data: espData }, { data: perfData }, { data: asigData }] = await Promise.all([
      // Paginado: un traslado masivo genera una fila por activo, así que el
      // historial crece mucho más rápido que el tope por respuesta.
      fetchAllRows(() =>
        supabase
          .from('movimientos_activos')
          .select(`
            id, lote_id, tipo_movimiento, motivo, observaciones, aprobado_por,
            estado, visto_bueno_rector, visto_bueno_fecha,
            fecha_movimiento, created_at,
            responsable_anterior, responsable_nuevo,
            activo:activos_fijos(codigo, nombre, categoria, estado),
            espacio_origen:espacios_fisicos!movimientos_activos_espacio_origen_id_fkey(codigo, nombre),
            espacio_destino:espacios_fisicos!movimientos_activos_espacio_destino_id_fkey(codigo, nombre)
          `)
          .order('created_at', { ascending: false })
          .order('id')
      ),
      fetchAllRows(() =>
        supabase.from('activos_fijos')
          .select('id, codigo, nombre, categoria, estado, espacio_id, responsable')
          .eq('dado_de_baja', false)
          .order('codigo')
          .order('id')
      ),
      supabase.from('espacios_fisicos').select('id, codigo, nombre').order('codigo'),
      supabase.from('profiles').select('id, nombre, cargo, role').eq('activo', true).order('nombre'),
      supabase.from('asignaciones_espacios').select('espacio_id, responsable_id').eq('activo', true),
    ]);

    // Agrupa las filas por lote conservando el orden (ya vienen por fecha desc).
    const porLote = new Map<string, LoteMovimiento>();
    for (const d of Array.isArray(movData) ? movData : []) {
      const fila = d as Record<string, unknown>;
      const loteId = (fila.lote_id as string) ?? (fila.id as string);
      let lote = porLote.get(loteId);
      if (!lote) {
        lote = {
          lote_id: loteId,
          tipo_movimiento: fila.tipo_movimiento as string,
          fecha_movimiento: fila.fecha_movimiento as string,
          created_at: fila.created_at as string,
          espacio_origen: etiquetaEspacio(fila.espacio_origen as EspacioOpcion | null),
          espacio_destino: etiquetaEspacio(fila.espacio_destino as EspacioOpcion | null),
          responsable_anterior: (fila.responsable_anterior as string) || null,
          responsable_nuevo: (fila.responsable_nuevo as string) || null,
          aprobado_por: (fila.aprobado_por as string) || null,
          estado: (fila.estado as string) || ESTADO_PENDIENTE,
          visto_bueno_rector: (fila.visto_bueno_rector as string) || null,
          visto_bueno_fecha: (fila.visto_bueno_fecha as string) || null,
          motivo: (fila.motivo as string) || null,
          observaciones: (fila.observaciones as string) || null,
          activos: [],
        };
        porLote.set(loteId, lote);
      }
      const activo = fila.activo as ActivoActa | null;
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
   * Quien autoriza el movimiento es el usuario autenticado, no una elección:
   * el acta debe reflejar quién lo registró. Solo Infraestructura y
   * Administración pueden hacerlo.
   */
  const puedeAprobar = ROLES_APRUEBAN.includes(profile?.role ?? '');
  /** Solo el rector refrenda: es su visto bueno lo que completa el movimiento. */
  const puedeDarVistoBueno = profile?.role === 'rector';
  const nombreAprobador = profile?.nombre?.trim() || '';

  /** Rector vigente, para el visto bueno del acta. */
  const rector = useMemo(
    () => perfiles.find(p => p.role === 'rector' && p.nombre?.trim())?.nombre?.trim() || '',
    [perfiles],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = soloPendientes ? lotes.filter(l => l.estado === ESTADO_PENDIENTE) : lotes;
    if (!q) return base;
    return base.filter(l =>
      [l.tipo_movimiento, l.motivo, l.espacio_origen, l.espacio_destino, l.responsable_anterior, l.responsable_nuevo]
        .some(f => f?.toLowerCase().includes(q)) ||
      l.activos.some(a => a.codigo?.toLowerCase().includes(q) || a.nombre?.toLowerCase().includes(q))
    );
  }, [lotes, search, soloPendientes]);

  const pendientes = useMemo(() => lotes.filter(l => l.estado === ESTADO_PENDIENTE).length, [lotes]);

  // ─── Selector de activos ─────────────────────────────────────────────────
  /**
   * Solo se pueden mover activos que estén en el espacio de origen. La
   * restricción no es opcional: mover un activo desde un espacio donde no está
   * es un error de registro, no una preferencia de filtrado.
   */
  const activosFiltrados = useMemo(() => {
    if (form.espacio_origen_id === SIN_ESPACIO) return [];
    const q = busquedaActivo.trim().toLowerCase();
    return activos.filter(a => {
      if (a.espacio_id !== form.espacio_origen_id) return false;
      if (!q) return true;
      return a.codigo?.toLowerCase().includes(q) || a.nombre?.toLowerCase().includes(q);
    });
  }, [activos, busquedaActivo, form.espacio_origen_id]);

  /** Activos del espacio de origen, sin aplicar la búsqueda por texto. */
  const totalEnOrigen = useMemo(
    () => form.espacio_origen_id === SIN_ESPACIO
      ? 0
      : activos.filter(a => a.espacio_id === form.espacio_origen_id).length,
    [activos, form.espacio_origen_id],
  );

  const seleccionados = useMemo(() => new Set(form.activo_ids), [form.activo_ids]);
  const activosPorId = useMemo(() => new Map(activos.map(a => [a.id, a])), [activos]);

  const toggleActivo = (id: string) => {
    setForm(f => ({
      ...f,
      activo_ids: f.activo_ids.includes(id) ? f.activo_ids.filter(x => x !== id) : [...f.activo_ids, id],
    }));
  };

  const seleccionarFiltrados = () => {
    setForm(f => ({ ...f, activo_ids: [...new Set([...f.activo_ids, ...activosFiltrados.map(a => a.id)])] }));
  };

  /**
   * Al elegir un espacio, la persona que entrega/recibe se toma de sus
   * responsables asignados: si hay uno solo queda preseleccionado, si hay
   * varios el usuario escoge.
   *
   * Cambiar el origen descarta los activos ya seleccionados que no pertenezcan
   * al nuevo espacio, para que no se cuele en el movimiento un activo elegido
   * bajo el origen anterior.
   */
  const cambiarEspacio = (campo: 'origen' | 'destino', valor: string) => {
    const nombres = responsablesPorEspacio.get(valor) ?? [];
    const unico = nombres.length === 1 ? nombres[0] : '';
    if (campo === 'destino') {
      setForm(f => ({ ...f, espacio_destino_id: valor, responsable_nuevo: unico }));
      return;
    }
    const conservados = form.activo_ids.filter(id => activosPorId.get(id)?.espacio_id === valor);
    const descartados = form.activo_ids.length - conservados.length;
    setForm(f => ({ ...f, espacio_origen_id: valor, responsable_anterior: unico, activo_ids: conservados }));
    setBusquedaActivo('');
    if (descartados > 0) {
      toast.info(
        `Se quitaron ${descartados} activo${descartados !== 1 ? 's' : ''} de la selección por no estar en el espacio de origen`,
      );
    }
  };

  const abrirDialogo = () => {
    setForm(EMPTY_FORM);
    setBusquedaActivo('');
    setDialogOpen(true);
  };

  const toggleExpandido = (loteId: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(loteId) ? next.delete(loteId) : next.add(loteId);
      return next;
    });
  };

  /**
   * El rector refrenda el movimiento. Se marcan todas las filas del lote: el
   * visto bueno es sobre el movimiento completo, no sobre un activo suelto.
   */
  const darVistoBueno = async (lote: LoteMovimiento) => {
    const nombre = profile?.nombre?.trim();
    if (!puedeDarVistoBueno || !nombre) return;
    setVistoBuenoEnCurso(lote.lote_id);
    const { error } = await supabase
      .from('movimientos_activos')
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

  const handleActa = async (lote: LoteMovimiento) => {
    try {
      await generarActaMovimientoPDF({
        loteId: lote.lote_id,
        tipoMovimiento: lote.tipo_movimiento,
        fechaMovimiento: lote.fecha_movimiento,
        espacioOrigen: lote.espacio_origen,
        espacioDestino: lote.espacio_destino,
        personaEntrega: lote.responsable_anterior || '',
        personaRecibe: lote.responsable_nuevo || '',
        personaAprueba: lote.aprobado_por || '',
        vistoBuenoRector: lote.visto_bueno_rector || '',
        motivo: lote.motivo || '',
        observaciones: lote.observaciones || '',
        activos: lote.activos,
      });
    } catch (err) {
      toast.error('Error al generar el acta: ' + (err as Error).message);
    }
  };

  const handleSave = async () => {
    if (!puedeAprobar) { toast.error('Solo Infraestructura o Administración pueden registrar movimientos'); return; }
    if (form.espacio_origen_id === SIN_ESPACIO) { toast.error('Selecciona el espacio de origen'); return; }
    if (form.activo_ids.length === 0) { toast.error('Selecciona al menos un activo'); return; }
    // Red de seguridad: la interfaz ya solo ofrece activos del espacio de
    // origen, pero si el inventario cambió mientras el diálogo estaba abierto
    // la selección podría haber quedado desfasada.
    const fueraDeOrigen = form.activo_ids.filter(id => activosPorId.get(id)?.espacio_id !== form.espacio_origen_id);
    if (fueraDeOrigen.length > 0) {
      toast.error('Hay activos seleccionados que ya no están en el espacio de origen. Vuelve a elegirlos.');
      return;
    }
    if (!form.motivo.trim()) { toast.error('El motivo es obligatorio'); return; }
    if (form.tipo_movimiento === 'Traslado' && form.espacio_destino_id === SIN_ESPACIO) {
      toast.error('Un traslado necesita un espacio de destino');
      return;
    }

    setSaving(true);
    const loteId = crypto.randomUUID();
    const base = {
      lote_id: loteId,
      tipo_movimiento: form.tipo_movimiento,
      espacio_origen_id: form.espacio_origen_id === SIN_ESPACIO ? null : form.espacio_origen_id,
      espacio_destino_id: form.espacio_destino_id === SIN_ESPACIO ? null : form.espacio_destino_id,
      responsable_anterior: form.responsable_anterior || null,
      responsable_nuevo: form.responsable_nuevo || null,
      aprobado_por: nombreAprobador || null,
      estado: ESTADO_PENDIENTE,
      fecha_movimiento: form.fecha_movimiento,
      motivo: form.motivo,
      observaciones: form.observaciones || null,
      registrado_por: profile?.id ?? null,
    };

    // Un registro por activo: conserva la trazabilidad individual y `lote_id`
    // los mantiene unidos como un solo movimiento.
    for (const bloque of enBloques(form.activo_ids, BLOQUE_ESCRITURA)) {
      const { error } = await supabase
        .from('movimientos_activos')
        .insert(bloque.map(activo_id => ({ ...base, activo_id })));
      if (error) {
        setSaving(false);
        toast.error('Error al registrar el movimiento: ' + error.message);
        return;
      }
    }

    // Un traslado reubica los activos en el inventario; un cambio de
    // responsable solo actualiza a nombre de quién están. Los demás tipos
    // (préstamo, mantenimiento, retiro temporal) son transitorios y no
    // modifican la ficha del activo.
    const cambios: { espacio_id?: string; responsable?: string } = {};
    if (form.tipo_movimiento === 'Traslado' && base.espacio_destino_id) {
      cambios.espacio_id = base.espacio_destino_id;
    }
    if (['Traslado', 'Cambio de responsable'].includes(form.tipo_movimiento) && form.responsable_nuevo) {
      cambios.responsable = form.responsable_nuevo;
    }
    if (Object.keys(cambios).length > 0) {
      for (const bloque of enBloques(form.activo_ids, BLOQUE_ESCRITURA)) {
        const { error } = await supabase.from('activos_fijos').update(cambios).in('id', bloque);
        if (error) {
          setSaving(false);
          toast.error('El movimiento quedó registrado, pero no se pudo actualizar el inventario: ' + error.message);
          return;
        }
      }
    }

    const activosActa: ActivoActa[] = form.activo_ids
      .map(id => activosPorId.get(id))
      .filter((a): a is ActivoOpcion => Boolean(a))
      .map(a => ({ codigo: a.codigo, nombre: a.nombre, categoria: a.categoria, estado: a.estado }));

    setSaving(false);
    setDialogOpen(false);
    toast.success(
      `Movimiento registrado: ${form.activo_ids.length} activo${form.activo_ids.length !== 1 ? 's' : ''}`,
    );

    // El acta es la constancia del movimiento: se emite de una vez y queda
    // disponible en el historial para volver a descargarla.
    await generarActaMovimientoPDF({
      loteId,
      tipoMovimiento: form.tipo_movimiento,
      fechaMovimiento: form.fecha_movimiento,
      espacioOrigen: etiquetaEspacio(espacios.find(e => e.id === base.espacio_origen_id)),
      espacioDestino: etiquetaEspacio(espacios.find(e => e.id === base.espacio_destino_id)),
      personaEntrega: form.responsable_anterior,
      personaRecibe: form.responsable_nuevo,
      personaAprueba: nombreAprobador,
      // Aún sin visto bueno: el acta sale con la línea del rector en blanco.
      vistoBuenoRector: '',
      motivo: form.motivo,
      observaciones: form.observaciones,
      activos: activosActa,
    });

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
                <Input placeholder="Buscar por activo, código, espacio o motivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              {/* Registrar equivale a autorizar: solo Infraestructura y
                  Administración. Los demás roles consultan el historial y
                  descargan actas. */}
              <Button onClick={abrirDialogo} disabled={!puedeAprobar}
                title={puedeAprobar ? undefined : 'Solo los usuarios de Infraestructura o Administración pueden registrar movimientos'}>
                <Plus className="h-4 w-4 mr-1.5" /> Registrar Movimiento
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historial agrupado por lote */}
        <Card className="shadow-card min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap space-y-0">
            <CardTitle className="text-base">
              {soloPendientes ? 'Pendientes de visto bueno' : 'Historial de Movimientos'} ({filtered.length})
            </CardTitle>
            {(pendientes > 0 || soloPendientes) && (
              <Button
                variant={soloPendientes ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchParams(soloPendientes ? {} : { pendientes: '1' })}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                {soloPendientes ? 'Ver todos' : `Pendientes de visto bueno (${pendientes})`}
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
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Activos</TableHead>
                    <TableHead className="whitespace-nowrap">Origen → Destino</TableHead>
                    <TableHead className="whitespace-nowrap">Entrega / Recibe</TableHead>
                    <TableHead className="whitespace-nowrap">Aprueba</TableHead>
                    <TableHead className="whitespace-nowrap">Visto bueno</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>{Array(9).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(l => {
                      const abierto = expandidos.has(l.lote_id);
                      return [
                        <TableRow key={l.lote_id}>
                          <TableCell className="p-0 pl-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleExpandido(l.lote_id)}
                              aria-label={abierto ? 'Ocultar activos' : 'Ver activos'}>
                              {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(l.fecha_movimiento)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className="bg-primary/10 text-primary border-0 text-xs">{l.tipo_movimiento}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <button type="button" onClick={() => toggleExpandido(l.lote_id)} className="text-sm font-medium hover:underline">
                              {l.activos.length} activo{l.activos.length !== 1 ? 's' : ''}
                            </button>
                            {l.activos.length === 1 && (
                              <p className="text-xs text-muted-foreground font-mono">{l.activos[0].codigo}</p>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <span className="text-muted-foreground">{l.espacio_origen}</span>
                            <span className="mx-1">→</span>
                            {l.espacio_destino}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            <p>{l.responsable_anterior || '—'}</p>
                            <p className="text-muted-foreground">{l.responsable_nuevo || '—'}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{l.aprobado_por || '—'}</TableCell>
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
                            <Button variant="ghost" size="sm" onClick={() => handleActa(l)}>
                              <FileText className="h-3.5 w-3.5 mr-1" /> Acta
                            </Button>
                          </TableCell>
                        </TableRow>,
                        abierto && (
                          <TableRow key={`${l.lote_id}-detalle`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="py-3">
                              {l.motivo && <p className="text-xs mb-2"><span className="font-medium">Motivo:</span> {l.motivo}</p>}
                              {l.observaciones && <p className="text-xs mb-2"><span className="font-medium">Observaciones:</span> {l.observaciones}</p>}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                                {l.activos.map((a, i) => (
                                  <p key={`${a.codigo}-${i}`} className="text-xs">
                                    <span className="font-mono text-muted-foreground">{a.codigo}</span> — {a.nombre}
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

        {/* Registrar movimiento */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Movimiento de Activos</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
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
                <Select value={form.espacio_origen_id} onValueChange={v => cambiarEspacio('origen', v)}>
                  <SelectTrigger><SelectValue placeholder="Origen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_ESPACIO}>Sin especificar</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{etiquetaEspacio(e)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Espacio de destino</Label>
                <Select value={form.espacio_destino_id} onValueChange={v => cambiarEspacio('destino', v)}>
                  <SelectTrigger><SelectValue placeholder="Destino" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_ESPACIO}>Sin especificar</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{etiquetaEspacio(e)}</SelectItem>)}
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
                    disabled={form.espacio_origen_id === SIN_ESPACIO}
                  />
                </div>
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {form.espacio_origen_id === SIN_ESPACIO ? (
                    <p className="text-sm text-muted-foreground text-center py-6 px-4">
                      Selecciona primero el espacio de origen: solo se pueden mover activos que estén en ese espacio.
                    </p>
                  ) : totalEnOrigen === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 px-4">
                      El espacio de origen no tiene activos registrados.
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
                        <span className="text-sm truncate">{a.nombre}</span>
                      </div>
                    ))
                  )}
                </div>
                {form.espacio_origen_id !== SIN_ESPACIO && totalEnOrigen > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="text-muted-foreground">
                      {activosFiltrados.length > MAX_ACTIVOS_VISIBLES
                        ? `Mostrando ${MAX_ACTIVOS_VISIBLES} de ${activosFiltrados.length} — afina la búsqueda para ver el resto`
                        : busquedaActivo.trim()
                          ? `${activosFiltrados.length} de ${totalEnOrigen} activos del espacio de origen`
                          : `${totalEnOrigen} activo${totalEnOrigen !== 1 ? 's' : ''} en el espacio de origen`}
                    </span>
                    {activosFiltrados.length > 0 && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={seleccionarFiltrados}>
                        Seleccionar los {activosFiltrados.length}
                      </Button>
                    )}
                  </div>
                )}
                {form.activo_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {/* En un traslado masivo la selección puede ser de cientos de
                        activos: se muestran las primeras y el resto se resume. */}
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
                )}
                {form.tipo_movimiento === 'Traslado' && (
                  <p className="text-xs text-muted-foreground">
                    Al registrar el traslado, los activos seleccionados quedarán ubicados en el espacio de destino dentro del inventario.
                  </p>
                )}
              </div>

              <CampoPersona
                etiqueta="Persona que entrega"
                espacioId={form.espacio_origen_id}
                responsables={responsablesPorEspacio.get(form.espacio_origen_id) ?? []}
                valor={form.responsable_anterior}
                onChange={v => setForm(f => ({ ...f, responsable_anterior: v }))}
              />
              <CampoPersona
                etiqueta="Persona que recibe"
                espacioId={form.espacio_destino_id}
                responsables={responsablesPorEspacio.get(form.espacio_destino_id) ?? []}
                valor={form.responsable_nuevo}
                onChange={v => setForm(f => ({ ...f, responsable_nuevo: v }))}
              />

              {/* Quien autoriza no se pregunta: es el usuario de la sesión. Se
                  muestra solo para que quede claro qué nombre llevará el acta. */}
              <div className="md:col-span-2 space-y-2">
                <Label>Autoriza el movimiento</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {nombreAprobador || 'Tu usuario no tiene nombre configurado'}
                  {profile?.cargo && <span className="text-muted-foreground"> — {profile.cargo}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Queda registrado a tu nombre por ser el usuario autenticado.
                  {rector
                    ? ` El movimiento quedará pendiente del visto bueno del rector (${rector}), que lo completa desde esta misma página.`
                    : ' El movimiento quedará pendiente del visto bueno del rector.'}
                </p>
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
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : `Registrar y generar acta${form.activo_ids.length > 0 ? ` (${form.activo_ids.length})` : ''}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
