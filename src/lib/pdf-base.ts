/**
 * Base de diseño para todos los PDF de CampusNOVA.
 *
 * Criterios (los mismos del Acta de Inventario), pensados para impresión:
 *  - Sin franjas ni rellenos de color (ahorra tinta): encabezado en negro sobre
 *    blanco con una línea separadora fina.
 *  - Logo institucional de CampusNOVA en el encabezado, repetido en cada página.
 *  - Filas compactas para aprovechar el papel.
 *  - Numeración "Página X de Y" al pie de cada página.
 */
import type jsPDF from 'jspdf';
import { LOGO_URL } from '@/lib/assets';

/** Logo ya rasterizado, listo para incrustar en un PDF. */
export interface LogoPDF {
  dataUrl: string;
  /** ancho / alto, para escalarlo sin deformarlo */
  ratio: number;
}

/**
 * Rasteriza el logo SVG a PNG (jsPDF no incrusta SVG). Devuelve null si falla o
 * no hay DOM; en ese caso el encabezado se dibuja solo con texto.
 */
export async function cargarLogoPDF(): Promise<LogoPDF | null> {
  try {
    if (typeof document === 'undefined') return null;
    const img = new Image();
    img.decoding = 'async';
    img.src = LOGO_URL;
    await img.decode();
    const w = img.naturalWidth || 600;
    const h = img.naturalHeight || 230;
    const scale = 3; // nitidez para impresión
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), ratio: w / h };
  } catch {
    return null;
  }
}

/** Margen lateral estándar de los documentos (mm). */
export const MARGEN = 14;

/** Y a partir de la cual puede empezar el contenido, bajo el encabezado (mm). */
export const ALTO_ENCABEZADO = 26;

/** Gris de las filas de agrupación dentro de una tabla. */
export const GRIS_AGRUPACION: [number, number, number] = [235, 235, 235];

/** Estilo de la fila de encabezado de tabla: blanca, texto negro, borde fino. */
export const ESTILOS_CABECERA_TABLA = {
  fillColor: [255, 255, 255] as [number, number, number],
  textColor: [0, 0, 0] as [number, number, number],
  fontStyle: 'bold' as const,
  fontSize: 8.5,
  lineColor: [150, 150, 150] as [number, number, number],
  lineWidth: 0.1,
};

/** Estilo de celda: compacto para imprimir más filas por hoja. */
export const ESTILOS_TABLA = {
  fontSize: 8,
  cellPadding: 1.3,
  overflow: 'linebreak' as const,
  valign: 'middle' as const,
  textColor: [0, 0, 0] as [number, number, number],
  lineColor: [210, 210, 210] as [number, number, number],
  lineWidth: 0.1,
};

export interface EncabezadoOpts {
  /** Título del documento (línea principal). */
  titulo: string;
  /** Línea secundaria; por defecto la marca institucional. */
  subtitulo?: string;
  /** Logo ya cargado con `cargarLogoPDF()`. */
  logo?: LogoPDF | null;
}

/**
 * Dibuja el encabezado institucional (sin relleno de color) en la página actual.
 * Pensado para usarse también como `didDrawPage` de autoTable, de modo que se
 * repita en todas las páginas del documento.
 */
export function dibujarEncabezado(doc: jsPDF, { titulo, subtitulo, logo }: EncabezadoOpts): void {
  const pageW = doc.internal.pageSize.getWidth();
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
  doc.text(subtitulo ?? 'CampusNOVA — COTECNOVA', textX, 18.5);

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(MARGEN, 22, pageW - MARGEN, 22);
}

/**
 * Escribe "Página X de Y" al pie de todas las páginas.
 * Llamar al final, cuando el documento ya está completo.
 */
export function numerarPaginas(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${p} de ${total}`, pageW - MARGEN, pageH - 8, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
}

/** Fecha de generación en formato local, para la esquina del documento. */
export function textoGenerado(): string {
  const ahora = new Date();
  return `Generado: ${ahora.toLocaleDateString('es-CO')} ${ahora.toLocaleTimeString('es-CO')}`;
}
