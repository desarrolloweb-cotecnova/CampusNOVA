// Tarjeta de gestión del doble factor (TOTP) para la página de perfil.
// Permite activar/desactivar 2FA con Google Authenticator (u otra app compatible).
import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import {
  listVerifiedTotpFactors,
  enrollTotp,
  verifyEnrollment,
  unenrollTotp,
  type TotpEnrollment,
} from '@/lib/mfa';
import { toast } from 'sonner';

type Status = 'loading' | 'disabled' | 'enrolling' | 'enabled';

export function MfaEnrollment() {
  const [status, setStatus] = useState<Status>('loading');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const factors = await listVerifiedTotpFactors();
      if (factors[0]) {
        setActiveFactorId(factors[0].id);
        setStatus('enabled');
      } else {
        setActiveFactorId(null);
        setStatus('disabled');
      }
    } catch {
      setStatus('disabled');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const data = await enrollTotp('CampusNOVA');
      setEnrollment(data);
      setStatus('enrolling');
    } catch (err) {
      toast.error((err as Error)?.message || 'No se pudo iniciar el 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    if (code.trim().length !== 6) {
      toast.error('Ingresa el código de 6 dígitos de tu app de autenticación.');
      return;
    }
    setBusy(true);
    try {
      await verifyEnrollment(enrollment.factorId, code);
      toast.success('Doble factor activado correctamente.');
      setEnrollment(null);
      setCode('');
      await refresh();
    } catch (err) {
      toast.error((err as Error)?.message || 'Código incorrecto. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (enrollment) {
      try {
        await unenrollTotp(enrollment.factorId);
      } catch {
        /* ignorar */
      }
    }
    setEnrollment(null);
    setCode('');
    await refresh();
  };

  const disable = async () => {
    if (!activeFactorId) return;
    if (!window.confirm('¿Desactivar el doble factor de autenticación?')) return;
    setBusy(true);
    try {
      await unenrollTotp(activeFactorId);
      toast.success('Doble factor desactivado.');
      await refresh();
    } catch (err) {
      toast.error((err as Error)?.message || 'No se pudo desactivar el 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = () => {
    if (!enrollment) return;
    navigator.clipboard?.writeText(enrollment.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Doble factor de autenticación (2FA)</CardTitle>
          </div>
          {status === 'enabled' && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
          )}
          {status === 'disabled' && <Badge variant="secondary">Inactivo</Badge>}
        </div>
        <CardDescription>
          Protege tu cuenta con un segundo paso usando Google Authenticator, Authy
          o cualquier app compatible con TOTP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando estado...
          </div>
        )}

        {status === 'disabled' && (
          <Button onClick={startEnroll} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            Activar doble factor
          </Button>
        )}

        {status === 'enrolling' && enrollment && (
          <div className="space-y-4">
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Abre Google Authenticator en tu teléfono.</li>
              <li>Toca “+” y escanea este código QR.</li>
              <li>Ingresa el código de 6 dígitos que aparece.</li>
            </ol>
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
              <div className="bg-white p-3 rounded-md">
                <QRCodeDataUrl text={enrollment.uri} width={180} />
              </div>
              <div className="w-full text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  ¿No puedes escanear? Ingresa esta clave manualmente:
                </p>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex items-center gap-2 font-mono text-sm bg-muted px-3 py-1.5 rounded-md break-all"
                >
                  {enrollment.secret}
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <form onSubmit={confirmEnroll} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="enroll-code">Código de verificación</Label>
                <Input
                  id="enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-xl tracking-[0.4em] font-mono max-w-[200px]"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmar y activar
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEnroll} disabled={busy}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {status === 'enabled' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El doble factor está activo. Se te pedirá un código al iniciar sesión.
            </p>
            <Button variant="destructive" onClick={disable} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
              Desactivar doble factor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
