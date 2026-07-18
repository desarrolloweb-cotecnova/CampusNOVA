import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
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

interface AuditLog {
  id: string;
  usuario_nombre: string | null;
  accion: string;
  modulo: string | null;
  entidad_id: string | null;
  detalles: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<PerfilAdmin[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PerfilAdmin | null>(null);
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState({ nombre: '', email: '', cargo: '', role: 'responsable', activo: true });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadUsuarios = useCallback(async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsuarios(Array.isArray(data) ? data : []);
    setLoadingUsers(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from('logs_auditoria')
      .select('id, usuario_nombre, accion, modulo, entidad_id, detalles, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      toast.error('Error al cargar auditoría', { description: error.message });
      setAuditLogs([]);
    } else {
      setAuditLogs(Array.isArray(data) ? data : []);
    }
    setLoadingLogs(false);
  }, []);

  useEffect(() => {
    loadUsuarios();
    loadLogs();
  }, [loadUsuarios, loadLogs]);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ nombre: '', email: '', cargo: '', role: 'responsable', activo: false });
    setNewPassword('');
    setConfirmPassword('');
    setShowPwd(false);
    setShowConfirm(false);
    setUserDialogOpen(true);
  };
  const openEditUser = (u: PerfilAdmin) => {
    setEditingUser(u);
    setUserForm({ nombre: u.nombre, email: u.email, cargo: u.cargo ?? '', role: u.role, activo: u.activo });
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
    rectoria: 'Rectoría',
    responsable: 'Responsable',
  };

  const accionBadge = (accion: string) => {
    const map: Record<string, string> = {
      INSERT: 'bg-green-100 text-green-800',
      DELETE: 'bg-red-100 text-red-800',
      UPDATE: 'bg-blue-100 text-blue-800',
    };
    return map[accion?.toUpperCase()] ?? 'bg-muted text-muted-foreground';
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <Tabs defaultValue="usuarios">
          <TabsList>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
          </TabsList>

          {/* Usuarios */}
          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold">Gestión de Usuarios ({usuarios.length})</h2>
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
                      ) : usuarios.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin usuarios</TableCell></TableRow>
                      ) : (
                        usuarios.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="whitespace-nowrap font-medium">{u.nombre}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{u.email}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className="bg-primary/10 text-primary border-0 text-xs">{roleLabel[u.role] || u.role}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={u.activo ? 'bg-green-100 text-green-800 border-0 text-xs' : 'bg-red-100 text-red-800 border-0 text-xs'}>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)}>
                                <Edit className="h-3.5 w-3.5" />
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
          </TabsContent>

          {/* Auditoría */}
          <TabsContent value="auditoria">
            <Card className="shadow-card min-w-0">
              <CardHeader>
                <CardTitle className="text-base">Últimas 100 acciones del sistema</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Fecha</TableHead>
                        <TableHead className="whitespace-nowrap">Usuario</TableHead>
                        <TableHead className="whitespace-nowrap">Módulo</TableHead>
                        <TableHead className="whitespace-nowrap">Acción</TableHead>
                        <TableHead className="whitespace-nowrap">Entidad</TableHead>
                        <TableHead className="whitespace-nowrap">Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLogs ? (
                        Array(8).fill(0).map((_, i) => (
                          <TableRow key={i}>{Array(6).fill(0).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                        ))
                      ) : auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            Sin registros de auditoría
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="whitespace-nowrap text-xs">{formatDateTime(l.created_at)}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{l.usuario_nombre || '—'}</TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-xs">{l.modulo || '—'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${accionBadge(l.accion)} border-0 text-xs`}>{l.accion}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">{l.entidad_id || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {l.detalles ? JSON.stringify(l.detalles) : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {auditLogs.length > 0 && (
                  <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                    {auditLogs.length} registro{auditLogs.length !== 1 ? 's' : ''} mostrados
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                        <SelectItem value="rectoria">Rectoría</SelectItem>
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
