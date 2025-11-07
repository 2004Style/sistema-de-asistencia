"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";
import { RoleList, RolesDetails, CrearRole, ResponseCrearRole, ActualizarRole, ResponseActualizarRole } from "@/interfaces";

interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
}

export function useRolesApi() {
  const { get, post, put, del, data, loading, error, alert } = useClientApi(true, BACKEND_ROUTES.urlHttpBase);

  /**
   * Listar todos los roles con paginación
   */
  const list = async (page: number = 1, pageSize: number = 10, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
    });

    const response = await get<PaginatedResponse<RoleList>>(`${BACKEND_ROUTES.urlRoles}?${params}`);

    return response;
  };

  /**
   * Obtener rol por ID
   */
  const getDetail = async (id: number) => {
    const response = await get<RolesDetails>(`${BACKEND_ROUTES.urlRoles}/${id}`);
    return response;
  };

  /**
   * Crear nuevo rol
   */
  const create = async (data: CrearRole) => {
    const response = await post<ResponseCrearRole>(BACKEND_ROUTES.urlRoles, data);
    return response;
  };

  /**
   * Actualizar rol
   */
  const update = async (id: number, data: ActualizarRole) => {
    const response = await put<ResponseActualizarRole>(`${BACKEND_ROUTES.urlRoles}/${id}`, data);
    return response;
  };

  /**
   * Eliminar rol
   */
  const delete_ = async (id: number) => {
    const response = await del(`${BACKEND_ROUTES.urlRoles}/${id}`);
    return response;
  };

  /**
   * Obtener roles activos
   */
  const getActivos = async () => {
    const response = await get<RoleList[]>(`${BACKEND_ROUTES.urlRoles}/activos/listar`);
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
