import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, Building2, AlertTriangle, Calendar,
  Settings, User, LogOut, Menu, X, ChevronDown, ChevronRight,
  Bell, Search, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { needsMfaChallenge } from '@/lib/mfa';
import { MfaChallenge } from '@/components/auth/MfaChallenge';

import { LOGO_URL } from '@/lib/assets';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
  children?: { label: string; path: string; roles?: string[] }[];
}

const navItems: NavItem[] = [
  {
    label: 'Panel',
    path: '/panel',
    icon: LayoutDashboard,
    // todos los roles
  },
  {
    label: 'Activos Fijos',
    path: '/panel/activos',
    icon: Package,
    roles: ['admin', 'rectoria', 'infraestructura'],
    children: [
      { label: 'Inventario', path: '/panel/activos' },
      { label: 'Movimientos', path: '/panel/activos/movimientos' },
      { label: 'Depreciación', path: '/panel/activos/depreciacion' },
      { label: 'Bajas', path: '/panel/activos/bajas' },
      { label: 'Gestión', path: '/panel/activos/gestion' },
    ],
  },
  {
    label: 'Espacios Físicos',
    path: '/panel/espacios',
    icon: Building2,
    children: [
      { label: 'Listado', path: '/panel/espacios', roles: ['admin', 'rectoria', 'infraestructura'] },
      { label: 'Mis Espacios', path: '/panel/espacios/mis-espacios' },
      { label: 'Intervenciones', path: '/panel/espacios/intervenciones', roles: ['admin', 'rectoria', 'infraestructura'] },
      { label: 'Documentación', path: '/panel/espacios/documentos', roles: ['admin', 'rectoria', 'infraestructura'] },
      { label: 'Gestión', path: '/panel/espacios/gestion', roles: ['admin', 'rectoria', 'infraestructura'] },
    ],
  },
  {
    label: 'Responsables',
    path: '/panel/responsables',
    icon: UserCheck,
    roles: ['admin', 'rectoria', 'infraestructura'],
  },
  {
    label: 'Novedades',
    path: '/panel/novedades',
    icon: AlertTriangle,
    children: [
      { label: 'Listado', path: '/panel/novedades' },
      { label: 'Panel', path: '/panel/novedades/dashboard' },
    ],
  },
  {
    label: 'Reservas',
    path: '/panel/reservas',
    icon: Calendar,
    children: [
      { label: 'Solicitudes', path: '/panel/reservas' },
      { label: 'Calendario', path: '/panel/reservas/calendario' },
      { label: 'Panel', path: '/panel/reservas/dashboard' },
    ],
  },
  {
    label: 'Configuración',
    path: '/panel/admin',
    icon: Settings,
    roles: ['admin', 'rectoria'],
    children: [
      { label: 'Usuarios', path: '/panel/admin/usuarios' },
      { label: 'Auditoría', path: '/panel/admin/auditoria' },
      { label: 'Monitoreo Supabase', path: '/panel/admin/configuracion' },
    ],
  },
];

function NavItemComponent({ item, collapsed = false }: { item: NavItem; collapsed?: boolean }) {
  const location = useLocation();
  const { profile } = useAuth();

  if (item.roles && !item.roles.includes(profile?.role || '')) return null;

  const isActive = location.pathname === item.path ||
    item.children?.some(c => location.pathname.startsWith(c.path));

  if (item.children && !collapsed) {
    return (
      <div>
        <div
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground'
          )}
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </span>
        </div>
        <div className="ml-7 mt-1 space-y-0.5">
          {item.children
            .filter(child => !child.roles || child.roles.includes(profile?.role || ''))
            .map(child => (
              <Link
                key={child.path}
                to={child.path}
                className={cn(
                  'block px-3 py-2 rounded-lg text-sm transition-colors',
                  location.pathname === child.path
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {child.label}
              </Link>
            ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-secondary text-secondary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    infraestructura: 'Infraestructura',
    rectoria: 'Rectoría',
    responsable: 'Responsable',
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white">
        <img src={LOGO_URL} alt="COTECNOVA" className="h-10 w-auto object-contain shrink-0" />
        <div className="min-w-0">
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(item => (
          <div key={item.path} onClick={onClose}>
            <NavItemComponent item={item} />
          </div>
        ))}
      </nav>
      {/* User */}

    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado del doble factor: null = comprobando, true = requiere reto TOTP
  const [mfaRequired, setMfaRequired] = useState<boolean | null>(null);

  // Redirigir si no hay sesión o si el usuario está inactivo
  useEffect(() => {
    if (loading) return;
    if (!profile) {
      navigate('/login', { replace: true });
      return;
    }
    if (profile.activo === false) {
      signOut();
      navigate('/login?inactivo=1', { replace: true });
    }
  }, [profile, loading, navigate, signOut]);

  // Comprobar si la sesión necesita completar el reto de doble factor (AAL1 -> AAL2)
  useEffect(() => {
    let cancelled = false;
    if (loading || !profile) return;
    needsMfaChallenge().then(required => {
      if (!cancelled) setMfaRequired(required);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Bloquear el panel hasta completar el doble factor si la sesión lo requiere
  if (mfaRequired) {
    return <MfaChallenge onVerified={() => setMfaRequired(false)} />;
  }

  // Get page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/panel') return 'Panel General';
    if (path.startsWith('/panel/activos/gestion')) return 'Gestión — Activos Fijos';
    if (path.startsWith('/panel/activos/movimientos')) return 'Movimientos de Activos';
    if (path.startsWith('/panel/activos/depreciacion')) return 'Depreciación Activos Fijos';
    if (path.startsWith('/panel/activos/bajas')) return 'Bajas de Activos';
    if (path.startsWith('/panel/activos')) return 'Inventario de Activos Fijos';
    if (path.startsWith('/panel/espacios/gestion')) return 'Gestión — Espacios Físicos';
    if (path.startsWith('/panel/espacios/intervenciones')) return 'Intervenciones de Espacios Físicos';
    if (path.startsWith('/panel/espacios/documentos')) return 'Documentaciones de Espacios Físicos';
    if (path.startsWith('/panel/espacios/mis-espacios')) return 'Mis Espacios Físicos';
    if (path.startsWith('/panel/espacios/')) return 'Ficha de Espacio';
    if (path.startsWith('/panel/espacios')) return 'Listado de Espacios Físicos';
    if (path.startsWith('/panel/responsables')) return 'Responsables de Espacios';
    if (path.startsWith('/panel/novedades/dashboard')) return 'Panel Novedades';
    if (path.startsWith('/panel/novedades/')) return 'Detalle Novedad';
    if (path.startsWith('/panel/novedades')) return 'Novedades e Incidentes';
    if (path.startsWith('/panel/reservas/calendario')) return 'Calendario';
    if (path.startsWith('/panel/reservas/dashboard')) return 'Panel Reservas';
    if (path.startsWith('/panel/reservas')) return 'Reservas y Alquileres';
    if (path.startsWith('/panel/admin/usuarios')) return 'Gestión de Usuarios';
    if (path.startsWith('/panel/admin/catalogos')) return 'Catálogos';
    if (path.startsWith('/panel/admin/configuracion')) return 'Configuración';
    if (path.startsWith('/panel/admin/auditoria')) return 'Logs de Auditoría';
    if (path.startsWith('/panel/perfil')) return 'Mi Perfil';
    return 'CampusNOVA';
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0">
        <div className="fixed top-0 left-0 w-64 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
                <SidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">{getPageTitle()}</h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/panel/novedades')}
              >
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notificaciones</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-2 flex items-center gap-2 rounded-full hover:bg-accent">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium hidden md:block text-slate-700">
                      {profile?.nombre || profile?.email?.split('@')[0] || 'Usuario'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.nombre || 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/panel/perfil')}>
                    <User className="h-4 w-4 mr-2" /> Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => { await signOut(); navigate('/'); }}
                    className="text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
