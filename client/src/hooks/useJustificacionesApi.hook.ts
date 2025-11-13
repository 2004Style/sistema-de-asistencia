"use client";

import { useCallback } from "react";
import { useClientApi, ApiResponse } from "./useClientApi.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { JustificacionList, JustificacionDetails, CrearJustificacion, JustificacionUpdate, JustificacionUpdateResponse, JustificacionesEstadisticas, JustificacionPendientesList } from "@/interfaces/justificaciones.interface";

/**
 * Hook para gestionar todas las operaciones de justificaciones
 * Incluye CRUD completo, aprobación, rechazo y estadísticas
 */
export const useJustificacionesApi = () => {
  const api = useClientApi();

  /**
   * 🟢 PUBLIC - Crear una nueva justificación
   */
  const create = useCallback(
    async (data: CrearJustificacion): Promise<ApiResponse<JustificacionDetails>> => {
      return api.POST<JustificacionDetails>(BACKEND_ROUTES.urlJustificaciones, data);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener listado de justificaciones del usuario actual
   * (con paginación y filtros)
   */
  const list = useCallback(
    async (
      page: number = 1,
      pageSize: number = 10,
      filters?: {
        estado?: "pendiente" | "aprobada" | "rechazada";
        tipo?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
      }
    ): Promise<ApiResponse<{ records: JustificacionList[]; total: number }>> => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (filters) {
        if (filters.estado) params.append("estado", filters.estado);
        if (filters.tipo) params.append("tipo", filters.tipo);
        if (filters.fecha_desde) params.append("fecha_desde", filters.fecha_desde);
        if (filters.fecha_hasta) params.append("fecha_hasta", filters.fecha_hasta);
      }

      return api.GET<{ records: JustificacionList[]; total: number }>(`${BACKEND_ROUTES.urlJustificaciones}?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Obtener listado de TODAS las justificaciones del sistema
   */
  const listAdmin = useCallback(
    async (
      page: number = 1,
      pageSize: number = 10,
      filters?: {
        user_id?: number;
        estado?: "pendiente" | "aprobada" | "rechazada";
        tipo?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
      }
    ): Promise<ApiResponse<{ records: JustificacionList[]; total: number }>> => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (filters) {
        if (filters.user_id) params.append("user_id", filters.user_id.toString());
        if (filters.estado) params.append("estado", filters.estado);
        if (filters.tipo) params.append("tipo", filters.tipo);
        if (filters.fecha_desde) params.append("fecha_desde", filters.fecha_desde);
        if (filters.fecha_hasta) params.append("fecha_hasta", filters.fecha_hasta);
      }

      return api.GET<{ records: JustificacionList[]; total: number }>(`${BACKEND_ROUTES.urlJustificaciones}/admin/todas?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener detalle de una justificación por ID
   */
  const getDetail = useCallback(
    async (id: number): Promise<ApiResponse<JustificacionDetails>> => {
      return api.GET<JustificacionDetails>(`${BACKEND_ROUTES.urlJustificaciones}/${id}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener todas las justificaciones de un usuario
   */
  const getByUser = useCallback(
    async (userId: number): Promise<ApiResponse<JustificacionList[]>> => {
      return api.GET<JustificacionList[]>(`${BACKEND_ROUTES.urlJustificaciones}/usuario/${userId}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener justificaciones pendientes del usuario actual
   */
  const getPendientesByUser = useCallback(
    async (userId: number): Promise<ApiResponse<JustificacionPendientesList[]>> => {
      return api.GET<JustificacionPendientesList[]>(`${BACKEND_ROUTES.urlJustificaciones}/pendientes/usuario/${userId}`);
    },
    [api]
  );

  /**
   * 🔐 PUEDE APROBAR - Obtener TODAS las justificaciones pendientes del sistema
   */
  const getPendientesAll = useCallback(async (): Promise<ApiResponse<JustificacionPendientesList[]>> => {
    return api.GET<JustificacionPendientesList[]>(`${BACKEND_ROUTES.urlJustificaciones}/pendientes/todas`);
  }, [api]);

  /**
   * 🔒 PROTECTED - Actualizar una justificación (solo si está pendiente)
   */
  const update = useCallback(
    async (id: number, data: Partial<JustificacionUpdate>): Promise<ApiResponse<JustificacionUpdateResponse>> => {
      return api.PUT<JustificacionUpdateResponse>(`${BACKEND_ROUTES.urlJustificaciones}/${id}`, data);
    },
    [api]
  );

  /**
   * 🔐 PUEDE APROBAR - Aprobar una justificación
   */
  const approve = useCallback(
    async (justificacionId: number, revisorId: number, comentario?: string): Promise<ApiResponse<JustificacionDetails>> => {
      const params = new URLSearchParams();
      params.append("revisor_id", revisorId.toString());
      if (comentario) params.append("comentario", comentario);

      return api.POST<JustificacionDetails>(`${BACKEND_ROUTES.urlJustificaciones}/${justificacionId}/aprobar?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔐 PUEDE APROBAR - Rechazar una justificación
   */
  const reject = useCallback(
    async (justificacionId: number, revisorId: number, comentario: string): Promise<ApiResponse<JustificacionDetails>> => {
      const params = new URLSearchParams();
      params.append("revisor_id", revisorId.toString());
      params.append("comentario", comentario);

      return api.POST<JustificacionDetails>(`${BACKEND_ROUTES.urlJustificaciones}/${justificacionId}/rechazar?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Eliminar una justificación
   */
  const delete_ = useCallback(
    async (id: number): Promise<ApiResponse> => {
      return api.DELETE(`${BACKEND_ROUTES.urlJustificaciones}/${id}`);
    },
    [api]
  );

  /**
   * 🔐 PUEDE VER REPORTES - Obtener estadísticas de justificaciones
   */
  const getEstadisticas = useCallback(
    async (filters?: { user_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<ApiResponse<JustificacionesEstadisticas>> => {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.user_id) params.append("user_id", filters.user_id.toString());
        if (filters.fecha_desde) params.append("fecha_desde", filters.fecha_desde);
        if (filters.fecha_hasta) params.append("fecha_hasta", filters.fecha_hasta);
      }

      return api.GET<JustificacionesEstadisticas>(`${BACKEND_ROUTES.urlJustificaciones}/estadisticas/general?${params.toString()}`);
    },
    [api]
  );

  return {
    // Operaciones CRUD
    create,
    list,
    listAdmin,
    getDetail,
    getByUser,
    getPendientesByUser,
    getPendientesAll,
    update,
    delete_,

    // Operaciones de aprobación
    approve,
    reject,

    // Estadísticas
    getEstadisticas,

    // Estado del hook principal
    state: {
      loading: api.loading,
      error: api.error,
      alert: api.alert,
    },
  };
};
