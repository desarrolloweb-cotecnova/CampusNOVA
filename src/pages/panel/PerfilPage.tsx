// Página de perfil de usuario — CampusNOVA
// El acceso es con cuenta Google + Google Authenticator y la foto proviene de Google,
// por lo que aquí solo se muestra la información del perfil y se edita el nombre.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCloudinaryAvatar } from '@/lib/cloudinary';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Save, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// ── Constantes ──────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  infraestructura: 'Infraestructura',
  rector: 'Rector',
  responsable: 'Responsable',
};

// ── Componente principal ─────────────────────────────────────────────────
export default function PerfilPage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Datos personales
  const [nombre, setNombre] = useState(profile?.nombre ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Guardar info personal ────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!user) return;
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nombre: nombre.trim() || null })
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

  // Foto: la del perfil o, si no hay, la de la cuenta de Google.
  const avatarUrl =
    profile.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    '';

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
              Consulta tu información y actualiza tu nombre
            </p>
          </div>
        </div>

        {/* ── Card: Información personal ─────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>Tu nombre es el único dato que puedes modificar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Foto (solo lectura — proviene de la cuenta de Google) */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden bg-sidebar-primary flex items-center justify-center ring-2 ring-border">
                {avatarUrl ? (
                  <img
                    src={getCloudinaryAvatar(avatarUrl)}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl font-bold text-sidebar-primary-foreground">{initials}</span>
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground text-pretty">
                  La foto se toma automáticamente de tu cuenta de Google
                </p>
              </div>
            </div>

            <Separator />

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

            {/* Cargo (solo lectura) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Cargo institucional</Label>
              <Input
                value={profile.cargo ?? ''}
                readOnly
                disabled
                placeholder="Sin cargo asignado"
                className="bg-muted/50 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">El cargo lo asigna el administrador</p>
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

            <Button onClick={handleSaveInfo} disabled={savingInfo} className="gap-2">
              <Save className="h-4 w-4" />
              {savingInfo ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
