"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";
import { ReportesListResponse, ReporteGenerado } from "@/interfaces";

export function useReportesApi() {
  const { get, del, data, loading, error, alert } = useClientApi(true, BACKEND_ROUTES.urlHttpBase);

  /**
   * Listar reportes generados
   * Retorna: { success, total, records }
   */
  const list = async (_pageNumber: number = 1, limite: number = 50) => {
    const params = new URLSearchParams({
      limite: limite.toString(),
    });

    const response = await get<ReportesListResponse>(`${BACKEND_ROUTES.urlHttpBase}/reportes/listar?${params}`);

    return response;
  };

  /**
   * Generar reporte diario
   * @param fecha Fecha del reporte (YYYY-MM-DD)
   * @param formato Formato: pdf, excel, both (default: both)
   * @param user_id ID del usuario (opcional)
   * @param enviar_email Enviar reporte por email (default: false)
   */
  const generarDiario = async (fecha: string, formato: "pdf" | "excel" | "both" = "both", user_id?: number, enviar_email: boolean = false) => {
    const params = new URLSearchParams({
      fecha,
      formato,
      enviar_email: enviar_email.toString(),
    });
    if (user_id) params.append("user_id", user_id.toString());

    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/diario?${params}`);
    return response;
  };

  /**
   * Generar reporte semanal
   * @param fecha_inicio Fecha de inicio de la semana
   * @param fecha_fin Fecha de fin de la semana
   * @param formato Formato: pdf, excel, both (default: both)
   * @param user_id ID del usuario (opcional)
   * @param enviar_email Enviar reporte por email (default: false)
   */
  const generarSemanal = async (fecha_inicio: string, fecha_fin: string, formato: "pdf" | "excel" | "both" = "both", user_id?: number, enviar_email: boolean = false) => {
    const params = new URLSearchParams({
      fecha_inicio,
      fecha_fin,
      formato,
      enviar_email: enviar_email.toString(),
    });
    if (user_id) params.append("user_id", user_id.toString());

    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/semanal?${params}`);
    return response;
  };

  /**
   * Generar reporte mensual
   * @param mes Mes del reporte (1-12)
   * @param anio Año del reporte
   * @param formato Formato: pdf, excel, both (default: both)
   * @param user_id ID del usuario (opcional)
   * @param enviar_email Enviar reporte por email (default: false)
   */
  const generarMensual = async (mes: number, anio: number, formato: "pdf" | "excel" | "both" = "both", user_id?: number, enviar_email: boolean = false) => {
    const params = new URLSearchParams({
      mes: mes.toString(),
      anio: anio.toString(),
      formato,
      enviar_email: enviar_email.toString(),
    });
    if (user_id) params.append("user_id", user_id.toString());

    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/mensual?${params}`);
    return response;
  };

  /**
   * Generar reporte de tardanzas
   * @param fecha_inicio Fecha de inicio del período
   * @param fecha_fin Fecha de fin del período
   * @param formato Formato: pdf, excel, both (default: both)
   * @param user_id ID del usuario (opcional)
   * @param enviar_email Enviar reporte por email (default: false)
   */
  const generarTardanzas = async (fecha_inicio: string, fecha_fin: string, formato: "pdf" | "excel" | "both" = "both", user_id?: number, enviar_email: boolean = false) => {
    const params = new URLSearchParams({
      fecha_inicio,
      fecha_fin,
      formato,
      enviar_email: enviar_email.toString(),
    });
    if (user_id) params.append("user_id", user_id.toString());

    const response = await get<ReporteGenerado>(`${BACKEND_ROUTES.urlHttpBase}/reportes/tardanzas?${params}`);
    return response;
  };

  /**
   * Generar reporte de inasistencias
   * @param fecha_inicio Fecha de inicio del período
   * @param fecha_fin Fecha de fin del período
   * @param formato Formato: pdf, excel, both (default: both)
   * @param user_id ID del usuario (opcional)
   * @param enviar_email Enviar reporte por email (default: false)
   */
  const generarInasistencias = async (fecha_inicio: string, fecha_fin: string, formato: "pdf" | "excel" | "both" = "both", user_id?: number, enviar_email: boolean = false) => {
    const params = new URLSearchParams({
      fecha_inicio,
      fecha_fin,
      formato,
      enviar_email: enviar_email.toString(),
    });
    if (user_id) params.append("user_id", user_id.toString());

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
    } catch  {
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

  /**
   * Obtener estadísticas del sistema
   * @param fecha_inicio Fecha inicio (opcional, default: hace 30 días)
   * @param fecha_fin Fecha fin (opcional, default: hoy)
   */
  const obtenerEstadisticas = async (fecha_inicio?: string, fecha_fin?: string) => {
    const params = new URLSearchParams();
    if (fecha_inicio) params.append("fecha_inicio", fecha_inicio);
    if (fecha_fin) params.append("fecha_fin", fecha_fin);

    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await get(`${BACKEND_ROUTES.urlHttpBase}/reportes/estadisticas${query}`);
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
    obtenerEstadisticas,
    state: { data, loading, error, alert },
  };
}
