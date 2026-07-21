import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

import { LOGO_URL } from '@/lib/assets';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) {
      toast.error('Por favor completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Crear usuario en Supabase Auth (sin envío de correo de activación)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: undefined },
      });
      if (authError) throw authError;

      const uid = authData.user?.id;
      if (!uid) throw new Error('No se pudo obtener el ID del usuario creado.');

      // El trigger handle_new_user ya crea el perfil (rol responsable, activo=false)
      // y rellena nombre/cargo desde la precarga si el correo está en el listado.
      // Solo aseguramos el correo por si el perfil no existiera aún; NO enviamos
      // nombre/cargo/role para no sobrescribir los valores precargados.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: uid,
        email: email.trim().toLowerCase(),
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (profileError) throw profileError;

      toast.success('Solicitud de acceso enviada. Un administrador activará tu cuenta.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el usuario.';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        toast.error('Este correo ya está registrado en el sistema.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>

        <Card className="shadow-hover">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src={LOGO_URL} alt="CampusNOVA" className="h-16 w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-balance">Solicitar Acceso</CardTitle>
            <CardDescription className="text-pretty">
              Ingresa tu correo y una contraseña. Un administrador revisará y activará tu cuenta.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Correo */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@cotecnova.edu.co"
                    className="pl-10"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? 'Enviando solicitud...' : 'Solicitar acceso'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Corporación de Estudios Tecnológicos del Norte del Valle — COTECNOVA
        </p>
      </div>
    </div>
  );
}

