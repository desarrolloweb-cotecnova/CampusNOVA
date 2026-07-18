// MFA / Doble factor de autenticación (TOTP — Google Authenticator, Authy, etc.)
// Envoltura sobre la API nativa de Supabase Auth MFA.
import { supabase } from '@/db/supabase';

export interface TotpEnrollment {
  factorId: string;
  /** SVG (data URI) del código QR generado por Supabase. */
  qrCode: string;
  /** URI otpauth:// (por si se quiere generar el QR manualmente). */
  uri: string;
  /** Secreto en texto para ingreso manual si no se puede escanear el QR. */
  secret: string;
}

/** Estado del segundo factor para la sesión actual. */
export type MfaState =
  | 'ok'       // sesión ya en AAL2 (2FA verificado)
  | 'verify'   // tiene factor verificado pero falta el reto (AAL1 -> AAL2)
  | 'enroll';  // no tiene factor: debe configurarlo (2FA obligatorio)

/** Devuelve los factores TOTP ya verificados del usuario actual. */
export async function listVerifiedTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []).filter(f => f.status === 'verified');
}

/** true si el usuario tiene al menos un factor TOTP verificado. */
export async function hasVerifiedTotp(): Promise<boolean> {
  try {
    return (await listVerifiedTotpFactors()).length > 0;
  } catch {
    return false;
  }
}

/** Nivel de garantía de autenticación (AAL) de la sesión. */
export async function getAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data; // { currentLevel, nextLevel, currentAuthenticationMethods }
}

/**
 * Determina qué debe pasar con el 2FA en esta sesión (2FA obligatorio):
 * - 'ok'     → ya está en AAL2.
 * - 'verify' → tiene factor verificado, falta introducir el código.
 * - 'enroll' → no tiene factor, debe configurarlo.
 */
export async function getMfaState(): Promise<MfaState> {
  const aal = await getAssuranceLevel();
  if (aal?.currentLevel === 'aal2') return 'ok';
  const verified = await listVerifiedTotpFactors();
  return verified.length > 0 ? 'verify' : 'enroll';
}

/**
 * Inicia el enrolamiento de un nuevo factor TOTP.
 * Limpia antes los factores sin verificar para evitar duplicados.
 */
export async function enrollTotp(friendlyName = 'CampusNOVA'): Promise<TotpEnrollment> {
  try {
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = (existing?.all ?? []).filter(
      f => f.factor_type === 'totp' && f.status !== 'verified',
    );
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  } catch {
    /* ignorar limpieza fallida */
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `${friendlyName}-${Date.now()}`,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    uri: data.totp.uri,
    secret: data.totp.secret,
  };
}

/**
 * Reta y verifica un código TOTP en un solo paso.
 * Sirve tanto para completar el enrolamiento como para elevar la sesión a AAL2.
 */
export async function challengeAndVerify(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });
  if (error) throw error;
}

/** Elimina (desactiva) un factor TOTP. */
export async function unenrollTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
