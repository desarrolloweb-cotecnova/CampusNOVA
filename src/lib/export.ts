import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ALTO_ENCABEZADO, ESTILOS_CABECERA_TABLA, ESTILOS_TABLA, MARGEN,
  cargarLogoPDF, dibujarEncabezado, numerarPaginas, textoGenerado,
} from '@/lib/pdf-base';

// Exportar a Excel
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Hoja1'
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Exporta un listado a PDF con el diseño institucional optimizado para impresión
 * (ver `@/lib/pdf-base`): sin franjas de color, con logo, encabezado repetido en
 * todas las páginas, filas compactas y numeración "Página X de Y".
 *
 * Es `async` porque el logo se rasteriza antes de dibujar; los llamadores deben
 * usar `await`.
 */
export async function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  columnStyles?: Record<number, object>
) {
  const logo = await cargarLogoPDF();
  // Horizontal: los listados tienen entre 6 y 11 columnas.
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();

  const encabezado = () => dibujarEncabezado(doc, { titulo: title, logo });
  encabezado();

  // Fecha de generación (solo en la primera página).
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(textoGenerado(), pageW - MARGEN, ALTO_ENCABEZADO + 1, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    head: [columns],
    body: rows.map(r => r.map(c => String(c))),
    startY: ALTO_ENCABEZADO + 4,
    theme: 'grid',
    headStyles: ESTILOS_CABECERA_TABLA,
    styles: ESTILOS_TABLA,
    columnStyles: columnStyles ?? {},
    // `top` evita que la tabla pise el encabezado en la página 2 en adelante.
    margin: { left: MARGEN, right: MARGEN, top: ALTO_ENCABEZADO, bottom: 16 },
    didDrawPage: encabezado,
  });

  numerarPaginas(doc);
  doc.save(`${filename}.pdf`);
}
