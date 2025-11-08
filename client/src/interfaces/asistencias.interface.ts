interface AsistenciaBase {
  id: number;
  user_id: number;
  horario_id: number;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
  metodo_entrada: "facial" | "manual" | "huella";
  metodo_salida: "facial" | "manual" | "huella" | null;
  estado: "presente" | "ausente" | "tarde" | "justificado" | "permiso";
  tardanza: boolean;
  minutos_tardanza: number;
  minutos_trabajados: number;
  horas_trabajadas_formato: string;
  justificacion_id: number | null;
  observaciones: string;
  created_at: string;
  updated_at: string | null;
  nombre_usuario: string;
  codigo_usuario: string;
  email_usuario: string;
}

export interface AsistenciaList extends AsistenciaBase {}

export interface AsistenciaUserList extends AsistenciaBase {}

export interface AsistenciaDetails extends AsistenciaBase {}

export interface RegistrarAsistenciaManual {
  user_id: number;
  tipo_registro?: "entrada" | "salida";
  observaciones: string;
}

export interface RegistrarAsistenciaFacial {
  codigo: string;
  image: Blob;
}

export interface AsistenciaUpdate {
  hora_entrada: string;
  hora_salida: string;
  estado: string;
  observaciones: string;
}

export interface AsistenciaUpdateResponse extends AsistenciaBase {}
