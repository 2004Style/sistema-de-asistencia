export interface ResportesList {
  id: string;
  nombre: string;
  ruta: string;
  tipo: string;
  formato: "pdf" | "xlsx";
  tamano: number;
  fecha_creacion: string;
  url_descarga: string;
}

export interface ReportesListResponse {
  success: boolean;
  total: number;
  records: ResportesList[];
}

export interface ReporteGenerado {
  success: boolean;
  message: string;
  ruta?: string;
  url_descarga?: string;
}
