// Generación del "Acta de Movimiento de Activos Fijos": la constancia que
// respalda un movimiento —normalmente un traslado masivo— con el detalle de
// todos los activos que abarca y las firmas de quien entrega, quien recibe y
// quien aprueba. Comparte encabezado y estilo con el acta de inventario.
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { altoBloqueFirmas, anchosColumnas, cargarLogo, dibujarFirmas, FORMATO_IMPRESION, type FirmaActa, slug } from '@/lib/acta-comun';

/** Nota del reglamento interno aplicable a los traslados. */
const NOTA_LEGAL =
  'De acuerdo con lo expuesto en el reglamento interno de trabajo, ningún activo a cargo ' +
  'de un colaborador podrá ser trasladado sin previa aprobación. Con la firma de esta acta, ' +
  'quien recibe asume la custodia de los activos relacionados y quien entrega queda a paz y ' +
  'salvo por los mismos. En caso de comprobarse pérdida o daño causado por negligencia o ' +
  'indebida utilización, se cargarán al responsable los costos de reparación o reposición.';

/** Activo incluido en el acta. */
export interface ActivoActa {
  codigo: string;
  nombre: string;
  categoria?: string | null;
  estado?: string | null;
}

export interface ActaMovimientoParams {
  /** Identificador del lote; su prefijo se usa como consecutivo visible. */
  loteId: string;
  tipoMovimiento: string;
  /** Fecha del movimiento en formato ISO (YYYY-MM-DD). */
  fechaMovimiento: string;
  espacioOrigen: string;
  espacioDestino: string;
  personaEntrega: string;
  personaRecibe: string;
  /** Usuario de Infraestructura o Administración que autoriza el movimiento. */
  personaAprueba: string;
  /** Rector que da el visto bueno. */
  vistoBuenoRector: string;
  motivo: string;
  observaciones: string;
  activos: ActivoActa[];
}

/** Consecutivo legible del acta a partir del uuid del lote. */
function consecutivo(loteId: string): string {
  return loteId.split('-')[0].toUpperCase();
}

export async function generarActaMovimientoPDF({
  loteId,
  tipoMovimiento,
  fechaMovimiento,
  espacioOrigen,
  espacioDestino,
  personaEntrega,
  personaRecibe,
  personaAprueba,
  vistoBuenoRector,
  motivo,
  observaciones,
  activos,
}: ActaMovimientoParams): Promise<void> {
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
    doc.text('Acta de Movimiento de Activos Fijos', textX, 13);
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

  // ── Datos del movimiento ───────────────────────────────────────────────
  const fecha = fechaMovimiento
    ? new Date(`${fechaMovimiento}T12:00:00`).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const col2X = pageW / 2 + 4;
  const anchoCol = pageW / 2 - margin - 4;
  /** Recorta a una línea para que las dos columnas queden alineadas. */
  const unaLinea = (texto: string) => doc.splitTextToSize(texto, anchoCol)[0] as string;
  const infoRows: [string, string][] = [
    [`Acta N.º: ${consecutivo(loteId)}`, `Fecha del movimiento: ${fecha}`],
    [`Tipo de movimiento: ${tipoMovimiento}`, `Total de activos: ${activos.length}`],
    [unaLinea(`Espacio de origen: ${espacioOrigen}`), unaLinea(`Espacio de destino: ${espacioDestino}`)],
  ];
  let iy = 28;
  for (const [left, right] of infoRows) {
    doc.text(left, margin, iy);
    doc.text(right, col2X, iy);
    iy += 4.6;
  }

  // Motivo y observaciones ocupan el ancho completo: son texto libre.
  for (const [etiqueta, valor] of [['Motivo', motivo], ['Observaciones', observaciones]] as const) {
    if (!valor?.trim()) continue;
    const lineas = doc.splitTextToSize(`${etiqueta}: ${valor.trim()}`, pageW - margin * 2);
    doc.text(lineas, margin, iy);
    iy += lineas.length * 4.2;
  }

  // ── Tabla de activos ───────────────────────────────────────────────────
  const columns = ['#', 'Código', 'Activo', 'Categoría', 'Estado'];
  const body: RowInput[] = activos.map((a, i) => [
    String(i + 1),
    a.codigo || '—',
    a.nombre || '—',
    a.categoria || '—',
    a.estado || '—',
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
    // Proporciones # / Código / Activo / Categoría / Estado, repartidas sobre
    // el ancho real del papel.
    columnStyles: Object.fromEntries(
      anchosColumnas([10, 24, 74, 44, 30], pageW - margin * 2).map((w, i) => [
        i, i === 0 ? { cellWidth: w, halign: 'right' } : { cellWidth: w },
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

  // ── Total ──────────────────────────────────────────────────────────────
  ensure(10);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de activos movilizados: ${activos.length}`, pageW - margin, y, { align: 'right' });

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
  // Cuatro bloques: quien entrega, quien recibe, quien autoriza el movimiento
  // y el visto bueno del rector. Se dibujan con el mismo helper que el acta de
  // inventario para que el pie de firmas sea idéntico entre las dos actas.
  const firmas: FirmaActa[] = [
    { nombre: personaEntrega, cargo: 'Persona que entrega' },
    { nombre: personaRecibe, cargo: 'Persona que recibe' },
    { nombre: personaAprueba, cargo: 'Autoriza el movimiento' },
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

  doc.save(`acta_movimiento_${slug(consecutivo(loteId), 'lote')}.pdf`);
}
