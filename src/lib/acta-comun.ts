// Utilidades compartidas por las actas en PDF (inventario y movimientos).
// Las actas se imprimen para recoger firmas, así que deben verse como un mismo
// documento: lo que aquí se centraliza es lo que garantiza ese formato común.
import type jsPDF from 'jspdf';
import { LOGO_URL } from '@/lib/assets';

/**
 * Tamaño de papel de todos los documentos imprimibles: Carta (8,5 × 11 pulgadas
 * = 215,9 × 279,4 mm), que es el estándar de oficina en Colombia. jsPDF lo
 * conoce como 'letter'.
 */
export const FORMATO_IMPRESION = 'letter' as const;

/**
 * Reparte el ancho útil de la página entre las columnas de una tabla según los
 * pesos relativos que se le pasen.
 *
 * Se calcula en vez de fijarse en milímetros para que la tabla ocupe el ancho
 * real del papel: unos anchos pensados para A4 dejarían margen sobrante en
 * Carta —que es más ancha— y se saldrían de la página en un papel más angosto.
 */
export function anchosColumnas(pesos: number[], anchoUtil: number): number[] {
  const total = pesos.reduce((s, p) => s + p, 0);
  return pesos.map(p => (p / total) * anchoUtil);
}

/** Nombre de archivo seguro a partir de un texto libre. */
export function slug(nombre: string | null, porDefecto = 'documento'): string {
  return (nombre || porDefecto)
    .normalize('NFD')
    // Elimina marcas diacríticas combinantes (U+0300–U+036F).
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || porDefecto;
}

/**
 * Rasteriza el logo SVG a PNG (jsPDF no incrusta SVG). Devuelve el dataURL y la
 * relación de aspecto (ancho/alto). Si falla (o no hay DOM), devuelve null y el
 * encabezado se dibuja solo con texto.
 */
export async function cargarLogo(): Promise<{ dataUrl: string; ratio: number } | null> {
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

// ─── Bloque de firmas ────────────────────────────────────────────────────────
// Compartido por todas las actas para que el pie de firmas sea idéntico en
// todas: línea, nombre en negrita cuando se conoce, y cargo debajo.

/** Separación horizontal entre columnas de firma, en mm. */
const GAP_FIRMAS = 8;
/** Espacio en blanco sobre la línea, para firmar a mano. */
const ESPACIO_FIRMA = 18;
/** Alto de línea del texto bajo la firma, en mm. */
const ALTO_LINEA = 4;

export interface FirmaActa {
  /** Nombre de quien firma. Vacío deja solo la línea y el cargo. */
  nombre: string;
  cargo: string;
}

function anchoColumna(pageW: number, margin: number, columnas: number): number {
  return (pageW - margin * 2 - GAP_FIRMAS * (columnas - 1)) / columnas;
}

/**
 * Alto total que ocupará el bloque de firmas. Se consulta antes de dibujarlo
 * para decidir si cabe en la página o hay que saltar a la siguiente.
 */
export function altoBloqueFirmas(doc: jsPDF, firmas: FirmaActa[], pageW: number, margin: number): number {
  const colW = anchoColumna(pageW, margin, firmas.length);
  doc.setFontSize(8);
  const lineas = (t: string) => (t ? (doc.splitTextToSize(t, colW) as string[]).length : 0);
  const maxNombre = Math.max(0, ...firmas.map(f => lineas(f.nombre)));
  const maxCargo = Math.max(1, ...firmas.map(f => lineas(f.cargo)));
  return ESPACIO_FIRMA + ALTO_LINEA * (1 + maxNombre + maxCargo);
}

/**
 * Dibuja las firmas repartidas en columnas iguales. `y` es la posición actual
 * del contenido; se devuelve la `y` tras el bloque.
 */
export function dibujarFirmas(
  doc: jsPDF,
  firmas: FirmaActa[],
  pageW: number,
  margin: number,
  y: number,
): number {
  const colW = anchoColumna(pageW, margin, firmas.length);
  const yLinea = y + ESPACIO_FIRMA;

  doc.setFontSize(8);
  const lineasNombre = firmas.map(f => (f.nombre ? (doc.splitTextToSize(f.nombre, colW) as string[]) : []));
  // El cargo arranca a la misma altura en todas las columnas, aunque un nombre
  // ocupe más renglones que otro.
  const maxNombre = Math.max(0, ...lineasNombre.map(l => l.length));

  firmas.forEach((f, i) => {
    const x = margin + i * (colW + GAP_FIRMAS);
    const cx = x + colW / 2;
    doc.setDrawColor(70, 70, 70);
    doc.setLineWidth(0.3);
    doc.line(x, yLinea, x + colW, yLinea);

    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    if (lineasNombre[i].length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(lineasNombre[i], cx, yLinea + ALTO_LINEA, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(
      doc.splitTextToSize(f.cargo, colW) as string[],
      cx,
      yLinea + ALTO_LINEA * (1 + maxNombre),
      { align: 'center' },
    );
  });

  return yLinea + ALTO_LINEA * (1 + maxNombre);
}
