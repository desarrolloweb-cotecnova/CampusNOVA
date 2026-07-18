import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/panel/DashboardPage';
import ActivosFijosPage from './pages/panel/ActivosFijosPage';
import GestionActivosPage from './pages/panel/GestionActivosPage';
import MovimientosPage from './pages/panel/MovimientosPage';
import DepreciacionPage from './pages/panel/DepreciacionPage';
import BajasPage from './pages/panel/BajasPage';
import EspaciosFisicosPage from './pages/panel/EspaciosFisicosPage';
import EspacioDetallePage from './pages/panel/EspacioDetallePage';
import IntervencionesPage from './pages/panel/IntervencionesPage';
import GestionEspaciosPage from './pages/panel/GestionEspaciosPage';
import MisEspaciosPage from './pages/panel/MisEspaciosPage';
import DocumentacionPage from './pages/panel/DocumentacionPage';
import ResponsablesPage from './pages/panel/ResponsablesPage';
import NovedadesPage from './pages/panel/NovedadesPage';
import DashboardNovedadesPage from './pages/panel/DashboardNovedadesPage';
import ReservasPage from './pages/panel/ReservasPage';
import DashboardReservasPage from './pages/panel/DashboardReservasPage';
import AdminPage from './pages/panel/AdminPage';
import ReportarNovedadPage from './pages/public/ReportarNovedadPage';
import SolicitarEspacioPage from './pages/public/SolicitarEspacioPage';
import RegisterPage from './pages/public/RegisterPage';
import CalendarioPage from './pages/public/CalendarioPage';
import CalendarioReservasPage from './pages/panel/CalendarioReservasPage';
import ConfiguracionPage from './pages/panel/ConfiguracionPage';
import PerfilPage from './pages/panel/PerfilPage';

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

  // Módulo 6 — Monitoreo Supabase
  { name: 'Monitoreo Supabase', path: '/panel/admin/configuracion', element: <ConfiguracionPage /> },
];
