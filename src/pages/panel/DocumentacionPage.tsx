// Página Documentación — gestión global de documentos vinculados a espacios físicos
import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Link2, Plus, Search, ExternalLink, Trash2,
  File, Sheet, Building2, Filter, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import type { DocumentoEspacio, EspacioFisico } from '@/types/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ── Constantes ───────────────────────────────────────────────────────────────
const DOC_TIPOS = ['PDF', 'Word', 'Excel', 'Plano', 'Imagen', 'Otro'];
const DOC_CATEGORIAS = ['Planos', 'Escrituras', 'Facturas', 'Manuales', 'Instructivos', 'Contratos', 'General'];

function getDocIcon(tipo: string) {
  if (tipo === 'PDF') return <FileText className="h-4 w-4 text-red-500" />;
  if (tipo === 'Word') return <File className="h-4 w-4 text-blue-500" />;
  if (tipo === 'Excel') return <Sheet className="h-4 w-4 text-green-600" />;
  if (tipo === 'Plano') return <FileText className="h-4 w-4 text-orange-500" />;
  return <Link2 className="h-4 w-4 text-muted-foreground" />;
}

type DocConEspacio = DocumentoEspacio & { espacioNombre: string; espacioCodigo: string };

// ── Componente principal ─────────────────────────────────────────────────────
export default function DocumentacionPage() {
  const [docs, setDocs] = useState<DocConEspacio[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroEspacio, setFiltroEspacio] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroCategoria, setFiltroCategoria] = useState('all');

  // Dialog nuevo documento
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({
    espacio_id: '',
    nombre: '',
    descripcion: '',
    tipo: 'PDF',
    categoria: 'General',
    url: '',
  });
  const [savingDoc, setSavingDoc] = useState(false);

  // Confirmar eliminación
  const [deleteTarget, setDeleteTarget] = useState<DocConEspacio | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Carga ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: docsData }, { data: espaciosData }] = await Promise.all([
      supabase
        .from('documentos_espacios')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('espacios_fisicos')
        .select('*')
        .order('codigo'),
    ]);

    const esps: EspacioFisico[] = Array.isArray(espaciosData) ? espaciosData : [];
    setEspacios(esps);

    const rawDocs: DocumentoEspacio[] = Array.isArray(docsData) ? docsData : [];
    const enriched: DocConEspacio[] = rawDocs.map(d => {
      const esp = esps.find(e => e.id === d.espacio_id);
      return {
        ...d,
        espacioNombre: esp?.nombre ?? '—',
        espacioCodigo: esp?.codigo ?? '—',
      };
    });
    setDocs(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.nombre.toLowerCase().includes(q) ||
      d.espacioNombre.toLowerCase().includes(q) ||
      d.espacioCodigo.toLowerCase().includes(q) ||
      (d.descripcion ?? '').toLowerCase().includes(q) ||
      d.categoria.toLowerCase().includes(q);
    const matchEspacio = filtroEspacio === 'all' || d.espacio_id === filtroEspacio;
    const matchTipo = filtroTipo === 'all' || d.tipo === filtroTipo;
    const matchCategoria = filtroCategoria === 'all' || d.categoria === filtroCategoria;
    return matchSearch && matchEspacio && matchTipo && matchCategoria;
  });

  const hayFiltros = filtroEspacio !== 'all' || filtroTipo !== 'all' || filtroCategoria !== 'all' || search !== '';
  const limpiarFiltros = () => {
    setSearch('');
    setFiltroEspacio('all');
    setFiltroTipo('all');
    setFiltroCategoria('all');
  };

  // ── Guardar documento ────────────────────────────────────────────────────
  const openNuevoDoc = () => {
    setDocForm({ espacio_id: '', nombre: '', descripcion: '', tipo: 'PDF', categoria: 'General', url: '' });
    setDocDialog(true);
  };

  const handleGuardarDoc = async () => {
    if (!docForm.espacio_id) { toast.error('Selecciona un espacio físico'); return; }
    if (!docForm.nombre.trim()) { toast.error('El nombre del documento es obligatorio'); return; }
    if (!docForm.url.trim()) { toast.error('La URL del documento es obligatoria'); return; }
    setSavingDoc(true);
    const { error } = await supabase.from('documentos_espacios').insert({
      espacio_id: docForm.espacio_id,
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

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('documentos_espacios').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar documento'); return; }
    toast.success('Documento eliminado');
    setDeleteTarget(null);
    loadData();
  };

  // ── Contadores para tarjetas resumen ──────────────────────────────────────
  const totalDocs = docs.length;
  const totalEspaciosConDocs = new Set(docs.map(d => d.espacio_id)).size;
  const contPorCategoria = DOC_CATEGORIAS.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = docs.filter(d => d.categoria === cat).length;
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Documentación</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestión centralizada de documentos vinculados a espacios físicos
            </p>
          </div>
          <Button className="gap-2 shrink-0" onClick={openNuevoDoc}>
            <Plus className="h-4 w-4" /> Vincular documento
          </Button>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{loading ? '—' : totalDocs}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Total documentos</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{loading ? '—' : totalEspaciosConDocs}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Espacios con docs</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{loading ? '—' : (contPorCategoria['Planos'] ?? 0)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Planos</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{loading ? '—' : (contPorCategoria['Manuales'] ?? 0)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Manuales</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Búsqueda y filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre, espacio..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filtroEspacio} onValueChange={setFiltroEspacio}>
                <SelectTrigger><SelectValue placeholder="Todos los espacios" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los espacios</SelectItem>
                  {espacios.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {DOC_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {DOC_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hayFiltros && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{filtered.length} resultado(s)</span>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={limpiarFiltros}>
                  <X className="h-3 w-3" /> Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de documentos */}
        <Card className="shadow-card min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Documentos vinculados
              <span className="text-muted-foreground font-normal ml-2 text-sm">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">
                  {hayFiltros ? 'Sin resultados para los filtros aplicados' : 'No hay documentos vinculados aún'}
                </p>
                <p className="text-sm mt-1">
                  {hayFiltros
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Vincula el primer documento a un espacio físico'
                  }
                </p>
                {!hayFiltros && (
                  <Button className="mt-4 gap-2" onClick={openNuevoDoc}>
                    <Plus className="h-4 w-4" /> Vincular documento
                  </Button>
                )}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Documento</TableHead>
                      <TableHead className="whitespace-nowrap">Espacio</TableHead>
                      <TableHead className="whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap">Categoría</TableHead>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getDocIcon(doc.tipo)}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[220px]">{doc.nombre}</p>
                              {doc.descripcion && (
                                <p className="text-xs text-muted-foreground truncate max-w-[220px]">{doc.descripcion}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm">{doc.espacioNombre}</span>
                            <span className="text-xs text-muted-foreground font-mono">({doc.espacioCodigo})</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">{doc.categoria}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Abrir documento">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Eliminar vínculo"
                              onClick={() => setDeleteTarget(doc)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Dialog: Vincular nuevo documento ═══════════════════════════════ */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Vincular nuevo documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Espacio físico *</Label>
              <Select value={docForm.espacio_id} onValueChange={v => setDocForm(f => ({ ...f, espacio_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar espacio..." />
                </SelectTrigger>
                <SelectContent>
                  {espacios.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre del documento *</Label>
              <Input
                value={docForm.nombre}
                onChange={e => setDocForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Plano arquitectónico bloque A"
              />
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
              <Input
                value={docForm.url}
                onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://drive.google.com/... o enlace compartido"
              />
              <p className="text-xs text-muted-foreground">
                Pega el enlace compartido (Google Drive, OneDrive, Dropbox, SharePoint, etc.)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Descripción <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Textarea
                value={docForm.descripcion}
                onChange={e => setDocForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={2}
                placeholder="Breve descripción del contenido del documento..."
              />
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

      {/* ═══ AlertDialog: Confirmar eliminación ════════════════════════════ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el vínculo con <strong>{deleteTarget?.nombre}</strong> del espacio{' '}
              <strong>{deleteTarget?.espacioNombre}</strong>. El documento original en su ubicación
              compartida no será afectado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEliminar}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar vínculo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
