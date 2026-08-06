// Cloudinary — Gestión de imágenes para CampusNOVA
// Compresión automática en cliente antes de subir (ideal para móvil)
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'drqfuh66o';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'campusnova';

// Máximo lado largo en px antes de comprimir
const MAX_DIMENSION = 1600;
// Calidad de compresión
const COMPRESS_QUALITY = 0.82;

/**
 * Detecta si el navegador admite canvas.toBlob con un tipo MIME dado.
 * iOS Safari < 16 no soporta image/webp en canvas.
 */
function supportsCanvasMime(mime: string): Promise<boolean> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    canvas.toBlob(b => resolve(!!b && b.type === mime), mime, 0.5);
  });
}

/**
 * Comprime una imagen usando canvas antes de subir.
 * - Redimensiona si supera MAX_DIMENSION en cualquier eje.
 * - Intenta WEBP (mejor compresión); si el navegador no lo soporta, usa JPEG.
 * - Si el archivo es HEIC/HEIF (iOS) o el canvas falla, devuelve el archivo original
 *   para que Cloudinary lo procese directamente (soporta HEIC en server-side).
 * - Nunca lanza excepción: siempre devuelve un File utilizable.
 */
export async function compressFile(file: File): Promise<File> {
  // Tipos que el navegador no puede decodificar en <img> — dejar pasar sin comprimir
  const unsupportedMimes = ['image/heic', 'image/heif', 'image/avif'];
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isUnsupported =
    unsupportedMimes.includes(file.type.toLowerCase()) ||
    ext === 'heic' || ext === 'heif';

  if (isUnsupported) return file;

  return new Promise(async resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Intentar WEBP; si no está soportado, usar JPEG (compatible universal)
      const useWebp = await supportsCanvasMime('image/webp');
      const mime = useWebp ? 'image/webp' : 'image/jpeg';
      const newExt = useWebp ? 'webp' : 'jpg';

      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return; }
          // Solo usar comprimido si realmente pesa menos (evitar casos edge)
          if (blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, `.${newExt}`), { type: mime }));
        },
        mime,
        COMPRESS_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Si el navegador no puede decodificar el formato, enviar original
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Sube una imagen a Cloudinary con compresión previa en cliente.
 * Cloudinary aplica adicionalmente q_auto y f_auto en el delivery.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const compressed = await compressFile(file);

  const formData = new FormData();
  formData.append('file', compressed);
  formData.append('upload_preset', UPLOAD_PRESET);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData },
    );
  } catch (networkErr) {
    throw new Error('Sin conexión. Verifica tu red e intenta de nuevo.');
  }

  if (!response.ok) {
    let msg = `Error del servidor (${response.status})`;
    try {
      const err = await response.json();
      msg = err.error?.message || msg;
    } catch { /* ignorar error de parse */ }
    throw new Error(msg);
  }

  const data = await response.json();
  return data.secure_url as string;
}

// ── Helpers de transformación en URL ─────────────────────────────────────────

export function getCloudinaryThumbnail(url: string): string {
  if (!url) return '';
  return url.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/');
}

export function getCloudinaryMedium(url: string): string {
  if (!url) return '';
  return url.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
}

export function getCloudinaryFull(url: string): string {
  if (!url) return '';
  return url.replace('/upload/', '/upload/q_auto,f_auto/');
}

/**
 * Versión para incrustar en un acta PDF. Fuerza JPEG (`f_jpg`) en lugar de
 * `f_auto`: jsPDF no sabe leer WEBP ni AVIF, que es lo que Cloudinary entregaría
 * a un navegador moderno. El ancho se acota porque en el papel la foto no pasa
 * de unos 85 mm y subir más resolución solo engorda el archivo.
 */
export function getCloudinaryActa(url: string): string {
  if (!url) return '';
  return url.replace('/upload/', '/upload/w_900,c_limit,q_auto,f_jpg/');
}

export function getCloudinaryAvatar(url: string): string {
  if (!url) return '';
  return url.replace('/upload/', '/upload/w_200,h_200,c_fill,g_face,q_auto,f_auto/');
}
