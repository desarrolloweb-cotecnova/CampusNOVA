// MFA / Doble factor de autenticación (TOTP — Google Authenticator, Authy, etc.)
// Envoltura sobre la API nativa de Supabase Auth MFA.
import { supabase } from '@/db/supabase';

export interface TotpEnrollment {
  factorId: string;
  /** URI otpauth:// para generar el QR (compatible con Google Authenticator). */
  uri: string;
  /** Secreto en texto para ingreso manual si no se puede escanear el QR. */
  secret: string;
}

/** Devuelve los factores TOTP ya verificados del usuario actual. */
export async function listVerifiedTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []).filter(f => f.status === 'verified');
}

/** true si el usuario tiene al menos un factor TOTP verificado. */
export async function hasVerifiedTotp(): Promise<boolean> {
  try {
    const factors = await listVerifiedTotpFactors();
    return factors.length > 0;
  } catch {
    return false;
  }
}

/**
 * Nivel de garantía de autenticación (AAL).
 * - currentLevel 'aal1' + nextLevel 'aal2'  → el usuario tiene 2FA y debe completarlo.
 * - currentLevel 'aal2'                      → ya pasó el 2FA en esta sesión.
 */
export async function getAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data; // { currentLevel, nextLevel, currentAuthenticationMethods }
}

/** true si la sesión requiere completar el reto TOTP para alcanzar AAL2. */
export async function needsMfaChallenge(): Promise<boolean> {
  try {
    const aal = await getAssuranceLevel();
    return aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2';
  } catch {
    return false;
  }
}

/**
 * Inicia el enrolamiento de un nuevo factor TOTP.
 * Devuelve el URI para el QR y el secreto para ingreso manual.
 */
export async function enrollTotp(friendlyName = 'CampusNOVA'): Promise<TotpEnrollment> {
  // Limpia posibles factores previos "unverified" con el mismo nombre para evitar
  // el error "friendly name already exists".
  try {
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = (existing?.all ?? []).filter(
      f => f.status === 'unverified',
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
    uri: data.totp.uri,
    secret: data.totp.secret,
  };
}

/** Verifica el código de 6 dígitos para completar el enrolamiento del factor. */
export async function verifyEnrollment(factorId: string, code: string) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) throw verifyError;
}

/** Reto TOTP en el login: eleva la sesión a AAL2 con el código del autenticador. */
export async function verifyLoginChallenge(factorId: string, code: string) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) throw verifyError;
}

/** Elimina (desactiva) un factor TOTP. */
export async function unenrollTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
