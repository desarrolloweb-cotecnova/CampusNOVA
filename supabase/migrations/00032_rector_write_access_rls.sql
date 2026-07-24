-- ============================================================
-- CampusNOVA — Dar permisos de ESCRITURA al rol 'rector' (RLS)
--
-- PROBLEMA: las políticas de escritura creadas en 00001 solo permiten
-- 'admin' e 'infraestructura' (y dos catálogos solo 'admin'). El rol de
-- rectoría ('rectoria', renombrado a 'rector' por el script 06) nunca fue
-- incluido, por lo que sus UPDATE/INSERT/DELETE son bloqueados por RLS en
-- silencio (0 filas afectadas, sin error). Síntomas reportados: no se
-- guarda el cambio de estado de una reserva ni la tarifa de alquiler de
-- un espacio.
--
-- SOLUCIÓN: recrear esas políticas incluyendo 'rector', manteniendo el
-- alcance original de cada una (FOR UPDATE se conserva como FOR UPDATE).
-- La comparación se hace como texto e incluye también 'rectoria' por si
-- alguna base aún no aplicó el renombrado del script 06.
--
-- Ejecutar en Supabase → SQL Editor. Es idempotente (re-ejecutable).
-- ============================================================

-- ── Espacios físicos (aquí se guarda la tarifa de alquiler) ───────────
DROP POLICY IF EXISTS "Infraestructura admin manage espacios" ON public.espacios_fisicos;
CREATE POLICY "Infraestructura admin manage espacios" ON public.espacios_fisicos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Reservas y alquileres (cambio de estado de solicitudes) ───────────
DROP POLICY IF EXISTS "Infraestructura admin manage reservas" ON public.reservas_alquileres;
CREATE POLICY "Infraestructura admin manage reservas" ON public.reservas_alquileres
  FOR UPDATE TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Activos fijos ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage activos" ON public.activos_fijos;
CREATE POLICY "Infraestructura admin manage activos" ON public.activos_fijos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Movimientos de activos ────────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage movimientos" ON public.movimientos_activos;
CREATE POLICY "Infraestructura admin manage movimientos" ON public.movimientos_activos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Bajas de activos ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage bajas" ON public.bajas_activos;
CREATE POLICY "Infraestructura admin manage bajas" ON public.bajas_activos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Intervenciones ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage intervenciones" ON public.intervenciones;
CREATE POLICY "Infraestructura admin manage intervenciones" ON public.intervenciones
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Bitácoras de intervención ─────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage bitacoras" ON public.bitacoras_intervencion;
CREATE POLICY "Infraestructura admin manage bitacoras" ON public.bitacoras_intervencion
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Actas de recibo de obra ───────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage actas" ON public.actas_recibo_obra;
CREATE POLICY "Infraestructura admin manage actas" ON public.actas_recibo_obra
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── No conformidades ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage noconf" ON public.no_conformidades;
CREATE POLICY "Infraestructura admin manage noconf" ON public.no_conformidades
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Documentos de espacios ────────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage docs_espacios" ON public.documentos_espacios;
CREATE POLICY "Infraestructura admin manage docs_espacios" ON public.documentos_espacios
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Novedades e incidentes (gestión de estados) ───────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage novedades" ON public.novedades_incidentes;
CREATE POLICY "Infraestructura admin manage novedades" ON public.novedades_incidentes
  FOR UPDATE TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Seguimiento de novedades ──────────────────────────────────────────
DROP POLICY IF EXISTS "Infraestructura admin manage seguimiento" ON public.seguimiento_novedades;
CREATE POLICY "Infraestructura admin manage seguimiento" ON public.seguimiento_novedades
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','infraestructura','rector','rectoria']));

-- ── Catálogos que eran solo-admin: incluir a rector ───────────────────
DROP POLICY IF EXISTS "Admin manage categorias" ON public.categorias_activos;
CREATE POLICY "Admin manage categorias" ON public.categorias_activos
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','rector','rectoria']));

DROP POLICY IF EXISTS "Admin manage proveedores" ON public.proveedores;
CREATE POLICY "Admin manage proveedores" ON public.proveedores
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','rector','rectoria']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin','rector','rectoria']));

-- ============================================================
-- VERIFICAR
-- ============================================================
-- 1) El rol del usuario rector (debe decir 'rector' y activo=true):
SELECT email, role, activo FROM public.profiles WHERE email = 'rector@cotecnova.edu.co';

-- 2) Políticas actualizadas (todas deben listar 'rector' en su expresión):
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND qual ILIKE '%rector%'
ORDER BY tablename, policyname;
