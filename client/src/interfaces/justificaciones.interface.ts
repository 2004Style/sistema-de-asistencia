interface justificacionesBase {
  fecha_inicio: string;
  fecha_fin: string;
  tipo: "medica" | "personal" | "familiar" | "academica" | "permiso_autorizado" | "vacaciones" | "licencia" | "otro";
  motivo: string;
  documento_url: string;
  id: number;
  user_id: number;
  estado: "pendiente" | "aprobada" | "rechazada";
  fecha_revision: string | null;
  aprobado_por: string | null;
  comentario_revisor: string | null;
  dias_justificados: number;
  esta_aprobada: boolean;
  esta_pendiente: boolean;
  created_at: string;
  updated_at: string | null;
  usuario_nombre: string;
  usuario_email: string;
  revisor_nombre: string | null;
}

export interface JustificacionList extends justificacionesBase {}

export interface JustificacionDetails extends justificacionesBase {}

export interface JustificacionUserList extends justificacionesBase {}

export interface JustificacionPendientesList extends justificacionesBase {}

export interface JustificacionPendientesUserList extends justificacionesBase {}

export interface CrearJustificacion extends JustificacionUpdate {
  user_id: number;
}

export interface JustificacionUpdate {
  fecha_inicio: string;
  fecha_fin: string;
  tipo: "medica" | "personal" | "familiar" | "academica" | "permiso_autorizado" | "vacaciones" | "licencia" | "otro";
  motivo: string;
  documento_url: string;
}

export interface JustificacionUpdateResponse extends justificacionesBase {}

export interface JustificacionesEstadisticas {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  por_tipo: {
    medica: number;
    personal: number;
    familiar: number;
    academica: number;
    permiso_autorizado: number;
    vacaciones: number;
    licencia: number;
    otro: number;
  };
  dias_totales_justificados: number;
}
