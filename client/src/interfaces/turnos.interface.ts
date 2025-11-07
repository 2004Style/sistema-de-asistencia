interface TurnoBase {
  nombre: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface TurnosList extends TurnoBase {
  id: number;
  duracion_horas: number;
  es_turno_nocturno: boolean;
}

export interface TurnosActivos extends TurnosList {}

export interface TurnoDetails extends TurnosList {}

export interface CrearTurno extends TurnoBase {}

export interface CrearTurnoResponse extends TurnosList {}

export interface ActualizarTurno extends TurnoBase {}

export interface ActualizarTurnoResponse extends TurnosList {}
