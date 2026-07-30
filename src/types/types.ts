// Tipos base de CampusNOVA — COTECNOVA

export type UserRole = 'admin' | 'infraestructura' | 'rector' | 'responsable';
export type EstadoActivo = 'En funcionamiento' | 'Daño parcial' | 'Dado de baja' | 'En reparación';
export type EstadoEspacio = 'Bueno' | 'Regular' | 'Requiere intervención';
export type TipoEspacio = string;
export type SedeEspacio = 'Sede Principal' | 'Sede Secundaria' | 'Sede Rural';
export type BloqueEspacio = 'Bloque A' | 'Bloque B' | 'Bloque C' | 'Bloque D' | 'N/A';
export type EstadoIntervencion = 'Solicitud' | 'En revisión' | 'Aprobada' | 'En ejecución' | 'Finalizado' | 'Rechazada';
export type TipoIntervencion = 'Mantenimiento preventivo' | 'Mantenimiento correctivo' | 'Remodelación' | 'Adecuación' | 'Construcción nueva' | 'Modificación eléctrica' | 'Modificación hidráulica' | 'Reparación de emergencia';
export type Prioridad = 'Alta' | 'Media' | 'Baja';
/** Cada cuánto debe repetirse una intervención: cada mes, cada seis meses o cada año. */
export type FrecuenciaIntervencion = 'Mensual' | 'Semestral' | 'Anual';
export type EstadoNovedad = 'Recibido' | 'En revisión' | 'En gestión' | 'Resuelto' | 'Cerrado';
export type TipoNovedad = 'Daño en equipamiento' | 'Gotera/filtración de agua' | 'Daño eléctrico' | 'Daño en mobiliario' | 'Problema de seguridad' | 'Aseo e higiene' | 'Otro';
export type RolReportante = 'Estudiante' | 'Docente' | 'Administrativo' | 'Visitante';
export type TipoSolicitud = 'Reserva' | 'Alquiler';
export type EstadoReserva = 'Recibida' | 'En revisión' | 'Aprobada' | 'Rechazada' | 'Confirmada' | 'Cancelada';
export type EstadoPago = 'Pendiente' | 'Pagado';
export type TipoSolicitante = 'Interno' | 'Externo';
export type MotivoBaja = 'Deterioro' | 'Robo' | 'Obsolescencia' | 'Donación' | 'Otro';

export interface Profile {
  id: string;
  email: string | null;
  nombre: string | null;
  cargo: string | null;
  role: UserRole;
  activo: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PisoEspacio {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

export interface AsignacionEspacio {
  id: string;
  espacio_id: string;
  responsable_id: string;
  activo: boolean;
  fecha_asignacion: string;
  observaciones: string | null;
  created_at: string;
  espacio?: EspacioFisico;
  responsable?: Profile;
}

export interface MovimientoEspacio {
  id: string;
  espacio_id: string;
  tipo_movimiento: 'recibo' | 'entrega';
  persona_recibe_id: string | null;
  persona_recibe_nombre: string | null;
  persona_entrega_id: string | null;
  persona_entrega_nombre: string;
  fecha_movimiento: string;
  fecha_entrega_acordada: string | null;
  motivo_codigo: string;
  motivo_descripcion: string | null;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
  espacio?: EspacioFisico;
  persona_recibe?: Profile;
  persona_entrega?: Profile;
}

export interface MotivoMovimientoEspacio {
  id: string;
  tipo: 'recibo' | 'entrega';
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface EspacioFisico {
  id: string;
  codigo: string;
  nombre: string;
  sede: SedeEspacio;
  bloque: BloqueEspacio;
  piso: string | null;
  piso_nombre: string | null;
  tipo: TipoEspacio;
  uso_actual: string | null;
  area_m2: number | null;
  largo_m: number | null;
  ancho_m: number | null;
  capacidad_personas: number | null;
  capacidad_equipos: number | null;
  instalaciones_electricas: boolean;
  instalaciones_hidraulicas: boolean;
  instalaciones_sanitarias: boolean;
  instalaciones_gas: boolean;
  instalaciones_internet_telefonia: boolean;
  instalaciones_seguridad_control: boolean;
  instalaciones_climatizacion: boolean;
  instalaciones_domotica: boolean;
  instalaciones_pci: boolean;
  estado: EstadoEspacio;
  habilitado_reserva: boolean;
  tarifa_alquiler: number | null;
  descripcion_espacio: string | null;
  observaciones: string | null;
  foto_principal_url: string | null;
  fecha_ultima_actualizacion: string | null;
  created_at: string;
}



export interface FotoEspacio {
  id: string;
  espacio_id: string;
  url: string;
  descripcion: string | null;
  orden: number;
  created_at: string;
}

export interface ActivoFijo {
  id: string;
  codigo: string;
  nombre: string;
  valor: number;
  fecha_adquisicion: string | null;
  factura: string | null;
  iva: number;
  depreciable: boolean;
  tiempo_depreciacion: number | null;
  estado: EstadoActivo;
  espacio_id: string | null;
  categoria: string;
  responsable: string | null;
  proveedor: string | null;
  documento_pdf_url: string | null;
  foto_url: string | null;
  observaciones: string | null;
  dado_de_baja: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  espacio?: EspacioFisico;
}

export interface MovimientoActivo {
  id: string;
  activo_id: string;
  tipo_movimiento: string;
  espacio_origen_id: string | null;
  espacio_destino_id: string | null;
  responsable_anterior: string | null;
  responsable_nuevo: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  fecha_movimiento: string;
  motivo: string | null;
  registrado_por: string | null;
  created_at: string;
  // joined
  espacio_origen?: EspacioFisico;
  espacio_destino?: EspacioFisico;
}

export interface BajaActivo {
  id: string;
  activo_id: string;
  motivo: MotivoBaja;
  fecha_baja: string;
  descripcion: string | null;
  acta_pdf_url: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface Intervencion {
  id: string;
  codigo: string;
  espacio_id: string;
  tipo: TipoIntervencion;
  descripcion_problema: string;
  justificacion: string | null;
  area_solicitante: string | null;
  prioridad: Prioridad;
  estado: EstadoIntervencion;
  fecha_solicitud: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  contratista_responsable: string | null;
  descripcion_trabajos: string | null;
  materiales_utilizados: string | null;
  costo: number | null;
  foto_antes_url: string | null;
  foto_durante_url: string | null;
  foto_despues_url: string | null;
  evidencia_foto_url: string | null;
  observaciones: string | null;
  responsable_seguimiento: string | null;
  novedad_id: string | null;
  solicitado_por: string | null;
  aprobado_por: string | null;
  // Repetición programada (mantenimiento recurrente)
  requiere_repeticion: boolean;
  frecuencia_repeticion: FrecuenciaIntervencion | null;
  fecha_proxima_intervencion: string | null;
  fecha_ultima_repeticion: string | null;
  created_at: string;
  updated_at: string;
  // joined
  espacio?: EspacioFisico;
}

export interface BitacoraIntervencion {
  id: string;
  intervencion_id: string;
  fecha: string;
  responsable: string;
  descripcion: string;
  registrado_por: string | null;
  created_at: string;
}

export interface ActaReciboObra {
  id: string;
  intervencion_id: string;
  verificacion_especificaciones: boolean;
  estado_final: string;
  observaciones: string | null;
  firma_responsable1: string | null;
  firma_responsable2: string | null;
  fecha_acta: string;
  registrado_por: string | null;
  created_at: string;
}

export interface NoConformidad {
  id: string;
  intervencion_id: string;
  descripcion: string;
  evidencia_foto_url: string | null;
  accion_correctiva: string | null;
  plazo: string | null;
  responsable: string | null;
  cerrado: boolean;
  fecha_cierre: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface DocumentoEspacio {
  id: string;
  espacio_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;        // 'PDF' | 'Word' | 'Excel' | 'Plano' | 'Imagen' | 'Otro'
  categoria: string;  // 'Planos' | 'Escrituras' | 'Facturas' | 'Manuales' | 'Instructivos' | 'Contratos' | 'General'
  url: string;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  // join
  espacio?: { codigo: string; nombre: string };
}

export interface NovedadIncidente {
  id: string;
  numero_radicado: string;
  nombre_reportante: string;
  correo_reportante: string;
  telefono_reportante: string | null;
  rol_reportante: RolReportante;
  espacio_id: string | null;
  espacio_nombre: string | null;
  tipo_novedad: TipoNovedad;
  descripcion: string;
  foto_url: string | null;
  prioridad: string;
  estado: EstadoNovedad;
  responsable_interno: string | null;
  intervencion_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  espacio?: EspacioFisico;
  responsable_perfil?: Profile;
}

export interface SeguimientoNovedad {
  id: string;
  novedad_id: string;
  estado_anterior: EstadoNovedad | null;
  estado_nuevo: EstadoNovedad;
  descripcion: string;
  responsable: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface ReservaAlquiler {
  id: string;
  numero_solicitud: string;
  tipo: TipoSolicitud;
  nombre_solicitante: string;
  correo_solicitante: string;
  telefono_solicitante: string | null;
  tipo_solicitante: TipoSolicitante;
  institucion: string | null;
  espacio_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  proposito: string;
  num_asistentes: number | null;
  requerimientos_especiales: string | null;
  estado: EstadoReserva;
  valor_acordado: number | null;
  forma_pago: string | null;
  numero_recibo: string | null;
  fecha_pago: string | null;
  estado_pago: EstadoPago | null;
  motivo_rechazo: string | null;
  gestionado_por: string | null;
  created_at: string;
  updated_at: string;
  // joined
  espacio?: EspacioFisico;
}

export interface LogAuditoria {
  id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  accion: string;
  modulo: string;
  entidad_id: string | null;
  detalles: Record<string, unknown> | null;
  created_at: string;
}

export interface CategoriaActivo {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
  created_at: string;
}
