import { useEffect, useState, useCallback } from 'react';
import { Save, LayoutDashboard, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { toast } from 'sonner';

interface EspacioConfig {
  id: string;
  nombre: string;
  sede: string;
  bloque: string;
  tipo: string;
  capacidad_personas: number | null;
  habilitado_reserva: boolean;
  tarifa_alquiler: string; // string para input
}

export default function DashboardReservasPage() {
  const [espacios, setEspacios] = useState<EspacioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('espacios_fisicos')
      .select('id, nombre, sede, bloque, tipo, capacidad_personas, habilitado_reserva, tarifa_alquiler')
      .order('nombre');
    setEspacios(
      (Array.isArray(data) ? data : []).map(e => ({
        id: e.id,
        nombre: e.nombre,
        sede: e.sede || '',
        bloque: e.bloque || '',
        tipo: e.tipo || '',
        capacidad_personas: e.capacidad_personas,
        habilitado_reserva: e.habilitado_reserva ?? false,
        tarifa_alquiler: e.tarifa_alquiler != null ? String(e.tarifa_alquiler) : '',
      }))
    );
    setLoading(false);
    setDirty(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresca cuando otro usuario cambia los datos, sin recargar la pantalla.
  useRealtimeTable('reservas_alquileres', loadData);

  const update = (id: string, patch: Partial<EspacioConfig>) => {
    setEspacios(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // .select('id') devuelve las filas realmente actualizadas: si RLS bloquea
    // la escritura (rol sin permiso), llegan vacías y avisamos en vez de
    // mostrar un "guardado" falso.
    const updates = espacios.map(e =>
      supabase.from('espacios_fisicos').update({
        habilitado_reserva: e.habilitado_reserva,
        tarifa_alquiler: e.tarifa_alquiler !== '' ? parseFloat(e.tarifa_alquiler) : null,
      }).eq('id', e.id).select('id')
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error)?.error;
    const totalActualizados = results.reduce(
      (n, r) => n + (Array.isArray(r.data) ? r.data.length : 0), 0
    );
    setSaving(false);
    if (firstError) {
      toast.error('Error al guardar configuración: ' + firstError.message);
    } else if (totalActualizados === 0) {
      toast.error('Los cambios no se guardaron: tu rol no tiene permisos para editar espacios. Contacta al administrador.');
    } else {
      toast.success('Configuración de espacios guardada');
      setDirty(false);
    }
  };

  const habilitados = espacios.filter(e => e.habilitado_reserva).length;
  const conTarifa = espacios.filter(e => e.tarifa_alquiler !== '').length;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><LayoutDashboard className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xl font-bold">{loading ? '—' : espacios.length}</p>
                <p className="text-xs text-muted-foreground">Total espacios</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><ToggleRight className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xl font-bold">{loading ? '—' : habilitados}</p>
                <p className="text-xs text-muted-foreground">Habilitados para reserva</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10"><DollarSign className="h-5 w-5 text-secondary" /></div>
              <div>
                <p className="text-xl font-bold">{loading ? '—' : conTarifa}</p>
                <p className="text-xs text-muted-foreground">Con tarifa de alquiler</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Config card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-balance">Configuración de espacios reservables</CardTitle>
            <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="whitespace-nowrap text-left px-4 py-3 font-medium text-muted-foreground">Espacio</th>
                    <th className="whitespace-nowrap text-left px-4 py-3 font-medium text-muted-foreground">Sede / Bloque</th>
                    <th className="whitespace-nowrap text-left px-4 py-3 font-medium text-muted-foreground">Capacidad</th>
                    <th className="whitespace-nowrap text-center px-4 py-3 font-medium text-muted-foreground">Habilitar reservas</th>
                    <th className="whitespace-nowrap text-left px-4 py-3 font-medium text-muted-foreground">Tarifa alquiler ($)</th>
                    <th className="whitespace-nowrap text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(6).fill(0).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array(6).fill(0).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : espacios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        <LayoutDashboard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No hay espacios registrados
                      </td>
                    </tr>
                  ) : (
                    espacios.map(e => (
                      <tr key={e.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{e.nombre}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground text-xs">
                          {e.sede || '—'}{e.bloque ? ` · ${e.bloque}` : ''}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {e.capacidad_personas != null ? `${e.capacidad_personas} personas` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={e.habilitado_reserva}
                              onCheckedChange={v => update(e.id, { habilitado_reserva: v })}
                            />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={e.tarifa_alquiler}
                            onChange={ev => update(e.id, { tarifa_alquiler: ev.target.value })}
                            className="w-36 h-8 text-sm"
                            disabled={!e.habilitado_reserva}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {e.habilitado_reserva ? (
                            <Badge className="bg-green-500/10 text-green-700 border-0 text-xs">Habilitado</Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground border-0 text-xs">Deshabilitado</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {dirty && (
          <div className="fixed bottom-4 right-4 z-40">
            <Button onClick={handleSave} disabled={saving} size="sm" className="shadow-lg">
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
