// Pantalla de reto de doble factor (TOTP) mostrada tras el login cuando el
// usuario tiene 2FA activo y la sesión aún está en AAL1.
import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listVerifiedTotpFactors, verifyLoginChallenge } from '@/lib/mfa';
import { useAuth } from '@/contexts/AuthContext';
import { LOGO_URL } from '@/lib/assets';
import { toast } from 'sonner';

interface MfaChallengeProps {
  /** Se llama cuando la sesión llega correctamente a AAL2. */
  onVerified: () => void;
}

export function MfaChallenge({ onVerified }: MfaChallengeProps) {
  const { signOut } = useAuth();
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listVerifiedTotpFactors()
      .then(factors => {
        if (factors[0]) setFactorId(factors[0].id);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) {
      toast.error('No se encontró un factor de autenticación. Contacta al administrador.');
      return;
    }
    if (code.trim().length !== 6) {
      toast.error('Ingresa el código de 6 dígitos de tu app de autenticación.');
      return;
    }
    setLoading(true);
    try {
      await verifyLoginChallenge(factorId, code);
      toast.success('Verificación exitosa.');
      onVerified();
    } catch (err) {
      toast.error((err as Error)?.message || 'Código incorrecto. Intenta de nuevo.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-hover">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src={LOGO_URL} alt="COTECNOVA" className="h-14 w-auto object-contain" />
            </div>
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-primary/10 p-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">Verificación en dos pasos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Ingresa el código de 6 dígitos que muestra tu app de autenticación
              (Google Authenticator).
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Código de autenticación</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  disabled={loading || !ready}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => signOut()}
                disabled={loading}
              >
                Cancelar y cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
