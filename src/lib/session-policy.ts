import type { User } from '@supabase/supabase-js';

/**
 * Política de caducidad de sesión.
 *
 * Problema que resuelve: Supabase renueva el token de acceso indefinidamente
 * mientras el refresh token siga vivo, así que una pestaña abierta mantiene la
 * sesión durante días sin volver a pedir credenciales. Un equipo compartido o
 * desatendido queda expuesto todo ese tiempo.
 *
 * Regla: la sesión caduca a las SESSION_MAX_HOURS horas contadas desde el
 * inicio de sesión REAL, se use la aplicación o no. No es un temporizador de
 * inactividad: dentro de esa ventana nadie es expulsado por dejar de escribir.
 * Como el tope (8 h) es menor que un día, nadie puede arrastrar la misma sesión
 * de una jornada a la siguiente: cada día hay que volver a autenticarse.
 */

/** Duración máxima de una sesión, en horas, desde el inicio de sesión. */
export const SESSION_MAX_HOURS = 8;

export const SESSION_MAX_MS = SESSION_MAX_HOURS * 60 * 60 * 1000;

/** Antelación con la que se avisa al usuario de que la sesión va a caducar. */
export const SESSION_WARNING_MS = 5 * 60 * 1000;

/** Cada cuánto se comprueba la caducidad mientras la pestaña está abierta. */
export const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

/** Parámetro con el que /login reconoce una expulsión por caducidad. */
export const SESSION_EXPIRED_PARAM = 'expirada';

const STORAGE_KEY = 'campusnova.sesion.inicio';

/**
 * Ancla temporal de la sesión.
 *
 * Se prefiere `last_sign_in_at`, que lo emite el servidor de Supabase en cada
 * inicio de sesión y NO se actualiza al renovar el token: es el único dato que
 * el navegador no puede falsear para estirar la ventana. El respaldo en
 * localStorage solo se usa si el proveedor no lo devuelve.
 */
export function getSessionStart(user: User): number {
  const serverStamp = user.last_sign_in_at
    ? Date.parse(user.last_sign_in_at)
    : Number.NaN;

  if (Number.isFinite(serverStamp)) {
    return serverStamp;
  }

  const stored = readStoredStart();
  if (stored !== null) return stored;

  const now = Date.now();
  storeStart(now);
  return now;
}

/** Momento (epoch ms) en el que la sesión deja de ser válida. */
export function getSessionExpiry(user: User): number {
  return getSessionStart(user) + SESSION_MAX_MS;
}

/** Milisegundos que le quedan a la sesión; 0 o negativo si ya caducó. */
export function getSessionTimeLeft(user: User, now: number = Date.now()): number {
  return getSessionExpiry(user) - now;
}

export function isSessionExpired(user: User, now: number = Date.now()): boolean {
  return getSessionTimeLeft(user, now) <= 0;
}

export function readStoredStart(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    // Modo privado o almacenamiento bloqueado: se trabaja sin respaldo.
    return null;
  }
}

export function storeStart(timestamp: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
    /* sin respaldo */
  }
}

export function clearStoredStart(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada que limpiar */
  }
}

/** Texto para el aviso previo a la caducidad: "5 minutos", "1 minuto". */
export function formatTimeLeft(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}
