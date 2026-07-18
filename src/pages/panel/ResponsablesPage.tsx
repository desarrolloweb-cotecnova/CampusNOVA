import { useEffect, useState, useCallback } from 'react';
import {
  Users, Building2, Plus, Trash2, ArrowRightLeft,
  ChevronDown, ChevronUp, Search, CalendarDays, UserCheck, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { exportToPDF } from '@/lib/export';
import type {
  Profile, EspacioFisico, AsignacionEspacio,
  MovimientoEspacio, MotivoMovimientoEspacio,
} from '@/types/types';

// ─── Formulario movimiento ────────────────────────────────────────────────────
interface MovForm {
  tipo_movimiento: 'recibo' | 'entrega';
  espacio_id: string;
  persona_recibe_id: string;
  persona_entrega_id: string;
  persona_entrega_nombre: string;
  fecha_movimiento: string;
  fecha_entrega_acordada: string;
  motivo_codigo: string;
  motivo_descripcion: string;
  observaciones: string;
}

const HOY = new Date().toISOString().split('T')[0];

const INITIAL_MOV: MovForm = {
  tipo_movimiento: 'recibo',
  espacio_id: '',
  persona_recibe_id: '',
  persona_entrega_id: '',
  persona_entrega_nombre: 'COTECNOVA',
  fecha_movimiento: HOY,
  fecha_entrega_acordada: '',
  motivo_codigo: '',
  motivo_descripcion: '',
  observaciones: '',
};

// ─── Utilidades ──────────────────────────────────────────────────────────────
function iniciales(nombre: string | null): string {
  if (!nombre) return '?';
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ResponsablesPage() {
  const { user } = useAuth();

  // Datos base
  const [perfiles, setPerfiles] = useState<Profile[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionEspacio[]>([]);
  const [motivos, setMotivos] = useState<MotivoMovimientoEspacio[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda
  const [search, setSearch] = useState('');

  // Expandir perfil
  const [expandido, setExpandido] = useState<string | null>(null);

  // Historial movimientos por espacio expandido
  const [movimientos, setMovimientos] = useState<Record<string, MovimientoEspacio[]>>({});
  const [loadingMov, setLoadingMov] = useState<string | null>(null);

  // Dialog asignación — multi-selección
  const [asignarDialog, setAsignarDialog] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<Profile | null>(null);
  const [espaciosSeleccionados, setEspaciosSeleccionados] = useState<string[]>([]);
  const [buscarEspacio, setBuscarEspacio] = useState('');
  const [obsAsig, setObsAsig] = useState('');
  const [savingAsig, setSavingAsig] = useState(false);

  // Dialog movimiento
  const [movDialog, setMovDialog] = useState(false);
  const [movForm, setMovForm] = useState<MovForm>(INITIAL_MOV);
  const [savingMov, setSavingMov] = useState(false);

  // Confirmar desasignar
  const [desasignarTarget, setDesasignarTarget] = useState<AsignacionEspacio | null>(null);
  const [deletingAsig, setDeletingAsig] = useState(false);

  // ─── Carga de datos ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: pData },
      { data: eData },
      { data: aData },
      { data: mData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('nombre'),
      supabase.from('espacios_fisicos').select('id,codigo,nombre,sede,bloque,piso,piso_nombre,tipo').order('nombre'),
      supabase.from('asignaciones_espacios').select('*').eq('activo', true),
      supabase.from('motivos_movimiento_espacio').select('*').eq('activo', true).order('codigo'),
    ]);
    setPerfiles(Array.isArray(pData) ? pData : []);
    setEspacios(Array.isArray(eData) ? eData as EspacioFisico[] : []);
    setAsignaciones(Array.isArray(aData) ? aData as AsignacionEspacio[] : []);
    setMotivos(Array.isArray(mData) ? mData as MotivoMovimientoEspacio[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Movimientos por espacio ─────────────────────────────────────────────────
  const cargarMovimientos = async (espacioId: string) => {
    if (movimientos[espacioId]) return;
    setLoadingMov(espacioId);
    const { data } = await supabase
      .from('movimientos_espacios')
      .select('*')
      .eq('espacio_id', espacioId)
      .order('fecha_movimiento', { ascending: false })
      .limit(10);
    setMovimientos(prev => ({ ...prev, [espacioId]: Array.isArray(data) ? data as MovimientoEspacio[] : [] }));
    setLoadingMov(null);
  };

  // ─── Asignar espacio ─────────────────────────────────────────────────────────
  const openAsignar = (perfil: Profile) => {
    setPerfilSeleccionado(perfil);
    setEspaciosSeleccionados([]);
    setBuscarEspacio('');
    setObsAsig('');
    setAsignarDialog(true);
  };

  const toggleEspacio = (id: string) => {
    setEspaciosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAsignar = async () => {
    if (!perfilSeleccionado || espaciosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un espacio');
      return;
    }
    setSavingAsig(true);
    const rows = espaciosSeleccionados.map(eid => ({
      espacio_id: eid,
      responsable_id: perfilSeleccionado.id,
      activo: true,
      fecha_asignacion: HOY,
      observaciones: obsAsig || null,
    }));
    const { error } = await supabase
      .from('asignaciones_espacios')
      .upsert(rows, { onConflict: 'espacio_id,responsable_id' });
    setSavingAsig(false);
    if (error) { toast.error('Error al asignar: ' + error.message); return; }
    toast.success(`${espaciosSeleccionados.length} espacio(s) asignado(s) correctamente`);
    setAsignarDialog(false);
    loadData();
  };

  // ─── Desasignar ──────────────────────────────────────────────────────────────
  const handleDesasignar = async () => {
    if (!desasignarTarget) return;
    setDeletingAsig(true);
    const { error } = await supabase
      .from('asignaciones_espacios')
      .update({ activo: false })
      .eq('id', desasignarTarget.id);
    setDeletingAsig(false);
    if (error) { toast.error('Error al desasignar'); return; }
    toast.success('Asignación removida');
    setDesasignarTarget(null);
    loadData();
  };

  // ─── Movimiento ──────────────────────────────────────────────────────────────
  const openMovimiento = (perfil: Profile, espacio?: EspacioFisico) => {
    setPerfilSeleccionado(perfil);
    setMovForm({
      ...INITIAL_MOV,
      espacio_id: espacio?.id || '',
      persona_recibe_id: perfil.id,
      fecha_movimiento: HOY,
    });
    setMovDialog(true);
  };

  const handleGuardarMovimiento = async () => {
    if (!movForm.espacio_id || !movForm.motivo_codigo) {
      toast.error('Completa espacio y motivo');
      return;
    }
    if (movForm.tipo_movimiento === 'recibo' && !movForm.persona_recibe_id) {
      toast.error('Indica quién recibe el espacio');
      return;
    }
    setSavingMov(true);
    const payload: Record<string, unknown> = {
      espacio_id: movForm.espacio_id,
      tipo_movimiento: movForm.tipo_movimiento,
      fecha_movimiento: movForm.fecha_movimiento,
      motivo_codigo: movForm.motivo_codigo,
      motivo_descripcion: movForm.motivo_descripcion || null,
      observaciones: movForm.observaciones || null,
      registrado_por: user?.id || null,
    };
    if (movForm.tipo_movimiento === 'recibo') {
      payload.persona_recibe_id = movForm.persona_recibe_id || null;
      payload.persona_recibe_nombre = perfilSeleccionado?.nombre || null;
      payload.persona_entrega_id = movForm.persona_entrega_id || null;
      payload.persona_entrega_nombre = movForm.persona_entrega_id
        ? (perfiles.find(p => p.id === movForm.persona_entrega_id)?.nombre || 'COTECNOVA')
        : 'COTECNOVA';
    } else {
      payload.persona_entrega_id = movForm.persona_entrega_id || perfilSeleccionado?.id || null;
      payload.persona_entrega_nombre = movForm.persona_entrega_id
        ? (perfiles.find(p => p.id === movForm.persona_entrega_id)?.nombre || movForm.persona_entrega_nombre)
        : (perfilSeleccionado?.nombre || movForm.persona_entrega_nombre);
      payload.persona_recibe_id = null;
      payload.persona_recibe_nombre = 'COTECNOVA';
      if (movForm.fecha_entrega_acordada) payload.fecha_entrega_acordada = movForm.fecha_entrega_acordada;
    }
    const { error } = await supabase.from('movimientos_espacios').insert(payload);
    setSavingMov(false);
    if (error) { toast.error('Error al registrar: ' + error.message); return; }
    toast.success('Movimiento registrado');
    setMovDialog(false);
    // Limpiar caché de movimientos para recargar
    setMovimientos(prev => {
      const next = { ...prev };
      delete next[movForm.espacio_id];
      return next;
    });
  };

  // ─── Filtrado perfiles ───────────────────────────────────────────────────────
  const perfilesFiltrados = perfiles.filter(p =>
    !search || [p.nombre, p.email, p.cargo].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  // ─── Exportar PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    // Una fila por responsable×espacio; si no tiene espacios, una fila con "Sin espacios"
    const rows: (string | number)[][] = [];
    perfilesFiltrados.forEach(perfil => {
      const asigPerfil = asignaciones.filter(a => a.responsable_id === perfil.id);
      if (asigPerfil.length === 0) {
        rows.push([
          perfil.nombre || '—',
          perfil.cargo || '—',
          perfil.email || '—',
          '—', '—', '—', '—',
        ]);
      } else {
        asigPerfil.forEach((asig, idx) => {
          const esp = espacios.find(e => e.id === asig.espacio_id);
          rows.push([
            idx === 0 ? (perfil.nombre || '—') : '',
            idx === 0 ? (perfil.cargo || '—') : '',
            idx === 0 ? (perfil.email || '—') : '',
            esp?.codigo || '—',
            esp?.nombre || '—',
            esp?.sede || '—',
            esp?.bloque || '—',
          ]);
        });
      }
    });

    exportToPDF(
      'Listado de Responsables y Espacios Asignados',
      ['Responsable', 'Cargo', 'Correo', 'Cód. Espacio', 'Espacio', 'Sede', 'Bloque'],
      rows,
      'responsables_espacios'
    );
    toast.success('PDF exportado correctamente');
  };

  // Espacios disponibles (no asignados al perfil seleccionado)
  const espaciosDisponibles = (perfil: Profile) => {
    const asignados = asignaciones.filter(a => a.responsable_id === perfil.id).map(a => a.espacio_id);
    return espacios.filter(e => !asignados.includes(e.id));
  };

  const motivosFiltrados = motivos.filter(m => m.tipo === movForm.tipo_movimiento);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">

        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Responsables de Espacios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona la asignación de espacios físicos a los responsables y registra movimientos de recibo y entrega.
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-9 w-full md:w-auto" onClick={handleExportPDF}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Exportar PDF
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar responsable..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Listado de perfiles */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20 bg-muted/40 rounded-lg" />
              </Card>
            ))}
          </div>
        ) : perfilesFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No se encontraron responsables</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {perfilesFiltrados.map(perfil => {
              const asigPerfil = asignaciones.filter(a => a.responsable_id === perfil.id);
              const isExpanded = expandido === perfil.id;
              return (
                <Card key={perfil.id} className="shadow-card overflow-hidden">
                  {/* Cabecera del perfil */}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={perfil.avatar_url || ''} />
                        <AvatarFallback>{iniciales(perfil.nombre)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{perfil.nombre || '(sin nombre)'}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">{perfil.cargo || perfil.email || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs hidden sm:flex">
                          <Building2 className="h-3 w-3 mr-1" />
                          {asigPerfil.length} espacio{asigPerfil.length !== 1 ? 's' : ''}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => openAsignar(perfil)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Asignar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            if (!isExpanded) asigPerfil.forEach(a => cargarMovimientos(a.espacio_id));
                            setExpandido(isExpanded ? null : perfil.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Espacios asignados (expandido) */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 border-t">
                      {asigPerfil.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Este responsable no tiene espacios asignados.
                        </p>
                      ) : (
                        <div className="space-y-3 mt-3">
                          {asigPerfil.map(asig => {
                            const esp = espacios.find(e => e.id === asig.espacio_id);
                            const movEsp = movimientos[asig.espacio_id];
                            return (
                              <div key={asig.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                {/* Info espacio */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{esp?.nombre || asig.espacio_id}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {esp?.sede} · {esp?.bloque} · {esp?.piso_nombre || esp?.piso || ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Desde: {formatDate(asig.fecha_asignacion)}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      title="Registrar movimiento"
                                      onClick={() => openMovimiento(perfil, esp)}
                                    >
                                      <ArrowRightLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Desasignar espacio"
                                      onClick={() => setDesasignarTarget(asig)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Últimos movimientos */}
                                {loadingMov === asig.espacio_id ? (
                                  <p className="text-xs text-muted-foreground animate-pulse">Cargando movimientos...</p>
                                ) : movEsp && movEsp.length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Últimos movimientos</p>
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="h-7">
                                            <TableHead className="text-xs whitespace-nowrap py-1">Tipo</TableHead>
                                            <TableHead className="text-xs whitespace-nowrap py-1">Fecha</TableHead>
                                            <TableHead className="text-xs whitespace-nowrap py-1">Motivo</TableHead>
                                            <TableHead className="text-xs whitespace-nowrap py-1">Recibe</TableHead>
                                            <TableHead className="text-xs whitespace-nowrap py-1">Entrega</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {movEsp.slice(0, 5).map(mov => (
                                            <TableRow key={mov.id} className="h-7">
                                              <TableCell className="py-1">
                                                <Badge
                                                  className={`text-xs border-0 ${mov.tipo_movimiento === 'recibo' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                                                >
                                                  {mov.tipo_movimiento === 'recibo' ? 'Recibo' : 'Entrega'}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-xs whitespace-nowrap py-1">
                                                {formatDate(mov.fecha_movimiento)}
                                              </TableCell>
                                              <TableCell className="text-xs whitespace-nowrap py-1">{mov.motivo_codigo}</TableCell>
                                              <TableCell className="text-xs whitespace-nowrap py-1">{mov.persona_recibe_nombre || '—'}</TableCell>
                                              <TableCell className="text-xs whitespace-nowrap py-1">{mov.persona_entrega_nombre}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                ) : movEsp ? (
                                  <p className="text-xs text-muted-foreground">Sin movimientos registrados.</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Dialog: Asignar espacio ──────────────────────────────────────────── */}
      <Dialog open={asignarDialog} onOpenChange={setAsignarDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Asignar espacios a {perfilSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 flex-1 overflow-hidden py-2">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar espacio por nombre o código..."
                value={buscarEspacio}
                onChange={e => setBuscarEspacio(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Contador seleccionados */}
            {espaciosSeleccionados.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Seleccionados:</span>
                {espaciosSeleccionados.map(id => {
                  const e = espacios.find(x => x.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs gap-1">
                      {e?.codigo || id}
                      <button
                        type="button"
                        onClick={() => toggleEspacio(id)}
                        className="ml-1 hover:text-destructive"
                      >×</button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Lista de espacios con scroll */}
            <div className="border rounded-lg overflow-y-auto flex-1 min-h-0 max-h-64 divide-y">
              {(() => {
                const asignadosAlPerfil = perfilSeleccionado
                  ? asignaciones.filter(a => a.responsable_id === perfilSeleccionado.id).map(a => a.espacio_id)
                  : [];

                const busq = buscarEspacio.toLowerCase();
                const lista = espacios.filter(e =>
                  !busq ||
                  e.nombre.toLowerCase().includes(busq) ||
                  e.codigo.toLowerCase().includes(busq) ||
                  (e.sede || '').toLowerCase().includes(busq)
                );

                if (lista.length === 0) {
                  return (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Sin resultados para "{buscarEspacio}"
                    </div>
                  );
                }

                return lista.map(esp => {
                  const yaAsignado = asignadosAlPerfil.includes(esp.id);
                  const seleccionado = espaciosSeleccionados.includes(esp.id);

                  // Quién lo tiene asignado (otro responsable)
                  const otraAsig = asignaciones.find(
                    a => a.espacio_id === esp.id &&
                    a.activo &&
                    a.responsable_id !== perfilSeleccionado?.id
                  );
                  const otroPerfil = otraAsig
                    ? perfiles.find(p => p.id === otraAsig.responsable_id)
                    : null;

                  return (
                    <button
                      key={esp.id}
                      type="button"
                      disabled={yaAsignado}
                      onClick={() => !yaAsignado && toggleEspacio(esp.id)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors
                        ${yaAsignado
                          ? 'bg-muted/40 cursor-not-allowed opacity-60'
                          : seleccionado
                            ? 'bg-primary/8 hover:bg-primary/12'
                            : 'hover:bg-muted/50'
                        }`}
                    >
                      {/* Checkbox visual */}
                      <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                        yaAsignado
                          ? 'border-muted-foreground/30 bg-muted/30'
                          : seleccionado
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background'
                      }`}>
                        {(yaAsignado || seleccionado) && (
                          <svg className={`h-2.5 w-2.5 ${yaAsignado ? 'text-muted-foreground' : 'text-primary-foreground'}`} viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      {/* Info espacio */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{esp.codigo}</span>
                          <span className="text-sm font-medium truncate">{esp.nombre}</span>
                          {yaAsignado && (
                            <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                              Ya asignado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {esp.sede} · {esp.bloque}
                          {otroPerfil && (
                            <span className="text-amber-600"> · asignado a {otroPerfil.nombre}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label>Observaciones (opcional)</Label>
              <Textarea
                placeholder="Notas sobre esta asignación..."
                value={obsAsig}
                onChange={e => setObsAsig(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setAsignarDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAsignar}
              disabled={savingAsig || espaciosSeleccionados.length === 0}
            >
              {savingAsig
                ? 'Guardando...'
                : `Asignar ${espaciosSeleccionados.length > 0 ? `(${espaciosSeleccionados.length})` : ''}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Registrar movimiento ────────────────────────────────────── */}
      <Dialog open={movDialog} onOpenChange={setMovDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Registrar movimiento de espacio
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Tipo */}
            <div className="space-y-2 md:col-span-2">
              <Label>Tipo de movimiento</Label>
              <div className="flex gap-3">
                {(['recibo', 'entrega'] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setMovForm(f => ({ ...f, tipo_movimiento: tipo, motivo_codigo: '' }))}
                    className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                      movForm.tipo_movimiento === tipo
                        ? tipo === 'recibo'
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {tipo === 'recibo' ? '📥 Recibo del espacio' : '📤 Entrega del espacio'}
                  </button>
                ))}
              </div>
            </div>

            {/* Espacio */}
            <div className="space-y-2">
              <Label>Espacio físico</Label>
              <Select value={movForm.espacio_id} onValueChange={v => setMovForm(f => ({ ...f, espacio_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {espacios.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha movimiento */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Fecha del movimiento
              </Label>
              <Input
                type="date"
                value={movForm.fecha_movimiento}
                onChange={e => setMovForm(f => ({ ...f, fecha_movimiento: e.target.value }))}
              />
            </div>

            {/* Persona recibe */}
            {movForm.tipo_movimiento === 'recibo' ? (
              <div className="space-y-2">
                <Label>Persona que recibe</Label>
                <Select value={movForm.persona_recibe_id} onValueChange={v => setMovForm(f => ({ ...f, persona_recibe_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar responsable..." /></SelectTrigger>
                  <SelectContent>
                    {perfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Persona que entrega</Label>
                <Select
                  value={movForm.persona_entrega_id || '__cotecnova__'}
                  onValueChange={v => setMovForm(f => ({
                    ...f,
                    persona_entrega_id: v === '__cotecnova__' ? '' : v,
                    persona_entrega_nombre: v === '__cotecnova__' ? 'COTECNOVA' : '',
                  }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__cotecnova__">COTECNOVA (institución)</SelectItem>
                    {perfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Persona entrega (en recibo) — quién lo entregaba antes */}
            {movForm.tipo_movimiento === 'recibo' && (
              <div className="space-y-2">
                <Label>Persona que entrega (anterior responsable)</Label>
                <Select
                  value={movForm.persona_entrega_id || '__cotecnova__'}
                  onValueChange={v => setMovForm(f => ({
                    ...f,
                    persona_entrega_id: v === '__cotecnova__' ? '' : v,
                    persona_entrega_nombre: v === '__cotecnova__' ? 'COTECNOVA' : '',
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__cotecnova__">COTECNOVA (por defecto)</SelectItem>
                    {perfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Fecha entrega acordada (solo en entrega) */}
            {movForm.tipo_movimiento === 'entrega' && (
              <div className="space-y-2">
                <Label>Fecha de entrega acordada (opcional)</Label>
                <Input
                  type="date"
                  value={movForm.fecha_entrega_acordada}
                  onChange={e => setMovForm(f => ({ ...f, fecha_entrega_acordada: e.target.value }))}
                />
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2 md:col-span-2">
              <Label>Motivo</Label>
              <Select value={movForm.motivo_codigo} onValueChange={v => setMovForm(f => ({ ...f, motivo_codigo: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
                <SelectContent>
                  {motivosFiltrados.map(m => (
                    <SelectItem key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripción adicional del motivo */}
            <div className="space-y-2 md:col-span-2">
              <Label>Descripción del motivo (opcional)</Label>
              <Textarea
                placeholder="Amplía el motivo si es necesario..."
                value={movForm.motivo_descripcion}
                onChange={e => setMovForm(f => ({ ...f, motivo_descripcion: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-2 md:col-span-2">
              <Label>Observaciones generales (opcional)</Label>
              <Textarea
                placeholder="Notas adicionales del movimiento..."
                value={movForm.observaciones}
                onChange={e => setMovForm(f => ({ ...f, observaciones: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMovDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleGuardarMovimiento}
              disabled={savingMov || !movForm.espacio_id || !movForm.motivo_codigo}
            >
              {savingMov ? 'Guardando...' : 'Registrar movimiento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialog: Confirmar desasignar ───────────────────────────────── */}
      <AlertDialog open={!!desasignarTarget} onOpenChange={open => { if (!open) setDesasignarTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasignar espacio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción removerá la asignación del espacio a este responsable. Podrás volver a asignarlo cuando lo necesites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDesasignar}
              disabled={deletingAsig}
            >
              {deletingAsig ? 'Removiendo...' : 'Sí, desasignar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
