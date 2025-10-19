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
