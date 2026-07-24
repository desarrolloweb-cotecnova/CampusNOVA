// Página de retorno tras el login con Google.
// Es ligera a propósito: no carga el Dashboard ni sus consultas. Resuelve el
// doble factor (verificar o enrolar) y, cuando la sesión llega a AAL2, entra al panel.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getMfaState } from '@/lib/mfa';
import { markMfaSatisfied } from '@/components/auth/MfaGuard';
import { MfaVerifyCard } from '@/components/auth/MfaVerifyCard';
import { MfaEnrollCard } from '@/components/auth/MfaEnrollCard';

type Step = 'checking' | 'verify' | 'enroll';

export default function AuthCallbackPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('checking');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // Cuenta aún no aprobada: no exigir 2FA; el panel muestra el aviso de
    // "cuenta pendiente".
    if (profile && profile.activo === false) {
      navigate('/panel', { replace: true });
      return;
    }
    let cancelled = false;
    getMfaState()
      .then(s => {
        if (cancelled) return;
        if (s === 'ok') {
          markMfaSatisfied(user.id);
          navigate('/panel', { replace: true });
        } else {
          setStep(s);
        }
      })
      .catch(() => {
        if (!cancelled) navigate('/panel', { replace: true });
      });
    return () => { cancelled = true; };
  }, [user, profile, loading, navigate]);

  const goPanel = () => {
    markMfaSatisfied(user?.id ?? null);
    navigate('/panel', { replace: true });
  };

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      {step === 'checking' && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm">Verificando tu sesión…</p>
        </div>
      )}
      {step === 'verify' && <MfaVerifyCard onVerified={goPanel} />}
      {step === 'enroll' && <MfaEnrollCard showLogo onEnrolled={goPanel} />}
    </main>
  );
}
