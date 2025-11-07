"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";
import { ResportesList } from "@/interfaces";

interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
}

interface ReporteGenerado {
  id: string;
  nombre: string;
  ruta: string;
  tipo: string;
  formato: "pdf" | "xlsx";
  tamano: number;
  fecha_creacion: string;
  url_descarga: string;
}

export function useReportesApi() {
  const { get, del, data, loading, error, alert } = useClientApi(true, BACKEND_ROUTES.urlHttpBase);

  /**
   * Listar reportes generados
   */
  const list = async (page: number = 1, pageSize: number = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await get<PaginatedResponse<ResportesList>>(`${BACKEND_ROUTES.urlHttpBase}/reportes/listar?${params}`);

    return response;
  };

  /**
   * Generar reporte diario
   */
  const generarDiario = async (fecha: string) => {
    const params = new URLSearchParams({ fecha });
    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/diario?${params}`);
    return response;
  };

  /**
   * Generar reporte semanal
   */
  const generarSemanal = async (fecha_inicio: string, fecha_fin: string) => {
    const params = new URLSearchParams({ fecha_inicio, fecha_fin });
    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/semanal?${params}`);
    return response;
  };

  /**
   * Generar reporte mensual
   */
  const generarMensual = async (mes: number, anio: number) => {
    const params = new URLSearchParams({ mes: mes.toString(), anio: anio.toString() });
    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/mensual?${params}`);
    return response;
  };

  /**
   * Generar reporte de tardanzas
   */
  const generarTardanzas = async (fecha_inicio?: string, fecha_fin?: string) => {
    const params = new URLSearchParams();
    if (fecha_inicio) params.append("fecha_inicio", fecha_inicio);
    if (fecha_fin) params.append("fecha_fin", fecha_fin);

    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/tardanzas?${params}`);
    return response;
  };

  /**
   * Generar reporte de inasistencias
   */
  const generarInasistencias = async (fecha_inicio?: string, fecha_fin?: string) => {
    const params = new URLSearchParams();
    if (fecha_inicio) params.append("fecha_inicio", fecha_inicio);
    if (fecha_fin) params.append("fecha_fin", fecha_fin);

    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/inasistencias?${params}`);
    return response;
  };

  /**
   * Descargar reporte
   */
  const descargar = async (ruta: string) => {
    // Para descargar archivos, necesitamos hacer la petición diferente
    try {
      const response = await fetch(`${BACKEND_ROUTES.urlHttpBase}/reportes/descargar/${ruta}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Error al descargar reporte");
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ruta.split("/").pop() || "reporte";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { alert: "success" as const, message: "Reporte descargado" };
    } catch (err) {
      return { alert: "error" as const, message: "Error al descargar reporte" };
    }
  };

  /**
   * Eliminar reporte
   */
  const eliminar = async (ruta: string) => {
    const response = await del(`${BACKEND_ROUTES.urlHttpBase}/reportes/eliminar/${ruta}`);
    return response;
  };

  return {
    list,
    generarDiario,
    generarSemanal,
    generarMensual,
    generarTardanzas,
    generarInasistencias,
    descargar,
    eliminar,
    state: { data, loading, error, alert },
  };
}
