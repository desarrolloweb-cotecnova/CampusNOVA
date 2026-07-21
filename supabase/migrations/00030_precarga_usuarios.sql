-- ============================================================
-- CampusNOVA — Precarga de usuarios (nombre y cargo por correo)
-- ------------------------------------------------------------
-- Objetivo: tener el NOMBRE y el CARGO de los usuarios listos
-- ANTES de que se registren. Cuando la persona ingrese por
-- primera vez con su correo (Google SSO o correo/contraseña),
-- el trigger de alta rellena automáticamente su perfil con el
-- nombre y el cargo precargados.
--
-- Reglas de negocio (definidas con Rectoría):
--   • El ROL NO se precarga: todos entran como 'responsable'.
--   • El usuario entra INACTIVO (activo=false): un admin/rector
--     lo activa y ajusta su rol desde Panel → Usuarios.
--   • Solo se precargan nombre y cargo.
--
-- Ejecutar en Supabase → SQL Editor (idempotente, se puede
-- correr varias veces sin duplicar).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) Tabla de precarga (staging por correo)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usuarios_precarga (
  email      text PRIMARY KEY,
  nombre     text,
  cargo      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios_precarga ENABLE ROW LEVEL SECURITY;

-- Solo admin/rector pueden ver y gestionar la precarga.
DROP POLICY IF EXISTS "Admin rector manage precarga" ON public.usuarios_precarga;
CREATE POLICY "Admin rector manage precarga" ON public.usuarios_precarga
  FOR ALL TO authenticated
  USING ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector']))
  WITH CHECK ((public.get_user_role(auth.uid()))::text = ANY (ARRAY['admin', 'rector']));

-- ─────────────────────────────────────────────────────────────
-- 2) Trigger de alta: rellenar nombre/cargo desde la precarga
--    Mantiene rol 'responsable' e INACTIVO (red de seguridad para
--    todas las vías de alta: Google, correo/contraseña, invitación,
--    Admin API). El correo se compara sin distinguir mayúsculas.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nombre text;
  v_cargo  text;
BEGIN
  SELECT nombre, cargo
    INTO v_nombre, v_cargo
    FROM public.usuarios_precarga
   WHERE lower(email) = lower(NEW.email)
   LIMIT 1;

  INSERT INTO public.profiles (id, email, nombre, cargo, role, activo)
  VALUES (
    NEW.id,
    NEW.email,
    v_nombre,                          -- NULL si no está precargado
    v_cargo,                           -- NULL si no está precargado
    'responsable'::public.user_role,
    false
  );
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3) Datos de precarga (listado oficial de COTECNOVA)
--    Idempotente: al re-ejecutar actualiza nombre/cargo.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.usuarios_precarga (email, nombre, cargo) VALUES
  ('laboratorios@cotecnova.edu.co', 'Juan Manuel Cardona Valencia', 'Director de Laboratorio'),
  ('rector@cotecnova.edu.co', 'Heynar Ramirez Becerra', 'Rector'),
  ('aux.infraestructura@cotecnova.edu.co', 'Juan Manuel Atehortua Cano', 'Aux Administrativo (Inf)'),
  ('vicerrectoria@cotecnova.edu.co', 'Leidy Tatiana Rebellon Lugo', 'Vicerrectora Académica'),
  ('gestiontic@cotecnova.edu.co', 'Ramon Fredy Quebrada Martínez', 'Director de Gestión TIC'),
  ('jloaiza@cotecnova.edu.co', 'Jorge Ariel Loaiza Loaiza', 'Docente Tiempo Completo'),
  ('sgodoyh@cotecnova.edu.co', 'Sonia Elena Godoy Hortua', 'Docente Tiempo Completo'),
  ('cadministrativa@cotecnova.edu.co', 'Yuri Marcela Llano Castaño', 'Directora Unidad Administrativa'),
  ('investigacion@cotecnova.edu.co', 'Marlene Rocio Moscoso Quiceno', 'Directora Investigación'),
  ('presidencia@cotecnova.edu.co', 'Consejo Directivo', 'Consejo Directivo'),
  ('gcalidad@cotecnova.edu.co', 'Kelly Yohana Piedrahita Alarcon', 'Directora de Calidad'),
  ('secretaria@cotecnova.edu.co', 'Lina María Gómez Esquivel', 'Aux Administrativa (Rectoría)'),
  ('campusnova@cotecnova.edu.co', 'CampusNOVA', 'Responsable General'),
  ('bkf_aux_tic@cotecnova.edu.co', 'José David Zuluaga Barco', 'Auxiliar Gestión TIC'),
  ('atencionusuario@cotecnova.edu.co', 'Alejandra Betancourt Mejia', 'Aux Administrativa (Usuario)'),
  ('ingsistemas@cotecnova.edu.co', 'Arvey Barahona Gómez', 'Director Unidad Ingeniería'),
  ('mercadeo@cotecnova.edu.co', 'Javier Andrés Vasquez Salazar', 'Director Mercadeo'),
  ('agropecuaria@cotecnova.edu.co', 'Jorge Mario Arce Serna', 'Director Unidad Agropecuaria'),
  ('aux-talentoh@cotecnova.edu.co', 'Yasmin Lice Ramirez Cardona', 'Auxiliar Administrativa (TH)'),
  ('biblioteca@cotecnova.edu.co', 'Edward Alejandro Carvajal Álvarez', 'Auxiliar Administrativo (Biblioteca)'),
  ('monitor@cotecnova.edu.co', 'Andrés Felipe Mejía Suaza', 'Monitor Salas (Pasante)'),
  ('sectorexterno@cotecnova.edu.co', 'Edison Jair Mosquera Ángel', 'Director Relación Sector Externo'),
  ('bienestar@cotecnova.edu.co', 'Adel Guerrero Quintero', 'Director de Bienestar'),
  ('auxiliarmercadeo@cotecnova.edu.co', 'Juan Camilo Trejos Arias', 'Auxiliar Administrativo (Mercadeo)'),
  ('gestiondocumental@cotecnova.edu.co', 'Luisa Fernanda Martínez Arias', 'Directoria Gestión Documental'),
  ('creditoycartera@cotecnova.edu.co', 'Valentina Crespo Giraldo', 'Jefe de Crédito y Cartera'),
  ('tesoreria@cotecnova.edu.co', 'Albeiro Quiceno Escobar', 'Tesorero'),
  ('contador@cotecnova.edu.co', 'Jairo Restrepo Peña', 'Contador'),
  ('talentoh@cotecnova.edu.co', 'Leidy Yohanna Mondragón Bernal', 'Coordinadora de Talento Humano'),
  ('registroycontrol@cotecnova.edu.co', 'Liliana Marcela Reyes Ruiz', 'Auxiliar Administrativa (RyC)')
ON CONFLICT (email) DO UPDATE
  SET nombre     = EXCLUDED.nombre,
      cargo      = EXCLUDED.cargo,
      updated_at = now();

-- ─────────────────────────────────────────────────────────────
-- 4) (OPCIONAL) Backfill de perfiles YA registrados a los que
--    todavía les falta el nombre o el cargo. NO cambia rol ni
--    estado (activo); solo rellena datos vacíos desde la precarga.
--    Descomenta y ejecuta solo si quieres completar los que ya
--    existen. Por defecto queda inactivo (solo aplica a nuevos).
-- ─────────────────────────────────────────────────────────────
-- UPDATE public.profiles p
--    SET nombre = COALESCE(NULLIF(p.nombre, ''), up.nombre),
--        cargo  = COALESCE(NULLIF(p.cargo,  ''), up.cargo),
--        updated_at = now()
--   FROM public.usuarios_precarga up
--  WHERE lower(p.email) = lower(up.email)
--    AND (p.nombre IS NULL OR p.nombre = '' OR p.cargo IS NULL OR p.cargo = '');

-- ─────────────────────────────────────────────────────────────
-- 5) Verificación
-- ─────────────────────────────────────────────────────────────
-- SELECT count(*) AS total_precargados FROM public.usuarios_precarga;   -- debe dar 30
-- SELECT email, nombre, cargo FROM public.usuarios_precarga ORDER BY email;
