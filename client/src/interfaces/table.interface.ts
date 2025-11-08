/**
 * Respuesta paginada del backend
 */
export interface PaginatedResponse<T> {
  records: T[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Parámetros de consulta para tablas con paginación del servidor
 */
export interface TableQueryParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
}

/**
 * Configuración del estado de la tabla
 */
export interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
