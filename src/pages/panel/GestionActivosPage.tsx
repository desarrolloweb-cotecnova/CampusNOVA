// Gestión de catálogos del módulo Activos Fijos
// CRUD: Categorías, Estados, Responsables, Proveedores
import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, Tags, Activity, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

type CatTable = 'categorias_activos' | 'estados_activos' | 'responsables_activos' | 'proveedores_activos';
interface CatItem { id: string; nombre: string; activo: boolean; }

// ── Componente reutilizable de CRUD para catálogos simples ────────────────
function CatalogoCRUD({
  title, description, icon: Icon, table, itemLabel,
}: {
  title: string; description: string; icon: React.ElementType;
  table: CatTable; itemLabel: string;
}) {
  const [items, setItems] = useState<CatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatItem | null>(null);
  const [form, setForm] = useState({ nombre: '', activo: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select('*').order('nombre');
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [table]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ nombre: '', activo: true }); setDialogOpen(true); };
  const openEdit = (item: CatItem) => { setEditing(item); setForm({ nombre: item.nombre, activo: item.activo }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      let error;
      if (editing) {
        ({ error } = await supabase.from(table).update({ nombre: form.nombre.trim(), activo: form.activo }).eq('id', editing.id));
      } else {
        ({ error } = await supabase.from(table).insert({ nombre: form.nombre.trim(), activo: form.activo }));
      }
      if (error) throw error;
      toast.success(editing ? `${itemLabel} actualizado` : `${itemLabel} creado`);
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast.error('Error al guardar', { description: (err as Error).message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from(table).delete().eq('id', deleteId);
    if (error) { toast.error('No se pudo eliminar', { description: error.message }); }
    else { toast.success(`${itemLabel} eliminado`); load(); }
    setDeleteId(null);
  };

  const filtered = items.filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-xs mt-0.5 text-pretty">{description}</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} className="shrink-0 h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Agregar
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={`Buscar ${itemLabel.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="whitespace-nowrap">Estado</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32" /></TableCell>
                      <TableCell><div className="h-5 bg-muted rounded animate-pulse w-16" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin registros</TableCell></TableRow>
                ) : filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={item.activo ? 'default' : 'secondary'} className="text-xs">
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${itemLabel}` : `Nuevo ${itemLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder={`Nombre del ${itemLabel.toLowerCase()}`} />
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2.5">
              <Label>Activo</Label>
              <Switch checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {itemLabel.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function GestionActivosPage() {
  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Gestión — Activos Fijos</h2>
          <p className="text-sm text-muted-foreground mt-1">Administra las categorías, estados, responsables y proveedores usados en el módulo de Activos Fijos.</p>
        </div>

        <Tabs defaultValue="categorias">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="categorias" className="gap-1.5"><Tags className="h-3.5 w-3.5" /> Categorías</TabsTrigger>
            <TabsTrigger value="estados" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Estados</TabsTrigger>
            <TabsTrigger value="responsables" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Responsables</TabsTrigger>
            <TabsTrigger value="proveedores" className="gap-1.5"><Building className="h-3.5 w-3.5" /> Proveedores</TabsTrigger>
          </TabsList>

          <TabsContent value="categorias" className="mt-4">
            <CatalogoCRUD
              title="Categorías de Activos"
              description="Agrupa los activos fijos por tipo (Mobiliario, Tecnología, Vehículos, etc.)"
              icon={Tags} table="categorias_activos" itemLabel="Categoría"
            />
          </TabsContent>

          <TabsContent value="estados" className="mt-4">
            <CatalogoCRUD
              title="Estados de Activos"
              description="Define los posibles estados operativos de un activo fijo"
              icon={Activity} table="estados_activos" itemLabel="Estado"
            />
          </TabsContent>

          <TabsContent value="responsables" className="mt-4">
            <CatalogoCRUD
              title="Responsables"
              description="Personas responsables de activos fijos. Se seleccionan desde el formulario de registro de activo."
              icon={Users} table="responsables_activos" itemLabel="Responsable"
            />
          </TabsContent>

          <TabsContent value="proveedores" className="mt-4">
            <CatalogoCRUD
              title="Proveedores"
              description="Proveedores de activos fijos. Se seleccionan desde el formulario de registro de activo."
              icon={Building} table="proveedores_activos" itemLabel="Proveedor"
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
