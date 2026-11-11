// Reportes imprimibles del módulo Almacén: kardex por producto y relación de
// saldos de una bodega. Mismo formato de impresión que las actas (papel Carta,
// encabezado sin relleno, logo, numeración de páginas y bloque de firmas) para
// que sirvan como soporte de auditoría.
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { BodegaAlmacen, ProductoAlmacen } from '@/types/types';
import { altoBloqueFirmas, anchosColumnas, cargarLogo, dibujarFirmas, FORMATO_IMPRESION, type FirmaActa, slug } from '@/lib/acta-comun';
import { formatCantidad, formatPesos, type EstadoSaldo, type Kardex } from '@/lib/almacen';
import { formatDate } from '@/lib/utils';

const MARGEN = 12;
const HEADER_BOTTOM = 26;

type Logo = Awaited<ReturnType<typeof cargarLogo>>;

function crearEncabezado(doc: jsPDF, logo: Logo, titulo: string, subtitulo: string) {
  const pageW = doc.internal.pageSize.getWidth();
  return () => {
    let textX = MARGEN;
    if (logo) {
      const logoH = 13;
      const logoW = logoH * logo.ratio;
      doc.addImage(logo.dataUrl, 'PNG', MARGEN, 7, logoW, logoH);
      textX = MARGEN + logoW + 5;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(titulo, textX, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(subtitulo, textX, 18.5);
    doc.setFontSize(8);
    doc.text(
      `Generado: ${new Date().toLocaleString('es-CO')}`,
      pageW - MARGEN,
      18.5,
      { align: 'right' },
    );
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(MARGEN, 22, pageW - MARGEN, 22);
  };
}

function numerarPaginas(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${p} de ${total}`, pageW - MARGEN, pageH - 7, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
}

function finalY(doc: jsPDF, porDefecto: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? porDefecto;
}

/** Firmas de los reportes de almacén. */
function firmasAuditoria(elaboradoPor: string): FirmaActa[] {
  return [
    { nombre: elaboradoPor, cargo: 'Elaboró — Administrador de almacén' },
    { nombre: '', cargo: 'Revisó — Auditoría / Control interno' },
    { nombre: '', cargo: 'Vo. Bo. Rector' },
  ];
}

function dibujarFirmasAlFinal(doc: jsPDF, firmas: FirmaActa[], y: number, drawHeader: () => void) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const alto = altoBloqueFirmas(doc, firmas, pageW, MARGEN) + 6;
  if (y + alto > pageH - 14) {
    doc.addPage();
    drawHeader();
    y = HEADER_BOTTOM;
  }
  dibujarFirmas(doc, firmas, pageW, MARGEN, y + 4);
}

const ESTILOS_TABLA = {
  theme: 'grid' as const,
  headStyles: {
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: [0, 0, 0] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 7.5,
    halign: 'center' as const,
    valign: 'middle' as const,
    lineColor: [150, 150, 150] as [number, number, number],
    lineWidth: 0.1,
  },
  styles: {
    fontSize: 7.3,
    cellPadding: 1.1,
    overflow: 'linebreak' as const,
    valign: 'middle' as const,
    textColor: [0, 0, 0] as [number, number, number],
    lineColor: [210, 210, 210] as [number, number, number],
    lineWidth: 0.1,
  },
};

const FILA_RESALTADA = { fillColor: [238, 238, 238] as [number, number, number], fontStyle: 'bold' as const };

function textoPeriodo(desde?: string | null, hasta?: string | null): string {
  if (desde && hasta) return `${formatDate(desde)} a ${formatDate(hasta)}`;
  if (desde) return `Desde ${formatDate(desde)}`;
  if (hasta) return `Hasta ${formatDate(hasta)}`;
  return 'Todo el historial';
}

// ─── Kardex ──────────────────────────────────────────────────────────────────

export interface KardexProductoPDF {
  producto: ProductoAlmacen;
  kardex: Kardex;
}

export interface ReporteKardexParams {
  bodega: BodegaAlmacen;
  productos: KardexProductoPDF[];
  desde?: string | null;
  hasta?: string | null;
  elaboradoPor: string;
}

/**
 * Kardex en Carta horizontal. Con un producto es el kardex individual; con
 * varios es el kardex completo de la bodega, un bloque por producto.
 */
export async function generarKardexPDF({
  bodega, productos, desde, hasta, elaboradoPor,
}: ReporteKardexParams): Promise<void> {
  const logo = await cargarLogo();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: FORMATO_IMPRESION });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const anchoUtil = pageW - MARGEN * 2;
  const drawHeader = crearEncabezado(doc, logo, 'Kardex de Almacén', `CampusNOVA — COTECNOVA · ${bodega.nombre}`);
  drawHeader();

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bodega: ${bodega.nombre} (${bodega.codigo})`, MARGEN, 28);
  doc.text(`Periodo: ${textoPeriodo(desde, hasta)}`, MARGEN + anchoUtil / 3, 28);
  doc.text(`Método de valoración: Costo promedio ponderado`, MARGEN + (anchoUtil * 2) / 3, 28);
  let y = 32;

  const head: RowInput[] = [
    [
      { content: 'Fecha', rowSpan: 2 },
      { content: 'Concepto', rowSpan: 2 },
      { content: 'Documento', rowSpan: 2 },
      { content: 'Proveedor / Recibe', rowSpan: 2 },
      { content: 'Entradas', colSpan: 3 },
      { content: 'Salidas', colSpan: 3 },
      { content: 'Saldo', colSpan: 3 },
    ],
    ['Cant.', 'V. unit.', 'V. total', 'Cant.', 'V. unit.', 'V. total', 'Cant.', 'C. prom.', 'V. total'],
  ];
  const anchos = anchosColumnas([15, 30, 20, 30, 12, 17, 19, 12, 17, 19, 13, 17, 20], anchoUtil);
  const columnStyles = Object.fromEntries(
    anchos.map((w, i) => [i, { cellWidth: w, halign: i >= 4 ? ('right' as const) : ('left' as const) }]),
  );
  const saldoCeldas = (s: EstadoSaldo) => [
    formatCantidad(s.cantidad), formatPesos(s.costoPromedio, 2), formatPesos(s.valor),
  ];

  productos.forEach(({ producto, kardex }, idx) => {
    // Título del producto; salta de página si no cabe con unas filas debajo.
    if (idx > 0) y += 6;
    if (y + 30 > pageH - 14) {
      doc.addPage();
      drawHeader();
      y = HEADER_BOTTOM + 2;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${producto.codigo} — ${producto.nombre}`, MARGEN, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text(
      `Categoría: ${producto.categoria}   ·   Unidad: ${producto.unidad_medida}   ·   Stock mínimo: ${formatCantidad(Number(producto.stock_minimo) || 0)}`,
      pageW - MARGEN,
      y + 3,
      { align: 'right' },
    );
    doc.setTextColor(0, 0, 0);

    const body: RowInput[] = [];
    body.push([
      { content: desde ? `Saldo anterior al ${formatDate(desde)}` : 'Saldo inicial', colSpan: 10, styles: FILA_RESALTADA },
      ...saldoCeldas(kardex.saldoInicial).map(c => ({ content: c, styles: FILA_RESALTADA })),
    ]);
    if (kardex.filas.length === 0) {
      body.push([{ content: 'Sin movimientos en el periodo.', colSpan: 13, styles: { fontStyle: 'italic', textColor: [120, 120, 120] } }]);
    }
    for (const f of kardex.filas) {
      const m = f.mov;
      const cant = formatCantidad(Number(m.cantidad));
      const vu = formatPesos(f.costoUnitario, 2);
      const vt = formatPesos(f.valor);
      body.push([
        formatDate(m.fecha),
        m.concepto,
        m.documento || '',
        m.tercero || '',
        ...(m.tipo === 'entrada' ? [cant, vu, vt, '', '', ''] : ['', '', '', cant, vu, vt]),
        ...saldoCeldas(f.saldo),
      ]);
    }
    body.push([
      { content: 'Totales del periodo / saldo final', colSpan: 4, styles: FILA_RESALTADA },
      ...[
        formatCantidad(kardex.totalEntradas.cantidad), '', formatPesos(kardex.totalEntradas.valor),
        formatCantidad(kardex.totalSalidas.cantidad), '', formatPesos(kardex.totalSalidas.valor),
        ...saldoCeldas(kardex.saldoFinal),
      ].map(c => ({ content: c, styles: FILA_RESALTADA })),
    ]);

    autoTable(doc, {
      ...ESTILOS_TABLA,
      startY: y + 5,
      head,
      body,
      columnStyles,
      margin: { left: MARGEN, right: MARGEN, top: HEADER_BOTTOM, bottom: 14 },
      didDrawPage: drawHeader,
    });
    y = finalY(doc, y + 5);
  });

  dibujarFirmasAlFinal(doc, firmasAuditoria(elaboradoPor), y, drawHeader);
  numerarPaginas(doc);

  const nombre = productos.length === 1
    ? `kardex_${slug(bodega.nombre)}_${slug(productos[0].producto.codigo)}.pdf`
    : `kardex_completo_${slug(bodega.nombre)}.pdf`;
  doc.save(nombre);
}

// ─── Relación de saldos ──────────────────────────────────────────────────────

export interface SaldoProductoPDF {
  producto: ProductoAlmacen;
  saldo: EstadoSaldo;
}

export interface ReporteSaldosParams {
  bodega: BodegaAlmacen;
  fechaCorte: string;
  filas: SaldoProductoPDF[];
  elaboradoPor: string;
}

/**
 * Relación de saldos de la bodega a una fecha de corte, con columnas en blanco
 * para el conteo físico y la diferencia: es la hoja que se lleva a la bodega
 * durante la auditoría.
 */
export async function generarSaldosPDF({
  bodega, fechaCorte, filas, elaboradoPor,
}: ReporteSaldosParams): Promise<void> {
  const logo = await cargarLogo();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: FORMATO_IMPRESION });
  const pageW = doc.internal.pageSize.getWidth();
  const anchoUtil = pageW - MARGEN * 2;
  const drawHeader = crearEncabezado(doc, logo, 'Relación de Saldos de Almacén', `CampusNOVA — COTECNOVA · ${bodega.nombre}`);
  drawHeader();

  const valorTotal = filas.reduce((s, f) => s + f.saldo.valor, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bodega: ${bodega.nombre} (${bodega.codigo})`, MARGEN, 28);
  doc.text(`Saldos con corte al: ${formatDate(fechaCorte)}`, pageW / 2 + 4, 28);
  doc.text(`Productos: ${filas.length}`, MARGEN, 32.6);
  doc.text(`Valor total del inventario: ${formatPesos(valorTotal)}`, pageW / 2 + 4, 32.6);

  // Agrupado por categoría para facilitar el conteo en bodega.
  const categorias = [...new Set(filas.map(f => f.producto.categoria))].sort((a, b) => a.localeCompare(b));
  const body: RowInput[] = [];
  for (const cat of categorias) {
    const deCat = filas
      .filter(f => f.producto.categoria === cat)
      .sort((a, b) => a.producto.codigo.localeCompare(b.producto.codigo));
    const valorCat = deCat.reduce((s, f) => s + f.saldo.valor, 0);
    body.push([{
      content: `${cat}   ·   ${deCat.length} producto${deCat.length !== 1 ? 's' : ''}   ·   ${formatPesos(valorCat)}`,
      colSpan: 8,
      styles: FILA_RESALTADA,
    }]);
    for (const f of deCat) {
      body.push([
        f.producto.codigo,
        f.producto.nombre,
        f.producto.unidad_medida,
        formatCantidad(f.saldo.cantidad),
        formatPesos(f.saldo.costoPromedio, 2),
        formatPesos(f.saldo.valor),
        '',
        '',
      ]);
    }
  }
  if (body.length === 0) {
    body.push([{ content: 'No hay productos con movimientos en esta bodega.', colSpan: 8, styles: { fontStyle: 'italic' } }]);
  }
  body.push([
    { content: 'Valor total del inventario', colSpan: 5, styles: { ...FILA_RESALTADA, halign: 'right' } },
    { content: formatPesos(valorTotal), styles: { ...FILA_RESALTADA, halign: 'right' } },
    { content: '', colSpan: 2, styles: FILA_RESALTADA },
  ]);

  const anchos = anchosColumnas([18, 56, 18, 15, 20, 22, 17, 17], anchoUtil);
  autoTable(doc, {
    ...ESTILOS_TABLA,
    startY: 36,
    head: [['Código', 'Producto', 'Unidad', 'Saldo', 'Costo prom.', 'Valor total', 'Conteo físico', 'Diferencia']],
    body,
    columnStyles: Object.fromEntries(
      anchos.map((w, i) => [i, { cellWidth: w, halign: i >= 3 ? ('right' as const) : ('left' as const), minCellHeight: 6 }]),
    ),
    margin: { left: MARGEN, right: MARGEN, top: HEADER_BOTTOM, bottom: 14 },
    didDrawPage: drawHeader,
  });

  let y = finalY(doc, 36);
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const nota = doc.splitTextToSize(
    'Las columnas "Conteo físico" y "Diferencia" se diligencian a mano durante la verificación en bodega. ' +
      'Cualquier diferencia debe registrarse en el aplicativo como un movimiento de ajuste de inventario.',
    anchoUtil,
  ) as string[];
  doc.text(nota, MARGEN, y + 5);
  doc.setTextColor(0, 0, 0);
  y += 5 + nota.length * 3.4;

  dibujarFirmasAlFinal(doc, firmasAuditoria(elaboradoPor), y, drawHeader);
  numerarPaginas(doc);
  doc.save(`saldos_${slug(bodega.nombre)}_${fechaCorte}.pdf`);
}
