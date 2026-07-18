
-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE public.user_role AS ENUM ('admin', 'infraestructura', 'rectoria');
CREATE TYPE public.estado_activo AS ENUM ('En funcionamiento', 'Daño parcial', 'Dado de baja', 'En reparación');
CREATE TYPE public.estado_espacio AS ENUM ('Bueno', 'Regular', 'Requiere intervención');
CREATE TYPE public.tipo_espacio AS ENUM ('AUL', 'LAB', 'ADM', 'BAÑ', 'BOD', 'AUD', 'SAL', 'PAR', 'CUL', 'HOT');
CREATE TYPE public.sede_espacio AS ENUM ('Sede Principal', 'Sede Secundaria', 'Sede Rural');
CREATE TYPE public.bloque_espacio AS ENUM ('Bloque A', 'Bloque B', 'Bloque C', 'Bloque D', 'N/A');
CREATE TYPE public.estado_intervencion AS ENUM ('Solicitud', 'En revisión', 'Aprobada', 'En ejecución', 'Finalizado', 'Rechazada');
CREATE TYPE public.tipo_intervencion AS ENUM ('Mantenimiento preventivo', 'Mantenimiento correctivo', 'Remodelación', 'Adecuación', 'Construcción nueva', 'Modificación eléctrica', 'Modificación hidráulica', 'Reparación de emergencia');
CREATE TYPE public.prioridad AS ENUM ('Alta', 'Media', 'Baja');
CREATE TYPE public.estado_novedad AS ENUM ('Recibido', 'En revisión', 'En gestión', 'Resuelto', 'Cerrado');
CREATE TYPE public.tipo_novedad AS ENUM ('Daño en equipamiento', 'Gotera/filtración de agua', 'Daño eléctrico', 'Daño en mobiliario', 'Problema de seguridad', 'Aseo e higiene', 'Otro');
CREATE TYPE public.rol_reportante AS ENUM ('Estudiante', 'Docente', 'Administrativo', 'Visitante');
CREATE TYPE public.tipo_solicitud AS ENUM ('Reserva', 'Alquiler');
CREATE TYPE public.estado_reserva AS ENUM ('Recibida', 'En revisión', 'Aprobada', 'Rechazada', 'Confirmada', 'Cancelada');
CREATE TYPE public.estado_pago AS ENUM ('Pendiente', 'Pagado');
CREATE TYPE public.tipo_solicitante AS ENUM ('Interno', 'Externo');
CREATE TYPE public.motivo_baja AS ENUM ('Deterioro', 'Robo', 'Obsolescencia', 'Donación', 'Otro');

-- ==========================================
-- PROFILES (users internal)
-- ==========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  nombre text,
  cargo text,
  role public.user_role NOT NULL DEFAULT 'infraestructura',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ESPACIOS FÍSICOS
-- ==========================================
CREATE TABLE public.espacios_fisicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  sede public.sede_espacio NOT NULL DEFAULT 'Sede Principal',
  bloque public.bloque_espacio NOT NULL DEFAULT 'Bloque A',
  piso text,
  tipo public.tipo_espacio NOT NULL,
  uso_actual text,
  area_m2 numeric(10,2),
  capacidad_personas integer,
  capacidad_equipos integer,
  instalaciones_electricas text,
  instalaciones_hidraulicas text,
  instalaciones_sanitarias text,
  estado public.estado_espacio NOT NULL DEFAULT 'Bueno',
  fotos_urls text[] DEFAULT '{}',
  observaciones text,
  habilitado_reserva boolean NOT NULL DEFAULT false,
  tarifa_alquiler numeric(15,2),
  equipamiento_disponible text,
  foto_principal_url text,
  fecha_ultima_actualizacion timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.espacios_fisicos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ACTIVOS FIJOS
-- ==========================================
CREATE TABLE public.activos_fijos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  valor numeric(18,2) NOT NULL DEFAULT 0,
  fecha_adquisicion date,
  factura text,
  iva numeric(5,2) DEFAULT 0,
  depreciable boolean NOT NULL DEFAULT false,
  tiempo_depreciacion integer,
  estado public.estado_activo NOT NULL DEFAULT 'En funcionamiento',
  espacio_id uuid REFERENCES public.espacios_fisicos(id),
  categoria text NOT NULL,
  responsable text,
  proveedor text,
  documento_pdf_url text,
  foto_url text,
  observaciones text,
  dado_de_baja boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activos_fijos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- MOVIMIENTOS DE ACTIVOS
-- ==========================================
CREATE TABLE public.movimientos_activos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id uuid NOT NULL REFERENCES public.activos_fijos(id) ON DELETE CASCADE,
  tipo_movimiento text NOT NULL, -- 'traslado', 'cambio_responsable', 'cambio_estado'
  espacio_origen_id uuid REFERENCES public.espacios_fisicos(id),
  espacio_destino_id uuid REFERENCES public.espacios_fisicos(id),
  responsable_anterior text,
  responsable_nuevo text,
  estado_anterior text,
  estado_nuevo text,
  fecha_movimiento date NOT NULL DEFAULT CURRENT_DATE,
  motivo text,
  registrado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_activos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- BAJAS DE ACTIVOS
-- ==========================================
CREATE TABLE public.bajas_activos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id uuid NOT NULL REFERENCES public.activos_fijos(id) ON DELETE CASCADE,
  motivo public.motivo_baja NOT NULL,
  fecha_baja date NOT NULL DEFAULT CURRENT_DATE,
  descripcion text,
  acta_pdf_url text,
  registrado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bajas_activos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- INTERVENCIONES
-- ==========================================
CREATE TABLE public.intervenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  espacio_id uuid NOT NULL REFERENCES public.espacios_fisicos(id),
  tipo public.tipo_intervencion NOT NULL,
  descripcion_problema text NOT NULL,
  justificacion text,
  area_solicitante text,
  prioridad public.prioridad NOT NULL DEFAULT 'Media',
  estado public.estado_intervencion NOT NULL DEFAULT 'Solicitud',
  fecha_solicitud date NOT NULL DEFAULT CURRENT_DATE,
  fecha_inicio date,
  fecha_fin date,
  contratista_responsable text,
  descripcion_trabajos text,
  materiales_utilizados text,
  costo numeric(18,2),
  foto_antes_url text,
  foto_durante_url text,
  foto_despues_url text,
  observaciones text,
  responsable_seguimiento text,
  novedad_id uuid,
  solicitado_por uuid REFERENCES public.profiles(id),
  aprobado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intervenciones ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- BITÁCORAS DE INTERVENCIÓN
-- ==========================================
CREATE TABLE public.bitacoras_intervencion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencion_id uuid NOT NULL REFERENCES public.intervenciones(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL DEFAULT now(),
  responsable text NOT NULL,
  descripcion text NOT NULL,
  registrado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bitacoras_intervencion ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ACTAS DE RECIBO DE OBRA
-- ==========================================
CREATE TABLE public.actas_recibo_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencion_id uuid NOT NULL REFERENCES public.intervenciones(id) ON DELETE CASCADE,
  verificacion_especificaciones boolean NOT NULL DEFAULT false,
  estado_final text NOT NULL,
  observaciones text,
  firma_responsable1 text,
  firma_responsable2 text,
  fecha_acta date NOT NULL DEFAULT CURRENT_DATE,
  registrado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.actas_recibo_obra ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- NO CONFORMIDADES
-- ==========================================
CREATE TABLE public.no_conformidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencion_id uuid NOT NULL REFERENCES public.intervenciones(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  evidencia_foto_url text,
  accion_correctiva text,
  plazo date,
  responsable text,
  cerrado boolean NOT NULL DEFAULT false,
  fecha_cierre date,
  registrado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.no_conformidades ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- DOCUMENTOS ESPACIOS
-- ==========================================
CREATE TABLE public.documentos_espacios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id uuid NOT NULL REFERENCES public.espacios_fisicos(id) ON DELETE CASCADE,
  nombre_archivo text NOT NULL,
  tipo_documento text NOT NULL,
  url text NOT NULL,
  fecha_subida timestamptz NOT NULL DEFAULT now(),
  subido_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_espacios ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- NOVEDADES E INCIDENTES
-- ==========================================
CREATE TABLE public.novedades_incidentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_radicado text UNIQUE NOT NULL,
  nombre_reportante text NOT NULL,
  correo_reportante text NOT NULL,
  rol_reportante public.rol_reportante NOT NULL,
  espacio_id uuid REFERENCES public.espacios_fisicos(id),
  espacio_nombre text,
  tipo_novedad public.tipo_novedad NOT NULL,
  descripcion text NOT NULL,
  foto_url text,
  prioridad text NOT NULL DEFAULT 'Normal',
  estado public.estado_novedad NOT NULL DEFAULT 'Recibido',
  responsable_interno uuid REFERENCES public.profiles(id),
  intervencion_id uuid REFERENCES public.intervenciones(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.novedades_incidentes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SEGUIMIENTO NOVEDADES
-- ==========================================
CREATE TABLE public.seguimiento_novedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novedad_id uuid NOT NULL REFERENCES public.novedades_incidentes(id) ON DELETE CASCADE,
  estado_anterior public.estado_novedad,
  estado_nuevo public.estado_novedad NOT NULL,
  descripcion text NOT NULL,
  responsable text,
  registrado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seguimiento_novedades ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RESERVAS Y ALQUILERES
-- ==========================================
CREATE TABLE public.reservas_alquileres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_solicitud text UNIQUE NOT NULL,
  tipo public.tipo_solicitud NOT NULL DEFAULT 'Reserva',
  nombre_solicitante text NOT NULL,
  correo_solicitante text NOT NULL,
  telefono_solicitante text,
  tipo_solicitante public.tipo_solicitante NOT NULL DEFAULT 'Externo',
  institucion text,
  espacio_id uuid NOT NULL REFERENCES public.espacios_fisicos(id),
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  hora_inicio time,
  hora_fin time,
  proposito text NOT NULL,
  num_asistentes integer,
  requerimientos_especiales text,
  estado public.estado_reserva NOT NULL DEFAULT 'Recibida',
  valor_acordado numeric(15,2),
  forma_pago text,
  numero_recibo text,
  fecha_pago date,
  estado_pago public.estado_pago DEFAULT 'Pendiente',
  motivo_rechazo text,
  gestionado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservas_alquileres ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- LOGS DE AUDITORÍA
-- ==========================================
CREATE TABLE public.logs_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.profiles(id),
  usuario_nombre text,
  accion text NOT NULL,
  modulo text NOT NULL,
  entidad_id text,
  detalles jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- CATEGORIAS ACTIVOS (catalog)
-- ==========================================
CREATE TABLE public.categorias_activos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias_activos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PROVEEDORES (catalog)
-- ==========================================
CREATE TABLE public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  contacto text,
  telefono text,
  correo text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TRIGGER: Auto-sync new users to profiles
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'infraestructura'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Admins full access profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- ESPACIOS FÍSICOS - All authenticated can read, infraestructura/admin can write
CREATE POLICY "All authenticated read espacios" ON public.espacios_fisicos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can view habilitados espacios" ON public.espacios_fisicos
  FOR SELECT TO anon USING (true);

CREATE POLICY "Infraestructura admin manage espacios" ON public.espacios_fisicos
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- ACTIVOS FIJOS
CREATE POLICY "All authenticated read activos" ON public.activos_fijos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage activos" ON public.activos_fijos
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- MOVIMIENTOS
CREATE POLICY "All authenticated read movimientos" ON public.movimientos_activos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage movimientos" ON public.movimientos_activos
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- BAJAS
CREATE POLICY "All authenticated read bajas" ON public.bajas_activos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage bajas" ON public.bajas_activos
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- INTERVENCIONES
CREATE POLICY "All authenticated read intervenciones" ON public.intervenciones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage intervenciones" ON public.intervenciones
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- BITÁCORAS INTERVENCIÓN
CREATE POLICY "All authenticated read bitacoras" ON public.bitacoras_intervencion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage bitacoras" ON public.bitacoras_intervencion
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- ACTAS
CREATE POLICY "All authenticated read actas" ON public.actas_recibo_obra
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage actas" ON public.actas_recibo_obra
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- NO CONFORMIDADES
CREATE POLICY "All authenticated read noconf" ON public.no_conformidades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage noconf" ON public.no_conformidades
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- DOCUMENTOS ESPACIOS
CREATE POLICY "All authenticated read docs_espacios" ON public.documentos_espacios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage docs_espacios" ON public.documentos_espacios
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- NOVEDADES - Anyone can insert (public form), authenticated can read
CREATE POLICY "Anyone can submit novedad" ON public.novedades_incidentes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "All authenticated read novedades" ON public.novedades_incidentes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage novedades" ON public.novedades_incidentes
  FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- SEGUIMIENTO
CREATE POLICY "All authenticated read seguimiento" ON public.seguimiento_novedades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage seguimiento" ON public.seguimiento_novedades
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- RESERVAS - Anyone can insert, authenticated can read
CREATE POLICY "Anyone can submit reserva" ON public.reservas_alquileres
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public read confirmed reservas" ON public.reservas_alquileres
  FOR SELECT TO anon USING (estado IN ('Aprobada', 'Confirmada'));

CREATE POLICY "All authenticated read reservas" ON public.reservas_alquileres
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Infraestructura admin manage reservas" ON public.reservas_alquileres
  FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::public.user_role, 'infraestructura'::public.user_role));

-- LOGS - Admin only
CREATE POLICY "Admin read logs" ON public.logs_auditoria
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Authenticated insert logs" ON public.logs_auditoria
  FOR INSERT TO authenticated WITH CHECK (true);

-- CATEGORIAS - Public read, admin manage
CREATE POLICY "Anyone read categorias" ON public.categorias_activos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage categorias" ON public.categorias_activos
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- PROVEEDORES
CREATE POLICY "Authenticated read proveedores" ON public.proveedores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage proveedores" ON public.proveedores
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- ==========================================
-- PUBLIC VIEW
-- ==========================================
CREATE VIEW public.public_profiles AS
  SELECT id, nombre, role FROM profiles WHERE activo = true;

-- ==========================================
-- REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.novedades_incidentes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas_alquileres;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intervenciones;
