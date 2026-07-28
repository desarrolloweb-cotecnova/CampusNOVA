import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Eye, EyeOff, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

interface PerfilAdmin {
  id: string;
  email: string;
  nombre: string;
  cargo: string | null;
  role: string;
  activo: boolean;
  created_at: string;
}

/** Fila unificada para la tabla: usuario registrado o registro precargado. */
interface FilaUsuario {
  key: string;              // identificador de fila (uuid o 'precarga:'+email)
  id: string | null;       // uuid del perfil si está registrado; null si solo precargado
  email: string;
  nombre: string | null;
  cargo: string | null;
  role: string | null;     // null cuando aún no se ha registrado
  activo: boolean | null;  // null cuando aún no se ha registrado
  created_at: string;
  precargado: boolean;     // true = está en usuarios_precarga y aún no se registra
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [filas, setFilas] = useState<FilaUsuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PerfilAdmin | null>(null);
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState({ nombre: '', email: '', cargo: '', role: 'responsable', activo: true });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Estado de eliminación
  const [deleteTarget, setDeleteTarget] = useState<FilaUsuario | null>(null);
  const [mfaTarget, setMfaTarget] = useState<FilaUsuario | null>(null);
  const [resettingMfa, setResettingMfa] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUsuarios = useCallback(async () => {
    setLoadingUsers(true);
    const [{ data: perfiles }, { data: precarga }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('usuarios_precarga').select('*').order('nombre', { ascending: true }),
    ]);

    const perfilesArr: PerfilAdmin[] = Array.isArray(perfiles) ? perfiles : [];
    const registrados = new Set(perfilesArr.map(p => (p.email || '').toLowerCase()));

    const filasRegistrados: FilaUsuario[] = perfilesArr.map(p => ({
      key: p.id,
      id: p.id,
      email: p.email,
      nombre: p.nombre,
      cargo: p.cargo,
      role: p.role,
      activo: p.activo,
      created_at: p.created_at,
      precargado: false,
    }));

    // Solo mostramos precargados que AÚN no se han registrado (no están en profiles).
    const filasPrecargados: FilaUsuario[] = (Array.isArray(precarga) ? precarga : [])
      .filter((u: { email: string }) => !registrados.has((u.email || '').toLowerCase()))
      .map((u: { email: string; nombre: string | null; cargo: string | null; created_at: string }) => ({
        key: `precarga:${u.email}`,
        id: null,
        email: u.email,
        nombre: u.nombre,
        cargo: u.cargo,
        role: null,
        activo: null,
        created_at: u.created_at,
        precargado: true,
      }));

    setFilas([...filasRegistrados, ...filasPrecargados]);
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.precargado) {
        // Eliminar solo el registro de precarga (por correo).
        const { error } = await supabase.from('usuarios_precarga').delete().eq('email', deleteTarget.email);
        if (error) throw error;
        toast.success(`Precarga de ${deleteTarget.email} eliminada`);
      } else {
        // Eliminar usuario registrado vía Edge Function (Admin API + cascada).
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId: deleteTarget.id },
        });
        if (error || data?.error) throw new Error(error?.message || data?.error || 'Error desconocido');
        toast.success(`Usuario ${deleteTarget.email} eliminado`);
      }
      setDeleteTarget(null);
      loadUsuarios();
    } catch (err: unknown) {
      toast.error('Error al eliminar: ' + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  /** Restablece el 2FA de un usuario: borra sus factores y cierra sus sesiones. */
  const handleResetMfa = async () => {
    if (!mfaTarget?.id) return;
    setResettingMfa(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-mfa', {
        body: { userId: mfaTarget.id },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || 'Error desconocido');
      toast.success(
        data?.removedFactors > 0
          ? 'Verificación en dos pasos restablecida'
          : 'El usuario no tenía verificación en dos pasos configurada',
        { description: `${mfaTarget.email} deberá configurarla en su próximo inicio de sesión.` },
      );
      setMfaTarget(null);
    } catch (err: unknown) {
      toast.error('Error al restablecer: ' + (err as Error).message);
    } finally {
      setResettingMfa(false);
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ nombre: '', email: '', cargo: '', role: 'responsable', activo: false });
    setNewPassword('');
    setConfirmPassword('');
    setShowPwd(false);
    setShowConfirm(false);
    setUserDialogOpen(true);
  };
  const openEditUser = (u: FilaUsuario) => {
    if (u.precargado || !u.id) return; // los precargados no se editan, solo se eliminan
    setEditingUser({
      id: u.id,
      email: u.email,
      nombre: u.nombre ?? '',
      cargo: u.cargo,
      role: u.role ?? 'responsable',
      activo: u.activo ?? false,
      created_at: u.created_at,
    });
    setUserForm({ nombre: u.nombre ?? '', email: u.email, cargo: u.cargo ?? '', role: u.role ?? 'responsable', activo: u.activo ?? false });
    setNewPassword('');
    setConfirmPassword('');
    setUserDialogOpen(true);
  };
  const handleSaveUser = async () => {
    setSaving(true);
    if (editingUser) {
      // Actualizar usuario existente
      const { error } = await supabase
        .from('profiles')
        .update({ nombre: userForm.nombre, cargo: userForm.cargo || null, role: userForm.role, activo: userForm.activo })
        .eq('id', editingUser.id);
      setSaving(false);
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Usuario actualizado');
    } else {
      // Crear nuevo usuario: solo email + contraseña
      if (!userForm.email.trim()) {
        toast.error('El correo electrónico es obligatorio');
        setSaving(false);
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        setSaving(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: userForm.email.trim().toLowerCase(),
            password: newPassword,
          },
        });
        if (error || data?.error) throw new Error(error?.message || data?.error || 'Error desconocido');
        toast.success(`Usuario ${userForm.email} creado. Rol: Responsable · Estado: Inactivo`);
      } catch (err: unknown) {
        setSaving(false);
        const msg = (err as Error).message;
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists')) {
          toast.error('Este correo ya está registrado en el sistema.');
        } else {
          toast.error('Error al crear usuario: ' + msg);
        }
        return;
      }
      setSaving(false);
    }
    setUserDialogOpen(false);
    loadUsuarios();
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    infraestructura: 'Infraestructura',
    rector: 'Rector',
    responsable: 'Responsable',
  };

  const registradosCount = filas.filter(f => !f.precargado).length;
  const precargadosCount = filas.filter(f => f.precargado).length;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold">Gestión de Usuarios</h2>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">{registradosCount} registrados</Badge>
                {precargadosCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">{precargadosCount} precargados</Badge>
                )}
              </div>
              <Button size="sm" onClick={openCreateUser}><Plus className="h-4 w-4 mr-1.5" /> Crear Usuario</Button>
            </div>
            <Card className="shadow-card min-w-0">
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Nombre</TableHead>
                        <TableHead className="whitespace-nowrap">Correo</TableHead>
                        <TableHead className="whitespace-nowrap">Rol</TableHead>
                        <TableHead className="whitespace-nowrap">Estado</TableHead>
                        <TableHead className="whitespace-nowrap">Creado</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        Array(4).fill(0).map((_, i) => (
                          <TableRow key={i}>{Array(6).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                        ))
                      ) : filas.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin usuarios</TableCell></TableRow>
                      ) : (
                        filas.map(u => (
                          <TableRow key={u.key}>
                            <TableCell className="whitespace-nowrap font-medium">{u.nombre || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{u.email}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {u.precargado
                                ? <span className="text-xs text-muted-foreground">—</span>
                                : <Badge className="bg-primary/10 text-primary border-0 text-xs">{roleLabel[u.role ?? ''] || u.role}</Badge>}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {u.precargado ? (
                                <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Precargado</Badge>
                              ) : (
                                <Badge className={u.activo ? 'bg-green-100 text-green-800 border-0 text-xs' : 'bg-red-100 text-red-800 border-0 text-xs'}>
                                  {u.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {!u.precargado && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)} title="Editar">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {!u.precargado && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setMfaTarget(u)}
                                  title="Restablecer verificación en dos pasos"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(u)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Confirmación de eliminación */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget?.precargado ? 'Eliminar precarga' : 'Eliminar usuario'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.precargado ? (
                  <>Se quitará <strong>{deleteTarget?.email}</strong> del listado de precarga. Si esta persona se registra más adelante, su perfil ya no se rellenará automáticamente. Esta acción no se puede deshacer.</>
                ) : deleteTarget?.id === profile?.id ? (
                  <>No puedes eliminar tu propia cuenta.</>
                ) : (
                  <>Se eliminará al usuario <strong>{deleteTarget?.email}</strong> de forma permanente, junto con su perfil y sus asignaciones de espacios. Esta acción no se puede deshacer.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                disabled={deleting || (!deleteTarget?.precargado && deleteTarget?.id === profile?.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmación de restablecimiento del segundo factor */}
        <AlertDialog open={!!mfaTarget} onOpenChange={(open) => { if (!open) setMfaTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restablecer verificación en dos pasos</AlertDialogTitle>
              <AlertDialogDescription>
                Úsalo cuando <strong>{mfaTarget?.email}</strong> haya perdido el teléfono o el
                acceso a Google Authenticator. Se eliminará su segundo factor y se cerrarán sus
                sesiones abiertas; la próxima vez que inicie sesión deberá escanear un código QR
                nuevo. Su cuenta, su rol y sus datos no se ven afectados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resettingMfa}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleResetMfa(); }}
                disabled={resettingMfa}
              >
                {resettingMfa ? 'Restableciendo...' : 'Restablecer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de usuario */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
            <DialogHeader><DialogTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              {editingUser ? (
                /* ── Modo edición: campos completos ── */
                <>
                  <div className="space-y-2"><Label>Nombre completo</Label><Input placeholder="Ej. Juan Carlos Pérez" value={userForm.nombre} onChange={e => setUserForm(f => ({ ...f, nombre: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>Correo electrónico</Label>
                    <Input value={userForm.email} disabled className="bg-muted/50 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">El correo no puede modificarse</p>
                  </div>
                  <div className="space-y-2"><Label>Cargo</Label><Input placeholder="Ej. Coordinador de Infraestructura" value={userForm.cargo} onChange={e => setUserForm(f => ({ ...f, cargo: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>Rol <span className="text-destructive">*</span></Label>
                    <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsable">Responsable</SelectItem>
                        <SelectItem value="infraestructura">Infraestructura</SelectItem>
                        <SelectItem value="rector">Rector</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={userForm.activo} onCheckedChange={v => setUserForm(f => ({ ...f, activo: v }))} />
                    <Label>Usuario activo</Label>
                  </div>
                </>
              ) : (
                /* ── Modo creación: solo correo y contraseña ── */
                <>
                  <p className="text-sm text-muted-foreground text-pretty">
                    El usuario se creará con rol <strong>Responsable</strong> y estado <strong>Inactivo</strong>. Puedes completar su perfil y activarlo desde la tabla de usuarios.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Correo electrónico <span className="text-destructive">*</span></Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="usuario@cotecnova.edu.co"
                      value={userForm.email}
                      onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pwd">Contraseña <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="new-pwd"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-pwd">Confirmar contraseña <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="confirm-pwd"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveUser} disabled={saving}>{saving ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear usuario'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
