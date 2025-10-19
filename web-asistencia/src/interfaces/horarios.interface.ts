interface HorarioBase extends ActualizarHorario {}

export interface HorariosList extends CrearHorario {
  id: number;
  created_at: string;
  updated_at: string | null;
  usuario_nombre: string;
  usuario_email: string;
  turno_nombre: string;
}

export interface HorarioDetails extends HorariosList {}

export interface HorariosListUsuario extends HorariosList {}

export interface HorarioActivoUsuario extends HorariosList {}

export interface CrearHorario extends HorarioBase {
  dia_semana: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
  turno_id: number;
  descripcion?: string;
  user_id: number;
}

export interface CrearHorarioResponse extends HorariosList {}

export interface ActualizarHorario {
  hora_entrada: string;
  hora_salida: string;
  horas_requeridas: number;
  tolerancia_entrada: number;
  tolerancia_salida: number;
  activo: boolean;
}

export interface ActualizarHorarioResponse extends HorariosList {}
