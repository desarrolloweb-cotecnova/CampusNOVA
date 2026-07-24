// Generación del "Acta de Inventario de Activos Fijos" de un responsable.
// Lista los activos fijos vigentes de cada espacio asignado al responsable,
// con sus datos más significativos (código y estado incluidos), la nota del
// reglamento interno y los espacios de firma (responsable, Administrador de
// Infraestructura Física y Rector). Se descarga como PDF para imprimir.
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { ActivoFijo, EspacioFisico, Profile } from '@/types/types';

/** Verde institucional COTECNOVA (#00602F). */
const VERDE: [number, number, number] = [0, 96, 47];
/** Verde muy claro para los encabezados de grupo (por espacio). */
const VERDE_GRUPO: [number, number, number] = [226, 240, 233];

/** Nota legal del reglamento interno (texto solicitado, literal). */
const NOTA_LEGAL =
  'De acuerdo con lo expuesto en el reglamento interno de trabajo, es responsabilidad ' +
  'del colaborador la custodia de los activos y salvo eventos de deterioro normal. En ' +
  'comprobarse alguna perdida o daño en los equipos y elementos de trabajo que sean ' +
  'causados por negligencia o indebida utilización por parte del colaborador, se le ' +
  'cargaran a este los costos de reparación o reposición del mismo. Todo activo que esté ' +
  'a su cargo no podrá ser trasladado sin previa aprobación.';

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

/** Nombre de archivo seguro a partir del nombre del responsable. */
function slug(nombre: string | null): string {
  return (nombre || 'responsable')
    .normalize('NFD')
    // Elimina marcas diacríticas combinantes (U+0300–U+036F).
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'responsable';
}

export interface ActaInventarioParams {
  /** Responsable al que se le levanta el acta. */
  responsable: Profile;
  /** Espacios físicos asignados al responsable. */
  espacios: EspacioFisico[];
  /** Activos fijos vigentes de esos espacios. */
  activos: ActivoFijo[];
}

export function generarActaInventarioPDF({ responsable, espacios, activos }: ActaInventarioParams): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Banda de encabezado (se repite en cada página).
  const drawHeader = () => {
    doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CampusNOVA — COTECNOVA', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Acta de Inventario de Activos Fijos', margin, 15);
    doc.setTextColor(0, 0, 0);
  };

  drawHeader();

  // ── Datos del responsable ──────────────────────────────────────────────
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2X = pageW / 2 + 4;
  const infoRows: [string, string][] = [
    [`Responsable: ${responsable.nombre || '—'}`, `Fecha: ${fecha}`],
    [`Cargo: ${responsable.cargo || '—'}`, `Espacios a cargo: ${espacios.length}`],
    [`Correo: ${responsable.email || '—'}`, `Total de activos: ${activos.length}`],
  ];
  let iy = 28;
  for (const [left, right] of infoRows) {
    doc.text(left, margin, iy);
    doc.text(right, col2X, iy);
    iy += 5;
  }

  // ── Tabla de activos agrupada por espacio ──────────────────────────────
  const columns = ['Código', 'Activo', 'Categoría', 'Estado', 'Valor'];
  const NCOL = columns.length;
  const body: RowInput[] = [];
  let total = 0;

  const espaciosOrdenados = [...espacios].sort((a, b) =>
    (a.codigo || '').localeCompare(b.codigo || ''),
  );

  for (const esp of espaciosOrdenados) {
    const piso = esp.piso_nombre || esp.piso || '';
    const detalle = [esp.sede, esp.bloque, piso].filter(Boolean).join(' · ');
    const titulo = `Espacio ${esp.codigo} — ${esp.nombre}${detalle ? `   (${detalle})` : ''}`;
    body.push([
      {
        content: titulo,
        colSpan: NCOL,
        styles: { fillColor: VERDE_GRUPO, textColor: VERDE, fontStyle: 'bold', halign: 'left' },
      },
    ]);

    const acts = activos
      .filter(a => a.espacio_id === esp.id)
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

    if (acts.length === 0) {
      body.push([
        {
          content: 'Sin activos registrados en este espacio.',
          colSpan: NCOL,
          styles: { fontStyle: 'italic', textColor: [120, 120, 120] },
        },
      ]);
    } else {
      for (const a of acts) {
        total += Number(a.valor) || 0;
        body.push([
          a.codigo || '—',
          a.nombre || '—',
          a.categoria || '—',
          a.estado || '—',
          money(a.valor),
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: iy + 3,
    head: [columns],
    body,
    theme: 'grid',
    headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { cellWidth: 30 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26, halign: 'right' },
    },
    margin: { left: margin, right: margin, top: 24 },
    // Repetir la banda de encabezado en cada página de la tabla.
    didDrawPage: drawHeader,
  });

  // Posición tras la tabla.
  let y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? iy + 3;

  // Salta de página si no cabe el bloque que sigue.
  const ensure = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      drawHeader();
      y = 24;
    }
  };

  // ── Total ──────────────────────────────────────────────────────────────
  ensure(12);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Valor total del inventario: ${money(total)}`, pageW - margin, y, { align: 'right' });

  // ── Nota legal ─────────────────────────────────────────────────────────
  const noteLines = doc.setFontSize(8).splitTextToSize(NOTA_LEGAL, pageW - margin * 2);
  ensure(10 + noteLines.length * 3.6);
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Nota:', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(noteLines, margin, y);
  y += noteLines.length * 3.6;

  // ── Firmas ─────────────────────────────────────────────────────────────
  ensure(34);
  y += 20; // espacio para firmar sobre la línea
  const gap = 8;
  const colW = (pageW - margin * 2 - gap * 2) / 3;
  const firmas: { nombre: string; cargo: string }[] = [
    { nombre: responsable.nombre || '', cargo: 'Responsable / Colaborador' },
    { nombre: '', cargo: 'Administrador de Infraestructura Física' },
    { nombre: '', cargo: 'Rector' },
  ];
  firmas.forEach((f, i) => {
    const x = margin + i * (colW + gap);
    doc.setDrawColor(70, 70, 70);
    doc.line(x, y, x + colW, y);
    doc.setFontSize(8);
    if (f.nombre) {
      doc.setFont('helvetica', 'bold');
      doc.text(doc.splitTextToSize(f.nombre, colW), x + colW / 2, y + 4, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(f.cargo, colW), x + colW / 2, y + (f.nombre ? 8 : 4), { align: 'center' });
  });

  doc.save(`acta_inventario_${slug(responsable.nombre)}.pdf`);
}
