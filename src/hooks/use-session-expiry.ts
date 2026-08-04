import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  SESSION_CHECK_INTERVAL_MS,
  SESSION_MAX_HOURS,
  SESSION_WARNING_MS,
  formatTimeLeft,
  getSessionTimeLeft,
} from '@/lib/session-policy';

/**
 * Vigila la caducidad de la sesión y ejecuta `onExpire` cuando se agota la
 * ventana de SESSION_MAX_HOURS horas.
 *
 * La comprobación no se apoya solo en un `setInterval`: si el portátil se
 * suspende o la pestaña pasa a segundo plano, el navegador ralentiza o congela
 * los temporizadores. Por eso se vuelve a comprobar al recuperar el foco y al
 * volver a hacer visible la pestaña, que es justo cuando el usuario retoma el
 * trabajo con una sesión posiblemente vencida.
 */
export function useSessionExpiry(user: User | null, onExpire: () => void) {
  // En refs para no reiniciar los temporizadores en cada render.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!user) return;

    let warned = false;
    let done = false;

    const check = () => {
      if (done) return;
      const timeLeft = getSessionTimeLeft(user);

      if (timeLeft <= 0) {
        done = true;
        onExpireRef.current();
        return;
      }

      if (!warned && timeLeft <= SESSION_WARNING_MS) {
        warned = true;
        toast.warning(
          `Tu sesión caduca en ${formatTimeLeft(timeLeft)}. Por seguridad, ` +
          `cada sesión dura máximo ${SESSION_MAX_HOURS} horas: guarda los ` +
          'cambios y vuelve a iniciar sesión.',
          { duration: 15000 },
        );
      }
    };

    // Comprobación inmediata: cubre el caso de recargar la página con una
    // sesión que ya venía caducada del día anterior.
    check();

    const intervalId = window.setInterval(check, SESSION_CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', check);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', check);
    };
  }, [user]);
}
