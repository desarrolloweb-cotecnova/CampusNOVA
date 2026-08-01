import { useEffect, useState, useCallback } from 'react';
import {
  Users, Building2, Plus, Trash2,
  ChevronDown, ChevronUp, Search, UserCheck, FileText, ClipboardList,
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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { exportToPDF } from '@/lib/export';
import { generarActaInventarioPDF } from '@/lib/acta-inventario';
import { fetchAllRows } from '@/lib/supabase-fetch';
import type { Profile, EspacioFisico, AsignacionEspacio, ActivoFijo } from '@/types/types';

const HOY = new Date().toISOString().split('T')[0];

// ─── Utilidades ──────────────────────────────────────────────────────────────
function iniciales(nombre: string | null): string {
  if (!nombre) return '?';
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ResponsablesPage() {
  // Datos base
  const [perfiles, setPerfiles] = useState<Profile[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionEspacio[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda
  const [search, setSearch] = useState('');

  // Expandir perfil
  const [expandido, setExpandido] = useState<string | null>(null);

  // Dialog asignación — multi-selección
  const [asignarDialog, setAsignarDialog] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<Profile | null>(null);
  const [espaciosSeleccionados, setEspaciosSeleccionados] = useState<string[]>([]);
  const [buscarEspacio, setBuscarEspacio] = useState('');
  const [obsAsig, setObsAsig] = useState('');
  const [savingAsig, setSavingAsig] = useState(false);

  // Confirmar desasignar
  const [desasignarTarget, setDesasignarTarget] = useState<AsignacionEspacio | null>(null);
  const [deletingAsig, setDeletingAsig] = useState(false);

  // Acta de inventario (generación en curso por responsable)
  const [actaLoadingId, setActaLoadingId] = useState<string | null>(null);

  // ─── Carga de datos ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: pData },
      { data: eData },
      { data: aData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('nombre'),
      supabase.from('espacios_fisicos').select('id,codigo,nombre,sede,bloque,piso,piso_nombre,tipo').order('nombre'),
      supabase.from('asignaciones_espacios').select('*').eq('activo', true),
    ]);
    setPerfiles(Array.isArray(pData) ? pData : []);
    setEspacios(Array.isArray(eData) ? eData as EspacioFisico[] : []);
    setAsignaciones(Array.isArray(aData) ? aData as AsignacionEspacio[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresca cuando otro usuario cambia los datos, sin recargar la pantalla.
  useRealtimeTable(['profiles', 'asignaciones_espacios'], loadData);

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

  // ─── Filtrado perfiles ───────────────────────────────────────────────────────
  const perfilesFiltrados = perfiles.filter(p =>
    !search || [p.nombre, p.email, p.cargo].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  // ─── Acta de Inventario (PDF por responsable) ─────────────────────────────────
  const handleActaInventario = async (perfil: Profile) => {
    const espacioIds = asignaciones
      .filter(a => a.responsable_id === perfil.id)
      .map(a => a.espacio_id);
    if (espacioIds.length === 0) {
      toast.info('Este responsable no tiene espacios asignados.');
      return;
    }
    setActaLoadingId(perfil.id);
    try {
      // Activos vigentes (no dados de baja) de los espacios asignados.
      // Paginado: el acta debe listar todos los activos, no las primeras 1.000 filas.
      const { data, error } = await fetchAllRows(() =>
        supabase
          .from('activos_fijos')
          .select('id,codigo,nombre,categoria,estado,espacio_id,dado_de_baja')
          .in('espacio_id', espacioIds)
          .eq('dado_de_baja', false)
          .order('codigo')
          .order('id')
      );
      if (error) throw error;

      const espaciosAsignados = espacios.filter(e => espacioIds.includes(e.id));
      await generarActaInventarioPDF({
        responsable: perfil,
        espacios: espaciosAsignados,
        activos: data as unknown as ActivoFijo[],
      });
      toast.success('Acta de inventario generada');
    } catch (err) {
      toast.error('Error al generar el acta: ' + (err as Error).message);
    } finally {
      setActaLoadingId(null);
    }
  };

  // ─── Exportar PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const rows: (string | number)[][] = [];
    perfilesFiltrados.forEach(perfil => {
      const asigPerfil = asignaciones.filter(a => a.responsable_id === perfil.id);
      if (asigPerfil.length === 0) {
        rows.push([perfil.nombre || '—', perfil.cargo || '—', perfil.email || '—', '—', '—', '—', '—']);
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

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">

        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Responsables de Espacios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona la asignación de espacios físicos a los responsables. El traslado de
              activos fijos entre responsables se realiza desde la ficha de cada espacio (pestaña Activos).
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
                          onClick={() => handleActaInventario(perfil)}
                          disabled={actaLoadingId === perfil.id}
                          title="Acta de inventario"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">
                            {actaLoadingId === perfil.id ? 'Generando…' : 'Acta de inventario'}
                          </span>
                        </Button>
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
                          onClick={() => setExpandido(isExpanded ? null : perfil.id)}
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
                        <div className="space-y-2 mt-3">
                          {asigPerfil.map(asig => {
                            const esp = espacios.find(e => e.id === asig.espacio_id);
                            return (
                              <div key={asig.id} className="flex items-start justify-between gap-2 rounded-lg border bg-muted/20 p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{esp?.nombre || asig.espacio_id}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {esp?.codigo} · {esp?.sede} · {esp?.bloque} · {esp?.piso_nombre || esp?.piso || ''}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Desde: {formatDate(asig.fecha_asignacion)}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Desasignar espacio"
                                  onClick={() => setDesasignarTarget(asig)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
                            <span className="text-amber-600"> · también asignado a {otroPerfil.nombre}</span>
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
