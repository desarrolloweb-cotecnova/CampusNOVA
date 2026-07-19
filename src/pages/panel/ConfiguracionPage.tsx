// Módulo de Configuración — CampusNOVA
// Incluye: Monitoreo de Supabase (uso vs límites Plan Free + keepalive automático) y Gestión de Usuarios
import { useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Database, Users, HardDrive, RefreshCw, Server,
  TableProperties, AlertCircle, CheckCircle2, AlertTriangle, XCircle,
  Clock, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface TableSize {
  schemaname: string;
  tablename: string;
  size_bytes: number;
  size_pretty: string;
  data_size_bytes: number;
  data_size_pretty: string;
}

interface MonitorData {
  timestamp: string;
  database: { total_size_bytes: number; total_size_pretty: string };
  tables: TableSize[];
  connections: { active: number; idle: number; total: number };
  auth: { total_users: number; confirmed_users: number; unconfirmed_users: number };
  storage: {
    total_files: number;
    total_size_bytes: number;
    total_size_pretty: string;
    buckets: { name: string; public: boolean }[];
  };
}

// ── Límites Plan Free Supabase ────────────────────────────────────────────
const PLAN_LIMITS = {
  db_size_bytes:  500 * 1024 * 1024,   // 500 MB
  storage_bytes:  1 * 1024 * 1024 * 1024, // 1 GB
  auth_users:     50_000,
  db_connections: 60,
};

// ── Utilidades ────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)} h`;
}

function getPct(value: number, limit: number): number {
  return Math.min(100, (value / limit) * 100);
}

// ── Niveles de alerta ─────────────────────────────────────────────────────
type AlertLevel = 'ok' | 'warning' | 'critical';

function getAlertLevel(pct: number): AlertLevel {
  if (pct >= 90) return 'critical';
  if (pct >= 70) return 'warning';
  return 'ok';
}

const ALERT_STYLES: Record<AlertLevel, {
  bar: string; text: string; badge: string; icon: React.ReactNode;
}> = {
  ok: {
    bar: 'bg-green-500',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
  },
  warning: {
    bar: 'bg-amber-500',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
  },
  critical: {
    bar: 'bg-destructive',
    text: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: <XCircle className="h-4 w-4 text-destructive shrink-0" />,
  },
};

const ALERT_LABELS: Record<AlertLevel, string> = {
  ok: 'Normal',
  warning: 'Atención',
  critical: 'Crítico',
};

// ── Componente: barra de uso ──────────────────────────────────────────────
function UsageBar({
  label, icon, current, limit, formatValue, detail,
}: {
  label: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  formatValue: (v: number) => string;
  detail?: React.ReactNode;
}) {
  const pct = getPct(current, limit);
  const level = getAlertLevel(pct);
  const styles = ALERT_STYLES[level];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {styles.icon}
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold ${styles.text}`}>{pct.toFixed(1)}%</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${styles.badge}`}>
            {ALERT_LABELS[level]}
          </span>
        </div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          <span className="font-medium text-foreground">{formatValue(current)}</span>
          <span>usado</span>
          {detail && <span className="ml-1">{detail}</span>}
        </span>
        <span>Límite: <span className="font-medium text-foreground">{formatValue(limit)}</span></span>
      </div>
    </div>
  );
}

// ── Skeleton de carga ─────────────────────────────────────────────────────
function LimitCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="bg-muted h-5 w-40" />
        <Skeleton className="bg-muted h-3 w-56 mt-1" />
      </CardHeader>
      <CardContent className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="bg-muted h-4 w-32" />
              <Skeleton className="bg-muted h-4 w-16" />
            </div>
            <Skeleton className="bg-muted h-2.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="bg-muted h-3 w-24" />
              <Skeleton className="bg-muted h-3 w-20" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Gráfico de barras CSS (sin recharts) ──────────────────────────────────
function CssBarChart({ items }: { items: { name: string; size: number }[] }) {
  const max = Math.max(...items.map((i) => i.size), 1);
  const opacities = [1, 0.85, 0.7, 0.6, 0.5, 0.42, 0.35, 0.28, 0.22, 0.16];
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs text-muted-foreground w-36 shrink-0 truncate text-right"
            title={item.name}
          >
            {item.name}
          </span>
          <div className="flex-1 min-w-0 h-6 bg-muted rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(item.size / max) * 100}%`,
                backgroundColor: `hsl(var(--primary) / ${opacities[idx % opacities.length]})`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0 w-20 text-right font-mono">
            {formatBytes(item.size)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke<MonitorData>(
        'supabase-monitor',
        { method: 'GET' }
      );
      if (fnError) {
        const msg = fnError.message || 'Error al consultar métricas';
        throw new Error(msg);
      }
      if (!result) throw new Error('Sin respuesta del servidor');
      setData(result);
      setLastFetch(new Date().toISOString());
      toast.success('Métricas actualizadas correctamente');
    } catch (err: unknown) {
      const raw = (err as Error)?.message || 'Error desconocido';
      // Mensaje claro cuando la Edge Function aún no está desplegada.
      const noDesplegada =
        /failed to send a request|not found|404|failed to fetch/i.test(raw);
      const mensaje = noDesplegada
        ? 'La función de monitoreo (supabase-monitor) no está desplegada en este proyecto de Supabase. Despliégala para ver las métricas (ver docs/MIGRACION.md, sección Edge Functions).'
        : raw;
      setError(mensaje);
      toast.error('Error al obtener métricas', { description: mensaje });
    } finally {
      setLoading(false);
    }
  }, []);

  // Resumen de alertas globales
  const alertSummary = data
    ? (() => {
        const checks = [
          getPct(data.database.total_size_bytes, PLAN_LIMITS.db_size_bytes),
          getPct(data.storage.total_size_bytes, PLAN_LIMITS.storage_bytes),
          getPct(data.auth.total_users, PLAN_LIMITS.auth_users),
          getPct(data.connections.total, PLAN_LIMITS.db_connections),
        ];
        const critical = checks.filter((p) => p >= 90).length;
        const warning = checks.filter((p) => p >= 70 && p < 90).length;
        if (critical > 0)
          return {
            level: 'critical' as AlertLevel,
            msg: `${critical} métrica${critical > 1 ? 's' : ''} en nivel crítico — considera actualizar el plan`,
          };
        if (warning > 0)
          return {
            level: 'warning' as AlertLevel,
            msg: `${warning} métrica${warning > 1 ? 's' : ''} superando el 70% del límite`,
          };
        return { level: 'ok' as AlertLevel, msg: 'Todos los recursos dentro del rango normal' };
      })()
    : null;

  const chartData = (data?.tables ?? []).map((t) => ({
    name: t.tablename.length > 18 ? t.tablename.slice(0, 16) + '…' : t.tablename,
    size: t.size_bytes,
  }));

  const SUMMARY_STYLES: Record<AlertLevel, string> = {
    ok: 'border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300',
    critical: 'border-destructive/30 bg-destructive/5 text-destructive',
  };
  const SUMMARY_ICONS: Record<AlertLevel, React.ReactNode> = {
    ok: <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
    critical: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
  };

  return (
    <AppLayout>
      <RoleGuard allowedRoles={['admin', 'rectoria']} redirect>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl text-balance">Configuración</h1>
            <p className="text-muted-foreground text-sm md:text-base text-pretty">
              Monitoreo del sistema
            </p>
          </div>
        </div>

        <div className="space-y-5">
            {/* Sub-encabezado con botón refrescar */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-balance">
                  <Server className="h-5 w-5 shrink-0 text-primary" />
                  Monitoreo de Supabase
                </h2>
                <p className="text-muted-foreground text-sm text-pretty">
                  Uso actual vs. límites del{' '}
                  <span className="font-medium text-foreground">Plan Free</span>.
                  La base de datos se mantiene activa automáticamente cada 3 días.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {lastFetch && (
                  <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Actualizado {formatTimeAgo(lastFetch)}
                  </span>
                )}
                <Button onClick={fetchData} disabled={loading} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Consultando…' : 'Refrescar datos'}
                </Button>
              </div>
            </div>

            {/* Estado vacío */}
            {!data && !loading && !error && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <Server className="h-12 w-12 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="font-medium text-muted-foreground">Sin datos cargados</p>
                    <p className="text-sm text-muted-foreground/70 mt-1 text-pretty">
                      Presiona <strong>Refrescar datos</strong> para consultar el uso vs. límites del plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {error && (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="flex items-start gap-3 pt-6 pb-5">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Error al obtener métricas</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skeleton de carga */}
            {loading && !data && (
              <div className="grid gap-4 md:grid-cols-2">
                <LimitCardSkeleton />
                <LimitCardSkeleton />
              </div>
            )}

            {/* Datos cargados */}
            {data && (
              <>
                {/* Banner de resumen global */}
                {alertSummary && (
                  <div
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${SUMMARY_STYLES[alertSummary.level]}`}
                  >
                    {SUMMARY_ICONS[alertSummary.level]}
                    <p className="text-sm font-medium text-pretty">{alertSummary.msg}</p>
                  </div>
                )}

                {/* KPIs rápidos */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    {
                      label: 'BD utilizada',
                      value: data.database.total_size_pretty,
                      sub: `de ${formatBytes(PLAN_LIMITS.db_size_bytes)}`,
                      icon: <Database className="h-5 w-5 text-primary" />,
                    },
                    {
                      label: 'Storage usado',
                      value: data.storage.total_size_pretty,
                      sub: `${data.storage.total_files} archivo${data.storage.total_files !== 1 ? 's' : ''}`,
                      icon: <HardDrive className="h-5 w-5 text-primary" />,
                    },
                    {
                      label: 'Usuarios Auth',
                      value: String(data.auth.total_users),
                      sub: `${data.auth.confirmed_users} confirmados`,
                      icon: <Users className="h-5 w-5 text-primary" />,
                    },
                    {
                      label: 'Conexiones BD',
                      value: String(data.connections.total),
                      sub: `${data.connections.active} activas · ${data.connections.idle} idle`,
                      icon: <TableProperties className="h-5 w-5 text-primary" />,
                    },
                  ].map((kpi) => (
                    <Card key={kpi.label} className="h-full">
                      <CardContent className="pt-5 pb-4 px-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {kpi.icon}
                          <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                        </div>
                        <p className="text-xl font-bold leading-none">{kpi.value}</p>
                        <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Barras de uso vs límites */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        Base de Datos y Conexiones
                      </CardTitle>
                      <CardDescription className="text-pretty">
                        Uso de almacenamiento relacional y conexiones concurrentes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <UsageBar
                        label="Almacenamiento BD"
                        icon={<Database className="h-3 w-3" />}
                        current={data.database.total_size_bytes}
                        limit={PLAN_LIMITS.db_size_bytes}
                        formatValue={formatBytes}
                      />
                      <UsageBar
                        label="Conexiones"
                        icon={<TableProperties className="h-3 w-3" />}
                        current={data.connections.total}
                        limit={PLAN_LIMITS.db_connections}
                        formatValue={(v) => `${v}`}
                        detail={
                          <span className="text-muted-foreground">
                            ({data.connections.active} act. · {data.connections.idle} idle)
                          </span>
                        }
                      />
                    </CardContent>
                  </Card>

                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-primary" />
                        Storage y Autenticación
                      </CardTitle>
                      <CardDescription className="text-pretty">
                        Almacenamiento de archivos y usuarios registrados
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <UsageBar
                        label="Almacenamiento Storage"
                        icon={<HardDrive className="h-3 w-3" />}
                        current={data.storage.total_size_bytes}
                        limit={PLAN_LIMITS.storage_bytes}
                        formatValue={formatBytes}
                        detail={
                          <span className="text-muted-foreground">
                            ({data.storage.total_files} archivos)
                          </span>
                        }
                      />
                      <UsageBar
                        label="Usuarios Auth"
                        icon={<Users className="h-3 w-3" />}
                        current={data.auth.total_users}
                        limit={PLAN_LIMITS.auth_users}
                        formatValue={(v) => `${v.toLocaleString()}`}
                        detail={
                          <span className="text-muted-foreground">
                            ({data.auth.confirmed_users} confirmados)
                          </span>
                        }
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Tablas más pesadas */}
                {chartData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TableProperties className="h-4 w-4 text-primary" />
                        Top 10 Tablas por Tamaño
                      </CardTitle>
                      <CardDescription>
                        Tablas que más espacio ocupan en la base de datos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CssBarChart items={chartData} />
                    </CardContent>
                  </Card>
                )}

                {/* Buckets de Storage */}
                {data.storage.buckets.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        Buckets de Storage
                      </CardTitle>
                      <CardDescription>
                        Contenedores de archivos configurados en el proyecto
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {data.storage.buckets.map((b) => (
                          <div
                            key={b.name}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 text-sm"
                          >
                            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{b.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {b.public ? 'Público' : 'Privado'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Info keepalive */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex items-start gap-3 pt-5 pb-4">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Keepalive automático activo</p>
                      <p className="text-xs text-muted-foreground mt-0.5 text-pretty">
                        Un cron job ejecuta una consulta ligera cada 3 días a las 06:00 UTC para
                        mantener el proyecto activo y evitar la pausa automática del Plan Free de Supabase.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground text-right">
                  Datos obtenidos el {new Date(data.timestamp).toLocaleString('es-CO')}
                </p>
              </>
            )}
        </div>
      </div>
      </RoleGuard>
    </AppLayout>
  );
}
