"use client";

import { useCallback } from "react";
import { useClientApi, ApiResponse } from "./useClientApi.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { AsistenciaList, AsistenciaDetails, AsistenciaUpdate, AsistenciaUpdateResponse } from "@/interfaces/asistencias.interface";

/**
 * Hook para gestionar todas las operaciones de asistencias
 * Incluye listado, consulta, actualización y eliminación
 */
export const useAsistenciasApi = () => {
  const api = useClientApi();

  /**
   * 🔒 PROTECTED - Listar mis asistencias con filtros y paginación
   */
  const list = useCallback(
    async (
      page: number = 1,
      pageSize: number = 10,
      filters?: {
        fecha_inicio?: string;
        fecha_fin?: string;
        estado?: "presente" | "ausente" | "tarde" | "justificado" | "permiso";
      }
    ): Promise<ApiResponse<{ records: AsistenciaList[]; total: number }>> => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (filters) {
        if (filters.fecha_inicio) params.append("fecha_inicio", filters.fecha_inicio);
        if (filters.fecha_fin) params.append("fecha_fin", filters.fecha_fin);
        if (filters.estado) params.append("estado", filters.estado);
      }

      return api.GET<{ records: AsistenciaList[]; total: number }>(`${BACKEND_ROUTES.urlAsistencias}/?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Listar TODAS las asistencias del sistema
   */
  const listAdmin = useCallback(
    async (
      page: number = 1,
      pageSize: number = 10,
      filters?: {
        user_id?: number;
        fecha_inicio?: string;
        fecha_fin?: string;
        estado?: "presente" | "ausente" | "tarde" | "justificado" | "permiso";
      }
    ): Promise<ApiResponse<{ records: AsistenciaList[]; total: number }>> => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (filters) {
        if (filters.user_id) params.append("user_id", filters.user_id.toString());
        if (filters.fecha_inicio) params.append("fecha_inicio", filters.fecha_inicio);
        if (filters.fecha_fin) params.append("fecha_fin", filters.fecha_fin);
        if (filters.estado) params.append("estado", filters.estado);
      }

      return api.GET<{ records: AsistenciaList[]; total: number }>(`${BACKEND_ROUTES.urlAsistencias}/admin/todas?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener detalle de una asistencia por ID
   */
  const getDetail = useCallback(
    async (id: number): Promise<ApiResponse<AsistenciaDetails>> => {
      return api.GET<AsistenciaDetails>(`${BACKEND_ROUTES.urlAsistencias}/${id}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener todas las asistencias de un usuario
   */
  const getByUser = useCallback(
    async (
      userId: number,
      page: number = 1,
      pageSize: number = 10,
      filters?: {
        fecha_inicio?: string;
        fecha_fin?: string;
      }
    ): Promise<ApiResponse<{ records: AsistenciaList[]; total: number }>> => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      if (filters) {
        if (filters.fecha_inicio) params.append("fecha_inicio", filters.fecha_inicio);
        if (filters.fecha_fin) params.append("fecha_fin", filters.fecha_fin);
      }

      return api.GET<{ records: AsistenciaList[]; total: number }>(`${BACKEND_ROUTES.urlAsistencias}/usuario/${userId}?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Actualizar una asistencia
   */
  const update = useCallback(
    async (id: number, data: Partial<AsistenciaUpdate>): Promise<ApiResponse<AsistenciaUpdateResponse>> => {
      return api.PUT<AsistenciaUpdateResponse>(`${BACKEND_ROUTES.urlAsistencias}/${id}`, data);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Eliminar una asistencia
   */
  const delete_ = useCallback(
    async (id: number): Promise<ApiResponse> => {
      return api.DELETE(`${BACKEND_ROUTES.urlAsistencias}/${id}`);
    },
    [api]
  );

  return {
    // Operaciones CRUD
    list,
    listAdmin,
    getDetail,
    getByUser,
    update,
    delete_,

    // Estado del hook principal
    state: {
      loading: api.loading,
      error: api.error,
      alert: api.alert,
    },
  };
};
