import { lazy, type ReactNode } from 'react';
// Carga diferida por ruta (code-splitting): reduce el bundle inicial que se
// descarga tras el redirect de Google, acelerando la carga del panel.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/panel/DashboardPage'));
const ActivosFijosPage = lazy(() => import('./pages/panel/ActivosFijosPage'));
const GestionActivosPage = lazy(() => import('./pages/panel/GestionActivosPage'));
const MovimientosPage = lazy(() => import('./pages/panel/MovimientosPage'));
const DepreciacionPage = lazy(() => import('./pages/panel/DepreciacionPage'));
const BajasPage = lazy(() => import('./pages/panel/BajasPage'));
const EspaciosFisicosPage = lazy(() => import('./pages/panel/EspaciosFisicosPage'));
const EspacioDetallePage = lazy(() => import('./pages/panel/EspacioDetallePage'));
const IntervencionesPage = lazy(() => import('./pages/panel/IntervencionesPage'));
const GestionEspaciosPage = lazy(() => import('./pages/panel/GestionEspaciosPage'));
const MisEspaciosPage = lazy(() => import('./pages/panel/MisEspaciosPage'));
const DocumentacionPage = lazy(() => import('./pages/panel/DocumentacionPage'));
const ResponsablesPage = lazy(() => import('./pages/panel/ResponsablesPage'));
const NovedadesPage = lazy(() => import('./pages/panel/NovedadesPage'));
const DashboardNovedadesPage = lazy(() => import('./pages/panel/DashboardNovedadesPage'));
const ReservasPage = lazy(() => import('./pages/panel/ReservasPage'));
const DashboardReservasPage = lazy(() => import('./pages/panel/DashboardReservasPage'));
const AdminPage = lazy(() => import('./pages/panel/AdminPage'));
const ReportarNovedadPage = lazy(() => import('./pages/public/ReportarNovedadPage'));
const SolicitarEspacioPage = lazy(() => import('./pages/public/SolicitarEspacioPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const CalendarioPage = lazy(() => import('./pages/public/CalendarioPage'));
const CalendarioReservasPage = lazy(() => import('./pages/panel/CalendarioReservasPage'));
const ConfiguracionPage = lazy(() => import('./pages/panel/ConfiguracionPage'));
const PerfilPage = lazy(() => import('./pages/panel/PerfilPage'));
const SeguridadPage = lazy(() => import('./pages/panel/SeguridadPage'));

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // Páginas públicas
  { name: 'Inicio', path: '/', element: <LandingPage />, public: true },
  { name: 'Iniciar Sesión', path: '/login', element: <LoginPage />, public: true },
  { name: 'Callback', path: '/auth/callback', element: <AuthCallbackPage />, public: true },
  { name: 'Reportar Novedad', path: '/reportar-novedad', element: <ReportarNovedadPage />, public: true },
  { name: 'Solicitar Espacio', path: '/solicitar-espacio', element: <SolicitarEspacioPage />, public: true },
  { name: 'Calendario', path: '/calendario', element: <CalendarioPage />, public: true },
  { name: 'Registro', path: '/registro', element: <RegisterPage />, public: true },

  // Panel interno
  { name: 'Dashboard', path: '/panel', element: <DashboardPage /> },

  // Módulo 1 — Activos Fijos
  { name: 'Activos Fijos', path: '/panel/activos', element: <ActivosFijosPage /> },
  { name: 'Movimientos', path: '/panel/activos/movimientos', element: <MovimientosPage /> },
  { name: 'Depreciación', path: '/panel/activos/depreciacion', element: <DepreciacionPage /> },
  { name: 'Bajas', path: '/panel/activos/bajas', element: <BajasPage /> },
  { name: 'Gestión Activos', path: '/panel/activos/gestion', element: <GestionActivosPage /> },

  // Módulo 2 — Espacios Físicos
  { name: 'Espacios Físicos', path: '/panel/espacios', element: <EspaciosFisicosPage /> },
  { name: 'Detalle Espacio', path: '/panel/espacios/:id', element: <EspacioDetallePage /> },
  { name: 'Mis Espacios', path: '/panel/espacios/mis-espacios', element: <MisEspaciosPage /> },
  { name: 'Intervenciones', path: '/panel/espacios/intervenciones', element: <IntervencionesPage /> },
  { name: 'Documentación', path: '/panel/espacios/documentos', element: <DocumentacionPage /> },
  { name: 'Gestión Espacios', path: '/panel/espacios/gestion', element: <GestionEspaciosPage /> },
  { name: 'Responsables', path: '/panel/responsables', element: <ResponsablesPage /> },

  // Módulo 3 — Novedades
  { name: 'Novedades', path: '/panel/novedades', element: <NovedadesPage /> },
  { name: 'Dashboard Novedades', path: '/panel/novedades/dashboard', element: <DashboardNovedadesPage /> },

  // Módulo 4 — Reservas
  { name: 'Reservas', path: '/panel/reservas', element: <ReservasPage /> },
  { name: 'Dashboard Reservas', path: '/panel/reservas/dashboard', element: <DashboardReservasPage /> },
  { name: 'Calendario Reservas', path: '/panel/reservas/calendario', element: <CalendarioReservasPage /> },

  // Módulo 5 — Administración
  { name: 'Administración', path: '/panel/admin', element: <AdminPage /> },
  { name: 'Usuarios', path: '/panel/admin/usuarios', element: <AdminPage /> },
  { name: 'Catálogos', path: '/panel/admin/catalogos', element: <AdminPage /> },
  { name: 'Auditoría', path: '/panel/admin/auditoria', element: <AdminPage /> },

  // Perfil de usuario
  { name: 'Mi Perfil', path: '/panel/perfil', element: <PerfilPage /> },
  { name: 'Verificación en dos pasos', path: '/panel/seguridad', element: <SeguridadPage /> },

  // Módulo 6 — Monitoreo Supabase
  { name: 'Monitoreo Supabase', path: '/panel/admin/configuracion', element: <ConfiguracionPage /> },
];
