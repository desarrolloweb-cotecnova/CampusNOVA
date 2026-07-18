// Página de perfil de usuario — CampusNOVA
// Permite ver/editar datos personales, cambiar foto de perfil y actualizar contraseña
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageToCloudinary, getCloudinaryAvatar } from '@/lib/cloudinary';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Camera, Save, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, ArrowLeft, Trash2, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Constantes ──────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  infraestructura: 'Infraestructura',
  rectoria: 'Rectoría',
  responsable: 'Responsable',
};

// ── Formato de bytes ─────────────────────────────────────────────────────
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Componente principal ─────────────────────────────────────────────────
export default function PerfilPage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primer ingreso: detectar ?cambiar-clave=1 (viene del enlace de invitación)
  const esPrimerIngreso = searchParams.get('cambiar-clave') === '1';
  const passwordSectionRef = useRef<HTMLDivElement>(null);

  // Enfocar sección de contraseña automáticamente al entrar por primer ingreso
  useEffect(() => {
    if (esPrimerIngreso && passwordSectionRef.current) {
      setTimeout(() => passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, [esPrimerIngreso]);

  // Datos personales
  const [nombre, setNombre] = useState(profile?.nombre ?? '');
  const [cargo, setCargo] = useState(profile?.cargo ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  // Foto de perfil
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Guardar info personal ────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!user) return;
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nombre: nombre.trim() || null, cargo: cargo.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Perfil actualizado correctamente');
    } catch (err: unknown) {
      toast.error('Error al guardar', { description: (err as Error).message });
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Subir foto de perfil (Cloudinary — compresión automática) ───────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato no soportado', { description: 'Usa JPEG, PNG, WEBP, AVIF o GIF' });
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      // Cloudinary comprime y optimiza automáticamente
      setUploadProgress(50);
      const publicUrl = await uploadImageToCloudinary(file);
      setUploadProgress(85);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setUploadProgress(100);
      setAvatarPreview(publicUrl);
      await refreshProfile();
      toast.success('Foto de perfil actualizada', {
        description: `Imagen optimizada y subida a Cloudinary (${fmtBytes(file.size)} original)`,
      });
    } catch (err: unknown) {
      toast.error('Error al subir la foto', { description: (err as Error).message });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1200);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user, refreshProfile]);

  // ── Eliminar foto ────────────────────────────────────────────────────
  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    setRemovingAvatar(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      if (error) throw error;
      setAvatarPreview(null);
      await refreshProfile();
      toast.success('Foto de perfil eliminada');
    } catch (err: unknown) {
      toast.error('Error al eliminar la foto', { description: (err as Error).message });
    } finally {
      setRemovingAvatar(false);
    }
  };

  // ── Cambiar contraseña ───────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Completa todos los campos de contraseña');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSavingPassword(true);
    try {
      // En primer ingreso el usuario ya está autenticado por el enlace de invitación
      // — no es necesario re-autenticar con contraseña actual
      if (!esPrimerIngreso) {
        const email = user?.email ?? '';
        const { error: reAuthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (reAuthError) throw new Error('Contraseña actual incorrecta');
      }

      // Actualizar contraseña
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Si era primer ingreso, limpiar la bandera en el perfil
      if (esPrimerIngreso && user?.id) {
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
        await refreshProfile();
        // Limpiar el parámetro de la URL
        setSearchParams({});
        toast.success('¡Contraseña establecida! Ya puedes usar el sistema.');
      } else {
        toast.success('Contraseña actualizada correctamente');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error('Error al cambiar contraseña', { description: (err as Error).message });
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Indicador de fortaleza ───────────────────────────────────────────
  const passwordStrength = (() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { label: 'Débil', color: 'text-destructive', bar: 'bg-destructive', pct: 25 };
    if (score === 2) return { label: 'Regular', color: 'text-amber-500', bar: 'bg-amber-500', pct: 50 };
    if (score === 3) return { label: 'Buena', color: 'text-blue-500', bar: 'bg-blue-500', pct: 75 };
    return { label: 'Fuerte', color: 'text-green-600', bar: 'bg-green-600', pct: 100 };
  })();

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="bg-muted h-8 w-48" />
          <Skeleton className="bg-muted h-48 w-full rounded-xl" />
          <Skeleton className="bg-muted h-64 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.nombre || profile.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-balance">Mi Perfil</h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Gestiona tu información personal y seguridad
            </p>
          </div>
        </div>

        {/* Banner primer ingreso */}
        {esPrimerIngreso && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Debes establecer tu contraseña</p>
              <p className="text-xs text-amber-700 mt-0.5 text-pretty">
                Es tu primer ingreso a CampusNOVA. Por favor desplázate a la sección <strong>Seguridad</strong> y asigna una contraseña personal para continuar.
              </p>
            </div>
          </div>
        )}

        {/* ── Card: Foto de perfil ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              JPEG, PNG, WEBP, AVIF o GIF · Máx. 1 MB (se comprime automáticamente)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              {/* Avatar */}
              <div className="relative shrink-0 mx-auto md:mx-0">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-sidebar-primary flex items-center justify-center ring-2 ring-border">
                  {avatarPreview ? (
                    <img
                      src={getCloudinaryAvatar(avatarPreview)}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-sidebar-primary-foreground">{initials}</span>
                  )}
                </div>
                {/* Botón cámara superpuesto */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background hover:bg-primary/90 transition-colors disabled:opacity-60"
                  aria-label="Cambiar foto"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Acciones */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {uploading ? 'Subiendo…' : 'Cambiar foto'}
                  </Button>
                  {avatarPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={removingAvatar || uploading}
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      {removingAvatar ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                  )}
                </div>

                {/* Barra de progreso */}
                {uploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subiendo imagen…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Las imágenes mayores a 1 MB se comprimen automáticamente en formato WEBP.
                </p>
              </div>
            </div>

            {/* Input oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        {/* ── Card: Información personal ─────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>Actualiza tu nombre y cargo institucional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (solo lectura) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Correo electrónico</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={profile.email ?? ''}
                  readOnly
                  disabled
                  className="bg-muted/50 text-muted-foreground"
                />
                {profile.email && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">El correo no puede modificarse desde aquí</p>
            </div>

            {/* Rol (solo lectura) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Rol en el sistema</Label>
              <div className="flex items-center gap-2 px-3 h-10 rounded-md border bg-muted/50">
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </Badge>
                <span className="text-xs text-muted-foreground ml-1">(asignado por el administrador)</span>
              </div>
            </div>

            <Separator />

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-sm font-normal">Nombre completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre y apellido"
              />
            </div>

            {/* Cargo */}
            <div className="space-y-1.5">
              <Label htmlFor="cargo" className="text-sm font-normal">Cargo institucional</Label>
              <Input
                id="cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej: Jefe de Infraestructura"
              />
            </div>

            <Button onClick={handleSaveInfo} disabled={savingInfo} className="gap-2">
              <Save className="h-4 w-4" />
              {savingInfo ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* ── Card: Seguridad / Contraseña ───────────────────────────── */}
        <Card ref={passwordSectionRef}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Seguridad
            </CardTitle>
            <CardDescription>Cambia tu contraseña de acceso al sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contraseña actual — oculta en primer ingreso */}
            {!esPrimerIngreso && (
            <div className="space-y-1.5">
              <Label htmlFor="current-pass" className="text-sm font-normal">Contraseña actual</Label>
              <div className="relative">
                <Input
                  id="current-pass"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            )}

            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-sm font-normal">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-pass"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Indicador de fortaleza */}
              {passwordStrength && (
                <div className="space-y-1 pt-0.5">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.bar}`}
                      style={{ width: `${passwordStrength.pct}%` }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    Fortaleza: {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pass" className="text-sm font-normal">Confirmar nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm-pass"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Las contraseñas no coinciden
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Las contraseñas coinciden
                </p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              variant="secondary"
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
