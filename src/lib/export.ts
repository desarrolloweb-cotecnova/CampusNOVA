import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FORMATO_IMPRESION } from '@/lib/acta-comun';

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

// Exportar a PDF
export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  columnStyles?: Record<number, object>
) {
  // Carta apaisada: mismo papel que las actas (ver FORMATO_IMPRESION).
  const doc = new jsPDF({ orientation: 'landscape', format: FORMATO_IMPRESION });

  // Encabezado
  doc.setFillColor(0, 96, 47); // #00602F
  doc.rect(0, 0, doc.internal.pageSize.width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CampusNOVA — COTECNOVA', 14, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 16);

  // Fecha
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`,
    doc.internal.pageSize.width - 14,
    24,
    { align: 'right' }
  );

  autoTable(doc, {
    head: [columns],
    body: rows.map(r => r.map(c => String(c))),
    startY: 26,
    headStyles: {
      fillColor: [0, 96, 47],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [240, 250, 245] },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: columnStyles ?? {},
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}
