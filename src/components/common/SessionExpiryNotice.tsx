import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SESSION_MAX_HOURS } from '@/lib/session-policy';
import { cn } from '@/lib/utils';

/** Umbral a partir del cual el aviso pasa a cuenta atrás y color de alerta. */
const AVISO_MS = 60 * 60 * 1000;

function formatoHora(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Muestra cuándo vence la sesión.
 *
 * Existe para que la caducidad sea comprobable sin esperar a que ocurra: quien
 * quiera saber si la política de `SESSION_MAX_HOURS` está activa abre el menú
 * de perfil y ve la hora. Sin esto, la única forma de confirmarlo era quedarse
 * conectado ocho horas.
 */
export function SessionExpiryNotice({ className }: { className?: string }) {
  const { sessionExpiresAt } = useAuth();
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (sessionExpiresAt === null) return;
    // Un minuto basta: el texto se mide en minutos.
    const id = window.setInterval(() => setAhora(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [sessionExpiresAt]);

  if (sessionExpiresAt === null) return null;

  const restanteMs = sessionExpiresAt - ahora;
  const porVencer = restanteMs <= AVISO_MS;
  const minutos = Math.max(0, Math.round(restanteMs / 60_000));

  return (
    <div
      className={cn(
        'flex items-start gap-2 text-xs',
        porVencer ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground',
        className,
      )}
    >
      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">
        {porVencer ? (
          <>
            Tu sesión vence en {minutos} min, a las {formatoHora(sessionExpiresAt)}.
          </>
        ) : (
          <>
            Tu sesión vence a las {formatoHora(sessionExpiresAt)}. Por seguridad
            dura máximo {SESSION_MAX_HOURS} horas.
          </>
        )}
      </span>
    </div>
  );
}
