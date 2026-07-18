// Guardián de doble factor OBLIGATORIO (red de seguridad a nivel de layout).
// Tras iniciar sesión, si la sesión no está en AAL2:
//   - sin factor configurado  → pantalla de enrolamiento (obligatorio)
//   - con factor configurado  → pantalla de verificación (código de 6 dígitos)
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MfaEnrollCard } from '@/components/auth/MfaEnrollCard';
import { MfaVerifyCard } from '@/components/auth/MfaVerifyCard';
import { useAuth } from '@/contexts/AuthContext';
import { getMfaState, type MfaState } from '@/lib/mfa';

// Caché en memoria: una vez confirmado AAL2 para un usuario, no revalidamos en
// cada navegación (cada página remonta el layout). Se limpia al recargar/cerrar sesión.
let aal2ConfirmedFor: string | null = null;

/** Marca la sesión como AAL2 confirmada (lo usa también el callback de login). */
export function markMfaSatisfied(uid: string | null) {
  aal2ConfirmedFor = uid;
}

export function MfaGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [state, setState] = useState<MfaState | 'loading'>(
    aal2ConfirmedFor && aal2ConfirmedFor === uid ? 'ok' : 'loading',
  );

  const check = useCallback(() => {
    getMfaState()
      .then(s => {
        if (s === 'ok') aal2ConfirmedFor = uid;
        setState(s);
      })
      .catch(() => setState('ok')); // si falla la consulta, no bloquear el acceso
  }, [uid]);

  useEffect(() => {
    if (aal2ConfirmedFor && aal2ConfirmedFor === uid) {
      setState('ok');
      return;
    }
    check();
  }, [check, uid]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'ok') return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      {state === 'enroll' ? (
        <MfaEnrollCard showLogo onEnrolled={() => { aal2ConfirmedFor = uid; setState('ok'); }} />
      ) : (
        <MfaVerifyCard onVerified={() => { aal2ConfirmedFor = uid; setState('ok'); }} />
      )}
    </main>
  );
}
