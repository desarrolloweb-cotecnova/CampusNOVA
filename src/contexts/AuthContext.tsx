import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
// @ts-ignore
import type { Profile, UserRole } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener perfil de usuario:', error);
    return null;
  }
  return data;
}

/** Roles que tienen acceso completo al sistema (igual que admin) */
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'rectoria'];

/** Verifica si el perfil tiene uno de los roles indicados */
export function hasRole(profile: Profile | null, roles: UserRole[]): boolean {
  if (!profile) return false;
  return roles.includes(profile.role);
}

/** Módulos accesibles por rol */
export const MODULE_ACCESS: Record<string, UserRole[]> = {
  dashboard:      ['admin', 'rectoria', 'infraestructura', 'responsable'],
  activos:        ['admin', 'rectoria', 'infraestructura'],
  espacios:       ['admin', 'rectoria', 'infraestructura', 'responsable'],
  responsables:   ['admin', 'rectoria', 'infraestructura'],
  novedades:      ['admin', 'rectoria', 'infraestructura', 'responsable'],
  reservas:       ['admin', 'rectoria', 'infraestructura', 'responsable'],
  configuracion:  ['admin', 'rectoria'],
};
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** true si el usuario tiene el rol de administrador */
  isAdmin: boolean;
  /** true si puede acceder al módulo de configuración */
  canConfigure: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref para evitar actualizaciones duplicadas cuando onAuthStateChange
  // se dispara varias veces para el mismo usuario (SIGNED_IN + TOKEN_REFRESHED)
  const currentUserIdRef = useRef<string | null>(null);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    // onAuthStateChange dispara INITIAL_SESSION inmediatamente con la sesión
    // actual, por lo que no necesitamos una llamada separada a getSession().
    // Usar ambas provoca actualizaciones de estado duplicadas (parpadeos en login).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // @ts-ignore
      (_event, session) => {
        const sessionUser: User | null = session?.user ?? null;
        const newId = sessionUser?.id ?? null;

        // Ignorar disparos duplicados para el mismo usuario
        // (TOKEN_REFRESHED, USER_UPDATED, etc. no deben forzar re-render)
        if (newId === currentUserIdRef.current) {
          // Si loading sigue activo (primera carga), desbloquear
          if (loading) setLoading(false);
          return;
        }
        currentUserIdRef.current = newId;

        // Restringir acceso solo a correos @cotecnova.edu.co
        if (sessionUser?.email &&
            !sessionUser.email.endsWith('@cotecnova.edu.co') &&
            !sessionUser.email.endsWith('@miaoda.com')) {
          supabase.auth.signOut();
          toast.error('Acceso restringido. Solo se permiten correos @cotecnova.edu.co');
          currentUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(sessionUser);

        if (sessionUser) {
          // Cargar perfil; crear si es el primer login con Google
          getProfile(sessionUser.id).then(existingProfile => {
            if (!existingProfile && sessionUser.email) {
              const displayName =
                sessionUser.user_metadata?.full_name ||
                sessionUser.user_metadata?.name ||
                sessionUser.email.split('@')[0];
              const avatarUrl =
                sessionUser.user_metadata?.avatar_url ||
                sessionUser.user_metadata?.picture || '';
              // Columnas reales de la tabla `profiles`: email, nombre, avatar_url, role, activo
              supabase.from('profiles').upsert({
                id: sessionUser.id,
                email: sessionUser.email,
                nombre: displayName,
                avatar_url: avatarUrl,
                role: 'responsable',
              }, { onConflict: 'id' }).then(() => {
                getProfile(sessionUser.id).then(p => {
                  setProfile(p);
                  setLoading(false);
                });
              });
            } else {
              setProfile(existingProfile);
              setLoading(false);
            }
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      // Soporta login con nombre de usuario o correo completo
      const email = username.includes('@') ? username : `${username}@miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/panel`,
          queryParams: {
            hd: 'cotecnova.edu.co',
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    try {
      const email = `${username}@miaoda.com`;
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'rectoria';
  const canConfigure = profile?.role === 'admin' || profile?.role === 'rectoria';

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithUsername, signUpWithUsername, signInWithGoogle,
      signOut, refreshProfile, isAdmin, canConfigure,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
