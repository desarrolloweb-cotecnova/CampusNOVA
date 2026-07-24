// Generación del "Acta de Inventario de Activos Fijos" de un responsable.
// Lista los activos fijos vigentes agrupados por espacio asignado y, dentro de
// cada espacio, por categoría; ordenados por código. Incluye una columna de
// observaciones (para diligenciar a mano), la nota del reglamento interno y los
// espacios de firma. Optimizado para impresión (encabezado sin relleno de color,
// logo de CampusNOVA, filas compactas y numeración de páginas).
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { ActivoFijo, EspacioFisico, Profile } from '@/types/types';
import {
  ALTO_ENCABEZADO, ESTILOS_CABECERA_TABLA, ESTILOS_TABLA, GRIS_AGRUPACION, MARGEN,
  cargarLogoPDF, dibujarEncabezado, numerarPaginas,
} from '@/lib/pdf-base';

/** Nota legal del reglamento interno (texto solicitado, literal). */
const NOTA_LEGAL =
  'De acuerdo con lo expuesto en el reglamento interno de trabajo, es responsabilidad ' +
  'del colaborador la custodia de los activos y salvo eventos de deterioro normal. En ' +
  'comprobarse alguna perdida o daño en los equipos y elementos de trabajo que sean ' +
  'causados por negligencia o indebida utilización por parte del colaborador, se le ' +
  'cargaran a este los costos de reparación o reposición del mismo. Todo activo que esté ' +
  'a su cargo no podrá ser trasladado sin previa aprobación.';

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

export async function generarActaInventarioPDF({ responsable, espacios, activos }: ActaInventarioParams): Promise<void> {
  const logo = await cargarLogoPDF();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = MARGEN;
  const headerBottom = ALTO_ENCABEZADO; // y donde puede empezar el contenido

  // Encabezado institucional compartido (sin relleno de color, con logo).
  const drawHeader = () =>
    dibujarEncabezado(doc, { titulo: 'Acta de Inventario de Activos Fijos', logo });

  drawHeader();

  // ── Datos del responsable ──────────────────────────────────────────────
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
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
    iy += 4.6;
  }

  // ── Tabla: agrupada por espacio y, dentro, por categoría ───────────────
  const columns = ['Código', 'Activo', 'Estado', 'Observaciones'];
  const NCOL = columns.length;
  const GRUPO_ESPACIO = GRIS_AGRUPACION;
  const body: RowInput[] = [];

  const espaciosOrdenados = [...espacios].sort((a, b) =>
    (a.codigo || '').localeCompare(b.codigo || ''),
  );

  for (const esp of espaciosOrdenados) {
    const acts = activos.filter(a => a.espacio_id === esp.id);
    const piso = esp.piso_nombre || esp.piso || '';
    const detalle = [esp.sede, esp.bloque, piso].filter(Boolean).join(' · ');
    const titulo =
      `Espacio ${esp.codigo} — ${esp.nombre}${detalle ? `   (${detalle})` : ''}` +
      `   ·   ${acts.length} activo${acts.length !== 1 ? 's' : ''}`;
    body.push([
      {
        content: titulo,
        colSpan: NCOL,
        styles: { fillColor: GRUPO_ESPACIO, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' },
      },
    ]);

    if (acts.length === 0) {
      body.push([
        {
          content: 'Sin activos registrados en este espacio.',
          colSpan: NCOL,
          styles: { fontStyle: 'italic', textColor: [120, 120, 120] },
        },
      ]);
      continue;
    }

    // Subgrupos por categoría (orden alfabético); activos ordenados por código.
    const categorias = [...new Set(acts.map(a => a.categoria || 'Sin categoría'))]
      .sort((a, b) => a.localeCompare(b));
    for (const cat of categorias) {
      body.push([
        {
          content: `Categoría: ${cat}`,
          colSpan: NCOL,
          styles: { fontStyle: 'bold', textColor: [60, 60, 60], cellPadding: { top: 1, bottom: 1, left: 6 } },
        },
      ]);
      const catActs = acts
        .filter(a => (a.categoria || 'Sin categoría') === cat)
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      for (const a of catActs) {
        body.push([a.codigo || '—', a.nombre || '—', a.estado || '—', '']);
      }
    }
  }

  autoTable(doc, {
    startY: iy + 2,
    head: [columns],
    body,
    theme: 'grid',
    headStyles: ESTILOS_CABECERA_TABLA,
    styles: ESTILOS_TABLA,
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 72 },
      2: { cellWidth: 28 },
      3: { cellWidth: 58 },
    },
    margin: { left: margin, right: margin, top: headerBottom, bottom: 16 },
    // Repetir el encabezado en cada página de la tabla.
    didDrawPage: drawHeader,
  });

  // Posición tras la tabla.
  let y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? iy + 2;

  // Salta de página si no cabe el bloque que sigue.
  const ensure = (needed: number) => {
    if (y + needed > pageH - 16) {
      doc.addPage();
      drawHeader();
      y = headerBottom;
    }
  };

  // ── Total de activos fijos ─────────────────────────────────────────────
  ensure(10);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de activos fijos: ${activos.length}`, pageW - margin, y, { align: 'right' });

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
  ensure(32);
  y += 18; // espacio para firmar sobre la línea
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
    doc.setLineWidth(0.3);
    doc.line(x, y, x + colW, y);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    if (f.nombre) {
      doc.setFont('helvetica', 'bold');
      doc.text(doc.splitTextToSize(f.nombre, colW), x + colW / 2, y + 4, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(f.cargo, colW), x + colW / 2, y + (f.nombre ? 8 : 4), { align: 'center' });
  });

  // ── Numeración de páginas (Página X de Y) ──────────────────────────────
  numerarPaginas(doc);

  doc.save(`acta_inventario_${slug(responsable.nombre)}.pdf`);
}
