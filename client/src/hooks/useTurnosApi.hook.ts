"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";
import { TurnosList, TurnosActivos, TurnoDetails, CrearTurno, CrearTurnoResponse, ActualizarTurno, ActualizarTurnoResponse } from "@/interfaces";

interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
}

export function useTurnosApi() {
  const { GET, POST, PUT, DELETE, data, loading, error, alert } = useClientApi(true, BACKEND_ROUTES.urlHttpBase);

  /**
   * Listar todos los turnos con paginación
   */
  const list = async (page: number = 1, pageSize: number = 10, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
    });

    const response = await GET<PaginatedResponse<TurnosList>>(`${BACKEND_ROUTES.urlTurnos}?${params}`);

    return response;
  };

  /**
   * Obtener turno por ID
   */
  const getDetail = async (id: number) => {
    const response = await GET<TurnoDetails>(`${BACKEND_ROUTES.urlTurnos}/${id}`);
    return response;
  };

  /**
   * Crear nuevo turno
   */
  const create = async (data: CrearTurno) => {
    const response = await POST<CrearTurnoResponse>(BACKEND_ROUTES.urlTurnos, data);
    return response;
  };

  /**
   * Actualizar turno
   */
  const update = async (id: number, data: ActualizarTurno) => {
    const response = await PUT<ActualizarTurnoResponse>(`${BACKEND_ROUTES.urlTurnos}/${id}`, data);
    return response;
  };

  /**
   * Eliminar turno
   */
  const delete_ = async (id: number) => {
    const response = await DELETE(`${BACKEND_ROUTES.urlTurnos}/${id}`);
    return response;
  };

  /**
   * Obtener turnos activos
   */
  const getActivos = async () => {
    const response = await GET<TurnosActivos[]>(`${BACKEND_ROUTES.urlTurnos}/activos`);
    return response;
  };

  return {
    list,
    getDetail,
    create,
    update,
    delete_,
    getActivos,
    state: { data, loading, error, alert },
  };
}
