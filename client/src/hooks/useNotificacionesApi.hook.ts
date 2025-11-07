"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";
import { NotificacionesUserList, NotificacionDetails } from "@/interfaces";

interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
}

export function useNotificacionesApi() {
  const { get, put, del, data, loading, error, alert } = useClientApi(true, BACKEND_ROUTES.urlHttpBase);

  /**
   * Listar notificaciones del usuario
   */
  const list = async (page: number = 1, pageSize: number = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await get<NotificacionesUserList>(`${BACKEND_ROUTES.urlNotificaciones}?${params}`);

    return response;
  };

  /**
   * Obtener notificación por ID
   */
  const getDetail = async (id: number) => {
    const response = await get<NotificacionDetails>(`${BACKEND_ROUTES.urlNotificaciones}/${id}`);
    return response;
  };

  /**
   * Contar notificaciones no leídas
   */
  const contar = async () => {
    const response = await get<{ count: number }>(`${BACKEND_ROUTES.urlNotificaciones}/count`);
    return response;
  };

  /**
   * Marcar notificación como leída
   */
  const marcarLeida = async (id: number) => {
    const response = await put(`${BACKEND_ROUTES.urlNotificaciones}/${id}/marcar-leida`);
    return response;
  };

  /**
   * Marcar todas las notificaciones como leídas
   */
  const marcarTodasLeidas = async () => {
    const response = await put(`${BACKEND_ROUTES.urlNotificaciones}/marcar-todas-leidas`);
    return response;
  };

  /**
   * Listar todas las notificaciones (solo admin)
   */
  const listAdmin = async (page: number = 1, pageSize: number = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await get<PaginatedResponse<NotificacionDetails>>(`${BACKEND_ROUTES.urlNotificaciones}/admin/todas?${params}`);

    return response;
  };

  /**
   * Limpiar notificaciones (solo admin)
   */
  const limpiar = async () => {
    const response = await del(`${BACKEND_ROUTES.urlNotificaciones}/limpiar`);
    return response;
  };

  return {
    list,
    getDetail,
    contar,
    marcarLeida,
    marcarTodasLeidas,
    listAdmin,
    limpiar,
    state: { data, loading, error, alert },
  };
}
