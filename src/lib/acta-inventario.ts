// Generación del "Acta de Inventario de Activos Fijos" de un responsable.
// Lista los activos fijos vigentes agrupados por espacio asignado y, dentro de
// cada espacio, por categoría; ordenados por código. Incluye una columna de
// observaciones (para diligenciar a mano), la nota del reglamento interno y los
// espacios de firma. Optimizado para impresión (encabezado sin relleno de color,
// logo de CampusNOVA, filas compactas y numeración de páginas).
import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { ActivoFijo, EspacioFisico, Profile } from '@/types/types';
import { altoBloqueFirmas, cargarLogo, dibujarFirmas, type FirmaActa, slug } from '@/lib/acta-comun';

/** Nota legal del reglamento interno (texto solicitado, literal). */
const NOTA_LEGAL =
  'De acuerdo con lo expuesto en el reglamento interno de trabajo, es responsabilidad ' +
  'del colaborador la custodia de los activos y salvo eventos de deterioro normal. En ' +
  'comprobarse alguna perdida o daño en los equipos y elementos de trabajo que sean ' +
  'causados por negligencia o indebida utilización por parte del colaborador, se le ' +
  'cargaran a este los costos de reparación o reposición del mismo. Todo activo que esté ' +
  'a su cargo no podrá ser trasladado sin previa aprobación.';

/**
 * Activos fijos que están a nombre de un responsable. Un activo tiene un único
 * responsable, aunque el espacio que lo alberga esté compartido entre varios:
 * por eso el acta por espacio se levanta sobre este subconjunto.
 */
export function activosDeResponsable(activos: ActivoFijo[], nombre: string | null): ActivoFijo[] {
  const objetivo = nombre?.trim() || '';
  return activos.filter(a => (a.responsable?.trim() || '') === objetivo);
}

export interface ActaInventarioParams {
  /** Responsable al que se le levanta el acta. */
  responsable: Profile;
  /** Espacios físicos asignados al responsable. */
  espacios: EspacioFisico[];
  /** Activos fijos vigentes de esos espacios. */
  activos: ActivoFijo[];
  /**
   * Alcance del acta. `'responsable'` (por defecto) se emite desde el módulo de
   * Responsables y cubre todos los espacios a cargo. `'espacio'` se emite desde
   * la ficha de un espacio físico y cubre únicamente ese espacio: cambia el
   * encabezado y el nombre del archivo para dejar claro el alcance.
   */
  alcance?: 'responsable' | 'espacio';
}

export async function generarActaInventarioPDF({
  responsable,
  espacios,
  activos,
  alcance = 'responsable',
}: ActaInventarioParams): Promise<void> {
  const porEspacio = alcance === 'espacio' && espacios.length === 1;
  const logo = await cargarLogo();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const headerBottom = 26; // y donde puede empezar el contenido bajo el encabezado
  const footerY = pageH - 8;

  // Encabezado sin relleno de color (ahorra tinta): logo + título en negro y una
  // línea separadora fina. Se repite en cada página.
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
    doc.text('Acta de Inventario de Activos Fijos', textX, 13);
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

  // ── Datos del responsable ──────────────────────────────────────────────
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const col2X = pageW / 2 + 4;
  // En el acta por espacio se identifica el espacio en vez del total a cargo.
  const alcanceLinea = porEspacio
    ? doc.splitTextToSize(`Espacio: ${espacios[0].codigo} — ${espacios[0].nombre}`, pageW - col2X - margin)[0]
    : `Espacios a cargo: ${espacios.length}`;
  const infoRows: [string, string][] = [
    [`Responsable: ${responsable.nombre || '—'}`, `Fecha: ${fecha}`],
    [`Cargo: ${responsable.cargo || '—'}`, alcanceLinea],
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
  const GRUPO_ESPACIO: [number, number, number] = [235, 235, 235];
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
    headStyles: {
      fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold',
      fontSize: 8.5, lineColor: [150, 150, 150], lineWidth: 0.1,
    },
    styles: {
      fontSize: 8, cellPadding: 1.3, overflow: 'linebreak', valign: 'middle',
      textColor: [0, 0, 0], lineColor: [210, 210, 210], lineWidth: 0.1,
    },
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
  const firmas: FirmaActa[] = [
    { nombre: responsable.nombre || '', cargo: 'Responsable / Colaborador' },
    { nombre: '', cargo: 'Administrador de Infraestructura Física' },
    { nombre: '', cargo: 'Rector' },
  ];
  ensure(altoBloqueFirmas(doc, firmas, pageW, margin));
  y = dibujarFirmas(doc, firmas, pageW, margin, y);

  // ── Numeración de páginas (Página X de Y) ──────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${p} de ${totalPages}`, pageW - margin, footerY, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);

  const nombreArchivo = porEspacio
    ? `acta_inventario_${slug(espacios[0].codigo, 'espacio')}_${slug(responsable.nombre, 'responsable')}.pdf`
    : `acta_inventario_${slug(responsable.nombre, 'responsable')}.pdf`;
  doc.save(nombreArchivo);
}
