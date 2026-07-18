// Página de Gestión de Usuarios — módulo Configuración — CampusNOVA
import { useEffect, useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Search, RefreshCw, Pencil, Trash2, Upload, Download, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, UserRole } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

const ROL_LABELS: Record<UserRole, string> = {
  admin:           'Administrador',
  rectoria:        'Rectoría',
  infraestructura: 'Infraestructura',
  responsable:     'Responsable',
};

const ROL_COLORS: Record<UserRole, string> = {
  admin:           'bg-red-100 text-red-800 border-red-200',
  rectoria:        'bg-purple-100 text-purple-800 border-purple-200',
  infraestructura: 'bg-blue-100 text-blue-800 border-blue-200',
  responsable:     'bg-green-100 text-green-800 border-green-200',
};

const ROL_DESC: Record<UserRole, string> = {
  admin:           'Acceso total al sistema, incluida Configuración.',
  rectoria:        'Acceso completo + puede ser responsable de espacio.',
  infraestructura: 'Acceso completo excepto módulo de Configuración.',
  responsable:     'Solo ve sus espacios asignados, novedades y reservas.',
};

interface EditForm {
  nombre: string;
  cargo: string;
  role: UserRole;
  activo: boolean;
}

interface ImportRow {
  correo: string;
  contrasena: string;
  nombre?: string;
  cargo?: string;
}

interface ImportResult {
  correo: string;
  status: 'ok' | 'error';
  mensaje: string;
}

function descargarPlantilla() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['correo', 'contrasena', 'nombre', 'cargo'],
    ['usuario1@cotecnova.edu.co', 'Clave1234', 'Juan Pérez', 'Docente'],
    ['usuario2@cotecnova.edu.co', 'Clave5678', 'María García', 'Coordinadora'],
  ]);
  ws['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 28 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  XLSX.writeFile(wb, 'plantilla_usuarios_campusnova.xlsx');
}

export default function UsuariosPage() {
  const { profile: me } = useAuth();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');

  const [editDialog, setEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ nombre: '', cargo: '', role: 'responsable', activo: false });
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('nombre');
    if (error) { toast.error('Error al cargar usuarios'); }
    else { setUsuarios(data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsuarios(); }, [loadUsuarios]);

  const openEdit = (u: Profile) => {
    setEditingUser(u);
    setEditForm({
      nombre: u.nombre || '',
      cargo: u.cargo || '',
      role: (u.role as UserRole) || 'responsable',
      activo: (u as Profile & { activo?: boolean }).activo ?? true,
    });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (editingUser.id === me?.id && editForm.role !== me.role) {
      toast.error('No puedes cambiar tu propio rol');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      nombre: editForm.nombre.trim() || null,
      cargo: editForm.cargo.trim() || null,
      role: editForm.role,
      activo: editForm.activo,
    }).eq('id', editingUser.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    toast.success('Usuario actualizado');
    setEditDialog(false);
    loadUsuarios();
  };

  const openDelete = (u: Profile) => {
    setDeletingUser(u);
    setDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    const { error } = await supabase.from('profiles').delete().eq('id', deletingUser.id);
    setDeleting(false);
    if (error) {
      if (error.message.includes('foreign key') || error.message.includes('violates') || error.code === '23503') {
        toast.error('No se puede eliminar: el usuario tiene registros asociados. Desactívalo usando Editar → desmarcar "Usuario activo".');
      } else {
        toast.error('Error al eliminar: ' + error.message);
      }
      return;
    }
    toast.success('Usuario ' + (deletingUser.nombre || deletingUser.email) + ' eliminado');
    setDeleteDialog(false);
    setDeletingUser(null);
    loadUsuarios();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        const parsed: ImportRow[] = rows
          .map(r => ({
            correo: (r['correo'] || r['Correo'] || '').trim().toLowerCase(),
            contrasena: (r['contrasena'] || r['contraseña'] || r['Contraseña'] || r['contrasenia'] || '').trim(),
            nombre: (r['nombre'] || r['Nombre'] || '').trim() || undefined,
            cargo: (r['cargo'] || r['Cargo'] || '').trim() || undefined,
          }))
          .filter(r => r.correo);
        if (parsed.length === 0) {
          toast.error('No se encontraron filas válidas. Verifica la plantilla.');
          return;
        }
        setImportRows(parsed);
        setImportResults([]);
        setImportDone(false);
        setImportProgress(0);
        setImportDialog(true);
      } catch {
        toast.error('Error al leer el archivo. Usa formato .xlsx.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleRunImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportResults([]);
    setImportProgress(0);
    const results: ImportResult[] = [];

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      if (!row.correo.includes('@')) {
        results.push({ correo: row.correo, status: 'error', mensaje: 'Correo inválido' });
        setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
        continue;
      }
      if (!row.contrasena || row.contrasena.length < 8) {
        results.push({ correo: row.correo, status: 'error', mensaje: 'Contraseña debe tener mínimo 8 caracteres' });
        setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
        continue;
      }
      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: { email: row.correo, password: row.contrasena },
        });
        if (error || data?.error) {
          const msg: string = error?.message || data?.error || 'Error desconocido';
          results.push({ correo: row.correo, status: 'error', mensaje: msg.includes('already') ? 'Correo ya registrado' : msg });
        } else {
          if ((row.nombre || row.cargo) && data?.userId) {
            await supabase.from('profiles').update({ nombre: row.nombre || null, cargo: row.cargo || null }).eq('id', data.userId);
          }
          results.push({ correo: row.correo, status: 'ok', mensaje: 'Creado correctamente' });
        }
      } catch (err: unknown) {
        results.push({ correo: row.correo, status: 'error', mensaje: (err as Error).message });
      }
      setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
      setImportResults([...results]);
    }

    setImporting(false);
    setImportDone(true);
    const ok = results.filter(r => r.status === 'ok').length;
    const fail = results.filter(r => r.status === 'error').length;
    toast.success('Importación completada: ' + ok + ' creados, ' + fail + ' con error');
    loadUsuarios();
  };

  const closeImportDialog = () => {
    if (importing) return;
    setImportDialog(false);
    setImportRows([]);
    setImportResults([]);
    setImportDone(false);
    setImportProgress(0);
  };

  const filtrados = usuarios.filter(u => {
    if (!buscar) return true;
    const q = buscar.toLowerCase();
    return (
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            Gestión de Usuarios y Roles
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
            Administra los accesos y permisos de cada usuario en el sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={descargarPlantilla} className="gap-1.5 shrink-0">
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only md:not-sr-only">Plantilla Excel</span>
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 shrink-0">
            <Upload className="h-3.5 w-3.5" />
            <span className="sr-only md:not-sr-only">Cargar usuarios</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadUsuarios} disabled={loading} className="gap-1.5 shrink-0">
            <RefreshCw className={'h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} />
            <span className="sr-only md:not-sr-only">Actualizar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Object.keys(ROL_LABELS) as UserRole[]).map(rol => (
          <div key={rol} className="flex items-start gap-3 rounded-lg border p-3">
            <Badge className={ROL_COLORS[rol] + ' border text-xs shrink-0 mt-0.5'}>{ROL_LABELS[rol]}</Badge>
            <p className="text-xs text-muted-foreground text-pretty">{ROL_DESC[rol]}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, correo o cargo..." value={buscar}
          onChange={e => setBuscar(e.target.value)} className="pl-9" />
      </div>

      <Card className="shadow-card min-w-0">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Usuario</TableHead>
                  <TableHead className="whitespace-nowrap">Cargo</TableHead>
                  <TableHead className="whitespace-nowrap">Correo</TableHead>
                  <TableHead className="whitespace-nowrap">Rol</TableHead>
                  <TableHead className="whitespace-nowrap">Estado</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      {buscar ? 'Sin resultados para la búsqueda' : 'No hay usuarios registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map(u => {
                    const esYo = u.id === me?.id;
                    const rol = ((u.role || 'responsable') as UserRole);
                    const activo = (u as Profile & { activo?: boolean }).activo ?? true;
                    return (
                      <TableRow key={u.id} className={esYo ? 'bg-primary/5' : ''}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={u.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {(u.nombre || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium leading-tight">
                              {u.nombre || '(sin nombre)'}
                              {esYo && <span className="ml-1.5 text-xs text-muted-foreground">(yo)</span>}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{u.cargo || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{u.email || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={ROL_COLORS[rol] + ' border text-xs'}>{ROL_LABELS[rol] || rol}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={activo
                            ? 'bg-green-100 text-green-800 border-green-200 border text-xs'
                            : 'bg-red-100 text-red-800 border-red-200 border text-xs'}>
                            {activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} title="Editar usuario">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!esYo && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => openDelete(u)} title="Eliminar usuario">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />Editar Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input placeholder="Nombre del usuario" value={editForm.nombre}
                onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input value={editingUser?.email || ''} disabled className="bg-muted/50 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">El correo no puede modificarse</p>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input placeholder="Cargo institucional" value={editForm.cargo}
                onChange={e => setEditForm(f => ({ ...f, cargo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as UserRole }))}
                disabled={editingUser?.id === me?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROL_LABELS) as UserRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROL_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editForm.activo} onCheckedChange={v => setEditForm(f => ({ ...f, activo: v }))}
                disabled={editingUser?.id === me?.id} />
              <Label>Usuario activo</Label>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {editingUser?.id !== me?.id ? (
              <Button variant="ghost"
                className="border border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { setEditDialog(false); openDelete(editingUser!); }}>
                <Trash2 className="h-4 w-4 mr-2" />Eliminar usuario
              </Button>
            ) : <span />}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el perfil de <strong>{deletingUser?.nombre || deletingUser?.email}</strong> del sistema.
              Su cuenta de autenticación se conservará pero perderá acceso al panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importDialog} onOpenChange={closeImportDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />Importar usuarios desde Excel
            </DialogTitle>
          </DialogHeader>

          {!importDone ? (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Se encontraron <strong>{importRows.length}</strong> usuario(s). Se crearán con rol <strong>Responsable</strong> y estado <strong>Inactivo</strong>.
                </p>
                <div className="w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">#</TableHead>
                        <TableHead className="whitespace-nowrap">Correo</TableHead>
                        <TableHead className="whitespace-nowrap">Contraseña</TableHead>
                        <TableHead className="whitespace-nowrap">Nombre</TableHead>
                        <TableHead className="whitespace-nowrap">Cargo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{r.correo}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {'•'.repeat(Math.min(r.contrasena.length, 8))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{r.nombre || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{r.cargo || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {importing && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Procesando...</span><span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeImportDialog} disabled={importing}>Cancelar</Button>
                <Button onClick={handleRunImport} disabled={importing || importRows.length === 0}>
                  {importing
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
                    : <><Upload className="h-4 w-4 mr-2" />Importar {importRows.length} usuario(s)</>}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />{importResults.filter(r => r.status === 'ok').length} creados
                  </span>
                  <span className="flex items-center gap-1.5 text-destructive">
                    <XCircle className="h-4 w-4" />{importResults.filter(r => r.status === 'error').length} con error
                  </span>
                </div>
                <div className="w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Correo</TableHead>
                        <TableHead className="whitespace-nowrap">Resultado</TableHead>
                        <TableHead className="whitespace-nowrap">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap text-sm">{r.correo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {r.status === 'ok'
                              ? <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">Creado</Badge>
                              : <Badge className="bg-red-100 text-red-800 border-red-200 border text-xs">Error</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.mensaje}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeImportDialog}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UsuariosCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Usuarios y Roles
        </CardTitle>
        <CardDescription>Gestiona accesos y permisos del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <UsuariosPage />
      </CardContent>
    </Card>
  );
}
