// Tarjeta de configuración del segundo factor (TOTP) con Google Authenticator.
// Reutilizable: en el guard obligatorio (tras login) y en la página de Seguridad.
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthenticatorApps } from '@/components/auth/AuthenticatorApps';
import { enrollTotp, challengeAndVerify, type TotpEnrollment } from '@/lib/mfa';
import { LOGO_URL } from '@/lib/assets';

interface Props {
  /** Se llama cuando el 2FA queda activado (sesión en AAL2). */
  onEnrolled: () => void;
  /** Muestra el logo arriba (para la pantalla de login obligatorio). */
  showLogo?: boolean;
  /** Permite cancelar (solo en la página de Seguridad, no en el flujo obligatorio). */
  onCancel?: () => void;
}

export function MfaEnrollCard({ onEnrolled, showLogo = false, onCancel }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    enrollTotp('CampusNOVA')
      .then(data => {
        if (cancelled) return;
        setEnrollment(data);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setError('No se pudo generar el código QR. Recarga la página.');
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    setVerifying(true);
    setError(null);
    try {
      await challengeAndVerify(enrollment.factorId, code);
      onEnrolled();
    } catch {
      setError('Código incorrecto o expirado. Inténtalo de nuevo.');
      setVerifying(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className={showLogo ? 'items-center text-center' : undefined}>
        {showLogo && <img src={LOGO_URL} alt="CampusNOVA" className="mb-2 h-14 w-auto object-contain" />}
        <CardTitle>Configura la verificación en dos pasos</CardTitle>
        <CardDescription>
          Por seguridad, CampusNOVA usa un segundo paso con la app{' '}
          <span className="font-medium">Google Authenticator</span>. Instálala en tu
          teléfono, escanea el código QR y escribe el código de 6 dígitos que aparece.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Generando código…
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}
        {status === 'ready' && enrollment && (
          <>
            <AuthenticatorApps />
            <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Instala Google Authenticator (botones de arriba).</li>
              <li>Ábrela y toca «+» → «Escanear código QR».</li>
              <li>Apunta al código de abajo y escribe los 6 dígitos.</li>
            </ol>
            <div className="flex justify-center rounded-md border bg-white p-4">
              <img
                src={enrollment.qrCode}
                alt="Código QR para configurar la verificación en dos pasos"
                width={200}
                height={200}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              ¿No puedes escanear? Ingresa esta clave manualmente:
              <br />
              <code className="break-all text-foreground">{enrollment.secret}</code>
            </p>
            <form onSubmit={handleVerify} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="enroll-code">Código de verificación</Label>
                <Input
                  id="enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={verifying || code.length !== 6}>
                  {verifying ? 'Verificando…' : 'Activar y continuar'}
                </Button>
                {onCancel && (
                  <Button type="button" variant="ghost" onClick={onCancel} disabled={verifying}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
