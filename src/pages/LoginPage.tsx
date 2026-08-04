import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { LOGO_URL } from '@/lib/assets';
import { SESSION_EXPIRED_PARAM, SESSION_MAX_HOURS } from '@/lib/session-policy';
import { toast } from 'sonner';

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Avisos por parámetros de URL (cuenta inactiva o dominio no permitido)
  useEffect(() => {
    if (searchParams.get('inactivo') === '1') {
      toast.warning('Tu cuenta aún no ha sido activada. Contacta al administrador.');
    }
    if (searchParams.get('error') === 'domain') {
      toast.error('Solo se permite el acceso con cuentas @cotecnova.edu.co.');
    }
    if (searchParams.get(SESSION_EXPIRED_PARAM) === '1') {
      toast.info(
        `Tu sesión caducó. Por seguridad dura como máximo ${SESSION_MAX_HOURS} ` +
        'horas, así que hay que iniciar sesión de nuevo cada día.',
        { duration: 10000 },
      );
    }
  }, [searchParams]);

  // Redirigir al panel una vez confirmada la sesión
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/panel', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setGoogleLoading(false);
    }
    // Si no hay error, Supabase redirige automáticamente a Google
  };

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src={LOGO_URL} alt="CampusNOVA" className="mb-2 h-24 w-auto object-contain" />
          <CardDescription>
            Sistema de gestión de infraestructura, activos y espacios físicos de COTECNOVA.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            type="button"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || authLoading}
          >
            {googleLoading ? 'Redirigiendo a Google…' : 'Iniciar sesión con Google'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            El acceso está restringido a correos @cotecnova.edu.co y requiere
            verificación en dos pasos.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
