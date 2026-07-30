import { type ClassValue, clsx } from 'clsx';
import { addMonths, differenceInCalendarDays, format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { FrecuenciaIntervencion, Intervencion } from '@/types/types';

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

// ─── Disponibilidad de espacios (reservas por franja horaria) ────────────────

/**
 * Estados de reserva que "ocupan" un espacio en el calendario. Solo estas
 * reservas bloquean una franja horaria; una solicitud recién recibida o
 * rechazada/cancelada no impide agendar otra reserva el mismo día.
 */
export const ESTADOS_OCUPAN_ESPACIO = ['Aprobada', 'Confirmada'] as const;

/** Convierte "HH:MM" o "HH:MM:SS" en minutos desde medianoche. */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hh = parseInt(h, 10);
  const mm = parseInt(m ?? '0', 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

/** Rango de una reserva usado para detectar cruces de fecha/hora. */
export interface RangoReserva {
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}

/** ¿Se solapan los rangos de fechas [aIni,aFin] y [bIni,bFin]? (inclusivo). */
export function fechasSeSolapan(aIni: string, aFin: string, bIni: string, bFin: string): boolean {
  const ai = cleanDateString(aIni).slice(0, 10);
  const af = cleanDateString(aFin || aIni).slice(0, 10);
  const bi = cleanDateString(bIni).slice(0, 10);
  const bf = cleanDateString(bFin || bIni).slice(0, 10);
  if (!ai || !bi) return false;
  return ai <= bf && bi <= af;
}

/**
 * Determina si dos reservas se cruzan: sus rangos de fecha se solapan Y sus
 * franjas horarias se solapan. Si alguna no define horas se asume día completo
 * (00:00–24:00). El cruce horario es semiabierto, de modo que 08:00–12:00 y
 * 12:00–16:00 NO se consideran en conflicto (son contiguas, no solapadas).
 */
export function reservasSeCruzan(a: RangoReserva, b: RangoReserva): boolean {
  if (!fechasSeSolapan(a.fecha_inicio, a.fecha_fin, b.fecha_inicio, b.fecha_fin)) return false;
  const aIni = timeToMinutes(a.hora_inicio) ?? 0;
  const aFin = timeToMinutes(a.hora_fin) ?? 24 * 60;
  const bIni = timeToMinutes(b.hora_inicio) ?? 0;
  const bFin = timeToMinutes(b.hora_fin) ?? 24 * 60;
  return aIni < bFin && bIni < aFin;
}

/** Formatea una franja horaria "HH:MM–HH:MM" a partir de horas opcionales. */
export function formatFranjaHoraria(horaInicio?: string | null, horaFin?: string | null): string {
  const ini = horaInicio ? horaInicio.slice(0, 5) : '00:00';
  const fin = horaFin ? horaFin.slice(0, 5) : '23:59';
  return `${ini}–${fin}`;
}

// ─── Repetición de intervenciones (mantenimiento programado) ─────────────────

/**
 * Días de anticipación con los que el panel empieza a avisar que una
 * intervención recurrente debe volver a realizarse.
 */
export const DIAS_ANTICIPACION_ALERTA = 30;

/** Frecuencias con las que puede repetirse una intervención. */
export const FRECUENCIAS_INTERVENCION: {
  value: FrecuenciaIntervencion;
  label: string;
  meses: number;
}[] = [
  { value: 'Mensual', label: 'Cada mes', meses: 1 },
  { value: 'Semestral', label: 'Cada seis meses', meses: 6 },
  { value: 'Anual', label: 'Cada año', meses: 12 },
];

/** Etiqueta legible de una frecuencia ("Cada seis meses"). */
export function labelFrecuencia(frecuencia: FrecuenciaIntervencion | null | undefined): string {
  return FRECUENCIAS_INTERVENCION.find(f => f.value === frecuencia)?.label ?? '—';
}

/**
 * Suma la frecuencia a una fecha y devuelve el resultado en formato ISO
 * (yyyy-MM-dd), listo para guardar en una columna `date` de Postgres.
 */
export function sumarFrecuencia(fecha: string, frecuencia: FrecuenciaIntervencion): string {
  const meses = FRECUENCIAS_INTERVENCION.find(f => f.value === frecuencia)?.meses ?? 0;
  return format(addMonths(new Date(cleanDateString(fecha)), meses), 'yyyy-MM-dd');
}

/**
 * Días de calendario que faltan para una fecha: 0 es hoy y los valores
 * negativos indican que ya pasó (intervención vencida).
 */
export function diasHastaFecha(fecha: string): number {
  return differenceInCalendarDays(new Date(cleanDateString(fecha)), new Date());
}

/** Nivel de urgencia de una repetición programada. */
export type NivelAlertaRepeticion = 'vencida' | 'proxima' | 'programada';

export interface AlertaRepeticion {
  nivel: NivelAlertaRepeticion;
  /** Días que faltan (negativo si ya venció). */
  dias: number;
  fecha: string;
  frecuencia: FrecuenciaIntervencion | null;
  /** Texto corto para mostrar en badges y listados. */
  etiqueta: string;
  badgeClass: string;
}

type IntervencionRecurrente = Pick<
  Intervencion,
  'requiere_repeticion' | 'frecuencia_repeticion' | 'fecha_proxima_intervencion'
>;

/**
 * Calcula el estado de la alerta de una intervención recurrente. Devuelve
 * `null` cuando la intervención no se repite (no hay nada que avisar).
 *
 * - `vencida`: la fecha ya pasó y nadie ha registrado que se hizo.
 * - `proxima`: faltan DIAS_ANTICIPACION_ALERTA días o menos.
 * - `programada`: todavía falta más tiempo.
 */
export function getAlertaRepeticion(
  intervencion: IntervencionRecurrente | null | undefined,
): AlertaRepeticion | null {
  if (!intervencion?.requiere_repeticion || !intervencion.fecha_proxima_intervencion) return null;

  const fecha = intervencion.fecha_proxima_intervencion;
  const dias = diasHastaFecha(fecha);
  const base = {
    dias,
    fecha,
    frecuencia: intervencion.frecuencia_repeticion ?? null,
  };

  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      ...base,
      nivel: 'vencida',
      etiqueta: `Vencida hace ${atraso} día${atraso === 1 ? '' : 's'}`,
      badgeClass: 'bg-red-100 text-red-800',
    };
  }
  if (dias <= DIAS_ANTICIPACION_ALERTA) {
    return {
      ...base,
      nivel: 'proxima',
      etiqueta: dias === 0 ? 'Debe realizarse hoy' : `Faltan ${dias} día${dias === 1 ? '' : 's'}`,
      badgeClass: 'bg-yellow-100 text-yellow-800',
    };
  }
  return {
    ...base,
    nivel: 'programada',
    etiqueta: `Programada en ${dias} días`,
    badgeClass: 'bg-blue-100 text-blue-800',
  };
}

/** ¿La repetición requiere atención ya (vencida o dentro de la anticipación)? */
export function repeticionRequiereAtencion(intervencion: IntervencionRecurrente): boolean {
  const alerta = getAlertaRepeticion(intervencion);
  return alerta !== null && alerta.nivel !== 'programada';
}

/**
 * Fecha límite (ISO) hasta la que se consideran alertas activas. Se usa para
 * filtrar en Supabase: `.lte('fecha_proxima_intervencion', fechaLimiteAlertas())`.
 */
export function fechaLimiteAlertas(dias: number = DIAS_ANTICIPACION_ALERTA): string {
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return format(limite, 'yyyy-MM-dd');
}
