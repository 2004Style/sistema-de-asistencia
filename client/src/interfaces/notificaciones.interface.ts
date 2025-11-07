interface notificacionesBase {
  tipo: "tardanza" | "ausencia" | "alerta" | "justificacion" | "aprobacion" | "rechazo" | "recordatorio" | "sistema" | "exceso_jornada" | "incumplimiento_jornada";
  prioridad: "baja" | "media" | "alta" | "urgente";
  titulo: string;
  mensaje: string;
  datos_adicionales: string | null;
  accion_url: string | null;
  accion_texto: string | null;
  id: number;
  user_id: number;
  leida: boolean;
  fecha_lectura: string;
  email_enviado: boolean;
  fecha_envio_email: string | null;
  expira_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificacionesUserList {
  total: number;
  no_leidas: number;
  notificaciones: notificacionesBase[];
}

export interface NotificacionDetails extends notificacionesBase {}
