"use client";

import { useCallback } from "react";
import { useClientApi, ApiResponse } from "./useClientApi.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { HorariosList, HorarioDetails, ActualizarHorario, CrearHorario } from "@/interfaces";

/**
 * Hook para gestionar todas las operaciones de horarios
 * Incluye listado, consulta, actualización, eliminación y creación masiva
 */
export const useHorariosApi = (requireAuth?: boolean) => {
  const api = useClientApi(requireAuth || true);

  /**
   * 🔒 PROTECTED - Listar mis horarios con filtros
   */
  const list = useCallback(
    async (filters?: { dia_semana?: string; activo?: boolean }): Promise<ApiResponse<HorariosList[]>> => {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.dia_semana) params.append("dia_semana", filters.dia_semana);
        if (filters.activo !== undefined) params.append("activo", filters.activo.toString());
      }

      return api.GET<HorariosList[]>(`${BACKEND_ROUTES.urlHorarios}/?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Listar TODOS los horarios del sistema
   */
  const listAdmin = useCallback(
    async (
      page: number = 1,
      pageSize: number = 10,
      filters?: {
        user_id?: number;
        dia_semana?: string;
        activo?: boolean;
      }
    ): Promise<ApiResponse<{ records: HorariosList[]; total: number }>> => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (filters) {
        if (filters.user_id) params.append("user_id", filters.user_id.toString());
        if (filters.dia_semana) params.append("dia_semana", filters.dia_semana);
        if (filters.activo !== undefined) params.append("activo", filters.activo.toString());
      }

      return api.GET<{ records: HorariosList[]; total: number }>(`${BACKEND_ROUTES.urlHorarios}/admin/todos?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener detalle de un horario por ID
   */
  const getDetail = useCallback(
    async (id: number): Promise<ApiResponse<HorarioDetails>> => {
      return api.GET<HorarioDetails>(`${BACKEND_ROUTES.urlHorarios}/${id}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Obtener todos los horarios de un usuario
   */
  const getByUser = useCallback(
    async (userId: number, diaSemana?: string): Promise<ApiResponse<HorariosList[]>> => {
      const params = new URLSearchParams();

      if (diaSemana) params.append("dia_semana", diaSemana);

      return api.GET<HorariosList[]>(`${BACKEND_ROUTES.urlHorarios}/usuario/${userId}?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔒 PROTECTED - Detectar turno activo para un usuario
   */
  const detectarTurnoActivo = useCallback(
    async (userId: number, diaSemana?: string, hora?: string): Promise<ApiResponse<HorarioDetails>> => {
      const params = new URLSearchParams();

      if (diaSemana) params.append("dia_semana", diaSemana);
      if (hora) params.append("hora", hora);

      return api.GET<HorarioDetails>(`${BACKEND_ROUTES.urlHorarios}/usuario/${userId}/turno-activo?${params.toString()}`);
    },
    [api]
  );

  /**
   * 🔓 PUBLIC - Crear un nuevo horario
   */
  const create = useCallback(
    async (data: CrearHorario): Promise<ApiResponse<HorarioDetails>> => {
      return api.POST<HorarioDetails>(`${BACKEND_ROUTES.urlHorarios}`, data);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Crear múltiples horarios de una vez
   */
  const createBulk = useCallback(
    async (horarios: CrearHorario[]): Promise<ApiResponse<{ records: HorarioDetails[]; total: number }>> => {
      return api.POST<{ records: HorarioDetails[]; total: number }>(`${BACKEND_ROUTES.urlHorarios}/bulk`, horarios);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Actualizar un horario
   */
  const update = useCallback(
    async (id: number, data: Partial<ActualizarHorario>): Promise<ApiResponse<HorarioDetails>> => {
      return api.PUT<HorarioDetails>(`${BACKEND_ROUTES.urlHorarios}/${id}`, data);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Eliminar un horario
   */
  const delete_ = useCallback(
    async (id: number): Promise<ApiResponse> => {
      return api.DELETE(`${BACKEND_ROUTES.urlHorarios}/${id}`);
    },
    [api]
  );

  /**
   * 🔐 ADMIN - Eliminar todos los horarios de un usuario
   */
  const deleteByUser = useCallback(
    async (userId: number): Promise<ApiResponse> => {
      return api.DELETE(`${BACKEND_ROUTES.urlHorarios}/usuario/${userId}`);
    },
    [api]
  );

  return {
    // Operaciones de lectura
    list,
    listAdmin,
    getDetail,
    getByUser,
    detectarTurnoActivo,

    // Operaciones de escritura
    create,
    createBulk,
    update,
    delete_,
    deleteByUser,

    // Estado del hook
    state: {
      loading: api.loading,
      error: api.error,
      alert: api.alert,
    },
  };
};
