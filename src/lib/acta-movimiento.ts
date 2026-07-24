// Generación del "Acta de Movimiento de Activo Fijo".
// Antes se imprimía desde el navegador con window.print(); ahora se descarga
// como PDF con el mismo diseño institucional que los demás documentos
// (ver `@/lib/pdf-base`): sin rellenos de color, con logo, filas compactas y
// numeración de páginas.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ALTO_ENCABEZADO, ESTILOS_TABLA, GRIS_AGRUPACION, MARGEN,
  cargarLogoPDF, dibujarEncabezado, numerarPaginas,
} from '@/lib/pdf-base';

/** Datos del movimiento necesarios para levantar el acta. */
export interface ActaMovimientoData {
  tipo_movimiento: string;
  activo_nombre: string;
  activo_codigo: string;
  espacio_origen: string;
  espacio_destino: string;
  responsable_anterior: string | null;
  responsable_nuevo: string | null;
  motivo: string | null;
  observaciones: string | null;
  aprobado_por: string | null;
  fecha_movimiento: string;
}

export async function generarActaMovimientoPDF(m: ActaMovimientoData): Promise<void> {
  const logo = await cargarLogoPDF();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const drawHeader = () =>
    dibujarEncabezado(doc, { titulo: 'Acta de Movimiento de Activo Fijo', logo });
  drawHeader();

  // ── Entidad y fecha ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Corporación de Estudios Tecnológicos del Norte del Valle — COTECNOVA', MARGEN, ALTO_ENCABEZADO + 2);
  doc.text(`Fecha de movimiento: ${m.fecha_movimiento}`, pageW - MARGEN, ALTO_ENCABEZADO + 2, { align: 'right' });

  // ── Detalle del movimiento ─────────────────────────────────────────────
  const filas: [string, string][] = [
    ['Activo', `${m.activo_nombre} (${m.activo_codigo})`],
    ['Tipo de movimiento', m.tipo_movimiento],
    ['Espacio de origen', m.espacio_origen || '—'],
    ['Espacio de destino', m.espacio_destino || '—'],
    ['Responsable anterior', m.responsable_anterior || '—'],
    ['Responsable nuevo', m.responsable_nuevo || '—'],
    ['Motivo', m.motivo || '—'],
    ['Observaciones', m.observaciones || '—'],
  ];

  autoTable(doc, {
    startY: ALTO_ENCABEZADO + 6,
    body: filas,
    theme: 'grid',
    styles: ESTILOS_TABLA,
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', fillColor: GRIS_AGRUPACION },
      1: { cellWidth: 'auto' },
    },
    margin: { left: MARGEN, right: MARGEN, top: ALTO_ENCABEZADO, bottom: 16 },
    didDrawPage: drawHeader,
  });

  let y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? ALTO_ENCABEZADO + 6;

  // Salta de página si no cabe el bloque de firmas.
  if (y + 40 > pageH - 16) {
    doc.addPage();
    drawHeader();
    y = ALTO_ENCABEZADO;
  }

  // ── Firmas ─────────────────────────────────────────────────────────────
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Firmas de responsables:', MARGEN, y);

  y += 22; // espacio para firmar sobre la línea
  const gap = 8;
  const colW = (pageW - MARGEN * 2 - gap * 2) / 3;
  const firmas: [string, string | null][] = [
    ['Persona que entrega', m.responsable_anterior],
    ['Persona que recibe', m.responsable_nuevo],
    ['Persona que aprueba', m.aprobado_por],
  ];
  firmas.forEach(([cargo, nombre], i) => {
    const x = MARGEN + i * (colW + gap);
    doc.setDrawColor(70, 70, 70);
    doc.setLineWidth(0.3);
    doc.line(x, y, x + colW, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    if (nombre) {
      doc.setFont('helvetica', 'bold');
      doc.text(doc.splitTextToSize(nombre, colW), x + colW / 2, y + 4, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(cargo, x + colW / 2, y + (nombre ? 8 : 4), { align: 'center' });
    doc.setTextColor(120, 120, 120);
    doc.text('C.C.: ____________________', x + colW / 2, y + (nombre ? 12 : 8), { align: 'center' });
    doc.setTextColor(0, 0, 0);
  });

  numerarPaginas(doc);
  doc.save(`acta_movimiento_${(m.activo_codigo || 'activo').replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`);
}
