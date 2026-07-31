// Utilidades compartidas por las actas en PDF (inventario y movimientos).
import { LOGO_URL } from '@/lib/assets';

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
