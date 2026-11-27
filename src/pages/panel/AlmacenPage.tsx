// Módulo Almacén — Kardex de insumos de las bodegas (exclusivo de administradores).
//
// El administrador registra a mano las entradas y salidas de cada bodega; el
// saldo, el costo promedio y el kardex se calculan a partir de esos
// movimientos (ver `@/lib/almacen`). Los movimientos no se editan ni se borran:
// un error se corrige con un movimiento de ajuste, que queda en el kardex.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, Edit, FileText, History,
  Plus, Printer, Search, Trash2, Warehouse, X,
} from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { fetchAllRows } from '@/lib/supabase-fetch';
import {
  agruparPorProducto, calcularKardex, CATEGORIAS_ALMACEN, CONCEPTOS, formatCantidad, formatPesos,
  hoyISO, ordenarMovimientos, UNIDADES_MEDIDA, type EstadoSaldo,
} from '@/lib/almacen';
import { generarKardexPDF, generarSaldosPDF } from '@/lib/reporte-almacen';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import type { BodegaAlmacen, MovimientoAlmacen, ProductoAlmacen, TipoMovimientoAlmacen } from '@/types/types';
import { toast } from 'sonner';

const TODAS = 'todas';

/**
 * Convierte el texto de un campo numérico escrito a la colombiana o no:
 * "1.500" y "1500" son mil quinientos; "1.500,5", "1500,5" y "1500.5" llevan
 * decimales. Devuelve NaN si no es un número.
 */
function parseNumero(v: string): number {
  let t = v.trim().replace(/\s|\$/g, '');
  if (!t) return Number.NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

function EstadoStock({ saldo, minimo }: { saldo: number; minimo: number }) {
  if (saldo <= 0) return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Agotado</Badge>;
  if (minimo > 0 && saldo <= minimo) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Bajo mínimo</Badge>;
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disponible</Badge>;
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AlmacenPage() {
  return (
    <AppLayout>
      <RoleGuard allowedRoles={['admin']}>
        <AlmacenContenido />
      </RoleGuard>
    </AppLayout>
  );
}

function AlmacenContenido() {
  const { profile } = useAuth();
  const elaboradoPor = profile?.nombre?.trim() || profile?.email || '';

  const [bodegas, setBodegas] = useState<BodegaAlmacen[]>([]);
  const [bodegaId, setBodegaId] = useState<string>('');
  const [productos, setProductos] = useState<ProductoAlmacen[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoAlmacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('saldos');

  // Diálogo de movimiento
  const [movTipo, setMovTipo] = useState<TipoMovimientoAlmacen | null>(null);
  // Producto que se abre en la pestaña Kardex
  const [kardexProductoId, setKardexProductoId] = useState('');

  const bodega = bodegas.find(b => b.id === bodegaId) ?? null;

  const loadCatalogos = useCallback(async () => {
    const [{ data: bods, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
      supabase.from('almacen_bodegas').select('*').eq('activo', true).order('nombre'),
      fetchAllRows<ProductoAlmacen>(() => supabase.from('almacen_productos').select('*').order('codigo').order('id')),
    ]);
    if (e1 || e2) {
      toast.error('No se pudo cargar el almacén', { description: (e1 || e2)?.message });
    }
    const lista = (bods ?? []) as BodegaAlmacen[];
    setBodegas(lista);
    setProductos(prods);
    setBodegaId(actual => (actual && lista.some(b => b.id === actual) ? actual : lista[0]?.id ?? ''));
  }, []);

  const loadMovimientos = useCallback(async () => {
    if (!bodegaId) { setMovimientos([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await fetchAllRows<MovimientoAlmacen>(() =>
      supabase
        .from('almacen_movimientos')
        .select('*')
        .eq('bodega_id', bodegaId)
        .order('fecha')
        .order('created_at')
        .order('id'),
    );
    if (error) toast.error('No se pudieron cargar los movimientos', { description: error.message });
    setMovimientos(data);
    setLoading(false);
  }, [bodegaId]);

  useEffect(() => { loadCatalogos(); }, [loadCatalogos]);
  useEffect(() => { loadMovimientos(); }, [loadMovimientos]);
  useRealtimeTable('almacen_productos', loadCatalogos);
  useRealtimeTable('almacen_movimientos', loadMovimientos);

  const movsPorProducto = useMemo(() => agruparPorProducto(movimientos), [movimientos]);

  /** Saldo actual (a hoy) de cada producto en la bodega seleccionada. */
  const saldosActuales = useMemo(() => {
    const mapa = new Map<string, EstadoSaldo>();
    for (const [pid, movs] of movsPorProducto) mapa.set(pid, calcularKardex(movs).saldoFinal);
    return mapa;
  }, [movsPorProducto]);

  const verKardex = (productoId: string) => {
    setKardexProductoId(productoId);
    setTab('kardex');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Almacén — Kardex de insumos</h2>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Entradas, salidas y saldos de los insumos de aseo, papelería y demás elementos de consumo de cada bodega.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMovTipo('entrada')} disabled={!bodega}>
            <ArrowDownToLine className="h-4 w-4 mr-1.5" /> Registrar entrada
          </Button>
          <Button variant="outline" onClick={() => setMovTipo('salida')} disabled={!bodega}>
            <ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Registrar salida
          </Button>
        </div>
      </div>

      {/* Selector de bodega */}
      <div className="flex flex-wrap gap-2">
        {bodegas.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBodegaId(b.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
              b.id === bodegaId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-accent',
            )}
          >
            <Warehouse className="h-4 w-4" />
            {b.nombre}
          </button>
        ))}
        {bodegas.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            No hay bodegas configuradas. Verifica que se haya aplicado la migración del módulo Almacén.
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="saldos" className="gap-1.5"><Boxes className="h-3.5 w-3.5" /> Saldos</TabsTrigger>
          <TabsTrigger value="kardex" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Kardex</TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-1.5"><History className="h-3.5 w-3.5" /> Movimientos</TabsTrigger>
          <TabsTrigger value="productos" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="saldos" className="mt-4">
          {bodega && (
            <SaldosTab
              bodega={bodega}
              productos={productos}
              movsPorProducto={movsPorProducto}
              loading={loading}
              elaboradoPor={elaboradoPor}
              onVerKardex={verKardex}
            />
          )}
        </TabsContent>

        <TabsContent value="kardex" className="mt-4">
          {bodega && (
            <KardexTab
              bodega={bodega}
              productos={productos}
              movsPorProducto={movsPorProducto}
              productoId={kardexProductoId}
              onProductoChange={setKardexProductoId}
              elaboradoPor={elaboradoPor}
            />
          )}
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <MovimientosTab productos={productos} movimientos={movimientos} loading={loading} />
        </TabsContent>

        <TabsContent value="productos" className="mt-4">
          <ProductosTab productos={productos} saldos={saldosActuales} onChange={loadCatalogos} />
        </TabsContent>
      </Tabs>

      {bodega && movTipo && (
        <MovimientoDialog
          tipo={movTipo}
          bodega={bodega}
          productos={productos}
          saldos={saldosActuales}
          movsPorProducto={movsPorProducto}
          onClose={() => setMovTipo(null)}
          onSaved={() => { setMovTipo(null); loadMovimientos(); }}
        />
      )}
    </div>
  );
}

// ─── Saldos ──────────────────────────────────────────────────────────────────

function SaldosTab({
  bodega, productos, movsPorProducto, loading, elaboradoPor, onVerKardex,
}: {
  bodega: BodegaAlmacen;
  productos: ProductoAlmacen[];
  movsPorProducto: Map<string, MovimientoAlmacen[]>;
  loading: boolean;
  elaboradoPor: string;
  onVerKardex: (productoId: string) => void;
}) {
  const [fechaCorte, setFechaCorte] = useState(hoyISO());
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState(TODAS);
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const filas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productos
      .map(p => {
        const movs = movsPorProducto.get(p.id) ?? [];
        const k = calcularKardex(movs, null, fechaCorte || null);
        return { producto: p, saldo: k.saldoFinal, tieneMovs: movs.length > 0 };
      })
      // Productos inactivos solo aparecen si todavía tienen existencias o historia.
      .filter(f => f.producto.activo || f.tieneMovs)
      .filter(f => categoria === TODAS || f.producto.categoria === categoria)
      .filter(f => !q || f.producto.nombre.toLowerCase().includes(q) || f.producto.codigo.toLowerCase().includes(q))
      .filter(f => !soloAlertas || f.saldo.cantidad <= Number(f.producto.stock_minimo));
  }, [productos, movsPorProducto, fechaCorte, search, categoria, soloAlertas]);

  const categorias = useMemo(() => [...new Set(productos.map(p => p.categoria))].sort(), [productos]);
  const valorTotal = filas.reduce((s, f) => s + f.saldo.valor, 0);
  const alertas = filas.filter(f => f.saldo.cantidad <= Number(f.producto.stock_minimo)).length;

  const imprimir = async () => {
    setImprimiendo(true);
    try {
      await generarSaldosPDF({ bodega, fechaCorte: fechaCorte || hoyISO(), filas, elaboradoPor });
    } catch (err) {
      toast.error('No se pudo generar el reporte', { description: (err as Error).message });
    } finally { setImprimiendo(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Resumen titulo="Productos listados" valor={String(filas.length)} />
        <Resumen titulo="Valor del inventario" valor={formatPesos(valorTotal)} />
        <Resumen titulo="Agotados o bajo mínimo" valor={String(alertas)} alerta={alertas > 0} />
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Saldos — {bodega.nombre}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Existencias y valor a la fecha de corte. Haz clic en un producto para ver su kardex.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={imprimir} disabled={imprimiendo || loading} className="h-9 shrink-0">
              <Printer className="h-4 w-4 mr-1.5" /> {imprimiendo ? 'Generando…' : 'Imprimir saldos'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por código o nombre…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas las categorías</SelectItem>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Corte al</Label>
              <Input type="date" value={fechaCorte} max={hoyISO()} onChange={e => setFechaCorte(e.target.value)} className="h-9" />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground w-fit cursor-pointer">
            <Switch checked={soloAlertas} onCheckedChange={setSoloAlertas} />
            Solo agotados o bajo stock mínimo
          </label>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Costo prom.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Valor total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <FilasCargando columnas={8} />
                ) : filas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {productos.length === 0 ? 'Crea primero los productos en la pestaña Productos.' : 'Sin resultados'}
                    </TableCell>
                  </TableRow>
                ) : filas.map(f => (
                  <TableRow key={f.producto.id} className="cursor-pointer" onClick={() => onVerKardex(f.producto.id)}>
                    <TableCell className="font-mono text-xs">{f.producto.codigo}</TableCell>
                    <TableCell className="font-medium">
                      {f.producto.nombre}
                      {!f.producto.activo && <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>}
                    </TableCell>
                    <TableCell>{f.producto.categoria}</TableCell>
                    <TableCell>{f.producto.unidad_medida}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCantidad(f.saldo.cantidad)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPesos(f.saldo.costoPromedio, 2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPesos(f.saldo.valor)}</TableCell>
                    <TableCell><EstadoStock saldo={f.saldo.cantidad} minimo={Number(f.producto.stock_minimo)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Resumen({ titulo, valor, alerta = false }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className={cn('text-xl font-bold mt-1 tabular-nums', alerta && 'text-destructive')}>{valor}</p>
      </CardContent>
    </Card>
  );
}

function FilasCargando({ columnas }: { columnas: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columnas }).map((__, j) => (
            <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-16" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Kardex ──────────────────────────────────────────────────────────────────

function KardexTab({
  bodega, productos, movsPorProducto, productoId, onProductoChange, elaboradoPor,
}: {
  bodega: BodegaAlmacen;
  productos: ProductoAlmacen[];
  movsPorProducto: Map<string, MovimientoAlmacen[]>;
  productoId: string;
  onProductoChange: (id: string) => void;
  elaboradoPor: string;
}) {
  const anio = new Date().getFullYear();
  const [desde, setDesde] = useState(`${anio}-01-01`);
  const [hasta, setHasta] = useState(hoyISO());
  const [imprimiendo, setImprimiendo] = useState(false);

  const producto = productos.find(p => p.id === productoId) ?? null;
  const kardex = useMemo(
    () => (producto ? calcularKardex(movsPorProducto.get(producto.id) ?? [], desde || null, hasta || null) : null),
    [producto, movsPorProducto, desde, hasta],
  );

  const opciones = useMemo(
    () => productos.filter(p => p.activo || movsPorProducto.has(p.id)),
    [productos, movsPorProducto],
  );

  const rangoInvalido = !!desde && !!hasta && desde > hasta;

  const imprimir = async (todos: boolean) => {
    if (rangoInvalido) { toast.error('La fecha inicial es posterior a la final'); return; }
    const lista = todos
      ? productos.filter(p => movsPorProducto.has(p.id)).sort((a, b) => a.codigo.localeCompare(b.codigo))
      : producto ? [producto] : [];
    if (lista.length === 0) {
      toast.error(todos ? 'La bodega aún no tiene movimientos' : 'Selecciona un producto');
      return;
    }
    setImprimiendo(true);
    try {
      await generarKardexPDF({
        bodega,
        desde: desde || null,
        hasta: hasta || null,
        elaboradoPor,
        productos: lista.map(p => ({
          producto: p,
          kardex: calcularKardex(movsPorProducto.get(p.id) ?? [], desde || null, hasta || null),
        })),
      });
    } catch (err) {
      toast.error('No se pudo generar el kardex', { description: (err as Error).message });
    } finally { setImprimiendo(false); }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Kardex — {bodega.nombre}</CardTitle>
            <CardDescription className="text-xs mt-0.5">Valorado por costo promedio ponderado.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-9" onClick={() => imprimir(false)} disabled={imprimiendo || !producto}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir kardex
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => imprimir(true)} disabled={imprimiendo}>
              <Printer className="h-4 w-4 mr-1.5" /> Kardex completo de la bodega
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div className="md:col-span-2">
            <Select value={productoId} onValueChange={onProductoChange}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecciona un producto…" /></SelectTrigger>
              <SelectContent>
                {opciones.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="h-9" />
          </div>
        </div>
        {rangoInvalido && <p className="text-xs text-destructive mt-2">La fecha inicial es posterior a la final.</p>}
      </CardHeader>
      <CardContent className="p-0">
        {!producto || !kardex ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Selecciona un producto para ver su kardex.
          </p>
        ) : (
          <>
            <div className="px-4 pb-3 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>Categoría: <b className="text-foreground">{producto.categoria}</b></span>
              <span>Unidad: <b className="text-foreground">{producto.unidad_medida}</b></span>
              <span>Stock mínimo: <b className="text-foreground">{formatCantidad(Number(producto.stock_minimo))}</b></span>
            </div>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-bottom">Fecha</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Concepto</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Documento</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Proveedor / Recibe</TableHead>
                    <TableHead colSpan={3} className="text-center border-l bg-green-50 dark:bg-green-950/30">Entradas</TableHead>
                    <TableHead colSpan={3} className="text-center border-l bg-red-50 dark:bg-red-950/30">Salidas</TableHead>
                    <TableHead colSpan={3} className="text-center border-l bg-muted">Saldo</TableHead>
                  </TableRow>
                  <TableRow>
                    {['Cant.', 'V. unit.', 'V. total', 'Cant.', 'V. unit.', 'V. total', 'Cant.', 'C. prom.', 'V. total'].map((h, i) => (
                      <TableHead key={i} className={cn('text-right whitespace-nowrap', i % 3 === 0 && 'border-l')}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={10}>{desde ? `Saldo anterior al ${formatDate(desde)}` : 'Saldo inicial'}</TableCell>
                    <CeldasSaldo saldo={kardex.saldoInicial} />
                  </TableRow>
                  {kardex.filas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-6">Sin movimientos en el periodo.</TableCell>
                    </TableRow>
                  )}
                  {kardex.filas.map(f => {
                    const entrada = f.mov.tipo === 'entrada';
                    const vals = [formatCantidad(Number(f.mov.cantidad)), formatPesos(f.costoUnitario, 2), formatPesos(f.valor)];
                    return (
                      <TableRow key={f.mov.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(f.mov.fecha)}</TableCell>
                        <TableCell title={f.mov.observaciones ?? undefined}>{f.mov.concepto}</TableCell>
                        <TableCell>{f.mov.documento || '—'}</TableCell>
                        <TableCell>{f.mov.tercero || '—'}</TableCell>
                        {[0, 1, 2].map(i => (
                          <TableCell key={`e${i}`} className={cn('text-right tabular-nums whitespace-nowrap', i === 0 && 'border-l')}>
                            {entrada ? vals[i] : ''}
                          </TableCell>
                        ))}
                        {[0, 1, 2].map(i => (
                          <TableCell key={`s${i}`} className={cn('text-right tabular-nums whitespace-nowrap', i === 0 && 'border-l')}>
                            {entrada ? '' : vals[i]}
                          </TableCell>
                        ))}
                        <CeldasSaldo saldo={f.saldo} />
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4}>Totales del periodo / saldo final</TableCell>
                    <TableCell className="text-right tabular-nums border-l">{formatCantidad(kardex.totalEntradas.cantidad)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">{formatPesos(kardex.totalEntradas.valor)}</TableCell>
                    <TableCell className="text-right tabular-nums border-l">{formatCantidad(kardex.totalSalidas.cantidad)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">{formatPesos(kardex.totalSalidas.valor)}</TableCell>
                    <CeldasSaldo saldo={kardex.saldoFinal} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CeldasSaldo({ saldo }: { saldo: EstadoSaldo }) {
  return (
    <>
      <TableCell className="text-right tabular-nums whitespace-nowrap border-l font-semibold">{formatCantidad(saldo.cantidad)}</TableCell>
      <TableCell className="text-right tabular-nums whitespace-nowrap">{formatPesos(saldo.costoPromedio, 2)}</TableCell>
      <TableCell className="text-right tabular-nums whitespace-nowrap">{formatPesos(saldo.valor)}</TableCell>
    </>
  );
}

// ─── Historial de movimientos ────────────────────────────────────────────────

const MAX_MOVS_VISIBLES = 300;

function MovimientosTab({
  productos, movimientos, loading,
}: {
  productos: ProductoAlmacen[];
  movimientos: MovimientoAlmacen[];
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState(TODAS);
  const porId = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ordenarMovimientos(movimientos)
      .reverse()
      .filter(m => tipo === TODAS || m.tipo === tipo)
      .filter(m => {
        if (!q) return true;
        const p = porId.get(m.producto_id);
        return [p?.nombre, p?.codigo, m.concepto, m.documento, m.tercero, m.registrado_por_nombre]
          .some(v => v?.toLowerCase().includes(q));
      });
  }, [movimientos, tipo, search, porId]);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Historial de movimientos</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Los movimientos no se editan ni se eliminan. Para corregir un error registra un ajuste de inventario.
        </CardDescription>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar producto, documento, tercero…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Entradas y salidas</SelectItem>
              <SelectItem value="entrada">Solo entradas</SelectItem>
              <SelectItem value="salida">Solo salidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right whitespace-nowrap">Costo unit.</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Proveedor / Recibe</TableHead>
                <TableHead>Registró</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <FilasCargando columnas={9} />
              ) : filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
              ) : filtrados.slice(0, MAX_MOVS_VISIBLES).map(m => {
                const p = porId.get(m.producto_id);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(m.fecha)}</TableCell>
                    <TableCell>
                      {m.tipo === 'entrada'
                        ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Entrada</Badge>
                        : <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Salida</Badge>}
                    </TableCell>
                    <TableCell className="font-medium">{p ? `${p.codigo} — ${p.nombre}` : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCantidad(Number(m.cantidad))} {p?.unidad_medida ?? ''}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.costo_unitario != null ? formatPesos(Number(m.costo_unitario), 2) : '—'}</TableCell>
                    <TableCell>{m.concepto}</TableCell>
                    <TableCell>{m.documento || '—'}</TableCell>
                    <TableCell>{m.tercero || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap" title={formatDateTime(m.created_at)}>
                      {m.registrado_por_nombre || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {filtrados.length > MAX_MOVS_VISIBLES
            ? `Mostrando los ${MAX_MOVS_VISIBLES} más recientes de ${filtrados.length}. Usa la búsqueda o el kardex para ver el resto.`
            : `${filtrados.length} movimiento${filtrados.length !== 1 ? 's' : ''}`}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Registro de entradas y salidas ──────────────────────────────────────────

interface LineaForm {
  key: string;
  producto_id: string;
  cantidad: string;
  costo_unitario: string;
}

const nuevaLinea = (): LineaForm => ({
  key: Math.random().toString(36).slice(2),
  producto_id: '',
  cantidad: '',
  costo_unitario: '',
});

function MovimientoDialog({
  tipo, bodega, productos, saldos, movsPorProducto, onClose, onSaved,
}: {
  tipo: TipoMovimientoAlmacen;
  bodega: BodegaAlmacen;
  productos: ProductoAlmacen[];
  saldos: Map<string, EstadoSaldo>;
  movsPorProducto: Map<string, MovimientoAlmacen[]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const entrada = tipo === 'entrada';
  const [fecha, setFecha] = useState(hoyISO());
  const [concepto, setConcepto] = useState(CONCEPTOS[tipo][entrada ? 1 : 0]);
  const [documento, setDocumento] = useState('');
  const [tercero, setTercero] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()]);
  const [saving, setSaving] = useState(false);

  // En una salida solo tiene sentido elegir productos con existencias.
  const opciones = useMemo(
    () => productos.filter(p => p.activo && (entrada || (saldos.get(p.id)?.cantidad ?? 0) > 0)),
    [productos, saldos, entrada],
  );
  const porId = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);

  const setLinea = (key: string, cambios: Partial<LineaForm>) =>
    setLineas(ls => ls.map(l => (l.key === key ? { ...l, ...cambios } : l)));

  const guardar = async () => {
    if (!fecha) { toast.error('Indica la fecha del movimiento'); return; }
    if (fecha > hoyISO()) { toast.error('La fecha no puede ser futura'); return; }
    if (!concepto) { toast.error('Selecciona el concepto'); return; }

    const usadas = new Set<string>();
    const filas: { producto_id: string; cantidad: number; costo_unitario: number | null }[] = [];
    for (const [i, l] of lineas.entries()) {
      const n = i + 1;
      const p = porId.get(l.producto_id);
      if (!p) { toast.error(`Línea ${n}: selecciona un producto`); return; }
      if (usadas.has(p.id)) { toast.error(`"${p.nombre}" está repetido; súmalo en una sola línea`); return; }
      usadas.add(p.id);
      const cantidad = parseNumero(l.cantidad);
      if (!(cantidad > 0)) { toast.error(`Línea ${n}: la cantidad debe ser mayor que cero`); return; }
      let costo: number | null = null;
      if (entrada && l.costo_unitario.trim()) {
        costo = parseNumero(l.costo_unitario);
        if (!(costo >= 0)) { toast.error(`Línea ${n}: costo unitario inválido`); return; }
      }
      if (!entrada) {
        const disp = saldos.get(p.id)?.cantidad ?? 0;
        if (cantidad > disp) {
          toast.error(`Saldo insuficiente de "${p.nombre}"`, { description: `Disponible: ${formatCantidad(disp)} ${p.unidad_medida}` });
          return;
        }
      }
      const movs = movsPorProducto.get(p.id) ?? [];
      const ultima = movs.reduce((max, m) => (m.fecha > max ? m.fecha : max), '');
      if (ultima && fecha < ultima) {
        toast.error(`"${p.nombre}" ya tiene movimientos al ${formatDate(ultima)}`, {
          description: 'El kardex es cronológico: la fecha no puede ser anterior al último movimiento.',
        });
        return;
      }
      filas.push({ producto_id: p.id, cantidad, costo_unitario: costo });
    }

    setSaving(true);
    const lote_id = crypto.randomUUID();
    const { error } = await supabase.from('almacen_movimientos').insert(
      filas.map(f => ({
        ...f,
        bodega_id: bodega.id,
        tipo,
        fecha,
        concepto,
        documento: documento.trim() || null,
        tercero: tercero.trim() || null,
        observaciones: observaciones.trim() || null,
        lote_id,
        registrado_por: profile?.id ?? null,
        registrado_por_nombre: profile?.nombre?.trim() || profile?.email || null,
      })),
    );
    setSaving(false);
    if (error) {
      toast.error('No se pudo registrar el movimiento', { description: error.message });
      return;
    }
    toast.success(`${entrada ? 'Entrada' : 'Salida'} registrada`, {
      description: `${filas.length} producto${filas.length !== 1 ? 's' : ''} en ${bodega.nombre}`,
    });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entrada ? 'Registrar entrada' : 'Registrar salida'} — {bodega.nombre}</DialogTitle>
          <DialogDescription>
            {entrada
              ? 'Ingreso de insumos a la bodega (compra, donación, devolución o saldo inicial).'
              : 'Entrega o consumo de insumos. Se valora al costo promedio vigente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} max={hoyISO()} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Concepto</Label>
              <Select value={concepto} onValueChange={setConcepto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONCEPTOS[tipo].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{entrada ? 'Factura / remisión' : 'N.º de solicitud / vale'}</Label>
              <Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{entrada ? 'Proveedor' : 'Dependencia o persona que recibe'}</Label>
            <Input value={tercero} onChange={e => setTercero(e.target.value)} placeholder={entrada ? 'Nombre del proveedor' : 'Ej.: Servicios generales — Juan Pérez'} />
          </div>

          <div className="space-y-2">
            <Label>Productos</Label>
            {lineas.map((l, i) => {
              const p = porId.get(l.producto_id);
              const disp = p ? saldos.get(p.id)?.cantidad ?? 0 : null;
              const prom = p ? saldos.get(p.id)?.costoPromedio ?? 0 : null;
              return (
                <div key={l.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      <Select value={l.producto_id} onValueChange={v => setLinea(l.key, { producto_id: v })}>
                        <SelectTrigger><SelectValue placeholder={`Producto ${i + 1}`} /></SelectTrigger>
                        <SelectContent>
                          {opciones.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nombre} ({o.unidad_medida})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon" className="shrink-0"
                      disabled={lineas.length === 1}
                      onClick={() => setLineas(ls => ls.filter(x => x.key !== l.key))}
                      title="Quitar línea"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className={cn('grid gap-2', entrada ? 'grid-cols-2' : 'grid-cols-1')}>
                    <Input
                      inputMode="decimal" placeholder="Cantidad" value={l.cantidad}
                      onChange={e => setLinea(l.key, { cantidad: e.target.value })}
                    />
                    {entrada && (
                      <Input
                        inputMode="decimal" placeholder="Costo unitario (COP)" value={l.costo_unitario}
                        onChange={e => setLinea(l.key, { costo_unitario: e.target.value })}
                      />
                    )}
                  </div>
                  {p && (
                    <p className="text-xs text-muted-foreground">
                      Saldo actual: <b>{formatCantidad(disp ?? 0)} {p.unidad_medida}</b> · Costo promedio: {formatPesos(prom ?? 0, 2)}
                      {entrada && !l.costo_unitario.trim() && ' · Sin costo: entra al costo promedio vigente.'}
                    </p>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => setLineas(ls => [...ls, nuevaLinea()])}>
              <Plus className="h-4 w-4 mr-1.5" /> Agregar producto
            </Button>
            {opciones.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {entrada ? 'No hay productos activos. Créalos en la pestaña Productos.' : 'No hay productos con existencias en esta bodega.'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Catálogo de productos ───────────────────────────────────────────────────

interface ProductoForm {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  stock_minimo: string;
  descripcion: string;
  activo: boolean;
}

const FORM_VACIO: ProductoForm = {
  codigo: '', nombre: '', categoria: 'Aseo', unidad_medida: 'Unidad', stock_minimo: '0', descripcion: '', activo: true,
};

function ProductosTab({
  productos, saldos, onChange,
}: {
  productos: ProductoAlmacen[];
  saldos: Map<string, EstadoSaldo>;
  onChange: () => void;
}) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProductoAlmacen | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductoForm>(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ProductoAlmacen | null>(null);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productos.filter(p => !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
  }, [productos, search]);

  const abrirNuevo = () => { setEditing(null); setForm(FORM_VACIO); setOpen(true); };
  const abrirEditar = (p: ProductoAlmacen) => {
    setEditing(p);
    setForm({
      codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, unidad_medida: p.unidad_medida,
      stock_minimo: String(p.stock_minimo ?? 0), descripcion: p.descripcion ?? '', activo: p.activo,
    });
    setOpen(true);
  };

  const guardar = async () => {
    const codigo = form.codigo.trim().toUpperCase();
    const nombre = form.nombre.trim();
    if (!codigo || !nombre) { toast.error('El código y el nombre son obligatorios'); return; }
    const stock = parseNumero(form.stock_minimo || '0');
    if (!(stock >= 0)) { toast.error('El stock mínimo debe ser un número mayor o igual a cero'); return; }
    const datos = {
      codigo,
      nombre,
      categoria: form.categoria.trim() || 'Otro',
      unidad_medida: form.unidad_medida.trim() || 'Unidad',
      stock_minimo: stock,
      descripcion: form.descripcion.trim() || null,
      activo: form.activo,
    };
    setSaving(true);
    const { error } = editing
      ? await supabase.from('almacen_productos').update(datos).eq('id', editing.id)
      : await supabase.from('almacen_productos').insert(datos);
    setSaving(false);
    if (error) {
      const dup = error.code === '23505';
      toast.error(dup ? `Ya existe un producto con el código ${codigo}` : 'No se pudo guardar', { description: dup ? undefined : error.message });
      return;
    }
    toast.success(editing ? 'Producto actualizado' : 'Producto creado');
    setOpen(false);
    onChange();
  };

  const eliminar = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from('almacen_productos').delete().eq('id', deleteItem.id);
    if (error) {
      toast.error('No se pudo eliminar', {
        description: error.code === '23503'
          ? 'El producto tiene movimientos en el kardex. Desactívalo en lugar de eliminarlo.'
          : error.message,
      });
    } else {
      toast.success('Producto eliminado');
      onChange();
    }
    setDeleteItem(null);
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Catálogo de productos</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Común a las dos bodegas; cada bodega lleva su propio kardex. El saldo mostrado es el de la bodega seleccionada.
              </CardDescription>
            </div>
            <Button size="sm" onClick={abrirNuevo} className="h-9 shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> Nuevo producto
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Stock mín.</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sin productos</TableCell></TableRow>
                ) : filtrados.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>{p.unidad_medida}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCantidad(Number(p.stock_minimo))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCantidad(saldos.get(p.id)?.cantidad ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={p.activo ? 'default' : 'secondary'} className="text-xs">{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(p)} title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteItem(p)} title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
            {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="ASE-001" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Jabón líquido para manos" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Input list="almacen-categorias" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} />
                <datalist id="almacen-categorias">
                  {CATEGORIAS_ALMACEN.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Unidad</Label>
                <Input list="almacen-unidades" value={form.unidad_medida} onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))} />
                <datalist id="almacen-unidades">
                  {UNIDADES_MEDIDA.map(u => <option key={u} value={u} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Stock mínimo</Label>
                <Input inputMode="decimal" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional: presentación, marca, referencia…" />
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2.5">
              <Label>Activo</Label>
              <Switch checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={o => { if (!o) setDeleteItem(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteItem?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se pueden eliminar productos sin movimientos. Si ya tiene historia en el kardex, desactívalo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
