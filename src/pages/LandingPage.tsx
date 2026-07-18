import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Building2, AlertTriangle, Calendar,
  MapPin, Phone, Mail, ExternalLink, ChevronRight,
  Users, Clock, CheckCircle, ArrowRight, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import type { EspacioFisico } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

import { LOGO_URL, LOGO_FONDO_URL } from '@/lib/assets';

const SPACE_IMAGES: Record<string, string> = {
  'Auditorio Paraninfo': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80',
  'Laboratorio A': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80',
  'Laboratorio B': 'https://images.unsplash.com/photo-1563290443-65571441d06b?w=600&q=80',
  'Laboratorio C': 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80',
  'Laboratorio Energías Renovables': 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600&q=80',
  'Salón Cultural': 'https://images.unsplash.com/photo-1478366780257-d06abef5ba32?w=600&q=80',
  'Auditorio 1': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  'Laboratorio de Idiomas': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  'default': 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80',
};

export default function LandingPage() {
  const [spaces, setSpaces] = useState<EspacioFisico[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    const { data } = await supabase
      .from('espacios_fisicos')
      .select('*')
      .eq('habilitado_reserva', true)
      .order('nombre')
      .limit(8);
    setSpaces(Array.isArray(data) ? data : []);
  };

  const getSpaceImage = (nombre: string, fotoUrl?: string | null) => {
    if (fotoUrl) return fotoUrl;
    return SPACE_IMAGES[nombre] || SPACE_IMAGES.default;
  };

  const services = [
    {
      icon: Package,
      title: 'Gestión de Activos Fijos',
      desc: 'Inventario completo, movimientos, depreciación y reportes de todos los activos institucionales.',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Building2,
      title: 'Gestión de Espacios Físicos',
      desc: 'Fichas técnicas, intervenciones, planos y estado de cada espacio de COTECNOVA.',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: AlertTriangle,
      title: 'Novedades e Incidentes',
      desc: 'Reporte y seguimiento de problemas, daños y situaciones anómalas en tiempo real.',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      icon: Calendar,
      title: 'Reservas y Alquileres',
      desc: 'Solicitud y aprobación de espacios para eventos académicos, culturales y comerciales.',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
  ];

  const externalServices = [
    {
      icon: AlertTriangle,
      title: 'Reportar una Novedad',
      desc: 'Reporta daños, filtraciones, problemas eléctricos o cualquier situación anómala sin necesidad de registro.',
      action: () => navigate('/reportar-novedad'),
      color: 'bg-secondary',
    },
    {
      icon: Calendar,
      title: 'Solicitar un Espacio',
      desc: 'Solicita la reserva o alquiler de auditorios, laboratorios, aulas y más espacios de COTECNOVA.',
      action: () => navigate('/solicitar-espacio'),
      color: 'bg-primary',
    },
  ];

  const stats = [
    { value: '27+', label: 'Espacios físicos', icon: Building2 },
    { value: '500+', label: 'Activos registrados', icon: Package },
    { value: '3', label: 'Sedes activas', icon: MapPin },
    { value: '100%', label: 'Trazabilidad', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="COTECNOVA" className="h-10 w-auto object-contain" />
              <div className="hidden sm:block">

              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#servicios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Servicios</a>
              <a href="#espacios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Espacios</a>
              <a href="#calendario" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Calendario</a>
              <a href="#contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contacto</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => navigate('/reportar-novedad')}>
                Reportar Novedad
              </Button>
              {user ? (
                <Button size="sm" onClick={() => navigate('/panel')}>
                  <span>Ir al Panel</span> <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/login')}>
                  <span>Ingresar</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border py-3 space-y-1">
              <a href="#servicios" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Servicios</a>
              <a href="#espacios" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Espacios</a>
              <a href="#calendario" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Calendario</a>
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { navigate('/reportar-novedad'); setMobileMenuOpen(false); }}>
                Reportar Novedad
              </Button>
            </div>
          )}
        </div>
      </header>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-20 md:py-32">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-20 right-1/4 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">

          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 text-balance">
            <span>Campus</span><span className="text-secondary">NOVA</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 text-pretty">
            La plataforma de gestión inteligente de la infraestructura de COTECNOVA
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => navigate('/panel')}>
                <span>Ir al Panel</span> <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => navigate('/login')}>
                <span>Iniciar Sesión</span> <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/60 text-white hover:bg-white/10"
              onClick={() => navigate('/reportar-novedad')}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span>Reportar una Novedad</span>
            </Button>
          </div>
        </div>
      </section>
      {/* Stats */}
      <section className="py-12 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Servicios para usuarios registrados */}
      <section id="servicios" className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Plataforma Institucional</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-balance mb-3">Servicios para Usuarios Registrados</h2>
            <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
              Gestión integral de la infraestructura física e institucional de COTECNOVA
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(s => (
              <Card key={s.title} className="h-full flex flex-col shadow-card hover:shadow-hover transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <CardTitle className="text-lg text-balance">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground text-pretty text-sm">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Servicios para usuarios externos */}
      <section className="py-16" style={{ backgroundColor: '#EE7117' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-white/20 text-white border-white/30">Comunidad Académica</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-balance mb-3 text-white">Servicios para la Comunidad</h2>
            <p className="text-white/80 text-pretty max-w-xl mx-auto">
              Sin necesidad de registro, estudiantes, docentes y visitantes pueden utilizar estos servicios
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {externalServices.map(s => (
              <Card key={s.title} className="h-full flex flex-col shadow-card hover:shadow-hover transition-shadow cursor-pointer" onClick={s.action}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                    <s.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-balance">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-muted-foreground text-pretty text-sm flex-1">{s.desc}</p>
                  <Button className="mt-4" onClick={s.action}>
                    <span>Acceder</span> <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Catálogo de espacios */}
      <section id="espacios" className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Disponibles</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-balance mb-3">Espacios para Reservar</h2>
            <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
              Conoce los espacios disponibles para reserva o alquiler en COTECNOVA
            </p>
          </div>
          {spaces.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Los espacios se cargarán próximamente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {spaces.map(space => (
                <Card key={space.id} className="h-full flex flex-col overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={getSpaceImage(space.nombre, space.foto_principal_url)}
                      alt={space.nombre}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = SPACE_IMAGES.default; }}
                    />
                  </div>
                  <CardContent className="flex-1 flex flex-col p-4">
                    <h3 className="font-semibold text-sm text-balance mb-1">{space.nombre}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="h-3 w-3" />
                    <span>Capacidad: {space.capacidad_personas ?? 'N/D'} personas</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <Badge className={space.estado === 'Bueno' ? 'bg-green-100 text-green-800 border-0' : 'bg-yellow-100 text-yellow-800 border-0'}>
                        {space.estado}
                      </Badge>
                      {space.tarifa_alquiler && (
                        <span className="text-xs text-muted-foreground">
                          ${space.tarifa_alquiler.toLocaleString('es-CO')}/día
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate('/solicitar-espacio')}
                    >
                      Solicitar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => navigate('/solicitar-espacio')}>
              <span>Ver todos los espacios</span> <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      {/* Calendario público simplificado */}
      <section id="calendario" className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Disponibilidad</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-balance mb-3">Calendario de Espacios</h2>
            <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
              Consulta la disponibilidad de los espacios antes de realizar tu solicitud
            </p>
          </div>
          <Card className="shadow-card max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Calendar className="h-16 w-16 text-primary mx-auto mb-4 opacity-60" />
              <h3 className="text-lg font-semibold mb-2">Consulta el Calendario</h3>
              <p className="text-muted-foreground text-sm mb-6 text-pretty">
                Visualiza las reservas y alquileres aprobados en el calendario interactivo.
                Las reservas se muestran en verde y los alquileres en naranja.
              </p>
              <Button onClick={() => navigate('/calendario')}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Ver disponibilidad y solicitar</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* Footer */}
      <footer id="contacto" style={{ backgroundColor: '#00602F' }} className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_FONDO_URL} alt="CampusNOVA" className="h-14 w-auto object-contain" />
                <div>

                </div>
              </div>
              <p className="text-white/70 text-sm text-pretty">
                Plataforma integral para la gestión de la infraestructura física de COTECNOVA.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Corporación de Estudios Tecnológicos del Norte del Valle</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-white/70 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Cartago, Valle del Cauca, Colombia</span>
                </div>
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Lunes a Viernes: 7:00 AM – 6:00 PM</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Accesos Rápidos</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/reportar-novedad')} className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <AlertTriangle className="h-3.5 w-3.5" /><span>Reportar una novedad</span>
                </button>
                <button onClick={() => navigate('/solicitar-espacio')} className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <Calendar className="h-3.5 w-3.5" /><span>Solicitar un espacio</span>
                </button>
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /><span>Iniciar sesión</span>
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-sidebar-border pt-6 text-center">
            <p className="text-white/50 text-xs">{"© 2026 Todos los derechos reservados."}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
