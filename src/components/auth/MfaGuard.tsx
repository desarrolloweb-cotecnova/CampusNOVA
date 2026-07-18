// Guardián de doble factor OBLIGATORIO.
// Tras iniciar sesión, si la sesión no está en AAL2:
//   - sin factor configurado  → pantalla de enrolamiento (obligatorio)
//   - con factor configurado  → pantalla de verificación (código de 6 dígitos)
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthenticatorApps } from '@/components/auth/AuthenticatorApps';
import { MfaEnrollCard } from '@/components/auth/MfaEnrollCard';
import { LOGO_URL } from '@/lib/assets';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMfaState, listVerifiedTotpFactors, challengeAndVerify, type MfaState,
} from '@/lib/mfa';

// Caché en memoria: una vez confirmado AAL2 para un usuario, no revalidamos en
// cada navegación (cada página remonta el layout). Se limpia al recargar/cerrar sesión.
let aal2ConfirmedFor: string | null = null;

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

function MfaVerifyCard({ onVerified }: { onVerified: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listVerifiedTotpFactors()
      .then(factors => {
        if (factors[0]) setFactorId(factors[0].id);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);
    try {
      await challengeAndVerify(factorId, code);
      onVerified();
    } catch {
      setError('Código incorrecto o expirado. Inténtalo de nuevo.');
      setVerifying(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <img src={LOGO_URL} alt="CampusNOVA" className="mb-2 h-14 w-auto object-contain" />
        <CardTitle>Verificación en dos pasos</CardTitle>
        <CardDescription>
          Escribe el código de 6 dígitos que aparece en tu app{' '}
          <span className="font-medium">Google Authenticator</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="verify-code">Código de verificación</Label>
            <Input
              id="verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
              disabled={!ready}
            />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={verifying || code.length !== 6 || !ready}>
            {verifying ? 'Verificando…' : 'Verificar'}
          </Button>
        </form>
        <AuthenticatorApps compact />
      </CardContent>
    </Card>
  );
}
