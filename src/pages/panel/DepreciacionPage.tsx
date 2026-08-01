import { useEffect, useState, useCallback } from 'react';
import { TrendingDown, AlertCircle, Calendar, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import type { ActivoFijo } from '@/types/types';
import { formatCurrency, formatDate, calcularDepreciacion } from '@/lib/utils';
import { fetchAllRows } from '@/lib/supabase-fetch';

export default function DepreciacionPage() {
  const [activos, setActivos] = useState<ActivoFijo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivos = useCallback(async () => {
    setLoading(true);
    // Paginado: sin `.range()` PostgREST devolvería solo las primeras 1.000 filas
    // y los totales de depreciación quedarían subestimados.
    const { data } = await fetchAllRows<ActivoFijo>(() =>
      supabase
        .from('activos_fijos')
        .select('*')
        .eq('depreciable', true)
        .eq('dado_de_baja', false)
        .order('fecha_adquisicion', { ascending: true })
        .order('id')
    );
    setActivos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadActivos(); }, [loadActivos]);

  // Refresca cuando otro usuario cambia el inventario, sin recargar la pantalla.
  useRealtimeTable('activos_fijos', loadActivos);

  const activosConDep = activos.map(a => ({
    ...a,
    dep: calcularDepreciacion(a.valor, a.fecha_adquisicion, a.tiempo_depreciacion),
  }));

  const totalValorOriginal = activosConDep.reduce((s, a) => s + a.valor, 0);
  const totalValorActual = activosConDep.reduce((s, a) => s + a.dep.valorActual, 0);
  const totalDepreciado = totalValorOriginal - totalValorActual;
  const criticos = activosConDep.filter(a => a.dep.porcentajeVida >= 80);

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Activos depreciables', value: activosConDep.length, icon: Package, color: 'text-primary' },
            { label: 'Valor original total', value: formatCurrency(totalValorOriginal), icon: TrendingDown, color: 'text-primary' },
            { label: 'Valor actual total', value: formatCurrency(totalValorActual), icon: TrendingDown, color: 'text-green-600' },
            { label: 'Vida útil crítica (≥80%)', value: criticos.length, icon: AlertCircle, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4">
                <div className="p-2 rounded-lg bg-muted w-fit mb-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-xl font-bold">{loading ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabla */}
        <Card className="shadow-card min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Depreciación de Activos Fijos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Nombre</TableHead>
                    <TableHead className="whitespace-nowrap">Valor Original</TableHead>
                    <TableHead className="whitespace-nowrap">Depr. Anual</TableHead>
                    <TableHead className="whitespace-nowrap">Valor Actual</TableHead>
                    <TableHead className="whitespace-nowrap">Años Trans.</TableHead>
                    <TableHead className="whitespace-nowrap">Vida Útil</TableHead>
                    <TableHead className="whitespace-nowrap">Adquisición</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(8).fill(0).map((_, j) => (
                          <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : activosConDep.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No hay activos depreciables registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    activosConDep.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{a.codigo}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{a.nombre}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(a.valor)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(a.dep.depreciacionAnual)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(a.dep.valorActual)}</TableCell>
                        <TableCell className="whitespace-nowrap text-center">{a.dep.añosTranscurridos}/{a.tiempo_depreciacion}</TableCell>
                        <TableCell className="whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Progress value={a.dep.porcentajeVida} className="flex-1 h-2" />
                            <span className={`text-xs font-medium shrink-0 ${a.dep.porcentajeVida >= 80 ? 'text-destructive' : a.dep.porcentajeVida >= 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {a.dep.porcentajeVida.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(a.fecha_adquisicion)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
