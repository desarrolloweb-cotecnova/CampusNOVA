-- Tamaño total de la base de datos
CREATE OR REPLACE FUNCTION monitor_get_db_size()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'size_bytes', pg_database_size(current_database()),
    'size_pretty', pg_size_pretty(pg_database_size(current_database()))
  );
$$;

-- Top 10 tablas más pesadas
CREATE OR REPLACE FUNCTION monitor_get_table_sizes()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
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

-- Conexiones activas/idle/total
CREATE OR REPLACE FUNCTION monitor_get_active_connections()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'active_count', COUNT(*) FILTER (WHERE state = 'active'),
    'idle_count',   COUNT(*) FILTER (WHERE state = 'idle'),
    'total_count',  COUNT(*)
  ) FROM pg_stat_activity WHERE datname = current_database();
$$;

-- Conteo de usuarios en auth.users
CREATE OR REPLACE FUNCTION monitor_get_auth_users_count()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'total_users',       COUNT(*),
    'confirmed_users',   COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
    'unconfirmed_users', COUNT(*) FILTER (WHERE email_confirmed_at IS NULL)
  ) FROM auth.users;
$$;

-- Estadísticas de storage
CREATE OR REPLACE FUNCTION monitor_get_storage_stats()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'total_files',       COUNT(*),
    'total_size_bytes',  COALESCE(SUM((metadata->>'size')::bigint), 0),
    'total_size_pretty', pg_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0))
  ) FROM storage.objects WHERE bucket_id IS NOT NULL;
$$;

-- Lista de buckets
CREATE OR REPLACE FUNCTION monitor_get_buckets()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(json_build_object('name', name, 'public', public)), '[]'::json)
  FROM storage.buckets;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION monitor_get_db_size() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_get_table_sizes() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_get_active_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_get_auth_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_get_storage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_get_buckets() TO authenticated;

-- Cron keepalive (evita pausa automática del Plan Free)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('supabase-keepalive')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'supabase-keepalive');

SELECT cron.schedule(
  'supabase-keepalive',
  '0 6 */3 * *',
  $$SELECT monitor_get_db_size();$$
);