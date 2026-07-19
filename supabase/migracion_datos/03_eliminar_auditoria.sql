-- ============================================================
-- CampusNOVA — Eliminar la auditoría de la base de datos
-- Ejecutar en Supabase > SQL Editor del proyecto.
--
-- La función de Auditoría se retiró de la aplicación. Este script elimina la
-- tabla logs_auditoria y sus políticas RLS asociadas (CASCADE). No hay triggers
-- ni funciones que dependan de ella, por lo que el borrado es limpio.
--
-- ⚠️ IRREVERSIBLE: se pierden todos los registros de auditoría existentes.
-- ============================================================

DROP TABLE IF EXISTS public.logs_auditoria CASCADE;
