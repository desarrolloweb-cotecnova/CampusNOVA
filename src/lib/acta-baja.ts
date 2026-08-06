// Generación del "Acta de Baja de Activos Fijos": la constancia que respalda el
// retiro definitivo de uno o varios activos del inventario institucional, con
// el detalle de los bienes dados de baja, su valor y las firmas del responsable
// que los tenía a cargo, de quien realiza la baja y del rector que la refrenda.
// Comparte encabezado, tabla y pie de firmas con el acta de movimiento.
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { altoBloqueFirmas, anchosColumnas, cargarLogo, dibujarFirmas, FORMATO_IMPRESION, type FirmaActa, slug } from '@/lib/acta-comun';
import { formatCurrency } from '@/lib/utils';

/** Nota del reglamento interno aplicable a las bajas. */
const NOTA_LEGAL =
  'Los activos relacionados en la presente acta se retiran del inventario institucional ' +
  'y del cálculo de depreciación a partir de la fecha indicada. Con la firma de esta acta, ' +
  'el responsable queda a paz y salvo por los bienes relacionados, quien realiza la baja ' +
  'certifica la veracidad de la información aquí consignada y el rector la refrenda con su ' +
  'visto bueno. La disposición final de los bienes se hará conforme a los procedimientos ' +
  'institucionales. En caso de comprobarse que la baja obedece a pérdida o daño causado por ' +
  'negligencia o indebida utilización, se cargarán al responsable los costos de reposición.';

/** Activo incluido en el acta de baja. */
export interface ActivoActaBaja {
  codigo: string;
  nombre: string;
  categoria?: string | null;
  valor?: number | null;
}

export interface ActaBajaParams {
  /** Identificador del lote; su prefijo se usa como consecutivo visible. */
  loteId: string;
  motivo: string;
  /** Fecha de la baja en formato ISO (YYYY-MM-DD). */
  fechaBaja: string;
  /** Espacio donde estaban los activos. */
  espacio: string;
  /** Persona que tenía los activos a cargo. */
  responsableActivo: string;
  /** Usuario que registra la baja. */
  realizaBaja: string;
  /** Rector que da el visto bueno. */
  vistoBuenoRector: string;
  descripcion: string;
  activos: ActivoActaBaja[];
}

/** Consecutivo legible del acta a partir del uuid del lote. */
function consecutivo(loteId: string): string {
  return loteId.split('-')[0].toUpperCase();
}

export async function generarActaBajaPDF({
  loteId,
  motivo,
  fechaBaja,
  espacio,
  responsableActivo,
  realizaBaja,
  vistoBuenoRector,
  descripcion,
  activos,
}: ActaBajaParams): Promise<void> {
  const logo = await cargarLogo();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: FORMATO_IMPRESION });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const headerBottom = 26; // y donde puede empezar el contenido bajo el encabezado
  const footerY = pageH - 8;

  // Encabezado sin relleno de color (ahorra tinta), repetido en cada página.
  const drawHeader = () => {
    let textX = margin;
    if (logo) {
      const logoH = 13;
      const logoW = logoH * logo.ratio;
      doc.addImage(logo.dataUrl, 'PNG', margin, 7, logoW, logoH);
      textX = margin + logoW + 5;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Acta de Baja de Activos Fijos', textX, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text('CampusNOVA — COTECNOVA', textX, 18.5);
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, 22, pageW - margin, 22);
  };

  drawHeader();

  // ── Datos de la baja ───────────────────────────────────────────────────
  const fecha = fechaBaja
    ? new Date(`${fechaBaja}T12:00:00`).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';
  const valorTotal = activos.reduce((s, a) => s + (a.valor ?? 0), 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const col2X = pageW / 2 + 4;
  const anchoCol = pageW / 2 - margin - 4;
  /** Recorta a una línea para que las dos columnas queden alineadas. */
  const unaLinea = (texto: string) => doc.splitTextToSize(texto, anchoCol)[0] as string;
  const infoRows: [string, string][] = [
    [`Acta N.º: ${consecutivo(loteId)}`, `Fecha de la baja: ${fecha}`],
    [`Motivo: ${motivo}`, `Total de activos: ${activos.length}`],
    [unaLinea(`Espacio: ${espacio}`), unaLinea(`Responsable: ${responsableActivo || '—'}`)],
  ];
  let iy = 28;
  for (const [left, right] of infoRows) {
    doc.text(left, margin, iy);
    doc.text(right, col2X, iy);
    iy += 4.6;
  }

  // La descripción ocupa el ancho completo: es texto libre.
  if (descripcion?.trim()) {
    const lineas = doc.splitTextToSize(`Descripción: ${descripcion.trim()}`, pageW - margin * 2);
    doc.text(lineas, margin, iy);
    iy += lineas.length * 4.2;
  }

  // ── Tabla de activos ───────────────────────────────────────────────────
  // A diferencia del acta de movimiento, aquí interesa el valor: la baja tiene
  // impacto patrimonial y el acta debe dejar constancia de cuánto se retira.
  const columns = ['#', 'Código', 'Activo', 'Categoría', 'Valor'];
  const body: RowInput[] = activos.map((a, i) => [
    String(i + 1),
    a.codigo || '—',
    a.nombre || '—',
    a.categoria || '—',
    a.valor == null ? '—' : formatCurrency(a.valor),
  ]);

  autoTable(doc, {
    startY: iy + 2,
    head: [columns],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold',
      fontSize: 8.5, lineColor: [150, 150, 150], lineWidth: 0.1,
    },
    styles: {
      fontSize: 8, cellPadding: 1.3, overflow: 'linebreak', valign: 'middle',
      textColor: [0, 0, 0], lineColor: [210, 210, 210], lineWidth: 0.1,
    },
    // Proporciones # / Código / Activo / Categoría / Valor, repartidas sobre el
    // ancho real del papel.
    columnStyles: Object.fromEntries(
      anchosColumnas([10, 24, 74, 44, 30], pageW - margin * 2).map((w, i) => [
        i, i === 0 || i === 4 ? { cellWidth: w, halign: 'right' } : { cellWidth: w },
      ]),
    ),
    margin: { left: margin, right: margin, top: headerBottom, bottom: 16 },
    didDrawPage: drawHeader,
  });

  let y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? iy + 2;

  /** Salta de página si no cabe el bloque que sigue. */
  const ensure = (needed: number) => {
    if (y + needed > pageH - 16) {
      doc.addPage();
      drawHeader();
      y = headerBottom;
    }
  };

  // ── Totales ────────────────────────────────────────────────────────────
  ensure(14);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de activos dados de baja: ${activos.length}`, pageW - margin, y, { align: 'right' });
  y += 4.6;
  doc.text(`Valor total dado de baja: ${formatCurrency(valorTotal)}`, pageW - margin, y, { align: 'right' });

  // ── Nota legal ─────────────────────────────────────────────────────────
  const noteLines = doc.setFontSize(8).splitTextToSize(NOTA_LEGAL, pageW - margin * 2);
  ensure(8 + noteLines.length * 3.6);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Nota:', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(noteLines, margin, y);
  y += noteLines.length * 3.6;

  // ── Firmas ─────────────────────────────────────────────────────────────
  // Tres bloques: quien tenía los activos a cargo, quien realiza la baja y el
  // visto bueno del rector. Mismo helper que las demás actas para que el pie de
  // firmas sea idéntico entre todas.
  const firmas: FirmaActa[] = [
    { nombre: responsableActivo, cargo: 'Responsable de los activos' },
    { nombre: realizaBaja, cargo: 'Realiza la baja' },
    { nombre: vistoBuenoRector, cargo: 'Visto bueno del Rector' },
  ];
  ensure(altoBloqueFirmas(doc, firmas, pageW, margin));
  y = dibujarFirmas(doc, firmas, pageW, margin, y);

  // ── Numeración de páginas ──────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${p} de ${totalPages}`, pageW - margin, footerY, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);

  doc.save(`acta_baja_${slug(consecutivo(loteId), 'lote')}.pdf`);
}
