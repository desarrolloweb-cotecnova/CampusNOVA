import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function cleanDateString(date: string): string {
  if (!date) return '';
  let d = date;
  if (d.endsWith('Z')) d = d.slice(0, -1);
  d = d.replace(/([+-]\d{2}:\d{2})$/, '');
  if (d.length === 10) d += 'T00:00:00';
  return d;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(cleanDateString(date)));
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(cleanDateString(date)));
}

export function generateRadicado(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `NOV-${year}${month}${day}-${random}`;
}

export function generateNumeroSolicitud(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `RES-${year}${month}${day}-${random}`;
}

export function generateCodigoIntervencion(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 900) + 100;
  return `INT-${year}-${seq}`;
}

export function calcularDepreciacion(
  valor: number,
  fechaAdquisicion: string | null,
  tiempoDepreciacion: number | null
) {
  if (!fechaAdquisicion || !tiempoDepreciacion || tiempoDepreciacion <= 0) {
    return { depreciacionAnual: 0, añosTranscurridos: 0, valorActual: valor, porcentajeVida: 0 };
  }

  const hoy = new Date();
  const adquisicion = new Date(cleanDateString(fechaAdquisicion));
  const añosTranscurridos = Math.max(
    0,
    (hoy.getTime() - adquisicion.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  const depreciacionAnual = valor / tiempoDepreciacion;
  const depreciacionAcumulada = Math.min(depreciacionAnual * añosTranscurridos, valor);
  const valorActual = Math.max(0, valor - depreciacionAcumulada);
  const porcentajeVida = Math.min(100, (añosTranscurridos / tiempoDepreciacion) * 100);

  return {
    depreciacionAnual,
    añosTranscurridos: Math.floor(añosTranscurridos),
    valorActual,
    porcentajeVida,
  };
}

export function getEstadoColor(estado: string): string {
  const map: Record<string, string> = {
    'En funcionamiento': 'bg-green-100 text-green-800',
    'Daño parcial': 'bg-yellow-100 text-yellow-800',
    'Dado de baja': 'bg-red-100 text-red-800',
    'En reparación': 'bg-blue-100 text-blue-800',
    Bueno: 'bg-green-100 text-green-800',
    Regular: 'bg-yellow-100 text-yellow-800',
    'Requiere intervención': 'bg-red-100 text-red-800',
    Recibido: 'bg-gray-100 text-gray-800',
    'En revisión': 'bg-blue-100 text-blue-800',
    'En gestión': 'bg-orange-100 text-orange-800',
    Resuelto: 'bg-green-100 text-green-800',
    Cerrado: 'bg-gray-100 text-gray-800',
    Solicitud: 'bg-gray-100 text-gray-800',
    Aprobada: 'bg-green-100 text-green-800',
    Rechazada: 'bg-red-100 text-red-800',
    'En ejecución': 'bg-blue-100 text-blue-800',
    Finalizado: 'bg-green-100 text-green-800',
    Recibida: 'bg-gray-100 text-gray-800',
    Confirmada: 'bg-green-100 text-green-800',
    Cancelada: 'bg-red-100 text-red-800',
    Pendiente: 'bg-yellow-100 text-yellow-800',
    Pagado: 'bg-green-100 text-green-800',
    Alta: 'bg-red-100 text-red-800',
    Media: 'bg-yellow-100 text-yellow-800',
    Baja: 'bg-blue-100 text-blue-800',
    Urgente: 'bg-red-100 text-red-800',
    Normal: 'bg-gray-100 text-gray-800',
  };
  return map[estado] || 'bg-gray-100 text-gray-800';
}

export function uploadPdfToSupabase(file: File): Promise<string> {
  // Retorna un blob URL temporal para PDFs (se usaría Supabase Storage en producción completa)
  return Promise.resolve(URL.createObjectURL(file));
}
