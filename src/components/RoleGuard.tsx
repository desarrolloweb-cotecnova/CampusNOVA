// Protección de rutas/secciones por rol — CampusNOVA
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/types';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  /** Roles que tienen acceso. Si no se pasa, bloquea a todos. */
  allowedRoles: UserRole[];
  /** Si true, redirige al panel en vez de mostrar pantalla de error */
  redirect?: boolean;
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, redirect = false, children }: RoleGuardProps) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const hasAccess = profile && allowedRoles.includes(profile.role);

  if (!hasAccess) {
    if (redirect) return <Navigate to="/panel" replace />;
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <Shield className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">Acceso restringido</p>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            No tienes permisos para acceder a esta sección.<br />
            Contacta al administrador si crees que esto es un error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
