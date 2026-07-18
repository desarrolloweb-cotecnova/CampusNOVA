// Página "Verificación en dos pasos" — gestión del segundo factor (TOTP).
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MfaEnrollCard } from '@/components/auth/MfaEnrollCard';
import { listVerifiedTotpFactors, unenrollTotp } from '@/lib/mfa';
import { toast } from 'sonner';

type View = 'loading' | 'active' | 'configure';

export default function SeguridadPage() {
  const [view, setView] = useState<View>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const factors = await listVerifiedTotpFactors();
      setView(factors.length > 0 ? 'active' : 'configure');
    } catch {
      setView('configure');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const reconfigure = async () => {
    if (!window.confirm('Vas a reconfigurar tu verificación en dos pasos. Deberás escanear un nuevo código QR. ¿Continuar?')) {
      return;
    }
    setBusy(true);
    try {
      const factors = await listVerifiedTotpFactors();
      for (const f of factors) await unenrollTotp(f.id);
      setView('configure');
    } catch (err) {
      toast.error((err as Error)?.message || 'No se pudo reconfigurar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verificación en dos pasos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Añade una capa extra de seguridad con Google Authenticator.
          </p>
        </div>

        {view === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        )}

        {view === 'active' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Estado</CardTitle>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Activa</Badge>
              </div>
              <CardDescription>
                Tu cuenta está protegida con verificación en dos pasos. Se te pide un
                código de Google Authenticator al iniciar sesión.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={reconfigure} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Reconfigurar (nuevo dispositivo)
              </Button>
            </CardContent>
          </Card>
        )}

        {view === 'configure' && (
          <MfaEnrollCard
            onEnrolled={() => { toast.success('Verificación en dos pasos activada.'); refresh(); }}
          />
        )}
      </div>
    </AppLayout>
  );
}
