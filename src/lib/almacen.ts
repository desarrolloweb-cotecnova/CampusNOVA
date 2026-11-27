// Cálculo del kardex del módulo Almacén.
//
// El saldo no se guarda en la base de datos: se reconstruye recorriendo los
// movimientos en orden cronológico. La valoración usa el método de costo
// promedio ponderado: cada entrada con costo recalcula el promedio y las
// salidas se valoran al promedio vigente en ese momento.
import type { MovimientoAlmacen, TipoMovimientoAlmacen } from '@/types/types';

/** Categorías sugeridas del catálogo (se puede escribir otra). */
export const CATEGORIAS_ALMACEN = ['Aseo', 'Papelería', 'Cafetería', 'Ferretería', 'Otro'];

/** Unidades de medida sugeridas. */
export const UNIDADES_MEDIDA = [
  'Unidad', 'Caja', 'Paquete', 'Resma', 'Rollo', 'Galón', 'Litro', 'Kilogramo', 'Par', 'Docena', 'Bolsa',
];

/** Conceptos por tipo de movimiento. */
export const CONCEPTOS: Record<TipoMovimientoAlmacen, string[]> = {
  entrada: ['Saldo inicial', 'Compra', 'Donación', 'Devolución', 'Ajuste de inventario (sobrante)'],
  salida: ['Entrega / consumo', 'Préstamo', 'Daño o vencimiento', 'Ajuste de inventario (faltante)'],
};

/** Redondeo a 2 decimales para evitar arrastrar errores de coma flotante. */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Orden cronológico del kardex: fecha, luego hora de registro y por último id. */
export function ordenarMovimientos<T extends Pick<MovimientoAlmacen, 'fecha' | 'created_at' | 'id'>>(movs: T[]): T[] {
  return [...movs].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
}

export interface EstadoSaldo {
  cantidad: number;
  costoPromedio: number;
  valor: number;
}

export interface FilaKardex {
  mov: MovimientoAlmacen;
  /** Costo unitario con el que se valoró la línea. */
  costoUnitario: number;
  /** Valor de la línea (cantidad × costo unitario). */
  valor: number;
  saldo: EstadoSaldo;
}

export interface Kardex {
  /** Saldo antes del primer movimiento del periodo. */
  saldoInicial: EstadoSaldo;
  filas: FilaKardex[];
  totalEntradas: { cantidad: number; valor: number };
  totalSalidas: { cantidad: number; valor: number };
  /** Saldo al cierre del periodo. */
  saldoFinal: EstadoSaldo;
}

const SALDO_CERO: EstadoSaldo = { cantidad: 0, costoPromedio: 0, valor: 0 };

/**
 * Construye el kardex de un producto en una bodega. `movimientos` debe traer
 * TODO el historial de ese producto en esa bodega (no solo el periodo), porque
 * el saldo inicial y el costo promedio dependen de lo anterior.
 *
 * `desde` y `hasta` (yyyy-MM-dd, inclusivos) acotan las filas que se listan.
 */
export function calcularKardex(
  movimientos: MovimientoAlmacen[],
  desde?: string | null,
  hasta?: string | null,
): Kardex {
  let saldo: EstadoSaldo = { ...SALDO_CERO };
  let saldoInicial: EstadoSaldo = { ...SALDO_CERO };
  const filas: FilaKardex[] = [];
  const totalEntradas = { cantidad: 0, valor: 0 };
  const totalSalidas = { cantidad: 0, valor: 0 };

  for (const mov of ordenarMovimientos(movimientos)) {
    if (hasta && mov.fecha > hasta) break;

    const cantidad = Number(mov.cantidad) || 0;
    let costoUnitario: number;
    let valor: number;

    if (mov.tipo === 'entrada') {
      // Una entrada sin costo (p. ej. una donación) entra al promedio vigente.
      costoUnitario = mov.costo_unitario != null ? Number(mov.costo_unitario) : saldo.costoPromedio;
      valor = r2(cantidad * costoUnitario);
      const nuevaCantidad = r2(saldo.cantidad + cantidad);
      const nuevoValor = r2(saldo.valor + valor);
      saldo = {
        cantidad: nuevaCantidad,
        valor: nuevoValor,
        costoPromedio: nuevaCantidad > 0 ? nuevoValor / nuevaCantidad : costoUnitario,
      };
    } else {
      costoUnitario = saldo.costoPromedio;
      const nuevaCantidad = r2(saldo.cantidad - cantidad);
      // Si la salida agota el saldo se lleva el valor restante completo, para
      // que no quede un residuo de centavos por redondeo.
      valor = nuevaCantidad <= 0 ? saldo.valor : r2(cantidad * costoUnitario);
      saldo = {
        cantidad: nuevaCantidad,
        valor: nuevaCantidad <= 0 ? 0 : r2(saldo.valor - valor),
        costoPromedio: saldo.costoPromedio,
      };
    }

    if (desde && mov.fecha < desde) {
      saldoInicial = saldo;
      continue;
    }

    const total = mov.tipo === 'entrada' ? totalEntradas : totalSalidas;
    total.cantidad = r2(total.cantidad + cantidad);
    total.valor = r2(total.valor + valor);
    filas.push({ mov, costoUnitario, valor, saldo });
  }

  return { saldoInicial, filas, totalEntradas, totalSalidas, saldoFinal: saldo };
}

/** Agrupa movimientos por producto. */
export function agruparPorProducto(movs: MovimientoAlmacen[]): Map<string, MovimientoAlmacen[]> {
  const mapa = new Map<string, MovimientoAlmacen[]>();
  for (const m of movs) {
    const lista = mapa.get(m.producto_id);
    if (lista) lista.push(m);
    else mapa.set(m.producto_id, [m]);
  }
  return mapa;
}

/** Fecha local de hoy en formato yyyy-MM-dd. */
export function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Formatea cantidades: sin decimales si es entera, hasta 2 si no. */
export function formatCantidad(n: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n);
}

/** Formato de moneda con centavos, para costos unitarios. */
export function formatPesos(n: number, decimales = 0): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}
