-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";


--
-- Name: EXTENSION "pg_cron"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bloque_espacio; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'bloque_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."bloque_espacio" AS ENUM (
    'Bloque A',
    'Bloque B',
    'Bloque C',
    'Bloque D',
    'N/A'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estado_activo; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'estado_activo'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."estado_activo" AS ENUM (
    'En funcionamiento',
    'Daño parcial',
    'Dado de baja',
    'En reparación'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estado_espacio; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'estado_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."estado_espacio" AS ENUM (
    'Bueno',
    'Regular',
    'Requiere intervención'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estado_intervencion; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'estado_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."estado_intervencion" AS ENUM (
    'Solicitud',
    'En revisión',
    'Aprobada',
    'En ejecución',
    'Finalizado',
    'Rechazada'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estado_novedad; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'estado_novedad'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."estado_novedad" AS ENUM (
    'Recibido',
    'En revisión',
    'En gestión',
    'Resuelto',
    'Cerrado'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estado_pago; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'estado_pago'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."estado_pago" AS ENUM (
    'Pendiente',
    'Pagado'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estado_reserva; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'estado_reserva'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."estado_reserva" AS ENUM (
    'Recibida',
    'En revisión',
    'Aprobada',
    'Rechazada',
    'Confirmada',
    'Cancelada'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: motivo_baja; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'motivo_baja'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."motivo_baja" AS ENUM (
    'Deterioro',
    'Robo',
    'Obsolescencia',
    'Donación',
    'Otro'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: prioridad; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'prioridad'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."prioridad" AS ENUM (
    'Alta',
    'Media',
    'Baja'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: rol_reportante; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'rol_reportante'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."rol_reportante" AS ENUM (
    'Estudiante',
    'Docente',
    'Administrativo',
    'Visitante'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: sede_espacio; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'sede_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."sede_espacio" AS ENUM (
    'Sede Principal',
    'Sede Secundaria',
    'Sede Rural'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipo_espacio; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'tipo_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."tipo_espacio" AS ENUM (
    'AUL',
    'LAB',
    'ADM',
    'BAÑ',
    'BOD',
    'AUD',
    'SAL',
    'PAR',
    'CUL',
    'HOT'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipo_intervencion; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'tipo_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."tipo_intervencion" AS ENUM (
    'Mantenimiento preventivo',
    'Mantenimiento correctivo',
    'Remodelación',
    'Adecuación',
    'Construcción nueva',
    'Modificación eléctrica',
    'Modificación hidráulica',
    'Reparación de emergencia'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipo_novedad; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'tipo_novedad'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."tipo_novedad" AS ENUM (
    'Daño en equipamiento',
    'Gotera/filtración de agua',
    'Daño eléctrico',
    'Daño en mobiliario',
    'Problema de seguridad',
    'Aseo e higiene',
    'Otro'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipo_solicitante; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'tipo_solicitante'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."tipo_solicitante" AS ENUM (
    'Interno',
    'Externo'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipo_solicitud; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'tipo_solicitud'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."tipo_solicitud" AS ENUM (
    'Reserva',
    'Alquiler'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'infraestructura',
    'rectoria',
    'responsable'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: get_user_role("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."get_user_role"("uid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


--
-- Name: monitor_get_active_connections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_active_connections"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'active_count', COUNT(*) FILTER (WHERE state = 'active'),
    'idle_count',   COUNT(*) FILTER (WHERE state = 'idle'),
    'total_count',  COUNT(*)
  ) FROM pg_stat_activity WHERE datname = current_database();
$$;


--
-- Name: monitor_get_auth_users_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_auth_users_count"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'total_users',       COUNT(*),
    'confirmed_users',   COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
    'unconfirmed_users', COUNT(*) FILTER (WHERE email_confirmed_at IS NULL)
  ) FROM auth.users;
$$;


--
-- Name: monitor_get_buckets(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_buckets"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(json_agg(json_build_object('name', name, 'public', public)), '[]'::json)
  FROM storage.buckets;
$$;


--
-- Name: monitor_get_db_size(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_db_size"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'size_bytes', pg_database_size(current_database()),
    'size_pretty', pg_size_pretty(pg_database_size(current_database()))
  );
$$;


--
-- Name: monitor_get_storage_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_storage_stats"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'total_files',       COUNT(*),
    'total_size_bytes',  COALESCE(SUM((metadata->>'size')::bigint), 0),
    'total_size_pretty', pg_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0))
  ) FROM storage.objects WHERE bucket_id IS NOT NULL;
$$;


--
-- Name: monitor_get_table_sizes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_table_sizes"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_agg(t) FROM (
    SELECT
      schemaname, tablename,
      pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) AS size_bytes,
      pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS size_pretty,
      pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) AS data_size_bytes,
      pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS data_size_pretty
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog','information_schema','pg_toast')
    ORDER BY size_bytes DESC LIMIT 10
  ) t;
$$;


--
-- Name: set_auto_foto_principal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."set_auto_foto_principal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Si se inserta una nueva foto
  IF TG_OP = 'INSERT' THEN
    UPDATE espacios_fisicos
    SET foto_principal_url = NEW.url,
        fecha_ultima_actualizacion = NOW()
    WHERE id = NEW.espacio_id
      AND (foto_principal_url IS NULL OR foto_principal_url = '');
  END IF;

  -- Si se elimina una foto y era la foto principal, asignar otra
  IF TG_OP = 'DELETE' THEN
    UPDATE espacios_fisicos ef
    SET foto_principal_url = (
      SELECT url FROM fotos_espacios
      WHERE espacio_id = OLD.espacio_id AND id != OLD.id
      ORDER BY orden ASC, created_at ASC
      LIMIT 1
    ),
    fecha_ultima_actualizacion = NOW()
    WHERE id = OLD.espacio_id AND foto_principal_url = OLD.url;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: actas_recibo_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."actas_recibo_obra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intervencion_id" "uuid" NOT NULL,
    "verificacion_especificaciones" boolean DEFAULT false NOT NULL,
    "estado_final" "text" NOT NULL,
    "observaciones" "text",
    "firma_responsable1" "text",
    "firma_responsable2" "text",
    "fecha_acta" "date" DEFAULT CURRENT_DATE NOT NULL,
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: activos_fijos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."activos_fijos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "valor" numeric(18,2) DEFAULT 0 NOT NULL,
    "fecha_adquisicion" "date",
    "factura" "text",
    "iva" numeric(5,2) DEFAULT 0,
    "depreciable" boolean DEFAULT false NOT NULL,
    "tiempo_depreciacion" integer,
    "estado" "public"."estado_activo" DEFAULT 'En funcionamiento'::"public"."estado_activo" NOT NULL,
    "espacio_id" "uuid",
    "categoria" "text" NOT NULL,
    "responsable" "text",
    "proveedor" "text",
    "documento_pdf_url" "text",
    "foto_url" "text",
    "observaciones" "text",
    "dado_de_baja" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: asignaciones_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."asignaciones_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "espacio_id" "uuid" NOT NULL,
    "responsable_id" "uuid" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "fecha_asignacion" "date" DEFAULT CURRENT_DATE NOT NULL,
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: bajas_activos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."bajas_activos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activo_id" "uuid" NOT NULL,
    "motivo" "public"."motivo_baja" NOT NULL,
    "fecha_baja" "date" DEFAULT CURRENT_DATE NOT NULL,
    "descripcion" "text",
    "acta_pdf_url" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: bitacoras_intervencion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."bitacoras_intervencion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intervencion_id" "uuid" NOT NULL,
    "fecha" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responsable" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: bloques_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."bloques_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo" "text"
);


--
-- Name: categorias_activos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."categorias_activos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: documentos_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."documentos_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "espacio_id" "uuid" NOT NULL,
    "nombre_archivo" "text" NOT NULL,
    "tipo_documento" "text" NOT NULL,
    "url" "text" NOT NULL,
    "fecha_subida" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subido_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: espacios_fisicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."espacios_fisicos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "sede" "public"."sede_espacio" DEFAULT 'Sede Principal'::"public"."sede_espacio" NOT NULL,
    "bloque" "public"."bloque_espacio" DEFAULT 'Bloque A'::"public"."bloque_espacio" NOT NULL,
    "piso" "text",
    "tipo" "text" NOT NULL,
    "uso_actual" "text",
    "area_m2" numeric(10,2),
    "capacidad_personas" integer,
    "capacidad_equipos" integer,
    "instalaciones_electricas" boolean DEFAULT false,
    "instalaciones_hidraulicas" boolean DEFAULT false,
    "instalaciones_sanitarias" boolean DEFAULT false,
    "estado" "public"."estado_espacio" DEFAULT 'Bueno'::"public"."estado_espacio" NOT NULL,
    "fotos_urls" "text"[] DEFAULT '{}'::"text"[],
    "observaciones" "text",
    "habilitado_reserva" boolean DEFAULT false NOT NULL,
    "tarifa_alquiler" numeric(15,2),
    "descripcion_espacio" "text",
    "foto_principal_url" "text",
    "fecha_ultima_actualizacion" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "largo_m" numeric(8,2) DEFAULT NULL::numeric,
    "ancho_m" numeric(8,2) DEFAULT NULL::numeric,
    "instalaciones_gas" boolean DEFAULT false NOT NULL,
    "instalaciones_internet_telefonia" boolean DEFAULT false NOT NULL,
    "instalaciones_seguridad_control" boolean DEFAULT false NOT NULL,
    "instalaciones_climatizacion" boolean DEFAULT false NOT NULL,
    "instalaciones_domotica" boolean DEFAULT false NOT NULL,
    "instalaciones_pci" boolean DEFAULT false NOT NULL,
    "piso_nombre" "text"
);


--
-- Name: estados_activos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."estados_activos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: estados_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."estados_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: fotos_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."fotos_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "espacio_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "descripcion" "text",
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: intervenciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."intervenciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "espacio_id" "uuid" NOT NULL,
    "tipo" "public"."tipo_intervencion" NOT NULL,
    "descripcion_problema" "text" NOT NULL,
    "justificacion" "text",
    "area_solicitante" "text",
    "prioridad" "public"."prioridad" DEFAULT 'Media'::"public"."prioridad" NOT NULL,
    "estado" "public"."estado_intervencion" DEFAULT 'Solicitud'::"public"."estado_intervencion" NOT NULL,
    "fecha_solicitud" "date" DEFAULT CURRENT_DATE NOT NULL,
    "fecha_inicio" "date",
    "fecha_fin" "date",
    "contratista_responsable" "text",
    "descripcion_trabajos" "text",
    "materiales_utilizados" "text",
    "costo" numeric(18,2),
    "foto_antes_url" "text",
    "foto_durante_url" "text",
    "foto_despues_url" "text",
    "observaciones" "text",
    "responsable_seguimiento" "text",
    "novedad_id" "uuid",
    "solicitado_por" "uuid",
    "aprobado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "evidencia_foto_url" "text"
);


--
-- Name: logs_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."logs_auditoria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid",
    "usuario_nombre" "text",
    "accion" "text" NOT NULL,
    "modulo" "text" NOT NULL,
    "entidad_id" "text",
    "detalles" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: motivos_movimiento_espacio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."motivos_movimiento_espacio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "text" NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "motivos_movimiento_espacio_tipo_check" CHECK (("tipo" = ANY (ARRAY['recibo'::"text", 'entrega'::"text"])))
);


--
-- Name: movimientos_activos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."movimientos_activos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activo_id" "uuid" NOT NULL,
    "tipo_movimiento" "text" NOT NULL,
    "espacio_origen_id" "uuid",
    "espacio_destino_id" "uuid",
    "responsable_anterior" "text",
    "responsable_nuevo" "text",
    "estado_anterior" "text",
    "estado_nuevo" "text",
    "fecha_movimiento" "date" DEFAULT CURRENT_DATE NOT NULL,
    "motivo" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "aprobado_por" "text",
    "observaciones" "text"
);


--
-- Name: movimientos_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."movimientos_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "espacio_id" "uuid" NOT NULL,
    "tipo_movimiento" "text" NOT NULL,
    "persona_recibe_id" "uuid",
    "persona_recibe_nombre" "text",
    "persona_entrega_id" "uuid",
    "persona_entrega_nombre" "text" DEFAULT 'COTECNOVA'::"text" NOT NULL,
    "fecha_movimiento" "date" DEFAULT CURRENT_DATE NOT NULL,
    "fecha_entrega_acordada" "date",
    "motivo_codigo" "text" NOT NULL,
    "motivo_descripcion" "text",
    "observaciones" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "movimientos_espacios_tipo_movimiento_check" CHECK (("tipo_movimiento" = ANY (ARRAY['recibo'::"text", 'entrega'::"text"])))
);


--
-- Name: no_conformidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."no_conformidades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intervencion_id" "uuid" NOT NULL,
    "descripcion" "text" NOT NULL,
    "evidencia_foto_url" "text",
    "accion_correctiva" "text",
    "plazo" "date",
    "responsable" "text",
    "cerrado" boolean DEFAULT false NOT NULL,
    "fecha_cierre" "date",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: novedades_incidentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."novedades_incidentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_radicado" "text" NOT NULL,
    "nombre_reportante" "text" NOT NULL,
    "correo_reportante" "text" NOT NULL,
    "rol_reportante" "public"."rol_reportante" NOT NULL,
    "espacio_id" "uuid",
    "espacio_nombre" "text",
    "tipo_novedad" "public"."tipo_novedad" NOT NULL,
    "descripcion" "text" NOT NULL,
    "foto_url" "text",
    "prioridad" "text" DEFAULT 'Normal'::"text" NOT NULL,
    "estado" "public"."estado_novedad" DEFAULT 'Recibido'::"public"."estado_novedad" NOT NULL,
    "responsable_interno" "uuid",
    "intervencion_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "foto_evidencia_url" "text",
    "telefono_reportante" "text"
);


--
-- Name: pisos_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."pisos_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "nombre" "text",
    "cargo" "text",
    "role" "public"."user_role" DEFAULT 'infraestructura'::"public"."user_role" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "must_change_password" boolean DEFAULT false NOT NULL
);


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."proveedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "contacto" "text",
    "telefono" "text",
    "correo" "text",
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: proveedores_activos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."proveedores_activos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW "public"."public_profiles" AS
 SELECT "id",
    "nombre",
    "role"
   FROM "public"."profiles"
  WHERE ("activo" = true);


--
-- Name: reservas_alquileres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."reservas_alquileres" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_solicitud" "text" NOT NULL,
    "tipo" "public"."tipo_solicitud" DEFAULT 'Reserva'::"public"."tipo_solicitud" NOT NULL,
    "nombre_solicitante" "text" NOT NULL,
    "correo_solicitante" "text" NOT NULL,
    "telefono_solicitante" "text",
    "tipo_solicitante" "public"."tipo_solicitante" DEFAULT 'Externo'::"public"."tipo_solicitante" NOT NULL,
    "institucion" "text",
    "espacio_id" "uuid" NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date" NOT NULL,
    "hora_inicio" time without time zone,
    "hora_fin" time without time zone,
    "proposito" "text" NOT NULL,
    "num_asistentes" integer,
    "requerimientos_especiales" "text",
    "estado" "public"."estado_reserva" DEFAULT 'Recibida'::"public"."estado_reserva" NOT NULL,
    "valor_acordado" numeric(15,2),
    "forma_pago" "text",
    "numero_recibo" "text",
    "fecha_pago" "date",
    "estado_pago" "public"."estado_pago" DEFAULT 'Pendiente'::"public"."estado_pago",
    "motivo_rechazo" "text",
    "gestionado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: responsables_activos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."responsables_activos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: sedes_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."sedes_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo" "text"
);


--
-- Name: seguimiento_novedades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."seguimiento_novedades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "novedad_id" "uuid" NOT NULL,
    "estado_anterior" "public"."estado_novedad",
    "estado_nuevo" "public"."estado_novedad" NOT NULL,
    "descripcion" "text" NOT NULL,
    "responsable" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: tipos_espacios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."tipos_espacios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: actas_recibo_obra actas_recibo_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'actas_recibo_obra_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'actas_recibo_obra'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."actas_recibo_obra"
    ADD CONSTRAINT "actas_recibo_obra_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos activos_fijos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'activos_fijos_codigo_key'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."activos_fijos"
    ADD CONSTRAINT "activos_fijos_codigo_key" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos activos_fijos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'activos_fijos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."activos_fijos"
    ADD CONSTRAINT "activos_fijos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asignaciones_espacios asignaciones_espacios_espacio_id_responsable_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asignaciones_espacios_espacio_id_responsable_id_key'
      AND n.nspname = 'public'
      AND c.relname = 'asignaciones_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asignaciones_espacios"
    ADD CONSTRAINT "asignaciones_espacios_espacio_id_responsable_id_key" UNIQUE ("espacio_id", "responsable_id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asignaciones_espacios asignaciones_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asignaciones_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'asignaciones_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asignaciones_espacios"
    ADD CONSTRAINT "asignaciones_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bajas_activos bajas_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bajas_activos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'bajas_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bajas_activos"
    ADD CONSTRAINT "bajas_activos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bitacoras_intervencion bitacoras_intervencion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bitacoras_intervencion_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'bitacoras_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bitacoras_intervencion"
    ADD CONSTRAINT "bitacoras_intervencion_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bloques_espacios bloques_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bloques_codigo_unique'
      AND n.nspname = 'public'
      AND c.relname = 'bloques_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bloques_espacios"
    ADD CONSTRAINT "bloques_codigo_unique" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bloques_espacios bloques_espacios_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bloques_espacios_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'bloques_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bloques_espacios"
    ADD CONSTRAINT "bloques_espacios_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bloques_espacios bloques_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bloques_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'bloques_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bloques_espacios"
    ADD CONSTRAINT "bloques_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: categorias_activos categorias_activos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'categorias_activos_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'categorias_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."categorias_activos"
    ADD CONSTRAINT "categorias_activos_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: categorias_activos categorias_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'categorias_activos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'categorias_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."categorias_activos"
    ADD CONSTRAINT "categorias_activos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios documentos_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'documentos_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."documentos_espacios"
    ADD CONSTRAINT "documentos_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos espacios_fisicos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'espacios_fisicos_codigo_key'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."espacios_fisicos"
    ADD CONSTRAINT "espacios_fisicos_codigo_key" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos espacios_fisicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'espacios_fisicos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."espacios_fisicos"
    ADD CONSTRAINT "espacios_fisicos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_activos estados_activos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'estados_activos_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'estados_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."estados_activos"
    ADD CONSTRAINT "estados_activos_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_activos estados_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'estados_activos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'estados_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."estados_activos"
    ADD CONSTRAINT "estados_activos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_espacios estados_espacios_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'estados_espacios_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'estados_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."estados_espacios"
    ADD CONSTRAINT "estados_espacios_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_espacios estados_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'estados_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'estados_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."estados_espacios"
    ADD CONSTRAINT "estados_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fotos_espacios fotos_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'fotos_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'fotos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."fotos_espacios"
    ADD CONSTRAINT "fotos_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones intervenciones_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'intervenciones_codigo_key'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."intervenciones"
    ADD CONSTRAINT "intervenciones_codigo_key" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones intervenciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'intervenciones_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."intervenciones"
    ADD CONSTRAINT "intervenciones_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: logs_auditoria logs_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'logs_auditoria_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'logs_auditoria'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."logs_auditoria"
    ADD CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: motivos_movimiento_espacio motivos_movimiento_espacio_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'motivos_movimiento_espacio_codigo_key'
      AND n.nspname = 'public'
      AND c.relname = 'motivos_movimiento_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."motivos_movimiento_espacio"
    ADD CONSTRAINT "motivos_movimiento_espacio_codigo_key" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: motivos_movimiento_espacio motivos_movimiento_espacio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'motivos_movimiento_espacio_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'motivos_movimiento_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."motivos_movimiento_espacio"
    ADD CONSTRAINT "motivos_movimiento_espacio_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos movimientos_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_activos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_activos"
    ADD CONSTRAINT "movimientos_activos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios movimientos_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_espacios"
    ADD CONSTRAINT "movimientos_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: no_conformidades no_conformidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'no_conformidades_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'no_conformidades'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."no_conformidades"
    ADD CONSTRAINT "no_conformidades_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes novedades_incidentes_numero_radicado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'novedades_incidentes_numero_radicado_key'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."novedades_incidentes"
    ADD CONSTRAINT "novedades_incidentes_numero_radicado_key" UNIQUE ("numero_radicado");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes novedades_incidentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'novedades_incidentes_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."novedades_incidentes"
    ADD CONSTRAINT "novedades_incidentes_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: pisos_espacios pisos_espacios_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'pisos_espacios_codigo_key'
      AND n.nspname = 'public'
      AND c.relname = 'pisos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."pisos_espacios"
    ADD CONSTRAINT "pisos_espacios_codigo_key" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: pisos_espacios pisos_espacios_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'pisos_espacios_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'pisos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."pisos_espacios"
    ADD CONSTRAINT "pisos_espacios_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: pisos_espacios pisos_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'pisos_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'pisos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."pisos_espacios"
    ADD CONSTRAINT "pisos_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'profiles_email_key'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'profiles_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores_activos proveedores_activos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'proveedores_activos_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."proveedores_activos"
    ADD CONSTRAINT "proveedores_activos_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores_activos proveedores_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'proveedores_activos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."proveedores_activos"
    ADD CONSTRAINT "proveedores_activos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'proveedores_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."proveedores"
    ADD CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres reservas_alquileres_numero_solicitud_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'reservas_alquileres_numero_solicitud_key'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."reservas_alquileres"
    ADD CONSTRAINT "reservas_alquileres_numero_solicitud_key" UNIQUE ("numero_solicitud");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres reservas_alquileres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'reservas_alquileres_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."reservas_alquileres"
    ADD CONSTRAINT "reservas_alquileres_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: responsables_activos responsables_activos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'responsables_activos_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'responsables_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."responsables_activos"
    ADD CONSTRAINT "responsables_activos_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: responsables_activos responsables_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'responsables_activos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'responsables_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."responsables_activos"
    ADD CONSTRAINT "responsables_activos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: sedes_espacios sedes_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'sedes_codigo_unique'
      AND n.nspname = 'public'
      AND c.relname = 'sedes_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."sedes_espacios"
    ADD CONSTRAINT "sedes_codigo_unique" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: sedes_espacios sedes_espacios_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'sedes_espacios_nombre_key'
      AND n.nspname = 'public'
      AND c.relname = 'sedes_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."sedes_espacios"
    ADD CONSTRAINT "sedes_espacios_nombre_key" UNIQUE ("nombre");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: sedes_espacios sedes_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'sedes_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'sedes_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."sedes_espacios"
    ADD CONSTRAINT "sedes_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: seguimiento_novedades seguimiento_novedades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'seguimiento_novedades_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'seguimiento_novedades'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."seguimiento_novedades"
    ADD CONSTRAINT "seguimiento_novedades_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipos_espacios tipos_espacios_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tipos_espacios_codigo_key'
      AND n.nspname = 'public'
      AND c.relname = 'tipos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tipos_espacios"
    ADD CONSTRAINT "tipos_espacios_codigo_key" UNIQUE ("codigo");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipos_espacios tipos_espacios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tipos_espacios_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'tipos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tipos_espacios"
    ADD CONSTRAINT "tipos_espacios_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fotos_espacios_espacio_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "fotos_espacios_espacio_idx" ON "public"."fotos_espacios" USING "btree" ("espacio_id");


--
-- Name: idx_documentos_espacio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_documentos_espacio" ON "public"."documentos_espacios" USING "btree" ("espacio_id");


--
-- Name: fotos_espacios auto_foto_principal_trigger_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "auto_foto_principal_trigger_delete" AFTER DELETE ON "public"."fotos_espacios" FOR EACH ROW EXECUTE FUNCTION "public"."set_auto_foto_principal"();


--
-- Name: fotos_espacios auto_foto_principal_trigger_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "auto_foto_principal_trigger_insert" AFTER INSERT ON "public"."fotos_espacios" FOR EACH ROW EXECUTE FUNCTION "public"."set_auto_foto_principal"();


--
-- Name: actas_recibo_obra actas_recibo_obra_intervencion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'actas_recibo_obra_intervencion_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'actas_recibo_obra'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."actas_recibo_obra"
    ADD CONSTRAINT "actas_recibo_obra_intervencion_id_fkey" FOREIGN KEY ("intervencion_id") REFERENCES "public"."intervenciones"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: actas_recibo_obra actas_recibo_obra_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'actas_recibo_obra_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'actas_recibo_obra'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."actas_recibo_obra"
    ADD CONSTRAINT "actas_recibo_obra_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos activos_fijos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'activos_fijos_created_by_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."activos_fijos"
    ADD CONSTRAINT "activos_fijos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos activos_fijos_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'activos_fijos_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."activos_fijos"
    ADD CONSTRAINT "activos_fijos_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asignaciones_espacios asignaciones_espacios_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asignaciones_espacios_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'asignaciones_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asignaciones_espacios"
    ADD CONSTRAINT "asignaciones_espacios_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asignaciones_espacios asignaciones_espacios_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asignaciones_espacios_responsable_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'asignaciones_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asignaciones_espacios"
    ADD CONSTRAINT "asignaciones_espacios_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bajas_activos bajas_activos_activo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bajas_activos_activo_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'bajas_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bajas_activos"
    ADD CONSTRAINT "bajas_activos_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "public"."activos_fijos"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bajas_activos bajas_activos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bajas_activos_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'bajas_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bajas_activos"
    ADD CONSTRAINT "bajas_activos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bitacoras_intervencion bitacoras_intervencion_intervencion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bitacoras_intervencion_intervencion_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'bitacoras_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bitacoras_intervencion"
    ADD CONSTRAINT "bitacoras_intervencion_intervencion_id_fkey" FOREIGN KEY ("intervencion_id") REFERENCES "public"."intervenciones"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bitacoras_intervencion bitacoras_intervencion_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bitacoras_intervencion_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'bitacoras_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bitacoras_intervencion"
    ADD CONSTRAINT "bitacoras_intervencion_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios documentos_espacios_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'documentos_espacios_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."documentos_espacios"
    ADD CONSTRAINT "documentos_espacios_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios documentos_espacios_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'documentos_espacios_subido_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."documentos_espacios"
    ADD CONSTRAINT "documentos_espacios_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos espacios_fisicos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'espacios_fisicos_created_by_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."espacios_fisicos"
    ADD CONSTRAINT "espacios_fisicos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fotos_espacios fotos_espacios_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'fotos_espacios_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'fotos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."fotos_espacios"
    ADD CONSTRAINT "fotos_espacios_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones intervenciones_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'intervenciones_aprobado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."intervenciones"
    ADD CONSTRAINT "intervenciones_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones intervenciones_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'intervenciones_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."intervenciones"
    ADD CONSTRAINT "intervenciones_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones intervenciones_solicitado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'intervenciones_solicitado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."intervenciones"
    ADD CONSTRAINT "intervenciones_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: logs_auditoria logs_auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'logs_auditoria_usuario_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'logs_auditoria'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."logs_auditoria"
    ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos movimientos_activos_activo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_activos_activo_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_activos"
    ADD CONSTRAINT "movimientos_activos_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "public"."activos_fijos"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos movimientos_activos_espacio_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_activos_espacio_destino_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_activos"
    ADD CONSTRAINT "movimientos_activos_espacio_destino_id_fkey" FOREIGN KEY ("espacio_destino_id") REFERENCES "public"."espacios_fisicos"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos movimientos_activos_espacio_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_activos_espacio_origen_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_activos"
    ADD CONSTRAINT "movimientos_activos_espacio_origen_id_fkey" FOREIGN KEY ("espacio_origen_id") REFERENCES "public"."espacios_fisicos"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos movimientos_activos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_activos_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_activos"
    ADD CONSTRAINT "movimientos_activos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios movimientos_espacios_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_espacios_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_espacios"
    ADD CONSTRAINT "movimientos_espacios_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios movimientos_espacios_persona_entrega_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_espacios_persona_entrega_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_espacios"
    ADD CONSTRAINT "movimientos_espacios_persona_entrega_id_fkey" FOREIGN KEY ("persona_entrega_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios movimientos_espacios_persona_recibe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_espacios_persona_recibe_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_espacios"
    ADD CONSTRAINT "movimientos_espacios_persona_recibe_id_fkey" FOREIGN KEY ("persona_recibe_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios movimientos_espacios_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'movimientos_espacios_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."movimientos_espacios"
    ADD CONSTRAINT "movimientos_espacios_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: no_conformidades no_conformidades_intervencion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'no_conformidades_intervencion_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'no_conformidades'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."no_conformidades"
    ADD CONSTRAINT "no_conformidades_intervencion_id_fkey" FOREIGN KEY ("intervencion_id") REFERENCES "public"."intervenciones"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: no_conformidades no_conformidades_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'no_conformidades_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'no_conformidades'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."no_conformidades"
    ADD CONSTRAINT "no_conformidades_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes novedades_incidentes_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'novedades_incidentes_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."novedades_incidentes"
    ADD CONSTRAINT "novedades_incidentes_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes novedades_incidentes_intervencion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'novedades_incidentes_intervencion_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."novedades_incidentes"
    ADD CONSTRAINT "novedades_incidentes_intervencion_id_fkey" FOREIGN KEY ("intervencion_id") REFERENCES "public"."intervenciones"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes novedades_incidentes_responsable_interno_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'novedades_incidentes_responsable_interno_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."novedades_incidentes"
    ADD CONSTRAINT "novedades_incidentes_responsable_interno_fkey" FOREIGN KEY ("responsable_interno") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'profiles_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres reservas_alquileres_espacio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'reservas_alquileres_espacio_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."reservas_alquileres"
    ADD CONSTRAINT "reservas_alquileres_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios_fisicos"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres reservas_alquileres_gestionado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'reservas_alquileres_gestionado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."reservas_alquileres"
    ADD CONSTRAINT "reservas_alquileres_gestionado_por_fkey" FOREIGN KEY ("gestionado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: seguimiento_novedades seguimiento_novedades_novedad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'seguimiento_novedades_novedad_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'seguimiento_novedades'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."seguimiento_novedades"
    ADD CONSTRAINT "seguimiento_novedades_novedad_id_fkey" FOREIGN KEY ("novedad_id") REFERENCES "public"."novedades_incidentes"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: seguimiento_novedades seguimiento_novedades_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'seguimiento_novedades_registrado_por_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'seguimiento_novedades'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."seguimiento_novedades"
    ADD CONSTRAINT "seguimiento_novedades_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: categorias_activos Admin manage categorias; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admin manage categorias'
      AND n.nspname = 'public'
      AND c.relname = 'categorias_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admin manage categorias" ON "public"."categorias_activos" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores Admin manage proveedores; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admin manage proveedores'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admin manage proveedores" ON "public"."proveedores" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: logs_auditoria Admin read logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admin read logs'
      AND n.nspname = 'public'
      AND c.relname = 'logs_auditoria'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admin read logs" ON "public"."logs_auditoria" FOR SELECT TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Admin rectoria delete profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admin rectoria delete profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admin rectoria delete profiles" ON "public"."profiles" FOR DELETE USING ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rectoria'::"text"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Admin rectoria full access profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admin rectoria full access profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admin rectoria full access profiles" ON "public"."profiles" USING ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rectoria'::"text"]))) WITH CHECK ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rectoria'::"text"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Admins update others profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins update others profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins update others profiles" ON "public"."profiles" FOR UPDATE USING ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rectoria'::"text"]))) WITH CHECK ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rectoria'::"text"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: actas_recibo_obra All authenticated read actas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read actas'
      AND n.nspname = 'public'
      AND c.relname = 'actas_recibo_obra'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read actas" ON "public"."actas_recibo_obra" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos All authenticated read activos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read activos'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read activos" ON "public"."activos_fijos" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bajas_activos All authenticated read bajas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read bajas'
      AND n.nspname = 'public'
      AND c.relname = 'bajas_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read bajas" ON "public"."bajas_activos" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bitacoras_intervencion All authenticated read bitacoras; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read bitacoras'
      AND n.nspname = 'public'
      AND c.relname = 'bitacoras_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read bitacoras" ON "public"."bitacoras_intervencion" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios All authenticated read docs_espacios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read docs_espacios'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read docs_espacios" ON "public"."documentos_espacios" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos All authenticated read espacios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read espacios'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read espacios" ON "public"."espacios_fisicos" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones All authenticated read intervenciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read intervenciones'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read intervenciones" ON "public"."intervenciones" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos All authenticated read movimientos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read movimientos'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read movimientos" ON "public"."movimientos_activos" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: no_conformidades All authenticated read noconf; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read noconf'
      AND n.nspname = 'public'
      AND c.relname = 'no_conformidades'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read noconf" ON "public"."no_conformidades" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes All authenticated read novedades; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read novedades'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read novedades" ON "public"."novedades_incidentes" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres All authenticated read reservas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read reservas'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read reservas" ON "public"."reservas_alquileres" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: seguimiento_novedades All authenticated read seguimiento; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'All authenticated read seguimiento'
      AND n.nspname = 'public'
      AND c.relname = 'seguimiento_novedades'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "All authenticated read seguimiento" ON "public"."seguimiento_novedades" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes Anyone can submit novedad; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anyone can submit novedad'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anyone can submit novedad" ON "public"."novedades_incidentes" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres Anyone can submit reserva; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anyone can submit reserva'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anyone can submit reserva" ON "public"."reservas_alquileres" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: categorias_activos Anyone read categorias; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anyone read categorias'
      AND n.nspname = 'public'
      AND c.relname = 'categorias_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anyone read categorias" ON "public"."categorias_activos" FOR SELECT TO "authenticated", "anon" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: logs_auditoria Authenticated insert logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Authenticated insert logs'
      AND n.nspname = 'public'
      AND c.relname = 'logs_auditoria'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Authenticated insert logs" ON "public"."logs_auditoria" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores Authenticated read proveedores; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Authenticated read proveedores'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Authenticated read proveedores" ON "public"."proveedores" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bloques_espacios Escritura autenticados; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados'
      AND n.nspname = 'public'
      AND c.relname = 'bloques_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados" ON "public"."bloques_espacios" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_activos Escritura autenticados; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados'
      AND n.nspname = 'public'
      AND c.relname = 'estados_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados" ON "public"."estados_activos" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_espacios Escritura autenticados; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados'
      AND n.nspname = 'public'
      AND c.relname = 'estados_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados" ON "public"."estados_espacios" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: sedes_espacios Escritura autenticados; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados'
      AND n.nspname = 'public'
      AND c.relname = 'sedes_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados" ON "public"."sedes_espacios" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipos_espacios Escritura autenticados; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados'
      AND n.nspname = 'public'
      AND c.relname = 'tipos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados" ON "public"."tipos_espacios" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: pisos_espacios Escritura autenticados pisos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados pisos'
      AND n.nspname = 'public'
      AND c.relname = 'pisos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados pisos" ON "public"."pisos_espacios" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores_activos Escritura autenticados proveedores; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados proveedores'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados proveedores" ON "public"."proveedores_activos" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: responsables_activos Escritura autenticados responsables; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Escritura autenticados responsables'
      AND n.nspname = 'public'
      AND c.relname = 'responsables_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Escritura autenticados responsables" ON "public"."responsables_activos" USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: actas_recibo_obra Infraestructura admin manage actas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage actas'
      AND n.nspname = 'public'
      AND c.relname = 'actas_recibo_obra'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage actas" ON "public"."actas_recibo_obra" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos Infraestructura admin manage activos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage activos'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage activos" ON "public"."activos_fijos" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bajas_activos Infraestructura admin manage bajas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage bajas'
      AND n.nspname = 'public'
      AND c.relname = 'bajas_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage bajas" ON "public"."bajas_activos" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bitacoras_intervencion Infraestructura admin manage bitacoras; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage bitacoras'
      AND n.nspname = 'public'
      AND c.relname = 'bitacoras_intervencion'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage bitacoras" ON "public"."bitacoras_intervencion" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios Infraestructura admin manage docs_espacios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage docs_espacios'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage docs_espacios" ON "public"."documentos_espacios" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos Infraestructura admin manage espacios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage espacios'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage espacios" ON "public"."espacios_fisicos" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones Infraestructura admin manage intervenciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage intervenciones'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage intervenciones" ON "public"."intervenciones" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_activos Infraestructura admin manage movimientos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage movimientos'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage movimientos" ON "public"."movimientos_activos" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: no_conformidades Infraestructura admin manage noconf; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage noconf'
      AND n.nspname = 'public'
      AND c.relname = 'no_conformidades'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage noconf" ON "public"."no_conformidades" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes Infraestructura admin manage novedades; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage novedades'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage novedades" ON "public"."novedades_incidentes" FOR UPDATE TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres Infraestructura admin manage reservas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage reservas'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage reservas" ON "public"."reservas_alquileres" FOR UPDATE TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: seguimiento_novedades Infraestructura admin manage seguimiento; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura admin manage seguimiento'
      AND n.nspname = 'public'
      AND c.relname = 'seguimiento_novedades'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura admin manage seguimiento" ON "public"."seguimiento_novedades" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Infraestructura read profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Infraestructura read profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Infraestructura read profiles" ON "public"."profiles" FOR SELECT USING ((("public"."get_user_role"("auth"."uid"()))::"text" = 'infraestructura'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bloques_espacios Lectura pública; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública'
      AND n.nspname = 'public'
      AND c.relname = 'bloques_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública" ON "public"."bloques_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_activos Lectura pública; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública'
      AND n.nspname = 'public'
      AND c.relname = 'estados_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública" ON "public"."estados_activos" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: estados_espacios Lectura pública; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública'
      AND n.nspname = 'public'
      AND c.relname = 'estados_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública" ON "public"."estados_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: sedes_espacios Lectura pública; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública'
      AND n.nspname = 'public'
      AND c.relname = 'sedes_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública" ON "public"."sedes_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tipos_espacios Lectura pública; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública'
      AND n.nspname = 'public'
      AND c.relname = 'tipos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública" ON "public"."tipos_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: pisos_espacios Lectura pública pisos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública pisos'
      AND n.nspname = 'public'
      AND c.relname = 'pisos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública pisos" ON "public"."pisos_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores_activos Lectura pública proveedores; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública proveedores'
      AND n.nspname = 'public'
      AND c.relname = 'proveedores_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública proveedores" ON "public"."proveedores_activos" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: responsables_activos Lectura pública responsables; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Lectura pública responsables'
      AND n.nspname = 'public'
      AND c.relname = 'responsables_activos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Lectura pública responsables" ON "public"."responsables_activos" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos Public can view habilitados espacios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Public can view habilitados espacios'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Public can view habilitados espacios" ON "public"."espacios_fisicos" FOR SELECT TO "anon" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres Public read confirmed reservas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Public read confirmed reservas'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Public read confirmed reservas" ON "public"."reservas_alquileres" FOR SELECT TO "anon" USING (("estado" = ANY (ARRAY['Aprobada'::"public"."estado_reserva", 'Confirmada'::"public"."estado_reserva"])));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: logs_auditoria Rectoria read logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Rectoria read logs'
      AND n.nspname = 'public'
      AND c.relname = 'logs_auditoria'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Rectoria read logs" ON "public"."logs_auditoria" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'rectoria'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos Responsable insert activos assigned spaces; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable insert activos assigned spaces'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable insert activos assigned spaces" ON "public"."activos_fijos" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'responsable'::"public"."user_role"])) AND (("espacio_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "activos_fijos"."espacio_id") AND ("asignaciones_espacios"."activo" = true)))) OR ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones Responsable insert intervenciones assigned spaces; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable insert intervenciones assigned spaces'
      AND n.nspname = 'public'
      AND c.relname = 'intervenciones'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable insert intervenciones assigned spaces" ON "public"."intervenciones" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'responsable'::"public"."user_role"])) AND (("espacio_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "intervenciones"."espacio_id") AND ("asignaciones_espacios"."activo" = true)))) OR ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos Responsable read assigned activos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable read assigned activos'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable read assigned activos" ON "public"."activos_fijos" FOR SELECT USING (((("public"."get_user_role"("auth"."uid"()))::"text" = 'responsable'::"text") AND (("espacio_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "activos_fijos"."espacio_id") AND ("asignaciones_espacios"."activo" = true)))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos Responsable read assigned espacios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable read assigned espacios'
      AND n.nspname = 'public'
      AND c.relname = 'espacios_fisicos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable read assigned espacios" ON "public"."espacios_fisicos" FOR SELECT USING (((("public"."get_user_role"("auth"."uid"()))::"text" = 'responsable'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "espacios_fisicos"."id") AND ("asignaciones_espacios"."activo" = true))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Responsable read co-responsable profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable read co-responsable profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable read co-responsable profiles" ON "public"."profiles" FOR SELECT USING (((("public"."get_user_role"("auth"."uid"()))::"text" = 'responsable'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."asignaciones_espacios" "a1"
     JOIN "public"."asignaciones_espacios" "a2" ON (("a1"."espacio_id" = "a2"."espacio_id")))
  WHERE (("a1"."responsable_id" = "auth"."uid"()) AND ("a2"."responsable_id" = "profiles"."id") AND ("a1"."activo" = true) AND ("a2"."activo" = true))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: novedades_incidentes Responsable read own novedades; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable read own novedades'
      AND n.nspname = 'public'
      AND c.relname = 'novedades_incidentes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable read own novedades" ON "public"."novedades_incidentes" FOR SELECT USING (((("public"."get_user_role"("auth"."uid"()))::"text" = 'responsable'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "novedades_incidentes"."espacio_id") AND ("asignaciones_espacios"."activo" = true))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reservas_alquileres Responsable read own reservas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable read own reservas'
      AND n.nspname = 'public'
      AND c.relname = 'reservas_alquileres'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable read own reservas" ON "public"."reservas_alquileres" FOR SELECT USING (((("public"."get_user_role"("auth"."uid"()))::"text" = 'responsable'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "reservas_alquileres"."espacio_id") AND ("asignaciones_espacios"."activo" = true))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Responsable read profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable read profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable read profiles" ON "public"."profiles" FOR SELECT USING (((("public"."get_user_role"("auth"."uid"()))::"text" = 'responsable'::"text") AND ("id" = "auth"."uid"())));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activos_fijos Responsable update activos assigned spaces; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Responsable update activos assigned spaces'
      AND n.nspname = 'public'
      AND c.relname = 'activos_fijos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Responsable update activos assigned spaces" ON "public"."activos_fijos" FOR UPDATE TO "authenticated" USING ((("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'responsable'::"public"."user_role"])) AND (("espacio_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "activos_fijos"."espacio_id") AND ("asignaciones_espacios"."activo" = true)))) OR ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"]))))) WITH CHECK ((("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'responsable'::"public"."user_role"])) AND (("espacio_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."asignaciones_espacios"
  WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "activos_fijos"."espacio_id") AND ("asignaciones_espacios"."activo" = true)))) OR ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role"])))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Users insert own profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Users insert own profile'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Users insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Users update own profile'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Users update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK ((NOT ("role" IS DISTINCT FROM "public"."get_user_role"("auth"."uid"()))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles Users view own profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Users view own profile'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Users view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: actas_recibo_obra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."actas_recibo_obra" ENABLE ROW LEVEL SECURITY;

--
-- Name: activos_fijos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."activos_fijos" ENABLE ROW LEVEL SECURITY;

--
-- Name: asignaciones_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."asignaciones_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: bajas_activos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bajas_activos" ENABLE ROW LEVEL SECURITY;

--
-- Name: bitacoras_intervencion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bitacoras_intervencion" ENABLE ROW LEVEL SECURITY;

--
-- Name: bloques_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bloques_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias_activos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."categorias_activos" ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos_espacios docs_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'docs_delete'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "docs_delete" ON "public"."documentos_espacios" FOR DELETE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios docs_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'docs_insert'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "docs_insert" ON "public"."documentos_espacios" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios docs_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'docs_select'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "docs_select" ON "public"."documentos_espacios" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios docs_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'docs_update'
      AND n.nspname = 'public'
      AND c.relname = 'documentos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "docs_update" ON "public"."documentos_espacios" FOR UPDATE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: documentos_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."documentos_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: asignaciones_espacios escritura autenticada asignaciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'escritura autenticada asignaciones'
      AND n.nspname = 'public'
      AND c.relname = 'asignaciones_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "escritura autenticada asignaciones" ON "public"."asignaciones_espacios" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: motivos_movimiento_espacio escritura autenticada motivos_mov; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'escritura autenticada motivos_mov'
      AND n.nspname = 'public'
      AND c.relname = 'motivos_movimiento_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "escritura autenticada motivos_mov" ON "public"."motivos_movimiento_espacio" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios escritura autenticada movimientos_esp; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'escritura autenticada movimientos_esp'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "escritura autenticada movimientos_esp" ON "public"."movimientos_espacios" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: espacios_fisicos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."espacios_fisicos" ENABLE ROW LEVEL SECURITY;

--
-- Name: estados_activos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."estados_activos" ENABLE ROW LEVEL SECURITY;

--
-- Name: estados_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."estados_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: fotos_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."fotos_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: fotos_espacios fotos_espacios_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fotos_espacios_delete'
      AND n.nspname = 'public'
      AND c.relname = 'fotos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fotos_espacios_delete" ON "public"."fotos_espacios" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fotos_espacios fotos_espacios_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fotos_espacios_insert'
      AND n.nspname = 'public'
      AND c.relname = 'fotos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fotos_espacios_insert" ON "public"."fotos_espacios" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fotos_espacios fotos_espacios_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fotos_espacios_select'
      AND n.nspname = 'public'
      AND c.relname = 'fotos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fotos_espacios_select" ON "public"."fotos_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: intervenciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."intervenciones" ENABLE ROW LEVEL SECURITY;

--
-- Name: asignaciones_espacios lectura publica asignaciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'lectura publica asignaciones'
      AND n.nspname = 'public'
      AND c.relname = 'asignaciones_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "lectura publica asignaciones" ON "public"."asignaciones_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: motivos_movimiento_espacio lectura publica motivos_mov; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'lectura publica motivos_mov'
      AND n.nspname = 'public'
      AND c.relname = 'motivos_movimiento_espacio'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "lectura publica motivos_mov" ON "public"."motivos_movimiento_espacio" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: movimientos_espacios lectura publica movimientos_esp; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'lectura publica movimientos_esp'
      AND n.nspname = 'public'
      AND c.relname = 'movimientos_espacios'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "lectura publica movimientos_esp" ON "public"."movimientos_espacios" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: logs_auditoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logs_auditoria" ENABLE ROW LEVEL SECURITY;

--
-- Name: motivos_movimiento_espacio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."motivos_movimiento_espacio" ENABLE ROW LEVEL SECURITY;

--
-- Name: movimientos_activos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."movimientos_activos" ENABLE ROW LEVEL SECURITY;

--
-- Name: movimientos_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."movimientos_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: no_conformidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."no_conformidades" ENABLE ROW LEVEL SECURITY;

--
-- Name: novedades_incidentes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."novedades_incidentes" ENABLE ROW LEVEL SECURITY;

--
-- Name: pisos_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."pisos_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_self_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'profiles_self_update'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: proveedores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."proveedores" ENABLE ROW LEVEL SECURITY;

--
-- Name: proveedores_activos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."proveedores_activos" ENABLE ROW LEVEL SECURITY;

--
-- Name: reservas_alquileres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reservas_alquileres" ENABLE ROW LEVEL SECURITY;

--
-- Name: responsables_activos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."responsables_activos" ENABLE ROW LEVEL SECURITY;

--
-- Name: sedes_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."sedes_espacios" ENABLE ROW LEVEL SECURITY;

--
-- Name: seguimiento_novedades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."seguimiento_novedades" ENABLE ROW LEVEL SECURITY;

--
-- Name: tipos_espacios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tipos_espacios" ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




-- ============================================================
-- SECTION: DIFF FILTER OBJECTS
-- ============================================================
-- Objects that match diff-filter.json but cannot be represented
-- precisely by pg_dump --filter.

-- auth.users trigger: on_auth_user_created
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  END IF;
END
$pg_schema_restore$;
-- policy: avatars_owner_delete on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'avatars_owner_delete'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY avatars_owner_delete ON storage.objects AS PERMISSIVE FOR DELETE TO PUBLIC USING (((bucket_id = ''avatars''::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));';
  END IF;
END
$pg_schema_restore$;
-- policy: avatars_owner_insert on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'avatars_owner_insert'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY avatars_owner_insert ON storage.objects AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((bucket_id = ''avatars''::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));';
  END IF;
END
$pg_schema_restore$;
-- policy: avatars_owner_update on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'avatars_owner_update'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY avatars_owner_update ON storage.objects AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((bucket_id = ''avatars''::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));';
  END IF;
END
$pg_schema_restore$;
-- policy: avatars_public_read on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'avatars_public_read'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY avatars_public_read ON storage.objects AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = ''avatars''::text));';
  END IF;
END
$pg_schema_restore$;
-- publication table: supabase_realtime -> public.intervenciones
DO $pg_schema_restore$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND pr.prrelid = to_regclass('public.intervenciones')
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.intervenciones;';
  END IF;
END
$pg_schema_restore$;
-- publication table: supabase_realtime -> public.novedades_incidentes
DO $pg_schema_restore$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND pr.prrelid = to_regclass('public.novedades_incidentes')
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.novedades_incidentes;';
  END IF;
END
$pg_schema_restore$;
-- publication table: supabase_realtime -> public.reservas_alquileres
DO $pg_schema_restore$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND pr.prrelid = to_regclass('public.reservas_alquileres')
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas_alquileres;';
  END IF;
END
$pg_schema_restore$;

-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('avatars', 'avatars', NULL, '2026-06-24 16:42:23.289377+00', '2026-06-24 16:42:23.289377+00', 'true', 'false', '1048576', '{image/jpeg,image/png,image/webp,image/avif,image/gif}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
